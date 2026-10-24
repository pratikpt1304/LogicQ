import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getQueue } from '../queue/queue.factory.js';
import { getChallengeDayIST, getChallengeDayWindowIST, getServerNow, addDaysIST, getChallengeDayBoundsUTC } from '../utils/ist.js';
import {
  runDailyFinalizationJob,
  getFrozenDailyBoard,
  getFinalizationRunHistory,
  getAllFrozenDailyBoards,
  createDailyCorrection,
  getDailyCorrections,
  computeDailyBoardForDay,
} from '../services/daily-finalization.service.js';
import {
  getAdminPauseDays,
  setAdminPauseDay,
  getAllUserFreezes,
} from '../services/streak.service.js';
import { isDailyChallengePaused } from '../services/system-config.service.js';
import { PlagiarismService } from '../services/plagiarism.service.js';
import { SecurityAuditService } from '../services/security-audit.service.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  DIVISION_REGEX,
  getPrnChangeCooldownStatus,
  PRN_RELEASE_RESERVATION_DAYS,
} from '../config/academic.config.js';

export const problemAdminSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    category: z.string().default('Algorithms'),
    tags: z.array(z.string()).default([]),
    description: z
      .string()
      .min(10)
      .refine(
        (val) => {
          const rawMatches = val.match(/(\$[^\$\n]+\$|\\[a-zA-Z]+)/g);
          if (!rawMatches) return true;
          const allowed = new Set(['\\n', '\\t', '\\r', '\\"', "\\'"]);
          return rawMatches.every((m) => allowed.has(m) || m.startsWith('\\n') || m.startsWith('\\t'));
        },
        {
          message:
            'Problem description contains unrendered LaTeX ($ or \\macro). Please use clean Unicode characters (e.g. ≤, ≥, ×, ·, −10⁹ ≤ A, B ≤ 10⁹).',
        }
      ),
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

export interface PilotSubmissionInput {
  id: string;
  userId: string;
  problemId: string;
  verdict: string;
  createdAt: Date;
}

export interface PilotStudentInput {
  id: string;
  username: string;
  fullName: string;
}

export interface PilotProblemInput {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  category: string;
}

const FAILURE_VERDICTS = [
  'WRONG_ANSWER',
  'COMPILE_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'MEMORY_LIMIT_EXCEEDED',
] as const;

