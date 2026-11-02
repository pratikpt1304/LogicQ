import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { PRACTICE_CONFIG, PracticeModuleConfig, getModuleRequirementText } from '../config/practice.config.js';
import { maskPrn } from '../config/academic.config.js';
import { practiceReportService } from '../services/practice-report.service.js';

export async function getPracticeModules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    // Fetch user's practice progress records if authenticated
    const progressList = userId
      ? await prisma.practiceProgress.findMany({
          where: { userId },
          select: {
            problemId: true,
            moduleSlug: true,
            isSolved: true,
            attemptsCount: true,
          },
        })
      : [];

    const solvedByModule: Record<string, number> = {};
    for (const prog of progressList) {
      if (prog.isSolved) {
        solvedByModule[prog.moduleSlug] = (solvedByModule[prog.moduleSlug] || 0) + 1;
      }
    }

    // Query published practice problems aggregated by moduleSlug and difficulty
    const publishedProblems = await prisma.problem.findMany({
      where: {
        isPractice: true,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        slug: true,
        moduleSlug: true,
        difficulty: true,
      },
    });

    const problemsByModule: Record<string, typeof publishedProblems> = {};
    for (const p of publishedProblems) {
      if (p.moduleSlug) {
        if (!problemsByModule[p.moduleSlug]) problemsByModule[p.moduleSlug] = [];
        problemsByModule[p.moduleSlug].push(p);
      }
    }

    const isAdmin = req.user?.role === 'ADMIN';

    // Evaluate sequential module unlocking:
    // Module 1 is always unlocked.
    // Module N+1 unlocks if module N has at least module[N].requiredSolvedToUnlock solved problems
    // and module N has at least 10 published questions (complete curriculum).
    let previousModuleSolved = 0;
    let previousModuleTotal = 20;

    const modulesWithStatus = PRACTICE_CONFIG.MODULES.map((mod: PracticeModuleConfig, idx: number) => {
      const moduleProbs = problemsByModule[mod.slug] || [];
      const totalPublished = moduleProbs.length;
      const easyCount = moduleProbs.filter((p) => p.difficulty === 'EASY').length;
      const mediumCount = moduleProbs.filter((p) => p.difficulty === 'MEDIUM').length;
      const hardCount = moduleProbs.filter((p) => p.difficulty === 'HARD').length;
      const isComingSoon = totalPublished < mod.totalQuestions;

      let isUnlocked = false;
      let requirementText = '';

      if (idx === 0) {
        isUnlocked = true;
      } else {
        const prevModule = PRACTICE_CONFIG.MODULES[idx - 1];
        const threshold = mod.requiredSolvedToUnlock || PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD;

        // Incomplete curriculum: cannot unlock as complete
        if (previousModuleTotal < prevModule.totalQuestions) {
          isUnlocked = false;
          requirementText = `${prevModule.title} is coming soon (incomplete curriculum)`;
        } else {
          isUnlocked = previousModuleSolved >= threshold;
          if (!isUnlocked) {
            requirementText = getModuleRequirementText(prevModule.title, threshold, previousModuleSolved, previousModuleTotal);
          }
        }
      }

      const solvedCount = solvedByModule[mod.slug] || 0;
      previousModuleSolved = solvedCount;
      previousModuleTotal = totalPublished;

      const progressPercent = totalPublished > 0 ? Math.min(100, Math.round((solvedCount / totalPublished) * 100)) : 0;

      return {
        id: mod.id,
        slug: mod.slug,
        title: mod.title,
        order: mod.order,
        description: mod.description,
        isUnlocked,
        isAdminUnlocked: isAdmin,
        requirementText,
        totalQuestions: totalPublished,
        solvedCount,
        progressPercent,
        isComingSoon,
        canComplete: !isComingSoon,
        distribution: {
          EASY: easyCount,
          MEDIUM: mediumCount,
          HARD: hardCount,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        modules: modulesWithStatus,
      },
    });
  } catch (err) {
    console.error('Error fetching practice modules:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve practice modules' });
  }
}

export async function getPracticeModuleProblems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { moduleSlug } = req.params;
    const userId = req.user?.userId;

    const targetModuleIndex = PRACTICE_CONFIG.MODULES.findIndex((m) => m.slug === moduleSlug);
    if (targetModuleIndex === -1) {
      res.status(404).json({ success: false, message: 'Practice module not found' });
      return;
    }

    const targetModule = PRACTICE_CONFIG.MODULES[targetModuleIndex];
    const isAdmin = req.user?.role === 'ADMIN';
    const isPreview = req.query.preview === 'true' || req.headers['x-admin-preview'] === 'true';

    // Check unlocking authorization for non-admin students
    if (!isAdmin && !isPreview && targetModuleIndex > 0) {
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const prevModule = PRACTICE_CONFIG.MODULES[targetModuleIndex - 1];
      const prevProblemsCount = await prisma.problem.count({
        where: {
          moduleSlug: prevModule.slug,
          isPractice: true,
          status: 'PUBLISHED',
        },
      });

      if (prevProblemsCount < prevModule.totalQuestions) {
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: `${prevModule.title} is coming soon and cannot be unlocked as complete.`,
          error: `${prevModule.title} is coming soon and cannot be unlocked as complete.`,
        });
        return;
      }

      const prevSolvedCount = await prisma.practiceProgress.count({
        where: {
          userId,
          moduleSlug: prevModule.slug,
          isSolved: true,
        },
      });

      const threshold = targetModule.requiredSolvedToUnlock || PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD;
      if (prevSolvedCount < threshold) {
        const errorMsg = getModuleRequirementText(prevModule.title, threshold, prevSolvedCount, prevProblemsCount);
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: errorMsg,
          error: errorMsg,
        });
        return;
      }
    }

    // Retrieve the 10 published problems for this module
    const problems = await prisma.problem.findMany({
      where: {
        moduleSlug,
        isPractice: true,
        status: 'PUBLISHED',
      },
      orderBy: { moduleOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        category: true,
        basePoints: true,
        moduleSlug: true,
        moduleOrder: true,
        isPractice: true,
      },
    });

    // Attach student progress (attemptsCount, isSolved)
    let userProgressMap: Record<string, { isSolved: boolean; attemptsCount: number }> = {};
    if (userId) {
      const progress = await prisma.practiceProgress.findMany({
        where: { userId, moduleSlug },
      });
      for (const p of progress) {
        userProgressMap[p.problemId] = {
          isSolved: p.isSolved,
          attemptsCount: p.attemptsCount,
        };
      }
    }

    const problemsWithProgress = problems.map((prob) => {
      const prog = userProgressMap[prob.id] || { isSolved: false, attemptsCount: 0 };
      return {
        ...prob,
        isSolved: prog.isSolved,
        attemptsCount: prog.attemptsCount,
        status: prog.isSolved ? 'SOLVED' : prog.attemptsCount > 0 ? 'ATTEMPTED' : 'NOT_STARTED',
      };
    });

    res.status(200).json({
      success: true,
      data: {
        module: targetModule,
        problems: problemsWithProgress,
      },
    });
  } catch (err) {
    console.error('Error fetching module problems:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve module problems' });
  }
}

