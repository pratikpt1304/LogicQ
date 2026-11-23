import rateLimit from 'express-rate-limit';

const getUserOrIpKey = (req: any): string => {
  return (
    req.user?.userId ||
    req.user?.id ||
    req.user?.prn ||
    (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : '') ||
    req.ip ||
    '127.0.0.1'
  );
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window per account / client
  keyGenerator: (req) => {
    const ident = req.body?.prn || req.body?.email || req.body?.username;
    if (ident && typeof ident === 'string') {
      return `auth_${ident.toLowerCase().trim()}`;
    }
    return getUserOrIpKey(req);
  },
  message: { success: false, message: 'Too many authentication attempts for this account. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 submissions per minute per student
  keyGenerator: getUserOrIpKey,
  message: { success: false, message: 'Submission rate limit reached. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const runLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 runs per minute per student
  keyGenerator: getUserOrIpKey,
  message: { success: false, message: 'Run rate limit reached. Please wait a few seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
});
