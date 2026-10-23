import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { QuestionValidationService } from '../src/services/question-validation.service.js';
import { AiQuestionService } from '../src/services/ai-question.service.js';
import { AssessmentTestService } from '../src/services/assessment-test.service.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Phase 2: Question Bank, AI Validation & Test Assignment Engine', () => {
  const ts = Date.now().toString().slice(-4);
  let adminUser: any;
  let adminToken: string;
  let facultyUser: any;
  let facultyToken: string;
  let studentToken: string;
  let testSection: any;
  let testStudentUser: any;
  let createdProblemId: string;
  let createdTestId: string;

  beforeAll(async () => {
    // 1. Setup Admin / Faculty User
    adminUser = await prisma.user.upsert({
      where: { email: `faculty_${ts}@sanjivani.edu.in` },
      update: { role: 'ADMIN' },
      create: {
        email: `faculty_${ts}@sanjivani.edu.in`,
        username: `faculty_${ts}`,
        fullName: 'Dr. Faculty Admin',
        passwordHash: 'dummy',
        role: 'ADMIN',
        accountState: 'ACTIVE',
      },
    });



    adminToken = generateAccessToken({
      userId: adminUser.id,
      username: adminUser.username,
      role: 'ADMIN',
    });

    // 1b. Setup Faculty User
    facultyUser = await prisma.user.upsert({
      where: { email: `faculty_p2_${ts}@sanjivani.edu.in` },
      update: { role: 'FACULTY' },
      create: {
        email: `faculty_p2_${ts}@sanjivani.edu.in`,
        username: `faculty_p2_${ts}`,
        fullName: 'Prof. Faculty Tester',
        passwordHash: 'dummy',
        role: 'FACULTY',
        accountState: 'ACTIVE',
      },
    });

    facultyToken = generateAccessToken({
      userId: facultyUser.id,
      username: facultyUser.username,
      role: 'FACULTY',
    });



    // 2. Setup Course Section
    testSection = await prisma.section.create({
      data: {
        institution: 'Sanjivani University',
        course: 'B.Tech CSE',
        subject: 'C Programming & Data Structures',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        sectionName: `Section-P2-${ts}`,
        facultyId: adminUser.id,
        joinCode: `LQ-P2-${ts}`,
        joinToken: `token-p2-${ts}-${Date.now()}`,
      },
    });

    // 3. Setup Enrolled Student in Section
    testStudentUser = await prisma.user.create({
      data: {
        email: `student_p2_${ts}@sanjivani.edu.in`,
        prn: `2026P2${ts}`,
        mobile: `9876${ts}11`,
        username: `stud_p2_${ts}`,
        fullName: 'Phase 2 Test Student',
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    await prisma.sectionStudent.create({
      data: {
        sectionId: testSection.id,
        studentId: testStudentUser.id,
        prn: testStudentUser.prn,
        status: 'ENROLLED',
      },
    });

    studentToken = generateAccessToken({
      userId: testStudentUser.id,
      username: testStudentUser.username,
      role: 'STUDENT',
    });
  });

  afterAll(async () => {
    // Clean up
    if (createdTestId) {
      await prisma.assessmentTestAssignment.deleteMany({ where: { testId: createdTestId } });
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: createdTestId } });
      await prisma.assessmentTest.deleteMany({ where: { id: createdTestId } });
    }
    if (createdProblemId) {
      await prisma.testCase.deleteMany({ where: { problemId: createdProblemId } });
      await prisma.problem.deleteMany({ where: { id: createdProblemId } });
    }
    if (testSection) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: testSection.id } });
      await prisma.section.deleteMany({ where: { id: testSection.id } });
    }
    if (testStudentUser) {
      await prisma.user.deleteMany({ where: { id: testStudentUser.id } });
    }
    if (adminUser) {
      await prisma.user.deleteMany({ where: { id: adminUser.id } });
    }
    if (facultyUser) {
      await prisma.user.deleteMany({ where: { id: facultyUser.id } });
    }
  });

  describe('1. C Code Correctness & Sandbox Validation Engine (Section 17)', () => {
    it('should validate a correct C reference solution and pass all 3 test cases', async () => {
      const validC = `#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n`;
      const testCases = [
        { input: '2 3', expectedOutput: '5', isHidden: false },
        { input: '-10 20', expectedOutput: '10', isHidden: false },
        { input: '1000 2000', expectedOutput: '3000', isHidden: true },
      ];

      const outcome = await QuestionValidationService.validateCandidateQuestion(validC, testCases);

      expect(outcome.isValid).toBe(true);
      expect(outcome.validationStatus).toBe('VALIDATION_PASSED');
      expect(outcome.testResults).toHaveLength(3);
      expect(outcome.testResults.every((t) => t.passed)).toBe(true);
    }, 60000);

    it('should fail validation when reference solution produces incorrect output', async () => {
      // Logic bug: multiplies instead of adds
      const buggyC = `#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a * b);\n    return 0;\n}\n`;
      const testCases = [
        { input: '2 3', expectedOutput: '5', isHidden: false },
        { input: '-10 20', expectedOutput: '10', isHidden: false },
        { input: '1000 2000', expectedOutput: '3000', isHidden: true },
      ];

      const outcome = await QuestionValidationService.validateCandidateQuestion(buggyC, testCases);

      expect(outcome.isValid).toBe(false);
      expect(outcome.validationStatus).toBe('VALIDATION_FAILED');
      expect(outcome.failureReason).toBeDefined();
    });

    it('should reject questions where Hidden Test Case 3 is a duplicate of visible tests', async () => {
      const validC = `#include <stdio.h>\nint main() {\n    int x;\n    if (scanf("%d", &x) == 1) printf("%d\\n", x * 2);\n    return 0;\n}\n`;
      const duplicateTestCases = [
        { input: '10', expectedOutput: '20', isHidden: false },
        { input: '15', expectedOutput: '30', isHidden: false },
        { input: '10', expectedOutput: '20', isHidden: true }, // Duplicate of test 1
      ];

      const outcome = await QuestionValidationService.validateCandidateQuestion(validC, duplicateTestCases);

      expect(outcome.isValid).toBe(false);
      expect(outcome.validationStatus).toBe('VALIDATION_FAILED');
      expect(outcome.failureReason).toContain('identical to a visible test case');
    });
  });

  describe('2. AI Question Generation & Lifecycle (Sections 16 & 18)', () => {
    it('should generate an AI question with 2 visible + 1 hidden test case and auto-validate', async () => {
      const res = await request(app)
        .post('/api/questions/generate-ai')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          module: 'Module 1 - C Fundamentals',
          section: 'Section 1',
          topic: 'Array Processing & Filtering',
          difficulty: 'EASY',
          learningOutcome: 'Filter and sum numbers matching threshold criteria',
          bloomsLevel: 'APPLY',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.problem).toBeDefined();
      expect(res.body.data.problem.expectedTimeMin).toBe(2);
      expect(res.body.data.problem.expectedTimeMax).toBe(8);
      expect(res.body.data.problem.testCases).toHaveLength(3);
      expect(res.body.data.problem.validationStatus).toBe('VALIDATION_PASSED');

      createdProblemId = res.body.data.problem.id;
    });

    it('should allow faculty to approve a validated question', async () => {
      const res = await request(app)
        .post(`/api/questions/${createdProblemId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.problem.validationStatus).toBe('FACULTY_APPROVED');
      expect(res.body.problem.status).toBe('PUBLISHED');
    });
  });

  describe('3. Faculty Test Creation & Assignment (Sections 14 & 15)', () => {
    it('should reject test creation if difficulty ratios do not sum to 100%', async () => {
      const res = await request(app)
        .post('/api/assessment-tests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Invalid Ratio Test',
          sectionId: testSection.id,
          moduleId: 'Module 1',
          questionCount: 20,
          easyRatio: 50,
          mediumRatio: 40,
          hardRatio: 30, // 50+40+30 = 120%
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Difficulty ratios must sum to 100%');
    });

    it('should create an assessment test and auto-assign to section roster', async () => {
      const res = await request(app)
        .post('/api/assessment-tests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Module 1 Assessment: Control Structures & Arrays',
          sectionId: testSection.id,
          moduleId: 'Module 1',
          instructions: 'Solve all questions within 60 minutes. Dual OTP verified identity required.',
          durationMinutes: 60,
          questionCount: 5,
          easyRatio: 40,
          mediumRatio: 40,
          hardRatio: 20,
          autoSelectQuestions: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Module 1 Assessment: Control Structures & Arrays');
      expect(res.body.data.questions).toBeDefined();

      createdTestId = res.body.data.id;

      // Verify assignment was created for the student in Section
      const assignment = await prisma.assessmentTestAssignment.findUnique({
        where: {
          testId_studentId: {
            testId: createdTestId,
            studentId: testStudentUser.id,
          },
        },
      });

      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe('ASSIGNED');
    });

    it('should return faculty test details with questions and assignment roster', async () => {
      const res = await request(app)
        .get(`/api/assessment-tests/${createdTestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignments).toHaveLength(1);
      expect(res.body.data.assignments[0].student.email).toBe(testStudentUser.email);
    });

    it('should allow a FACULTY user to create and list their assessment tests', async () => {
      // Create section owned by facultyUser
      const facSection = await prisma.section.create({
        data: {
          institution: 'Sanjivani University',
          course: 'B.Tech CSE',
          subject: 'Operating Systems',
          academicYear: '2026-2027',
          semester: 'Semester 3',
          sectionName: `Fac-Sec-${ts}`,
          facultyId: facultyUser.id,
          joinCode: `FAC-${ts}`,
          joinToken: `token-fac-${ts}`,
        },
      });

      const res = await request(app)
        .post('/api/assessment-tests')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          title: 'Faculty Authored Operating Systems Midterm',
          sectionId: facSection.id,
          moduleId: 'Module 2',
          durationMinutes: 45,
          questionCount: 5,
          easyRatio: 40,
          mediumRatio: 40,
          hardRatio: 20,
          autoSelectQuestions: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Faculty Authored Operating Systems Midterm');

      const listRes = await request(app)
        .get('/api/assessment-tests')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.some((t: any) => t.id === res.body.data.id)).toBe(true);

      // Clean up facSection
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: res.body.data.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { testId: res.body.data.id } });
      await prisma.assessmentTest.deleteMany({ where: { id: res.body.data.id } });
      await prisma.section.deleteMany({ where: { id: facSection.id } });
    });

    it('should block STUDENT from creating assessment tests with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/assessment-tests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Illegal Student Created Test',
          sectionId: testSection.id,
          moduleId: 'Module 1',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should block STUDENT from generating AI questions with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/questions/generate-ai')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          module: 'Module 1',
          topic: 'Pointers',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });
});
