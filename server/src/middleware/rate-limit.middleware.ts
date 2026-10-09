import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per window
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // max 15 submissions per minute per IP/user
  message: { success: false, message: 'Submission rate limit reached. Please wait before submitting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const runLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // max 20 runs per minute
  message: { success: false, message: 'Run rate limit reached. Please wait a few seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
});
