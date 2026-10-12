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
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  containsProfanity,
  maskPrn,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
  generateShortId,
  verifyAllowlistCsv,
  getPrnChangeCooldownStatus,
} from '../config/academic.config.js';

// Serialization lock for atomic PRN registration transactions under high concurrency
let prnTransactionChain: Promise<unknown> = Promise.resolve();
function runSerializedPrnTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const next = prnTransactionChain.then(fn, fn);
  prnTransactionChain = next.catch(() => {});
  return next;
}

export const academicFieldsSchema = z.object({
  prn: z
    .preprocess((val) => normalizePrn(val), z.string())
    .refine((val) => val.length > 0, { message: PRN_ERROR_MESSAGE })
    .refine((val) => isValidPrn(val), {
      message: PRN_ERROR_MESSAGE,
    }),
  college: z.enum(ALLOWED_COLLEGES, {
    errorMap: () => ({ message: 'Please select a valid college from the list.' }),
  }),
  department: z.enum(ALLOWED_DEPARTMENTS, {
    errorMap: () => ({ message: 'Please select a valid department from the list.' }),
  }),
  year: z.enum(ALLOWED_YEARS, {
    errorMap: () => ({ message: 'Please select a valid academic year (FY, SY, or TY).' }),
  }),
  division: z
    .preprocess((val) => {
      if (val === undefined || val === null) return null;
      if (typeof val !== 'string') return String(val);
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed.toUpperCase();
    }, z.string().nullable().optional())
    .refine((val) => val === null || val === undefined || DIVISION_REGEX.test(val), {
      message: 'Division must be up to 3 letters or digits (e.g., A, B, C1).',
    }),
});

const registerSchema = academicFieldsSchema
  .extend({
    email: z
      .preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : ''), z.string())
      .pipe(z.string().email('Please enter a valid college email address.')),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, 'Password must be at least 8 characters long.')
      .max(100),
    confirmPassword: z.string().optional(),
    displayName: z
      .string()
      .trim()
      .min(DISPLAY_NAME_MIN, `Display name must be at least ${DISPLAY_NAME_MIN} characters.`)
      .max(DISPLAY_NAME_MAX, `Display name must be at most ${DISPLAY_NAME_MAX} characters.`)
      .refine((val) => !containsProfanity(val), {
        message: 'Display name contains inappropriate language.',
      })
      .optional()
      .nullable(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    }
  );

const loginSchema = z
  .object({
    identifier: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .transform((data) => ({
    identifier: (data.identifier || data.email || '').trim(),
    password: data.password,
  }))
  .refine((data) => data.identifier.length > 0, {
    message: 'College email is required',
    path: ['identifier'],
  });

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(100),
});

const googleSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid Google college email is required.'),
  googleId: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  // Firebase Hosting CDN edge exclusively forwards cookies named '__session' to backend functions.
  // We set __session with httpOnly, lax sameSite, and path: '/' without storing PII inside it.
  res.cookie('__session', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function isEmailDomainAllowed(email: string): { allowed: boolean; allowedDomains: string[] } {
  const authMode = (process.env.AUTH_MODE || 'OPEN').toUpperCase();
  const rawDomains = process.env.ALLOWED_EMAIL_DOMAINS || 'sanjivani.org.in';
  const allowedDomains = rawDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (authMode !== 'DOMAIN_RESTRICTED' || allowedDomains.length === 0) {
    return { allowed: true, allowedDomains };
  }

  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const allowed = allowedDomains.some(
    (domain) => emailDomain === domain || emailDomain.endsWith(`.${domain}`)
  );

  return { allowed, allowedDomains };
}

export function formatSelfUserResponse(user: {
  id: string;
  username: string;
  prn?: string | null;
  email: string;
  fullName?: string | null;
  displayName?: string | null;
  shortId?: string | null;
  role: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak?: number;
  avatarUrl?: string | null;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  division?: string | null;
  profileComplete?: boolean;
  bio?: string | null;
  prnChangedAt?: Date | null;
  createdAt?: Date;
}) {
  const shortId = user.shortId || generateShortId(user.id);
  const publicDisplayName = formatPublicDisplayName({
    displayName: user.displayName,
    shortId,
    id: user.id,
  });
  const maskedPrn = maskPrn(user.prn);
  const ownIdentityLabel = formatOwnIdentityLabel({
    department: user.department,
    year: user.year,
    prn: user.prn,
  });

  const cooldownStatus = getPrnChangeCooldownStatus(user.prnChangedAt);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    prn: user.prn || null,
    maskedPrn,
    ownIdentityLabel,
    displayName: user.displayName || null,
    publicDisplayName,
    shortId,
    fullName: user.displayName || ownIdentityLabel || publicDisplayName,
    role: user.role,
    totalPoints: user.totalPoints,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak ?? 0,
    avatarUrl: user.avatarUrl || null,
    college: user.college || null,
    department: user.department || null,
    year: user.year || null,
    division: user.division || null,
    profileComplete: user.profileComplete ?? Boolean(user.prn && user.college && user.department && user.year),
    bio: user.bio || null,
    prnChangedAt: user.prnChangedAt || null,
    prnNextAllowedDate: cooldownStatus.nextAllowedDate ? cooldownStatus.nextAllowedDate.toISOString() : null,
    isPrnChangeEligible: cooldownStatus.isEligible,
    createdAt: user.createdAt,
  };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        parsed.error.issues[0]?.message || 'Validation failed. Please check your inputs.';
      res.status(400).json({
        success: false,
        message: firstError,
        errors: fieldErrors,
      });
      return;
    }

    const { prn, college, department, year, division, email, password, displayName } = parsed.data;

    // 1. Check institutional email domain policy
    const domainCheck = isEmailDomainAllowed(email);
    if (!domainCheck.allowed) {
      res.status(403).json({
        success: false,
        message: `Registration is restricted to institutional emails (${domainCheck.allowedDomains.join(', ')}).`,
      });
      return;
    }

    // 2. Check optional Admin Allowlist CSV (PRN + Email)
    const allowlistCheck = verifyAllowlistCsv(prn, email);
    if (!allowlistCheck.allowed) {
      res.status(403).json({
        success: false,
        message: allowlistCheck.reason || 'PRN and email are not on the institutional allowlist.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Atomic Serialized Transaction: Check & create PrnIndex + User together
    const user = await runSerializedPrnTransaction(async () => {
      return prisma.$transaction(async (tx) => {
        const existingPrn = await tx.prnIndex.findUnique({
          where: { prn },
        });
        if (existingPrn) {
          const err = new Error('This PRN is already registered.');
          (err as any).statusCode = 409;
          (err as any).field = 'prn';
          throw err;
        }

        const existingUserByPrn = await tx.user.findUnique({
          where: { prn },
        });
        if (existingUserByPrn) {
          const err = new Error('This PRN is already registered.');
          (err as any).statusCode = 409;
          (err as any).field = 'prn';
          throw err;
        }

        const existingEmail = await tx.user.findUnique({
          where: { email },
        });
        if (existingEmail) {
          const err = new Error('An account with this college email already exists.');
          (err as any).statusCode = 400;
          (err as any).field = 'email';
          throw err;
        }

        const shortId = crypto.randomBytes(2).toString('hex').toUpperCase();
        const uniqueSuffix = crypto.randomBytes(3).toString('hex').toLowerCase();
        const generatedUsername = `student_${shortId.toLowerCase()}_${uniqueSuffix}`;

        const createdUser = await tx.user.create({
          data: {
            username: generatedUsername,
            prn,
            email,
            passwordHash,
            college,
            department,
            year,
            division: division ?? null,
            displayName: displayName ?? null,
            shortId,
            fullName: displayName || `Student ${shortId}`,
            profileComplete: true,
            role: 'STUDENT',
          },
        });

        await tx.prnIndex.create({
          data: {
            prn,
            userId: createdUser.id,
          },
        });

        return createdUser;
      });
    });

    const payload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: formatSelfUserResponse(user),
        accessToken,
      },
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.code === 'P2002') {
      const isEmailConflict =
        error?.field === 'email' ||
        (Array.isArray(error?.meta?.target) && error.meta.target.includes('email'));
      if (isEmailConflict) {
        res.status(400).json({
          success: false,
          message: 'An account with this college email already exists.',
          errors: { email: ['An account with this college email already exists.'] },
        });
        return;
      }
      res.status(409).json({
        success: false,
        message: 'This PRN is already registered.',
        errors: { prn: ['This PRN is already registered.'] },
      });
      return;
    }
    if (error?.statusCode === 400) {
      res.status(400).json({
        success: false,
        message: error.message,
        errors: error.field ? { [error.field]: [error.message] } : undefined,
      });
      return;
    }
    console.error('Register error: Failed to register student account');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Google Sign-In handler: creates an incomplete account on first sign-in (`profileComplete: false`)
 * so the client immediately shows the required "Complete your profile" step and blocks dashboard access.
 */
export const googleSignIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = googleSignInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid Google sign-in payload.',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, avatarUrl } = parsed.data;
    const domainCheck = isEmailDomainAllowed(email);
    if (!domainCheck.allowed) {
      res.status(403).json({
        success: false,
        message: `Google Sign-In is restricted to institutional emails (${domainCheck.allowedDomains.join(', ')}).`,
      });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const shortId = crypto.randomBytes(2).toString('hex').toUpperCase();
      const uniqueSuffix = crypto.randomBytes(3).toString('hex').toLowerCase();
      const generatedUsername = `student_${shortId.toLowerCase()}_${uniqueSuffix}`;
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

      user = await prisma.user.create({
        data: {
          username: generatedUsername,
          email,
          passwordHash: randomPasswordHash,
          shortId,
          fullName: `Student ${shortId}`,
          avatarUrl: avatarUrl || null,
          profileComplete: false,
          role: 'STUDENT',
        },
      });
    } else if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator.',
      });
      return;
    }

    const payload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: user.profileComplete
        ? 'Google Sign-In successful'
        : 'Please complete your academic profile to continue.',
      data: {
        user: formatSelfUserResponse(user),
        accessToken,
        requiresProfileCompletion: !user.profileComplete,
      },
    });
  } catch (error) {
    console.error('Google Sign-In error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Complete Profile step for Google Sign-In or migrated incomplete accounts.
 * Atomically sets PRN, College, Department, Year, Division and locks PrnIndex.
 */
export const completeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const parsed = academicFieldsSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        parsed.error.issues[0]?.message || 'Validation failed. Please check your inputs.';
      res.status(400).json({
        success: false,
        message: firstError,
        errors: fieldErrors,
      });
      return;
    }

    const { prn, college, department, year, division } = parsed.data;
    const userId = req.user.userId;

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (currentUser.profileComplete && currentUser.prn) {
      res.status(403).json({
        success: false,
        message: 'Profile is already completed. PRN and college cannot be changed by students.',
      });
      return;
    }

    const allowlistCheck = verifyAllowlistCsv(prn, currentUser.email);
    if (!allowlistCheck.allowed) {
      res.status(403).json({
        success: false,
        message: allowlistCheck.reason || 'PRN and email are not on the institutional allowlist.',
      });
      return;
    }

    const updatedUser = await runSerializedPrnTransaction(async () => {
      return prisma.$transaction(async (tx) => {
        const existingPrn = await tx.prnIndex.findUnique({ where: { prn } });
        if (existingPrn && existingPrn.userId !== userId) {
          const err = new Error('This PRN is already registered.');
          (err as any).statusCode = 409;
          throw err;
        }

        const shortId = currentUser.shortId || generateShortId(currentUser.id);

        await tx.prnIndex.upsert({
          where: { prn },
          update: { userId },
          create: { prn, userId },
        });

        return tx.user.update({
          where: { id: userId },
          data: {
            prn,
            college,
            department,
            year,
            division: division ?? null,
            shortId,
            profileComplete: true,
          },
        });
      });
    });

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        user: formatSelfUserResponse(updatedUser),
      },
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'This PRN is already registered.',
        errors: { prn: ['This PRN is already registered.'] },
      });
      return;
    }
    console.error('Complete profile error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const identifier = parsed.data.identifier.trim();
    const { password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { prn: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator.',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const payload = { userId: user.id, role: user.role, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatSelfUserResponse(user),
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('__session', { path: '/' });
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token missing' });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date() ||
      storedToken.user.isBanned
    ) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const payload = {
      userId: storedToken.user.id,
      role: storedToken.user.role,
      username: storedToken.user.username,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user: formatSelfUserResponse(user) },
    });
  } catch (error) {
    console.error('GetMe error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid email address' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been generated.',
      });
      return;
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires: expires,
      },
    });

    const isDev = process.env.NODE_ENV === 'development';

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been generated.',
      ...(isDev ? { devResetToken: rawResetToken } : {}),
    });
  } catch (error) {
    console.error('ForgotPassword error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { token, newPassword } = parsed.data;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
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

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('ResetPassword error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
