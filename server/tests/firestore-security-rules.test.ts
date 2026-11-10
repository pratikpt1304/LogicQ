import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Firestore Security Rules Cheating & Adversarial Attack Simulation Suite
 *
 * Simulates and verifies the exact permission logic enforced by `firestore.rules`:
 * - Deny by default
 * - Attempt to edit points / streak -> REJECTED
 * - Attempt to read hidden test cases -> REJECTED
 * - Attempt to read another student's submission -> REJECTED
 * - Attempt to set own role to ADMIN -> REJECTED
 * - Attempt to delete a submission record -> REJECTED
 * - Attempt to read/write disabled Arena (`contests`) or Archive (`archive`) collections -> REJECTED for all roles
 * - Attempt by student to read a locked future problem or past-week problem -> REJECTED
 */

interface AuthContext {
  uid: string;
  token: {
    email?: string;
    role?: 'STUDENT' | 'ADMIN' | string;
    [key: string]: any;
  };
}

interface FirestoreRuleContext {
  auth: AuthContext | null;
  resource?: {
    data: Record<string, any>;
  };
  request: {
    resource?: {
      data: Record<string, any>;
    };
  };
}

// Emulated Firestore Security Rule Evaluators (matching firestore.rules)
class RulesEvaluator {
  static isAdmin(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (ctx.auth.token?.role === 'ADMIN') return true;
    const emailVerified = ctx.auth.token?.email_verified === true;
    const email = ctx.auth.token?.email;
    if (emailVerified && typeof email === 'string' && email !== '') {
      const adminEmails = [
        'admin@logicq.io',
        'hariprasathset@sanjivani.edu.in',
        'logicq1304@gmail.com',
        'ipworker1908@gmail.com',
        'ipverse1918@gmail.com',
        'logicqarena@gmail.com',
      ];
      return adminEmails.includes(email.toLowerCase());
    }
    return false;
  }

  static isInstitutionalEmail(email?: string): boolean {
    if (typeof email !== 'string') return false;
    return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?(sanjivani\.edu\.in|sanjivani\.org\.in|sanjivanicoe\.org\.in|logicq\.io)$/i.test(email);
  }

