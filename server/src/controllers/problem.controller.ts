import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  getTodayIST,
  getChallengeDayIST,
  getSecondsUntilNext1700IST,
} from '../utils/ist.js';

export async function getDailyChallenge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const todayIST = getTodayIST();
    const challengeDayIST = getChallengeDayIST();

    // Look for challenge scheduled for current 17:00 IST challenge day, or todayIST, or fallback to any isDaily problem
    let problem = await prisma.problem.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [{ scheduledDate: challengeDayIST }, { scheduledDate: todayIST }, { isDaily: true }],
      },
      include: {
        testCases: {
          where: { isHidden: false },
          orderBy: { orderIndex: 'asc' },
          select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
        },
      },
    });

    if (!problem) {
      // Fallback: Pick the first published problem
      problem = await prisma.problem.findFirst({
        where: { status: 'PUBLISHED' },
        include: {
          testCases: {
            where: { isHidden: false },
            orderBy: { orderIndex: 'asc' },
            select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
          },
        },
      });
    }

    if (!problem) {
      res.status(404).json({ success: false, message: 'No challenge found' });
      return;
    }

    let isSolvedToday = false;
    let userAttempts = 0;
    if (req.user) {
      const solves = await prisma.submission.findMany({
        where: {
          userId: req.user.userId,
          problemId: problem.id,
        },
        select: { verdict: true },
      });
      userAttempts = solves.length;
      isSolvedToday = solves.some((s) => s.verdict === 'ACCEPTED');
    }

    res.status(200).json({
      success: true,
      data: {
        problem: {
          ...problem,
          tags: typeof problem.tags === 'string' ? JSON.parse(problem.tags) : (problem.tags || []),
        },
        todayIST,
        challengeDayIST,
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
        userStatus: {
          isSolved: isSolvedToday,
          attempts: userAttempts,
        },
      },
    });
  } catch (err: any) {
    console.error('Get daily challenge error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily challenge' });
  }
}

export async function getProblems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const difficulty = req.query.difficulty as string | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
    };

    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty.toUpperCase())) {
      where.difficulty = difficulty.toUpperCase();
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        orderBy: [{ isDaily: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          category: true,
          tags: true,
          basePoints: true,
          isDaily: true,
          timeLimitMs: true,
          memoryLimitMb: true,
          createdAt: true,
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    // If user is logged in, attach solved status
    let userSolvedSet = new Set<string>();
    if (req.user) {
      const userSolves = await prisma.submission.findMany({
        where: {
          userId: req.user.userId,
          verdict: 'ACCEPTED',
        },
        select: { problemId: true },
      });
      userSolvedSet = new Set(userSolves.map((s) => s.problemId));
    }

    const formattedProblems = problems.map((p) => ({
      ...p,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
      isSolved: userSolvedSet.has(p.id),
      totalSubmissions: p._count.submissions,
    }));

    res.status(200).json({
      success: true,
      data: {
        problems: formattedProblems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Get problems error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch problems' });
  }
}

export async function getProblemBySlugOrId(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: 'PUBLISHED',
      },
      include: {
        testCases: {
          where: { isHidden: false }, // CRITICAL SECURITY: Never leak hidden test cases
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Problem not found' });
      return;
    }

    let isSolved = false;
    let userCode: string | null = null;
    if (req.user) {
      const lastSub = await prisma.submission.findFirst({
        where: {
          userId: req.user.userId,
          problemId: problem.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastSub) {
        userCode = lastSub.code;
        isSolved = lastSub.verdict === 'ACCEPTED';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        problem: {
          ...problem,
          tags: typeof problem.tags === 'string' ? JSON.parse(problem.tags) : problem.tags,
        },
        userStatus: {
          isSolved,
          savedCode: userCode || problem.starterCode,
        },
      },
    });
  } catch (err: any) {
    console.error('Get problem detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch problem' });
  }
}