export function computeTwoWeekPilotAnalytics(
  pilotDays: string[],
  students: PilotStudentInput[],
  problems: PilotProblemInput[],
  submissions: PilotSubmissionInput[]
) {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const problemMap = new Map(problems.map((p) => [p.id, p]));
  const pilotDaySet = new Set(pilotDays);

  // Filter submissions to only student users and within the 14 pilot challenge days
  const pilotSubmissions = submissions.filter((sub) => {
    if (!studentMap.has(sub.userId)) return false;
    const challengeDay = getChallengeDayIST(sub.createdAt);
    return pilotDaySet.has(challengeDay);
  });

  // 1. Daily Active Students (14-Day Pilot Window)
  const dailyMap = new Map<
    string,
    {
      activeUsers: Set<string>;
      solvingUsers: Set<string>;
      totalSubmissions: number;
      acceptedSubmissions: number;
    }
  >();

  for (const dayStr of pilotDays) {
    dailyMap.set(dayStr, {
      activeUsers: new Set(),
      solvingUsers: new Set(),
      totalSubmissions: 0,
      acceptedSubmissions: 0,
    });
  }

  const allPilotActiveUsers = new Set<string>();

  for (const sub of pilotSubmissions) {
    const dayStr = getChallengeDayIST(sub.createdAt);
    const bucket = dailyMap.get(dayStr);
    if (!bucket) continue;

    bucket.activeUsers.add(sub.userId);
    allPilotActiveUsers.add(sub.userId);
    bucket.totalSubmissions++;

    if (sub.verdict === 'ACCEPTED') {
      bucket.solvingUsers.add(sub.userId);
      bucket.acceptedSubmissions++;
    }
  }

  const dailyActiveStudents = pilotDays.map((dateStr, idx) => {
    const bucket = dailyMap.get(dateStr)!;
    const weekNumber = idx < 7 ? 1 : 2;
    const dayInWeek = (idx % 7) + 1;
    const shortDate = dateStr.slice(5); // MM-DD
    return {
      dayIndex: idx + 1,
      weekNumber,
      dayInWeek,
      date: dateStr,
      label: `W${weekNumber}·D${dayInWeek} (${shortDate})`,
      activeStudents: bucket.activeUsers.size,
      solvingStudents: bucket.solvingUsers.size,
      totalSubmissions: bucket.totalSubmissions,
      acceptedSubmissions: bucket.acceptedSubmissions,
    };
  });

  const totalDauSum = dailyActiveStudents.reduce((acc, d) => acc + d.activeStudents, 0);
  const averageDau =
    dailyActiveStudents.length > 0
      ? Number((totalDauSum / dailyActiveStudents.length).toFixed(1))
      : 0;
  const peakDau = dailyActiveStudents.reduce((max, d) => Math.max(max, d.activeStudents), 0);
  const todayDau =
    dailyActiveStudents.length > 0
      ? dailyActiveStudents[dailyActiveStudents.length - 1].activeStudents
      : 0;

  // 2. Students Solving at Least 4 of 7 Challenges (Per Week & Overall Pilot)
  function computeWeekCohort(weekDays: string[], weekLabel: string) {
    const weekSet = new Set(weekDays);
    const userStats = new Map<
      string,
      { solvedProblems: Set<string>; totalSubmissions: number }
    >();

    for (const sub of pilotSubmissions) {
      const dayStr = getChallengeDayIST(sub.createdAt);
      if (!weekSet.has(dayStr)) continue;

      if (!userStats.has(sub.userId)) {
        userStats.set(sub.userId, { solvedProblems: new Set(), totalSubmissions: 0 });
      }
      const st = userStats.get(sub.userId)!;
      st.totalSubmissions++;
      if (sub.verdict === 'ACCEPTED') {
        st.solvedProblems.add(sub.problemId);
      }
    }

    let solved0 = 0;
    let solved1to3 = 0;
    let solved4to6 = 0;
    let solved7Plus = 0;

    const studentRows: Array<{
      userId: string;
      username: string;
      fullName: string;
      solvedCount: number;
      totalSubmissions: number;
      metFourOfSeven: boolean;
    }> = [];

    for (const [userId, st] of userStats.entries()) {
      const count = st.solvedProblems.size;
      if (count === 0) solved0++;
      else if (count <= 3) solved1to3++;
      else if (count <= 6) solved4to6++;
      else solved7Plus++;

      const studentInfo = studentMap.get(userId)!;
      studentRows.push({
        userId,
        username: studentInfo.username,
        fullName: studentInfo.fullName,
        solvedCount: count,
        totalSubmissions: st.totalSubmissions,
        metFourOfSeven: count >= 4,
      });
    }

    studentRows.sort((a, b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      return a.totalSubmissions - b.totalSubmissions;
    });

    const qualifiedCount = solved4to6 + solved7Plus;
    const activeStudentsInWeek = userStats.size;
    const totalRegisteredStudents = students.length;

    return {
      weekLabel,
      startDate: weekDays[0] || '',
      endDate: weekDays[weekDays.length - 1] || '',
      qualifiedCount,
      activeStudentsInWeek,
      totalRegisteredStudents,
      qualifiedPctOfActive:
        activeStudentsInWeek > 0 ? Math.round((qualifiedCount / activeStudentsInWeek) * 100) : 0,
      qualifiedPctOfRegistered:
        totalRegisteredStudents > 0
          ? Math.round((qualifiedCount / totalRegisteredStudents) * 100)
          : 0,
      buckets: {
        solved0,
        solved1to3,
        solved4to6,
        solved7Plus,
      },
      students: studentRows,
    };
  }

  const week1Cohort = computeWeekCohort(pilotDays.slice(0, 7), 'Week 1 (Days 1–7)');
  const week2Cohort = computeWeekCohort(pilotDays.slice(7, 14), 'Week 2 (Days 8–14)');

  const uniqueQualifiedAcrossPilot = new Set<string>([
    ...week1Cohort.students.filter((s) => s.metFourOfSeven).map((s) => s.userId),
    ...week2Cohort.students.filter((s) => s.metFourOfSeven).map((s) => s.userId),
  ]);

  // 3. Drop-Off by Day (Day 1 -> Day 14 Funnel)
  const firstActiveDayEntry = dailyActiveStudents.find((d) => d.activeStudents > 0);
  const baselineActive = firstActiveDayEntry ? firstActiveDayEntry.activeStudents : 0;

  const dailyDropOff = dailyActiveStudents.map((day, idx) => {
    const prevActive = idx > 0 ? dailyActiveStudents[idx - 1].activeStudents : day.activeStudents;
    const dropOffCount = idx === 0 ? 0 : Math.max(0, prevActive - day.activeStudents);
    const netChangeCount = idx === 0 ? 0 : day.activeStudents - prevActive;
    const dropOffRatePct =
      idx > 0 && prevActive > 0 ? Math.round((dropOffCount / prevActive) * 100) : 0;

    const weekStartIdx = day.weekNumber === 1 ? 0 : 7;
    const weekStartActive =
      dailyActiveStudents[weekStartIdx]?.activeStudents || baselineActive || 0;
    const retentionFromBaselinePct =
      baselineActive > 0 ? Math.round((day.activeStudents / baselineActive) * 100) : 0;
    const retentionFromWeekStartPct =
      weekStartActive > 0 ? Math.round((day.activeStudents / weekStartActive) * 100) : 0;
    const solveConversionPct =
      day.activeStudents > 0 ? Math.round((day.solvingStudents / day.activeStudents) * 100) : 0;

    return {
      ...day,
      previousDayActive: prevActive,
      dropOffCount,
      netChangeCount,
      dropOffRatePct,
      retentionFromBaselinePct,
      retentionFromWeekStartPct,
      solveConversionPct,
    };
  });

  const steepestDropOffDay =
    dailyDropOff
      .filter((d) => d.dropOffCount > 0)
      .sort((a, b) => {
        if (b.dropOffCount !== a.dropOffCount) return b.dropOffCount - a.dropOffCount;
        return b.dropOffRatePct - a.dropOffRatePct;
      })[0] || null;

  // 4. Most-Failed Problems
  const problemStatsMap = new Map<
    string,
    {
      totalSubmissions: number;
      failedSubmissions: number;
      acceptedSubmissions: number;
      attemptedUsers: Set<string>;
      failedUsers: Set<string>;
      solvedUsers: Set<string>;
      verdictBreakdown: Record<string, number>;
    }
  >();

  for (const sub of pilotSubmissions) {
    if (sub.verdict === 'PENDING' || sub.verdict === 'JUDGING') continue;

    if (!problemStatsMap.has(sub.problemId)) {
      problemStatsMap.set(sub.problemId, {
        totalSubmissions: 0,
        failedSubmissions: 0,
        acceptedSubmissions: 0,
        attemptedUsers: new Set(),
        failedUsers: new Set(),
        solvedUsers: new Set(),
        verdictBreakdown: {
          WRONG_ANSWER: 0,
          COMPILE_ERROR: 0,
          TIME_LIMIT_EXCEEDED: 0,
          RUNTIME_ERROR: 0,
          MEMORY_LIMIT_EXCEEDED: 0,
        },
      });
    }

    const pStat = problemStatsMap.get(sub.problemId)!;
    pStat.totalSubmissions++;
    pStat.attemptedUsers.add(sub.userId);

    if (sub.verdict === 'ACCEPTED') {
      pStat.acceptedSubmissions++;
      pStat.solvedUsers.add(sub.userId);
    } else {
      pStat.failedSubmissions++;
      pStat.failedUsers.add(sub.userId);
      if (pStat.verdictBreakdown[sub.verdict] !== undefined) {
        pStat.verdictBreakdown[sub.verdict]++;
      } else {
        pStat.verdictBreakdown[sub.verdict] = 1;
      }
    }
  }

  const mostFailedProblems = Array.from(problemStatsMap.entries())
    .map(([problemId, st]) => {
      const prob = problemMap.get(problemId);
      const failureRatePct =
        st.totalSubmissions > 0
          ? Math.round((st.failedSubmissions / st.totalSubmissions) * 100)
          : 0;

      let topFailureVerdict: string | null = null;
      let topVerdictCount = 0;
      for (const v of FAILURE_VERDICTS) {
        if ((st.verdictBreakdown[v] || 0) > topVerdictCount) {
          topVerdictCount = st.verdictBreakdown[v];
          topFailureVerdict = v;
        }
      }

      return {
        problemId,
        title: prob?.title || 'Unknown Problem',
        slug: prob?.slug || problemId,
        difficulty: prob?.difficulty || 'MEDIUM',
        category: prob?.category || 'Algorithms',
        totalSubmissions: st.totalSubmissions,
        failedSubmissions: st.failedSubmissions,
        acceptedSubmissions: st.acceptedSubmissions,
        failureRatePct,
        uniqueAttemptedStudents: st.attemptedUsers.size,
        uniqueFailedStudents: st.failedUsers.size,
        uniqueSolvedStudents: st.solvedUsers.size,
        topFailureVerdict,
        verdictBreakdown: st.verdictBreakdown,
      };
    })
    .filter((p) => p.failedSubmissions > 0 || p.totalSubmissions > 0)
    .sort((a, b) => {
      if (b.failedSubmissions !== a.failedSubmissions) {
        return b.failedSubmissions - a.failedSubmissions;
      }
      if (b.failureRatePct !== a.failureRatePct) {
        return b.failureRatePct - a.failureRatePct;
      }
      return b.totalSubmissions - a.totalSubmissions;
    });

  return {
    window: {
      startDate: pilotDays[0] || '',
      endDate: pilotDays[pilotDays.length - 1] || '',
      daysCount: pilotDays.length,
      totalRegisteredStudents: students.length,
      totalActivePilotStudents: allPilotActiveUsers.size,
      averageDau,
      peakDau,
      todayDau,
    },
    dailyActiveStudents,
    fourOfSevenCohort: {
      targetChallengesPerWeek: 4,
      totalChallengesPerWeek: 7,
      uniqueQualifiedStudentsAnyWeek: uniqueQualifiedAcrossPilot.size,
      week1: week1Cohort,
      week2: week2Cohort,
    },
    dropOffByDay: {
      baselineActiveStudents: baselineActive,
      steepestDropOffDay,
      dailyFunnel: dailyDropOff,
    },
    mostFailedProblems,
  };
}

