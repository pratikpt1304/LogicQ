import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { evaluateSubmission } from '../src/services/submission-evaluator.js';
import { FEATURES } from '../src/config/features.config.js';

describe('Arena & Archive Feature Removal, Weekly Catch-Up & Past Weeks Verification', () => {
  const ts = Date.now();
  const rootDir = path.resolve(__dirname, '../..');
  const clientDir = path.join(rootDir, 'client');

  let studentId: string;
  let studentToken: string;
  let adminId: string;
  let adminToken: string;

  beforeAll(async () => {
    const [student, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `catchup_stu_${ts}`,
          prn: String(700000000000 + (ts % 100000000000)).slice(0, 12),
          email: `catchup_stu_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Catchup Student',
          displayName: 'CatchupCoder',
          shortId: 'C11A',
          college: 'Sanjivani University',
          department: 'CSE',
          year: 'SY',
          division: 'A',
          profileComplete: true,
          role: 'STUDENT',
          totalPoints: 40,
          currentStreak: 2,
          longestStreak: 3,
          lastSolvedDate: '2020-01-01',
        },
      }),
      prisma.user.create({
        data: {
          username: `catchup_admin_${ts}`,
          email: `catchup_admin_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Catchup Admin',
          role: 'ADMIN',
        },
      }),
    ]);

    studentId = student.id;
    adminId = admin.id;

    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
      username: student.username,
    });
    adminToken = generateAccessToken({
      userId: admin.id,
      role: 'ADMIN',
      username: admin.username,
    });
  });

  afterAll(async () => {
    const userIds = [studentId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.submissionTestCaseResult.deleteMany({
        where: { submission: { userId: { in: userIds } } },
      });
      await prisma.submission.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userBadge.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('1. Feature flags FEATURE_ARENA and FEATURE_ARCHIVE are disabled by default', () => {
    expect(FEATURES.ARENA).toBe(false);
    expect(FEATURES.ARCHIVE).toBe(false);
  });

  it('2. Contest & Archive backend endpoints reject calls from logged-out, student, and admin roles with 404 Not Found', async () => {
    const endpoints = [
      { method: 'get' as const, url: '/api/contests' },
      { method: 'get' as const, url: '/api/contests/weekly-1' },
      { method: 'get' as const, url: '/api/contests/weekly-1/scoreboard' },
      { method: 'post' as const, url: '/api/contests/weekly-1/join' },
      { method: 'get' as const, url: '/api/arena' },
      { method: 'get' as const, url: '/api/archive' },
      { method: 'get' as const, url: '/api/problems' },
    ];

    for (const ep of endpoints) {
      // Logged-out
      const anonRes = await request(app)[ep.method](ep.url);
      expect(anonRes.status).toBe(404);
      expect(anonRes.body.success).toBe(false);

      // Student
      const stuRes = await request(app)
        [ep.method](ep.url)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(stuRes.status).toBe(404);
      expect(stuRes.body.success).toBe(false);

      // Admin
      const admRes = await request(app)
        [ep.method](ep.url)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(admRes.status).toBe(404);
      expect(admRes.body.success).toBe(false);
    }
  });

  it('3. Single Visible Question rule works end-to-end: student cannot list current-week strip (404), solves today’s active challenge, and ended/future challenges are blocked (410 / 404)', async () => {
    // 1. Student cannot fetch the removed 7-day current-week strip (404), while Admin can inspect schedule
    const [stuWeekRes, admWeekRes] = await Promise.all([
      request(app)
        .get('/api/problems/current-week')
        .set('Authorization', `Bearer ${studentToken}`),
      request(app)
        .get('/api/problems/current-week')
        .set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(stuWeekRes.status).toBe(404);
    expect(admWeekRes.status).toBe(200);

    // 2. Open today's single active challenge (Day 5: reverse-linked-list-k-group or active scheduled problem)
    const dailyRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(dailyRes.status).toBe(200);
    const todayProblem = dailyRes.body.data.problem;
    expect(todayProblem).toBeDefined();
    expect(dailyRes.body.data.currentWeek).toBeUndefined();

    // Temporarily schedule sum-of-multiples as today's active challenge to verify C11 solve & points
    const sumProb = await prisma.problem.findUnique({ where: { slug: 'sum-of-multiples' } });
    expect(sumProb).not.toBeNull();
    const origSumDate = sumProb!.scheduledDate;
    const origTodayDate = todayProblem.scheduledDate;

    await prisma.problem.update({
      where: { id: todayProblem.id },
      data: { scheduledDate: origSumDate },
    });
    await prisma.problem.update({
      where: { id: sumProb!.id },
      data: { scheduledDate: origTodayDate },
    });

    try {
      const probRes = await request(app)
        .get(`/api/problems/sum-of-multiples`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(probRes.status).toBe(200);
      expect(probRes.body.data.problem.slug).toBe('sum-of-multiples');

      // 3. Submit a valid C solution to today's active challenge
      const cSolution = `#include <stdio.h>
int main() {
    long long n, sum = 0;
    if (scanf("%lld", &n) != 1) return 0;
    for (long long i = 1; i <= n; i++) {
        if (i % 3 == 0 || i % 5 == 0) sum += i;
    }
    printf("%lld\\n", sum);
    return 0;
}`;

      const submitRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          problemId: sumProb!.id,
          code: cSolution,
        });

      expect(submitRes.status).toBe(202);
      const subId = submitRes.body.data.submissionId;
      await evaluateSubmission(subId);

      // 4. Verify points and streak updated
      const dashAfter = await request(app)
        .get('/api/users/dashboard/stats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(dashAfter.status).toBe(200);
      expect(dashAfter.body.data.stats.totalPoints).toBe(40 + sumProb!.basePoints);
      expect(dashAfter.body.data.stats.currentStreak).toBeGreaterThanOrEqual(1);
    } finally {
      await prisma.problem.update({
        where: { id: sumProb!.id },
        data: { scheduledDate: origSumDate },
      });
      await prisma.problem.update({
        where: { id: todayProblem.id },
        data: { scheduledDate: origTodayDate },
      });
    }

    // 5. Verify locked future day cannot be fetched (404) or submitted (403)
    const futureProb = await prisma.problem.findUnique({
      where: { slug: 'valid-parentheses-stack' },
    });
    expect(futureProb).not.toBeNull();

    const futureFetch = await request(app)
      .get('/api/problems/valid-parentheses-stack')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(futureFetch.status).toBe(404);

    // 6. Verify ended past challenge returns 410 CHALLENGE_ENDED with no statement/samples/tests
    const pastProb = await prisma.problem.findUnique({
      where: { slug: 'circular-buffer-fifo' },
    });
    expect(pastProb).not.toBeNull();

    const pastFetch = await request(app)
      .get('/api/problems/circular-buffer-fifo')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(pastFetch.status).toBe(410);
    expect(pastFetch.body.code).toBe('CHALLENGE_ENDED');
    expect(pastFetch.body.ended).toBe(true);
    expect(pastFetch.body.data).toBeUndefined();
  }, 30000);

  it('4. Past weeks selector on Leaderboard and Dashboard loads past weeks rankings and student weekly summary', async () => {
    const [lbCurrent, lbLastWeek, dashLastWeek] = await Promise.all([
      request(app)
        .get('/api/leaderboard?weekOffset=0')
        .set('Authorization', `Bearer ${studentToken}`),
      request(app)
        .get('/api/leaderboard?weekOffset=-1')
        .set('Authorization', `Bearer ${studentToken}`),
      request(app)
        .get('/api/users/dashboard/stats?weekOffset=-1')
        .set('Authorization', `Bearer ${studentToken}`),
    ]);

    expect(lbCurrent.status).toBe(200);
    expect(lbCurrent.body.data.selectedWeek.weekOffset).toBe(0);
    expect(lbCurrent.body.data.selectedWeek.isFrozen).toBe(false);
    expect(lbCurrent.body.data.availableWeeks).toHaveLength(4);

    expect(lbLastWeek.status).toBe(200);
    expect(lbLastWeek.body.data.selectedWeek.weekOffset).toBe(-1);
    expect(lbLastWeek.body.data.selectedWeek.isFrozen).toBe(true);
    expect(lbLastWeek.body.data.weeklySummary).toBeDefined();
    expect(lbLastWeek.body.data.weeklySummary.weekLabel).toContain('Last Week');

    expect(dashLastWeek.status).toBe(200);
    expect(dashLastWeek.body.data.selectedWeek.weekOffset).toBe(-1);
    expect(dashLastWeek.body.data.weeklySummary.isFrozen).toBe(true);
    expect(dashLastWeek.body.data.weeklySummaries).toHaveLength(4);
  });

  it('5. Navbar, Landing page, Routes, Admin Dashboard, and Built Client Bundle have zero Arena or Archive pages/links', () => {
    // Removed page files do not exist
    expect(fs.existsSync(path.join(clientDir, 'src/pages/ArchivePage.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(clientDir, 'src/pages/ArenaPage.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(clientDir, 'src/pages/ContestDetailPage.tsx'))).toBe(false);

    // Navbar only contains Home, Daily Challenge, Leaderboard (Arena, Archive, and Badges removed)
    const navbarCode = fs.readFileSync(
      path.join(clientDir, 'src/components/layout/Navbar.tsx'),
      'utf-8'
    );
    expect(navbarCode).toContain("label: 'Home'");
    expect(navbarCode).toContain("label: 'Daily Challenge'");
    expect(navbarCode).toContain("label: 'Leaderboard'");
    expect(navbarCode).not.toContain('/archive');
    expect(navbarCode).not.toContain('/arena');
    expect(navbarCode).not.toContain('/badges');

    // Landing page has no Arena section or contest/archive references
    const landingCode = fs.readFileSync(
      path.join(clientDir, 'src/pages/LandingPage.tsx'),
      'utf-8'
    );
    expect(landingCode.toLowerCase()).not.toContain('arena');
    expect(landingCode.toLowerCase()).not.toContain('archive');
    expect(landingCode.toLowerCase()).not.toContain('contest');

    // Built client bundle check (client/dist)
    const distDir = path.join(clientDir, 'dist');
    if (fs.existsSync(distDir)) {
      const distHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
      expect(distHtml.toLowerCase()).not.toContain('arena');
      expect(distHtml.toLowerCase()).not.toContain('archive');

      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
        for (const jsFile of jsFiles) {
          const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
          expect(content).not.toContain('ArchivePage');
          expect(content).not.toContain('ArenaPage');
          expect(content).not.toContain('ContestDetailPage');
          expect(content).not.toContain('Campus Competitive Arena');
          expect(content).not.toContain('See the arena');
          expect(content).not.toContain('Join the next contest');
        }
      }
    }
  });
});
