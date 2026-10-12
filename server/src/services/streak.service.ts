import { prisma } from '../utils/prisma.js';
import {
  getServerNow,
  getTodayIST,
  getYesterdayIST,
  getChallengeDayIST,
  addDaysIST,
} from '../utils/ist.js';

const adminPauseDays = new Set<string>();
const weeklyFreezeUsedByUserWeek = new Map<string, number>();

export function setAdminPauseDay(dayStr: string, paused: boolean = true): void {
  if (paused) {
    adminPauseDays.add(dayStr);
  } else {
    adminPauseDays.delete(dayStr);
  }
}

export function clearAdminPauseDays(): void {
  adminPauseDays.clear();
}

export function isAdminPauseDay(dayStr: string): boolean {
  return adminPauseDays.has(dayStr);
}

export function resetWeeklyFreezesForWeek(weekKey?: string): void {
  if (!weekKey) {
    weeklyFreezeUsedByUserWeek.clear();
    return;
  }
  for (const key of weeklyFreezeUsedByUserWeek.keys()) {
    if (key.endsWith(`::${weekKey}`)) {
      weeklyFreezeUsedByUserWeek.delete(key);
    }
  }
}

/**
 * Evaluates a missed challenge day at the 17:00 IST daily boundary:
 * - If `dayStr` is an Admin Pause Day: streak is neither broken nor extended, and weekly freeze is not consumed.
 * - If the student has `currentStreak > 0` and has their 1 weekly freeze remaining for `weekKey`: consumes the freeze and preserves `currentStreak` (advances `lastSolvedDate` to `dayStr` so next day's solve continues the streak).
 * - If the student already used their weekly freeze in `weekKey`: resets `currentStreak` to `0`.
 */
export async function evaluateMissedChallengeDay(
  userId: string,
  dayStr: string,
  weekKey: string = 'current_week'
): Promise<{
  eventType: 'ADMIN_PAUSE_PROTECTED' | 'FREEZE_USED' | 'STREAK_BROKEN' | 'NO_STREAK';
  streakBefore: number;
  streakAfter: number;
  currentStreak: number;
  freezesRemainingAfter: number;
  pausedByAdmin: boolean;
  freezeUsed: boolean;
  streakReset: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastSolvedDate: true },
  });
  if (!user) throw new Error('User not found');

  const mapKey = `${userId}::${weekKey}`;
  const freezesUsed = weeklyFreezeUsedByUserWeek.get(mapKey) || 0;
  const freezesRemainingBefore = Math.max(0, 1 - freezesUsed);

  if (isAdminPauseDay(dayStr)) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSolvedDate: dayStr },
    });
    return {
      eventType: 'ADMIN_PAUSE_PROTECTED',
      streakBefore: user.currentStreak,
      streakAfter: user.currentStreak,
      currentStreak: user.currentStreak,
      freezesRemainingAfter: freezesRemainingBefore,
      pausedByAdmin: true,
      freezeUsed: false,
      streakReset: false,
    };
  }

  if (user.currentStreak <= 0) {
    return {
      eventType: 'NO_STREAK',
      streakBefore: 0,
      streakAfter: 0,
      currentStreak: 0,
      freezesRemainingAfter: freezesRemainingBefore,
      pausedByAdmin: false,
      freezeUsed: false,
      streakReset: false,
    };
  }

  if (freezesRemainingBefore > 0) {
    weeklyFreezeUsedByUserWeek.set(mapKey, freezesUsed + 1);
    await prisma.user.update({
      where: { id: userId },
      data: { lastSolvedDate: dayStr },
    });
    return {
      eventType: 'FREEZE_USED',
      streakBefore: user.currentStreak,
      streakAfter: user.currentStreak,
      currentStreak: user.currentStreak,
      freezesRemainingAfter: 0,
      pausedByAdmin: false,
      freezeUsed: true,
      streakReset: false,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: 0 },
  });

  return {
    eventType: 'STREAK_BROKEN',
    streakBefore: user.currentStreak,
    streakAfter: 0,
    currentStreak: 0,
    freezesRemainingAfter: 0,
    pausedByAdmin: false,
    freezeUsed: false,
    streakReset: true,
  };
}

export async function updateUserStreak(
  userId: string,
  submittedAt: Date = getServerNow()
): Promise<{
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastSolvedDate: true },
  });

  if (!user) throw new Error('User not found');

  const todayIST = getTodayIST(submittedAt);
  const yesterdayIST = getYesterdayIST(submittedAt);
  const challengeDay = getChallengeDayIST(submittedAt);
  const prevChallengeDay = addDaysIST(challengeDay, -1);

  if (user.lastSolvedDate === todayIST || user.lastSolvedDate === challengeDay) {
    // Already solved today, keep current streak
    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isNewDay: false,
    };
  }

  let newStreak = 1;
  if (user.lastSolvedDate === yesterdayIST || user.lastSolvedDate === prevChallengeDay) {
    // Consecutive daily solve!
    newStreak = user.currentStreak + 1;
  } else {
    // Missed one or more days without freeze/pause protection -> resets to 1
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastSolvedDate: challengeDay,
    },
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    isNewDay: true,
  };
}