export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalProblems,
      totalSubmissions,
      acceptedSubmissions,
      driveConnectedCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { verdict: 'ACCEPTED' } }),
      (prisma.user as any).count({ where: { storagePreference: 'GOOGLE_DRIVE' } }),
    ]);

    const acceptanceRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // Difficulty distribution
    const difficultyCounts = await prisma.problem.groupBy({
      by: ['difficulty'],
      _count: { id: true },
    });

    // Determine 14-day (2-week) pilot challenge days (17:00 IST boundary)
    let pilotDays: string[];
    const pilotStartQuery = req.query.pilotStart as string | undefined;
    if (pilotStartQuery && /^\d{4}-\d{2}-\d{2}$/.test(pilotStartQuery)) {
      const startBase = new Date(`${pilotStartQuery}T00:00:00.000Z`);
      pilotDays = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(startBase.getTime() + i * 24 * 60 * 60 * 1000);
        pilotDays.push(d.toISOString().split('T')[0]);
      }
    } else {
      pilotDays = getChallengeDayWindowIST(14);
    }

    const pilotWindowStartUTC = new Date(`${pilotDays[0]}T11:30:00.000Z`);

    const [students, problems, recentWindowSubmissions] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: {
          id: true,
          username: true,
          fullName: true,
          department: true,
          year: true,
          division: true,
          college: true,
          totalPoints: true,
        },
      }),
      prisma.problem.findMany({
        select: { id: true, title: true, slug: true, difficulty: true, category: true },
      }),
      prisma.submission.findMany({
        where: {
          createdAt: {
            gte: pilotWindowStartUTC,
          },
        },
        select: {
          id: true,
          userId: true,
          problemId: true,
          verdict: true,
          createdAt: true,
        },
      }),
    ]);

    const dailyTrends: Record<string, { total: number; accepted: number }> = {};
    for (const s of recentWindowSubmissions) {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (!dailyTrends[dateStr]) dailyTrends[dateStr] = { total: 0, accepted: 0 };
      dailyTrends[dateStr].total++;
      if (s.verdict === 'ACCEPTED') dailyTrends[dateStr].accepted++;
    }

    // Weekly Result Summary & Analytics: Department and Year breakdowns for admins
    const studentById = new Map(students.map((st) => [st.id, st]));

    const departmentBreakdown = ALLOWED_DEPARTMENTS.map((dept) => {
      const deptStudents = students.filter((s) => s.department === dept);
      const deptStudentIds = new Set(deptStudents.map((s) => s.id));
      const deptSubs = recentWindowSubmissions.filter((sub) => deptStudentIds.has(sub.userId));
      const activeIds = new Set(deptSubs.map((sub) => sub.userId));
      const acceptedSubs = deptSubs.filter((sub) => sub.verdict === 'ACCEPTED').length;
      const totalPoints = deptStudents.reduce((acc, s) => acc + (s.totalPoints || 0), 0);
      return {
        department: dept,
        totalStudents: deptStudents.length,
        activeStudents: activeIds.size,
        totalSubmissions: deptSubs.length,
        acceptedSubmissions: acceptedSubs,
        totalPoints,
        averagePoints:
          deptStudents.length > 0 ? Math.round(totalPoints / deptStudents.length) : 0,
      };
    });

    const yearBreakdown = ALLOWED_YEARS.map((yr) => {
      const yrStudents = students.filter((s) => s.year === yr);
      const yrStudentIds = new Set(yrStudents.map((s) => s.id));
      const yrSubs = recentWindowSubmissions.filter((sub) => yrStudentIds.has(sub.userId));
      const activeIds = new Set(yrSubs.map((sub) => sub.userId));
      const acceptedSubs = yrSubs.filter((sub) => sub.verdict === 'ACCEPTED').length;
      const totalPoints = yrStudents.reduce((acc, s) => acc + (s.totalPoints || 0), 0);
      return {
        year: yr,
        totalStudents: yrStudents.length,
        activeStudents: activeIds.size,
        totalSubmissions: yrSubs.length,
        acceptedSubmissions: acceptedSubs,
        totalPoints,
        averagePoints: yrStudents.length > 0 ? Math.round(totalPoints / yrStudents.length) : 0,
      };
    });

    const pilotAnalytics = computeTwoWeekPilotAnalytics(
      pilotDays,
      students,
      problems,
      recentWindowSubmissions
    );

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAdmins,
          isSingleAdminAlert: totalAdmins <= 1,
          totalProblems,
          totalSubmissions,
          acceptedSubmissions,
          acceptanceRate,
          driveConnectedCount: driveConnectedCount || 0,
          isAllowlistEnabled:
            process.env.ALLOWLIST_CSV_ENABLED === 'true' || process.env.AUTH_MODE === 'ALLOWLIST_CSV',
        },
        difficultyDistribution: difficultyCounts.map((d) => ({
          difficulty: d.difficulty,
          count: d._count.id,
        })),
        departmentBreakdown,
        yearBreakdown,
        dailyTrends,
        pilotAnalytics,
        studentMetaCount: studentById.size,
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

    // Content Leak Guard: Block direct book citations in student-facing descriptions or titles
    const textToCheck = `${problemData.title || ''} ${problemData.description || ''}`;
    if (/Kanetkar|Test Your C Skills/i.test(textToCheck)) {
      res.status(400).json({
        success: false,
        message:
          'Content policy violation: Direct book citations or author names ("Kanetkar", "Test Your C Skills") are forbidden in problem statements. Store book references exclusively in sourceRefJson.',
      });
      return;
    }

    // LaTeX Guard: Block unrendered LaTeX math syntax ($ or \macro)
    if (problemData.description) {
      const rawMatches = problemData.description.match(/(\$[^\$\n]+\$|\\[a-zA-Z]+)/g);
      if (rawMatches) {
        const allowed = new Set(['\\n', '\\t', '\\r', '\\"', "\\'"]);
        const violations = rawMatches.filter((m: string) => !allowed.has(m) && !m.startsWith('\\n') && !m.startsWith('\\t'));
        if (violations.length > 0) {
          res.status(400).json({
            success: false,
            message: `Content policy violation: Unrendered LaTeX math (${violations.slice(0, 3).join(', ')}) is forbidden. Use clean Unicode characters (e.g. ≤, ≥, ×, ·, −10⁹ ≤ A, B ≤ 10⁹).`,
          });
          return;
        }
      }
    }

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

    // Content Leak Guard: Block direct book citations in student-facing descriptions or titles
    const textToCheck = `${problemData.title || ''} ${problemData.description || ''}`;
    if (/Kanetkar|Test Your C Skills/i.test(textToCheck)) {
      res.status(400).json({
        success: false,
        message:
          'Content policy violation: Direct book citations or author names ("Kanetkar", "Test Your C Skills") are forbidden in problem statements. Store book references exclusively in sourceRefJson.',
      });
      return;
    }

    // LaTeX Guard: Block unrendered LaTeX math syntax ($ or \macro)
    if (problemData.description) {
      const rawMatches = problemData.description.match(/(\$[^\$\n]+\$|\\[a-zA-Z]+)/g);
      if (rawMatches) {
        const allowed = new Set(['\\n', '\\t', '\\r', '\\"', "\\'"]);
        const violations = rawMatches.filter((m: string) => !allowed.has(m) && !m.startsWith('\\n') && !m.startsWith('\\t'));
        if (violations.length > 0) {
          res.status(400).json({
            success: false,
            message: `Content policy violation: Unrendered LaTeX math (${violations.slice(0, 3).join(', ')}) is forbidden. Use clean Unicode characters (e.g. ≤, ≥, ×, ·, −10⁹ ≤ A, B ≤ 10⁹).`,
          });
          return;
        }
      }
    }

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
    const existing = await prisma.problem.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Problem not found' });
      return;
    }

    // Data safety invariant: Never cascade-delete student submissions. Soft-retire if submissions exist.
    if (existing._count.submissions > 0) {
      const retired = await prisma.problem.update({
        where: { id },
        data: {
          status: 'RETIRED',
          isDaily: false,
        },
      });
      res.status(200).json({
        success: true,
        message: 'Problem has existing student submissions and was safely retired instead of deleted.',
        data: { retired: true, problem: retired },
      });
      return;
    }

    await prisma.problem.delete({ where: { id } });
    res.status(200).json({
      success: true,
      message: 'Problem deleted successfully',
      data: { retired: false },
    });
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const verdict = req.query.verdict as string | undefined;
    const department = (req.query.department as string | undefined)?.trim();
    const year = (req.query.year as string | undefined)?.trim();
    const division = (req.query.division as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (verdict && verdict !== 'ALL') where.verdict = verdict;

    const userFilter: any = {};
    if (department && department !== 'ALL') userFilter.department = department;
    if (year && year !== 'ALL') userFilter.year = year;
    if (division && division !== 'ALL') userFilter.division = division.toUpperCase();
    if (search) {
      userFilter.OR = [
        { prn: { contains: search } },
        { email: { contains: search } },
        { displayName: { contains: search } },
        { fullName: { contains: search } },
        { username: { contains: search } },
      ];
    }
    if (Object.keys(userFilter).length > 0) {
      where.user = userFilter;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              prn: true,
              displayName: true,
              fullName: true,
              email: true,
              college: true,
              department: true,
              year: true,
              division: true,
            },
          },
          problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    const userProblemPairs = submissions.map((s) => ({
      userId: s.userId,
      problemId: s.problemId,
    }));

    // Fetch practice progress and prior submissions to compute attempt number and solve time
    const [progressRecords, userProblemSubs] = await Promise.all([
      userProblemPairs.length > 0
        ? prisma.practiceProgress.findMany({
            where: {
              OR: userProblemPairs.map((p) => ({
                userId: p.userId,
                problemId: p.problemId,
              })),
            },
            select: {
              userId: true,
              problemId: true,
              attemptsCount: true,
              activeSeconds: true,
              timeToSolveSeconds: true,
              firstAttemptAccepted: true,
              isSolved: true,
            },
          })
        : [],
      userProblemPairs.length > 0
        ? prisma.submission.findMany({
            where: {
              OR: userProblemPairs.map((p) => ({
                userId: p.userId,
                problemId: p.problemId,
              })),
            },
            select: {
              id: true,
              userId: true,
              problemId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          })
        : [],
    ]);

    const progressMap = new Map<string, (typeof progressRecords)[0]>();
    for (const prog of progressRecords) {
      progressMap.set(`${prog.userId}_${prog.problemId}`, prog);
    }

    const attemptNumberMap = new Map<string, number>();
    const totalAttemptsMap = new Map<string, number>();
    for (const sub of userProblemSubs) {
      const key = `${sub.userId}_${sub.problemId}`;
      const current = (totalAttemptsMap.get(key) || 0) + 1;
      totalAttemptsMap.set(key, current);
      attemptNumberMap.set(sub.id, current);
    }

    const enrichedSubmissions = submissions.map((sub) => {
      const key = `${sub.userId}_${sub.problemId}`;
      const prog = progressMap.get(key);
      const attemptNumber = attemptNumberMap.get(sub.id) || 1;
      const totalAttempts = prog?.attemptsCount || totalAttemptsMap.get(key) || 1;
      const timeToSolveSeconds = prog?.timeToSolveSeconds ?? null;
      const activeSeconds = prog?.activeSeconds ?? null;

      return {
        ...sub,
        attemptNumber,
        totalAttempts,
        timeToSolveSeconds,
        activeSeconds,
        isFirstAttemptAccepted: Boolean(
          prog?.firstAttemptAccepted || (attemptNumber === 1 && sub.verdict === 'ACCEPTED')
        ),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        submissions: enrichedSubmissions,
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = (req.query.search as string | undefined)?.trim();
    const department = (req.query.department as string | undefined)?.trim();
    const year = (req.query.year as string | undefined)?.trim();
    const division = (req.query.division as string | undefined)?.trim();
    const college = (req.query.college as string | undefined)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (department && department !== 'ALL') where.department = department;
    if (year && year !== 'ALL') where.year = year;
    if (division && division !== 'ALL') where.division = division.toUpperCase();
    if (college && college !== 'ALL') where.college = college;

    if (search) {
      where.OR = [
        { prn: { contains: search } },
        { email: { contains: search } },
        { displayName: { contains: search } },
        { fullName: { contains: search } },
        { username: { contains: search } },
        { department: { contains: search } },
        { year: { contains: search } },
        { division: { contains: search } },
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
          prn: true,
          email: true,
          displayName: true,
          shortId: true,
          fullName: true,
          role: true,
          college: true,
          department: true,
          year: true,
          division: true,
          profileComplete: true,
          totalPoints: true,
          currentStreak: true,
          isBanned: true,
          prnChangedAt: true,
          createdAt: true,
          prnHistories: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
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
        users: users.map((u) => {
          const cooldown = getPrnChangeCooldownStatus(u.prnChangedAt);
          return {
            ...u,
            prnNextAllowedDate: cooldown.nextAllowedDate?.toISOString() || null,
            isPrnChangeEligible: cooldown.isEligible,
            submissionCount: u._count.submissions,
          };
        }),
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

const adminUpdatePrnCollegeSchema = z.object({
  prn: z
    .preprocess((val) => normalizePrn(val), z.string())
    .refine((val) => isValidPrn(val), {
      message: PRN_ERROR_MESSAGE,
    }),
  college: z.enum(ALLOWED_COLLEGES, {
    errorMap: () => ({ message: 'College must be one of the allowed colleges.' }),
  }),
  department: z.enum(ALLOWED_DEPARTMENTS).optional(),
  year: z.enum(ALLOWED_YEARS).optional(),
  division: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const t = String(val).trim().toUpperCase();
      return t === '' ? null : t;
    }, z.string().nullable().optional())
    .refine((val) => val === undefined || val === null || DIVISION_REGEX.test(val), {
      message: 'Division must be up to 3 letters or digits.',
    }),
  adminPassword: z.string().min(1, 'Admin re-authentication password is required.'),
  reason: z.string().trim().min(3, 'Audit reason is required (at least 3 characters).').max(300),
});

/**
 * Audited Admin Action (with step-up password re-authentication):
 * Updates a student's PRN and/or College and atomically updates PrnIndex + writes AdminAuditLog.
 */
export async function adminUpdateUserPrnAndCollege(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const parsed = adminUpdatePrnCollegeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { prn, college, department, year, division, adminPassword, reason } = parsed.data;

    // 1. Re-authenticate the calling admin
    const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Admin privileges required.' });
      return;
    }

    const passwordValid = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!passwordValid) {
      res.status(401).json({
        success: false,
        message: 'Admin re-authentication failed: incorrect password.',
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Student user not found.' });
      return;
    }

    // 2. Atomic transaction: update PrnIndex + User + AdminAuditLog
    const result = await prisma.$transaction(async (tx) => {
      const existingPrnOwner = await tx.prnIndex.findUnique({ where: { prn } });
      if (existingPrnOwner && existingPrnOwner.userId !== id) {
        const err = new Error('This PRN is already registered to another student.');
        (err as any).statusCode = 409;
        throw err;
      }

      if (targetUser.prn && targetUser.prn !== prn) {
        await tx.prnIndex.deleteMany({
          where: { prn: targetUser.prn, userId: id },
        });
      }

      await tx.prnIndex.upsert({
        where: { prn },
        update: { userId: id },
        create: { prn, userId: id },
      });

      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          prn,
          college,
          ...(department !== undefined ? { department } : {}),
          ...(year !== undefined ? { year } : {}),
          ...(division !== undefined ? { division } : {}),
          profileComplete: true,
        },
        select: {
          id: true,
          username: true,
          prn: true,
          email: true,
          college: true,
          department: true,
          year: true,
          division: true,
          displayName: true,
        },
      });

      const auditEntry = await tx.adminAuditLog.create({
        data: {
          adminId: adminUser.id,
          targetUserId: id,
          action: 'ADMIN_UPDATE_PRN_COLLEGE',
          oldValue: JSON.stringify({
            prn: targetUser.prn,
            college: targetUser.college,
            department: targetUser.department,
            year: targetUser.year,
            division: targetUser.division,
          }),
          newValue: JSON.stringify({
            prn: updatedUser.prn,
            college: updatedUser.college,
            department: updatedUser.department,
            year: updatedUser.year,
            division: updatedUser.division,
          }),
          reason,
        },
      });

      // Record PrnHistory entry if PRN changed
      if (targetUser.prn !== prn) {
        await tx.prnHistory.create({
          data: {
            userId: id,
            oldPrn: targetUser.prn || '',
            newPrn: prn,
            source: 'ADMIN',
            reason,
            deviceType: String(req.headers['user-agent'] || 'admin').slice(0, 100),
            ipAddress: String(req.ip || 'admin').slice(0, 45),
          },
        });
      }

      return { updatedUser, auditEntry };
    });

    res.status(200).json({
      success: true,
      message: 'Student PRN and academic record updated and audited.',
      data: {
        user: result.updatedUser,
        auditLogId: result.auditEntry.id,
      },
    });
  } catch (err: any) {
    if (err?.statusCode === 409 || err?.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'This PRN is already registered to another student.',
      });
      return;
    }
    console.error('Admin update PRN error');
    res.status(500).json({ success: false, message: 'Failed to update student PRN' });
  }
}

