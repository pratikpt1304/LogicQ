/**
 * Utilities for Indian Standard Time (IST, UTC+05:30)
 * LogicQ daily challenges reset at 00:00:00 IST every day.
 */

export function getTodayIST(): string {
  const now = new Date();
  // IST offset is +5 hours 30 minutes = +330 minutes
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().split('T')[0];
}

export function getYesterdayIST(): string {
  const now = new Date();
  const istOffsetMs = 330 * 60 * 1000;
  const istYesterday = new Date(now.getTime() + istOffsetMs - 24 * 60 * 60 * 1000);
  return istYesterday.toISOString().split('T')[0];
}

export function getSecondsUntilNextISTMidnight(): number {
  const now = new Date();
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
 * Shifting UTC by -11h 30m (-690 minutes) aligns the 17:00 IST boundary with 00:00 UTC.
 */
export function getChallengeDayIST(date: Date = new Date()): string {
  const challengeDayOffsetMs = -690 * 60 * 1000; // +5h30m IST minus 17h = -11h30m
  const shifted = new Date(date.getTime() + challengeDayOffsetMs);
  return shifted.toISOString().split('T')[0];
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
export function getChallengeDayWindowIST(daysCount: number = 14, endDate: Date = new Date()): string[] {
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
 * Returns seconds remaining until the next 17:00:00 IST daily challenge unlock.
 */
export function getSecondsUntilNext1700IST(now: Date = new Date()): number {
  const currentDayStr = getChallengeDayIST(now);
  const { endUTC } = getChallengeDayBoundsUTC(currentDayStr);
  return Math.max(0, Math.floor((endUTC.getTime() + 1 - now.getTime()) / 1000));
}


