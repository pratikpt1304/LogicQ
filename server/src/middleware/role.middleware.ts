import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { normalizeRole, RoleName } from '../config/roles.config.js';

export function requireRole(allowedRoles: string | string[]) {
  const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
    r.toUpperCase()
  );

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userRole = normalizeRole(req.user.role);

    if (!roles.includes(userRole)) {
      res.status(403).json({ success: false, message: 'Access denied: insufficient privileges' });
      return;
    }

    next();
  };
}

