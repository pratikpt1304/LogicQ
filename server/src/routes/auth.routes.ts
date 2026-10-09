import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuth,
  googleAuthSchema,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';

export const authRouter = Router();

authRouter.post('/google', authLimiter, validate(googleAuthSchema), googleAuth);
authRouter.post('/register', authLimiter, validate(registerSchema), register);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

