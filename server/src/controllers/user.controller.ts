import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getTodayIST } from '../utils/ist.js';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userId = req.user.userId;

    const [user, allUsersCount, higherRankedCount, submissions, totalProblems] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          userBadges: { include: { badge: true } },
        },
      }),
      prisma.user.count({ where: { isBanned: false } }),
      prisma.user.count({
        where: {
          isBanned: false,
          totalPoints: {
            gt: (await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }))?.totalPoints || 0,
          },
        },
      }),
      prisma.submission.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          problem: {
            select: { id: true, title: true, slug: true, difficulty: true },
          },
        },
      }),
      prisma.problem.count({ where: { status: 'PUBLISHED' } }),
    ]);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const rank = higherRankedCount + 1;

    // Difficulty breakdown of solved problems
    const acceptedSubmissions = submissions.filter((s) => s.verdict === 'ACCEPTED');
    const solvedProblemMap = new Map<string, string>();
    for (const sub of acceptedSubmissions) {
      if (!solvedProblemMap.has(sub.problemId)) {
        solvedProblemMap.set(sub.problemId, sub.problem.difficulty);
      }
    }

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const diff of solvedProblemMap.values()) {
      if (diff === 'EASY') easySolved++;
      else if (diff === 'MEDIUM') mediumSolved++;
      else if (diff === 'HARD') hardSolved++;
    }

    // Activity heatmap: group accepted solves by YYYY-MM-DD
    const activityMap: Record<string, number> = {};
    for (const s of submissions) {
      const dateStr = new Date(s.createdAt).toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    }

    // Recent 5 submissions
    const recentSubmissions = submissions.slice(0, 5).map((s) => ({
      id: s.id,
      problemTitle: s.problem.title,
      problemSlug: s.problem.slug,
      difficulty: s.problem.difficulty,
      verdict: s.verdict,
      runtimeMs: s.runtimeMs,
      pointsAwarded: s.pointsAwarded,
      createdAt: s.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          rank,
          totalUsers: allUsersCount,
          totalSolved: solvedProblemMap.size,
          totalProblems,
          difficultyBreakdown: {
            easy: easySolved,
            medium: mediumSolved,
            hard: hardSolved,
          },
        },
        recentSubmissions,
        activityMap,
        badges: user.userBadges.map((ub) => ub.badge),
      },
    });
  } catch (err: any) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
}

export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        college: true,
        avatarUrl: true,
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
        userBadges: {
          include: { badge: true },
        },
        submissions: {
          where: { verdict: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            problem: {
              select: { id: true, title: true, slug: true, difficulty: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const rank =
      (await prisma.user.count({
        where: {
          isBanned: false,
          totalPoints: { gt: user.totalPoints },
        },
      })) + 1;

    // Distinct problems solved
    const solvedMap = new Map<string, string>();
    for (const sub of user.submissions) {
      solvedMap.set(sub.problem.id, sub.problem.difficulty);
    }

    let easy = 0, medium = 0, hard = 0;
    for (const d of solvedMap.values()) {
      if (d === 'EASY') easy++;
      else if (d === 'MEDIUM') medium++;
      else if (d === 'HARD') hard++;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          username: user.username,
          fullName: user.fullName,
          bio: user.bio,
          college: user.college,
          avatarUrl: user.avatarUrl,
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          rank,
          totalSolved: solvedMap.size,
          joinedAt: user.createdAt,
          difficultyBreakdown: { easy, medium, hard },
          badges: user.userBadges.map((ub) => ({
            ...ub.badge,
            unlockedAt: ub.unlockedAt,
          })),
          recentSolves: user.submissions.map((s) => ({
            id: s.id,
            problemTitle: s.problem.title,
            problemSlug: s.problem.slug,
            difficulty: s.problem.difficulty,
            createdAt: s.createdAt,
          })),
        },
      },
    });
  } catch (err: any) {
    console.error('Get user profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { fullName, bio, college, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        fullName: fullName || undefined,
        bio: bio !== undefined ? bio : undefined,
        college: college !== undefined ? college : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        college: true,
        avatarUrl: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated },
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

export async function getAllBadges(req: AuthRequest, res: Response): Promise<void> {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { requirementCount: 'asc' },
    });

    let unlockedSlugs = new Set<string>();
    if (req.user) {
      const userBadges = await prisma.userBadge.findMany({
        where: { userId: req.user.userId },
        include: { badge: true },
      });
      unlockedSlugs = new Set(userBadges.map((ub) => ub.badge.slug));
    }

    const result = badges.map((b) => ({
      ...b,
      isUnlocked: unlockedSlugs.has(b.slug),
    }));

    res.status(200).json({ success: true, data: { badges: result } });
  } catch (err: any) {
    console.error('Get badges error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
}
