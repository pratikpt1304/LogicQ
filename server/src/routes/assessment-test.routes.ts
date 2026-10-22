import { Router } from 'express';
import { AssessmentTestController } from '../controllers/assessment-test.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const assessmentTestRoutes = Router();

// Protected faculty & admin test routes
assessmentTestRoutes.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  AssessmentTestController.createTest
);

assessmentTestRoutes.get(
  '/',
  authenticate,
  AssessmentTestController.getFacultyTests
);

assessmentTestRoutes.get(
  '/:id',
  authenticate,
  AssessmentTestController.getTestDetails
);

assessmentTestRoutes.post(
  '/:id/assign',
  authenticate,
  requireRole(['ADMIN']),
  AssessmentTestController.assignTest
);
