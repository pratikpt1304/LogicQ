import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Phase 5: Student Learning Analytics, Dual-Score Separation, Faculty Intelligence & Reports', () => {
  const ts = Date.now().toString().slice(-4);
  let facultyUser: any;
  let facultyToken: string;
  let studentUser: any;
  let studentToken: string;
  let section: any;
  let problem1: any;
  let testRecord: any;
  let assignment: any;
  let attempt: any;
  let miniProject: any;

  beforeAll(async () => {
    // 1. Setup Faculty
    facultyUser = await prisma.user.upsert({
      where: { email: `faculty_p5_${ts}@sanjivani.edu.in` },
      update: { role: 'ADMIN' },
      create: {
        email: `faculty_p5_${ts}@sanjivani.edu.in`,
        username: `fac_p5_${ts}`,
        fullName: 'Prof. Analytics Dean',
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
        email: `student_p5_${ts}@sanjivani.edu.in`,
        prn: `2026P5${ts}1`,
        mobile: `9876${ts}55`,
        username: `stud_p5_${ts}`,
        fullName: 'Phase 5 Candidate',
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
        department: 'AIML',
        year: 'FY',
        division: 'A1',
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
        sectionName: `P5-AnalyticsSec-${ts}`,
        facultyId: facultyUser.id,
        joinCode: `ANL-${ts}`,
        joinToken: `token-anl-${ts}-${Date.now()}`,
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

    // 4. Create Problem
    problem1 = await prisma.problem.create({
      data: {
        title: `Analytics Test Problem ${ts}`,
        slug: `anl-prob-${ts}`,
        module: 'Module 1 - C Basics',
        section: 'Section 1',
        topic: 'Arrays and Sorting',
        scenario: 'Analyze numerical trends.',
        description: 'Read integers and evaluate.',
        starterCode: '#include <stdio.h>\nint main() { return 0; }\n',
        solutionCode: '#include <stdio.h>\nint main() { return 0; }\n',
        difficulty: 'EASY',
        tags: '["C", "Basics"]',
        expectedTimeMin: 2,
        expectedTimeMax: 8,
      },
    });

    // 5. Create Test Record
    testRecord = await prisma.assessmentTest.create({
      data: {
        title: `Comprehensive Module 1 Assessment ${ts}`,
        instructions: 'Test evaluating student analytics.',
        moduleId: 'Module 1 - C Basics',
        sectionId: section.id,
        createdById: facultyUser.id,
        status: 'PUBLISHED',
        questionCount: 1,
        questions: {
          create: [{ problemId: problem1.id, orderIndex: 1 }],
        },
      },
    });

    // 6. Create Assignment & Attempt with Telemetry
    assignment = await prisma.assessmentTestAssignment.create({
      data: {
        testId: testRecord.id,
        studentId: studentUser.id,
        status: 'SUBMITTED',
        academicScore: 1.0,
        integrityScore: 15,
        integrityRisk: 'NORMAL',
      },
    });

    attempt = await prisma.assessmentQuestionAttempt.create({
      data: {
        assignmentId: assignment.id,
        problemId: problem1.id,
        questionVariantId: `VAR-ANL-${ts}`,
        startedAt: new Date(Date.now() - 300000), // 5 min ago
        submittedAt: new Date(),
        isLocked: true,
        academicScore: 1.0,
        actualTimeTakenSec: 300,
        expectedRefTimeSec: 300,
        timeDeviationSec: 0,
        deviationPercent: 0,
        verdict: 'ACCEPTED',
        submittedCode: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }\n',
        copyPasteAttempts: 1,
        tabSwitchCount: 0,
        totalKeystrokes: 120,
        integrityScore: 15,
        integrityRisk: 'NORMAL',
      },
    });

    // 7. Mini Project Access
    miniProject = await prisma.miniProject.create({
      data: {
        moduleId: 'Module 1 - C Basics',
        title: `Analytics Mini-Project ${ts}`,
        scenario: 'Scenario for analytics.',
        requirements: 'Requirements.',
        rubricJson: JSON.stringify([{ competency: 'S1', maxMarks: 5 }]),
      },
    });

    await prisma.studentMiniProjectAccess.create({
      data: {
        miniProjectId: miniProject.id,
        studentId: studentUser.id,
        sectionId: section.id,
        status: 'SUBMITTED',
        academicScore: 18,
        integrityScore: 10,
        activatedById: facultyUser.id,
      },
    });
  });

  afterAll(async () => {
    if (miniProject) {
      await prisma.studentMiniProjectAccess.deleteMany({ where: { miniProjectId: miniProject.id } });
      await prisma.miniProject.deleteMany({ where: { id: miniProject.id } });
    }
    if (assignment) {
      await prisma.assessmentQuestionAttempt.deleteMany({ where: { assignmentId: assignment.id } });
      await prisma.assessmentTestAssignment.deleteMany({ where: { id: assignment.id } });
    }
    if (testRecord) {
      await prisma.assessmentTestQuestion.deleteMany({ where: { testId: testRecord.id } });
      await prisma.assessmentTest.deleteMany({ where: { id: testRecord.id } });
    }
    if (problem1) await prisma.problem.deleteMany({ where: { id: problem1.id } });
    if (section) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: section.id } });
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
    if (studentUser) await prisma.user.deleteMany({ where: { id: studentUser.id } });
    if (facultyUser) await prisma.user.deleteMany({ where: { id: facultyUser.id } });
  });

  describe('1. Dual-Score Independence & Student Dashboard (Sections 40, 41, 45, 59)', () => {
    it('should return Academic Score (X/100) and Integrity Score (Y/100) strictly separate', async () => {
      const res = await request(app)
        .get('/api/analytics/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      // Section 59 invariant: Academic Score (19 = 1 from question + 18 from mini-project)
      expect(data.academicScore).toBe(19);
      expect(data.maxAcademicScore).toBe(100);

      // Integrity Score is kept separate
      expect(data.integrityScore).toBe(15);
      expect(data.integrityRisk).toBe('NORMAL');

      // Telemetry breakdown (Section 45)
      expect(data.telemetry.totalClipboardAttempts).toBe(1);
      expect(data.telemetry.totalKeystrokes).toBe(120);

      // AI Learner Insights (Section 42-44)
      expect(data.learnerClassification).toBeDefined();
      expect(data.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('2. Student Official Report Generation (Section 47: Part A + Part B)', () => {
    it('should generate official audit data with Part A Solutions and Part B Telemetry', async () => {
      const res = await request(app)
        .get(`/api/analytics/student/report/${testRecord.id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.report;
      expect(report.institution).toBe('Sanjivani University');
      expect(report.student.fullName).toBe('Phase 5 Candidate');
      expect(report.student.prn).toContain('2026P5');

      // Part A: Submitted Solutions
      expect(report.partA_Solutions).toHaveLength(1);
      expect(report.partA_Solutions[0].submittedCode).toContain('printf');
      expect(report.partA_Solutions[0].academicScore).toBe(1.0);

      // Part B: Integrity & Behavioral Audit
      expect(report.partB_IntegrityAudit).toHaveLength(1);
      expect(report.partB_IntegrityAudit[0].variantId).toContain('VAR-ANL');
      expect(report.partB_IntegrityAudit[0].copyPasteAttempts).toBe(1);
      expect(report.partB_IntegrityAudit[0].totalKeystrokes).toBe(120);
    });
  });

  describe('3. Faculty Analytics Overview & Question Intelligence (Sections 48–51, 56)', () => {
    it('should return top cards, section rosters, and question quality intelligence', async () => {
      const res = await request(app)
        .get('/api/analytics/faculty/overview')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cards = res.body.data.topCards;
      expect(cards.totalSections).toBeGreaterThanOrEqual(1);
      expect(cards.totalStudents).toBeGreaterThanOrEqual(1);
      expect(cards.avgAcademicScore).toBeGreaterThanOrEqual(0);
      expect(cards.avgIntegrityScore).toBeGreaterThanOrEqual(0);

      // Verify sections listed
      expect(res.body.data.sections.length).toBeGreaterThan(0);
    });

    it('should allow faculty deep dive into student question telemetry (Section 52 & 53)', async () => {
      const res = await request(app)
        .get(`/api/analytics/faculty/student-deep-dive/${studentUser.id}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.fullName).toBe('Phase 5 Candidate');
      expect(res.body.data.assignments[0].attempts).toHaveLength(1);
    });

    it('should generate Section CSV export with student audit scores (Section 55)', async () => {
      const res = await request(app)
        .get(`/api/analytics/faculty/export/csv/${section.id}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('PRN,Student Name,Email');
      expect(res.text).toContain(studentUser.fullName);
      expect(res.text).toContain(studentUser.prn);
    });
  });
});
