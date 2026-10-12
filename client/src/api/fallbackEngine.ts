import { User } from '../types/index.js';

const STORAGE_KEYS = {
  USERS: 'logicq_fallback_users_v1',
  CURRENT_USER_ID: 'logicq_fallback_current_user_id_v1',
  SUBMISSIONS: 'logicq_fallback_submissions_v1',
  PROBLEMS: 'logicq_fallback_problems_v1',
};

const DEFAULT_PROBLEMS = [
  {
    id: 'prob-pointer-swap',
    slug: 'pointer-swap-in-place',
    title: 'In-Place Pointer Swap & Sum',
    difficulty: 'EASY',
    category: 'Pointers',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    tags: ['pointers', 'basics', 'memory'],
    description: `### Problem Statement
Write a C program that reads two integers \`a\` and \`b\` from standard input, swaps them using pointers, and prints the swapped values followed by their sum.

### Input Format
A single line containing two space-separated integers \`a\` and \`b\`.

### Output Format
Print three space-separated integers: \`b a (a+b)\`.

### Example
**Input:**
\`\`\`
10 25
\`\`\`
**Output:**
\`\`\`
25 10 35
\`\`\``,
    starterCode: `#include <stdio.h>

void swap(int *x, int *y) {
    int temp = *x;
    *x = *y;
    *y = temp;
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        swap(&a, &b);
        printf("%d %d %d\\n", a, b, a + b);
    }
    return 0;
}`,
    testCases: [
      { id: 'tc-1', input: '10 25', expectedOutput: '25 10 35', isSample: true, isHidden: false },
      { id: 'tc-2', input: '-5 15', expectedOutput: '15 -5 10', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'prob-set-bits',
    slug: 'brian-kernighan-set-bits',
    title: 'Count Set Bits (Brian Kernighan Algorithm)',
    difficulty: 'EASY',
    category: 'Bitwise',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['bitwise', 'kernighan', 'integers'],
    description: `### Problem Statement
Given a non-negative integer \`n\`, count the number of set bits (\`1\`s) in its binary representation using bitwise operations.

### Input Format
A single integer \`n\` ($0 \\le n \\le 10^9$).

### Output Format
A single integer representing the number of set bits in \`n\`.`,
    starterCode: `#include <stdio.h>

int countSetBits(unsigned int n) {
    int count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    return count;
}

int main() {
    unsigned int n;
    if (scanf("%u", &n) == 1) {
        printf("%d\\n", countSetBits(n));
    }
    return 0;
}`,
    testCases: [
      { id: 'tc-3', input: '29', expectedOutput: '4', isSample: true, isHidden: false },
      { id: 'tc-4', input: '64', expectedOutput: '1', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'prob-reverse-array',
    slug: 'reverse-array-two-pointers',
    title: 'Reverse Array Using Two Pointers',
    difficulty: 'MEDIUM',
    category: 'Arrays & Pointers',
    basePoints: 40,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['arrays', 'pointers', 'in-place'],
    description: `### Problem Statement
Given an integer \`n\` and an array of \`n\` integers, reverse the array in-place using pointer arithmetic and print the reversed elements separated by spaces.

### Input Format
First line: \`n\`
Second line: \`n\` space-separated integers.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int *l = arr, *r = arr + n - 1;
    while (l < r) {
        int t = *l; *l = *r; *r = t;
        l++; r--;
    }
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], i + 1 == n ? "\\n" : " ");
    }
    return 0;
}`,
    testCases: [
      { id: 'tc-5', input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', isSample: true, isHidden: false },
    ],
  },
  {
    id: 'prob-cycle-detect',
    slug: 'floyd-linked-list-cycle',
    title: 'Detect Linked List Cycle (Floyd Tortoise & Hare)',
    difficulty: 'HARD',
    category: 'Linked Lists',
    basePoints: 70,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: false,
    tags: ['linked-list', 'pointers', 'floyd'],
    description: `### Problem Statement
Given \`n\` node values and a 0-indexed position \`pos\` where the tail connects (\`-1\` if no cycle), print \`CYCLE DETECTED\` if a cycle exists, otherwise print \`NO CYCLE\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int n, pos;
    if (scanf("%d %d", &n, &pos) != 2) return 0;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
    }
    if (pos >= 0 && pos < n) {
        printf("CYCLE DETECTED\\n");
    } else {
        printf("NO CYCLE\\n");
    }
    return 0;
}`,
    testCases: [
      { id: 'tc-6', input: '4 1\n3 2 0 -4', expectedOutput: 'CYCLE DETECTED', isSample: true, isHidden: false },
      { id: 'tc-7', input: '3 -1\n1 2 3', expectedOutput: 'NO CYCLE', isSample: true, isHidden: false },
    ],
  },
];

function getStoredProblems(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROBLEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEYS.PROBLEMS, JSON.stringify(DEFAULT_PROBLEMS));
  return DEFAULT_PROBLEMS;
}

function saveStoredProblems(problems: any[]) {
  localStorage.setItem(STORAGE_KEYS.PROBLEMS, JSON.stringify(problems));
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
    return {
      success: true,
      data: {
        problem: daily,
        currentWeek: buildFallbackCurrentWeek(),
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === daily.id).length },
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
      },
    };
  }

  if (path === '/problems' && method === 'GET') {
    throw new Error('Not found');
  }

  if (path.startsWith('/problems/') && method === 'GET') {
    const slug = path.replace('/problems/', '');
    const problems = getStoredProblems();
    const problem = problems.find((p) => p.slug === slug || p.id === slug) || problems[0];
    const user = getCurrentUser();
    const subs = getStoredSubmissions();
    const isSolved = user
      ? subs.some((s) => s.userId === user.id && s.problemId === problem.id && s.verdict === 'ACCEPTED')
      : false;
    return {
      success: true,
      data: {
        problem,
        currentWeek: buildFallbackCurrentWeek(),
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === problem.id).length },
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
