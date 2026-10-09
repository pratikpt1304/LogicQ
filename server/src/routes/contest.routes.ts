import { Router } from 'express';
import {
  getContests,
  getContestBySlug,
  joinContest,
  getContestScoreboard,
} from '../controllers/contest.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const contestRouter = Router();

contestRouter.get('/', optionalAuthenticate, getContests);
contestRouter.get('/:slug', optionalAuthenticate, getContestBySlug);
contestRouter.post('/:id/join', authenticate, joinContest);
contestRouter.get('/:id/scoreboard', optionalAuthenticate, getContestScoreboard);
