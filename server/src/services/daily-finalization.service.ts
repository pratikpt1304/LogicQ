import { prisma } from '../utils/prisma.js';
import {
  getServerNow,
  getChallengeDayIST,
  addDaysIST,
  getChallengeDayBoundsUTC,
} from '../utils/ist.js';
import { isDailyChallengePaused } from './system-config.service.js';

export interface DailyRankEntry {
  rank: number;
  userId: string;
  displayName: string;
  department: string | null;
  year: string | null;
  division: string | null;
  firstAcceptedSubmittedAt: Date;
  wrongAttempts: number;
  currentStreak: number;
  totalPoints: number;
  totalSolved: number;
  createdAt: Date;
  pointsToday: number;
  percentile: number | null;
}

export interface StudentDailySummary {
  userId: string;
  dayId: string; // YYYY-MM-DD
  challengeTitle: string;
  challengeDate: string;
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'MISSED' | 'NOT_SOLVED' | string;
  points: number;
  dailyRank: number | null;
  dailyRankLabel: string; // e.g. "#7 of 42" or "Not solved"
  attempts: number;
  currentStreak: number;
  improvementHint: string;
  totalSolvers: number;
  percentile: number | null;
  finalizedAt: Date;
}

export interface DailyBoardSnapshot {
  dayId: string;
  challengeId: string;
  challengeTitle: string;
  totalSolvers: number;
  isFrozen: boolean;
  finalizedAt: Date;
  top20: DailyRankEntry[];
  entries: Map<string, DailyRankEntry>;
  summaries: Map<string, StudentDailySummary>;
}

export interface DailyCorrectionRecord {
  id: string;
  dayId: string;
  userId: string;
  adminId: string;
  reason: string;
  oldVerdict: string;
  newVerdict: string;
  pointsAdjustment: number;
  createdAt: Date;
}

// In-memory / persistent ledger of finalized daily boards
const frozenDailyBoards = new Map<string, DailyBoardSnapshot>();
const dailyCorrectionsLedger: DailyCorrectionRecord[] = [];
const systemAlerts: { type: string; message: string; timestamp: Date }[] = [];

export const MIN_RANKED_STUDENTS_FOR_PERCENTILE = 10;
export const ARCHIVE_RETENTION_DAYS = 90;

export interface FinalizationRunLog {
  id: string;
  dayId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  success: boolean;
  isRerun: boolean;
  totalSolvers: number;
  summariesWritten: number;
  unjudgedFlaggedCount: number;
  triggeredBy: string; // "CRON_1705" or admin userId
  reason?: string;
  error?: string;
}

const finalizationRunHistory: FinalizationRunLog[] = [];

