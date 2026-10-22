import { Request, Response } from 'express';
import { AiQuestionService } from '../services/ai-question.service.js';
import { QuestionValidationService } from '../services/question-validation.service.js';
import { prisma } from '../utils/prisma.js';

export class QuestionBankController {
  /**
   * POST /api/questions/generate-ai - Generate AI question with compilation correctness check (Sections 16 & 17)
   */
  static async generateAiQuestion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        module = 'Module 1',
        section = 'Section 1',
        topic = 'Nested Loops and Arrays',
        difficulty = 'MEDIUM',
        learningOutcome,
        bloomsLevel = 'APPLY',
        scenarioContext,
      } = req.body;

      const result = await AiQuestionService.generateAndSaveQuestion(
        {
          module,
          section,
          topic,
          difficulty,
          learningOutcome,
          bloomsLevel,
          scenarioContext,
        },
        user.userId || user.id
      );

      return res.status(201).json({
        success: true,
        message: 'Question generated and evaluated against C sandbox.',
        data: result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to generate question.',
      });
    }
  }

  /**
   * POST /api/questions/:id/validate - Run C compiler and 3 test cases against reference solution (Section 17)
   */
  static async validateQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const outcome = await QuestionValidationService.validateProblemById(id);
      return res.json({
        success: true,
        outcome,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Question validation failed.',
      });
    }
  }

  /**
   * POST /api/questions/:id/approve - Approve question for assessment inclusion (Section 18)
   */
  static async approveQuestion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const result = await QuestionValidationService.approveQuestion(id, user.userId || user.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to approve question.',
      });
    }
  }

  /**
   * GET /api/questions/bank - List questions with filters for Module, Section, Difficulty, Status
   */
  static async listQuestions(req: Request, res: Response) {
    try {
      const { module, section, difficulty, validationStatus, search } = req.query;

      const where: any = {};
      if (module) where.module = String(module);
      if (section) where.section = String(section);
      if (difficulty) where.difficulty = String(difficulty);
      if (validationStatus) where.validationStatus = String(validationStatus);
      if (search) {
        where.OR = [
          { title: { contains: String(search) } },
          { topic: { contains: String(search) } },
          { description: { contains: String(search) } },
        ];
      }

      const questions = await prisma.problem.findMany({
        where,
        include: {
          testCases: {
            select: { id: true, isHidden: true, orderIndex: true },
          },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json({
        success: true,
        count: questions.length,
        questions,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to list questions.',
      });
    }
  }
}
