import { Request, Response } from 'express';
import { SmartExamService } from '../services/smart-exam.service.js';
import { AiVivaService } from '../services/ai-viva.service.js';
import { prisma } from '../utils/prisma.js';

export class SmartExamController {
  /**
   * POST /api/exam/start-question - Starts a question attempt, sets timer, returns variant & visible tests
   */
  static async startQuestion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { assignmentId, problemId } = req.body;

      if (!assignmentId || !problemId) {
        return res.status(400).json({
          success: false,
          message: 'assignmentId and problemId are required.',
        });
      }

      const result = await SmartExamService.startQuestionAttempt({
        assignmentId,
        problemId,
        studentId: user.userId || user.id,
      });

      return res.json(result);
    } catch (err: any) {
      const isLocked = err.message.includes('QUESTION_LOCKED');
      return res.status(isLocked ? 403 : 400).json({
        success: false,
        code: isLocked ? 'QUESTION_LOCKED' : 'START_FAILED',
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
      const { attemptId, code } = req.body;

      if (!attemptId || code === undefined) {
        return res.status(400).json({
          success: false,
          message: 'attemptId and code are required.',
        });
      }

      const result = await SmartExamService.runVisibleTests(
        attemptId,
        code,
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
      const { attemptId, clientMetrics } = req.body;

      if (!attemptId) {
        return res.status(400).json({
          success: false,
          message: 'attemptId is required.',
        });
      }

      const result = await SmartExamService.recordTelemetry(
        {
          attemptId,
          clientMetrics: clientMetrics || {},
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
      const { attemptId, code, clientMetrics } = req.body;

      if (!attemptId || code === undefined) {
        return res.status(400).json({
          success: false,
          message: 'attemptId and code are required.',
        });
      }

      const result = await SmartExamService.submitQuestion(
        {
          attemptId,
          code,
          clientMetrics,
        },
        user.userId || user.id
      );

      return res.json(result);
    } catch (err: any) {
      const isLocked = err.message.includes('QUESTION_LOCKED');
      return res.status(isLocked ? 403 : 400).json({
        success: false,
        code: isLocked ? 'QUESTION_LOCKED' : 'SUBMIT_FAILED',
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
      const { vivaId, answer } = req.body;
      if (!vivaId || answer === undefined) {
        return res.status(400).json({ success: false, message: 'vivaId and answer are required.' });
      }

      const outcome = await AiVivaService.submitVivaAnswer({
        vivaId,
        answer,
        studentId: user.userId || user.id,
      });
      return res.json(outcome);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to submit viva.' });
    }
  }
}
