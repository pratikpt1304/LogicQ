import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  maskPrn,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
  generateShortId,
} from '../config/academic.config.js';
import {
  getServerNow,
  getChallengeDayIST,
  addDaysIST,
  getPastDaysList,
} from '../utils/ist.js';
import { FEATURES } from '../config/features.config.js';
import {
  computeDailyBoardForDay,
  getFrozenDailyBoard,
  MIN_RANKED_STUDENTS_FOR_PERCENTILE,
  runDailyFinalizationJob,
  getStudentDailySummary,
  DailyRankEntry,
} from '../services/daily-finalization.service.js';
import { isDailyChallengePaused } from '../services/system-config.service.js';

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const department = ((req.query.department as string) || '').trim();
    const year = ((req.query.year as string) || '').trim();

    // Tabs: "today" (default), "yesterday", "past_days"
    const rawTab = ((req.query.tab as string) || 'today').trim().toLowerCase();
    const weekOffsetParam = req.query.weekOffset !== undefined ? parseInt(req.query.weekOffset as string, 10) : undefined;
    let tab: 'today' | 'yesterday' | 'past_days' =
      rawTab === 'yesterday' ? 'yesterday' : rawTab === 'past_days' ? 'past_days' : 'today';

    if (weekOffsetParam !== undefined && weekOffsetParam < 0) {
      tab = 'yesterday';
    }

    const now = getServerNow();
    const todayStr = getChallengeDayIST(now);
    const yesterdayStr = addDaysIST(todayStr, -1);

    // Determine target challenge day
    let targetDayStr = todayStr;
    if (weekOffsetParam !== undefined && weekOffsetParam < 0) {
      targetDayStr = addDaysIST(todayStr, weekOffsetParam);
    } else if (tab === 'yesterday') {
      targetDayStr = yesterdayStr;
    } else if (tab === 'past_days') {
      const requestedDate = ((req.query.date as string) || '').trim();
      targetDayStr = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
        ? requestedDate
        : yesterdayStr;
    }

    if (department && department !== 'ALL') {
      if (!ALLOWED_DEPARTMENTS.includes(department as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid department filter.',
        });
        return;
      }
    }

    if (year && year !== 'ALL') {
      if (!ALLOWED_YEARS.includes(year as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid year filter.',
        });
        return;
      }
    }

    // Overall Standing (Points + Streak formula)
    if (rawTab === 'overall') {
      await handleOverallLeaderboard({
        page,
        limit,
        search,
        department,
        year,
        currentUserId: req.user?.userId,
        res,
      });
      return;
    }

    const isPaused = await isDailyChallengePaused();
    if (isPaused && (tab === 'today' || tab === 'yesterday')) {
      const availableDays = getPastDaysList(90, now);
      res.status(200).json({
        success: true,
        data: {
          leaderboard: [],
          pinnedOwnRow: null,
          activeTab: tab,
          dailyChallengePaused: true,
          paused: true,
          message: 'Daily challenges are not live yet. We will announce the start.',
          selectedDay: {
            dayId: targetDayStr,
            dayLabel: 'Daily challenges are not live yet. We will announce the start.',
            isFrozen: false,
            challengeTitle: 'Daily challenges are not live yet. We will announce the start.',
            totalSolvers: 0,
            pointsToday: 0,
          },
          selectedWeek: null,
          yesterdaySummary: null,
          dailySummary: null,
          weeklySummary: null,
          availableDays,
          availableWeeks: [],
          filters: {
            tab,
            date: targetDayStr,
            department: department || 'ALL',
            year: year || 'ALL',
            allowedDepartments: ALLOWED_DEPARTMENTS,
            allowedYears: ALLOWED_YEARS,
          },
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        },
      });
      return;
    }

    // If viewing yesterday and not finalized yet, attempt idempotent finalization
    if (targetDayStr <= yesterdayStr && !getFrozenDailyBoard(targetDayStr)) {
      await runDailyFinalizationJob(targetDayStr);
    }

    // Get frozen board if available, otherwise compute live daily board
    const frozenBoard = getFrozenDailyBoard(targetDayStr);
    let rankedEntries: DailyRankEntry[] = [];
    let problemTitle = `Daily Challenge (${targetDayStr})`;
    let problemPoints = 100;
    let isFrozen = false;

    if (frozenBoard) {
      rankedEntries = Array.from(frozenBoard.entries.values()).sort((a, b) => a.rank - b.rank);
      problemTitle = frozenBoard.challengeTitle;
      isFrozen = true;
    } else {
      const computed = await computeDailyBoardForDay(targetDayStr);
      rankedEntries = computed.rankedList;
      if (computed.problem) {
        problemTitle = computed.problem.title;
        problemPoints = computed.problem.basePoints;
      }
      isFrozen = targetDayStr < todayStr;
    }

    const currentUserId = req.user?.userId;

    // Apply Department and Year filtering
    let filteredList = rankedEntries;
    if (department && department !== 'ALL') {
      filteredList = filteredList.filter((e) => e.department === department);
    }
    if (year && year !== 'ALL') {
      filteredList = filteredList.filter((e) => e.year === year);
    }
    if (search) {
      filteredList = filteredList.filter(
        (e) =>
          e.displayName.toLowerCase().includes(search) ||
          (e.department && e.department.toLowerCase().includes(search)) ||
          (e.year && e.year.toLowerCase().includes(search))
      );
    }

    const total = filteredList.length;
    const skip = (page - 1) * limit;
    const paginatedEntries = filteredList.slice(skip, skip + limit);

    // Fetch user details for PRN masking & own label formatting
    const entryUserIds = paginatedEntries.map((e) => e.userId);
    if (currentUserId && !entryUserIds.includes(currentUserId)) {
      entryUserIds.push(currentUserId);
    }

    const usersMap = new Map(
      (
        await prisma.user.findMany({
          where: { id: { in: entryUserIds } },
          select: {
            id: true,
            username: true,
            prn: true,
            displayName: true,
            shortId: true,
            avatarUrl: true,
            userBadges: { include: { badge: true }, take: 3 },
          },
        })
      ).map((u) => [u.id, u])
    );

    const formatRow = (entry: DailyRankEntry) => {
      const u = usersMap.get(entry.userId);
      const isCurrentUser = Boolean(currentUserId && entry.userId === currentUserId);
      const shortId = u?.shortId || generateShortId(entry.userId);
      const publicDisplayName = formatPublicDisplayName({
        displayName: entry.displayName,
        shortId,
        id: entry.userId,
      });

      const ownMaskedPrn = isCurrentUser && u?.prn ? maskPrn(u.prn) : undefined;
      const ownIdentityLabel = isCurrentUser
        ? formatOwnIdentityLabel({
            department: entry.department,
            year: entry.year,
            prn: u?.prn || null,
          })
        : undefined;

      const studentsBeaten = Math.max(0, total - entry.rank);

      return {
        id: entry.userId,
        userId: entry.userId,
        username: u?.username || entry.displayName,
        displayName: entry.displayName,
        publicDisplayName,
        fullName: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        displayLabel: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        ...(isCurrentUser
          ? { maskedPrn: ownMaskedPrn, ownIdentityLabel, isCurrentUser: true }
          : { isCurrentUser: false }),
        shortId,
        college: 'Sanjivani University',
        department: entry.department,
        year: entry.year,
        division: entry.division,
        avatarUrl: u?.avatarUrl || null,
        totalPoints: entry.totalPoints,
        pointsToday: entry.pointsToday,
        dailyPoints: entry.pointsToday,
        weeklyPoints: entry.pointsToday, // backward-compatibility alias
        currentStreak: entry.currentStreak,
        rank: entry.rank,
        dailyRank: entry.rank,
        percentile: entry.percentile,
        studentsBeaten,
        wrongAttempts: entry.wrongAttempts,
        solvedAt: entry.firstAcceptedSubmittedAt,
        solvedCount: entry.totalSolved,
        ...(FEATURES.BADGES && u?.userBadges ? { badges: u.userBadges.map((ub) => ub.badge) } : {}),
      };
    };

    const leaderboard = paginatedEntries.map(formatRow);

    // Calculate Pinned Own Row
    let pinnedOwnRow = null;
    if (currentUserId) {
      const myRankEntry = rankedEntries.find((e) => e.userId === currentUserId);
      if (myRankEntry) {
        pinnedOwnRow = formatRow(myRankEntry);
      } else {
        // Current user has NOT solved today's challenge -> Unranked
        const myUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            id: true,
            username: true,
            prn: true,
            displayName: true,
            shortId: true,
            department: true,
            year: true,
            division: true,
            avatarUrl: true,
            totalPoints: true,
            currentStreak: true,
          },
        });

        if (myUser) {
          const shortId = myUser.shortId || generateShortId(myUser.id);
          const publicDisplayName = formatPublicDisplayName({
            displayName: myUser.displayName,
            shortId,
            id: myUser.id,
          });
          const ownMaskedPrn = myUser.prn ? maskPrn(myUser.prn) : undefined;
          const ownIdentityLabel = formatOwnIdentityLabel({
            department: myUser.department,
            year: myUser.year,
            prn: myUser.prn,
          });

          pinnedOwnRow = {
            id: myUser.id,
            userId: myUser.id,
            username: myUser.username,
            displayName: myUser.displayName,
            publicDisplayName,
            fullName: ownIdentityLabel || publicDisplayName,
            displayLabel: ownIdentityLabel || publicDisplayName,
            maskedPrn: ownMaskedPrn,
            ownIdentityLabel,
            isCurrentUser: true,
            shortId,
            college: 'Sanjivani University',
            department: myUser.department,
            year: myUser.year,
            division: myUser.division,
            avatarUrl: myUser.avatarUrl,
            totalPoints: myUser.totalPoints,
            pointsToday: 0,
            dailyPoints: 0,
            weeklyPoints: 0,
            currentStreak: myUser.currentStreak,
            rank: null,
            dailyRank: null,
            percentile: null,
            studentsBeaten: 0,
            wrongAttempts: 0,
            status: 'NOT_SOLVED_YET',
            solvedCount: 0,
          };
        }
      }
    }

    // Yesterday's Result Summary ("Yesterday's result")
    let yesterdaySummary = null;
    if (currentUserId) {
      yesterdaySummary = getStudentDailySummary(currentUserId, yesterdayStr);
      if (!yesterdaySummary) {
        // Fallback live check for yesterday
        const yesterdayBoard = await computeDailyBoardForDay(yesterdayStr);
        const myYesterdayEntry = yesterdayBoard.rankedList.find((e) => e.userId === currentUserId);
        const yesterdayUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { currentStreak: true },
        });

        yesterdaySummary = {
          userId: currentUserId,
          dayId: yesterdayStr,
          challengeTitle: yesterdayBoard.problem?.title || `Daily Challenge (${yesterdayStr})`,
          challengeDate: yesterdayStr,
          verdict: myYesterdayEntry ? 'ACCEPTED' : 'NOT_SOLVED',
          points: myYesterdayEntry ? myYesterdayEntry.pointsToday : 0,
          dailyRank: myYesterdayEntry ? myYesterdayEntry.rank : null,
          dailyRankLabel: myYesterdayEntry
            ? `#${myYesterdayEntry.rank} of ${yesterdayBoard.totalSolvers}`
            : 'Not solved',
          attempts: myYesterdayEntry ? myYesterdayEntry.wrongAttempts : 0,
          currentStreak: yesterdayUser?.currentStreak || 0,
          improvementHint: myYesterdayEntry
            ? 'Great solve yesterday! Keep up your streak today.'
            : 'Solve today\'s challenge before 17:00 IST to build your daily streak!',
          totalSolvers: yesterdayBoard.totalSolvers,
          percentile: myYesterdayEntry ? myYesterdayEntry.percentile : null,
          finalizedAt: now,
        };
      }
    }

    const availableDays = getPastDaysList(90, now);
    const dayLabel =
      targetDayStr === todayStr
        ? `Today (${todayStr})`
        : targetDayStr === yesterdayStr
        ? `Yesterday (${yesterdayStr})`
        : `Challenge Day (${targetDayStr})`;

    const selectedDay = {
      dayId: targetDayStr,
      dayLabel,
      isFrozen,
      challengeTitle: problemTitle,
      totalSolvers: rankedEntries.length,
      pointsToday: problemPoints,
    };

    // Backward-compatibility wrapper for any older component reading weekly fields
    const computedWeekOffset = weekOffsetParam !== undefined ? weekOffsetParam : (tab === 'today' ? 0 : -1);
    const legacyWeeklySummary = {
      weekId: `daily_${targetDayStr}`,
      weekOffset: computedWeekOffset,
      weekLabel: computedWeekOffset === -1 ? `Last Week (${dayLabel})` : dayLabel,
      startDate: targetDayStr,
      endDate: targetDayStr,
      isFrozen: targetDayStr < todayStr || isFrozen,
      rank: pinnedOwnRow?.rank || null,
      totalParticipants: total,
      weeklyPoints: pinnedOwnRow?.pointsToday || 0,
      solvedCount: pinnedOwnRow?.rank ? 1 : 0,
      percentile: pinnedOwnRow?.percentile || null,
      studentsBeaten: pinnedOwnRow?.studentsBeaten || 0,
      previousWeekDelta: null,
    };

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pinnedOwnRow,
        activeTab: tab,
        selectedDay,
        selectedWeek: legacyWeeklySummary, // legacy alias
        yesterdaySummary,
        dailySummary: yesterdaySummary,
        weeklySummary: legacyWeeklySummary, // legacy alias
        availableDays,
        availableWeeks: [
          { weekOffset: 0, weekLabel: "Today's Live Board", isFrozen: false },
          { weekOffset: -1, weekLabel: "Yesterday's Final Board", isFrozen: true },
          { weekOffset: -2, weekLabel: "2 Days Ago (Archive)", isFrozen: true },
          { weekOffset: -3, weekLabel: "3 Days Ago (Archive)", isFrozen: true },
        ],
        filters: {
          tab,
          date: targetDayStr,
          department: department || 'ALL',
          year: year || 'ALL',
          allowedDepartments: ALLOWED_DEPARTMENTS,
          allowedYears: ALLOWED_YEARS,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('GetLeaderboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

async function handleOverallLeaderboard({
  page,
  limit,
  search,
  department,
  year,
  currentUserId,
  res,
}: {
  page: number;
  limit: number;
  search: string;
  department: string;
  year: string;
  currentUserId?: string;
  res: Response;
}): Promise<void> {
  // Query all active students
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      isBanned: false,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      prn: true,
      shortId: true,
      college: true,
      department: true,
      year: true,
      division: true,
      avatarUrl: true,
      totalPoints: true,
      currentStreak: true,
      createdAt: true,
      userBadges: FEATURES.BADGES ? { include: { badge: true }, take: 3 } : false,
    },
  });

  // Calculate distinct solved problems count for all students
  const studentIds = students.map((s) => s.id);
  const acceptedSubmissions = await prisma.submission.findMany({
    where: {
      userId: { in: studentIds },
      verdict: 'ACCEPTED',
    },
    select: { userId: true, problemId: true },
  });

  const totalSolvedByUser = new Map<string, number>();
  const userSolvedProblems = new Map<string, Set<string>>();
  for (const s of acceptedSubmissions) {
    if (!userSolvedProblems.has(s.userId)) userSolvedProblems.set(s.userId, new Set());
    userSolvedProblems.get(s.userId)!.add(s.problemId);
  }
  for (const [uid, set] of userSolvedProblems.entries()) {
    totalSolvedByUser.set(uid, set.size);
  }

  // Filter by department and year
  let filtered = students;
  if (department && department !== 'ALL') {
    filtered = filtered.filter((s) => s.department === department);
  }
  if (year && year !== 'ALL') {
    filtered = filtered.filter((s) => s.year === year);
  }
  if (search) {
    filtered = filtered.filter(
      (s) =>
        (s.displayName && s.displayName.toLowerCase().includes(search)) ||
        (s.username && s.username.toLowerCase().includes(search)) ||
        (s.department && s.department.toLowerCase().includes(search)) ||
        (s.year && s.year.toLowerCase().includes(search))
    );
  }

  // Points + Streak Ranking Formula:
  // 1. totalPoints DESC
  // 2. currentStreak DESC (Consistency tie-breaker)
  // 3. totalSolved DESC
  // 4. createdAt ASC (earlier registered)
  // 5. id ASC
  filtered.sort((a, b) => {
    const ptsA = a.totalPoints || 0;
    const ptsB = b.totalPoints || 0;
    if (ptsA !== ptsB) return ptsB - ptsA;

    const strkA = a.currentStreak || 0;
    const strkB = b.currentStreak || 0;
    if (strkA !== strkB) return strkB - strkA;

    const slvA = totalSolvedByUser.get(a.id) || 0;
    const slvB = totalSolvedByUser.get(b.id) || 0;
    if (slvA !== slvB) return slvB - slvA;

    const tA = a.createdAt.getTime();
    const tB = b.createdAt.getTime();
    if (tA !== tB) return tA - tB;

    return a.id.localeCompare(b.id);
  });

  const totalStudents = filtered.length;
  const skip = (page - 1) * limit;
  const paginatedStudents = filtered.slice(skip, skip + limit);

  const formatStudentRow = (s: (typeof students)[number], rank: number | null) => {
    const isCurrentUser = Boolean(currentUserId && s.id === currentUserId);
    const shortId = s.shortId || generateShortId(s.id);
    const publicDisplayName = formatPublicDisplayName({
      displayName: s.displayName,
      shortId,
      id: s.id,
    });
    const ownMaskedPrn = isCurrentUser && s.prn ? maskPrn(s.prn) : undefined;
    const ownIdentityLabel = isCurrentUser
      ? formatOwnIdentityLabel({
          department: s.department,
          year: s.year,
          prn: s.prn || null,
        })
      : undefined;

    const solvedCount = totalSolvedByUser.get(s.id) || 0;
    const studentsBeaten = rank ? Math.max(0, totalStudents - rank) : 0;
    const percentile =
      rank && totalStudents >= MIN_RANKED_STUDENTS_FOR_PERCENTILE
        ? Math.ceil((rank / totalStudents) * 100)
        : null;

    return {
      id: s.id,
      userId: s.id,
      username: s.username,
      displayName: s.displayName,
      publicDisplayName,
      fullName: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
      displayLabel: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
      ...(isCurrentUser
        ? { maskedPrn: ownMaskedPrn, ownIdentityLabel, isCurrentUser: true }
        : { isCurrentUser: false }),
      shortId,
      college: s.college || 'Sanjivani University',
      department: s.department,
      year: s.year,
      division: s.division,
      avatarUrl: s.avatarUrl,
      totalPoints: s.totalPoints || 0,
      pointsToday: 0,
      currentStreak: s.currentStreak || 0,
      rank,
      dailyRank: rank,
      percentile,
      studentsBeaten,
      solvedCount,
      totalSolved: solvedCount,
      wrongAttempts: 0,
      ...(FEATURES.BADGES && s.userBadges ? { badges: (s.userBadges as any[]).map((ub) => ub.badge) } : {}),
    };
  };

  const leaderboard = paginatedStudents.map((s, idx) => formatStudentRow(s, skip + idx + 1));

  let pinnedOwnRow: any = null;
  if (currentUserId) {
    const myIndex = filtered.findIndex((s) => s.id === currentUserId);
    if (myIndex !== -1) {
      pinnedOwnRow = formatStudentRow(filtered[myIndex], myIndex + 1);
    } else {
      const myUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          username: true,
          displayName: true,
          prn: true,
          shortId: true,
          college: true,
          department: true,
          year: true,
          division: true,
          avatarUrl: true,
          totalPoints: true,
          currentStreak: true,
          createdAt: true,
        },
      });
      if (myUser) {
        pinnedOwnRow = formatStudentRow(myUser as any, null);
      }
    }
  }

  const topThree = filtered.slice(0, 3).map((s, idx) => formatStudentRow(s, idx + 1));

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      pinnedOwnRow,
      totalSolvers: totalStudents,
      activeTab: 'overall',
      page,
      limit,
      totalPages: Math.ceil(totalStudents / limit) || 1,
      topThree,
      dailyChallengePaused: false,
      paused: false,
      isFrozen: false,
      filters: {
        tab: 'overall',
        department: department || 'ALL',
        year: year || 'ALL',
        allowedDepartments: ALLOWED_DEPARTMENTS,
        allowedYears: ALLOWED_YEARS,
      },
    },
  });
}

export default getLeaderboard;
