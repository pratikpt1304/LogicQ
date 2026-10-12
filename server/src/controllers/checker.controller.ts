import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getServerNow } from '../utils/ist.js';
import { StoredUploadFile } from './upload.controller.js';

// Rubric weight configuration:
// Correct Logic (50%), Flowchart / Explanation (30%), Clarity & Structure (20%)
export const RUBRIC_WEIGHTS = {
  CORRECT_LOGIC: 0.5,
  FLOWCHART: 0.3,
  CLARITY: 0.2,
} as const;

export interface RubricInput {
  correctLogic: number; // 0.0 to 1.0 (or percentage 0 to 100)
  flowchart: number;    // 0.0 to 1.0 (or percentage 0 to 100)
  clarity: number;      // 0.0 to 1.0 (or percentage 0 to 100)
}

/**
 * Calculates awarded points strictly using formula:
 * points = round(basePoints * (correctLogic * 0.5 + flowchart * 0.3 + clarity * 0.2))
 */
export function calculateRubricPoints(basePoints: number, rubric: RubricInput): number {
  // Normalize values if passed as 0-100 percentages
  const normLogic = rubric.correctLogic > 1 ? rubric.correctLogic / 100 : Math.max(0, rubric.correctLogic);
  const normFlow = rubric.flowchart > 1 ? rubric.flowchart / 100 : Math.max(0, rubric.flowchart);
  const normClarity = rubric.clarity > 1 ? rubric.clarity / 100 : Math.max(0, rubric.clarity);

  const weightedSum =
    normLogic * RUBRIC_WEIGHTS.CORRECT_LOGIC +
    normFlow * RUBRIC_WEIGHTS.FLOWCHART +
    normClarity * RUBRIC_WEIGHTS.CLARITY;

  return Math.min(basePoints, Math.max(0, Math.round(basePoints * weightedSum)));
}

const checkerDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES']),
  comment: z.string().min(1, 'A comment is required for every review decision').max(1000),
  rubric: z
    .object({
      correctLogic: z.number().min(0).max(100),
      flowchart: z.number().min(0).max(100),
      clarity: z.number().min(0).max(100),
    })
    .optional(),
});

export class CheckerController {
  /**
   * GET /api/checker/reviews
   * Returns assigned queue for the current checker:
   * - Sorted oldest first
   * - STRICTLY BLIND: No student name, PRN, email, dept, year, division, avatar
   * - Identified only by generic submission token e.g. #SUB-XXXX
   * - Excludes checker's own uploads (Conflict of interest rule)
   */
  static async getMyReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const checkerId = req.user!.userId;

      // Automatically return stale assigned uploads (> 48h) to unassigned pool
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await prisma.uploadedSolution.updateMany({
        where: {
          assignedCheckerId: checkerId,
          status: 'PENDING_REVIEW',
          assignedAt: { lt: fortyEightHoursAgo },
        },
        data: {
          assignedCheckerId: null,
          assignedAt: null,
        },
      });

      const uploads = await prisma.uploadedSolution.findMany({
        where: {
          assignedCheckerId: checkerId,
          status: 'PENDING_REVIEW',
          // Strictly reject checker's own uploads
          userId: { not: checkerId },
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              description: true,
              basePoints: true,
              difficulty: true,
              category: true,
            },
          },
          reviews: {
            where: { reviewerId: checkerId },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { submittedAt: 'asc' }, // Oldest first
      });

