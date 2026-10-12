import { prisma } from '../utils/prisma.js';
import { FEATURES } from '../config/features.config.js';

export async function evaluateAndAwardBadges(userId: string): Promise<string[]> {
  if (!FEATURES.BADGES) {
    return [];
  }
  const newlyUnlocked: string[] = [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userBadges: { include: { badge: true } },
      submissions: {
        where: { verdict: 'ACCEPTED' },
        include: { problem: true },
      },
    },
  });

  if (!user) return [];

  const existingBadgeSlugs = new Set(user.userBadges.map((ub) => ub.badge.slug));

  // Distinct solved problems
  const solvedProblemIds = new Set(user.submissions.map((s) => s.problemId));
  const distinctSolvedCount = solvedProblemIds.size;

  // Distinct HARD solved problems
  const hardSolvedCount = new Set(
    user.submissions.filter((s) => s.problem.difficulty === 'HARD').map((s) => s.problemId)
  ).size;

  // 1. First Blood (1 solve)
  if (!existingBadgeSlugs.has('first-blood') && distinctSolvedCount >= 1) {
    await awardBadge(userId, 'first-blood');
    newlyUnlocked.push('first-blood');
  }

  // 2. 7-Day Streak
  if (!existingBadgeSlugs.has('streak-7') && user.currentStreak >= 7) {
    await awardBadge(userId, 'streak-7');
    newlyUnlocked.push('streak-7');
  }

  // 3. 30-Day Streak
  if (!existingBadgeSlugs.has('streak-30') && user.currentStreak >= 30) {
    await awardBadge(userId, 'streak-30');
    newlyUnlocked.push('streak-30');
  }

  // 4. Decathlete (10 solved)
  if (!existingBadgeSlugs.has('solved-10') && distinctSolvedCount >= 10) {
    await awardBadge(userId, 'solved-10');
    newlyUnlocked.push('solved-10');
  }

  // 5. Hard Solver (3 hard solved)
  if (!existingBadgeSlugs.has('hard-solver') && hardSolvedCount >= 3) {
    await awardBadge(userId, 'hard-solver');
    newlyUnlocked.push('hard-solver');
  }

  return newlyUnlocked;
}

async function awardBadge(userId: string, badgeSlug: string) {
  const badge = await prisma.badge.findUnique({ where: { slug: badgeSlug } });
  if (!badge) return;

  await prisma.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id,
      },
    },
    update: {},
    create: {
      userId,
      badgeId: badge.id,
    },
  });
}
