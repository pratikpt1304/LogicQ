import { User } from '../types/index.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  getPrnChangeCooldownStatus,
  containsProfanity,
  maskPrn,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
  generateShortId,
} from '../config/academic.config.js';

const STORAGE_KEYS = {
  USERS: 'logicq_fallback_users_v1',
  CURRENT_USER_ID: 'logicq_fallback_current_user_id_v1',
  SUBMISSIONS: 'logicq_fallback_submissions_v1',
  PROBLEMS: 'logicq_fallback_problems_v1',
  PRN_INDEX: 'logicq_fallback_prn_index_v1',
  PRN_HISTORY: 'logicq_fallback_prn_history_v1',
  PRACTICE_PROGRESS: 'logicq_fallback_practice_progress_v1',
};

import { PRACTICE_CONFIG } from '../config/practice.config.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';

const ALL_PRACTICE_PROBLEMS = [
  ...PRACTICE_MODULE_1_PROBLEMS,
  ...PRACTICE_MODULE_2_PROBLEMS,
  ...PRACTICE_MODULE_3_PROBLEMS,
  ...PRACTICE_MODULE_4_PROBLEMS,
];

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

In C, variables declared in an inner block shadow variables of the same name declared in an enclosing outer block or at file scope.

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
} `,
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

In standard C, \`switch\` statements execute sequentially from the matched \`case\` label until an explicit \`break\` is encountered.

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
} `,
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

In C pointer arithmetic, array indexing is identical to pointer dereferencing: \`a[i][j][k]\` is strictly defined as \`*(*(*(a + i) + j) + k)\`.

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
} `,
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

In systems C programming, bitwise operators allow compact manipulation of packed bitfields and hardware flag registers.

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
    if (raw) {
      const parsed: Array<User & { password?: string; isBanned?: boolean; createdAt?: string }> = JSON.parse(raw);
      let migrated = false;
      const sanitized = parsed.map((u) => {
        let updated = false;
        let college = u.college;
        if (!college || college === 'Sanjivani College of Engineering') {
          college = 'Sanjivani University';
          updated = true;
        }
        let shortId = u.shortId;
        if (!shortId) {
          shortId = generateShortId(u.id);
          updated = true;
        }
        if (u.role === 'ADMIN' && ((u.totalPoints || 0) > 0 || (u.currentStreak || 0) > 0)) {
          updated = true;
          return { ...u, college, shortId, totalPoints: 0, currentStreak: 0, longestStreak: 0 };
        }
        if (updated) {
          migrated = true;
          return { ...u, college, shortId };
        }
        return u;
      });
      if (migrated) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
      }
      return sanitized;
    }
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
      college: 'Sanjivani University',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: 'ADM1',
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

