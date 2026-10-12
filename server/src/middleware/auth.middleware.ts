import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check access token from httpOnly cookie or Authorization header
    let token = req.cookies?.accessToken || req.cookies?.access_token;

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

    // Verify live account status and role to prevent token reuse after ban or role change
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, isBanned: true, profileComplete: true },
    });

    if (!dbUser) {
      res.status(401).json({ success: false, message: 'Account no longer exists' });
      return;
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

    // If role in JWT no longer matches live DB role, force re-authentication
    if (dbUser.role !== payload.role) {
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
    };
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authentication verification failed' });
  }
}

export async function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.accessToken || req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, username: true, role: true, isBanned: true },
        });
        if (dbUser && !dbUser.isBanned && dbUser.role === payload.role) {
          req.user = {
            userId: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
          };
        }
      }
    }
  } catch {
    // Ignore optional auth lookup error
  }
  next();
}

