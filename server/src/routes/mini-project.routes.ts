import { Router } from 'express';
import { MiniProjectController } from '../controllers/mini-project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const miniProjectRoutes = Router();

// Faculty routes
miniProjectRoutes.post('/', authenticate, requireRole(['ADMIN', 'FACULTY']), MiniProjectController.createProject);
miniProjectRoutes.post('/activate-individual', authenticate, requireRole(['ADMIN', 'FACULTY']), MiniProjectController.activateIndividual);
miniProjectRoutes.post('/grade', authenticate, requireRole(['ADMIN', 'FACULTY']), MiniProjectController.gradeProject);
miniProjectRoutes.get('/section-roster/:sectionId/:miniProjectId', authenticate, requireRole(['ADMIN', 'FACULTY']), MiniProjectController.getSectionRoster);

// Student routes
miniProjectRoutes.get('/:miniProjectId', authenticate, MiniProjectController.getStudentProject);
miniProjectRoutes.post('/submit', authenticate, MiniProjectController.submitProject);
