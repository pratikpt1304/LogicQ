import { Router } from 'express';
import { SmartExamController } from '../controllers/smart-exam.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const smartExamRoutes = Router();

// Student authenticated exam routes
smartExamRoutes.get('/my-tests', authenticate, SmartExamController.getStudentTests);
smartExamRoutes.post('/start-question', authenticate, SmartExamController.startQuestion);
smartExamRoutes.post('/run-code', authenticate, SmartExamController.runCode);
smartExamRoutes.post('/telemetry', authenticate, SmartExamController.recordTelemetry);
smartExamRoutes.post('/submit-question', authenticate, SmartExamController.submitQuestion);
smartExamRoutes.get('/viva/current', authenticate, SmartExamController.getPendingViva);
smartExamRoutes.post('/viva/submit', authenticate, SmartExamController.submitViva);

// Faculty viva evaluation & override route (Phase 4)
smartExamRoutes.post('/viva/faculty-override', authenticate, requireRole(['ADMIN', 'FACULTY']), SmartExamController.facultyOverrideViva);
