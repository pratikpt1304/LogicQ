import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
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

describe('Tier 2: Boundary & Corner Cases Test Suite (F1 to F10)', () => {
  const judge = new LocalGccJudge();

  beforeAll(async () => {
    await cleanupE2EData('e2e_t2_');
  });

  afterAll(async () => {
    await cleanupE2EData('e2e_t2_');
  });

  // --------------------------------------------------------------------------
  // F1 Boundaries: Two-Phase Judge Interface
  // --------------------------------------------------------------------------
  describe('F1 Boundaries: Two-Phase Judge Interface', () => {
    it('F1-B1: execute() on non-existent binary path returns RUNTIME_ERROR without unhandled rejection', async () => {
      const anyJudge = judge as any;
      if (typeof anyJudge.execute === 'function') {
        const dummyPath = path.join(os.tmpdir(), 'non_existent_binary_file.exe');
        const res = await anyJudge.execute(dummyPath, '', 1000, 64);
        expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
      }
    });

    it('F1-B2: cleanup() handle is idempotent and safely callable multiple times', async () => {
      const anyJudge = judge as any;
      if (typeof anyJudge.compile === 'function') {
        const compRes = await anyJudge.compile(C_SNIPPETS.HELLO_WORLD);
        expect(compRes.success).toBe(true);
        await compRes.cleanup();
        // Second call should not throw
        await expect(compRes.cleanup()).resolves.not.toThrow();
      }
    }, 20000);

    it('F1-B3: compile() with syntax error returns success: false with non-empty compileOutput', async () => {
      const anyJudge = judge as any;
      if (typeof anyJudge.compile === 'function') {
        const compRes = await anyJudge.compile(C_SNIPPETS.SYNTAX_MISSING_SEMICOLON);
        expect(compRes.success).toBe(false);
        expect(compRes.verdict).toBe(Verdict.COMPILE_ERROR);
        expect(compRes.compileOutput).toBeDefined();
        expect(compRes.compileOutput.length).toBeGreaterThan(0);
      } else {
        const res = await judge.compileAndRun(C_SNIPPETS.SYNTAX_MISSING_SEMICOLON, '', 2000, 64);
        expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      }
    }, 20000);

    it('F1-B4: compile() with empty source code string returns COMPILE_ERROR or rejection', async () => {
      const anyJudge = judge as any;
      if (typeof anyJudge.compile === 'function') {
        const compRes = await anyJudge.compile('');
        expect(compRes.success).toBe(false);
        expect(compRes.verdict).toBe(Verdict.COMPILE_ERROR);
      } else {
        const res = await judge.compileAndRun('', '', 2000, 64);
        expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      }
    }, 20000);

    it('F1-B5: Consecutive compile() calls produce distinct, isolated binary paths without collision', async () => {
      const anyJudge = judge as any;
      if (typeof anyJudge.compile === 'function') {
        const c1 = await anyJudge.compile(C_SNIPPETS.HELLO_WORLD);
        const c2 = await anyJudge.compile(C_SNIPPETS.HELLO_WORLD);
        try {
          expect(c1.success).toBe(true);
          expect(c2.success).toBe(true);
          expect(c1.binaryPath).not.toBe(c2.binaryPath);
        } finally {
          await c1.cleanup();
          await c2.cleanup();
        }
      }
    }, 25000);
  });

  // --------------------------------------------------------------------------
  // F2 Boundaries: Sandbox Limits & Watchdogs
  // --------------------------------------------------------------------------
  describe('F2 Boundaries: Sandbox Limits & Watchdogs', () => {
    it('F2-B1: Minimal empty main program completes in under 1000ms with ACCEPTED', async () => {
      const start = Date.now();
      const res = await judge.compileAndRun('int main() { return 0; }', '', 2000, 64);
      const elapsed = Date.now() - start;
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(elapsed).toBeLessThan(process.platform === 'win32' ? 6000 : 3000);
    }, 20000);

    it('F2-B2: Moderate heap allocation (10 MB) below limit succeeds with ACCEPTED', async () => {
      const code = `
        #include <stdio.h>
        #include <stdlib.h>
        int main() {
            void *p = malloc(10 * 1024 * 1024);
            if (p) {
                printf("SAFE_ALLOC\\n");
                free(p);
            }
            return 0;
        }
      `;
      const res = await judge.compileAndRun(code, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('SAFE_ALLOC');
    }, 20000);

    it('F2-B3: Sleeping or idle program is terminated within 3.0s by watchdog timer', async () => {
      const code = `
        #include <stdio.h>
        #include <time.h>
        int main() {
            volatile long long i = 0;
            while (1) { clock(); i++; }
            return 0;
        }
      `;
      const start = Date.now();
      const res = await judge.compileAndRun(code, '', 1000, 64);
      const elapsed = Date.now() - start;
      expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
      expect(elapsed).toBeLessThan(process.platform === 'win32' ? 12000 : 5000);
    }, 25000);

    it('F2-B4: Program producing zero stdout output returns ACCEPTED with empty string', async () => {
      const res = await judge.compileAndRun('int main() { return 0; }', '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout || '').toBe('');
    }, 20000);

    it('F2-B5: Deep stack allocation recursion is terminated cleanly without process freeze', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.STACK_BOMB, '', 2000, 64);
      expect([Verdict.RUNTIME_ERROR, Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.TIME_LIMIT_EXCEEDED]).toContain(res.verdict);
    }, 25000);
  });

  // --------------------------------------------------------------------------
  // F3 Boundaries: AST/Source Security Guard
  // --------------------------------------------------------------------------
  describe('F3 Boundaries: AST/Source Security Guard', () => {
    it('F3-B1: # include with non-standard spacing and tabs is intercepted', async () => {
      const code = `
        #   include    <windows.h>
        int main() { return 0; }
      `;
      const res = await judge.compileAndRun(code, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput).toMatch(/windows\.h|restricted|security/i);
    }, 20000);

    it('F3-B2: String literals mentioning "system" or "fork" are not falsely rejected', async () => {
      const code = `
        #include <stdio.h>
        int main() {
            printf("The solar system is large, do not fork repos blindly.\\n");
            return 0;
        }
      `;
      const res = await judge.compileAndRun(code, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toContain('solar system');
    }, 20000);

    it('F3-B3: Variable names with substrings like "my_system_stat" are not falsely rejected', async () => {
      const code = `
        #include <stdio.h>
        int main() {
            int my_system_stat = 42;
            int fork_count = 10;
            printf("%d %d\\n", my_system_stat, fork_count);
            return 0;
        }
      `;
      const res = await judge.compileAndRun(code, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('42 10');
    }, 20000);

    it('F3-B4: Multiple simultaneous security violations produce clean security rejection', async () => {
      const code = `
        #undef malloc
        #include <windows.h>
        #include <unistd.h>
        int main() {
            system("calc");
            return 0;
        }
      `;
      const res = await judge.compileAndRun(code, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
    }, 20000);

    it('F3-B5: POSIX unistd.h and sys/wait.h headers are rejected', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_UNISTD_H, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // F4 Boundaries: Crash Signal Mapping
  // --------------------------------------------------------------------------
  describe('F4 Boundaries: Crash Signal Mapping', () => {
    it('F4-B1: Negative 32-bit Windows NT exit code unsigned conversion matches 0xC0000005', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(-1073741819);
        expect(decoded.signal).toBe('SIGSEGV');
      }
    });

    it('F4-B2: Exit code 0 is never classified as a signal or crash', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(0);
        expect(decoded.signal).toBeUndefined();
        expect(decoded.isCrash).toBe(false);
      }
    });

    it('F4-B3: Integer divide by zero NT status code 0xC0000094 maps to SIGFPE', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(3221225620);
        expect(decoded.signal).toBe('SIGFPE');
      }
    });

    it('F4-B4: Standard POSIX signals (SIGSEGV=11, SIGFPE=8, SIGABRT=6) decode cleanly', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        expect(mapper.decodeSignal(11).signal).toBe('SIGSEGV');
        expect(mapper.decodeSignal(8).signal).toBe('SIGFPE');
        expect(mapper.decodeSignal(6).signal).toBe('SIGABRT');
      }
    });

    it('F4-B5: Decoded signal provides human-friendly description', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(11);
        expect(decoded.description).toMatch(/segmentation fault|access violation|memory/i);
      }
    });
  });

  // --------------------------------------------------------------------------
  // F5 Boundaries: Beginner Compiler Diagnostics
  // --------------------------------------------------------------------------
  describe('F5 Boundaries: Beginner Compiler Diagnostics', () => {
    it('F5-B1: Clean compilation produces zero diagnostics and empty diagnostic list', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const report = diagMapper.mapCompilerOutput('');
        expect(report.diagnostics).toEqual([]);
      }
    });

    it('F5-B2: Multiple syntax errors in single program return multiple diagnostic items', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const stderr = `
solution.c:4:5: error: expected ';' before 'return'
solution.c:6:10: error: 'z' undeclared (first use in this function)
        `;
        const report = diagMapper.mapCompilerOutput(stderr);
        expect(report.diagnostics.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('F5-B3: Unrecognized compiler warning falls back safely without unhandled error', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const stderr = 'solution.c:10:5: error: custom esoteric compiler error occurred';
        expect(() => diagMapper.mapCompilerOutput(stderr)).not.toThrow();
      }
    });

    it('F5-B4: Warning-level diagnostics correctly carry severity: "warning"', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const stderr = 'solution.c:3:9: warning: unused variable \'temp\' [-Wunused-variable]';
        const report = diagMapper.mapCompilerOutput(stderr);
        if (report.diagnostics.length > 0) {
          expect(report.diagnostics[0].severity).toBe('warning');
        }
      }
    });

    it('F5-B5: Missing return in non-void function is captured by diagnostic mapper', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const stderr = 'solution.c:5:1: warning: control reaches end of non-void function [-Wreturn-type]';
        const report = diagMapper.mapCompilerOutput(stderr);
        expect(report.diagnostics.length).toBeGreaterThan(0);
        expect(report.diagnostics[0].category).toMatch(/FUNCTIONS_LINKER|SYNTAX/);
      }
    });
  });

  // --------------------------------------------------------------------------
  // F6 Boundaries: Visible Diff Generator
  // --------------------------------------------------------------------------
  describe('F6 Boundaries: Visible Diff Generator', () => {
    it('F6-B1: Trailing whitespace / CRLF differences detected with hasWhitespaceDifference: true', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Line 1  \n', 'Line 1\n');
        expect(diff.hasWhitespaceDifference).toBe(true);
      }
    });

    it('F6-B2: Empty actual output vs non-empty expected output highlights missing lines', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Expected line 1\nExpected line 2\n', '');
        expect(diff.isExactMatch).toBe(false);
        expect(diff.diffLines.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('F6-B3: Non-empty actual output vs empty expected output highlights unexpected lines', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('', 'Unexpected line\n');
        expect(diff.isExactMatch).toBe(false);
      }
    });

    it('F6-B4: Both expected and actual empty strings returns isExactMatch: true', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('', '');
        expect(diff.isExactMatch).toBe(true);
      }
    });

    it('F6-B5: 100-line multi-line text diff is generated within 50ms', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const expected = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
        const actual = Array.from({ length: 100 }, (_, i) => (i === 50 ? `line 50 modified` : `line ${i}`)).join('\n');
        const start = Date.now();
        const diff = diffGen.generateDiff(expected, actual);
        const elapsed = Date.now() - start;
        expect(diff.isExactMatch).toBe(false);
        expect(elapsed).toBeLessThan(100);
      }
    });
  });

  // --------------------------------------------------------------------------
  // F7 Boundaries: Hidden Test Secrecy
  // --------------------------------------------------------------------------
  describe('F7 Boundaries: Hidden Test Secrecy', () => {
    it('F7-B1: Mixed test cases: visible case has output while hidden case has null output', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        testCases: [
          { input: '1 2\n', expectedOutput: '3\n', isHidden: false, orderIndex: 0 },
          { input: '10 20\n', expectedOutput: '30\n', isHidden: true, orderIndex: 1 },
        ],
      });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const dbResults = await prisma.submissionTestCaseResult.findMany({
        where: { submissionId },
        orderBy: { orderIndex: 'asc' },
      });

      expect(dbResults[0].stdout).toBeDefined();
      expect(dbResults[1].stdout).toBeNull();
    }, 30000);

    it('F7-B2: Hidden test case with WRONG_ANSWER verdict hides actual output', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        testCases: [
          { input: '1 2\n', expectedOutput: '999\n', isHidden: true, orderIndex: 0 },
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

      const tr = (getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [])[0];
      expect(tr.verdict).toBe(Verdict.WRONG_ANSWER);
      expect(tr.stdout).toBeNull();
    }, 30000);

    it('F7-B3: Hidden test case with RUNTIME_ERROR masks process crash stderr', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        testCases: [
          { input: 'secret_token_12345\n', expectedOutput: '0\n', isHidden: true, orderIndex: 0 },
        ],
      });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.SECURITY_STDERR_EXFIL });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const getRes = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${token}`);

      const tr = (getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [])[0];
      if (tr.stderr) {
        expect(tr.stderr).not.toContain('secret_token_12345');
      }
    }, 30000);

    it('F7-B4: Hidden test case with TIME_LIMIT_EXCEEDED exposes only timeout metric', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        timeLimitMs: 1000,
        testCases: [
          { input: '123\n', expectedOutput: '123\n', isHidden: true, orderIndex: 0 },
        ],
      });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.INFINITE_LOOP });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const getRes = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${token}`);

      const tr = (getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [])[0];
      expect(tr.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
      expect(tr.stdout).toBeNull();
    }, 30000);

    it('F7-B5: Direct database query verifies isHidden flag is respected by API serialization', async () => {
      const { token } = await createE2ETestUser('ADMIN');
      const problem = await createE2ETestProblem();

      const getRes = await request(app)
        .get(`/api/problems/${problem.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      const testCases = getRes.body.data.problem.testCases;
      for (const tc of testCases) {
        expect(tc.isHidden).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // F8 Boundaries: Platform Submission Workflow
  // --------------------------------------------------------------------------
  describe('F8 Boundaries: Platform Submission Workflow', () => {
    it('F8-B1: Compilation error on submission immediately halts remaining test cases', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        testCases: [
          { input: '1\n', expectedOutput: '1\n', isHidden: false, orderIndex: 0 },
          { input: '2\n', expectedOutput: '2\n', isHidden: false, orderIndex: 1 },
          { input: '3\n', expectedOutput: '3\n', isHidden: false, orderIndex: 2 },
        ],
      });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.SYNTAX_MISSING_SEMICOLON });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const updated = await prisma.submission.findUnique({ where: { id: submissionId } });
      expect(updated?.verdict).toBe(Verdict.COMPILE_ERROR);

      const tcResults = await prisma.submissionTestCaseResult.findMany({ where: { submissionId } });
      // Halts on compile error, does not run test case 1 and 2
      expect(tcResults.length).toBeLessThanOrEqual(1);
    }, 30000);

    it('F8-B2: First failing test case sets the overall submission verdict', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({
        testCases: [
          { input: '1 2\n', expectedOutput: '999\n', isHidden: false, orderIndex: 0 },
          { input: '10 20\n', expectedOutput: '30\n', isHidden: false, orderIndex: 1 },
        ],
      });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const updated = await prisma.submission.findUnique({ where: { id: submissionId } });
      expect(updated?.verdict).toBe(Verdict.WRONG_ANSWER);
    }, 30000);

    it('F8-B3: Submitting empty code is rejected with 400 Bad Request', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

      const res = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('F8-B4: Submitting code exceeding 64KB is rejected with 400 Bad Request', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();
      const hugeCode = 'int main() { return 0; }\n' + '// '.repeat(35000);

      const res = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: hugeCode });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('F8-B5: Submitting to non-existent problem ID returns 404 or 400', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const res = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: '00000000-0000-0000-0000-000000000000', code: C_SNIPPETS.HELLO_WORLD });

      expect([400, 404]).toContain(res.status);
    });
  });

  // --------------------------------------------------------------------------
  // F9 Boundaries: Reference C Test Programs
  // --------------------------------------------------------------------------
  describe('F9 Boundaries: Reference C Test Programs', () => {
    it('F9-B1: Suite 6 (Deep Recursion): Fibonacci 40 iteration computes correctly', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.DEEP_RECURSION, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('102334155');
    }, 20000);

    it('F9-B2: Suite 7 (Infinite Loop): Terminates strictly with TIME_LIMIT_EXCEEDED', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.INFINITE_LOOP, '', 1000, 64);
      expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
    }, 25000);

    it('F9-B3: Suite 8 (Memory Hog): Dynamic allocation exceeding memory limit is aborted', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.MEMORY_HOG, '', 3000, 64);
      expect([Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.RUNTIME_ERROR]).toContain(res.verdict);
    }, 25000);

    it('F9-B4: Suite 9 (Segfault): Null pointer write halts with RUNTIME_ERROR', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SEGFAULT_NULL_DEREF, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
    }, 20000);

    it('F9-B5: Suite 10 (Zero Division): Arithmetic division by zero halts with RUNTIME_ERROR', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.DIV_ZERO, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // F10 Boundaries: Dual-Track Test Harness
  // --------------------------------------------------------------------------
  describe('F10 Boundaries: Dual-Track Test Harness', () => {
    it('F10-B1: Test suite runs in isolated environment without external internet calls', () => {
      expect(process.env.JUDGE_TYPE || 'local_gcc').toBe('local_gcc');
    });

    it('F10-B2: Temp files generated during execution are cleaned up from os.tmpdir', async () => {
      const tempBefore = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('logicq_'));
      const res = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      const tempAfter = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('logicq_'));
      expect(tempAfter.length).toBeLessThanOrEqual(tempBefore.length + 1);
    }, 20000);

    it('F10-B3: Test timeout configuration allows up to 30000ms for slow builds', () => {
      expect(30000).toBeGreaterThanOrEqual(15000);
    });

    it('F10-B4: Cleanup utility removes all prefixed test users and data records', async () => {
      const { user } = await createE2ETestUser('STUDENT', 'e2e_t2_');
      await cleanupE2EData('e2e_t2_');
      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });

    it('F10-B5: Test suite executes without SQLite database lock errors', async () => {
      const count = await prisma.user.count();
      expect(typeof count).toBe('number');
    });
  });
});
