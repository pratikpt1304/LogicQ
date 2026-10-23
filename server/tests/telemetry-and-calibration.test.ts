import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { TelemetryCalibrationService } from '../src/services/telemetry-calibration.service.js';

describe('Phase 3: Silent Telemetry Ingestion, Separation & Statistical Calibration', () => {
  let facultyUser: any;
  let studentA: any;
  let studentB: any;
  let otherStudent: any;

  let facultyToken: string;
  let studentAToken: string;
  let studentBToken: string;
  let otherStudentToken: string;

  let section: any;
  let testRecord: any;
  let problem: any;
  let assignmentA: any;
  let assignmentB: any;
  let attemptA: any;
  let attemptB: any;

  beforeAll(async () => {
    const ts = Date.now().toString().slice(-6);

    // 1. Create Faculty User
    facultyUser = await prisma.user.create({
      data: {
        email: `faculty_phase3_${ts}@sanjivani.edu.in`,
        username: `fac_phase3_${ts}`,
        fullName: 'Prof. Telemetry Auditor',
        passwordHash: 'dummy_hash',
        role: 'FACULTY',
        accountState: 'ACTIVE',
      },
    });

    // 2. Create Students
    studentA = await prisma.user.create({
      data: {
        email: `student_clean_${ts}@sanjivani.edu.in`,
        username: `stud_clean_${ts}`,
        fullName: 'Student A (Clean Baseline)',
        passwordHash: 'dummy_hash',
        prn: `PRN-CLN-${ts}`,
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    studentB = await prisma.user.create({
      data: {
        email: `student_noisy_${ts}@sanjivani.edu.in`,
        username: `stud_noisy_${ts}`,
        fullName: 'Student B (Noisy Events)',
        passwordHash: 'dummy_hash',
        prn: `PRN-NSY-${ts}`,
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        email: `student_other_${ts}@sanjivani.edu.in`,
        username: `stud_other_${ts}`,
        fullName: 'Other Student',
        passwordHash: 'dummy_hash',
        prn: `PRN-OTH-${ts}`,
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    // Generate JWT tokens
    facultyToken = generateAccessToken({ userId: facultyUser.id, username: facultyUser.username, role: 'FACULTY' });
    studentAToken = generateAccessToken({ userId: studentA.id, username: studentA.username, role: 'STUDENT' });
    studentBToken = generateAccessToken({ userId: studentB.id, username: studentB.username, role: 'STUDENT' });
    otherStudentToken = generateAccessToken({ userId: otherStudent.id, username: otherStudent.username, role: 'STUDENT' });

    // 3. Create Section
    section = await prisma.section.create({
      data: {
        institution: 'Sanjivani College of Engineering',
        course: 'B.Tech CSE',
        subject: 'C Programming',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        sectionName: 'Div C - Telemetry Lab',
        facultyId: facultyUser.id,
        joinCode: `LQ-T${Date.now().toString().slice(-4)}`,
        joinToken: `TOKEN-T-${Date.now()}`,
      },
    });

    // 4. Create Problem with 2 visible test cases and 1 hidden test case
    problem = await prisma.problem.create({
      data: {
        title: 'Phase 3 Telemetry Calibration Problem',
        slug: `phase3-telemetry-prob-${ts}`,
        module: 'Module 1',
        section: 'Control Structures',
        topic: 'Conditionals',
        difficulty: 'EASY',
        tags: '["C", "Conditionals"]',
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
        solutionCode: '#include <stdio.h>\nint main() { int n; if (scanf("%d", &n) == 1) printf("%d\\n", n * 2); return 0; }\n',
        expectedTimeMin: 2,
        expectedTimeMax: 10,
        description: 'Print Double the Input Integer.',
        validationStatus: 'VALIDATION_PASSED',
        testCases: {
          create: [
            { input: '5', expectedOutput: '10', isHidden: false, orderIndex: 1 },
            { input: '8', expectedOutput: '16', isHidden: false, orderIndex: 2 },
            { input: '25', expectedOutput: '50', isHidden: true, orderIndex: 3 },
          ],
        },
      },
    });

    // 5. Create Assessment Test
    testRecord = await prisma.assessmentTest.create({
      data: {
        title: 'Phase 3 Midterm Exam',
        sectionId: section.id,
        moduleId: 'Module 1',
        durationMinutes: 60,
        questionCount: 1,
        easyRatio: 100,
        mediumRatio: 0,
        hardRatio: 0,
        status: 'PUBLISHED',
        createdById: facultyUser.id,
        questions: {
          create: [{ problemId: problem.id, orderIndex: 1, marks: 1 }],
        },
      },
    });

    // 6. Assign Test to Students A and B
    assignmentA = await prisma.assessmentTestAssignment.create({
      data: {
        testId: testRecord.id,
        studentId: studentA.id,
        status: 'ASSIGNED',
        academicScore: 0,
      },
    });

    assignmentB = await prisma.assessmentTestAssignment.create({
      data: {
        testId: testRecord.id,
        studentId: studentB.id,
        status: 'ASSIGNED',
        academicScore: 0,
      },
    });
  });

  afterAll(async () => {
    if (assignmentA) {
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignmentA.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignmentA.id } });
    }
    if (assignmentB) {
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignmentB.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignmentB.id } });
    }
    if (testRecord) {
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: testRecord.id } });
      await prisma.assessmentTest.deleteMany({ where: { id: testRecord.id } });
    }
    if (problem) {
      await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
      await prisma.problem.deleteMany({ where: { id: problem.id } });
    }
    if (section) {
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
    if (studentA) await prisma.user.deleteMany({ where: { id: studentA.id } });
    if (studentB) await prisma.user.deleteMany({ where: { id: studentB.id } });
    if (otherStudent) await prisma.user.deleteMany({ where: { id: otherStudent.id } });
    if (facultyUser) await prisma.user.deleteMany({ where: { id: facultyUser.id } });
  });

  describe('1. Non-Intrusive Telemetry Heartbeat Ingestion (POST /api/exam/telemetry)', () => {
    it('should initialize question attempts for students', async () => {
      const resA = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({ assignmentId: assignmentA.id, problemId: problem.id });

      expect(resA.status).toBe(200);
      expect(resA.body.attemptId).toBeDefined();
      attemptA = resA.body.attemptId;

      const resB = await request(app)
        .post('/api/exam/start-question')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({ assignmentId: assignmentB.id, problemId: problem.id });

      expect(resB.status).toBe(200);
      expect(resB.body.attemptId).toBeDefined();
      attemptB = resB.body.attemptId;
    });

    it('should successfully record non-blocking telemetry heartbeats for student B', async () => {
      const telemetryRes = await request(app)
        .post('/api/exam/telemetry')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          attemptId: attemptB,
          clientMetrics: {
            tabSwitchCount: 3,
            focusLossCount: 4,
            totalFocusLossDurationMs: 12500,
            fullScreenExitCount: 2,
            copyPasteAttempts: 1,
            totalKeystrokes: 150,
            largestBurstChars: 45,
            activeInteractionTimeSec: 60,
          },
        });

      expect(telemetryRes.status).toBe(200);
      expect(telemetryRes.body.success).toBe(true);

      // Verify database updated with factual counts
      const updated = await prisma.assessmentQuestionAttempt.findUnique({
        where: { id: attemptB },
      });
      expect(updated?.tabSwitchCount).toBe(3);
      expect(updated?.focusLossCount).toBe(4);
      expect(updated?.totalFocusLossDurationMs).toBe(12500);
      expect(updated?.fullScreenExitCount).toBe(2);
      expect(updated?.copyPasteAttempts).toBe(1);
      expect(updated?.totalKeystrokes).toBe(150);
    });

    it('should prevent unauthorized students from tampering with telemetry of another attempt', async () => {
      const tamperRes = await request(app)
        .post('/api/exam/telemetry')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          attemptId: attemptA,
          clientMetrics: { tabSwitchCount: 99 },
        });

      expect(tamperRes.status).toBe(400);
      expect(tamperRes.body.success).toBe(false);
      expect(tamperRes.body.message).toContain('Unauthorized');
    });
  });

  describe('2. Telemetry Isolation & Zero-Penalty Academic Invariant (Section 59 & Decision 4)', () => {
    const validCode = `#include <stdio.h>\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) printf("%d\\n", n * 2);\n    return 0;\n}\n`;

    it('should award identical 1.0 marks to clean Student A and noisy Student B', async () => {
      // 1. Submit clean solution for Student A (0 telemetry events)
      const resA = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          attemptId: attemptA,
          code: validCode,
          clientMetrics: {
            tabSwitchCount: 0,
            fullScreenExitCount: 0,
            copyPasteAttempts: 0,
            activeInteractionTimeSec: 45,
          },
        });

      expect(resA.status).toBe(200);
      expect(resA.body.verdict).toBe('ACCEPTED');
      expect(resA.body.academicScore).toBe(1.0);
      expect(resA.body.isLocked).toBe(true);

      // 2. Submit solution for Student B (multiple telemetry events)
      const resB = await request(app)
        .post('/api/exam/submit-question')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          attemptId: attemptB,
          code: validCode,
          clientMetrics: {
            tabSwitchCount: 3,
            fullScreenExitCount: 2,
            copyPasteAttempts: 1,
            activeInteractionTimeSec: 65,
          },
        });

      expect(resB.status).toBe(200);
      expect(resB.body.verdict).toBe('ACCEPTED');
      expect(resB.body.academicScore).toBe(1.0); // ZERO automated mark deduction!
      expect(resB.body.isLocked).toBe(true);

      // Invariant Check: Academic Score A === Academic Score B
      expect(resA.body.academicScore).toEqual(resB.body.academicScore);
    });

    it('should reject further telemetry updates once attempt is locked', async () => {
      const postLockRes = await request(app)
        .post('/api/exam/telemetry')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          attemptId: attemptA,
          clientMetrics: { tabSwitchCount: 10 },
        });

      expect(postLockRes.status).toBe(200);
      expect(postLockRes.body.isLocked).toBe(true);

      // Check DB record was not mutated
      const lockedAttempt = await prisma.assessmentQuestionAttempt.findUnique({
        where: { id: attemptA },
      });
      expect(lockedAttempt?.tabSwitchCount).toBe(0);
    });
  });

  describe('3. Telemetry Calibration & Baseline Noise Floor (Phase 3 Calibration Service)', () => {
    it('should compute percentiles and baseline noise floor for cohort', async () => {
      const calibration = await TelemetryCalibrationService.calibrateTestTelemetry(testRecord.id);

      expect(calibration).toBeDefined();
      expect(calibration.totalAttemptsAnalyzed).toBeGreaterThanOrEqual(2);
      expect(calibration.activeStudentsCount).toBeGreaterThanOrEqual(2);
      expect(calibration.baselineNoiseFloor).toBeDefined();
      expect(calibration.metrics.tabSwitches.p50).toBeDefined();
      expect(calibration.calibratedThresholds.tabSwitches.normalMax).toBeGreaterThanOrEqual(1);
      expect(calibration.policyRecommendation.advisoryOnly).toBe(true);
      expect(calibration.policyRecommendation.automatedPenaltyEnabled).toBe(false);
    });

    it('should allow Faculty to retrieve calibration report via API', async () => {
      const res = await request(app)
        .get(`/api/analytics/faculty/calibration/${testRecord.id}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calibratedThresholds).toBeDefined();
      expect(res.body.data.policyRecommendation.automatedPenaltyEnabled).toBe(false);
    });

    it('should forbid student role from accessing calibration data', async () => {
      const res = await request(app)
        .get(`/api/analytics/faculty/calibration/${testRecord.id}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(403);
    });
  });
});
