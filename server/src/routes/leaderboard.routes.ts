import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', optionalAuthenticate, getLeaderboard);

export default leaderboardRouter;
