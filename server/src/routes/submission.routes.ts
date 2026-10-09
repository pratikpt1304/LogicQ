import { Router } from 'express';
import {
  runCode,
  submitSolution,
  getMySubmissions,
  getSubmissionById,
  getProblemSubmissions,
  runCodeSchema,
  submitSolutionSchema,
} from '../controllers/submission.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { runLimiter, submitLimiter } from '../middleware/rate-limit.middleware.js';

export const submissionRouter = Router();

submissionRouter.post('/run', authenticate, runLimiter, validate(runCodeSchema), runCode);
submissionRouter.post('/submit', authenticate, submitLimiter, validate(submitSolutionSchema), submitSolution);
submissionRouter.get('/my', authenticate, getMySubmissions);
submissionRouter.get('/problem/:problemId', authenticate, getProblemSubmissions);
submissionRouter.get('/:id', authenticate, getSubmissionById);
