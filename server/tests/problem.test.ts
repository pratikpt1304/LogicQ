import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { setDailyChallengePausedForTesting } from '../src/services/system-config.service.js';
import { ensureCurrentWeekSchedule, resetScheduleSyncCache } from '../src/controllers/problem.controller.js';

describe('Problems API (/api/problems) — Single Visible Question Rule (17:00 IST to 17:00 IST)', () => {
  beforeAll(async () => {
    setDailyChallengePausedForTesting(false);
    resetScheduleSyncCache();
    await ensureCurrentWeekSchedule();
  });

  afterAll(() => {
    setDailyChallengePausedForTesting(true);
  });
  it('should fetch only today’s single active daily challenge with private Cache-Control and never expose hidden test cases or a 7-day strip', async () => {
    const res = await request(app).get('/api/problems/daily');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.problem).toBeDefined();
    expect(res.body.data.todayIST).toBeDefined();
    expect(res.body.data.endsAt).toBeDefined();
    expect(res.body.data.currentWeek).toBeUndefined();
    expect(res.headers['cache-control']).toContain('private');
    expect(res.headers['cache-control']).toContain('must-revalidate');

    // Verify security: no test cases with isHidden: true returned
    const testCases = res.body.data.problem.testCases;
    for (const tc of testCases) {
      expect(tc.isHidden).toBe(false);
    }
  });

  it('should reject problem listing (/api/problems) and student week strip (/api/problems/current-week) with 404 Not Found', async () => {
    const [listRes, weekRes] = await Promise.all([
      request(app).get('/api/problems?difficulty=EASY&limit=5'),
      request(app).get('/api/problems/current-week'),
    ]);

    expect(listRes.status).toBe(404);
    expect(listRes.body.success).toBe(false);
    expect(weekRes.status).toBe(404);
    expect(weekRes.body.success).toBe(false);
  });

  it('should fetch today’s active challenge by slug without hidden test cases', async () => {
    const dailyRes = await request(app).get('/api/problems/daily');
    const activeSlug = dailyRes.body.data.problem.slug;

    const res = await request(app).get(`/api/problems/${activeSlug}`);

    expect(res.status).toBe(200);
    expect(res.body.data.problem.slug).toBe(activeSlug);
    expect(res.body.data.problem.testCases.every((tc: any) => !tc.isHidden)).toBe(true);
  });

  it('should return 410 CHALLENGE_ENDED (without statement/samples/tests) for ended challenges and 404 for future challenges', async () => {
    const [endedRes, futureRes] = await Promise.all([
      request(app).get('/api/problems/circular-buffer-fifo'),
      request(app).get('/api/problems/valid-parentheses'),
    ]);

    expect(endedRes.status).toBe(410);
    expect(endedRes.body.code).toBe('CHALLENGE_ENDED');
    expect(endedRes.body.ended).toBe(true);
    expect(endedRes.body.data?.problem?.description).toBeUndefined();
    expect(endedRes.body.data?.problem?.testCases).toBeUndefined();

    expect(futureRes.status).toBe(404);
  });
});
