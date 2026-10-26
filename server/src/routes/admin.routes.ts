import { Router } from 'express';
import {
  getAnalytics,
  getAdminProblems,
  createProblem,
  updateProblem,
  deleteProblem,
  scheduleDaily,
  autoScheduleKanetkarDaily,
  getAdminSubmissions,
  rejudgeSubmission,
  getAdminUsers,
  updateUserRole,
  updateUserBan,
  adminDeleteUser,
  adminRestoreUser,
  adminPermanentDeleteUser,
  adminUpdateUserPrnAndCollege,
  adminRevealStudentPrn,
  adminResetPrnCooldown,
  getAdminAuditLogs,
  exportUsersCsv,
  exportWeeklyResultsCsv,
  exportDailyResultsCsv,
  runManualDailyFinalization,
  getDailyFinalizationStatus,
  problemAdminSchema,
  getAdminCheckers,
  toggleCheckerPause,
  assignUploadToChecker,
  autoAssignRoundRobin,
  importAllowlistCsv,
  getAllowlistStatus,
  getAdminDailySystemPreview,
  adminPauseDailySystem,
  adminResumeDailySystem,
  adminCreateDailyCorrection,
  adminTogglePauseDay,
  syncFirestoreUsers,
  compareCodesPlagiarism,
  scanProblemPlagiarism,
  runSandboxSecurityAudit,
  getAdminSystemDiagnostics,
  runAdminJudgeProbe,
} from '../controllers/admin.controller.js';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

export const adminRouter = Router();

// Block disabled admin badge routes for all callers (404 Not Found)
adminRouter.use('/badges', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Protect ALL admin routes with authenticate + requireRole('ADMIN')
adminRouter.use(authenticate, requireRole('ADMIN'));

adminRouter.get('/analytics', getAnalytics);
adminRouter.get('/stats', getAnalytics);
adminRouter.get('/problems', getAdminProblems);
adminRouter.post('/problems', validate(problemAdminSchema), createProblem);
adminRouter.put('/problems/:id', updateProblem);
adminRouter.delete('/problems/:id', deleteProblem);
adminRouter.post('/daily/schedule', scheduleDaily);
adminRouter.post('/daily/auto-schedule-kanetkar', autoScheduleKanetkarDaily);
adminRouter.get('/submissions', getAdminSubmissions);
adminRouter.post('/submissions/:id/rejudge', rejudgeSubmission);
adminRouter.get('/uploads', UploadController.adminListUploads);
adminRouter.get('/uploads/:id/compare/:otherId', UploadController.adminCompareUploads);
adminRouter.post('/uploads/:id/flag', UploadController.adminFlagUpload);
adminRouter.post('/uploads/:id/review', UploadController.adminReviewUpload);
adminRouter.put('/uploads/:id/review', UploadController.adminReviewUpload);
adminRouter.post('/uploads/:uploadId/assign', assignUploadToChecker);
adminRouter.post('/uploads/auto-assign', autoAssignRoundRobin);

// Checkers Workload & Directory Management
adminRouter.get('/checkers', getAdminCheckers);
adminRouter.patch('/checkers/:id/pause', toggleCheckerPause);

adminRouter.get('/users', getAdminUsers);
adminRouter.post('/users/sync-firestore', syncFirestoreUsers);
adminRouter.post('/users/:id/reveal-prn', adminRevealStudentPrn);
adminRouter.post('/users/:id/reset-prn-cooldown', adminResetPrnCooldown);
adminRouter.put('/users/:id/prn', adminUpdateUserPrnAndCollege);
adminRouter.patch('/users/:id/prn', adminUpdateUserPrnAndCollege);
adminRouter.patch('/users/:id/academic-identity', adminUpdateUserPrnAndCollege);
adminRouter.put('/users/:id/role', updateUserRole);
adminRouter.patch('/users/:id/role', updateUserRole);
adminRouter.put('/users/:id/ban', updateUserBan);
adminRouter.patch('/users/:id/ban', updateUserBan);
adminRouter.delete('/users/:id', adminDeleteUser);
adminRouter.post('/users/:id/restore', adminRestoreUser);
adminRouter.delete('/users/:id/permanent', adminPermanentDeleteUser);
adminRouter.get('/audit-logs', getAdminAuditLogs);
adminRouter.get('/allowlist/status', getAllowlistStatus);
adminRouter.post('/allowlist/import', importAllowlistCsv);

adminRouter.get('/export/users.csv', exportUsersCsv);
adminRouter.get('/export/weekly-results.csv', exportWeeklyResultsCsv);
adminRouter.get('/export/daily-results.csv', exportDailyResultsCsv);
adminRouter.post('/daily-finalization/run', runManualDailyFinalization);
adminRouter.get('/daily-finalization/status', getDailyFinalizationStatus);
adminRouter.post('/daily-finalization/correction', adminCreateDailyCorrection);
adminRouter.post('/daily-finalization/pause-day', adminTogglePauseDay);

// Daily Challenge System Control
adminRouter.get('/daily-system/preview', getAdminDailySystemPreview);
adminRouter.post('/daily-system/pause', adminPauseDailySystem);
adminRouter.post('/daily-system/resume', adminResumeDailySystem);

// Plagiarism & Code Similarity Detection
adminRouter.post('/plagiarism/compare', compareCodesPlagiarism);
adminRouter.get('/plagiarism/problem/:problemId', scanProblemPlagiarism);

// Sandbox Red-Teaming & Security Auditing
adminRouter.get('/security/audit', runSandboxSecurityAudit);

// System Health Diagnostics & Compiler Live Probe
adminRouter.get('/system/diagnostics', getAdminSystemDiagnostics);
adminRouter.post('/system/probe', runAdminJudgeProbe);

export default adminRouter;
