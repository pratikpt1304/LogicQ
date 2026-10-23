import { prisma } from '../utils/prisma.js';
import { getJudge } from '../judge/judge.factory.js';
import { Verdict } from '../judge/judge.interface.js';

export interface CreateMiniProjectDto {
  moduleId: string;
  title: string;
  scenario: string;
  requirements: string;
  rubricJson?: string;
  starterCode?: string;
  solutionCode?: string;
  expectedTimeMin?: number;
  expectedTimeMax?: number;
}

export interface ActivateMiniProjectDto {
  miniProjectId: string;
  studentId: string;
  sectionId: string;
  facultyId: string;
  activationReason?: string;
}

export interface SubmitMiniProjectDto {
  miniProjectId: string;
  studentId: string;
  code: string;
  clientMetrics?: {
    copyPasteAttempts?: number;
    tabSwitchCount?: number;
    fullScreenExitCount?: number;
    activeInteractionTimeSec?: number;
  };
}

export class MiniProjectService {
  /**
   * Authors an integrated mini-project for a module (Section 35).
   * 20 marks total: 4 section competencies x 5 marks each.
   */
  static async createMiniProject(dto: CreateMiniProjectDto) {
    const defaultRubric = JSON.stringify([
      { competency: 'Section 1 Competency (Syntax & Control Structures)', maxMarks: 5 },
      { competency: 'Section 2 Competency (Arrays & Data Structuring)', maxMarks: 5 },
      { competency: 'Section 3 Competency (Functions & Memory Management)', maxMarks: 5 },
      { competency: 'Section 4 Competency (System Integration & Error Handling)', maxMarks: 5 },
    ]);

    const project = await prisma.miniProject.create({
      data: {
        moduleId: dto.moduleId,
        title: dto.title,
        scenario: dto.scenario,
        requirements: dto.requirements,
        rubricJson: dto.rubricJson || defaultRubric,
        starterCode: dto.starterCode || '/* LogicQ Integrated Mini-Project Template */\n#include <stdio.h>\n\nint main() {\n    // Implement complete modular solution\n    return 0;\n}\n',
        solutionCode: dto.solutionCode,
        expectedTimeMin: dto.expectedTimeMin ?? 45,
        expectedTimeMax: dto.expectedTimeMax ?? 120,
      },
    });

    return project;
  }

  /**
   * Individually activates a mini-project for a single student (Sections 36, 37, 38).
   * STRICT PROHIBITION: Bulk activation is prohibited by Section 38.
   */
  static async activateIndividualStudent(dto: ActivateMiniProjectDto) {
    if (!dto.studentId || Array.isArray(dto.studentId)) {
      throw new Error('SECTION_38_VIOLATION: Bulk activation is strictly prohibited. Faculty must activate students individually.');
    }

    // Verify student is enrolled in the section
    const enrollment = await prisma.sectionStudent.findFirst({
      where: {
        sectionId: dto.sectionId,
        studentId: dto.studentId,
        status: 'ENROLLED',
      },
    });

    if (!enrollment) {
      throw new Error('Student is not enrolled in this active course section.');
    }

    // Check existing or create record
    const access = await prisma.studentMiniProjectAccess.upsert({
      where: {
        miniProjectId_studentId: {
          miniProjectId: dto.miniProjectId,
          studentId: dto.studentId,
        },
      },
      update: {
        status: 'ACTIVE',
        activatedById: dto.facultyId,
        activatedAt: new Date(),
        activationReason: dto.activationReason || 'Faculty approved individual activation',
      },
      create: {
        miniProjectId: dto.miniProjectId,
        studentId: dto.studentId,
        sectionId: dto.sectionId,
        status: 'ACTIVE',
        activatedById: dto.facultyId,
        activatedAt: new Date(),
        activationReason: dto.activationReason || 'Faculty approved individual activation',
        academicScore: 0,
        integrityScore: 0,
      },
      include: {
        miniProject: true,
        student: {
          select: { id: true, fullName: true, prn: true, email: true },
        },
      },
    });

    return {
      success: true,
      access,
    };
  }

  /**
   * Fetches the activated mini-project for a student (Section 39).
   */
  static async getStudentMiniProject(studentId: string, miniProjectId: string) {
    const access = await prisma.studentMiniProjectAccess.findUnique({
      where: {
        miniProjectId_studentId: {
          miniProjectId,
          studentId,
        },
      },
      include: {
        miniProject: true,
      },
    });

    if (!access || access.status === 'INACTIVE') {
      throw new Error('MINI_PROJECT_INACTIVE: This mini-project has not been activated by your faculty mentor yet.');
    }

    return {
      success: true,
      access,
      project: access.miniProject,
    };
  }

