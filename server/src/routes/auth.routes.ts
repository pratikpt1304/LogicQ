import { Router } from 'express';
import {
  register,
  login,
  logout,
  logoutAll,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
  googleSignIn,
  completeProfile,
  logSessionEvent,
  getSessionEvents,
  sendLoginOtp,
  verifyLoginOtp,
  sendBindEmailOtp,
  bindEmail,
  sendChangePasswordOtp,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/send-login-otp', sendLoginOtp);
authRouter.post('/verify-login-otp', verifyLoginOtp);
authRouter.post('/send-bind-email-otp', optionalAuthenticate, sendBindEmailOtp);
authRouter.post('/bind-email', optionalAuthenticate, bindEmail);
authRouter.post('/send-change-password-otp', optionalAuthenticate, sendChangePasswordOtp);
authRouter.post('/change-password', optionalAuthenticate, changePassword);
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleSignIn);
authRouter.post('/complete-profile', authenticate, completeProfile);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', authenticate, logoutAll);
authRouter.post('/session-events', authenticate, logSessionEvent);
authRouter.get('/session-events', authenticate, getSessionEvents);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

export default authRouter;
