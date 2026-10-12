import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('PRN Signup, Academic Profile, Privacy & Admin Audited Identity Rules', () => {
  let adminToken = '';
  const adminPassword = 'AdminPassword123!';

  beforeAll(async () => {
    const testPrns = [
      '202699990001',
      '202699990002',
      '202699990003',
      '202699990004',
      '202699990005',
      '202699990006',
    ];
    await prisma.prnIndex.deleteMany({ where: { prn: { in: testPrns } } });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { prn: { in: testPrns } },
          {
            email: {
              in: [
                'prn1@sanjivani.org.in',
                'prn2@sanjivani.org.in',
                'prn3@sanjivani.org.in',
                'prn4@sanjivani.org.in',
                'google.incomplete@sanjivani.org.in',
              ],
            },
          },
        ],
      },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@logicq.io', password: adminPassword });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.accessToken;
  });

  it('rejects signup when PRN is fewer or more than 12 digits or contains letters', async () => {
    for (const badPrn of ['12345678901', '1234567890123', '2026ABCD0001', '']) {
      const res = await request(app).post('/api/auth/register').send({
        prn: badPrn,
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'FY',
        division: 'A',
        email: 'prn1@sanjivani.org.in',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('PRN must be exactly 12 digits');
    }
  });

  it('rejects invalid college, department, year, or division on server side', async () => {
    const badCollege = await request(app).post('/api/auth/register').send({
      prn: '202699990001',
      college: 'Other College',
      department: 'AIML',
      year: 'FY',
      email: 'prn1@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(badCollege.status).toBe(400);

    const badDept = await request(app).post('/api/auth/register').send({
      prn: '202699990001',
      college: 'Sanjivani University',
      department: 'Civil',
      year: 'FY',
      email: 'prn1@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(badDept.status).toBe(400);

    const badYear = await request(app).post('/api/auth/register').send({
      prn: '202699990001',
      college: 'Sanjivani University',
      department: 'CSE',
      year: 'FinalYear',
      email: 'prn1@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(badYear.status).toBe(400);

    const badDiv = await request(app).post('/api/auth/register').send({
      prn: '202699990001',
      college: 'Sanjivani University',
      department: 'CSE',
      year: 'FY',
      division: 'ABCD',
      email: 'prn1@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(badDiv.status).toBe(400);
  });

  it('creates student profile with trimmed 12-digit PRN, uppercase division, and atomic prnIndex record', async () => {
    const res = await request(app).post('/api/auth/register').send({
      prn: '  202699990001  ',
      college: 'Sanjivani University',
      department: 'Integrated M.Tech',
      year: 'SY',
      division: 'c1',
      email: 'prn1@sanjivani.org.in',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.prn).toBe('202699990001');
    expect(res.body.data.user.maskedPrn).toBe('••••••0001');
    expect(res.body.data.user.college).toBe('Sanjivani University');
    expect(res.body.data.user.department).toBe('Integrated M.Tech');
    expect(res.body.data.user.year).toBe('SY');
    expect(res.body.data.user.division).toBe('C1');
    expect(res.body.data.user.profileComplete).toBe(true);

    const indexRow = await prisma.prnIndex.findUnique({ where: { prn: '202699990001' } });
    expect(indexRow).not.toBeNull();
    expect(indexRow?.userId).toBe(res.body.data.user.id);
  });

  it('enforces PRN uniqueness via prnIndex and rejects duplicate PRN registration', async () => {
    const dupRes = await request(app).post('/api/auth/register').send({
      prn: '202699990001',
      college: 'Sanjivani University',
      department: 'CSE',
      year: 'TY',
      email: 'prn2@sanjivani.org.in',
      password: 'Password123!',
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toContain('already registered');
  });

  it('prevents a student from modifying PRN or college while allowing Department, Year, Division, and valid Display Name updates', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'prn1@sanjivani.org.in', password: 'Password123!' });
    const studentToken = loginRes.body.data.accessToken;
    const studentId = loginRes.body.data.user.id;

    // Attempt to change PRN -> 403
    const prnAttempt = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ prn: '202699990009' });
    expect(prnAttempt.status).toBe(403);

    // Attempt to change College -> 403
    const collegeAttempt = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ college: 'Another University' });
    expect(collegeAttempt.status).toBe(403);

    // Reject PRN-like or profane displayName
    const prnLikeDisplay = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ displayName: '202699990001' });
    expect(prnLikeDisplay.status).toBe(400);

    // Allowed update: Department, Year, Division, DisplayName
    const validUpdate = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        department: 'AIDS',
        year: 'TY',
        division: 'b2',
        displayName: 'CodeNinja_TY',
      });
    expect(validUpdate.status).toBe(200);
    expect(validUpdate.body.data.user.department).toBe('AIDS');
    expect(validUpdate.body.data.user.year).toBe('TY');
    expect(validUpdate.body.data.user.division).toBe('B2');
    expect(validUpdate.body.data.user.displayName).toBe('CodeNinja_TY');
    expect(validUpdate.body.data.user.maskedPrn).toBe('••••••0001');

    // Register a second student to verify privacy rules between peers
    const peerReg = await request(app).post('/api/auth/register').send({
      prn: '202699990002',
      college: 'Sanjivani University',
      department: 'Mechanical',
      year: 'FY',
      email: 'prn2@sanjivani.org.in',
      password: 'Password123!',
    });
    expect(peerReg.status).toBe(201);
    const peerToken = peerReg.body.data.accessToken;
    const peerId = peerReg.body.data.user.id;

    // Peer viewing student 1's public profile must NEVER see prn, maskedPrn, or email
    const peerView1 = await request(app)
      .get(`/api/users/${studentId}/profile`)
      .set('Authorization', `Bearer ${peerToken}`);
    expect(peerView1.status).toBe(200);
    expect(peerView1.body.data.user.prn).toBeUndefined();
    expect(peerView1.body.data.user.maskedPrn).toBeUndefined();
    expect(peerView1.body.data.user.email).toBeUndefined();
    expect(peerView1.body.data.user.publicDisplayName).toBe('CodeNinja_TY');

    // Student 1 viewing peer 2 (who has no displayName) sees fallback "Student xxxx" and no PRN
    const studentViewPeer = await request(app)
      .get(`/api/users/${peerId}/profile`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentViewPeer.status).toBe(200);
    expect(studentViewPeer.body.data.user.prn).toBeUndefined();
    expect(studentViewPeer.body.data.user.maskedPrn).toBeUndefined();
    expect(studentViewPeer.body.data.user.publicDisplayName).toMatch(/^Student [0-9A-F]{4}$/);

    // Leaderboard never leaks PRN for other students, only maskedPrn on viewer's own row
    const lbRes = await request(app)
      .get('/api/leaderboard?department=AIDS&year=TY')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(lbRes.status).toBe(200);
    for (const row of lbRes.body.data.leaderboard) {
      expect(row.prn).toBeUndefined();
      expect(row.department).toBe('AIDS');
      expect(row.year).toBe('TY');
      if (row.id === studentId) {
        expect(row.maskedPrn).toBe('••••••0001');
      } else {
        expect(row.maskedPrn).toBeUndefined();
      }
    }
  });

  it('blocks access to dashboard APIs until an incomplete Google sign-in profile is completed', async () => {
    const googleRes = await request(app).post('/api/auth/google').send({
      email: 'google.incomplete@sanjivani.org.in',
      googleId: 'google-uid-99990003',
    });
    expect(googleRes.status).toBe(200);
    expect(googleRes.body.data.user.profileComplete).toBe(false);
    const tempToken = googleRes.body.data.accessToken;

    // Blocked from dashboard stats until profile is completed
    const blockedRes = await request(app)
      .get('/api/users/dashboard/stats')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.code).toBe('PROFILE_INCOMPLETE');

    // Complete profile step
    const completeRes = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${tempToken}`)
      .send({
        prn: '202699990003',
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'FY',
        division: 'a1',
      });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.user.profileComplete).toBe(true);
    expect(completeRes.body.data.user.prn).toBe('202699990003');
    expect(completeRes.body.data.user.division).toBe('A1');

    // Now allowed
    const allowedRes = await request(app)
      .get('/api/users/dashboard/stats')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(allowedRes.status).toBe(200);
  });

  it('allows Admin to update PRN/academic identity with password re-authentication and updates prnIndex safely', async () => {
    const targetUser = await prisma.user.findUnique({ where: { prn: '202699990003' } });
    expect(targetUser).not.toBeNull();

    // Missing or wrong adminPassword -> 401
    const wrongPass = await request(app)
      .patch(`/api/admin/users/${targetUser!.id}/academic-identity`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        prn: '202699990004',
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'SY',
        division: 'B',
        adminPassword: 'WrongPassword!',
        reason: 'Typo correction requested by student',
      });
    expect(wrongPass.status).toBe(401);

    // Valid audited update -> 200
    const validAdminUpdate = await request(app)
      .patch(`/api/admin/users/${targetUser!.id}/academic-identity`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        prn: '202699990004',
        college: 'Sanjivani University',
        department: 'AIML',
        year: 'SY',
        division: 'B',
        adminPassword,
        reason: 'Official Registrar PRN correction',
      });
    expect(validAdminUpdate.status).toBe(200);
    expect(validAdminUpdate.body.data.user.prn).toBe('202699990004');

    const oldIndex = await prisma.prnIndex.findUnique({ where: { prn: '202699990003' } });
    const newIndex = await prisma.prnIndex.findUnique({ where: { prn: '202699990004' } });
    expect(oldIndex).toBeNull();
    expect(newIndex?.userId).toBe(targetUser!.id);
  });

  it('frees prnIndex on account deletion and anonymizes submissions so the PRN can be re-registered', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'prn2@sanjivani.org.in', password: 'Password123!' });
    const token = loginRes.body.data.accessToken;

    const delRes = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmPrn: '202699990002' });
    expect(delRes.status).toBe(200);

    const freedIndex = await prisma.prnIndex.findUnique({ where: { prn: '202699990002' } });
    expect(freedIndex).toBeNull();
  });

  it('verifies firestore.rules enforces prnIndex lock, private users read, and immutable PRN/college on student update', () => {
    const rulesPath = path.resolve(__dirname, '../../firestore.rules');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).toContain('match /prnIndex/{prn}');
    expect(rules).toContain('changedKeys.hasOnly([');
    expect(rules).toContain('!changedKeys.hasAny([');
    expect(rules).toContain("'AIML'");
    expect(rules).toContain("'Integrated M.Tech'");
    expect(rules).toContain("'Integrated B.Tech'");
  });
});
