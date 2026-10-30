import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getJudge } from '../judge/judge.factory.js';
import { getQueue } from '../queue/queue.factory.js';
import { getServerNow, getChallengeDayIST } from '../utils/ist.js';
import { shouldHideEndedProblemTitles } from '../config/features.config.js';
import { ensureCurrentWeekSchedule } from './problem.controller.js';
import { isDailyChallengePaused } from '../services/system-config.service.js';

export const runCodeSchema = z.object({
  body: z.object({
    problemId: z.string().uuid().optional().nullable(),
    code: z
      .string()
      .min(1, 'Source code cannot be empty')
      .max(65536, 'Source code cannot exceed 64KB'),
    stdin: z.string().max(65536, 'Standard input cannot exceed 64KB').default(''),
    timeLimitMs: z.number().min(100).max(5000).default(1000),
  }),
});

export const submitSolutionSchema = z.object({
  body: z.object({
    problemId: z.string().uuid('Valid problem ID is required'),
    code: z
      .string()
      .min(1, 'Source code cannot be empty')
      .max(65536, 'Source code cannot exceed 64KB'),
    contestId: z.string().uuid().optional().nullable(),
    isCheatAutoSubmit: z.boolean().optional(),
    violationReason: z.string().optional(),
  }),
});

function formatSubmissionProblemForHistory(
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    scheduledDate?: string | null;
  } | null,
  activeDay: string,
  hideEndedTitles: boolean,
  isAdmin: boolean
) {
  if (!problem) return null;
  const isEnded = problem.scheduledDate !== activeDay;
  const shouldMaskTitle = !isAdmin && isEnded && hideEndedTitles;
  return {
    id: problem.id,
    title: shouldMaskTitle ? 'Past Challenge' : problem.title,
    slug: isEnded && !isAdmin ? null : problem.slug,
    difficulty: problem.difficulty,
    scheduledDate: problem.scheduledDate ?? null,
    isEnded,
  };
}

export async function runCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureCurrentWeekSchedule();
    const { problemId, code, stdin, timeLimitMs } = req.body;

    if (problemId && req.user?.role !== 'ADMIN') {
      const activeDay = getChallengeDayIST(getServerNow());
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { id: true, status: true, scheduledDate: true, isPractice: true, moduleSlug: true },
      });
      if (!problem || problem.status !== 'PUBLISHED') {
        res.status(403).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Challenge not available.',
        });
        return;
      }
      if (!problem.isPractice && (await isDailyChallengePaused())) {
        res.status(403).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Challenge not available.',
        });
        return;
      }
      if (!problem.isPractice && problem.scheduledDate !== activeDay) {
        res.status(403).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Challenge not available: this challenge has ended or is not active.',
        });
        return;
      }
    }

    const judge = await getJudge();
    const result = await judge.compileAndRun(code, stdin || '', timeLimitMs || 1000, 64);

    if (problemId && req.user?.userId) {
      try {
        const prob = await prisma.problem.findUnique({
          where: { id: problemId },
          select: { id: true, isPractice: true, moduleSlug: true },
        });
        if (prob?.isPractice && prob.moduleSlug) {
          await prisma.practiceProgress.upsert({
            where: {
              userId_problemId: {
                userId: req.user.userId,
                problemId: prob.id,
              },
            },
            update: {
              runsCount: { increment: 1 },
            },
            create: {
              userId: req.user.userId,
              problemId: prob.id,
              moduleSlug: prob.moduleSlug,
              runsCount: 1,
              attemptsCount: 0,
              activeSeconds: 0,
              firstOpenedAt: new Date(),
              lastSyncedAt: new Date(),
            },
          });
        }
      } catch {
        // Non-blocking telemetry
      }
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Run code error:', err);
    if (String(err?.message || '').includes('JUDGE_UNAVAILABLE')) {
      res.status(503).json({
        success: false,
        message: 'Code execution service is temporarily unavailable. Your code is saved — please try again in a moment.',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Code execution service is temporarily unavailable. Your code is saved — please try again in a moment.',
    });
  }
}

