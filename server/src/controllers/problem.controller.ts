import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { FEATURES } from '../config/features.config.js';
import {
  getServerNow,
  getTodayIST,
  getChallengeDayIST,
  getSecondsUntilNext1700IST,
  getNext1700ISTUTC,
  getCurrentWeekDayDatesIST,
  addDaysIST,
  CURRENT_WEEK_SLUGS,
  PAST_WEEK_SLUGS,
} from '../utils/ist.js';
import { isDailyChallengePaused } from '../services/system-config.service.js';

let lastSyncedChallengeDay: string | null = null;
let autoScheduleSyncEnabled = true;

export function setAutoScheduleSyncEnabled(enabled: boolean): void {
  autoScheduleSyncEnabled = enabled;
  if (!enabled) {
    lastSyncedChallengeDay = null;
  }
}

export function resetScheduleSyncCache(): void {
  lastSyncedChallengeDay = null;
}

/**
 * Ensures the canonical 7 challenges of the current week and the past-week
 * challenges have deterministic `scheduledDate` values aligned with the active
 * 17:00 IST challenge day (`getChallengeDayIST()`), unless disabled by a simulated-time test.
 */
export async function ensureCurrentWeekSchedule(): Promise<void> {
  if (!autoScheduleSyncEnabled) {
    return;
  }

  if (await isDailyChallengePaused()) {
    return;
  }

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
    const day4 = await prisma.problem.findUnique({
      where: { slug: 'sum-of-multiples' },
      select: { scheduledDate: true },
    });
    if (day4?.scheduledDate === weekDates[3]) {
      lastSyncedChallengeDay = challengeDayIST;
      return;
    }
  }

  // Align the 7 canonical current-week problems (Days 1..4 ended, Day 5 active today, Days 6..7 future locked)
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

function parseBookOrder(sourceRefJson: string | null | undefined): {
  chapterOrder: number;
  exerciseOrder: number;
} {
  if (!sourceRefJson) {
    return { chapterOrder: 999999, exerciseOrder: 999999 };
  }
  try {
    const parsed = JSON.parse(sourceRefJson);
    return {
      chapterOrder: Number.isFinite(Number(parsed.chapterOrder))
        ? Number(parsed.chapterOrder)
        : 999999,
      exerciseOrder: Number.isFinite(Number(parsed.exerciseOrder))
        ? Number(parsed.exerciseOrder)
        : 999999,
    };
  } catch {
    return { chapterOrder: 999999, exerciseOrder: 999999 };
  }
}

/**
 * Resolves the single active daily challenge for `challengeDayIST`.
 * If no PUBLISHED problem is scheduled for `challengeDayIST`, automatically picks
 * the next APPROVED (`PUBLISHED`) unscheduled problem from the book pool in
 * `(chapterOrder, exerciseOrder)` order and logs an admin alert.
 * If none exist, returns `{ problem: null, seasonComplete: true }`.
 */
export async function resolveActiveDailyChallenge(now: Date = getServerNow()): Promise<{
  problem: any | null;
  seasonComplete: boolean;
  autoAssigned: boolean;
}> {
  if (await isDailyChallengePaused()) {
    return { problem: null, seasonComplete: false, autoAssigned: false };
  }

  const challengeDayIST = getChallengeDayIST(now);

  const scheduled = await prisma.problem.findFirst({
    where: {
      status: 'PUBLISHED',
      scheduledDate: challengeDayIST,
    },
    include: {
      testCases: {
        where: { isHidden: false },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
      },
    },
  });

  if (scheduled) {
    return { problem: scheduled, seasonComplete: false, autoAssigned: false };
  }

  // Missing-question fallback at 17:00 IST: find unscheduled PUBLISHED problems
  const candidates = await prisma.problem.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ scheduledDate: null }, { scheduledDate: '' }],
    },
    orderBy: { createdAt: 'asc' },
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const orderA = parseBookOrder(a.sourceRefJson);
      const orderB = parseBookOrder(b.sourceRefJson);
      if (orderA.chapterOrder !== orderB.chapterOrder) {
        return orderA.chapterOrder - orderB.chapterOrder;
      }
      if (orderA.exerciseOrder !== orderB.exerciseOrder) {
        return orderA.exerciseOrder - orderB.exerciseOrder;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const chosen = candidates[0];
    const updated = await prisma.problem.update({
      where: { id: chosen.id },
      data: {
        scheduledDate: challengeDayIST,
        isDaily: true,
      },
      include: {
        testCases: {
          where: { isHidden: false },
          orderBy: { orderIndex: 'asc' },
          select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
        },
      },
    });

    if (adminUser) {
      await prisma.adminAuditLog
        .create({
          data: {
            adminId: adminUser.id,
            action: 'AUTO_FALLBACK_CHALLENGE_ASSIGNED',
            newValue: `${updated.slug} (${challengeDayIST})`,
            reason: `No question was scheduled at 17:00 IST for ${challengeDayIST}; auto-picked next APPROVED unscheduled question (${updated.slug}).`,
          },
        })
        .catch(() => {});
    }

    return { problem: updated, seasonComplete: false, autoAssigned: true };
  }

  if (adminUser) {
    await prisma.adminAuditLog
      .create({
        data: {
          adminId: adminUser.id,
          action: 'SEASON_COMPLETE_ALERT',
          newValue: challengeDayIST,
          reason: `No scheduled or unscheduled APPROVED questions remain in the pool for ${challengeDayIST}.`,
        },
      })
      .catch(() => {});
  }

  return { problem: null, seasonComplete: true, autoAssigned: false };
}

