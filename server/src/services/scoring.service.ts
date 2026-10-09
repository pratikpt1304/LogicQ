import { prisma } from '../utils/prisma.js';
import { getTodayIST } from '../utils/ist.js';

export async function calculatePointsAndAward(
  userId: string,
  problemId: string
): Promise<{ pointsAwarded: number; isFirstSolve: boolean; isDailyBonus: boolean }> {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
  });
  if (!problem) throw new Error('Problem not found');

  // Check if user has already solved this problem before
  const previousAccepted = await prisma.submission.findFirst({
    where: {
      userId,
      problemId,
      verdict: 'ACCEPTED',
    },
  });

  const isFirstSolve = !previousAccepted;

  // If already solved, award 0 points to prevent point farming
  if (!isFirstSolve) {
    return { pointsAwarded: 0, isFirstSolve: false, isDailyBonus: false };
  }

  let points = problem.basePoints;

  // First-time solve bonus (+5)
  points += 5;

  // Daily challenge bonus (+10 if solved on active scheduled day)
  const todayIST = getTodayIST();
  const isDailyBonus = problem.isDaily && problem.scheduledDate === todayIST;
  if (isDailyBonus) {
    points += 10;
  }

  // Update user's totalPoints
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalPoints: {
        increment: points,
      },
    },
  });

  return {
    pointsAwarded: points,
    isFirstSolve: true,
    isDailyBonus,
  };
}
