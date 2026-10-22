import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Phase 3: Smart Exam Engine, Time Scoring, Reattempt Lock & Integrity Tracking', () => {
  const ts = Date.now().toString().slice(-4);
  let facultyUser: any;
  let facultyToken: string;
  let studentUser: any;
  let studentToken: string;
  let otherStudentUser: any;
  let otherStudentToken: string;
  let section: any;
  let problem1: any;
  let problem2: any;
  let testRecord: any;
  let assignment: any;
  let otherAssignment: any;

  beforeAll(async () => {
    // 1. Setup Faculty
    facultyUser = await prisma.user.upsert({
      where: { email: `faculty_exam_${ts}@sanjivani.edu.in` },
      update: { role: 'ADMIN' },
      create: {
        email: `faculty_exam_${ts}@sanjivani.edu.in`,
        username: `fac_exam_${ts}`,
        fullName: 'Dr. Exam Evaluator',
        passwordHash: 'dummy',
        role: 'ADMIN',
        accountState: 'ACTIVE',
      },
    });

    facultyToken = generateAccessToken({
      userId: facultyUser.id,
      username: facultyUser.username,
      role: 'ADMIN',
    });

    // 2. Setup Students
    studentUser = await prisma.user.create({
      data: {
        email: `student_exam_${ts}@sanjivani.edu.in`,
        prn: `2026EX${ts}1`,
        mobile: `9876${ts}22`,
        username: `stud_exam_${ts}`,
        fullName: 'Exam Candidate One',
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      username: studentUser.username,
      role: 'STUDENT',
    });

    otherStudentUser = await prisma.user.create({
      data: {
        email: `other_student_${ts}@sanjivani.edu.in`,
        prn: `2026EX${ts}2`,
        mobile: `9876${ts}33`,
        username: `stud_other_${ts}`,
        fullName: 'Exam Candidate Two',
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    otherStudentToken = generateAccessToken({
      userId: otherStudentUser.id,
      username: otherStudentUser.username,
      role: 'STUDENT',
    });

    // 3. Setup Course Section
    section = await prisma.section.create({
      data: {
        institution: 'Sanjivani University',
        course: 'B.Tech CSE',
        subject: 'C Programming Data Structures',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        sectionName: `Exam-Sec-${ts}`,
        facultyId: facultyUser.id,
        joinCode: `EXAM-${ts}`,
        joinToken: `token-exam-${ts}-${Date.now()}`,
      },
    });

    await prisma.sectionStudent.createMany({
      data: [
        { sectionId: section.id, studentId: studentUser.id, prn: studentUser.prn, status: 'ENROLLED' },
        { sectionId: section.id, studentId: otherStudentUser.id, prn: otherStudentUser.prn, status: 'ENROLLED' },
      ],
    });

    // 4. Create Problems with 2 Visible + 1 Hidden Test Case (Section 6)
    problem1 = await prisma.problem.create({
      data: {
        title: `Sum of Two Numbers ${ts}`,
        slug: `sum-two-numbers-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Variables and Arithmetic',
        scenario: 'Calculate the total of two inputs.',
        description: 'Read two integers from standard input and print their sum.',
        starterCode: '#include <stdio.h>\nint main() {\n    // write code\n    return 0;\n}\n',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        expectedTimeMin: 2,
        expectedTimeMax: 8,
        validationStatus: 'VALIDATION_PASSED',
        testCases: {
          create: [
            { input: '5 7', expectedOutput: '12', isHidden: false, orderIndex: 1 },
            { input: '-3 8', expectedOutput: '5', isHidden: false, orderIndex: 2 },
            { input: '100 200', expectedOutput: '300', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    problem2 = await prisma.problem.create({
      data: {
        title: `Sum of Inputs Two ${ts}`,
        slug: `sum-inputs-two-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Variables and Arithmetic',
        scenario: 'Calculate the sum of two inputs.',
        description: 'Read two integers and print their sum (a + b).',
        starterCode: '#include <stdio.h>\nint main() {\n    // write code\n    return 0;\n}\n',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        expectedTimeMin: 2,
        expectedTimeMax: 8,
        validationStatus: 'VALIDATION_PASSED',
        testCases: {
          create: [
            { input: '10 4', expectedOutput: '14', isHidden: false, orderIndex: 1 },
            { input: '20 25', expectedOutput: '45', isHidden: false, orderIndex: 2 },
            { input: '100 50', expectedOutput: '150', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    // 5. Create Assessment Test & Assign to Section
    testRecord = await prisma.assessmentTest.create({
      data: {
        title: `Midterm Programming Lab Assessment ${ts}`,
        instructions: 'Mandatory C programming assessment under proctoring.',
        moduleId: 'Module 1 - C Basics',
        sectionId: section.id,
        createdById: facultyUser.id,
        status: 'PUBLISHED',
        questionCount: 2,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 7200000),
        questions: {
          create: [
            { problemId: problem1.id, orderIndex: 1 },
            { problemId: problem2.id, orderIndex: 2 },
          ],
        },
      },
    });

    assignment = await prisma.assessmentTestAssignment.create({
      data: {
        testId: testRecord.id,
        studentId: studentUser.id,
        status: 'ASSIGNED',
        academicScore: 0,
      },
    });

    otherAssignment = await prisma.assessmentTestAssignment.create({
      data: {
        testId: testRecord.id,
        studentId: otherStudentUser.id,
        status: 'ASSIGNED',
        academicScore: 0,
      },
    });
  });

  afterAll(async () => {
    if (assignment) {
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignment.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignment.id } });
    }
    if (otherAssignment) {
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: otherAssignment.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: otherAssignment.id } });
    }
    if (testRecord) {
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: testRecord.id } });
      await prisma.assessmentTest.deleteMany({ where: { id: testRecord.id } });
    }
    if (problem1) {
      await prisma.testCase.deleteMany({ where: { problemId: problem1.id } });
      await prisma.problem.deleteMany({ where: { id: problem1.id } });
    }
    if (problem2) {
      await prisma.testCase.deleteMany({ where: { problemId: problem2.id } });
      await prisma.problem.deleteMany({ where: { id: problem2.id } });
    }
    if (section) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: section.id } });
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
    if (studentUser) await prisma.user.deleteMany({ where: { id: studentUser.id } });
    if (otherStudentUser) await prisma.user.deleteMany({ where: { id: otherStudentUser.id } });
    if (facultyUser) await prisma.user.deleteMany({ where: { id: facultyUser.id } });
  });

  describe('1. Question Start & Anti-Sharing Variant ID (Sections 6 & 34)', () => {
    it('should generate a unique question variant ID and omit hidden test cases', async () => {
      const res = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment.id,
          problemId: problem1.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attemptId).toBeDefined();
      expect(res.body.questionVariantId).toMatch(/^VAR-[A-F0-9]{6}-[A-Z0-9]{4}$/);
      expect(res.body.problem.visibleTestCases).toHaveLength(2);
      expect(res.body.problem.visibleTestCases.every((tc: any) => tc.isHidden === false)).toBe(true);
    });

    it('should prevent student from accessing another student assignment', async () => {
      const res = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          assignmentId: assignment.id, // assignment belongs to studentUser
          problemId: problem1.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized');
    });
  });

  describe('2. Interactive Run on Visible Tests (Section 6)', () => {
    it('should compile and run code against visible test 1 & 2 only, recording pass timestamps', async () => {
      // 1. Fetch attempt ID
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment.id,
          problemId: problem1.id,
        });
      const attemptId = startRes.body.attemptId;

      // 2. Run correct code
      const runRes = await request(app)
        .post('/api/exam/run-code')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        });

      expect(runRes.status).toBe(200);
      expect(runRes.body.success).toBe(true);
      expect(runRes.body.testResults).toHaveLength(2);
      expect(runRes.body.testResults[0].passed).toBe(true);
      expect(runRes.body.testResults[1].passed).toBe(true);

      // Verify database updated execution count and timestamps
      const dbAttempt = await prisma.assessmentQuestionAttempt.findUnique({
        where: { id: attemptId },
      });
      expect(dbAttempt?.executionCount).toBeGreaterThanOrEqual(1);
      expect(dbAttempt?.firstPassT1At).not.toBeNull();
      expect(dbAttempt?.firstPassT2At).not.toBeNull();
    });
  });

  describe('3. Time-Based Scoring (Section 5)', () => {
    it('should award 1.0 mark when submitted correctly within prescribed time (<= expectedMaxSec)', async () => {
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment.id,
          problemId: problem1.id,
        });
      const attemptId = startRes.body.attemptId;

      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
          clientMetrics: {
            copyPasteAttempts: 0,
            tabSwitchCount: 0,
            fullScreenExitCount: 0,
            largestBurstChars: 25,
            activeInteractionTimeSec: 45,
          },
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.verdict).toBe('ACCEPTED');
      expect(submitRes.body.academicScore).toBe(1.0);
      expect(submitRes.body.isLocked).toBe(true);
      // Hidden test output masked
      expect(submitRes.body.testOutcomes[2].isHidden).toBe(true);
      expect(submitRes.body.testOutcomes[2].actualOutput).toBe('PASSED');
      expect(submitRes.body.testOutcomes[2].input).toContain('HIDDEN');
    });

    it('should award 0.5 marks when submitted correctly but outside prescribed time', async () => {
      // Start problem2 for otherStudent
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          assignmentId: otherAssignment.id,
          problemId: problem2.id,
        });
      const attemptId = startRes.body.attemptId;

      // Manually set startedAt in past to simulate exceeding expectedTimeMax (8 min = 480s)
      await prisma.assessmentQuestionAttempt.update({
        where: { id: attemptId },
        data: {
          startedAt: new Date(Date.now() - 600000), // 10 minutes ago (> 8 min max)
        },
      });

      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
          clientMetrics: {
            activeInteractionTimeSec: 500,
          },
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.verdict).toBe('ACCEPTED');
      expect(submitRes.body.academicScore).toBe(0.5); // Section 5: outside prescribed time
      expect(submitRes.body.isLocked).toBe(true);
    });

    it('should award 0.0 marks when solution fails test cases', async () => {
      // Start problem2 for studentUser
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment.id,
          problemId: problem2.id,
        });
      const attemptId = startRes.body.attemptId;

      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    printf("Wrong Output\\n");\n    return 0;\n}\n',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.academicScore).toBe(0.0);
      expect(submitRes.body.verdict).not.toBe('ACCEPTED');
      expect(submitRes.body.isLocked).toBe(false); // Only locks when ACCEPTED
    });
  });

  describe('4. Question Reattempt Lock Policy (Section 7)', () => {
    it('should strictly lock accepted questions and deny restart or re-submission', async () => {
      // Problem 1 was already accepted and locked for studentUser
      // 1. Attempting to start problem 1 again
      const restartRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment.id,
          problemId: problem1.id,
        });

      expect(restartRes.status).toBe(403);
      expect(restartRes.body.message).toContain('QUESTION_LOCKED');

      // 2. Fetch the attempt record directly
      const attempt = await prisma.assessmentQuestionAttempt.findUnique({
        where: {
          assignmentId_problemId: {
            assignmentId: assignment.id,
            problemId: problem1.id,
          },
        },
      });

      // 3. Attempting to submit code to the locked attempt
      const resubmitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId: attempt!.id,
          code: '#include <stdio.h>\nint main() { return 0; }\n',
        });

      expect(resubmitRes.status).toBe(403);
      expect(resubmitRes.body.message).toContain('QUESTION_LOCKED');
    });
  });

  describe('5. Behavioral Integrity Engine & Risk Tiering (Sections 20-28, 57-58)', () => {
    it('should compute integrity score, suspicious flags, and risk tier for flagged attempts', async () => {
      // Start problem 1 for otherStudent
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          assignmentId: otherAssignment.id,
          problemId: problem1.id,
        });
      const attemptId = startRes.body.attemptId;

      const highRiskCode = '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n';

      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          attemptId,
          code: highRiskCode,
          clientMetrics: {
            copyPasteAttempts: 2,         // +20
            tabSwitchCount: 3,            // +24
            fullScreenExitCount: 2,       // +20
            largestBurstChars: 120,       // > 60% burst +25
            activeInteractionTimeSec: 10,
          },
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.integrityScore).toBeGreaterThanOrEqual(60);
      expect(['HIGH', 'CRITICAL']).toContain(submitRes.body.integrityRisk);
      expect(submitRes.body.suspiciousFlags.length).toBeGreaterThan(0);
      expect(submitRes.body.suspiciousFlags.some((f: string) => f.includes('copy/paste'))).toBe(true);
      expect(submitRes.body.suspiciousFlags.some((f: string) => f.includes('Tab switch'))).toBe(true);
      expect(submitRes.body.suspiciousFlags.some((f: string) => f.includes('Full screen'))).toBe(true);
    });
  });
});
