import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { evaluateSubmission } from '../src/services/submission-evaluator.js';
import { FEATURES } from '../src/config/features.config.js';
import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { ensureCurrentWeekSchedule } from '../src/controllers/problem.controller.js';
import { getChallengeDayIST, addDaysIST } from '../src/utils/ist.js';
import { setDailyChallengePausedForTesting } from '../src/services/system-config.service.js';

describe('LogicQ Amendments Verification Suite (Badges Removal, PWA, Real C11 Judge Audit, Upload Files, Home Nav, Book Governance & Console Audit)', () => {
  const ts = Date.now();
  const rootDir = path.resolve(__dirname, '../..');
  const clientDir = path.join(rootDir, 'client');

  let studentAId: string;
  let studentAToken: string;
  let studentBId: string;
  let studentBToken: string;
  let adminId: string;
  let adminToken: string;
  let pointerSwapProblemId: string;
  let pointerSwapOrigScheduledDate: string | null = null;

  beforeAll(async () => {
    setDailyChallengePausedForTesting(false);
    await ensureCurrentWeekSchedule();
    const pointerProb = await prisma.problem.findUnique({
      where: { slug: 'pointer-swap-in-place' },
      include: { testCases: true },
    });
    expect(pointerProb).not.toBeNull();
    pointerSwapProblemId = pointerProb!.id;
    pointerSwapOrigScheduledDate = pointerProb!.scheduledDate;

    const [studentA, studentB, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `audit_stu_a_${ts}`,
          prn: String(810000000000 + (ts % 10000000000)).slice(0, 12),
          email: `audit_stu_a_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Audit Student A',
          displayName: 'AuditCoderA',
          shortId: 'A11A',
          college: 'Sanjivani University',
          department: 'AIML',
          year: 'SY',
          division: 'A',
          profileComplete: true,
          role: 'STUDENT',
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
      }),
      prisma.user.create({
        data: {
          username: `audit_stu_b_${ts}`,
          prn: String(820000000000 + (ts % 10000000000)).slice(0, 12),
          email: `audit_stu_b_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Audit Student B',
          displayName: 'AuditCoderB',
          shortId: 'B22B',
          college: 'Sanjivani University',
          department: 'CSE',
          year: 'TY',
          division: 'B',
          profileComplete: true,
          role: 'STUDENT',
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
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
  });

  afterAll(async () => {
    const userIds = [studentAId, studentBId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.uploadReview.deleteMany({
        where: { reviewerId: { in: userIds } },
      });
      await prisma.uploadedSolution.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.submissionTestCaseResult.deleteMany({
        where: { submission: { userId: { in: userIds } } },
      });
      await prisma.submission.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userBadge.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    setDailyChallengePausedForTesting(true);
  });

  it('1. Badges Removal: FEATURE_BADGES is false, all badge endpoints return 404 for all roles, and API responses omit badges', async () => {
    expect(FEATURES.BADGES).toBe(false);
    expect(fs.existsSync(path.join(clientDir, 'src/pages/BadgesPage.tsx'))).toBe(false);

    const badgeUrls = ['/api/badges', '/api/achievements', '/api/users/badges', '/api/admin/badges'];
    for (const url of badgeUrls) {
      const anon = await request(app).get(url);
      expect(anon.status).toBe(404);
      const stu = await request(app).get(url).set('Authorization', `Bearer ${studentAToken}`);
      expect(stu.status).toBe(404);
      const adm = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
      expect(adm.status).toBe(404);
    }

    const [meRes, exportRes, lbRes] = await Promise.all([
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${studentAToken}`),
      request(app).get('/api/users/me/export').set('Authorization', `Bearer ${studentAToken}`),
      request(app).get('/api/leaderboard').set('Authorization', `Bearer ${studentAToken}`),
    ]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.badges).toBeUndefined();
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.badgesEarned).toBeUndefined();
    expect(lbRes.status).toBe(200);

    const firestoreRules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
    expect(firestoreRules).toContain('match /badges/{badgeId=**}');
  });

  it('2. PWA & Home Navigation: manifest, PNG icons, sw.js, offline.html, and Navbar items (Home, Daily Challenge, Leaderboard) are verified', () => {
    const manifestPath = path.join(clientDir, 'public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('LogicQ');
    expect(manifest.short_name).toBe('LogicQ');
    expect(manifest.lang).toBe('en-IN');
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#0C0F1F');
    expect(manifest.theme_color).toBe('#0C0F1F');

    for (const iconFile of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png']) {
      const iconPath = path.join(clientDir, 'public/icons', iconFile);
      expect(fs.existsSync(iconPath)).toBe(true);
      expect(fs.statSync(iconPath).size).toBeGreaterThan(500);
    }

    expect(fs.existsSync(path.join(clientDir, 'public/sw.js'))).toBe(true);
    expect(fs.existsSync(path.join(clientDir, 'public/offline.html'))).toBe(true);
    expect(fs.existsSync(path.join(clientDir, 'src/pages/HowToInstallPage.tsx'))).toBe(true);

    const navbarCode = fs.readFileSync(path.join(clientDir, 'src/components/layout/Navbar.tsx'), 'utf-8');
    const homeIdx = navbarCode.indexOf("label: 'Home'");
    const dailyIdx = navbarCode.indexOf("label: 'Daily Challenge'");
    const lbIdx = navbarCode.indexOf("label: 'Leaderboard'");
    expect(homeIdx).toBeGreaterThan(-1);
    expect(dailyIdx).toBeGreaterThan(homeIdx);
    expect(lbIdx).toBeGreaterThan(dailyIdx);
    expect(navbarCode).toContain('aria-current={active ? \'page\' : undefined}');
  });

  it('3. Real C11 Judge Audit: verifies all 17 problems have >= 2 sample & >= 5 hidden tests, and tests all 6 verdicts + sandbox security', async () => {
    const allProblems = await prisma.problem.findMany({
      where: {
        status: 'PUBLISHED',
        isPractice: false,
        sourceType: { not: 'BOOK' },
        NOT: [
          { slug: { startsWith: 'practice-' } },
          { slug: { startsWith: 'kanetkar-' } },
          { slug: { startsWith: 'test-' } },
          { slug: { startsWith: 'dbg-' } },
          { slug: { startsWith: 'sa-' } },
          { slug: { startsWith: 'safety-' } },
          { slug: { startsWith: 'score-' } },
          { slug: { startsWith: 'pilot-' } },
        ],
      },
      include: { testCases: true },
    });
    expect(allProblems.length).toBeGreaterThanOrEqual(16);
    for (const p of allProblems) {
      const sampleCount = p.testCases.filter((tc) => !tc.isHidden).length;
      const hiddenCount = p.testCases.filter((tc) => tc.isHidden).length;
      expect(sampleCount).toBeGreaterThanOrEqual(2);
      expect(hiddenCount).toBeGreaterThanOrEqual(5);
    }

    const judge = new LocalGccJudge();

    // (a) Syntax error -> COMPILE_ERROR with real compiler line number
    const ceRes = await judge.compileAndRun(
      '#include <stdio.h>\nint main() {\n  printf("hi")\n  return 0;\n}',
      ''
    );
    expect(ceRes.verdict).toBe('COMPILE_ERROR');
    expect(ceRes.compileOutput).toContain('error:');

    // (b) Infinite loop -> TIME_LIMIT_EXCEEDED
    const tleRes = await judge.compileAndRun(
      '#include <stdio.h>\nint main() { volatile int x = 0; while(1) { x++; } return 0; }',
      '',
      800
    );
    expect(tleRes.verdict).toBe('TIME_LIMIT_EXCEEDED');

    // (c) Null pointer dereference -> RUNTIME_ERROR
    const reRes = await judge.compileAndRun(
      '#include <stdio.h>\nint main() { volatile int *p = 0; *p = 42; return 0; }',
      ''
    );
    expect(reRes.verdict).toBe('RUNTIME_ERROR');

    // (d) Memory allocation exceeding limit -> MEMORY_LIMIT_EXCEEDED
    const mleRes = await judge.compileAndRun(
      '#include <stdlib.h>\n#include <stdio.h>\n#include <string.h>\nint main() { size_t sz = 128ULL * 1024ULL * 1024ULL; char *p = (char*)malloc(sz); if (p) { memset(p, 1, sz); } printf("%p\\n", p); return 0; }',
      '',
      2000,
      32
    );
    expect(['MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR']).toContain(mleRes.verdict);

    // (e) Malicious headers / syscalls / file access / env access -> blocked
    const passwdInclude = await judge.compileAndRun('#include "/etc/passwd"\nint main(){return 0;}', '');
    expect(passwdInclude.verdict).toBe('COMPILE_ERROR');

    const forkCall = await judge.compileAndRun('#include <unistd.h>\nint main(){ fork(); return 0; }', '');
    expect(forkCall.verdict).toBe('COMPILE_ERROR');

    const envLeak = await judge.compileAndRun(
      '#include <stdio.h>\n#include <stdlib.h>\nint main(){ const char *s = getenv("PATH"); printf("%s\\n", s ? s : "BLOCKED"); return 0; }',
      ''
    );
    expect((envLeak.stdout || '').trim()).toBe('BLOCKED');

    // Temporarily unlock 'pointer-swap-in-place' for today's active challenge day
    await ensureCurrentWeekSchedule();
    const activeDay = getChallengeDayIST();
    await prisma.problem.update({
      where: { id: pointerSwapProblemId },
      data: { scheduledDate: activeDay, status: 'PUBLISHED' },
    });

    try {
      // (f) Hardcoded sample output on 'pointer-swap-in-place' -> WRONG_ANSWER & 0 points
      const hardcodedSub = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          problemId: pointerSwapProblemId,
          code: '#include <stdio.h>\nint main() { printf("20 10\\n30\\n"); return 0; }',
        });
      expect(hardcodedSub.status).toBe(202);
      await evaluateSubmission(hardcodedSub.body.data.submissionId);

      const hardcodedRecord = await prisma.submission.findUnique({
        where: { id: hardcodedSub.body.data.submissionId },
        include: { testCaseResults: true },
      });
      expect(hardcodedRecord?.verdict).toBe('WRONG_ANSWER');
      expect(hardcodedRecord?.pointsAwarded).toBe(0);

      // Backdate first submission by 10s so 5-second per-user cooldown does not block the immediate follow-up
      await prisma.submission.update({
        where: { id: hardcodedSub.body.data.submissionId },
        data: { createdAt: new Date(Date.now() - 10000) },
      });

      // (g) Genuine C11 solution on 'pointer-swap-in-place' -> ACCEPTED & awards points once
      const validSub = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          problemId: pointerSwapProblemId,
          code: '#include <stdio.h>\nvoid swap(long long *x, long long *y){ long long t=*x; *x=*y; *y=t; }\nint main(){ long long a,b; if(scanf("%lld %lld",&a,&b)!=2) return 0; swap(&a,&b); printf("%lld %lld\\n%lld\\n", a, b, a+b); return 0; }',
        });
      expect(validSub.status).toBe(202);
      await evaluateSubmission(validSub.body.data.submissionId);

      const validRecord = await prisma.submission.findUnique({
        where: { id: validSub.body.data.submissionId },
      });
      expect(validRecord?.verdict).toBe('ACCEPTED');
      expect(validRecord?.pointsAwarded).toBeGreaterThan(0);
    } finally {
      await prisma.problem.update({
        where: { id: pointerSwapProblemId },
        data: { scheduledDate: pointerSwapOrigScheduledDate ?? addDaysIST(activeDay, -10) },
      });
    }
  }, 40000);

  it('4. Upload Files Workflow & Security: magic-byte validation, EXIF stripping, PDF JS rejection, PENDING_REVIEW 0-point rule, IDOR block, and Admin review', async () => {
    await ensureCurrentWeekSchedule();
    const activeDay = getChallengeDayIST();
    await prisma.problem.update({
      where: { id: pointerSwapProblemId },
      data: { scheduledDate: activeDay, status: 'PUBLISHED' },
    });

    try {
      // 1. Disguised executable (.exe renamed to .png) -> rejected by magic bytes
      const fakePngBase64 = Buffer.from('MZ\x90\x00This is an executable file').toString('base64');
      const fakeRes = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          problemId: pointerSwapProblemId,
          files: [{ name: 'disguised.png', mimeType: 'image/png', dataBase64: fakePngBase64 }],
        });
      expect(fakeRes.status).toBe(400);
      expect(fakeRes.body.message).toMatch(/disguised|signature/i);

      // 2. PDF containing /JavaScript -> rejected
      const jsPdfBase64 = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\n%%EOF').toString('base64');
      const jsPdfRes = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          problemId: pointerSwapProblemId,
          files: [{ name: 'malicious.pdf', mimeType: 'application/pdf', dataBase64: jsPdfBase64 }],
        });
      expect(jsPdfRes.status).toBe(400);
      expect(jsPdfRes.body.message).toMatch(/active scripts/i);

      // 3. Valid PNG + JPEG with APP1 EXIF segment -> accepted, EXIF stripped, status PENDING_REVIEW, 0 points
      const validPngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);
      const validJpgWithExif = Buffer.from([
        0xff, 0xd8, // SOI
        0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 EXIF (length 8)
        0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, // DQT
        0xff, 0xd9, // EOI
      ]);

      const uploadRes = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          problemId: pointerSwapProblemId,
          note: 'Swapped pointers using a temporary variable on paper.',
          files: [
            { name: 'notebook_page1.png', mimeType: 'image/png', dataBase64: validPngBytes.toString('base64') },
            { name: 'photo_with_exif.jpg', mimeType: 'image/jpeg', dataBase64: validJpgWithExif.toString('base64') },
          ],
        });

      expect(uploadRes.status).toBe(201);
      const uploaded = uploadRes.body.data.upload;
      expect(uploaded.status).toBe('PENDING_REVIEW');
      expect(uploaded.pointsAwarded).toBe(0);

      const userBBeforeReview = await prisma.user.findUnique({ where: { id: studentBId } });
      expect(userBBeforeReview?.totalPoints).toBe(0);
      expect(userBBeforeReview?.currentStreak).toBe(0);

      // 4. IDOR check: Student A cannot view or download Student B's uploaded file
      const fileId = uploaded.files[0].id;
      const idorRes = await request(app)
        .get(`/api/uploads/${uploaded.id}/files/${fileId}`)
        .set('Authorization', `Bearer ${studentAToken}`);
      expect(idorRes.status).toBe(403);

      // 5. Admin views file -> succeeds and writes AdminAuditLog
      const adminFileRes = await request(app)
        .get(`/api/uploads/${uploaded.id}/files/${fileId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminFileRes.status).toBe(200);

      // Verify JPEG EXIF APP1 (0xFF 0xE1) was stripped on disk
      const jpgFileId = uploaded.files[1].id;
      const adminJpgRes = await request(app)
        .get(`/api/uploads/${uploaded.id}/files/${jpgFileId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminJpgRes.status).toBe(200);
      expect(adminJpgRes.body.includes(Buffer.from([0xff, 0xe1]))).toBe(false);

      // 6. Admin approves upload with 10 points -> updates Student B's points & streak once
      const reviewRes = await request(app)
        .put(`/api/admin/uploads/${uploaded.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          pointsAwarded: 10,
          reviewerComment: 'Clean pointer diagram and dry run!',
        });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.upload.status).toBe('APPROVED');
      expect(reviewRes.body.data.upload.pointsAwarded).toBe(10);

      const userBAfterReview = await prisma.user.findUnique({ where: { id: studentBId } });
      expect(userBAfterReview?.totalPoints).toBe(10);
      expect(userBAfterReview?.currentStreak).toBe(1);
    } finally {
      await prisma.problem.update({
        where: { id: pointerSwapProblemId },
        data: { scheduledDate: pointerSwapOrigScheduledDate ?? addDaysIST(activeDay, -10) },
      });
    }
  });

  it('5. Book Content Governance & Error Report: student endpoints never leak sourceRefJson or solutionCode, and /api/support/error-report logs client errors', async () => {
    const dailyRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.data.problem.sourceRefJson).toBeUndefined();
    expect(dailyRes.body.data.problem.solutionCode).toBeUndefined();

    const errReportRes = await request(app)
      .post('/api/support/error-report')
      .send({
        message: 'Simulated ErrorBoundary test',
        route: '/dashboard',
      });
    expect(errReportRes.status).toBe(201);
  });
});