export async function getPracticeProblemDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { problemSlug } = req.params;
    const userId = req.user?.userId;

    const problem = await prisma.problem.findUnique({
      where: { slug: problemSlug },
      include: {
        testCases: {
          where: { isHidden: false }, // CRITICAL: NEVER expose hidden tests to client!
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!problem || !problem.isPractice || !problem.moduleSlug) {
      res.status(404).json({ success: false, message: 'Practice problem not found' });
      return;
    }

    const targetModuleIndex = PRACTICE_CONFIG.MODULES.findIndex((m) => m.slug === problem.moduleSlug);
    if (targetModuleIndex === -1) {
      res.status(404).json({ success: false, message: 'Practice module not found' });
      return;
    }

    // Verify module is unlocked for student
    const isAdmin = req.user?.role === 'ADMIN';
    const isPreview = req.query.preview === 'true' || req.headers['x-admin-preview'] === 'true';

    if (!isAdmin && !isPreview && targetModuleIndex > 0) {
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const prevModule = PRACTICE_CONFIG.MODULES[targetModuleIndex - 1];
      const prevProblemsCount = await prisma.problem.count({
        where: {
          moduleSlug: prevModule.slug,
          isPractice: true,
          status: 'PUBLISHED',
        },
      });

      if (prevProblemsCount < prevModule.totalQuestions) {
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: `${prevModule.title} is coming soon and cannot be unlocked as complete.`,
          error: `${prevModule.title} is coming soon and cannot be unlocked as complete.`,
        });
        return;
      }

      const prevSolvedCount = await prisma.practiceProgress.count({
        where: {
          userId,
          moduleSlug: prevModule.slug,
          isSolved: true,
        },
      });

      const threshold = PRACTICE_CONFIG.MODULES[targetModuleIndex].requiredSolvedToUnlock || PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD;
      if (prevSolvedCount < threshold) {
        const errorMsg = getModuleRequirementText(prevModule.title, threshold, prevSolvedCount, prevProblemsCount);
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: errorMsg,
          error: errorMsg,
        });
        return;
      }
    }

    // Fetch or initialize student's progress on this problem
    let userProgress = null;
    if (userId) {
      userProgress = await prisma.practiceProgress.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId: problem.id,
          },
        },
      });

      const now = new Date();
      if (!userProgress) {
        userProgress = await prisma.practiceProgress.create({
          data: {
            userId,
            problemId: problem.id,
            moduleSlug: problem.moduleSlug || 'control-structures',
            firstOpenedAt: now,
            lastSyncedAt: now,
            activeSeconds: 0,
            attemptsCount: 0,
            runsCount: 0,
            isSolved: false,
          },
        });
      } else if (!userProgress.firstOpenedAt) {
        userProgress = await prisma.practiceProgress.update({
          where: { id: userProgress.id },
          data: { firstOpenedAt: now, lastSyncedAt: userProgress.lastSyncedAt || now },
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        problem: {
          id: problem.id,
          slug: problem.slug,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: JSON.parse(problem.tags || '[]'),
          starterCode: problem.starterCode,
          timeLimitMs: problem.timeLimitMs,
          memoryLimitMb: problem.memoryLimitMb,
          basePoints: problem.basePoints,
          isPractice: true,
          moduleSlug: problem.moduleSlug,
          moduleOrder: problem.moduleOrder,
          sampleTests: problem.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          })),
        },
        userProgress: {
          isSolved: userProgress?.isSolved || false,
          attemptsCount: userProgress?.attemptsCount || 0,
          runsCount: userProgress?.runsCount || 0,
          activeSeconds: userProgress?.activeSeconds || 0,
          timeToSolveSeconds: userProgress?.timeToSolveSeconds || null,
          timeToFirstAttemptSeconds: userProgress?.timeToFirstAttemptSeconds || null,
          firstAttemptAccepted: userProgress?.firstAttemptAccepted || false,
          firstOpenedAt: userProgress?.firstOpenedAt || null,
          solvedAt: userProgress?.solvedAt || null,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching practice problem details:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve practice problem' });
  }
}

/**
 * Synchronizes client active seconds delta to the server with anti-tamper wall-clock verification.
 */
export async function syncPracticeTimer(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { problemId, deltaSeconds, deviceLabel } = req.body;

    if (typeof deltaSeconds !== 'number' || isNaN(deltaSeconds) || deltaSeconds < 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid deltaSeconds: must be a non-negative number',
      });
      return;
    }

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
        isPractice: true,
        status: 'PUBLISHED',
      },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Practice problem not found' });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    let progress = await prisma.practiceProgress.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: problem.id,
        },
      },
    });

    if (!progress) {
      // First open and sync simultaneously
      const initialDelta = Math.max(0, Math.min(Math.floor(deltaSeconds), 150));
      progress = await prisma.practiceProgress.create({
        data: {
          userId,
          problemId: problem.id,
          moduleSlug: problem.moduleSlug || 'control-structures',
          firstOpenedAt: now,
          lastSyncedAt: now,
          activeSeconds: initialDelta,
          attemptsCount: 0,
          runsCount: 0,
          lastDeviceLabel: typeof deviceLabel === 'string' ? deviceLabel.slice(0, 100) : null,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          activeSeconds: progress.activeSeconds,
          isSolved: progress.isSolved,
          timeToSolveSeconds: progress.timeToSolveSeconds,
          lastSyncedAt: progress.lastSyncedAt,
        },
      });
      return;
    }

    // If problem is already solved, the timer is permanently FROZEN! Retries are untimed.
    if (progress.isSolved) {
      res.status(200).json({
        success: true,
        data: {
          activeSeconds: progress.activeSeconds,
          isSolved: true,
          timeToSolveSeconds: progress.timeToSolveSeconds,
          lastSyncedAt: progress.lastSyncedAt,
        },
      });
      return;
    }

    // Anti-tamper wall clock validation:
    // Delta cannot exceed the wall clock elapsed time since last sync (+ 5s network grace)
    // and is capped at 150 seconds maximum.
    const lastSync = progress.lastSyncedAt || progress.firstOpenedAt || now;
    const wallClockElapsedSeconds = Math.max(0, Math.floor((now.getTime() - lastSync.getTime()) / 1000));
    const maxAllowedDelta = Math.min(150, wallClockElapsedSeconds + 5);
    const validatedDelta = Math.max(0, Math.min(Math.floor(deltaSeconds), maxAllowedDelta));

    const updated = await prisma.practiceProgress.update({
      where: { id: progress.id },
      data: {
        activeSeconds: { increment: validatedDelta },
        lastSyncedAt: now,
        lastDeviceLabel: typeof deviceLabel === 'string' ? deviceLabel.slice(0, 100) : progress.lastDeviceLabel,
        firstOpenedAt: progress.firstOpenedAt || now,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        activeSeconds: updated.activeSeconds,
        isSolved: updated.isSolved,
        timeToSolveSeconds: updated.timeToSolveSeconds,
        lastSyncedAt: updated.lastSyncedAt,
        lastDeviceLabel: updated.lastDeviceLabel,
      },
    });
  } catch (err) {
    console.error('Error in syncPracticeTimer:', err);
    res.status(500).json({ success: false, message: 'Failed to synchronize practice timer' });
  }
}

