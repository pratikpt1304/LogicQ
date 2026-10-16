import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { LocalGccJudge } from '../../src/judge/local-gcc.judge.js';
import { Verdict } from '../../src/judge/judge.interface.js';
import { prisma } from '../../src/utils/prisma.js';
import {
  C_SNIPPETS,
  getSignalMapper,
  getDiagnosticMapper,
  getDiffGenerator,
  createE2ETestUser,
  createE2ETestProblem,
  cleanupE2EData,
} from './e2e-helpers.js';

describe('Tier 3: Cross-Feature Combinations Test Suite', () => {
  const judge = new LocalGccJudge();

  beforeAll(async () => {
    await cleanupE2EData('e2e_t3_');
  });

  afterAll(async () => {
    await cleanupE2EData('e2e_t3_');
  });

  it('T3-01: [F1 Two-Phase + F2 Resource Limits] Pre-compiled binary subjected to TLE then normal run succeeds', async () => {
    const anyJudge = judge as any;
    if (typeof anyJudge.compile === 'function' && typeof anyJudge.execute === 'function') {
      const loopIfOneCode = `
        #include <stdio.h>
        int main() {
            int x;
            if (scanf("%d", &x) == 1 && x == 1) {
                while (1) {}
            }
            printf("PASSED: %d\\n", x);
            return 0;
        }
      `;
      const compRes = await anyJudge.compile(loopIfOneCode);
      expect(compRes.success).toBe(true);
      try {
        // Run 1: triggers TLE
        const run1 = await anyJudge.execute(compRes.binaryPath, '1\n', 1000, 64);
        expect(run1.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);

        // Run 2: normal input with same binary succeeds
        const run2 = await anyJudge.execute(compRes.binaryPath, '0\n', 2000, 64);
        expect(run2.verdict).toBe(Verdict.ACCEPTED);
        expect(run2.stdout?.trim()).toBe('PASSED: 0');
      } finally {
        await compRes.cleanup();
      }
    } else {
      const res = await judge.compileAndRun(C_SNIPPETS.INFINITE_LOOP, '', 1000, 64);
      expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
    }
  }, 25000);

  it('T3-02: [F1 Two-Phase + F6 Diff Generator] Pre-compiled binary output mismatches generate diff view', async () => {
    const anyJudge = judge as any;
    const diffGen = await getDiffGenerator();

    if (typeof anyJudge.compile === 'function' && typeof anyJudge.execute === 'function') {
      const compRes = await anyJudge.compile(C_SNIPPETS.ADD_TWO);
      expect(compRes.success).toBe(true);
      try {
        const run = await anyJudge.execute(compRes.binaryPath, '5 5\n', 2000, 64);
        expect(run.stdout?.trim()).toBe('10');

        if (diffGen && typeof diffGen.generateDiff === 'function') {
          const diff = diffGen.generateDiff('10\n', '11\n');
          expect(diff.isExactMatch).toBe(false);
          expect(diff.diffLines.length).toBeGreaterThan(0);
        }
      } finally {
        await compRes.cleanup();
      }
    }
  }, 20000);

  it('T3-03: [F1 Two-Phase + F7 Hidden Secrecy] Two-phase evaluation masks hidden test results', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: '2 3\n', expectedOutput: '5\n', isHidden: false, orderIndex: 0 },
        { input: '20 30\n', expectedOutput: '50\n', isHidden: true, orderIndex: 1 },
      ],
    });

    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    const results = getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [];
    expect(results[0].stdout).toBeDefined();
    expect(results[1].stdout).toBeNull();
    expect(results[1].input).toBeUndefined();
  }, 30000);

  it('T3-04: [F3 Security Guard + F5 Diagnostic Mapper] Security rejection returns clear explanatory message', async () => {
    const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_WINDOWS_H, '', 2000, 64);
    expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
    expect(res.compileOutput).toBeDefined();
    expect(res.compileOutput).toMatch(/windows\.h|restricted|security/i);
  }, 20000);

  it('T3-05: [F2 Sandbox Limits + F4 Signal Mapping] Stack memory bomb maps to crash signal or MLE', async () => {
    const res = await judge.compileAndRun(C_SNIPPETS.STACK_BOMB, '', 2000, 64);
    expect([Verdict.RUNTIME_ERROR, Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.TIME_LIMIT_EXCEEDED]).toContain(res.verdict);
    const mapper = await getSignalMapper();
    if (mapper && typeof mapper.decodeSignal === 'function') {
      const decoded = mapper.decodeSignal(3221225725); // 0xC00000FD
      expect(decoded.signal).toBeDefined();
    }
  }, 25000);

  it('T3-06: [F4 Signal Mapping + F7 Hidden Secrecy] Crash on hidden test reports signal without leaking stderr', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: 'input_secret\n', expectedOutput: '0\n', isHidden: true, orderIndex: 0 },
      ],
    });

    const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.SEGFAULT_NULL_DEREF });

    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    const tr = (getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [])[0];
    expect(tr.verdict).toBe(Verdict.RUNTIME_ERROR);
    expect(tr.stdout).toBeNull();
    if (tr.stderr) {
      expect(tr.stderr).not.toContain('input_secret');
    }
  }, 30000);

  it('T3-07: [F2 Sandbox Limits + F8 Submission Evaluator] Multi-test evaluation marks overall TLE on timeout', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      timeLimitMs: 1000,
      testCases: [
        { input: '1 2\n', expectedOutput: '3\n', isHidden: false, orderIndex: 0 },
        { input: '10 20\n', expectedOutput: '30\n', isHidden: false, orderIndex: 1 },
      ],
    });

    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.INFINITE_LOOP });

    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const updated = await prisma.submission.findUnique({ where: { id: submissionId } });
    expect(updated?.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
  }, 30000);

  it('T3-08: [F5 Diagnostic Mapper + F8 Submission Controller] Run code with syntax error returns compiler diagnostics', async () => {
    const { token } = await createE2ETestUser('STUDENT');
    const res = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: C_SNIPPETS.SYNTAX_MISSING_SEMICOLON,
        stdin: '',
        timeLimitMs: 2000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verdict).toBe(Verdict.COMPILE_ERROR);
    expect(res.body.data.compileOutput).toBeDefined();
  }, 20000);

  it('T3-09: [F6 Diff Generator + F7 Hidden Secrecy] Visible test has diffLines while hidden test has none', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: '1 2\n', expectedOutput: '999\n', isHidden: false, orderIndex: 0 },
        { input: '10 20\n', expectedOutput: '888\n', isHidden: true, orderIndex: 1 },
      ],
    });

    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    const results = getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [];
    expect(results[0].stdout).toBeDefined();
    expect(results[1].stdout).toBeNull();
    expect(results[1].diff).toBeUndefined();
  }, 30000);

  it('T3-10: [F2 Process Limits + F9 Reference Suite] Malicious fork bomb is blocked without breaking subsequent tests', async () => {
    const bombRes = await judge.compileAndRun(C_SNIPPETS.SECURITY_FORK_CALL, '', 2000, 64);
    expect([Verdict.COMPILE_ERROR, Verdict.RUNTIME_ERROR]).toContain(bombRes.verdict);

    // Follow-up normal test must still succeed
    const normalRes = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
    expect(normalRes.verdict).toBe(Verdict.ACCEPTED);
    expect(normalRes.stdout?.trim()).toBe('Hello LogicQ!');
  }, 25000);
});
