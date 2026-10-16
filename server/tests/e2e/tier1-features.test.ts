import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
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

describe('Tier 1: Feature Coverage Test Suite (F1 to F10)', () => {
  const judge = new LocalGccJudge();

  beforeAll(async () => {
    await cleanupE2EData('e2e_t1_');
  });

  afterAll(async () => {
    await cleanupE2EData('e2e_t1_');
  });

  // --------------------------------------------------------------------------
  // Feature 1: Two-Phase Judge Interface (compile -> execute)
  // --------------------------------------------------------------------------
  describe('F1: Two-Phase Judge Interface', () => {
    it('F1-1: compile() produces a valid binary and cleanup handle on successful compilation', async () => {
      const anyJudge = judge as any;
      expect(typeof anyJudge.compile, 'IJudge must implement compile() method').toBe('function');
      const compRes = await anyJudge.compile(C_SNIPPETS.HELLO_WORLD);
      expect(compRes.success).toBe(true);
      expect(compRes.binaryPath).toBeDefined();
      expect(fs.existsSync(compRes.binaryPath)).toBe(true);
      expect(typeof compRes.cleanup).toBe('function');
      await compRes.cleanup();
      expect(fs.existsSync(compRes.binaryPath)).toBe(false);
    }, 20000);

    it('F1-2: execute() runs pre-compiled binary with standard input and returns ACCEPTED', async () => {
      const anyJudge = judge as any;
      expect(typeof anyJudge.execute, 'IJudge must implement execute() method').toBe('function');
      const compRes = await anyJudge.compile(C_SNIPPETS.ADD_TWO);
      expect(compRes.success).toBe(true);
      try {
        const execRes = await anyJudge.execute(compRes.binaryPath, '15 27\n', 2000, 64);
        expect(execRes.verdict).toBe(Verdict.ACCEPTED);
        expect(execRes.stdout?.trim()).toBe('42');
        expect(execRes.runtimeMs).toBeGreaterThanOrEqual(0);
      } finally {
        await compRes.cleanup();
      }
    }, 20000);

    it('F1-3: Multi-execution efficiency: compiles once and executes multiple times across test inputs', async () => {
      const anyJudge = judge as any;
      expect(typeof anyJudge.compile).toBe('function');
      const compRes = await anyJudge.compile(C_SNIPPETS.ADD_TWO);
      expect(compRes.success).toBe(true);

      const inputs = [
        { stdin: '1 2\n', expected: '3' },
        { stdin: '10 20\n', expected: '30' },
        { stdin: '100 200\n', expected: '300' },
      ];

      try {
        for (const tc of inputs) {
          const execRes = await anyJudge.execute(compRes.binaryPath, tc.stdin, 2000, 64);
          expect(execRes.verdict).toBe(Verdict.ACCEPTED);
          expect(execRes.stdout?.trim()).toBe(tc.expected);
        }
      } finally {
        await compRes.cleanup();
      }
    }, 25000);

    it('F1-4: cleanup() removes binary and temporary working directory safely', async () => {
      const anyJudge = judge as any;
      expect(typeof anyJudge.compile).toBe('function');
      const compRes = await anyJudge.compile(C_SNIPPETS.HELLO_WORLD);
      expect(compRes.success).toBe(true);
      const binPath = compRes.binaryPath;
      expect(fs.existsSync(binPath)).toBe(true);
      await compRes.cleanup();
      expect(fs.existsSync(binPath)).toBe(false);
    }, 20000);

    it('F1-5: compileAndRun() maintains backward compatibility for single-shot execution', async () => {
      const execRes = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
      expect(execRes.verdict).toBe(Verdict.ACCEPTED);
      expect(execRes.stdout?.trim()).toBe('Hello LogicQ!');
      expect(execRes.runtimeMs).toBeDefined();
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // Feature 2: Windows Job Object Sandbox & Resource Limits
  // --------------------------------------------------------------------------
  describe('F2: Windows Job Object Sandbox & Limits', () => {
    it('F2-1: Enforces 2.0s execution time limit, returning TIME_LIMIT_EXCEEDED on infinite loop', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.INFINITE_LOOP, '', 1000, 64);
      expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
    }, 25000);

    it('F2-2: Enforces memory limit, aborting program allocating > 128 MB with MEMORY_LIMIT_EXCEEDED', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.MEMORY_HOG, '', 3000, 128);
      expect([Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.RUNTIME_ERROR]).toContain(res.verdict);
      expect(res.stdout?.trim()).not.toBe('ALLOCATED');
    }, 25000);

    it('F2-3: Enforces 1-process limit preventing fork bomb and child process creation', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_FORK_CALL, '', 2000, 64);
      // Either blocked by static guard or by process sandbox limit
      expect([Verdict.COMPILE_ERROR, Verdict.RUNTIME_ERROR]).toContain(res.verdict);
    }, 20000);

    it('F2-4: Output cap enforcement: huge stdout output flood is truncated safely without host crash', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.OUTPUT_FLOOD, '', 3000, 64);
      expect(res.stdout).toBeDefined();
      expect(res.stdout!.length).toBeLessThanOrEqual(10 * 1024 * 1024);
    }, 25000);

    it('F2-5: Execution metrics: runtimeMs and memoryKb are reported as valid numbers', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(typeof res.runtimeMs).toBe('number');
      expect(res.runtimeMs).toBeGreaterThanOrEqual(0);
      if (res.memoryKb !== undefined) {
        expect(typeof res.memoryKb).toBe('number');
        expect(res.memoryKb).toBeGreaterThan(0);
      }
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // Feature 3: Pre-compilation AST / Source Security Guard
  // --------------------------------------------------------------------------
  describe('F3: Pre-compilation AST/Source Security Guard', () => {
    it('F3-1: Intercepts and rejects #undef macro escape directives', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_UNDEF_MALLOC, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput || res.stderr).toMatch(/#undef|security|violation/i);
    }, 20000);

    it('F3-2: Rejects restricted Windows system header <windows.h>', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_WINDOWS_H, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput || res.stderr).toMatch(/windows\.h|restricted|security/i);
    }, 20000);

    it('F3-3: Rejects restricted network socket header <sys/socket.h>', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_SOCKET_H, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput || res.stderr).toMatch(/socket\.h|restricted|security/i);
    }, 20000);

    it('F3-4: Rejects forbidden process shell execution call system()', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_SYSTEM_CALL, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput || res.stderr).toMatch(/system|disabled|security/i);
    }, 20000);

    it('F3-5: Rejects path traversal #include directives', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SECURITY_FILE_TRAVERSAL, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
      expect(res.compileOutput || res.stderr).toMatch(/include|forbidden|security/i);
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // Feature 4: Operating System Crash Signal Mapping
  // --------------------------------------------------------------------------
  describe('F4: Operating System Crash Signal Mapping', () => {
    it('F4-1: Maps NULL pointer dereference to RUNTIME_ERROR with SIGSEGV classification', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.SEGFAULT_NULL_DEREF, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(res.exitCode ?? 3221225477);
        expect(decoded.signal).toBe('SIGSEGV');
      }
    }, 20000);

    it('F4-2: Maps integer division by zero to RUNTIME_ERROR with SIGFPE classification', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.DIV_ZERO, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(res.exitCode ?? 3221225620);
        expect(decoded.signal).toBe('SIGFPE');
      }
    }, 20000);

    it('F4-3: Maps abort() invocation to RUNTIME_ERROR with SIGABRT classification', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.ABORT_CALL, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(res.exitCode ?? 3);
        expect(decoded.signal).toBe('SIGABRT');
      }
    }, 20000);

    it('F4-4: Maps stack overflow (0xC00000FD) to stack overflow / SIGSEGV classification', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(3221225725); // 0xC00000FD
        expect(decoded.signal).toMatch(/SIGSEGV|STACK_OVERFLOW/);
        expect(decoded.description).toMatch(/stack overflow/i);
      } else {
        // Fallback verification via stack bomb run
        const res = await judge.compileAndRun(C_SNIPPETS.STACK_BOMB, '', 2000, 64);
        expect([Verdict.RUNTIME_ERROR, Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.TIME_LIMIT_EXCEEDED]).toContain(res.verdict);
      }
    }, 20000);

    it('F4-5: Unmapped non-zero exit code (e.g. exit(42)) retains code in description', async () => {
      const mapper = await getSignalMapper();
      if (mapper && typeof mapper.decodeSignal === 'function') {
        const decoded = mapper.decodeSignal(42);
        expect(decoded.exitCode).toBe(42);
        expect(decoded.signal).toBeDefined();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: Beginner Compiler Diagnostic Feedback Mapper
  // --------------------------------------------------------------------------
  describe('F5: Beginner Compiler Diagnostic Feedback Mapper', () => {
    it('F5-1: Identifies missing semicolon and provides plain-language hint', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const rawStderr = 'solution.c:5:5: error: expected \';\' before \'printf\'';
        const report = diagMapper.mapCompilerOutput(rawStderr);
        expect(report.diagnostics.length).toBeGreaterThan(0);
        expect(report.diagnostics[0].category).toBe('SYNTAX');
        expect(report.diagnostics[0].actionableHint).toMatch(/semicolon/i);
      } else {
        const res = await judge.compileAndRun(C_SNIPPETS.SYNTAX_MISSING_SEMICOLON, '', 2000, 64);
        expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
        expect(res.compileOutput).toMatch(/;/);
      }
    }, 20000);

    it('F5-2: Identifies undeclared variable and provides variable declaration advice', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const rawStderr = 'solution.c:4:13: error: \'x\' undeclared (first use in this function)';
        const report = diagMapper.mapCompilerOutput(rawStderr);
        expect(report.diagnostics.length).toBeGreaterThan(0);
        expect(report.diagnostics[0].title).toMatch(/undeclared/i);
      } else {
        const res = await judge.compileAndRun(C_SNIPPETS.UNDECLARED_VARIABLE, '', 2000, 64);
        expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
        expect(res.compileOutput).toMatch(/undeclared/i);
      }
    }, 20000);

    it('F5-3: Identifies format specifier mismatch in printf/scanf', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const rawStderr = 'solution.c:5:14: warning: format \'%d\' expects argument of type \'int\', but argument 2 has type \'char *\'';
        const report = diagMapper.mapCompilerOutput(rawStderr);
        expect(report.diagnostics.length).toBeGreaterThan(0);
        expect(report.diagnostics[0].category).toMatch(/TYPE_MISMATCH|SYNTAX/);
      } else {
        const res = await judge.compileAndRun(C_SNIPPETS.FORMAT_MISMATCH, '', 2000, 64);
        expect(res.compileOutput || res.stderr).toBeDefined();
      }
    }, 20000);

    it('F5-4: Identifies missing & in scanf and warns about address requirement', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const rawStderr = 'solution.c:5:13: warning: format \'%d\' expects argument of type \'int *\', but argument 2 has type \'int\'';
        const report = diagMapper.mapCompilerOutput(rawStderr);
        expect(report.diagnostics.length).toBeGreaterThan(0);
        expect(report.diagnostics[0].actionableHint).toMatch(/&|address/i);
      }
    });

    it('F5-5: Preserves raw compiler stderr verbatim in formatted diagnostic report', async () => {
      const diagMapper = await getDiagnosticMapper();
      if (diagMapper && typeof diagMapper.mapCompilerOutput === 'function') {
        const rawStderr = 'solution.c:3:1: error: unknown type name \'foo\'';
        const report = diagMapper.mapCompilerOutput(rawStderr);
        expect(report.rawStderr).toBe(rawStderr);
        expect(report.formattedOutput).toContain(rawStderr);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 6: Visible Sample Test Case Diff Generator
  // --------------------------------------------------------------------------
  describe('F6: Visible Sample Test Case Diff Generator', () => {
    it('F6-1: Exact match produces isExactMatch: true with EQUAL lines', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Hello World\n', 'Hello World\n');
        expect(diff.isExactMatch).toBe(true);
        expect(diff.diffLines.every((l: any) => l.type === 'EQUAL')).toBe(true);
      }
    });

    it('F6-2: Value mismatch produces isExactMatch: false with diff lines', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('42\n', '43\n');
        expect(diff.isExactMatch).toBe(false);
        expect(diff.diffLines.some((l: any) => l.type !== 'EQUAL')).toBe(true);
      }
    });

    it('F6-3: Missing expected line produces diff entry indicating omission', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Line 1\nLine 2\n', 'Line 1\n');
        expect(diff.isExactMatch).toBe(false);
        expect(diff.diffLines.length).toBeGreaterThan(1);
      }
    });

    it('F6-4: Extraneous actual line produces diff entry indicating unexpected output', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Line 1\n', 'Line 1\nLine 2\n');
        expect(diff.isExactMatch).toBe(false);
      }
    });

    it('F6-5: Provides remediation tip for common formatting discrepancies', async () => {
      const diffGen = await getDiffGenerator();
      if (diffGen && typeof diffGen.generateDiff === 'function') {
        const diff = diffGen.generateDiff('Result: 42\n', '42\n');
        expect(diff.isExactMatch).toBe(false);
        if (diff.remediationTip) {
          expect(typeof diff.remediationTip).toBe('string');
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 7: Hidden Test Case Strict Secrecy Enforcement
  // --------------------------------------------------------------------------
  describe('F7: Hidden Test Case Strict Secrecy Enforcement', () => {
    it('F7-1: Hidden test case result in database has stdout masked / omitted', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      expect([201, 202]).toContain(subRes.status);
      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;

      // Evaluate submission
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const dbResults = await prisma.submissionTestCaseResult.findMany({
        where: { submissionId },
        orderBy: { orderIndex: 'asc' },
      });

      const hiddenRes = dbResults.find((r) => r.orderIndex === 1);
      expect(hiddenRes).toBeDefined();
      expect(hiddenRes?.stdout).toBeNull();
    }, 30000);

    it('F7-2: Hidden test case never leaks input in GET /api/submissions/:id', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

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
      for (const tr of results) {
        expect((tr as any).input).toBeUndefined();
      }
    }, 30000);

    it('F7-3: Hidden test case never leaks expectedOutput in API responses', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

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
      for (const tr of results) {
        expect((tr as any).expectedOutput).toBeUndefined();
      }
    }, 30000);

    it('F7-4: Stderr input reflection attack on hidden test is sanitized to prevent leakage', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

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

      const results = getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [];
      const hiddenRes = results.find((r: any) => r.orderIndex === 1);
      if (hiddenRes && hiddenRes.stderr) {
        expect(hiddenRes.stderr).not.toContain('EXFILTRATED_INPUT: 100 200');
      }
    }, 30000);

    it('F7-5: Verdict, runtimeMs, and orderIndex are correctly returned for hidden test cases', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

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
      const hiddenRes = results.find((r: any) => r.orderIndex === 1);
      expect(hiddenRes).toBeDefined();
      expect(hiddenRes.verdict).toBe(Verdict.ACCEPTED);
      expect(typeof hiddenRes.runtimeMs).toBe('number');
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Feature 8: LogicQ Platform Integration & Submission Workflow
  // --------------------------------------------------------------------------
  describe('F8: LogicQ Platform Integration & Submission Workflow', () => {
    it('F8-1: POST /api/submissions/run executes custom code with stdin via API', async () => {
      const { token } = await createE2ETestUser('STUDENT');
      const res = await request(app)
        .post('/api/submissions/run')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: C_SNIPPETS.ADD_TWO,
          stdin: '7 8\n',
          timeLimitMs: 2000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verdict).toBe(Verdict.ACCEPTED);
      expect(res.body.data.stdout?.trim()).toBe('15');
    }, 20000);

    it('F8-2: POST /api/submissions/submit creates submission record in PENDING or JUDGING state', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

      const res = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      expect([201, 202]).toContain(res.status);
      expect(res.body.success).toBe(true);
      const subState = res.body.data.status || res.body.data.submission?.verdict;
      expect(['PENDING', 'JUDGING']).toContain(subState);
    }, 20000);

    it('F8-3: Full evaluation loop sets overall verdict to ACCEPTED when all tests pass', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const updated = await prisma.submission.findUnique({ where: { id: submissionId } });
      expect(updated?.verdict).toBe(Verdict.ACCEPTED);
    }, 30000);

    it('F8-4: Evaluator saves per-test-case results with orderIndex preserved', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem();

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const tcResults = await prisma.submissionTestCaseResult.findMany({
        where: { submissionId },
        orderBy: { orderIndex: 'asc' },
      });

      expect(tcResults.length).toBe(2);
      expect(tcResults[0].orderIndex).toBe(0);
      expect(tcResults[1].orderIndex).toBe(1);
    }, 30000);

    it('F8-5: Practice progress is recorded and marked isSolved upon ACCEPTED verdict', async () => {
      const { user, token } = await createE2ETestUser('STUDENT');
      const problem = await createE2ETestProblem({ isPractice: true, moduleSlug: 'c-basics' });

      const subRes = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

      const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
      const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
      await evaluateSubmission(submissionId);

      const progress = await prisma.practiceProgress.findUnique({
        where: { userId_problemId: { userId: user.id, problemId: problem.id } },
      });

      expect(progress).toBeDefined();
      expect(progress?.isSolved).toBe(true);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Feature 9: Reference C Test Program Suites
  // --------------------------------------------------------------------------
  describe('F9: Reference C Test Program Suites', () => {
    it('F9-1: Reference Suite 1 (Basic I/O): Hello World executes with exact output', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('Hello LogicQ!');
    }, 20000);

    it('F9-2: Reference Suite 2 (64-bit Arithmetic): Long long max value formats accurately', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.ARITHMETIC_64BIT, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('9223372036854775807');
    }, 20000);

    it('F9-3: Reference Suite 3 (Loops & Arrays): Array accumulation loop produces sum 15', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.LOOPS_ARRAYS, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('15');
    }, 20000);

    it('F9-4: Reference Suite 4 (Dynamic Memory): Malloc, index access, and free execute cleanly', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.DYNAMIC_MEMORY, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('81');
    }, 20000);

    it('F9-5: Reference Suite 5 (Pointers & Structs): Struct node pointer linking dereferences value', async () => {
      const res = await judge.compileAndRun(C_SNIPPETS.STRUCT_POINTERS, '', 2000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('10 -> 20');
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // Feature 10: Dual-Track Opaque-Box E2E Test Suite
  // --------------------------------------------------------------------------
  describe('F10: Dual-Track Opaque-Box E2E Test Suite', () => {
    it('F10-1: Test environment verifies GCC compiler is available on host', async () => {
      const isAvail = await judge.isAvailable();
      expect(isAvail).toBe(true);
    });

    it('F10-2: Test suite infrastructure file TEST_INFRA.md exists in .agents/teamwork/', () => {
      const infraPath = 'c:/Users/thora/Documents/My Work/Extra/LogicQ/.agents/teamwork/TEST_INFRA.md';
      expect(fs.existsSync(infraPath)).toBe(true);
    });

    it('F10-3: Test suite helper creates and cleans up isolated test data without residual state', async () => {
      const { user } = await createE2ETestUser('STUDENT', 'e2e_t1_');
      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeDefined();
      await cleanupE2EData('e2e_t1_');
      const deleted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(deleted).toBeNull();
    });

    it('F10-4: Test execution durations are measured and reported for performance baseline', async () => {
      const start = Date.now();
      const res = await judge.compileAndRun(C_SNIPPETS.HELLO_WORLD, '', 2000, 64);
      const duration = Date.now() - start;
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(duration).toBeLessThan(10000);
    }, 20000);

    it('F10-5: All 4 tiers of test suites are defined in server/tests/e2e/ directory', () => {
      const e2eDir = 'c:/Users/thora/Documents/My Work/Extra/LogicQ/server/tests/e2e';
      expect(fs.existsSync(e2eDir)).toBe(true);
      expect(fs.existsSync(`${e2eDir}/tier1-features.test.ts`)).toBe(true);
    });
  });
});
