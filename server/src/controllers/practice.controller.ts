import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { PRACTICE_CONFIG, PracticeModuleConfig } from '../config/practice.config.js';

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
    let previousModuleTotal = 10;

    const modulesWithStatus = PRACTICE_CONFIG.MODULES.map((mod: PracticeModuleConfig, idx: number) => {
      const moduleProbs = problemsByModule[mod.slug] || [];
      const totalPublished = moduleProbs.length;
      const easyCount = moduleProbs.filter((p) => p.difficulty === 'EASY').length;
      const mediumCount = moduleProbs.filter((p) => p.difficulty === 'MEDIUM').length;
      const hardCount = moduleProbs.filter((p) => p.difficulty === 'HARD').length;
      const isComingSoon = totalPublished < 10;

      let isUnlocked = false;
      let requirementText = '';

      if (idx === 0) {
        isUnlocked = true;
      } else {
        const prevModule = PRACTICE_CONFIG.MODULES[idx - 1];
        const threshold = mod.requiredSolvedToUnlock || PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD;

        // Incomplete curriculum: cannot unlock as complete
        if (previousModuleTotal < 10) {
          isUnlocked = false;
          requirementText = `${prevModule.title} is coming soon (incomplete curriculum)`;
        } else {
          isUnlocked = previousModuleSolved >= threshold;
          if (!isUnlocked) {
            requirementText = `Solve ${threshold} of ${previousModuleTotal} in ${prevModule.title} to unlock`;
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

      if (prevProblemsCount < 10) {
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
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: `Module locked. Solve at least ${threshold} problems in ${prevModule.title} to unlock.`,
          error: `Module locked. Solve at least ${threshold} problems in ${prevModule.title} to unlock.`,
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

      if (prevProblemsCount < 10) {
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
        res.status(403).json({
          success: false,
          code: 'MODULE_LOCKED',
          message: 'Module locked. Solve required questions in previous module to unlock.',
          error: 'Module locked. Solve required questions in previous module to unlock.',
        });
        return;
      }
    }

    // Fetch student's progress on this problem
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
          solvedAt: userProgress?.solvedAt || null,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching practice problem details:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve practice problem' });
  }
}
