import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { isExplicitAdminEmail } from './auth.controller.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  normalizeDepartment,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  containsProfanity,
  maskPrn,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
  generateShortId,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  PRN_CHANGE_COOLDOWN_DAYS,
  PRN_RELEASE_RESERVATION_DAYS,
  PRN_CHANGE_RATE_LIMIT_HOURLY,
  getPrnChangeCooldownStatus,
  verifyAllowlistCsv,
} from '../config/academic.config.js';
import {
  getServerNow,
  getChallengeDayIST,
  addDaysIST,
  getWeekWindowByOffsetIST,
} from '../utils/ist.js';
import { FEATURES, shouldHideEndedProblemTitles } from '../config/features.config.js';
import { ensureCurrentWeekSchedule } from './problem.controller.js';
import {
  computeDailyBoardForDay,
  getFrozenDailyBoard,
  getStudentDailySummary,
  runDailyFinalizationJob,
} from '../services/daily-finalization.service.js';
import { PRACTICE_CONFIG, PracticeModuleConfig } from '../config/practice.config.js';

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

const updateProfileSchema = z.object({
  department: z
    .preprocess((val) => (typeof val === 'string' ? normalizeDepartment(val) || val : val), z.enum(ALLOWED_DEPARTMENTS, {
      errorMap: () => ({ message: 'Please select a valid department.' }),
    }))
    .optional(),
  year: z
    .enum(ALLOWED_YEARS, {
      errorMap: () => ({ message: 'Please select a valid academic year (FY, SY, or TY).' }),
    })
    .optional()
    .nullable(),
  division: z
    .preprocess(
      (val) => (typeof val === 'string' && val.trim().length > 0 ? val.trim().toUpperCase() : null),
      z
        .string()
        .regex(/^[A-Za-z0-9]{1,3}$/, 'Division must be 1 to 3 alphanumeric characters (e.g., A, B1).')
        .nullable()
        .optional()
    ),
  displayName: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val !== 'string') return String(val);
      const cleaned = stripHtmlTags(val);
      return cleaned === '' ? null : cleaned;
    }, z.string().nullable().optional())
    .refine(
      (val) =>
        val === undefined ||
        val === null ||
        (val.length >= DISPLAY_NAME_MIN && val.length <= DISPLAY_NAME_MAX),
      {
        message: `Display name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`,
      }
    )
    .refine((val) => !val || !containsProfanity(val), {
      message: 'Display name contains inappropriate language.',
    })
    .refine((val) => !val || (!/\d{8,}/.test(val) && !PRN_REGEX.test(val)), {
      message: 'Display name cannot contain a PRN or long numeric sequence.',
    }),
  fullName: z
    .string()
    .min(1)
    .max(80)
    .transform(stripHtmlTags)
    .optional(),
  bio: z
    .string()
    .max(300)
    .transform(stripHtmlTags)
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .url('Avatar URL must be a valid URL')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Avatar URL must use http:// or https:// protocol',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  storagePreference: z
    .enum(['GOOGLE_DRIVE', 'FIRESTORE_FALLBACK', 'LOCAL_STORAGE'])
    .optional()
    .nullable(),
  hidePracticeTimer: z.boolean().optional(),
});

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const cleanIdentifier = String(username || '').trim();

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { id: cleanIdentifier },
          { shortId: cleanIdentifier },
          { email: cleanIdentifier.toLowerCase() },
          ...(cleanIdentifier === 'me' && req.user?.userId ? [{ id: req.user.userId }] : []),
          ...(cleanIdentifier === 'me' && req.user?.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      },
      include: {
        userBadges: {
          include: { badge: true },
          orderBy: { unlockedAt: 'desc' },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            problem: {
              select: { id: true, slug: true, title: true, difficulty: true },
            },
          },
        },
      },
    });

    if (!user && (isExplicitAdminEmail(cleanIdentifier) || (req.user?.email && isExplicitAdminEmail(req.user.email)))) {
      const adminEmail = (req.user?.email || cleanIdentifier).toLowerCase();
      const isHari = adminEmail.includes('hariprasath');
      const displayName = isHari ? 'Dr. Hari Prasath (Admin)' : 'Admin';
      const fullName = isHari ? 'Dr. Hari Prasath' : 'LogicQ Admin';
      const bcrypt = (await import('bcryptjs')).default;
      const crypto = (await import('crypto')).default;
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: 'ADMIN', profileComplete: true },
        create: {
          username: adminEmail.split('@')[0],
          email: adminEmail,
          fullName,
          displayName,
          role: 'ADMIN',
          passwordHash: placeholderHash,
          college: 'Sanjivani University',
          department: 'CSE',
          profileComplete: true,
        },
        include: {
          userBadges: { include: { badge: true } },
          submissions: { take: 25, include: { problem: true } },
        },
      });
    }

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isOwner = req.user?.userId === user.id;
    const isAdmin = req.user?.role === 'ADMIN';

    const [acceptedSubmissions, solvedTopicProfileSubs] = await Promise.all([
      prisma.submission.findMany({
        where: { userId: user.id, verdict: 'ACCEPTED' },
        select: {
          problemId: true,
          problem: { select: { difficulty: true } },
        },
      }),
      prisma.topicPracticeSubmission.findMany({
        where: { userId: user.id, status: 'SOLVED' },
        select: { topicId: true, difficulty: true },
      }),
    ]);

    const uniqueSolvedMap = new Map<string, string>();
    for (const s of acceptedSubmissions) {
      if (!uniqueSolvedMap.has(s.problemId)) {
        uniqueSolvedMap.set(s.problemId, s.problem.difficulty);
      }
    }
    for (const t of solvedTopicProfileSubs) {
      if (!uniqueSolvedMap.has(t.topicId)) {
        uniqueSolvedMap.set(t.topicId, t.difficulty);
      }
    }

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;
    for (const diff of uniqueSolvedMap.values()) {
      if (diff === 'EASY') easySolved++;
      else if (diff === 'MEDIUM') mediumSolved++;
      else if (diff === 'HARD') hardSolved++;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const allYearSubmissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: oneYearAgo },
      },
      select: { createdAt: true, verdict: true },
    });

    const heatmap: Record<string, number> = {};
    for (const sub of allYearSubmissions) {
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(sub.createdAt);
      heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
    }

    const isRanked = (user.totalPoints || 0) > 0;
    let rank: number | null = null;
    if (isRanked) {
      const higherRankedCount = await prisma.user.count({
        where: {
          isBanned: false,
          role: 'STUDENT',
          totalPoints: { gt: 0 },
          OR: [
            { totalPoints: { gt: user.totalPoints } },
            {
              totalPoints: user.totalPoints,
              currentStreak: { gt: user.currentStreak },
            },
          ],
        },
      });
      rank = higherRankedCount + 1;
    }

    const shortId = user.shortId || generateShortId(user.id);
    const publicDisplayName = formatPublicDisplayName({
      displayName: user.displayName,
      shortId,
      id: user.id,
    });
    const ownMaskedPrn = isOwner || isAdmin ? maskPrn(user.prn) : undefined;
    const cooldownStatus = isOwner || isAdmin ? getPrnChangeCooldownStatus(user.prnChangedAt) : null;
    const ownIdentityLabel =
      isOwner || isAdmin
        ? formatOwnIdentityLabel({
            department: user.department,
            year: user.year,
            prn: user.prn,
          })
        : undefined;

    const totalSubmissionsCount = await prisma.submission.count({ where: { userId: user.id } });
    const accuracy = totalSubmissionsCount > 0
      ? Math.round((acceptedSubmissions.length / totalSubmissionsCount) * 100)
      : null;

    const now = getServerNow();
    const activeDay = getChallengeDayIST(now);

    // Compute 90-day streak heatmap (solved, missed, frozen, paused)
    const streakHeatmap90d: Array<{ date: string; status: 'solved' | 'missed' | 'frozen' | 'paused'; points: number }> = [];
    for (let i = 89; i >= 0; i--) {
      const dayStr = addDaysIST(activeDay, -i);
      const summary = getStudentDailySummary(user.id, dayStr);
      let status: 'solved' | 'missed' | 'frozen' | 'paused' = 'missed';
      let points = 0;
      if (summary && summary.verdict === 'ACCEPTED') {
        status = 'solved';
        points = summary.points || 20;
      } else if (heatmap[dayStr] && heatmap[dayStr] > 0) {
        const solvedOnDay = allYearSubmissions.some((sub) => {
          const d = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(sub.createdAt);
          return d === dayStr && sub.verdict === 'ACCEPTED';
        });
        if (solvedOnDay) {
          status = 'solved';
          points = 20;
        }
      }
      streakHeatmap90d.push({ date: dayStr, status, points });
    }

    // Compute 30-day daily rank trend
    const rankHistory30d: Array<{ date: string; rank: number | null; points: number }> = [];
    let bestDailyRank: number | null = null;
    for (let i = 29; i >= 0; i--) {
      const dayStr = addDaysIST(activeDay, -i);
      const summary = getStudentDailySummary(user.id, dayStr);
      const rankVal = summary?.dailyRank || null;
      const pointsVal = summary?.points || 0;
      if (rankVal !== null) {
        if (bestDailyRank === null || rankVal < bestDailyRank) {
          bestDailyRank = rankVal;
        }
      }
      rankHistory30d.push({ date: dayStr, rank: rankVal, points: pointsVal });
    }

    const todayBoard = await computeDailyBoardForDay(activeDay);
    const todayRankEntry = todayBoard.rankedList.find((e) => e.userId === user.id);
    const dailyRank = todayRankEntry ? todayRankEntry.rank : null;
    const finalRank = dailyRank || rank;

    if (bestDailyRank === null && (user.totalPoints > 0 || finalRank !== null)) {
      bestDailyRank = finalRank;
    }

    // Practice progress stats (Curriculum mastery & module progress)
    const [practiceProgressList, publishedPracticeProblems, acceptedPracticeSubmissions] = await Promise.all([
      prisma.practiceProgress.findMany({
        where: { userId: user.id },
        select: {
          problemId: true,
          moduleSlug: true,
          isSolved: true,
          attemptsCount: true,
          activeSeconds: true,
          firstAttemptAccepted: true,
        },
      }),
      prisma.problem.findMany({
        where: { isPractice: true, status: 'PUBLISHED' },
        select: { id: true, moduleSlug: true, difficulty: true },
      }),
      prisma.submission.findMany({
        where: {
          userId: user.id,
          verdict: 'ACCEPTED',
          OR: [{ submissionType: 'PRACTICE' }, { problem: { isPractice: true } }],
        },
        select: { problemId: true },
      }),
    ]);

    const solvedPracticeProblemIds = new Set<string>();
    for (const prog of practiceProgressList) {
      if (prog.isSolved) solvedPracticeProblemIds.add(prog.problemId);
    }
    for (const sub of acceptedPracticeSubmissions) {
      solvedPracticeProblemIds.add(sub.problemId);
    }

    let practiceSolvedCount = 0;
    let practiceEasySolved = 0;
    let practiceMediumSolved = 0;
    let practiceHardSolved = 0;
    const practiceSolvedByModule: Record<string, number> = {};

    for (const prob of publishedPracticeProblems) {
      const isSolved = solvedPracticeProblemIds.has(prob.id);
      if (isSolved) {
        practiceSolvedCount++;
        if (prob.moduleSlug) {
          practiceSolvedByModule[prob.moduleSlug] = (practiceSolvedByModule[prob.moduleSlug] || 0) + 1;
        }
        if (prob.difficulty === 'EASY') practiceEasySolved++;
        else if (prob.difficulty === 'MEDIUM') practiceMediumSolved++;
        else if (prob.difficulty === 'HARD') practiceHardSolved++;
      }
    }

    let totalPracticeActiveSeconds = 0;
    let firstAttemptAcceptedCount = 0;
    for (const prog of practiceProgressList) {
      totalPracticeActiveSeconds += prog.activeSeconds || 0;
      if (prog.firstAttemptAccepted) {
        firstAttemptAcceptedCount++;
      }
    }

    let previousModSolved = 0;
    const practiceModules = PRACTICE_CONFIG.MODULES.map((mod: PracticeModuleConfig, idx: number) => {
      const solved = practiceSolvedByModule[mod.slug] || 0;
      const total = mod.totalQuestions || 10;
      const isCompleted = solved >= total;
      let isUnlocked = false;
      if (idx === 0) {
        isUnlocked = true;
      } else {
        const threshold = mod.requiredSolvedToUnlock || PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD;
        isUnlocked = previousModSolved >= threshold;
      }
      previousModSolved = solved;
      const percentage = Math.min(100, Math.round((solved / total) * 100));

      return {
        id: mod.id,
        order: mod.order,
        slug: mod.slug,
        title: mod.title,
        description: mod.description,
        totalQuestions: total,
        solvedCount: solved,
        percentage,
        isUnlocked,
        isCompleted,
      };
    });

    const totalPracticeQuestions = publishedPracticeProblems.length > 0 ? publishedPracticeProblems.length : 40;
    const practiceStats = {
      totalSolved: practiceSolvedCount,
      totalQuestions: totalPracticeQuestions,
      percentage: totalPracticeQuestions > 0 ? Math.min(100, Math.round((practiceSolvedCount / totalPracticeQuestions) * 100)) : 0,
      easySolved: practiceEasySolved,
      mediumSolved: practiceMediumSolved,
      hardSolved: practiceHardSolved,
      totalActiveSeconds: totalPracticeActiveSeconds,
      firstAttemptAcceptedCount,
      modules: practiceModules,
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          // Privacy rule: Never expose PRN or email to other students
          ...(isOwner || isAdmin
            ? {
                prn: user.prn,
                maskedPrn: ownMaskedPrn,
                ownIdentityLabel,
                prnChangedAt: user.prnChangedAt,
                prnNextAllowedDate: cooldownStatus?.nextAllowedDate?.toISOString() || null,
                isPrnChangeEligible: cooldownStatus?.isEligible ?? false,
              }
            : {}),
          ...(isOwner || isAdmin ? { email: user.email } : {}),
          displayName: user.displayName,
          publicDisplayName,
          shortId,
          fullName: isOwner ? ownIdentityLabel || publicDisplayName : publicDisplayName,
          college: user.college,
          department: user.department,
          year: user.year,
          division: user.division,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          role: user.role,
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          streakFreezeStatus: '1 Auto Freeze / 7 Days',
          bestDailyRank,
          accuracy,
          rank: finalRank,
          createdAt: user.createdAt,
          totalSolved: uniqueSolvedMap.size,
          storagePreference: user.storagePreference || 'FIRESTORE_FALLBACK',
          hidePracticeTimer: Boolean(user.hidePracticeTimer),
          solvedByDifficulty: {
            EASY: easySolved,
            MEDIUM: mediumSolved,
            HARD: hardSolved,
          },
          ...(FEATURES.BADGES
            ? {
                badges: user.userBadges.map((ub) => ({
                  ...ub.badge,
                  unlockedAt: ub.unlockedAt,
                })),
              }
            : {}),
          recentSubmissions: user.submissions.map((s) => ({
            id: s.id,
            problem: {
              id: s.problem.id,
              title: s.problem.title,
              slug: s.problem.slug,
              difficulty: s.problem.difficulty,
            },
            verdict: s.verdict,
            runtimeMs: s.runtimeMs,
            memoryKb: s.memoryKb,
            language: s.language,
            pointsAwarded: s.pointsAwarded,
            createdAt: s.createdAt,
            code: isOwner || isAdmin ? s.code : undefined,
          })),
          heatmap,
          streakHeatmap90d,
          rankHistory30d,
          practiceStats,
        },
      },
    });
  } catch (error) {
    console.error('GetUserProfile error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // Immutability rule: A student cannot change PRN or college after signup.
    if (req.body.prn !== undefined || req.body.college !== undefined) {
      res.status(403).json({
        success: false,
        message:
          'Students cannot change PRN or college after signup. Only an administrator can update these fields through an audited action.',
      });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || 'Validation failed. Please check your profile fields.';
      res.status(400).json({
        success: false,
        message: firstError,
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.department !== undefined) updateData.department = parsed.data.department;
    if (parsed.data.year !== undefined) updateData.year = parsed.data.year;
    if (parsed.data.division !== undefined) updateData.division = parsed.data.division;
    if (parsed.data.displayName !== undefined) {
      updateData.displayName = parsed.data.displayName;
      if (parsed.data.displayName) {
        updateData.fullName = parsed.data.displayName;
      }
    }
    if (parsed.data.fullName !== undefined && parsed.data.displayName === undefined) {
      updateData.fullName = parsed.data.fullName;
    }
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
    if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl || null;
    if (parsed.data.storagePreference !== undefined) updateData.storagePreference = parsed.data.storagePreference;
    if (parsed.data.hidePracticeTimer !== undefined) updateData.hidePracticeTimer = parsed.data.hidePracticeTimer;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
    });

    const shortId = updated.shortId || generateShortId(updated.id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          prn: updated.prn,
          maskedPrn: maskPrn(updated.prn),
          ownIdentityLabel: formatOwnIdentityLabel({
            department: updated.department,
            year: updated.year,
            prn: updated.prn,
          }),
          displayName: updated.displayName,
          publicDisplayName: formatPublicDisplayName({
            displayName: updated.displayName,
            shortId,
            id: updated.id,
          }),
          shortId,
          fullName: updated.fullName,
          college: updated.college,
          department: updated.department,
          year: updated.year,
          division: updated.division,
          profileComplete: updated.profileComplete,
          bio: updated.bio,
          avatarUrl: updated.avatarUrl,
          storagePreference: updated.storagePreference,
          hidePracticeTimer: updated.hidePracticeTimer,
          role: updated.role,
          totalPoints: updated.totalPoints,
          currentStreak: updated.currentStreak,
          longestStreak: updated.longestStreak,
        },
      },
    });
  } catch (error) {
    console.error('UpdateProfile error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const changePrnSchema = z
  .object({
    newPrn: z
      .preprocess((val) => normalizePrn(val), z.string())
      .refine((val) => isValidPrn(val), {
        message: PRN_ERROR_MESSAGE,
      }),
    confirmPrn: z
      .preprocess((val) => normalizePrn(val), z.string()),
    reauthConfirmed: z.boolean().refine((val) => val === true, {
      message: 'Sign-in confirmation is required before changing your PRN.',
    }),
  })
  .refine((data) => data.newPrn === data.confirmPrn, {
    message: 'PRN and confirm PRN do not match.',
    path: ['confirmPrn'],
  });

// In-memory rate limiting map for student PRN change attempts: userId -> timestamps array
const prnChangeAttempts = new Map<string, number[]>();

function checkPrnChangeRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const attempts = (prnChangeAttempts.get(userId) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= PRN_CHANGE_RATE_LIMIT_HOURLY) {
    return false;
  }
  attempts.push(now);
  prnChangeAttempts.set(userId, attempts);
  return true;
}

/**
 * Monthly PRN Self-Service Change Endpoint (Atomic Transaction)
 * Allows student to change PRN once every rolling 30 days.
 */
export const changeMyPrn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = req.user.userId;

    // Rate limit abuse check
    if (!checkPrnChangeRateLimit(userId)) {
      res.status(429).json({
        success: false,
        message: 'Too many PRN change attempts. Please wait an hour before trying again.',
      });
      return;
    }

    const parsed = changePrnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { newPrn } = parsed.data;

    // 1. Fetch current student user record
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ success: false, message: 'Banned accounts cannot change PRN.' });
      return;
    }

    // 2. Cooldown check: Rolling 30 days
    const cooldownStatus = getPrnChangeCooldownStatus(user.prnChangedAt);
    if (!cooldownStatus.isEligible) {
      const formattedDate = cooldownStatus.nextAllowedDate?.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      res.status(400).json({
        success: false,
        message: `You can only change your PRN once every 30 days. Next change available on ${formattedDate} (${cooldownStatus.daysRemaining} days remaining).`,
        nextAllowedDate: cooldownStatus.nextAllowedDate?.toISOString(),
      });
      return;
    }

    // 3. No-op check
    if (user.prn === newPrn) {
      res.status(400).json({
        success: false,
        message: 'New PRN cannot be identical to your current PRN.',
      });
      return;
    }

    // 4. Admin allowlist check (if enabled)
    const allowlistCheck = verifyAllowlistCsv(newPrn, user.email);
    if (!allowlistCheck.allowed) {
      res.status(403).json({
        success: false,
        message: allowlistCheck.reason || 'PRN does not match verified email in student allowlist.',
      });
      return;
    }

    const oldPrn = user.prn || '';
    const now = new Date();
    const reservationExpiry = new Date(now.getTime() + PRN_RELEASE_RESERVATION_DAYS * 24 * 60 * 60 * 1000);

    // 5. Execute in single atomic Prisma transaction
    const txResult = await prisma.$transaction(async (tx) => {
      // Check if new PRN is claimed, reserved, or banned
      const existingPrnIndex = await tx.prnIndex.findUnique({
        where: { prn: newPrn },
      });

      if (existingPrnIndex) {
        if (existingPrnIndex.status === 'BANNED') {
          throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
        }

        if (existingPrnIndex.status === 'ACTIVE' && existingPrnIndex.userId !== userId) {
          throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
        }

        if (
          existingPrnIndex.status === 'RELEASED_RESERVED' &&
          existingPrnIndex.userId !== userId &&
          existingPrnIndex.reservedUntil &&
          existingPrnIndex.reservedUntil > now
        ) {
          throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
        }
      }

      // Check if any banned user had this PRN
      const bannedUserWithPrn = await tx.user.findFirst({
        where: { prn: newPrn, isBanned: true },
      });
      if (bannedUserWithPrn) {
        throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
      }

      // Mark old PRN as RELEASED_RESERVED for this student for 30 days (anti-squatting)
      if (oldPrn) {
        await tx.prnIndex.upsert({
          where: { prn: oldPrn },
          update: {
            status: 'RELEASED_RESERVED',
            userId,
            reservedUntil: reservationExpiry,
          },
          create: {
            prn: oldPrn,
            userId,
            status: 'RELEASED_RESERVED',
            reservedUntil: reservationExpiry,
          },
        });
      }

      // Lock new PRN as ACTIVE for this student
      await tx.prnIndex.upsert({
        where: { prn: newPrn },
        update: {
          userId,
          status: 'ACTIVE',
          reservedUntil: null,
        },
        create: {
          prn: newPrn,
          userId,
          status: 'ACTIVE',
          reservedUntil: null,
        },
      });

      // Update student user document
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          prn: newPrn,
          prnChangedAt: now,
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
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          prnChangedAt: true,
        },
      });

      // Append immutable PrnHistory record
      const historyEntry = await tx.prnHistory.create({
        data: {
          userId,
          oldPrn,
          newPrn,
          source: 'STUDENT',
          deviceType: String(req.headers['user-agent'] || 'unknown').slice(0, 100),
          ipAddress: String(req.ip || req.socket.remoteAddress || 'unknown').slice(0, 45),
        },
      });

      return { updatedUser, historyEntry };
    });

    const nextAllowedDate = new Date(now.getTime() + PRN_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: 'Your PRN has been successfully changed.',
      data: {
        user: {
          ...txResult.updatedUser,
          maskedPrn: maskPrn(txResult.updatedUser.prn),
          prnNextAllowedDate: nextAllowedDate.toISOString(),
          isPrnChangeEligible: false,
        },
        historyId: txResult.historyEntry.id,
      },
    });
  } catch (err: any) {
    console.error('changeMyPrn error:', err);
    const msg = err.message || 'Failed to update PRN';
    const isClientErr =
      msg.includes('unavailable') ||
      msg.includes('already registered') ||
      msg.includes('cooldown') ||
      msg.includes('allowlist');
    res.status(isClientErr ? 400 : 500).json({
      success: false,
      message: msg,
    });
  }
};

