import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { IsolatedGccRunner } from './runner.js';

dotenv.config();

const app = express();
const runner = new IsolatedGccRunner();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = parseInt(process.env.PORT || '5050', 10);
const SECRET = process.env.JUDGE_SERVICE_SECRET || '';

// Auth middleware for internal communication
function requireJudgeSecret(req: Request, res: Response, next: NextFunction) {
  if (!SECRET) {
    return next(); // If secret is not configured, allow local dev
  }
  const authHeader = req.headers['x-judge-secret'];
  if (authHeader !== SECRET) {
    return res.status(401).json({ error: 'UNAUTHORIZED_JUDGE_ACCESS' });
  }
  next();
}

app.get('/health', async (_req: Request, res: Response) => {
  const gccStatus = await runner.checkGcc();
  res.json({
    status: gccStatus.available ? 'ok' : 'degraded',
    service: 'logicq-judge-service',
    gcc: gccStatus,
  });
});

const CompileSchema = z.object({
  code: z.string().min(1).max(200000),
  timeLimitMs: z.number().int().min(500).max(30000).optional(),
});

app.post('/compile', requireJudgeSecret, async (req: Request, res: Response) => {
  const parsed = CompileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.issues });
  }

  const result = await runner.compile(parsed.data.code, parsed.data.timeLimitMs);
  res.json(result);
});

const ExecuteSchema = z.object({
  compilationId: z.string().uuid(),
  stdin: z.string().default(''),
  timeLimitMs: z.number().int().min(100).max(30000).optional(),
  memoryLimitMb: z.number().int().min(16).max(1024).optional(),
});

app.post('/execute', requireJudgeSecret, async (req: Request, res: Response) => {
  const parsed = ExecuteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.issues });
  }

  const result = await runner.execute(
    parsed.data.compilationId,
    parsed.data.stdin,
    parsed.data.timeLimitMs,
    parsed.data.memoryLimitMb
  );
  res.json(result);
});

const CleanupSchema = z.object({
  compilationId: z.string().uuid(),
});

app.post('/cleanup', requireJudgeSecret, async (req: Request, res: Response) => {
  const parsed = CleanupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  await runner.cleanup(parsed.data.compilationId);
  res.json({ success: true });
});

const RunSchema = z.object({
  code: z.string().min(1).max(200000),
  stdin: z.string().default(''),
  timeLimitMs: z.number().int().min(100).max(30000).optional(),
  memoryLimitMb: z.number().int().min(16).max(1024).optional(),
});

app.post('/run', requireJudgeSecret, async (req: Request, res: Response) => {
  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.issues });
  }

  const result = await runner.compileAndRun(
    parsed.data.code,
    parsed.data.stdin,
    parsed.data.timeLimitMs,
    parsed.data.memoryLimitMb
  );
  res.json(result);
});

const BatchEvaluateSchema = z.object({
  code: z.string().min(1).max(200000),
  testCases: z.array(
    z.object({
      id: z.string(),
      input: z.string(),
      expectedOutput: z.string(),
      isHidden: z.boolean().optional(),
    })
  ),
  timeLimitMs: z.number().int().min(100).max(30000).optional(),
  memoryLimitMb: z.number().int().min(16).max(1024).optional(),
});

app.post('/batch-evaluate', requireJudgeSecret, async (req: Request, res: Response) => {
  const parsed = BatchEvaluateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.issues });
  }

  const result = await runner.batchEvaluate(parsed.data);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`⚡ LogicQ Judge Microservice running on port ${PORT}`);
});