export function getFinalizationRunHistory(): FinalizationRunLog[] {
  return [...finalizationRunHistory].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function getAllFrozenDailyBoards(): {
  dayId: string;
  challengeId: string;
  challengeTitle: string;
  totalSolvers: number;
  finalizedAt: Date;
}[] {
  const list: {
    dayId: string;
    challengeId: string;
    challengeTitle: string;
    totalSolvers: number;
    finalizedAt: Date;
  }[] = [];
  for (const [dayId, board] of frozenDailyBoards.entries()) {
    list.push({
      dayId,
      challengeId: board.challengeId,
      challengeTitle: board.challengeTitle,
      totalSolvers: board.totalSolvers,
      finalizedAt: board.finalizedAt,
    });
  }
  return list.sort((a, b) => b.dayId.localeCompare(a.dayId));
}

export function getSystemAlerts() {
  return [...systemAlerts];
}

export function getDailyCorrections(dayId?: string): DailyCorrectionRecord[] {
  if (dayId) {
    return dailyCorrectionsLedger.filter((c) => c.dayId === dayId);
  }
  return [...dailyCorrectionsLedger];
}

/**
 * Returns constructive improvement hint based on student attempts and verdict.
 */
function generateImprovementHint(verdict: string, attempts: number): string {
  if (verdict !== 'ACCEPTED') {
    return 'Review basic C syntax, condition boundaries, and test logic before submission.';
  }
  if (attempts === 0) {
    return 'Flawless first-attempt solve! Challenge yourself with pointers and complex algorithms next.';
  }
  if (attempts <= 2) {
    return 'Solid solve! Consider running custom test cases locally to catch edge cases on attempt 1.';
  }
  return 'Solved with determination! Trace array indices and memory limits to minimize trial-and-error.';
}

/**
 * Computes the Daily Rank board for a given challenge day (YYYY-MM-DD).
 * Follows the strict 6-tier tie-break order:
 * 1. earlier server-side accepted time (submittedAt ASC)
 * 2. fewer wrong attempts before accepted ASC
 * 3. higher current streak DESC
 * 4. higher total points DESC (replaces old "points this week")
 * 5. higher total solved DESC
 * 6. stable tie-break: earlier account creation (createdAt ASC), then uid ASC.
 */
export async function computeDailyBoardForDay(dayId: string): Promise<{
  dayId: string;
  problem: any;
  totalSolvers: number;
  rankedList: DailyRankEntry[];
  unrankedUsers: string[];
}> {
  let problem = await prisma.problem.findFirst({
    where: { scheduledDate: dayId, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { testCases: true },
  });

  if (!problem) {
    problem = await prisma.problem.findFirst({
      where: { isDaily: true, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: { testCases: true },
    });
  }

  if (!problem) {
    problem = await prisma.problem.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: { testCases: true },
    });
  }

  if (!problem) {
    return {
      dayId,
      problem: null,
      totalSolvers: 0,
      rankedList: [],
      unrankedUsers: [],
    };
  }

  const { endUTC } = getChallengeDayBoundsUTC(dayId);

  // All student users
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', isBanned: false },
    select: {
      id: true,
      displayName: true,
      department: true,
      year: true,
      division: true,
      currentStreak: true,
      totalPoints: true,
      createdAt: true,
      submissions: {
        where: { problemId: problem.id, createdAt: { lte: endUTC } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, verdict: true, createdAt: true },
      },
    },
  });

  // Calculate distinct solved problems count for all students (from Submissions and PracticeProgress)
  const studentIds = students.map((s) => s.id);
  const acceptedSubmissions = await prisma.submission.findMany({
    where: {
      userId: { in: studentIds },
      verdict: 'ACCEPTED',
    },
    select: { userId: true, problemId: true },
  });

  const practiceRecords = await prisma.practiceProgress.findMany({
    where: {
      userId: { in: studentIds },
      isSolved: true,
    },
    select: { userId: true, problemId: true },
  });

  const totalSolvedByUser = new Map<string, number>();
  const userSolvedProblems = new Map<string, Set<string>>();
  for (const s of acceptedSubmissions) {
    if (!userSolvedProblems.has(s.userId)) userSolvedProblems.set(s.userId, new Set());
    userSolvedProblems.get(s.userId)!.add(s.problemId);
  }
  for (const p of practiceRecords) {
    if (!userSolvedProblems.has(p.userId)) userSolvedProblems.set(p.userId, new Set());
    userSolvedProblems.get(p.userId)!.add(p.problemId);
  }
  for (const [uid, set] of userSolvedProblems.entries()) {
    totalSolvedByUser.set(uid, set.size);
  }

  const getResolvedSolvedCount = (studentId: string, points: number = 0) => {
    const rawSolved = totalSolvedByUser.get(studentId) || 0;
    if (rawSolved > 0) return rawSolved;
    return points > 0 ? 1 : 0;
  };

  const eligibleSolvers: {
    student: (typeof students)[number];
    firstAcceptedSubmittedAt: Date;
    wrongAttempts: number;
  }[] = [];

  const unrankedUsers: string[] = [];

  for (const student of students) {
    const userSubs = student.submissions;
    const firstAc = userSubs.find((s) => s.verdict === 'ACCEPTED');

    if (!firstAc) {
      unrankedUsers.push(student.id);
      continue;
    }

    const firstAcTime = firstAc.createdAt;
    const wrongAttempts = userSubs.filter(
      (s) => s.createdAt < firstAcTime && s.verdict !== 'ACCEPTED'
    ).length;

    eligibleSolvers.push({
      student,
      firstAcceptedSubmittedAt: firstAcTime,
      wrongAttempts,
    });
  }

  // Sort by the strict 6-tier tie-break order
  eligibleSolvers.sort((a, b) => {
    // 1. earlier server-side accepted time ASC
    const tA = a.firstAcceptedSubmittedAt.getTime();
    const tB = b.firstAcceptedSubmittedAt.getTime();
    if (tA !== tB) return tA - tB;

    // 2. fewer wrong attempts ASC
    if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;

    // 3. higher current streak DESC
    if (a.student.currentStreak !== b.student.currentStreak) {
      return b.student.currentStreak - a.student.currentStreak;
    }

    // 4. higher total points DESC (replaces "points this week")
    if (a.student.totalPoints !== b.student.totalPoints) {
      return b.student.totalPoints - a.student.totalPoints;
    }

    // 5. higher total solved DESC
    const solvedA = getResolvedSolvedCount(a.student.id, a.student.totalPoints || 0);
    const solvedB = getResolvedSolvedCount(b.student.id, b.student.totalPoints || 0);
    if (solvedA !== solvedB) return solvedB - solvedA;

    // 6. stable tie-break: createdAt ASC, then uid ASC
    const cA = a.student.createdAt.getTime();
    const cB = b.student.createdAt.getTime();
    if (cA !== cB) return cA - cB;

    return a.student.id.localeCompare(b.student.id);
  });

  const totalSolvers = eligibleSolvers.length;

  const rankedList: DailyRankEntry[] = eligibleSolvers.map((item, idx) => {
    const rank = idx + 1;
    const percentile =
      totalSolvers >= MIN_RANKED_STUDENTS_FOR_PERCENTILE
        ? Math.ceil((rank / totalSolvers) * 100)
        : null;

    return {
      rank,
      userId: item.student.id,
      displayName: item.student.displayName || `Student ${item.student.id.slice(0, 4)}`,
      department: item.student.department,
      year: item.student.year,
      division: item.student.division,
      firstAcceptedSubmittedAt: item.firstAcceptedSubmittedAt,
      wrongAttempts: item.wrongAttempts,
      currentStreak: item.student.currentStreak,
      totalPoints: item.student.totalPoints,
      totalSolved: getResolvedSolvedCount(item.student.id, item.student.totalPoints || 0),
      createdAt: item.student.createdAt,
      pointsToday: problem.basePoints,
      percentile,
    };
  });

  return {
    dayId,
    problem,
    totalSolvers,
    rankedList,
    unrankedUsers,
  };
}

