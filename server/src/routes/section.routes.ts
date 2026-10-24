import { Router } from 'express';
import { SectionController } from '../controllers/section.controller.js';
import { OtpController } from '../controllers/otp.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const sectionRoutes = Router();

// Public routes for student instant join
sectionRoutes.get('/join-info/:tokenOrCode', SectionController.getPublicJoinInfo);
sectionRoutes.post('/instant-join', SectionController.instantJoin);
sectionRoutes.post('/send-email-otp', OtpController.sendEmailOtp);
sectionRoutes.post('/verify-email-otp', OtpController.verifyEmailOtp);

// Faculty & Admin authenticated routes
sectionRoutes.post('/', authenticate, requireRole(['ADMIN', 'FACULTY']), SectionController.createSection);
sectionRoutes.get('/', authenticate, requireRole(['ADMIN', 'FACULTY']), SectionController.getFacultySections);
sectionRoutes.get('/:id', authenticate, requireRole(['ADMIN', 'FACULTY']), SectionController.getSectionDetails);
sectionRoutes.delete('/:id', authenticate, requireRole(['ADMIN']), SectionController.deleteSection);
sectionRoutes.post('/preview-excel', authenticate, requireRole(['ADMIN', 'FACULTY']), SectionController.previewExcel);
sectionRoutes.post('/:sectionId/import-students', authenticate, requireRole(['ADMIN', 'FACULTY']), SectionController.importStudents);
