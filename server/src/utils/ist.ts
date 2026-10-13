/**
 * Utilities for Indian Standard Time (IST, UTC+05:30)
 * LogicQ daily challenges unlock at 17:00:00 IST every day.
 * Always uses the server clock (or simulated server time in automated tests).
 */

let simulatedServerNow: Date | null = null;

/**
 * Sets or clears a simulated server clock for deterministic automated tests
 * (e.g., testing 16:59:59 IST vs 17:00:00 IST without waiting in real time).
 */
export function setSimulatedServerTime(date: Date | null): void {
  if (date && process.env.NODE_ENV === 'production') {
    throw new Error('Cannot set simulated server time in production.');
  }
  simulatedServerNow = date ? new Date(date.getTime()) : null;
}

/**
 * Returns the authoritative current server timestamp.
 */
export function getServerNow(): Date {
  return simulatedServerNow ? new Date(simulatedServerNow.getTime()) : new Date();
}

export function getTodayIST(now: Date = getServerNow()): string {
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().split('T')[0];
}

export function getYesterdayIST(now: Date = getServerNow()): string {
  const istOffsetMs = 330 * 60 * 1000;
  const istYesterday = new Date(now.getTime() + istOffsetMs - 24 * 60 * 60 * 1000);
  return istYesterday.toISOString().split('T')[0];
}

export function getSecondsUntilNextISTMidnight(now: Date = getServerNow()): number {
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);

  const tomorrowIST = new Date(istDate);
  tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
  tomorrowIST.setUTCHours(0, 0, 0, 0);

  const diffMs = tomorrowIST.getTime() - istDate.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * Returns the Challenge Day ID (YYYY-MM-DD) for a given timestamp under the 17:00 IST rule.
 * A challenge day D runs from Day D 17:00:00.000 IST (11:30:00.000 UTC)
 * to Day D+1 16:59:59.999 IST (11:29:59.999 UTC).
 */
export function getChallengeDayIST(date: Date = getServerNow()): string {
  const challengeDayOffsetMs = -690 * 60 * 1000; // +5h30m IST minus 17h = -11h30m
  const shifted = new Date(date.getTime() + challengeDayOffsetMs);
  return shifted.toISOString().split('T')[0];
}

/**
 * Adds `offsetDays` (positive or negative) to a YYYY-MM-DD date string.
 */
export function addDaysIST(dayStr: string, offsetDays: number): string {
  const base = new Date(`${dayStr}T00:00:00.000Z`);
  const target = new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
}

/**
 * Given a Challenge Day ID (YYYY-MM-DD), returns its UTC start (17:00:00.000 IST)
 * and UTC end (next day 16:59:59.999 IST).
 */
export function getChallengeDayBoundsUTC(dayStr: string): { startUTC: Date; endUTC: Date } {
  const startUTC = new Date(`${dayStr}T11:30:00.000Z`);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { startUTC, endUTC };
}

/**
 * Returns an ordered array of N consecutive Challenge Day IDs (YYYY-MM-DD)
 * ending on `endDayStr` (oldest first: Day 1 .. Day N).
 */
export function getChallengeDayWindowIST(daysCount: number = 14, endDate: Date = getServerNow()): string[] {
  const endDayStr = getChallengeDayIST(endDate);
  const endBase = new Date(`${endDayStr}T00:00:00.000Z`);
  const days: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(endBase.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/**
 * Returns the 7 challenge dates (YYYY-MM-DD) of the current active week:
 * Days 1..5 are past/today in the week (Day 5 is today's active challenge day),
 * and Days 6..7 are upcoming days in the current week.
 */
export function getCurrentWeekDayDatesIST(now: Date = getServerNow()): string[] {
  const todayChallengeDay = getChallengeDayIST(now);
  const offsets = [-4, -3, -2, -1, 0, 1, 2];
  return offsets.map((offset) => addDaysIST(todayChallengeDay, offset));
}

export const CURRENT_WEEK_SLUGS = [
  'in-place-string-reversal',       // Day 1 (Ended)
  'bitwise-parity-check',           // Day 2 (Ended)
  'count-words-and-chars',          // Day 3 (Ended)
  'sum-of-multiples',               // Day 4 (Ended)
  'daily-longest-unique-substring', // Day 5 (Today - Active 24h Window)
  'valid-parentheses-stack',        // Day 6 (Future - Locked until 17:00 IST)
  'matrix-spiral-traversal',        // Day 7 (Future - Locked until 17:00 IST)
] as const;

export const PAST_WEEK_SLUGS = [
  'circular-buffer-fifo',
  'endian-byte-swap',
  'merge-k-sorted-arrays',
  'lru-cache-c',
  'memory-pool-block-allocator',
  'dijkstra-shortest-path',
  'pointer-arithmetic-palindrome',
  'safe-string-splitter',
  'binary-tree-height',
] as const;

/**
 * Returns metadata for a week by offset (0 = Current Week, -1 = Last Week, -2 = 2 Weeks Ago, -3 = 3 Weeks Ago).
 */
export function getWeekWindowByOffsetIST(weekOffset: number = 0, now: Date = getServerNow()): {
  weekOffset: number;
  weekId: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  isFrozen: boolean;
} {
  const clampedOffset = Math.max(-12, Math.min(0, Math.trunc(weekOffset) || 0));
  const currentWeekDays = getCurrentWeekDayDatesIST(now);
  const shiftDays = clampedOffset * 7;
  const startDate = addDaysIST(currentWeekDays[0], shiftDays);
  const endDate = addDaysIST(currentWeekDays[6], shiftDays);

  let weekLabel = 'Current Week';
  if (clampedOffset === -1) weekLabel = 'Last Week';
  else if (clampedOffset < -1) weekLabel = `${Math.abs(clampedOffset)} Weeks Ago`;

  return {
    weekOffset: clampedOffset,
    weekId: `week_${startDate}_${endDate}`,
    weekLabel: `${weekLabel} (${startDate} – ${endDate})`,
    startDate,
    endDate,
    isFrozen: clampedOffset < 0,
  };
}

/**
 * Returns an array of past challenge day dates and labels for the archive (default 90 days).
 */
export function getPastDaysList(count: number = 90, now: Date = getServerNow()): { date: string; label: string }[] {
  const currentDay = getChallengeDayIST(now);
  const list: { date: string; label: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const d = addDaysIST(currentDay, -i);
    const label = i === 1 ? `Yesterday (${d})` : `${i} Days Ago (${d})`;
    list.push({ date: d, label });
  }
  return list;
}

/**
 * Returns seconds remaining until the next 17:00:00 IST daily challenge unlock.
 */
export function getSecondsUntilNext1700IST(now: Date = getServerNow()): number {
  const currentDayStr = getChallengeDayIST(now);
  const { endUTC } = getChallengeDayBoundsUTC(currentDayStr);
  return Math.max(0, Math.floor((endUTC.getTime() + 1 - now.getTime()) / 1000));
}

/**
 * Returns the exact UTC timestamp of the next 17:00:00.000 IST switch.
 */
export function getNext1700ISTUTC(now: Date = getServerNow()): Date {
  const currentDayStr = getChallengeDayIST(now);
  const { endUTC } = getChallengeDayBoundsUTC(currentDayStr);
  return new Date(endUTC.getTime() + 1);
}
