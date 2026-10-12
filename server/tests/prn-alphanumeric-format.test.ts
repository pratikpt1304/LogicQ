import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import {
  PRN_REGEX,
  isValidPrn,
  normalizePrn,
  maskPrn,
  setAllowedProgramCodes,
  parseAndValidateAllowlistCsv,
} from '../src/config/academic.config.js';
import { migratePrnFormat } from '../scripts/migrate-prn-format.js';

describe('12-Character Alphanumeric PRN Format & Identity Verification Suite', () => {
  let adminToken = '';
  const adminPassword = 'AdminPassword123!';

  const validPrn1 = '2199TESM0001';
  const validPrn2 = '2199TESF0002';
  const validPrn3 = '2199TESM0003';
  const validPrn4 = '2199TESF0004';

  beforeAll(async () => {
    // Reset allowed program codes to empty (allow any)
    setAllowedProgramCodes([]);

    // Clean up test data
    await prisma.prnHistory.deleteMany({
      where: {
        OR: [
          { oldPrn: { in: [validPrn1, validPrn2, validPrn3, validPrn4, '2199CSAM0001', '2199MECM0001'] } },
          { newPrn: { in: [validPrn1, validPrn2, validPrn3, validPrn4, '2199CSAM0001', '2199MECM0001'] } },
        ],
      },
    });
    await prisma.prnIndex.deleteMany({
      where: { prn: { in: [validPrn1, validPrn2, validPrn3, validPrn4, '2199CSAM0001', '2199MECM0001'] } },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { prn: { in: [validPrn1, validPrn2, validPrn3, validPrn4, '2199CSAM0001', '2199MECM0001'] } },
          { email: { startsWith: 'prn_format_test_' } },
        ],
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@logicq.io', password: adminPassword });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    setAllowedProgramCodes([]);
  });

  describe('1. Regex Pattern & Unit Validation Logic', () => {
    it('accepts valid 12-character PRNs (4 digits, 3 letters, M or F, 4 digits)', () => {
      expect(PRN_REGEX.test('2199TESM0001')).toBe(true);
      expect(PRN_REGEX.test('2199TESF0002')).toBe(true);
      expect(PRN_REGEX.test('2024CSAM1039')).toBe(true);
      expect(PRN_REGEX.test('1999MEEF9999')).toBe(true);
      expect(isValidPrn('2199TESM0001')).toBe(true);
      expect(isValidPrn('2199TESF0002')).toBe(true);
    });

    it('rejects digit-only PRNs, wrong lengths, wrong gender letter, symbols, and internal whitespace', () => {
      expect(PRN_REGEX.test('202612345678')).toBe(false); // 12 digits (old format)
      expect(PRN_REGEX.test('2199TESM001')).toBe(false); // 11 chars
      expect(PRN_REGEX.test('2199TESM00001')).toBe(false); // 13 chars
      expect(PRN_REGEX.test('2199TESX0001')).toBe(false); // X instead of M/F
      expect(PRN_REGEX.test('2199-ESM-001')).toBe(false); // hyphens
      expect(PRN_REGEX.test('2199 TES M001')).toBe(false); // internal spaces
      expect(PRN_REGEX.test('2199TESM000!')).toBe(false); // symbol
    });

    it('normalizes lowercase to canonical uppercase and trims leading/trailing spaces', () => {
      expect(normalizePrn('  2199tesm0001  ')).toBe('2199TESM0001');
      expect(isValidPrn('  2199tesm0001  ')).toBe(true);
      expect(normalizePrn('  2199tesf0002  ')).toBe('2199TESF0002');
      expect(isValidPrn('  2199tesf0002  ')).toBe(true);
    });

    it('filters program codes when allowedProgramCodes is non-empty', () => {
      const allowed = ['CSA', 'AIM'];
      expect(isValidPrn('2024CSAM1039', allowed)).toBe(true);
      expect(isValidPrn('2024AIMF1040', allowed)).toBe(true);
      expect(isValidPrn('2024MECM1041', allowed)).toBe(false); // MEC not in allowed
    });

    it('privacy masking strictly hides first 8 characters (including program letters and M/F) with 8 bullets', () => {
      expect(maskPrn('2199TESM0001')).toBe('••••••••0001');
      expect(maskPrn('2199TESF0002')).toBe('••••••••0002');
      expect(maskPrn('2024CSAM1039')).toBe('••••••••1039');
      // Letters and gender flag are NEVER leaked in maskedPrn
      expect(maskPrn('2199TESM0001')).not.toContain('TES');
      expect(maskPrn('2199TESM0001')).not.toContain('M');
    });
  });

  describe('2. Registration API & Canonical Uppercase Invariant', () => {
    it('accepts lowercase input and stores canonical uppercase in User and PrnIndex', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        prn: '  2199tesm0001  ', // lowercase + spaces
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'SY',
        division: 'A',
        email: 'prn_format_test_1@sanjivani.org.in',
        password: 'Password123!',
      });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.prn).toBe('2199TESM0001'); // canonical uppercase
      expect(regRes.body.data.user.maskedPrn).toBe('••••••••0001');

      // Verify DB storage
      const user = await prisma.user.findUnique({ where: { email: 'prn_format_test_1@sanjivani.org.in' } });
      expect(user?.prn).toBe('2199TESM0001');

      const indexRow = await prisma.prnIndex.findUnique({ where: { prn: '2199TESM0001' } });
      expect(indexRow).not.toBeNull();
      expect(indexRow?.userId).toBe(user?.id);
      expect(indexRow?.status).toBe('ACTIVE');
    });

    it('enforces case-insensitive uniqueness (rejects uppercase duplicate when lowercase registered)', async () => {
      const dupRes = await request(app).post('/api/auth/register').send({
        prn: '2199TESM0001',
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'FY',
        email: 'prn_format_test_dup@sanjivani.org.in',
        password: 'Password123!',
      });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toContain('already registered');
    });
  });

  describe('3. Self-Service Monthly PRN Change with New Format', () => {
    it('allows changing PRN to a valid new alphanumeric format and normalizes to uppercase', async () => {
      // Login student 1
      const loginRes = await request(app).post('/api/auth/login').send({
        identifier: 'prn_format_test_1@sanjivani.org.in',
        password: 'Password123!',
      });
      const token = loginRes.body.data.accessToken;

      // Change PRN
      const changeRes = await request(app)
        .post('/api/users/change-prn')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newPrn: '  2199tesf0002  ',
          confirmPrn: '2199TESF0002',
          reauthConfirmed: true,
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.data.user.maskedPrn).toBe('••••••••0002');

      const user = await prisma.user.findUnique({ where: { email: 'prn_format_test_1@sanjivani.org.in' } });
      expect(user?.prn).toBe('2199TESF0002');

      const oldIndex = await prisma.prnIndex.findUnique({ where: { prn: '2199TESM0001' } });
      expect(oldIndex?.status).toBe('RELEASED_RESERVED');

      const newIndex = await prisma.prnIndex.findUnique({ where: { prn: '2199TESF0002' } });
      expect(newIndex?.status).toBe('ACTIVE');
    });
  });

  describe('4. Admin Allowlist CSV Verification & Status API', () => {
    it('GET /api/admin/allowlist/status returns allowlist enablement status and count', async () => {
      const statusRes = await request(app)
        .get('/api/admin/allowlist/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      expect(typeof statusRes.body.data.isAllowlistEnabled).toBe('boolean');
      expect(typeof statusRes.body.data.entriesCount).toBe('number');
    });

    it('parseAndValidateAllowlistCsv validates format, detects duplicates, and normalizes uppercase', () => {
      const csvContent = `prn,email\n2199TESM0003,student3@sanjivani.org.in\n  2199tesf0004  ,student4@sanjivani.org.in\ninvalid_prn,bad@sanjivani.org.in\n2199TESM0003,another@sanjivani.org.in`;

      const result = parseAndValidateAllowlistCsv(csvContent);
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].prn).toBe('2199TESM0003');
      expect(result.validRows[1].prn).toBe('2199TESF0004'); // normalized to uppercase
      expect(result.errors.length).toBe(2); // 1 invalid PRN, 1 duplicate PRN
      expect(result.duplicatePrns).toContain('2199TESM0003');
    });
  });

  describe('5. Idempotent Migration Script Verification', () => {
    it('runs migratePrnFormat successfully and idempotently', async () => {
      // Run first time
      const summary1 = await migratePrnFormat();
      expect(summary1.scannedUsers).toBeGreaterThan(0);

      // Run second time (must be clean and idempotent)
      const summary2 = await migratePrnFormat();
      expect(summary2.validUpdatedUsers).toBe(0);
      expect(summary2.prnIndexCreated).toBe(0);
      expect(summary2.prnIndexCleaned).toBe(0);
    });
  });
});
