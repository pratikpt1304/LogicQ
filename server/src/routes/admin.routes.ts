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
  problemAdminSchema,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

export const adminRouter = Router();

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
adminRouter.get('/users', getAdminUsers);
adminRouter.put('/users/:id/role', updateUserRole);
adminRouter.patch('/users/:id/role', updateUserRole);
adminRouter.put('/users/:id/ban', updateUserBan);
adminRouter.patch('/users/:id/ban', updateUserBan);