/**
 * Tracks a Run Code invocation on a practice problem.
 */
export async function trackPracticeRun(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { problemId } = req.body;
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
        isPractice: true,
      },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Practice problem not found' });
      return;
    }

    const now = new Date();
    const updated = await prisma.practiceProgress.upsert({
      where: {
        userId_problemId: {
          userId: req.user.userId,
          problemId: problem.id,
        },
      },
      update: {
        runsCount: { increment: 1 },
      },
      create: {
        userId: req.user.userId,
        problemId: problem.id,
        moduleSlug: problem.moduleSlug || 'control-structures',
        runsCount: 1,
        attemptsCount: 0,
        activeSeconds: 0,
        firstOpenedAt: now,
        lastSyncedAt: now,
      },
    });

    res.status(200).json({
      success: true,
      data: { runsCount: updated.runsCount },
    });
  } catch (err) {
    console.error('Error tracking practice run:', err);
    res.status(500).json({ success: false, message: 'Failed to track practice run' });
  }
}

/**
 * Formats seconds into mm:ss or hh:mm:ss, capping extreme displays at "3h+".
 */
export function formatTimeDisplay(seconds: number | null | undefined, capAt3h: boolean = true): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '—';
  if (capAt3h && seconds >= 10800) {
    return '3h+';
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function generateDiagnosticFeedback(questions: any[], moduleSlug?: string): string {
  const solved = questions.filter((q) => q.status === 'SOLVED');
  if (solved.length === 0) {
    return 'Solve problems in this module to build your personal practice analytics and diagnostic recommendations.';
  }

  const firstAttemptSolves = solved.filter((q) => q.firstAttemptAccepted).length;
  const firstAttemptRate = Math.round((firstAttemptSolves / solved.length) * 100);
  const highAttemptProblems = solved.filter((q) => (q.attempts || 0) >= 4);

  let feedback = '';

  if (firstAttemptRate >= 70) {
    feedback += 'Outstanding first-attempt accuracy! Your algorithmic reasoning and upfront planning before code execution are exceptional. ';
  } else if (firstAttemptRate >= 40) {
    feedback += 'Solid, consistent progress across problem sets. You demonstrate steady persistence in resolving compiler and test edge cases. ';
  } else {
    feedback += 'Commendable determination. You iteratively refine your solutions until passing all tests. Consider dry-running sample inputs with pen and paper before clicking submit. ';
  }

  if (highAttemptProblems.length > 0) {
    const titles = highAttemptProblems.slice(0, 2).map((p) => `"${p.title}"`).join(' and ');
    feedback += `Review your logic on ${titles} to identify recurring loop bounds or corner-case patterns. `;
  } else {
    feedback += 'Low debugging overhead across the problem sets indicates clean, maintainable code construction. ';
  }

  if (moduleSlug === 'pointers-and-functions' || moduleSlug === 'pointers-functions') {
    feedback += 'For pointers, continue prioritizing memory boundary safety, null-pointer defensive checks, and pointer arithmetic step sizes.';
  } else if (moduleSlug === 'control-structures') {
    feedback += 'Core control flow logic is well established. Ready for advanced modular function decomposition.';
  } else if (moduleSlug === 'array-and-its-applications' || moduleSlug === 'arrays-applications') {
    feedback += 'Continue paying close attention to 0-indexed bounds, buffer overflows, and multi-dimensional coordinate mapping.';
  } else if (moduleSlug === 'advanced-data-types-dynamic-memory') {
    feedback += 'Always ensure every heap allocation via malloc/calloc has a corresponding free() to prevent memory leakage.';
  }

  return feedback.trim();
}

/**
 * Returns the student's Practice Module Report (available once all 10 questions in the module are solved).
 */
export async function getPracticeModuleReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { moduleSlug } = req.params;
    const targetModule = PRACTICE_CONFIG.MODULES.find((m) => m.slug === moduleSlug);
    if (!targetModule) {
      res.status(404).json({ success: false, message: 'Practice module not found' });
      return;
    }

    const moduleProblems = await prisma.problem.findMany({
      where: {
        isPractice: true,
        moduleSlug,
        status: 'PUBLISHED',
      },
      orderBy: [{ moduleOrder: 'asc' }, { difficulty: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        moduleOrder: true,
      },
    });

    const totalProblems = moduleProblems.length;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        department: true,
        year: true,
        division: true,
        shortId: true,
      },
    });

    const progressRecords = await prisma.practiceProgress.findMany({
      where: {
        userId,
        moduleSlug,
      },
    });

    const progressMap = new Map<string, (typeof progressRecords)[0]>();
    for (const prog of progressRecords) {
      progressMap.set(prog.problemId, prog);
    }

    const solvedCount = progressRecords.filter((p) => p.isSolved).length;
    const isCompleted = totalProblems > 0 && solvedCount >= totalProblems;

    const isPartialRequested = req.query.partial === 'true' || req.query.allowPartial === 'true';
    const isRegenerate = req.query.regenerate === 'true';

    // Rate-limiting check if student is regenerating
    if (isRegenerate) {
      const rateLimit = practiceReportService.checkRateLimit(userId, 30);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: `Please wait ${rateLimit.retryAfterSeconds} seconds before regenerating your practice report.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
        return;
      }
    }

    if (!isCompleted && !isPartialRequested) {
      res.status(403).json({
        success: false,
        code: 'MODULE_INCOMPLETE',
        message: `Module report unlocks when all ${totalProblems} questions in ${targetModule.title} are solved. (${solvedCount}/${totalProblems} solved)`,
        data: {
          moduleSlug,
          moduleTitle: targetModule.title,
          solvedCount,
          totalQuestions: totalProblems,
          progressPercent: totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0,
          canDownloadPartial: true,
        },
      });
      return;
    }

    // Build question list
    const questions = moduleProblems.map((prob, idx) => {
      const prog = progressMap.get(prob.id);
      const isSolved = Boolean(prog?.isSolved);
      const solveSec = prog?.timeToSolveSeconds != null ? prog.timeToSolveSeconds : (isSolved ? prog?.activeSeconds : null);

      return {
        problemId: prob.id,
        slug: prob.slug,
        orderIndex: idx + 1,
        title: prob.title,
        difficulty: prob.difficulty,
        status: isSolved ? 'SOLVED' : (prog ? 'ATTEMPTED' : 'UNOPENED'),
        attempts: prog?.attemptsCount || 0,
        runs: prog?.runsCount || 0,
        firstAttemptAccepted: Boolean(prog?.firstAttemptAccepted),
        timeToSolveSeconds: solveSec,
        timeToSolveFormatted: formatTimeDisplay(solveSec),
        timeToFirstAttemptSeconds: prog?.timeToFirstAttemptSeconds ?? null,
        timeToFirstAttemptFormatted: formatTimeDisplay(prog?.timeToFirstAttemptSeconds),
        hintsUsed: prog?.hintsUsed || 0,
      };
    });

    // Compute totals and difficulty breakdown
    const totalAttempts = questions.reduce((acc, q) => acc + q.attempts, 0);
    const totalRuns = questions.reduce((acc, q) => acc + q.runs, 0);
    const totalActiveSeconds = questions.reduce((acc, q) => acc + (q.timeToSolveSeconds || 0), 0);
    const firstAttemptSolves = questions.filter((q) => q.firstAttemptAccepted).length;

    const diffStats: Record<string, { count: number; totalSeconds: number; avgSeconds: number; avgAttempts: number }> = {
      EASY: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
      MEDIUM: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
      HARD: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
    };

    for (const diff of ['EASY', 'MEDIUM', 'HARD']) {
      const diffQuestions = questions.filter((q) => q.difficulty === diff);
      const count = diffQuestions.length;
      const totalSec = diffQuestions.reduce((acc, q) => acc + (q.timeToSolveSeconds || 0), 0);
      const totalAtt = diffQuestions.reduce((acc, q) => acc + q.attempts, 0);
      diffStats[diff] = {
        count,
        totalSeconds: totalSec,
        avgSeconds: count > 0 ? Math.round(totalSec / count) : 0,
        avgAttempts: count > 0 ? Number((totalAtt / count).toFixed(1)) : 0,
      };
    }

    // Hardest questions (Top 5 by attempts and time)
    const hardestByAttempts = [...questions]
      .filter((q) => q.attempts > 0)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);

    const hardestByTime = [...questions]
      .filter((q) => (q.timeToSolveSeconds || 0) > 0)
      .sort((a, b) => (b.timeToSolveSeconds || 0) - (a.timeToSolveSeconds || 0))
      .slice(0, 5);

    const diagnosticSummary = generateDiagnosticFeedback(questions, moduleSlug);

    // Student identity: NO PRN, NO M/F letter!
    const studentInfo = {
      displayName: user?.displayName || `Student ${user?.shortId || ''}`.trim(),
      department: user?.department || 'Engineering',
      year: user?.year || 'FY',
      division: user?.division || null,
    };

    // Register verified report record in registry with cryptographically unguessable ID
    const reportId = practiceReportService.generateReportId();
    const generatedAt = new Date().toISOString();
    const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
    const statusLabel = isCompleted ? 'VERIFIED COMPLETION' : 'IN PROGRESS (UNVERIFIED COMPLETION)';
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost:5173';
    const verificationUrl = `${protocol}://${host}/verify/report/${reportId}`;

    practiceReportService.registerReport({
      reportId,
      scope: 'SINGLE_MODULE',
      moduleSlug,
      moduleTitle: targetModule.title,
      status,
      isComplete: isCompleted,
      statusLabel,
      questionsSolved: solvedCount,
      totalQuestions: totalProblems,
      completionPercentage: totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0,
      generatedAt,
      verificationNotice: 'This public verification record confirms report authenticity. It contains zero student personally identifiable information (PII).',
      _internalUserId: userId,
    });

    res.status(200).json({
      success: true,
      data: {
        report: {
          reportId,
          verificationUrl,
          type: 'MODULE_REPORT',
          moduleSlug,
          moduleTitle: targetModule.title,
          student: studentInfo,
          isCompleted,
          status,
          statusLabel,
          totalSolved: solvedCount,
          totalQuestions: totalProblems,
          totals: {
            solvedCount,
            totalQuestions: totalProblems,
            totalAttempts,
            totalRuns,
            totalActiveSeconds,
            totalActiveFormatted: formatTimeDisplay(totalActiveSeconds, false),
            averageActiveSeconds: totalProblems > 0 ? Math.round(totalActiveSeconds / totalProblems) : 0,
            averageActiveFormatted: formatTimeDisplay(totalProblems > 0 ? Math.round(totalActiveSeconds / totalProblems) : 0),
            firstAttemptSolves,
            firstAttemptRate: totalProblems > 0 ? Math.round((firstAttemptSolves / totalProblems) * 100) : 0,
          },
          difficultyBreakdown: diffStats,
          hardestQuestions: {
            byAttempts: hardestByAttempts,
            byTime: hardestByTime,
          },
          diagnosticSummary,
          questions,
          footerNote: 'All reported times reflect active solve time accumulated exclusively while the question tab was open and focused, validated against anti-tamper server telemetry.',
          generatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Error in getPracticeModuleReport:', err);
    res.status(500).json({ success: false, message: 'Failed to generate module report' });
  }
}

/**
 * Returns the student's Final Curriculum Report (available once all 4 modules / 40 questions are solved).
 */
export async function getPracticeFinalReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userId = req.user.userId;

    const allProblems = await prisma.problem.findMany({
      where: {
        isPractice: true,
        status: 'PUBLISHED',
      },
      orderBy: [{ moduleSlug: 'asc' }, { moduleOrder: 'asc' }, { difficulty: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        moduleSlug: true,
        moduleOrder: true,
      },
    });

    const totalCurriculumQuestions = allProblems.length;
    const progressRecords = await prisma.practiceProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, (typeof progressRecords)[0]>();
    for (const prog of progressRecords) {
      progressMap.set(prog.problemId, prog);
    }

    const solvedCount = progressRecords.filter((p) => p.isSolved).length;
    const isCompleted = totalCurriculumQuestions >= 40 && solvedCount >= totalCurriculumQuestions;

    const isPartialRequested = req.query.partial === 'true' || req.query.allowPartial === 'true';
    const isRegenerate = req.query.regenerate === 'true';

    // Rate-limiting check if student is regenerating
    if (isRegenerate) {
      const rateLimit = practiceReportService.checkRateLimit(userId, 30);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: `Please wait ${rateLimit.retryAfterSeconds} seconds before regenerating your practice report.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
        return;
      }
    }

    if (!isCompleted && !isPartialRequested) {
      res.status(403).json({
        success: false,
        code: 'CURRICULUM_INCOMPLETE',
        message: `Final practice report unlocks when all 4 modules (40 questions) are completed. (${solvedCount}/${totalCurriculumQuestions} solved)`,
        data: {
          solvedCount,
          totalQuestions: totalCurriculumQuestions,
          progressPercent: totalCurriculumQuestions > 0 ? Math.round((solvedCount / totalCurriculumQuestions) * 100) : 0,
          canDownloadPartial: true,
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        department: true,
        year: true,
        division: true,
        shortId: true,
      },
    });

    const allQuestions = allProblems.map((prob, idx) => {
      const prog = progressMap.get(prob.id);
      const isSolved = Boolean(prog?.isSolved);
      const solveSec = prog?.timeToSolveSeconds != null ? prog.timeToSolveSeconds : (isSolved ? prog?.activeSeconds : null);

      return {
        problemId: prob.id,
        slug: prob.slug,
        orderIndex: idx + 1,
        title: prob.title,
        moduleSlug: prob.moduleSlug,
        difficulty: prob.difficulty,
        status: isSolved ? 'SOLVED' : (prog ? 'ATTEMPTED' : 'UNOPENED'),
        attempts: prog?.attemptsCount || 0,
        runs: prog?.runsCount || 0,
        firstAttemptAccepted: Boolean(prog?.firstAttemptAccepted),
        timeToSolveSeconds: solveSec,
        timeToSolveFormatted: formatTimeDisplay(solveSec),
        timeToFirstAttemptSeconds: prog?.timeToFirstAttemptSeconds ?? null,
        hintsUsed: prog?.hintsUsed || 0,
      };
    });

    const totalAttempts = allQuestions.reduce((acc, q) => acc + q.attempts, 0);
    const totalRuns = allQuestions.reduce((acc, q) => acc + q.runs, 0);
    const totalActiveSeconds = allQuestions.reduce((acc, q) => acc + (q.timeToSolveSeconds || 0), 0);
    const firstAttemptSolves = allQuestions.filter((q) => q.firstAttemptAccepted).length;

    // Per-module breakdown
    const moduleSummaries = PRACTICE_CONFIG.MODULES.map((mod) => {
      const modQuestions = allQuestions.filter((q) => q.moduleSlug === mod.slug);
      const modSolved = modQuestions.filter((q) => q.status === 'SOLVED').length;
      const modAttempts = modQuestions.reduce((acc, q) => acc + q.attempts, 0);
      const modSeconds = modQuestions.reduce((acc, q) => acc + (q.timeToSolveSeconds || 0), 0);

      return {
        moduleSlug: mod.slug,
        title: mod.title,
        order: mod.order,
        solvedCount: modSolved,
        totalQuestions: modQuestions.length,
        totalAttempts: modAttempts,
        totalActiveSeconds: modSeconds,
        totalActiveFormatted: formatTimeDisplay(modSeconds, false),
      };
    });

    // Difficulty breakdown
    const diffStats: Record<string, { count: number; totalSeconds: number; avgSeconds: number; avgAttempts: number }> = {
      EASY: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
      MEDIUM: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
      HARD: { count: 0, totalSeconds: 0, avgSeconds: 0, avgAttempts: 0 },
    };

    for (const diff of ['EASY', 'MEDIUM', 'HARD']) {
      const diffQuestions = allQuestions.filter((q) => q.difficulty === diff);
      const count = diffQuestions.length;
      const totalSec = diffQuestions.reduce((acc, q) => acc + (q.timeToSolveSeconds || 0), 0);
      const totalAtt = diffQuestions.reduce((acc, q) => acc + q.attempts, 0);
      diffStats[diff] = {
        count,
        totalSeconds: totalSec,
        avgSeconds: count > 0 ? Math.round(totalSec / count) : 0,
        avgAttempts: count > 0 ? Number((totalAtt / count).toFixed(1)) : 0,
      };
    }

    const hardestByAttempts = [...allQuestions]
      .filter((q) => q.attempts > 0)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);

    const hardestByTime = [...allQuestions]
      .filter((q) => (q.timeToSolveSeconds || 0) > 0)
      .sort((a, b) => (b.timeToSolveSeconds || 0) - (a.timeToSolveSeconds || 0))
      .slice(0, 5);

    const diagnosticSummary = generateDiagnosticFeedback(allQuestions);

    const studentInfo = {
      displayName: user?.displayName || `Student ${user?.shortId || ''}`.trim(),
      department: user?.department || 'Engineering',
      year: user?.year || 'FY',
      division: user?.division || null,
    };

    // Register verified report record in registry with cryptographically unguessable ID
    const reportId = practiceReportService.generateReportId();
    const generatedAt = new Date().toISOString();
    const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
    const statusLabel = isCompleted ? 'VERIFIED COMPLETION' : 'IN PROGRESS (UNVERIFIED COMPLETION)';
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost:5173';
    const verificationUrl = `${protocol}://${host}/verify/report/${reportId}`;

    practiceReportService.registerReport({
      reportId,
      scope: 'ALL_MODULES',
      moduleSlug: null,
      moduleTitle: 'All 4 Practice Modules (Curriculum)',
      status,
      isComplete: isCompleted,
      statusLabel,
      questionsSolved: solvedCount,
      totalQuestions: totalCurriculumQuestions,
      completionPercentage: totalCurriculumQuestions > 0 ? Math.round((solvedCount / totalCurriculumQuestions) * 100) : 0,
      generatedAt,
      verificationNotice: 'This public verification record confirms report authenticity. It contains zero student personally identifiable information (PII).',
      _internalUserId: userId,
    });

    res.status(200).json({
      success: true,
      data: {
        report: {
          reportId,
          verificationUrl,
          type: 'FINAL_CURRICULUM_REPORT',
          title: 'LogicQ Practice Curriculum Final Report',
          student: studentInfo,
          isCompleted,
          status,
          statusLabel,
          totals: {
            solvedCount,
            totalQuestions: totalCurriculumQuestions,
            totalAttempts,
            totalRuns,
            totalActiveSeconds,
            totalActiveFormatted: formatTimeDisplay(totalActiveSeconds, false),
            averageActiveSeconds: totalCurriculumQuestions > 0 ? Math.round(totalActiveSeconds / totalCurriculumQuestions) : 0,
            averageActiveFormatted: formatTimeDisplay(totalCurriculumQuestions > 0 ? Math.round(totalActiveSeconds / totalCurriculumQuestions) : 0),
            firstAttemptSolves,
            firstAttemptRate: totalCurriculumQuestions > 0 ? Math.round((firstAttemptSolves / totalCurriculumQuestions) * 100) : 0,
          },
          moduleSummaries,
          difficultyBreakdown: diffStats,
          hardestQuestions: {
            byAttempts: hardestByAttempts,
            byTime: hardestByTime,
          },
          diagnosticSummary,
          allQuestions,
          footerNote: 'All reported times reflect active solve time accumulated exclusively while the question tab was open and focused, validated against anti-tamper server telemetry.',
          generatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Error in getPracticeFinalReport:', err);
    res.status(500).json({ success: false, message: 'Failed to generate final report' });
  }
}

/**
 * Returns curriculum-wide aggregate analytics per problem for administrators.
 */
export async function getAdminPracticeReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Administrator authorization required' });
      return;
    }

    const practiceProblems = await prisma.problem.findMany({
      where: {
        isPractice: true,
        status: 'PUBLISHED',
      },
      orderBy: [{ moduleSlug: 'asc' }, { moduleOrder: 'asc' }, { difficulty: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        moduleSlug: true,
        moduleOrder: true,
      },
    });

    const allProgress = await prisma.practiceProgress.findMany({
      include: {
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    // Filter to student progress only
    const studentProgress = allProgress.filter((p) => p.user.role === 'STUDENT');

    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT', profileComplete: true },
    });

    const problemsAnalytics = practiceProblems.map((prob) => {
      const records = studentProgress.filter((p) => p.problemId === prob.id);
      const totalAttempted = records.filter((p) => p.attemptsCount > 0 || p.activeSeconds > 0).length;
      const totalSolved = records.filter((p) => p.isSolved).length;
      const solveRate = totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 0;

      const attemptsList = records.map((p) => p.attemptsCount).filter((a) => a > 0);
      const timesList = records.filter((p) => p.isSolved).map((p) => p.timeToSolveSeconds || p.activeSeconds).filter((t) => t > 0);

      const avgAttempts = attemptsList.length > 0
        ? Number((attemptsList.reduce((a, b) => a + b, 0) / attemptsList.length).toFixed(1))
        : 0;
      const medianAttempts = calculateMedian(attemptsList);

      const avgSeconds = timesList.length > 0
        ? Math.round(timesList.reduce((a, b) => a + b, 0) / timesList.length)
        : 0;
      const medianSeconds = calculateMedian(timesList);

      const isBottleneck = (avgAttempts >= 3.5 && totalAttempted >= 5) || (solveRate < 40 && totalAttempted >= 5);

      return {
        problemId: prob.id,
        slug: prob.slug,
        title: prob.title,
        moduleSlug: prob.moduleSlug,
        moduleOrder: prob.moduleOrder,
        difficulty: prob.difficulty,
        totalAttempted,
        totalSolved,
        solvesCount: totalSolved,
        solveRate,
        averageAttempts: avgAttempts,
        avgAttempts,
        medianAttempts,
        averageActiveSeconds: avgSeconds,
        avgActiveSeconds: avgSeconds,
        averageActiveFormatted: formatTimeDisplay(avgSeconds),
        medianActiveSeconds: medianSeconds,
        medianActiveFormatted: formatTimeDisplay(medianSeconds),
        firstAttemptPassCount: records.filter((p) => p.firstAttemptAccepted).length,
        isBottleneck,
      };
    });

    const totalSolvedSum = problemsAnalytics.reduce((acc, p) => acc + p.totalSolved, 0);
    const avgTimeSum = Math.round(
      problemsAnalytics.reduce((acc, p) => acc + p.averageActiveSeconds, 0) /
        Math.max(1, problemsAnalytics.length)
    );
    const avgAttemptsSum = Number(
      (
        problemsAnalytics.reduce((acc, p) => acc + p.averageAttempts, 0) /
        Math.max(1, problemsAnalytics.length)
      ).toFixed(1)
    );

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudents,
          totalProblems: practiceProblems.length,
          totalSolved: totalSolvedSum,
          avgTimeToSolveSeconds: avgTimeSum,
          avgAttemptsPerSolve: avgAttemptsSum,
        },
        totalStudents,
        totalProblems: practiceProblems.length,
        problems: problemsAnalytics,
        questions: problemsAnalytics,
      },
    });
  } catch (err) {
    console.error('Error in getAdminPracticeReports:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve admin practice reports' });
  }
}

/**
 * Exports practice progress across students grouped by department, year, and division as CSV.
 * PRN is masked by default unless explicit audited reveal is confirmed.
 */
export async function exportAdminPracticeCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Administrator authorization required' });
      return;
    }

    const { revealPrn, adminPassword } = req.query as { revealPrn?: string; adminPassword?: string };
    let unmaskAuthorized = false;

    if (revealPrn === 'true') {
      const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!adminUser || !adminPassword) {
        res.status(401).json({ success: false, message: 'Admin password required for unmasked PRN export' });
        return;
      }
      const isMatch = await bcrypt.compare(adminPassword, adminUser.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        return;
      }
      unmaskAuthorized = true;
    }

    // Log audited action
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.userId,
        action: 'PRACTICE_REPORT_CSV_EXPORT',
        reason: unmaskAuthorized ? 'Audited CSV export with unmasked PRNs' : 'Standard institutional CSV export (masked PRNs)',
      },
    });

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', profileComplete: true },
      orderBy: [{ department: 'asc' }, { year: 'asc' }, { division: 'asc' }, { fullName: 'asc' }],
      include: {
        practiceProgress: true,
      },
    });

    const headers = [
      'Department',
      'Year',
      'Division',
      'Student Name',
      'PRN',
      'Total Solved',
      'Total Attempts',
      'Total Active Seconds',
      'Module 1 Solved',
      'Module 2 Solved',
      'Module 3 Solved',
      'Module 4 Solved',
    ];

    const rows = students.map((s) => {
      const progressList = s.practiceProgress || [];
      const solvedCount = progressList.filter((p) => p.isSolved).length;
      const totalAttempts = progressList.reduce((acc, p) => acc + (p.attemptsCount || 0), 0);
      const totalSeconds = progressList.reduce((acc, p) => acc + (p.timeToSolveSeconds || p.activeSeconds || 0), 0);

      const m1 = progressList.filter((p) => p.moduleSlug === 'control-structures' && p.isSolved).length;
      const m2 = progressList.filter((p) => (p.moduleSlug === 'pointers-and-functions' || p.moduleSlug === 'pointers-functions') && p.isSolved).length;
      const m3 = progressList.filter((p) => (p.moduleSlug === 'array-and-its-applications' || p.moduleSlug === 'arrays-applications') && p.isSolved).length;
      const m4 = progressList.filter((p) => p.moduleSlug === 'advanced-data-types-dynamic-memory' && p.isSolved).length;

      const renderedPrn = unmaskAuthorized ? (s.prn || '—') : maskPrn(s.prn);

      return [
        `"${(s.department || 'AIML').replace(/"/g, '""')}"`,
        `"${(s.year || 'FY').replace(/"/g, '""')}"`,
        `"${(s.division || '—').replace(/"/g, '""')}"`,
        `"${(s.displayName || s.fullName || 'Student').replace(/"/g, '""')}"`,
        `"${renderedPrn}"`,
        solvedCount,
        totalAttempts,
        totalSeconds,
        m1,
        m2,
        m3,
        m4,
      ].join(',');
    });

    // Fetch all practice problems to calculate per-question averages and medians
    const practiceProblems = await prisma.problem.findMany({
      where: { isPractice: true, status: 'PUBLISHED' },
      orderBy: [{ moduleSlug: 'asc' }, { moduleOrder: 'asc' }],
      select: { id: true, slug: true, title: true, moduleSlug: true },
    });

    const questionStatsHeaders = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const questionSectionTitle = [
      '--- PER-QUESTION AVERAGES & MEDIANS ---',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const questionMetricHeaders = [
      'Module',
      'Problem Title',
      'Total Solvers',
      'Average Attempts',
      'Median Attempts',
      'Average Active Time (Seconds)',
      'Average Active Time (Formatted)',
      'Median Active Time (Seconds)',
      'Median Active Time (Formatted)',
      '',
      '',
    ];

    const allStudentProgress = await prisma.practiceProgress.findMany({
      where: { user: { role: 'STUDENT' } },
    });

    const questionRows = practiceProblems.map((prob) => {
      const records = allStudentProgress.filter((p) => p.problemId === prob.id);
      const solvedRecords = records.filter((p) => p.isSolved);
      const solverCount = solvedRecords.length;

      const attemptsList = records.map((p) => p.attemptsCount).filter((a) => a > 0);
      const timesList = solvedRecords.map((p) => p.timeToSolveSeconds || p.activeSeconds).filter((t) => t > 0);

      const avgAttempts = attemptsList.length > 0
        ? Number((attemptsList.reduce((a, b) => a + b, 0) / attemptsList.length).toFixed(1))
        : 0;
      const medianAttempts = calculateMedian(attemptsList);

      const avgSeconds = timesList.length > 0
        ? Math.round(timesList.reduce((a, b) => a + b, 0) / timesList.length)
        : 0;
      const medianSeconds = calculateMedian(timesList);

      return [
        `"${(prob.moduleSlug || 'control-structures').replace(/"/g, '""')}"`,
        `"${prob.title.replace(/"/g, '""')}"`,
        solverCount,
        avgAttempts,
        medianAttempts,
        avgSeconds,
        `"${formatTimeDisplay(avgSeconds)}"`,
        medianSeconds,
        `"${formatTimeDisplay(medianSeconds)}"`,
        '',
        '',
      ].join(',');
    });

    const csvContent = [
      headers.join(','),
      ...rows,
      questionStatsHeaders.join(','),
      questionSectionTitle.join(','),
      questionMetricHeaders.join(','),
      ...questionRows,
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="logicq-practice-cohort-progress.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error in exportAdminPracticeCsv:', err);
    res.status(500).json({ success: false, message: 'Failed to export practice CSV' });
  }
}