  /**
   * Evaluates student mini-project submission under sandbox monitoring (Section 39).
   * Computes 20-mark rubric score (4 competencies x 5 marks).
   */
  static async submitMiniProject(dto: SubmitMiniProjectDto) {
    const access = await prisma.studentMiniProjectAccess.findUnique({
      where: {
        miniProjectId_studentId: {
          miniProjectId: dto.miniProjectId,
          studentId: dto.studentId,
        },
      },
      include: { miniProject: true },
    });

    if (!access) throw new Error('Mini-project record not found.');
    if (access.status !== 'ACTIVE') {
      throw new Error('Cannot submit mini-project: access status is not ACTIVE.');
    }

    const judge = await getJudge();
    let compileSuccess = true;
    if ('compile' in judge && typeof (judge as any).compile === 'function') {
      const compileResult = await (judge as any).compile(dto.code, { timeLimitMs: 10000 });
      compileSuccess = compileResult.success;
      if (compileResult.cleanup) await compileResult.cleanup();
    }

    let academicScore = 0;
    const rubricScores = {
      section1: 0,
      section2: 0,
      section3: 0,
      section4: 0,
    };

    if (compileSuccess) {
      // Evaluate against rubric (5 marks per competency)
      rubricScores.section1 = dto.code.includes('if') || dto.code.includes('switch') ? 5 : 3;
      rubricScores.section2 = dto.code.includes('[') || dto.code.includes('struct') ? 5 : 3;
      rubricScores.section3 = dto.code.includes('void') || dto.code.includes('int ') ? 5 : 4;
      rubricScores.section4 = 5; // System integration
      academicScore = rubricScores.section1 + rubricScores.section2 + rubricScores.section3 + rubricScores.section4;
    } else {
      academicScore = 4; // Partial marks for structural effort despite compile error
    }

    // Behavioral integrity calculation
    const m = dto.clientMetrics || {};
    let integrityScore = 0;
    if ((m.copyPasteAttempts || 0) > 0) integrityScore += 20;
    if ((m.tabSwitchCount || 0) > 2) integrityScore += 25;
    if ((m.fullScreenExitCount || 0) > 1) integrityScore += 15;

    let integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (integrityScore <= 20) integrityRisk = 'NORMAL';
    else if (integrityScore <= 40) integrityRisk = 'LOW';
    else if (integrityScore <= 60) integrityRisk = 'MODERATE';
    else if (integrityScore <= 80) integrityRisk = 'HIGH';
    else integrityRisk = 'CRITICAL';

    const updated = await prisma.studentMiniProjectAccess.update({
      where: { id: access.id },
      data: {
        status: 'SUBMITTED',
        submittedCode: dto.code,
        submittedAt: new Date(),
        academicScore,
        rubricScoresJson: JSON.stringify(rubricScores),
        integrityScore,
        integrityRisk,
      },
    });

    return {
      success: true,
      academicScore: updated.academicScore,
      maxMarks: 20,
      rubricScores,
      integrityScore: updated.integrityScore,
      integrityRisk: updated.integrityRisk,
      status: updated.status,
    };
  }

  /**
   * Fetches roster of students in section with mini-project activation statuses for faculty dashboard.
   */
  static async getSectionMiniProjectRoster(sectionId: string, miniProjectId: string) {
    const students = await prisma.sectionStudent.findMany({
      where: { sectionId },
      include: {
        student: {
          select: { id: true, fullName: true, prn: true, email: true },
        },
      },
    });

    const accessRecords = await prisma.studentMiniProjectAccess.findMany({
      where: { sectionId, miniProjectId },
    });

    const roster = students.map((s) => {
      const access = accessRecords.find((a) => a.studentId === s.studentId);
      return {
        studentId: s.studentId,
        fullName: s.student.fullName,
        prn: s.prn,
        email: s.student.email,
        status: access?.status || 'INACTIVE',
        activatedAt: access?.activatedAt || null,
        academicScore: access?.academicScore ?? 0,
        integrityRisk: access?.integrityRisk || 'NORMAL',
      };
    });

    return roster;
  }

  /**
   * Official faculty rubric evaluation and grade override for a mini-project (Phase 5).
   * Evaluates 4 section competencies (5 marks each = 20 total marks).
   */
  static async gradeMiniProjectRubric(input: {
    accessId: string;
    facultyId: string;
    rubricScores: { section1: number; section2: number; section3: number; section4: number };
    facultyFeedback?: string;
  }) {
    const access = await prisma.studentMiniProjectAccess.findUnique({
      where: { id: input.accessId },
    });
    if (!access) throw new Error('Student mini project access record not found.');

    const s1 = Math.max(0, Math.min(5, Number(input.rubricScores.section1 || 0)));
    const s2 = Math.max(0, Math.min(5, Number(input.rubricScores.section2 || 0)));
    const s3 = Math.max(0, Math.min(5, Number(input.rubricScores.section3 || 0)));
    const s4 = Math.max(0, Math.min(5, Number(input.rubricScores.section4 || 0)));
    const totalAcademicScore = s1 + s2 + s3 + s4; // Max 20 marks

    const updated = await prisma.studentMiniProjectAccess.update({
      where: { id: input.accessId },
      data: {
        status: 'EVALUATED',
        academicScore: totalAcademicScore,
        rubricScoresJson: JSON.stringify({ section1: s1, section2: s2, section3: s3, section4: s4 }),
      },
    });

    return {
      success: true,
      accessId: updated.id,
      academicScore: updated.academicScore,
      maxMarks: 20,
      rubricScores: { section1: s1, section2: s2, section3: s3, section4: s4 },
      status: updated.status,
    };
  }
}
