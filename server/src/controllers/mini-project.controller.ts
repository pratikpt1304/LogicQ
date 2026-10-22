import { Request, Response } from 'express';
import { MiniProjectService } from '../services/mini-project.service.js';

export class MiniProjectController {
  /**
   * POST /api/mini-project - Create a mini-project (Faculty / Admin only)
   */
  static async createProject(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { moduleId, title, scenario, requirements, rubricJson, starterCode, expectedTimeMin, expectedTimeMax } = req.body;
      if (!moduleId || !title || !scenario || !requirements) {
        return res.status(400).json({ success: false, message: 'moduleId, title, scenario, and requirements are required.' });
      }

      const project = await MiniProjectService.createMiniProject({
        moduleId,
        title,
        scenario,
        requirements,
        rubricJson,
        starterCode,
        expectedTimeMin,
        expectedTimeMax,
      });

      return res.status(201).json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to create mini project.' });
    }
  }

  /**
   * POST /api/mini-project/activate-individual - Individual student activation (Section 37 & 38)
   */
  static async activateIndividual(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { miniProjectId, studentId, sectionId, activationReason } = req.body;
      if (!miniProjectId || !studentId || !sectionId) {
        return res.status(400).json({ success: false, message: 'miniProjectId, studentId, and sectionId are required.' });
      }

      const outcome = await MiniProjectService.activateIndividualStudent({
        miniProjectId,
        studentId,
        sectionId,
        facultyId: user.userId || user.id,
        activationReason,
      });

      return res.json(outcome);
    } catch (err: any) {
      const isBulkBlocked = err.message?.includes('SECTION_38_VIOLATION');
      return res.status(isBulkBlocked ? 400 : 500).json({
        success: false,
        code: isBulkBlocked ? 'SECTION_38_VIOLATION' : 'ACTIVATION_FAILED',
        message: err.message || 'Failed to activate mini-project.',
      });
    }
  }

  /**
   * GET /api/mini-project/section-roster/:sectionId/:miniProjectId - Faculty view of activation roster
   */
  static async getSectionRoster(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { sectionId, miniProjectId } = req.params;
      const roster = await MiniProjectService.getSectionMiniProjectRoster(sectionId, miniProjectId);
      return res.json({ success: true, roster });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch section roster.' });
    }
  }

  /**
   * GET /api/mini-project/:miniProjectId - Student fetches their assigned mini-project
   */
  static async getStudentProject(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { miniProjectId } = req.params;

      const outcome = await MiniProjectService.getStudentMiniProject(user.userId || user.id, miniProjectId);
      return res.json(outcome);
    } catch (err: any) {
      const isInactive = err.message?.includes('MINI_PROJECT_INACTIVE');
      return res.status(isInactive ? 403 : 400).json({
        success: false,
        code: isInactive ? 'MINI_PROJECT_INACTIVE' : 'FETCH_FAILED',
        message: err.message || 'Failed to fetch mini-project.',
      });
    }
  }

  /**
   * POST /api/mini-project/submit - Student submits mini-project
   */
  static async submitProject(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { miniProjectId, code, clientMetrics } = req.body;

      if (!miniProjectId || code === undefined) {
        return res.status(400).json({ success: false, message: 'miniProjectId and code are required.' });
      }

      const outcome = await MiniProjectService.submitMiniProject({
        miniProjectId,
        studentId: user.userId || user.id,
        code,
        clientMetrics,
      });

      return res.json(outcome);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to submit mini-project.' });
    }
  }
}
