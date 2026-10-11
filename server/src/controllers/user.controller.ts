import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getTodayIST } from '../utils/ist.js';

function stripDangerousHtml(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80, 'Full name cannot exceed 80 characters').optional(),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().nullable(),
    college: z.string().max(120, 'College name cannot exceed 120 characters').optional().nullable(),
    avatarUrl: z
      .string()
      .max(500)
      .refine((val) => !val || /^https?:\/\//i.test(val), {
        message: 'Avatar URL must use http:// or https:// protocol',
      })
      .optional()
      .nullable(),
  }),
});

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: { include: { badge: true } },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const [allUsersCount, higherRankedCount, submissions, totalProblems] = await Promise.all([
      prisma.user.count({
        where: { isBanned: false, role: { not: 'ADMIN' } },
      }),
      prisma.user.count({
        where: {
          isBanned: false,
          role: { not: 'ADMIN' },
          OR: [
            { totalPoints: { gt: user.totalPoints } },
            {
              totalPoints: user.totalPoints,
              currentStreak: { gt: user.currentStreak },
            },
            {
              totalPoints: user.totalPoints,
              currentStreak: user.currentStreak,
              createdAt: { lt: user.createdAt },
            },
          ],
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

    const rank = higherRankedCount + 1;

    // Difficulty breakdown of distinct solved problems
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

    // Activity heatmap: group submissions by YYYY-MM-DD
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
          role: { not: 'ADMIN' },
          OR: [
            { totalPoints: { gt: user.totalPoints } },
            {
              totalPoints: user.totalPoints,
              currentStreak: { gt: user.currentStreak },
            },
            {
              totalPoints: user.totalPoints,
              currentStreak: user.currentStreak,
              createdAt: { lt: user.createdAt },
            },
          ],
        },
      })) + 1;

    // Distinct problems solved across ALL accepted submissions (not truncated to 10)
    const solvedMap = new Map<string, string>();
    for (const sub of user.submissions) {
      if (!solvedMap.has(sub.problem.id)) {
        solvedMap.set(sub.problem.id, sub.problem.difficulty);
      }
    }

    let easy = 0,
      medium = 0,
      hard = 0;
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
          recentSolves: user.submissions.slice(0, 10).map((s) => ({
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
        fullName: typeof fullName === 'string' ? stripDangerousHtml(fullName) : undefined,
        bio: typeof bio === 'string' ? stripDangerousHtml(bio) : bio === null ? null : undefined,
        college: typeof college === 'string' ? stripDangerousHtml(college) : college === null ? null : undefined,
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
