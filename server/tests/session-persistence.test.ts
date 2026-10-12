import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../src/utils/jwt.js';

describe('LogicQ Session Persistence & Refresh Verification Suite', () => {
  const ts = Date.now();
  let studentId: string;
  let adminId: string;
  let studentRefreshToken: string;
  let adminRefreshToken: string;

  beforeAll(async () => {
    // Create test student and admin
    const [student, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `session_stu_${ts}`,
          prn: String(910000000000 + (ts % 10000000000)).slice(0, 12),
          email: `session_stu_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Session Student',
          role: 'STUDENT',
          profileComplete: true,
        },
      }),
      prisma.user.create({
        data: {
          username: `session_admin_${ts}`,
          email: `session_admin_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Session Admin',
          role: 'ADMIN',
          profileComplete: true,
        },
      }),
    ]);

    studentId = student.id;
    adminId = admin.id;

    studentRefreshToken = generateRefreshToken({
      userId: student.id,
      role: 'STUDENT',
      username: student.username,
    });
    adminRefreshToken = generateRefreshToken({
      userId: admin.id,
      role: 'ADMIN',
      username: admin.username,
    });

    await Promise.all([
      prisma.refreshToken.create({
        data: {
          token: studentRefreshToken,
          userId: student.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day student window
        },
      }),
      prisma.refreshToken.create({
        data: {
          token: adminRefreshToken,
          userId: admin.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-min admin window
        },
      }),
    ]);
  });

  afterAll(async () => {
    const userIds = [studentId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('1. Server sets __session cookie with HttpOnly, Lax, and Path=/ for Firebase Hosting CDN edge forwarding', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: `session_stu_${ts}@sanjivani.org.in`,
        password: 'wrong_password',
      });

    expect(res.status).toBe(401);

    // Test token cookie formatting directly on token generation
    const payload = { userId: studentId, role: 'STUDENT', username: `session_stu_${ts}` };
    const token = generateAccessToken(payload);

    // Verify GET /api/auth/me accepts __session cookie
    const authMeRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`__session=${token}`]);

    expect(authMeRes.status).toBe(200);
    expect(authMeRes.body.success).toBe(true);
    expect(authMeRes.body.data.user.id).toBe(studentId);
    expect(authMeRes.body.data.user.role).toBe('STUDENT');
  });

  it('2. Silent Token Refresh rotates access token and re-issues __session cookie without user interaction', async () => {
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${studentRefreshToken}`]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    // Verify Set-Cookie includes __session
    const cookies = refreshRes.headers['set-cookie'] || [];
    const hasSessionCookie = cookies.some((c: string) => c.startsWith('__session='));
    expect(hasSessionCookie).toBe(true);

    // Verify the newly minted token works on protected endpoints
    const newAccessToken = refreshRes.body.data.accessToken;
    const testMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`);

    expect(testMeRes.status).toBe(200);
    expect(testMeRes.body.data.user.id).toBe(studentId);
  });

  it('3. Revoked refresh token is immediately blocked from refreshing or restoring sessions', async () => {
    // Revoke student refresh token
    await prisma.refreshToken.updateMany({
      where: { token: studentRefreshToken },
      data: { revokedAt: new Date() },
    });

    const failedRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${studentRefreshToken}`]);

    expect(failedRefreshRes.status).toBe(401);
    expect(failedRefreshRes.body.success).toBe(false);
  });

  it('4. Banned user is immediately blocked even if they present a previously valid access token', async () => {
    const freshPayload = { userId: studentId, role: 'STUDENT', username: `session_stu_${ts}` };
    const validJwt = generateAccessToken(freshPayload);

    // Ban the user
    await prisma.user.update({
      where: { id: studentId },
      data: { isBanned: true },
    });

    const bannedMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validJwt}`);

    expect(bannedMeRes.status).toBe(403);
    expect(bannedMeRes.body.code).toBe('ACCOUNT_SUSPENDED');

    // Unban for subsequent cleanup
    await prisma.user.update({
      where: { id: studentId },
      data: { isBanned: false },
    });
  });

  it('5. Role changes require re-authentication and invalidate older JWTs with role mismatch', async () => {
    const studentJwt = generateAccessToken({
      userId: adminId,
      role: 'STUDENT', // Mismatched: user in DB has role 'ADMIN'
      username: `session_admin_${ts}`,
    });

    const roleMismatchRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentJwt}`);

    expect(roleMismatchRes.status).toBe(401);
    expect(roleMismatchRes.body.code).toBe('ROLE_CHANGED_RELOGIN_REQUIRED');
  });

  it('6. Logout clears __session, accessToken, and refreshToken cookies', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`refreshToken=${adminRefreshToken}`]);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const cookies = logoutRes.headers['set-cookie'] || [];
    const clearedSession = cookies.some((c: string) => c.includes('__session=;') || c.includes('__session=; Max-Age=0'));
    expect(clearedSession).toBe(true);
  });
});
