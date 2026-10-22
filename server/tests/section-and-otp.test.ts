import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { OtpService } from '../src/services/otp.service.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import * as xlsx from 'xlsx';

describe('Phase 1: Student Identity, Dual OTP & Section Management', () => {
  const ts = Date.now().toString().slice(-4);
  const testPrn = `2026TEST${ts}`;
  const testEmail = `student_${ts}@sanjivani.edu.in`;
  const testMobile = `987654${ts}`;
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;
  let adminUser: any;
  let facultyUser: any;
  let studentUser: any;
  let createdSection: any;
  let facultySection: any;

  beforeAll(async () => {
    // Setup Admin user
    adminUser = await prisma.user.upsert({
      where: { email: 'admin_test@logicq.io' },
      update: { role: 'ADMIN' },
      create: {
        email: 'admin_test@logicq.io',
        username: 'admintest',
        passwordHash: 'dummy',
        role: 'ADMIN',
        accountState: 'ACTIVE',
      },
    });

    adminToken = generateAccessToken({
      userId: adminUser.id,
      username: adminUser.username,
      role: 'ADMIN',
    });

    facultyUser = await prisma.user.upsert({
      where: { email: `faculty_${ts}@logicq.io` },
      update: { role: 'FACULTY' },
      create: {
        email: `faculty_${ts}@logicq.io`,
        username: `faculty_${ts}`,
        passwordHash: 'dummy',
        role: 'FACULTY',
        accountState: 'ACTIVE',
      },
    });

    facultyToken = generateAccessToken({
      userId: facultyUser.id,
      username: facultyUser.username,
      role: 'FACULTY',
    });

    studentUser = await prisma.user.upsert({
      where: { email: `student_rbac_${ts}@logicq.io` },
      update: { role: 'STUDENT' },
      create: {
        email: `student_rbac_${ts}@logicq.io`,
        username: `student_rbac_${ts}`,
        passwordHash: 'dummy',
        role: 'STUDENT',
        accountState: 'ACTIVE',
      },
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      username: studentUser.username,
      role: 'STUDENT',
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (createdSection) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: createdSection.id } });
      await prisma.section.deleteMany({ where: { id: createdSection.id } });
    }
    if (facultySection) {
      await prisma.sectionStudent.deleteMany({ where: { sectionId: facultySection.id } });
      await prisma.section.deleteMany({ where: { id: facultySection.id } });
    }
    await prisma.otpVerification.deleteMany({ where: { target: { in: [testEmail, testMobile] } } });
    await prisma.user.deleteMany({ where: { email: { in: [testEmail, 'admin_test@logicq.io', `faculty_${ts}@logicq.io`, `student_rbac_${ts}@logicq.io`] } } });
    await prisma.prnIndex.deleteMany({ where: { prn: testPrn } });
  });

  describe('1. Dual OTP Generation & Verification', () => {
    let emailOtpCode: string;
    let mobileOtpCode: string;

    it('should generate and send Email OTP', async () => {
      const result = await OtpService.sendEmailOtp(testEmail, testPrn);
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toHaveLength(6);
      emailOtpCode = result.code!;
    });

    it('should reject wrong Email OTP code and record attempts', async () => {
      const verifyRes = await OtpService.verifyEmailOtp(testEmail, '000000', testPrn);
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.attemptsRemaining).toBe(4);
    });

    it('should successfully verify correct Email OTP', async () => {
      const verifyRes = await OtpService.verifyEmailOtp(testEmail, emailOtpCode, testPrn);
      expect(verifyRes.success).toBe(true);
    });

    it('should generate and send Mobile OTP', async () => {
      const result = await OtpService.sendMobileOtp(testMobile, testPrn);
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toHaveLength(6);
      mobileOtpCode = result.code!;
    });

    it('should successfully verify Mobile OTP', async () => {
      const verifyRes = await OtpService.verifyMobileOtp(testMobile, mobileOtpCode, testPrn);
      expect(verifyRes.success).toBe(true);
    });
  });

  describe('2. Strict 1:1:1 Student Identity Binding', () => {
    it('should pass identity binding validation for fresh credentials', async () => {
      const validation = await OtpService.validateIdentityBinding(testPrn, testEmail, testMobile);
      expect(validation.valid).toBe(true);
    });

    it('should reject conflicting binding if email is already bound to another PRN', async () => {
      // Create user bound to testPrn + testEmail
      await prisma.user.create({
        data: {
          email: testEmail,
          prn: testPrn,
          mobile: testMobile,
          username: `user_${ts}`,
          passwordHash: 'dummy',
          accountState: 'ACTIVE',
        },
      });

      // Try binding the same email with a DIFFERENT PRN
      const conflictPrn = `9999DIFF${ts}`;
      const conflictRes = await OtpService.validateIdentityBinding(conflictPrn, testEmail, '9111111111');
      expect(conflictRes.valid).toBe(false);
      expect(conflictRes.conflictReason).toContain('already bound');
    });
  });

  describe('3. Faculty Section Management', () => {
    it('should allow Admin/Faculty to create a section with unique joinCode and joinToken', async () => {
      const res = await request(app)
        .post('/api/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          institution: 'Sanjivani University of Engineering',
          course: 'B.Tech Computer Engineering',
          subject: 'Data Structures & Algorithms',
          academicYear: '2025-2026',
          semester: 'Semester 3',
          sectionName: `Div-A-${ts}`,
          description: 'Official Fall 2026 practice section',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.joinCode).toMatch(/^LQ-[A-Z0-9]{4}$/);
      expect(res.body.data.joinToken).toBeDefined();
      createdSection = res.body.data;
    });

    it('should allow a FACULTY user to create a section and list sections', async () => {
      const res = await request(app)
        .post('/api/sections')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          institution: 'Sanjivani University',
          course: 'B.Tech IT',
          subject: 'Operating Systems',
          academicYear: '2025-2026',
          semester: 'Semester 4',
          sectionName: `Faculty-Sec-${ts}`,
          description: 'Faculty created section',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.facultyId).toBe(facultyUser.id);
      facultySection = res.body.data;

      // Verify faculty can list their sections
      const listRes = await request(app)
        .get('/api/sections')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.some((s: any) => s.id === facultySection.id)).toBe(true);
    });

    it('should block STUDENT from creating a section with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/sections')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          institution: 'Sanjivani University',
          course: 'B.Tech IT',
          subject: 'Operating Systems',
          academicYear: '2025-2026',
          semester: 'Semester 4',
          sectionName: `Illegal-Sec-${ts}`,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should block STUDENT from listing faculty sections with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/sections')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should fetch public join info by joinToken without authentication', async () => {
      const res = await request(app).get(`/api/sections/join-info/${createdSection.joinToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sectionName).toBe(createdSection.sectionName);
      expect(res.body.data.institution).toBe(createdSection.institution);
    });
  });

  describe('4. Excel Roster Preview & Import', () => {
    it('should parse and categorize excel rows into valid, invalid, duplicate, and conflict', async () => {
      const rows = [
        { 'Full Name': 'Aarav Sharma', PRN: `2026EX1${ts}`, Email: `aarav_${ts}@test.edu`, Mobile: '9822011111' }, // valid
        { 'Full Name': 'Bad Email', PRN: `2026EX2${ts}`, Email: 'not-an-email', Mobile: '9822022222' }, // invalid email
        { 'Full Name': 'Bad Phone', PRN: `2026EX3${ts}`, Email: `phone_${ts}@test.edu`, Mobile: '123' }, // invalid phone
        { 'Full Name': 'Duplicate', PRN: `2026EX1${ts}`, Email: `dup_${ts}@test.edu`, Mobile: '9822033333' }, // duplicate PRN
      ];

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Roster');
      const buffer = xlsx.write(workbook, { type: 'base64', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/sections/preview-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fileBase64: buffer });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total).toBe(4);
      expect(res.body.data.summary.valid).toBe(1);
      expect(res.body.data.summary.invalid).toBe(2);
      expect(res.body.data.summary.duplicate).toBe(1);
    });

    it('should commit valid students into the section roster', async () => {
      const validStudent = {
        name: 'Rohan Patil',
        prn: `2026VAL${ts}`,
        email: `rohan_${ts}@test.edu`,
        mobile: `9822${ts}4444`,
      };

      const res = await request(app)
        .post(`/api/sections/${createdSection.id}/import-students`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ validStudents: [validStudent] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1);

      // Verify enrolled
      const enrollment = await prisma.sectionStudent.findUnique({
        where: {
          sectionId_prn: {
            sectionId: createdSection.id,
            prn: validStudent.prn,
          },
        },
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.joinedVia).toBe('EXCEL_IMPORT');
    });
  });

  describe('5. Instant Student Join with Verified OTPs', () => {
    it('should enroll a student upon instant join with verified OTPs', async () => {
      const joinPrn = `2026JON${ts}`;
      const joinEmail = `join_${ts}@sanjivani.edu.in`;
      const joinMobile = `982205${ts}`;

      // 1. Verify OTPs first
      const emailOtp = await OtpService.sendEmailOtp(joinEmail, joinPrn);
      await OtpService.verifyEmailOtp(joinEmail, emailOtp.code!, joinPrn);

      const mobileOtp = await OtpService.sendMobileOtp(joinMobile, joinPrn);
      await OtpService.verifyMobileOtp(joinMobile, mobileOtp.code!, joinPrn);

      // 2. Submit Instant Join Form
      const res = await request(app)
        .post('/api/sections/instant-join')
        .send({
          joinToken: createdSection.joinToken,
          name: 'Instant Student',
          prn: joinPrn,
          email: joinEmail,
          mobile: joinMobile,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrolled).toBe(true);
      expect(res.body.data.student.accountState).toBe('ACTIVE');

      // Verify in DB
      const dbUser = await prisma.user.findUnique({ where: { email: joinEmail } });
      expect(dbUser?.accountState).toBe('ACTIVE');
      expect(dbUser?.identityBoundAt).toBeDefined();
    });
  });
});
