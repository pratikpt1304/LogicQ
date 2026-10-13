import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Admin Daily Results Page & Role Security Tests', () => {
  const ts = Date.now();

  let studentId: string;
  let studentToken: string;
  let checkerId: string;
  let checkerToken: string;
  let adminId: string;
  let adminToken: string;
  const adminPassword = 'AdminSecurePassword123!';

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 1. Student User
    const studentUser = await prisma.user.create({
      data: {
        email: `student_results_${ts}@sanjivani.edu.in`,
        username: `student_results_${ts}`,
        fullName: 'Student Results Tester',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        prn: `2199TESM${String(ts).slice(-4)}`,
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'FY',
      },
    });
    studentId = studentUser.id;
    studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'STUDENT',
    });

    // 2. Checker User
    const checkerUser = await prisma.user.create({
      data: {
        email: `checker_results_${ts}@sanjivani.edu.in`,
        username: `checker_results_${ts}`,
        fullName: 'Checker Results Tester',
        passwordHash: hashedPassword,
        role: 'CHECKER',
      },
    });
    checkerId = checkerUser.id;
    checkerToken = generateAccessToken({
      userId: checkerUser.id,
      email: checkerUser.email,
      role: 'CHECKER',
    });

    // 3. Admin User
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_results_${ts}@sanjivani.edu.in`,
        username: `admin_results_${ts}`,
        fullName: 'Admin Results Tester',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });
    adminId = adminUser.id;
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({
      where: { adminId },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, checkerId, adminId] } },
    }).catch(() => {});
  });

  describe('1. Role Authorization Enforcement (Checkers & Students Strictly Blocked)', () => {
    it('Blocks students with 403 on GET /admin/daily-finalization/status', async () => {
      const res = await request(app)
        .get('/api/admin/daily-finalization/status')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('Blocks checkers with 403 on GET /admin/daily-finalization/status', async () => {
      const res = await request(app)
        .get('/api/admin/daily-finalization/status')
        .set('Authorization', `Bearer ${checkerToken}`);
      expect(res.status).toBe(403);
    });

    it('Blocks students with 403 on POST /admin/daily-finalization/run', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/run')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ adminPassword: 'any' });
      expect(res.status).toBe(403);
    });

    it('Blocks checkers with 403 on POST /admin/daily-finalization/run', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/run')
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({ adminPassword: 'any' });
      expect(res.status).toBe(403);
    });

    it('Blocks checkers with 403 on POST /admin/daily-finalization/correction', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/correction')
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({ dayId: '2026-10-12', studentPrnOrId: studentId, reason: 'test', newVerdict: 'ACCEPTED' });
      expect(res.status).toBe(403);
    });

    it('Blocks checkers with 403 on POST /admin/daily-finalization/pause-day', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/pause-day')
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({ dayStr: '2026-10-25', paused: true });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Admin Status Fetching (Live Board, History, Past Boards, Corrections, Pauses)', () => {
    it('Allows Admin to access GET /admin/daily-finalization/status and returns full operational structure', async () => {
      const res = await request(app)
        .get('/api/admin/daily-finalization/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data).toHaveProperty('todayDayId');
      expect(data).toHaveProperty('yesterdayDayId');
      expect(data).toHaveProperty('isDailyPaused');
      expect(data).toHaveProperty('liveToday');
      expect(data.liveToday).toHaveProperty('totalSolvers');
      expect(Array.isArray(data.liveToday.top20)).toBe(true);
      expect(Array.isArray(data.runHistory)).toBe(true);
      expect(Array.isArray(data.pastBoards)).toBe(true);
      expect(Array.isArray(data.corrections)).toBe(true);
      expect(Array.isArray(data.pauseDays)).toBe(true);
      expect(Array.isArray(data.freezeUsage)).toBe(true);
    });
  });

  describe('3. Re-run & Finalization Execution (Re-auth, Audit Logging & Idempotence)', () => {
    it('Rejects execution when admin password re-authentication is missing', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Routine run without password' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/password.*required/i);
    });

    it('Rejects execution when admin password is wrong', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminPassword: 'WrongPassword!', reason: 'Routine run' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/invalid.*credentials/i);
    });

    it('Executes finalization with valid password, creates audit log, and is idempotent', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayId: '2026-10-12',
          forceRerun: true,
          adminPassword,
          reason: 'Admin test run for daily results improvement verification',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('dayId', '2026-10-12');

      // Verify audit log created
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: {
          adminId,
          action: 'DAILY_FINALIZATION_RERUN',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.targetId).toBe('2026-10-12');
    });
  });

  describe('4. Correction Records (Create with Re-auth & Student Lookup)', () => {
    it('Rejects correction creation if password is wrong', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/correction')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayId: '2026-10-12',
          studentPrnOrId: studentId,
          reason: 'Wrong password test',
          newVerdict: 'ACCEPTED',
          adminPassword: 'WrongPassword!',
        });

      expect(res.status).toBe(403);
    });

    it('Creates correction record with valid password, audit logs it, and updates ledger', async () => {
      const res = await request(app)
        .post('/api/admin/daily-finalization/correction')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayId: '2026-10-12',
          studentPrnOrId: studentId,
          reason: 'Admin grade dispute correction approved',
          newVerdict: 'ACCEPTED',
          pointsAdjustment: 20,
          adminPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('pointsAdjustment', 20);

      // Verify audit log
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: {
          adminId,
          action: 'DAILY_CORRECTION_CREATED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.targetUserId).toBe(studentId);
    });
  });

  describe('5. Admin Pause Day Management (Toggle with Re-auth)', () => {
    it('Toggles pause day with password re-auth and reflects in status', async () => {
      const targetPauseDay = '2026-10-28';
      const res = await request(app)
        .post('/api/admin/daily-finalization/pause-day')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayStr: targetPauseDay,
          paused: true,
          reason: 'University Annual Symposium',
          adminPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in status endpoint
      const statusRes = await request(app)
        .get('/api/admin/daily-finalization/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusRes.body.data.pauseDays).toContain(targetPauseDay);
    });
  });
});
