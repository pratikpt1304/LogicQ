import { Router } from 'express';
import {
  getDashboardStats,
  getUserProfile,
  updateProfile,
  getAllBadges,
  updateProfileSchema,
} from '../controllers/user.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

export const userRouter = Router();

userRouter.get('/dashboard/stats', authenticate, getDashboardStats);
userRouter.get('/profile/:username', optionalAuthenticate, getUserProfile);
userRouter.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
userRouter.get('/badges', optionalAuthenticate, getAllBadges);

