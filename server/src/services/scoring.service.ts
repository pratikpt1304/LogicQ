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

  // Check if user has already been awarded points for this problem on any other submission or approved upload
  const [previousAwardedSub, previousApprovedUpload] = await Promise.all([
    prisma.submission.findFirst({
      where: {
        userId,
        problemId,
        ...(submissionId ? { id: { not: submissionId } } : {}),
        pointsAwarded: { gt: 0 },
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

  const hasAlreadyReceivedPoints = Boolean(previousAwardedSub || previousApprovedUpload);

  // If already awarded points for this problem, award 0 points to prevent point farming
  if (hasAlreadyReceivedPoints) {
    return { pointsAwarded: 0, isFirstSolve: false, isDailyBonus: false };
  }

  // Base points from problem definition (fallback to difficulty standard if basePoints <= 0)
  let points = problem.basePoints;
  if (!points || points <= 0) {
    if (problem.difficulty === 'HARD') points = 30;
    else if (problem.difficulty === 'MEDIUM') points = 20;
    else points = 10;
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
    isDailyBonus: false,
  };
}

/**
 * Backfill points for any previous ACCEPTED submissions that were awarded 0 points.
 * Runs once on server startup to credit students who solved practice problems earlier.
 */
export async function backfillPracticeSubmissionPoints(): Promise<{ updatedCount: number; pointsTotal: number }> {
  try {
    const unrewardedAccepted = await prisma.submission.findMany({
      where: {
        verdict: 'ACCEPTED',
        pointsAwarded: 0,
      },
      include: {
        problem: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unrewardedAccepted.length === 0) {
      return { updatedCount: 0, pointsTotal: 0 };
    }

    let updatedCount = 0;
    let pointsTotal = 0;

    for (const sub of unrewardedAccepted) {
      // Check if user already got points for this problem elsewhere
      const existingAwarded = await prisma.submission.findFirst({
        where: {
          userId: sub.userId,
          problemId: sub.problemId,
          pointsAwarded: { gt: 0 },
        },
      });

      if (!existingAwarded) {
        let pts = sub.problem.basePoints;
        if (!pts || pts <= 0) {
          if (sub.problem.difficulty === 'HARD') pts = 30;
          else if (sub.problem.difficulty === 'MEDIUM') pts = 20;
          else pts = 10;
        }

        await prisma.$transaction([
          prisma.submission.update({
            where: { id: sub.id },
            data: { pointsAwarded: pts },
          }),
          prisma.user.update({
            where: { id: sub.userId },
            data: { totalPoints: { increment: pts } },
          }),
        ]);

        updatedCount++;
        pointsTotal += pts;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Scoring] Backfilled ${updatedCount} accepted submissions with ${pointsTotal} points.`);
    }

    return { updatedCount, pointsTotal };
  } catch (err) {
    console.warn('[Scoring] Backfill notice:', err);
    return { updatedCount: 0, pointsTotal: 0 };
  }
}

