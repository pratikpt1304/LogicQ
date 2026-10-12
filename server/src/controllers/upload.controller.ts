import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { UPLOAD_CONFIG, verifyMagicBytes, stripJpegExif } from '../config/upload.config.js';
import { getTodayIST, getYesterdayIST } from '../utils/ist.js';

function calculateNextStreak(lastSolvedDate: string | null, currentStreak: number): { newStreak: number } {
  const today = getTodayIST();
  const yesterday = getYesterdayIST();
  if (lastSolvedDate === today) {
    return { newStreak: Math.max(1, currentStreak) };
  }
  if (lastSolvedDate === yesterday) {
    return { newStreak: currentStreak + 1 };
  }
  return { newStreak: 1 };
}

const fileInputSchema = z.object({
  name: z.string().optional(),
  originalName: z.string().optional(),
  mimeType: z.string(),
  dataBase64: z.string().min(1, 'File data is required'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  pages: z.number().int().positive().optional(),
});

const createUploadSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  weekId: z.string().optional(),
  dayIndex: z.number().int().min(1).max(7).optional(),
  studentNote: z
    .string()
    .max(UPLOAD_CONFIG.MAX_NOTE_LENGTH, `Note cannot exceed ${UPLOAD_CONFIG.MAX_NOTE_LENGTH} characters.`)
    .optional(),
  note: z
    .string()
    .max(UPLOAD_CONFIG.MAX_NOTE_LENGTH, `Note cannot exceed ${UPLOAD_CONFIG.MAX_NOTE_LENGTH} characters.`)
    .optional(),
  files: z
    .array(fileInputSchema)
    .min(1, 'At least 1 file is required.')
    .max(
      UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION,
      `Maximum ${UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION} files allowed per submission.`
    ),
});

const reviewUploadSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'CHANGES_REQUESTED']).optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'CHANGES_REQUESTED']).optional(),
  pointsAwarded: z.number().int().min(0).optional(),
  comment: z.string().max(1000).optional(),
  reviewerComment: z.string().max(1000).optional(),
  suspicionFlag: z.boolean().optional(),
  adminPassword: z.string().optional(),
});

const flagUploadSchema = z.object({
  suspicionFlag: z.boolean(),
  suspicionNote: z.string().max(500).optional().default(''),
});

export interface StoredUploadFile {
  id: string;
  originalName?: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width?: number;
  height?: number;
  pages?: number;
  dataBase64: string;
}

function getExtensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}

function parseAndValidateFiles(
  rawFiles: z.infer<typeof fileInputSchema>[],
  userId: string,
  problemId: string,
  submissionId: string
): { valid: boolean; error?: string; storedFiles?: StoredUploadFile[] } {
  const storedFiles: StoredUploadFile[] = [];

  for (let i = 0; i < rawFiles.length; i++) {
    const raw = rawFiles[i];
    if (!(UPLOAD_CONFIG.ALLOWED_MIME_TYPES as readonly string[]).includes(raw.mimeType)) {
      return {
        valid: false,
        error: `File #${i + 1}: Unsupported file type "${raw.mimeType}". Allowed: JPG, PNG, WebP, PDF.`,
      };
    }

    // Strip optional data URI prefix if present
    const cleanBase64 = raw.dataBase64.replace(/^data:[^;]+;base64,/, '');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(cleanBase64, 'base64');
    } catch {
      return { valid: false, error: `File #${i + 1}: Invalid base64 encoding.` };
    }

    if (buffer.length === 0) {
      return { valid: false, error: `File #${i + 1}: File is empty (0 bytes).` };
    }

    if (buffer.length > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File #${i + 1}: File size exceeds the 5 MB limit.`,
      };
    }

    const magicCheck = verifyMagicBytes(buffer, raw.mimeType);
    if (!magicCheck.valid) {
      return {
        valid: false,
        error: `File #${i + 1}: ${magicCheck.reason || 'Invalid file signature.'}`,
      };
    }

    // Strip EXIF metadata from JPEG files before storing
    const sanitizedBuffer = raw.mimeType === 'image/jpeg' ? stripJpegExif(buffer) : buffer;
    const sha256 = crypto.createHash('sha256').update(sanitizedBuffer).digest('hex');
    const fileId = crypto.randomUUID();
    const ext = getExtensionForMime(raw.mimeType);
    const storageKey = `/uploads/${userId}/${problemId}/${submissionId}/${fileId}.${ext}`;

    storedFiles.push({
      id: fileId,
      storageKey,
      mimeType: raw.mimeType,
      sizeBytes: sanitizedBuffer.length,
      sha256,
      width: raw.width,
      height: raw.height,
      pages: raw.pages,
      dataBase64: sanitizedBuffer.toString('base64'),
    });
  }

  return { valid: true, storedFiles };
}