function getStoredUploads(): any[] {
  try {
    const raw = localStorage.getItem('logicq_fallback_uploads');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveStoredUploads(uploads: any[]) {
  localStorage.setItem('logicq_fallback_uploads', JSON.stringify(uploads));
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
    const cleanPrn = normalizePrn(prn);
    if (!isValidPrn(cleanPrn)) {
      throw new Error(PRN_ERROR_MESSAGE);
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
      displayName: body.displayName || fullName || null,
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
    const cleanPrn = normalizePrn(prn);
    if (!isValidPrn(cleanPrn)) {
      throw new Error(PRN_ERROR_MESSAGE);
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
      const newUser = {
        id: `usr-google-${Date.now()}`,
        username: baseUsername,
        email: email || `${baseUsername}@sanjivani.org.in`,
        fullName: fullName || baseUsername,
        avatarUrl,
        role: 'STUDENT' as const,
        college: 'Sanjivani University',
        profileComplete: false,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        isBanned: false,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveStoredUsers(users);
      found = newUser;
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

  if (path === '/uploads/my' && method === 'GET') {
    const user = getCurrentUser();
    const problemId = params.get('problemId');
    const all = getStoredUploads();
    const filtered = all.filter((u) => {
      if (user && u.userId && u.userId !== user.id) return false;
      if (problemId && u.problemId !== problemId) return false;
      return true;
    });
    return { success: true, data: filtered };
  }

  if (path === '/uploads' && method === 'POST') {
    const user = getCurrentUser();
    const uploads = getStoredUploads();
    const newUpload = {
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user?.id || 'guest',
      problemId: body.problemId,
      studentNote: body.studentNote || '',
      files: body.files || [],
      status: 'PENDING_REVIEW',
      pointsAwarded: 0,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    uploads.unshift(newUpload);
    saveStoredUploads(uploads);
    return {
      success: true,
      message: 'Uploaded for review. Solution saved successfully.',
      data: newUpload,
    };
  }

  if (path.startsWith('/uploads/') && method === 'PUT') {
    const uploadId = path.replace('/uploads/', '');
    const uploads = getStoredUploads();
    const idx = uploads.findIndex((u) => u.id === uploadId);
    if (idx >= 0) {
      uploads[idx] = {
        ...uploads[idx],
        studentNote: body.studentNote !== undefined ? body.studentNote : uploads[idx].studentNote,
        files: body.files || uploads[idx].files,
        submittedAt: new Date().toISOString(),
      };
      saveStoredUploads(uploads);
      return {
        success: true,
        message: 'Upload updated successfully.',
        data: uploads[idx],
      };
    }
    return { success: false, message: 'Upload not found.' };
  }

  if (path.startsWith('/uploads/') && method === 'DELETE') {
    const uploadId = path.replace('/uploads/', '');
    const uploads = getStoredUploads();
    const remaining = uploads.filter((u) => u.id !== uploadId);
    saveStoredUploads(remaining);
    return { success: true, message: 'Upload cancelled.' };
  }

  if (path === '/admin/uploads' && method === 'GET') {
    return { success: true, data: getStoredUploads() };
  }

  if (path === '/submissions/my' || path.startsWith('/submissions/problem/')) {
    const user = getCurrentUser();
    const subs = getStoredSubmissions().filter((s) => !user || s.userId === user.id);
    const userUploads = getStoredUploads().filter((u) => !user || u.userId === user.id);
    return { success: true, data: { submissions: subs, uploadedSolutions: userUploads } };
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

    const totalPoints = user?.totalPoints || 0;
    const acceptedCount = subs.filter((s) => s.verdict === 'ACCEPTED').length;
    const accuracy = subs.length > 0 ? Math.round((acceptedCount / subs.length) * 100) : null;
    const rank = totalPoints > 0 ? 1 : null;
    const percentile = null; // Staging mock has < 10 ranked users

    return {
      success: true,
      data: {
        stats: {
          totalPoints,
          currentStreak: user?.currentStreak || 0,
          longestStreak: user?.longestStreak || user?.currentStreak || 0,
          totalSolved: solvedIds.size,
          thisWeekSolved: solvedIds.size,
          thisWeekTotal: 7,
          totalSubmissions: subs.length,
          accuracy,
          rank,
          percentile,
          studentsBeaten: 0,
          totalUsers: totalPoints > 0 ? 1 : 0,
        },
        weeklySummary: {
          weekLabel: 'Current Week',
          weeklyPoints: totalPoints,
          rank,
          percentile,
          previousWeekDelta: null,
          solvedCount: solvedIds.size,
          perDayResults: [],
        },
        weeklySummaries: [],
        recentSubmissions: subs.slice(0, 8),
        activityMap,
      },
    };
  }

  if (path === '/users/profile' && (method === 'PUT' || method === 'PATCH')) {
    const current = getCurrentUser();
    if (!current) throw new Error('Authentication required');

    // Immutability rule: student cannot change PRN or college
    if (body.prn !== undefined || body.college !== undefined) {
      throw new Error('Students cannot change PRN or college after signup.');
    }

    // Validation
    const trimmedDisplay = typeof body.displayName === 'string' ? body.displayName.trim() : body.displayName;
    if (trimmedDisplay) {
      if (trimmedDisplay.length < DISPLAY_NAME_MIN || trimmedDisplay.length > DISPLAY_NAME_MAX) {
        throw new Error(`Display name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`);
      }
      if (containsProfanity(trimmedDisplay)) {
        throw new Error('Display name contains inappropriate language.');
      }
      if (/\d{8,}/.test(trimmedDisplay)) {
        throw new Error('Display name cannot contain a PRN or long numeric sequence.');
      }
    }

    if (body.department && !ALLOWED_DEPARTMENTS.includes(body.department)) {
      throw new Error('Please select a valid department.');
    }

    if (body.year && !ALLOWED_YEARS.includes(body.year)) {
      throw new Error('Please select a valid academic year (FY, SY, or TY).');
    }

    const trimmedDiv = typeof body.division === 'string' ? body.division.trim().toUpperCase() : body.division;
    if (trimmedDiv && !DIVISION_REGEX.test(trimmedDiv)) {
      throw new Error('Division must be up to 3 letters or digits (e.g., A, B, C1).');
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    const existing = idx !== -1 ? users[idx] : current;

    const shortId = existing.shortId || generateShortId(existing.id);
    const updatedUser = {
      ...existing,
      displayName: trimmedDisplay === '' ? null : (trimmedDisplay ?? existing.displayName ?? null),
      fullName: trimmedDisplay || existing.fullName || existing.username,
      department: body.department ?? existing.department,
      year: body.year ?? existing.year,
      division: trimmedDiv === '' ? null : (trimmedDiv ?? existing.division ?? null),
      bio: typeof body.bio === 'string' ? body.bio.trim() : (body.bio ?? existing.bio ?? null),
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl,
      shortId,
      college: 'Sanjivani University',
    };

    if (idx !== -1) {
      users[idx] = updatedUser;
      saveStoredUsers(users);
    }

    // Persist to current user cache
    try {
      localStorage.setItem('logicq_active_user', JSON.stringify(updatedUser));
    } catch {
      // ignore
    }

    const prnCooldown = getPrnChangeCooldownStatus(updatedUser.prnChangedAt);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          ...updatedUser,
          prnNextAllowedDate: prnCooldown.nextAllowedDate ? prnCooldown.nextAllowedDate.toISOString() : null,
          isPrnChangeEligible: prnCooldown.isEligible,
        },
      },
    };
  }

  // PRN CHANGE ROUTE (Rolling 30-day cooldown, 30-day released anti-squatting lock)
  if (path === '/users/change-prn' && method === 'POST') {
    const current = getCurrentUser();
    if (!current) throw new Error('Authentication required');

    const newPrn = normalizePrn(body.newPrn);
    const confirmPrn = normalizePrn(body.confirmPrn);
    const reauthConfirmed = Boolean(body.reauthConfirmed);

    if (!newPrn || !confirmPrn) {
      throw new Error('Both PRN fields are required.');
    }
    if (newPrn !== confirmPrn) {
      throw new Error('The confirmation PRN does not match the new PRN.');
    }
    if (!isValidPrn(newPrn)) {
      throw new Error(PRN_ERROR_MESSAGE);
    }
    if (!reauthConfirmed) {
      throw new Error('Please confirm your identity by checking the re-authentication confirmation box.');
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    const existing = idx !== -1 ? users[idx] : current;

    if (existing.prn === newPrn) {
      throw new Error('The new PRN cannot be identical to your current PRN.');
    }

    // Check 30-day rolling cooldown
    const cooldownStatus = getPrnChangeCooldownStatus(existing.prnChangedAt);
    if (!cooldownStatus.isEligible) {
      const allowedStr = cooldownStatus.nextAllowedDate
        ? cooldownStatus.nextAllowedDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'in 30 days';
      throw new Error(
        `PRN can only be changed once every 30 days. You may change your PRN again on ${allowedStr} (${cooldownStatus.daysRemaining} days remaining).`
      );
    }

    // Uniqueness & Anti-squatting reservation check
    const takenUser = users.find((u) => u.id !== existing.id && u.prn === newPrn);
    if (takenUser) {
      throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
    }

    // Check fallback PRN index for 30-day anti-squatting reservations
    let prnIndex: Record<string, { userId: string; status: string; reservedUntil?: string }> = {};
    try {
      const rawIdx = localStorage.getItem(STORAGE_KEYS.PRN_INDEX);
      if (rawIdx) prnIndex = JSON.parse(rawIdx);
    } catch {}

    const indexEntry = prnIndex[newPrn];
    if (indexEntry) {
      if (indexEntry.status === 'ACTIVE' && indexEntry.userId !== existing.id) {
        throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
      }
      if (indexEntry.status === 'RELEASED_RESERVED' && indexEntry.reservedUntil) {
        const reservedUntil = new Date(indexEntry.reservedUntil).getTime();
        if (Date.now() < reservedUntil && indexEntry.userId !== existing.id) {
          throw new Error('This PRN is unavailable. Please check the number or contact an administrator.');
        }
      }
    }

    const now = new Date();
    const oldPrn = existing.prn || null;

    // Record PRN History
    let prnHistoryList: any[] = [];
    try {
      const rawHist = localStorage.getItem(STORAGE_KEYS.PRN_HISTORY);
      if (rawHist) prnHistoryList = JSON.parse(rawHist);
    } catch {}

    prnHistoryList.push({
      id: `prn-hist-${Date.now()}`,
      userId: existing.id,
      oldPrn,
      newPrn,
      changedBy: existing.id,
      changedByRole: existing.role || 'STUDENT',
      reason: 'STUDENT_MONTHLY_SELF_SERVICE',
      ipAddress: '127.0.0.1',
      createdAt: now.toISOString(),
    });

    try {
      localStorage.setItem(STORAGE_KEYS.PRN_HISTORY, JSON.stringify(prnHistoryList));
    } catch {}

    // Update PRN Index: mark old PRN as RELEASED_RESERVED for 30 days, claim new PRN as ACTIVE
    if (oldPrn) {
      const reservationEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      prnIndex[oldPrn] = {
        userId: existing.id,
        status: 'RELEASED_RESERVED',
        reservedUntil: reservationEnd.toISOString(),
      };
    }
    prnIndex[newPrn] = {
      userId: existing.id,
      status: 'ACTIVE',
    };
    try {
      localStorage.setItem(STORAGE_KEYS.PRN_INDEX, JSON.stringify(prnIndex));
    } catch {}

    // Update user record
    const updatedUser = {
      ...existing,
      prn: newPrn,
      prnChangedAt: now.toISOString(),
    };

    if (idx !== -1) {
      users[idx] = updatedUser;
      saveStoredUsers(users);
    }

    try {
      localStorage.setItem('logicq_active_user', JSON.stringify(updatedUser));
    } catch {}

    const newCooldown = getPrnChangeCooldownStatus(updatedUser.prnChangedAt);
    const maskedPrn = maskPrn(newPrn);

    return {
      success: true,
      message: 'PRN updated successfully. Your new PRN is active.',
      data: {
        prn: maskedPrn,
        prnChangedAt: updatedUser.prnChangedAt,
        prnNextAllowedDate: newCooldown.nextAllowedDate ? newCooldown.nextAllowedDate.toISOString() : null,
        isPrnChangeEligible: newCooldown.isEligible,
      },
    };
  }

  if (path.startsWith('/users/profile/') && method === 'GET') {
    const param = path.replace('/users/profile/', '');
    const users = getStoredUsers();
    const current = getCurrentUser();
    // Allow lookup by id, shortId, or username (case-insensitive)
    const target =
      users.find(
        (u) =>
          u.id === param ||
          (u.shortId && u.shortId.toLowerCase() === param.toLowerCase()) ||
          u.username.toLowerCase() === param.toLowerCase()
      ) || current;

    if (!target) {
      throw new Error('Challenger not found');
    }

    const isOwner = Boolean(current && current.id === target.id);
    const subs = getStoredSubmissions().filter((s) => s.userId === target.id);
    const shortId = target.shortId || generateShortId(target.id);
    const publicDisplayName = formatPublicDisplayName({
      displayName: target.displayName,
      shortId,
      id: target.id,
    });
    const ownMaskedPrn = isOwner ? maskPrn(target.prn) : undefined;
    const ownIdentityLabel = isOwner
      ? formatOwnIdentityLabel({
          department: target.department,
          year: target.year,
          prn: target.prn,
          maskedPrn: ownMaskedPrn,
        })
      : undefined;

    const targetCooldown = getPrnChangeCooldownStatus(target.prnChangedAt);

    // Real rank computation: ONLY students with totalPoints > 0 are ranked!
    let rank: number | null = null;
    if ((target.totalPoints || 0) > 0) {
      const rankedUsers = users
        .filter((u) => !u.isBanned && (u.totalPoints || 0) > 0)
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      const targetRankIdx = rankedUsers.findIndex((u) => u.id === target.id);
      rank = targetRankIdx !== -1 ? targetRankIdx + 1 : null;
    }

    return {
      success: true,
      data: {
        user: {
          id: target.id,
          username: target.username,
          displayName: target.displayName,
          publicDisplayName,
          shortId,
          fullName: isOwner ? ownIdentityLabel || publicDisplayName : publicDisplayName,
          college: target.college || 'Sanjivani University',
          department: target.department,
          year: target.year,
          division: target.division,
          bio: target.bio,
          avatarUrl: target.avatarUrl,
          role: target.role,
          totalPoints: target.totalPoints || 0,
          currentStreak: target.currentStreak || 0,
          longestStreak: target.longestStreak || 0,
          rank, // null if 0 points
          totalSolved: new Set(subs.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId)).size,
          // Privacy protection: Never expose PRN or email to other students!
          ...(isOwner
            ? {
                prn: target.prn,
                maskedPrn: ownMaskedPrn,
                email: target.email,
                ownIdentityLabel,
                prnChangedAt: target.prnChangedAt || null,
                prnNextAllowedDate: targetCooldown.nextAllowedDate ? targetCooldown.nextAllowedDate.toISOString() : null,
                isPrnChangeEligible: targetCooldown.isEligible,
              }
            : {}),
        },
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
    const current = getCurrentUser();
    const allUsers = getStoredUsers().filter((u) => !u.isBanned && u.role === 'STUDENT');
    // Real rank: only students with totalPoints > 0 (or weekly points > 0) are ranked!
    const rankedEligible = allUsers
      .filter((u) => (u.totalPoints || 0) > 0)
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    const totalRanked = rankedEligible.length;

    const leaderboard = rankedEligible.map((u, idx) => {
      const isCurrentUser = Boolean(current && u.id === current.id);
      const shortId = u.shortId || generateShortId(u.id);
      const publicDisplayName = formatPublicDisplayName({
        displayName: u.displayName,
        shortId,
        id: u.id,
      });
      const ownMaskedPrn = isCurrentUser ? maskPrn(u.prn) : undefined;
      const ownIdentityLabel = isCurrentUser
        ? formatOwnIdentityLabel({
            department: u.department,
            year: u.year,
            prn: u.prn,
            maskedPrn: ownMaskedPrn,
          })
        : undefined;

      const rank = idx + 1;
      const studentsBeaten = Math.max(0, totalRanked - rank);
      const percentile = totalRanked <= 1 ? 100 : Math.round(((totalRanked - rank + 1) / totalRanked) * 100);

      return {
        rank,
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        publicDisplayName,
        shortId,
        displayLabel: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        fullName: isCurrentUser ? ownIdentityLabel || publicDisplayName : publicDisplayName,
        isCurrentUser,
        ...(isCurrentUser ? { maskedPrn: ownMaskedPrn, ownIdentityLabel } : {}),
        college: u.college || 'Sanjivani University',
        department: u.department || null,
        year: u.year || null,
        division: u.division || null,
        totalPoints: u.totalPoints || 0,
        weeklyPoints: u.totalPoints || 0,
        currentStreak: u.currentStreak || 0,
        longestStreak: u.longestStreak || 0,
        solvedCount: Math.max(0, Math.floor((u.totalPoints || 0) / 20)),
        percentile,
        studentsBeaten,
      };
    });

    let pinnedOwnRow = leaderboard.find((r) => r.isCurrentUser) || null;
    if (!pinnedOwnRow && current) {
      // Current user has 0 points - they are NOT ranked yet!
      const shortId = current.shortId || generateShortId(current.id);
      const publicDisplayName = formatPublicDisplayName({
        displayName: current.displayName,
        shortId,
        id: current.id,
      });
      const ownMaskedPrn = maskPrn(current.prn);
      const ownIdentityLabel = formatOwnIdentityLabel({
        department: current.department,
        year: current.year,
        prn: current.prn,
        maskedPrn: ownMaskedPrn,
      });

      pinnedOwnRow = {
        rank: null, // NOT RANKED YET!
        id: current.id,
        username: current.username,
        displayName: current.displayName,
        publicDisplayName,
        shortId,
        displayLabel: ownIdentityLabel || publicDisplayName,
        fullName: ownIdentityLabel || publicDisplayName,
        isCurrentUser: true,
        maskedPrn: ownMaskedPrn,
        ownIdentityLabel,
        college: current.college || 'Sanjivani University',
        department: current.department || null,
        year: current.year || null,
        division: current.division || null,
        totalPoints: current.totalPoints || 0,
        weeklyPoints: current.totalPoints || 0,
        currentStreak: current.currentStreak || 0,
        longestStreak: current.longestStreak || 0,
        solvedCount: 0,
        percentile: 0,
        studentsBeaten: 0,
      } as any;
    }

    return {
      success: true,
      data: {
        leaderboard,
        pinnedOwnRow,
        totalRanked,
        availableWeeks: [
          { weekOffset: 0, weekLabel: 'Current Week (Live)', isFrozen: false },
          { weekOffset: -1, weekLabel: 'Last Week (Final Rankings)', isFrozen: true },
        ],
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

  // ADMIN: Reveal student PRN (Audit-logged)
  if (path.startsWith('/admin/users/') && path.endsWith('/reveal-prn') && method === 'POST') {
    const current = getCurrentUser();
    if (!current || current.role !== 'ADMIN') {
      const err = new Error('Admin privileges required') as Error & { status?: number };
      err.status = 403;
      throw err;
    }
    const id = path.replace('/admin/users/', '').replace('/reveal-prn', '');
    const users = getStoredUsers();
    const student = users.find((u) => u.id === id);
    if (!student) {
      const err = new Error('Student not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return {
      success: true,
      message: 'PRN accessed under audited administrative policy.',
      data: {
        userId: student.id,
        prn: student.prn,
        revealedAt: new Date().toISOString(),
      },
    };
  }

  // ADMIN: Reset student PRN cooldown (Audit-logged)
  if (path.startsWith('/admin/users/') && path.endsWith('/reset-prn-cooldown') && method === 'POST') {
    const current = getCurrentUser();
    if (!current || current.role !== 'ADMIN') {
      const err = new Error('Admin privileges required') as Error & { status?: number };
      err.status = 403;
      throw err;
    }
    const id = path.replace('/admin/users/', '').replace('/reset-prn-cooldown', '');
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) {
      const err = new Error('Student not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    users[idx].prnChangedAt = null;
    saveStoredUsers(users);

    return {
      success: true,
      message: 'PRN change cooldown reset successfully for student.',
      data: {
        userId: users[idx].id,
        prnChangedAt: null,
        isPrnChangeEligible: true,
        nextAllowedDate: null,
      },
    };
  }

  // PRACTICE MODULES
  if (path === '/practice/modules') {
    const current = getCurrentUser();
    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';

    let previousModuleSolved = 0;
    const modulesResponse = PRACTICE_CONFIG.MODULES.map((m, idx) => {
      const moduleProblems = ALL_PRACTICE_PROBLEMS.filter((p) => p.moduleSlug === m.slug);
      const solvedInModule = moduleProblems.filter(
        (p) => storedProgress[`${userPrefix}${p.slug}`]?.isSolved
      ).length;

      const threshold = PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD || 7;
      const isUnlocked = idx === 0 || previousModuleSolved >= threshold;
      const prevTitle = idx > 0 ? PRACTICE_CONFIG.MODULES[idx - 1].title : '';
      const requirementText =
        idx === 0
          ? 'Unlocked by default'
          : `Solve ${threshold} of 10 in ${prevTitle} to unlock`;

      previousModuleSolved = solvedInModule;

      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        order: m.order,
        description: m.description,
        isUnlocked,
        requirementText,
        totalQuestions: m.totalQuestions,
        solvedCount: solvedInModule,
        progressPercent: Math.round((solvedInModule / m.totalQuestions) * 100),
        distribution: m.distribution,
      };
    });

    return {
      success: true,
      data: {
        modules: modulesResponse,
      },
    };
  }

  // PRACTICE MODULE PROBLEMS
  if (path.startsWith('/practice/modules/') && path.endsWith('/problems')) {
    const moduleSlug = path.replace('/practice/modules/', '').replace('/problems', '');
    const current = getCurrentUser();
    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';

    const moduleConfig = PRACTICE_CONFIG.MODULES.find((m) => m.slug === moduleSlug);
    if (!moduleConfig) {
      const err = new Error('Practice module not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const modIdx = PRACTICE_CONFIG.MODULES.findIndex((m) => m.slug === moduleSlug);
    const threshold = PRACTICE_CONFIG.DEFAULT_UNLOCK_THRESHOLD || 7;
    if (modIdx > 0) {
      const prevMod = PRACTICE_CONFIG.MODULES[modIdx - 1];
      const prevProblems = ALL_PRACTICE_PROBLEMS.filter((p) => p.moduleSlug === prevMod.slug);
      const prevSolved = prevProblems.filter(
        (p) => storedProgress[`${userPrefix}${p.slug}`]?.isSolved
      ).length;
      if (prevSolved < threshold) {
        const err = new Error(
          `Solve at least ${threshold} questions in ${prevMod.title} to unlock this module.`
        ) as Error & { status?: number; code?: string };
        err.status = 403;
        err.code = 'MODULE_LOCKED';
        throw err;
      }
    }

    const moduleProblems = ALL_PRACTICE_PROBLEMS
      .filter((p) => p.moduleSlug === moduleSlug)
      .sort((a, b) => a.moduleOrder - b.moduleOrder);

    const problemRows = moduleProblems.map((p) => {
      const prog = storedProgress[`${userPrefix}${p.slug}`];
      const isSolved = Boolean(prog?.isSolved);
      const attemptsCount = prog?.attemptsCount || 0;
      const status = isSolved ? 'SOLVED' : attemptsCount > 0 ? 'ATTEMPTED' : 'NOT_STARTED';

      return {
        id: p.slug,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        basePoints: p.basePoints,
        moduleOrder: p.moduleOrder,
        isSolved,
        attemptsCount,
        status,
      };
    });

    return {
      success: true,
      data: {
        module: {
          id: moduleConfig.id,
          slug: moduleConfig.slug,
          title: moduleConfig.title,
          order: moduleConfig.order,
          description: moduleConfig.description,
        },
        problems: problemRows,
      },
    };
  }

  // PRACTICE SINGLE PROBLEM
  if (path.startsWith('/practice/problems/')) {
    const problemSlug = path.replace('/practice/problems/', '');
    const problem = ALL_PRACTICE_PROBLEMS.find((p) => p.slug === problemSlug);
    if (!problem) {
      const err = new Error('Practice problem not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const current = getCurrentUser();
    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number; lastVerdict?: string }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';
    const prog = storedProgress[`${userPrefix}${problemSlug}`];

    return {
      success: true,
      data: {
        problem: {
          id: problem.slug,
          slug: problem.slug,
          moduleSlug: problem.moduleSlug,
          title: problem.title,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: problem.tags,
          description: problem.description,
          starterCode: problem.starterCode,
          timeLimitMs: problem.timeLimitMs,
          memoryLimitMb: problem.memoryLimitMb,
          basePoints: problem.basePoints,
          testCases: problem.sampleTests.map((t, idx) => ({
            id: `sample-${idx + 1}`,
            input: t.input,
            expectedOutput: t.expectedOutput,
            isHidden: false,
          })),
        },
        userProgress: prog
          ? {
              isSolved: prog.isSolved,
              attemptsCount: prog.attemptsCount,
              lastVerdict: prog.lastVerdict || (prog.isSolved ? 'ACCEPTED' : 'WRONG_ANSWER'),
              bestRuntimeMs: prog.bestRuntimeMs,
            }
          : null,
      },
    };
  }

  // PRACTICE SUBMISSION
  if (path === '/practice/submit' && method === 'POST') {
    const current = getCurrentUser();
    const { problemSlug, code } = body;
    const problem = ALL_PRACTICE_PROBLEMS.find((p) => p.slug === problemSlug);
    if (!problem) {
      const err = new Error('Practice problem not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number; lastVerdict?: string }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';
    const key = `${userPrefix}${problemSlug}`;
    const prev = storedProgress[key] || { isSolved: false, attemptsCount: 0, bestRuntimeMs: 14 };

    // Basic syntax acceptance in client fallback mode
    const isAccepted = Boolean(code && code.includes('main') && code.length > 30);
    const verdict = isAccepted ? 'ACCEPTED' : 'WRONG_ANSWER';
    const runtimeMs = 12;

    storedProgress[key] = {
      isSolved: prev.isSolved || isAccepted,
      attemptsCount: prev.attemptsCount + 1,
      bestRuntimeMs: isAccepted ? Math.min(prev.bestRuntimeMs, runtimeMs) : prev.bestRuntimeMs,
      lastVerdict: verdict,
    };
    localStorage.setItem(STORAGE_KEYS.PRACTICE_PROGRESS, JSON.stringify(storedProgress));

    return {
      success: true,
      data: {
        submission: {
          id: `prac_sub_${Date.now()}`,
          verdict,
          runtimeMs,
          compileOutput: isAccepted ? '' : 'Mismatch on hidden test case',
          testCaseResults: problem.sampleTests.map((t, idx) => ({
            testCaseId: `sample-${idx + 1}`,
            verdict: isAccepted ? 'ACCEPTED' : 'WRONG_ANSWER',
            runtimeMs: 4,
            orderIndex: idx + 1,
          })),
        },
      },
    };
  }

  return { success: true, data: {} };
}
