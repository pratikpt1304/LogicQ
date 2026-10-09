import { Router } from 'express';
import {
  getDailyChallenge,
  getProblems,
  getProblemBySlugOrId,
} from '../controllers/problem.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const problemRouter = Router();

problemRouter.get('/daily', optionalAuthenticate, getDailyChallenge);
problemRouter.get('/', optionalAuthenticate, getProblems);
problemRouter.get('/:identifier', optionalAuthenticate, getProblemBySlugOrId);
