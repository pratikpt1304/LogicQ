import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Authentication API (/api/auth)', () => {
  const uniqueSuffix = String(Date.now()).slice(-4).padStart(4, '0');
  const testPrn = `2199TESM${uniqueSuffix}`;
  const testUser = {
    prn: testPrn,
    college: 'Sanjivani University',
    department: 'CSE',
    year: 'SY',
    division: 'A1',
    email: `test_${Date.now()}@sanjivani.org.in`,
    password: 'Password123!',
  };

  afterAll(async () => {
    await prisma.prnIndex.deleteMany({
      where: { prn: testPrn },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test_' } },
    });
  });

  it('should register a new student user with PRN and return cookies', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.prn).toBe(testUser.prn);
    expect(res.body.data.user.maskedPrn).toBe(`••••••••${testPrn.slice(-4)}`);
    expect(res.body.data.user.department).toBe('CSE');
    expect(res.body.data.user.year).toBe('SY');
    expect(res.body.data.user.division).toBe('A1');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject duplicate registration with same PRN or email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect([400, 409]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate user via login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should reject login with incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fetch current user profile with valid access token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testUser.email);
  });
});