/**
 * Allows an administrator to correct a student's practice record through an audited action with a reason.
 */
export async function correctStudentPracticeProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Administrator authorization required' });
      return;
    }

    const { studentId, problemId, activeSeconds, attemptsCount, isSolved, reason, adminPassword } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      res.status(400).json({
        success: false,
        message: 'A substantive reason (at least 10 characters) is required for audit logs',
      });
      return;
    }

    const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!adminUser || !adminPassword) {
      res.status(401).json({ success: false, message: 'Admin password required for record correction' });
      return;
    }

    const isMatch = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    const problem = await prisma.problem.findFirst({
      where: { OR: [{ id: problemId }, { slug: problemId }] },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: 'Practice problem not found' });
      return;
    }

    const currentProg = await prisma.practiceProgress.findUnique({
      where: {
        userId_problemId: {
          userId: studentId,
          problemId: problem.id,
        },
      },
    });

    const updateData: Record<string, any> = {};
    if (activeSeconds !== undefined && typeof activeSeconds === 'number' && activeSeconds >= 0) {
      updateData.activeSeconds = Math.floor(activeSeconds);
    }
    if (attemptsCount !== undefined && typeof attemptsCount === 'number' && attemptsCount >= 0) {
      updateData.attemptsCount = Math.floor(attemptsCount);
    }
    if (isSolved !== undefined && typeof isSolved === 'boolean') {
      updateData.isSolved = isSolved;
      if (isSolved && !currentProg?.solvedAt) {
        updateData.solvedAt = new Date();
        updateData.timeToSolveSeconds = updateData.activeSeconds ?? currentProg?.activeSeconds ?? 0;
      }
    }

    const updated = await prisma.practiceProgress.upsert({
      where: {
        userId_problemId: {
          userId: studentId,
          problemId: problem.id,
        },
      },
      update: updateData,
      create: {
        userId: studentId,
        problemId: problem.id,
        moduleSlug: problem.moduleSlug || 'control-structures',
        activeSeconds: updateData.activeSeconds || 0,
        attemptsCount: updateData.attemptsCount || 0,
        runsCount: 0,
        isSolved: Boolean(updateData.isSolved),
        solvedAt: updateData.isSolved ? new Date() : null,
        timeToSolveSeconds: updateData.isSolved ? (updateData.activeSeconds || 0) : null,
        firstOpenedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.userId,
        targetUserId: studentId,
        targetId: problem.id,
        action: 'PRACTICE_RECORD_CORRECTED',
        oldValue: JSON.stringify(currentProg || {}),
        newValue: JSON.stringify(updated),
        reason: reason.trim(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Practice record corrected and logged to audit trail',
      data: updated,
    });
  } catch (err) {
    console.error('Error in correctStudentPracticeProgress:', err);
    res.status(500).json({ success: false, message: 'Failed to correct practice record' });
  }
}