/**
 * Audited Admin Action: Reveal full PRN for a student
 * Emits an immutable ADMIN_REVEAL_PRN audit log entry.
 */
export async function adminRevealStudentPrn(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, prn: true },
    });

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Student user not found' });
      return;
    }

    // Log the audit reveal
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.userId,
        targetUserId: id,
        action: 'ADMIN_REVEAL_PRN',
        reason: req.body?.reason || 'Administrative verification of student PRN',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        prn: targetUser.prn,
        studentId: targetUser.id,
      },
    });
  } catch (err: any) {
    console.error('Admin reveal PRN error:', err);
    res.status(500).json({ success: false, message: 'Failed to reveal student PRN' });
  }
}

/**
 * Audited Admin Action: Reset 30-day PRN change cooldown for a student
 * Enables student to change PRN immediately. Requires reason and admin re-authentication password.
 */
export async function adminResetPrnCooldown(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { adminPassword, reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ success: false, message: 'Audit reason required (at least 3 characters).' });
      return;
    }

    const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Admin privileges required' });
      return;
    }

    const passwordValid = await bcrypt.compare(adminPassword || '', adminUser.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ success: false, message: 'Admin re-authentication failed: incorrect password.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Student user not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { prnChangedAt: null },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: adminUser.id,
          targetUserId: id,
          action: 'ADMIN_RESET_PRN_COOLDOWN',
          reason,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Student PRN change cooldown successfully reset.',
      data: {
        userId: id,
        prnChangedAt: null,
        isPrnChangeEligible: true,
      },
    });
  } catch (err: any) {
    console.error('Admin reset PRN cooldown error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset PRN cooldown' });
  }
}

