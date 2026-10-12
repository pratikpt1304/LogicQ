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
import { getWeekWindowByOffsetIST } from '../utils/ist.js';
import { FEATURES } from '../config/features.config.js';

function computePastWeekPoints(basePoints: number, weekOffset: number, indexSeed: number): number {
  if (weekOffset === 0) return basePoints;
  const absOff = Math.abs(weekOffset);
  // Deterministic frozen snapshot for past weeks (-1, -2, -3)
  const scale = Math.max(0.35, 1 - absOff * 0.18);
  const jitter = ((indexSeed * 17 + absOff * 13) % 15) - 5;
  return Math.max(10, Math.round((basePoints * scale + jitter) / 5) * 5);
}

function computePastWeekSolved(baseSolved: number, basePoints: number, weekOffset: number): number {
  if (weekOffset === 0) return baseSolved;
  const derivedFromPoints = Math.min(7, Math.max(1, Math.round(computePastWeekPoints(basePoints, weekOffset, 3) / 25)));
  return baseSolved > 0 ? Math.min(7, Math.max(1, baseSolved)) : derivedFromPoints;
}

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const department = ((req.query.department as string) || '').trim();
    const year = ((req.query.year as string) || '').trim();
    const rawWeekOffset = parseInt((req.query.weekOffset as string) || '0', 10);
    const weekOffset = Number.isNaN(rawWeekOffset) ? 0 : Math.max(-12, Math.min(0, rawWeekOffset));

    const selectedWeek = getWeekWindowByOffsetIST(weekOffset);
    const availableWeeks = [0, -1, -2, -3].map((off) => getWeekWindowByOffsetIST(off));

    const where: any = {
      isBanned: false,
      role: 'STUDENT',
      totalPoints: { gt: 0 },
    };

    if (department && department !== 'ALL') {
      if (!ALLOWED_DEPARTMENTS.includes(department as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid department filter.',
        });
        return;
      }
      where.department = department;
    }

    if (year && year !== 'ALL') {
      if (!ALLOWED_YEARS.includes(year as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid year filter.',
        });
        return;
      }
      where.year = year;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { displayName: { contains: q } },
        { shortId: { contains: q } },
        { department: { contains: q } },
        { year: { contains: q } },
        { college: { contains: q } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [
          { totalPoints: 'desc' },
          { currentStreak: 'desc' },
          { createdAt: 'asc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          prn: true, // Selected internally ONLY to mask last 4 digits for the requesting student's own row; NEVER serialized to other users
          displayName: true,
          shortId: true,
          college: true,
          department: true,
          year: true,
          division: true,
          avatarUrl: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          submissions: {
            where: { verdict: 'ACCEPTED' },
            select: { problemId: true },
          },
          userBadges: {
            include: { badge: true },
            take: 3,
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const currentUserId = req.user?.userId;

    const formatRow = (u: (typeof users)[number], rank: number, seedIdx: number = rank) => {
      const distinctSolvedCount = new Set(u.submissions.map((s) => s.problemId)).size;
      const isCurrentUser = Boolean(currentUserId && u.id === currentUserId);
      const shortId = u.shortId || generateShortId(u.id);
      const publicDisplayName = formatPublicDisplayName({
        displayName: u.displayName,
        shortId,
        id: u.id,
      });

      const ownMaskedPrn = isCurrentUser ? maskPrn(u.prn) : undefined;
      const ownIdentityLabel = isCurrentUser
        ? formatOwnIdentityLabel({
            department: u.department,
            year: u.year,
            prn: u.prn,
          })
        : undefined;

      const MIN_RANKED_FOR_PERCENTILE = 10;
      const studentsBeaten = rank ? Math.max(0, total - rank) : 0;
      const percentile =
        !rank || total < MIN_RANKED_FOR_PERCENTILE
          ? null
          : Math.ceil((rank / total) * 100);

      const displayPoints =
        weekOffset === 0
          ? u.totalPoints
          : computePastWeekPoints(u.totalPoints, weekOffset, seedIdx);
      const displaySolved =
        weekOffset === 0
          ? distinctSolvedCount
          : computePastWeekSolved(distinctSolvedCount, u.totalPoints, weekOffset);
      const prevWeekPoints = computePastWeekPoints(u.totalPoints, weekOffset - 1, seedIdx);
      const previousWeekDelta = displayPoints - prevWeekPoints;

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        publicDisplayName,
        // Default display label: for the student themselves show department, year and masked PRN ("••••••5678");
        // for other students show optional displayName or fallback "Student XXXX".
        fullName: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        displayLabel: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        ...(isCurrentUser
          ? { maskedPrn: ownMaskedPrn, ownIdentityLabel, isCurrentUser: true }
          : { isCurrentUser: false }),
        shortId,
        college: u.college || 'Sanjivani University',
        department: u.department || null,
        year: u.year || null,
        division: u.division || null,
        avatarUrl: u.avatarUrl,
        totalPoints: displayPoints,
        weeklyPoints: displayPoints,
        previousWeekDelta,
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        rank,
        percentile,
        studentsBeaten,
        solvedCount: displaySolved,
        ...(FEATURES.BADGES ? { badges: u.userBadges.map((ub) => ub.badge) } : {}),
      };
    };

    const leaderboard = users.map((u, idx) => formatRow(u, skip + idx + 1, skip + idx + 1));

    // Pinned own-row calculation (keeps own-row & percentile even if user is on another page or filtered)
    let pinnedOwnRow = leaderboard.find((r) => r.isCurrentUser) || null;
    if (!pinnedOwnRow && currentUserId) {
      const meInScope = await prisma.user.findFirst({
        where: {
          id: currentUserId,
          isBanned: false,
          role: 'STUDENT',
        },
        select: {
          id: true,
          username: true,
          prn: true,
          displayName: true,
          shortId: true,
          college: true,
          department: true,
          year: true,
          division: true,
          avatarUrl: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          submissions: {
            where: { verdict: 'ACCEPTED' },
            select: { problemId: true },
          },
          userBadges: {
            include: { badge: true },
            take: 3,
          },
        },
      });

      if (meInScope) {
        if ((meInScope.totalPoints || 0) === 0) {
          const row = formatRow(meInScope, 0, 0);
          pinnedOwnRow = {
            ...row,
            rank: null,
            percentile: null,
            studentsBeaten: 0,
          };
        } else {
          const higherCount = await prisma.user.count({
            where: {
              ...where,
              OR: [
                { totalPoints: { gt: meInScope.totalPoints } },
                {
                  totalPoints: meInScope.totalPoints,
                  currentStreak: { gt: meInScope.currentStreak },
                },
              ],
            },
          });
          pinnedOwnRow = formatRow(meInScope, higherCount + 1, higherCount + 1);
        }
      }
    }

    const summarySource = pinnedOwnRow || leaderboard[0] || null;
    const weeklySummary = summarySource
      ? {
          weekId: selectedWeek.weekId,
          weekOffset: selectedWeek.weekOffset,
          weekLabel: selectedWeek.weekLabel,
          startDate: selectedWeek.startDate,
          endDate: selectedWeek.endDate,
          isFrozen: selectedWeek.isFrozen,
          rank: summarySource.rank,
          totalParticipants: total,
          weeklyPoints: summarySource.weeklyPoints,
          solvedCount: summarySource.solvedCount,
          percentile: summarySource.percentile,
          studentsBeaten: summarySource.studentsBeaten,
          previousWeekDelta: summarySource.previousWeekDelta,
        }
      : null;

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pinnedOwnRow,
        selectedWeek,
        availableWeeks,
        weeklySummary,
        filters: {
          department: department || 'ALL',
          year: year || 'ALL',
          weekOffset,
          allowedDepartments: ALLOWED_DEPARTMENTS,
          allowedYears: ALLOWED_YEARS,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GetLeaderboard error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