function formatUploadForResponse(upload: any, includeFileData = false) {
  let parsedFiles: StoredUploadFile[] = [];
  try {
    parsedFiles = JSON.parse(upload.filesJson || '[]');
  } catch {
    parsedFiles = [];
  }

  const sanitizedFiles = parsedFiles.map((f) => ({
    id: f.id,
    storageKey: f.storageKey,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    sha256: f.sha256,
    width: f.width,
    height: f.height,
    pages: f.pages,
    ...(includeFileData ? { dataBase64: f.dataBase64 } : {}),
  }));

  return {
    id: upload.id,
    userId: upload.userId,
    problemId: upload.problemId,
    weekId: upload.weekId,
    dayIndex: upload.dayIndex,
    files: sanitizedFiles,
    studentNote: upload.studentNote,
    status: upload.status,
    pointsAwarded: upload.pointsAwarded,
    reviewerId: upload.reviewerId,
    reviewerComment: upload.reviewerComment,
    suspicionFlag: upload.suspicionFlag,
    suspicionNote: upload.suspicionNote,
    submittedAt: upload.submittedAt,
    reviewedAt: upload.reviewedAt,
    problem: upload.problem
      ? {
          id: upload.problem.id,
          slug: upload.problem.slug,
          title: upload.problem.title,
          difficulty: upload.problem.difficulty,
          basePoints: upload.problem.basePoints,
        }
      : undefined,
    user: upload.user
      ? {
          id: upload.user.id,
          prn: upload.user.prn,
          displayName: upload.user.displayName,
          department: upload.user.department,
          year: upload.user.year,
          division: upload.user.division,
        }
      : undefined,
    reviews: upload.reviews,
  };
}

