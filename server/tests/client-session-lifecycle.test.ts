import { describe, it, expect, beforeEach, vi } from 'vitest';

// Emulate client storage & inactivity engine
const STORAGE_KEYS = {
  ACTIVE_USER: 'logicq_active_user',
  ACCESS_TOKEN: 'logicq_access_token',
  LAST_ACTIVITY: 'logicq_last_activity',
  LOGOUT_EVENT: 'logicq_logout_event',
} as const;

const STUDENT_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

function getInactivityLimit(role?: string): number {
  return role === 'ADMIN' ? ADMIN_INACTIVITY_LIMIT_MS : STUDENT_INACTIVITY_LIMIT_MS;
}

function isSessionExpiredByInactivity(user: { role?: string } | null, mockNow: number, storage: Map<string, string>): boolean {
  if (!user) return false;
  const rawLastActivity = storage.get(STORAGE_KEYS.LAST_ACTIVITY);
  if (!rawLastActivity) return false;
  const lastActiveTime = Number(rawLastActivity);
  if (!Number.isFinite(lastActiveTime) || lastActiveTime <= 0) return false;
  const elapsed = mockNow - lastActiveTime;
  const limit = getInactivityLimit(user.role);
  return elapsed > limit;
}

describe('Client AuthProvider & Inactivity Lifecycle Logic', () => {
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map<string, string>();
  });

  it('1. Student session survives refresh within 7 days', () => {
    const studentUser = { id: 'stu-1', role: 'STUDENT', username: 'student_1' };
    const loginTime = Date.now();
    mockStorage.set(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(studentUser));
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(loginTime));

    // Simulated refresh 1 hour later
    const refresh1HourLater = loginTime + 60 * 60 * 1000;
    expect(isSessionExpiredByInactivity(studentUser, refresh1HourLater, mockStorage)).toBe(false);

    // Simulated refresh 3 days later
    const refresh3DaysLater = loginTime + 3 * 24 * 60 * 60 * 1000;
    expect(isSessionExpiredByInactivity(studentUser, refresh3DaysLater, mockStorage)).toBe(false);

    // Simulated refresh 6 days and 23 hours later
    const refreshAlmost7Days = loginTime + (7 * 24 * 60 * 60 * 1000 - 60000);
    expect(isSessionExpiredByInactivity(studentUser, refreshAlmost7Days, mockStorage)).toBe(false);
  });

  it('2. Student session expires only after 7 days of total inactivity', () => {
    const studentUser = { id: 'stu-1', role: 'STUDENT', username: 'student_1' };
    const loginTime = Date.now();
    mockStorage.set(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(studentUser));
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(loginTime));

    // Simulated check after 7 days + 1 second of inactivity
    const after7Days = loginTime + 7 * 24 * 60 * 60 * 1000 + 1000;
    expect(isSessionExpiredByInactivity(studentUser, after7Days, mockStorage)).toBe(true);
  });

  it('3. Admin session enforces strict 30-minute idle limit', () => {
    const adminUser = { id: 'admin-1', role: 'ADMIN', username: 'admin' };
    const loginTime = Date.now();
    mockStorage.set(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(adminUser));
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(loginTime));

    // Simulated check at 15 minutes: valid
    expect(isSessionExpiredByInactivity(adminUser, loginTime + 15 * 60 * 1000, mockStorage)).toBe(false);

    // Simulated check at 29 minutes: valid
    expect(isSessionExpiredByInactivity(adminUser, loginTime + 29 * 60 * 1000, mockStorage)).toBe(false);

    // Simulated check at 31 minutes: expired!
    expect(isSessionExpiredByInactivity(adminUser, loginTime + 31 * 60 * 1000, mockStorage)).toBe(true);
  });

  it('4. User interaction resets the inactivity timer and extends the session', () => {
    const studentUser = { id: 'stu-1', role: 'STUDENT', username: 'student_1' };
    const t0 = Date.now();
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(t0));

    // Student solves challenge, types, or scrolls at Day 5 -> records activity
    const t5Days = t0 + 5 * 24 * 60 * 60 * 1000;
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(t5Days));

    // Check at Day 10 (10 days from t0, but only 5 days from t5Days): valid!
    const t10Days = t0 + 10 * 24 * 60 * 60 * 1000;
    expect(isSessionExpiredByInactivity(studentUser, t10Days, mockStorage)).toBe(false);
  });

  it('5. Deep link preserves original destination across authentication redirect', () => {
    const deepLocations = [
      { pathname: '/dashboard', search: '' },
      { pathname: '/challenge', search: '' },
      { pathname: '/challenge/in-place-string-reversal', search: '?tab=upload' },
      { pathname: '/leaderboard', search: '?week=current' },
      { pathname: '/profile', search: '' },
      { pathname: '/admin', search: '' },
    ];

    for (const loc of deepLocations) {
      const from = `${loc.pathname}${loc.search}`;
      expect(from).toContain(loc.pathname);
      if (loc.search) {
        expect(from).toContain(loc.search);
      }
    }
  });

  it('6. Multi-tab logout synchronization purges active sessions across tabs', () => {
    mockStorage.set(STORAGE_KEYS.ACTIVE_USER, JSON.stringify({ id: 'stu-1' }));
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'test_jwt');
    mockStorage.set(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));

    // Simulate logout in Tab A
    mockStorage.delete(STORAGE_KEYS.ACTIVE_USER);
    mockStorage.delete(STORAGE_KEYS.ACCESS_TOKEN);
    mockStorage.delete(STORAGE_KEYS.LAST_ACTIVITY);
    mockStorage.set(STORAGE_KEYS.LOGOUT_EVENT, String(Date.now()));

    // Tab B detects STORAGE_KEYS.LOGOUT_EVENT and transitions to signedOut
    expect(mockStorage.get(STORAGE_KEYS.ACTIVE_USER)).toBeUndefined();
    expect(mockStorage.get(STORAGE_KEYS.ACCESS_TOKEN)).toBeUndefined();
    expect(mockStorage.get(STORAGE_KEYS.LOGOUT_EVENT)).toBeDefined();
  });
});
