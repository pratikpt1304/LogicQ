import { prisma } from '../utils/prisma.js';
import { getJudge } from '../judge/judge.factory.js';
import { Verdict } from '../judge/judge.interface.js';
import { AiVivaService } from './ai-viva.service.js';
import crypto from 'crypto';

export interface SubmitQuestionDto {
  attemptId: string;
  code: string;
  clientMetrics?: {
    copyPasteAttempts?: number;
    cutAttempts?: number;
    contextMenuAttempts?: number;
    tabSwitchCount?: number;
    focusLossCount?: number;
    totalFocusLossDurationMs?: number;
    longestFocusLossDurationMs?: number;
    fullScreenExitCount?: number;
    totalKeystrokes?: number;
    charsInserted?: number;
    charsDeleted?: number;
    cpm?: number;
    wpm?: number;
    linesAdded?: number;
    linesDeleted?: number;
    largestBurstChars?: number;
    activeInteractionTimeSec?: number;
    editCount?: number;
    executionCount?: number;
    emergenceCheckpoints?: Array<{ timestampSec: number; codePercentage: number }>;
  };
}

export interface RecordTelemetryDto {
  attemptId: string;
  clientMetrics: {
    copyPasteAttempts?: number;
    cutAttempts?: number;
    contextMenuAttempts?: number;
    tabSwitchCount?: number;
    focusLossCount?: number;
    totalFocusLossDurationMs?: number;
    longestFocusLossDurationMs?: number;
    fullScreenExitCount?: number;
    totalKeystrokes?: number;
    charsInserted?: number;
    charsDeleted?: number;
    cpm?: number;
    wpm?: number;
    largestBurstChars?: number;
    activeInteractionTimeSec?: number;
  };
}

