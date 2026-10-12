import { User } from '../types/index.js';

const STORAGE_KEYS = {
  USERS: 'logicq_fallback_users_v1',
  CURRENT_USER_ID: 'logicq_fallback_current_user_id_v1',
  SUBMISSIONS: 'logicq_fallback_submissions_v1',
  PROBLEMS: 'logicq_fallback_problems_v1',
};

const DEFAULT_PROBLEMS = [
  {
    id: 'kanetkar-ch1-scope-shadow-eval',
    slug: 'kanetkar-ch1-scope-shadow-eval',
    title: 'Block Scope & Variable Shadowing Evaluator',
    difficulty: 'EASY',
    category: 'Declarations and Initializations',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    tags: ['Scope', 'Shadowing', 'Variables', 'Basics'],
    description: `### Problem Description

In C, variables declared in an inner block shadow variables of the same name declared in an enclosing outer block or at file scope (Yashavant Kanetkar, *Test Your C Skills*, Chapter 1: Declarations and Initializations).

Given three integer inputs:
- An outer global initial base value $G$
- An enclosing function local value $L$
- An innermost block value $B$
- A sequence of $K$ block entry and exit operations (\`ENTER M\` or \`EXIT\`)

Simulate the lexical scope resolution and print the resolved active value after each operation.

### Input Format
- First line: Three space-separated integers $G$, $L$, and $B$.
- Second line: Integer $K$.
- Next $K$ lines: Either \`ENTER M\` or \`EXIT\`.

### Output Format
Print the active scoped value after each operation.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int g, l, b;
    if (scanf("%d %d %d", &g, &l, &b) != 3) return 0;
    
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    // TODO: Track nested scope stack and print resolved value after each operation
    
    return 0;
}`,
    testCases: [
      { id: 'tc-1', input: '10 20 30\n3\nENTER 2\nEXIT\nENTER 5\n', expectedOutput: '60\n30\n150\n', isSample: true, isHidden: false },
      { id: 'tc-2', input: '5 15 25\n2\nEXIT\nEXIT\n', expectedOutput: '15\n5\n', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'kanetkar-ch2-switch-fallthrough-calc',
    slug: 'kanetkar-ch2-switch-fallthrough-calc',
    title: 'Switch-Case Fallthrough State Machine',
    difficulty: 'EASY',
    category: 'Control Instructions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['Switch Case', 'Fallthrough', 'Control Flow', 'Basics'],
    description: `### Problem Description

In standard C, \`switch\` statements execute sequentially from the matched \`case\` label until an explicit \`break\` is encountered (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2: Control Instructions).

Given an initial accumulator value $V_0$, switch code $C$, and four operation modifiers $X_1, X_2, X_3, X_4$:
- Case 1: Add $X_1$ to $A$ (falls through to Case 2)
- Case 2: Multiply $A$ by $X_2$ (falls through to Case 3)
- Case 3: Subtract $X_3$ from $A$ (has break)
- Case 4: Set $A = A \\oplus X_4$ (has break)

Compute the final accumulator value.`,
    starterCode: `#include <stdio.h>

int main() {
    long long v0;
    int c;
    if (scanf("%lld %d", &v0, &c) != 2) return 0;
    
    long long x1, x2, x3, x4;
    if (scanf("%lld %lld %lld %lld", &x1, &x2, &x3, &x4) != 4) return 0;
    
    // TODO: Implement switch-case with fallthrough semantics
    
    return 0;
}`,
    testCases: [
      { id: 'tc-3', input: '10 1\n5 2 7 9\n', expectedOutput: '23\n', isSample: true, isHidden: false },
      { id: 'tc-4', input: '10 2\n5 2 7 9\n', expectedOutput: '13\n', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'kanetkar-ch7-multidim-pointer-arithmetic',
    slug: 'kanetkar-ch7-multidim-pointer-arithmetic',
    title: 'Multi-Dimensional Array Pointer Arithmetic & Offsets',
    difficulty: 'MEDIUM',
    category: 'Pointers',
    basePoints: 30,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['Pointers', 'Arrays', 'Pointer Arithmetic', 'Address Calculations'],
    description: `### Problem Description

In C pointer arithmetic, array indexing is identical to pointer dereferencing: \`a[i][j][k]\` is strictly defined as \`*(*(*(a + i) + j) + k)\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Pointers).

Compute the linear offset, element value, and byte address for 3D array coordinate queries, or decompose linear offsets back to coordinates.`,
    starterCode: `#include <stdio.h>

int main() {
    int d1, d2, d3;
    long long b0;
    if (scanf("%d %d %d %lld", &d1, &d2, &d3, &b0) != 4) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Process coordinate and linear pointer offset queries
    
    return 0;
}`,
    testCases: [
      { id: 'tc-5', input: '2 3 4 1000\n2\nCOORD 1 2 3\nLINEAR 7\n', expectedOutput: 'VAL: 24 OFFSET: 23 ADDR: 1092\nI: 0 J: 1 K: 3\n', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'kanetkar-ch14-bitwise-slot-masking',
    slug: 'kanetkar-ch14-bitwise-slot-masking',
    title: 'Bitwise Slot Array Masking & Parity Inspector',
    difficulty: 'EASY',
    category: 'Bitwise Operators',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['Bitwise', 'Bitmask', 'Shifting', 'Basics'],
    description: `### Problem Description

In systems C programming, bitwise operators allow compact manipulation of packed bitfields and hardware flag registers (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14: Bitwise Operators).

Implement a 32-bit register flag manager supporting SET, CLEAR, FLIP, TEST, COUNT, and HEX operations.`,
    starterCode: `#include <stdio.h>

int main() {
    unsigned int reg;
    if (scanf("%u", &reg) != 1) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Implement bitwise operations on reg
    
    return 0;
}`,
    testCases: [
      { id: 'tc-6', input: '0\n5\nSET 3\nTEST 3\nTEST 2\nCOUNT\nHEX\n', expectedOutput: '1\n0\n1\n00000008\n', isSample: true, isHidden: false },
      { id: 'tc-7', input: '15\n3\nFLIP 0\nCOUNT\nHEX\n', expectedOutput: '3\n0000000E\n', isSample: true, isHidden: false },
    ],
  },
];

let memoryProblems: any[] = DEFAULT_PROBLEMS.map((p) => ({ ...p }));

function getStoredProblems(): any[] {
  return memoryProblems;
}

function saveStoredProblems(problems: any[]) {
  memoryProblems = problems;
}

function getStoredUsers(): Array<User & { password?: string; isBanned?: boolean; createdAt?: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const seeded: Array<User & { password?: string; isBanned?: boolean; createdAt?: string }> = [
    {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@logicq.io',
      fullName: 'Bitwise Club Admin',
      role: 'ADMIN',
      college: 'Sanjivani College of Engineering',
      totalPoints: 120,
      currentStreak: 5,
      longestStreak: 7,
      password: 'password123',
      isBanned: false,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seeded));
  return seeded;
}

function saveStoredUsers(users: Array<User & { password?: string; isBanned?: boolean; createdAt?: string }>) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getCurrentUser(): User | null {
  try {
    const activeRaw = localStorage.getItem('logicq_active_user');
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active && typeof active === 'object' && active.id) {
        return active;
      }
    }
  } catch {
    // ignore
  }

  const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!id) return null;
  const users = getStoredUsers();
  const found = users.find((u) => u.id === id);
  if (!found || found.isBanned) return null;
  const { password: _, ...safeUser } = found;
  return safeUser;
}

function getStoredSubmissions(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveStoredSubmissions(subs: any[]) {
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
}

function getSecondsUntilNext1700IST(): number {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const target = new Date(istNow);
  target.setUTCHours(17, 0, 0, 0);
  if (istNow >= target) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return Math.max(60, Math.floor((target.getTime() - istNow.getTime()) / 1000));
}

export async function handleFallbackRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};
  const [path, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // AUTH ROUTES
  if (path === '/auth/me' && method === 'GET') {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    return { success: true, data: { user } };
  }

  if (path === '/auth/register' && method === 'POST') {
    const { prn, username, email, password, fullName, college, department, year, division } = body;
    const cleanPrn = String(prn || '').trim();
    if (!/^[0-9]{12}$/.test(cleanPrn)) {
      throw new Error('PRN must be exactly 12 digits.');
    }
    const users = getStoredUsers();
    if (users.some((u) => u.prn === cleanPrn)) {
      throw new Error('This PRN is already registered to an account.');
    }
    if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      throw new Error('Email is already registered');
    }
    const shortId = cleanPrn.slice(-4);
    const cleanDivision = division ? String(division).trim().toUpperCase() : null;
    const newUser: User & { password?: string; isBanned?: boolean; createdAt?: string } = {
      id: `usr-${Date.now()}`,
      prn: cleanPrn,
      maskedPrn: `••••••${shortId}`,
      username: username || `stu_${shortId}`,
      email,
      fullName: fullName || `${department || 'CSE'} • ${year || 'FY'} • ••••••${shortId}`,
      displayName: null,
      shortId,
      role: 'STUDENT',
      college: college || 'Sanjivani University',
      department: department || 'CSE',
      year: year || 'FY',
      division: cleanDivision,
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password,
      isBanned: false,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveStoredUsers(users);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
    const { password: _, ...safeUser } = newUser;
    return {
      success: true,
      message: 'Account created successfully',
      data: { user: safeUser, accessToken: `fallback-jwt-${newUser.id}` },
    };
  }

  if (path === '/auth/complete-profile' && method === 'POST') {
    const current = getCurrentUser();
    if (!current) throw new Error('Not authenticated');
    const { prn, college, department, year, division } = body;
    const cleanPrn = String(prn || '').trim();
    if (!/^[0-9]{12}$/.test(cleanPrn)) {
      throw new Error('PRN must be exactly 12 digits.');
    }
    const users = getStoredUsers();
    if (users.some((u) => u.prn === cleanPrn && u.id !== current.id)) {
      throw new Error('This PRN is already registered to an account.');
    }
    const idx = users.findIndex((u) => u.id === current.id);
    const shortId = cleanPrn.slice(-4);
    const updated = {
      ...users[idx],
      prn: cleanPrn,
      maskedPrn: `••••••${shortId}`,
      college: college || 'Sanjivani University',
      department: department || 'CSE',
      year: year || 'FY',
      division: division ? String(division).trim().toUpperCase() : null,
      profileComplete: true,
    };
    users[idx] = updated;
    saveStoredUsers(users);
    const { password: _, ...safeUser } = updated;
    return {
      success: true,
      message: 'Academic profile completed successfully',
      data: { user: safeUser },
    };
  }

  if (path === '/auth/login' && method === 'POST') {
    const { identifier, password } = body;
    const users = getStoredUsers();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === String(identifier).toLowerCase() ||
        u.username.toLowerCase() === String(identifier).toLowerCase() ||
        u.prn === String(identifier).trim()
    );
    if (!found || (found.password && found.password !== password)) {
      throw new Error('Invalid email/PRN or password');
    }
    if (found.isBanned) {
      throw new Error('Your account has been suspended by an administrator.');
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    const { password: _, ...safeUser } = found;
    return {
      success: true,
      message: 'Signed in successfully',
      data: { user: safeUser, accessToken: `fallback-jwt-${found.id}` },
    };
  }

  if (path === '/auth/google' && method === 'POST') {
    const { email, fullName, avatarUrl } = body;
    const users = getStoredUsers();
    let found = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!found) {
      const baseUsername = String(email || 'student')
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 24);
      found = {
        id: `usr-google-${Date.now()}`,
        username: baseUsername,
        email: email || `${baseUsername}@sanjivani.org.in`,
        fullName: fullName || baseUsername,
        avatarUrl,
        role: 'STUDENT',
        college: 'Sanjivani University',
        profileComplete: false,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        isBanned: false,
        createdAt: new Date().toISOString(),
      };
      users.push(found);
      saveStoredUsers(users);
    }
    if (found.isBanned) {
      throw new Error('Your account has been suspended by an administrator.');
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    const { password: _, ...safeUser } = found;
    return {
      success: true,
      data: { user: safeUser, accessToken: `fallback-jwt-${found.id}` },
    };
  }

  if (path === '/auth/forgot-password' && method === 'POST') {
    return {
      success: true,
      message: 'If that email is registered, a password reset link has been generated.',
      data: { debugResetToken: 'reset-demo-token' },
    };
  }

  if (path === '/auth/reset-password' && method === 'POST') {
    return {
      success: true,
      message: 'Password reset successfully. You may now sign in.',
    };
  }

  if (path === '/auth/logout' || path === '/auth/logout-all') {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    return { success: true };
  }

  // PROBLEMS ROUTES
  const buildFallbackCurrentWeek = () => {
    const user = getCurrentUser();
    const subs = getStoredSubmissions();
    const problems = getStoredProblems();
    return Array.from({ length: 7 }, (_, idx) => {
      const dayNumber = idx + 1;
      const isLocked = dayNumber > 5;
      const prob = problems[idx % problems.length];
      if (isLocked) {
        return {
          dayNumber,
          scheduledDate: `2026-10-1${dayNumber}`,
          status: 'LOCKED',
          isToday: false,
          isSolved: false,
          unlocksAt: `2026-10-1${dayNumber}T17:00:00+05:30`,
          unlockLabel: `Unlocks at 17:00 IST`,
          problem: null,
        };
      }
      return {
        dayNumber,
        scheduledDate: `2026-10-1${dayNumber}`,
        status: 'UNLOCKED',
        isToday: dayNumber === 5,
        isSolved: user
          ? subs.some((s) => s.userId === user.id && s.problemId === prob.id && s.verdict === 'ACCEPTED')
          : false,
        unlocksAt: `2026-10-1${dayNumber}T17:00:00+05:30`,
        unlockLabel: 'Unlocked at 17:00 IST',
        problem: {
          id: prob.id,
          slug: prob.slug,
          title: prob.title,
          difficulty: prob.difficulty,
          category: prob.category,
          basePoints: prob.basePoints,
        },
      };
    });
  };

  if (path === '/problems/current-week' && method === 'GET') {
    const user = getCurrentUser();
    if (user?.role !== 'ADMIN') {
      const err = new Error('Not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return {
      success: true,
      data: {
        days: buildFallbackCurrentWeek(),
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
      },
    };
  }

  if (path === '/problems/daily' && method === 'GET') {
    const user = getCurrentUser();
    const subs = getStoredSubmissions();
    const problems = getStoredProblems();
    const daily = problems.find((p) => p.isDaily) || problems[0];
    const isSolved = user
      ? subs.some((s) => s.userId === user.id && s.problemId === daily.id && s.verdict === 'ACCEPTED')
      : false;
    const secondsUntilNextReset = getSecondsUntilNext1700IST();
    return {
      success: true,
      data: {
        problem: daily,
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === daily.id).length },
        secondsUntilNextReset,
        endsAt: new Date(Date.now() + secondsUntilNextReset * 1000).toISOString(),
      },
    };
  }

  if (path === '/problems' && method === 'GET') {
    const err = new Error('Not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  if (path.startsWith('/problems/') && method === 'GET') {
    const slug = path.replace('/problems/', '');
    const problems = getStoredProblems();
    const user = getCurrentUser();
    const problem = problems.find((p) => p.slug === slug || p.id === slug);
    if (!problem) {
      const err = new Error('Challenge not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    if (user?.role !== 'ADMIN' && !problem.isDaily) {
      const err = new Error('This challenge has ended.') as Error & {
        status?: number;
        code?: string;
        ended?: boolean;
        todayChallengeUrl?: string;
      };
      err.status = 410;
      err.code = 'CHALLENGE_ENDED';
      err.ended = true;
      err.todayChallengeUrl = '/challenge';
      throw err;
    }
    const subs = getStoredSubmissions();
    const isSolved = user
      ? subs.some((s) => s.userId === user.id && s.problemId === problem.id && s.verdict === 'ACCEPTED')
      : false;
    const secondsUntilNextReset = getSecondsUntilNext1700IST();
    return {
      success: true,
      data: {
        problem,
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === problem.id).length },
        secondsUntilNextReset,
        endsAt: new Date(Date.now() + secondsUntilNextReset * 1000).toISOString(),
      },
    };
  }

  // SUBMISSIONS ROUTES — FAIL CLOSED WHEN REAL COMPILER SANDBOX IS UNREACHABLE
  if (path === '/submissions/run' && method === 'POST') {
    throw new Error(
      'Code execution service is temporarily unavailable. Your code is saved — please try again in a moment.'
    );
  }

  if (path === '/submissions/submit' && method === 'POST') {
    throw new Error(
      'Code execution service is temporarily unavailable. Your code is saved — please try again in a moment.'
    );
  }

  if (path === '/uploads/my' || path === '/admin/uploads') {
    return { success: true, data: [] };
  }

  if (path === '/submissions/my' || path.startsWith('/submissions/problem/')) {
    const user = getCurrentUser();
    const subs = getStoredSubmissions().filter((s) => !user || s.userId === user.id);
    return { success: true, data: { submissions: subs, uploadedSolutions: [] } };
  }

  if (path.startsWith('/submissions/') && method === 'GET') {
    const subId = path.replace('/submissions/', '');
    const sub = getStoredSubmissions().find((s) => s.id === subId);
    return { success: true, data: { submission: sub || null } };
  }

  // USERS & DASHBOARD ROUTES
  if (path === '/users/dashboard/stats' && method === 'GET') {
    const user = getCurrentUser();
    const subs = getStoredSubmissions().filter((s) => user && s.userId === user.id);
    const solvedIds = new Set(subs.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId));
    const activityMap: Record<string, number> = {};
    subs.forEach((s) => {
      const day = s.createdAt.split('T')[0];
      activityMap[day] = (activityMap[day] || 0) + 1;
    });
    return {
      success: true,
      data: {
        stats: {
          totalPoints: user?.totalPoints || 0,
          currentStreak: user?.currentStreak || 0,
          longestStreak: user?.longestStreak || user?.currentStreak || 0,
          totalSolved: solvedIds.size,
          totalSubmissions: subs.length,
          globalRank: 1,
        },
        recentSubmissions: subs.slice(0, 8),
        activityMap,
      },
    };
  }

  if (path === '/users/profile' && method === 'PUT') {
    const current = getCurrentUser();
    if (!current) throw new Error('Authentication required');
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        fullName: body.fullName ?? users[idx].fullName,
        bio: body.bio ?? users[idx].bio,
        college: body.college ?? users[idx].college,
      };
      saveStoredUsers(users);
    }
    return { success: true, data: { user: getCurrentUser() } };
  }

  if (path.startsWith('/users/profile/') && method === 'GET') {
    const username = path.replace('/users/profile/', '');
    const users = getStoredUsers();
    const target =
      users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || getCurrentUser();
    const subs = getStoredSubmissions().filter((s) => target && s.userId === target.id);
    return {
      success: true,
      data: {
        user: target,
        stats: {
          totalSolved: new Set(subs.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId)).size,
          totalSubmissions: subs.length,
        },
        recentSubmissions: subs.slice(0, 10),
      },
    };
  }

  if (
    path.startsWith('/badges') ||
    path.startsWith('/achievements') ||
    path === '/users/badges' ||
    path === '/users/achievements'
  ) {
    throw new Error('Not found');
  }

  // LEADERBOARD
  if (path.startsWith('/leaderboard')) {
    const users = getStoredUsers().filter((u) => !u.isBanned);
    const leaderboard = users
      .map((u, i) => ({
        rank: i + 1,
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        college: u.college || 'Sanjivani College of Engineering',
        totalPoints: u.totalPoints || 0,
        currentStreak: u.currentStreak || 0,
        solvedCount: Math.max(0, Math.floor((u.totalPoints || 0) / 20)),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((u, idx) => ({ ...u, rank: idx + 1 }));

    return {
      success: true,
      data: { leaderboard },
    };
  }

  // ADMIN ROUTES
  if (path === '/admin/analytics' && method === 'GET') {
    const users = getStoredUsers();
    const problems = getStoredProblems();
    const subs = getStoredSubmissions();
    const accepted = subs.filter((s) => s.verdict === 'ACCEPTED').length;
    return {
      success: true,
      data: {
        overview: {
          totalUsers: users.length,
          totalProblems: problems.length,
          totalSubmissions: subs.length,
          acceptanceRate: subs.length > 0 ? Math.round((accepted / subs.length) * 100) : 100,
        },
        pilotAnalytics: {
          window: {
            todayDau: users.length,
            peakDau: users.length,
            averageDau: users.length,
            totalActivePilotStudents: users.length,
          },
          fourOfSevenCohort: {
            uniqueQualifiedStudentsAnyWeek: 1,
            week1: { qualifiedCount: 1, qualifiedPctOfActive: 100 },
            week2: { qualifiedCount: 1, qualifiedPctOfActive: 100 },
          },
          dropOffByDay: {
            steepestDropOffDay: null,
            days: [],
          },
          mostFailedProblems: [],
        },
      },
    };
  }

  if (path === '/admin/problems' && method === 'GET') {
    return { success: true, data: { problems: getStoredProblems() } };
  }

  if (path === '/admin/problems' && method === 'POST') {
    const problems = getStoredProblems();
    const created = {
      id: `prob-${Date.now()}`,
      slug: body.slug || `problem-${Date.now()}`,
      title: body.title,
      difficulty: body.difficulty || 'EASY',
      category: body.category || 'General',
      basePoints: Number(body.basePoints) || 20,
      timeLimitMs: Number(body.timeLimitMs) || 1000,
      memoryLimitMb: Number(body.memoryLimitMb) || 64,
      isDaily: Boolean(body.isDaily),
      tags: Array.isArray(body.tags) ? body.tags : ['c'],
      description: body.description || '',
      starterCode: body.starterCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
      testCases: body.testCases || [],
    };
    problems.push(created);
    saveStoredProblems(problems);
    return { success: true, data: { problem: created } };
  }

  if (path.startsWith('/admin/problems/') && method === 'DELETE') {
    const id = path.replace('/admin/problems/', '');
    const problems = getStoredProblems().filter((p) => p.id !== id);
    saveStoredProblems(problems);
    return { success: true };
  }

  if (path === '/admin/submissions' && method === 'GET') {
    return { success: true, data: { submissions: getStoredSubmissions() } };
  }

  if (path === '/admin/users' && method === 'GET') {
    return { success: true, data: { users: getStoredUsers() } };
  }

  if (path.startsWith('/admin/users/') && path.endsWith('/ban') && method === 'PUT') {
    const id = path.replace('/admin/users/', '').replace('/ban', '');
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx].isBanned = Boolean(body.isBanned);
      saveStoredUsers(users);
    }
    return { success: true };
  }

  if (path.startsWith('/admin/users/') && path.endsWith('/role') && method === 'PUT') {
    const id = path.replace('/admin/users/', '').replace('/role', '');
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1 && (body.role === 'ADMIN' || body.role === 'STUDENT')) {
      users[idx].role = body.role;
      saveStoredUsers(users);
    }
    return { success: true };
  }

  if (path === '/admin/daily/schedule' && method === 'POST') {
    const problems = getStoredProblems().map((p) => ({
      ...p,
      isDaily: p.id === body.problemId,
    }));
    saveStoredProblems(problems);
    return { success: true };
  }

  return { success: true, data: {} };
}