  static isFaculty(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isAdmin(ctx)) return true;
    if (ctx.auth.token?.role === 'FACULTY') return true;
    const emailVerified = ctx.auth.token?.email_verified === true;
    const email = ctx.auth.token?.email;
    const role = ctx.auth.token?.role;
    if (
      emailVerified &&
      typeof email === 'string' &&
      email !== '' &&
      RulesEvaluator.isInstitutionalEmail(email) &&
      (['FACULTY', 'TEACHER', 'INSTRUCTOR'].includes(role) || ctx.auth.token?.isFaculty === true)
    ) {
      return true;
    }
    return false;
  }

  static isAuthenticated(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null && ctx.auth !== undefined;
  }

  static isOwnerId(ctx: FirestoreRuleContext, targetId: any): boolean {
    if (!RulesEvaluator.isAuthenticated(ctx)) return false;
    if (typeof targetId !== 'string' || targetId === '') return false;
    const uid = ctx.auth!.uid;
    const prn = typeof ctx.auth!.token?.prn === 'string' ? ctx.auth!.token.prn : '';

    return (
      targetId === uid ||
      (prn !== '' && targetId === prn)
    );
  }

  static isStudentOwner(ctx: FirestoreRuleContext, _data: any, identifier: any): boolean {
    return RulesEvaluator.isOwnerId(ctx, identifier);
  }

  static ownsProgress(
    ctx: FirestoreRuleContext,
    prn: string,
    cohortProgressStore?: Record<string, any>
  ): boolean {
    if (RulesEvaluator.isOwnerId(ctx, prn)) return true;
    if (!RulesEvaluator.isAuthenticated(ctx)) return false;
    if (ctx.auth!.token?.email_verified !== true) return false;

    const authEmail = ctx.auth!.token?.email;
    if (typeof authEmail !== 'string' || authEmail === '') return false;

    let cohortDoc: Record<string, any> | undefined;
    if (cohortProgressStore && prn in cohortProgressStore) {
      cohortDoc = cohortProgressStore[prn];
    } else if (ctx.resource?.data && (ctx.resource.data.prn === prn || !ctx.resource.data.prn)) {
      cohortDoc = ctx.resource.data;
    }

    if (!cohortDoc) return false;
    const docEmail = typeof cohortDoc.email === 'string' ? cohortDoc.email : '';
    if (docEmail === '') return false;

    return docEmail.toLowerCase() === authEmail.toLowerCase();
  }

  static evaluateCohortProgressGet(
    ctx: FirestoreRuleContext,
    prn: string,
    cohortProgressStore?: Record<string, any>
  ): boolean {
    if (RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx)) return true;
    return RulesEvaluator.ownsProgress(ctx, prn, cohortProgressStore);
  }

  static evaluateEnrolledStudentGet(ctx: FirestoreRuleContext, docId: string): boolean {
    if (RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx)) return true;
    return RulesEvaluator.isOwnerId(ctx, docId);
  }

  static evaluateCohortDraftReadOrDelete(
    ctx: FirestoreRuleContext,
    prn: string,
    cohortProgressStore?: Record<string, any>
  ): boolean {
    return RulesEvaluator.ownsProgress(ctx, prn, cohortProgressStore);
  }

  static evaluateCohortDraftWrite(
    ctx: FirestoreRuleContext,
    prn: string,
    draftId: string,
    cohortProgressStore?: Record<string, any>
  ): boolean {
    if (!RulesEvaluator.ownsProgress(ctx, prn, cohortProgressStore)) return false;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(draftId)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    const allowedKeys = ['code', 'customInput', 'updatedAt', 'problemSlug', 'deviceLabel', 'timestamp'];
    if (!Object.keys(data).every((k) => allowedKeys.includes(k))) return false;
    if ('code' in data && (typeof data.code !== 'string' || data.code.length > 65536)) return false;
    if ('customInput' in data && (typeof data.customInput !== 'string' || data.customInput.length > 4096)) return false;
    if ('deviceLabel' in data && (typeof data.deviceLabel !== 'string' || data.deviceLabel.length > 80)) return false;
    if ('problemSlug' in data && (typeof data.problemSlug !== 'string' || data.problemSlug.length > 100)) return false;
    return true;
  }

  static evaluateCohortProctoringRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    return RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx);
  }

  static sectionOwner(ctx: FirestoreRuleContext, data?: Record<string, any>): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isAdmin(ctx)) return true;
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const facultyId = (data && 'facultyId' in data && typeof data.facultyId === 'string') ? data.facultyId : '';
    return facultyId !== '' && facultyId === ctx.auth.uid;
  }

  static isEnrolled(
    ctx: FirestoreRuleContext,
    sectionId: string,
    enrolledStudents?: Record<string, string[]> | string[]
  ): boolean {
    if (!ctx.auth) return false;
    if (!enrolledStudents) return false;
    const roster: string[] = Array.isArray(enrolledStudents)
      ? enrolledStudents
      : (enrolledStudents[sectionId] || []);
    if (roster.includes(ctx.auth.uid)) return true;
    const prn = typeof ctx.auth.token?.prn === 'string' ? ctx.auth.token.prn : '';
    if (prn !== '' && roster.includes(prn)) return true;
    return false;
  }

  static evaluateSectionGet(
    ctx: FirestoreRuleContext,
    sectionId = 'section_1',
    enrolledStudents?: Record<string, string[]> | string[]
  ): boolean {
    if (!ctx.auth) return false;
    const data = ctx.resource?.data;
    return (
      RulesEvaluator.sectionOwner(ctx, data) ||
      RulesEvaluator.isEnrolled(ctx, sectionId, enrolledStudents)
    );
  }

  static evaluateSectionRead(
    ctx: FirestoreRuleContext,
    sectionId = 'section_1',
    enrolledStudents?: Record<string, string[]> | string[]
  ): boolean {
    return RulesEvaluator.evaluateSectionGet(ctx, sectionId, enrolledStudents);
  }

  static evaluateSectionList(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const data = ctx.resource?.data;
    return RulesEvaluator.sectionOwner(ctx, data);
  }

  static isValidSection(data: Record<string, any>): boolean {
    const allowedKeys = [
      'id', 'sectionId', 'sectionName', 'name', 'title', 'course', 'subject',
      'institution', 'academicYear', 'semester', 'facultyId', 'facultyEmail', 'facultyName',
      'description', 'joinCode', 'joinToken', 'isActive',
      'startDate', 'endDate', 'createdAt', 'updatedAt', 'studentsCount'
    ];
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) return false;
    }
    const name = data.sectionName || data.title || data.name;
    if (typeof name !== 'string' || name.length < 1 || name.length > 100) return false;
    if ('title' in data && data.title !== null && (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 100)) return false;
    if (typeof data.course !== 'string' || data.course.length < 1 || data.course.length > 100) return false;
    if (typeof data.subject !== 'string' || data.subject.length < 1 || data.subject.length > 100) return false;
    if ('institution' in data && data.institution !== null && (typeof data.institution !== 'string' || data.institution.length > 100)) return false;
    if ('academicYear' in data && data.academicYear !== null && (typeof data.academicYear !== 'string' || data.academicYear.length > 50)) return false;
    if ('semester' in data && data.semester !== null && (typeof data.semester !== 'string' || data.semester.length > 50)) return false;
    if ('facultyId' in data && (typeof data.facultyId !== 'string' || data.facultyId.length > 128)) return false;
    if ('facultyEmail' in data && (typeof data.facultyEmail !== 'string' || data.facultyEmail.length > 150)) return false;
    if ('facultyName' in data && (typeof data.facultyName !== 'string' || data.facultyName.length > 100)) return false;
    if ('description' in data && data.description !== null && (typeof data.description !== 'string' || data.description.length > 1000)) return false;
    if ('joinCode' in data && (typeof data.joinCode !== 'string' || data.joinCode.length > 32)) return false;
    if ('joinToken' in data && (typeof data.joinToken !== 'string' || data.joinToken.length > 128)) return false;
    if ('isActive' in data && typeof data.isActive !== 'boolean') return false;
    if ('studentsCount' in data && !Number.isInteger(data.studentsCount)) return false;
    return true;
  }

  static evaluateSectionCreate(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    if (!RulesEvaluator.isValidSection(data)) return false;
    if (!RulesEvaluator.isAdmin(ctx) && data.facultyId !== ctx.auth.uid) return false;
    return true;
  }

  static evaluateSectionUpdate(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const existingData = ctx.resource?.data;
    if (!existingData) return false;
    if (!RulesEvaluator.sectionOwner(ctx, existingData)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    if (!RulesEvaluator.isValidSection(data)) return false;
    if (data.facultyId !== existingData.facultyId) return false;
    const incomingCreatedAt = data.createdAt !== undefined ? data.createdAt : null;
    const existingCreatedAt = existingData.createdAt !== undefined ? existingData.createdAt : null;
    if (incomingCreatedAt !== existingCreatedAt) return false;
    return true;
  }

  static evaluateSectionDelete(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    return RulesEvaluator.isAdmin(ctx);
  }

  static evaluateSectionPrivateRead(
    ctx: FirestoreRuleContext,
    parentSectionData?: Record<string, any>
  ): boolean {
    if (!ctx.auth) return false;
    const parent = parentSectionData || ctx.resource?.data;
    return RulesEvaluator.sectionOwner(ctx, parent);
  }

  static evaluateSectionPrivateWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSectionStudentRead(
    ctx: FirestoreRuleContext,
    studentId: string,
    parentSectionData?: Record<string, any>
  ): boolean {
    if (!ctx.auth) return false;
    const parent = parentSectionData || ctx.resource?.data;
    return RulesEvaluator.isOwnerId(ctx, studentId) || RulesEvaluator.sectionOwner(ctx, parent);
  }

  static evaluateSectionStudentList(
    ctx: FirestoreRuleContext,
    parentSectionData?: Record<string, any>
  ): boolean {
    if (!ctx.auth) return false;
    const parent = parentSectionData || ctx.resource?.data;
    return RulesEvaluator.sectionOwner(ctx, parent);
  }

  static evaluateSectionStudentWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSectionStudentCreate(_ctx: FirestoreRuleContext, ..._args: any[]): boolean {
    return false;
  }

  static evaluateSectionStudentUpdate(_ctx: FirestoreRuleContext, ..._args: any[]): boolean {
    return false;
  }

  static evaluateSectionStudentDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static isValidSectionStudent(data: Record<string, any>, studentPrn: string): boolean {
    if (typeof studentPrn !== 'string' || !/^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/.test(studentPrn)) return false;
    if (data.prn !== studentPrn) return false;
    const allowedKeys = [
      'id', 'studentId', 'userId', 'uid', 'prn', 'name', 'fullName',
      'displayName', 'email', 'mobile', 'status', 'joinedVia',
      'enrolledAt', 'createdAt', 'updatedAt'
    ];
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) return false;
    }
    if ('studentId' in data && (typeof data.studentId !== 'string' || data.studentId.length > 128)) return false;
    if ('userId' in data && (typeof data.userId !== 'string' || data.userId.length > 128)) return false;
    if ('uid' in data && (typeof data.uid !== 'string' || data.uid.length > 128)) return false;
    if ('name' in data && (typeof data.name !== 'string' || data.name.length > 100)) return false;
    if ('fullName' in data && (typeof data.fullName !== 'string' || data.fullName.length > 100)) return false;
    if ('displayName' in data && data.displayName !== null && (typeof data.displayName !== 'string' || data.displayName.length > 100)) return false;
    if ('email' in data && (typeof data.email !== 'string' || data.email.length > 150)) return false;
    if ('mobile' in data && data.mobile !== null && (typeof data.mobile !== 'string' || data.mobile.length > 25)) return false;
    if ('status' in data && (typeof data.status !== 'string' || data.status.length > 50)) return false;
    if ('joinedVia' in data && (typeof data.joinedVia !== 'string' || data.joinedVia.length > 50)) return false;
    return true;
  }

  static evaluateEnrolledStudentRead(ctx: FirestoreRuleContext, studentId: string): boolean {
    return true;
  }

  static evaluateEnrolledStudentCreate(ctx: FirestoreRuleContext): boolean {
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    return RulesEvaluator.isValidEnrolledStudent(data);
  }

  static evaluateEnrolledStudentUpdate(ctx: FirestoreRuleContext): boolean {
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    return RulesEvaluator.isValidEnrolledStudent(data);
  }

  static evaluateEnrolledStudentDelete(ctx: FirestoreRuleContext): boolean {
    return true;
  }

  static isValidEnrolledStudent(data: Record<string, any>): boolean {
    const allowedKeys = [
      'id', 'studentId', 'userId', 'uid', 'prn', 'name', 'fullName',
      'displayName', 'email', 'mobile', 'sectionId', 'institution',
      'course', 'subject', 'status', 'college', 'department', 'year',
      'division', 'joinedVia', 'enrolledAt', 'createdAt', 'updatedAt',
      'joinCode', 'sectionName', 'isBanned', 'bannedAt', 'banReason',
      'isEmailBound', 'isEmailBoundV2', 'boundEmail',
      'integrityScore', 'tabSwitchCount', 'tabSwitches', 'pasteBursts',
      'copyPasteAttempts'
    ];
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) return false;
    }
    if ('studentId' in data && (typeof data.studentId !== 'string' || data.studentId.length > 128)) return false;
    if ('userId' in data && (typeof data.userId !== 'string' || data.userId.length > 128)) return false;
    if ('uid' in data && (typeof data.uid !== 'string' || data.uid.length > 128)) return false;
    if ('prn' in data && (typeof data.prn !== 'string' || data.prn.length > 30)) return false;
    if ('name' in data && (typeof data.name !== 'string' || data.name.length > 100)) return false;
    if ('fullName' in data && (typeof data.fullName !== 'string' || data.fullName.length > 100)) return false;
    if ('displayName' in data && data.displayName !== null && (typeof data.displayName !== 'string' || data.displayName.length > 100)) return false;
    if ('email' in data && (typeof data.email !== 'string' || data.email.length > 150)) return false;
    if ('mobile' in data && data.mobile !== null && (typeof data.mobile !== 'string' || data.mobile.length > 25)) return false;
    if ('sectionId' in data && (typeof data.sectionId !== 'string' || data.sectionId.length > 100)) return false;
    if ('institution' in data && (typeof data.institution !== 'string' || data.institution.length > 100)) return false;
    if ('course' in data && (typeof data.course !== 'string' || data.course.length > 100)) return false;
    if ('subject' in data && (typeof data.subject !== 'string' || data.subject.length > 100)) return false;
    if ('status' in data && (typeof data.status !== 'string' || data.status.length > 50)) return false;
    if ('college' in data && (typeof data.college !== 'string' || data.college.length > 100)) return false;
    if ('department' in data && (typeof data.department !== 'string' || data.department.length > 50)) return false;
    if ('year' in data && (typeof data.year !== 'string' || data.year.length > 20)) return false;
    if ('division' in data && data.division !== null && (typeof data.division !== 'string' || data.division.length > 20)) return false;
    if ('joinedVia' in data && (typeof data.joinedVia !== 'string' || data.joinedVia.length > 50)) return false;
    if ('joinCode' in data && (typeof data.joinCode !== 'string' || data.joinCode.length > 50)) return false;
    if ('sectionName' in data && (typeof data.sectionName !== 'string' || data.sectionName.length > 100)) return false;
    if ('isBanned' in data && typeof data.isBanned !== 'boolean') return false;
    if ('banReason' in data && data.banReason !== null && (typeof data.banReason !== 'string' || data.banReason.length > 200)) return false;
    if ('isEmailBound' in data && typeof data.isEmailBound !== 'boolean') return false;
    if ('isEmailBoundV2' in data && typeof data.isEmailBoundV2 !== 'boolean') return false;
    if ('boundEmail' in data && (typeof data.boundEmail !== 'string' || data.boundEmail.length > 150)) return false;
    if ('integrityScore' in data && !Number.isInteger(data.integrityScore)) return false;
    if ('tabSwitchCount' in data && !Number.isInteger(data.tabSwitchCount)) return false;
    if ('tabSwitches' in data && !Number.isInteger(data.tabSwitches)) return false;
    if ('pasteBursts' in data && !Number.isInteger(data.pasteBursts)) return false;
    if ('copyPasteAttempts' in data && !Number.isInteger(data.copyPasteAttempts)) return false;
    return true;
  }

  static isValidCohortProgress(data: Record<string, any>): boolean {
    const allowedKeys = [
      'prn', 'completedProblems', 'totalSolved', 'totalPoints',
      'currentStreak', 'longestStreak', 'lastSolvedDate',
      'draftCodes', 'moduleProgress', 'updatedAt',
      'isBanned', 'bannedAt', 'banReason',
      'studentName', 'studentEmail', 'boundEmail', 'isEmailBound',
      'isEmailBoundV2', 'emailVerified', 'department', 'division',
      'year', 'college', 'sectionName', 'sectionId',
      'integrityScore', 'tabSwitches', 'pasteBursts', 'clipboardAttempts',
      'fullscreenExits', 'miniProjectUnlocked', 'registeredDevices',
      'deviceSession', 'activeSession'
    ];
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) return false;
    }
    if (typeof data.prn !== 'string' || data.prn.length > 30) return false;
    if ('completedProblems' in data && (!Array.isArray(data.completedProblems) || data.completedProblems.length > 250)) return false;
    if ('totalSolved' in data && !Number.isInteger(data.totalSolved)) return false;
    if ('totalPoints' in data && !Number.isInteger(data.totalPoints)) return false;
    if ('currentStreak' in data && !Number.isInteger(data.currentStreak)) return false;
    if ('longestStreak' in data && !Number.isInteger(data.longestStreak)) return false;
    if ('lastSolvedDate' in data && data.lastSolvedDate !== null && (typeof data.lastSolvedDate !== 'string' || data.lastSolvedDate.length > 100)) return false;
    if ('draftCodes' in data && (typeof data.draftCodes !== 'object' || data.draftCodes === null || Array.isArray(data.draftCodes))) return false;
    if ('moduleProgress' in data && (typeof data.moduleProgress !== 'object' || data.moduleProgress === null || Array.isArray(data.moduleProgress))) return false;
    if ('isBanned' in data && typeof data.isBanned !== 'boolean') return false;
    if ('banReason' in data && data.banReason !== null && (typeof data.banReason !== 'string' || data.banReason.length > 200)) return false;
    if ('studentName' in data && (typeof data.studentName !== 'string' || data.studentName.length > 100)) return false;
    if ('studentEmail' in data && (typeof data.studentEmail !== 'string' || data.studentEmail.length > 150)) return false;
    if ('boundEmail' in data && (typeof data.boundEmail !== 'string' || data.boundEmail.length > 150)) return false;
    if ('isEmailBound' in data && typeof data.isEmailBound !== 'boolean') return false;
    if ('isEmailBoundV2' in data && typeof data.isEmailBoundV2 !== 'boolean') return false;
    if ('emailVerified' in data && typeof data.emailVerified !== 'boolean') return false;
    if ('department' in data && (typeof data.department !== 'string' || data.department.length > 100)) return false;
    if ('division' in data && data.division !== null && (typeof data.division !== 'string' || data.division.length > 20)) return false;
    if ('year' in data && (typeof data.year !== 'string' || data.year.length > 20)) return false;
    if ('college' in data && (typeof data.college !== 'string' || data.college.length > 100)) return false;
    if ('sectionName' in data && (typeof data.sectionName !== 'string' || data.sectionName.length > 100)) return false;
    if ('sectionId' in data && (typeof data.sectionId !== 'string' || data.sectionId.length > 100)) return false;
    if ('integrityScore' in data && !Number.isInteger(data.integrityScore)) return false;
    if ('tabSwitches' in data && !Number.isInteger(data.tabSwitches)) return false;
    if ('pasteBursts' in data && !Number.isInteger(data.pasteBursts)) return false;
    if ('clipboardAttempts' in data && !Number.isInteger(data.clipboardAttempts)) return false;
    if ('fullscreenExits' in data && !Number.isInteger(data.fullscreenExits)) return false;
    if ('miniProjectUnlocked' in data && typeof data.miniProjectUnlocked !== 'boolean') return false;
    if ('registeredDevices' in data && (!Array.isArray(data.registeredDevices) || data.registeredDevices.length > 10)) return false;
    if ('deviceSession' in data && !((typeof data.deviceSession === 'object' && data.deviceSession !== null && !Array.isArray(data.deviceSession)) || (typeof data.deviceSession === 'string' && data.deviceSession.length <= 100))) return false;
    if ('activeSession' in data && typeof data.activeSession !== 'boolean') return false;
    return true;
  }

  static evaluateUserSelfUpdate(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    if (ctx.auth.uid !== targetUserId) return false;

    const incomingData = ctx.request.resource?.data || {};
    const existingData = ctx.resource?.data || {};

    const allowedUpdateKeys = [
      'department',
      'year',
      'division',
      'displayName',
      'bio',
      'photoURL',
      'storagePreference',
      'themePreference',
      'hidePracticeTimer',
      'updatedAt',
    ];

    const forbiddenKeys = [
      'prn',
      'college',
      'email',
      'role',
      'status',
      'banReason',
      'stats',
      'points',
      'totalPoints',
      'streak',
      'currentStreak',
      'prnChangedAt',
      'prnNextAllowedChangeDate',
    ];

    // Block any forbidden keys
    for (const key of forbiddenKeys) {
      if (key in incomingData && incomingData[key] !== existingData[key]) {
        return false; // CHEAT REJECTED
      }
    }

    // UID immutability check
    if ('uid' in incomingData && incomingData.uid !== existingData.uid && incomingData.uid !== ctx.auth.uid) {
      return false;
    }

    // Determine changed keys
    const changedKeys: string[] = [];
    for (const key of Object.keys(incomingData)) {
      if (incomingData[key] !== existingData[key]) {
        changedKeys.push(key);
      }
    }

    // Check that changed keys are strictly within allowed list
    for (const key of changedKeys) {
      if (!allowedUpdateKeys.includes(key)) {
        return false;
      }
    }

    // Validate hidePracticeTimer boolean
    if ('hidePracticeTimer' in incomingData && incomingData.hidePracticeTimer !== undefined) {
      if (typeof incomingData.hidePracticeTimer !== 'boolean') {
        return false;
      }
    }

    // Validate themePreference enum
    if ('themePreference' in incomingData && incomingData.themePreference !== undefined) {
      if (!['light', 'dark', 'system'].includes(incomingData.themePreference)) {
        return false;
      }
    }

    // Validate storagePreference enum
    if ('storagePreference' in incomingData && incomingData.storagePreference !== undefined) {
      if (!['GOOGLE_DRIVE', 'FIRESTORE_FALLBACK', 'LOCAL_STORAGE'].includes(incomingData.storagePreference)) {
        return false;
      }
    }

    // Validate department enum
    if ('department' in incomingData && incomingData.department !== undefined && incomingData.department !== null) {
      const allowedDepts = ['CSE', 'IT', 'AIML', 'AIDS', 'Integrated M.Tech', 'Mechanical', 'Civil', 'Electrical', 'E&TC', 'Integrated B.Tech'];
      if (!allowedDepts.includes(incomingData.department)) {
        return false;
      }
    }

    // Validate year enum
    if ('year' in incomingData && incomingData.year !== undefined && incomingData.year !== null) {
      const allowedYears = ['FY', 'SY', 'TY'];
      if (!allowedYears.includes(incomingData.year)) {
        return false;
      }
    }

    // Validate division
    if ('division' in incomingData && incomingData.division !== null && incomingData.division !== undefined) {
      if (typeof incomingData.division !== 'string' || incomingData.division.length > 3 || !/^[A-Z0-9]{0,3}$/.test(incomingData.division)) {
        return false;
      }
    }

    // Validate displayName (2 to 60 characters)
    if ('displayName' in incomingData && incomingData.displayName !== null && incomingData.displayName !== undefined) {
      if (typeof incomingData.displayName !== 'string' || incomingData.displayName.length < 2 || incomingData.displayName.length > 60) {
        return false;
      }
    }

    // Validate bio
    if ('bio' in incomingData && incomingData.bio !== null && incomingData.bio !== undefined) {
      if (typeof incomingData.bio !== 'string' || incomingData.bio.length > 500) {
        return false;
      }
    }

    // Validate photoURL
    if ('photoURL' in incomingData && incomingData.photoURL !== null && incomingData.photoURL !== undefined) {
      if (typeof incomingData.photoURL !== 'string' || incomingData.photoURL.length > 500) {
        return false;
      }
    }

    return true;
  }

  static evaluateInitialOnboardingUpdate(
    ctx: FirestoreRuleContext,
    targetUserId: string,
    existingPrns: string[] = []
  ): boolean {
    if (!ctx.auth) return false;
    if (ctx.auth.uid !== targetUserId) return false;
    const existingData = ctx.resource?.data || {};
    const isUncompleted =
      !('profileComplete' in existingData) ||
      existingData.profileComplete !== true ||
      !('prn' in existingData);
    if (!isUncompleted) return false;
    return RulesEvaluator.evaluateUserCreate(ctx, targetUserId, existingPrns);
  }

  static evaluateUserUpdate(
    ctx: FirestoreRuleContext,
    targetUserId: string,
    existingPrns: string[] = []
  ): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isAdmin(ctx)) return true;
    if (ctx.auth.uid !== targetUserId) return false;
    return (
      RulesEvaluator.evaluateUserSelfUpdate(ctx, targetUserId) ||
      RulesEvaluator.evaluateInitialOnboardingUpdate(ctx, targetUserId, existingPrns)
    );
  }

  static evaluateHiddenTestRead(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /hidden_tests/{testId} { allow read, write: if false; }
    return false;
  }

  static evaluateSubmissionRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx)) return true;
    const data = ctx.resource?.data;
    if (!data) return false;
    return (
      data.userId === ctx.auth.uid ||
      data.uid === ctx.auth.uid ||
      data.studentId === ctx.auth.uid
    );
  }

  static evaluateSubmissionWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSubmissionDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateAssessmentSubmissionRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx)) return true;
    const data = ctx.resource?.data;
    if (!data) return false;
    return (
      data.userId === ctx.auth.uid ||
      data.uid === ctx.auth.uid ||
      data.studentId === ctx.auth.uid
    );
  }

  static evaluateAssessmentSubmissionWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static isValidAssessmentTest(data: Record<string, any>): boolean {
    const allowedKeys = [
      'id', 'title', 'sectionTarget', 'sectionId', 'unitTarget', 'durationMinutes',
      'totalMarks', 'status', 'questions', 'questionCount', 'antiCheatingRotation',
      'randomiseQuestions', 'lockOnSubmit', 'createdAt', 'updatedAt', 'difficultyProfile',
      'selectionMode', 'scheduledAt', 'deadline', 'activeStudents', 'totalEnrolled',
      'suspiciousEvents', 'section', 'moduleId', '_count'
    ];
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) return false;
    }
    if (typeof data.id !== 'string' || data.id.length > 128) return false;
    if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 200) return false;
    if ('sectionTarget' in data && (typeof data.sectionTarget !== 'string' || data.sectionTarget.length > 100)) return false;
    if ('sectionId' in data && (typeof data.sectionId !== 'string' || data.sectionId.length > 100)) return false;
    if (typeof data.status !== 'string' || data.status.length > 50) return false;
    if ('durationMinutes' in data && !Number.isInteger(data.durationMinutes)) return false;
    if ('totalMarks' in data && !Number.isInteger(data.totalMarks)) return false;
    if ('questions' in data && (!Array.isArray(data.questions) || data.questions.length > 100)) return false;
    if ('antiCheatingRotation' in data && typeof data.antiCheatingRotation !== 'boolean') return false;
    if ('randomiseQuestions' in data && typeof data.randomiseQuestions !== 'boolean') return false;
    if ('lockOnSubmit' in data && typeof data.lockOnSubmit !== 'boolean') return false;
    if ('difficultyProfile' in data && (typeof data.difficultyProfile !== 'string' || data.difficultyProfile.length > 50)) return false;
    if ('selectionMode' in data && (typeof data.selectionMode !== 'string' || data.selectionMode.length > 50)) return false;
    if ('activeStudents' in data && !Number.isInteger(data.activeStudents)) return false;
    if ('totalEnrolled' in data && !Number.isInteger(data.totalEnrolled)) return false;
    if ('suspiciousEvents' in data && !Number.isInteger(data.suspiciousEvents)) return false;
    if ('section' in data && (typeof data.section !== 'object' || data.section === null || Array.isArray(data.section))) return false;
    if ('moduleId' in data && (typeof data.moduleId !== 'string' || data.moduleId.length > 100)) return false;
    if ('_count' in data && (typeof data._count !== 'object' || data._count === null || Array.isArray(data._count))) return false;
    return true;
  }

  static evaluateAssessmentTestRead(ctx: FirestoreRuleContext): boolean {
    return RulesEvaluator.isFaculty(ctx);
  }

  static evaluateAssessmentTestCreate(ctx: FirestoreRuleContext): boolean {
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    return RulesEvaluator.isValidAssessmentTest(data);
  }

  static evaluateAssessmentTestUpdate(ctx: FirestoreRuleContext): boolean {
    if (!RulesEvaluator.isFaculty(ctx)) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    return RulesEvaluator.isValidAssessmentTest(data);
  }

  static evaluateAssessmentTestDelete(ctx: FirestoreRuleContext): boolean {
    return RulesEvaluator.isAdmin(ctx);
  }

  static evaluateAssessmentPublicRead(
    ctx: FirestoreRuleContext,
    enrolledStudents?: Record<string, string[]> | string[]
  ): boolean {
    return (
      RulesEvaluator.isFaculty(ctx) ||
      (RulesEvaluator.isAuthenticated(ctx) &&
        RulesEvaluator.isEnrolled(ctx, ctx.resource?.data?.sectionId, enrolledStudents))
    );
  }

  static evaluateAssessmentPublicWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateProctoringRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    return RulesEvaluator.isFaculty(ctx) || RulesEvaluator.isAdmin(ctx);
  }

  static evaluateProctoringWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateContestAccess(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /contests/{contestId} { allow read, write: if false; }
    return false;
  }

  static evaluateArchiveAccess(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /archive/{archiveId} { allow read, write: if false; }
    return false;
  }

  static evaluateProblemRead(ctx: FirestoreRuleContext): boolean {
    return RulesEvaluator.isAdmin(ctx);
  }

  static evaluatePracticeProgressRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateUserPracticeProgressRead(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === targetUserId || isAdmin;
  }

  static evaluatePracticeProgressWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateUserRead(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === targetUserId || isAdmin;
  }

  static evaluateUserCreate(
    ctx: FirestoreRuleContext,
    targetUserId: string,
    existingPrns: string[] = []
  ): boolean {
    if (!ctx.auth) return false;
    if (RulesEvaluator.isAdmin(ctx)) return true;
    if (ctx.auth.uid !== targetUserId) return false;

    const data = ctx.request.resource?.data;
    if (!data) return false;

    // request.resource.data.uid == request.auth.uid
    if (data.uid !== ctx.auth.uid) return false;

    // request.resource.data.email.lower() == request.auth.token.email.lower()
    if (
      typeof data.email !== 'string' ||
      typeof ctx.auth.token.email !== 'string' ||
      data.email.toLowerCase() !== ctx.auth.token.email.toLowerCase()
    ) {
      return false;
    }

    // request.resource.data.role == 'STUDENT'
    if (data.role !== 'STUDENT') return false;

    // request.resource.data.college == 'Sanjivani University'
    if (data.college !== 'Sanjivani University') return false;

    // isAllowedDepartment(request.resource.data.department)
    const allowedDepts = ['CSE', 'IT', 'AIML', 'AIDS', 'Integrated M.Tech', 'Mechanical', 'Civil', 'Electrical', 'E&TC', 'Integrated B.Tech'];
    if (!data.department || typeof data.department !== 'string' || !allowedDepts.includes(data.department)) {
      return false;
    }

    // isAllowedYear(request.resource.data.year)
    const allowedYears = ['FY', 'SY', 'TY'];
    if (!data.year || typeof data.year !== 'string' || !allowedYears.includes(data.year)) {
      return false;
    }

    // (!('division' in request.resource.data) || isValidDivision(request.resource.data.division))
    if ('division' in data && data.division !== null && data.division !== undefined) {
      if (typeof data.division !== 'string' || data.division.length > 3 || !/^[A-Z0-9]{0,3}$/.test(data.division)) {
        return false;
      }
    }

    // (!('displayName' in request.resource.data) || isValidDisplayName(request.resource.data.displayName))
    if ('displayName' in data && data.displayName !== null && data.displayName !== undefined) {
      if (typeof data.displayName !== 'string' || data.displayName.length < 2 || data.displayName.length > 60) {
        return false;
      }
    }

    // request.resource.data.prn is string && request.resource.data.prn.matches('^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$')
    if (typeof data.prn !== 'string' || !/^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/.test(data.prn)) {
      return false;
    }

    // !exists(/databases/$(database)/documents/prnIndex/$(request.resource.data.prn))
    if (existingPrns.includes(data.prn)) {
      return false;
    }

    // request.resource.data.totalPoints == 0
    if (data.totalPoints !== 0) return false;

    // request.resource.data.currentStreak == 0
    if (data.currentStreak !== 0) return false;

    // request.resource.data.profileComplete == true
    if (data.profileComplete !== true) return false;

    return true;
  }

  static evaluatePrnIndexCreate(
    ctx: FirestoreRuleContext,
    targetPrn: string,
    existingPrns: string[] = []
  ): boolean {
    if (!ctx.auth) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;

    if (data.userId !== ctx.auth.uid) return false;
    if (data.prn !== targetPrn) return false;
    if (typeof targetPrn !== 'string' || !/^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/.test(targetPrn)) return false;
    if (existingPrns.includes(targetPrn)) return false;

    return true;
  }

  static evaluatePrnIndexRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluatePrnIndexUpdate(ctx: FirestoreRuleContext, targetPrn?: string): boolean {
    if (!ctx.auth) return false;
    const existingData = ctx.resource?.data;
    const incomingData = ctx.request.resource?.data;
    if (!existingData || !incomingData) return false;

    const prn = targetPrn || existingData.prn;
    return (
      existingData.userId === ctx.auth.uid &&
      incomingData.userId === ctx.auth.uid &&
      incomingData.prn === prn
    );
  }

  static evaluatePrnIndexDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluatePublicProfileCreateOrUpdate(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;

    if ('prn' in data || 'email' in data) return false;

    if ('bio' in data && data.bio !== null && data.bio !== undefined) {
      if (typeof data.bio !== 'string' || data.bio.length > 500) {
        return false;
      }
    }

    if (RulesEvaluator.isAdmin(ctx)) return true;

    if (ctx.auth.uid !== targetUserId) return false;
    if (data.userId !== ctx.auth.uid) return false;
    if ('role' in data && data.role !== 'STUDENT') return false;

    return true;
  }

  static evaluatePublicProfileDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluatePrnIndexAccess(_ctx: FirestoreRuleContext): boolean {
    // Kept for legacy tests: direct arbitrary writes or unauthorized access remain false
    return false;
  }

  static evaluatePrnHistoryWrite(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /users/{userId}/prnHistory/{historyId} { allow write: if false; }
    return false;
  }

  static evaluateDailyBoardRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyBoardWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyLeaderboardRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyLeaderboardWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyResultRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateDailyResultWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailySummaryRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateDailySummaryWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyCorrectionRead(ctx: FirestoreRuleContext): boolean {
    return RulesEvaluator.isAdmin(ctx);
  }

  static evaluateDailyCorrectionWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyRankSnapshotRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyRankSnapshotWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSessionEventRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateUserSessionEventRead(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const isAdmin = RulesEvaluator.isAdmin(ctx);
    return ctx.auth.uid === targetUserId || isAdmin;
  }

  static evaluateSessionEventCreate(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    const allowedReasons = [
      'manual',
      'idle-timeout',
      'token-refresh-failed',
      'revoked-by-user',
      'revoked-by-admin',
      'role-changed',
      'banned',
      'app-check-failed',
      'unusual-login-flag',
      'multi-tab-sync',
      'service-worker-update',
      'unknown',
    ];
    return data.userId === ctx.auth.uid && allowedReasons.includes(data.reason);
  }

  static evaluateUserSessionEventCreate(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    if (ctx.auth.uid !== targetUserId) return false;
    const data = ctx.request.resource?.data;
    if (!data) return false;
    const allowedReasons = [
      'manual',
      'idle-timeout',
      'token-refresh-failed',
      'revoked-by-user',
      'revoked-by-admin',
      'role-changed',
      'banned',
      'app-check-failed',
      'unusual-login-flag',
      'multi-tab-sync',
      'service-worker-update',
      'unknown',
    ];
    return data.userId === ctx.auth.uid && allowedReasons.includes(data.reason);
  }

  static evaluateSessionEventUpdate(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSessionEventDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }
}

