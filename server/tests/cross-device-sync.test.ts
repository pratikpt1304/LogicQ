import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

describe('Cross-Device Synchronization & Multi-Session Architecture', () => {
  let studentUser: any;
  let studentCookie1: string;
  let studentCookie2: string;

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.submissionTestCaseResult.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.prnIndex.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['sync_student@sanjivani.edu.in', 'peer_student@sanjivani.edu.in'] } },
    });

    const hash = await bcrypt.hash('SecurePassword123!', 10);
    studentUser = await prisma.user.create({
      data: {
        email: 'sync_student@sanjivani.edu.in',
        username: 'sync_student_2026',
        passwordHash: hash,
        role: 'STUDENT',
        fullName: 'Sync Test Student',
        displayName: 'SyncTester',
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'TY',
        division: 'A',
        prn: '2199SYNC0001',
        profileComplete: true,
      },
    });

    await prisma.prnIndex.create({
      data: {
        prn: '2199SYNC0001',
        userId: studentUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.submissionTestCaseResult.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.prnIndex.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['sync_student@sanjivani.edu.in', 'peer_student@sanjivani.edu.in'] } },
    });
  });

  it('1. Logging in on a second device does not invalidate or log out the first device session', async () => {
    // Device 1 Login (e.g. Laptop)
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'sync_student@sanjivani.edu.in', password: 'SecurePassword123!' });

    expect(login1.status).toBe(200);
    const cookies1 = login1.headers['set-cookie'] || [];
    studentCookie1 = cookies1.find((c: string) => c.startsWith('__session=')) || '';
    expect(studentCookie1).toBeTruthy();

    // Device 2 Login (e.g. Phone)
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'sync_student@sanjivani.edu.in', password: 'SecurePassword123!' });

    expect(login2.status).toBe(200);
    const cookies2 = login2.headers['set-cookie'] || [];
    studentCookie2 = cookies2.find((c: string) => c.startsWith('__session=')) || '';
    expect(studentCookie2).toBeTruthy();

    // Both refresh tokens must be active simultaneously in the database
    const activeTokens = await prisma.refreshToken.findMany({
      where: { userId: studentUser.id, revokedAt: null },
    });
    expect(activeTokens.length).toBe(2);

    // Verify Device 1 can still access authenticated profile
    const me1 = await request(app)
      .get('/api/auth/me')
      .set('Cookie', studentCookie1);
    expect(me1.status).toBe(200);
    expect(me1.body.data.user.id).toBe(studentUser.id);

    // Verify Device 2 can access authenticated profile
    const me2 = await request(app)
      .get('/api/auth/me')
      .set('Cookie', studentCookie2);
    expect(me2.status).toBe(200);
    expect(me2.body.data.user.id).toBe(studentUser.id);
  });

  it('2. POST /api/auth/logout-all revokes all active device sessions atomically', async () => {
    // Login Device 1 and Device 2
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'sync_student@sanjivani.edu.in', password: 'SecurePassword123!' });
    const cookies1 = login1.headers['set-cookie'] || [];
    const tokenCookie1 = cookies1.find((c: string) => c.startsWith('refreshToken=')) || '';

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'sync_student@sanjivani.edu.in', password: 'SecurePassword123!' });
    const cookies2 = login2.headers['set-cookie'] || [];
    const tokenCookie2 = cookies2.find((c: string) => c.startsWith('refreshToken=')) || '';

    // Invoke logout-all from Device 1
    const logoutAllRes = await request(app)
      .post('/api/auth/logout-all')
      .set('Cookie', login1.headers['set-cookie']);

    expect(logoutAllRes.status).toBe(200);

    // All refresh tokens for this user must now be revoked
    const unrevokedCount = await prisma.refreshToken.count({
      where: { userId: studentUser.id, revokedAt: null },
    });
    expect(unrevokedCount).toBe(0);

    // Refresh attempt from Device 2 must fail
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', tokenCookie2);
    expect(refreshRes.status).toBe(401);
  });

  it('3. Profile updates on one device follow the account immediately', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'sync_student@sanjivani.edu.in', password: 'SecurePassword123!' });

    const cookies = loginRes.headers['set-cookie'];

    // Update display name from Device 1
    const updateRes = await request(app)
      .put('/api/users/profile')
      .set('Cookie', cookies)
      .send({
        displayName: 'MultiDeviceCoder',
        department: 'AIML',
        year: 'TY',
        division: 'B',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.user.displayName).toBe('MultiDeviceCoder');
    expect(updateRes.body.data.user.division).toBe('B');

    // Device 2 fetches profile and sees the update instantly
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.displayName).toBe('MultiDeviceCoder');
    expect(meRes.body.data.user.division).toBe('B');
  });
});
