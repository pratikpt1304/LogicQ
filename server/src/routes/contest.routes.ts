import { Router, Request, Response, NextFunction } from 'express';
import {
  getContests,
  getContestBySlug,
  joinContest,
  getContestScoreboard,
} from '../controllers/contest.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { FEATURES } from '../config/features.config.js';

export const contestRouter = Router();

contestRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (!FEATURES.ARENA) {
    res.status(404).json({
      success: false,
      message: 'Not found',
    });
    return;
  }
  next();
});

contestRouter.get('/', optionalAuthenticate, getContests);
contestRouter.get('/:slug', optionalAuthenticate, getContestBySlug);
contestRouter.post('/:id/join', authenticate, joinContest);
contestRouter.get('/:id/scoreboard', optionalAuthenticate, getContestScoreboard);
