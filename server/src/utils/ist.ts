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
