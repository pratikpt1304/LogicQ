import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { getChallengeDayIST } from '../src/utils/ist.js';

describe('Security Audit & Functional Bug Regressions (SA-01 .. SA-08)', () => {
  const ts = Date.now();
  let studentAId: string;
  let studentAToken: string;
  let studentBId: string;
  let studentBToken: string;
  let adminId: string;
  let adminToken: string;

  let publishedProblemId: string;
  let draftProblemId: string;
  let futureProblemId: string;
  let studentASubmissionId: string;

  beforeAll(async () => {
    const [studentA, studentB, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `audit_stu_a_${ts}`,
          email: `audit_stu_a_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Student Alpha',
          role: 'STUDENT',
        },
      }),
      prisma.user.create({
        data: {
          username: `audit_stu_b_${ts}`,
          email: `audit_stu_b_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Student Beta',
          role: 'STUDENT',
        },
      }),
      prisma.user.create({
        data: {
          username: `audit_admin_${ts}`,
          email: `audit_admin_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Audit Admin',
          role: 'ADMIN',
        },
      }),
    ]);

    studentAId = studentA.id;
    studentBId = studentB.id;
    adminId = admin.id;

    studentAToken = generateAccessToken({
      userId: studentA.id,
      role: 'STUDENT',
      username: studentA.username,
    });
    studentBToken = generateAccessToken({
      userId: studentB.id,
      role: 'STUDENT',
      username: studentB.username,
    });
    adminToken = generateAccessToken({
      userId: admin.id,
      role: 'ADMIN',
      username: admin.username,
    });

    const [pubProb, draftProb, futureProb] = await Promise.all([
      prisma.problem.create({
        data: {
          slug: `audit-pub-${ts}`,
          title: 'Audit Published Problem',
          description: 'Published problem for security audit testing.',
          difficulty: 'EASY',
          tags: '["audit"]',
          status: 'PUBLISHED',
          starterCode: '#include <stdio.h>\nint main(){return 0;}',
          testCases: {
            create: [{ input: '1', expectedOutput: '1', isHidden: false, orderIndex: 0 }],
          },
        },
      }),
      prisma.problem.create({
        data: {
          slug: `audit-draft-${ts}`,
          title: 'Audit Draft Problem',
          description: 'Unpublished draft problem.',
          difficulty: 'MEDIUM',
          tags: '["audit"]',
          status: 'DRAFT',
          starterCode: '#include <stdio.h>\nint main(){return 0;}',
          testCases: {
            create: [{ input: '2', expectedOutput: '2', isHidden: true, orderIndex: 0 }],
          },
        },
      }),
      prisma.problem.create({
        data: {
          slug: `audit-future-${ts}`,
          title: 'Audit Future Scheduled Problem',
          description: 'Future scheduled daily problem.',
          difficulty: 'HARD',
          tags: '["audit"]',
          status: 'PUBLISHED',
          isDaily: true,
          scheduledDate: '2099-12-31',
          starterCode: '#include <stdio.h>\nint main(){return 0;}',
          testCases: {
            create: [{ input: '3', expectedOutput: '3', isHidden: true, orderIndex: 0 }],
          },
        },
      }),
    ]);

    publishedProblemId = pubProb.id;
    draftProblemId = draftProb.id;
    futureProblemId = futureProb.id;

    const sub = await prisma.submission.create({
      data: {
        userId: studentAId,
        problemId: publishedProblemId,
        code: '#include <stdio.h>\nint main(){ printf("secret_solution"); return 0; }',
        language: 'c',
        verdict: 'ACCEPTED',
        runtimeMs: 11,
        memoryKb: 1024,
        pointsAwarded: 25,
      },
    });
    studentASubmissionId = sub.id;
  });

  afterAll(async () => {
    const problemIds = [publishedProblemId, draftProblemId, futureProblemId].filter(Boolean);
    const userIds = [studentAId, studentBId, adminId].filter(Boolean);

    await prisma.submission.deleteMany({ where: { problemId: { in: problemIds } } });
    await prisma.problem.deleteMany({ where: { id: { in: problemIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('SA-01 (Critical IDOR): blocks Student B from reading Student A submission details with 403 Forbidden', async () => {
    // Student B attempts to read Student A's submission
    const forbiddenRes = await request(app)
      .get(`/api/submissions/${studentASubmissionId}`)
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
    expect(forbiddenRes.body.data).toBeUndefined();

    // Student A can read their own submission
    const ownerRes = await request(app)
      .get(`/api/submissions/${studentASubmissionId}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.submission.code).toContain('secret_solution');

    // Admin can read Student A's submission
    const adminRes = await request(app)
      .get(`/api/submissions/${studentASubmissionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.submission.id).toBe(studentASubmissionId);
  });

  it('SA-02 (Critical Session Revocation): immediately rejects existing JWT when user is banned or role changes', async () => {
    // Create a temporary student with an active refresh token
    const tempUser = await prisma.user.create({
      data: {
        username: `ban_target_${ts}`,
        email: `ban_target_${ts}@sanjivani.org.in`,
        passwordHash: 'dummy_hash',
        fullName: 'Ban Target',
        role: 'STUDENT',
      },
    });
    const tempJwt = generateAccessToken({
      userId: tempUser.id,
      role: 'STUDENT',
      username: tempUser.username,
    });
    await prisma.refreshToken.create({
      data: {
        token: `rt_${ts}_ban`,
        userId: tempUser.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    // Admin bans tempUser
    const banRes = await request(app)
      .patch(`/api/admin/users/${tempUser.id}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBanned: true });
    expect(banRes.status).toBe(200);

    // Existing JWT is immediately rejected on authenticated endpoint
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tempJwt}`);
    expect(meRes.status).toBe(403);
    expect(meRes.body.code).toBe('ACCOUNT_SUSPENDED');

    // Refresh token in DB was revoked
    const rtRecord = await prisma.refreshToken.findUnique({
      where: { token: `rt_${ts}_ban` },
    });
    expect(rtRecord?.revokedAt).not.toBeNull();

    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: tempUser.id } });
    await prisma.user.delete({ where: { id: tempUser.id } });
  });

  it('SA-03 (High XSS & Input Caps): blocks javascript: avatarUrl, strips HTML in profile, and caps code payload size', async () => {
    // 1. Reject javascript: URI in avatarUrl
    const badAvatarRes = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        fullName: 'Student Alpha',
        avatarUrl: 'javascript:alert(document.cookie)',
      });
    expect(badAvatarRes.status).toBe(400);

    // 2. Strip HTML/script tags from profile fields
    const xssProfileRes = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        displayName: 'Alpha<b>Coder</b>',
        bio: 'Hello <img src=x onerror=alert(1)> World',
        department: 'CSE',
        year: 'SY',
        division: 'a1',
        avatarUrl: 'https://example.com/avatar.png',
      });
    expect(xssProfileRes.status).toBe(200);
    expect(xssProfileRes.body.data.user.displayName).not.toContain('<b>');
    expect(xssProfileRes.body.data.user.bio).not.toContain('<img');
    expect(xssProfileRes.body.data.user.bio).not.toContain('onerror=');

    // 3. Reject >64KB code payload on /api/submissions/run
    const oversizedCode = 'a'.repeat(70000);
    const runRes = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        code: oversizedCode,
        language: 'c',
      });
    expect([400, 413]).toContain(runRes.status);
  });

  it('SA-04 (High Auth Domain & Reset Token Hashing): enforces ALLOWED_EMAIL_DOMAINS on register and hashes reset tokens with SHA-256', async () => {
    const prevMode = process.env.AUTH_MODE;
    const prevDomains = process.env.ALLOWED_EMAIL_DOMAINS;
    process.env.AUTH_MODE = 'DOMAIN_RESTRICTED';
    process.env.ALLOWED_EMAIL_DOMAINS = 'sanjivani.org.in';

    try {
      const blockedReg = await request(app).post('/api/auth/register').send({
        prn: '987654321099',
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'FY',
        email: `outsider_${ts}@gmail.com`,
        password: 'Password123!',
      });
      expect(blockedReg.status).toBe(403);
    } finally {
      process.env.AUTH_MODE = prevMode;
      process.env.ALLOWED_EMAIL_DOMAINS = prevDomains;
    }

    // Verify forgot-password hashes token in DB
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.user.update({
      where: { id: studentBId },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 3600_000),
      },
    });

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawToken,
      newPassword: 'NewSecurePassword123!',
    });
    expect(resetRes.status).toBe(200);

    const updatedStudentB = await prisma.user.findUnique({ where: { id: studentBId } });
    expect(updatedStudentB?.resetPasswordToken).toBeNull();
  });

  it('SA-05 (High Business Logic): prevents students from submitting to DRAFT or future-scheduled problems', async () => {
    const draftSubRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        problemId: draftProblemId,
        code: '#include <stdio.h>\nint main(){return 0;}',
        language: 'c',
      });
    expect(draftSubRes.status).toBe(403);

    const futureSubRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        problemId: futureProblemId,
        code: '#include <stdio.h>\nint main(){return 0;}',
        language: 'c',
      });
    expect(futureSubRes.status).toBe(403);
  });

  it('SA-06 (High Data Safety & Admin Lockout): soft-retires problems with submissions and blocks admin self-ban/self-demote', async () => {
    // 1. Admin cannot ban or demote themselves
    const selfBanRes = await request(app)
      .patch(`/api/admin/users/${adminId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBanned: true });
    expect(selfBanRes.status).toBe(400);

    const selfDemoteRes = await request(app)
      .patch(`/api/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'STUDENT' });
    expect(selfDemoteRes.status).toBe(400);

    // 2. Deleting a problem with existing student submissions soft-retires it instead of cascade-deleting
    const delRes = await request(app)
      .delete(`/api/admin/problems/${publishedProblemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.retired).toBe(true);

    // Verify Student A's submission still exists intact
    const preservedSub = await prisma.submission.findUnique({
      where: { id: studentASubmissionId },
    });
    expect(preservedSub).not.toBeNull();
    expect(preservedSub?.verdict).toBe('ACCEPTED');
  });

  it('SA-07 & SA-08 (Medium Headers & 17:00 IST Rollover): sets defensive headers and computes 17:00 IST boundary accurately', async () => {
    const dailyRes = await request(app).get('/api/problems/daily');
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.headers['x-content-type-options']).toBe('nosniff');
    expect(dailyRes.headers['x-frame-options']).toBe('DENY');
    expect(dailyRes.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(dailyRes.body.data.challengeDayIST).toBeDefined();
    expect(dailyRes.body.data.secondsUntilNextReset).toBeGreaterThan(0);
    expect(dailyRes.body.data.secondsUntilNextReset).toBeLessThanOrEqual(86400);

    // Verify 16:59:59 IST vs 17:00:00 IST boundary
    const before1700 = new Date('2026-10-05T11:29:59.000Z'); // 16:59:59 IST
    const at1700 = new Date('2026-10-05T11:30:00.000Z'); // 17:00:00 IST
    expect(getChallengeDayIST(before1700)).toBe('2026-10-04');
    expect(getChallengeDayIST(at1700)).toBe('2026-10-05');
  });
});
