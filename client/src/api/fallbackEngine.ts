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

function simulateCRun(code: string, stdin: string, problem?: any) {
  const trimmed = (code || '').trim();
  if (!trimmed.includes('main')) {
    return {
      status: 'COMPILATION_ERROR',
      compileOutput: "solution.c: error: undefined reference to `main'",
      stdout: '',
      stderr: '',
      exitCode: 1,
      runtimeMs: 0,
      executionTimeMs: 0,
    };
  }
  if (!trimmed.includes('#include')) {
    return {
      status: 'COMPILATION_ERROR',
      compileOutput: 'solution.c:1:1: error: missing #include <stdio.h> header',
      stdout: '',
      stderr: '',
      exitCode: 1,
      runtimeMs: 0,
      executionTimeMs: 0,
    };
  }

  const inputClean = (stdin || '').trim();
  if (problem?.slug === 'pointer-swap-in-place' || trimmed.includes('swap')) {
    const parts = inputClean.split(/\s+/).map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [a, b] = parts;
      return {
        status: 'ACCEPTED',
        compileOutput: null,
        stdout: `${b} ${a} ${a + b}\n`,
        stderr: '',
        exitCode: 0,
        runtimeMs: 14,
        executionTimeMs: 14,
      };
    }
  }
  if (problem?.slug === 'brian-kernighan-set-bits' || trimmed.includes('countSetBits')) {
    const n = parseInt(inputClean || '29', 10);
    if (!isNaN(n)) {
      const bits = n.toString(2).split('1').length - 1;
      return {
        status: 'ACCEPTED',
        compileOutput: null,
        stdout: `${bits}\n`,
        stderr: '',
        exitCode: 0,
        runtimeMs: 11,
        executionTimeMs: 11,
      };
    }
  }
  if (problem?.testCases?.[0]?.expectedOutput) {
    return {
      status: 'ACCEPTED',
      compileOutput: null,
      stdout: `${problem.testCases[0].expectedOutput}\n`,
      stderr: '',
      exitCode: 0,
      runtimeMs: 15,
      executionTimeMs: 15,
    };
  }

  return {
    status: 'ACCEPTED',
    compileOutput: null,
    stdout: 'Program executed successfully (exit code 0)\n',
    stderr: '',
    exitCode: 0,
    runtimeMs: 12,
    executionTimeMs: 12,
  };
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
    const { username, email, password, fullName, college } = body;
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      throw new Error('Email is already registered');
    }
    if (users.some((u) => u.username.toLowerCase() === String(username).toLowerCase())) {
      throw new Error('Username is already taken');
    }
    const newUser: User & { password?: string; isBanned?: boolean; createdAt?: string } = {
      id: `usr-${Date.now()}`,
      username: username || email.split('@')[0],
      email,
      fullName: fullName || username,
      role: 'STUDENT',
      college: college || 'Sanjivani College of Engineering',
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

  if (path === '/auth/login' && method === 'POST') {
    const { identifier, password } = body;
    const users = getStoredUsers();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === String(identifier).toLowerCase() ||
        u.username.toLowerCase() === String(identifier).toLowerCase()
    );
    if (!found || (found.password && found.password !== password)) {
      throw new Error('Invalid username/email or password');
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
        college: 'Sanjivani College of Engineering',
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
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === daily.id).length },
        secondsUntilNextReset: getSecondsUntilNext1700IST(),
      },
    };
  }

  if (path === '/problems' && method === 'GET') {
    const user = getCurrentUser();
    const subs = getStoredSubmissions();
    const diff = params.get('difficulty');
    const search = (params.get('search') || '').toLowerCase();

    const problems = getStoredProblems()
      .filter((p) => {
        if (diff && diff !== 'ALL' && p.difficulty !== diff) return false;
        if (search) {
          const hay = `${p.title} ${p.category || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .map((p) => ({
        ...p,
        isSolved: user
          ? subs.some((s) => s.userId === user.id && s.problemId === p.id && s.verdict === 'ACCEPTED')
          : false,
      }));
    return { success: true, data: { problems } };
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
        userStatus: { isSolved, attempts: subs.filter((s) => s.problemId === problem.id).length },
      },
    };
  }

  // SUBMISSIONS ROUTES
  if (path === '/submissions/run' && method === 'POST') {
    const user = getCurrentUser();
    if (!user) throw new Error('Authentication required');
    const problems = getStoredProblems();
    const problem = problems.find((p) => p.id === body.problemId) || problems[0];
    const result = simulateCRun(body.code, body.stdin || problem.testCases?.[0]?.input || '', problem);
    return { success: true, data: result };
  }

  if (path === '/submissions/submit' && method === 'POST') {
    const user = getCurrentUser();
    if (!user) throw new Error('Authentication required');
    const problems = getStoredProblems();
    const problem = problems.find((p) => p.id === body.problemId) || problems[0];
    const runRes = simulateCRun(body.code, problem.testCases?.[0]?.input || '', problem);
    const verdict =
      runRes.status === 'COMPILATION_ERROR'
        ? 'COMPILATION_ERROR'
        : runRes.stdout.trim() === (problem.testCases?.[0]?.expectedOutput || '').trim()
        ? 'ACCEPTED'
        : 'WRONG_ANSWER';

    const subs = getStoredSubmissions();
    const alreadySolved = subs.some(
      (s) => s.userId === user.id && s.problemId === problem.id && s.verdict === 'ACCEPTED'
    );
    const pointsAwarded = verdict === 'ACCEPTED' && !alreadySolved ? problem.basePoints : 0;

    const testCaseResults = (problem.testCases || []).map((tc: any, idx: number) => ({
      id: tc.id || `tc-${idx}`,
      verdict: verdict === 'ACCEPTED' ? 'ACCEPTED' : verdict,
      runtimeMs: 14,
    }));

    const newSub = {
      id: `sub-${Date.now()}`,
      userId: user.id,
      user: { username: user.username, fullName: user.fullName },
      problemId: problem.id,
      problem: { title: problem.title, slug: problem.slug, difficulty: problem.difficulty },
      code: body.code,
      verdict,
      runtimeMs: runRes.runtimeMs || 14,
      executionTimeMs: runRes.executionTimeMs || 14,
      memoryUsedKb: 1420,
      pointsAwarded,
      passedCases: verdict === 'ACCEPTED' ? (problem.testCases || []).length : 0,
      totalCases: (problem.testCases || []).length,
      testCaseResults,
      compileOutput: runRes.compileOutput,
      createdAt: new Date().toISOString(),
    };
    subs.unshift(newSub);
    saveStoredSubmissions(subs);

    if (pointsAwarded > 0) {
      const users = getStoredUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx].totalPoints = (users[idx].totalPoints || 0) + pointsAwarded;
        users[idx].currentStreak = Math.max(1, (users[idx].currentStreak || 0) + 1);
        users[idx].longestStreak = Math.max(users[idx].longestStreak || 0, users[idx].currentStreak);
        saveStoredUsers(users);
      }
    }

    return {
      success: true,
      data: {
        submissionId: newSub.id,
        submission: newSub,
        pointsAwarded,
        passedCases: newSub.passedCases,
        totalCases: newSub.totalCases,
      },
    };
  }

  if (path === '/submissions/my' || path.startsWith('/submissions/problem/')) {
    const user = getCurrentUser();
    const subs = getStoredSubmissions().filter((s) => !user || s.userId === user.id);
    return { success: true, data: { submissions: subs } };
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
        badges: [],
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
        badges: [],
      },
    };
  }

  if ((path === '/users/badges' || path === '/users/achievements') && method === 'GET') {
    const current = getCurrentUser();
    const hasPoints = (current?.totalPoints || 0) > 0;
    const badges = [
      {
        id: 'badge-first-solve',
        code: 'FIRST_BLOOD',
        name: 'First Compile',
        description: 'Submit your first accepted C solution on LogicQ.',
        iconName: 'Zap',
        pointsReward: 10,
        isUnlocked: hasPoints,
        unlockedAt: hasPoints ? new Date().toISOString() : null,
      },
      {
        id: 'badge-streak-3',
        code: 'STREAK_3',
        name: '3-Day Logic Spark',
        description: 'Maintain a 3-day daily challenge streak.',
        iconName: 'Flame',
        pointsReward: 25,
        isUnlocked: (current?.currentStreak || 0) >= 3,
        unlockedAt: (current?.currentStreak || 0) >= 3 ? new Date().toISOString() : null,
      },
      {
        id: 'badge-streak-7',
        code: 'STREAK_7',
        name: '7-Day Flame Master',
        description: 'Complete a full 7-day competition week without breaking your streak.',
        iconName: 'Trophy',
        pointsReward: 50,
        isUnlocked: (current?.currentStreak || 0) >= 7,
        unlockedAt: (current?.currentStreak || 0) >= 7 ? new Date().toISOString() : null,
      },
    ];
    return {
      success: true,
      data: { badges, achievements: badges },
    };
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

  // CONTESTS / ARENA
  if (path === '/contests' && method === 'GET') {
    const problems = getStoredProblems();
    return {
      success: true,
      data: {
        contests: [
          {
            id: 'contest-weekly-1',
            slug: 'bitwise-weekly-arena-1',
            title: 'Bitwise Club Weekly C Arena #1',
            description: 'Weekly competitive C programming contest for Sanjivani students.',
            startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
            status: 'ONGOING',
            participantCount: getStoredUsers().length,
            _count: { participants: getStoredUsers().length, problems: problems.length },
          },
        ],
      },
    };
  }

  if (path.endsWith('/scoreboard') && path.startsWith('/contests/')) {
    const users = getStoredUsers();
    return {
      success: true,
      data: {
        standings: users.map((u, i) => ({
          rank: i + 1,
          userId: u.id,
          username: u.username,
          fullName: u.fullName,
          score: u.totalPoints || 0,
          penalty: 0,
          solvedCount: Math.max(0, Math.floor((u.totalPoints || 0) / 20)),
        })),
      },
    };
  }

  if (path.endsWith('/join') && path.startsWith('/contests/') && method === 'POST') {
    return { success: true, message: 'Registered for contest' };
  }

  if (path.startsWith('/contests/') && method === 'GET') {
    const problems = getStoredProblems();
    return {
      success: true,
      data: {
        contest: {
          id: 'contest-weekly-1',
          slug: 'bitwise-weekly-arena-1',
          title: 'Bitwise Club Weekly C Arena #1',
          description: 'Weekly competitive C programming contest for Sanjivani students.',
          startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
          endTime: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
          status: 'ONGOING',
          isJoined: true,
          problems: problems.map((p, idx) => ({
            orderIndex: idx + 1,
            points: p.basePoints,
            problem: p,
          })),
        },
        standings: [],
      },
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
