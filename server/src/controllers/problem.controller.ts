import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { FEATURES } from '../config/features.config.js';
import {
  getTodayIST,
  getChallengeDayIST,
  getSecondsUntilNext1700IST,
  getCurrentWeekDayDatesIST,
  addDaysIST,
  CURRENT_WEEK_SLUGS,
  PAST_WEEK_SLUGS,
} from '../utils/ist.js';

let lastSyncedChallengeDay: string | null = null;

/**
 * Ensures the canonical 7 challenges of the current week and the past-week
 * challenges have deterministic `scheduledDate` values aligned with the active
 * 17:00 IST challenge day (`getChallengeDayIST()`).
 */
export async function ensureCurrentWeekSchedule(): Promise<void> {
  const challengeDayIST = getChallengeDayIST();
  if (lastSyncedChallengeDay === challengeDayIST) {
    return;
  }

  const weekDates = getCurrentWeekDayDatesIST();
  const todayProblem = await prisma.problem.findUnique({
    where: { slug: 'daily-longest-unique-substring' },
    select: { id: true, scheduledDate: true },
  });

  if (todayProblem && todayProblem.scheduledDate === challengeDayIST) {
    // Also verify Day 4 ('sum-of-multiples') is scheduled so weekly catch-up is always ready
    const day4 = await prisma.problem.findUnique({
      where: { slug: 'sum-of-multiples' },
      select: { scheduledDate: true },
    });
    if (day4?.scheduledDate === weekDates[3]) {
      lastSyncedChallengeDay = challengeDayIST;
      return;
    }
  }

  // Align the 7 canonical current-week problems (Days 1..5 unlocked, Days 6..7 locked future)
  for (let i = 0; i < CURRENT_WEEK_SLUGS.length; i++) {
    const slug = CURRENT_WEEK_SLUGS[i];
    const scheduledDate = weekDates[i];
    const isToday = scheduledDate === challengeDayIST;
    await prisma.problem
      .updateMany({
        where: { slug },
        data: {
          scheduledDate,
          isDaily: isToday,
        },
      })
      .catch(() => {});
  }

  // Align past-week canonical problems to dates strictly before current week start (challengeDay - 8 .. -16)
  for (let i = 0; i < PAST_WEEK_SLUGS.length; i++) {
    const slug = PAST_WEEK_SLUGS[i];
    const pastDate = addDaysIST(challengeDayIST, -(8 + i));
    await prisma.problem
      .updateMany({
        where: { slug },
        data: {
          scheduledDate: pastDate,
          isDaily: false,
        },
      })
      .catch(() => {});
  }

  lastSyncedChallengeDay = challengeDayIST;
}

export interface CurrentWeekDayItem {
  dayNumber: number;
  scheduledDate: string;
  status: 'UNLOCKED' | 'LOCKED';
  isToday: boolean;
  isSolved: boolean;
  unlocksAt: string;
  unlockLabel: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    basePoints: number;
  } | null;
}

export async function buildCurrentWeekStrip(userId?: string): Promise<CurrentWeekDayItem[]> {
  await ensureCurrentWeekSchedule();
  const challengeDayIST = getChallengeDayIST();
  const weekDates = getCurrentWeekDayDatesIST();

  const weekProblems = await prisma.problem.findMany({
    where: {
      status: 'PUBLISHED',
      scheduledDate: { in: weekDates },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      category: true,
      basePoints: true,
      scheduledDate: true,
    },
  });

  const byDate = new Map<string, (typeof weekProblems)[number]>();
  for (const p of weekProblems) {
    if (p.scheduledDate && !byDate.has(p.scheduledDate)) {
      byDate.set(p.scheduledDate, p);
    }
  }

  let solvedSet = new Set<string>();
  if (userId) {
    const [accepted, approvedUploads] = await Promise.all([
      prisma.submission.findMany({
        where: {
          userId,
          verdict: 'ACCEPTED',
          problemId: { in: weekProblems.map((p) => p.id) },
        },
        select: { problemId: true },
      }),
      prisma.uploadedSolution.findMany({
        where: {
          userId,
          status: 'APPROVED',
          problemId: { in: weekProblems.map((p) => p.id) },
        },
        select: { problemId: true },
      }),
    ]);
    solvedSet = new Set([
      ...accepted.map((a) => a.problemId),
      ...approvedUploads.map((u) => u.problemId),
    ]);
  }

  return weekDates.map((dateStr, idx) => {
    const dayNumber = idx + 1;
    const isUnlocked = dateStr <= challengeDayIST;
    const isToday = dateStr === challengeDayIST;
    const prob = byDate.get(dateStr) || null;
    const unlocksAt = `${dateStr}T17:00:00+05:30`;

    if (!isUnlocked) {
      // Locked future challenge: NEVER leak problem title, slug, or description
      return {
        dayNumber,
        scheduledDate: dateStr,
        status: 'LOCKED',
        isToday: false,
        isSolved: false,
        unlocksAt,
        unlockLabel: `Unlocks ${dateStr} at 17:00 IST`,
        problem: null,
      };
    }

    return {
      dayNumber,
      scheduledDate: dateStr,
      status: 'UNLOCKED',
      isToday,
      isSolved: prob ? solvedSet.has(prob.id) : false,
      unlocksAt,
      unlockLabel: isToday ? 'Active Today (Unlocked 17:00 IST)' : `Unlocked ${dateStr} at 17:00 IST`,
      problem: prob
        ? {
            id: prob.id,
            slug: prob.slug,
            title: prob.title,
            difficulty: prob.difficulty,
            category: prob.category,
            basePoints: prob.basePoints,
          }
        : null,
    };
  });
}

