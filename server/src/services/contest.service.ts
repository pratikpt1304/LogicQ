import { prisma } from '../utils/prisma.js';

export async function getContestScoreboardData(contestId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      problems: {
        include: { problem: true },
        orderBy: { orderIndex: 'asc' },
      },
      participants: {
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, college: true },
          },
        },
        orderBy: [{ score: 'desc' }, { penaltyTime: 'asc' }],
      },
    },
  });

  if (!contest) throw new Error('Contest not found');

  return {
    contest: {
      id: contest.id,
      title: contest.title,
      slug: contest.slug,
      status: contest.status,
      startTime: contest.startTime,
      endTime: contest.endTime,
    },
    problems: contest.problems.map((cp) => ({
      id: cp.problem.id,
      slug: cp.problem.slug,
      title: cp.problem.title,
      points: cp.points,
      orderIndex: cp.orderIndex,
    })),
    standings: contest.participants.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      user: p.user,
      score: p.score,
      penaltyTime: p.penaltyTime,
    })),
  };
}