/**
 * Public Zero-PII Practice Report Verification Endpoint.
 * Strictly verifies authenticity, scope, completion status, and generation date.
 * Guarantees ZERO personal data (no name, PRN, email, or user identifier).
 */
export async function verifyPracticeReport(req: Request, res: Response): Promise<void> {
  try {
    const { reportId } = req.params;
    if (!reportId || typeof reportId !== 'string') {
      res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid report ID provided',
      });
      return;
    }

    const verificationRecord = practiceReportService.getPublicVerificationRecord(reportId);
    if (!verificationRecord) {
      res.status(404).json({
        success: false,
        valid: false,
        code: 'REPORT_NOT_FOUND',
        message: 'The requested practice report could not be found or verification record has expired.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: verificationRecord,
    });
  } catch (err) {
    console.error('Error in verifyPracticeReport:', err);
    res.status(500).json({ success: false, valid: false, message: 'Verification service error' });
  }
}


/**
 * Records a mastered topic practice problem from the Topic Practice Arena.
 * Automatically synchronizes with prisma.practiceProgress and rewards XP.
 */
/**
 * Tracks a student opening a topic practice question.
 * Per requirement: Every time a student opens the question, attemptsCount increments by 1!
 */
export async function trackTopicOpen(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const {
      topicId,
      moduleIndex = 1,
      moduleSlug = 'control-structures',
      topicTitle = 'Practice Problem',
      difficulty = 'EASY',
      code,
    } = req.body;

    if (!topicId) {
      res.status(400).json({ success: false, message: 'topicId is required' });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    const record = await prisma.topicPracticeSubmission.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      update: {
        attemptsCount: { increment: 1 },
        lastOpenedAt: now,
        ...(code ? { code } : {}),
      },
      create: {
        userId,
        topicId,
        moduleIndex: Number(moduleIndex) || 1,
        moduleSlug: String(moduleSlug),
        topicTitle: String(topicTitle),
        difficulty: String(difficulty),
        status: 'IN_PROGRESS',
        attemptsCount: 1,
        tabSwitchCount: 0,
        copyPasteAttempts: 0,
        code: code || null,
        firstOpenedAt: now,
        lastOpenedAt: now,
      },
    });

    res.status(200).json({
      success: true,
      attemptsCount: record.attemptsCount,
      data: record,
    });
  } catch (err) {
    console.error('Error in trackTopicOpen:', err);
    res.status(500).json({ success: false, message: 'Failed to track topic open' });
  }
}

