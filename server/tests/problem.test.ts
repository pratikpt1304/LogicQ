import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Problems API (/api/problems) with FEATURE_ARCHIVE=false', () => {
  it('should fetch the daily challenge, include the 7-day current week strip, and never expose hidden test cases', async () => {
    const res = await request(app).get('/api/problems/daily');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem).toBeDefined();
    expect(res.body.data.todayIST).toBeDefined();
    expect(Array.isArray(res.body.data.currentWeek)).toBe(true);
    expect(res.body.data.currentWeek).toHaveLength(7);

    // Verify security: no test cases with isHidden: true returned
    const testCases = res.body.data.problem.testCases;
    for (const tc of testCases) {
      expect(tc.isHidden).toBe(false);
    }
  });

  it('should reject full archive problem listing (/api/problems) with 404 Not Found when FEATURE_ARCHIVE=false', async () => {
    const res = await request(app).get('/api/problems?difficulty=EASY&limit=5');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should fetch an unlocked challenge of the current week (sum-of-multiples) by slug without hidden test cases', async () => {
    const res = await request(app).get('/api/problems/sum-of-multiples');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem.slug).toBe('sum-of-multiples');

    const testCases = res.body.data.problem.testCases;
    for (const tc of testCases) {
      expect(tc.isHidden).toBe(false);
    }
  });

  it('should reject locked future days of the current week and past-week challenges with 404 Not Found', async () => {
    const [futureRes, pastWeekRes] = await Promise.all([
      request(app).get('/api/problems/valid-parentheses-stack'),
      request(app).get('/api/problems/circular-buffer-fifo'),
    ]);

    expect(futureRes.status).toBe(404);
    expect(futureRes.body.success).toBe(false);
    expect(pastWeekRes.status).toBe(404);
    expect(pastWeekRes.body.success).toBe(false);
  });
});