      // Blind formatting - ZERO student PII
      const sanitized = uploads.map((u) => {
        let files: StoredUploadFile[] = [];
        try {
          files = JSON.parse(u.filesJson || '[]');
        } catch {
          files = [];
        }

        const token = u.id.slice(0, 8).toUpperCase();

        return {
          id: u.id,
          submissionToken: `SUB-${token}`,
          problemId: u.problemId,
          problemTitle: u.problem.title,
          problemDescription: u.problem.description,
          basePoints: u.problem.basePoints,
          studentNote: u.studentNote,
          submittedAt: u.submittedAt,
          assignedAt: u.assignedAt,
          files: files.map((f) => ({
            id: f.id,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            originalName: f.originalName || 'submission_file',
            dataBase64: f.dataBase64,
          })),
          existingReview: u.reviews[0]
            ? {
                decision: u.reviews[0].decision,
                pointsAwarded: u.reviews[0].pointsAwarded,
                comment: u.reviews[0].comment,
                createdAt: u.reviews[0].createdAt,
                canEdit:
                  Date.now() - new Date(u.reviews[0].createdAt).getTime() <= 30 * 60 * 1000,
              }
            : null,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          queue: sanitized,
          count: sanitized.length,
        },
      });
    } catch (err) {
      console.error('GetMyReviews error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch assigned reviews' });
    }
  }

  /**
   * POST /api/checker/reviews/:id/decision
   * Checker submits or edits decision (within 30-min edit window).
   * Calculates points via rubric formula.
   */
  static async submitDecision(req: AuthRequest, res: Response): Promise<void> {
    try {
      const checkerId = req.user!.userId;
      const uploadId = req.params.id;

      const parsed = checkerDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid decision payload',
        });
        return;
      }

      const { decision, comment, rubric } = parsed.data;

      const upload = await prisma.uploadedSolution.findUnique({
        where: { id: uploadId },
        include: {
          problem: true,
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!upload) {
        res.status(404).json({ success: false, message: 'Upload not found' });
        return;
      }

      // Conflict rule: Checker cannot review own upload
      if (upload.userId === checkerId) {
        res.status(403).json({
          success: false,
          message: 'Conflict of interest: You cannot review your own upload.',
        });
        return;
      }

      // Must be assigned to this checker unless admin
      if (upload.assignedCheckerId !== checkerId && req.user!.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'This upload is not assigned to you.',
        });
        return;
      }

      // Check 30-minute edit window if previously reviewed
      const latestReview = upload.reviews.find((r) => r.reviewerId === checkerId);
      if (latestReview) {
        const reviewAgeMs = Date.now() - new Date(latestReview.createdAt).getTime();
        const thirtyMinutesMs = 30 * 60 * 1000;
        if (reviewAgeMs > thirtyMinutesMs && req.user!.role !== 'ADMIN') {
          res.status(403).json({
            success: false,
            message: 'Edit window expired. Decisions can only be edited within 30 minutes of submission.',
          });
          return;
        }
      }

      // Formula-calculated points for APPROVE
      let calculatedPoints = 0;
      if (decision === 'APPROVED') {
        if (!rubric) {
          res.status(400).json({
            success: false,
            message: 'Rubric marks (Correct Logic, Flowchart, Clarity) are required to approve.',
          });
          return;
        }
        calculatedPoints = calculateRubricPoints(upload.problem.basePoints, rubric);
      }

      const now = getServerNow();

      await prisma.$transaction(async (tx) => {
        // Create an immutable version in UploadReview
        await tx.uploadReview.create({
          data: {
            uploadId: upload.id,
            reviewerId: checkerId,
            decision,
            pointsAwarded: calculatedPoints,
            rubricScoresJson: rubric ? JSON.stringify(rubric) : null,
            comment,
            createdAt: now,
          },
        });

        // Update the upload record
        await tx.uploadedSolution.update({
          where: { id: upload.id },
          data: {
            status: decision,
            pointsAwarded: calculatedPoints,
            reviewerId: checkerId,
            reviewerComment: comment,
            rubricScoresJson: rubric ? JSON.stringify(rubric) : null,
            reviewedAt: now,
          },
        });

        // If approved, update student points and streak if not already credited
        if (decision === 'APPROVED' && calculatedPoints > 0) {
          const priorSolve = await tx.submission.findFirst({
            where: { userId: upload.userId, problemId: upload.problemId, verdict: 'ACCEPTED' },
          });

          if (!priorSolve) {
            await tx.user.update({
              where: { id: upload.userId },
              data: {
                totalPoints: { increment: calculatedPoints },
              },
            });
          }
        }

        // Immutable audit log (identifies checker action without exposing student PII)
        await tx.adminAuditLog.create({
          data: {
            adminId: checkerId,
            targetUserId: upload.userId,
            targetId: upload.id,
            action: `CHECKER_${decision}`,
            oldValue: upload.status,
            newValue: `${decision} (${calculatedPoints} pts)`,
            reason: comment,
          },
        });
      });

      res.status(200).json({
        success: true,
        message: `Decision successfully recorded: ${decision}`,
        data: {
          decision,
          pointsAwarded: calculatedPoints,
          comment,
        },
      });
    } catch (err) {
      console.error('SubmitDecision error:', err);
      res.status(500).json({ success: false, message: 'Failed to record decision' });
    }
  }
}
