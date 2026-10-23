import { Request, Response } from 'express';
import { LearningAnalyticsService } from '../services/learning-analytics.service.js';
import { TelemetryCalibrationService } from '../services/telemetry-calibration.service.js';

export class AnalyticsController {
  /**
   * GET /api/analytics/student/dashboard - Student learning & dual-score analytics
   */
  static async getStudentDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await LearningAnalyticsService.getStudentDashboardAnalytics(user.userId || user.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch student dashboard analytics.' });
    }
  }

  /**
   * GET /api/analytics/student/report/:testId - Official two-part PDF audit data (Section 47)
   */
  static async getStudentReport(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { testId } = req.params;
      const report = await LearningAnalyticsService.generateStudentReportData(user.userId || user.id, testId);
      return res.json({ success: true, report });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to generate student report.' });
    }
  }

  /**
   * GET /api/analytics/faculty/overview - Faculty top cards, risk distributions, flagged questions
   */
  static async getFacultyOverview(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const data = await LearningAnalyticsService.getFacultyOverviewAnalytics(user.userId || user.id, user.role);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch faculty analytics.' });
    }
  }

  /**
   * GET /api/analytics/faculty/student-deep-dive/:studentId - Individual student drill-down (Section 52 & 53)
   */
  static async getStudentDeepDive(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { studentId } = req.params;
      const data = await LearningAnalyticsService.getStudentDeepDive(studentId);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch student deep dive.' });
    }
  }

  /**
   * GET /api/analytics/faculty/export/csv/:sectionId - Section CSV export (Section 55)
   */
  static async exportSectionCsv(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { sectionId } = req.params;
      const csv = await LearningAnalyticsService.generateSectionCsv(sectionId, user.userId || user.id, user.role);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logicq_section_${sectionId}_audit.csv"`);
      return res.send(csv);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to export CSV.' });
    }
  }

  /**
   * GET /api/analytics/faculty/calibration/:testId? - Empirical cohort telemetry distribution & noise floor (Phase 3)
   */
  static async getCalibrationReport(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { testId } = req.params;
      const calibration = await TelemetryCalibrationService.calibrateTestTelemetry(testId);
      return res.json({ success: true, data: calibration });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to generate calibration report.' });
    }
  }
}