/**
 * Tracks proctoring telemetry per practice topic: tab switches and blocked copy-pastes.
 */
export async function recordTopicTelemetry(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { topicId, tabSwitchDelta = 0, copyPasteDelta = 0, currentCode } = req.body;
    if (!topicId) {
      res.status(400).json({ success: false, message: 'topicId is required' });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    const record = await prisma.topicPracticeSubmission.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      update: {
        tabSwitchCount: { increment: Number(tabSwitchDelta) || 0 },
        copyPasteAttempts: { increment: Number(copyPasteDelta) || 0 },
        lastOpenedAt: now,
        ...(currentCode ? { code: currentCode } : {}),
      },
      create: {
        userId,
        topicId,
        moduleIndex: 1,
        moduleSlug: 'control-structures',
        topicTitle: 'Practice Problem',
        status: 'IN_PROGRESS',
        attemptsCount: 1,
        tabSwitchCount: Number(tabSwitchDelta) || 0,
        copyPasteAttempts: Number(copyPasteDelta) || 0,
        code: currentCode || null,
        firstOpenedAt: now,
        lastOpenedAt: now,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        tabSwitchCount: record.tabSwitchCount,
        copyPasteAttempts: record.copyPasteAttempts,
      },
    });
  } catch (err) {
    console.error('Error in recordTopicTelemetry:', err);
    res.status(500).json({ success: false, message: 'Failed to record topic telemetry' });
  }
}

