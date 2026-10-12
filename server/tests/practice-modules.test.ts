import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Practice Curriculum & Sequential Unlock Test Suite', () => {
  let studentToken: string;
  let studentId: string;
  let createdProgressIds: string[] = [];
  let testSubmissionIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a fresh test student
    const student = await prisma.user.create({
      data: {
        username: `practice_student_${Date.now()}`,
        email: `practice_student_${Date.now()}@logicq.io`,
        prn: `7777${String(Date.now()).slice(-8)}`,
        role: 'STUDENT',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        passwordHash: 'hashed_password_placeholder',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({
      userId: student.id,
      role: student.role,
      username: student.username,
    });
  });

  afterAll(async () => {
    // Cleanup created submissions and progress
    if (testSubmissionIds.length > 0) {
      await prisma.submission.deleteMany({
        where: { id: { in: testSubmissionIds } },
      }).catch(() => {});
    }
    if (createdProgressIds.length > 0) {
      await prisma.practiceProgress.deleteMany({
        where: { id: { in: createdProgressIds } },
      }).catch(() => {});
    }
    if (studentId) {
      await prisma.practiceProgress.deleteMany({
        where: { userId: studentId },
      }).catch(() => {});
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
  });

  it('1. GET /api/practice/modules - Module 1 unlocked, Modules 2-4 strictly locked for fresh student', async () => {
    const res = await request(app)
      .get('/api/practice/modules')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.modules)).toBe(true);
    expect(res.body.data.modules.length).toBe(4);

    const [m1, m2, m3, m4] = res.body.data.modules;

    // Module 1: Control Structures
    expect(m1.slug).toBe('control-structures');
    expect(m1.isUnlocked).toBe(true);
    expect(m1.solvedCount).toBe(0);
    expect(m1.totalQuestions).toBe(10);

    // Module 2: Pointers and functions
    expect(m2.slug).toBe('pointers-and-functions');
    expect(m2.isUnlocked).toBe(false);
    expect(m2.requirementText).toContain('Solve 7 of 10 in Control Structures to unlock');

    // Module 3 & 4: Locked
    expect(m3.isUnlocked).toBe(false);
    expect(m4.isUnlocked).toBe(false);
  });

  it('2. GET /api/practice/modules/control-structures/problems - Returns 10 problems without hidden tests', async () => {
    const res = await request(app)
      .get('/api/practice/modules/control-structures/problems')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.module.slug).toBe('control-structures');
    expect(res.body.data.problems.length).toBe(10);

    for (const prob of res.body.data.problems) {
      expect(prob.status).toBe('NOT_STARTED');
      expect(prob.attemptsCount).toBe(0);
      expect(prob.isPractice).toBe(true);
      expect(prob.moduleSlug).toBe('control-structures');
      // Hidden tests must NEVER be returned in problem listing
      expect(prob.testCases).toBeUndefined();
      expect(prob.hiddenTests).toBeUndefined();
    }
  });

  it('3. GET /api/practice/modules/pointers-and-functions/problems - Returns 403 MODULE_LOCKED for student with < 7 solves', async () => {
    const res = await request(app)
      .get('/api/practice/modules/pointers-and-functions/problems')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_LOCKED');
    expect(res.body.message || res.body.error).toContain('Module locked');
  });

  it('4. GET /api/practice/problems/practice-m2-p1-swap-pointers - Returns 403 MODULE_LOCKED', async () => {
    const res = await request(app)
      .get('/api/practice/problems/practice-m2-p1-swap-pointers')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_LOCKED');
  });

  it('5. GET /api/practice/problems/practice-c1-largest-of-three - Returns problem details with only sample tests', async () => {
    const res = await request(app)
      .get('/api/practice/problems/practice-c1-largest-of-three')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem.slug).toBe('practice-c1-largest-of-three');
    expect(res.body.data.problem.isPractice).toBe(true);

    // Verify sample tests are provided
    expect(Array.isArray(res.body.data.problem.sampleTests)).toBe(true);
    expect(res.body.data.problem.sampleTests.length).toBeGreaterThan(0);
  });

  it('6. Solves 7 problems in Module 1 -> Module 2 unlocks immediately', async () => {
    // Fetch problems of Module 1
    const m1Problems = await prisma.problem.findMany({
      where: { moduleSlug: 'control-structures', isPractice: true },
      take: 7,
    });
    expect(m1Problems.length).toBe(7);

    // Mark 7 problems as solved for this student
    for (const prob of m1Problems) {
      const progress = await prisma.practiceProgress.create({
        data: {
          userId: studentId,
          problemId: prob.id,
          moduleSlug: 'control-structures',
          isSolved: true,
          attemptsCount: 1,
          solvedAt: new Date(),
        },
      });
      createdProgressIds.push(progress.id);
    }

    // Now re-fetch modules list
    const res = await request(app)
      .get('/api/practice/modules')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const [m1, m2, m3] = res.body.data.modules;
    expect(m1.solvedCount).toBe(7);
    expect(m1.isUnlocked).toBe(true);

    // Module 2 MUST NOW BE UNLOCKED!
    expect(m2.isUnlocked).toBe(true);
    expect(m2.requirementText).toBe('');

    // Module 3 is still locked
    expect(m3.isUnlocked).toBe(false);

    // Now accessing Module 2 problems succeeds!
    const m2Res = await request(app)
      .get('/api/practice/modules/pointers-and-functions/problems')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(m2Res.status).toBe(200);
    expect(m2Res.body.data.problems.length).toBe(10);
  });

  it('7. Submitting practice solution awards 0 competition points and marks submissionType as PRACTICE', async () => {
    const prob = await prisma.problem.findFirst({
      where: { slug: 'practice-c1-largest-of-three', isPractice: true },
    });
    expect(prob).not.toBeNull();

    const initialUser = await prisma.user.findUnique({ where: { id: studentId } });
    const initialPoints = initialUser?.totalPoints ?? 0;
    const initialStreak = initialUser?.currentStreak ?? 0;

    // Submit a solution
    const cCode = `#include <stdio.h>\nint main() { printf("10\\n"); return 0; }`;
    const submitRes = await request(app)
      .post('/api/submissions/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        problemId: prob!.id,
        code: cCode,
        language: 'c',
      });

    expect(submitRes.status).toBe(202);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.submissionType).toBe('PRACTICE');

    const subId = submitRes.body.data.submissionId;
    testSubmissionIds.push(subId);

    // Verify submission record in DB
    const subRecord = await prisma.submission.findUnique({ where: { id: subId } });
    expect(subRecord).not.toBeNull();
    expect(subRecord?.submissionType).toBe('PRACTICE');

    // Verify user points and streak were NOT affected
    const updatedUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(updatedUser?.totalPoints).toBe(initialPoints);
    expect(updatedUser?.currentStreak).toBe(initialStreak);
  });
});
