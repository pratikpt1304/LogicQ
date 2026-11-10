import { Request, Response } from 'express';
import { z } from 'zod';
import { SmartExamService } from '../services/smart-exam.service.js';
import { AiVivaService } from '../services/ai-viva.service.js';
import { prisma } from '../utils/prisma.js';

const startQuestionSchema = z.object({
  assignmentId: z.string().min(1).max(128),
  problemId: z.string().min(1).max(128),
});

const runCodeSchema = z.object({
  attemptId: z.string().min(1).max(128),
  code: z.string().max(64 * 1024),
});

const clientMetricsSchema = z.object({
  copyPasteAttempts: z.number().int().min(0).max(10000).optional(),
  cutAttempts: z.number().int().min(0).max(10000).optional(),
  contextMenuAttempts: z.number().int().min(0).max(10000).optional(),
  tabSwitchCount: z.number().int().min(0).max(10000).optional(),
  focusLossCount: z.number().int().min(0).max(10000).optional(),
  totalFocusLossDurationMs: z.number().int().min(0).max(86400000).optional(),
  longestFocusLossDurationMs: z.number().int().min(0).max(86400000).optional(),
  fullScreenExitCount: z.number().int().min(0).max(10000).optional(),
  totalKeystrokes: z.number().int().min(0).max(1000000).optional(),
  charsInserted: z.number().int().min(0).max(1000000).optional(),
  charsDeleted: z.number().int().min(0).max(1000000).optional(),
  cpm: z.number().min(0).max(5000).optional(),
  wpm: z.number().min(0).max(1000).optional(),
  largestBurstChars: z.number().int().min(0).max(64 * 1024).optional(),
  activeInteractionTimeSec: z.number().int().min(0).max(86400).optional(),
}).optional();

const telemetrySchema = z.object({
  attemptId: z.string().min(1).max(128),
  clientMetrics: clientMetricsSchema,
});

const submitQuestionSchema = z.object({
  attemptId: z.string().min(1).max(128),
  code: z.string().min(1).max(64 * 1024),
  clientMetrics: clientMetricsSchema,
});

const submitVivaSchema = z.object({
  vivaId: z.string().min(1).max(128),
  answer: z.string().trim().max(100),
});