export async function getAdminAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportUsersCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const department = (req.query.department as string | undefined)?.trim();
    const year = (req.query.year as string | undefined)?.trim();
    const division = (req.query.division as string | undefined)?.trim();
    const college = (req.query.college as string | undefined)?.trim();

    const where: any = { role: 'STUDENT' };
    if (department && department !== 'ALL') where.department = department;
    if (year && year !== 'ALL') where.year = year;
    if (division && division !== 'ALL') where.division = division.toUpperCase();
    if (college && college !== 'ALL') where.college = college;

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { college: 'asc' },
        { department: 'asc' },
        { year: 'asc' },
        { division: 'asc' },
        { totalPoints: 'desc' },
      ],
      select: {
        prn: true,
        displayName: true,
        email: true,
        college: true,
        department: true,
        year: true,
        division: true,
        totalPoints: true,
        currentStreak: true,
        _count: { select: { submissions: true } },
      },
    });

    const header =
      'College,Department,Year,Division,PRN,DisplayName,Email,TotalPoints,CurrentStreak,SubmissionsCount';
    const rows = users.map((u) =>
      [
        escapeCsvCell(u.college || 'Sanjivani University'),
        escapeCsvCell(u.department || ''),
        escapeCsvCell(u.year || ''),
        escapeCsvCell(u.division || ''),
        escapeCsvCell(u.prn || ''),
        escapeCsvCell(u.displayName || ''),
        escapeCsvCell(u.email),
        escapeCsvCell(u.totalPoints),
        escapeCsvCell(u.currentStreak),
        escapeCsvCell(u._count.submissions),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="logicq_users.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export users CSV' });
  }
}

export async function exportWeeklyResultsCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const department = (req.query.department as string | undefined)?.trim();
    const year = (req.query.year as string | undefined)?.trim();
    const division = (req.query.division as string | undefined)?.trim();
    const college = (req.query.college as string | undefined)?.trim();

    const where: any = { role: 'STUDENT', isBanned: false };
    if (department && department !== 'ALL') where.department = department;
    if (year && year !== 'ALL') where.year = year;
    if (division && division !== 'ALL') where.division = division.toUpperCase();
    if (college && college !== 'ALL') where.college = college;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { college: 'asc' },
        { department: 'asc' },
        { year: 'asc' },
        { division: 'asc' },
        { totalPoints: 'desc' },
      ],
      select: {
        prn: true,
        displayName: true,
        email: true,
        college: true,
        department: true,
        year: true,
        division: true,
        totalPoints: true,
        currentStreak: true,
        submissions: {
          where: {
            verdict: 'ACCEPTED',
            createdAt: { gte: sevenDaysAgo },
          },
          select: { problemId: true, pointsAwarded: true },
        },
      },
    });

    const header =
      'College,Department,Year,Division,PRN,DisplayName,Email,WeeklySolvedCount,WeeklyPoints,TotalPoints,CurrentStreak';
    const rows = users.map((u) => {
      const weeklySolved = new Set(u.submissions.map((s) => s.problemId)).size;
      const weeklyPoints = u.submissions.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);
      return [
        escapeCsvCell(u.college || 'Sanjivani University'),
        escapeCsvCell(u.department || ''),
        escapeCsvCell(u.year || ''),
        escapeCsvCell(u.division || ''),
        escapeCsvCell(u.prn || ''),
        escapeCsvCell(u.displayName || ''),
        escapeCsvCell(u.email),
        escapeCsvCell(weeklySolved),
        escapeCsvCell(weeklyPoints),
        escapeCsvCell(u.totalPoints),
        escapeCsvCell(u.currentStreak),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="logicq_weekly_results.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export weekly results CSV' });
  }
}

export async function exportDailyResultsCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const department = (req.query.department as string | undefined)?.trim();
    const year = (req.query.year as string | undefined)?.trim();
    const division = (req.query.division as string | undefined)?.trim();
    const college = (req.query.college as string | undefined)?.trim();

    const where: any = { role: 'STUDENT', isBanned: false };
    if (department && department !== 'ALL') where.department = department;
    if (year && year !== 'ALL') where.year = year;
    if (division && division !== 'ALL') where.division = division.toUpperCase();
    if (college && college !== 'ALL') where.college = college;

    const now = getServerNow();
    const activeDay = getChallengeDayIST(now);
    const { startUTC, endUTC } = getChallengeDayBoundsUTC(activeDay);

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { college: 'asc' },
        { department: 'asc' },
        { year: 'asc' },
        { division: 'asc' },
        { totalPoints: 'desc' },
      ],
      select: {
        prn: true,
        displayName: true,
        email: true,
        college: true,
        department: true,
        year: true,
        division: true,
        totalPoints: true,
        currentStreak: true,
        submissions: {
          where: {
            verdict: 'ACCEPTED',
            createdAt: { gte: startUTC, lte: endUTC },
          },
          select: { problemId: true, pointsAwarded: true },
        },
      },
    });

    const header =
      'College,Department,Year,Division,PRN,DisplayName,Email,SolvedToday,PointsToday,TotalPoints,CurrentStreak';
    const rows = users.map((u) => {
      const solvedToday = u.submissions.length > 0 ? 1 : 0;
      const pointsToday = u.submissions.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);
      return [
        escapeCsvCell(u.college || 'Sanjivani University'),
        escapeCsvCell(u.department || ''),
        escapeCsvCell(u.year || ''),
        escapeCsvCell(u.division || ''),
        escapeCsvCell(u.prn || ''),
        escapeCsvCell(u.displayName || ''),
        escapeCsvCell(u.email),
        escapeCsvCell(solvedToday),
        escapeCsvCell(pointsToday),
        escapeCsvCell(u.totalPoints),
        escapeCsvCell(u.currentStreak),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="logicq_daily_results.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export daily results CSV' });
  }
}

