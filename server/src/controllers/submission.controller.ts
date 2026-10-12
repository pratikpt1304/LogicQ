import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getJudge } from '../judge/judge.factory.js';
import { getQueue } from '../queue/queue.factory.js';
import { evaluateSubmission } from '../services/submission-evaluator.js';
import { getTodayIST, getChallengeDayIST, getCurrentWeekDayDatesIST } from '../utils/ist.js';
import { FEATURES } from '../config/features.config.js';
import { ensureCurrentWeekSchedule } from './problem.controller.js';

export const runCodeSchema = z.object({
  body: z.object({
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
  }),
});

export async function runCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, stdin, timeLimitMs } = req.body;
    const judge = await getJudge();

    const result = await judge.compileAndRun(code, stdin || '', timeLimitMs || 1000, 64);

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
    const { problemId, code, contestId } = req.body;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Problem not found' });
      return;
    }

    // Security check: non-admins cannot submit to unpublished/retired, future-locked, or past-week archive challenges
    if (req.user.role !== 'ADMIN') {
      if (problem.status !== 'PUBLISHED') {
        res.status(403).json({
          success: false,
          message: 'Forbidden: This problem is not published for submissions.',
        });
        return;
      }

      const todayIST = getTodayIST();
      const challengeDayIST = getChallengeDayIST();
      const weekStart = getCurrentWeekDayDatesIST()[0];
      if (
        problem.scheduledDate &&
        (problem.scheduledDate > challengeDayIST || problem.scheduledDate > todayIST)
      ) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: This scheduled challenge has not unlocked yet.',
        });
        return;
      }

      if (!FEATURES.ARCHIVE && problem.scheduledDate && problem.scheduledDate < weekStart) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Submissions to past-week archive problems are disabled.',
        });
        return;
      }
    }

    // Check submission cooldown: max 1 submission every 5 seconds
    const lastSub = await prisma.submission.findFirst({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastSub && Date.now() - new Date(lastSub.createdAt).getTime() < 5000) {
      res.status(429).json({
        success: false,
        message: 'Submission cooldown active. Please wait 5 seconds between submissions.',
      });
      return;
    }

    // If contestId specified, verify contest is ONGOING
    if (contestId) {
      const contest = await prisma.contest.findUnique({ where: { id: contestId } });
      if (!contest || contest.status !== 'ONGOING') {
        res.status(400).json({ success: false, message: 'Contest is not currently active' });
        return;
      }
    }

    // Create submission record with PENDING status
    const submission = await prisma.submission.create({
      data: {
        userId: req.user.userId,
        problemId,
        contestId: contestId || null,
        code,
        verdict: 'PENDING',
      },
    });

    // Add to submission queue
    const queue = getQueue();
    await queue.addJob({ submissionId: submission.id });

    res.status(202).json({
      success: true,
      message: 'Submission received and queued for evaluation',
      data: {
        submissionId: submission.id,
        status: 'PENDING',
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
            select: { id: true, title: true, slug: true, difficulty: true },
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
            select: { id: true, title: true, slug: true, difficulty: true },
          },
        },
      }),
    ]);

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
        problem: u.problem,
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
        submissions,
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
          select: { id: true, title: true, slug: true, difficulty: true },
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

    res.status(200).json({
      success: true,
      data: { submission },
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
