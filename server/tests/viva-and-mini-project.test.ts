import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Phase 4: AI Viva Verification & Mini-Project Activation Framework', () => {
  const ts = Date.now().toString().slice(-4);
  let facultyUser: any;
  let facultyToken: string;
  let studentUser: any;
  let studentToken: string;
  let section: any;
  let problem1: any;
  let problem2: any;
  let problem3: any;
  let testRecord: any;
  let assignment: any;
  let miniProject: any;

  beforeAll(async () => {
    // 1. Setup Faculty
    facultyUser = await prisma.user.upsert({
      where: { email: `faculty_p4_${ts}@sanjivani.edu.in` },
      update: { role: 'ADMIN' },
      create: {
        email: `faculty_p4_${ts}@sanjivani.edu.in`,
        username: `fac_p4_${ts}`,
        fullName: 'Dr. Viva & Project Mentor',
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

    // 2. Setup Student
    studentUser = await prisma.user.create({
      data: {
        email: `student_p4_${ts}@sanjivani.edu.in`,
        prn: `2026P4${ts}1`,
        mobile: `9876${ts}44`,
        username: `stud_p4_${ts}`,
        fullName: 'Phase 4 Candidate',
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

    // 3. Setup Course Section
    section = await prisma.section.create({
      data: {
        institution: 'Sanjivani University',
        course: 'B.Tech CSE',
        subject: 'C Programming Data Structures',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        sectionName: `P4-VivaSec-${ts}`,
        facultyId: facultyUser.id,
        joinCode: `VIVA-${ts}`,
        joinToken: `token-viva-${ts}-${Date.now()}`,
      },
    });

    await prisma.sectionStudent.create({
      data: {
        sectionId: section.id,
        studentId: studentUser.id,
        prn: studentUser.prn,
        status: 'ENROLLED',
      },
    });

    // 4. Create Problems
    problem1 = await prisma.problem.create({
      data: {
        title: `Viva Trigger Test 1 ${ts}`,
        slug: `viva-trig-1-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Variables and Arithmetic',
        scenario: 'Calculate input sum.',
        description: 'Read two integers and print sum.',
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        testCases: {
          create: [
            { input: '2 3', expectedOutput: '5', isHidden: false, orderIndex: 1 },
            { input: '-1 1', expectedOutput: '0', isHidden: false, orderIndex: 2 },
            { input: '10 20', expectedOutput: '30', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    problem2 = await prisma.problem.create({
      data: {
        title: `Viva Trigger Test 2 ${ts}`,
        slug: `viva-trig-2-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Variables and Arithmetic',
        scenario: 'Calculate input sum again.',
        description: 'Read two integers and print sum.',
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        testCases: {
          create: [
            { input: '4 6', expectedOutput: '10', isHidden: false, orderIndex: 1 },
            { input: '0 0', expectedOutput: '0', isHidden: false, orderIndex: 2 },
            { input: '15 25', expectedOutput: '40', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    problem3 = await prisma.problem.create({
      data: {
        title: `Viva Trigger Test 3 ${ts}`,
        slug: `viva-trig-3-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Variables and Arithmetic',
        scenario: 'Calculate input sum 3.',
        description: 'Read two integers and print sum.',
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        testCases: {
          create: [
            { input: '5 5', expectedOutput: '10', isHidden: false, orderIndex: 1 },
            { input: '1 2', expectedOutput: '3', isHidden: false, orderIndex: 2 },
            { input: '50 50', expectedOutput: '100', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    // 5. Create Assessment Test & Assignment
    testRecord = await prisma.assessmentTest.create({
      data: {
        title: `Viva Assessment Test ${ts}`,
        instructions: 'Test evaluating successive correct viva triggers.',
        moduleId: 'Module 1 - C Basics',
        sectionId: section.id,
        createdById: facultyUser.id,
        status: 'PUBLISHED',
        questionCount: 3,
        questions: {
          create: [
            { problemId: problem1.id, orderIndex: 1 },
            { problemId: problem2.id, orderIndex: 2 },
            { problemId: problem3.id, orderIndex: 3 },
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
        successiveCorrectCount: 0,
      },
    });

    // 6. Seed Mini-Project (Section 35)
    miniProject = await prisma.miniProject.create({
      data: {
        moduleId: 'Module 1 - C Basics',
        title: `Integrated Inventory System ${ts}`,
        scenario: 'Develop an in-memory inventory management module with logging and search.',
        requirements: 'Implement modular functions for product insertion, stock lookup, and category analysis.',
        rubricJson: JSON.stringify([
          { competency: 'Section 1 (Control Structures)', maxMarks: 5 },
          { competency: 'Section 2 (Arrays & Structs)', maxMarks: 5 },
          { competency: 'Section 3 (Functions & Pointers)', maxMarks: 5 },
          { competency: 'Section 4 (System Integration)', maxMarks: 5 },
        ]),
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
      },
    });
  });

  afterAll(async () => {
    if (miniProject) {
      await prisma.studentMiniProjectAccess.deleteMany({ where: { miniProjectId: miniProject.id } });
      await prisma.miniProject.deleteMany({ where: { id: miniProject.id } });
    }
    if (assignment) {
      await prisma.assessmentVivaQuestion.deleteMany({ where: { assignmentId: assignment.id } });
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignment.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignment.id } });
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
    if (problem3) {
      await prisma.testCase.deleteMany({ where: { problemId: problem3.id } });
      await prisma.problem.deleteMany({ where: { id: problem3.id } });
    }
    if (section) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: section.id } });
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
    if (studentUser) await prisma.user.deleteMany({ where: { id: studentUser.id } });
    if (facultyUser) await prisma.user.deleteMany({ where: { id: facultyUser.id } });
  });

  describe('1. Successive Correct Submission AI Viva Engine (Sections 29 & 30)', () => {
    it('should NOT trigger viva on the first correct submission (#1)', async () => {
      // 1. Start Question 1
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignment.id, problemId: problem1.id });
      const attemptId = startRes.body.attemptId;

      // 2. Submit Question 1
      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.verdict).toBe('ACCEPTED');
      expect(submitRes.body.vivaTriggered).toBe(false); // First submission does not trigger viva
    });

    it('should trigger AI viva on the second successive correct submission (#2) (Section 29)', async () => {
      // 1. Start Question 2
      const startRes = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignmentId: assignment.id, problemId: problem2.id });
      const attemptId = startRes.body.attemptId;

      // 2. Submit Question 2
      const submitRes = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          attemptId,
          code: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.verdict).toBe('ACCEPTED');
      expect(submitRes.body.vivaTriggered).toBe(true); // Mandatory viva on #2!
      expect(submitRes.body.vivaId).toBeDefined();
      expect(submitRes.body.vivaQuestionText).toBeDefined();
      expect(submitRes.body.vivaQuestionText.length).toBeGreaterThan(15);

      // Section 33: Verify Suspicious Flag — Viva Trigger
      const attempt = await prisma.assessmentQuestionAttempt.findUnique({
        where: { id: attemptId },
      });
      expect(attempt?.suspiciousFlags).toContain('Suspicious Flag — Viva Trigger');
    });

    it('should allow student to submit viva answer within 60s and record response (Sections 31 & 32)', async () => {
      // Fetch pending viva
      const pendingRes = await request(app)
        .get(`/api/exam/viva/current?assignmentId=${assignment.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.pending).toBe(true);
      expect(pendingRes.body.vivaId).toBeDefined();

      const vivaId = pendingRes.body.vivaId;

      // Submit valid answer within time
      const answerRes = await request(app)
        .post('/api/exam/viva/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          vivaId,
          answer: 'I used scanf with %d format specifiers and validated the return value equals 2 to verify two integers were read.',
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.success).toBe(true);
      expect(answerRes.body.submittedBeforeTimeout).toBe(true);
      expect(answerRes.body.relevanceScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe('2. Integrated Mini-Project Framework (Sections 35–39)', () => {
    it('should keep mini-project INACTIVE by default and deny student access (Section 36)', async () => {
      const res = await request(app)
        .get(`/api/mini-project/${miniProject.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MINI_PROJECT_INACTIVE');
    });

    it('should strictly prohibit bulk activation per Section 38', async () => {
      const res = await request(app)
        .post('/api/mini-project/activate-individual')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          miniProjectId: miniProject.id,
          studentId: [studentUser.id], // Array attempting bulk activation
          sectionId: section.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SECTION_38_VIOLATION');
      expect(res.body.message).toContain('Bulk activation is strictly prohibited');
    });

    it('should activate an individual student and permit secure access (Sections 37 & 39)', async () => {
      // 1. Faculty activates single student individually
      const activateRes = await request(app)
        .post('/api/mini-project/activate-individual')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          miniProjectId: miniProject.id,
          studentId: studentUser.id, // Single individual string ID
          sectionId: section.id,
          activationReason: 'Student successfully solved Module 1 sections with high competency.',
        });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.success).toBe(true);
      expect(activateRes.body.access.status).toBe('ACTIVE');
      expect(activateRes.body.access.activatedById).toBe(facultyUser.id);

      // 2. Student now fetches active project
      const studentRes = await request(app)
        .get(`/api/mini-project/${miniProject.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentRes.status).toBe(200);
      expect(studentRes.body.success).toBe(true);
      expect(studentRes.body.project.title).toContain('Integrated Inventory System');
    });

    it('should submit mini-project and evaluate 20-mark rubric (Section 35)', async () => {
      const validMiniProjectCode = `
#include <stdio.h>
#include <string.h>

struct Item {
    int id;
    char name[32];
};

void printItem(struct Item *it) {
    if (it != NULL) {
        printf("ID: %d Name: %s\\n", it->id, it->name);
    }
}

int main() {
    struct Item store[5];
    store[0].id = 101;
    strcpy(store[0].name, "LogicQ Core");
    printItem(&store[0]);
    return 0;
}
`;

      const submitRes = await request(app)
        .post('/api/mini-project/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          miniProjectId: miniProject.id,
          code: validMiniProjectCode,
          clientMetrics: {
            copyPasteAttempts: 0,
            tabSwitchCount: 0,
          },
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.academicScore).toBe(20); // 4 rubric components x 5 marks = 20 total
      expect(submitRes.body.maxMarks).toBe(20);
      expect(submitRes.body.rubricScores.section1).toBe(5);
      expect(submitRes.body.rubricScores.section2).toBe(5);
      expect(submitRes.body.rubricScores.section3).toBe(5);
      expect(submitRes.body.rubricScores.section4).toBe(5);
      expect(submitRes.body.status).toBe('SUBMITTED');
    });
  });
});