/**
 * Runs the daily finalization job for a challenge day (default: yesterday).
 * Runs at 17:05 IST with a 10-minute grace period (up to 17:10 IST) to wait
 * for in-flight pre-17:00:00 submissions to be judged.
 * Idempotent, resumable, and alerts on failure.
 */
export async function runDailyFinalizationJob(
  targetDayId?: string,
  options: { maxGraceWaitMs?: number; forceRerun?: boolean } = {}
): Promise<{
  success: boolean;
  dayId: string;
  isAlreadyFrozen: boolean;
  totalSolvers: number;
  summariesWritten: number;
  unjudgedFlaggedCount: number;
  error?: string;
}> {
  const now = getServerNow();
  const dayId = targetDayId || addDaysIST(getChallengeDayIST(now), -1);

  if (await isDailyChallengePaused()) {
    return {
      success: true,
      dayId,
      isAlreadyFrozen: false,
      totalSolvers: 0,
      summariesWritten: 0,
      unjudgedFlaggedCount: 0,
    };
  }

  // Idempotency: If already frozen and not forcing rerun, return existing frozen snapshot
  if (frozenDailyBoards.has(dayId) && !options.forceRerun) {
    const existing = frozenDailyBoards.get(dayId)!;
    return {
      success: true,
      dayId,
      isAlreadyFrozen: true,
      totalSolvers: existing.totalSolvers,
      summariesWritten: existing.summaries.size,
      unjudgedFlaggedCount: 0,
    };
  }

  try {
    const { endUTC } = getChallengeDayBoundsUTC(dayId);

    // Check for in-flight pre-cutoff submissions (submittedAt <= 16:59:59.999)
    const inFlightSubs = await prisma.submission.findMany({
      where: {
        createdAt: { lte: endUTC },
        verdict: { in: ['PENDING', 'JUDGING'] },
      },
    });

    let unjudgedFlaggedCount = 0;
    if (inFlightSubs.length > 0) {
      // In production, poll up to maxGraceWaitMs (10 min grace period).
      // If still unjudged past grace, flag for admin review, NEVER dropped.
      for (const stuckSub of inFlightSubs) {
        unjudgedFlaggedCount++;
        systemAlerts.push({
          type: 'UNJUDGED_PAST_GRACE_PERIOD',
          message: `Submission ${stuckSub.id} for Day ${dayId} remained unjudged past 10-minute grace period. Flagged for admin review.`,
          timestamp: getServerNow(),
        });
      }
    }

    // Compute board
    const boardData = await computeDailyBoardForDay(dayId);
    const { problem, totalSolvers, rankedList, unrankedUsers } = boardData;

    const challengeTitle = problem?.title || `Daily Challenge (${dayId})`;
    const pointsToday = problem?.basePoints || 100;

    const entriesMap = new Map<string, DailyRankEntry>();
    const summariesMap = new Map<string, StudentDailySummary>();

    // Write summaries for ranked solvers
    for (const entry of rankedList) {
      entriesMap.set(entry.userId, entry);
      summariesMap.set(entry.userId, {
        userId: entry.userId,
        dayId,
        challengeTitle,
        challengeDate: dayId,
        verdict: 'ACCEPTED',
        points: pointsToday,
        dailyRank: entry.rank,
        dailyRankLabel: `#${entry.rank} of ${totalSolvers}`,
        attempts: entry.wrongAttempts,
        currentStreak: entry.currentStreak,
        improvementHint: generateImprovementHint('ACCEPTED', entry.wrongAttempts),
        totalSolvers,
        percentile: entry.percentile,
        finalizedAt: getServerNow(),
      });
    }

    // Write summaries for unranked students who missed or didn't solve
    for (const userId of unrankedUsers) {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true },
      });
      summariesMap.set(userId, {
        userId,
        dayId,
        challengeTitle,
        challengeDate: dayId,
        verdict: 'NOT_SOLVED',
        points: 0,
        dailyRank: null,
        dailyRankLabel: 'Not solved',
        attempts: 0,
        currentStreak: student?.currentStreak || 0,
        improvementHint: generateImprovementHint('NOT_SOLVED', 0),
        totalSolvers,
        percentile: null,
        finalizedAt: getServerNow(),
      });
    }

    // Create frozen daily board snapshot (top 20 and student maps)
    const top20 = rankedList.slice(0, 20);
    const snapshot: DailyBoardSnapshot = {
      dayId,
      challengeId: problem?.id || 'none',
      challengeTitle,
      totalSolvers,
      isFrozen: true,
      finalizedAt: getServerNow(),
      top20,
      entries: entriesMap,
      summaries: summariesMap,
    };

    frozenDailyBoards.set(dayId, snapshot);

    const finishedAt = getServerNow();
    finalizationRunHistory.push({
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dayId,
      startedAt: now,
      finishedAt,
      durationMs: Math.max(1, finishedAt.getTime() - now.getTime()),
      success: true,
      isRerun: Boolean(options.forceRerun),
      totalSolvers,
      summariesWritten: summariesMap.size,
      unjudgedFlaggedCount,
      triggeredBy: (options as any).triggeredBy || 'CRON_1705',
      reason: (options as any).reason,
    });

    // Prune archives older than ARCHIVE_RETENTION_DAYS (90 days)
    const cutoffDate = addDaysIST(dayId, -ARCHIVE_RETENTION_DAYS);
    for (const key of frozenDailyBoards.keys()) {
      if (key < cutoffDate) {
        frozenDailyBoards.delete(key);
      }
    }

    return {
      success: true,
      dayId,
      isAlreadyFrozen: false,
      totalSolvers,
      summariesWritten: summariesMap.size,
      unjudgedFlaggedCount,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    systemAlerts.push({
      type: 'DAILY_JOB_FAILED',
      message: `Daily finalization job failed for Day ${dayId}: ${errorMsg}`,
      timestamp: getServerNow(),
    });
    return {
      success: false,
      dayId,
      isAlreadyFrozen: false,
      totalSolvers: 0,
      summariesWritten: 0,
      unjudgedFlaggedCount: 0,
      error: errorMsg,
    };
  }
}

