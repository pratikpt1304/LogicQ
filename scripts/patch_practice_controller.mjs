import fs from 'fs';

const filePath = 'server/src/controllers/practice.controller.ts';
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Find the start of trackTopicOpen block
const targetStart = `/**
 * Tracks a student opening a topic practice question.
 * Per requirement: Every time a student opens the question, attemptsCount increments by 1!
 */`;

const helperAndUpdatedMethods = `/**
 * Helper to evaluate cheat risk based on proctoring telemetry:
 * - Blocked pastes
 * - Tab switches (window unfocused)
 * - Fullscreen exits
 * - Typing velocity (Characters Per Minute / CPM)
 * - Instant code completion anomalies
 */
function computeCheatRisk(params: {
  tabSwitches: number;
  copyPastes: number;
  fullscreenExits: number;
  typingVelocityCPM: number;
  codeLength: number;
  timeTakenSeconds?: number | null;
}): { cheatProbability: string; cheatReason: string } {
  const flags: string[] = [];

  if (params.copyPastes >= 3) {
    flags.push(\`\${params.copyPastes} blocked paste attempts\`);
  } else if (params.copyPastes >= 1) {
    flags.push(\`\${params.copyPastes} blocked paste attempt\`);
  }

  if (params.tabSwitches >= 4) {
    flags.push(\`\${params.tabSwitches} external window tab switches\`);
  } else if (params.tabSwitches >= 2) {
    flags.push(\`\${params.tabSwitches} window tab switches\`);
  }

  if (params.fullscreenExits >= 3) {
    flags.push(\`\${params.fullscreenExits} fullscreen exits\`);
  } else if (params.fullscreenExits >= 1) {
    flags.push(\`\${params.fullscreenExits} fullscreen exit\`);
  }

  if (params.typingVelocityCPM >= 750) {
    flags.push(\`Superhuman typing velocity (\${params.typingVelocityCPM} CPM / paste burst)\`);
  } else if (params.typingVelocityCPM >= 450) {
    flags.push(\`Elevated typing velocity (\${params.typingVelocityCPM} CPM)\`);
  }

  if (params.timeTakenSeconds && params.timeTakenSeconds < 15 && params.codeLength > 200) {
    flags.push(\`Instant code completion (\${params.codeLength} chars in \${params.timeTakenSeconds}s)\`);
  }

  if (
    flags.length >= 2 ||
    params.copyPastes >= 3 ||
    params.tabSwitches >= 4 ||
    params.fullscreenExits >= 3 ||
    params.typingVelocityCPM >= 800 ||
    (params.timeTakenSeconds && params.timeTakenSeconds < 15 && params.codeLength > 200)
  ) {
    return {
      cheatProbability: 'LIKELY_CHEATED',
      cheatReason: flags.join(' • ') || 'High telemetry anomalies detected',
    };
  }

  if (flags.length >= 1 || params.tabSwitches >= 1 || params.copyPastes >= 1 || params.fullscreenExits >= 1) {
    return {
      cheatProbability: 'SUSPICIOUS',
      cheatReason: flags.join(' • ') || 'Moderate telemetry anomalies',
    };
  }

  return {
    cheatProbability: 'CLEAN',
    cheatReason: 'Normal human typing flow and zero or minimal tab switches.',
  };
}

function appendActivityLog(
  existingLogsStr: string | null | undefined,
  entry: { time?: string; elapsedSec?: number; event: string; detail?: string }
): string {
  let logs: any[] = [];
  if (existingLogsStr) {
    try {
      const parsed = JSON.parse(existingLogsStr);
      if (Array.isArray(parsed)) logs = parsed;
    } catch {}
  }
  logs.push({
    time: entry.time || new Date().toISOString(),
    elapsedSec: entry.elapsedSec ?? 0,
    event: entry.event,
    detail: entry.detail || '',
  });
  if (logs.length > 80) logs = logs.slice(-80);
  return JSON.stringify(logs);
}

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

    const existing = await prisma.topicPracticeSubmission.findUnique({
      where: {
        userId_topicId: { userId, topicId },
      },
    });

    const currentAttempts = (existing?.attemptsCount || 0) + 1;
    const updatedLogs = appendActivityLog(existing?.activityLogs, {
      elapsedSec: 0,
      event: 'QUESTION_OPENED',
      detail: \`Question opened (Attempt #\${currentAttempts})\`,
    });

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
        activityLogs: updatedLogs,
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
        fullscreenExitCount: 0,
        typingVelocityCPM: 0,
        cheatProbability: 'CLEAN',
        cheatReason: 'Question opened for practice.',
        activityLogs: updatedLogs,
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
 * Tracks proctoring telemetry per practice topic: tab switches, blocked copy-pastes, fullscreen exits, typing velocity, and activity logs.
 */
export async function recordTopicTelemetry(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const {
      topicId,
      tabSwitchDelta = 0,
      copyPasteDelta = 0,
      fullscreenExitDelta = 0,
      typingVelocityCPM,
      currentCode,
      elapsedSec = 0,
      eventLog,
    } = req.body;

    if (!topicId) {
      res.status(400).json({ success: false, message: 'topicId is required' });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    const existing = await prisma.topicPracticeSubmission.findUnique({
      where: {
        userId_topicId: { userId, topicId },
      },
    });

    const newTabSwitches = (existing?.tabSwitchCount || 0) + (Number(tabSwitchDelta) || 0);
    const newPastes = (existing?.copyPasteAttempts || 0) + (Number(copyPasteDelta) || 0);
    const newFullscreenExits = (existing?.fullscreenExitCount || 0) + (Number(fullscreenExitDelta) || 0);
    const effectiveCPM = typeof typingVelocityCPM === 'number' && typingVelocityCPM > 0
      ? Math.max(existing?.typingVelocityCPM || 0, Math.floor(typingVelocityCPM))
      : existing?.typingVelocityCPM || 0;

    let updatedLogs = existing?.activityLogs || '[]';
    if (eventLog && eventLog.event) {
      updatedLogs = appendActivityLog(updatedLogs, {
        elapsedSec: eventLog.elapsedSec ?? elapsedSec,
        event: eventLog.event,
        detail: eventLog.detail,
      });
    } else if (Number(tabSwitchDelta) > 0) {
      updatedLogs = appendActivityLog(updatedLogs, {
        elapsedSec,
        event: 'TAB_SWITCH',
        detail: \`Window unfocused / tab switch (#\${newTabSwitches})\`,
      });
    } else if (Number(copyPasteDelta) > 0) {
      updatedLogs = appendActivityLog(updatedLogs, {
        elapsedSec,
        event: 'PASTE_BLOCKED',
        detail: \`Copy-paste attempt blocked by proctor (#\${newPastes})\`,
      });
    } else if (Number(fullscreenExitDelta) > 0) {
      updatedLogs = appendActivityLog(updatedLogs, {
        elapsedSec,
        event: 'FULLSCREEN_EXIT',
        detail: \`Exited fullscreen proctored workspace (#\${newFullscreenExits})\`,
      });
    }

    const effectiveCode = currentCode || existing?.code || '';
    const risk = computeCheatRisk({
      tabSwitches: newTabSwitches,
      copyPastes: newPastes,
      fullscreenExits: newFullscreenExits,
      typingVelocityCPM: effectiveCPM,
      codeLength: effectiveCode.length,
      timeTakenSeconds: existing?.timeTakenSeconds,
    });

    const record = await prisma.topicPracticeSubmission.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      update: {
        tabSwitchCount: newTabSwitches,
        copyPasteAttempts: newPastes,
        fullscreenExitCount: newFullscreenExits,
        typingVelocityCPM: effectiveCPM,
        cheatProbability: risk.cheatProbability,
        cheatReason: risk.cheatReason,
        activityLogs: updatedLogs,
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
        tabSwitchCount: newTabSwitches,
        copyPasteAttempts: newPastes,
        fullscreenExitCount: newFullscreenExits,
        typingVelocityCPM: effectiveCPM,
        cheatProbability: risk.cheatProbability,
        cheatReason: risk.cheatReason,
        activityLogs: updatedLogs,
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
        fullscreenExitCount: record.fullscreenExitCount,
        typingVelocityCPM: record.typingVelocityCPM,
        cheatProbability: record.cheatProbability,
        cheatReason: record.cheatReason,
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
    const {
      topicId,
      moduleSlug,
      moduleIndex,
      topicTitle,
      code,
      difficulty,
      timeTakenSeconds,
      typingVelocityCPM,
      fullscreenExitDelta = 0,
    } = req.body;
    const slug = moduleSlug || 'control-structures';
    const now = new Date();

    // 1. Update or create TopicPracticeSubmission
    if (topicId) {
      const parsedTime = typeof timeTakenSeconds === 'number' && !isNaN(timeTakenSeconds) && timeTakenSeconds > 0
        ? Math.floor(timeTakenSeconds)
        : null;

      const existing = await prisma.topicPracticeSubmission.findUnique({
        where: {
          userId_topicId: {
            userId: req.user.userId,
            topicId,
          },
        },
      });

      const finalTabSwitches = existing?.tabSwitchCount || 0;
      const finalPastes = existing?.copyPasteAttempts || 0;
      const finalFullscreenExits = (existing?.fullscreenExitCount || 0) + (Number(fullscreenExitDelta) || 0);
      const finalCPM = typeof typingVelocityCPM === 'number' && typingVelocityCPM > 0
        ? Math.floor(typingVelocityCPM)
        : existing?.typingVelocityCPM || 0;

      let updatedLogs = existing?.activityLogs || '[]';
      updatedLogs = appendActivityLog(updatedLogs, {
        elapsedSec: parsedTime || 0,
        event: 'SOLVED_SUCCESS',
        detail: \`All test cases passed! Solved in \${parsedTime || 0}s\`,
      });

      const risk = computeCheatRisk({
        tabSwitches: finalTabSwitches,
        copyPastes: finalPastes,
        fullscreenExits: finalFullscreenExits,
        typingVelocityCPM: finalCPM,
        codeLength: (code || '').length,
        timeTakenSeconds: parsedTime,
      });

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
          ...(parsedTime ? { timeTakenSeconds: parsedTime } : {}),
          fullscreenExitCount: finalFullscreenExits,
          typingVelocityCPM: finalCPM,
          cheatProbability: risk.cheatProbability,
          cheatReason: risk.cheatReason,
          activityLogs: updatedLogs,
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
          tabSwitchCount: finalTabSwitches,
          copyPasteAttempts: finalPastes,
          fullscreenExitCount: finalFullscreenExits,
          typingVelocityCPM: finalCPM,
          cheatProbability: risk.cheatProbability,
          cheatReason: risk.cheatReason,
          activityLogs: updatedLogs,
          code: code || null,
          timeTakenSeconds: parsedTime,
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
    });

    res.status(200).json({
      success: true,
      message: 'Topic practice problem solved and progress synced successfully',
    });
  } catch (err) {
    console.error('Error in recordTopicPracticeSolved:', err);
    res.status(500).json({ success: false, message: 'Failed to record solved practice topic' });
  }
}

/**
 * Admin API: Fetches paginated topic practice submissions and telemetry.
 */
export async function getAdminTopicPracticeSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const status = (req.query.status as string)?.trim();
    const moduleIndex = req.query.moduleIndex ? parseInt(req.query.moduleIndex as string) : undefined;
    const cheatProbability = (req.query.cheatProbability as string)?.trim();
    const search = (req.query.search as string)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (moduleIndex && !isNaN(moduleIndex)) {
      where.moduleIndex = moduleIndex;
    }
    if (cheatProbability && cheatProbability !== 'ALL') {
      where.cheatProbability = cheatProbability;
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

    const [items, total, aggregateStats, solvedCount, inProgressCount, likelyCheatedCount, suspiciousCount, cleanCount] = await Promise.all([
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
          fullscreenExitCount: true,
        },
      }),
      prisma.topicPracticeSubmission.count({ where: { ...where, status: 'SOLVED' } }),
      prisma.topicPracticeSubmission.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.topicPracticeSubmission.count({ where: { ...where, cheatProbability: 'LIKELY_CHEATED' } }),
      prisma.topicPracticeSubmission.count({ where: { ...where, cheatProbability: 'SUSPICIOUS' } }),
      prisma.topicPracticeSubmission.count({ where: { ...where, cheatProbability: 'CLEAN' } }),
    ]);

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
          likelyCheatedCount,
          suspiciousCount,
          cleanCount,
          totalAttempts: aggregateStats._sum.attemptsCount || 0,
          totalTabSwitches: aggregateStats._sum.tabSwitchCount || 0,
          totalCopyPasteAttempts: aggregateStats._sum.copyPasteAttempts || 0,
          totalFullscreenExits: aggregateStats._sum.fullscreenExitCount || 0,
        },
      },
    });
  } catch (err) {
    console.error('Error in getAdminTopicPracticeSubmissions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch topic submissions' });
  }
}
`;

const startIndex = c.indexOf(targetStart);
if (startIndex === -1) {
  console.error('Could not find targetStart in practice.controller.ts');
  process.exit(1);
}

const endIndex = c.indexOf('export async function getAdminTopicPracticeSubmissions', startIndex);
if (endIndex === -1) {
  console.error('Could not find getAdminTopicPracticeSubmissions');
  process.exit(1);
}

const finalCloseIndex = c.indexOf('}\n', c.indexOf('res.status(500)', endIndex));
const endOfFunction = c.indexOf('}\n', finalCloseIndex) + 2;

const updatedContent = c.substring(0, startIndex) + helperAndUpdatedMethods + c.substring(endOfFunction);
fs.writeFileSync(filePath, updatedContent.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated practice.controller.ts with telemetry, velocity, cheat detection, and activity logs!');
