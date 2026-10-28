import { Router } from 'express';
import {
  getPracticeModules,
  getPracticeModuleProblems,
  getPracticeProblemDetails,
  syncPracticeTimer,
  trackPracticeRun,
  getPracticeModuleReport,
  getPracticeFinalReport,
  verifyPracticeReport,
  getAdminPracticeReports,
  exportAdminPracticeCsv,
  correctStudentPracticeProgress,
  recordTopicPracticeSolved,
} from '../controllers/practice.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const practiceRouter = Router();

// Public report verification (Zero PII, unguessable report ID)
practiceRouter.get('/reports/verify/:reportId', verifyPracticeReport);

// Public / optional authenticated module discovery
practiceRouter.get('/modules', optionalAuthenticate, getPracticeModules);
practiceRouter.get('/modules/:moduleSlug/problems', optionalAuthenticate, getPracticeModuleProblems);
practiceRouter.get('/problems/:problemSlug', optionalAuthenticate, getPracticeProblemDetails);
practiceRouter.get('/modules/:moduleSlug/problems/:problemSlug', optionalAuthenticate, getPracticeProblemDetails);

// Timer & telemetry sync (student authenticated)
practiceRouter.post('/timer-sync', authenticate, syncPracticeTimer);
practiceRouter.post('/track-run', authenticate, trackPracticeRun);

// Practice reports (student authenticated)
practiceRouter.get('/reports/module/:moduleSlug', authenticate, getPracticeModuleReport);
practiceRouter.get('/reports/final', authenticate, getPracticeFinalReport);

// Admin practice analytics & management (admin role required)
practiceRouter.get('/admin/reports', authenticate, requireRole('ADMIN'), getAdminPracticeReports);
practiceRouter.get('/admin/reports/csv', authenticate, requireRole('ADMIN'), exportAdminPracticeCsv);
practiceRouter.post('/admin/correct-progress', authenticate, requireRole('ADMIN'), correctStudentPracticeProgress);

practiceRouter.post('/topics/solve', authenticate, recordTopicPracticeSolved);
