import { prisma } from '../utils/prisma.js';

export interface CreateAssessmentTestDto {
  title: string;
  sectionId: string;
  moduleId: string;
  instructions?: string;
  durationMinutes: number;
  questionCount: number;
  easyRatio: number;      // e.g. 40
  mediumRatio: number;    // e.g. 40
  hardRatio: number;      // e.g. 20
  randomiseQuestions?: boolean;
  startTime?: string | Date;
  endTime?: string | Date;
  attemptPolicy?: 'STRICT_NO_REATTEMPT' | 'ALLOW_ONE_RETRY';
  autoSelectQuestions?: boolean;
  manualQuestionIds?: string[];
}

export class AssessmentTestService {
  /**
   * Creates an Assessment Test with difficulty distribution (Sections 4, 14, 15).
   */
  static async createTest(input: CreateAssessmentTestDto, facultyId: string) {
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
    });

    if (!section) {
      throw new Error('Section not found.');
    }
    const creatorUser = await prisma.user.findUnique({ where: { id: facultyId }, select: { role: true } });
    if (section.facultyId !== facultyId && creatorUser?.role !== 'ADMIN') {
      throw new Error('Unauthorized to create tests for this section.');
    }

    const totalRatio = input.easyRatio + input.mediumRatio + input.hardRatio;
    if (totalRatio !== 100) {
      throw new Error(`Difficulty ratios must sum to 100%. Current sum: ${totalRatio}%`);
    }

    let selectedQuestionIds: string[] = [];

    if (input.autoSelectQuestions || !input.manualQuestionIds || input.manualQuestionIds.length === 0) {
      // Auto-select questions meeting the ratio
      const count = input.questionCount || 20;
      const easyTarget = Math.round((input.easyRatio / 100) * count);
      const mediumTarget = Math.round((input.mediumRatio / 100) * count);
      const hardTarget = count - (easyTarget + mediumTarget);

      const approvedWhere = {
        validationStatus: { in: ['FACULTY_APPROVED', 'PUBLISHED'] },
      };

      const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
        prisma.problem.findMany({
          where: { ...approvedWhere, difficulty: 'EASY' },
          take: easyTarget,
          select: { id: true },
        }),
        prisma.problem.findMany({
          where: { ...approvedWhere, difficulty: 'MEDIUM' },
          take: mediumTarget,
          select: { id: true },
        }),
        prisma.problem.findMany({
          where: { ...approvedWhere, difficulty: 'HARD' },
          take: hardTarget,
          select: { id: true },
        }),
      ]);

      selectedQuestionIds = [
        ...easyQuestions.map((q) => q.id),
        ...mediumQuestions.map((q) => q.id),
        ...hardQuestions.map((q) => q.id),
      ];

      // If not enough questions match strict difficulty, fill from available approved problems
      if (selectedQuestionIds.length < count) {
        const remainingNeeded = count - selectedQuestionIds.length;
        const additional = await prisma.problem.findMany({
          where: {
            ...approvedWhere,
            id: { notIn: selectedQuestionIds },
          },
          take: remainingNeeded,
          select: { id: true },
        });
        selectedQuestionIds.push(...additional.map((q) => q.id));
      }
    } else {
      // Manual selection: verify each exists
      const verified = await prisma.problem.findMany({
        where: { id: { in: input.manualQuestionIds } },
        select: { id: true },
      });
      selectedQuestionIds = verified.map((q) => q.id);
    }

    // Create the test
    const test = await prisma.assessmentTest.create({
      data: {
        title: input.title,
        sectionId: input.sectionId,
        moduleId: input.moduleId,
        instructions: input.instructions,
        durationMinutes: input.durationMinutes || 60,
        questionCount: selectedQuestionIds.length,
        easyRatio: input.easyRatio,
        mediumRatio: input.mediumRatio,
        hardRatio: input.hardRatio,
        randomiseQuestions: input.randomiseQuestions ?? true,
        startTime: input.startTime ? new Date(input.startTime) : null,
        endTime: input.endTime ? new Date(input.endTime) : null,
        attemptPolicy: input.attemptPolicy || 'STRICT_NO_REATTEMPT',
        status: 'PUBLISHED',
        createdById: facultyId,
        questions: {
          create: selectedQuestionIds.map((problemId, index) => ({
            problemId,
            orderIndex: index + 1,
            marks: 1, // 1 mark per normal question (Section 3)
          })),
        },
      },
      include: {
        questions: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                expectedTimeMin: true,
                expectedTimeMax: true,
                validationStatus: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Auto-assign to all enrolled students in the section
    await this.assignTestToSection(test.id, facultyId);

    return test;
  }

  /**
   * Assigns an Assessment Test to all enrolled students in the Section.
   */
  static async assignTestToSection(testId: string, facultyId: string) {
    const test = await prisma.assessmentTest.findUnique({
      where: { id: testId },
      include: { section: true },
    });

    if (!test) {
      throw new Error('Assessment test not found.');
    }
    const assignerUser = await prisma.user.findUnique({ where: { id: facultyId }, select: { role: true } });
    if (test.createdById !== facultyId && test.section.facultyId !== facultyId && assignerUser?.role !== 'ADMIN') {
      throw new Error('Unauthorized to assign this test.');
    }

    const enrolledStudents = await prisma.sectionStudent.findMany({
      where: {
        sectionId: test.sectionId,
        status: 'ENROLLED',
      },
      select: { studentId: true },
    });

    let assignedCount = 0;
    for (const s of enrolledStudents) {
      await prisma.assessmentTestAssignment.upsert({
        where: {
          testId_studentId: {
            testId,
            studentId: s.studentId,
          },
        },
        update: {},
        create: {
          testId,
          studentId: s.studentId,
          status: 'ASSIGNED',
        },
      });
      assignedCount++;
    }

    return {
      success: true,
      testId,
      assignedStudentsCount: assignedCount,
    };
  }

  /**
   * Fetches tests created by a faculty member.
   */
  static async getFacultyTests(facultyId: string) {
    const user = await prisma.user.findUnique({ where: { id: facultyId }, select: { role: true } });
    const where = user?.role === 'ADMIN' ? {} : { createdById: facultyId };
    return prisma.assessmentTest.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            sectionName: true,
            course: true,
            subject: true,
          },
        },
        _count: {
          select: {
            questions: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches detailed test view including questions and assignments.
   */
  static async getTestDetails(testId: string, userId: string) {
    const test = await prisma.assessmentTest.findUnique({
      where: { id: testId },
      include: {
        section: true,
        questions: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                module: true,
                section: true,
                topic: true,
                expectedTimeMin: true,
                expectedTimeMax: true,
                validationStatus: true,
                testCases: {
                  where: { isHidden: false }, // Never leak hidden tests to regular viewers
                  select: { id: true, input: true, expectedOutput: true, isHidden: true },
                },
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                prn: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return test;
  }
}
