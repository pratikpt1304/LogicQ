import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Rolling 30-Day PRN Self-Service Change & Anti-Squatting Invariants', () => {
  let studentToken = '';
  let studentId = '';
  let student2Token = '';
  let adminToken = '';
  const adminPassword = 'AdminPassword123!';

  const studentPrnInitial = '202688880001';
  const studentPrnImmediate = '202688880002';
  const studentPrnBlocked = '202688880003';
  const student2Prn = '202688880099';

  beforeAll(async () => {
    const testPrns = [
      studentPrnInitial,
      studentPrnImmediate,
      studentPrnBlocked,
      student2Prn,
      '202688880004',
      '202688880005',
    ];
    await prisma.prnHistory.deleteMany({
      where: {
        OR: [
          { oldPrn: { in: testPrns } },
          { newPrn: { in: testPrns } },
        ],
      },
    });
    await prisma.prnIndex.deleteMany({ where: { prn: { in: testPrns } } });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { prn: { in: testPrns } },
          { email: { in: ['prnchange.test1@sanjivani.org.in', 'prnchange.test2@sanjivani.org.in'] } },
        ],
      },
    });

    // 1. Register student 1
    const regRes1 = await request(app).post('/api/auth/register').send({
      prn: studentPrnInitial,
      college: 'Sanjivani University',
      department: 'AIML',
      year: 'FY',
      division: 'A',
      email: 'prnchange.test1@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(regRes1.status).toBe(201);
    studentToken = regRes1.body.data.accessToken;
    studentId = regRes1.body.data.user.id;

    // 2. Register student 2
    const regRes2 = await request(app).post('/api/auth/register').send({
      prn: student2Prn,
      college: 'Sanjivani University',
      department: 'CSE',
      year: 'FY',
      division: 'B',
      email: 'prnchange.test2@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(regRes2.status).toBe(201);
    student2Token = regRes2.body.data.accessToken;

    // 3. Admin login
    const adminLogin = await request(app).post('/api/auth/login').send({
      identifier: 'admin@logicq.io',
      password: adminPassword,
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;
  });

  it('allows immediate PRN change right after signup (correcting initial signup typo)', async () => {
    // Fresh signup has prnChangedAt: null, so getPrnChangeCooldownStatus returns isEligible: true
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.prnChangedAt).toBeNull();
    expect(meRes.body.data.user.isPrnChangeEligible).toBe(true);

    // Perform immediate typo correction
    const changeRes = await request(app)
      .post('/api/users/change-prn')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        newPrn: studentPrnImmediate,
        confirmPrn: studentPrnImmediate,
        reauthConfirmed: true,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);
    expect(changeRes.body.data.user.maskedPrn).toContain('0002');
    expect(changeRes.body.data.user.isPrnChangeEligible).toBe(false);

    // Verify user in DB has updated PRN, prnChangedAt set
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    expect(user?.prn).toBe(studentPrnImmediate);
    expect(user?.prnChangedAt).not.toBeNull();

    // Verify prnHistory has recorded the change
    const histories = await prisma.prnHistory.findMany({ where: { userId: studentId } });
    expect(histories.length).toBe(1);
    expect(histories[0].oldPrn).toBe(studentPrnInitial);
    expect(histories[0].newPrn).toBe(studentPrnImmediate);
    expect(histories[0].source).toBe('STUDENT');

    // Verify old PRN is marked RELEASED_RESERVED for 30 days
    const oldIndex = await prisma.prnIndex.findUnique({ where: { prn: studentPrnInitial } });
    expect(oldIndex?.status).toBe('RELEASED_RESERVED');
    expect(oldIndex?.userId).toBe(studentId);
    expect(oldIndex?.reservedUntil).not.toBeNull();

    // Verify new PRN is ACTIVE
    const newIndex = await prisma.prnIndex.findUnique({ where: { prn: studentPrnImmediate } });
    expect(newIndex?.status).toBe('ACTIVE');
    expect(newIndex?.userId).toBe(studentId);
  });

  it('rejects a second change within 30 days with cooldown message', async () => {
    const secondChangeRes = await request(app)
      .post('/api/users/change-prn')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        newPrn: studentPrnBlocked,
        confirmPrn: studentPrnBlocked,
        reauthConfirmed: true,
      });

    expect(secondChangeRes.status).toBe(400);
    expect(secondChangeRes.body.message).toContain('once every 30 days');
    expect(secondChangeRes.body.message).toContain('days remaining');
  });

  it('prevents another student from squatting/claiming the released PRN during the 30-day reservation', async () => {
    // student 2 attempts to change their PRN to student 1's old PRN (studentPrnInitial)
    const squatRes = await request(app)
      .post('/api/users/change-prn')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        newPrn: studentPrnInitial,
        confirmPrn: studentPrnInitial,
        reauthConfirmed: true,
      });

    expect(squatRes.status).toBe(400);
    expect(squatRes.body.message).toBe('This PRN is unavailable. Please check the number or contact an administrator.');
  });

  it('allows PRN change after 30 days have elapsed', async () => {
    // Artificially simulate 31 days elapsed
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: studentId },
      data: { prnChangedAt: thirtyOneDaysAgo },
    });

    const elapsedChangeRes = await request(app)
      .post('/api/users/change-prn')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        newPrn: studentPrnBlocked,
        confirmPrn: studentPrnBlocked,
        reauthConfirmed: true,
      });

    expect(elapsedChangeRes.status).toBe(200);
    expect(elapsedChangeRes.body.success).toBe(true);
    expect(elapsedChangeRes.body.data.user.maskedPrn).toContain('0003');

    const updatedUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(updatedUser?.prn).toBe(studentPrnBlocked);
  });

  it('allows admin to reveal student PRN with audit log entry', async () => {
    const revealRes = await request(app)
      .post(`/api/admin/users/${studentId}/reveal-prn`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revealRes.status).toBe(200);
    expect(revealRes.body.data.prn).toBe(studentPrnBlocked);

    // Verify audit log
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        action: 'ADMIN_REVEAL_PRN',
        targetUserId: studentId,
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it('allows admin to reset PRN cooldown with audit log entry and password re-auth', async () => {
    // 1. Wrong password fails
    const failReset = await request(app)
      .post(`/api/admin/users/${studentId}/reset-prn-cooldown`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminPassword: 'BadPassword123!', reason: 'Typo correction request' });
    expect(failReset.status).toBe(401);

    // 2. Correct password resets cooldown
    const resetRes = await request(app)
      .post(`/api/admin/users/${studentId}/reset-prn-cooldown`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminPassword, reason: 'Approved student request to fix typo' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.isPrnChangeEligible).toBe(true);

    const resetUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(resetUser?.prnChangedAt).toBeNull();

    // Verify audit log
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        action: 'ADMIN_RESET_PRN_COOLDOWN',
        targetUserId: studentId,
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });
});
