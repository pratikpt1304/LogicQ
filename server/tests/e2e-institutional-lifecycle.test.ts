import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { OtpService } from '../src/services/otp.service.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Section 66: End-to-End Institutional Platform Lifecycle Verification', () => {
  const ts = Date.now().toString().slice(-4);
  let facultyUser: any;
  let facultyToken: string;
  let studentUser: any;
  let studentToken: string;
  let createdSection: any;
  let problem1: any;
  let problem2: any;
  let testRecord: any;
  let assignment: any;
  let attempt1: any;
  let attempt2: any;
  let miniProject: any;

  beforeAll(async () => {
    // 1. Create faculty account
    facultyUser = await prisma.user.upsert({
      where: { email: `lifecycle_fac_${ts}@sanjivani.edu.in` },
      update: { role: 'ADMIN' },
      create: {
        email: `lifecycle_fac_${ts}@sanjivani.edu.in`,
        username: `lifefac_${ts}`,
        fullName: 'Prof. Lifecycle Chair',
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
  });

  afterAll(async () => {
    if (miniProject) {
      await prisma.studentMiniProjectAccess.deleteMany({ where: { miniProjectId: miniProject.id } }).catch(() => {});
      await prisma.miniProject.deleteMany({ where: { id: miniProject.id } }).catch(() => {});
    }
    if (assignment) {
      await prisma.assessmentVivaQuestion.deleteMany({ where: { assignmentId: assignment.id } }).catch(() => {});
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignment.id } }).catch(() => {});
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignment.id } }).catch(() => {});
    }
    if (testRecord) {
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: testRecord.id } }).catch(() => {});
      await prisma.assessmentTest.deleteMany({ where: { id: testRecord.id } }).catch(() => {});
    }
    if (problem1) {
      await prisma.testCase.deleteMany({ where: { problemId: problem1.id } }).catch(() => {});
      await prisma.problem.deleteMany({ where: { id: problem1.id } }).catch(() => {});
    }
    if (problem2) {
      await prisma.testCase.deleteMany({ where: { problemId: problem2.id } }).catch(() => {});
      await prisma.problem.deleteMany({ where: { id: problem2.id } }).catch(() => {});
    }
    if (createdSection) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: createdSection.id } }).catch(() => {});
      await prisma.section.deleteMany({ where: { id: createdSection.id } }).catch(() => {});
    }
    if (studentUser) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } }).catch(() => {});
      await prisma.prnIndex.deleteMany({ where: { prn: studentUser.prn } }).catch(() => {});
    }
    if (facultyUser) {
      await prisma.user.deleteMany({ where: { id: facultyUser.id } }).catch(() => {});
    }
  });

  // Step 1: Student Onboarding & Identity Verification (Sections 8–10)
  it('Step 1: Student Onboarding & Dual OTP Verification (Sections 8–10)', async () => {
    const studentEmail = `candidate_${ts}@sanjivani.edu.in`;
    const studentMobile = `9123${ts}77`;
    const studentPrn = `2026E2E${ts}`;

    // 1a. Request & verify Email OTP
    const emailRes = await OtpService.sendEmailOtp(studentEmail, studentPrn);
    expect(emailRes.success).toBe(true);
    expect(emailRes.code).toBeDefined();

    const verifyEmailRes = await OtpService.verifyEmailOtp(studentEmail, emailRes.code!, studentPrn);
    expect(verifyEmailRes.success).toBe(true);

    // 1b. Request & verify Mobile OTP
    const mobileRes = await OtpService.sendMobileOtp(studentMobile, studentPrn);
    expect(mobileRes.success).toBe(true);
    expect(mobileRes.code).toBeDefined();

    const verifyMobileRes = await OtpService.verifyMobileOtp(studentMobile, mobileRes.code!, studentPrn);
    expect(verifyMobileRes.success).toBe(true);

    // 1c. Create verified student account
    studentUser = await prisma.user.create({
      data: {
        email: studentEmail,
        prn: studentPrn,
        mobile: studentMobile,
        username: `cand_${ts}`,
        fullName: 'Lifecycle E2E Candidate',
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
        department: 'AIML',
        year: 'FY',
        division: 'A',
      },
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      username: studentUser.username,
      role: 'STUDENT',
    });

    expect(studentUser.id).toBeDefined();
    expect(studentUser.prn).toBe(studentPrn);
  });

  // Step 2: Faculty Section Creation & Instant Join (Sections 11–13)
  it('Step 2: Section Creation & Roster Enrollment (Sections 11–13)', async () => {
    // Faculty creates section
    const secRes = await request(app)
      .post('/api/sections')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        institution: 'Sanjivani University',
        course: 'B.Tech AIML',
        subject: 'C Programming & Logic',
        academicYear: '2026-27',
        semester: 'Semester 1',
        sectionName: `E2E-AIML-${ts}`,
        description: 'Institutional Verification Cohort',
      });

    expect(secRes.status).toBe(201);
    createdSection = secRes.body.data;
    expect(createdSection.joinToken).toBeDefined();

    // Student joins section using instant join form
    const joinRes = await request(app)
      .post('/api/sections/instant-join')
      .send({
        joinToken: createdSection.joinToken,
        name: studentUser.fullName,
        prn: studentUser.prn,
        email: studentUser.email,
        mobile: studentUser.mobile,
      });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.data.enrolled).toBe(true);
  });

  // Step 3: Question Creation & Correctness Validation (Sections 16–18)
  it('Step 3: Question Creation & 3-Test Case Validation (Sections 16–18)', async () => {
    // Problem 1: Even or Odd
    problem1 = await prisma.problem.create({
      data: {
        title: `Check Even or Odd ${ts}`,
        slug: `check-even-odd-${ts}`,
        module: 'control-structures',
        section: 'branching',
        topic: 'Conditionals',
        difficulty: 'EASY',
        expectedTimeMin: 2,
        expectedTimeMax: 8,
        description: 'Read an integer and print EVEN or ODD.',
        starterCode: '#include <stdio.h>\nint main() {\n    // your code\n    return 0;\n}',
        solutionCode: '#include <stdio.h>\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    if (n % 2 == 0) printf("EVEN\\n");\n    else printf("ODD\\n");\n    return 0;\n}',
        status: 'PUBLISHED',
        tags: '["C", "Basics"]',
        testCases: {
          create: [
            { input: '4', expectedOutput: 'EVEN', isHidden: false, orderIndex: 1 },
            { input: '7', expectedOutput: 'ODD', isHidden: false, orderIndex: 2 },
            { input: '100', expectedOutput: 'EVEN', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    // Problem 2: Addition
    problem2 = await prisma.problem.create({
      data: {
        title: `Sum Two Numbers ${ts}`,
        slug: `sum-two-nums-${ts}`,
        module: 'control-structures',
        section: 'arithmetic',
        topic: 'Variables and Arithmetic',
        difficulty: 'EASY',
        expectedTimeMin: 2,
        expectedTimeMax: 8,
        description: 'Read two integers and print sum.',
        starterCode: '#include <stdio.h>\nint main() { return 0; }',
        solutionCode: '#include <stdio.h>\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}',
        status: 'PUBLISHED',
        tags: '["C", "Arithmetic"]',
        testCases: {
          create: [
            { input: '5 5', expectedOutput: '10', isHidden: false, orderIndex: 1 },
            { input: '1 2', expectedOutput: '3', isHidden: false, orderIndex: 2 },
            { input: '50 50', expectedOutput: '100', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    expect(problem1.id).toBeDefined();
    expect(problem2.id).toBeDefined();
  });

  // Step 4: Test Creation & Assignment (Sections 14–15)
  it('Step 4: Test Creation & Section Assignment (Sections 14–15)', async () => {
    testRecord = await prisma.assessmentTest.create({
      data: {
        title: `Mid-Semester Assessment ${ts}`,
        instructions: 'Solve within time limits. Zero copying allowed.',
        moduleId: 'control-structures',
        sectionId: createdSection.id,
        createdById: facultyUser.id,
        status: 'PUBLISHED',
        questionCount: 2,
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
        successiveCorrectCount: 0,
      },
    });

    expect(assignment.id).toBeDefined();
  });

  // Step 5: Assessment Execution, Time Scoring & Zero-Reattempt Lock (Sections 5, 19–28, 34)
  it('Step 5: Assessment Solving, Time-Scoring & Zero-Reattempt Locking (Sections 5, 19–28, 34)', async () => {
    // 5a. Start Question 1 (Anti-sharing variant assigned, hidden test omitted)
    const startRes = await request(app)
      .post('/api/exam/start-question')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ assignmentId: assignment.id, problemId: problem1.id });

    expect(startRes.status).toBe(200);
    expect(startRes.body.attemptId).toBeDefined();
    expect(startRes.body.questionVariantId).toMatch(/^VAR-/);
    expect(startRes.body.problem.visibleTestCases.length).toBe(2);
    expect(startRes.body.problem.visibleTestCases.every((tc: any) => !tc.isHidden)).toBe(true);

    attempt1 = startRes.body;

    // 5b. Interactive Run on visible test cases only
    const runRes = await request(app)
      .post('/api/exam/run-code')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId: attempt1.attemptId,
        code: problem1.solutionCode,
      });

    expect(runRes.status).toBe(200);
    expect(runRes.body.success).toBe(true);
    expect(runRes.body.testResults).toHaveLength(2);
    expect(runRes.body.testResults[0].passed).toBe(true);

    // 5c. Submit Question 1 (Award 1.0 full mark and permanently lock)
    const submitRes = await request(app)
      .post('/api/exam/submit-question')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId: attempt1.attemptId,
        code: problem1.solutionCode,
        clientMetrics: {
          copyPasteAttempts: 0,
          tabSwitchCount: 0,
          totalFocusLossDurationMs: 0,
          largestBurstChars: 10,
          totalKeystrokes: 110,
        },
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.verdict).toBe('ACCEPTED');
    expect(submitRes.body.academicScore).toBe(1.0);
    expect(submitRes.body.isLocked).toBe(true);

    // 5d. Section 7 Invariant: Attempting to resubmit locked question is rejected
    const reattemptRes = await request(app)
      .post('/api/exam/submit-question')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId: attempt1.attemptId,
        code: problem1.solutionCode,
      });

    expect(reattemptRes.status).toBe(403);
    expect(reattemptRes.body.code).toBe('QUESTION_LOCKED');
  });

  // Step 6: AI Viva Verification on 2nd Successive Submission (Sections 29–33)
  it('Step 6: AI Viva Voce Engine on 2nd Successive Correct Solve (Sections 29–33)', async () => {
    // Start Question 2
    const start2Res = await request(app)
      .post('/api/exam/start-question')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ assignmentId: assignment.id, problemId: problem2.id });

    expect(start2Res.status).toBe(200);
    attempt2 = start2Res.body;

    // Submit Question 2 (triggers AI viva on 2nd consecutive correct solve)
    const submit2Res = await request(app)
      .post('/api/exam/submit-question')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId: attempt2.attemptId,
        code: problem2.solutionCode,
        clientMetrics: {
          copyPasteAttempts: 0,
          tabSwitchCount: 0,
          totalFocusLossDurationMs: 0,
          largestBurstChars: 8,
          totalKeystrokes: 95,
        },
      });

    expect(submit2Res.status).toBe(200);
    expect(submit2Res.body.verdict).toBe('ACCEPTED');
    expect(submit2Res.body.vivaTriggered).toBe(true);
    expect(submit2Res.body.vivaId).toBeDefined();

    // Student submits viva answer within 60-second window
    const vivaAnswerRes = await request(app)
      .post('/api/exam/viva/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        vivaId: submit2Res.body.vivaId,
        answer: 'The program reads two integers using scanf and prints their sum using the addition operator.',
      });

    expect(vivaAnswerRes.status).toBe(200);
    expect(vivaAnswerRes.body.success).toBe(true);
    expect(vivaAnswerRes.body.submittedBeforeTimeout).toBe(true);
  });

  // Step 7: Dual-Score Dashboard & AI Gap Analysis (Sections 40–45, 59)
  it('Step 7: Dual-Score Separation (X/100 vs Y/100) & AI Gap Analysis (Sections 40–45, 59)', async () => {
    const dashRes = await request(app)
      .get('/api/analytics/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(dashRes.status).toBe(200);
    const data = dashRes.body.data;

    // Academic Score and Integrity Score must be independent (Section 59)
    expect(data.academicScore).toBeGreaterThanOrEqual(1.0);
    expect(data.integrityScore).toBeDefined();
    expect(data.integrityRisk).toBe('NORMAL');
    expect(data.learnerClassification).toBeDefined();
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  // Step 8: Faculty Intervention & Individual Mini-Project Activation (Sections 35–39, 64)
  it('Step 8: Individual Mini-Project Activation & Rubric Evaluation (Sections 35–39, 64)', async () => {
    // 8a. Create integrated mini-project (20 marks)
    miniProject = await prisma.miniProject.create({
      data: {
        moduleId: 'control-structures',
        title: `Integrated C System ${ts}`,
        scenario: 'Develop a modular student data parser with arithmetic logic.',
        requirements: 'Implement modular functions for data ingestion and score summation.',
        rubricJson: JSON.stringify([
          { competency: 'Section 1 (Control Structures)', maxMarks: 5 },
          { competency: 'Section 2 (Arrays & Structs)', maxMarks: 5 },
          { competency: 'Section 3 (Functions & Pointers)', maxMarks: 5 },
          { competency: 'Section 4 (System Integration)', maxMarks: 5 },
        ]),
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
      },
    });

    // 8b. Student cannot access inactive mini-project by default (Section 36 & 37)
    const unauthAccess = await request(app)
      .get(`/api/mini-project/${miniProject.id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(unauthAccess.status).toBe(403);
    expect(unauthAccess.body.code).toBe('MINI_PROJECT_INACTIVE');

    // 8c. Faculty individually activates mini-project for candidate (Section 37 & 38)
    const activateRes = await request(app)
      .post('/api/mini-project/activate-individual')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        studentId: studentUser.id,
        miniProjectId: miniProject.id,
        sectionId: createdSection.id,
        activationReason: 'Candidate completed all section questions with high integrity',
      });
    expect(activateRes.status).toBe(200);

    // 8d. Student submits mini-project solution
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
    const mpSubmitRes = await request(app)
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

    expect(mpSubmitRes.status).toBe(200);
    expect(mpSubmitRes.body.success).toBe(true);
    expect(mpSubmitRes.body.academicScore).toBe(20);
  });

  // Step 9: Module Completion, Quality Intelligence & Report Generation (Sections 46–47, 52–56, 60–63)
  it('Step 9: Official Two-Part Report, Quality Intelligence & CSV Export (Sections 46–47, 52–56, 60–63)', async () => {
    // 9a. Student official two-part audit report (Part A & Part B)
    const reportRes = await request(app)
      .get(`/api/analytics/student/report/${testRecord.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.report.summary.academicScore).toBeGreaterThanOrEqual(1.0);
    expect(reportRes.body.report.summary.integrityScore).toBeDefined();
    expect(reportRes.body.report.partA_Solutions.length).toBeGreaterThanOrEqual(1);
    expect(reportRes.body.report.partB_IntegrityAudit.length).toBeGreaterThanOrEqual(1);

    // 9b. Faculty Overview & Question Quality Intelligence (Section 56)
    const facOverviewRes = await request(app)
      .get('/api/analytics/faculty/overview')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(facOverviewRes.status).toBe(200);
    expect(facOverviewRes.body.data.topCards.totalSections).toBeGreaterThanOrEqual(1);

    // 9c. Faculty Student Deep Dive (Section 52 & 53)
    const deepDiveRes = await request(app)
      .get(`/api/analytics/faculty/student-deep-dive/${studentUser.id}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(deepDiveRes.status).toBe(200);
    expect(deepDiveRes.body.data.student.id).toBe(studentUser.id);
    expect(deepDiveRes.body.data.assignments.length).toBeGreaterThanOrEqual(1);

    // 9d. Section Roster CSV Export (Section 62 & 63)
    const csvRes = await request(app)
      .get(`/api/analytics/faculty/export/csv/${createdSection.id}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Academic Score');
    expect(csvRes.text).toContain('Integrity Score');
  });
});
