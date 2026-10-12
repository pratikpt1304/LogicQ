import { Router } from 'express';
import {
  getUserProfile,
  updateProfile,
  getDashboardStats,
  exportMyData,
  deleteMyAccount,
} from '../controllers/user.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { FEATURES } from '../config/features.config.js';

export const userRouter = Router();

// Block badge endpoints under /api/users when FEATURE_BADGES=false
userRouter.use('/badges', (_req, res) => {
  if (!FEATURES.BADGES) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

userRouter.all('/:username/badges', (_req, res) => {
  if (!FEATURES.BADGES) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

userRouter.get('/dashboard/stats', authenticate, getDashboardStats);
userRouter.get('/me/export', authenticate, exportMyData);
userRouter.delete('/me', authenticate, deleteMyAccount);
userRouter.get('/profile/:username', optionalAuthenticate, getUserProfile);
userRouter.get('/:username/profile', optionalAuthenticate, getUserProfile);
userRouter.put('/profile', authenticate, updateProfile);
userRouter.patch('/profile', authenticate, updateProfile);
userRouter.patch('/me', authenticate, updateProfile);

export default userRouter;
