import { Request, Response } from 'express';
import { OtpService } from '../services/otp.service.js';
import { prisma } from '../config/database.js';

export class OtpController {
  static async sendEmailOtp(req: Request, res: Response) {
    try {
      const { email, prn } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required.' });
      }

      const ip = req.ip || req.socket.remoteAddress;
      const result = await OtpService.sendEmailOtp(email, prn, ip);

      if (!result.success) {
        return res.status(429).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to dispatch email OTP.' });
    }
  }

  static async verifyEmailOtp(req: Request, res: Response) {
    try {
      const { email, code, prn } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Email and 6-digit verification code are required.' });
      }

      const result = await OtpService.verifyEmailOtp(email, code, prn);
      if (!result.verified) {
        return res.status(400).json({ success: false, message: result.message });
      }

      // Mark user in database as email OTP verified
      if (prn || email) {
        try {
          const cleanEmail = String(email).trim().toLowerCase();
          const cleanPrn = prn ? String(prn).trim().toUpperCase() : null;
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                ...(cleanPrn ? [{ prn: cleanPrn }] : []),
                { email: cleanEmail },
              ],
            },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                email: cleanEmail,
                accountState: 'EMAIL_OTP_VERIFIED',
                emailOtpVerifiedAt: new Date(),
              },
            });
          }
        } catch (dbErr) {
          console.warn('OtpController.verifyEmailOtp database user sync notice:', dbErr);
        }
      }

      return res.json({ success: true, message: result.message });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Verification failed.' });
    }
  }

  static async sendMobileOtp(req: Request, res: Response) {
    try {
      const { mobile, prn } = req.body;
      if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required.' });
      }

      const ip = req.ip || req.socket.remoteAddress;
      const result = await OtpService.sendMobileOtp(mobile, prn, ip);

      if (!result.success) {
        return res.status(429).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to dispatch mobile OTP.' });
    }
  }

  static async verifyMobileOtp(req: Request, res: Response) {
    try {
      const { mobile, code, prn } = req.body;
      if (!mobile || !code) {
        return res.status(400).json({ success: false, message: 'Mobile number and 6-digit OTP are required.' });
      }

      const result = await OtpService.verifyMobileOtp(mobile, code, prn);
      if (!result.verified) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Mobile verification failed.' });
    }
  }

  static async checkIdentityBinding(req: Request, res: Response) {
    try {
      const { prn, email, mobile } = req.body;
      if (!prn || !email) {
        return res.status(400).json({
          success: false,
          message: 'PRN and email are required to validate identity binding.',
        });
      }

      const userId = (req as any).user?.id;
      const result = await OtpService.validateIdentityBinding(prn, email, mobile, userId);

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Binding check failed.' });
    }
  }
}
