import { Router } from 'express';
import {
  getAnalytics,
  getAdminProblems,
  createProblem,
  updateProblem,
  deleteProblem,
  scheduleDaily,
  getAdminSubmissions,
  rejudgeSubmission,
  getAdminUsers,
  updateUserRole,
  updateUserBan,
  adminUpdateUserPrnAndCollege,
  getAdminAuditLogs,
  exportUsersCsv,
  exportWeeklyResultsCsv,
  problemAdminSchema,
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
adminRouter.get('/problems', getAdminProblems);
adminRouter.post('/problems', validate(problemAdminSchema), createProblem);
adminRouter.put('/problems/:id', updateProblem);
adminRouter.delete('/problems/:id', deleteProblem);
adminRouter.post('/daily/schedule', scheduleDaily);
adminRouter.get('/submissions', getAdminSubmissions);
adminRouter.post('/submissions/:id/rejudge', rejudgeSubmission);
adminRouter.get('/uploads', UploadController.adminListUploads);
adminRouter.get('/uploads/:id/compare/:otherId', UploadController.adminCompareUploads);
adminRouter.post('/uploads/:id/flag', UploadController.adminFlagUpload);
adminRouter.post('/uploads/:id/review', UploadController.adminReviewUpload);
adminRouter.put('/uploads/:id/review', UploadController.adminReviewUpload);
adminRouter.get('/users', getAdminUsers);
adminRouter.put('/users/:id/prn', adminUpdateUserPrnAndCollege);
adminRouter.patch('/users/:id/prn', adminUpdateUserPrnAndCollege);
adminRouter.patch('/users/:id/academic-identity', adminUpdateUserPrnAndCollege);
adminRouter.put('/users/:id/role', updateUserRole);
adminRouter.patch('/users/:id/role', updateUserRole);
adminRouter.put('/users/:id/ban', updateUserBan);
adminRouter.patch('/users/:id/ban', updateUserBan);
adminRouter.get('/audit-logs', getAdminAuditLogs);
adminRouter.get('/export/users.csv', exportUsersCsv);
adminRouter.get('/export/weekly-results.csv', exportWeeklyResultsCsv);

export default adminRouter;
