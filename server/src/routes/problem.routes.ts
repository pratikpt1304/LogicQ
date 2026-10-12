import { Router } from 'express';
import {
  getDailyChallenge,
  getCurrentWeekChallenges,
  getProblems,
  getProblemBySlugOrId,
} from '../controllers/problem.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const problemRouter = Router();

problemRouter.get('/daily', optionalAuthenticate, getDailyChallenge);
problemRouter.get('/current-week', optionalAuthenticate, getCurrentWeekChallenges);
problemRouter.get('/', optionalAuthenticate, getProblems);
problemRouter.get('/:identifier', optionalAuthenticate, getProblemBySlugOrId);
