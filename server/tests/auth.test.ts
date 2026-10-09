import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Authentication API (/api/auth)', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    fullName: 'Test User',
    college: 'Test University',
  };

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test_' } },
    });
  });

  it('should register a new student user and return cookies', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject duplicate registration with same email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate user via login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(testUser.username);
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