export async function runManualDailyFinalization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { dayId, forceRerun, adminPassword, reason } = req.body || {};

    // 1. Mandatory Re-Authentication for Admin action
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });
    if (!adminUser) {
      res.status(401).json({ success: false, message: 'Admin account not found' });
      return;
    }

    if (!adminPassword) {
      res.status(400).json({ success: false, message: 'Admin password re-authentication is required' });
      return;
    }

    const isValidPassword = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      res.status(403).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    const targetDayId = (dayId as string) || undefined;
    const isRerun = Boolean(forceRerun);

    const result = await runDailyFinalizationJob(targetDayId, {
      forceRerun: isRerun,
      reason: reason || 'Manual admin execution',
      triggeredBy: req.user!.userId,
    } as any);

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        targetId: result.dayId,
        action: isRerun ? 'DAILY_FINALIZATION_RERUN' : 'DAILY_FINALIZATION_RUN',
        newValue: JSON.stringify({
          dayId: result.dayId,
          totalSolvers: result.totalSolvers,
          summariesWritten: result.summariesWritten,
        }),
        reason: reason || 'Admin executed daily finalization',
      },
    });

    res.status(200).json({
      success: result.success,
      message: isRerun
        ? `Daily finalization re-run completed for ${result.dayId}`
        : `Daily finalization completed for ${result.dayId}`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Finalization error' });
  }
}

export async function getDailyFinalizationStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = getServerNow();
    const today = getChallengeDayIST(now);
    const yesterday = addDaysIST(today, -1);
    const isPaused = await isDailyChallengePaused();

    // 1. Live today board computation (top 20 & counts)
    const liveTodayData = await computeDailyBoardForDay(today);

    // 2. Yesterday's frozen board (if finalized)
    const yesterdayFrozen = getFrozenDailyBoard(yesterday);

    // 3. Finalization run history
    const runHistory = getFinalizationRunHistory();

    // 4. Archive of all past frozen daily boards
    const pastBoards = getAllFrozenDailyBoards();

    // 5. Corrections ledger
    const corrections = getDailyCorrections();

    // 6. Admin pause days & user streak freeze usage
    const pauseDays = getAdminPauseDays();
    const freezeUsage = getAllUserFreezes();

    res.status(200).json({
      success: true,
      data: {
        todayDayId: today,
        yesterdayDayId: yesterday,
        isDailyPaused: isPaused,
        liveToday: {
          dayId: today,
          challengeId: liveTodayData.problem?.id || null,
          challengeTitle: liveTodayData.problem?.title || 'No Challenge Active',
          totalSolvers: liveTodayData.totalSolvers,
          top20: liveTodayData.rankedList.slice(0, 20),
        },
        yesterdayFrozen: yesterdayFrozen
          ? {
              dayId: yesterdayFrozen.dayId,
              challengeTitle: yesterdayFrozen.challengeTitle,
              totalSolvers: yesterdayFrozen.totalSolvers,
              finalizedAt: yesterdayFrozen.finalizedAt,
              top20: yesterdayFrozen.top20,
            }
          : null,
        runHistory: runHistory.slice(0, 20),
        pastBoards,
        corrections,
        pauseDays,
        freezeUsage: freezeUsage.slice(0, 50),
      },
    });
  } catch (err: any) {
    console.error('getDailyFinalizationStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch status', error: err?.message, stack: err?.stack });
  }
}

export async function adminCreateDailyCorrection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { dayId, studentPrnOrId, reason, newVerdict, pointsAdjustment, adminPassword } = req.body || {};

    const adminUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!adminUser) {
      res.status(401).json({ success: false, message: 'Admin account not found' });
      return;
    }

    if (!adminPassword) {
      res.status(400).json({ success: false, message: 'Admin password re-authentication is required' });
      return;
    }

    const isValidPassword = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      res.status(403).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    if (!dayId || !studentPrnOrId || !reason || !newVerdict) {
      res.status(400).json({ success: false, message: 'Missing required correction fields' });
      return;
    }

    // Resolve student by PRN, username or ID
    const student = await prisma.user.findFirst({
      where: {
        OR: [
          { id: studentPrnOrId },
          { prn: studentPrnOrId.toUpperCase() },
          { username: studentPrnOrId },
        ],
      },
    });

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found by given identifier' });
      return;
    }

    const record = await createDailyCorrection({
      dayId,
      userId: student.id,
      adminId: req.user!.userId,
      reason,
      oldVerdict: 'NOT_SOLVED',
      newVerdict,
      pointsAdjustment: Number(pointsAdjustment || 0),
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        targetUserId: student.id,
        targetId: record.id,
        action: 'DAILY_CORRECTION_CREATED',
        newValue: JSON.stringify(record),
        reason,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Correction record created successfully',
      data: record,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to create correction' });
  }
}

