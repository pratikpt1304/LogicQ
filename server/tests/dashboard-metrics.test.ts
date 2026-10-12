import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Dashboard Metrics & Content Integrity Regression Suite', () => {
  let unrankedStudentToken: string;
  let unrankedStudentId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // 1. Create a zero-point student with 0 submissions
    const unrankedStudent = await prisma.user.create({
      data: {
        username: `zero_sub_${Date.now()}`,
        email: `zero_sub_${Date.now()}@logicq.io`,
        prn: `9999${String(Date.now()).slice(-8)}`,
        role: 'STUDENT',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        passwordHash: 'hashed_password_placeholder',
      },
    });
    unrankedStudentId = unrankedStudent.id;
    unrankedStudentToken = generateAccessToken({
      userId: unrankedStudent.id,
      role: unrankedStudent.role,
      username: unrankedStudent.username,
    });

    // 2. Create an admin
    const admin = await prisma.user.create({
      data: {
        username: `admin_metrics_${Date.now()}`,
        email: `admin_metrics_${Date.now()}@logicq.io`,
        prn: `8888${String(Date.now()).slice(-8)}`,
        role: 'ADMIN',
        totalPoints: 100,
        currentStreak: 5,
        longestStreak: 5,
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
    if (unrankedStudentId) {
      await prisma.user.delete({ where: { id: unrankedStudentId } }).catch(() => {});
    }
    if (adminId) {
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    }
  });

  it('1. Zero-point student receives rank: null, percentile: null, and accuracy: null (never rank #1 or 100% accuracy default)', async () => {
    const res = await request(app)
      .get('/api/users/dashboard/stats')
      .set('Authorization', `Bearer ${unrankedStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data.stats;
    // Rank must be strictly null (not #1)
    expect(stats.rank).toBeNull();
    // Percentile must be null (not 100%)
    expect(stats.percentile).toBeNull();
    // Accuracy must be null on 0 submissions (not 100% or 0%)
    expect(stats.accuracy).toBeNull();
    // Total problems pool size must not be exposed
    expect(stats.totalProblems).toBeUndefined();
    expect(stats.thisWeekTotal).toBe(7);

    // Weekly summary checks
    const weeklySummary = res.body.data.weeklySummary;
    expect(weeklySummary.rank).toBeNull();
    expect(weeklySummary.percentile).toBeNull();
    expect(weeklySummary.previousWeekDelta).toBeNull();
  });

  it('2. Leaderboard returns null rank and null percentile for 0-point students in pinned-own-row', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${unrankedStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const pinnedOwnRow = res.body.data.pinnedOwnRow;
    expect(pinnedOwnRow).toBeTruthy();
    expect(pinnedOwnRow.rank).toBeNull();
    expect(pinnedOwnRow.percentile).toBeNull();
    expect(pinnedOwnRow.studentsBeaten).toBe(0);
  });

  it('3. Admin Problem Creation Guard blocks direct book citations (Kanetkar / Test Your C Skills)', async () => {
    const res = await request(app)
      .post('/api/admin/problems')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: `test-leak-${Date.now()}`,
        title: 'Valid Title',
        description:
          'Solve this problem (Yashavant Kanetkar, Test Your C Skills, Chapter 4). Details follow...',
        difficulty: 'EASY',
        category: 'Pointers',
        starterCode: '#include <stdio.h>\nint main() { return 0; }',
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Content policy violation/i);
  });

  it('4. Problem payload from active daily challenge does not leak book/author names to student', async () => {
    const res = await request(app)
      .get('/api/problems/daily')
      .set('Authorization', `Bearer ${unrankedStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const problem = res.body.data.problem;
    expect(problem.description).not.toMatch(/Kanetkar/i);
    expect(problem.description).not.toMatch(/Test Your C Skills/i);
  });
});
