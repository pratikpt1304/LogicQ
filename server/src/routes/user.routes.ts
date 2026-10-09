import { Router } from 'express';
import {
  getDashboardStats,
  getUserProfile,
  updateProfile,
  getAllBadges,
} from '../controllers/user.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const userRouter = Router();

userRouter.get('/dashboard/stats', authenticate, getDashboardStats);
userRouter.get('/profile/:username', optionalAuthenticate, getUserProfile);
userRouter.put('/profile', authenticate, updateProfile);
userRouter.get('/badges', optionalAuthenticate, getAllBadges);