/**
 * Records a mastered topic practice problem from the Topic Practice Arena.
 * Saves submitted code, updates status to SOLVED, and synchronizes with practiceProgress and XP.
 */
export async function recordTopicPracticeSolved(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { topicId, moduleSlug, moduleIndex, topicTitle, code, difficulty } = req.body;
    const slug = moduleSlug || 'control-structures';
    const now = new Date();

    // 1. Update or create TopicPracticeSubmission
    if (topicId) {
      await prisma.topicPracticeSubmission.upsert({
        where: {
          userId_topicId: {
            userId: req.user.userId,
            topicId,
          },
        },
        update: {
          status: 'SOLVED',
          verdict: 'ACCEPTED',
          code: code || undefined,
          solvedAt: now,
          lastOpenedAt: now,
        },
        create: {
          userId: req.user.userId,
          topicId,
          moduleIndex: Number(moduleIndex) || 1,
          moduleSlug: slug,
          topicTitle: topicTitle || 'Practice Problem',
          difficulty: difficulty || 'EASY',
          status: 'SOLVED',
          verdict: 'ACCEPTED',
          attemptsCount: 1,
          tabSwitchCount: 0,
          copyPasteAttempts: 0,
          code: code || null,
          firstOpenedAt: now,
          lastOpenedAt: now,
          solvedAt: now,
        },
      });
    }

    // 2. Existing practice progress sync
    let problem = await prisma.problem.findFirst({
      where: {
        moduleSlug: slug,
        isPractice: true,
      },
    });

    if (!problem) {
      problem = await prisma.problem.findFirst({
        where: { isPractice: true },
      });
    }

    if (problem) {
      await prisma.practiceProgress.upsert({
        where: {
          userId_problemId: {
            userId: req.user.userId,
            problemId: problem.id,
          },
        },
        update: {
          isSolved: true,
          solvedAt: now,
          attemptsCount: { increment: 1 },
          lastSyncedAt: now,
        },
        create: {
          userId: req.user.userId,
          problemId: problem.id,
          moduleSlug: slug,
          isSolved: true,
          solvedAt: now,
          runsCount: 1,
          attemptsCount: 1,
          activeSeconds: 60,
          firstOpenedAt: now,
          lastSyncedAt: now,
        },
      });
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        totalPoints: { increment: 20 },
      },
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Practice topic progress saved successfully' });
  } catch (err) {
    console.error('Error in recordTopicPracticeSolved:', err);
    res.status(500).json({ success: false, message: 'Failed to record topic practice progress' });
  }
}

