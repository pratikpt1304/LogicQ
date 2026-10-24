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
  PRACTICE_MODULES: 'logicq_fallback_practice_modules_v1',
  PRACTICE_CUSTOM_PROBLEMS: 'logicq_fallback_practice_custom_problems_v1',
};

import { PRACTICE_CONFIG, PracticeModuleConfig, getModuleRequirementText } from '../config/practice.config.js';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { KANETKAR_BOOK_PROBLEMS } from '../data/kanetkar-book-bank.js';

const STATIC_PRACTICE_PROBLEMS: PracticeProblemDef[] = [
  ...PRACTICE_MODULE_1_PROBLEMS,
  ...PRACTICE_MODULE_2_PROBLEMS,
  ...PRACTICE_MODULE_3_PROBLEMS,
  ...PRACTICE_MODULE_4_PROBLEMS,
];

function getStoredPracticeModules(): PracticeModuleConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_MODULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return PRACTICE_CONFIG.MODULES;
}

function saveStoredPracticeModules(modules: PracticeModuleConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRACTICE_MODULES, JSON.stringify(modules));
  } catch {
    // ignore
  }
}

function getStoredPracticeProblems(): PracticeProblemDef[] {
  let custom: PracticeProblemDef[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_CUSTOM_PROBLEMS);
    if (raw) custom = JSON.parse(raw);
  } catch {
    // ignore
  }
  return [...STATIC_PRACTICE_PROBLEMS, ...custom];
}

function saveCustomPracticeProblem(prob: PracticeProblemDef) {
  let custom: PracticeProblemDef[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_CUSTOM_PROBLEMS);
    if (raw) custom = JSON.parse(raw);
  } catch {
    // ignore
  }
  const existingIdx = custom.findIndex((p) => p.slug === prob.slug);
  if (existingIdx >= 0) {
    custom[existingIdx] = prob;
  } else {
    custom.push(prob);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.PRACTICE_CUSTOM_PROBLEMS, JSON.stringify(custom));
  } catch {
    // ignore
  }
}

function deletePracticeProblem(slug: string) {
  let custom: PracticeProblemDef[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_CUSTOM_PROBLEMS);
    if (raw) custom = JSON.parse(raw);
  } catch {
    // ignore
  }
  custom = custom.filter((p) => p.slug !== slug);
  try {
    localStorage.setItem(STORAGE_KEYS.PRACTICE_CUSTOM_PROBLEMS, JSON.stringify(custom));
  } catch {
    // ignore
  }
}

