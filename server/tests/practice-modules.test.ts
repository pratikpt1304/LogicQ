import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { autoSeedDatabase } from '../src/services/auto-seed.service.js';

describe('Practice Curriculum & Sequential Unlock Test Suite', () => {
  let studentToken: string;
  let studentId: string;
  let adminToken: string;
  let adminId: string;
  let createdProgressIds: string[] = [];
  let testSubmissionIds: string[] = [];

  beforeAll(async () => {
    // 0. Ensure practice database is seeded
    await autoSeedDatabase();

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

    // 2. Create a test admin
    const admin = await prisma.user.create({
      data: {
        username: `practice_admin_${Date.now()}`,
        email: `practice_admin_${Date.now()}@logicq.io`,
        prn: `8888${String(Date.now()).slice(-8)}`,
        role: 'ADMIN',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        passwordHash: 'hashed_password_placeholder',
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({
      userId: admin.id,
      role: admin.role,
      username: admin.username,
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
    if (adminId) {
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    }
  });

  it('1. GET /api/practice/modules - Computes real 4/4/2 distribution and locks Modules 2-4 for fresh student', async () => {
    const res = await request(app)
      .get('/api/practice/modules')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.modules)).toBe(true);
    expect(res.body.data.modules.length).toBe(4);

    const [m1, m2, m3, m4] = res.body.data.modules;

    // Verify all 4 modules have dynamic 4 Easy / 4 Medium / 2 Hard distribution computed from DB
    for (const m of [m1, m2, m3, m4]) {
      expect(m.totalQuestions).toBe(10);
      expect(m.isComingSoon).toBe(false);
      expect(m.distribution.EASY).toBe(4);
      expect(m.distribution.MEDIUM).toBe(4);
      expect(m.distribution.HARD).toBe(2);
    }

    // Module 1: Control Structures
    expect(m1.slug).toBe('control-structures');
    expect(m1.isUnlocked).toBe(true);
    expect(m1.solvedCount).toBe(0);

    // Module 2: Pointers and functions
    expect(m2.slug).toBe('pointers-and-functions');
    expect(m2.isUnlocked).toBe(false);
    expect(m2.requirementText).toContain('Solve all 10 in Control Structures to unlock (0 of 10 solved)');

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

  it('3. GET /api/practice/modules/pointers-and-functions/problems - Returns 403 MODULE_LOCKED for student with < 10 solves', async () => {
    const res = await request(app)
      .get('/api/practice/modules/pointers-and-functions/problems')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_LOCKED');
    expect(res.body.message || res.body.error).toContain('Solve all 10 in Control Structures to unlock');
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

  it('6. Solves all 10 problems in Module 1 -> Module 2 unlocks immediately', async () => {
    // Fetch problems of Module 1
    const m1Problems = await prisma.problem.findMany({
      where: { moduleSlug: 'control-structures', isPractice: true },
      take: 10,
    });
    expect(m1Problems.length).toBe(10);

    // Mark 10 problems as solved for this student
    for (const prob of m1Problems) {
      const progress = await prisma.practiceProgress.upsert({
        where: {
          userId_problemId: {
            userId: studentId,
            problemId: prob.id,
          },
        },
        create: {
          userId: studentId,
          problemId: prob.id,
          moduleSlug: 'control-structures',
          isSolved: true,
          attemptsCount: 1,
          solvedAt: new Date(),
        },
        update: {
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
    expect(m1.solvedCount).toBe(10);
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

  it('7. Submitting practice solution awards base points and marks submissionType as PRACTICE without affecting daily streak', async () => {
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

    // Verify daily streak was NOT affected
    const updatedUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(updatedUser?.currentStreak).toBe(initialStreak);
  });

  it('8. Admin Preview allows Admin to review locked Module 3 & 4 questions without unlocking student account', async () => {
    // Module 3 is currently locked for student
    const studentRes = await request(app)
      .get('/api/practice/modules/array-and-its-applications/problems')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentRes.status).toBe(403);
    expect(studentRes.body.code).toBe('MODULE_LOCKED');

    // Admin can preview Module 3 problems directly!
    const adminRes = await request(app)
      .get('/api/practice/modules/array-and-its-applications/problems')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.problems.length).toBe(10);

    // Admin can also preview locked problem details directly!
    const adminProbRes = await request(app)
      .get('/api/practice/problems/practice-m4-p1-struct-student-topper')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminProbRes.status).toBe(200);
    expect(adminProbRes.body.data.problem.slug).toBe('practice-m4-p1-struct-student-topper');
  });

  it('9. Solving 9 questions does NOT unlock Module 3; solving the 10th question unlocks Module 3 immediately', async () => {
    const m2Problems = await prisma.problem.findMany({
      where: { moduleSlug: 'pointers-and-functions', isPractice: true },
      take: 10,
    });
    expect(m2Problems.length).toBe(10);

    // Solve 9 problems in Module 2
    for (let i = 0; i < 9; i++) {
      const p = await prisma.practiceProgress.create({
        data: {
          userId: studentId,
          problemId: m2Problems[i].id,
          moduleSlug: 'pointers-and-functions',
          isSolved: true,
          attemptsCount: 1,
          solvedAt: new Date(),
        },
      });
      createdProgressIds.push(p.id);
    }

    // With 9 solves, Module 3 MUST STILL BE LOCKED!
    const lockedRes = await request(app)
      .get('/api/practice/modules/array-and-its-applications/problems')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.code).toBe('MODULE_LOCKED');

    // Solve the 10th problem
    const p10 = await prisma.practiceProgress.create({
      data: {
        userId: studentId,
        problemId: m2Problems[9].id,
        moduleSlug: 'pointers-and-functions',
        isSolved: true,
        attemptsCount: 1,
        solvedAt: new Date(),
      },
    });
    createdProgressIds.push(p10.id);

    // Now Module 3 unlocks immediately!
    const unlockedRes = await request(app)
      .get('/api/practice/modules/array-and-its-applications/problems')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(unlockedRes.status).toBe(200);
    expect(unlockedRes.body.data.problems.length).toBe(10);
  });

  it('10. Solving 10 questions in Module 3 unlocks Module 4 immediately with all 10 questions readable', async () => {
    const m3Problems = await prisma.problem.findMany({
      where: { moduleSlug: 'array-and-its-applications', isPractice: true },
      take: 10,
    });
    expect(m3Problems.length).toBe(10);

    for (const prob of m3Problems) {
      const p = await prisma.practiceProgress.create({
        data: {
          userId: studentId,
          problemId: prob.id,
          moduleSlug: 'array-and-its-applications',
          isSolved: true,
          attemptsCount: 1,
          solvedAt: new Date(),
        },
      });
      createdProgressIds.push(p.id);
    }

    // Module 4 unlocks immediately
    const m4Res = await request(app)
      .get('/api/practice/modules/advanced-data-types-dynamic-memory/problems')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(m4Res.status).toBe(200);
    expect(m4Res.body.data.problems.length).toBe(10);
  });

  it('11. Hidden tests and source references are never leaked to student in responses', async () => {
    const res = await request(app)
      .get('/api/practice/problems/practice-m4-p10-singly-linked-list')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const prob = res.body.data.problem;
    expect(prob.slug).toBe('practice-m4-p10-singly-linked-list');
    expect(prob.hiddenTests).toBeUndefined();
    expect(prob.testCases).toBeUndefined();
    // Only sample tests returned
    expect(Array.isArray(prob.sampleTests)).toBe(true);
    expect(prob.sampleTests.length).toBe(2);

    // Verify description contains no source citations or book references
    expect(prob.description).not.toContain('chapter');
    expect(prob.description).not.toContain('exercise');
    expect(prob.description).not.toContain('page');
  });

  it('12. Incomplete module (< 10 questions) displays Coming soon and blocks unlocking as complete', async () => {
    // Temporarily unpublish 2 problems of Module 4 to simulate incomplete curriculum
    const m4Probs = await prisma.problem.findMany({
      where: { moduleSlug: 'advanced-data-types-dynamic-memory', isPractice: true },
      take: 2,
    });
    for (const p of m4Probs) {
      await prisma.problem.update({
        where: { id: p.id },
        data: { status: 'DRAFT' },
      });
    }

    try {
      const res = await request(app)
        .get('/api/practice/modules')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const m4 = res.body.data.modules.find((m: any) => m.slug === 'advanced-data-types-dynamic-memory');
      expect(m4.totalQuestions).toBe(8);
      expect(m4.isComingSoon).toBe(true);
      expect(m4.canComplete).toBe(false);
    } finally {
      // Restore status to PUBLISHED
      for (const p of m4Probs) {
        await prisma.problem.update({
          where: { id: p.id },
          data: { status: 'PUBLISHED' },
        });
      }
    }
  });
});
