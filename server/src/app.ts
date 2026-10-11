import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';

// Route imports
import { authRouter } from './routes/auth.routes.js';
import { problemRouter } from './routes/problem.routes.js';
import { submissionRouter } from './routes/submission.routes.js';
import { contestRouter } from './routes/contest.routes.js';
import { leaderboardRouter } from './routes/leaderboard.routes.js';
import { userRouter } from './routes/user.routes.js';
import { adminRouter } from './routes/admin.routes.js';

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

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/problems', problemRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/contests', contestRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);

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
