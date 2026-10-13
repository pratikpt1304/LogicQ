import { prisma } from '../utils/prisma.js';
import { getServerNow, getChallengeDayIST, getNext1700ISTUTC } from '../utils/ist.js';

export interface DailySystemConfigData {
  dailyChallengePaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  pauseReason: string | null;
  resumedAt: string | null;
  resumedBy: string | null;
  resumeMode: 'NEXT_1700' | 'START_NOW' | null;
  minScheduledForResume: number;
}

const CONFIG_KEY = 'daily_challenge_system';
const DEFAULT_MIN_SCHEDULED = 14;

let memoryConfigCache: DailySystemConfigData = {
  dailyChallengePaused: true, // Default safe state: PAUSED
  pausedAt: new Date().toISOString(),
  pausedBy: 'SYSTEM_INIT',
  pauseReason: 'Default safe state: Daily challenge pool transitioning to book-only curriculum',
  resumedAt: null,
  resumedBy: null,
  resumeMode: null,
  minScheduledForResume: DEFAULT_MIN_SCHEDULED,
};

let initialized = false;

export async function initSystemConfig(): Promise<DailySystemConfigData> {
  try {
    const record = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (record) {
      memoryConfigCache = JSON.parse(record.value);
    } else {
      // Seed default paused state into database
      await prisma.systemConfig.create({
        data: {
          key: CONFIG_KEY,
          value: JSON.stringify(memoryConfigCache),
          updatedBy: 'SYSTEM_INIT',
        },
      });
    }
  } catch (err) {
    // If DB is unreachable, fallback to safe memory cache (paused = true)
    console.warn('SystemConfig initialization fallback to in-memory safe pause state:', err);
  }
  initialized = true;
  return memoryConfigCache;
}

export async function getSystemConfig(): Promise<DailySystemConfigData> {
  if (!initialized) {
    await initSystemConfig();
  }
  return memoryConfigCache;
}

export async function isDailyChallengePaused(): Promise<boolean> {
  const config = await getSystemConfig();
  return Boolean(config.dailyChallengePaused);
}

export async function pauseDailySystem(
  adminId: string,
  reason: string
): Promise<DailySystemConfigData> {
  const now = new Date().toISOString();
  const oldState = { ...memoryConfigCache };

  memoryConfigCache = {
    ...memoryConfigCache,
    dailyChallengePaused: true,
    pausedAt: now,
    pausedBy: adminId,
    pauseReason: reason || 'Administrative pause',
    resumedAt: null,
    resumedBy: null,
    resumeMode: null,
  };

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: {
      value: JSON.stringify(memoryConfigCache),
      updatedBy: adminId,
    },
    create: {
      key: CONFIG_KEY,
      value: JSON.stringify(memoryConfigCache),
      updatedBy: adminId,
    },
  });

  // Write to AdminAuditLog
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DAILY_SYSTEM_PAUSED',
      oldValue: JSON.stringify({ dailyChallengePaused: oldState.dailyChallengePaused }),
      newValue: JSON.stringify({ dailyChallengePaused: true, pausedAt: now }),
      reason,
    },
  });

  return memoryConfigCache;
}

export async function resumeDailySystem(
  adminId: string,
  mode: 'NEXT_1700' | 'START_NOW' = 'NEXT_1700',
  reason?: string
): Promise<{ success: boolean; config: DailySystemConfigData; scheduledCount: number }> {
  // 1. Verify minimum scheduled challenges exist
  const now = getServerNow();
  const todayIST = getChallengeDayIST(now);

  const scheduledProblems = await prisma.problem.findMany({
    where: {
      status: 'PUBLISHED',
      isPractice: false,
      scheduledDate: { not: null },
    },
    orderBy: { scheduledDate: 'asc' },
  });

  // Filter future or current scheduled
  const activeScheduled = scheduledProblems.filter(
    (p) => p.scheduledDate && p.scheduledDate >= todayIST
  );

  const minRequired = memoryConfigCache.minScheduledForResume || DEFAULT_MIN_SCHEDULED;
  if (activeScheduled.length < minRequired) {
    throw new Error(
      `Cannot resume daily system: At least ${minRequired} validated challenges must be scheduled. Currently found ${activeScheduled.length}.`
    );
  }

  const nowISO = new Date().toISOString();
  const oldState = { ...memoryConfigCache };

  memoryConfigCache = {
    ...memoryConfigCache,
    dailyChallengePaused: false,
    resumedAt: nowISO,
    resumedBy: adminId,
    resumeMode: mode,
  };

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: {
      value: JSON.stringify(memoryConfigCache),
      updatedBy: adminId,
    },
    create: {
      key: CONFIG_KEY,
      value: JSON.stringify(memoryConfigCache),
      updatedBy: adminId,
    },
  });

  // Write to AdminAuditLog
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DAILY_SYSTEM_RESUMED',
      oldValue: JSON.stringify({ dailyChallengePaused: oldState.dailyChallengePaused }),
      newValue: JSON.stringify({ dailyChallengePaused: false, mode, resumedAt: nowISO }),
      reason: reason || `Admin resumed daily challenge system with mode ${mode}`,
    },
  });

  return {
    success: true,
    config: memoryConfigCache,
    scheduledCount: activeScheduled.length,
  };
}

export async function getDailySystemPreview() {
  const config = await getSystemConfig();
  const now = getServerNow();
  const todayIST = getChallengeDayIST(now);

  const scheduledProblems = await prisma.problem.findMany({
    where: {
      status: 'PUBLISHED',
      isPractice: false,
      scheduledDate: { not: null },
    },
    orderBy: { scheduledDate: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      category: true,
      scheduledDate: true,
      basePoints: true,
    },
  });

  const activeScheduled = scheduledProblems.filter(
    (p) => p.scheduledDate && p.scheduledDate >= todayIST
  );

  const first7 = activeScheduled.slice(0, 7);
  const minRequired = config.minScheduledForResume || DEFAULT_MIN_SCHEDULED;
  const canResume = activeScheduled.length >= minRequired;

  return {
    dailyChallengePaused: config.dailyChallengePaused,
    pausedAt: config.pausedAt,
    pausedBy: config.pausedBy,
    pauseReason: config.pauseReason,
    resumedAt: config.resumedAt,
    scheduledCount: activeScheduled.length,
    minRequired,
    canResume,
    first7Preview: first7,
  };
}