/**
 * Admin portal endpoint: returns all student practice topic submissions,
 * including student identity (PRN, Name, Email, Division), question title,
 * attempts count, tab switches, copy-paste counts, status, and full submitted code.
 */
export async function getAdminTopicPracticeSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const status = (req.query.status as string)?.trim();
    const moduleIndex = req.query.moduleIndex ? parseInt(req.query.moduleIndex as string) : undefined;
    const search = (req.query.search as string)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (moduleIndex && !isNaN(moduleIndex)) {
      where.moduleIndex = moduleIndex;
    }

    if (search) {
      where.OR = [
        { topicTitle: { contains: search } },
        { topicId: { contains: search } },
        {
          user: {
            OR: [
              { prn: { contains: search } },
              { email: { contains: search } },
              { displayName: { contains: search } },
              { fullName: { contains: search } },
              { username: { contains: search } },
            ],
          },
        },
      ];
    }

    const [items, total, aggregateStats] = await Promise.all([
      prisma.topicPracticeSubmission.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              prn: true,
              email: true,
              displayName: true,
              fullName: true,
              username: true,
              college: true,
              department: true,
              year: true,
              division: true,
            },
          },
        },
      }),
      prisma.topicPracticeSubmission.count({ where }),
      prisma.topicPracticeSubmission.aggregate({
        where,
        _sum: {
          attemptsCount: true,
          tabSwitchCount: true,
          copyPasteAttempts: true,
        },
      }),
    ]);

    const solvedCount = await prisma.topicPracticeSubmission.count({
      where: { ...where, status: 'SOLVED' },
    });
    const inProgressCount = await prisma.topicPracticeSubmission.count({
      where: { ...where, status: 'IN_PROGRESS' },
    });

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        stats: {
          totalTracked: total,
          solvedCount,
          inProgressCount,
          totalAttempts: aggregateStats._sum.attemptsCount || 0,
          totalTabSwitches: aggregateStats._sum.tabSwitchCount || 0,
          totalCopyPasteAttempts: aggregateStats._sum.copyPasteAttempts || 0,
        },
      },
    });
  } catch (err) {
    console.error('Error in getAdminTopicPracticeSubmissions:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve practice topic submissions' });
  }
}
