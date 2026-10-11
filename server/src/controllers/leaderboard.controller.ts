import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { getChallengeDayIST, getChallengeDayBoundsUTC } from '../utils/ist.js';

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const type = (req.query.type as string) || 'all_time';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    if (type === 'daily') {
      const challengeDay = getChallengeDayIST();
      const { startUTC } = getChallengeDayBoundsUTC(challengeDay);

      // Aggregate points earned during current 17:00 IST challenge day for active non-admin students
      const todaySubmissions = await prisma.submission.findMany({
        where: {
          verdict: 'ACCEPTED',
          createdAt: {
            gte: startUTC,
          },
          user: {
            isBanned: false,
            role: { not: 'ADMIN' },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              college: true,
              currentStreak: true,
            },
          },
        },
      });

      // Sum points and distinct problems solved per user
      const userMap = new Map<
        string,
        { user: any; pointsToday: number; solvedProblemIds: Set<string> }
      >();
      for (const sub of todaySubmissions) {
        const u = userMap.get(sub.userId) || {
          user: sub.user,
          pointsToday: 0,
          solvedProblemIds: new Set<string>(),
        };
        u.pointsToday += sub.pointsAwarded;
        u.solvedProblemIds.add(sub.problemId);
        userMap.set(sub.userId, u);
      }

      const sortedUsers = Array.from(userMap.values())
        .sort((a, b) => b.pointsToday - a.pointsToday)
        .slice(skip, skip + limit)
        .map((item, idx) => ({
          rank: skip + idx + 1,
          ...item.user,
          score: item.pointsToday,
          solvedCount: item.solvedProblemIds.size,
        }));

      res.status(200).json({
        success: true,
        data: {
          type: 'daily',
          leaderboard: sortedUsers,
          total: userMap.size,
        },
      });
      return;
    }

    // Weekly or All-Time Leaderboard
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          isBanned: false,
          role: { not: 'ADMIN' },
        },
        orderBy: [{ totalPoints: 'desc' }, { currentStreak: 'desc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          college: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          submissions: {
            where: { verdict: 'ACCEPTED' },
            select: { problemId: true },
          },
        },
      }),
      prisma.user.count({
        where: {
          isBanned: false,
          role: { not: 'ADMIN' },
        },
      }),
    ]);

    const ranked = users.map((u, idx) => {
      const distinctSolved = new Set(u.submissions.map((s) => s.problemId)).size;
      return {
        rank: skip + idx + 1,
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        college: u.college,
        score: u.totalPoints,
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        solvedCount: distinctSolved,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        type: type === 'weekly' ? 'weekly' : 'all_time',
        leaderboard: ranked,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
}
