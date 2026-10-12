import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { calculateRubricPoints, RUBRIC_WEIGHTS } from '../src/controllers/checker.controller.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Strict 3-Role Architecture & Solution Checker Engine', () => {
  let adminToken1: string;
  let adminToken2: string;
  let adminUser1: any;
  let adminUser2: any;
  let checkerUser: any;
  let checkerToken: string;
  let studentUser: any;
  let studentToken: string;
  let testProblem: any;
  let testUpload: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const ts = Date.now();

    // 1. Create two administrators to satisfy minimum 2 admins invariant
    adminUser1 = await prisma.user.create({
      data: {
        username: `admin_one_${ts}`,
        email: `admin1_${ts}@sanjivani.edu.in`,
        passwordHash,
        role: 'ADMIN',
        fullName: 'Admin One',
      },
    });
    adminToken1 = generateAccessToken({
      userId: adminUser1.id,
      role: 'ADMIN',
      username: adminUser1.username,
    });

    adminUser2 = await prisma.user.create({
      data: {
        username: `admin_two_${ts}`,
        email: `admin2_${ts}@sanjivani.edu.in`,
        passwordHash,
        role: 'ADMIN',
        fullName: 'Admin Two',
      },
    });
    adminToken2 = generateAccessToken({
      userId: adminUser2.id,
      role: 'ADMIN',
      username: adminUser2.username,
    });

    // 2. Create Checker User
    checkerUser = await prisma.user.create({
      data: {
        username: `checker_${ts}`,
        email: `checker_${ts}@sanjivani.edu.in`,
        passwordHash,
        role: 'CHECKER',
        fullName: 'Checker Staff',
      },
    });
    checkerToken = generateAccessToken({
      userId: checkerUser.id,
      role: 'CHECKER',
      username: checkerUser.username,
    });

    // 3. Create Student User
    studentUser = await prisma.user.create({
      data: {
        username: `student_${ts}`,
        email: `student_${ts}@sanjivani.edu.in`,
        passwordHash,
        role: 'STUDENT',
        fullName: 'Test Student',
        prn: `8888${String(ts).slice(-8)}`,
      },
    });
    studentToken = generateAccessToken({
      userId: studentUser.id,
      role: 'STUDENT',
      username: studentUser.username,
    });

    // 4. Create Test Problem
    testProblem = await prisma.problem.create({
      data: {
        slug: `test-checker-problem-${ts}`,
        title: 'Checker Test Problem',
        difficulty: 'MEDIUM',
        category: 'Logic',
        tags: '["Testing"]',
        description: 'Test description for rubric grading',
        starterCode: 'int main() { return 0; }',
        basePoints: 30,
        testCases: {
          create: [{ input: '1\n', expectedOutput: '1\n', isHidden: false }],
        },
      },
    });

    // 5. Create Test Upload submitted by Student
    testUpload = await prisma.uploadedSolution.create({
      data: {
        userId: studentUser.id,
        problemId: testProblem.id,
        studentNote: 'Student explanation note with flowchart logic',
        status: 'PENDING_REVIEW',
        filesJson: JSON.stringify([
          {
            id: 'file-123',
            storageKey: '/uploads/test.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            sha256: 'fakehash123',
            dataBase64: 'aGVsbG8=',
          },
        ]),
      },
    });
  });

  afterAll(async () => {
    await prisma.uploadReview.deleteMany({
      where: { uploadId: testUpload.id },
    });
    await prisma.uploadedSolution.deleteMany({
      where: { id: testUpload.id },
    });
    await prisma.testCase.deleteMany({
      where: { problemId: testProblem.id },
    });
    await prisma.problem.deleteMany({
      where: { id: testProblem.id },
    });
    await prisma.adminAuditLog.deleteMany({
      where: { adminId: { in: [adminUser1.id, adminUser2.id, checkerUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser1.id, adminUser2.id, checkerUser.id, studentUser.id] } },
    });
  });

  describe('1. Role Access Control Matrix', () => {
    it('Blocks checkers from accessing admin endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${checkerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Blocks students from accessing checker endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/checker/reviews')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Allows checkers to access /api/checker/reviews', async () => {
      const res = await request(app)
        .get('/api/checker/reviews')
        .set('Authorization', `Bearer ${checkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.queue)).toBe(true);
    });
  });

  describe('2. Minimum 2 Admins & Self-Demotion Invariants', () => {
    it('Blocks an admin from demoting their own administrator role', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${adminUser1.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: 'STUDENT' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Admins cannot remove their own administrator role');
    });

    it('Blocks demoting an admin if total admins would drop below 2', async () => {
      // Temporarily ensure total admins count is exactly 2 for this test
      const allAdmins = await prisma.user.findMany({
        where: { role: 'ADMIN', id: { notIn: [adminUser1.id, adminUser2.id] } },
      });
      // Temporarily mark any other admins as STUDENT to test the <= 2 boundary
      if (allAdmins.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: allAdmins.map((a) => a.id) } },
          data: { role: 'STUDENT' },
        });
      }

      // With exactly 2 admins, admin1 tries to demote admin2
      const res = await request(app)
        .put(`/api/admin/users/${adminUser2.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: 'CHECKER' });

      // Restore other admins
      if (allAdmins.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: allAdmins.map((a) => a.id) } },
          data: { role: 'ADMIN' },
        });
      }

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 2 active administrators');
    });

    it('Allows promoting student to CHECKER or ADMIN', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: 'CHECKER' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('CHECKER');

      // Revert student back
      await request(app)
        .put(`/api/admin/users/${studentUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: 'STUDENT' });
    });
  });

  describe('3. Blind Review & Zero Student PII Guarantee', () => {
    beforeAll(async () => {
      // Admin assigns testUpload to checkerUser
      await request(app)
        .post(`/api/admin/uploads/${testUpload.id}/assign`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ checkerId: checkerUser.id });
    });

    it('Checker queue strips all student PII (no name, email, PRN, dept, year)', async () => {
      const res = await request(app)
        .get('/api/checker/reviews')
        .set('Authorization', `Bearer ${checkerToken}`);

      expect(res.status).toBe(200);
      const queueItem = res.body.data.queue.find((q: any) => q.id === testUpload.id);
      expect(queueItem).toBeDefined();

      // Verify Blind token exists and NO PII leaked
      expect(queueItem.submissionToken).toBeDefined();
      expect(queueItem.submissionToken).toMatch(/^SUB-[A-Z0-9]+$/);
      expect(queueItem.studentNote).toBe('Student explanation note with flowchart logic');

      // Assert student PII properties are completely absent
      expect((queueItem as any).user).toBeUndefined();
      expect((queueItem as any).prn).toBeUndefined();
      expect((queueItem as any).email).toBeUndefined();
      expect((queueItem as any).studentName).toBeUndefined();
      expect((queueItem as any).fullName).toBeUndefined();
      expect((queueItem as any).department).toBeUndefined();
    });
  });

  describe('4. Rubric Formula Points Calculation', () => {
    it('Calculates formula marks correctly across 50% logic, 30% flowchart, 20% clarity', () => {
      const basePoints = 30;

      // 100% on everything -> full 30 points
      const full = calculateRubricPoints(basePoints, {
        correctLogic: 100,
        flowchart: 100,
        clarity: 100,
      });
      expect(full).toBe(30);

      // 100% logic (0.50), 0% flowchart, 0% clarity -> 30 * 0.50 = 15 points
      const half = calculateRubricPoints(basePoints, {
        correctLogic: 100,
        flowchart: 0,
        clarity: 0,
      });
      expect(half).toBe(15);

      // 80% logic (0.40), 50% flowchart (0.15), 100% clarity (0.20) -> 0.75 * 30 = 22.5 -> 23 or 22
      const weighted = calculateRubricPoints(basePoints, {
        correctLogic: 80,
        flowchart: 50,
        clarity: 100,
      });
      expect(weighted).toBe(Math.round(30 * (0.8 * 0.5 + 0.5 * 0.3 + 1.0 * 0.2)));
    });
  });

  describe('5. Conflict of Interest Rule', () => {
    it('Blocks checker from reviewing their own uploaded solution', async () => {
      // Create an upload where student is checkerUser
      const ownUpload = await prisma.uploadedSolution.create({
        data: {
          userId: checkerUser.id,
          problemId: testProblem.id,
          status: 'PENDING_REVIEW',
          filesJson: '[]',
          assignedCheckerId: checkerUser.id,
        },
      });

      const res = await request(app)
        .post(`/api/checker/reviews/${ownUpload.id}/decision`)
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          decision: 'APPROVED',
          comment: 'Self approve attempt',
          rubric: { correctLogic: 100, flowchart: 100, clarity: 100 },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Conflict of interest');

      await prisma.uploadedSolution.delete({ where: { id: ownUpload.id } });
    });
  });

  describe('6. Checker Decision Submission & 30-Minute Edit Window', () => {
    it('Records valid checker decision and updates upload status', async () => {
      const res = await request(app)
        .post(`/api/checker/reviews/${testUpload.id}/decision`)
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          decision: 'APPROVED',
          comment: 'Excellent logic and clean flowchart structure',
          rubric: {
            correctLogic: 100,
            flowchart: 80,
            clarity: 100,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.decision).toBe('APPROVED');
      expect(res.body.data.pointsAwarded).toBeGreaterThan(0);

      const updated = await prisma.uploadedSolution.findUnique({
        where: { id: testUpload.id },
      });
      expect(updated?.status).toBe('APPROVED');
      expect(updated?.pointsAwarded).toBe(res.body.data.pointsAwarded);
    });

    it('Allows editing the decision within 30 minutes', async () => {
      const res = await request(app)
        .post(`/api/checker/reviews/${testUpload.id}/decision`)
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          decision: 'APPROVED',
          comment: 'Updated feedback note within 30m window',
          rubric: {
            correctLogic: 90,
            flowchart: 90,
            clarity: 90,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comment).toContain('Updated feedback note');
    });
  });
});
