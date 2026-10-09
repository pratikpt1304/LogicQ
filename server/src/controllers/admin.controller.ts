import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getQueue } from '../queue/queue.factory.js';

export const problemAdminSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    category: z.string().default('Algorithms'),
    tags: z.array(z.string()).default([]),
    description: z.string().min(10),
    starterCode: z.string().min(1),
    solutionCode: z.string().optional(),
    timeLimitMs: z.number().min(100).max(10000).default(1000),
    memoryLimitMb: z.number().min(16).max(512).default(64),
    basePoints: z.number().min(5).max(100).default(20),
    isDaily: z.boolean().default(false),
    scheduledDate: z.string().nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
    testCases: z.array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false),
      })
    ).min(1, 'At least one test case is required'),
  }),
});

export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [totalUsers, totalProblems, totalSubmissions, acceptedSubmissions] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { verdict: 'ACCEPTED' } }),
    ]);

    const acceptanceRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // Difficulty distribution
    const difficultyCounts = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: { id: true },
    });

    // Recent 7 days submission volume
    const recentSubmissions = await prisma.submission.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { createdAt: true, verdict: true },
    });

    const dailyTrends: Record<string, { total: number; accepted: number }> = {};
    for (const s of recentSubmissions) {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (!dailyTrends[dateStr]) dailyTrends[dateStr] = { total: 0, accepted: 0 };
      dailyTrends[dateStr].total++;
      if (s.verdict === 'ACCEPTED') dailyTrends[dateStr].accepted++;
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProblems,
          totalSubmissions,
          acceptedSubmissions,
          acceptanceRate,
        },
        difficultyDistribution: difficultyCounts.map((d) => ({
          difficulty: d.difficulty,
          count: d._count.id,
        })),
        dailyTrends,
      },
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
}

export async function getAdminProblems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        testCases: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        problems: problems.map((p) => ({
          ...p,
          tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
          submissionCount: p._count.submissions,
        })),
      },
    });
  } catch (err: any) {
    console.error('Admin problems error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch problems' });
  }
}

export async function createProblem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { testCases, tags, ...problemData } = req.body;

    const existing = await prisma.problem.findUnique({ where: { slug: problemData.slug } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A problem with this slug already exists' });
      return;
    }

    const problem = await prisma.problem.create({
      data: {
        ...problemData,
        tags: JSON.stringify(tags || []),
        testCases: {
          create: testCases.map((tc: any, idx: number) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: !!tc.isHidden,
            orderIndex: idx,
          })),
        },
      },
      include: { testCases: true },
    });

    res.status(201).json({
      success: true,
      message: 'Problem authored successfully',
      data: { problem },
    });
  } catch (err: any) {
    console.error('Create problem error:', err);
    res.status(500).json({ success: false, message: 'Failed to create problem' });
  }
}

export async function updateProblem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { testCases, tags, ...problemData } = req.body;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Problem not found' });
      return;
    }

    const updated = await prisma.problem.update({
      where: { id },
      data: {
        ...problemData,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    // Update test cases if provided
    if (Array.isArray(testCases)) {
      await prisma.testCase.deleteMany({ where: { problemId: id } });
      for (let i = 0; i < testCases.length; i++) {
        await prisma.testCase.create({
          data: {
            problemId: id,
            input: testCases[i].input,
            expectedOutput: testCases[i].expectedOutput,
            isHidden: !!testCases[i].isHidden,
            orderIndex: i,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Problem updated successfully',
      data: { problem: updated },
    });
  } catch (err: any) {
    console.error('Update problem error:', err);
    res.status(500).json({ success: false, message: 'Failed to update problem' });
  }
}

export async function deleteProblem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.problem.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Problem deleted successfully' });
  } catch (err: any) {
    console.error('Delete problem error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete problem' });
  }
}

export async function scheduleDaily(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemId, scheduledDate, isDaily } = req.body;

    const updated = await prisma.problem.update({
      where: { id: problemId },
      data: {
        isDaily: isDaily !== undefined ? isDaily : true,
        scheduledDate: scheduledDate || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Daily challenge scheduled successfully',
      data: { problem: updated },
    });
  } catch (err: any) {
    console.error('Schedule daily error:', err);
    res.status(500).json({ success: false, message: 'Failed to schedule daily challenge' });
  }
}

export async function getAdminSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const verdict = req.query.verdict as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (verdict) where.verdict = verdict;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, fullName: true, email: true } },
          problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Admin submissions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
}

export async function rejudgeSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    await prisma.submission.update({
      where: { id },
      data: { verdict: 'PENDING' },
    });

    const queue = getQueue();
    await queue.addJob({ submissionId: id });

    res.status(200).json({
      success: true,
      message: 'Submission queued for re-judging',
    });
  } catch (err: any) {
    console.error('Rejudge error:', err);
    res.status(500).json({ success: false, message: 'Failed to rejudge submission' });
  }
}

export async function getAdminUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { fullName: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          college: true,
          totalPoints: true,
          currentStreak: true,
          isBanned: true,
          createdAt: true,
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          submissionCount: u._count.submissions,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'ADMIN'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, role: true },
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user: updated },
    });
  } catch (err: any) {
    console.error('Update role error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
}

export async function updateUserBan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: !!isBanned },
      select: { id: true, username: true, isBanned: true },
    });

    res.status(200).json({
      success: true,
      message: `User has been ${isBanned ? 'banned' : 'unbanned'}`,
      data: { user: updated },
    });
  } catch (err: any) {
    console.error('Update ban error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
}
