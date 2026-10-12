import { prisma } from '../utils/prisma.js';

export async function calculatePointsAndAward(
  userId: string,
  problemId: string,
  submissionId?: string
): Promise<{ pointsAwarded: number; isFirstSolve: boolean; isDailyBonus: boolean }> {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
  });
  if (!problem) throw new Error('Problem not found');

  // If this exact submission was already awarded points before (e.g. during an admin rejudge),
  // preserve its existing pointsAwarded without incrementing user.totalPoints again.
  if (submissionId) {
    const currentSub = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { pointsAwarded: true },
    });
    if (currentSub && currentSub.pointsAwarded > 0) {
      return {
        pointsAwarded: currentSub.pointsAwarded,
        isFirstSolve: false,
        isDailyBonus: false,
      };
    }
  }

  // Check if user has already solved or been awarded points for this problem on any other submission or approved upload
  const [previousAccepted, previousApprovedUpload] = await Promise.all([
    prisma.submission.findFirst({
      where: {
        userId,
        problemId,
        ...(submissionId ? { id: { not: submissionId } } : {}),
        OR: [{ verdict: 'ACCEPTED' }, { pointsAwarded: { gt: 0 } }],
      },
    }),
    prisma.uploadedSolution.findFirst({
      where: {
        userId,
        problemId,
        OR: [{ status: 'APPROVED' }, { pointsAwarded: { gt: 0 } }],
      },
    }),
  ]);

  const isFirstSolve = !previousAccepted && !previousApprovedUpload;

  // If already solved, award 0 points to prevent point farming
  if (!isFirstSolve) {
    return { pointsAwarded: 0, isFirstSolve: false, isDailyBonus: false };
  }

  // Single Visible Question Rule: Points are awarded strictly by difficulty (no same-day bonus, no 70% late catch-up points)
  const points = problem.basePoints;

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
    isDailyBonus: false,
  };
}