function normalizeOutput(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

// Global in-flight lock preventing concurrency races on code evaluation
const inFlightSubmissions = new Set<string>();

export class SmartExamService {
  /**
   * Starts a question attempt for an enrolled student.
   * Generates a unique Question Variant ID (Section 34) and starts the timer (Section 5).
   * Enforces Section 7: Locked questions cannot be reopened.
   */
  static async startQuestionAttempt(input: {
    assignmentId: string;
    problemId: string;
    studentId: string;
  }) {
    // 1. Verify student owns this assignment
    const assignment = await prisma.assessmentTestAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        test: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new Error('Assessment test assignment not found.');
    }
    if (assignment.studentId !== input.studentId) {
      throw new Error('Unauthorized to access this test assignment.');
    }
    if (assignment.status === 'SUBMITTED' || assignment.status === 'EXPIRED') {
      throw new Error('This assessment test has already been completed or has expired.');
    }

    // Ensure problem is part of the test
    const isProblemInTest = assignment.test.questions.some((q) => q.problemId === input.problemId);
    if (!isProblemInTest) {
      throw new Error('This question is not part of the active assessment test.');
    }

    // Ensure no unresolved rapid viva blocks starting another question
    const pendingViva = await prisma.assessmentVivaQuestion.findFirst({
      where: {
        assignmentId: input.assignmentId,
        status: 'PENDING',
      },
    });
    if (pendingViva) {
      const elapsed = Math.round((Date.now() - pendingViva.startedAt.getTime()) / 1000);
      if (elapsed <= 12) {
        throw new Error('PENDING_VIVA: A rapid 10-second AI Viva is pending. Please answer it before starting a new question.');
      } else {
        await prisma.assessmentVivaQuestion.update({
          where: { id: pendingViva.id },
          data: { status: 'TIMED_OUT', relevanceScore: 0, responseDurationSec: elapsed },
        });
      }
    }

    // 2. Fetch or create Question Attempt
    let attempt = await prisma.assessmentQuestionAttempt.findUnique({
      where: {
        assignmentId_problemId: {
          assignmentId: input.assignmentId,
          problemId: input.problemId,
        },
      },
      include: {
        problem: {
          include: {
            testCases: {
              where: { isHidden: false }, // Security: Never leak hidden test case!
              select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (attempt) {
      if (attempt.isLocked) {
        throw new Error(
          'QUESTION_LOCKED: This question was already successfully submitted. Under institutional policy, no reattempts are permitted.'
        );
      }
      return {
        success: true,
        attemptId: attempt.id,
        questionVariantId: attempt.questionVariantId,
        startedAt: attempt.startedAt,
        isLocked: attempt.isLocked,
        problem: {
          id: attempt.problem.id,
          title: attempt.problem.title,
          module: attempt.problem.module,
          section: attempt.problem.section,
          topic: attempt.problem.topic,
          scenario: attempt.problem.scenario,
          description: attempt.problem.description,
          starterCode: attempt.problem.starterCode,
          difficulty: attempt.problem.difficulty,
          expectedTimeMin: attempt.problem.expectedTimeMin ?? 2,
          expectedTimeMax: attempt.problem.expectedTimeMax ?? 8,
          visibleTestCases: attempt.problem.testCases,
        },
      };
    }

    // Mark test assignment IN_PROGRESS
    if (assignment.status === 'ASSIGNED') {
      await prisma.assessmentTestAssignment.update({
        where: { id: input.assignmentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: assignment.startedAt || new Date(),
        },
      });
    }

    // Generate unique Question Variant ID (Section 34)
    const variantId = `VAR-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    // Create attempt
    attempt = await prisma.assessmentQuestionAttempt.create({
      data: {
        assignmentId: input.assignmentId,
        problemId: input.problemId,
        questionVariantId: variantId,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        isLocked: false,
      },
      include: {
        problem: {
          include: {
            testCases: {
              where: { isHidden: false },
              select: { id: true, input: true, expectedOutput: true, isHidden: true, orderIndex: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    return {
      success: true,
      attemptId: attempt.id,
      questionVariantId: attempt.questionVariantId,
      startedAt: attempt.startedAt,
      isLocked: false,
      problem: {
        id: attempt.problem.id,
        title: attempt.problem.title,
        module: attempt.problem.module,
        section: attempt.problem.section,
        topic: attempt.problem.topic,
        scenario: attempt.problem.scenario,
        description: attempt.problem.description,
        starterCode: attempt.problem.starterCode,
        difficulty: attempt.problem.difficulty,
        expectedTimeMin: attempt.problem.expectedTimeMin ?? 2,
        expectedTimeMax: attempt.problem.expectedTimeMax ?? 8,
        visibleTestCases: attempt.problem.testCases,
      },
    };
  }

  /**
   * Interactive C code test runner for visible test cases only (Test 1 and Test 2).
   */
  static async runVisibleTests(attemptId: string, code: string, studentId: string) {
    const attempt = await prisma.assessmentQuestionAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: true,
        problem: {
          include: {
            testCases: {
              where: { isHidden: false },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error('Attempt not found.');
    if (attempt.assignment.studentId !== studentId) throw new Error('Unauthorized.');
    if (attempt.isLocked) throw new Error('Question is locked.');

    const judge = await getJudge();
    const testResults: any[] = [];
    let now = new Date();

    for (let i = 0; i < attempt.problem.testCases.length; i++) {
      const tc = attempt.problem.testCases[i];
      const res = await judge.compileAndRun(code, tc.input, 2000, 128);

      const actual = normalizeOutput(res.stdout || '');
      const expected = normalizeOutput(tc.expectedOutput);
      const passed = (res.exitCode === 0 || res.exitCode === undefined) && actual === expected;

      testResults.push({
        testIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: res.stdout || '',
        passed,
        verdict: passed ? Verdict.ACCEPTED : res.verdict,
        runtimeMs: res.runtimeMs,
        stderr: res.stderr,
        compileOutput: res.compileOutput,
      });

      // Record first pass timestamp per Section 6
      if (passed) {
        if (i === 0 && !attempt.firstPassT1At) {
          await prisma.assessmentQuestionAttempt.update({
            where: { id: attemptId },
            data: { firstPassT1At: now },
          });
        } else if (i === 1 && !attempt.firstPassT2At) {
          await prisma.assessmentQuestionAttempt.update({
            where: { id: attemptId },
            data: { firstPassT2At: now },
          });
        }
      }
    }

    // Increment execution count
    await prisma.assessmentQuestionAttempt.update({
      where: { id: attemptId },
      data: {
        executionCount: { increment: 1 },
        firstExecutionAt: attempt.firstExecutionAt || now,
      },
    });

    return {
      success: true,
      testResults,
    };
  }

  /**
   * Asynchronous telemetry ingestion endpoint (Phase 3 Deliverable).
   * Non-blocking heartbeat updating factual environment and typing metrics.
   * STRICT SEPARATION: Academic marks and problem state are untouched.
   */
  static async recordTelemetry(input: RecordTelemetryDto, studentId: string) {
    const attempt = await prisma.assessmentQuestionAttempt.findUnique({
      where: { id: input.attemptId },
      include: { assignment: true },
    });

    if (!attempt) throw new Error('Attempt not found.');
    if (attempt.assignment.studentId !== studentId) throw new Error('Unauthorized.');

    // If attempt is already locked/completed, ignore further telemetry
    if (attempt.isLocked || attempt.status === 'LOCKED') {
      return { success: true, isLocked: true };
    }

    const m = input.clientMetrics || {};

    await prisma.assessmentQuestionAttempt.update({
      where: { id: input.attemptId },
      data: {
        copyPasteAttempts: Math.max(attempt.copyPasteAttempts, m.copyPasteAttempts ?? 0),
        cutAttempts: Math.max(attempt.cutAttempts, m.cutAttempts ?? 0),
        contextMenuAttempts: Math.max(attempt.contextMenuAttempts, m.contextMenuAttempts ?? 0),
        tabSwitchCount: Math.max(attempt.tabSwitchCount, m.tabSwitchCount ?? 0),
        focusLossCount: Math.max(attempt.focusLossCount, m.focusLossCount ?? 0),
        totalFocusLossDurationMs: Math.max(attempt.totalFocusLossDurationMs, m.totalFocusLossDurationMs ?? 0),
        longestFocusLossDurationMs: Math.max(attempt.longestFocusLossDurationMs, m.longestFocusLossDurationMs ?? 0),
        fullScreenExitCount: Math.max(attempt.fullScreenExitCount, m.fullScreenExitCount ?? 0),
        totalKeystrokes: Math.max(attempt.totalKeystrokes, m.totalKeystrokes ?? 0),
        charsInserted: Math.max(attempt.charsInserted, m.charsInserted ?? 0),
        charsDeleted: Math.max(attempt.charsDeleted, m.charsDeleted ?? 0),
        largestBurstChars: Math.max(attempt.largestBurstChars, m.largestBurstChars ?? 0),
        activeInteractionTimeSec: Math.max(attempt.activeInteractionTimeSec, m.activeInteractionTimeSec ?? 0),
        cpm: m.cpm !== undefined ? m.cpm : attempt.cpm,
        wpm: m.wpm !== undefined ? m.wpm : attempt.wpm,
      },
    });

    return { success: true };
  }

  /**
   * Final Question Submission (Sections 5, 7, 19–28).
   * Executes against all 3 test cases (including Hidden Test 3 server-side).
   * Calculates Time-Based Academic Score and Behavioral Integrity Score.
   * Locks the question permanently if passed (Section 7).
   */
  static async submitQuestion(input: SubmitQuestionDto, studentId: string) {
    const attempt = await prisma.assessmentQuestionAttempt.findUnique({
      where: { id: input.attemptId },
      include: {
        assignment: true,
        problem: {
          include: {
            testCases: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error('Attempt not found.');
    if (attempt.assignment.studentId !== studentId) throw new Error('Unauthorized.');
    if (attempt.isLocked) {
      throw new Error('QUESTION_LOCKED: Question is already locked after a successful submission.');
    }

    // Ensure no unresolved rapid viva blocks submitting another question
    const pendingViva = await prisma.assessmentVivaQuestion.findFirst({
      where: {
        assignmentId: attempt.assignmentId,
        status: 'PENDING',
      },
    });
    if (pendingViva) {
      const elapsed = Math.round((Date.now() - pendingViva.startedAt.getTime()) / 1000);
      if (elapsed <= 12) {
        throw new Error('PENDING_VIVA: A rapid 10-second AI Viva is pending. Please complete it before submitting another question.');
      } else {
        await prisma.assessmentVivaQuestion.update({
          where: { id: pendingViva.id },
          data: { status: 'TIMED_OUT', relevanceScore: 0, responseDurationSec: elapsed },
        });
      }
    }

    if (inFlightSubmissions.has(input.attemptId)) {
      throw new Error('CONCURRENT_SUBMISSION: A code evaluation is already in progress for this attempt. Please wait.');
    }
    inFlightSubmissions.add(input.attemptId);

    try {
      const now = new Date();
      const judge = await getJudge();

    // 1. Evaluate against all test cases (2 visible + 1 hidden)
    let allPassed = true;
    let finalVerdict: Verdict = Verdict.ACCEPTED;
    const testOutcomes: any[] = [];

    for (let i = 0; i < attempt.problem.testCases.length; i++) {
      const tc = attempt.problem.testCases[i];
      const exec = await judge.compileAndRun(input.code, tc.input, 2000, 128);

      const actual = normalizeOutput(exec.stdout || '');
      const expected = normalizeOutput(tc.expectedOutput);
      const passed = (exec.exitCode === 0 || exec.exitCode === undefined) && actual === expected;

      if (!passed) {
        allPassed = false;
        finalVerdict = exec.verdict !== Verdict.ACCEPTED ? exec.verdict : Verdict.WRONG_ANSWER;
      }

      if (passed && tc.isHidden && !attempt.firstPassT3At) {
        attempt.firstPassT3At = now;
      }

      testOutcomes.push({
        testIndex: i + 1,
        isHidden: tc.isHidden,
        passed,
        verdict: passed ? Verdict.ACCEPTED : exec.verdict,
        runtimeMs: exec.runtimeMs,
        stderr: exec.stderr,
        exitCode: exec.exitCode,
        // Never leak hidden test output or input to client payload
        input: tc.isHidden ? '*** HIDDEN TEST CASE INPUT ***' : tc.input,
        expectedOutput: tc.isHidden ? '*** HIDDEN ***' : tc.expectedOutput,
        actualOutput: tc.isHidden ? (passed ? 'PASSED' : 'OUTPUT MISMATCH') : exec.stdout,
      });
    }

    // 2. Time-Based Scoring (Section 5: Easy 10m, Medium 20m, Hard 30m)
    const actualTimeTakenSec = Math.max(1, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000));
    const diffStr = String(attempt.problem?.difficulty || 'EASY').toUpperCase();
    const defaultMin = diffStr === 'HARD' ? 15 : diffStr === 'MEDIUM' ? 8 : 2;
    const defaultMax = diffStr === 'HARD' ? 30 : diffStr === 'MEDIUM' ? 20 : 10;
    const expectedMinSec = (attempt.problem.expectedTimeMin ?? defaultMin) * 60;
    const expectedMaxSec = (attempt.problem.expectedTimeMax ?? defaultMax) * 60;
    const expectedRefTimeSec = Math.round((expectedMinSec + expectedMaxSec) / 2);
    const timeDeviationSec = actualTimeTakenSec - expectedRefTimeSec;
    const deviationPercent = ((actualTimeTakenSec - expectedRefTimeSec) / expectedRefTimeSec) * 100;

    let academicScore = 0.0;
    const passedCount = testOutcomes.filter((t) => t.passed).length;
    const totalCount = attempt.problem.testCases.length;

    if (allPassed) {
      if (actualTimeTakenSec <= expectedMaxSec) {
        academicScore = 1.0; // Correct within prescribed time = 1 mark
      } else {
        academicScore = 0.5; // Correct but outside prescribed time = 0.5 mark
      }
    } else if (passedCount > 0 && totalCount > 0) {
      // University Partial Credit: Award proportional partial credit for passed test cases
      academicScore = Number(((passedCount / totalCount) * 0.5).toFixed(2));
    } else {
      academicScore = 0.0;   // Incorrect = 0 marks
    }

    // 3. Behavioral Integrity Score & Classification (Sections 20–28, 57, 58)
    const m = input.clientMetrics || {};
    const copyPaste = m.copyPasteAttempts ?? attempt.copyPasteAttempts;
    const tabSwitches = m.tabSwitchCount ?? attempt.tabSwitchCount;
    const focusLoss = m.focusLossCount ?? attempt.focusLossCount;
    const fullScreenExits = m.fullScreenExitCount ?? attempt.fullScreenExitCount;
    const largestBurst = m.largestBurstChars ?? attempt.largestBurstChars;
    const submittedLen = Math.max(1, input.code.trim().length);
    const codeBurstRatio = largestBurst / submittedLen;
    const activeSec = m.activeInteractionTimeSec ?? attempt.activeInteractionTimeSec;
    const activeWorkRatio = Math.min(100, Math.round((activeSec / actualTimeTakenSec) * 100));

    // Calculate Integrity Score (0 - 100, higher = higher risk / review flag)
    let integrityScore = 0;
    const suspiciousFlags: string[] = [];

    if (copyPaste > 0) {
      integrityScore += Math.min(25, copyPaste * 10);
      suspiciousFlags.push(`Clipboard copy/paste blocked: ${copyPaste} attempts`);
    }
    if (tabSwitches > 1) {
      integrityScore += Math.min(25, tabSwitches * 8);
      suspiciousFlags.push(`Tab switches detected: ${tabSwitches} events`);
    }
    if (fullScreenExits > 0) {
      integrityScore += Math.min(20, fullScreenExits * 10);
      suspiciousFlags.push(`Full screen exited: ${fullScreenExits} times`);
    }
    if (codeBurstRatio > 0.6 && submittedLen > 80) {
      integrityScore += 25;
      suspiciousFlags.push(`Abrupt code burst detected: ${(codeBurstRatio * 100).toFixed(1)}% of code inserted in single burst`);
    }
    if (actualTimeTakenSec < 30 && allPassed && attempt.problem.difficulty !== 'EASY') {
      integrityScore += 20;
      suspiciousFlags.push(`Unusually rapid solve: ${actualTimeTakenSec}s for ${attempt.problem.difficulty} problem`);
    }

    integrityScore = Math.min(100, Math.max(0, integrityScore));

    // Classification per Section 58
    let integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (integrityScore <= 20) integrityRisk = 'NORMAL';
    else if (integrityScore <= 40) integrityRisk = 'LOW';
    else if (integrityScore <= 60) integrityRisk = 'MODERATE';
    else if (integrityScore <= 80) integrityRisk = 'HIGH';
    else integrityRisk = 'CRITICAL';

    // 4. Lock question permanently if ACCEPTED (Section 7)
    const isLocked = allPassed;

    // Update Attempt Record
    const updatedAttempt = await prisma.assessmentQuestionAttempt.update({
      where: { id: input.attemptId },
      data: {
        submittedAt: now,
        submittedCode: input.code,
        verdict: allPassed ? 'ACCEPTED' : finalVerdict,
        academicScore,
        actualTimeTakenSec,
        expectedRefTimeSec,
        timeDeviationSec,
        deviationPercent,
        isLocked,
        status: isLocked ? 'LOCKED' : 'FAILED',
        firstPassT3At: attempt.firstPassT3At,
        // Metrics
        copyPasteAttempts: copyPaste,
        tabSwitchCount: tabSwitches,
        focusLossCount: focusLoss,
        fullScreenExitCount: fullScreenExits,
        largestBurstChars: largestBurst,
        codeBurstRatio,
        activeInteractionTimeSec: activeSec,
        activeWorkRatio,
        totalKeystrokes: m.totalKeystrokes ?? attempt.totalKeystrokes,
        cpm: m.cpm ?? attempt.cpm,
        wpm: m.wpm ?? attempt.wpm,
        integrityScore,
        integrityRisk,
        suspiciousFlags: suspiciousFlags.length > 0 ? JSON.stringify(suspiciousFlags) : null,
        solutionEmergenceJson: m.emergenceCheckpoints ? JSON.stringify(m.emergenceCheckpoints) : null,
      },
    });

    // 5. Update overall Test Assignment Scores
    const allAttempts = await prisma.assessmentQuestionAttempt.findMany({
      where: { assignmentId: attempt.assignmentId },
    });

    const totalAcademicScore = allAttempts.reduce((sum, a) => sum + (a.academicScore || 0), 0);
    const avgIntegrityScore = Math.round(
      allAttempts.reduce((sum, a) => sum + (a.integrityScore || 0), 0) / (allAttempts.length || 1)
    );

    let testIntegrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (avgIntegrityScore <= 20) testIntegrityRisk = 'NORMAL';
    else if (avgIntegrityScore <= 40) testIntegrityRisk = 'LOW';
    else if (avgIntegrityScore <= 60) testIntegrityRisk = 'MODERATE';
    else if (avgIntegrityScore <= 80) testIntegrityRisk = 'HIGH';
    else testIntegrityRisk = 'CRITICAL';

    await prisma.assessmentTestAssignment.update({
      where: { id: attempt.assignmentId },
      data: {
        academicScore: totalAcademicScore,
        integrityScore: avgIntegrityScore,
        integrityRisk: testIntegrityRisk,
      },
    });

    // 6. AI Viva Trigger Evaluation (Sections 29 - 33)
    const vivaOutcome = await AiVivaService.handleSubmissionVivaTrigger({
      assignmentId: attempt.assignmentId,
      attemptId: attempt.id,
      verdict: allPassed ? 'ACCEPTED' : finalVerdict,
      submittedCode: input.code,
    });

    return {
      success: true,
      verdict: allPassed ? 'ACCEPTED' : finalVerdict,
      academicScore,
      isLocked,
      actualTimeTakenSec,
      expectedMaxSec,
      timeDeviationSec,
      deviationPercent: Math.round(deviationPercent),
      integrityScore,
      integrityRisk,
      suspiciousFlags,
      testOutcomes,
      vivaTriggered: vivaOutcome.vivaTriggered,
      vivaId: vivaOutcome.vivaId,
      vivaQuestionText: vivaOutcome.questionText,
    };
  } finally {
    inFlightSubmissions.delete(input.attemptId);
  }
}
}
