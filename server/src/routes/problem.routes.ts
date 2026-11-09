import { Router } from 'express';
import {
  getDailyChallenge,
  getCurrentWeekChallenges,
  getProblems,
  getProblemBySlugOrId,
} from '../controllers/problem.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';
import { runCode, runCodeSchema } from '../controllers/submission.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { runLimiter } from '../middleware/rate-limit.middleware.js';

export const problemRouter = Router();

problemRouter.get('/daily', optionalAuthenticate, getDailyChallenge);
problemRouter.get('/current-week', optionalAuthenticate, getCurrentWeekChallenges);
problemRouter.get('/', optionalAuthenticate, getProblems);
problemRouter.get('/:identifier', optionalAuthenticate, getProblemBySlugOrId);
problemRouter.post('/run', optionalAuthenticate, runLimiter, validate(runCodeSchema), runCode);