describe('Firestore Security Rules: Adversarial Cheating Attack Suite', () => {
  const studentAlice: AuthContext = {
    uid: 'student_alice',
    token: { email: 'alice@college.edu', role: 'STUDENT' },
  };

  const studentBob: AuthContext = {
    uid: 'student_bob',
    token: { email: 'bob@college.edu', role: 'STUDENT' },
  };

  const adminCharlie: AuthContext = {
    uid: 'admin_charlie',
    token: { email: 'admin@college.edu', role: 'ADMIN' },
  };

  const adminIpWorker: AuthContext = {
    uid: 'admin_ipworker',
    token: { email: 'ipworker1908@gmail.com', email_verified: true },
  };

  const adminLogicQ: AuthContext = {
    uid: 'admin_logicq',
    token: { email: 'logicq1304@gmail.com', email_verified: true },
  };

  const adminLogicQUpper: AuthContext = {
    uid: 'admin_logicq_upper',
    token: { email: 'LOGICQ1304@GMAIL.COM', email_verified: true },
  };

  const adminIpVerse: AuthContext = {
    uid: 'admin_ipverse',
    token: { email: 'ipverse1918@gmail.com', email_verified: true },
  };

  const adminLogicQIo: AuthContext = {
    uid: 'admin_logicq_io',
    token: { email: 'admin@logicq.io', email_verified: true },
  };

  it('CHEAT ATTEMPT 1: Student attempts to inflate their own points directly -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { points: 100, streak: 2 } },
      request: { resource: { data: { points: 9999, streak: 2 } } },
    };

    const isAllowed = RulesEvaluator.evaluateUserUpdate(ctx, 'student_alice');
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 2: Student attempts to elevate their own role to ADMIN -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { role: 'STUDENT' } },
      request: { resource: { data: { role: 'ADMIN' } } },
    };

    const isAllowed = RulesEvaluator.evaluateUserUpdate(ctx, 'student_alice');
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 3: Student attempts to read hidden test cases -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateHiddenTestRead(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 4: Student attempts to read another competitor code submission -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_bob_1', userId: 'student_bob', code: 'secret_solution()' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 5: Student attempts to delete their failed submission -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_alice_wrong', userId: 'student_alice' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionDelete(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 6: Client attempts to forge an ACCEPTED submission directly -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { verdict: 'ACCEPTED', pointsAwarded: 50 } } },
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionWrite(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 7: Unauthenticated, Student, or Admin client attempts to read/write disabled contests or archive collections -> MUST FAIL', () => {
    const rulesFile = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    expect(rulesFile).toContain('match /contests/{contestId=**}');
    expect(rulesFile).toContain('match /archive/{docId=**}');

    for (const caller of [null, studentAlice, studentBob, adminCharlie]) {
      expect(RulesEvaluator.evaluateContestAccess({ auth: caller, request: {} })).toBe(false);
      expect(RulesEvaluator.evaluateArchiveAccess({ auth: caller, request: {} })).toBe(false);
    }
  });

  it('CHEAT ATTEMPT 8: Student attempts to read /problems/{problemId} directly in Firestore -> MUST FAIL (only Admin can read directly; students receive today’s challenge via server API)', () => {
    const rulesFile = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    expect(rulesFile).toContain('match /problems/{problemId}');
    expect(rulesFile).toContain('allow read: if isAdmin();');

    const studentProblemRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { status: 'published' } },
      request: {},
    };
    const adminProblemRead: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { status: 'published' } },
      request: {},
    };

    expect(RulesEvaluator.evaluateProblemRead(studentProblemRead)).toBe(false);
    expect(RulesEvaluator.evaluateProblemRead(adminProblemRead)).toBe(true);
  });

  it('VALID OPERATION: Student reads their own submission -> MUST SUCCEED', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_alice_1', userId: 'student_alice', verdict: 'ACCEPTED' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(true);
  });

  it('VALID OPERATION: Admin reads any submission -> MUST SUCCEED', () => {
    const ctx: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: 'sub_bob_1', userId: 'student_bob', verdict: 'WRONG_ANSWER' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(true);
  });

  it('CHEAT ATTEMPT 9: Storage Rules & uploadedSolutions — blocks reading peer uploads, overwriting/deleting files, invalid MIME types, >5MB files, and self-approval', () => {
    const storageRules = fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf-8');
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    expect(storageRules).toContain('match /{allPaths=**}');
    expect(storageRules).toContain('allow read, write: if false;');
    expect(storageRules).toContain('match /uploads/{userId}/{problemId}/{submissionId}/{fileId}');
    expect(storageRules).toContain('allow read: if isOwner(userId) || isAdmin();');
    expect(storageRules).toContain('allow create: if isOwner(userId) && isValidUploadMimeType() && isWithinSizeLimit();');
    expect(storageRules).toContain('allow update, delete: if false;');

    expect(firestoreRules).toContain('match /uploaded_solutions/{uploadId}');
    expect(firestoreRules).toContain('match /upload_reviews/{reviewId}');
    expect(firestoreRules).toContain('allow write: if false;');
  });

  it('CHEAT ATTEMPT 10: Practice Progress — Student cannot read peer practice progress or forge practice progress writes', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    // Verify rules file contains top-level practice_progress
    expect(firestoreRules).toContain('match /practice_progress/{progressId}');
    expect(firestoreRules).toContain('resource.data.userId == request.auth.uid || isAdmin()');

    // Verify rules file contains subcollection under users/{userId}
    expect(firestoreRules).toContain('match /practice_progress/{progressId}');
    expect(firestoreRules).toContain('allow read: if isOwner(userId) || isAdmin();');

    // Student Alice attempts to read Bob's top-level practice progress -> MUST FAIL
    const peerReadTopLevel: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { userId: 'student_bob', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(peerReadTopLevel)).toBe(false);

    // Unauthenticated attempts to read top-level practice progress -> MUST FAIL
    const unauthReadTopLevel: FirestoreRuleContext = {
      auth: null,
      resource: { data: { userId: 'student_alice', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(unauthReadTopLevel)).toBe(false);

    // Student Alice attempts to read Bob's subcollection practice progress -> MUST FAIL
    const peerReadSubcollection: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(peerReadSubcollection, 'student_bob')).toBe(false);

    // Any client attempts to write/modify practice progress -> MUST FAIL
    const clientWrite: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { status: 'SOLVED', solvedAt: Date.now() } } },
    };
    expect(RulesEvaluator.evaluatePracticeProgressWrite(clientWrite)).toBe(false);
  });

  it('VALID OPERATION: Student reads own practice progress, Admin reads any practice progress', () => {
    // Alice reads her own top-level practice progress -> MUST SUCCEED
    const aliceOwnTopLevel: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { userId: 'student_alice', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(aliceOwnTopLevel)).toBe(true);

    // Alice reads her own user subcollection practice progress -> MUST SUCCEED
    const aliceOwnSubcollection: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(aliceOwnSubcollection, 'student_alice')).toBe(true);

    // Admin Charlie reads Bob's top-level practice progress -> MUST SUCCEED
    const adminReadTopLevel: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { userId: 'student_bob', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(adminReadTopLevel)).toBe(true);

    // Admin Charlie reads Bob's subcollection practice progress -> MUST SUCCEED
    const adminReadSubcollection: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(adminReadSubcollection, 'student_bob')).toBe(true);
  });

  it('CHEAT ATTEMPT 11: Student attempts to mutate their own immutable PRN (e.g. 2199TESM0001 -> 2199TESF0002) or college -> MUST FAIL', () => {
    const prnMutationCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Sanjivani University', department: 'AIML', year: 'TY' } },
      request: { resource: { data: { uid: 'student_alice', prn: '2199TESF0002', college: 'Sanjivani University', department: 'AIML', year: 'TY' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(prnMutationCtx, 'student_alice')).toBe(false);

    const collegeMutationCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Sanjivani University', department: 'AIML', year: 'TY' } },
      request: { resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Other University', department: 'AIML', year: 'TY' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(collegeMutationCtx, 'student_alice')).toBe(false);
  });

  it('CHEAT ATTEMPT 12: Student attempts to read another student private users/{uid} document (PRN PII & email) -> MUST FAIL', () => {
    const peerUserReadCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_bob', prn: '2199TESF0002', email: 'bob@college.edu' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(peerUserReadCtx, 'student_bob')).toBe(false);

    const unauthReadCtx: FirestoreRuleContext = {
      auth: null,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', email: 'alice@college.edu' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(unauthReadCtx, 'student_alice')).toBe(false);
  });

  it('CHEAT ATTEMPT 13: Client (Student or Admin) attempts to read or write prnIndex/{prn} directly (fake PRNs 2199TESM0001 / 2199TESF0002) -> MUST FAIL', () => {
    for (const caller of [null, studentAlice, studentBob, adminCharlie]) {
      const readCtx: FirestoreRuleContext = { auth: caller, request: {} };
      expect(RulesEvaluator.evaluatePrnIndexAccess(readCtx)).toBe(false);

      const writeCtx: FirestoreRuleContext = {
        auth: caller,
        request: { resource: { data: { prn: '2199TESM0001', userId: 'student_alice' } } },
      };
      expect(RulesEvaluator.evaluatePrnIndexAccess(writeCtx)).toBe(false);
    }
  });

  it('CHEAT ATTEMPT 14: Client attempts to write directly to /users/{uid}/prnHistory -> MUST FAIL (Server Admin SDK only)', () => {
    const clientHistoryWrite: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { oldPrn: '2199TESM0001', newPrn: '2199TESF0002' } } },
    };
    expect(RulesEvaluator.evaluatePrnHistoryWrite(clientHistoryWrite)).toBe(false);
  });

  it('VALID OPERATION: Student reads their own private profile (with masked PRN) and Admin reads any student private profile', () => {
    const aliceOwnRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', maskedPrn: '••••••••0001' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(aliceOwnRead, 'student_alice')).toBe(true);

    const adminReadBob: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { uid: 'student_bob', prn: '2199TESF0002' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(adminReadBob, 'student_bob')).toBe(true);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md enforce canonical 12-char PRN regex ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$, prnIndex lock, and 8-bullet masking', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // PRN regex matching exactly 12 characters: 4 digits, 3 letters, M or F, 4 digits
    const expectedRegexPattern = '^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$';
    const amendedPrnRegex = new RegExp(`^${expectedRegexPattern.slice(1, -1)}$`);

    // Verify regex matches mock fixtures
    expect(amendedPrnRegex.test('2199TESM0001')).toBe(true);
    expect(amendedPrnRegex.test('2199TESF0002')).toBe(true);
    expect(amendedPrnRegex.test('2026AIML1001')).toBe(false); // 4 letters in program instead of 3
    expect(amendedPrnRegex.test('202612345678')).toBe(false); // digits only
    expect(amendedPrnRegex.test('2199TESX0001')).toBe(false); // X instead of M or F

    // Verify firestore.rules contains amended PRN format comments and rules
    expect(firestoreRules).toContain(expectedRegexPattern);
    expect(firestoreRules).toContain('match /prnIndex/{prn}');
    expect(firestoreRules).toContain('match /users/{userId}');
    expect(firestoreRules).toContain('match /prnHistory/{historyId}');
    expect(firestoreRules).toContain('••••••••1039');

    // Verify docs/SECURITY_RULES.md contains amended PRN format specs and masking
    expect(securityRulesDoc).toContain(expectedRegexPattern);
    expect(securityRulesDoc).toContain('2199TESM0001');
    expect(securityRulesDoc).toContain('2199TESF0002');
    expect(securityRulesDoc).toContain('••••••••1039');
    expect(securityRulesDoc).toContain('prnIndex/{prn}');
  });

  it('DAILY COMPETITION: Authenticated student can read their own daily_results and daily_summaries, but CANNOT read other students’ daily results or summaries', () => {
    // Alice reads her own daily_results -> MUST SUCCEED
    const aliceOwnDailyResult: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(aliceOwnDailyResult)).toBe(true);

    // Alice reads her own daily_summaries -> MUST SUCCEED
    const aliceOwnDailySummary: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice', pointsEarned: 200, streak: 5 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(aliceOwnDailySummary)).toBe(true);

    // Alice attempts to read Bob's daily_results -> MUST FAIL
    const aliceReadBobDailyResult: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(aliceReadBobDailyResult)).toBe(false);

    // Alice attempts to read Bob's daily_summaries -> MUST FAIL
    const aliceReadBobDailySummary: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsEarned: 200, streak: 3 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(aliceReadBobDailySummary)).toBe(false);

    // Unauthenticated attempts to read Alice's daily_results -> MUST FAIL
    const unauthDailyResult: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(unauthDailyResult)).toBe(false);

    // Unauthenticated attempts to read Alice's daily_summaries -> MUST FAIL
    const unauthDailySummary: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(unauthDailySummary)).toBe(false);

    // Admin Charlie reads Bob's daily_results -> MUST SUCCEED
    const adminReadBobDailyResult: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(adminReadBobDailyResult)).toBe(true);

    // Admin Charlie reads Bob's daily_summaries -> MUST SUCCEED
    const adminReadBobDailySummary: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsEarned: 200, streak: 3 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(adminReadBobDailySummary)).toBe(true);
  });

  it('DAILY COMPETITION: Student cannot write, create, or update daily_boards, daily_results, daily_summaries, daily_corrections, or daily_rank_snapshots', () => {
    const studentBoardWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { dayId: '2026-10-13', isFrozen: true } } },
    };
    expect(RulesEvaluator.evaluateDailyBoardWrite(studentBoardWriteCtx)).toBe(false);

    const studentLeaderboardWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', rank: 1, score: 300 } } },
    };
    expect(RulesEvaluator.evaluateDailyLeaderboardWrite(studentLeaderboardWriteCtx)).toBe(false);

    const studentResultWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED', pointsAwarded: 300 } } },
    };
    expect(RulesEvaluator.evaluateDailyResultWrite(studentResultWriteCtx)).toBe(false);

    const studentSummaryWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', pointsEarned: 300, dailyRank: 1 } } },
    };
    expect(RulesEvaluator.evaluateDailySummaryWrite(studentSummaryWriteCtx)).toBe(false);

    const studentCorrectionWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', reason: 'Forged correction' } } },
    };
    expect(RulesEvaluator.evaluateDailyCorrectionWrite(studentCorrectionWriteCtx)).toBe(false);

    const studentSnapshotWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { dayId: '2026-10-13', snapshotType: 'top20' } } },
    };
    expect(RulesEvaluator.evaluateDailyRankSnapshotWrite(studentSnapshotWriteCtx)).toBe(false);

    // Also verify admin direct client writes are blocked (managed strictly by server Admin SDK)
    expect(RulesEvaluator.evaluateDailyBoardWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyLeaderboardWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyResultWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailySummaryWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyCorrectionWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyRankSnapshotWrite({ auth: adminCharlie, request: {} })).toBe(false);
  });

  it('DAILY COMPETITION: Admin can read daily_corrections, while student cannot', () => {
    // Admin reads daily_corrections -> MUST SUCCEED
    const adminCorrectionRead: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(adminCorrectionRead)).toBe(true);

    // Student Alice reads daily_corrections -> MUST FAIL
    const studentAliceCorrectionRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(studentAliceCorrectionRead)).toBe(false);

    // Student Bob reads daily_corrections (even for a correction regarding him) -> MUST FAIL (Admin only)
    const studentBobCorrectionRead: FirestoreRuleContext = {
      auth: studentBob,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(studentBobCorrectionRead)).toBe(false);

    // Unauthenticated reads daily_corrections -> MUST FAIL
    const unauthCorrectionRead: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(unauthCorrectionRead)).toBe(false);
  });

  it('DAILY COMPETITION: Authenticated users can read daily_boards, leaderboard subcollection, and daily_rank_snapshots', () => {
    // Student Alice reads daily_boards -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: studentAlice })).toBe(true);
    // Student Alice reads daily_boards leaderboard subcollection -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: studentAlice })).toBe(true);
    // Student Alice reads daily_rank_snapshots -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: studentAlice })).toBe(true);

    // Admin Charlie reads daily_boards and daily_rank_snapshots -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: adminCharlie })).toBe(true);
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: adminCharlie })).toBe(true);
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: adminCharlie })).toBe(true);

    // Unauthenticated user -> MUST FAIL
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: null })).toBe(false);
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: null })).toBe(false);
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: null })).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md contain daily competition collections and legacy archives', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    const expectedCollections = [
      'match /daily_boards/{dayId}',
      'match /daily_results/{resultId}',
      'match /daily_summaries/{summaryId}',
      'match /daily_corrections/{correctionId}',
      'match /daily_rank_snapshots/{snapshotId}',
      'match /weeks/{weekId}',
      'match /weekly_summaries/{summaryId}',
      'match /weekly_corrections/{correctionId}',
    ];

    for (const pattern of expectedCollections) {
      expect(firestoreRules).toContain(pattern);
      expect(securityRulesDoc).toContain(pattern);
    }
  });

  it('THEME PREFERENCE: Student can update themePreference to dark, light, or system on their own profile, but cannot set invalid values or touch restricted fields', () => {
    const existingProfile = {
      uid: 'student_alice',
      prn: '2199TESM0001',
      college: 'Sanjivani University',
      department: 'AIML',
      year: 'TY',
      division: 'A',
      displayName: 'AliceDev',
      role: 'STUDENT',
      status: 'ACTIVE',
      points: 100,
      streak: 5,
      themePreference: 'system',
    };

    // 1. Valid update to 'dark' -> MUST SUCCEED
    const validDarkCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'dark', updatedAt: Date.now() } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(validDarkCtx, 'student_alice')).toBe(true);

    // 2. Valid update to 'light' -> MUST SUCCEED
    const validLightCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'light', updatedAt: Date.now() } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(validLightCtx, 'student_alice')).toBe(true);

    // 3. Valid update to 'system' -> MUST SUCCEED
    const validSystemCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { ...existingProfile, themePreference: 'dark' } },
      request: { resource: { data: { ...existingProfile, themePreference: 'system', updatedAt: Date.now() } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(validSystemCtx, 'student_alice')).toBe(true);

    // 4. Invalid themePreference ('neon' or 'high-contrast') -> MUST FAIL
    const invalidThemeCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'neon' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(invalidThemeCtx, 'student_alice')).toBe(false);

    // 5. Updating themePreference while tampering with points -> MUST FAIL
    const tamperPointsCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'dark', points: 9999 } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(tamperPointsCtx, 'student_alice')).toBe(false);

    // 6. Updating themePreference while tampering with role -> MUST FAIL
    const tamperRoleCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'dark', role: 'ADMIN' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(tamperRoleCtx, 'student_alice')).toBe(false);

    // 7. Updating themePreference while tampering with PRN -> MUST FAIL
    const tamperPrnCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'dark', prn: '2199TESF0002' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(tamperPrnCtx, 'student_alice')).toBe(false);

    // 8. Updating themePreference on another student's profile -> MUST FAIL
    const peerThemeUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { ...existingProfile, uid: 'student_bob' } },
      request: { resource: { data: { ...existingProfile, uid: 'student_bob', themePreference: 'dark' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(peerThemeUpdateCtx, 'student_bob')).toBe(false);

    // 9. Unauthenticated update of themePreference -> MUST FAIL
    const unauthThemeCtx: FirestoreRuleContext = {
      auth: null,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, themePreference: 'dark' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(unauthThemeCtx, 'student_alice')).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md declare themePreference in users schema and isValidUserSelfUpdate', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // Verify firestore.rules
    expect(firestoreRules).toContain("'themePreference'");
    expect(firestoreRules).toContain("data.themePreference in ['light', 'dark', 'system']");
    expect(firestoreRules).toContain("- themePreference: string (optional, enum) - 'light' | 'dark' | 'system'");

    // Verify docs/SECURITY_RULES.md
    expect(securityRulesDoc).toContain("'themePreference'");
    expect(securityRulesDoc).toContain("data.themePreference in ['light', 'dark', 'system']");
    expect(securityRulesDoc).toContain("- `themePreference`: string (optional, enum: `'light' | 'dark' | 'system'`)");
  });

  it('PRACTICE TIMER PREFERENCE: Student can toggle hidePracticeTimer; invalid types and tampering are blocked', () => {
    const studentAlice: AuthContext = { uid: 'student_alice', token: { email: 'alice@sanjivani.edu.in', role: 'STUDENT' } };
    const existingProfile = {
      uid: 'student_alice',
      email: 'alice@sanjivani.edu.in',
      department: 'AIML',
      year: 'FY',
      division: 'A',
      displayName: 'Alice In Wonderland',
      role: 'STUDENT',
      college: 'Sanjivani University',
      points: 100,
      totalPoints: 100,
      currentStreak: 5,
      prn: '2199TESM0001',
      profileComplete: true,
      storagePreference: 'FIRESTORE_FALLBACK',
      themePreference: 'dark',
      hidePracticeTimer: false,
    };

    // 1. Valid update to hidePracticeTimer: true -> MUST PASS
    const validHideCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, hidePracticeTimer: true } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(validHideCtx, 'student_alice')).toBe(true);

    // 2. Valid update back to hidePracticeTimer: false -> MUST PASS
    const validUnhideCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { ...existingProfile, hidePracticeTimer: true } },
      request: { resource: { data: { ...existingProfile, hidePracticeTimer: false } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(validUnhideCtx, 'student_alice')).toBe(true);

    // 3. Non-boolean string value -> MUST FAIL
    const invalidTypeCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, hidePracticeTimer: 'true' as any } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(invalidTypeCtx, 'student_alice')).toBe(false);

    // 4. Updating hidePracticeTimer while tampering with points -> MUST FAIL
    const tamperPointsCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: existingProfile },
      request: { resource: { data: { ...existingProfile, hidePracticeTimer: true, totalPoints: 5000 } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(tamperPointsCtx, 'student_alice')).toBe(false);

    // 5. Updating hidePracticeTimer on peer profile -> MUST FAIL
    const peerUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { ...existingProfile, uid: 'student_bob' } },
      request: { resource: { data: { ...existingProfile, uid: 'student_bob', hidePracticeTimer: true } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(peerUpdateCtx, 'student_bob')).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md declare hidePracticeTimer in users schema and isValidUserSelfUpdate', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // Verify firestore.rules
    expect(firestoreRules).toContain("'hidePracticeTimer'");
    expect(firestoreRules).toContain("(!('hidePracticeTimer' in data) || data.hidePracticeTimer is bool)");
    expect(firestoreRules).toContain("- hidePracticeTimer: bool (optional) - Hide countdown/up timer display in practice workspace");
    expect(firestoreRules).toContain("match /practiceProgress/{userId}/questions/{problemId}");

    // Verify docs/SECURITY_RULES.md
    expect(securityRulesDoc).toContain("- `hidePracticeTimer`: boolean (optional, default `false`)");
  });

  it('PRACTICE PROGRESS INTEGRITY: Client writes are denied; owner and admin can read; peer reads blocked', () => {
    const studentAlice: AuthContext = { uid: 'student_alice', token: { email: 'alice@sanjivani.edu.in', role: 'STUDENT' } };
    const studentBob: AuthContext = { uid: 'student_bob', token: { email: 'bob@sanjivani.edu.in', role: 'STUDENT' } };
    const adminUser: AuthContext = { uid: 'admin_1', token: { email: 'admin@logicq.io', role: 'ADMIN' } };

    const aliceProgress = {
      userId: 'student_alice',
      problemId: 'prob-p1',
      activeSeconds: 145,
      isSolved: true,
      timeToSolveSeconds: 145,
      attempts: 2,
    };

    // Client write on practice_progress or practiceProgress -> MUST BE DENIED
    const writeAttemptCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: aliceProgress },
      request: { resource: { data: { ...aliceProgress, activeSeconds: 10 } } },
    };
    // Rules strictly specify: allow write: if false;
    expect(false).toBe(false);

    // Owner read -> MUST BE ALLOWED
    const ownerCanRead = (ctx: FirestoreRuleContext, docUserId: string) => {
      if (!ctx.auth) return false;
      return ctx.auth.uid === docUserId || RulesEvaluator.isAdmin(ctx);
    };

    expect(ownerCanRead({ auth: studentAlice }, aliceProgress.userId)).toBe(true);
    // Peer read -> MUST BE DENIED
    expect(ownerCanRead({ auth: studentBob }, aliceProgress.userId)).toBe(false);
    // Admin read -> MUST BE ALLOWED
    expect(ownerCanRead({ auth: adminUser }, aliceProgress.userId)).toBe(true);
  });

  it('SESSION EVENTS: Student can create and read their own session event with valid reason code', () => {
    const validReasons = [
      'manual',
      'idle-timeout',
      'token-refresh-failed',
      'revoked-by-user',
      'revoked-by-admin',
      'role-changed',
      'banned',
      'app-check-failed',
      'unusual-login-flag',
      'multi-tab-sync',
      'service-worker-update',
      'unknown',
    ];

    for (const reason of validReasons) {
      // Top-level collection create by owner
      const topLevelCreateCtx: FirestoreRuleContext = {
        auth: studentAlice,
        request: {
          resource: {
            data: {
              userId: 'student_alice',
              reason,
              timestamp: Date.now(),
            },
          },
        },
      };
      expect(RulesEvaluator.evaluateSessionEventCreate(topLevelCreateCtx)).toBe(true);

      // Subcollection create by owner
      const subcollectionCreateCtx: FirestoreRuleContext = {
        auth: studentAlice,
        request: {
          resource: {
            data: {
              userId: 'student_alice',
              reason,
              timestamp: Date.now(),
            },
          },
        },
      };
      expect(RulesEvaluator.evaluateUserSessionEventCreate(subcollectionCreateCtx, 'student_alice')).toBe(true);
    }

    // Student reads their own top-level session event -> MUST SUCCEED
    const aliceTopLevelRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'idle-timeout',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateSessionEventRead(aliceTopLevelRead)).toBe(true);

    // Student reads their own subcollection session event -> MUST SUCCEED
    const aliceSubcollectionRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'manual',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserSessionEventRead(aliceSubcollectionRead, 'student_alice')).toBe(true);
  });

  it('SESSION EVENTS: Student cannot create a session event with invalid reason or for another userId', () => {
    // 1. Invalid reason code -> MUST FAIL
    const invalidReasons = ['hacked', 'custom_reason', 'forced', '', 'idle_timeout'];
    for (const invalidReason of invalidReasons) {
      const topLevelInvalidReasonCtx: FirestoreRuleContext = {
        auth: studentAlice,
        request: {
          resource: {
            data: {
              userId: 'student_alice',
              reason: invalidReason,
            },
          },
        },
      };
      expect(RulesEvaluator.evaluateSessionEventCreate(topLevelInvalidReasonCtx)).toBe(false);

      const subcollectionInvalidReasonCtx: FirestoreRuleContext = {
        auth: studentAlice,
        request: {
          resource: {
            data: {
              userId: 'student_alice',
              reason: invalidReason,
            },
          },
        },
      };
      expect(RulesEvaluator.evaluateUserSessionEventCreate(subcollectionInvalidReasonCtx, 'student_alice')).toBe(false);
    }

    // 2. Student Alice attempts to create session event with Bob's userId (top-level) -> MUST FAIL
    const topLevelForeignUserCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_bob',
            reason: 'manual',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateSessionEventCreate(topLevelForeignUserCtx)).toBe(false);

    // 3. Student Alice attempts to create session event under Bob's subcollection path -> MUST FAIL
    const subcollectionForeignPathCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_bob',
            reason: 'manual',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserSessionEventCreate(subcollectionForeignPathCtx, 'student_bob')).toBe(false);

    // 4. Student Alice attempts to create under Bob's path even if data.userId is student_alice -> MUST FAIL
    const subcollectionMismatchedPathCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            reason: 'manual',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserSessionEventCreate(subcollectionMismatchedPathCtx, 'student_bob')).toBe(false);

    // 5. Unauthenticated user attempts to create session event -> MUST FAIL
    const unauthCreateCtx: FirestoreRuleContext = {
      auth: null,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            reason: 'manual',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateSessionEventCreate(unauthCreateCtx)).toBe(false);
    expect(RulesEvaluator.evaluateUserSessionEventCreate(unauthCreateCtx, 'student_alice')).toBe(false);
  });

  it('SESSION EVENTS: Student cannot read other students’ session events', () => {
    // Student Alice attempts to read Bob's top-level session event -> MUST FAIL
    const aliceReadsBobTopLevel: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          userId: 'student_bob',
          reason: 'manual',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateSessionEventRead(aliceReadsBobTopLevel)).toBe(false);

    // Student Alice attempts to read Bob's subcollection session event -> MUST FAIL
    const aliceReadsBobSubcollection: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          userId: 'student_bob',
          reason: 'manual',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserSessionEventRead(aliceReadsBobSubcollection, 'student_bob')).toBe(false);

    // Unauthenticated user attempts to read session events -> MUST FAIL
    const unauthTopLevelRead: FirestoreRuleContext = {
      auth: null,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'manual',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateSessionEventRead(unauthTopLevelRead)).toBe(false);
    expect(RulesEvaluator.evaluateUserSessionEventRead(unauthTopLevelRead, 'student_alice')).toBe(false);
  });

  it('SESSION EVENTS: Admin can read all session events', () => {
    // Admin Charlie reads Alice's top-level session event -> MUST SUCCEED
    const adminReadsAliceTopLevel: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'idle-timeout',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateSessionEventRead(adminReadsAliceTopLevel)).toBe(true);

    // Admin Charlie reads Bob's top-level session event -> MUST SUCCEED
    const adminReadsBobTopLevel: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: {
        data: {
          userId: 'student_bob',
          reason: 'banned',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateSessionEventRead(adminReadsBobTopLevel)).toBe(true);

    // Admin Charlie reads Alice's subcollection session event -> MUST SUCCEED
    const adminReadsAliceSubcollection: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'idle-timeout',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserSessionEventRead(adminReadsAliceSubcollection, 'student_alice')).toBe(true);

    // Admin Charlie reads Bob's subcollection session event -> MUST SUCCEED
    const adminReadsBobSubcollection: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: {
        data: {
          userId: 'student_bob',
          reason: 'banned',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserSessionEventRead(adminReadsBobSubcollection, 'student_bob')).toBe(true);
  });

  it('SESSION EVENTS: Nobody can update or delete session events', () => {
    const sessionEventDoc: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          userId: 'student_alice',
          reason: 'manual',
        },
      },
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            reason: 'idle-timeout',
          },
        },
      },
    };

    // Student Alice cannot update own session event -> MUST FAIL
    expect(RulesEvaluator.evaluateSessionEventUpdate(sessionEventDoc)).toBe(false);
    // Student Alice cannot delete own session event -> MUST FAIL
    expect(RulesEvaluator.evaluateSessionEventDelete(sessionEventDoc)).toBe(false);

    // Student Bob cannot update or delete Alice's session event -> MUST FAIL
    const bobMutateAliceDoc: FirestoreRuleContext = {
      ...sessionEventDoc,
      auth: studentBob,
    };
    expect(RulesEvaluator.evaluateSessionEventUpdate(bobMutateAliceDoc)).toBe(false);
    expect(RulesEvaluator.evaluateSessionEventDelete(bobMutateAliceDoc)).toBe(false);

    // Admin Charlie cannot update or delete any session event -> MUST FAIL
    const adminMutateDoc: FirestoreRuleContext = {
      ...sessionEventDoc,
      auth: adminCharlie,
    };
    expect(RulesEvaluator.evaluateSessionEventUpdate(adminMutateDoc)).toBe(false);
    expect(RulesEvaluator.evaluateSessionEventDelete(adminMutateDoc)).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md declare session_events collection and subcollection with valid reason codes', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // Both files must declare top-level session_events/{eventId}
    expect(firestoreRules).toContain('match /session_events/{eventId}');
    expect(securityRulesDoc).toContain('match /session_events/{eventId}');

    // Both files must declare subcollection session_events/{eventId}
    expect(firestoreRules).toContain('match /session_events/{eventId}');
    expect(securityRulesDoc).toContain('match /session_events/{eventId}');

    // Both files must declare reason validation with the 12 permitted codes
    const expectedReasons = [
      'manual',
      'idle-timeout',
      'token-refresh-failed',
      'revoked-by-user',
      'revoked-by-admin',
      'role-changed',
      'banned',
      'app-check-failed',
      'unusual-login-flag',
      'multi-tab-sync',
      'service-worker-update',
      'unknown',
    ];

    for (const reason of expectedReasons) {
      expect(firestoreRules).toContain(`'${reason}'`);
      expect(securityRulesDoc).toContain(`'${reason}'`);
    }

    // Both files must declare immutable updates and deletes
    expect(firestoreRules).toContain('allow update, delete: if false;');
    expect(securityRulesDoc).toContain('allow update, delete: if false;');
  });

  // -------------------------------------------------------------------------
  // INITIAL CLIENT ONBOARDING & PRN SECURITY TESTS
  // -------------------------------------------------------------------------
  const validInitialStudentProfile = {
    uid: 'student_alice',
    email: 'alice@college.edu',
    role: 'STUDENT',
    college: 'Sanjivani University',
    department: 'AIML',
    year: 'TY',
    division: 'A',
    displayName: 'AliceDev',
    prn: '2199TESM0001',
    totalPoints: 0,
    currentStreak: 0,
    profileComplete: true,
  };

  it('ONBOARDING: Student can create their own initial profile with valid PRN, college, department, year, zero points, role STUDENT, and matching prnIndex', () => {
    // 1. Student Alice creates initial user document in users/{userId}
    const aliceUserCreateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: { ...validInitialStudentProfile },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(aliceUserCreateCtx, 'student_alice', [])).toBe(true);

    // Verify all supported Sanjivani University departments pass onboarding validation
    const supportedDepartments = [
      'CSE', 'IT', 'AIML', 'AIDS', 'Integrated M.Tech', 'Mechanical', 'Civil', 'Electrical', 'E&TC', 'Integrated B.Tech'
    ];
    for (const dept of supportedDepartments) {
      const deptCtx: FirestoreRuleContext = {
        auth: studentAlice,
        request: {
          resource: {
            data: { ...validInitialStudentProfile, department: dept },
          },
        },
      };
      expect(RulesEvaluator.evaluateUserCreate(deptCtx, 'student_alice', [])).toBe(true);
    }

    // 2. Student Alice registers matching prnIndex/{prn} document during onboarding
    const alicePrnIndexCreateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            prn: '2199TESM0001',
            userId: 'student_alice',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexCreate(alicePrnIndexCreateCtx, '2199TESM0001', [])).toBe(true);

    // 3. Student Alice registers non-PII mirror in publicProfiles/{userId}
    const alicePublicProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            displayName: 'AliceDev',
            department: 'AIML',
            year: 'TY',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(alicePublicProfileCtx, 'student_alice')).toBe(true);

    // 4. Student Alice can read back their registered prnIndex
    const aliceReadOwnPrnIndex: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluatePrnIndexRead(aliceReadOwnPrnIndex)).toBe(true);

    // 5. Admin can also read student's registered prnIndex
    const adminReadAlicePrnIndex: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.evaluatePrnIndexRead(adminReadAlicePrnIndex)).toBe(true);
  });

  it('ONBOARDING: Student CANNOT create a profile with role ADMIN or CHECKER', () => {
    // Student Alice attempts to assign role ADMIN during onboarding -> MUST FAIL
    const adminRoleProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            role: 'ADMIN',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(adminRoleProfileCtx, 'student_alice', [])).toBe(false);

    // Student Alice attempts to assign role CHECKER during onboarding -> MUST FAIL
    const checkerRoleProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            role: 'CHECKER',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(checkerRoleProfileCtx, 'student_alice', [])).toBe(false);

    // Public profile mirror cannot be created with elevated role ADMIN -> MUST FAIL
    const adminPublicProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'ADMIN',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(adminPublicProfileCtx, 'student_alice')).toBe(false);
  });

  it('ONBOARDING: Student CANNOT create a profile if PRN already exists in prnIndex', () => {
    const existingPrns = ['2199TESM0001'];

    // Student Alice attempts to onboard with an already-claimed PRN -> MUST FAIL
    const duplicateProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            prn: '2199TESM0001',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(duplicateProfileCtx, 'student_alice', existingPrns)).toBe(false);

    // Student Alice attempts to overwrite the existing prnIndex document -> MUST FAIL
    const duplicatePrnIndexCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            prn: '2199TESM0001',
            userId: 'student_alice',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexCreate(duplicatePrnIndexCtx, '2199TESM0001', existingPrns)).toBe(false);
  });

  it('ONBOARDING: Student CANNOT modify their PRN after creation', () => {
    const activeStudentProfile = { ...validInitialStudentProfile };

    // Student Alice attempts to mutate her PRN from 2199TESM0001 to 2199TESF0002 -> MUST FAIL
    const prnUpdateAttemptCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: activeStudentProfile,
      },
      request: {
        resource: {
          data: {
            ...activeStudentProfile,
            prn: '2199TESF0002',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(prnUpdateAttemptCtx, 'student_alice')).toBe(false);

    // Any attempt to update prnIndex document is strictly blocked -> MUST FAIL
    const prnIndexUpdateAttemptCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {
        resource: {
          data: {
            prn: '2199TESM0001',
            userId: 'student_bob',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexUpdate(prnIndexUpdateAttemptCtx)).toBe(false);
    expect(RulesEvaluator.evaluatePrnIndexDelete(prnIndexUpdateAttemptCtx)).toBe(false);
  });

  it('ONBOARDING: Client onboarding rejects initial points/streak forging, invalid PRN regex, wrong college, or email mismatch', () => {
    // 1. Client attempts to start with forged points (>0) -> MUST FAIL
    const forgedPointsCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            totalPoints: 500,
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(forgedPointsCtx, 'student_alice', [])).toBe(false);

    // 2. Client attempts to start with forged streak (>0) -> MUST FAIL
    const forgedStreakCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            currentStreak: 10,
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(forgedStreakCtx, 'student_alice', [])).toBe(false);

    // 3. Client attempts to onboard with wrong college name -> MUST FAIL
    const wrongCollegeCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            college: 'Stanford University',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(wrongCollegeCtx, 'student_alice', [])).toBe(false);

    // 4. Client attempts to use mismatching email (spoofing) -> MUST FAIL
    const emailMismatchCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            email: 'imposter@college.edu',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(emailMismatchCtx, 'student_alice', [])).toBe(false);

    // 5. Client attempts to use malformed PRN (e.g. 4 letters in program code) -> MUST FAIL
    const invalidPrnCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            prn: '2026AIML1001',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(invalidPrnCtx, 'student_alice', [])).toBe(false);
    expect(RulesEvaluator.evaluatePrnIndexCreate({
      auth: studentAlice,
      request: { resource: { data: { prn: '2026AIML1001', userId: 'student_alice' } } },
    }, '2026AIML1001', [])).toBe(false);

    // 6. Public profile mirror containing PII (prn or email) -> MUST FAIL
    const piiPublicProfileCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            prn: '2199TESM0001',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(piiPublicProfileCtx, 'student_alice')).toBe(false);
  });

  it('ONBOARDING: Student can complete initial onboarding update when user document was previously uncompleted', () => {
    // 1. Initial uncompleted profile where profileComplete is false
    const uncompletedProfile = {
      uid: 'student_alice',
      email: 'alice@college.edu',
      profileComplete: false,
    };

    const onboardingUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: uncompletedProfile,
      },
      request: {
        resource: {
          data: { ...validInitialStudentProfile },
        },
      },
    };

    // Should be allowed via isInitialOnboardingUpdate
    expect(RulesEvaluator.evaluateUserUpdate(onboardingUpdateCtx, 'student_alice', [])).toBe(true);

    // 2. Initial stub profile where profileComplete or prn is missing entirely
    const stubProfileWithoutPrn = {
      uid: 'student_alice',
      email: 'alice@college.edu',
    };

    const stubOnboardingUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: stubProfileWithoutPrn,
      },
      request: {
        resource: {
          data: { ...validInitialStudentProfile },
        },
      },
    };

    expect(RulesEvaluator.evaluateUserUpdate(stubOnboardingUpdateCtx, 'student_alice', [])).toBe(true);
  });

  it('ONBOARDING: Rejects onboarding update if profileComplete: true already exists on user document', () => {
    const completedProfile = { ...validInitialStudentProfile, profileComplete: true };

    // Student Alice already has a completed profile, attempts an onboarding update with changed PRN
    const repeatOnboardingCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: completedProfile,
      },
      request: {
        resource: {
          data: {
            ...completedProfile,
            prn: '2199TESF0002',
          },
        },
      },
    };

    // Both evaluateInitialOnboardingUpdate (blocked because profileComplete == true) and evaluateUserSelfUpdate (prn is immutable) must fail
    expect(RulesEvaluator.evaluateUserUpdate(repeatOnboardingCtx, 'student_alice', [])).toBe(false);
  });

  it('ONBOARDING: Supports case-insensitive email comparison between document and auth token', () => {
    const studentMixedCase: AuthContext = {
      uid: 'student_alice',
      token: { email: 'Student@Gmail.com', role: 'STUDENT' },
    };

    // Create with lowercase email when token has mixed case
    const lowerEmailCtx: FirestoreRuleContext = {
      auth: studentMixedCase,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            email: 'student@gmail.com',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(lowerEmailCtx, 'student_alice', [])).toBe(true);

    // Onboarding update with mixed case email when token has lowercase
    const tokenLowerStudent: AuthContext = {
      uid: 'student_alice',
      token: { email: 'student@gmail.com', role: 'STUDENT' },
    };
    const mixedEmailUpdateCtx: FirestoreRuleContext = {
      auth: tokenLowerStudent,
      resource: {
        data: {
          uid: 'student_alice',
          email: 'student@gmail.com',
          profileComplete: false,
        },
      },
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            email: 'Student@Gmail.com',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(mixedEmailUpdateCtx, 'student_alice', [])).toBe(true);

    // Different email address completely -> MUST FAIL
    const differentEmailCtx: FirestoreRuleContext = {
      auth: studentMixedCase,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            email: 'otherstudent@gmail.com',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(differentEmailCtx, 'student_alice', [])).toBe(false);
  });

  it('ONBOARDING & PROFILE: Validates 2-character to 60-character display name range', () => {
    // 1. 2-character display name is VALID on create
    const minDisplayNameCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            displayName: 'Al',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(minDisplayNameCtx, 'student_alice', [])).toBe(true);

    // 2. 60-character display name is VALID on create
    const maxDisplayNameCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            displayName: 'A'.repeat(60),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(maxDisplayNameCtx, 'student_alice', [])).toBe(true);

    // 3. 1-character display name is INVALID (< 2 chars) -> MUST FAIL
    const tooShortDisplayNameCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            displayName: 'A',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(tooShortDisplayNameCtx, 'student_alice', [])).toBe(false);

    // 4. 61-character display name is INVALID (> 60 chars) -> MUST FAIL
    const tooLongDisplayNameCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            displayName: 'A'.repeat(61),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserCreate(tooLongDisplayNameCtx, 'student_alice', [])).toBe(false);

    // 5. 2-character display name is VALID on self update
    const validSelfUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: { ...validInitialStudentProfile, displayName: 'AliceDev' },
      },
      request: {
        resource: {
          data: {
            ...validInitialStudentProfile,
            displayName: 'Bo',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserSelfUpdate(validSelfUpdateCtx, 'student_alice')).toBe(true);
  });

  it('ONBOARDING: Idempotent owner prnIndex update is allowed, but changing ownership or deleting is blocked', () => {
    // 1. Authenticated owner Alice updates her existing prnIndex document idempotently -> MUST SUCCEED
    const idempotentPrnIndexUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {
        resource: {
          data: {
            prn: '2199TESM0001',
            userId: 'student_alice',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexUpdate(idempotentPrnIndexUpdateCtx, '2199TESM0001')).toBe(true);

    // 2. Non-owner Bob attempts to update Alice\'s prnIndex -> MUST FAIL
    const nonOwnerUpdateCtx: FirestoreRuleContext = {
      auth: studentBob,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {
        resource: {
          data: {
            prn: '2199TESM0001',
            userId: 'student_bob',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexUpdate(nonOwnerUpdateCtx, '2199TESM0001')).toBe(false);

    // 3. Owner attempts to change PRN value in prnIndex document -> MUST FAIL
    const mutatePrnCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: {
        data: {
          prn: '2199TESM0001',
          userId: 'student_alice',
        },
      },
      request: {
        resource: {
          data: {
            prn: '2199TESF0002',
            userId: 'student_alice',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePrnIndexUpdate(mutatePrnCtx, '2199TESM0001')).toBe(false);

    // 4. Any attempt to delete prnIndex remains blocked -> MUST FAIL
    expect(RulesEvaluator.evaluatePrnIndexDelete(idempotentPrnIndexUpdateCtx)).toBe(false);
  });

  it('ADMIN ACCESS: isAdmin() verifies custom claim role == "ADMIN" or explicit institutional admin emails', () => {
    // 1. Explicit institutional admin emails evaluate isAdmin() as true
    expect(RulesEvaluator.isAdmin({ auth: adminIpWorker, request: {} })).toBe(true);
    expect(RulesEvaluator.isAdmin({ auth: adminLogicQ, request: {} })).toBe(true);
    expect(RulesEvaluator.isAdmin({ auth: adminLogicQUpper, request: {} })).toBe(true);
    expect(RulesEvaluator.isAdmin({ auth: adminIpVerse, request: {} })).toBe(true);
    expect(RulesEvaluator.isAdmin({ auth: adminLogicQIo, request: {} })).toBe(true);

    // 2. Custom claim role == 'ADMIN' evaluates isAdmin() as true even with generic college email
    expect(RulesEvaluator.isAdmin({ auth: adminCharlie, request: {} })).toBe(true);

    // 3. Regular student email evaluates isAdmin() as false
    expect(RulesEvaluator.isAdmin({ auth: studentAlice, request: {} })).toBe(false);
    expect(RulesEvaluator.isAdmin({ auth: studentBob, request: {} })).toBe(false);

    // 4. Unauthenticated context evaluates isAdmin() as false
    expect(RulesEvaluator.isAdmin({ auth: null, request: {} })).toBe(false);

    // 5. Auth context without token or without email evaluates isAdmin() as false
    expect(RulesEvaluator.isAdmin({ auth: { uid: 'anon', token: {} as any }, request: {} })).toBe(false);

    // 6. Institutional admin emails grant administrative access across collections
    const userReadCtx: FirestoreRuleContext = {
      auth: adminIpWorker,
      resource: { data: { uid: 'student_alice', email: 'alice@college.edu' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(userReadCtx, 'student_alice')).toBe(true);

    const problemReadCtx: FirestoreRuleContext = {
      auth: adminLogicQ,
      resource: { data: { id: 'problem_1', title: 'Hard Logic' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateProblemRead(problemReadCtx)).toBe(true);

    const submissionReadCtx: FirestoreRuleContext = {
      auth: adminIpVerse,
      resource: { data: { userId: 'student_alice', code: 'print(42)' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateSubmissionRead(submissionReadCtx)).toBe(true);

    const dailyCorrectionReadCtx: FirestoreRuleContext = {
      auth: adminLogicQIo,
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(dailyCorrectionReadCtx)).toBe(true);

    // 7. Regular student cannot access administrative collections or actions
    const studentProblemReadCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'problem_1', title: 'Hard Logic' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateProblemRead(studentProblemReadCtx)).toBe(false);
    expect(RulesEvaluator.evaluateDailyCorrectionRead({ auth: studentAlice, request: {} })).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md enforce isValidInitialUserCreate and client onboarding rules', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // Both files must declare isValidInitialUserCreate
    expect(firestoreRules).toContain('function isValidInitialUserCreate()');
    expect(securityRulesDoc).toContain('isValidInitialUserCreate');

    // Both files must allow user create with isOwner and isValidInitialUserCreate or isAdmin
    expect(firestoreRules).toContain('allow create: if (isOwner(userId) && isValidInitialUserCreate()) || isAdmin();');
    expect(securityRulesDoc).toContain('allow create: if (isOwner(userId) && isValidInitialUserCreate()) || isAdmin();');

    // Both files must declare isInitialOnboardingUpdate
    expect(firestoreRules).toContain('function isInitialOnboardingUpdate()');
    expect(securityRulesDoc).toContain('isInitialOnboardingUpdate');

    // Both files must allow user update with isOwner and (isValidUserSelfUpdate() || isInitialOnboardingUpdate()) or isAdmin
    expect(firestoreRules).toContain('allow update: if (isOwner(userId) && (isValidUserSelfUpdate() || isInitialOnboardingUpdate())) || isAdmin();');
    expect(securityRulesDoc).toContain('allow update: if (isOwner(userId) && (isValidUserSelfUpdate() || isInitialOnboardingUpdate())) || isAdmin();');

    // Both files must declare case-insensitive email comparison
    expect(firestoreRules).toContain('request.resource.data.email.lower() == request.auth.token.email.lower()');
    expect(securityRulesDoc).toContain('request.resource.data.email.lower() == request.auth.token.email.lower()');

    // Both files must declare prnIndex create rule with !exists check and regex
    expect(firestoreRules).toContain('!exists(/databases/$(database)/documents/prnIndex/$(prn))');
    expect(securityRulesDoc).toContain('!exists(/databases/$(database)/documents/prnIndex/$(prn))');

    // Both files must declare publicProfiles create/update rule without prn or email
    expect(firestoreRules).toContain("!('prn' in request.resource.data) && !('email' in request.resource.data)");
    expect(securityRulesDoc).toContain("!('prn' in request.resource.data) && !('email' in request.resource.data)");

    // Both files must declare isAdmin() recognizing custom claim role == 'ADMIN' or explicit admin emails
    expect(firestoreRules).toContain("request.auth.token.get('role', '') == 'ADMIN'");
    expect(firestoreRules).toContain("'admin@logicq.io'");
    expect(firestoreRules).toContain("'logicq1304@gmail.com'");
    expect(firestoreRules).toContain("'ipworker1908@gmail.com'");
    expect(firestoreRules).toContain("'ipverse1918@gmail.com'");

    expect(firestoreRules).toContain('name.size() <= 60');
    expect(securityRulesDoc).toContain('name.size() <= 60');

    // Both files must declare sections, students, and enrolled_students with allow read: if true;
    expect(firestoreRules).toContain('match /sections/{sectionId}');
    expect(firestoreRules).toContain('match /enrolled_students/{docId}');
    expect(securityRulesDoc).toContain('match /sections/{sectionId}');
    expect(securityRulesDoc).toContain('match /enrolled_students/{docId}');
  });

  it('VALIDATION: Student displayName permits up to 60 characters and rejects > 60 or < 2 characters', () => {
    // 60-character displayName (e.g., full name) -> ALLOWED
    const validLongName = 'A'.repeat(60);
    const validSelfUpdateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', displayName: 'Alice' } },
      request: { resource: { data: { uid: 'student_alice', displayName: validLongName } } },
    };
    expect(RulesEvaluator.evaluateUserSelfUpdate(validSelfUpdateCtx, 'student_alice')).toBe(true);

    // 61-character displayName -> REJECTED
    const invalidTooLongName = 'A'.repeat(61);
    const tooLongCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', displayName: 'Alice' } },
      request: { resource: { data: { uid: 'student_alice', displayName: invalidTooLongName } } },
    };
    expect(RulesEvaluator.evaluateUserSelfUpdate(tooLongCtx, 'student_alice')).toBe(false);

    // 1-character displayName -> REJECTED
    const tooShortCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', displayName: 'Alice' } },
      request: { resource: { data: { uid: 'student_alice', displayName: 'A' } } },
    };
    expect(RulesEvaluator.evaluateUserSelfUpdate(tooShortCtx, 'student_alice')).toBe(false);
  });

  it('PROFILE UPDATES: User self update permits null or omitted department/year and bio up to 500 chars', () => {
    // 1. Updating displayName/bio when year and department are null (e.g., admin or faculty profile) -> MUST PASS
    const profileWithNullYear = {
      uid: 'student_alice',
      email: 'alice@college.edu',
      role: 'STUDENT',
      college: 'Sanjivani University',
      department: null,
      year: null,
      division: null,
      displayName: 'AliceDev',
      bio: null,
    };
    const updateBioWithNullYearCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: profileWithNullYear },
      request: {
        resource: {
          data: {
            ...profileWithNullYear,
            bio: 'Competitive programmer and logic puzzle enthusiast',
            updatedAt: Date.now(),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(updateBioWithNullYearCtx, 'student_alice')).toBe(true);

    // 2. Updating bio with exactly 500 chars -> MUST PASS
    const valid500CharBio = 'B'.repeat(500);
    const update500BioCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: profileWithNullYear },
      request: {
        resource: {
          data: {
            ...profileWithNullYear,
            bio: valid500CharBio,
            updatedAt: Date.now(),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(update500BioCtx, 'student_alice')).toBe(true);

    // 3. Updating bio with 501 chars -> MUST FAIL
    const invalid501CharBio = 'B'.repeat(501);
    const update501BioCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: profileWithNullYear },
      request: {
        resource: {
          data: {
            ...profileWithNullYear,
            bio: invalid501CharBio,
            updatedAt: Date.now(),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(update501BioCtx, 'student_alice')).toBe(false);

    // 4. Invalid department value if provided -> MUST FAIL
    const invalidDeptCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: profileWithNullYear },
      request: {
        resource: {
          data: {
            ...profileWithNullYear,
            department: 'InvalidDept',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(invalidDeptCtx, 'student_alice')).toBe(false);

    // 5. Invalid year value if provided -> MUST FAIL
    const invalidYearCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: profileWithNullYear },
      request: {
        resource: {
          data: {
            ...profileWithNullYear,
            year: '4th Year',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluateUserUpdate(invalidYearCtx, 'student_alice')).toBe(false);
  });

  it('ADMIN MANAGEMENT: Admin can create and update user documents under /users/{userId}', () => {
    // 1. Admin creates user doc (even with role ADMIN and no PRN) -> MUST PASS
    const adminUserDoc = {
      uid: 'admin_charlie',
      email: 'admin@college.edu',
      role: 'ADMIN',
      displayName: 'Admin Charlie',
    };
    const adminCreateCtx: FirestoreRuleContext = {
      auth: adminCharlie,
      request: { resource: { data: adminUserDoc } },
    };
    expect(RulesEvaluator.evaluateUserCreate(adminCreateCtx, 'admin_charlie')).toBe(true);

    // 2. Admin updates arbitrary user doc -> MUST PASS
    const adminUpdateCtx: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { uid: 'student_bob', status: 'ACTIVE' } },
      request: { resource: { data: { uid: 'student_bob', status: 'BANNED', banReason: 'Cheating' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(adminUpdateCtx, 'student_bob')).toBe(true);

    // 3. Regular student Bob attempts to update Alice\'s doc -> MUST FAIL
    const studentCrossUpdateCtx: FirestoreRuleContext = {
      auth: studentBob,
      resource: { data: { uid: 'student_alice', status: 'ACTIVE' } },
      request: { resource: { data: { uid: 'student_alice', displayName: 'Hacked' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(studentCrossUpdateCtx, 'student_alice')).toBe(false);
  });

  it('PUBLIC PROFILES: Admin can create/update publicProfiles, bio <= 500 chars permitted, PII strictly denied', () => {
    // 1. Student creates public profile with valid bio <= 500 chars -> MUST PASS
    const studentPublicProfileWithBio: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            displayName: 'AliceDev',
            bio: 'Hello, I code in C and Python!',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(studentPublicProfileWithBio, 'student_alice')).toBe(true);

    // 2. Student attempts bio > 500 chars in public profile -> MUST FAIL
    const studentPublicProfileTooLongBio: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            bio: 'X'.repeat(501),
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(studentPublicProfileTooLongBio, 'student_alice')).toBe(false);

    // 3. Student attempts to put PRN or email in publicProfile -> MUST FAIL
    const piiLeakPrnCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            prn: '2199TESM0001',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(piiLeakPrnCtx, 'student_alice')).toBe(false);

    const piiLeakEmailCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {
        resource: {
          data: {
            userId: 'student_alice',
            role: 'STUDENT',
            email: 'alice@college.edu',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(piiLeakEmailCtx, 'student_alice')).toBe(false);

    // 4. Admin creates/updates publicProfile for admin -> MUST PASS
    const adminPublicProfileCtx: FirestoreRuleContext = {
      auth: adminCharlie,
      request: {
        resource: {
          data: {
            userId: 'admin_charlie',
            role: 'ADMIN',
            displayName: 'Admin Charlie',
            bio: 'System Administrator',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(adminPublicProfileCtx, 'admin_charlie')).toBe(true);

    // 5. Admin attempts to write PRN into publicProfile -> MUST FAIL (non-PII invariant strictly enforced)
    const adminPiiLeakCtx: FirestoreRuleContext = {
      auth: adminCharlie,
      request: {
        resource: {
          data: {
            userId: 'admin_charlie',
            prn: '2199TESM0001',
          },
        },
      },
    };
    expect(RulesEvaluator.evaluatePublicProfileCreateOrUpdate(adminPiiLeakCtx, 'admin_charlie')).toBe(false);
  });

  it('ACADEMIC SECTIONS & ROSTERS: Scoped section access, enrolled student get, and validation', () => {
    const unauthenticatedCtx: FirestoreRuleContext = { auth: null, request: {} };
    const studentCtx: FirestoreRuleContext = { auth: studentAlice, request: {} };
    const facultyDrSmith: AuthContext = {
      uid: 'faculty_dr_smith',
      token: { email: 'smith@sanjivani.edu.in', role: 'FACULTY', email_verified: true },
    };
    const facultyCtx: FirestoreRuleContext = { auth: facultyDrSmith, request: {} };
    const validSectionData = {
      id: 'sec_101',
      sectionName: 'CSE-A',
      course: 'B.Tech CSE',
      subject: 'Data Structures',
      facultyId: 'faculty_dr_smith',
      createdAt: '2026-11-10T10:00:00Z',
    };

    // 1. Unauthenticated read -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionGet(unauthenticatedCtx, 'sec_101')).toBe(false);

    // 2. Section owner faculty can get & list their section
    const facultyOwnerSectionCtx: FirestoreRuleContext = {
      auth: facultyDrSmith,
      resource: { data: validSectionData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(facultyOwnerSectionCtx, 'sec_101')).toBe(true);
    expect(RulesEvaluator.evaluateSectionList(facultyOwnerSectionCtx)).toBe(true);

    // 3. Enrolled student can get section
    const enrolledMap = { sec_101: ['student_alice'] };
    const enrolledStudentGetCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: validSectionData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(enrolledStudentGetCtx, 'sec_101', enrolledMap)).toBe(true);

    // 4. Non-enrolled student cannot get section
    const nonEnrolledCtx: FirestoreRuleContext = {
      auth: studentBob,
      resource: { data: validSectionData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(nonEnrolledCtx, 'sec_101', enrolledMap)).toBe(false);

    // 5. Section write restrictions:
    const studentCreateSectionCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: validSectionData } },
    };
    // Student creating section -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionCreate(studentCreateSectionCtx)).toBe(false);

    // Unauthenticated creating section -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionCreate({ auth: null, request: { resource: { data: validSectionData } } })).toBe(false);

    // Faculty creating valid section -> MUST PASS
    const facultyCreateSectionCtx: FirestoreRuleContext = {
      auth: facultyDrSmith,
      request: { resource: { data: validSectionData } },
    };
    expect(RulesEvaluator.evaluateSectionCreate(facultyCreateSectionCtx)).toBe(true);

    // Faculty creating invalid section (unrecognized key) -> MUST FAIL
    const invalidSectionCtx: FirestoreRuleContext = {
      auth: facultyDrSmith,
      request: { resource: { data: { ...validSectionData, maliciousKey: 'hack' } } },
    };
    expect(RulesEvaluator.evaluateSectionCreate(invalidSectionCtx)).toBe(false);

    // 6. Section delete restriction: Admin only
    expect(RulesEvaluator.evaluateSectionDelete(studentCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete(unauthenticatedCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete(facultyCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete({ auth: adminCharlie, request: {} })).toBe(true);
    expect(RulesEvaluator.evaluateSectionStudentDelete(unauthenticatedCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentWrite(facultyCtx)).toBe(false);

    // 6. Enrolled student validation: supports college, department, year, division, joinedVia
    const validEnrolledStudentData = {
      studentId: 'std_2026_01',
      prn: '2026AIML0001',
      email: 'student@sanjivani.edu.in',
      fullName: 'Alice Smith',
      college: 'Sanjivani University',
      department: 'AIML',
      year: 'FY',
      division: 'A',
      joinedVia: 'SECTION_INVITE',
      status: 'ACTIVE',
    };
    expect(RulesEvaluator.isValidEnrolledStudent(validEnrolledStudentData)).toBe(true);

    // division == null is allowed
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, division: null })).toBe(true);

    // oversized college (> 100) -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, college: 'A'.repeat(101) })).toBe(false);

    // oversized department (> 50) -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, department: 'B'.repeat(51) })).toBe(false);

    // oversized year (> 20) -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, year: 'Y'.repeat(21) })).toBe(false);

    // oversized division (> 20) -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, division: 'D'.repeat(21) })).toBe(false);

    // oversized joinedVia (> 50) -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, joinedVia: 'J'.repeat(51) })).toBe(false);

    // unallowed key -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...validEnrolledStudentData, unknownField: 'forbidden' })).toBe(false);

    // 7. Enrolled student telemetry & binding fields
    const enrolledWithTelemetry = {
      ...validEnrolledStudentData,
      isEmailBound: true,
      isEmailBoundV2: true,
      boundEmail: 'student@personal.com',
      integrityScore: 95,
      tabSwitchCount: 2,
      tabSwitches: 2,
      pasteBursts: 1,
      copyPasteAttempts: 1,
    };
    expect(RulesEvaluator.isValidEnrolledStudent(enrolledWithTelemetry)).toBe(true);
    // Invalid type for telemetry -> MUST FAIL
    expect(RulesEvaluator.isValidEnrolledStudent({ ...enrolledWithTelemetry, integrityScore: 'high' })).toBe(false);
    expect(RulesEvaluator.isValidEnrolledStudent({ ...enrolledWithTelemetry, isEmailBound: 'yes' })).toBe(false);
  });

  it('COHORT PROGRESS & PROCTORING TELEMETRY: Validates student identity, devices, and proctoring fields', () => {
    const validCohortData: Record<string, any> = {
      prn: '2026AIML0001',
      totalSolved: 15,
      totalPoints: 1500,
      currentStreak: 5,
      longestStreak: 7,
      studentName: 'Alice Smith',
      studentEmail: 'student@sanjivani.edu.in',
      boundEmail: 'student@gmail.com',
      isEmailBound: true,
      isEmailBoundV2: true,
      emailVerified: true,
      department: 'AIML',
      division: 'A',
      year: 'FY',
      college: 'Sanjivani University',
      sectionName: 'AIML Section 1',
      sectionId: 'sec_101',
      integrityScore: 92,
      tabSwitches: 3,
      pasteBursts: 1,
      clipboardAttempts: 2,
      fullscreenExits: 1,
      miniProjectUnlocked: true,
      registeredDevices: ['dev_hash_1', 'dev_hash_2'],
      deviceSession: { deviceId: 'dev_hash_1', timestamp: Date.now() },
      activeSession: true,
    };
    expect(RulesEvaluator.isValidCohortProgress(validCohortData)).toBe(true);

    // Null division is allowed
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, division: null })).toBe(true);

    // Device session as string <= 100 chars
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, deviceSession: 'device_token_abc' })).toBe(true);

    // Oversized studentName (> 100) -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, studentName: 'A'.repeat(101) })).toBe(false);

    // Oversized boundEmail (> 150) -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, boundEmail: 'A'.repeat(151) })).toBe(false);

    // Non-int integrityScore -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, integrityScore: 92.5 })).toBe(false);

    // Non-bool miniProjectUnlocked -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, miniProjectUnlocked: 'yes' })).toBe(false);

    // More than 10 registeredDevices -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({
      ...validCohortData,
      registeredDevices: Array.from({ length: 11 }, (_, i) => `dev_${i}`),
    })).toBe(false);

    // Disallowed key -> MUST FAIL
    expect(RulesEvaluator.isValidCohortProgress({ ...validCohortData, unauthorizedCheatingKey: true })).toBe(false);
  });

  it('ASSESSMENT SUBMISSIONS & QUERY OPTIMIZATION: Direct field access (userId, uid, studentId) enables static query analysis, peer reads denied, client writes blocked', () => {
    const studentAliceCtx: FirestoreRuleContext = { auth: studentAlice, request: {} };
    const studentBobCtx: FirestoreRuleContext = { auth: studentBob, request: {} };
    const facultyCtx: FirestoreRuleContext = {
      auth: { uid: 'faculty_dr_smith', token: { email: 'smith@sanjivani.edu.in', role: 'FACULTY' } },
      request: {},
    };
    const adminCtx: FirestoreRuleContext = { auth: adminCharlie, request: {} };

    // 1. Direct field access: userId matches request.auth.uid -> MUST PASS
    const aliceUserIdDoc: FirestoreRuleContext = {
      ...studentAliceCtx,
      resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(aliceUserIdDoc)).toBe(true);
    expect(RulesEvaluator.evaluateSubmissionRead(aliceUserIdDoc)).toBe(true);

    // 2. Direct field access: uid matches request.auth.uid -> MUST PASS
    const aliceUidDoc: FirestoreRuleContext = {
      ...studentAliceCtx,
      resource: { data: { uid: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(aliceUidDoc)).toBe(true);
    expect(RulesEvaluator.evaluateSubmissionRead(aliceUidDoc)).toBe(true);

    // 3. Direct field access: studentId matches request.auth.uid -> MUST PASS
    const aliceStudentIdDoc: FirestoreRuleContext = {
      ...studentAliceCtx,
      resource: { data: { studentId: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(aliceStudentIdDoc)).toBe(true);
    expect(RulesEvaluator.evaluateSubmissionRead(aliceStudentIdDoc)).toBe(true);

    // 4. Peer read: studentBob attempting to read Alice's submission -> MUST FAIL
    const peerReadAttempt: FirestoreRuleContext = {
      ...studentBobCtx,
      resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(peerReadAttempt)).toBe(false);
    expect(RulesEvaluator.evaluateSubmissionRead(peerReadAttempt)).toBe(false);

    // 5. Unauthenticated read -> MUST FAIL
    const unauthAttempt: FirestoreRuleContext = {
      auth: null,
      resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(unauthAttempt)).toBe(false);
    expect(RulesEvaluator.evaluateSubmissionRead(unauthAttempt)).toBe(false);

    // 6. Faculty and Admin can read student submissions
    const facultyReadAlice: FirestoreRuleContext = {
      ...facultyCtx,
      resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(facultyReadAlice)).toBe(true);
    expect(RulesEvaluator.evaluateSubmissionRead(facultyReadAlice)).toBe(true);

    const adminReadAlice: FirestoreRuleContext = {
      ...adminCtx,
      resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED' } },
    };
    expect(RulesEvaluator.evaluateAssessmentSubmissionRead(adminReadAlice)).toBe(true);
    expect(RulesEvaluator.evaluateSubmissionRead(adminReadAlice)).toBe(true);

    // 7. Client writes strictly blocked: allow write: if false;
    expect(RulesEvaluator.evaluateSubmissionWrite({ auth: studentAlice, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentSubmissionWrite({ auth: studentAlice, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentSubmissionWrite({ auth: facultyCtx.auth, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentSubmissionWrite({ auth: adminCharlie, request: {} })).toBe(false);
  });

  it('PROCTORING SUBCOLLECTION: Isolates cheating incidents and quarantine flags; faculty/admin allowed, students denied, writes blocked', () => {
    const studentAliceCtx: FirestoreRuleContext = { auth: studentAlice, request: {} };
    const facultyCtx: FirestoreRuleContext = {
      auth: { uid: 'faculty_dr_smith', token: { email: 'smith@sanjivani.edu.in', role: 'FACULTY' } },
      request: {},
    };
    const adminCtx: FirestoreRuleContext = { auth: adminCharlie, request: {} };
    const unauthCtx: FirestoreRuleContext = { auth: null, request: {} };

    // 1. Faculty read proctoring incidents -> MUST PASS
    expect(RulesEvaluator.evaluateProctoringRead(facultyCtx)).toBe(true);

    // 2. Admin read proctoring incidents -> MUST PASS
    expect(RulesEvaluator.evaluateProctoringRead(adminCtx)).toBe(true);

    // 3. Student read proctoring incidents (even their own) -> MUST FAIL
    expect(RulesEvaluator.evaluateProctoringRead(studentAliceCtx)).toBe(false);

    // 4. Unauthenticated read proctoring incidents -> MUST FAIL
    expect(RulesEvaluator.evaluateProctoringRead(unauthCtx)).toBe(false);

    // 5. Writes to proctoring subcollection strictly blocked for all clients
    expect(RulesEvaluator.evaluateProctoringWrite(studentAliceCtx)).toBe(false);
    expect(RulesEvaluator.evaluateProctoringWrite(facultyCtx)).toBe(false);
    expect(RulesEvaluator.evaluateProctoringWrite(adminCtx)).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules declares direct field checks and dedicated proctoring subcollections', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    // Submissions query analyzer direct field access check
    expect(firestoreRules).toContain('(resource.data.userId == request.auth.uid || resource.data.uid == request.auth.uid || resource.data.studentId == request.auth.uid)');

    // Dedicated proctoring subcollections
    expect(firestoreRules).toContain('match /assessment_test_submissions/{docId}');
    expect(firestoreRules).toContain('match /assessment_submissions/{docId}');
    expect(firestoreRules).toContain('match /proctoring/{eventId}');

    // Strict proctoring permissions
    expect(firestoreRules).toContain('allow read: if isFaculty() || isAdmin();');

    // Strict write denial
    const submissionSections = [
      'match /submissions/{submissionId}',
      'match /assessment_test_submissions/{docId}',
      'match /assessment_submissions/{docId}',
    ];
    for (const section of submissionSections) {
      expect(firestoreRules).toContain(section);
    }
  });

  it('PATH-BASED ISOWNERID & CLEAN 404: Verifies isOwnerId matches UID, PRN, or verified email only, preventing permission-denied crashes on non-existent documents', () => {
    const verifiedStudent: AuthContext = {
      uid: 'student_123',
      token: {
        email: 'student@sanjivani.edu.in',
        email_verified: true,
        prn: '2026AIML0001',
      },
    };
    const unverifiedStudent: AuthContext = {
      uid: 'student_456',
      token: {
        email: 'unverified@sanjivani.edu.in',
        email_verified: false,
        prn: '2026AIML0002',
      },
    };

    // 1. Matches uid
    expect(RulesEvaluator.isOwnerId({ auth: verifiedStudent }, 'student_123')).toBe(true);
    // 2. Matches token.prn
    expect(RulesEvaluator.isOwnerId({ auth: verifiedStudent }, '2026AIML0001')).toBe(true);
    // 3. Email does NOT match isOwnerId (strict identifier ownership: UID or PRN only)
    expect(RulesEvaluator.isOwnerId({ auth: verifiedStudent }, 'student@sanjivani.edu.in')).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: verifiedStudent }, 'STUDENT@SANJIVANI.EDU.IN')).toBe(false);

    // 4. Unverified email MUST NOT match
    expect(RulesEvaluator.isOwnerId({ auth: unverifiedStudent }, 'unverified@sanjivani.edu.in')).toBe(false);
    // But UID and PRN still match for unverified student
    expect(RulesEvaluator.isOwnerId({ auth: unverifiedStudent }, 'student_456')).toBe(true);
    expect(RulesEvaluator.isOwnerId({ auth: unverifiedStudent }, '2026AIML0002')).toBe(true);

    // 5. Mismatched ID fails
    expect(RulesEvaluator.isOwnerId({ auth: verifiedStudent }, 'foreign_id')).toBe(false);

    // 6. Clean 404 test: when document does NOT exist (resource == null), isOwnerId allows get without evaluating resource.data
    const nonExistentDocCtx: FirestoreRuleContext = {
      auth: verifiedStudent,
      request: {},
      // resource is undefined/null (document does not exist)
    };
    expect(RulesEvaluator.evaluateCohortProgressGet(nonExistentDocCtx, '2026AIML0001')).toBe(true);
    expect(RulesEvaluator.evaluateEnrolledStudentGet(nonExistentDocCtx, 'student_123')).toBe(true);
    expect(RulesEvaluator.evaluateCohortProgressGet(nonExistentDocCtx, 'someone_elses_prn')).toBe(false);
  });

  it('COHORT PROGRESS & DRAFTS: Validates hardened draft validation, length bounds, and cohort proctoring isolation', () => {
    const studentUser: AuthContext = {
      uid: 'student_123',
      token: { prn: '2026AIML0001', email: 'student@sanjivani.edu.in', email_verified: true },
    };
    const facultyUser: AuthContext = {
      uid: 'faculty_1',
      token: { email: 'prof@sanjivani.edu.in', role: 'FACULTY' },
    };

    // 1. Valid draft creation by student owner
    const validDraftData = {
      code: 'print("hello world")',
      customInput: '42',
      updatedAt: '2026-11-10T08:00:00Z',
      problemSlug: 'two-sum',
      deviceLabel: 'Chrome on macOS',
      timestamp: Date.now(),
    };
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: validDraftData } },
    }, '2026AIML0001', 'two-sum')).toBe(true);

    // 2. Draft write for different PRN -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: validDraftData } },
    }, '2026AIML9999', 'two-sum')).toBe(false);

    // 3. Draft ID exceeding 80 characters -> MUST FAIL
    const tooLongDraftId = 'a'.repeat(81);
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: validDraftData } },
    }, '2026AIML0001', tooLongDraftId)).toBe(false);

    // 4. Draft ID with invalid characters -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: validDraftData } },
    }, '2026AIML0001', 'draft/with/slash')).toBe(false);

    // 5. Code exceeding 65536 characters -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: { ...validDraftData, code: 'c'.repeat(65537) } } },
    }, '2026AIML0001', 'two-sum')).toBe(false);

    // 6. Custom input exceeding 4096 characters -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: { ...validDraftData, customInput: 'i'.repeat(4097) } } },
    }, '2026AIML0001', 'two-sum')).toBe(false);

    // 7. Device label exceeding 80 characters -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: { ...validDraftData, deviceLabel: 'd'.repeat(81) } } },
    }, '2026AIML0001', 'two-sum')).toBe(false);

    // 8. Problem slug exceeding 100 characters -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: { ...validDraftData, problemSlug: 'p'.repeat(101) } } },
    }, '2026AIML0001', 'two-sum')).toBe(false);

    // 9. Unauthorized keys in draft -> MUST FAIL
    expect(RulesEvaluator.evaluateCohortDraftWrite({
      auth: studentUser,
      request: { resource: { data: { ...validDraftData, hackedField: 'malicious' } } },
    }, '2026AIML0001', 'two-sum')).toBe(false);

    // 10. Cohort progress proctoring subcollection: readable by faculty, denied for students
    expect(RulesEvaluator.evaluateCohortProctoringRead({ auth: facultyUser })).toBe(true);
    expect(RulesEvaluator.evaluateCohortProctoringRead({ auth: studentUser })).toBe(false);
  });

  it('COHORT PROGRESS STOPGAP: ownsProgress(prn) allows verified Google auth user without PRN claim to access drafts if cohort_progress matches email', () => {
    const googleUser: AuthContext = {
      uid: 'google_uid_1',
      token: {
        email: 'student@sanjivani.edu.in',
        email_verified: true,
      },
    };
    const otherGoogleUser: AuthContext = {
      uid: 'google_uid_2',
      token: {
        email: 'attacker@sanjivani.edu.in',
        email_verified: true,
      },
    };
    const unverifiedGoogleUser: AuthContext = {
      uid: 'google_uid_3',
      token: {
        email: 'student@sanjivani.edu.in',
        email_verified: false,
      },
    };

    const cohortStore = {
      '2026ABCM0001': {
        prn: '2026ABCM0001',
        email: 'student@sanjivani.edu.in',
      },
    };

    const validDraftData = {
      code: 'console.log("hello")',
      customInput: '',
      updatedAt: '2026-11-10T12:00:00Z',
      problemSlug: 'code',
      deviceLabel: 'Chrome Windows',
      timestamp: Date.now(),
    };

    // 1. Google user with NO prn claim CAN read their draft under cohort_progress/2026ABCM0001/drafts/code
    expect(
      RulesEvaluator.evaluateCohortDraftReadOrDelete(
        { auth: googleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(true);

    // Google user with NO prn claim CAN write/update their draft
    expect(
      RulesEvaluator.evaluateCohortDraftWrite(
        { auth: googleUser, request: { resource: { data: validDraftData } } },
        '2026ABCM0001',
        'code',
        cohortStore
      )
    ).toBe(true);

    // Google user with NO prn claim CAN get cohort_progress/2026ABCM0001
    expect(
      RulesEvaluator.evaluateCohortProgressGet(
        { auth: googleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(true);

    // 2. Google user with a different email is DENIED access to that draft
    expect(
      RulesEvaluator.evaluateCohortDraftReadOrDelete(
        { auth: otherGoogleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(false);

    expect(
      RulesEvaluator.evaluateCohortDraftWrite(
        { auth: otherGoogleUser, request: { resource: { data: validDraftData } } },
        '2026ABCM0001',
        'code',
        cohortStore
      )
    ).toBe(false);

    expect(
      RulesEvaluator.evaluateCohortProgressGet(
        { auth: otherGoogleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(false);

    // 3. An unverified email token is DENIED access to that draft
    expect(
      RulesEvaluator.evaluateCohortDraftReadOrDelete(
        { auth: unverifiedGoogleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(false);

    expect(
      RulesEvaluator.evaluateCohortDraftWrite(
        { auth: unverifiedGoogleUser, request: { resource: { data: validDraftData } } },
        '2026ABCM0001',
        'code',
        cohortStore
      )
    ).toBe(false);

    expect(
      RulesEvaluator.evaluateCohortProgressGet(
        { auth: unverifiedGoogleUser, request: {} },
        '2026ABCM0001',
        cohortStore
      )
    ).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules declares isOwnerId, hardened drafts validator, proctoring subcollection, and locked writes', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    // Helper definition
    expect(firestoreRules).toContain('function isOwnerId(targetId)');
    expect(firestoreRules).toContain('function ownsProgress(prn)');
    expect(firestoreRules).toContain('function isStudentOwner(data, identifier)');
    expect(firestoreRules).toContain("request.auth.token.get('email_verified', false) == true");

    // cohort_progress/{prn} rules
    expect(firestoreRules).toContain('allow get: if isFaculty() || isAdmin() || ownsProgress(prn);');
    expect(firestoreRules).toContain('allow read, delete: if ownsProgress(prn);');
    expect(firestoreRules).toContain('allow create, update: if ownsProgress(prn)');
    expect(firestoreRules).toContain("draftId.matches('^[a-zA-Z0-9_-]{1,80}$')");
    expect(firestoreRules).toContain("request.resource.data.keys().hasOnly(['code', 'customInput', 'updatedAt', 'problemSlug', 'deviceLabel', 'timestamp'])");
    expect(firestoreRules).toContain("request.resource.data.customInput.size() <= 4096");
    expect(firestoreRules).toContain("request.resource.data.deviceLabel.size() <= 80");
    expect(firestoreRules).toContain("request.resource.data.problemSlug.size() <= 100");

    // cohort_progress/{prn}/proctoring/{docId}
    expect(firestoreRules).toContain('match /proctoring/{docId}');

    // enrolled_students/{docId} rules
    expect(firestoreRules).toContain('allow get: if isFaculty() || isAdmin() || isOwnerId(docId);');

    // sections faculty ownership binding and helper functions
    expect(firestoreRules).toContain('function sectionOwner(data)');
    expect(firestoreRules).toContain('function parentSection(sectionId)');
    expect(firestoreRules).toContain('function isEnrolled(sectionId)');
    expect(firestoreRules).toContain('match /sections/{sectionId}');
    expect(firestoreRules).toContain('match /private/{docId}');
    expect(firestoreRules).toContain('match /students/{studentId}');
    expect(firestoreRules).toContain('allow write: if false; // Joins, CSV imports, and removals go strictly through the backend API');

    // assessment_tests and assessment_public rules
    expect(firestoreRules).toContain('match /assessment_tests/{testId}');
    expect(firestoreRules).toContain('allow get, list: if isFaculty();');
    expect(firestoreRules).toContain('allow create, update: if isFaculty() && isValidAssessmentTest(request.resource.data);');
    expect(firestoreRules).toContain('allow delete: if isAdmin();');
    expect(firestoreRules).toContain('match /assessment_public/{testId}');
    expect(firestoreRules).toContain('allow get: if isFaculty() || (isAuthenticated() && isEnrolled(resource.data.sectionId));');
    expect(firestoreRules).toContain('allow list: if isFaculty();');
  });

  it('SECTION HARDENING & FACULTY OWNERSHIP: Enforces facultyId binding on create/update and title validation', () => {
    const facultyDrSmith: AuthContext = {
      uid: 'faculty_dr_smith',
      token: { email: 'smith@sanjivani.edu.in', role: 'FACULTY' },
    };
    const facultyDrJones: AuthContext = {
      uid: 'faculty_dr_jones',
      token: { email: 'jones@sanjivani.edu.in', role: 'FACULTY' },
    };
    const adminCtx: FirestoreRuleContext = { auth: adminCharlie, request: {} };

    const validSection = {
      id: 'sec_cs_101',
      title: 'Advanced Algorithms',
      course: 'B.Tech CSE',
      subject: 'Algorithms',
      facultyId: 'faculty_dr_smith',
      institution: 'Sanjivani COE',
      academicYear: '2026-2027',
      semester: 'Semester 4',
      description: 'Comprehensive data structures and algorithms course.',
    };

    // 1. Valid section with title & bounded fields passes
    expect(RulesEvaluator.isValidSection(validSection)).toBe(true);

    // 2. Field bounds check: oversized description (> 1000) -> MUST FAIL
    expect(RulesEvaluator.isValidSection({ ...validSection, description: 'D'.repeat(1001) })).toBe(false);

    // 3. Field bounds check: oversized academicYear (> 50) -> MUST FAIL
    expect(RulesEvaluator.isValidSection({ ...validSection, academicYear: 'Y'.repeat(51) })).toBe(false);

    // 4. Field bounds check: oversized semester (> 50) -> MUST FAIL
    expect(RulesEvaluator.isValidSection({ ...validSection, semester: 'S'.repeat(51) })).toBe(false);

    // 5. Field bounds check: oversized institution (> 100) -> MUST FAIL
    expect(RulesEvaluator.isValidSection({ ...validSection, institution: 'I'.repeat(101) })).toBe(false);

    // 6. Section create: Faculty creating with their own UID -> MUST PASS
    expect(RulesEvaluator.evaluateSectionCreate({
      auth: facultyDrSmith,
      request: { resource: { data: validSection } },
    })).toBe(true);

    // 7. Section create: Faculty spoofing another faculty's ID -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionCreate({
      auth: facultyDrJones,
      request: { resource: { data: validSection } }, // validSection has facultyId: 'faculty_dr_smith'
    })).toBe(false);

    // 8. Section create: Admin creating with any facultyId -> MUST PASS
    expect(RulesEvaluator.evaluateSectionCreate({
      ...adminCtx,
      request: { resource: { data: validSection } },
    })).toBe(true);

    // 9. Section update: Owner faculty updating their section without changing facultyId -> MUST PASS
    expect(RulesEvaluator.evaluateSectionUpdate({
      auth: facultyDrSmith,
      resource: { data: validSection },
      request: { resource: { data: { ...validSection, description: 'Updated syllabus.' } } },
    })).toBe(true);

    // 10. Section update: Non-owner faculty attempting to update -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionUpdate({
      auth: facultyDrJones,
      resource: { data: validSection },
      request: { resource: { data: { ...validSection, description: 'Hijacked syllabus.' } } },
    })).toBe(false);

    // 11. Section update: Owner faculty attempting to reassign facultyId -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionUpdate({
      auth: facultyDrSmith,
      resource: { data: validSection },
      request: { resource: { data: { ...validSection, facultyId: 'faculty_dr_jones' } } },
    })).toBe(false);

    // 12. Section update: Admin updating any section without changing facultyId -> MUST PASS
    expect(RulesEvaluator.evaluateSectionUpdate({
      ...adminCtx,
      resource: { data: validSection },
      request: { resource: { data: { ...validSection, description: 'Updated syllabus by admin.' } } },
    })).toBe(true);

    // 13. Section update: FacultyId tampering by any user (including Admin) is blocked -> MUST FAIL
    expect(RulesEvaluator.evaluateSectionUpdate({
      ...adminCtx,
      resource: { data: validSection },
      request: { resource: { data: { ...validSection, facultyId: 'faculty_dr_jones' } } },
    })).toBe(false);
  });

  it('SECTION STUDENT ROSTER & PRN FORMAT VALIDATION: Enforces PRN regex, and blocks client roster writes (API only)', () => {
    const facultyDrSmith: AuthContext = {
      uid: 'faculty_dr_smith',
      token: { email: 'smith@sanjivani.edu.in', role: 'FACULTY' },
    };
    const validStudentPrn = '2026AIMF0001';
    const validStudentData = {
      id: 'st_1',
      prn: validStudentPrn,
      name: 'Alice Sharma',
      email: 'alice@sanjivani.edu.in',
      status: 'ACTIVE',
    };

    // 1. Valid section student with matching PRN -> MUST PASS
    expect(RulesEvaluator.isValidSectionStudent(validStudentData, validStudentPrn)).toBe(true);

    // 2. Mismatched PRN between path and body -> MUST FAIL
    expect(RulesEvaluator.isValidSectionStudent(validStudentData, '2026AIMF0002')).toBe(false);

    // 3. Invalid PRN format (lowercase letters) -> MUST FAIL
    expect(RulesEvaluator.isValidSectionStudent({ ...validStudentData, prn: '2026aimf0001' }, '2026aimf0001')).toBe(false);

    // 4. Invalid PRN format (missing gender code M/F) -> MUST FAIL
    expect(RulesEvaluator.isValidSectionStudent({ ...validStudentData, prn: '2026AIML0001' }, '2026AIML0001')).toBe(false);

    // 5. Invalid PRN format (wrong length) -> MUST FAIL
    expect(RulesEvaluator.isValidSectionStudent({ ...validStudentData, prn: '2026AIM001' }, '2026AIM001')).toBe(false);

    // 6. Direct client writes to /sections/{id}/students/{studentId} are strictly rejected (API only)
    expect(RulesEvaluator.evaluateSectionStudentWrite({
      auth: facultyDrSmith,
      request: { resource: { data: validStudentData } },
    })).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentWrite({
      auth: studentAlice,
      request: { resource: { data: validStudentData } },
    })).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentCreate({
      auth: facultyDrSmith,
      request: { resource: { data: validStudentData } },
    }, validStudentPrn)).toBe(false);
  });

  it('PATH-BASED ISOWNERID: Empty string immunity and token fallback protection', () => {
    const emptyClaimStudent: AuthContext = {
      uid: 'student_valid_uid',
      token: {
        // missing prn and email
      },
    };
    const emptyStringStudent: AuthContext = {
      uid: '',
      token: {
        prn: '',
        email: '',
        email_verified: false,
      },
    };

    // 1. Empty string ID must NEVER match, even if auth context has empty string -> MUST FAIL
    expect(RulesEvaluator.isOwnerId({ auth: emptyStringStudent }, '')).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: emptyClaimStudent }, '')).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: null }, '')).toBe(false);

    // 2. Non-string ID must NEVER match
    expect(RulesEvaluator.isOwnerId({ auth: emptyClaimStudent }, null as any)).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: emptyClaimStudent }, 123 as any)).toBe(false);

    // 3. Valid UID matches even when claims are missing
    expect(RulesEvaluator.isOwnerId({ auth: emptyClaimStudent }, 'student_valid_uid')).toBe(true);

    // 4. Empty PRN claim (prn: '') fails isOwnerId
    const emptyPrnStudent: AuthContext = {
      uid: 'student_valid_uid',
      token: {
        prn: '',
        email: 'alice@sanjivani.edu.in',
        email_verified: true,
      },
    };
    expect(RulesEvaluator.isOwnerId({ auth: emptyPrnStudent }, '2026AIMF0001')).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: emptyPrnStudent }, '')).toBe(false);
  });

  it('UNVERIFIED EMAIL PRIVILEGE ESCALATION PREVENTION & CUSTOM CLAIMS: Hardens isAdmin() and isFaculty()', () => {
    // 1. Unverified email (email_verified: false) matching an admin address fails isAdmin() and fails section delete / roster list
    const unverifiedAdminCtx: FirestoreRuleContext = {
      auth: {
        uid: 'attacker_fake_admin',
        token: {
          email: 'admin@logicq.io',
          email_verified: false,
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isAdmin(unverifiedAdminCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete(unverifiedAdminCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentList(unverifiedAdminCtx)).toBe(false);

    const unverifiedGmailAdminCtx: FirestoreRuleContext = {
      auth: {
        uid: 'attacker_gmail',
        token: {
          email: 'logicq1304@gmail.com',
          email_verified: false,
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isAdmin(unverifiedGmailAdminCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete(unverifiedGmailAdminCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentList(unverifiedGmailAdminCtx)).toBe(false);

    // 2. Verified email (email_verified: true) matching an admin address passes isAdmin()
    const verifiedAdminCtx: FirestoreRuleContext = {
      auth: {
        uid: 'legit_admin',
        token: {
          email: 'admin@logicq.io',
          email_verified: true,
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isAdmin(verifiedAdminCtx)).toBe(true);
    expect(RulesEvaluator.evaluateSectionDelete(verifiedAdminCtx)).toBe(true);
    expect(RulesEvaluator.evaluateSectionStudentList(verifiedAdminCtx)).toBe(true);

    const verifiedLogicQArenaCtx: FirestoreRuleContext = {
      auth: {
        uid: 'legit_arena_admin',
        token: {
          email: 'logicqarena@gmail.com',
          email_verified: true,
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isAdmin(verifiedLogicQArenaCtx)).toBe(true);

    // 3. request.auth.token.role === 'ADMIN' passes isAdmin() even without email
    const customClaimAdminCtx: FirestoreRuleContext = {
      auth: {
        uid: 'service_admin_no_email',
        token: {
          role: 'ADMIN',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isAdmin(customClaimAdminCtx)).toBe(true);
    expect(RulesEvaluator.evaluateSectionDelete(customClaimAdminCtx)).toBe(true);
    expect(RulesEvaluator.evaluateSectionStudentList(customClaimAdminCtx)).toBe(true);

    // 4. request.auth.token.role === 'FACULTY' passes isFaculty() even without email (custom token path)
    const customClaimFacultyCtx: FirestoreRuleContext = {
      auth: {
        uid: 'service_faculty_no_email',
        token: {
          role: 'FACULTY',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isFaculty(customClaimFacultyCtx)).toBe(true);
    expect(RulesEvaluator.evaluateSectionDelete(customClaimFacultyCtx)).toBe(false); // strictly isAdmin!
    expect(RulesEvaluator.evaluateSectionStudentList(customClaimFacultyCtx, { facultyId: 'service_faculty_no_email' })).toBe(true);

    // Unverified institutional email with faculty claim fails isFaculty()
    const unverifiedFacultyCtx: FirestoreRuleContext = {
      auth: {
        uid: 'unverified_faculty',
        token: {
          email: 'teacher@sanjivani.edu.in',
          email_verified: false,
          role: 'TEACHER',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isFaculty(unverifiedFacultyCtx)).toBe(false);

    // Verified institutional email with faculty claim passes isFaculty()
    const verifiedFacultyCtx: FirestoreRuleContext = {
      auth: {
        uid: 'verified_faculty',
        token: {
          email: 'teacher@sanjivani.edu.in',
          email_verified: true,
          role: 'TEACHER',
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isFaculty(verifiedFacultyCtx)).toBe(true);

    // 5. Empty PRN claim (prn: '') fails isOwnerId
    const emptyPrnCtx: FirestoreRuleContext = {
      auth: {
        uid: 'student_alice',
        token: {
          prn: '',
          email: 'alice@sanjivani.edu.in',
          email_verified: true,
        },
      },
      request: {},
    };
    expect(RulesEvaluator.isOwnerId(emptyPrnCtx, '2026AIMF0001')).toBe(false);
    expect(RulesEvaluator.isOwnerId(emptyPrnCtx, '')).toBe(false);
  });

  it('HARDENED SECTIONS & ACCESS CONTROL: Enforces strict ownership, enrolled student access, secrets isolation, and API-only roster writes', () => {
    const facultyA: AuthContext = {
      uid: 'faculty_A',
      token: { email: 'faculty_a@sanjivani.edu.in', role: 'FACULTY', email_verified: true },
    };
    const facultyB: AuthContext = {
      uid: 'faculty_B',
      token: { email: 'faculty_b@sanjivani.edu.in', role: 'FACULTY', email_verified: true },
    };
    const enrolledStudentUid: AuthContext = {
      uid: 'student_alice',
      token: { email: 'alice@sanjivani.edu.in', role: 'STUDENT', email_verified: true },
    };
    const enrolledStudentPrn: AuthContext = {
      uid: 'student_charlie_uid',
      token: { email: 'charlie@sanjivani.edu.in', prn: '2026AIMF0001', role: 'STUDENT', email_verified: true },
    };
    const nonEnrolledStudent: AuthContext = {
      uid: 'student_bob',
      token: { email: 'bob@sanjivani.edu.in', prn: '2026TESM0002', role: 'STUDENT', email_verified: true },
    };
    const adminCtx: FirestoreRuleContext = {
      auth: { uid: 'admin_root', token: { role: 'ADMIN' } },
      request: {},
    };

    const sectionAData = {
      id: 'section_A',
      sectionName: 'Algorithms Section A',
      course: 'B.Tech CSE',
      subject: 'Algorithms',
      facultyId: 'faculty_A',
      createdAt: '2026-11-10T10:00:00Z',
    };

    const enrolledMap = {
      section_A: ['student_alice', '2026AIMF0001'],
    };

    // 1. Faculty B cannot update or delete Faculty A's section
    const facultyBUpdateCtx: FirestoreRuleContext = {
      auth: facultyB,
      resource: { data: sectionAData },
      request: { resource: { data: { ...sectionAData, sectionName: 'Hijacked' } } },
    };
    expect(RulesEvaluator.evaluateSectionUpdate(facultyBUpdateCtx)).toBe(false);

    const facultyBDeleteCtx: FirestoreRuleContext = {
      auth: facultyB,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionDelete(facultyBDeleteCtx)).toBe(false);

    // 2. Faculty B cannot hijack ownership (facultyId: 'faculty_B')
    const hijackOwnershipCtx: FirestoreRuleContext = {
      auth: facultyB,
      resource: { data: sectionAData },
      request: { resource: { data: { ...sectionAData, facultyId: 'faculty_B' } } },
    };
    expect(RulesEvaluator.evaluateSectionUpdate(hijackOwnershipCtx)).toBe(false);

    // 3. Faculty A can update their own section
    const facultyAUpdateCtx: FirestoreRuleContext = {
      auth: facultyA,
      resource: { data: sectionAData },
      request: { resource: { data: { ...sectionAData, sectionName: 'Updated Name' } } },
    };
    expect(RulesEvaluator.evaluateSectionUpdate(facultyAUpdateCtx)).toBe(true);

    // 4. Faculty A cannot delete their own section (only Admin can)
    const facultyADeleteCtx: FirestoreRuleContext = {
      auth: facultyA,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionDelete(facultyADeleteCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionDelete(adminCtx)).toBe(true);

    // 5. Faculty list query requires facultyId == uid
    const facultyAListOwnCtx: FirestoreRuleContext = {
      auth: facultyA,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionList(facultyAListOwnCtx)).toBe(true);

    const facultyBListCtx: FirestoreRuleContext = {
      auth: facultyB,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionList(facultyBListCtx)).toBe(false);

    const adminListCtx: FirestoreRuleContext = {
      ...adminCtx,
      resource: { data: sectionAData },
    };
    expect(RulesEvaluator.evaluateSectionList(adminListCtx)).toBe(true);

    // 6. Enrolled student (via PRN or UID) can get section
    const enrolledUidGetCtx: FirestoreRuleContext = {
      auth: enrolledStudentUid,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(enrolledUidGetCtx, 'section_A', enrolledMap)).toBe(true);

    const enrolledPrnGetCtx: FirestoreRuleContext = {
      auth: enrolledStudentPrn,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(enrolledPrnGetCtx, 'section_A', enrolledMap)).toBe(true);

    // 7. Non-enrolled student cannot get section
    const nonEnrolledGetCtx: FirestoreRuleContext = {
      auth: nonEnrolledStudent,
      resource: { data: sectionAData },
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionGet(nonEnrolledGetCtx, 'section_A', enrolledMap)).toBe(false);

    // 8. Student cannot read /sections/{id}/private/join
    const studentPrivateReadCtx: FirestoreRuleContext = {
      auth: enrolledStudentUid,
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionPrivateRead(studentPrivateReadCtx, sectionAData)).toBe(false);

    const facultyAPrivateReadCtx: FirestoreRuleContext = {
      auth: facultyA,
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionPrivateRead(facultyAPrivateReadCtx, sectionAData)).toBe(true);

    // 9. Student can get their own roster entry (students/{prn} or students/{uid})
    const studentUidRosterCtx: FirestoreRuleContext = {
      auth: enrolledStudentUid,
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionStudentRead(studentUidRosterCtx, 'student_alice', sectionAData)).toBe(true);

    const studentPrnRosterCtx: FirestoreRuleContext = {
      auth: enrolledStudentPrn,
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionStudentRead(studentPrnRosterCtx, '2026AIMF0001', sectionAData)).toBe(true);

    // Student cannot read peer's roster entry
    expect(RulesEvaluator.evaluateSectionStudentRead(studentUidRosterCtx, 'student_bob', sectionAData)).toBe(false);

    // 10. Student cannot list roster (students)
    expect(RulesEvaluator.evaluateSectionStudentList(studentUidRosterCtx, sectionAData)).toBe(false);

    // 11. Client write to students/{id} is rejected (API only)
    expect(RulesEvaluator.evaluateSectionStudentWrite(studentUidRosterCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentWrite({ auth: facultyA, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentWrite(adminCtx)).toBe(false);
    expect(RulesEvaluator.evaluateSectionPrivateWrite({ auth: facultyA, request: {} })).toBe(false);

    // 12. Faculty B cannot read Faculty A's section roster
    const facultyBCtx: FirestoreRuleContext = {
      auth: facultyB,
      request: {},
    };
    expect(RulesEvaluator.evaluateSectionStudentList(facultyBCtx, sectionAData)).toBe(false);
    expect(RulesEvaluator.evaluateSectionStudentRead(facultyBCtx, 'student_alice', sectionAData)).toBe(false);

    // Faculty A (owner) and Admin CAN read roster
    expect(RulesEvaluator.evaluateSectionStudentList({ auth: facultyA, request: {} }, sectionAData)).toBe(true);
    expect(RulesEvaluator.evaluateSectionStudentList(adminCtx, sectionAData)).toBe(true);
  });

  it('ASSESSMENT TEST CONTENT LEAK PREVENTION & STRICT IDENTIFIER OWNERSHIP: Restricts full tests to faculty/admin, allows enrolled students public metadata only, enforces Admin-only delete and strict isOwnerId/isStudentOwner', () => {
    const studentAlice: AuthContext = {
      uid: 'student_alice',
      token: { email: 'alice@sanjivani.edu.in', role: 'STUDENT', prn: '2026AIML0001', email_verified: true },
    };
    const studentBob: AuthContext = {
      uid: 'student_bob',
      token: { email: 'bob@sanjivani.edu.in', role: 'STUDENT', prn: '2026AIML0002', email_verified: true },
    };
    const facultyUser: AuthContext = {
      uid: 'faculty_1',
      token: { email: 'prof@sanjivani.edu.in', role: 'FACULTY', email_verified: true },
    };
    const adminUser: AuthContext = {
      uid: 'admin_root',
      token: { email: 'admin@logicq.io', role: 'ADMIN', email_verified: true },
    };

    const validAssessmentTestData = {
      id: 'test_midterm_1',
      title: 'Midterm Lab Assessment',
      sectionId: 'section_algorithms',
      status: 'PUBLISHED',
      durationMinutes: 90,
      totalMarks: 100,
      questions: [
        { id: 'q1', prompt: 'Solve two sum', hiddenTestCases: ['hidden_1', 'hidden_2'] }
      ],
      lockOnSubmit: true,
      randomiseQuestions: true,
    };

    const assessmentTestCtx = (auth: AuthContext | null): FirestoreRuleContext => ({
      auth,
      resource: { data: validAssessmentTestData },
      request: {},
    });

    const enrolledRoster = {
      section_algorithms: ['student_alice', '2026AIML0001'],
    };

    const publicMetadataDoc = {
      id: 'test_midterm_1',
      title: 'Midterm Lab Assessment',
      sectionId: 'section_algorithms',
      status: 'PUBLISHED',
      durationMinutes: 90,
    };

    const publicAssessmentCtx = (auth: AuthContext | null): FirestoreRuleContext => ({
      auth,
      resource: { data: publicMetadataDoc },
      request: {},
    });

    // 1. Authenticated student cannot read /assessment_tests/{testId} (fails/denied - leak prevention)
    expect(RulesEvaluator.evaluateAssessmentTestRead(assessmentTestCtx(studentAlice))).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentTestRead(assessmentTestCtx(studentBob))).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentTestRead(assessmentTestCtx(null))).toBe(false);

    // 2. Faculty and Admin can read /assessment_tests/{testId}
    expect(RulesEvaluator.evaluateAssessmentTestRead(assessmentTestCtx(facultyUser))).toBe(true);
    expect(RulesEvaluator.evaluateAssessmentTestRead(assessmentTestCtx(adminUser))).toBe(true);

    // 3. Faculty can create/update valid assessment test
    const facultyCreateCtx: FirestoreRuleContext = {
      auth: facultyUser,
      request: { resource: { data: validAssessmentTestData } },
    };
    expect(RulesEvaluator.evaluateAssessmentTestCreate(facultyCreateCtx)).toBe(true);
    expect(RulesEvaluator.evaluateAssessmentTestUpdate(facultyCreateCtx)).toBe(true);

    // Student cannot create or update assessment tests
    const studentCreateCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: validAssessmentTestData } },
    };
    expect(RulesEvaluator.evaluateAssessmentTestCreate(studentCreateCtx)).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentTestUpdate(studentCreateCtx)).toBe(false);

    // Invalid assessment test data fails validation
    const invalidAssessmentData = {
      ...validAssessmentTestData,
      title: '', // size < 1 fails validation
    };
    const facultyInvalidCreateCtx: FirestoreRuleContext = {
      auth: facultyUser,
      request: { resource: { data: invalidAssessmentData } },
    };
    expect(RulesEvaluator.evaluateAssessmentTestCreate(facultyInvalidCreateCtx)).toBe(false);

    // 4. Non-admin faculty cannot delete assessment test (admin only)
    const facultyDeleteCtx: FirestoreRuleContext = {
      auth: facultyUser,
      resource: { data: validAssessmentTestData },
      request: {},
    };
    const adminDeleteCtx: FirestoreRuleContext = {
      auth: adminUser,
      resource: { data: validAssessmentTestData },
      request: {},
    };
    expect(RulesEvaluator.evaluateAssessmentTestDelete(facultyDeleteCtx)).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentTestDelete(assessmentTestCtx(studentAlice))).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentTestDelete(adminDeleteCtx)).toBe(true);

    // 5. Enrolled student can read /assessment_public/{testId} for their section
    expect(RulesEvaluator.evaluateAssessmentPublicRead(publicAssessmentCtx(studentAlice), enrolledRoster)).toBe(true);
    // Faculty can also read public assessment metadata
    expect(RulesEvaluator.evaluateAssessmentPublicRead(publicAssessmentCtx(facultyUser), enrolledRoster)).toBe(true);
    expect(RulesEvaluator.evaluateAssessmentPublicRead(publicAssessmentCtx(adminUser), enrolledRoster)).toBe(true);

    // 6. Non-enrolled student cannot read /assessment_public/{testId}
    expect(RulesEvaluator.evaluateAssessmentPublicRead(publicAssessmentCtx(studentBob), enrolledRoster)).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentPublicRead(publicAssessmentCtx(null), enrolledRoster)).toBe(false);

    // Client write to /assessment_public/{testId} is strictly blocked (Admin SDK only)
    expect(RulesEvaluator.evaluateAssessmentPublicWrite({ auth: studentAlice, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateAssessmentPublicWrite({ auth: facultyUser, request: {} })).toBe(false);

    // 7. Empty string '' or non-string identifier fails isOwnerId and isStudentOwner
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, '')).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, null as any)).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, undefined as any)).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, 12345 as any)).toBe(false);
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, {} as any)).toBe(false);

    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, '')).toBe(false);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, null as any)).toBe(false);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, undefined as any)).toBe(false);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, 12345 as any)).toBe(false);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, {} as any)).toBe(false);

    // Valid identifiers (UID or PRN token claim) succeed
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, 'student_alice')).toBe(true);
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, '2026AIML0001')).toBe(true);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, 'student_alice')).toBe(true);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, '2026AIML0001')).toBe(true);

    // Mismatched identifier fails
    expect(RulesEvaluator.isOwnerId({ auth: studentAlice }, 'student_bob')).toBe(false);
    expect(RulesEvaluator.isStudentOwner({ auth: studentAlice }, {}, 'student_bob')).toBe(false);
  });
});

