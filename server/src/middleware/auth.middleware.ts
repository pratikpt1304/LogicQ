import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';
import { isExplicitAdminEmail } from '../controllers/auth.controller.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check access token from Firebase Hosting __session cookie, httpOnly cookie, or Authorization header
    let token = req.cookies?.__session || req.cookies?.accessToken || req.cookies?.access_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ success: false, message: 'Invalid or expired access token' });
      return;
    }

    // 1. First attempt: locate user by id
    let dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
    });

    // 2. Self-healing fallback: If Render container restarted and SQLite was re-initialized,
    // recover user by email or username from cryptographically verified JWT payload
    if (!dbUser && (payload.email || payload.username)) {
      if (payload.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: payload.email.toLowerCase() },
          select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
        });
      }
      if (!dbUser && payload.username) {
        dbUser = await prisma.user.findUnique({
          where: { username: payload.username },
          select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
        });
      }

      // If user still doesn't exist in the freshly booted database:
      if (!dbUser) {
        const isAdminAccount = payload.role === 'ADMIN' ||
          (payload.email && isExplicitAdminEmail(payload.email)) ||
          isExplicitAdminEmail(payload.username);

        if (isAdminAccount) {
          const targetEmail = payload.email?.toLowerCase() || (isExplicitAdminEmail(payload.username) ? payload.username : 'logicqarena@gmail.com');
          const isPratik = targetEmail.includes('thorat');
          const placeholderHash = await bcrypt.hash('AdminPassword123!', 10);

          dbUser = await prisma.user.upsert({
            where: { email: targetEmail },
            update: { role: 'ADMIN', profileComplete: true },
            create: {
              username: payload.username || targetEmail.split('@')[0],
              email: targetEmail,
              role: 'ADMIN',
              fullName: targetEmail.includes('hariprasath') ? 'Dr. Hari Prasath' : 'LogicQ Admin',
              displayName: targetEmail.includes('hariprasath') ? 'Dr. Hari Prasath (Admin)' : 'Admin',
              passwordHash: placeholderHash,
              college: 'Sanjivani University',
              department: 'CSE',
              profileComplete: true,
            },
            select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
          });
        } else if (payload.email) {
          // Auto-restore enrolled student/faculty from valid signed JWT
          const placeholderHash = await bcrypt.hash('AutoRestoredStudent123!', 10);
          const targetEmail = payload.email.toLowerCase().trim();
          const targetUsername = payload.username || targetEmail.split('@')[0];

          try {
            dbUser = await prisma.user.upsert({
              where: { email: targetEmail },
              update: {
                role: payload.role || undefined,
                profileComplete: true,
              },
              create: {
                id: payload.userId,
                username: targetUsername,
                email: targetEmail,
                prn: payload.prn || null,
                role: payload.role || 'STUDENT',
                fullName: payload.username || targetUsername,
                passwordHash: placeholderHash,
                profileComplete: true,
                college: 'Sanjivani University',
                department: 'CSE',
              },
              select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
            });
          } catch (createErr) {
            console.warn('Auto-restore user upsert failed, attempting fallback query:', createErr);
            dbUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: targetEmail },
                  { username: targetUsername },
                  ...(payload.prn ? [{ prn: payload.prn }] : []),
                ],
              },
              select: { id: true, email: true, username: true, role: true, isBanned: true, profileComplete: true },
            });
          }
        }
      }
    }

    if (!dbUser) {
      res.status(401).json({ success: false, message: 'Account no longer exists' });
      return;
    }

    // Auto-promote and self-heal Super Admin accounts
    if (isExplicitAdminEmail(dbUser.email)) {
      if (dbUser.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: 'ADMIN', profileComplete: true },
        }).catch(() => {});
        dbUser.role = 'ADMIN';
      }
      req.user = {
        userId: dbUser.id,
        username: dbUser.username,
        role: 'ADMIN',
        email: dbUser.email,
      };
      return next();
    }

    if (dbUser.isBanned) {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by an administrator.',
      });
      return;
    }

    // If role in JWT no longer matches live DB role, update unless banned
    if (dbUser.role !== payload.role && !isExplicitAdminEmail(dbUser.email)) {
      res.status(401).json({
        success: false,
        code: 'ROLE_CHANGED_RELOGIN_REQUIRED',
        error: 'ROLE_CHANGED_RELOGIN_REQUIRED',
        message: 'Your account permissions have changed. Please sign in again.',
      });
      return;
    }

    // Block dashboard/protected APIs until Google Sign-In academic profile is completed
    const fullPath = `${req.baseUrl || ''}${req.path || ''}`;
    const allowedIncompletePaths = [
      '/api/auth/complete-profile',
      '/api/auth/me',
      '/api/auth/logout',
      '/api/users/me',
    ];
    if (
      dbUser.role !== 'ADMIN' &&
      dbUser.profileComplete === false &&
      !allowedIncompletePaths.some((p) => fullPath.startsWith(p))
    ) {
      res.status(403).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        error: 'PROFILE_INCOMPLETE',
        message: 'Please complete your academic profile before accessing the dashboard.',
      });
      return;
    }

    req.user = {
      userId: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      email: dbUser.email,
    };
    next();
  } catch (err) {
    console.error('Authentication verification error in auth.middleware:', err);
    res.status(500).json({ success: false, message: 'Authentication verification failed' });
  }
}

export async function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.__session || req.cookies?.accessToken || req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        let dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, username: true, role: true, isBanned: true },
        });

        if (!dbUser && (payload.email || payload.username)) {
          if (payload.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: payload.email.toLowerCase() },
              select: { id: true, email: true, username: true, role: true, isBanned: true },
            });
          }
          if (!dbUser && payload.username) {
            dbUser = await prisma.user.findUnique({
              where: { username: payload.username },
              select: { id: true, email: true, username: true, role: true, isBanned: true },
            });
          }
        }

        if (dbUser && !dbUser.isBanned) {
          const role = isExplicitAdminEmail(dbUser.email) ? 'ADMIN' : dbUser.role;
          req.user = {
            userId: dbUser.id,
            username: dbUser.username,
            role,
            email: dbUser.email,
          };
        }
      }
    }
  } catch {
    // Ignore optional auth lookup error
  }
  next();
}
