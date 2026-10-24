import { Request, Response } from 'express';
import { MiniProjectService } from '../services/mini-project.service.js';
import { prisma } from '../utils/prisma.js';

export class MiniProjectController {
  /**
   * POST /api/mini-project - Create a mini-project (Faculty / Admin only)
   */
  static async createProject(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
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
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
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
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
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
   * POST /api/mini-project/grade - Faculty rubric evaluation (Phase 5)
   */
  static async gradeProject(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Forbidden. Faculty or Admin only.' });
      }

      const { accessId, rubricScores, facultyFeedback } = req.body;
      if (!accessId || !rubricScores) {
        return res.status(400).json({ success: false, message: 'accessId and rubricScores are required.' });
      }

      const outcome = await MiniProjectService.gradeMiniProjectRubric({
        accessId,
        facultyId: user.userId || user.id,
        rubricScores,
        facultyFeedback,
      });

      return res.json(outcome);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to grade mini-project.' });
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
   * GET /api/mini-project/student/my-projects - Returns mini-projects accessible to the student
   */
  static async getMyProjects(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const studentId = user.userId || user.id;

      const canonical = await prisma.miniProject.findFirst();

      const accesses = await prisma.studentMiniProjectAccess.findMany({
        where: { studentId },
        include: { miniProject: true },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        projects: accesses.map((a) => ({
          ...a.miniProject,
          accessStatus: a.status,
          academicScore: a.academicScore,
        })),
        canonicalProject: canonical,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch mini-projects.' });
    }
  }

  /**
   * POST /api/mini-project/activate-practice - Self-paced practice activation
   */
  static async activatePractice(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const studentId = user.userId || user.id;
      const { miniProjectId } = req.body;

      const project = await prisma.miniProject.findUnique({
        where: { id: miniProjectId || 'capstone-mini-project-c11' },
      });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Mini-project not found.' });
      }

      const access = await prisma.studentMiniProjectAccess.upsert({
        where: {
          miniProjectId_studentId: {
            miniProjectId: project.id,
            studentId,
          },
        },
        update: {
          status: 'ACTIVE',
          activationReason: 'Self-paced practice mode',
        },
        create: {
          miniProjectId: project.id,
          studentId,
          sectionId: 'self-paced-section',
          status: 'ACTIVE',
          activationReason: 'Self-paced practice mode',
        },
        include: { miniProject: true },
      });

      return res.json({ success: true, access, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to activate practice.' });
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
