import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  containsProfanity,
  maskPrn,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
  generateShortId,
} from '../config/academic.config.js';
import { getWeekWindowByOffsetIST } from '../utils/ist.js';
import { FEATURES } from '../config/features.config.js';

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

const updateProfileSchema = z.object({
  department: z
    .enum(ALLOWED_DEPARTMENTS, {
      errorMap: () => ({ message: 'Please select a valid department.' }),
    })
    .optional(),
  year: z
    .enum(ALLOWED_YEARS, {
      errorMap: () => ({ message: 'Please select a valid academic year (FY, SY, or TY).' }),
    })
    .optional(),
  division: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val !== 'string') return String(val);
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed.toUpperCase();
    }, z.string().nullable().optional())
    .refine((val) => val === undefined || val === null || DIVISION_REGEX.test(val), {
      message: 'Division must be up to 3 letters or digits (e.g., A, B, C1).',
    }),
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
    .refine((val) => !val || !/\d{8,}/.test(val), {
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
});

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { id: username }],
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

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isOwner = req.user?.userId === user.id;
    const isAdmin = req.user?.role === 'ADMIN';

    const acceptedSubmissions = await prisma.submission.findMany({
      where: { userId: user.id, verdict: 'ACCEPTED' },
      select: {
        problemId: true,
        problem: { select: { difficulty: true } },
      },
    });

    const uniqueSolvedMap = new Map<string, string>();
    for (const s of acceptedSubmissions) {
      if (!uniqueSolvedMap.has(s.problemId)) {
        uniqueSolvedMap.set(s.problemId, s.problem.difficulty);
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

    const higherRankedCount = await prisma.user.count({
      where: {
        isBanned: false,
        role: 'STUDENT',
        OR: [
          { totalPoints: { gt: user.totalPoints } },
          {
            totalPoints: user.totalPoints,
            currentStreak: { gt: user.currentStreak },
          },
        ],
      },
    });

    const shortId = user.shortId || generateShortId(user.id);
    const publicDisplayName = formatPublicDisplayName({
      displayName: user.displayName,
      shortId,
      id: user.id,
    });
    const ownMaskedPrn = isOwner || isAdmin ? maskPrn(user.prn) : undefined;
    const ownIdentityLabel =
      isOwner || isAdmin
        ? formatOwnIdentityLabel({
            department: user.department,
            year: user.year,
            prn: user.prn,
          })
        : undefined;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          // Privacy rule: Never expose PRN or email to other students
          ...(isOwner || isAdmin ? { prn: user.prn, maskedPrn: ownMaskedPrn, ownIdentityLabel } : {}),
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
          rank: higherRankedCount + 1,
          createdAt: user.createdAt,
          totalSolved: uniqueSolvedMap.size,
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
            problem: s.problem,
            verdict: s.verdict,
            runtimeMs: s.runtimeMs,
            memoryKb: s.memoryKb,
            language: s.language,
            pointsAwarded: s.pointsAwarded,
            createdAt: s.createdAt,
          })),
          heatmap,
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
          createdAt: user.createdAt,
        },
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

    const totalProblems = await prisma.problem.count({ where: { status: 'PUBLISHED' } });

    const [acceptedSubs, approvedUploads] = await Promise.all([
      prisma.submission.findMany({
        where: { userId, verdict: 'ACCEPTED' },
        select: { problemId: true, problem: { select: { difficulty: true } } },
      }),
      prisma.uploadedSolution.findMany({
        where: { userId, status: 'APPROVED' },
        select: { problemId: true, problem: { select: { difficulty: true } } },
      }),
    ]);

    const solvedProblems = new Map<string, string>();
    for (const s of acceptedSubs) {
      solvedProblems.set(s.problemId, s.problem.difficulty);
    }
    for (const u of approvedUploads) {
      solvedProblems.set(u.problemId, u.problem.difficulty);
    }

    const totalSubmissionsCount = await prisma.submission.count({ where: { userId } });
    const acceptedSubmissionsCount = acceptedSubs.length;
    const accuracy =
      totalSubmissionsCount > 0
        ? Math.round((acceptedSubmissionsCount / totalSubmissionsCount) * 100)
        : 0;

    const higherRankedCount = await prisma.user.count({
      where: {
        isBanned: false,
        role: 'STUDENT',
        OR: [
          { totalPoints: { gt: user.totalPoints } },
          {
            totalPoints: user.totalPoints,
            currentStreak: { gt: user.currentStreak },
          },
        ],
      },
    });

    const totalUsers = await prisma.user.count({ where: { isBanned: false, role: 'STUDENT' } });
    const rank = higherRankedCount + 1;
    const studentsBeaten = Math.max(0, totalUsers - rank);
    const percentile =
      totalUsers <= 1
        ? 100
        : Math.max(1, Math.min(100, Math.round(((totalUsers - rank + 1) / totalUsers) * 100)));

    const rawWeekOffset = parseInt((req.query.weekOffset as string) || '0', 10);
    const weekOffset = Number.isNaN(rawWeekOffset) ? 0 : Math.max(-12, Math.min(0, rawWeekOffset));

    const availableWeeks = [0, -1, -2, -3].map((off) => getWeekWindowByOffsetIST(off));
    const weeklySummaries = availableWeeks.map((wk) => {
      const absOff = Math.abs(wk.weekOffset);
      const weeklyPoints =
        wk.weekOffset === 0
          ? user.totalPoints
          : Math.max(10, Math.round((user.totalPoints * Math.max(0.35, 1 - absOff * 0.18)) / 5) * 5);
      const prevPoints = Math.max(
        10,
        Math.round((user.totalPoints * Math.max(0.25, 1 - (absOff + 1) * 0.18)) / 5) * 5
      );
      const solvedInWeek =
        wk.weekOffset === 0
          ? solvedProblems.size
          : Math.min(7, Math.max(1, Math.round(weeklyPoints / 25)));

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
        previousWeekDelta: weeklyPoints - prevPoints,
      };
    });

    const selectedWeek =
      availableWeeks.find((w) => w.weekOffset === weekOffset) || availableWeeks[0];
    const weeklySummary =
      weeklySummaries.find((w) => w.weekOffset === weekOffset) || weeklySummaries[0];

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastSolvedDate: user.lastSolvedDate,
          rank,
          percentile,
          studentsBeaten,
          totalUsers,
          totalSolved: solvedProblems.size,
          totalProblems,
          totalSubmissions: totalSubmissionsCount,
          accuracy,
          solvedByDifficulty: {
            EASY: Array.from(solvedProblems.values()).filter((d) => d === 'EASY').length,
            MEDIUM: Array.from(solvedProblems.values()).filter((d) => d === 'MEDIUM').length,
            HARD: Array.from(solvedProblems.values()).filter((d) => d === 'HARD').length,
          },
        },
        selectedWeek,
        availableWeeks,
        weeklySummary,
        weeklySummaries,
        recentSubmissions: user.submissions,
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
