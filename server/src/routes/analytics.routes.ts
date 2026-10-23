import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const analyticsRoutes = Router();

// Student routes
analyticsRoutes.get('/student/dashboard', authenticate, AnalyticsController.getStudentDashboard);
analyticsRoutes.get('/student/report/:testId', authenticate, AnalyticsController.getStudentReport);

// Faculty routes
analyticsRoutes.get('/faculty/overview', authenticate, requireRole(['ADMIN', 'FACULTY']), AnalyticsController.getFacultyOverview);
analyticsRoutes.get('/faculty/student-deep-dive/:studentId', authenticate, requireRole(['ADMIN', 'FACULTY']), AnalyticsController.getStudentDeepDive);
analyticsRoutes.get('/faculty/export/csv/:sectionId', authenticate, requireRole(['ADMIN', 'FACULTY']), AnalyticsController.exportSectionCsv);
analyticsRoutes.get('/faculty/calibration/:testId?', authenticate, requireRole(['ADMIN', 'FACULTY']), AnalyticsController.getCalibrationReport);
