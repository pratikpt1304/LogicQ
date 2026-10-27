import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { prisma } from '../utils/prisma.js';
import { OtpService } from './otp.service.js';
import { normalizeDepartment, deriveDepartmentFromPrn } from '../config/academic.config.js';

export interface CreateSectionInput {
  institution: string;
  course: string;
  subject: string;
  academicYear: string;
  semester: string;
  sectionName: string;
  facultyId: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface StudentRowData {
  rowNumber: number;
  name: string;
  prn: string;
  email: string;
  mobile: string;
}

export interface ExcelValidationResult {
  totalRows: number;
  validRows: StudentRowData[];
  invalidRows: Array<{ rowNumber: number; data: Partial<StudentRowData>; errorReasons: string[] }>;
  duplicateRows: Array<{ rowNumber: number; data: StudentRowData; reason: string }>;
  conflictingRows: Array<{ rowNumber: number; data: StudentRowData; conflictReason: string }>;
  canImport: boolean;
  summary?: {
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
    conflicting: number;
  };
}

export class SectionService {
  /**
   * Generates a unique 6-8 character human-friendly join code (e.g. LQ-7B2K).
   */
  private static async generateUniqueJoinCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code = `LQ-${randomSuffix}`;
      const existing = await prisma.section.findUnique({ where: { joinCode: code } });
      if (!existing) return code;
    }
    return `LQ-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  /**
   * Section Creation Workflow (Section 11)
   */
  static async createSection(input: CreateSectionInput) {
    const joinCode = await this.generateUniqueJoinCode();
    const joinToken = crypto.randomUUID();

    return prisma.section.create({
      data: {
        institution: input.institution.trim(),
        course: input.course.trim(),
        subject: input.subject.trim(),
        academicYear: input.academicYear.trim(),
        semester: input.semester.trim(),
        sectionName: input.sectionName.trim(),
        facultyId: input.facultyId,
        description: input.description?.trim(),
        joinCode,
        joinToken,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      },
    });
  }

  /**
   * Fetch academic sections belonging to the faculty or institution (visible across faculty and admin).
   */
  static async getFacultySections(facultyId?: string, isAdmin = false) {
    const baseWhere: any = {
      joinCode: { notIn: ['LQ-DC85', 'LQ-4904', 'LQ-CE68'] },
      sectionName: { not: 'Div A - Computer Science' },
    };

    let list = await prisma.section.findMany({
      where: baseWhere,
      include: {
        _count: {
          select: { students: true },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                prn: true,
                email: true,
                mobile: true,
                accountState: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list;
  }

  /**
   * Fetch full section details with enrolled students.
   */
  static async getSectionById(sectionId: string, facultyId?: string) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        faculty: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            email: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                prn: true,
                email: true,
                mobile: true,
                accountState: true,
                createdAt: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    return section;
  }

  /**
   * Delete an academic section (Admin or Faculty).
   */
  static async deleteSection(sectionIdOrCode: string, isAdmin: boolean, facultyId?: string) {
    const section = await prisma.section.findFirst({
      where: {
        OR: [
          { id: sectionIdOrCode },
          { joinCode: sectionIdOrCode },
          { joinToken: sectionIdOrCode },
        ],
      },
    });
    if (!section) {
      return { success: true, message: 'Section already deleted or removed.' };
    }
    // Remove assessment test references if any
    try {
      await prisma.assessmentTest.updateMany({
        where: { sectionId: section.id },
        data: { sectionId: null as any },
      });
    } catch {}
    await prisma.section.delete({ where: { id: section.id } });
    return { success: true, message: `Section "${section.sectionName}" and all associated enrollments have been deleted successfully.` };
  }

  /**
   * Public info for student join page (Section 13).
   */
  static async getSectionByTokenOrCode(tokenOrCode: string) {
    const trimmed = tokenOrCode.trim();
    const section = await prisma.section.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { joinToken: trimmed },
          { joinCode: trimmed.toUpperCase() },
          { joinCode: trimmed },
        ],
      },
      select: {
        id: true,
        institution: true,
        course: true,
        subject: true,
        academicYear: true,
        semester: true,
        sectionName: true,
        joinCode: true,
        joinToken: true,
        description: true,
        faculty: {
          select: {
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    if (!section) {
      throw new Error('Section not found or enrollment is currently inactive.');
    }

    return section;
  }

  /**
   * Parses Excel file buffer and runs full validation suite (Section 12).
   */
  static async parseAndValidateExcel(buffer: Buffer): Promise<ExcelValidationResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Uploaded Excel workbook contains no sheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new Error('Uploaded sheet is empty. Please ensure rows exist below header.');
    }

    const validRows: StudentRowData[] = [];
    const invalidRows: ExcelValidationResult['invalidRows'] = [];
    const duplicateRows: ExcelValidationResult['duplicateRows'] = [];
    const conflictingRows: ExcelValidationResult['conflictingRows'] = [];

    // In-file duplicate trackers
    const seenPrns = new Map<string, number>();
    const seenEmails = new Map<string, number>();
    const seenMobiles = new Map<string, number>();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNumber = i + 2; // 1-based header is row 1

      // Case-insensitive flexible key matching
      const name = String(raw['Name'] || raw['name'] || raw['Student Name'] || raw['Full Name'] || '').trim();
      const prn = String(raw['PRN/Roll No'] || raw['PRN'] || raw['prn'] || raw['Roll No'] || raw['RollNo'] || '').trim().toUpperCase();
      const email = String(raw['Valid Email'] || raw['Email'] || raw['email'] || raw['Email Address'] || '').trim().toLowerCase();
      const rawMobile = String(raw['Mobile'] || raw['mobile'] || raw['Phone'] || raw['Mobile Number'] || '').trim();
      const mobile = rawMobile.replace(/[^0-9]/g, '');

      const errors: string[] = [];

      // 1. Validate missing values
      if (!name) errors.push('Missing student name');
      if (!prn) errors.push('Missing PRN / Roll No');
      if (!email) errors.push('Missing email address');

      // 2. Validate email format
      if (email && !emailRegex.test(email)) {
        errors.push(`Invalid email format: "${email}"`);
      }

      // 3. Optional mobile format check
      if (mobile && mobile.length < 10) {
        errors.push(`Mobile number must be at least 10 digits (got: "${rawMobile}")`);
      }

      if (errors.length > 0) {
        invalidRows.push({
          rowNumber,
          data: { name, prn, email, mobile },
          errorReasons: errors,
        });
        continue;
      }

      const rowData: StudentRowData = { rowNumber, name, prn, email, mobile };

      // 4. Validate intra-file duplicates
      if (seenPrns.has(prn)) {
        duplicateRows.push({
          rowNumber,
          data: rowData,
          reason: `Duplicate PRN "${prn}" already present in row ${seenPrns.get(prn)}`,
        });
        continue;
      }
      if (seenEmails.has(email)) {
        duplicateRows.push({
          rowNumber,
          data: rowData,
          reason: `Duplicate Email "${email}" already present in row ${seenEmails.get(email)}`,
        });
        continue;
      }
      if (seenMobiles.has(mobile)) {
        duplicateRows.push({
          rowNumber,
          data: rowData,
          reason: `Duplicate Mobile "${mobile}" already present in row ${seenMobiles.get(mobile)}`,
        });
        continue;
      }

      seenPrns.set(prn, rowNumber);
      seenEmails.set(email, rowNumber);
      seenMobiles.set(mobile, rowNumber);

      // 5. Database conflicting identity mapping check (Section 10)
      const bindingCheck = await OtpService.validateIdentityBinding(prn, email, mobile);
      if (!bindingCheck.valid) {
        conflictingRows.push({
          rowNumber,
          data: rowData,
          conflictReason: bindingCheck.conflictReason || 'Conflicting database identity mapping',
        });
        continue;
      }

      validRows.push(rowData);
    }

    return {
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      duplicateRows,
      conflictingRows,
      canImport: validRows.length > 0,
      summary: {
        total: rawRows.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        duplicate: duplicateRows.length,
        conflicting: conflictingRows.length,
      },
    };
  }

  /**
   * Commits validated Excel rows to the Section with transaction safety.
   */
  static async commitExcelImport(sectionId: string, students: StudentRowData[], facultyId: string, isAdmin = false) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new Error('Section not found.');
    }
    if (!isAdmin && section.facultyId !== facultyId) {
      throw new Error('Unauthorized to import students into this section.');
    }

    let newlyEnrolled = 0;
    let existingUpdated = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of students) {
        // Find existing user by PRN, Email, or Mobile
        let user = await tx.user.findFirst({
          where: {
            OR: [
              { prn: row.prn },
              { email: row.email },
              ...(row.mobile ? [{ mobile: row.mobile }] : []),
            ],
          },
        });

        if (!user) {
          // Create student record in PENDING state until they verify OTP
          user = await tx.user.create({
            data: {
              fullName: row.name,
              displayName: row.name,
              prn: row.prn,
              email: row.email,
              mobile: row.mobile,
              passwordHash: '$2a$10$UnactivatedPendingUserPlaceholderHash000000000',
              role: 'STUDENT',
              accountState: 'PENDING',
              profileComplete: true,
            },
          });
        } else {
          // Update mobile or name if not yet set
          if (!user.mobile) {
            await tx.user.update({
              where: { id: user.id },
              data: { mobile: row.mobile },
            });
          }
        }

        // Enroll in section
        const existingEnrollment = await tx.sectionStudent.findUnique({
          where: {
            sectionId_studentId: {
              sectionId,
              studentId: user.id,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.sectionStudent.create({
            data: {
              sectionId,
              studentId: user.id,
              prn: row.prn,
              status: user.accountState === 'ACTIVE' ? 'ENROLLED' : 'PENDING_VERIFICATION',
              joinedVia: 'EXCEL_IMPORT',
            },
          });
          newlyEnrolled++;
        } else {
          existingUpdated++;
        }
      }
    });

    return {
      success: true,
      newlyEnrolled,
      existingUpdated,
      totalCommitted: students.length,
    };
  }

  /**
   * Instant Student Join with Dual OTP validation & Identity Binding (Section 13).
   */
  static async instantStudentJoin(input: {
    joinToken: string;
    name: string;
    prn: string;
    email: string;
    mobile?: string | null;
    department?: string | null;
    year?: string | null;
  }) {
    const cleanPrn = input.prn.trim().toUpperCase();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanMobile = input.mobile ? input.mobile.replace(/[^0-9]/g, '') : null;
    const cleanName = input.name.trim();

    // 1. Verify section
    const section = await this.getSectionByTokenOrCode(input.joinToken);

    // 2. Enforce Identity Binding
    const binding = await OtpService.validateIdentityBinding(cleanPrn, cleanEmail, cleanMobile);
    if (!binding.valid) {
      throw new Error(binding.conflictReason || 'Identity conflict detected. Cannot join section.');
    }

    // 3. Verify that Email OTP was successfully verified for this identity
    const verifiedEmailOtp = await prisma.otpVerification.findFirst({
      where: {
        target: cleanEmail,
        type: 'EMAIL',
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedEmailOtp) {
      throw new Error('Email address has not been verified with OTP yet.');
    }

    // 4. Atomically create or activate student and bind identity
    const result = await prisma.$transaction(async (tx) => {
      let student = await tx.user.findFirst({
        where: {
          OR: [{ prn: cleanPrn }, { email: cleanEmail }],
        },
      });

      if (!student) {
        student = await tx.user.create({
          data: {
            fullName: cleanName,
            displayName: cleanName,
            prn: cleanPrn,
            email: cleanEmail,
            mobile: cleanMobile,
            department: input.department?.trim() || normalizeDepartment(section.course) || 'General',
            year: input.year?.trim() || 'FY',
            passwordHash: '$2a$10$VerifiedStudentJoinedViaInstantForm000000000',
            role: 'STUDENT',
            accountState: 'ACTIVE',
            emailOtpVerifiedAt: verifiedEmailOtp.verifiedAt || new Date(),
            mobileOtpVerifiedAt: null,
            identityBoundAt: new Date(),
            profileComplete: true,
          },
        });
      } else {
        student = await tx.user.update({
          where: { id: student.id },
          data: {
            prn: cleanPrn,
            mobile: cleanMobile,
            department: input.department?.trim() || student.department || normalizeDepartment(section.course) || 'General',
            year: input.year?.trim() || student.year || 'FY',
            accountState: 'ACTIVE',
            emailOtpVerifiedAt: verifiedEmailOtp.verifiedAt || new Date(),
            mobileOtpVerifiedAt: null,
            identityBoundAt: new Date(),
          },
        });
      }

      // Check enrollment
      let enrollment = await tx.sectionStudent.findUnique({
        where: {
          sectionId_studentId: {
            sectionId: section.id,
            studentId: student.id,
          },
        },
      });

      if (!enrollment) {
        enrollment = await tx.sectionStudent.create({
          data: {
            sectionId: section.id,
            studentId: student.id,
            prn: cleanPrn,
            status: 'ENROLLED',
            joinedVia: 'INSTANT_JOIN',
          },
        });
      } else if (enrollment.status !== 'ENROLLED') {
        enrollment = await tx.sectionStudent.update({
          where: { id: enrollment.id },
          data: { status: 'ENROLLED' },
        });
      }

      return { student, enrollment };
    });

    return {
      success: true,
      enrolled: true,
      message: `Successfully joined ${section.sectionName} (${section.course})!`,
      section: {
        id: section.id,
        sectionName: section.sectionName,
        course: section.course,
        subject: section.subject,
      },
      student: {
        id: result.student.id,
        prn: result.student.prn,
        email: result.student.email,
        mobile: result.student.mobile,
        accountState: result.student.accountState,
      },
      data: {
        enrolled: true,
        section: {
          id: section.id,
          sectionName: section.sectionName,
          course: section.course,
          subject: section.subject,
        },
        student: {
          id: result.student.id,
          prn: result.student.prn,
          email: result.student.email,
          mobile: result.student.mobile,
          accountState: result.student.accountState,
        },
      },
    };
  }

  /**
   * Directly enroll an authenticated student into a section via join code & assign all published tests
   */
  static async enrollStudentByCode(studentId: string, joinCode: string) {
    const cleanCode = joinCode.trim().toUpperCase();
    const section = await prisma.section.findFirst({
      where: {
        OR: [{ joinCode: cleanCode }, { joinToken: cleanCode }],
        isActive: true,
      },
    });

    if (!section) {
      throw new Error(`Section with code "${cleanCode}" not found or inactive.`);
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!studentUser) {
      throw new Error('Student user not found.');
    }

    // Upsert enrollment
    await prisma.sectionStudent.upsert({
      where: {
        sectionId_studentId: {
          sectionId: section.id,
          studentId,
        },
      },
      update: {
        status: 'ENROLLED',
      },
      create: {
        sectionId: section.id,
        studentId,
        prn: studentUser.prn || 'PRN_' + studentId.slice(0, 8),
        status: 'ENROLLED',
        joinedVia: 'JOIN_CODE',
      },
    });

    // Automatically assign all published tests of this section to the student!
    const publishedTests = await prisma.assessmentTest.findMany({
      where: {
        sectionId: section.id,
        status: 'PUBLISHED',
      },
    });

    for (const t of publishedTests) {
      await prisma.assessmentTestAssignment.upsert({
        where: {
          testId_studentId: {
            testId: t.id,
            studentId,
          },
        },
        update: {},
        create: {
          testId: t.id,
          studentId,
          status: 'ASSIGNED',
        },
      });
    }

    return {
      success: true,
      enrolled: true,
      message: `Successfully joined ${section.sectionName} (${section.subject})! Tests are now available.`,
      section: {
        id: section.id,
        sectionName: section.sectionName,
        course: section.course,
        subject: section.subject,
      },
      assignedTestsCount: publishedTests.length,
    };
  }

  /**
   * Remove a student enrollment from a section
   */
  static async removeStudentFromSection(sectionId: string, studentIdentifier: string) {
    const cleanId = studentIdentifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { prn: cleanId.toUpperCase() },
          { email: cleanId.toLowerCase() },
        ],
      },
    });

    if (user) {
      await prisma.sectionStudent.deleteMany({
        where: {
          sectionId,
          studentId: user.id,
        },
      });
    } else {
      await prisma.sectionStudent.deleteMany({
        where: {
          sectionId,
          prn: cleanId.toUpperCase(),
        },
      });
    }

    return { success: true, message: 'Student removed from section successfully.' };
  }
}