export async function adminTogglePauseDay(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { dayStr, paused, adminPassword, reason } = req.body || {};

    const adminUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!adminUser) {
      res.status(401).json({ success: false, message: 'Admin account not found' });
      return;
    }

    if (!adminPassword) {
      res.status(400).json({ success: false, message: 'Admin password re-authentication is required' });
      return;
    }

    const isValidPassword = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      res.status(403).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    if (!dayStr) {
      res.status(400).json({ success: false, message: 'dayStr (YYYY-MM-DD) is required' });
      return;
    }

    setAdminPauseDay(dayStr, paused !== false);

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        targetId: dayStr,
        action: paused !== false ? 'ADMIN_PAUSE_DAY_SET' : 'ADMIN_PAUSE_DAY_REMOVED',
        newValue: JSON.stringify({ dayStr, paused: paused !== false }),
        reason: reason || 'Admin updated pause day calendar',
      },
    });

    res.status(200).json({
      success: true,
      message: paused !== false ? `Admin pause day set for ${dayStr}` : `Pause day removed for ${dayStr}`,
      data: { pauseDays: getAdminPauseDays() },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to toggle pause day' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role, reason } = req.body;

    const normalizedNewRole = (role || '').toUpperCase();
    if (!['STUDENT', 'ADMIN', 'CHECKER', 'FACULTY'].includes(normalizedNewRole)) {
      res.status(400).json({ success: false, message: 'Invalid role. Allowed roles: STUDENT, ADMIN, CHECKER, FACULTY' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found' });
      return;
    }

    const currentRole = targetUser.role.toUpperCase();

    // Invariant: Admins cannot demote or remove their own admin role
    if (req.user?.userId === id && currentRole === 'ADMIN' && normalizedNewRole !== 'ADMIN') {
      res.status(400).json({
        success: false,
        message: 'Admins cannot remove their own administrator role',
      });
      return;
    }

    // Invariant: The system must always maintain at least 2 admins
    if (currentRole === 'ADMIN' && normalizedNewRole !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 2) {
        res.status(400).json({
          success: false,
          message: 'Cannot demote admin: The system must always maintain at least 2 active administrators',
        });
        return;
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { role: normalizedNewRole },
        select: { id: true, username: true, role: true },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: req.user!.userId,
          targetUserId: id,
          action: 'UPDATE_USER_ROLE',
          oldValue: currentRole,
          newValue: normalizedNewRole,
          reason: reason || `Admin updated user role from ${currentRole} to ${normalizedNewRole}`,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: `User role updated to ${normalizedNewRole}`,
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

    if (req.user?.userId === id && isBanned) {
      res.status(400).json({
        success: false,
        message: 'Admins cannot ban their own account',
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: !!isBanned },
      select: { id: true, username: true, isBanned: true },
    });

    if (isBanned) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

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

export async function getAdminCheckers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const checkers = await prisma.user.findMany({
      where: { role: 'CHECKER' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        fullName: true,
        isBanned: true,
        isCheckerPaused: true,
        createdAt: true,
        assignedReviews: {
          where: { status: 'PENDING_REVIEW' },
          select: { id: true, assignedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute telemetry for each checker
    const telemetry = await Promise.all(
      checkers.map(async (c) => {
        const completedReviews = await prisma.uploadReview.findMany({
          where: { reviewerId: c.id },
          select: { id: true, createdAt: true },
        });

        return {
          id: c.id,
          email: c.email,
          username: c.username,
          displayName: c.displayName || c.fullName || c.username,
          isBanned: c.isBanned,
          isCheckerPaused: c.isCheckerPaused,
          activeWorkloadCount: c.assignedReviews.length,
          totalCompletedReviews: completedReviews.length,
          createdAt: c.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { checkers: telemetry },
    });
  } catch (err: any) {
    console.error('GetAdminCheckers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch checkers directory' });
  }
}

export async function toggleCheckerPause(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isCheckerPaused } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: { isCheckerPaused: Boolean(isCheckerPaused) },
      select: { id: true, username: true, email: true, isCheckerPaused: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        targetUserId: id,
        action: 'TOGGLE_CHECKER_PAUSE',
        oldValue: (!isCheckerPaused).toString(),
        newValue: Boolean(isCheckerPaused).toString(),
        reason: `Admin toggled checker pause status to ${isCheckerPaused}`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Checker ${updated.isCheckerPaused ? 'paused' : 'resumed'}`,
      data: { checker: updated },
    });
  } catch (err: any) {
    console.error('ToggleCheckerPause error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle checker status' });
  }
}

export async function assignUploadToChecker(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { uploadId } = req.params;
    const { checkerId } = req.body;

    const upload = await prisma.uploadedSolution.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      res.status(404).json({ success: false, message: 'Upload not found' });
      return;
    }

    if (checkerId) {
      // Conflict check: cannot assign upload to its own submitter
      if (upload.userId === checkerId) {
        res.status(400).json({
          success: false,
          message: 'Conflict of interest: Cannot assign upload to the student who submitted it',
        });
        return;
      }

      const checker = await prisma.user.findUnique({
        where: { id: checkerId },
      });

      if (!checker || (checker.role !== 'CHECKER' && checker.role !== 'ADMIN')) {
        res.status(400).json({ success: false, message: 'Target user is not a valid checker' });
        return;
      }
    }

    const updated = await prisma.uploadedSolution.update({
      where: { id: uploadId },
      data: {
        assignedCheckerId: checkerId || null,
        assignedAt: checkerId ? new Date() : null,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user!.userId,
        targetUserId: upload.userId,
        targetId: uploadId,
        action: 'ASSIGN_UPLOAD_CHECKER',
        oldValue: upload.assignedCheckerId || 'UNASSIGNED',
        newValue: checkerId || 'UNASSIGNED',
        reason: `Admin assigned upload to checker ${checkerId || 'NONE'}`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Upload assignment updated',
      data: { upload: updated },
    });
  } catch (err: any) {
    console.error('AssignUploadToChecker error:', err);
    res.status(500).json({ success: false, message: 'Failed to assign upload' });
  }
}

export async function autoAssignRoundRobin(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Active, unpaused, non-banned checkers
    const availableCheckers = await prisma.user.findMany({
      where: {
        role: 'CHECKER',
        isBanned: false,
        isCheckerPaused: false,
      },
      select: {
        id: true,
        assignedReviews: {
          where: { status: 'PENDING_REVIEW' },
          select: { id: true },
        },
      },
    });

    if (availableCheckers.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No active, unpaused checkers available for assignment',
      });
      return;
    }

    // Pending uploads with no assigned checker
    const unassignedUploads = await prisma.uploadedSolution.findMany({
      where: {
        status: 'PENDING_REVIEW',
        assignedCheckerId: null,
      },
      orderBy: { submittedAt: 'asc' },
    });

    let assignedCount = 0;
    // Sort checkers by least active workload
    availableCheckers.sort((a, b) => a.assignedReviews.length - b.assignedReviews.length);

    for (const upload of unassignedUploads) {
      // Pick first checker who is not the submitter of this upload
      const candidate = availableCheckers.find((c) => c.id !== upload.userId);
      if (candidate) {
        await prisma.uploadedSolution.update({
          where: { id: upload.id },
          data: {
            assignedCheckerId: candidate.id,
            assignedAt: new Date(),
          },
        });
        candidate.assignedReviews.push({ id: upload.id });
        availableCheckers.sort((a, b) => a.assignedReviews.length - b.assignedReviews.length);
        assignedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Assigned ${assignedCount} uploads across ${availableCheckers.length} checkers`,
      data: { assignedCount },
    });
  } catch (err: any) {
    console.error('AutoAssignRoundRobin error:', err);
    res.status(500).json({ success: false, message: 'Failed to execute round-robin assignment' });
  }
}

export async function importAllowlistCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const csvContent = typeof req.body.csv === 'string' ? req.body.csv : '';
    if (!csvContent.trim()) {
      res.status(400).json({ success: false, message: 'CSV content is required.' });
      return;
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const validRows: Array<{ prn: string; email: string; rowNumber: number }> = [];
    const malformedRows: Array<{ rowNumber: number; raw: string; reason: string }> = [];
    const duplicateRows: Array<{ rowNumber: number; prn: string; email: string }> = [];

    const seenPrns = new Set<string>();
    const seenEmails = new Set<string>();

    let rowNumber = 0;
    for (const line of lines) {
      rowNumber++;
      // Skip header lines
      if (line.toLowerCase().startsWith('prn,') || line.toLowerCase().startsWith('roll,')) {
        continue;
      }

      const parts = line.split(',').map((s: string) => s.trim());
      if (parts.length < 2) {
        malformedRows.push({
          rowNumber,
          raw: line,
          reason: 'Expected 2 comma-separated columns (PRN, Email).',
        });
        continue;
      }

      const [rawPrn, rawEmail] = parts;
      const normalizedPrn = normalizePrn(rawPrn);
      const normalizedEmail = rawEmail.toLowerCase();

      if (!isValidPrn(normalizedPrn)) {
        malformedRows.push({
          rowNumber,
          raw: line,
          reason: PRN_ERROR_MESSAGE,
        });
        continue;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        malformedRows.push({
          rowNumber,
          raw: line,
          reason: 'Invalid email address format.',
        });
        continue;
      }

      if (seenPrns.has(normalizedPrn) || seenEmails.has(normalizedEmail)) {
        duplicateRows.push({
          rowNumber,
          prn: normalizedPrn,
          email: normalizedEmail,
        });
        continue;
      }

      seenPrns.add(normalizedPrn);
      seenEmails.add(normalizedEmail);
      validRows.push({
        rowNumber,
        prn: normalizedPrn,
        email: normalizedEmail,
      });
    }

    // Update in-memory allowlist content and enable flag
    const compiledCsv = validRows.map((r) => `${r.prn},${r.email}`).join('\n');
    process.env.ALLOWLIST_CSV_CONTENT = compiledCsv;
    process.env.ALLOWLIST_CSV_ENABLED = 'true';

    res.status(200).json({
      success: true,
      message: `Allowlist processed: ${validRows.length} valid entries imported, ${malformedRows.length} malformed rejected, ${duplicateRows.length} duplicates filtered.`,
      data: {
        totalProcessed: rowNumber,
        validCount: validRows.length,
        malformedCount: malformedRows.length,
        duplicateCount: duplicateRows.length,
        malformedRows,
        duplicateRows,
        isAllowlistEnabled: true,
      },
    });
  } catch (err: any) {
    console.error('Allowlist import error:', err);
    res.status(500).json({ success: false, message: 'Failed to import allowlist CSV' });
  }
}

export async function getAllowlistStatus(_req: AuthRequest, res: Response): Promise<void> {
  const isEnabled = process.env.ALLOWLIST_CSV_ENABLED === 'true' || process.env.AUTH_MODE === 'ALLOWLIST_CSV';
  const csvContent = process.env.ALLOWLIST_CSV_CONTENT || '';
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('prn,'));

  res.status(200).json({
    success: true,
    data: {
      isAllowlistEnabled: isEnabled,
      entriesCount: lines.length,
      warning: !isEnabled ? 'Anyone with a college email can register with any correctly shaped PRN' : null,
    },
  });
}

/**
 * Audited Admin Action: Get Daily Challenge System Preview & Status
 */
export async function getAdminDailySystemPreview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { getDailySystemPreview } = await import('../services/system-config.service.js');
    const preview = await getDailySystemPreview();
    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (err: any) {
    console.error('Get daily system preview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily system status' });
  }
}

/**
 * Audited Admin Action: Pause Daily Challenge System
 * Requires admin re-authentication password and audit reason.
 */
export async function adminPauseDailySystem(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { adminPassword, reason } = req.body;
    if (!reason || String(reason).trim().length < 3) {
      res.status(400).json({ success: false, message: 'Audit reason required (at least 3 characters).' });
      return;
    }

    const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Admin privileges required' });
      return;
    }

    const passwordValid = await bcrypt.compare(adminPassword || '', adminUser.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ success: false, message: 'Admin re-authentication failed: incorrect password.' });
      return;
    }

    const { pauseDailySystem } = await import('../services/system-config.service.js');
    const updated = await pauseDailySystem(adminUser.id, reason.trim());

    res.status(200).json({
      success: true,
      message: 'Daily challenge system paused successfully and audited.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Admin pause daily system error:', err);
    res.status(500).json({ success: false, message: 'Failed to pause daily system' });
  }
}

