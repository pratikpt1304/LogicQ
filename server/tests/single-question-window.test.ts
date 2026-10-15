import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { evaluateSubmission } from '../src/services/submission-evaluator.js';
import {
  setSimulatedServerTime,
  getChallengeDayIST,
} from '../src/utils/ist.js';
import {
  setAutoScheduleSyncEnabled,
  ensureCurrentWeekSchedule,
} from '../src/controllers/problem.controller.js';
import {
  evaluateMissedChallengeDay,
  setAdminPauseDay,
} from '../src/services/streak.service.js';
import { setDailyChallengePausedForTesting } from '../src/services/system-config.service.js';

describe('Single Visible Question Rule (17:00 IST Cutoff, Pre-Cutoff Judging, Upload Post-Freeze Correction, Streaks & Auto-Fallback)', () => {
  const ts = Date.now();

  let studentId: string;
  let studentToken: string;
  let adminId: string;
  let adminToken: string;

  let challengeAId: string;
  let challengeASlug: string;
  let challengeABasePoints: number;
  let challengeBId: string;
  let challengeBSlug: string;
  let challengeBBasePoints: number;
  let futureChallengeId: string;
  let futureChallengeSlug: string;

  // Backup original scheduledDates of all problems so we restore cleanly in afterAll
  let originalScheduleMap: Array<{ id: string; scheduledDate: string | null; status: string }> = [];

  // Fixed test dates:
  // Day A = "2026-10-10" (window: 2026-10-10 17:00:00 IST -> 2026-10-11 16:59:59 IST)
  // Day B = "2026-10-11" (window: 2026-10-11 17:00:00 IST -> 2026-10-12 16:59:59 IST)
  // Day Future = "2026-10-12" (window: 2026-10-12 17:00:00 IST -> ...)
  const TIME_16_59_59_IST = new Date('2026-10-11T16:59:59+05:30');
  const TIME_17_00_00_IST = new Date('2026-10-11T17:00:00+05:30');
  const TIME_17_00_03_IST = new Date('2026-10-11T17:00:03+05:30');

  beforeAll(async () => {
    setDailyChallengePausedForTesting(false);
    await ensureCurrentWeekSchedule();

    const allProbs = await prisma.problem.findMany({
      select: { id: true, slug: true, scheduledDate: true, status: true, basePoints: true },
    });
    originalScheduleMap = allProbs.map((p) => ({
      id: p.id,
      scheduledDate: p.scheduledDate,
      status: p.status,
    }));

    // Disable automatic schedule sync so our simulated 2026-10-10 / 2026-10-11 schedule stays exact
    setAutoScheduleSyncEnabled(false);

    // Clear scheduledDates on all problems first
    await prisma.problem.updateMany({
      data: { scheduledDate: null },
    });

    const probA = await prisma.problem.findUnique({ where: { slug: 'pointer-swap-in-place' } });
    const probB = await prisma.problem.findUnique({ where: { slug: 'sum-of-multiples' } });
    const probFuture = await prisma.problem.findUnique({ where: { slug: 'valid-parentheses-stack' } });

    expect(probA).not.toBeNull();
    expect(probB).not.toBeNull();
    expect(probFuture).not.toBeNull();

    challengeAId = probA!.id;
    challengeASlug = probA!.slug;
    challengeABasePoints = probA!.basePoints;

    challengeBId = probB!.id;
    challengeBSlug = probB!.slug;
    challengeBBasePoints = probB!.basePoints;

    futureChallengeId = probFuture!.id;
    futureChallengeSlug = probFuture!.slug;

    await Promise.all([
      prisma.problem.update({
        where: { id: challengeAId },
        data: { scheduledDate: '2026-10-10', status: 'PUBLISHED' },
      }),
      prisma.problem.update({
        where: { id: challengeBId },
        data: { scheduledDate: '2026-10-11', status: 'PUBLISHED' },
      }),
      prisma.problem.update({
        where: { id: futureChallengeId },
        data: { scheduledDate: '2026-10-12', status: 'PUBLISHED' },
      }),
    ]);

    const [student, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `single_q_stu_${ts}`,
          prn: String(850000000000 + (ts % 10000000000)).slice(0, 12),
          email: `single_q_stu_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Single Question Student',
          displayName: 'SingleQCoder',
          shortId: 'SQ01',
          college: 'Sanjivani University',
          department: 'CSE',
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
          username: `single_q_admin_${ts}`,
          email: `single_q_admin_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Single Question Admin',
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
    setSimulatedServerTime(null);
    setAutoScheduleSyncEnabled(true);
    delete process.env.HIDE_ENDED_PROBLEM_TITLES;

    // Restore original problem schedules
    for (const orig of originalScheduleMap) {
      await prisma.problem.update({
        where: { id: orig.id },
        data: { scheduledDate: orig.scheduledDate, status: orig.status },
      });
    }

    const userIds = [studentId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.adminAuditLog.deleteMany({
        where: { adminId: { in: userIds } },
      });
      await prisma.uploadReview.deleteMany({
        where: { reviewerId: { in: userIds } },
      });
      await prisma.uploadedSolution.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.submissionTestCaseResult.deleteMany({
        where: { submission: { userId: { in: userIds } } },
      });
      await prisma.submission.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    setDailyChallengePausedForTesting(true);
  });

  it('1. At 16:59:59 IST: Student sees ONLY Challenge A, can Run code on Challenge A, and Challenge B returns 404 without statement/samples/tests', async () => {
    setSimulatedServerTime(TIME_16_59_59_IST);
    expect(getChallengeDayIST()).toBe('2026-10-10');

    const dailyRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.data.problem.id).toBe(challengeAId);
    expect(dailyRes.body.data.problem.slug).toBe(challengeASlug);
    expect(dailyRes.body.data.currentWeek).toBeUndefined();
    expect(dailyRes.body.data.secondsUntilNextReset).toBe(1);

    // Student can also open Challenge A by slug at 16:59:59 IST
    const slugARes = await request(app)
      .get(`/api/problems/${challengeASlug}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(slugARes.status).toBe(200);
    expect(slugARes.body.data.problem.id).toBe(challengeAId);

    // Student CANNOT open Challenge B (scheduled for 2026-10-11 17:00 IST) at 16:59:59 IST
    const slugBRes = await request(app)
      .get(`/api/problems/${challengeBSlug}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(slugBRes.status).toBe(404);
    expect(slugBRes.body.data).toBeUndefined();

    // Student CAN run code against Challenge A at 16:59:59 IST
    const runRes = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: challengeAId,
        code: '#include <stdio.h>\nint main(){ printf("20 10\\n30\\n"); return 0; }',
        stdin: '10 20',
      });
    expect(runRes.status).toBe(200);
    expect(runRes.body.data.stdout).toContain('20 10');
  });

  it('2. Pre-cutoff submission at 16:59:59 IST whose judging finishes at 17:00:03 IST still records verdict, awards difficulty-only points, and credits streak for Challenge A’s day', async () => {
    // Student submits solution to Challenge A at 16:59:59 IST
    setSimulatedServerTime(TIME_16_59_59_IST);

    const validSwapCode = `#include <stdio.h>
void swap(long long *x, long long *y) { long long t = *x; *x = *y; *y = t; }
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    swap(&a, &b);
    printf("%lld %lld\\n%lld\\n", a, b, a + b);
    return 0;
}`;

    const submitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: challengeAId,
        code: validSwapCode,
      });

    expect(submitRes.status).toBe(202);
    const submissionId = submitRes.body.data.submissionId;
    expect(submissionId).toBeDefined();

    // Now clock crosses 17:00:00 IST -> 17:00:03 IST BEFORE evaluation finishes!
    setSimulatedServerTime(TIME_17_00_03_IST);
    expect(getChallengeDayIST()).toBe('2026-10-11');

    await evaluateSubmission(submissionId);

    // Student polls GET /api/submissions/:id at 17:00:03 IST and sees their ACCEPTED verdict
    const pollRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(pollRes.status).toBe(200);
    const sub = pollRes.body.data.submission;
    expect(sub.verdict).toBe('ACCEPTED');
    // Points awarded strictly by difficulty (basePoints), no +15 same-day bonus or 70% catch-up
    expect(sub.pointsAwarded).toBe(challengeABasePoints);
    // Because Challenge A has now ended at 17:00:00 IST, its slug is redacted in the submission response
    expect(sub.problem.isEnded).toBe(true);
    expect(sub.problem.slug).toBeNull();

    const updatedStudent = await prisma.user.findUnique({ where: { id: studentId } });
    expect(updatedStudent?.totalPoints).toBe(challengeABasePoints);
    expect(updatedStudent?.currentStreak).toBe(1);
    // Streak attributed to Challenge A's day (2026-10-10), NOT 2026-10-11!
    expect(updatedStudent?.lastSolvedDate).toBe('2026-10-10');
  }, 25000);

  it('3. At 17:00:00 IST: Student sees ONLY Challenge B, Challenge A returns 410 ("This challenge has ended") with no statement/samples/tests, and Run/Submit/Upload on Challenge A are rejected with 403', async () => {
    setSimulatedServerTime(TIME_17_00_00_IST);
    expect(getChallengeDayIST()).toBe('2026-10-11');

    // 1. GET /api/problems/daily now returns Challenge B
    const dailyRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.data.problem.id).toBe(challengeBId);
    expect(dailyRes.body.data.problem.slug).toBe(challengeBSlug);

    // 2. GET /api/problems/:slugA returns 410 CHALLENGE_ENDED with NO statement, samples, or tests
    const endedSlugRes = await request(app)
      .get(`/api/problems/${challengeASlug}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(endedSlugRes.status).toBe(410);
    expect(endedSlugRes.body.code).toBe('CHALLENGE_ENDED');
    expect(endedSlugRes.body.ended).toBe(true);
    expect(endedSlugRes.body.message).toContain('This challenge has ended');
    expect(endedSlugRes.body.todayChallengeUrl).toBe('/challenge');
    expect(endedSlugRes.body.data).toBeUndefined();

    // Also check by Challenge A ID
    const endedIdRes = await request(app)
      .get(`/api/problems/${challengeAId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(endedIdRes.status).toBe(410);
    expect(endedIdRes.body.data).toBeUndefined();

    // 3. Run, Submit, and Upload against Challenge A at 17:00:00 IST are all rejected with 403
    const [runOldRes, submitOldRes, uploadOldRes] = await Promise.all([
      request(app)
        .post('/api/submissions/run')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          problemId: challengeAId,
          code: '#include <stdio.h>\nint main(){return 0;}',
          stdin: '10 20',
        }),
      request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          problemId: challengeAId,
          code: '#include <stdio.h>\nint main(){return 0;}',
        }),
      request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          problemId: challengeAId,
          files: [
            {
              name: 'late.png',
              mimeType: 'image/png',
              dataBase64: Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
              ]).toString('base64'),
            },
          ],
        }),
    ]);

    expect(runOldRes.status).toBe(403);
    expect(submitOldRes.status).toBe(403);
    expect(uploadOldRes.status).toBe(403);

    // 4. Admin can still open Challenge A and future challenges
    const adminEndedRes = await request(app)
      .get(`/api/problems/${challengeASlug}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminEndedRes.status).toBe(200);
    expect(adminEndedRes.body.data.problem.id).toBe(challengeAId);
  });

  it('4. Submission History: shows own submissions without statements/samples/re-open slugs, and supports HIDE_ENDED_PROBLEM_TITLES config flag', async () => {
    setSimulatedServerTime(TIME_17_00_03_IST);

    // Default: HIDE_ENDED_PROBLEM_TITLES is false -> shows Challenge A title, but slug is null and no statement/samples
    delete process.env.HIDE_ENDED_PROBLEM_TITLES;
    const histDefault = await request(app)
      .get('/api/submissions/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(histDefault.status).toBe(200);
    const subDefault = histDefault.body.data.submissions[0];
    expect(subDefault).toBeDefined();
    expect(subDefault.problem.title).toBe('In-Place Pointer Swap & Sum');
    expect(subDefault.problem.slug).toBeNull();
    expect(subDefault.problem.isEnded).toBe(true);
    expect(subDefault.problem.description).toBeUndefined();
    expect(subDefault.problem.testCases).toBeUndefined();

    // Enable HIDE_ENDED_PROBLEM_TITLES=true -> hides ended problem title as "Past Challenge"
    process.env.HIDE_ENDED_PROBLEM_TITLES = 'true';
    const histHidden = await request(app)
      .get('/api/submissions/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(histHidden.status).toBe(200);
    const subHidden = histHidden.body.data.submissions[0];
    expect(subHidden.problem.title).toBe('Past Challenge');
    expect(subHidden.problem.slug).toBeNull();
    delete process.env.HIDE_ENDED_PROBLEM_TITLES;
  });

  it('5. Uploaded Solution submitted before 17:00 IST for Challenge B, approved after the week freezes, credits Challenge B’s day and writes an append-only WEEKLY_CORRECTION_CREATED audit log', async () => {
    // At 2026-10-11 18:00:00 IST (inside Challenge B's 24h window), student uploads a solution for Challenge B
    const challengeBActiveTime = new Date('2026-10-11T18:00:00+05:30');
    setSimulatedServerTime(challengeBActiveTime);
    expect(getChallengeDayIST()).toBe('2026-10-11');

    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const uploadRes = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: challengeBId,
        note: 'Solved Sum of Multiples on paper before 17:00 IST cutoff.',
        files: [
          {
            name: 'solution_b.png',
            mimeType: 'image/png',
            dataBase64: validPngBytes.toString('base64'),
          },
        ],
      });

    expect(uploadRes.status).toBe(201);
    const uploadId = uploadRes.body.data.upload.id;

    // Advance server clock by 8 days to the following week (after the week containing 2026-10-11 has frozen!)
    const postFreezeTime = new Date('2026-10-20T12:00:00+05:30');
    setSimulatedServerTime(postFreezeTime);

    const reviewRes = await request(app)
      .put(`/api/admin/uploads/${uploadId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        pointsAwarded: challengeBBasePoints,
        reviewerComment: 'Approved after weekly freeze.',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.postFreezeCorrection).toBe(true);

    // Verify Student's streak incremented from 1 (2026-10-10) -> 2 (2026-10-11) based on upload.submittedAt!
    const studentAfterApprove = await prisma.user.findUnique({ where: { id: studentId } });
    expect(studentAfterApprove?.totalPoints).toBe(challengeABasePoints + challengeBBasePoints);
    expect(studentAfterApprove?.currentStreak).toBe(2);
    expect(studentAfterApprove?.lastSolvedDate).toBe('2026-10-11');

    // Verify append-only WEEKLY_CORRECTION_CREATED record exists in AdminAuditLog
    const correctionLog = await prisma.adminAuditLog.findFirst({
      where: {
        action: 'WEEKLY_CORRECTION_CREATED',
        targetId: uploadId,
      },
    });
    expect(correctionLog).not.toBeNull();
  });

  it('6. Streak Freeze & Admin Pause Day: 1 missed day per week uses automatic freeze, admin pause days protect streaks, and a 2nd missed day in the same week resets streak to 0', async () => {
    // Student currently has currentStreak = 2, lastSolvedDate = '2026-10-11'
    // 1. Mark '2026-10-12' as an Admin Pause Day (exam/outage) -> streak stays 2 without consuming weekly freeze
    setAdminPauseDay('2026-10-12', true);
    const pauseRes = await evaluateMissedChallengeDay(studentId, '2026-10-12');
    expect(pauseRes.pausedByAdmin).toBe(true);
    expect(pauseRes.freezeUsed).toBe(false);
    expect(pauseRes.streakReset).toBe(false);
    expect(pauseRes.currentStreak).toBe(2);

    // 2. Student misses '2026-10-13' (first unpaused miss in the week) -> consumes the 1/week automatic streak freeze
    const freezeRes = await evaluateMissedChallengeDay(studentId, '2026-10-13');
    expect(freezeRes.freezeUsed).toBe(true);
    expect(freezeRes.streakReset).toBe(false);
    expect(freezeRes.currentStreak).toBe(2);

    // 3. Student misses '2026-10-14' (second miss in the same week) -> weekly freeze already used, streak resets to 0
    const resetRes = await evaluateMissedChallengeDay(studentId, '2026-10-14');
    expect(resetRes.freezeUsed).toBe(false);
    expect(resetRes.streakReset).toBe(true);
    expect(resetRes.currentStreak).toBe(0);
  });

  it('7. Missing Scheduled Question at 17:00 IST & Season Complete: auto-assigns next unscheduled PUBLISHED problem in book order, and returns seasonComplete when all problems are exhausted', async () => {
    // Set server time to a date with no scheduled problem ('2026-10-25')
    const unscheduledDayTime = new Date('2026-10-25T18:00:00+05:30');
    setSimulatedServerTime(unscheduledDayTime);
    expect(getChallengeDayIST()).toBe('2026-10-25');

    // Ensure at least one unscheduled PUBLISHED problem exists
    const dailyAutoRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(dailyAutoRes.status).toBe(200);
    expect(dailyAutoRes.body.data.seasonComplete).toBe(false);
    expect(dailyAutoRes.body.data.problem).toBeDefined();
    expect(dailyAutoRes.body.data.problem.scheduledDate).toBe('2026-10-25');

    // Now mark all PUBLISHED problems as already scheduled in the past ('2026-09-01') and advance to '2026-10-26'
    await prisma.problem.updateMany({
      where: { status: 'PUBLISHED' },
      data: { scheduledDate: '2026-09-01' },
    });

    setSimulatedServerTime(new Date('2026-10-26T18:00:00+05:30'));
    const seasonCompleteRes = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(seasonCompleteRes.status).toBe(200);
    expect(seasonCompleteRes.body.data.seasonComplete).toBe(true);
    expect(seasonCompleteRes.body.data.problem).toBeNull();
  });
});
