import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import {
  setSimulatedServerTime,
  getChallengeDayIST,
} from '../src/utils/ist.js';
import {
  setAutoScheduleSyncEnabled,
  ensureCurrentWeekSchedule,
} from '../src/controllers/problem.controller.js';
import {
  initSystemConfig,
  getSystemConfig,
  isDailyChallengePaused,
  pauseDailySystem,
  resumeDailySystem,
  getDailySystemPreview,
} from '../src/services/system-config.service.js';
import {
  evaluateMissedChallengeDay,
  isRollingFreezeAvailable,
} from '../src/services/streak.service.js';
import { runDailyFinalizationJob } from '../src/services/daily-finalization.service.js';

describe('Daily Challenge System Safe Pause Architecture (Gate 1 Verification)', () => {
  const ts = Date.now();

  let studentId: string;
  let studentToken: string;
  let adminId: string;
  let adminToken: string;
  const adminPassword = 'AdminSecretPassword123!';

  let testDailyProblem: any;
  let createdProblems: string[] = [];

  beforeAll(async () => {
    setAutoScheduleSyncEnabled(false);

    // Initialize or get default system config
    await initSystemConfig(true);
    await pauseDailySystem('SYSTEM_TEST', 'Safe Pause Architecture Test Suite');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 1. Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_pause_${ts}@sanjivani.edu.in`,
        username: `admin_pause_${ts}`,
        fullName: 'Admin Pause Tester',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });
    adminId = adminUser.id;
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      username: adminUser.username,
    });

    // 2. Create test student user
    const studentUser = await prisma.user.create({
      data: {
        email: `student_pause_${ts}@sanjivani.edu.in`,
        username: `student_pause_${ts}`,
        fullName: 'Student Pause Tester',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        currentStreak: 5,
        longestStreak: 5,
        totalPoints: 100,
        department: 'CSE',
        year: 'TY',
        prn: `2024${String(ts).slice(-4)}M1001`,
      },
    });
    studentId = studentUser.id;
    studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'STUDENT',
      username: studentUser.username,
    });

    // 3. Create a daily problem scheduled for today
    const todayIST = getChallengeDayIST();
    testDailyProblem = await prisma.problem.create({
      data: {
        title: `Test Daily Problem ${ts}`,
        slug: `test-daily-pause-${ts}`,
        description: 'Test problem description for pause testing',
        starterCode: '#include <stdio.h>\nint main() { return 0; }',
        difficulty: 'EASY',
        category: 'Algorithms',
        tags: JSON.stringify(['Basics']),
        basePoints: 20,
        isDaily: true,
        scheduledDate: todayIST,
        status: 'PUBLISHED',
        isPractice: false,
        testCases: {
          create: [
            { input: '1\n', expectedOutput: '1\n', isHidden: false, orderIndex: 0 },
            { input: '2\n', expectedOutput: '2\n', isHidden: true, orderIndex: 1 },
          ],
        },
      },
    });
    createdProblems.push(testDailyProblem.id);
  });

  afterAll(async () => {
    setSimulatedServerTime(null);
    setAutoScheduleSyncEnabled(true);

    // Clean up created records
    if (createdProblems.length > 0) {
      await prisma.testCase.deleteMany({ where: { problemId: { in: createdProblems } } });
      await prisma.problem.deleteMany({ where: { id: { in: createdProblems } } });
    }

    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    }
  });

  it('1. Daily challenge system is PAUSED by default in SystemConfig', async () => {
    const isPaused = await isDailyChallengePaused();
    expect(isPaused).toBe(true);

    const config = await getSystemConfig();
    expect(config.dailyChallengePaused).toBe(true);
    expect(config.minScheduledForResume).toBe(14);
  });

  it('2. Public GET /api/config returns dailyChallengePaused: true to clients', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dailyChallengePaused).toBe(true);
  });

  it('3. GET /api/problems/daily returns calm paused state without problem or countdown timer', async () => {
    const res = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paused).toBe(true);
    expect(res.body.data.message).toBe('Daily challenges are not live yet. We will announce the start.');
    expect(res.body.data.problem).toBeNull();
    expect(res.body.data.secondsUntilNextReset).toBeNull();
    expect(res.body.data.endsAt).toBeNull();
  });

  it('4. POST /api/submissions/run rejects daily challenge execution when paused', async () => {
    const res = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testDailyProblem.id,
        code: '#include <stdio.h>\nint main() { printf("1\\n"); return 0; }',
        stdin: '1\n',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CHALLENGE_NOT_AVAILABLE');
  });

  it('5. POST /api/submissions/submit rejects daily submissions when paused', async () => {
    const res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testDailyProblem.id,
        code: '#include <stdio.h>\nint main() { return 0; }',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CHALLENGE_NOT_AVAILABLE');
  });

  it('6. POST /api/uploads rejects daily uploads when paused', async () => {
    const validBase64 = Buffer.from('dummy file content').toString('base64');
    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: testDailyProblem.id,
        studentNote: 'Testing paused upload',
        files: [
          {
            mimeType: 'application/pdf',
            dataBase64: validBase64,
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CHALLENGE_NOT_AVAILABLE');
  });

  it('7. GET /api/leaderboard for today and yesterday returns neutral paused state', async () => {
    // Today tab
    const resToday = await request(app)
      .get('/api/leaderboard?tab=today')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resToday.status).toBe(200);
    expect(resToday.body.success).toBe(true);
    expect(resToday.body.data.dailyChallengePaused).toBe(true);
    expect(resToday.body.data.paused).toBe(true);
    expect(resToday.body.data.leaderboard).toEqual([]);
    expect(resToday.body.data.pinnedOwnRow).toBeNull();
    expect(resToday.body.data.selectedDay.challengeTitle).toBe(
      'Daily challenges are not live yet. We will announce the start.'
    );

    // Yesterday tab
    const resYesterday = await request(app)
      .get('/api/leaderboard?tab=yesterday')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resYesterday.status).toBe(200);
    expect(resYesterday.body.success).toBe(true);
    expect(resYesterday.body.data.dailyChallengePaused).toBe(true);
    expect(resYesterday.body.data.leaderboard).toEqual([]);
  });

  it('8. Streaks and rolling freezes are protected while paused (missed days do not break streak)', async () => {
    const todayIST = getChallengeDayIST();
    const result = await evaluateMissedChallengeDay(studentId, todayIST);

    expect(result.eventType).toBe('ADMIN_PAUSE_PROTECTED');
    expect(result.pausedByAdmin).toBe(true);
    expect(result.streakReset).toBe(false);
    expect(result.freezeUsed).toBe(false);
    expect(result.streakAfter).toBe(5);

    // Verify rolling 7-day freeze was NOT consumed
    const freezeAvailable = isRollingFreezeAvailable(studentId, todayIST);
    expect(freezeAvailable).toBe(true);
  });

  it('9. Daily finalization scheduler is a no-op while paused', async () => {
    const finalizationResult = await runDailyFinalizationJob();
    expect(finalizationResult.success).toBe(true);
    expect(finalizationResult.totalSolvers).toBe(0);
    expect(finalizationResult.summariesWritten).toBe(0);
  });

  it('10. Admin preview returns system pause status and scheduled pool count', async () => {
    const res = await request(app)
      .get('/api/admin/daily-system/preview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dailyChallengePaused).toBe(true);
    expect(res.body.data.minRequired).toBe(14);
    expect(typeof res.body.data.scheduledCount).toBe('number');
  });

  it('11. Admin resume is blocked if fewer than 14 validated problems are scheduled', async () => {
    const res = await request(app)
      .post('/api/admin/daily-system/resume')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        adminPassword,
        mode: 'NEXT_1700',
        reason: 'Attempting resume without enough scheduled problems',
      });

    // Currently we only created 1 problem, so scheduledCount < 14
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('At least 14 validated challenges must be scheduled');
  });

  it('12. Admin actions require correct password re-authentication', async () => {
    const res = await request(app)
      .post('/api/admin/daily-system/pause')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        adminPassword: 'WrongPassword!',
        reason: 'Testing bad password',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('incorrect password');
  });

  it('13. Simulated time progression maintains paused invariants across 17:00 IST boundary', async () => {
    // Simulate time advancing across the 17:00 IST boundary
    const nextDay1705 = new Date('2026-10-14T17:05:00+05:30');
    setSimulatedServerTime(nextDay1705);

    // Verify GET /api/problems/daily is still paused
    const res = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.paused).toBe(true);

    // Verify student streak is not reset
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    expect(user?.currentStreak).toBe(5);

    setSimulatedServerTime(null);
  });
});