/**
 * Audited Admin Action: Resume Daily Challenge System
 * Requires admin re-authentication password, mode ('NEXT_1700' or 'START_NOW'),
 * and checks that at least 14 validated problems are scheduled.
 */
export async function adminResumeDailySystem(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { adminPassword, mode, reason } = req.body;
    const resumeMode = mode === 'START_NOW' ? 'START_NOW' : 'NEXT_1700';

    const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Admin privileges required' });
      return;
    }

    const passwordValid = await bcrypt.compare(adminPassword || '', adminUser.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ success: false, message: 'Admin re-authentication failed: incorrect password.' });
      return;
    }

    const { resumeDailySystem } = await import('../services/system-config.service.js');
    const result = await resumeDailySystem(adminUser.id, resumeMode, reason);

    res.status(200).json({
      success: true,
      message: `Daily challenge system resumed successfully (${resumeMode}).`,
      data: result,
    });
  } catch (err: any) {
    if (String(err?.message || '').includes('Cannot resume')) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }
    console.error('Admin resume daily system error:', err);
    res.status(500).json({ success: false, message: 'Failed to resume daily system' });
  }
}

/**
 * Bulk syncs registered users from Firestore into SQLite database.
 * Auto-restores all student profiles so Render container restarts never leave database empty.
 */
export async function syncFirestoreUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ success: false, message: 'Users array is required' });
      return;
    }

    const explicitAdminEmails = [
      'admin@logicq.io',
      'thoratpratik2323@gmail.com',
      'logicqarena@gmail.com',
      'hariprasathset@sanjivani.edu.in',
      'logicq1304@gmail.com',
      'ipworker1908@gmail.com',
      'ipverse1918@gmail.com',
    ];
    const isExplicitAdminEmail = (email: string) => explicitAdminEmails.includes(email?.toLowerCase());
    const crypto = await import('crypto');

    let syncedCount = 0;
    for (const u of users) {
      if (!u.email) continue;
      const email = String(u.email).trim().toLowerCase();
      const prn = u.prn ? String(u.prn).trim().toUpperCase() : null;
      const isExplicitAdmin = isExplicitAdminEmail(email);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            prn: prn || existing.prn,
            college: u.college || existing.college || 'Sanjivani University',
            department: u.department || existing.department,
            year: u.year || existing.year,
            division: u.division ?? existing.division,
            displayName: u.displayName || existing.displayName,
            fullName: u.fullName || existing.fullName,
            totalPoints: Math.max(existing.totalPoints || 0, Number(u.totalPoints || 0)),
            currentStreak: Math.max(existing.currentStreak || 0, Number(u.currentStreak || 0)),
            longestStreak: Math.max(existing.longestStreak || 0, Number(u.longestStreak || 0)),
            profileComplete: true,
          },
        });
        if (prn) {
          await prisma.prnIndex.upsert({
            where: { prn },
            create: { prn, userId: existing.id },
            update: { userId: existing.id },
          }).catch(() => {});
        }
        syncedCount++;
      } else {
        const shortId = prn ? prn.slice(-4) : crypto.randomBytes(2).toString('hex').toUpperCase();
        const uniqueSuffix = crypto.randomBytes(3).toString('hex').toLowerCase();
        const username = isExplicitAdmin ? 'admin_logicq1304' : `student_${shortId.toLowerCase()}_${uniqueSuffix}`;
        const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

        const newUser = await prisma.user.create({
          data: {
            username,
            email,
            passwordHash: randomPasswordHash,
            shortId,
            prn,
            college: u.college || 'Sanjivani University',
            department: u.department || null,
            year: u.year || null,
            division: u.division || null,
            displayName: u.displayName || null,
            fullName: u.fullName || (isExplicitAdmin ? 'LogicQ Admin' : `Student ${shortId}`),
            profileComplete: true,
            role: isExplicitAdmin ? 'ADMIN' : 'STUDENT',
            totalPoints: Number(u.totalPoints || 0),
            currentStreak: Number(u.currentStreak || 0),
            longestStreak: Number(u.longestStreak || 0),
          },
        });

        if (prn) {
          await prisma.prnIndex.upsert({
            where: { prn },
            create: { prn, userId: newUser.id },
            update: { userId: newUser.id },
          }).catch(() => {});
        }
        syncedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${syncedCount} users from Firestore into SQLite.`,
      syncedCount,
    });
  } catch (err: any) {
    console.error('syncFirestoreUsers error:', err);
    res.status(500).json({ success: false, message: 'Internal server error syncing users' });
  }
}

export async function compareCodesPlagiarism(req: AuthRequest, res: Response) {
  try {
    const { codeA, codeB } = req.body;
    if (!codeA || !codeB) {
      res.status(400).json({ success: false, message: 'Both codeA and codeB are required' });
      return;
    }
    const result = PlagiarismService.compareCodes(String(codeA), String(codeB));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function scanProblemPlagiarism(req: AuthRequest, res: Response) {
  try {
    const { problemId } = req.params;
    const threshold = req.query.threshold ? parseFloat(String(req.query.threshold)) : 0.70;
    const report = await PlagiarismService.scanProblem(problemId, threshold);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function runSandboxSecurityAudit(_req: AuthRequest, res: Response) {
  try {
    const report = await SecurityAuditService.runFullAudit();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}


