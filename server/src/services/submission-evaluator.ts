import { prisma } from '../utils/prisma.js';
import { getJudge } from '../judge/judge.factory.js';
import { Verdict } from '../judge/judge.interface.js';
import { calculatePointsAndAward } from './scoring.service.js';
import { updateUserStreak } from './streak.service.js';
import { evaluateAndAwardBadges } from './badge.service.js';
import { emitSubmissionVerdict, emitContestScoreboardUpdate } from '../sockets/socket.manager.js';
import { getContestScoreboardData } from './contest.service.js';
import { FEATURES } from '../config/features.config.js';

function normalizeOutput(str: string = ''): string {
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export async function evaluateSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: {
          testCases: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  });

  if (!submission) return;

  await prisma.submission.update({
    where: { id: submissionId },
    data: { verdict: 'JUDGING' },
  });

  const judge = await getJudge();
  const testCases = submission.problem.testCases;

  let overallVerdict = Verdict.ACCEPTED;
  let maxRuntime = 0;
  let compileOutput = '';
  const testResults: Array<{
    testCaseId: string;
    verdict: string;
    runtimeMs: number;
    stdout?: string;
    stderr?: string;
    orderIndex: number;
  }> = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const exec = await judge.compileAndRun(
      submission.code,
      tc.input,
      submission.problem.timeLimitMs,
      submission.problem.memoryLimitMb
    );

    if (exec.runtimeMs > maxRuntime) maxRuntime = exec.runtimeMs;

    if (exec.verdict === Verdict.COMPILE_ERROR) {
      overallVerdict = Verdict.COMPILE_ERROR;
      compileOutput = exec.compileOutput || exec.stderr || 'Compilation failed';
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.COMPILE_ERROR,
        runtimeMs: 0,
        stderr: compileOutput,
        orderIndex: i,
      });
      break; // Stop further test cases on compile error
    }

    if (exec.verdict === Verdict.TIME_LIMIT_EXCEEDED) {
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.TIME_LIMIT_EXCEEDED,
        runtimeMs: exec.runtimeMs,
        stderr: 'Time limit exceeded',
        orderIndex: i,
      });
      if (overallVerdict === Verdict.ACCEPTED) overallVerdict = Verdict.TIME_LIMIT_EXCEEDED;
      continue;
    }

    if (exec.verdict === Verdict.MEMORY_LIMIT_EXCEEDED) {
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
        runtimeMs: exec.runtimeMs,
        stderr: exec.stderr || 'Memory / output limit exceeded',
        orderIndex: i,
      });
      if (overallVerdict === Verdict.ACCEPTED) overallVerdict = Verdict.MEMORY_LIMIT_EXCEEDED;
      continue;
    }

    if (exec.verdict === Verdict.RUNTIME_ERROR) {
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: exec.runtimeMs,
        stderr: exec.stderr || 'Runtime error / segmentation fault',
        orderIndex: i,
      });
      if (overallVerdict === Verdict.ACCEPTED) overallVerdict = Verdict.RUNTIME_ERROR;
      continue;
    }

    // Output comparison
    const actual = normalizeOutput(exec.stdout);
    const expected = normalizeOutput(tc.expectedOutput);

    if (actual === expected) {
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.ACCEPTED,
        runtimeMs: exec.runtimeMs,
        stdout: tc.isHidden ? undefined : exec.stdout,
        orderIndex: i,
      });
    } else {
      testResults.push({
        testCaseId: tc.id,
        verdict: Verdict.WRONG_ANSWER,
        runtimeMs: exec.runtimeMs,
        stdout: tc.isHidden ? undefined : exec.stdout,
        orderIndex: i,
      });
      if (overallVerdict === Verdict.ACCEPTED) overallVerdict = Verdict.WRONG_ANSWER;
    }
  }

  // Delete previous test case results for this submission if any (e.g. rejudge)
  await prisma.submissionTestCaseResult.deleteMany({ where: { submissionId } });

  // Save per-test results
  for (const tr of testResults) {
    await prisma.submissionTestCaseResult.create({
      data: {
        submissionId,
        testCaseId: tr.testCaseId,
        verdict: tr.verdict,
        runtimeMs: tr.runtimeMs,
        stdout: tr.stdout || null,
        stderr: tr.stderr || null,
        orderIndex: tr.orderIndex,
      },
    });
  }

  let pointsAwarded = 0;
  const isPractice = submission.submissionType === 'PRACTICE' || submission.problem.isPractice;

  if (overallVerdict === Verdict.ACCEPTED && !isPractice) {
    // Scoring (pass submissionId so rejudging never double-awards points)
    const scoreResult = await calculatePointsAndAward(
      submission.userId,
      submission.problemId,
      submissionId
    );
    pointsAwarded = scoreResult.pointsAwarded;
  }

  // If this is a practice problem, update or create PracticeProgress
  if (isPractice && submission.problem.moduleSlug) {
    try {
      const existingProg = await prisma.practiceProgress.findUnique({
        where: {
          userId_problemId: {
            userId: submission.userId,
            problemId: submission.problemId,
          },
        },
      });

      const isNowSolved = overallVerdict === Verdict.ACCEPTED || Boolean(existingProg?.isSolved);
      await prisma.practiceProgress.upsert({
        where: {
          userId_problemId: {
            userId: submission.userId,
            problemId: submission.problemId,
          },
        },
        update: {
          attemptsCount: { increment: 1 },
          isSolved: isNowSolved,
          solvedAt: isNowSolved && !existingProg?.solvedAt ? new Date() : existingProg?.solvedAt,
        },
        create: {
          userId: submission.userId,
          problemId: submission.problemId,
          moduleSlug: submission.problem.moduleSlug,
          attemptsCount: 1,
          isSolved: overallVerdict === Verdict.ACCEPTED,
          solvedAt: overallVerdict === Verdict.ACCEPTED ? new Date() : null,
        },
      });
    } catch (progErr) {
      console.error('Failed to update PracticeProgress:', progErr);
    }
  }

  // Persist final verdict and points BEFORE evaluating badges or contest scores
  // so that queries for verdict === 'ACCEPTED' include this submission immediately.
  const updatedSubmission = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      verdict: overallVerdict,
      runtimeMs: maxRuntime,
      compileOutput: compileOutput || null,
      pointsAwarded,
    },
    include: {
      testCaseResults: {
        orderBy: { orderIndex: 'asc' },
      },
      problem: {
        select: { id: true, title: true, slug: true, difficulty: true },
      },
    },
  });

  if (overallVerdict === Verdict.ACCEPTED && !isPractice) {
    // Daily streak if problem is daily or a scheduled challenge (attributed to submission.createdAt)
    if (submission.problem.isDaily || submission.problem.scheduledDate) {
      await updateUserStreak(submission.userId, submission.createdAt);
    }

    // Badges evaluation (only when FEATURE_BADGES=true)
    if (FEATURES.BADGES) {
      await evaluateAndAwardBadges(submission.userId);
    }

    // If contest submission, update contest participant score
    if (submission.contestId) {
      await updateContestScore(submission.contestId, submission.userId, submission.problemId);
    }
  }

  // Realtime notification to user
  emitSubmissionVerdict(submission.userId, {
    userId: submission.userId,
    submissionId,
    verdict: overallVerdict,
    runtimeMs: maxRuntime,
    compileOutput,
    pointsAwarded,
    testCaseResults: updatedSubmission.testCaseResults,
  });

  // If in contest, broadcast updated scoreboard
  if (submission.contestId) {
    try {
      const scoreboard = await getContestScoreboardData(submission.contestId);
      emitContestScoreboardUpdate(submission.contestId, scoreboard);
    } catch (e) {
      console.error('Failed to emit contest scoreboard update:', e);
    }
  }
}

async function updateContestScore(contestId: string, userId: string, _problemId: string) {
  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });

  if (!participant) return;

  // Idempotently compute total contest score from all distinct ACCEPTED contest problems
  const acceptedContestSubs = await prisma.submission.findMany({
    where: {
      contestId,
      userId,
      verdict: 'ACCEPTED',
    },
    select: { problemId: true },
  });

  const solvedProblemIds = Array.from(new Set(acceptedContestSubs.map((s) => s.problemId)));

  const solvedContestProblems =
    solvedProblemIds.length > 0
      ? await prisma.contestProblem.findMany({
          where: {
            contestId,
            problemId: { in: solvedProblemIds },
          },
          select: { points: true },
        })
      : [];

  const exactScore = solvedContestProblems.reduce((sum, cp) => sum + cp.points, 0);

  await prisma.contestParticipant.update({
    where: { contestId_userId: { contestId, userId } },
    data: {
      score: exactScore,
    },
  });
}