export interface CurrentWeekDayItem {
  dayNumber: number;
  scheduledDate: string;
  status: 'UNLOCKED' | 'LOCKED' | 'ENDED';
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
    const isToday = dateStr === challengeDayIST;
    const isFuture = dateStr > challengeDayIST;
    const prob = byDate.get(dateStr) || null;
    const unlocksAt = `${dateStr}T17:00:00+05:30`;

    if (isFuture) {
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
      status: isToday ? 'UNLOCKED' : 'ENDED',
      isToday,
      isSolved: prob ? solvedSet.has(prob.id) : false,
      unlocksAt,
      unlockLabel: isToday ? 'Active Today (17:00 IST – 17:00 IST)' : `Ended (${dateStr})`,
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
  let cleanDescription = problem.description || '';
  cleanDescription = cleanDescription
    .replace(/Yashavant\s+Kanetkar/gi, 'LogicQ Author')
    .replace(/Kanetkar/gi, 'LogicQ Author')
    .replace(/Test\s+Your\s+C\s+Skills/gi, 'LogicQ Problem Bank');
  return {
    ...safeProblem,
    description: cleanDescription,
    tags: typeof problem.tags === 'string' ? JSON.parse(problem.tags) : (problem.tags || []),
  };
}

export async function getCurrentWeekChallenges(req: AuthRequest, res: Response): Promise<void> {
  // Single Visible Question Rule: Students cannot list or browse past/future questions or a 7-day strip.
  if (req.user?.role !== 'ADMIN') {
    res.status(404).json({
      success: false,
      code: 'CHALLENGE_LIST_DISABLED',
      message: 'Not found',
    });
    return;
  }

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
    const now = getServerNow();
    const todayIST = getTodayIST(now);
    const challengeDayIST = getChallengeDayIST(now);

    if (await isDailyChallengePaused()) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        success: true,
        data: {
          paused: true,
          message: 'Daily challenges are not live yet. We will announce the start.',
          problem: null,
          todayIST,
          challengeDayIST,
          secondsUntilNextReset: null,
          endsAt: null,
        },
      });
      return;
    }

    const secondsUntilNextReset = getSecondsUntilNext1700IST(now);
    const nextSwitchUTC = getNext1700ISTUTC(now);

    res.setHeader('Cache-Control', `private, max-age=${secondsUntilNextReset}, must-revalidate`);
    res.setHeader('Expires', nextSwitchUTC.toUTCString());

    const { problem, seasonComplete, autoAssigned } = await resolveActiveDailyChallenge(now);

    if (seasonComplete || !problem) {
      res.status(200).json({
        success: true,
        data: {
          seasonComplete: true,
          message: 'Season complete — all published challenges have been completed.',
          problem: null,
          todayIST,
          challengeDayIST,
          secondsUntilNextReset,
          endsAt: nextSwitchUTC.toISOString(),
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

    res.status(200).json({
      success: true,
      data: {
        seasonComplete: false,
        autoAssigned,
        problem: sanitizeProblemForStudent(problem),
        todayIST,
        challengeDayIST,
        secondsUntilNextReset,
        endsAt: nextSwitchUTC.toISOString(),
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
    const now = getServerNow();
    const challengeDayIST = getChallengeDayIST(now);
    const isAdmin = req.user?.role === 'ADMIN';

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        ...(isAdmin ? {} : { status: 'PUBLISHED' }),
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
      res.status(404).json({
        success: false,
        code: 'CHALLENGE_NOT_AVAILABLE',
        message: 'Challenge not available.',
      });
      return;
    }

    if (!isAdmin) {
      // 1. Future or unscheduled challenge -> 404 Not Found (never reveal title, statement, or samples)
      if (!problem.scheduledDate || problem.scheduledDate > challengeDayIST) {
        res.status(404).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Challenge not available.',
        });
        return;
      }

      // 2. Past / Ended challenge -> 410 Gone ("This challenge has ended" with link to today's challenge; NEVER leak statement, samples, or test cases)
      if (problem.scheduledDate < challengeDayIST) {
        res.status(410).json({
          success: false,
          code: 'CHALLENGE_ENDED',
          ended: true,
          message: 'This challenge has ended.',
          todayChallengeUrl: '/challenge',
        });
        return;
      }
    }

    const secondsUntilNextReset = getSecondsUntilNext1700IST(now);
    const nextSwitchUTC = getNext1700ISTUTC(now);
    res.setHeader('Cache-Control', `private, max-age=${secondsUntilNextReset}, must-revalidate`);
    res.setHeader('Expires', nextSwitchUTC.toUTCString());

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

    res.status(200).json({
      success: true,
      data: {
        problem: isAdmin ? problem : sanitizeProblemForStudent(problem),
        todayIST: getTodayIST(now),
        challengeDayIST,
        secondsUntilNextReset,
        endsAt: nextSwitchUTC.toISOString(),
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
