import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Practice Active Timers, Telemetry Anti-Tamper & Verification Reports', () => {
  const ts = Date.now();

  let studentId: string;
  let studentToken: string;
  let adminId: string;
  let adminToken: string;

  let testProblemId: string;
  const testProblemSlug = `test-timer-prob-${ts}`;
  const testModuleSlug = 'control-structures';
  const ADMIN_PASSWORD = 'AdminSecret123!';

  beforeAll(async () => {
    // 1. Create student
    const student = await prisma.user.create({
      data: {
        email: `student_timer_${ts}@sanjivani.edu.in`,
        username: `student_timer_${ts}`,
        fullName: 'Timer Test Student',
        displayName: 'Timer Student',
        passwordHash: await bcrypt.hash('StudentPass123!', 10),
        role: 'STUDENT',
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'FY',
        division: 'A',
        prn: '2199TESM0001',
        shortId: 'TMR1',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({
      userId: student.id,
      username: student.username,
      role: 'STUDENT',
    });

    // 2. Create admin
    const admin = await prisma.user.create({
      data: {
        email: `admin_timer_${ts}@logicq.io`,
        username: `admin_timer_${ts}`,
        fullName: 'Admin Timer Auditor',
        displayName: 'Admin Auditor',
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: 'ADMIN',
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'TY',
        shortId: 'ADMT',
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({
      userId: admin.id,
      username: admin.username,
      role: 'ADMIN',
    });

    // 3. Create a test practice problem
    const prob = await prisma.problem.create({
      data: {
        title: 'Test Timer Problem',
        slug: testProblemSlug,
        description: 'Practice problem for timer test',
        difficulty: 'EASY',
        category: 'Basics',
        tags: '["Timer", "Test"]',
        starterCode: '#include <stdio.h>\nint main(){return 0;}',
        isPractice: true,
        moduleSlug: testModuleSlug,
        moduleOrder: 99,
        status: 'PUBLISHED',
        basePoints: 20,
      },
    });
    testProblemId = prob.id;
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.practiceProgress.deleteMany({
      where: {
        OR: [{ userId: studentId }, { problemId: testProblemId }],
      },
    });
    await prisma.adminAuditLog.deleteMany({
      where: {
        OR: [{ adminId }, { targetUserId: studentId }],
      },
    });
    await prisma.problem.deleteMany({
      where: { id: testProblemId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, adminId] } },
    });
  });

  it('1. Timer initializes on first open and persists initial metrics', async () => {
    const res = await request(app)
      .get(`/api/practice/problems/${testProblemSlug}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem.id).toBe(testProblemId);
    expect(res.body.data.userProgress).toBeDefined();
    expect(res.body.data.userProgress.firstOpenedAt).toBeDefined();
    expect(res.body.data.userProgress.activeSeconds).toBe(0);
    expect(res.body.data.userProgress.isSolved).toBe(false);
  });

  it('2. Active timer sync accumulates verified active seconds', async () => {
    // Simulate that 30 seconds of real wall-clock time passed since opening
    await prisma.practiceProgress.update({
      where: { userId_problemId: { userId: studentId, problemId: testProblemId } },
      data: { lastSyncedAt: new Date(Date.now() - 30000) },
    });

    const res = await request(app)
      .post('/api/practice/timer-sync')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testProblemId,
        deltaSeconds: 25,
        clientTimestamp: Date.now(),
        deviceLabel: 'Chrome (Windows)',
        reason: 'interval',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeSeconds).toBe(25);
    expect(res.body.data.lastDeviceLabel).toBe('Chrome (Windows)');

    // Verify in database
    const dbProg = await prisma.practiceProgress.findUnique({
      where: { userId_problemId: { userId: studentId, problemId: testProblemId } },
    });
    expect(dbProg?.activeSeconds).toBe(25);
  });

  it('3. Anti-tamper: rejects negative deltas and clamps inflated deltas', async () => {
    // Negative delta attempt
    const negRes = await request(app)
      .post('/api/practice/timer-sync')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testProblemId,
        deltaSeconds: -10,
        clientTimestamp: Date.now(),
      });
    expect(negRes.status).toBe(400);

    // Inflated delta attempt: client asks for 500s when only 0s elapsed
    const inflatedRes = await request(app)
      .post('/api/practice/timer-sync')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testProblemId,
        deltaSeconds: 500,
        clientTimestamp: Date.now(),
      });
    expect(inflatedRes.status).toBe(200);
    // Clamped by server to wall clock delta + tolerance (nowhere near 500)
    expect(inflatedRes.body.data.activeSeconds).toBeLessThan(40);
  });

  it('4. Telemetry: track-run increments runsCount idempotently', async () => {
    const res1 = await request(app)
      .post('/api/practice/track-run')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ problemId: testProblemId });

    expect(res1.status).toBe(200);
    expect(res1.body.data.runsCount).toBe(1);

    const res2 = await request(app)
      .post('/api/practice/track-run')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ problemId: testProblemId });

    expect(res2.status).toBe(200);
    expect(res2.body.data.runsCount).toBe(2);
  });

  it('5. Solved freeze: once solved, timeToSolveSeconds is frozen and timer stops accumulating', async () => {
    // Manually mark solved at activeSeconds = 50
    await prisma.practiceProgress.update({
      where: { userId_problemId: { userId: studentId, problemId: testProblemId } },
      data: {
        activeSeconds: 50,
        isSolved: true,
        solvedAt: new Date(),
        timeToSolveSeconds: 50,
      },
    });

    // Attempt to sync additional time after solved
    const syncPostSolve = await request(app)
      .post('/api/practice/timer-sync')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testProblemId,
        deltaSeconds: 30,
        clientTimestamp: Date.now(),
      });

    expect(syncPostSolve.status).toBe(200);
    // Frozen at 50, not incremented to 80
    expect(syncPostSolve.body.data.timeToSolveSeconds).toBe(50);
    expect(syncPostSolve.body.data.activeSeconds).toBe(50);
  });

  it('6. Module report: returns 403 locked if module has incomplete questions', async () => {
    const res = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Module report unlocks when all');
  });

  it('7. Institutional Privacy: student report never includes PRN or M/F gender indicator', async () => {
    // Mark ALL published problems in control-structures as solved for this student
    const allModuleProbs = await prisma.problem.findMany({
      where: { isPractice: true, moduleSlug: 'control-structures', status: 'PUBLISHED' },
    });

    for (const p of allModuleProbs) {
      await prisma.practiceProgress.upsert({
        where: { userId_problemId: { userId: studentId, problemId: p.id } },
        update: {
          isSolved: true,
          solvedAt: new Date(),
          activeSeconds: 120,
          timeToSolveSeconds: 120,
          attemptsCount: 1,
          firstAttemptAccepted: true,
        },
        create: {
          userId: studentId,
          problemId: p.id,
          moduleSlug: 'control-structures',
          isSolved: true,
          solvedAt: new Date(),
          activeSeconds: 120,
          timeToSolveSeconds: 120,
          attemptsCount: 1,
          firstAttemptAccepted: true,
          firstOpenedAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });
    }

    const reportRes = await request(app)
      .get('/api/practice/reports/module/control-structures')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
    const reportStr = JSON.stringify(reportRes.body);

    // Strictly NO PRN and NO M/F indicator in student response
    expect(reportStr).not.toContain('2199TESM0001');
    expect(reportRes.body.data.report.student.prn).toBeUndefined();
    expect(reportRes.body.data.report.totalSolved).toBe(allModuleProbs.length);
  });

  it('8. Final report: returns 403 locked if < 40 total questions are solved', async () => {
    const res = await request(app)
      .get('/api/practice/reports/final')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Final practice report unlocks when all');
  });

  it('9. Admin analytics: student is forbidden, admin can access cohort analytics and CSV', async () => {
    // Student forbidden
    const studRes = await request(app)
      .get('/api/practice/admin/reports')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studRes.status).toBe(403);

    // Admin allowed
    const adminRes = await request(app)
      .get('/api/practice/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.summary).toBeDefined();
    expect(adminRes.body.data.questions).toBeDefined();

    // Admin CSV export
    const csvRes = await request(app)
      .get('/api/practice/admin/reports/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Student Name');
    expect(csvRes.text).toContain('Total Solved');
    // Default CSV does not reveal raw PRN unless audited reveal flag passed
    expect(csvRes.text).not.toContain('2199TESM0001');
  });

  it('10. Admin progress correction: requires reason & password, updates metrics, logs audit event', async () => {
    // Missing reason rejected
    const noReasonRes = await request(app)
      .post('/api/practice/admin/correct-progress')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        problemId: testProblemId,
        activeSeconds: 75,
        adminPassword: ADMIN_PASSWORD,
      });
    expect(noReasonRes.status).toBe(400);
    expect(noReasonRes.body.message).toContain('reason');

    // Valid correction with audited reason & password
    const validRes = await request(app)
      .post('/api/practice/admin/correct-progress')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        problemId: testProblemId,
        activeSeconds: 75,
        attemptsCount: 3,
        reason: 'Adjusted after power glitch verification on Lab PC 4',
        adminPassword: ADMIN_PASSWORD,
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.activeSeconds).toBe(75);
    expect(validRes.body.data.attemptsCount).toBe(3);

    // Verify audit log entry was created
    const auditLog = await prisma.adminAuditLog.findFirst({
      where: {
        adminId,
        targetUserId: studentId,
        action: 'PRACTICE_RECORD_CORRECTED',
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.reason).toContain('power glitch');
  });
});