export class SmartExamController {
  /**
   * POST /api/exam/start-question - Starts a question attempt, sets timer, returns variant & visible tests
   */
  static async startQuestion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const parsed = startQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ success: false, message: 'Invalid start payload', errors: parsed.error.issues });
      }

      const result = await SmartExamService.startQuestionAttempt({
        assignmentId: parsed.data.assignmentId,
        problemId: parsed.data.problemId,
        studentId: user.userId || user.id,
      });

      return res.json(result);
    } catch (err: any) {
      const isLocked = err.message?.includes('QUESTION_LOCKED');
      const isPendingViva = err.message?.includes('PENDING_VIVA');
      return res.status(isLocked ? 403 : isPendingViva ? 409 : 400).json({
        success: false,
        code: isLocked ? 'QUESTION_LOCKED' : isPendingViva ? 'PENDING_VIVA' : 'START_FAILED',
        message: err.message || 'Failed to start question attempt.',
      });
    }
  }

  /**
   * POST /api/exam/run-code - Interactive run against visible Test 1 and Test 2 only
   */
  static async runCode(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const parsed = runCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ success: false, message: 'Invalid run payload', errors: parsed.error.issues });
      }

      const result = await SmartExamService.runVisibleTests(
        parsed.data.attemptId,
        parsed.data.code,
        user.userId || user.id
      );

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to execute test run.',
      });
    }
  }

  /**
   * POST /api/exam/telemetry - Asynchronous non-blocking telemetry heartbeat (Phase 3)
   */
  static async recordTelemetry(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const parsed = telemetrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ success: false, message: 'Invalid telemetry payload', errors: parsed.error.issues });
      }

      const result = await SmartExamService.recordTelemetry(
        {
          attemptId: parsed.data.attemptId,
          clientMetrics: parsed.data.clientMetrics || {},
        },
        user.userId || user.id
      );

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to record telemetry heartbeat.',
      });
    }
  }

  /**
   * POST /api/exam/submit-question - Final evaluation against 3 tests, time scoring & locking
   */
  static async submitQuestion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const parsed = submitQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ success: false, message: 'Invalid submission payload', errors: parsed.error.issues });
      }

      const result = await SmartExamService.submitQuestion(
        {
          attemptId: parsed.data.attemptId,
          code: parsed.data.code,
          clientMetrics: parsed.data.clientMetrics,
        },
        user.userId || user.id
      );

      // Whitelist response fields: never expose internal hidden test cases or unmasked server directories
      return res.json({
        success: true,
        verdict: result.verdict,
        academicScore: result.academicScore,
        isLocked: result.isLocked,
        actualTimeTakenSec: result.actualTimeTakenSec,
        timeDeviationSec: result.timeDeviationSec,
        deviationPercent: result.deviationPercent,
        integrityScore: result.integrityScore,
        integrityRisk: result.integrityRisk,
        suspiciousFlags: result.suspiciousFlags,
        vivaTriggered: result.vivaTriggered,
        vivaId: result.vivaId,
        vivaQuestionText: result.vivaQuestionText,
        testOutcomes: result.testOutcomes.map((t: any) => ({
          testIndex: t.testIndex,
          passed: t.passed,
          verdict: t.verdict,
          runtimeMs: t.runtimeMs,
          input: t.isHidden ? undefined : t.input,
          expectedOutput: t.isHidden ? undefined : t.expectedOutput,
          actualOutput: t.isHidden ? (t.passed ? 'PASSED' : 'OUTPUT MISMATCH') : t.actualOutput,
        })),
      });
    } catch (err: any) {
      const isLocked = err.message?.includes('QUESTION_LOCKED');
      const isPendingViva = err.message?.includes('PENDING_VIVA');
      const isConcurrent = err.message?.includes('CONCURRENT_SUBMISSION');
      const status = isLocked ? 403 : isPendingViva ? 409 : isConcurrent ? 429 : 400;
      return res.status(status).json({
        success: false,
        code: isLocked ? 'QUESTION_LOCKED' : isPendingViva ? 'PENDING_VIVA' : isConcurrent ? 'CONCURRENT_LIMIT' : 'SUBMIT_FAILED',
        message: err.message || 'Failed to submit question.',
      });
    }
  }

  /**
   * GET /api/exam/my-tests - Enrolled student active, upcoming, completed test assignments
   */
  static async getStudentTests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const studentId = user.userId || user.id;

      // Auto-sync published tests for any sections student belongs to
      try {
        const studentRecord = await prisma.user.findUnique({
          where: { id: studentId },
          select: { id: true, prn: true, email: true },
        });

        const enrollments = await prisma.sectionStudent.findMany({
          where: {
            OR: [
              { studentId },
              ...(studentRecord?.prn ? [{ prn: studentRecord.prn }] : []),
            ],
            status: 'ENROLLED',
          },
          select: { sectionId: true },
        });

        const sectionIds = enrollments.map((e) => e.sectionId);

        if (sectionIds.length > 0) {
          const publishedTests = await prisma.assessmentTest.findMany({
            where: {
              sectionId: { in: sectionIds },
              status: 'PUBLISHED',
            },
            select: { id: true },
          });

          for (const t of publishedTests) {
            await prisma.assessmentTestAssignment.upsert({
              where: {
                testId_studentId: {
                  testId: t.id,
                  studentId,
                },
              },
              update: {},
              create: {
                testId: t.id,
                studentId,
                status: 'ASSIGNED',
              },
            });
          }
        }
      } catch (syncErr) {
        console.warn('Auto-sync student test assignments error:', syncErr);
      }

      const assignments = await prisma.assessmentTestAssignment.findMany({
        where: { studentId },
        include: {
          test: {
            include: {
              section: {
                select: {
                  id: true,
                  sectionName: true,
                  course: true,
                  subject: true,
                },
              },
              questions: {
                include: {
                  problem: {
                    select: {
                      id: true,
                      title: true,
                      difficulty: true,
                      expectedTimeMin: true,
                      expectedTimeMax: true,
                    },
                  },
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
          attempts: {
            select: {
              id: true,
              problemId: true,
              isLocked: true,
              academicScore: true,
              actualTimeTakenSec: true,
              verdict: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: assignments,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch student tests.',
      });
    }
  }

  /**
   * GET /api/exam/viva/current?assignmentId=...
   */
  static async getPendingViva(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const assignmentId = req.query.assignmentId as string;
      if (!assignmentId) {
        return res.status(400).json({ success: false, message: 'assignmentId query param is required.' });
      }

      const outcome = await AiVivaService.getPendingVivaForAssignment(assignmentId, user.userId || user.id);
      return res.json({ success: true, ...outcome });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch pending viva.' });
    }
  }

  /**
   * POST /api/exam/viva/submit
   */
  static async submitViva(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const parsed = submitVivaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({ success: false, message: 'Invalid viva response format', errors: parsed.error.issues });
      }

      const outcome = await AiVivaService.submitVivaAnswer({
        vivaId: parsed.data.vivaId,
        answer: parsed.data.answer,
        studentId: user.userId || user.id,
      });

      // Whitelist response: never expose prompt instructions or expected keywords
      return res.json({
        success: true,
        vivaId: outcome.vivaId,
        submittedBeforeTimeout: outcome.submittedBeforeTimeout,
        durationSec: outcome.durationSec,
        relevanceScore: outcome.relevanceScore,
        aiEvaluation: outcome.aiEvaluation,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to submit viva.' });
    }
  }

  /**
   * POST /api/exam/viva/faculty-override - Faculty manual score override (Phase 4)
   */
  static async facultyOverrideViva(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { vivaId, overrideScore, feedback } = req.body;
      if (!vivaId || overrideScore === undefined) {
        return res.status(400).json({ success: false, message: 'vivaId and overrideScore are required.' });
      }

      const outcome = await AiVivaService.facultyOverrideViva({
        vivaId,
        facultyId: user.userId || user.id,
        overrideScore: Number(overrideScore),
        feedback,
      });

      return res.json(outcome);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to override viva score.' });
    }
  }
}
