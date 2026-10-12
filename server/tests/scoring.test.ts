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
});
