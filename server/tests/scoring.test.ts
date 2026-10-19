import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { updateUserStreak } from '../src/services/streak.service.js';
import { getTodayIST, getYesterdayIST, getChallengeDayIST, addDaysIST } from '../src/utils/ist.js';

describe('Scoring & Streak Engine', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: `streak_test_${Date.now()}`,
        email: `streak_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        fullName: 'Streak Tester',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('should initialize streak to 1 on first solve', async () => {
    const result = await updateUserStreak(testUserId);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isNewDay).toBe(true);
  });

  it('should not increment streak if solved multiple times on the same day', async () => {
    const result = await updateUserStreak(testUserId);
    expect(result.currentStreak).toBe(1);
    expect(result.isNewDay).toBe(false);
  });

  it('should increment streak when solved on consecutive days', async () => {
    // Manually set lastSolvedDate to previous challenge day under 17:00 IST rule
    const prevChallengeDay = addDaysIST(getChallengeDayIST(), -1);
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        currentStreak: 3,
        lastSolvedDate: prevChallengeDay,
      },
    });

    const result = await updateUserStreak(testUserId);
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
    expect(result.isNewDay).toBe(true);
  });

  it('should reset streak to 1 if a day was missed', async () => {
    // Set lastSolvedDate to 3 days ago
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        currentStreak: 5,
        longestStreak: 5,
        lastSolvedDate: '2020-01-01',
      },
    });

    const result = await updateUserStreak(testUserId);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(5); // Longest streak preserved!
    expect(result.isNewDay).toBe(true);
  });

  it('should award base points on first solve and prevent point-farming on repeat attempts', async () => {
    const { calculatePointsAndAward } = await import('../src/services/scoring.service.js');

    // Create a dummy practice problem
    const prob = await prisma.problem.create({
      data: {
        slug: `test-scoring-prob-${Date.now()}`,
        title: 'Scoring Test Problem',
        description: 'Test problem',
        difficulty: 'EASY',
        category: 'Test',
        tags: '["test"]',
        starterCode: '#include <stdio.h>',
        solutionCode: '#include <stdio.h>',
        isPractice: true,
        basePoints: 10,
        status: 'PUBLISHED',
      },
    });

    // 1. First solve should award 10 points
    const firstSolve = await calculatePointsAndAward(testUserId, prob.id);
    expect(firstSolve.pointsAwarded).toBe(10);
    expect(firstSolve.isFirstSolve).toBe(true);

    // Create submission record simulating this solve
    const sub1 = await prisma.submission.create({
      data: {
        userId: testUserId,
        problemId: prob.id,
        code: '#include <stdio.h>',
        language: 'c',
        verdict: 'ACCEPTED',
        pointsAwarded: 10,
        submissionType: 'PRACTICE',
      },
    });

    // 2. Second attempt on the same problem should award 0 points (anti-farming)
    const secondSolve = await calculatePointsAndAward(testUserId, prob.id);
    expect(secondSolve.pointsAwarded).toBe(0);
    expect(secondSolve.isFirstSolve).toBe(false);

    // Cleanup
    await prisma.submission.delete({ where: { id: sub1.id } });
    await prisma.problem.delete({ where: { id: prob.id } });
  });

  it('should backfill points for previous accepted submissions with 0 points', async () => {
    const { backfillPracticeSubmissionPoints } = await import('../src/services/scoring.service.js');

    const prob = await prisma.problem.create({
      data: {
        slug: `test-backfill-prob-${Date.now()}`,
        title: 'Backfill Test Problem',
        description: 'Test problem',
        difficulty: 'MEDIUM',
        category: 'Test',
        tags: '["test"]',
        starterCode: '#include <stdio.h>',
        solutionCode: '#include <stdio.h>',
        isPractice: true,
        basePoints: 20,
        status: 'PUBLISHED',
      },
    });

    // Create unrewarded accepted submission
    const unrewardedSub = await prisma.submission.create({
      data: {
        userId: testUserId,
        problemId: prob.id,
        code: '#include <stdio.h>',
        language: 'c',
        verdict: 'ACCEPTED',
        pointsAwarded: 0,
        submissionType: 'PRACTICE',
      },
    });

    const backfillResult = await backfillPracticeSubmissionPoints();
    expect(backfillResult.updatedCount).toBeGreaterThanOrEqual(1);

    const refreshedSub = await prisma.submission.findUnique({ where: { id: unrewardedSub.id } });
    expect(refreshedSub?.pointsAwarded).toBe(20);

    // Cleanup
    await prisma.submission.delete({ where: { id: unrewardedSub.id } });
    await prisma.problem.delete({ where: { id: prob.id } });
  });
});
