import { Router } from 'express';
import { SmartExamController } from '../controllers/smart-exam.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const smartExamRoutes = Router();

// Student authenticated exam routes
smartExamRoutes.get('/my-tests', authenticate, SmartExamController.getStudentTests);
smartExamRoutes.post('/start-question', authenticate, SmartExamController.startQuestion);
smartExamRoutes.post('/run-code', authenticate, SmartExamController.runCode);
smartExamRoutes.post('/submit-question', authenticate, SmartExamController.submitQuestion);
smartExamRoutes.get('/viva/current', authenticate, SmartExamController.getPendingViva);
smartExamRoutes.post('/viva/submit', authenticate, SmartExamController.submitViva);
