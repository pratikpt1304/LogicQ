import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { evaluateSubmission } from '../src/services/submission-evaluator.js';

describe('Mode B Full Debugging Sweep Regressions (BUG-08 .. BUG-11)', () => {
  const ts = Date.now();
  let studentId: string;
  let studentUsername: string;
  let studentToken: string;
  let highPointAdminId: string;
  let problemId: string;
  let contestId: string;

  beforeAll(async () => {
    // Ensure 'first-blood' badge exists in DB
    await prisma.badge.upsert({
      where: { slug: 'first-blood' },
      update: {},
      create: {
        slug: 'first-blood',
        name: 'First Blood',
        description: 'Solve your first C problem',
        iconName: 'Trophy',
        category: 'MILESTONE',
        requirementCount: 1,
      },
    });

    const [student, admin] = await Promise.all([
      prisma.user.create({
        data: {
          username: `dbg_stu_${ts}`,
          email: `dbg_stu_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'Debug Student',
          role: 'STUDENT',
          totalPoints: 0,
        },
      }),
      prisma.user.create({
        data: {
          username: `dbg_admin_${ts}`,
          email: `dbg_admin_${ts}@sanjivani.org.in`,
          passwordHash: 'dummy_hash',
          fullName: 'High Point Admin',
          role: 'ADMIN',
          totalPoints: 99999,
        },
      }),
    ]);

    studentId = student.id;
    studentUsername = student.username;
    highPointAdminId = admin.id;

    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
      username: student.username,
    });

    const problem = await prisma.problem.create({
      data: {
        slug: `dbg-prob-${ts}`,
        title: 'Debug Matrix Print',
        description: 'Print two rows of numbers.',
        difficulty: 'EASY',
        tags: '["arrays","debug"]',
        status: 'PUBLISHED',
        basePoints: 20,
        isDaily: false,
        starterCode: '#include <stdio.h>\nint main(){return 0;}',
        testCases: {
          create: [
            {
              input: '2',
              expectedOutput: '10 20\n30 40',
              isHidden: false,
              orderIndex: 0,
            },
          ],
        },
      },
    });
    problemId = problem.id;

    const contest = await prisma.contest.create({
      data: {
        title: `Debug Contest ${ts}`,
        slug: `dbg-contest-${ts}`,
        description: 'Contest for testing first-solve and rejudge score idempotency.',
        startTime: new Date(Date.now() - 3600_000),
        endTime: new Date(Date.now() + 3600_000),
        durationMinutes: 120,
        status: 'ONGOING',
        problems: {
          create: [
            {
              problemId: problem.id,
              orderIndex: 0,
              points: 100,
            },
          ],
        },
        participants: {
          create: [
            {
              userId: student.id,
              score: 0,
            },
          ],
        },
      },
    });
    contestId = contest.id;
  });

  afterAll(async () => {
    if (contestId) {
      await prisma.contestParticipant.deleteMany({ where: { contestId } });
      await prisma.contestProblem.deleteMany({ where: { contestId } });
      await prisma.contest.deleteMany({ where: { id: contestId } });
    }
    if (problemId) {
      await prisma.submissionTestCaseResult.deleteMany({
        where: { submission: { problemId } },
      });
      await prisma.submission.deleteMany({ where: { problemId } });
      await prisma.testCase.deleteMany({ where: { problemId } });
      await prisma.problem.deleteMany({ where: { id: problemId } });
    }
    const userIds = [studentId, highPointAdminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.userBadge.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('BUG-08, BUG-09 & BUG-10: normalizes per-line trailing spaces, awards first-blood & contest score on 1st solve, and prevents duplicate points on rejudge', async () => {
    // C program outputs trailing spaces on intermediate lines: "10 20 \n30 40 \n"
    const sub = await prisma.submission.create({
      data: {
        userId: studentId,
        problemId,
        contestId,
        code: '#include <stdio.h>\nint main(){ printf("10 20 \\n30 40 \\n"); return 0; }',
        language: 'c',
        verdict: 'PENDING',
      },
    });

    // 1. Evaluate first solve
    await evaluateSubmission(sub.id);

    const judgedSub = await prisma.submission.findUnique({ where: { id: sub.id } });
    expect(judgedSub?.verdict).toBe('ACCEPTED');
    expect(judgedSub?.pointsAwarded).toBe(25); // 20 base + 5 first-solve bonus

    // User totalPoints is 25
    const userAfterFirst = await prisma.user.findUnique({
      where: { id: studentId },
      include: { userBadges: { include: { badge: true } } },
    });
    expect(userAfterFirst?.totalPoints).toBe(25);

    // BUG-09 check 1: 'first-blood' badge unlocked immediately on 1st solve
    const badgeSlugs = userAfterFirst?.userBadges.map((ub) => ub.badge.slug) || [];
    expect(badgeSlugs).toContain('first-blood');

    // BUG-09 check 2: Contest participant score updated immediately on 1st solve (100 pts)
    const participantAfterFirst = await prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId, userId: studentId } },
    });
    expect(participantAfterFirst?.score).toBe(100);

    // 2. Simulate Admin Rejudge (resets verdict to PENDING and re-runs evaluateSubmission)
    await prisma.submission.update({
      where: { id: sub.id },
      data: { verdict: 'PENDING' },
    });
    await evaluateSubmission(sub.id);

    // BUG-08 check: Rejudging MUST NOT double-award user.totalPoints or contest score
    const userAfterRejudge = await prisma.user.findUnique({ where: { id: studentId } });
    const subAfterRejudge = await prisma.submission.findUnique({ where: { id: sub.id } });
    const participantAfterRejudge = await prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId, userId: studentId } },
    });

    expect(userAfterRejudge?.totalPoints).toBe(25);
    expect(subAfterRejudge?.pointsAwarded).toBe(25);
    expect(participantAfterRejudge?.score).toBe(100);
  }, 30000);

  it('BUG-11: Student Dashboard, Public Profile, and Leaderboard report identical rank, totalUsers, and distinct solvedCount', async () => {
    // Create a second ACCEPTED submission by the same student for the SAME problem (0 points awarded)
    await prisma.submission.create({
      data: {
        userId: studentId,
        problemId,
        code: '#include <stdio.h>\nint main(){ printf("10 20\\n30 40\\n"); return 0; }',
        language: 'c',
        verdict: 'ACCEPTED',
        pointsAwarded: 0,
      },
    });

    const [dashRes, profRes, lbRes] = await Promise.all([
      request(app)
        .get('/api/users/dashboard/stats')
        .set('Authorization', `Bearer ${studentToken}`),
      request(app).get(`/api/users/profile/${studentUsername}`),
      request(app).get('/api/leaderboard?limit=100'),
    ]);

    expect(dashRes.status).toBe(200);
    expect(profRes.status).toBe(200);
    expect(lbRes.status).toBe(200);

    const dashStats = dashRes.body.data.stats;
    const profUser = profRes.body.data.user;
    const lbEntry = lbRes.body.data.leaderboard.find((u: any) => u.id === studentId);

    expect(lbEntry).toBeDefined();

    // 1. Distinct solved problems count is 1 across all 3 views (despite 2 ACCEPTED submissions)
    expect(dashStats.totalSolved).toBe(1);
    expect(profUser.totalSolved).toBe(1);
    expect(lbEntry.solvedCount).toBe(1);

    // 2. Rank and totalUsers match across all 3 views (and exclude the 99999-point ADMIN user)
    expect(dashStats.rank).toBe(profUser.rank);
    expect(dashStats.rank).toBe(lbEntry.rank);
    expect(dashStats.totalUsers).toBe(lbRes.body.data.pagination.total);
  });
});