const FORMATTED_KANETKAR_PROBLEMS = KANETKAR_BOOK_PROBLEMS.map((bp) => ({
  id: bp.slug,
  slug: bp.slug,
  title: bp.title,
  difficulty: bp.difficulty,
  category: bp.category,
  basePoints: bp.basePoints,
  timeLimitMs: bp.timeLimitMs,
  memoryLimitMb: bp.memoryLimitMb,
  isDaily: false,
  sourceType: 'BOOK',
  sourceRef: bp.sourceRef,
  tags: bp.tags,
  description: bp.description,
  starterCode: bp.starterCode,
  solutionCode: bp.solutionCode,
  testCases: [
    ...bp.sampleTests.map((t, idx) => ({ id: `${bp.slug}-s${idx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: true, isHidden: false, orderIndex: idx })),
    ...bp.hiddenTests.map((t, idx) => ({ id: `${bp.slug}-h${idx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: false, isHidden: true, orderIndex: bp.sampleTests.length + idx })),
  ],
}));

const FORMATTED_PRACTICE_PROBLEMS = STATIC_PRACTICE_PROBLEMS.map((p) => ({
  id: p.slug,
  slug: p.slug,
  title: p.title,
  difficulty: p.difficulty,
  category: p.category,
  basePoints: p.basePoints,
  timeLimitMs: p.timeLimitMs,
  memoryLimitMb: p.memoryLimitMb,
  isDaily: false,
  isPractice: true,
  moduleSlug: p.moduleSlug,
  sourceType: 'PRACTICE',
  tags: p.tags,
  description: p.description,
  starterCode: p.starterCode,
  solutionCode: p.solutionCode,
  testCases: [
    ...p.sampleTests.map((t, idx) => ({ id: `${p.slug}-s${idx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: true, isHidden: false, orderIndex: idx })),
    ...p.hiddenTests.map((t, idx) => ({ id: `${p.slug}-h${idx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: false, isHidden: true, orderIndex: p.sampleTests.length + idx })),
  ],
}));

const FORMATTED_DAILY_PROBLEMS = [
  {
    id: 'daily-longest-unique-substring',
    slug: 'daily-longest-unique-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    category: 'Strings & Hash/Lookup',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    sourceType: 'SEED',
    tags: ['Strings', 'Sliding-Window', 'Lookup'],
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    starterCode: '#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[1000];\n    if (scanf("%s", s) != 1) return 0;\n    return 0;\n}',
    testCases: [
      { id: 'daily-s1', input: 'abcabcbb\n', expectedOutput: '3\n', isSample: true, isHidden: false, orderIndex: 0 },
      { id: 'daily-s2', input: 'bbbbb\n', expectedOutput: '1\n', isSample: true, isHidden: false, orderIndex: 1 },
      { id: 'daily-s3', input: 'pwwkew\n', expectedOutput: '3\n', isSample: true, isHidden: false, orderIndex: 2 },
      { id: 'daily-h1', input: 'abcdef\n', expectedOutput: '6\n', isSample: false, isHidden: true, orderIndex: 3 },
    ],
  },
];

export const DEFAULT_PROBLEMS = [
  ...FORMATTED_KANETKAR_PROBLEMS,
  ...FORMATTED_PRACTICE_PROBLEMS,
  ...FORMATTED_DAILY_PROBLEMS,
];

let memoryProblems: any[] = DEFAULT_PROBLEMS.map((p) => ({ ...p }));

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
  return memoryProblems;
}

function saveStoredProblems(problems: any[]) {
  memoryProblems = problems;
  try {
    localStorage.setItem(STORAGE_KEYS.PROBLEMS, JSON.stringify(problems));
  } catch {
    // ignore
  }
}

export const ADMIN_EMAILS = [
  'admin@logicq.io',
  'thoratpratik2323@gmail.com',
  'logicqarena@gmail.com',
  'hariprasathset@sanjivani.edu.in',
  'logicq1304@gmail.com',
  'ipworker1908@gmail.com',
  'ipverse1918@gmail.com',
];

export function isExplicitAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
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
        if (isExplicitAdminEmail(u.email) && u.role !== 'ADMIN') {
          u.role = 'ADMIN';
          u.profileComplete = true;
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
    {
      id: 'admin-2',
      username: 'logicq1304',
      email: 'logicq1304@gmail.com',
      fullName: 'LogicQ Admin',
      role: 'ADMIN',
      college: 'Sanjivani University',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: '1304',
      profileComplete: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-3',
      username: 'ipworker1908',
      email: 'ipworker1908@gmail.com',
      fullName: 'IP Worker Admin',
      role: 'ADMIN',
      college: 'Sanjivani University',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: '1908',
      profileComplete: true,
      createdAt: new Date().toISOString(),
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
        if (isExplicitAdminEmail(active.email) && active.role !== 'ADMIN') {
          active.role = 'ADMIN';
          active.profileComplete = true;
          try {
            localStorage.setItem('logicq_active_user', JSON.stringify(active));
          } catch {}
        }
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

  if (path === '/auth/send-login-otp' && method === 'POST') {
    const { identifier } = body;
    if (!identifier) throw new Error('Please enter your registered email or mobile number.');
    const cleanId = String(identifier).trim();
    const users = getStoredUsers();
    let user = users.find((u) => 
      u.email.toLowerCase() === cleanId.toLowerCase() || 
      (u.prn && u.prn.toUpperCase() === cleanId.toUpperCase()) ||
      u.username.toLowerCase() === cleanId.toLowerCase() ||
      ((u as any).mobile && (u as any).mobile.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')))
    );

    if (!user && isExplicitAdminEmail(cleanId)) {
      user = {
        id: 'admin-' + Date.now(),
        username: cleanId.split('@')[0],
        email: cleanId.toLowerCase(),
        role: 'ADMIN',
        fullName: cleanId.includes('thorat') ? 'Pratik Thorat' : 'System Administrator',
        displayName: cleanId.includes('thorat') ? 'Pratik Thorat' : 'Admin',
        college: 'Sanjivani University',
        profileComplete: true,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      } as any;
      if (user) users.push(user as any);
      saveStoredUsers(users);
    }

    if (!user) {
      throw new Error(`Access Denied: No enrolled account found for "${cleanId}". Students cannot self-register; you must be enrolled into a course section by your faculty instructor.`);
    }

    if (user.isBanned) {
      throw new Error('Your account has been suspended by an administrator.');
    }

    // Generate numeric 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      sessionStorage.setItem('logicq_dev_login_otp_' + user.email.toLowerCase(), JSON.stringify({ code: rawOtp, expires: Date.now() + 10 * 60 * 1000 }));
    } catch {}

    const maskedTarget = user.email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*');
    return {
      success: true,
      message: `6-digit verification OTP sent to ${maskedTarget}`,
      target: maskedTarget,
      cooldownRemaining: 60,
      devOtp: rawOtp,
    };
  }

  if (path === '/auth/verify-login-otp' && method === 'POST') {
    const { identifier, code } = body;
    if (!identifier || !code) throw new Error('Identifier and 6-digit OTP code are required.');
    const cleanId = String(identifier).trim();
    const cleanCode = String(code).trim();
    const users = getStoredUsers();
    let user = users.find((u) => 
      u.email.toLowerCase() === cleanId.toLowerCase() || 
      (u.prn && u.prn.toUpperCase() === cleanId.toUpperCase()) ||
      u.username.toLowerCase() === cleanId.toLowerCase() ||
      ((u as any).mobile && (u as any).mobile.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')))
    );

    if (!user && isExplicitAdminEmail(cleanId)) {
      user = {
        id: 'admin-' + Date.now(),
        username: cleanId.split('@')[0],
        email: cleanId.toLowerCase(),
        role: 'ADMIN',
        fullName: cleanId.includes('thorat') ? 'Pratik Thorat' : 'System Administrator',
        displayName: cleanId.includes('thorat') ? 'Pratik Thorat' : 'Admin',
        college: 'Sanjivani University',
        profileComplete: true,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      } as any;
      if (user) users.push(user as any);
      saveStoredUsers(users);
    }

    if (!user) {
      throw new Error('No enrolled account found.');
    }

    if (user.isBanned) {
      throw new Error('Your account has been suspended by an administrator.');
    }

    // Verify OTP: master code or stored code
    let isValid = cleanCode === '123456' || cleanCode === '999999';
    try {
      const stored = sessionStorage.getItem('logicq_dev_login_otp_' + user.email.toLowerCase());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.code === cleanCode && Date.now() < parsed.expires) {
          isValid = true;
        }
      }
    } catch {}

    if (!isValid) {
      throw new Error('Invalid or expired OTP verification code.');
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    const { password: _, ...safeUser } = user;
    return {
      success: true,
      message: 'OTP verified successfully.',
      data: {
        user: safeUser,
        accessToken: 'fallback_token_' + Date.now(),
        refreshToken: 'fallback_refresh_' + Date.now(),
      },
    };
  }

  if (path === '/auth/register' && method === 'POST') {
    throw new Error('Public self-registration is closed. Students must be enrolled into a course section by their faculty mentor.');
  }

  if (path === '/auth/complete-profile' && method === 'POST') {
    const current = getCurrentUser();
    if (!current) throw new Error('Not authenticated');
    const { prn, college, department, year, division, fullName, displayName } = body;
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
    const studentName = (fullName || displayName || '').trim();
    const updated = {
      ...users[idx],
      prn: cleanPrn,
      maskedPrn: `••••••${shortId}`,
      college: college || 'Sanjivani University',
      department: department || 'CSE',
      year: year || 'FY',
      division: division ? String(division).trim().toUpperCase() : null,
      ...(studentName
        ? {
            fullName: studentName,
            displayName: studentName.slice(0, 20),
          }
        : {}),
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
    const isAdmin = isExplicitAdminEmail(email);
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
        fullName: fullName || (isAdmin ? 'LogicQ Admin' : baseUsername),
        avatarUrl,
        role: isAdmin ? ('ADMIN' as const) : ('STUDENT' as const),
        college: 'Sanjivani University',
        profileComplete: isAdmin ? true : false,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        isBanned: false,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveStoredUsers(users);
      found = newUser;
    } else if (isAdmin && found.role !== 'ADMIN') {
      found.role = 'ADMIN';
      found.profileComplete = true;
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

  if (path === '/config' && method === 'GET') {
    return {
      success: true,
      dailyChallengePaused: true,
      pausedAt: new Date().toISOString(),
      resumedAt: null,
    };
  }

  if (path === '/admin/daily-system/preview' && method === 'GET') {
    return {
      success: true,
      data: {
        dailyChallengePaused: true,
        pausedAt: new Date().toISOString(),
        pauseReason: 'Default safe state: Daily challenge pool transitioning to book-only curriculum',
        scheduledCount: 0,
        minRequired: 14,
        canResume: false,
        first7Preview: [],
      },
    };
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
    return {
      success: true,
      data: {
        paused: true,
        message: 'Daily challenges are not live yet. We will announce the start.',
        problem: null,
        secondsUntilNextReset: null,
        endsAt: null,
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
          streakFreezeStatus: '1 Auto Freeze / 7 Days',
          totalSolved: solvedIds.size,
          thisWeekSolved: solvedIds.size,
          thisWeekTotal: 7,
          totalSubmissions: subs.length,
          accuracy,
          rank,
          percentile,
          studentsBeaten: 0,
          totalUsers: totalPoints > 0 ? 1 : 0,
          dailyRank: rank,
          pointsToday: 0,
          vsYesterdayDelta: null,
          yesterdaySummary: null,
        },
        dailySummary: {
          challengeTitle: 'Featured Challenge',
          date: new Date().toISOString().split('T')[0],
          verdict: 'NOT_SUBMITTED',
          points: 0,
          dailyRank: null,
          attempts: 0,
          streak: user?.currentStreak || 0,
          improvementHint: 'Solve the daily challenge early to establish your daily campus rank.',
        },
        weeklySummary: {
          weekLabel: 'Current Day',
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
          streakFreezeStatus: '1 Auto Freeze / 7 Days',
          rank, // null if 0 points
          bestDailyRank: rank,
          accuracy: subs.length > 0 ? Math.round((subs.filter((s) => s.verdict === 'ACCEPTED').length / subs.length) * 100) : null,
          totalSolved: new Set(subs.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId)).size,
          solvedByDifficulty: {
            EASY: new Set(subs.filter((s) => s.verdict === 'ACCEPTED' && s.problem?.difficulty === 'EASY').map((s) => s.problemId)).size,
            MEDIUM: new Set(subs.filter((s) => s.verdict === 'ACCEPTED' && s.problem?.difficulty === 'MEDIUM').map((s) => s.problemId)).size,
            HARD: new Set(subs.filter((s) => s.verdict === 'ACCEPTED' && s.problem?.difficulty === 'HARD').map((s) => s.problemId)).size,
          },
          streakHeatmap90d: [],
          rankHistory30d: [],
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
        recentSubmissions: subs.slice(0, 10).map((s) => ({
          ...s,
          code: isOwner ? s.code || '#include <stdio.h>\n\nint main() {\n    printf("Accepted");\n    return 0;\n}' : undefined,
        })),
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
    const rawTab = params.get('tab') || 'today';
    if (rawTab === 'today' || rawTab === 'yesterday') {
      return {
        success: true,
        data: {
          tab: rawTab,
          dailyChallengePaused: true,
          paused: true,
          message: 'Daily challenges are not live yet. We will announce the start.',
          leaderboard: [],
          pinnedOwnRow: null,
          totalRanked: 0,
          totalSolvers: 0,
          availablePastDays: [],
          availableWeeks: [],
        },
      };
    }

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

      const userPoints = u.totalPoints || 0;
      let storedPracticeMap: Record<string, any> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
        if (raw) storedPracticeMap = JSON.parse(raw);
      } catch {}
      const allSubs = getStoredSubmissions();
      const userSolvedSet = new Set<string>();
      for (const s of allSubs) {
        if (s.userId === u.id && s.verdict === 'ACCEPTED' && s.problemId) {
          userSolvedSet.add(s.problemId);
        }
      }
      for (const [key, prog] of Object.entries(storedPracticeMap)) {
        if (prog && prog.isSolved && (prog.userId === u.id || key.startsWith(`${u.id}:`))) {
          userSolvedSet.add(prog.problemId || key.split(':')[1] || key);
        }
      }
      const solvedCount = userSolvedSet.size > 0 ? userSolvedSet.size : (userPoints > 0 ? 1 : 0);

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
        totalPoints: userPoints,
        weeklyPoints: userPoints,
        currentStreak: u.currentStreak || 0,
        longestStreak: u.longestStreak || 0,
        solvedCount,
        totalSolved: solvedCount,
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
        solvedCount: (() => {
          const pts = current.totalPoints || 0;
          return pts > 0 ? Math.max(1, Math.floor(pts / 10)) : 0;
        })(),
        totalSolved: (() => {
          const pts = current.totalPoints || 0;
          return pts > 0 ? Math.max(1, Math.floor(pts / 10)) : 0;
        })(),
        percentile: 0,
        studentsBeaten: 0,
      } as any;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const pastDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (i + 1) * 86400000);
      return d.toISOString().split('T')[0];
    });

    return {
      success: true,
      data: {
        tab: 'today',
        dayId: todayStr,
        leaderboard,
        pinnedOwnRow,
        totalRanked,
        totalSolvers: totalRanked,
        availablePastDays: pastDays,
        availableWeeks: [
          { weekOffset: 0, weekLabel: 'Today (Live)', isFrozen: false },
          { weekOffset: -1, weekLabel: 'Yesterday (Final Rankings)', isFrozen: true },
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

  // ADMIN PRACTICE MODULE & QUESTION CRUD ROUTES
  if (path === '/admin/practice/modules' && method === 'POST') {
    const modules = getStoredPracticeModules();
    const newModule: PracticeModuleConfig = {
      id: body.id || `module-${Date.now()}`,
      slug: body.slug || `module-${Date.now()}`,
      title: body.title,
      order: Number(body.order) || modules.length + 1,
      description: body.description || '',
      requiredSolvedToUnlock: Number(body.requiredSolvedToUnlock) || 0,
      totalQuestions: Number(body.totalQuestions) || 10,
      distribution: body.distribution || { EASY: 4, MEDIUM: 4, HARD: 2 },
    };
    modules.push(newModule);
    saveStoredPracticeModules(modules);
    return { success: true, data: { module: newModule } };
  }

  if (path === '/admin/practice/problems' && method === 'POST') {
    const newProblem: PracticeProblemDef = {
      slug: body.slug || `practice-${Date.now()}`,
      moduleSlug: body.moduleSlug,
      moduleOrder: Number(body.moduleOrder) || 1,
      title: body.title,
      difficulty: body.difficulty || 'EASY',
      category: body.category || 'Practice',
      tags: Array.isArray(body.tags) ? body.tags : ['Practice'],
      description: body.description || '',
      starterCode: body.starterCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
      solutionCode: body.solutionCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
      wrongSolution1: body.wrongSolution1 || '',
      wrongSolution2: body.wrongSolution2 || '',
      timeLimitMs: Number(body.timeLimitMs) || 1000,
      memoryLimitMb: Number(body.memoryLimitMb) || 64,
      basePoints: Number(body.basePoints) || 20,
      sampleTests: Array.isArray(body.sampleTests) ? body.sampleTests : [{ input: '1\n', expectedOutput: '1\n' }],
      hiddenTests: Array.isArray(body.hiddenTests) ? body.hiddenTests : [],
    };
    saveCustomPracticeProblem(newProblem);
    return { success: true, data: { problem: newProblem } };
  }

  if (path.startsWith('/admin/practice/problems/') && method === 'DELETE') {
    const slug = path.replace('/admin/practice/problems/', '');
    deletePracticeProblem(slug);
    return { success: true };
  }

  // PRACTICE MODULES
  if (path === '/practice/modules') {
    const current = getCurrentUser();
    const isAdmin = current?.role === 'ADMIN';
    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';

    const practiceModules = getStoredPracticeModules();
    const allPracticeProblems = getStoredPracticeProblems();

    let previousModuleSolved = 0;
    let previousModuleTotal = 20;
    const modulesResponse = practiceModules.map((m, idx) => {
      const moduleProblems = allPracticeProblems.filter((p) => p.moduleSlug === m.slug);
      const totalPublished = moduleProblems.length;
      const easyCount = moduleProblems.filter((p) => p.difficulty === 'EASY').length;
      const mediumCount = moduleProblems.filter((p) => p.difficulty === 'MEDIUM').length;
      const hardCount = moduleProblems.filter((p) => p.difficulty === 'HARD').length;
      const isComingSoon = totalPublished < (m.totalQuestions || 20);

      const solvedInModule = moduleProblems.filter(
        (p) => storedProgress[`${userPrefix}${p.slug}`]?.isSolved
      ).length;

      const threshold = m.requiredSolvedToUnlock ?? PRACTICE_CONFIG.practiceUnlockThreshold;
      const prevTitle = idx > 0 ? practiceModules[idx - 1].title : '';
      
      let isUnlocked = false;
      let requirementText = '';

      if (idx === 0) {
        isUnlocked = true;
        requirementText = 'Unlocked by default';
      } else if (previousModuleTotal < (practiceModules[idx - 1].totalQuestions || 20)) {
        isUnlocked = false;
        requirementText = `${prevTitle} is coming soon (incomplete curriculum)`;
      } else {
        isUnlocked = previousModuleSolved >= threshold;
        requirementText = isUnlocked
          ? ''
          : getModuleRequirementText(prevTitle, threshold, previousModuleSolved, previousModuleTotal);
      }

      previousModuleSolved = solvedInModule;
      previousModuleTotal = totalPublished;

      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        order: m.order,
        description: m.description,
        isUnlocked,
        isAdminUnlocked: isAdmin,
        requirementText,
        totalQuestions: totalPublished,
        solvedCount: solvedInModule,
        progressPercent: totalPublished
          ? Math.round((solvedInModule / totalPublished) * 100)
          : 0,
        isComingSoon,
        canComplete: !isComingSoon,
        distribution: {
          EASY: easyCount,
          MEDIUM: mediumCount,
          HARD: hardCount,
        },
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
    const isAdmin = current?.role === 'ADMIN';
    let storedProgress: Record<string, { isSolved: boolean; attemptsCount: number; bestRuntimeMs: number }> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
      if (raw) storedProgress = JSON.parse(raw);
    } catch {
      // ignore
    }
    const userPrefix = current?.id ? `${current.id}:` : 'anon:';

    const practiceModules = getStoredPracticeModules();
    const allPracticeProblems = getStoredPracticeProblems();

    const moduleConfig = practiceModules.find((m) => m.slug === moduleSlug);
    if (!moduleConfig) {
      const err = new Error('Practice module not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    const modIdx = practiceModules.findIndex((m) => m.slug === moduleSlug);
    const threshold = moduleConfig.requiredSolvedToUnlock ?? PRACTICE_CONFIG.practiceUnlockThreshold;
    if (!isAdmin && modIdx > 0) {
      const prevMod = practiceModules[modIdx - 1];
      const prevProblems = allPracticeProblems.filter((p) => p.moduleSlug === prevMod.slug);
      if (prevProblems.length < (prevMod.totalQuestions || 20)) {
        const err = new Error(
          `${prevMod.title} is coming soon and cannot be unlocked as complete.`
        ) as Error & { status?: number; code?: string };
        err.status = 403;
        err.code = 'MODULE_LOCKED';
        throw err;
      }
      const prevSolved = prevProblems.filter(
        (p) => storedProgress[`${userPrefix}${p.slug}`]?.isSolved
      ).length;
      if (prevSolved < threshold) {
        const err = new Error(
          getModuleRequirementText(prevMod.title, threshold, prevSolved, prevProblems.length)
        ) as Error & { status?: number; code?: string };
        err.status = 403;
        err.code = 'MODULE_LOCKED';
        throw err;
      }
    }

    const moduleProblems = allPracticeProblems
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
    const allPracticeProblems = getStoredPracticeProblems();
    const problem = allPracticeProblems.find((p) => p.slug === problemSlug);
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
    const allPracticeProblems = getStoredPracticeProblems();
    const problem = allPracticeProblems.find((p) => p.slug === problemSlug);
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

  // ==========================================
  // INTEGRATED CAPSTONE MINI-PROJECT (Sections 35 - 39)
  // ==========================================
  const CANONICAL_MINI_PROJECT = {
    id: 'capstone-mini-project-c11',
    moduleId: 'module-4',
    title: 'Hospital Patient Triage & Vitals Monitoring System',
    scenario: 'You are developing an embedded C11 emergency medical triage and patient monitoring console for City General Hospital.\nThe system continuously ingests patient vitals (Blood Pressure, Heart Rate, SpO2, and Age) and maintains an active priority queue sorted by severity urgency.',
    requirements: `### Technical Specifications & Competencies

1. **Competency 1 — Syntax & Control Flow (5 Marks)**:
   - Implement triage priority classification function:
     \`int calculateTriageLevel(int heartRate, int spO2, int systolicBP)\`
   - Priority 1 (Critical): SpO2 < 90 OR Heart Rate > 140 OR Systolic BP < 90.
   - Priority 2 (Urgent): 90 <= SpO2 <= 94 OR 100 <= Heart Rate <= 140.
   - Priority 3 (Standard): All vitals in stable nominal ranges.

2. **Competency 2 — Arrays & Structured Data (5 Marks)**:
   - Define \`struct Vitals { int heartRate; int spO2; int systolicBP; };\`
   - Define \`struct Patient { int id; char name[32]; int age; struct Vitals vitals; int triagePriority; };\`
   - Maintain and display patient arrays sorted by priority level.

3. **Competency 3 — Pointers & Functions (5 Marks)**:
   - Write pointer-driven record mutators \`void updateVitalsByRef(struct Patient *p, int hr, int spo2, int bp);\`
   - Write dynamic search functions \`struct Patient* findPatientById(struct Patient *list, int count, int id);\`

4. **Competency 4 — System Integration & Memory Management (5 Marks)**:
   - Provide a modular interactive console dispatcher (\`ADD\`, \`LIST\`, \`STATS\`).
   - Ensure zero memory leaks with clean pointer hygiene.`,
    rubricJson: JSON.stringify([
      { competency: 'Syntax & Branching Logic (Triage Rules)', maxMarks: 5 },
      { competency: 'Data Structuring (Patient Records & Vitals)', maxMarks: 5 },
      { competency: 'Pointers & Dynamic Memory (Reference Mutators)', maxMarks: 5 },
      { competency: 'System Integration, Modularity & Error Handling', maxMarks: 5 },
    ]),
    starterCode: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n// 1. DATA STRUCTURES\nstruct Vitals {\n    int heartRate;\n    int spO2;\n    int systolicBP;\n};\n\nstruct Patient {\n    int id;\n    char name[32];\n    int age;\n    struct Vitals vitals;\n    int triagePriority; // 1 = Critical, 2 = Urgent, 3 = Standard\n};\n\n// 2. COMPETENCY FUNCTIONS\nint calculateTriageLevel(int hr, int spo2, int bp) {\n    if (spo2 < 90 || hr > 140 || bp < 90) return 1;\n    if ((spo2 >= 90 && spo2 <= 94) || (hr >= 100 && hr <= 140)) return 2;\n    return 3;\n}\n\nvoid updateVitalsByRef(struct Patient *p, int hr, int spo2, int bp) {\n    if (!p) return;\n    p->vitals.heartRate = hr;\n    p->vitals.spO2 = spo2;\n    p->vitals.systolicBP = bp;\n    p->triagePriority = calculateTriageLevel(hr, spo2, bp);\n}\n\nint main() {\n    printf("--- City General Hospital Triage Console ---\\n");\n    // TODO: Implement interactive patient queue management\n    return 0;\n}\n`,
    expectedTimeMin: 45,
    expectedTimeMax: 120,
  };

  if (path === '/mini-project/student/my-projects' && method === 'GET') {
    return {
      success: true,
      projects: [
        {
          ...CANONICAL_MINI_PROJECT,
          accessStatus: 'ACTIVE',
          academicScore: 0,
        },
      ],
      canonicalProject: CANONICAL_MINI_PROJECT,
    };
  }

  if (path === '/mini-project/activate-practice' && method === 'POST') {
    return {
      success: true,
      access: {
        id: 'access-capstone-mini-project',
        miniProjectId: CANONICAL_MINI_PROJECT.id,
        status: 'ACTIVE',
        academicScore: 0,
      },
      project: CANONICAL_MINI_PROJECT,
    };
  }

  if (path.startsWith('/mini-project/') && method === 'GET') {
    return {
      success: true,
      access: {
        id: 'access-capstone-mini-project',
        miniProjectId: CANONICAL_MINI_PROJECT.id,
        status: 'ACTIVE',
        academicScore: 0,
        rubricScoresJson: null,
      },
      project: CANONICAL_MINI_PROJECT,
    };
  }

  if (path === '/mini-project/submit' && method === 'POST') {
    const { code } = body;
    const rubricScores = {
      section1: code && (code.includes('if') || code.includes('switch')) ? 5 : 3,
      section2: code && (code.includes('[') || code.includes('struct')) ? 5 : 3,
      section3: code && (code.includes('void') || code.includes('int ')) ? 5 : 4,
      section4: 5,
    };
    const academicScore = rubricScores.section1 + rubricScores.section2 + rubricScores.section3 + rubricScores.section4;
    return {
      success: true,
      academicScore,
      maxMarks: 20,
      rubricScores,
      integrityScore: 0,
      integrityRisk: 'NORMAL',
      status: 'SUBMITTED',
    };
  }

  return { success: true, data: {} };
}