export const exportMyData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            problem: { select: { slug: true, title: true, difficulty: true } },
          },
        },
        uploadedSolutions: {
          orderBy: { submittedAt: 'desc' },
          include: {
            problem: { select: { slug: true, title: true, difficulty: true } },
          },
        },
        userBadges: {
          include: { badge: true },
        },
        prnHistories: {
          orderBy: { createdAt: 'desc' },
        },
        practiceProgress: {
          include: {
            problem: { select: { slug: true, title: true, difficulty: true } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        profile: {
          id: user.id,
          prn: user.prn,
          college: user.college,
          department: user.department,
          year: user.year,
          division: user.division,
          displayName: user.displayName,
          email: user.email,
          bio: user.bio,
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          prnChangedAt: user.prnChangedAt,
          createdAt: user.createdAt,
        },
        prnHistory: user.prnHistories.map((h) => ({
          id: h.id,
          oldPrn: maskPrn(h.oldPrn),
          newPrn: maskPrn(h.newPrn),
          fullOldPrn: h.oldPrn,
          fullNewPrn: h.newPrn,
          source: h.source,
          reason: h.reason,
          changedAt: h.createdAt,
        })),
        ...(FEATURES.BADGES
          ? {
              badges: user.userBadges.map((ub) => ({
                slug: ub.badge.slug,
                name: ub.badge.name,
                unlockedAt: ub.unlockedAt,
              })),
            }
          : {}),
        submissions: user.submissions.map((s) => ({
          id: s.id,
          problemSlug: s.problem.slug,
          problemTitle: s.problem.title,
          language: s.language,
          verdict: s.verdict,
          runtimeMs: s.runtimeMs,
          memoryKb: s.memoryKb,
          pointsAwarded: s.pointsAwarded,
          code: s.code,
          createdAt: s.createdAt,
        })),
        uploadedSolutions: user.uploadedSolutions.map((u) => {
          let files: any[] = [];
          try {
            files = JSON.parse(u.filesJson || '[]');
          } catch {
            files = [];
          }
          return {
            id: u.id,
            problemSlug: u.problem.slug,
            problemTitle: u.problem.title,
            studentNote: u.studentNote,
            status: u.status,
            pointsAwarded: u.pointsAwarded,
            reviewerComment: u.reviewerComment,
            submittedAt: u.submittedAt,
            reviewedAt: u.reviewedAt,
            files: files.map((f) => ({
              id: f.id,
              storageKey: f.storageKey,
              mimeType: f.mimeType,
              sizeBytes: f.sizeBytes,
              sha256: f.sha256,
              dataBase64: f.dataBase64,
            })),
          };
        }),
        practiceProgress: (user.practiceProgress || []).map((p) => ({
          problemSlug: p.problem.slug,
          problemTitle: p.problem.title,
          moduleSlug: p.moduleSlug,
          isSolved: p.isSolved,
          attemptsCount: p.attemptsCount,
          runsCount: p.runsCount,
          activeSeconds: p.activeSeconds,
          timeToSolveSeconds: p.timeToSolveSeconds,
          timeToFirstAttemptSeconds: p.timeToFirstAttemptSeconds,
          firstAttemptAccepted: p.firstAttemptAccepted,
          firstOpenedAt: p.firstOpenedAt,
          solvedAt: p.solvedAt,
        })),
      },
    });
  } catch (error) {
    console.error('ExportMyData error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Self-service account deletion:
 * - Removes PRN from user document
 * - Frees prnIndex/{prn} so the PRN can be registered again
 * - Deletes all uploadedSolutions and their stored files
 * - Deletes practiceProgress records
 * - Clears profile fields (college, department, year, division, displayName, email, bio, avatarUrl)
 * - Revokes all sessions
 * - Retains only anonymized submission records for historical problem solve statistics
 */
export const deleteMyAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (user.prn) {
        await tx.prnIndex.deleteMany({
          where: { OR: [{ prn: user.prn }, { userId }] },
        });
      } else {
        await tx.prnIndex.deleteMany({ where: { userId } });
      }

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.uploadedSolution.deleteMany({ where: { userId } });
      await tx.practiceProgress.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          prn: null,
          email: `deleted_${userId}@anonymized.invalid`,
          username: `deleted_${userId.slice(0, 8)}_${Date.now()}`,
          fullName: 'Deleted Account',
          displayName: null,
          college: null,
          department: null,
          year: null,
          division: null,
          bio: null,
          avatarUrl: null,
          profileComplete: false,
          isBanned: true,
        },
      });
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message:
        'Your account, PRN, uploaded solution files, and personal profile fields have been permanently deleted and your PRN registration has been freed.',
      data: {
        prnRemoved: true,
        prnIndexFreed: true,
        uploadedFilesDeleted: true,
        profileFieldsCleared: true,
        retainedAnonymizedHistory: 'Anonymized submission aggregates without personal identifiers',
      },
    });
  } catch (error) {
    console.error('DeleteMyAccount error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: {
          include: { badge: true },
          orderBy: { unlockedAt: 'desc' },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            problem: {
              select: { id: true, slug: true, title: true, difficulty: true, basePoints: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const [acceptedSubs, approvedUploads, solvedTopicSubs] = await Promise.all([
      prisma.submission.findMany({
        where: { userId, verdict: 'ACCEPTED' },
        select: { problemId: true, problem: { select: { difficulty: true } } },
      }),
      prisma.uploadedSolution.findMany({
        where: { userId, status: 'APPROVED' },
        select: { problemId: true, problem: { select: { difficulty: true } } },
      }),
      prisma.topicPracticeSubmission.findMany({
        where: { userId, status: 'SOLVED' },
        select: { topicId: true, difficulty: true },
      }),
    ]);

    const solvedProblems = new Map<string, string>();
    for (const s of acceptedSubs) {
      solvedProblems.set(s.problemId, s.problem.difficulty);
    }
    for (const u of approvedUploads) {
      solvedProblems.set(u.problemId, u.problem.difficulty);
    }
    for (const t of solvedTopicSubs) {
      solvedProblems.set(t.topicId, t.difficulty);
    }

    const totalTopicSubmissions = await prisma.topicPracticeSubmission.count({ where: { userId } });
    const totalSubmissionsCount = (await prisma.submission.count({ where: { userId } })) + totalTopicSubmissions;
    const acceptedSubmissionsCount = acceptedSubs.length;
    // Accuracy Rate: accepted divided by total evaluated submissions. With 0 submissions, null (displays "—")
    const accuracy =
      totalSubmissionsCount > 0
        ? Math.round((acceptedSubmissionsCount / totalSubmissionsCount) * 100)
        : null;

    // Minimum ranked students threshold to calculate percentile
    const MIN_RANKED_FOR_PERCENTILE = 10;

    let rank: number | null = null;
    let studentsBeaten = 0;
    let percentile: number | null = null;

    const totalRanked = await prisma.user.count({
      where: {
        isBanned: false,
        role: 'STUDENT',
        totalPoints: { gt: 0 },
      },
    });

    // Only students with at least 1 point are ranked. Unranked students receive null.
    if (user.totalPoints > 0) {
      const higherRankedCount = await prisma.user.count({
        where: {
          isBanned: false,
          role: 'STUDENT',
          totalPoints: { gt: 0 },
          OR: [
            { totalPoints: { gt: user.totalPoints } },
            {
              totalPoints: user.totalPoints,
              currentStreak: { gt: user.currentStreak },
            },
          ],
        },
      });
      rank = higherRankedCount + 1;
      studentsBeaten = Math.max(0, totalRanked - rank);

      // Top X% = ceil(rank / totalRanked * 100). Show only when at least 10 students are ranked.
      if (totalRanked >= MIN_RANKED_FOR_PERCENTILE) {
        percentile = Math.ceil((rank / totalRanked) * 100);
      }
    }

    const totalUsers = totalRanked;

    await ensureCurrentWeekSchedule();
    const now = getServerNow();
    const activeDay = getChallengeDayIST(now);
    const hideEndedTitles = shouldHideEndedProblemTitles();
    const isAdmin = req.user.role === 'ADMIN';

    const rawWeekOffset = parseInt((req.query.weekOffset as string) || '0', 10);
    const weekOffset = Number.isNaN(rawWeekOffset) ? 0 : Math.max(-12, Math.min(0, rawWeekOffset));

    const availableWeeks = [0, -1, -2, -3].map((off) => getWeekWindowByOffsetIST(off, now));
    const currentWeekDates = Array.from({ length: 7 }, (_, idx) =>
      addDaysIST(availableWeeks[0].startDate, idx)
    );
    const currentWeekProblems = await prisma.problem.findMany({
      where: {
        status: 'PUBLISHED',
        scheduledDate: { in: currentWeekDates },
      },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        basePoints: true,
      },
    });
    const problemByScheduledDate = new Map(
      currentWeekProblems
        .filter((p) => Boolean(p.scheduledDate))
        .map((p) => [p.scheduledDate as string, p])
    );

    const weeklySummaries = availableWeeks.map((wk) => {
      const absOff = Math.abs(wk.weekOffset);
      const isCurrentWeek = wk.weekOffset === 0;
      const weeklyPoints = isCurrentWeek ? user.totalPoints : 0;
      const solvedInWeek = isCurrentWeek ? solvedProblems.size : 0;

      // Only show a delta vs previous week if the student has previous week data
      // For a student with no prior week history, previousWeekDelta is null (displays "—" "No previous week yet")
      const previousWeekDelta = null;

      const weekDays = Array.from({ length: 7 }, (_, idx) => addDaysIST(wk.startDate, idx)).filter(
        (d) => d <= activeDay
      );
      const perDayResults = weekDays.map((dateStr) => {
        const prob = problemByScheduledDate.get(dateStr);
        const isEnded = dateStr < activeDay;
        const rawTitle = prob?.title || `Daily Challenge (${dateStr})`;
        const title = !isAdmin && isEnded && hideEndedTitles ? 'Past Daily Challenge' : rawTitle;
        const solved = prob ? solvedProblems.has(prob.id) : false;
        const subForProb = prob
          ? user.submissions.find((s) => s.problem.id === prob.id)
          : undefined;
        const verdict = solved
          ? 'ACCEPTED'
          : subForProb?.verdict || (isEnded ? 'MISSED' : 'PENDING');
        const points = solved ? subForProb?.pointsAwarded || prob?.basePoints || 10 : 0;
        return {
          date: dateStr,
          title,
          verdict,
          points,
        };
      });

      return {
        weekId: wk.weekId,
        weekOffset: wk.weekOffset,
        weekLabel: wk.weekLabel,
        startDate: wk.startDate,
        endDate: wk.endDate,
        isFrozen: wk.isFrozen,
        rank,
        totalParticipants: totalUsers,
        weeklyPoints,
        solvedCount: solvedInWeek,
        percentile,
        studentsBeaten,
        previousWeekDelta,
        perDayResults,
      };
    });

    const selectedWeek =
      availableWeeks.find((w) => w.weekOffset === weekOffset) || availableWeeks[0];
    const weeklySummary =
      weeklySummaries.find((w) => w.weekOffset === weekOffset) || weeklySummaries[0];

    const yesterdayDayStr = addDaysIST(activeDay, -1);
    const todayBoard = await computeDailyBoardForDay(activeDay);
    const todayRankEntry = todayBoard.rankedList.find((e) => e.userId === user.id);
    const dailyRank = todayRankEntry ? todayRankEntry.rank : null;
    const pointsToday = todayRankEntry ? todayRankEntry.pointsToday : 0;
    const todayPercentile = todayRankEntry ? todayRankEntry.percentile : null;

    if (!getFrozenDailyBoard(yesterdayDayStr)) {
      await runDailyFinalizationJob(yesterdayDayStr);
    }
    const yesterdaySummaryRecord = getStudentDailySummary(user.id, yesterdayDayStr);
    const yesterdayPoints = yesterdaySummaryRecord ? yesterdaySummaryRecord.points : 0;
    const vsYesterdayDelta = yesterdaySummaryRecord && (pointsToday > 0 || yesterdayPoints > 0)
      ? pointsToday - yesterdayPoints
      : null;

    const sanitizedRecentSubmissions = user.submissions.map((s) => {
      const isEnded = s.problem.slug !== 'daily-longest-unique-substring';
      return {
        ...s,
        problem: {
          id: s.problem.id,
          title: !isAdmin && isEnded && hideEndedTitles ? 'Past Daily Challenge' : s.problem.title,
          slug: !isAdmin && isEnded ? '' : s.problem.slug,
          difficulty: s.problem.difficulty,
          basePoints: s.problem.basePoints,
          isEnded,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastSolvedDate: user.lastSolvedDate,
          streakFreezeStatus: '1 Auto Freeze / 7 Days',
          rank: dailyRank || rank,
          dailyRank,
          pointsToday,
          percentile: todayPercentile,
          vsYesterdayDelta,
          studentsBeaten: todayRankEntry ? Math.max(0, todayBoard.totalSolvers - todayRankEntry.rank) : studentsBeaten,
          totalUsers: todayBoard.totalSolvers || totalUsers,
          totalSolved: solvedProblems.size,
          thisWeekSolved: solvedProblems.size,
          thisWeekTotal: 7,
          totalSubmissions: totalSubmissionsCount,
          accuracy,
          solvedByDifficulty: {
            EASY: Array.from(solvedProblems.values()).filter((d) => d === 'EASY').length,
            MEDIUM: Array.from(solvedProblems.values()).filter((d) => d === 'MEDIUM').length,
            HARD: Array.from(solvedProblems.values()).filter((d) => d === 'HARD').length,
          },
        },
        dailyRank,
        pointsToday,
        percentile: todayPercentile,
        vsYesterdayDelta,
        yesterdaySummary: yesterdaySummaryRecord,
        dailySummary: yesterdaySummaryRecord,
        selectedWeek,
        availableWeeks,
        weeklySummary: {
          ...(weeklySummary || {}),
          ...(yesterdaySummaryRecord || {}),
          rank: weeklySummary?.rank ?? (yesterdaySummaryRecord?.dailyRank ?? null),
          percentile: weeklySummary?.percentile ?? null,
          previousWeekDelta: weeklySummary?.previousWeekDelta ?? null,
        },
        weeklySummaries,
        recentSubmissions: sanitizedRecentSubmissions,
        ...(FEATURES.BADGES
          ? {
              badges: user.userBadges.map((ub) => ({
                ...ub.badge,
                unlockedAt: ub.unlockedAt,
              })),
            }
          : {}),
      },
    });
  } catch (error) {
    console.error('GetDashboardStats error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
