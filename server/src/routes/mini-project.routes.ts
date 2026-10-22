import { Router } from 'express';
import { MiniProjectController } from '../controllers/mini-project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const miniProjectRoutes = Router();

// Faculty routes
miniProjectRoutes.post('/', authenticate, MiniProjectController.createProject);
miniProjectRoutes.post('/activate-individual', authenticate, MiniProjectController.activateIndividual);
miniProjectRoutes.get('/section-roster/:sectionId/:miniProjectId', authenticate, MiniProjectController.getSectionRoster);

// Student routes
miniProjectRoutes.get('/:miniProjectId', authenticate, MiniProjectController.getStudentProject);
miniProjectRoutes.post('/submit', authenticate, MiniProjectController.submitProject);
