import { Request, Response } from 'express';
import { AssessmentTestService } from '../services/assessment-test.service.js';

export class AssessmentTestController {
  /**
   * POST /api/assessment-tests - Create & Configure Test (Sections 14 & 15)
   */
  static async createTest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;

      const {
        title,
        sectionId,
        moduleId,
        instructions,
        durationMinutes,
        questionCount,
        easyRatio = 40,
        mediumRatio = 40,
        hardRatio = 20,
        randomiseQuestions = true,
        startTime,
        endTime,
        attemptPolicy = 'STRICT_NO_REATTEMPT',
        autoSelectQuestions = true,
        manualQuestionIds,
      } = req.body;

      if (!title || !sectionId || !moduleId) {
        return res.status(400).json({
          success: false,
          message: 'Title, sectionId, and moduleId are required.',
        });
      }

      const test = await AssessmentTestService.createTest(
        {
          title,
          sectionId,
          moduleId,
          instructions,
          durationMinutes: Number(durationMinutes) || 60,
          questionCount: Number(questionCount) || 20,
          easyRatio: Number(easyRatio),
          mediumRatio: Number(mediumRatio),
          hardRatio: Number(hardRatio),
          randomiseQuestions: Boolean(randomiseQuestions),
          startTime,
          endTime,
          attemptPolicy,
          autoSelectQuestions: Boolean(autoSelectQuestions),
          manualQuestionIds,
        },
        facultyId
      );

      return res.status(201).json({
        success: true,
        message: 'Assessment test created and assigned to section roster.',
        data: test,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to create assessment test.',
      });
    }
  }

  /**
   * GET /api/assessment-tests - List faculty tests
   */
  static async getFacultyTests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;

      const tests = await AssessmentTestService.getFacultyTests(facultyId);
      return res.json({
        success: true,
        data: tests,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch tests.',
      });
    }
  }

  /**
   * GET /api/assessment-tests/:id - Test details
   */
  static async getTestDetails(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const test = await AssessmentTestService.getTestDetails(id, user.userId || user.id);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found.' });
      }

      return res.json({
        success: true,
        data: test,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch test details.',
      });
    }
  }

  /**
   * POST /api/assessment-tests/:id/assign - Assign test to section
   */
  static async assignTest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;
      const { id } = req.params;

      const result = await AssessmentTestService.assignTestToSection(id, facultyId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to assign test.',
      });
    }
  }
}
