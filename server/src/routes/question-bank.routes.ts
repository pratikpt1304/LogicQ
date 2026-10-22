import { Router } from 'express';
import { QuestionBankController } from '../controllers/question-bank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const questionBankRoutes = Router();

// Protected faculty & admin question routes
questionBankRoutes.post(
  '/generate-ai',
  authenticate,
  requireRole(['ADMIN']),
  QuestionBankController.generateAiQuestion
);

questionBankRoutes.post(
  '/:id/validate',
  authenticate,
  requireRole(['ADMIN']),
  QuestionBankController.validateQuestion
);

questionBankRoutes.post(
  '/:id/approve',
  authenticate,
  requireRole(['ADMIN']),
  QuestionBankController.approveQuestion
);

questionBankRoutes.get(
  '/bank',
  authenticate,
  QuestionBankController.listQuestions
);
