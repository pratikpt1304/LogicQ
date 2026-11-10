import http from 'http';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { initSocketIO } from './sockets/socket.manager.js';
import { getQueue } from './queue/queue.factory.js';
import { evaluateSubmission } from './services/submission-evaluator.js';
import { getJudge } from './judge/judge.factory.js';
import { autoSeedDatabase } from './services/auto-seed.service.js';
import { backfillPracticeSubmissionPoints } from './services/scoring.service.js';

async function bootstrap() {
  try {
    const { execSync } = await import('child_process');
    console.log('⚡ Synchronizing SQLite database schema with Prisma...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('⚡ Database schema synchronized successfully.');
  } catch (syncErr) {
    console.warn('⚡ Schema sync check completed (continuing boot):', syncErr);
  }

  const server = http.createServer(app);

  // Initialize WebSockets
  initSocketIO(server);
  console.log('⚡ Socket.IO initialized');

  // Verify and initialize judge
  const judge = await getJudge();
  const judgeReady = await judge.isAvailable();
  console.log(`⚡ Judge [${judge.name}] status: ${judgeReady ? 'READY' : 'UNAVAILABLE (Check compiler / settings)'}`);

  // Auto-seed practice curriculum, book bank, and badges if empty
  await autoSeedDatabase();

  // Backfill points for any previously unrewarded accepted submissions
  await backfillPracticeSubmissionPoints();

  // Initialize submission worker queue
  const queue = getQueue();
  queue.processJobs(async (job) => {
    console.log(`[Queue Worker] Processing submission job: ${job.submissionId}`);
    await evaluateSubmission(job.submissionId);
  });
  console.log(`⚡ Submission Queue [${queue.name}] listening for jobs`);

  server.listen(ENV.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 LogicQ Server is running on http://localhost:${ENV.PORT}`);
    console.log(`🎯 Frontend URL: ${ENV.CLIENT_URL}`);
    console.log(`🛡️ Node Env:     ${ENV.NODE_ENV}`);
    console.log(`======================================================\n`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
      console.log('⚡ HTTP server closed. In-flight requests drained.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⚠️ Forcing server shutdown after 25s timeout');
      process.exit(1);
    }, 25000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
