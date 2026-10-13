import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { FEATURES } from './config/features.config.js';

// Route imports
import { authRouter } from './routes/auth.routes.js';
import { problemRouter } from './routes/problem.routes.js';
import { submissionRouter } from './routes/submission.routes.js';
import { contestRouter } from './routes/contest.routes.js';
import { leaderboardRouter } from './routes/leaderboard.routes.js';
import { userRouter } from './routes/user.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { checkerRouter } from './routes/checker.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { practiceRouter } from './routes/practice.routes.js';
import { prisma } from './utils/prisma.js';

export const app = express();

// Security & Parsing Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Monaco Editor and local Vite scripts
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [
      ENV.CLIENT_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://logicq-clanguage.web.app',
      'https://logicq-clanguage.firebaseapp.com',
    ],
    credentials: true,
  })
);

app.use(cookieParser());
// Allow larger JSON payloads specifically on /api/uploads (up to 3 x 5 MB base64 files)
app.use('/api/uploads', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Additional Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    app: 'LogicQ API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// System Configuration Endpoint (readable by clients)
app.get('/api/config', async (_req: Request, res: Response) => {
  try {
    const { getSystemConfig } = await import('./services/system-config.service.js');
    const config = await getSystemConfig();
    res.status(200).json({
      success: true,
      dailyChallengePaused: config.dailyChallengePaused,
      pausedAt: config.pausedAt,
      resumedAt: config.resumedAt,
      minScheduledForResume: config.minScheduledForResume,
    });
  } catch {
    res.status(200).json({
      success: true,
      dailyChallengePaused: true, // Safe fail-closed default
      pausedAt: null,
      resumedAt: null,
    });
  }
});

// Client Error Report Endpoint (rate-limited, scrubbed of tokens/code/personal data)
app.post('/api/support/error-report', async (req: Request, res: Response) => {
  try {
    const route = typeof req.body?.route === 'string' ? req.body.route.slice(0, 200) : '/';
    const message = typeof req.body?.message === 'string' ? req.body.message.slice(0, 500) : 'Unknown client error';
    const stack = typeof req.body?.stack === 'string' ? req.body.stack.slice(0, 2000) : null;
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 250) : null;

    await prisma.errorReport.create({
      data: {
        route,
        message,
        stack,
        userAgent,
      },
    });
    res.status(201).json({ success: true });
  } catch {
    res.status(200).json({ success: true });
  }
});

// Disabled Feature Route Guards (Arena, Archive & Badges return generic 404 Not Found for all callers)
app.use('/api/archive', (_req: Request, res: Response) => {
  if (!FEATURES.ARCHIVE) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use('/api/arena', (_req: Request, res: Response) => {
  if (!FEATURES.ARENA) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use('/api/badges', (_req: Request, res: Response) => {
  if (!FEATURES.BADGES) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use('/api/achievements', (_req: Request, res: Response) => {
  if (!FEATURES.BADGES) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.status(404).json({ success: false, message: 'Not found' });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/problems', problemRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/contests', contestRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/checker', checkerRouter);
app.use('/api/practice', practiceRouter);

// Global Error Handler (Mask internal details in production)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Payload too large (maximum 256KB allowed)',
    });
    return;
  }
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: ENV.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

export default app;
