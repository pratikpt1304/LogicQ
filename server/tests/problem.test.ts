import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Problems API (/api/problems)', () => {
  it('should fetch the daily challenge and never expose hidden test cases', async () => {
    const res = await request(app).get('/api/problems/daily');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem).toBeDefined();
    expect(res.body.data.todayIST).toBeDefined();

    // Verify security: no test cases with isHidden: true returned
    const testCases = res.body.data.problem.testCases;
    for (const tc of testCases) {
      expect(tc.isHidden).toBe(false);
    }
  });

  it('should list published problems with pagination and filters', async () => {
    const res = await request(app).get('/api/problems?difficulty=EASY&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.problems)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();

    for (const prob of res.body.data.problems) {
      expect(prob.difficulty).toBe('EASY');
    }
  });

  it('should fetch problem details by slug without hidden test cases', async () => {
    const res = await request(app).get('/api/problems/sum-of-multiples');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem.slug).toBe('sum-of-multiples');

    const testCases = res.body.data.problem.testCases;
    for (const tc of testCases) {
      expect(tc.isHidden).toBe(false);
    }
  });
});
