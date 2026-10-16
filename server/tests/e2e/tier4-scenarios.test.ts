import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { LocalGccJudge } from '../../src/judge/local-gcc.judge.js';
import { Verdict } from '../../src/judge/judge.interface.js';
import { prisma } from '../../src/utils/prisma.js';
import {
  C_SNIPPETS,
  createE2ETestUser,
  createE2ETestProblem,
  cleanupE2EData,
} from './e2e-helpers.js';

describe('Tier 4: Real-World Application Scenarios Test Suite', () => {
  const judge = new LocalGccJudge();

  beforeAll(async () => {
    await cleanupE2EData('e2e_t4_');
  });

  afterAll(async () => {
    await cleanupE2EData('e2e_t4_');
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Complete First-Time Student Journey
  // --------------------------------------------------------------------------
  it('T4-01: End-to-end Student Journey: Registration -> Interactive Run -> Fix Syntax -> Submit -> Solved', async () => {
    // 1. Register student
    const { user, token } = await createE2ETestUser('STUDENT');
    expect(user.id).toBeDefined();

    // 2. Problem exists
    const problem = await createE2ETestProblem({
      title: 'Sum of Two Numbers',
      isPractice: true,
      moduleSlug: 'intro-c',
      testCases: [
        { input: '5 7\n', expectedOutput: '12\n', isHidden: false, orderIndex: 0 },
        { input: '50 70\n', expectedOutput: '120\n', isHidden: true, orderIndex: 1 },
      ],
    });

    // 3. Student tries interactive run with syntax error (missing semicolon)
    const buggyCode = `
      #include <stdio.h>
      int main() {
          long long a, b;
          if (scanf("%lld %lld", &a, &b) == 2) {
              printf("%lld\\n", a + b) // missing semicolon
          }
          return 0;
      }
    `;
    const runBuggyRes = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: buggyCode, stdin: '5 7\n' });

    expect(runBuggyRes.status).toBe(200);
    expect(runBuggyRes.body.data.verdict).toBe(Verdict.COMPILE_ERROR);

    // 4. Student fixes code and re-runs interactively
    const runFixedRes = await request(app)
      .post('/api/submissions/run')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: C_SNIPPETS.ADD_TWO, stdin: '5 7\n' });

    expect(runFixedRes.status).toBe(200);
    expect(runFixedRes.body.data.verdict).toBe(Verdict.ACCEPTED);
    expect(runFixedRes.body.data.stdout?.trim()).toBe('12');

    // 5. Student submits finalized solution
    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    expect([201, 202]).toContain(subRes.status);
    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    expect(submissionId).toBeDefined();

    // 6. Evaluation pipeline processes submission
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    // 7. Verify submission verdict is ACCEPTED and points are recorded
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    expect(submission?.verdict).toBe(Verdict.ACCEPTED);

    // 8. Verify student progress is marked isSolved: true
    const progress = await prisma.practiceProgress.findUnique({
      where: { userId_problemId: { userId: user.id, problemId: problem.id } },
    });
    expect(progress?.isSolved).toBe(true);

    // 9. Verify GET /api/submissions/:id masks hidden test cases
    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    const tcResults = getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [];
    expect(tcResults.length).toBe(2);
    expect(tcResults[0].stdout).toBeTruthy();
    expect(tcResults[1].stdout).toBeNull();
    expect(tcResults[1].input).toBeUndefined();
  }, 45000);

  // --------------------------------------------------------------------------
  // Scenario 2: Student Debugging & Iteration Loop with Diff View
  // --------------------------------------------------------------------------
  it('T4-02: Student Debugging Workflow: Wrong Answer -> Inspect Diff View -> Correct Output -> Accepted', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: '10 20\n', expectedOutput: '30\n', isHidden: false, orderIndex: 0 },
      ],
    });

    // 1. Student submits code with extra prefix string "Result: 30" instead of pure "30"
    const prefixedCode = `
      #include <stdio.h>
      int main() {
          int a, b;
          if (scanf("%d %d", &a, &b) == 2) {
              printf("Result: %d\\n", a + b);
          }
          return 0;
      }
    `;

    const sub1Res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: prefixedCode });

    expect([201, 202]).toContain(sub1Res.status);
    const sub1Id = sub1Res.body.data.submissionId || sub1Res.body.data.submission?.id;
    expect(sub1Id).toBeDefined();

    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(sub1Id);

    // Verify first submission is WRONG_ANSWER
    const sub1 = await prisma.submission.findUnique({ where: { id: sub1Id } });
    expect(sub1?.verdict).toBe(Verdict.WRONG_ANSWER);

    // Inspect visible test case result via API
    const get1Res = await request(app)
      .get(`/api/submissions/${sub1Id}`)
      .set('Authorization', `Bearer ${token}`);

    const tc1 = (get1Res.body.data.submission?.testCaseResults || get1Res.body.data.testCaseResults || [])[0];
    expect(tc1).toBeDefined();
    expect(tc1.verdict).toBe(Verdict.WRONG_ANSWER);
    expect(tc1.stdout?.trim()).toBe('Result: 30');

    // Bypass 5s cooldown for next submission by resetting previous submission timestamp
    await prisma.submission.update({
      where: { id: sub1Id },
      data: { createdAt: new Date(Date.now() - 10000) },
    });

    // 2. Student corrects output format to pure "30\n" and re-submits
    const sub2Res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    expect([201, 202]).toContain(sub2Res.status);
    const sub2Id = sub2Res.body.data.submissionId || sub2Res.body.data.submission?.id;
    expect(sub2Id).toBeDefined();

    await evaluateSubmission(sub2Id);

    const sub2 = await prisma.submission.findUnique({ where: { id: sub2Id } });
    expect(sub2?.verdict).toBe(Verdict.ACCEPTED);
  }, 45000);

  // --------------------------------------------------------------------------
  // Scenario 3: Multi-Vector Adversarial Attack Mitigation
  // --------------------------------------------------------------------------
  it('T4-03: Multi-Vector Adversarial Attack: #undef macro escape, filesystem traversal, and stderr leakage neutralized', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: 'SUPER_SECRET_KEY\n', expectedOutput: '0\n', isHidden: true, orderIndex: 0 },
      ],
    });

    // Attack 1: #undef bypass attempt (F3 requirement)
    const undefRes = await judge.compileAndRun(C_SNIPPETS.SECURITY_UNDEF_MALLOC, '', 2000, 64);
    expect([Verdict.COMPILE_ERROR, Verdict.ACCEPTED]).toContain(undefRes.verdict);

    // Attack 2: File read exfiltration attempt
    const fileReadCode = `
      #include <stdio.h>
      int main() {
          FILE *f = fopen("../../.env", "r");
          if (f) {
              printf("EXFILTRATED_ENV\\n");
              fclose(f);
          } else {
              printf("ACCESS_DENIED\\n");
          }
          return 0;
      }
    `;
    const fileRes = await judge.compileAndRun(fileReadCode, '', 2000, 64);
    expect(fileRes.stdout?.trim()).not.toBe('EXFILTRATED_ENV');

    // Attack 3: Hidden test stderr exfiltration
    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.SECURITY_STDERR_EXFIL });

    expect([201, 202]).toContain(subRes.status);
    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    expect(submissionId).toBeDefined();

    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    const tc = (getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [])[0];
    if (tc && tc.stderr) {
      expect(tc.stderr).not.toContain('SUPER_SECRET_KEY');
    }
  }, 45000);

  // --------------------------------------------------------------------------
  // Scenario 4: Algorithm Contest Scalability & Hidden Scale Timeout
  // --------------------------------------------------------------------------
  it('T4-04: Algorithmic Contest Stress: O(N^2) solution passes small sample test but cleanly times out on large hidden test', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      timeLimitMs: 1000,
      testCases: [
        // Small visible test: n=10
        { input: '10\n', expectedOutput: '45\n', isHidden: false, orderIndex: 0 },
        // Large hidden test: n=100000000 (O(N^2) simulation times out)
        { input: '100000000\n', expectedOutput: '0\n', isHidden: true, orderIndex: 1 },
      ],
    });

    const quadraticCode = `
      #include <stdio.h>
      int main() {
          long long n;
          if (scanf("%lld", &n) != 1) return 0;
          if (n <= 10) {
              long long sum = 0;
              for (int i = 0; i < n; i++) sum += i;
              printf("%lld\\n", sum);
              return 0;
          }
          // Simulate O(N^2) timeout on large input
          volatile long long count = 0;
          while (1) { count++; }
          return 0;
      }
    `;

    const subRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: quadraticCode });

    expect([201, 202]).toContain(subRes.status);
    const submissionId = subRes.body.data.submissionId || subRes.body.data.submission?.id;
    expect(submissionId).toBeDefined();

    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(submissionId);

    const updated = await prisma.submission.findUnique({ where: { id: submissionId } });
    expect(updated?.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);

    const getRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${token}`);

    const tcResults = getRes.body.data.submission?.testCaseResults || getRes.body.data.testCaseResults || [];
    expect(tcResults[0].verdict).toBe(Verdict.ACCEPTED);
    expect(tcResults[0].stdout?.trim()).toBe('45');

    expect(tcResults[1].verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
    expect(tcResults[1].stdout).toBeNull();
    expect(tcResults[1].input).toBeUndefined();
  }, 45000);

  // --------------------------------------------------------------------------
  // Scenario 5: Rapid Consecutive Submissions & Idempotent Rejudging
  // --------------------------------------------------------------------------
  it('T4-05: Rapid Submissions & Rejudging: Consecutive submissions and re-evaluation evaluate idempotently without double-scoring', async () => {
    const { user, token } = await createE2ETestUser('STUDENT');
    const problem = await createE2ETestProblem({
      testCases: [
        { input: '3 4\n', expectedOutput: '7\n', isHidden: false, orderIndex: 0 },
      ],
    });

    // 1. Submit version 1
    const sub1Res = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    expect([201, 202]).toContain(sub1Res.status);
    const sub1Id = sub1Res.body.data.submissionId || sub1Res.body.data.submission?.id;
    expect(sub1Id).toBeDefined();

    // 2. Rapidly submit version 2 by same user within 5 seconds -> must trigger 429 cooldown!
    const sub2RapidRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ problemId: problem.id, code: C_SNIPPETS.ADD_TWO });

    expect(sub2RapidRes.status).toBe(429);
    expect(sub2RapidRes.body.message).toMatch(/cooldown/i);

    // Now evaluate sub1
    const { evaluateSubmission } = await import('../../src/services/submission-evaluator.js');
    await evaluateSubmission(sub1Id);

    const sub1 = await prisma.submission.findUnique({ where: { id: sub1Id } });
    expect(sub1?.verdict).toBe(Verdict.ACCEPTED);

    // 3. Re-evaluate sub1 (rejudge)
    await evaluateSubmission(sub1Id);
    const sub1Rejudged = await prisma.submission.findUnique({ where: { id: sub1Id } });
    expect(sub1Rejudged?.verdict).toBe(Verdict.ACCEPTED);

    // Verify test case results count for sub1 remains exactly 1 (not duplicated)
    const tcCount = await prisma.submissionTestCaseResult.count({
      where: { submissionId: sub1Id },
    });
    expect(tcCount).toBe(1);
  }, 45000);
});
