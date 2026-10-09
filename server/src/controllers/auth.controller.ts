import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { mailService } from '../services/mail.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';

// Cookie options helper
const getCookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: maxAgeMs,
});

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    college: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Username or email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password, fullName, college } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({ success: false, message: 'Email is already registered' });
        return;
      }
      res.status(400).json({ success: false, message: 'Username is already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        college: college || null,
        role: 'STUDENT',
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        college: true,
        avatarUrl: true,
        totalPoints: true,
        currentStreak: true,
      },
    });

    const tokenPayload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token to db
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Set cookies
    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ success: false, message: 'Your account has been suspended by an administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      college: user.college,
      avatarUrl: user.avatarUrl,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: { user: userData, accessToken },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    // Check token in db
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Refresh token revoked or expired' });
      return;
    }

    if (dbToken.user.isBanned) {
      res.status(403).json({ success: false, message: 'Account is banned' });
      return;
    }

    const newAccessToken = generateAccessToken({
      userId: dbToken.user.id,
      role: dbToken.user.role,
      username: dbToken.user.username,
    });

    res.cookie('access_token', newAccessToken, getCookieOptions(15 * 60 * 1000));

    res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err: any) {
    console.error('Refresh error:', err);
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        college: true,
        bio: true,
        avatarUrl: true,
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
        lastSolvedDate: true,
        createdAt: true,
        userBadges: {
          include: { badge: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (err: any) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success for security, prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been dispatched.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${token}`;
    await mailService.sendMail({
      to: user.email,
      subject: 'LogicQ — Password Reset Instructions',
      html: `
        <div style="font-family: sans-serif; background: #0B0F17; color: #FFF; padding: 24px; border-radius: 8px;">
          <h2 style="color: #00F2FE;">LogicQ Password Reset</h2>
          <p>Hello ${user.fullName},</p>
          <p>A request was received to reset the password for your LogicQ account (@${user.username}).</p>
          <p><a href="${resetUrl}" style="background: #00F2FE; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a></p>
          <p>Or use this token directly: <code>${token}</code></p>
          <p style="color: #94A3B8; font-size: 12px;">This link will expire in 60 minutes. If you did not request this, ignore this email.</p>
        </div>
      `,
      text: `Reset your LogicQ password by visiting: ${resetUrl} or use token: ${token}`,
    });

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.',
      // In development mode, return token in response for quick testing
      ...(ENV.NODE_ENV === 'development' && { devResetToken: token }),
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
}

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().optional(),
    email: z.string().email('Valid email is required'),
    fullName: z.string().min(1, 'Full name is required'),
    avatarUrl: z.string().optional().nullable(),
    googleUid: z.string().optional(),
  }),
});

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { email, fullName, avatarUrl } = req.body;

    // Check institutional domain restrictions if enabled
    if (process.env.AUTH_MODE === 'DOMAIN_RESTRICTED') {
      const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const domain = email.split('@')[1]?.toLowerCase();
      if (allowed.length > 0 && (!domain || !allowed.includes(domain))) {
        res.status(403).json({
          success: false,
          message: `Access restricted to institutional email domains: ${allowed.map((d) => '@' + d).join(', ')}`,
        });
        return;
      }
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator.',
      });
      return;
    }

    if (!user) {
      // Auto-provision student account for verified Google Sign-In
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      let username = baseUsername;
      const count = await prisma.user.count({ where: { username } });
      if (count > 0) {
        username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          fullName,
          avatarUrl: avatarUrl || null,
          role: 'STUDENT',
        },
      });
    } else if (avatarUrl && !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    }

    const tokenPayload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Signed in successfully via Google',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          college: user.college,
          avatarUrl: user.avatarUrl,
          totalPoints: user.totalPoints,
          currentStreak: user.currentStreak,
        },
        accessToken,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
}