export class UploadController {
  /**
   * POST /api/uploads
   * Student submits an uploaded solution for manual review.
   */
  static async createUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const parsed = createUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid upload payload.',
        });
        return;
      }

      const { problemId, weekId, dayIndex, studentNote, note, files } = parsed.data;
      const finalNote = (studentNote ?? note ?? '').trim();

      const problem = await prisma.problem.findUnique({ where: { id: problemId } });
      if (!problem) {
        res.status(404).json({ success: false, message: 'Problem not found.' });
        return;
      }

      // 1. Check if student already has an ACCEPTED code submission or APPROVED upload for this problem
      const [acceptedCode, approvedUpload] = await Promise.all([
        prisma.submission.findFirst({
          where: { userId, problemId, verdict: 'ACCEPTED' },
        }),
        prisma.uploadedSolution.findFirst({
          where: { userId, problemId, status: 'APPROVED' },
        }),
      ]);

      if (acceptedCode || approvedUpload) {
        res.status(409).json({
          success: false,
          message: 'You already have an Accepted solution for this problem.',
        });
        return;
      }

      // 2. Check if student already has a PENDING_REVIEW upload for this problem
      const existingPending = await prisma.uploadedSolution.findFirst({
        where: { userId, problemId, status: 'PENDING_REVIEW' },
      });

      if (existingPending) {
        res.status(409).json({
          success: false,
          message:
            'You already have an upload pending review for this problem. You can replace or cancel it before submitting a new one.',
        });
        return;
      }

      // 3. Enforce daily upload quota (max 5 uploads per student per day)
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const todayCount = await prisma.uploadedSolution.count({
        where: {
          userId,
          submittedAt: { gte: startOfToday },
        },
      });

      if (todayCount >= UPLOAD_CONFIG.MAX_UPLOADS_PER_STUDENT_PER_DAY) {
        res.status(429).json({
          success: false,
          message: `Daily upload limit reached (maximum ${UPLOAD_CONFIG.MAX_UPLOADS_PER_STUDENT_PER_DAY} uploads per day).`,
        });
        return;
      }

      const submissionId = crypto.randomUUID();
      const validation = parseAndValidateFiles(files, userId, problemId, submissionId);
      if (!validation.valid || !validation.storedFiles) {
        res.status(400).json({
          success: false,
          message: validation.error || 'File validation failed.',
        });
        return;
      }

      const created = await prisma.uploadedSolution.create({
        data: {
          id: submissionId,
          userId,
          problemId,
          weekId: weekId || null,
          dayIndex: dayIndex ?? null,
          filesJson: JSON.stringify(validation.storedFiles),
          studentNote: finalNote,
          status: 'PENDING_REVIEW',
          pointsAwarded: 0,
        },
        include: {
          problem: true,
        },
      });

      const formatted = formatUploadForResponse(created, false);
      res.status(201).json({
        success: true,
        message: 'Uploaded for review. Points will be awarded after an instructor approves your solution.',
        data: {
          ...formatted,
          upload: formatted,
        },
      });
    } catch (error) {
      console.error('CreateUpload Error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit uploaded solution.' });
    }
  }

  /**
   * PUT /api/uploads/:id
   * Owning student replaces a PENDING_REVIEW or NEEDS_CHANGES upload.
   */
  static async replaceUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const uploadId = req.params.id;

      const existing = await prisma.uploadedSolution.findUnique({ where: { id: uploadId } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      if (existing.userId !== userId) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only update your own upload.' });
        return;
      }

      if (
        existing.status !== 'PENDING_REVIEW' &&
        existing.status !== 'NEEDS_CHANGES' &&
        existing.status !== 'CHANGES_REQUESTED'
      ) {
        res.status(400).json({
          success: false,
          message: `Cannot replace an upload once it has been ${existing.status.toLowerCase()}.`,
        });
        return;
      }

      const parsed = createUploadSchema.safeParse({
        ...req.body,
        problemId: req.body.problemId || existing.problemId,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid upload payload.',
        });
        return;
      }

      const validation = parseAndValidateFiles(
        parsed.data.files,
        userId,
        existing.problemId,
        existing.id
      );

      if (!validation.valid || !validation.storedFiles) {
        res.status(400).json({
          success: false,
          message: validation.error || 'File validation failed.',
        });
        return;
      }

      const finalNote = (parsed.data.studentNote ?? parsed.data.note ?? '').trim();
      const updated = await prisma.uploadedSolution.update({
        where: { id: existing.id },
        data: {
          filesJson: JSON.stringify(validation.storedFiles),
          studentNote: finalNote,
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
        },
        include: { problem: true },
      });

      const formatted = formatUploadForResponse(updated, false);
      res.status(200).json({
        success: true,
        message: 'Uploaded solution updated and queued for review.',
        data: {
          ...formatted,
          upload: formatted,
        },
      });
    } catch (error) {
      console.error('ReplaceUpload Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update uploaded solution.' });
    }
  }

  /**
   * DELETE /api/uploads/:id
   * Owning student cancels a PENDING_REVIEW upload.
   */
  static async cancelUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const uploadId = req.params.id;

      const existing = await prisma.uploadedSolution.findUnique({ where: { id: uploadId } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      if (existing.userId !== userId) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own upload.' });
        return;
      }

      if (existing.status !== 'PENDING_REVIEW') {
        res.status(400).json({
          success: false,
          message: 'Only pending uploads can be cancelled.',
        });
        return;
      }

      await prisma.uploadedSolution.delete({ where: { id: existing.id } });
      res.status(200).json({
        success: true,
        message: 'Pending upload cancelled and deleted.',
      });
    } catch (error) {
      console.error('CancelUpload Error:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel upload.' });
    }
  }

  /**
   * GET /api/uploads/my
   * Lists the current student's uploaded solutions.
   */
  static async getMyUploads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const problemId = typeof req.query.problemId === 'string' ? req.query.problemId : undefined;

      const uploads = await prisma.uploadedSolution.findMany({
        where: {
          userId,
          ...(problemId ? { problemId } : {}),
        },
        include: {
          problem: true,
          reviews: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: uploads.map((u) => formatUploadForResponse(u, false)),
      });
    } catch (error) {
      console.error('GetMyUploads Error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch uploaded solutions.' });
    }
  }

  /**
   * GET /api/uploads/:id/files/:fileId
   * Streams a single stored file (image/PDF) with strict IDOR protection (owner or ADMIN only)
   * and logs an AdminAuditLog entry when an admin views a student's file.
   */
  static async getUploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requester = req.user!;
      const { id: uploadId, fileId } = req.params;

      const upload = await prisma.uploadedSolution.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      const isOwner = upload.userId === requester.userId;
      const isAdmin = requester.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to view another student’s uploaded file.',
        });
        return;
      }

      const files: StoredUploadFile[] = JSON.parse(upload.filesJson || '[]');
      const file = files.find((f) => f.id === fileId);
      if (!file) {
        res.status(404).json({ success: false, message: 'Uploaded file not found.' });
        return;
      }

      if (isAdmin && !isOwner) {
        await prisma.adminAuditLog.create({
          data: {
            adminId: requester.userId,
            targetUserId: upload.userId,
            action: 'VIEW_UPLOAD_FILE',
            newValue: `${upload.id}/${file.id}`,
            reason: `Admin viewed uploaded file ${file.id} for problem ${upload.problemId}`,
          },
        });
      }

      const rawBuffer = Buffer.from(file.dataBase64, 'base64');
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(rawBuffer);
    } catch (error) {
      console.error('GetUploadFile Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve uploaded file.' });
    }
  }

  /**
   * GET /api/uploads/:id
   * Fetches a single upload including file payloads. Strictly restricted to owner or ADMIN.
   * Logs an AdminAuditLog entry whenever an admin views a student's upload.
   */
  static async getUploadById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requester = req.user!;
      const uploadId = req.params.id;

      const upload = await prisma.uploadedSolution.findUnique({
        where: { id: uploadId },
        include: {
          problem: true,
          user: true,
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!upload) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      const isOwner = upload.userId === requester.userId;
      const isAdmin = requester.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to view another student’s uploaded solution.',
        });
        return;
      }

      if (isAdmin && !isOwner) {
        await prisma.adminAuditLog.create({
          data: {
            adminId: requester.userId,
            targetUserId: upload.userId,
            action: 'VIEW_UPLOAD',
            newValue: upload.id,
            reason: `Admin viewed uploaded solution for problem ${upload.problemId}`,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: formatUploadForResponse(upload, true),
      });
    } catch (error) {
      console.error('GetUploadById Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve upload.' });
    }
  }

  /**
   * GET /api/admin/uploads
   * Admin queue for reviewing uploaded solutions with filters and duplicate SHA-256 detection.
   */
  static async adminListUploads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, problemId, department, year, division, prn, suspicionFlag } = req.query;

      const uploads = await prisma.uploadedSolution.findMany({
        where: {
          ...(typeof status === 'string' && status !== 'ALL' ? { status } : {}),
          ...(typeof problemId === 'string' && problemId ? { problemId } : {}),
          ...(suspicionFlag === 'true' ? { suspicionFlag: true } : {}),
          user: {
            ...(typeof department === 'string' && department !== 'ALL' ? { department } : {}),
            ...(typeof year === 'string' && year !== 'ALL' ? { year } : {}),
            ...(typeof division === 'string' && division !== 'ALL' ? { division } : {}),
            ...(typeof prn === 'string' && prn.trim() ? { prn: { contains: prn.trim() } } : {}),
          },
        },
        include: {
          problem: true,
          user: true,
          reviews: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { submittedAt: 'desc' },
      });

      // Build SHA-256 -> Set<userId> map to detect duplicate files across different students
      const hashOwners = new Map<string, Set<string>>();
      for (const u of uploads) {
        try {
          const files: StoredUploadFile[] = JSON.parse(u.filesJson || '[]');
          for (const f of files) {
            if (!hashOwners.has(f.sha256)) {
              hashOwners.set(f.sha256, new Set());
            }
            hashOwners.get(f.sha256)!.add(u.userId);
          }
        } catch {
          // ignore
        }
      }

      const formatted = uploads.map((u) => {
        const base = formatUploadForResponse(u, false);
        const duplicateFileWarning = base.files.some(
          (f) => (hashOwners.get(f.sha256)?.size || 0) > 1
        );
        return {
          ...base,
          duplicateFileWarning,
        };
      });

      res.status(200).json({
        success: true,
        data: { uploads: formatted },
      });
    } catch (error) {
      console.error('AdminListUploads Error:', error);
      res.status(500).json({ success: false, message: 'Failed to load upload review queue.' });
    }
  }

  /**
   * GET /api/admin/uploads/:id/compare/:otherId
   * Side-by-side comparison of two uploaded solutions for integrity review.
   */
  static async adminCompareUploads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { id, otherId } = req.params;

      const [first, second] = await Promise.all([
        prisma.uploadedSolution.findUnique({
          where: { id },
          include: { problem: true, user: true, reviews: true },
        }),
        prisma.uploadedSolution.findUnique({
          where: { id: otherId },
          include: { problem: true, user: true, reviews: true },
        }),
      ]);

      if (!first || !second) {
        res.status(404).json({ success: false, message: 'One or both uploads not found.' });
        return;
      }

      await prisma.adminAuditLog.create({
        data: {
          adminId,
          targetUserId: first.userId,
          action: 'COMPARE_UPLOADS',
          oldValue: first.id,
          newValue: second.id,
          reason: `Side-by-side comparison between ${first.id} and ${second.id}`,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          left: formatUploadForResponse(first, true),
          right: formatUploadForResponse(second, true),
        },
      });
    } catch (error) {
      console.error('AdminCompareUploads Error:', error);
      res.status(500).json({ success: false, message: 'Failed to compare uploads.' });
    }
  }

  /**
   * POST /api/admin/uploads/:id/flag
   * Flag or unflag an uploaded solution for suspected academic dishonesty.
   */
  static async adminFlagUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const uploadId = req.params.id;
      const parsed = flagUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Invalid flag payload.' });
        return;
      }

      const existing = await prisma.uploadedSolution.findUnique({ where: { id: uploadId } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      const updated = await prisma.uploadedSolution.update({
        where: { id: uploadId },
        data: {
          suspicionFlag: parsed.data.suspicionFlag,
          suspicionNote: parsed.data.suspicionNote || null,
        },
        include: { problem: true, user: true },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId,
          targetUserId: existing.userId,
          action: parsed.data.suspicionFlag ? 'FLAG_UPLOAD_SUSPICIOUS' : 'UNFLAG_UPLOAD_SUSPICIOUS',
          newValue: uploadId,
          reason: parsed.data.suspicionNote || 'Integrity flag updated',
        },
      });

      res.status(200).json({
        success: true,
        message: parsed.data.suspicionFlag ? 'Upload flagged for integrity review.' : 'Suspicion flag cleared.',
        data: formatUploadForResponse(updated, false),
      });
    } catch (error) {
      console.error('AdminFlagUpload Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update suspicion flag.' });
    }
  }

  /**
   * POST / PUT /api/admin/uploads/:id/review
   * Admin approves, rejects, or requests changes on an uploaded solution.
   * Approving awards points, updates streak, and logs an immutable UploadReview + AdminAuditLog.
   */
  static async adminReviewUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const uploadId = req.params.id;
      const parsed = reviewUploadSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid review payload.',
        });
        return;
      }

      const rawDecision = parsed.data.decision || parsed.data.status;
      if (!rawDecision) {
        res.status(400).json({ success: false, message: 'Review decision/status is required.' });
        return;
      }
      const decision = rawDecision === 'CHANGES_REQUESTED' ? 'NEEDS_CHANGES' : rawDecision;
      const requestedPoints = parsed.data.pointsAwarded;
      const comment = (parsed.data.comment ?? parsed.data.reviewerComment ?? '').trim();
      const adminPassword = parsed.data.adminPassword;
      const suspicionFlag = parsed.data.suspicionFlag;

      if ((decision === 'REJECTED' || decision === 'NEEDS_CHANGES') && !comment) {
        res.status(400).json({
          success: false,
          message: 'A short reviewer comment is required when rejecting or requesting changes.',
        });
        return;
      }

      const upload = await prisma.uploadedSolution.findUnique({
        where: { id: uploadId },
        include: { problem: true, user: true },
      });

      if (!upload) {
        res.status(404).json({ success: false, message: 'Upload not found.' });
        return;
      }

      // Step-up authentication check when approving points if adminPassword is provided
      if (decision === 'APPROVED' && adminPassword) {
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
        if (!adminUser || !(await bcrypt.compare(adminPassword, adminUser.passwordHash))) {
          res.status(401).json({
            success: false,
            message: 'Step-up re-authentication failed: invalid admin password.',
          });
          return;
        }
      }

      const maxPoints = upload.problem.basePoints;
      const desiredPoints =
        decision === 'APPROVED'
          ? Math.min(Math.max(0, requestedPoints ?? maxPoints), maxPoints)
          : 0;

      const updated = await prisma.$transaction(async (tx) => {
        // Check if student already received points for this problem via code or another upload
        const [priorAcceptedCode, priorApprovedUpload] = await Promise.all([
          tx.submission.findFirst({
            where: {
              userId: upload.userId,
              problemId: upload.problemId,
              verdict: 'ACCEPTED',
            },
          }),
          tx.uploadedSolution.findFirst({
            where: {
              userId: upload.userId,
              problemId: upload.problemId,
              status: 'APPROVED',
              id: { not: upload.id },
            },
          }),
        ]);

        const alreadySolvedProblem = Boolean(priorAcceptedCode || priorApprovedUpload);
        let netPointsDelta = 0;

        if (decision === 'APPROVED' && !alreadySolvedProblem) {
          netPointsDelta = desiredPoints - upload.pointsAwarded;
        } else if (decision !== 'APPROVED' && upload.status === 'APPROVED' && upload.pointsAwarded > 0) {
          netPointsDelta = -upload.pointsAwarded;
        }

        const effectivePointsAwarded =
          decision === 'APPROVED' && !alreadySolvedProblem ? desiredPoints : 0;

        if (decision === 'APPROVED' && !alreadySolvedProblem) {
          const student = await tx.user.findUnique({ where: { id: upload.userId } });
          if (student) {
            const streakInfo = calculateNextStreak(student.lastSolvedDate, student.currentStreak);
            const newLongest = Math.max(student.longestStreak, streakInfo.newStreak);
            await tx.user.update({
              where: { id: student.id },
              data: {
                totalPoints: { increment: netPointsDelta },
                currentStreak: streakInfo.newStreak,
                longestStreak: newLongest,
                lastSolvedDate: getTodayIST(),
              },
            });
          }
        } else if (netPointsDelta !== 0) {
          await tx.user.update({
            where: { id: upload.userId },
            data: {
              totalPoints: { increment: netPointsDelta },
            },
          });
        }

        const updatedUpload = await tx.uploadedSolution.update({
          where: { id: upload.id },
          data: {
            status: decision,
            pointsAwarded: effectivePointsAwarded,
            reviewerId: adminId,
            reviewerComment: comment || null,
            reviewedAt: new Date(),
            ...(typeof suspicionFlag === 'boolean' ? { suspicionFlag } : {}),
          },
          include: {
            problem: true,
            user: true,
            reviews: { orderBy: { createdAt: 'desc' } },
          },
        });

        await tx.uploadReview.create({
          data: {
            uploadId: upload.id,
            reviewerId: adminId,
            decision,
            pointsAwarded: effectivePointsAwarded,
            comment,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            adminId,
            targetUserId: upload.userId,
            action: `REVIEW_UPLOAD_${decision}`,
            oldValue: upload.status,
            newValue: `${decision} (${effectivePointsAwarded} pts)`,
            reason: comment || `Reviewed upload ${upload.id}`,
          },
        });

        return updatedUpload;
      });

      const formatted = formatUploadForResponse(updated, false);
      res.status(200).json({
        success: true,
        message: `Upload ${decision.toLowerCase().replace('_', ' ')}.`,
        data: {
          ...formatted,
          upload: formatted,
        },
      });
    } catch (error) {
      console.error('AdminReviewUpload Error:', error);
      res.status(500).json({ success: false, message: 'Failed to review uploaded solution.' });
    }
  }
}
