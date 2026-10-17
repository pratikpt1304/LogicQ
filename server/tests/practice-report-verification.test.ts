import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { practiceReportService } from '../src/services/practice-report.service.js';

describe('Practice Report Verification, Rate-Limiting, Zero-PII & Partial Reports', () => {
  const ts = Date.now();

  let studentId: string;
  let studentToken: string;
  const FAKE_PRN = '2199TESM0001';
  const testModuleSlug = 'control-structures';

  beforeAll(async () => {
    // 1. Create student with private academic profile & PRN
    const student = await prisma.user.create({
      data: {
        email: `report_verify_${ts}@sanjivani.edu.in`,
        username: `report_verify_${ts}`,
        fullName: 'Secret Student Name',
        displayName: 'Report Student',
        passwordHash: await bcrypt.hash('StudentPass123!', 10),
        role: 'STUDENT',
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'FY',
        division: 'B',
        prn: FAKE_PRN,
        shortId: 'VRFY',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({
      userId: student.id,
      username: student.username,
      role: 'STUDENT',
    });
  });

  afterAll(async () => {
    practiceReportService.clear();
    await prisma.practiceProgress.deleteMany({
      where: { userId: studentId },
    });
    await prisma.user.deleteMany({
      where: { id: studentId },
    });
  });

  it('1. Partial Reports: student can download in-progress report anytime when ?partial=true', async () => {
    // Without ?partial=true, returns 403 MODULE_INCOMPLETE with canDownloadPartial: true
    const lockedRes = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.code).toBe('MODULE_INCOMPLETE');
    expect(lockedRes.body.data.canDownloadPartial).toBe(true);

    // With ?partial=true, returns 200 OK with status: 'IN_PROGRESS' and statusLabel: 'IN PROGRESS (UNVERIFIED COMPLETION)'
    const partialRes = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}?partial=true`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(partialRes.status).toBe(200);
    expect(partialRes.body.success).toBe(true);
    expect(partialRes.body.data.report.status).toBe('IN_PROGRESS');
    expect(partialRes.body.data.report.statusLabel).toBe('IN PROGRESS (UNVERIFIED COMPLETION)');
    expect(partialRes.body.data.report.isCompleted).toBe(false);
    expect(partialRes.body.data.report.footerNote).toContain('active solve time');

    // Has unique report ID and verification URL
    expect(partialRes.body.data.report.reportId).toMatch(/^lqr_[A-Za-z0-9_-]{32}$/);
    expect(partialRes.body.data.report.verificationUrl).toContain(partialRes.body.data.report.reportId);
  });

  it('2. Unguessable Report ID & High Entropy Token', async () => {
    const id1 = practiceReportService.generateReportId();
    const id2 = practiceReportService.generateReportId();

    expect(id1).toMatch(/^lqr_[A-Za-z0-9_-]{32}$/);
    expect(id2).toMatch(/^lqr_[A-Za-z0-9_-]{32}$/);
    expect(id1).not.toBe(id2);
  });

  it('3. Public Verification Endpoint: strictly ZERO PII and leaks nothing personal', async () => {
    // Generate a report first
    const genRes = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}?partial=true`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(genRes.status).toBe(200);
    const reportId = genRes.body.data.report.reportId;
    expect(reportId).toBeDefined();

    // Call public verification endpoint without any auth header
    const verifyRes = await request(app).get(`/api/practice/reports/verify/${reportId}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    const bodyStr = JSON.stringify(verifyRes.body);

    // Assert STRICT ZERO PII: No PRN, no student name, no email, no user ID, no gender
    expect(bodyStr).not.toContain(FAKE_PRN);
    expect(bodyStr).not.toContain('Secret Student Name');
    expect(bodyStr).not.toContain('report_verify_');
    expect(bodyStr).not.toContain('@sanjivani.edu.in');
    expect(bodyStr).not.toContain(studentId);
    expect(verifyRes.body.data.student).toBeUndefined();
    expect(verifyRes.body.data.userId).toBeUndefined();
    expect(verifyRes.body.data._internalUserId).toBeUndefined();

    // Contains only authenticity, date, scope, and completion status
    expect(verifyRes.body.data.reportId).toBe(reportId);
    expect(verifyRes.body.data.scope).toBe('SINGLE_MODULE');
    expect(verifyRes.body.data.moduleSlug).toBe(testModuleSlug);
    expect(verifyRes.body.data.status).toBe('IN_PROGRESS');
    expect(verifyRes.body.data.statusLabel).toBe('IN PROGRESS (UNVERIFIED COMPLETION)');
    expect(verifyRes.body.data.generatedAt).toBeDefined();
    expect(verifyRes.body.data.verificationNotice).toContain('zero student personally identifiable information');
  });

  it('4. Anti-Tamper: tampered or non-existent report IDs fail verification with 404', async () => {
    const tamperedId = 'lqr_fake_tampered_token_1234567890abcdef';
    const res = await request(app).get(`/api/practice/reports/verify/${tamperedId}`);

    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
    expect(res.body.code).toBe('REPORT_NOT_FOUND');
  });

  it('5. Rate Limiting: regenerating reports enforces 30-second cooldown with 429 status', async () => {
    // Clear previous generation timestamp for student to test fresh regeneration
    practiceReportService.clear();

    // First generation with ?regenerate=true should succeed
    const firstRes = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}?partial=true&regenerate=true`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(firstRes.status).toBe(200);

    // Immediate second call with ?regenerate=true triggers 429
    const secondRes = await request(app)
      .get(`/api/practice/reports/module/${testModuleSlug}?partial=true&regenerate=true`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(secondRes.status).toBe(429);
    expect(secondRes.body.code).toBe('RATE_LIMITED');
    expect(secondRes.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(secondRes.body.retryAfterSeconds).toBeLessThanOrEqual(30);
  });
});
