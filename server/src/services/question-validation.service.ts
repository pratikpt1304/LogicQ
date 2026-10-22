import { prisma } from '../utils/prisma.js';
import { getJudge } from '../judge/judge.factory.js';
import { Verdict } from '../judge/judge.interface.js';

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  orderIndex?: number;
  condition?: string;
}

export interface ValidationTestResult {
  testIndex: number;
  isHidden: boolean;
  verdict: string;
  passed: boolean;
  runtimeMs: number;
  actualOutput?: string;
  expectedOutput: string;
  error?: string;
}

export interface QuestionValidationOutcome {
  isValid: boolean;
  validationStatus: 'VALIDATION_PASSED' | 'VALIDATION_FAILED';
  testResults: ValidationTestResult[];
  failureReason?: string;
  validatedAt: string;
}

function normalizeOutput(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

export class QuestionValidationService {
  /**
   * Compiles and executes the candidate reference solution against all 3 test cases
   * in the real C judge sandbox (Section 17).
   */
  static async validateCandidateQuestion(
    referenceSolution: string,
    testCases: TestCaseInput[]
  ): Promise<QuestionValidationOutcome> {
    if (!referenceSolution || referenceSolution.trim().length === 0) {
      return {
        isValid: false,
        validationStatus: 'VALIDATION_FAILED',
        testResults: [],
        failureReason: 'Missing reference solution code.',
        validatedAt: new Date().toISOString(),
      };
    }

    if (!Array.isArray(testCases) || testCases.length < 3) {
      return {
        isValid: false,
        validationStatus: 'VALIDATION_FAILED',
        testResults: [],
        failureReason: `Exactly 3 test cases required (2 visible + 1 hidden). Received: ${testCases?.length || 0}`,
        validatedAt: new Date().toISOString(),
      };
    }

    // 1. Verify Hidden Test Case uniqueness (anti-duplicate check)
    const visible1 = testCases[0];
    const visible2 = testCases[1];
    const hidden3 = testCases[2];

    const normIn1 = normalizeOutput(visible1.input);
    const normIn2 = normalizeOutput(visible2.input);
    const normIn3 = normalizeOutput(hidden3.input);

    if (normIn3 === normIn1 || normIn3 === normIn2) {
      return {
        isValid: false,
        validationStatus: 'VALIDATION_FAILED',
        testResults: [],
        failureReason: 'Hidden Test Case 3 is identical to a visible test case. It must evaluate distinct inputs.',
        validatedAt: new Date().toISOString(),
      };
    }

    // 2. Execute reference solution on judge sandbox
    const judge = await getJudge();
    const results: ValidationTestResult[] = [];
    let allPassed = true;
    let failureReason: string | undefined;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const isHidden = tc.isHidden ?? (i === 2);

      try {
        const execRes = await judge.compileAndRun(
          referenceSolution,
          tc.input,
          2000, // 2.0s time limit
          128   // 128 MB RAM limit
        );

        if (execRes.verdict === Verdict.COMPILE_ERROR) {
          allPassed = false;
          failureReason = `Compilation Error: ${execRes.compileOutput || 'Failed to compile reference solution.'}`;
          results.push({
            testIndex: i + 1,
            isHidden,
            verdict: execRes.verdict,
            passed: false,
            runtimeMs: 0,
            expectedOutput: tc.expectedOutput,
            error: failureReason,
          });
          break; // Stop execution on compilation failure
        }

        const actualNorm = normalizeOutput(execRes.stdout || '');
        const expectedNorm = normalizeOutput(tc.expectedOutput);
        const passed = (execRes.exitCode === 0 || execRes.exitCode === undefined) && actualNorm === expectedNorm;

        if (!passed) {
          allPassed = false;
          if (!failureReason) {
            failureReason = actualNorm !== expectedNorm
              ? `Test Case ${i + 1} (${isHidden ? 'Hidden' : 'Visible'}) output mismatch (expected: "${expectedNorm}", got: "${actualNorm}")`
              : `Test Case ${i + 1} (${isHidden ? 'Hidden' : 'Visible'}) failed with verdict: ${execRes.verdict}`;
          }
        }

        results.push({
          testIndex: i + 1,
          isHidden,
          verdict: passed ? Verdict.ACCEPTED : execRes.verdict,
          passed,
          runtimeMs: execRes.runtimeMs || 0,
          actualOutput: actualNorm,
          expectedOutput: expectedNorm,
          error: passed ? undefined : execRes.stderr || 'Output mismatch',
        });
      } catch (err: any) {
        allPassed = false;
        failureReason = `Sandbox execution error: ${err.message || 'Judge runner crashed.'}`;
        results.push({
          testIndex: i + 1,
          isHidden,
          verdict: 'RUNTIME_ERROR',
          passed: false,
          runtimeMs: 0,
          expectedOutput: tc.expectedOutput,
          error: failureReason,
        });
      }
    }

    const validationStatus = allPassed ? 'VALIDATION_PASSED' : 'VALIDATION_FAILED';

    return {
      isValid: allPassed,
      validationStatus,
      testResults: results,
      failureReason,
      validatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates an existing Problem in the database and updates its validationStatus.
   */
  static async validateProblemById(problemId: string): Promise<QuestionValidationOutcome> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!problem) {
      throw new Error(`Problem with ID ${problemId} not found.`);
    }

    if (!problem.solutionCode) {
      throw new Error(`Problem ${problem.title} has no reference solution code to validate.`);
    }

    const outcome = await this.validateCandidateQuestion(
      problem.solutionCode,
      problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        orderIndex: tc.orderIndex,
      }))
    );

    // Save validation outcome to DB
    await prisma.problem.update({
      where: { id: problemId },
      data: {
        validationStatus: outcome.validationStatus,
        validationDetails: JSON.stringify(outcome),
      },
    });

    return outcome;
  }

  /**
   * Approves a question for inclusion in active assessments (Section 18).
   * Question must have passed validation first.
   */
  static async approveQuestion(problemId: string, facultyId: string) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      throw new Error(`Problem with ID ${problemId} not found.`);
    }

    if (problem.validationStatus !== 'VALIDATION_PASSED' && problem.validationStatus !== 'PUBLISHED') {
      throw new Error(
        `Cannot approve question. Status is "${problem.validationStatus}". Question must pass compilation correctness check first.`
      );
    }

    const updated = await prisma.problem.update({
      where: { id: problemId },
      data: {
        validationStatus: 'FACULTY_APPROVED',
        status: 'PUBLISHED',
      },
    });

    return {
      success: true,
      message: `Question "${updated.title}" successfully approved by faculty.`,
      problem: updated,
    };
  }
}
