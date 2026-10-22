import { Router } from 'express';
import { OtpController } from '../controllers/otp.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const otpRoutes = Router();

otpRoutes.post('/send-email', OtpController.sendEmailOtp);
otpRoutes.post('/verify-email', OtpController.verifyEmailOtp);
otpRoutes.post('/send-mobile', OtpController.sendMobileOtp);
otpRoutes.post('/verify-mobile', OtpController.verifyMobileOtp);
otpRoutes.post('/check-binding', optionalAuthenticate, OtpController.checkIdentityBinding);