function sanitizeProblemForStudent(problem: any) {
  const { solutionCode, sourceRefJson, sourceType, ...safeProblem } = problem;
  return {
    ...safeProblem,
    tags: typeof problem.tags === 'string' ? JSON.parse(problem.tags) : (problem.tags || []),
  };
}

export async function getCurrentWeekChallenges(req: AuthRequest, res: Response): Promise<void> {
  try {
    const todayIST = getTodayIST();
    const challengeDayIST = getChallengeDayIST();
    const days = await buildCurrentWeekStrip(req.user?.userId);

    res.status(200).json({
      success: true,
      data: {
        todayIST,
        challengeDayIST,
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
        days,
      },
    });
  } catch (err: any) {
    console.error('Get current week challenges error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch current week challenges' });
  }
}

export async function getDailyChallenge(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureCurrentWeekSchedule();
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
      res.status(200).json({
        success: true,
        data: {
          seasonComplete: true,
          message: 'Season complete — all published challenges have been completed.',
          problem: null,
          currentWeek: [],
          todayIST,
          challengeDayIST,
          secondsUntilNextReset: getSecondsUntilNext1700IST(),
        },
      });
      return;
    }

    let isSolvedToday = false;
    let userAttempts = 0;
    let savedCode: string | null = null;
    if (req.user) {
      const [solves, approvedUpload] = await Promise.all([
        prisma.submission.findMany({
          where: {
            userId: req.user.userId,
            problemId: problem.id,
          },
          orderBy: { createdAt: 'desc' },
          select: { verdict: true, code: true },
        }),
        prisma.uploadedSolution.findFirst({
          where: {
            userId: req.user.userId,
            problemId: problem.id,
            status: 'APPROVED',
          },
          select: { id: true },
        }),
      ]);
      userAttempts = solves.length;
      isSolvedToday = solves.some((s) => s.verdict === 'ACCEPTED') || Boolean(approvedUpload);
      if (solves.length > 0) {
        savedCode = solves[0].code;
      }
    }

    const currentWeek = await buildCurrentWeekStrip(req.user?.userId);

    res.status(200).json({
      success: true,
      data: {
        seasonComplete: false,
        problem: sanitizeProblemForStudent(problem),
        currentWeek,
        todayIST,
        challengeDayIST,
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
        userStatus: {
          isSolved: isSolvedToday,
          attempts: userAttempts,
          savedCode: savedCode || problem.starterCode,
        },
      },
    });
  } catch (err: any) {
    console.error('Get daily challenge error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily challenge' });
  }
}

export async function getProblems(req: AuthRequest, res: Response): Promise<void> {
  // When FEATURE_ARCHIVE is false, the Archive problem catalog endpoint returns 404 Not Found for all callers
  if (!FEATURES.ARCHIVE) {
    res.status(404).json({
      success: false,
      message: 'Not found',
    });
    return;
  }

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
    await ensureCurrentWeekSchedule();
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

    const challengeDayIST = getChallengeDayIST();
    const weekDates = getCurrentWeekDayDatesIST();
    const weekStart = weekDates[0];

    if (!FEATURES.ARCHIVE) {
      // Locked future challenge check (even within current week)
      if (problem.scheduledDate && problem.scheduledDate > challengeDayIST) {
        res.status(404).json({
          success: false,
          message: 'Challenge is locked until its scheduled 17:00 IST release time.',
        });
        return;
      }

      // Past-week or unscheduled archive problem check
      const isCurrentWeekUnlocked = Boolean(
        problem.scheduledDate &&
          problem.scheduledDate >= weekStart &&
          problem.scheduledDate <= challengeDayIST
      );

      if (!isCurrentWeekUnlocked) {
        res.status(404).json({
          success: false,
          message: 'Not found',
        });
        return;
      }
    }

    let isSolved = false;
    let userAttempts = 0;
    let userCode: string | null = null;
    if (req.user) {
      const [subs, approvedUpload] = await Promise.all([
        prisma.submission.findMany({
          where: {
            userId: req.user.userId,
            problemId: problem.id,
          },
          orderBy: { createdAt: 'desc' },
          select: { code: true, verdict: true },
        }),
        prisma.uploadedSolution.findFirst({
          where: {
            userId: req.user.userId,
            problemId: problem.id,
            status: 'APPROVED',
          },
          select: { id: true },
        }),
      ]);

      userAttempts = subs.length;
      isSolved = subs.some((s) => s.verdict === 'ACCEPTED') || Boolean(approvedUpload);
      if (subs.length > 0) {
        userCode = subs[0].code;
      }
    }

    const currentWeek = await buildCurrentWeekStrip(req.user?.userId);

    res.status(200).json({
      success: true,
      data: {
        problem: sanitizeProblemForStudent(problem),
        currentWeek,
        todayIST: getTodayIST(),
        challengeDayIST,
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
        userStatus: {
          isSolved,
          attempts: userAttempts,
          savedCode: userCode || problem.starterCode,
        },
      },
    });
  } catch (err: any) {
    console.error('Get problem detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch problem' });
  }
}
