import { Router } from 'express';
import { SectionController } from '../controllers/section.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const sectionRoutes = Router();

// Public routes for student instant join
sectionRoutes.get('/join-info/:tokenOrCode', SectionController.getPublicJoinInfo);
sectionRoutes.post('/instant-join', SectionController.instantJoin);

// Faculty & Admin authenticated routes
sectionRoutes.post('/', authenticate, requireRole(['ADMIN']), SectionController.createSection);
sectionRoutes.get('/', authenticate, SectionController.getFacultySections);
sectionRoutes.get('/:id', authenticate, SectionController.getSectionDetails);
sectionRoutes.post('/preview-excel', authenticate, SectionController.previewExcel);
sectionRoutes.post('/:sectionId/import-students', authenticate, SectionController.importStudents);