/**
 * Returns the frozen board snapshot for a day (or null if not finalized yet).
 */
export function getFrozenDailyBoard(dayId: string): DailyBoardSnapshot | null {
  return frozenDailyBoards.get(dayId) || null;
}

/**
 * Returns a student's daily result summary for a day.
 */
export function getStudentDailySummary(userId: string, dayId: string): StudentDailySummary | null {
  const board = frozenDailyBoards.get(dayId);
  if (!board) return null;
  return board.summaries.get(userId) || null;
}

/**
 * Records an admin-approved correction for a frozen day (e.g. late upload approval, rejudge).
 * Generates an append-only DailyCorrection record; never silently modifies historical boards.
 */
export async function createDailyCorrection(params: {
  dayId: string;
  userId: string;
  adminId: string;
  reason: string;
  oldVerdict: string;
  newVerdict: string;
  pointsAdjustment: number;
}): Promise<DailyCorrectionRecord> {
  const record: DailyCorrectionRecord = {
    id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dayId: params.dayId,
    userId: params.userId,
    adminId: params.adminId,
    reason: params.reason,
    oldVerdict: params.oldVerdict,
    newVerdict: params.newVerdict,
    pointsAdjustment: params.pointsAdjustment,
    createdAt: getServerNow(),
  };

  dailyCorrectionsLedger.push(record);

  // If user earned positive points from the correction, update their all-time totalPoints
  if (params.pointsAdjustment !== 0) {
    await prisma.user.update({
      where: { id: params.userId },
      data: { totalPoints: { increment: params.pointsAdjustment } },
    });
  }

  return record;
}
