import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getQueue } from '../queue/queue.factory.js';
import { getChallengeDayIST, getChallengeDayWindowIST } from '../utils/ist.js';

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
        select: { id: true, username: true, fullName: true },
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
        pilotAnalytics,
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
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

    if (req.user?.userId === id && role !== 'ADMIN') {
      res.status(400).json({
        success: false,
        message: 'Admins cannot demote their own account',
      });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, username: true, role: true },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

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