export async function submitSolution(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Capture authoritative server timestamp immediately on request arrival
    const submittedAt = getServerNow();
    const challengeDayIST = getChallengeDayIST(submittedAt);

    // Fail closed if real C compiler judge is unavailable
    try {
      await getJudge();
    } catch {
      res.status(503).json({
        success: false,
        message: 'Code execution service is temporarily unavailable. Your code is saved — please try again in a moment.',
      });
      return;
    }

    await ensureCurrentWeekSchedule();
    const { problemId, code, contestId, isCheatAutoSubmit, violationReason } = req.body;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Problem not found' });
      return;
    }

    // Single Visible Question Rule applies strictly to Daily Challenge.
    // Practice problems can be submitted anytime if published and module unlocked.
    if (req.user.role !== 'ADMIN') {
      if (problem.status !== 'PUBLISHED') {
        res.status(403).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Challenge not available.',
        });
        return;
      }

      if (!problem.isPractice && (await isDailyChallengePaused())) {
        res.status(403).json({
          success: false,
          code: 'CHALLENGE_NOT_AVAILABLE',
          message: 'Daily challenges are not available at this time.',
        });
        return;
      }

      if (!problem.isPractice && problem.scheduledDate !== challengeDayIST) {
        const isEnded = Boolean(problem.scheduledDate && problem.scheduledDate < challengeDayIST);
        res.status(403).json({
          success: false,
          code: isEnded ? 'CHALLENGE_ENDED' : 'CHALLENGE_NOT_AVAILABLE',
          message: isEnded
            ? 'Challenge not available: this challenge ended at 17:00 IST.'
            : 'Challenge not available.',
        });
        return;
      }
    }

    // Check submission cooldown: max 1 submission every 5 seconds
    const lastSub = await prisma.submission.findFirst({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastSub) {
      const deltaMs = submittedAt.getTime() - new Date(lastSub.createdAt).getTime();
      if (deltaMs >= 0 && deltaMs < 5000) {
        res.status(429).json({
          success: false,
          message: 'Submission cooldown active. Please wait 5 seconds between submissions.',
        });
        return;
      }
    }

    // If contestId specified, verify contest is ONGOING
    if (contestId) {
      const contest = await prisma.contest.findUnique({ where: { id: contestId } });
      if (!contest || contest.status !== 'ONGOING') {
        res.status(400).json({ success: false, message: 'Contest is not currently active' });
        return;
      }
    }

    // Create submission record with PENDING status, authoritative submittedAt, and appropriate submissionType
    const submissionType = problem.isPractice ? 'PRACTICE' : 'DAILY';

    if (isCheatAutoSubmit) {
      const compileOutput = `[Anti-Cheat Auto-Lock]: ${violationReason || 'Proctoring violation detected (tab switches/copy-paste). Disqualified with 0 marks.'}`;
      const submission = await prisma.submission.create({
        data: {
          userId: req.user.userId,
          problemId,
          contestId: contestId || null,
          submissionType,
          code,
          verdict: 'WRONG_ANSWER',
          pointsAwarded: 0,
          compileOutput,
          createdAt: submittedAt,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Cheat submission quarantined and recorded with 0 points penalty.',
        data: {
          submissionId: submission.id,
          submittedAt: submission.createdAt,
          status: 'COMPLETED',
          submissionType,
          verdict: 'WRONG_ANSWER',
          pointsAwarded: 0,
          isCheatAutoSubmit: true,
          compileOutput,
        },
      });
      return;
    }
    const submission = await prisma.submission.create({
      data: {
        userId: req.user.userId,
        problemId,
        contestId: contestId || null,
        submissionType,
        code,
        verdict: 'PENDING',
        createdAt: submittedAt,
      },
    });

    // Add to submission queue (Practice has lower priority 2, Daily has priority 1)
    const queue = getQueue();
    await queue.addJob({
      submissionId: submission.id,
      priority: problem.isPractice ? 2 : 1,
    } as any);

    res.status(202).json({
      success: true,
      message: 'Submission received and queued for evaluation',
      data: {
        submissionId: submission.id,
        submittedAt: submission.createdAt,
        status: 'PENDING',
        submissionType,
      },
    });
  } catch (err: any) {
    console.error('Submit solution error:', err);
    res.status(500).json({ success: false, message: 'Failed to process submission' });
  }
}

export async function getMySubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await ensureCurrentWeekSchedule();
    const activeDay = getChallengeDayIST(getServerNow());
    const hideEndedTitles = shouldHideEndedProblemTitles();
    const isAdmin = req.user.role === 'ADMIN';

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [submissions, total, uploadedSolutions] = await Promise.all([
      prisma.submission.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          problem: {
            select: { id: true, title: true, slug: true, difficulty: true, scheduledDate: true },
          },
          testCaseResults: {
            select: { id: true, verdict: true, runtimeMs: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
      prisma.submission.count({ where: { userId: req.user.userId } }),
      prisma.uploadedSolution.findMany({
        where: { userId: req.user.userId },
        orderBy: { submittedAt: 'desc' },
        include: {
          problem: {
            select: { id: true, title: true, slug: true, difficulty: true, scheduledDate: true },
          },
        },
      }),
    ]);

    const formattedSubmissions = submissions.map((s) => ({
      ...s,
      problem: formatSubmissionProblemForHistory(s.problem, activeDay, hideEndedTitles, isAdmin),
    }));

    const formattedUploads = uploadedSolutions.map((u) => {
      let files: any[] = [];
      try {
        files = JSON.parse(u.filesJson || '[]');
      } catch {
        files = [];
      }
      return {
        id: u.id,
        problemId: u.problemId,
        problem: formatSubmissionProblemForHistory(u.problem, activeDay, hideEndedTitles, isAdmin),
        studentNote: u.studentNote,
        status: u.status,
        pointsAwarded: u.pointsAwarded,
        reviewerComment: u.reviewerComment,
        submittedAt: u.submittedAt,
        reviewedAt: u.reviewedAt,
        fileCount: files.length,
        files: files.map((f) => ({
          id: f.id,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        submissions: formattedSubmissions,
        uploadedSolutions: formattedUploads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Get my submissions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
}

export async function getSubmissionById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        problem: {
          select: { id: true, title: true, slug: true, difficulty: true, scheduledDate: true },
        },
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        testCaseResults: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    // Strict IDOR protection: Only the submission owner or an ADMIN can read a submission record
    const isOwner = req.user?.userId === submission.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Students can only read their own submissions.',
      });
      return;
    }

    const activeDay = getChallengeDayIST(getServerNow());
    const hideEndedTitles = shouldHideEndedProblemTitles();

    res.status(200).json({
      success: true,
      data: {
        submission: {
          ...submission,
          problem: formatSubmissionProblemForHistory(
            submission.problem,
            activeDay,
            hideEndedTitles,
            isAdmin
          ),
        },
      },
    });
  } catch (err: any) {
    console.error('Get submission by id error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch submission' });
  }
}

export async function getProblemSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { problemId } = req.params;

    const submissions = await prisma.submission.findMany({
      where: {
        userId: req.user.userId,
        problemId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        testCaseResults: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: { submissions },
    });
  } catch (err: any) {
    console.error('Get problem submissions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
}
