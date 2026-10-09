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
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});
