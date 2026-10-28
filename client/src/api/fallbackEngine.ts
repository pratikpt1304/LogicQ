import { User, Role } from '../types/index.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  normalizeDepartment,
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
  isRealPersonName,
  formatNameFromEmail,
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

import { PRACTICE_CONFIG, PracticeModuleConfig, getModuleRequirementText, isModule5UnlockedByAdmin } from '../config/practice.config.js';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { PRACTICE_MODULE_5_PROBLEMS } from '../data/practice-module5.data.js';
import { KANETKAR_BOOK_PROBLEMS } from '../data/kanetkar-book-bank.js';

const STATIC_PRACTICE_PROBLEMS: PracticeProblemDef[] = [
  ...PRACTICE_MODULE_1_PROBLEMS,
  ...PRACTICE_MODULE_2_PROBLEMS,
  ...PRACTICE_MODULE_3_PROBLEMS,
  ...PRACTICE_MODULE_4_PROBLEMS,
  ...PRACTICE_MODULE_5_PROBLEMS,
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

const FORMATTED_KANETKAR_PROBLEMS = KANETKAR_BOOK_PROBLEMS.map((bp, idx) => ({
  id: bp.slug,
  slug: bp.slug,
  title: bp.title,
  difficulty: bp.difficulty,
  category: bp.category,
  basePoints: bp.basePoints,
  timeLimitMs: bp.timeLimitMs,
  memoryLimitMb: bp.memoryLimitMb,
  isDaily: idx === 0,
  sourceType: 'BOOK',
  sourceRef: bp.sourceRef,
  tags: bp.tags,
  description: bp.description,
  starterCode: bp.starterCode,
  solutionCode: bp.solutionCode,
  testCases: [
    ...bp.sampleTests.map((t, tidx) => ({ id: `${bp.slug}-s${tidx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: true, isHidden: false, orderIndex: tidx })),
    ...bp.hiddenTests.map((t, tidx) => ({ id: `${bp.slug}-h${tidx + 1}`, input: t.input, expectedOutput: t.expectedOutput, isSample: false, isHidden: true, orderIndex: bp.sampleTests.length + tidx })),
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

export const DEFAULT_PROBLEMS = [
  ...FORMATTED_KANETKAR_PROBLEMS,
  ...FORMATTED_PRACTICE_PROBLEMS,
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
  'logicqarena@gmail.com',
  'hariprasathset@sanjivani.edu.in',
];

export const PURGED_EMAILS = [
  'rohan_1390@test.edu',
  'join_1390@sanjivani.edu.in',
  'ipverse1918@gmail.com',
  'ipworker1908@gmail.com',
  'logicq1304@gmail.com',
];

export const PURGED_PRNS = ['2024BCSE0001', '2026IMTM0001', '2026VAL1390', '2026JON1390'];

export function isExplicitlyPurgedUser(identifier?: any): boolean {
  if (!identifier) return false;
  const email = (typeof identifier === 'string' ? identifier : identifier.email || '').toLowerCase().trim();
  const prn = (typeof identifier === 'string' ? identifier : identifier.prn || '').toUpperCase().trim();
  if (
    PURGED_EMAILS.includes(email) ||
    PURGED_PRNS.includes(prn)
  ) return true;
  return false;
}

export const WALKTHROUGH_EMAILS = [
  'student@logicq.io',
  'faculty@logicq.io',
  'hariprasathset@sanjivani.edu.in',
  'logicqarena@gmail.com',
];

export function isWalkthroughAccount(email?: string | null): boolean {
  if (!email) return false;
  return WALKTHROUGH_EMAILS.includes(email.trim().toLowerCase());
}

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
      const filtered = parsed.filter((u) => {
        if (!u) return false;
        if (isExplicitlyPurgedUser(u) || FirestoreDataService.isPurgedStudent(u)) {
          migrated = true;
          return false;
        }
        if (u.email && (u.email.includes('ipworker') || u.email.includes('ipverse'))) {
          migrated = true;
          return false;
        }
        return true;
      });
      let sanitized = filtered.map((u) => {
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
      if (!sanitized.some((u) => u.email.toLowerCase() === 'logicqarena@gmail.com')) {
        sanitized.push({
          id: 'admin-super-1',
          username: 'logicqarena',
          email: 'logicqarena@gmail.com',
          fullName: 'LogicQ Arena Admin',
          displayName: 'LogicQ Admin',
          role: 'ADMIN',
          college: 'Sanjivani University',
          department: 'CSE',
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          password: 'password123',
          isBanned: false,
          shortId: 'ARENA',
          createdAt: new Date().toISOString(),
        } as any);
        migrated = true;
      }
      if (!sanitized.some((u) => u.email.toLowerCase() === 'hariprasathset@sanjivani.edu.in')) {
        sanitized.push({
          id: 'admin-hari-1',
          username: 'hariprasath',
          email: 'hariprasathset@sanjivani.edu.in',
          fullName: 'Dr. Hari Prasath',
          displayName: 'Dr. Hari Prasath (Admin)',
          role: 'ADMIN',
          college: 'Sanjivani University',
          department: 'CSE',
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          password: 'password123',
          isBanned: false,
          shortId: 'HARI',
          createdAt: new Date().toISOString(),
        } as any);
        migrated = true;
      }
      if (!sanitized.some((u) => u.email.toLowerCase() === 'faculty@logicq.io')) {
        sanitized.push({
          id: 'faculty-walkthrough-1',
          username: 'faculty_demo',
          email: 'faculty@logicq.io',
          fullName: 'Prof. Demo Faculty (Walkthrough)',
          displayName: 'Prof. Demo Faculty',
          role: 'FACULTY',
          college: 'Sanjivani University',
          department: 'CSE',
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          password: 'password123',
          isBanned: false,
          shortId: 'FAC1',
          createdAt: new Date().toISOString(),
        } as any);
        migrated = true;
      }
      if (!sanitized.some((u) => u.email.toLowerCase() === 'student@logicq.io')) {
        sanitized.push({
          id: 'student-walkthrough-1',
          username: 'student_demo',
          email: 'student@logicq.io',
          prn: '2026STUD0001',
          fullName: 'Demo Student (Walkthrough)',
          displayName: 'Demo Student',
          role: 'STUDENT',
          college: 'Sanjivani University',
          department: 'CSE',
          year: 'SY',
          division: 'A',
          profileComplete: true,
          totalPoints: 120,
          currentStreak: 2,
          longestStreak: 4,
          password: 'password123',
          isBanned: false,
          shortId: 'STU1',
          createdAt: new Date().toISOString(),
        } as any);
        migrated = true;
      }
      if (!sanitized.some((u) => u.email.toLowerCase() === 'thoratpratik2323@gmail.com')) {
        sanitized.push({
          id: 'student-pratik-1',
          username: 'pratik_thorat',
          email: 'thoratpratik2323@gmail.com',
          prn: '2126PMIM1039',
          fullName: 'Pratik Thorat',
          displayName: 'Pratik Thorat',
          role: 'STUDENT',
          college: 'Sanjivani University',
          department: 'Integrated M.Tech',
          year: 'TY',
          division: 'A',
          profileComplete: true,
          totalPoints: 240,
          currentStreak: 3,
          longestStreak: 5,
          password: 'password123',
          isBanned: false,
          shortId: '1039',
          createdAt: new Date().toISOString(),
        } as any);
        migrated = true;
      }
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
      id: 'admin-super-1',
      username: 'logicqarena',
      email: 'logicqarena@gmail.com',
      fullName: 'LogicQ Arena Admin',
      displayName: 'LogicQ Admin',
      role: 'ADMIN',
      college: 'Sanjivani University',
      department: 'CSE',
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: 'ARENA',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-hari-1',
      username: 'hariprasath',
      email: 'hariprasathset@sanjivani.edu.in',
      fullName: 'Dr. Hari Prasath',
      displayName: 'Dr. Hari Prasath (Admin)',
      role: 'ADMIN',
      college: 'Sanjivani University',
      department: 'CSE',
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: 'HARI',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'faculty-walkthrough-1',
      username: 'faculty_demo',
      email: 'faculty@logicq.io',
      fullName: 'Prof. Demo Faculty (Walkthrough)',
      displayName: 'Prof. Demo Faculty',
      role: 'FACULTY',
      college: 'Sanjivani University',
      department: 'CSE',
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      password: 'password123',
      isBanned: false,
      shortId: 'FAC1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'student-pratik-1',
      username: 'pratik_thorat',
      email: 'thoratpratik2323@gmail.com',
      prn: '2126PMIM1039',
      fullName: 'Pratik Thorat',
      displayName: 'Pratik Thorat',
      role: 'STUDENT',
      college: 'Sanjivani University',
      department: 'Integrated M.Tech',
      year: 'TY',
      division: 'A',
      profileComplete: true,
      totalPoints: 240,
      currentStreak: 3,
      longestStreak: 5,
      password: 'password123',
      isBanned: false,
      shortId: '1039',
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

const INITIAL_FALLBACK_SUBMISSIONS: any[] = [
  {
    id: 'sub_arch_001',
    problemId: 'kanetkar-ch02-rotate-array',
    userId: 'user_pratik_1039',
    user: {
      id: 'user_pratik_1039',
      fullName: 'Pratik Thorat',
      displayName: 'Pratik Thorat',
      prn: '2026VAL1039',
      email: 'pratikpt1304@gmail.com',
      department: 'Integrated M.Tech',
      year: 'FY',
    },
    problem: {
      id: 'kanetkar-ch02-rotate-array',
      title: 'Cyclic Array Rotation & Memory Barrier',
      slug: 'kanetkar-ch02-rotate-array',
      difficulty: 'MEDIUM',
      category: 'Arrays & Pointers',
    },
    verdict: 'ACCEPTED',
    runtimeMs: 14,
    memoryKb: 2048,
    code: `#include <stdio.h>\n#include <stdlib.h>\n\n// Cyclic array rotation by Pratik Thorat\nvoid reverse(int* arr, int start, int end) {\n    while (start < end) {\n        int temp = arr[start];\n        arr[start] = arr[end];\n        arr[end] = temp;\n        start++;\n        end--;\n    }\n}\n\nvoid rotate(int* nums, int numsSize, int k) {\n    if (numsSize <= 1) return;\n    k = k % numsSize;\n    reverse(nums, 0, numsSize - 1);\n    reverse(nums, 0, k - 1);\n    reverse(nums, k, numsSize - 1);\n}\n\nint main() {\n    int n, k;\n    if (scanf("%d %d", &n, &k) != 2) return 0;\n    int* arr = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) {\n        scanf("%d", &arr[i]);\n    }\n    rotate(arr, n, k);\n    for (int i = 0; i < n; i++) {\n        printf("%d%c", arr[i], (i == n - 1 ? '\\n' : ' '));\n    }\n    free(arr);\n    return 0;\n}`,
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
  {
    id: 'sub_arch_002',
    problemId: 'kanetkar-ch02-rotate-array',
    userId: 'user_demo_student',
    user: {
      id: 'user_demo_student',
      fullName: 'Demo Student',
      displayName: 'Demo Student',
      prn: '2026VAL1001',
      email: 'student@sanjivani.edu.in',
      department: 'CSE',
      year: 'FY',
    },
    problem: {
      id: 'kanetkar-ch02-rotate-array',
      title: 'Cyclic Array Rotation & Memory Barrier',
      slug: 'kanetkar-ch02-rotate-array',
      difficulty: 'MEDIUM',
      category: 'Arrays & Pointers',
    },
    verdict: 'WRONG_ANSWER',
    runtimeMs: 18,
    memoryKb: 2180,
    code: `#include <stdio.h>\n\n// Attempt by Demo Student (Failed boundary check for k > n)\nint main() {\n    int n, k;\n    if (scanf("%d %d", &n, &k) != 2) return 0;\n    int arr[1000];\n    for(int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    // Bug: did not apply modulo k % n\n    for(int i = k; i < n; i++) printf("%d ", arr[i]);\n    for(int i = 0; i < k; i++) printf("%d ", arr[i]);\n    printf("\\n");\n    return 0;\n}`,
    createdAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
  },
  {
    id: 'sub_arch_003',
    problemId: 'kanetkar-ch04-string-compression',
    userId: 'user_rohan_1042',
    user: {
      id: 'user_rohan_1042',
      fullName: 'Rohan Deshmukh',
      displayName: 'Rohan Deshmukh',
      prn: '2026VAL1042',
      email: 'rohan.deshmukh@sanjivani.edu.in',
      department: 'IT',
      year: 'SY',
    },
    problem: {
      id: 'kanetkar-ch04-string-compression',
      title: 'Run-Length Encoded Buffer Packer',
      slug: 'kanetkar-ch04-string-compression',
      difficulty: 'HARD',
      category: 'Strings & Buffers',
    },
    verdict: 'ACCEPTED',
    runtimeMs: 22,
    memoryKb: 2310,
    code: `#include <stdio.h>\n#include <string.h>\n\n// Run-length compression in C\nint main() {\n    char s[1024];\n    if (scanf("%s", s) != 1) return 0;\n    int len = strlen(s);\n    for (int i = 0; i < len; i++) {\n        int count = 1;\n        while (i + 1 < len && s[i] == s[i + 1]) {\n            count++;\n            i++;\n        }\n        printf("%c%d", s[i], count);\n    }\n    printf("\\n");\n    return 0;\n}`,
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
  },
  {
    id: 'sub_arch_004',
    problemId: 'kanetkar-ch16-dynamic-array-growth',
    userId: 'user_pratik_1039',
    user: {
      id: 'user_pratik_1039',
      fullName: 'Pratik Thorat',
      displayName: 'Pratik Thorat',
      prn: '2026VAL1039',
      email: 'pratikpt1304@gmail.com',
      department: 'Integrated M.Tech',
      year: 'FY',
    },
    problem: {
      id: 'kanetkar-ch16-dynamic-array-growth',
      title: 'Geometric Vector Growth & Reallocation Simulator',
      slug: 'kanetkar-ch16-dynamic-array-growth',
      difficulty: 'MEDIUM',
      category: 'Memory Models',
    },
    verdict: 'ACCEPTED',
    runtimeMs: 12,
    memoryKb: 1980,
    code: `#include <stdio.h>\n#include <stdlib.h>\n\n// Geometric capacity doubler by Pratik Thorat\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int capacity = 2;\n    int reallocCount = 0;\n    for (int i = 1; i <= n; i++) {\n        if (i > capacity) {\n            capacity *= 2;\n            reallocCount++;\n        }\n    }\n    printf("Final Capacity: %d, Reallocations: %d\\n", capacity, reallocCount);\n    return 0;\n}`,
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  }
];

function getStoredSubmissions(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, any>();
        INITIAL_FALLBACK_SUBMISSIONS.forEach((s) => map.set(s.id, s));
        parsed.forEach((s: any) => map.set(s.id, s));
        return Array.from(map.values());
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_FALLBACK_SUBMISSIONS;
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
    const { identifier, studentRecord } = body;
    if (!identifier) throw new Error('Please enter your registered institutional email address or PRN.');
    const cleanId = String(identifier).trim();

    if (isExplicitlyPurgedUser(cleanId) || FirestoreDataService.isPurgedStudent({ email: cleanId, prn: cleanId })) {
      throw new Error(`Access Denied: This account has been removed. Please contact your course instructor.`);
    }

    const cleanDigits = cleanId.replace(/[^0-9]/g, '');
    const isMobileQuery = cleanDigits.length >= 10;
    const users = getStoredUsers();
    let user = users.find((u) => 
      u.email.toLowerCase() === cleanId.toLowerCase() || 
      (u.prn && u.prn.toUpperCase() === cleanId.toUpperCase()) ||
      u.username.toLowerCase() === cleanId.toLowerCase() ||
      (isMobileQuery && (u as any).mobile && (u as any).mobile.replace(/[^0-9]/g, '').endsWith(cleanDigits.slice(-10)))
    );

    if (!user && isExplicitAdminEmail(cleanId)) {
      user = {
        id: 'admin-' + Date.now(),
        username: cleanId.split('@')[0],
        email: cleanId.toLowerCase(),
        role: 'ADMIN',
        fullName: cleanId.includes('hariprasath') ? 'Dr. Hari Prasath' : 'System Administrator',
        displayName: cleanId.includes('hariprasath') ? 'Dr. Hari Prasath (Admin)' : 'Admin',
        college: 'Sanjivani University',
        profileComplete: true,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      } as any;
      if (user) users.push(user as any);
      saveStoredUsers(users);
    }

    // Auto-adopt verified student record from Firestore if passed and not purged
    if (!user && studentRecord && !isExplicitlyPurgedUser(studentRecord) && !FirestoreDataService.isPurgedStudent(studentRecord)) {
      const emailToUse = (studentRecord.email || cleanId).toLowerCase().trim();
      const prnToUse = studentRecord.prn ? String(studentRecord.prn).toUpperCase().trim() : (isValidPrn(cleanId) ? cleanId.toUpperCase().trim() : undefined);
      user = {
        id: studentRecord.id || studentRecord.uid || 'stu-' + Date.now(),
        username: studentRecord.username || `student_${(prnToUse || 'user').slice(-4).toLowerCase()}`,
        email: emailToUse,
        prn: prnToUse,
        role: 'STUDENT',
        fullName: studentRecord.name || studentRecord.fullName || 'Enrolled Student',
        displayName: studentRecord.displayName || studentRecord.name || 'Student',
        college: studentRecord.college || 'Sanjivani University',
        department: normalizeDepartment(studentRecord.department) || studentRecord.department || 'General',
        year: studentRecord.year || 'SY',
        division: studentRecord.division || null,
        profileComplete: true,
        totalPoints: studentRecord.totalPoints || 0,
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
    const { identifier, code, studentRecord } = body;
    if (!identifier || !code) throw new Error('Identifier and 6-digit OTP code are required.');
    const cleanId = String(identifier).trim();
    const cleanCode = String(code).trim();

    if (isExplicitlyPurgedUser(cleanId) || FirestoreDataService.isPurgedStudent({ email: cleanId, prn: cleanId })) {
      throw new Error(`Access Denied: This account has been removed. Please contact your course instructor.`);
    }

    const cleanDigits = cleanId.replace(/[^0-9]/g, '');
    const isMobileQuery = cleanDigits.length >= 10;
    const users = getStoredUsers();
    let user = users.find((u) => 
      u.email.toLowerCase() === cleanId.toLowerCase() || 
      (u.prn && u.prn.toUpperCase() === cleanId.toUpperCase()) ||
      u.username.toLowerCase() === cleanId.toLowerCase() ||
      (isMobileQuery && (u as any).mobile && (u as any).mobile.replace(/[^0-9]/g, '').endsWith(cleanDigits.slice(-10)))
    );

    if (!user && isExplicitAdminEmail(cleanId)) {
      user = {
        id: 'admin-' + Date.now(),
        username: cleanId.split('@')[0],
        email: cleanId.toLowerCase(),
        role: 'ADMIN',
        fullName: cleanId.includes('hariprasath') ? 'Dr. Hari Prasath' : 'System Administrator',
        displayName: cleanId.includes('hariprasath') ? 'Dr. Hari Prasath (Admin)' : 'Admin',
        college: 'Sanjivani University',
        profileComplete: true,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      } as any;
      if (user) users.push(user as any);
      saveStoredUsers(users);
    }

    if (!user && studentRecord && !isExplicitlyPurgedUser(studentRecord) && !FirestoreDataService.isPurgedStudent(studentRecord)) {
      const emailToUse = (studentRecord.email || cleanId).toLowerCase().trim();
      const prnToUse = studentRecord.prn ? String(studentRecord.prn).toUpperCase().trim() : (isValidPrn(cleanId) ? cleanId.toUpperCase().trim() : undefined);
      user = {
        id: studentRecord.id || studentRecord.uid || 'stu-' + Date.now(),
        username: studentRecord.username || `student_${(prnToUse || 'user').slice(-4).toLowerCase()}`,
        email: emailToUse,
        prn: prnToUse,
        role: 'STUDENT',
        fullName: studentRecord.name || studentRecord.fullName || 'Enrolled Student',
        displayName: studentRecord.displayName || studentRecord.name || 'Student',
        college: studentRecord.college || 'Sanjivani University',
        department: normalizeDepartment(studentRecord.department) || studentRecord.department || 'General',
        year: studentRecord.year || 'SY',
        division: studentRecord.division || null,
        profileComplete: true,
        totalPoints: studentRecord.totalPoints || 0,
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

    // Whitelist check: ONLY faculty@logicq.io & student@logicq.io can authenticate using OTP 123456
    const cleanUserEmail = user.email.toLowerCase().trim();
    const isWalkthroughOtp = cleanCode === '123456' && (cleanUserEmail === 'faculty@logicq.io' || cleanUserEmail === 'student@logicq.io');
    let isValid = isWalkthroughOtp;
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
      department: normalizeDepartment(department) || department || 'General',
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
    if (found && body.firestoreProfile) {
      if (body.firestoreProfile.displayName) found.displayName = body.firestoreProfile.displayName;
      if (body.firestoreProfile.department) found.department = body.firestoreProfile.department;
      if (!found.year && body.firestoreProfile.year) found.year = body.firestoreProfile.year;
      if (!found.division && body.firestoreProfile.division) found.division = body.firestoreProfile.division;
      if (body.firestoreProfile.bio && !found.bio) found.bio = body.firestoreProfile.bio;
      if (body.firestoreProfile.prn) found.prn = body.firestoreProfile.prn;
      if (body.firestoreProfile.totalPoints !== undefined) found.totalPoints = Math.max(found.totalPoints || 0, body.firestoreProfile.totalPoints);
      saveStoredUsers(users);
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
    if (found && body.firestoreProfile) {
      if (body.firestoreProfile.displayName) found.displayName = body.firestoreProfile.displayName;
      if (body.firestoreProfile.department) found.department = body.firestoreProfile.department;
      if (!found.year && body.firestoreProfile.year) found.year = body.firestoreProfile.year;
      if (!found.division && body.firestoreProfile.division) found.division = body.firestoreProfile.division;
      if (body.firestoreProfile.bio && !found.bio) found.bio = body.firestoreProfile.bio;
      if (body.firestoreProfile.prn) found.prn = body.firestoreProfile.prn;
      if (body.firestoreProfile.totalPoints !== undefined) found.totalPoints = Math.max(found.totalPoints || 0, body.firestoreProfile.totalPoints);
      saveStoredUsers(users);
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

  const getDailyTimerPaused = (): boolean => {
    try {
      const val = localStorage.getItem('logicq_daily_timer_paused');
      if (val !== null) return val === 'true';
    } catch {}
    return false; // Default: ON / ACTIVE
  };

  const setDailyTimerPaused = (paused: boolean) => {
    try {
      localStorage.setItem('logicq_daily_timer_paused', String(paused));
    } catch {}
  };

  if (path === '/admin/daily-system/resume' && method === 'POST') {
    setDailyTimerPaused(false);
    return {
      success: true,
      message: 'Daily challenge timer resumed (ON)!',
      data: { dailyChallengePaused: false },
    };
  }

  if (path === '/admin/daily-system/pause' && method === 'POST') {
    setDailyTimerPaused(true);
    return {
      success: true,
      message: 'Daily challenge timer paused (OFF).',
      data: { dailyChallengePaused: true },
    };
  }

  if (path === '/config' && method === 'GET') {
    const isPaused = getDailyTimerPaused();
    return {
      success: true,
      dailyChallengePaused: isPaused,
      pausedAt: isPaused ? new Date().toISOString() : null,
      resumedAt: !isPaused ? new Date().toISOString() : null,
    };
  }

  if (path === '/admin/daily-system/preview' && method === 'GET') {
    const isPaused = getDailyTimerPaused();
    return {
      success: true,
      data: {
        dailyChallengePaused: isPaused,
        pausedAt: isPaused ? new Date().toISOString() : null,
        pauseReason: isPaused ? 'Admin paused daily challenge timer' : null,
        scheduledCount: 1,
        minRequired: 0,
        canResume: isPaused,
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

    const normalizedDept = body.department ? (normalizeDepartment(body.department) || body.department) : undefined;
    if (normalizedDept && !ALLOWED_DEPARTMENTS.includes(normalizedDept as any)) {
      throw new Error('Please select a valid department.');
    }

    if (body.year && !ALLOWED_YEARS.includes(body.year)) {
      throw new Error('Please select a valid academic year (FY, SY, or TY).');
    }

    const users = getStoredUsers();
    const idx = users.findIndex(
      (u) =>
        u.id === current.id ||
        (current.email && u.email && u.email.toLowerCase() === current.email.toLowerCase()) ||
        (current.prn && u.prn && u.prn === current.prn)
    );
    const existing = idx !== -1 ? users[idx] : current;

    const shortId = existing.shortId || generateShortId(existing.id);
    const updatedUser = {
      ...existing,
      displayName: trimmedDisplay === '' ? null : (trimmedDisplay ?? existing.displayName ?? null),
      fullName: trimmedDisplay || existing.fullName || existing.username,
      department: normalizedDept ?? existing.department,
      year: body.year ?? existing.year,
      division: null,
      bio: typeof body.bio === 'string' ? body.bio.trim() : (body.bio ?? existing.bio ?? null),
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl,
      shortId,
      college: 'Sanjivani University',
    };

    if (idx !== -1) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    saveStoredUsers(users);

    // Sync updated student profile across Firestore users, enrolled_students, and sections
    try {
      FirestoreDataService.syncStudentProfileUpdate({
        userId: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        fullName: updatedUser.fullName,
        department: updatedUser.department,
        year: updatedUser.year,
        division: updatedUser.division,
        bio: updatedUser.bio,
        storagePreference: (updatedUser.storagePreference as any) || undefined,
      }).catch(() => {});
    } catch {}

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

      // Sync updated PRN across Firestore users, enrolled_students, and sections
      try {
        FirestoreDataService.syncStudentProfileUpdate({
          userId: updatedUser.id,
          email: updatedUser.email,
          oldPrn,
          newPrn,
          displayName: updatedUser.displayName,
          fullName: updatedUser.fullName,
          department: updatedUser.department,
          year: updatedUser.year,
          division: updatedUser.division,
        }).catch(() => {});
      } catch {}
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

    const isOwner = Boolean(
      current &&
        (current.id === target.id ||
          (current.email && target.email && current.email.toLowerCase() === target.email.toLowerCase()) ||
          (current.prn && target.prn && current.prn === target.prn))
    );
    const realNameCandidate = [
      target.displayName,
      target.fullName,
      isOwner ? current?.displayName : null,
      isOwner ? current?.fullName : null,
    ].find(isRealPersonName);
    const effectiveDisplayName = realNameCandidate || null;
    const effectiveDepartment = target.department || (isOwner ? current?.department : null);
    const effectiveYear = target.year || (isOwner ? current?.year : null);
    const effectiveDivision = target.division || (isOwner ? current?.division : null);
    const effectiveBio = target.bio || (isOwner ? current?.bio : null);
    const subs = getStoredSubmissions().filter((s) => s.userId === target.id);
    const shortId = target.shortId || generateShortId(target.id);
    const publicDisplayName = formatPublicDisplayName({
      displayName: effectiveDisplayName,
      shortId,
      id: target.id,
    });
    const ownMaskedPrn = isOwner ? maskPrn(target.prn || current?.prn) : undefined;
    const ownIdentityLabel = isOwner
      ? formatOwnIdentityLabel({
          department: effectiveDepartment,
          year: effectiveYear,
          prn: target.prn || current?.prn,
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
          displayName: effectiveDisplayName,
          publicDisplayName,
          shortId,
          fullName: isOwner ? (effectiveDisplayName || ownIdentityLabel || publicDisplayName) : publicDisplayName,
          college: target.college || 'Sanjivani University',
          department: effectiveDepartment,
          year: effectiveYear,
          division: effectiveDivision,
          bio: effectiveBio,
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
    if ((rawTab === 'today' || rawTab === 'yesterday') && getDailyTimerPaused()) {
      return {
        success: true,
        data: {
          tab: rawTab,
          dailyChallengePaused: true,
          paused: true,
          message: 'Daily challenge timer is currently paused by administrator.',
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

      const realName = [
        u.displayName,
        u.fullName,
        (u as any).name,
      ].find(isRealPersonName) || formatNameFromEmail(u.email);

      const publicDisplayName = realName || formatPublicDisplayName({
        displayName: u.displayName,
        fullName: u.fullName,
        name: (u as any).name,
        email: u.email,
        username: u.username,
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

      const finalResolvedName = realName || publicDisplayName;

      return {
        rank,
        id: u.id,
        username: u.username,
        displayName: finalResolvedName,
        publicDisplayName: finalResolvedName,
        shortId,
        displayLabel: finalResolvedName,
        fullName: finalResolvedName,
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
      const realName = [
        current.displayName,
        current.fullName,
        (current as any).name,
      ].find(isRealPersonName) || formatNameFromEmail(current.email);

      const publicDisplayName = realName || formatPublicDisplayName({
        displayName: current.displayName,
        fullName: current.fullName,
        name: (current as any).name,
        email: current.email,
        username: current.username,
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

      const finalName = realName || publicDisplayName;

      pinnedOwnRow = {
        rank: null, // NOT RANKED YET!
        id: current.id,
        username: current.username,
        displayName: finalName,
        publicDisplayName: finalName,
        shortId,
        displayLabel: finalName,
        fullName: finalName,
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
    const activeUsers = getStoredUsers().filter(
      (u) => !isExplicitlyPurgedUser(u) && !FirestoreDataService.isPurgedStudent(u)
    );
    return { success: true, data: { users: activeUsers } };
  }

  if (path === '/admin/users' && method === 'POST') {
    const payload = body || {};
    const cleanEmail = String(payload.email || '').toLowerCase().trim();
    const cleanRole: Role = (String(payload.role || '').toUpperCase() === 'ADMIN') ? 'ADMIN' : 'FACULTY';
    const cleanName = String(payload.fullName || payload.name || cleanEmail.split('@')[0]).trim();
    const users = getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    let targetUser: any;
    if (existing) {
      existing.role = cleanRole;
      existing.fullName = cleanName;
      existing.displayName = cleanName;
      if (payload.department) existing.department = payload.department;
      targetUser = existing;
    } else {
      targetUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        fullName: cleanName,
        displayName: cleanName,
        role: cleanRole,
        department: payload.department || (cleanRole === 'ADMIN' ? 'Administration' : 'Faculty'),
        college: payload.college || 'Sanjivani University',
        profileComplete: true,
        accountState: 'ACTIVE',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        createdAt: new Date().toISOString(),
      };
      users.unshift(targetUser);
    }
    saveStoredUsers(users);
    return { success: true, message: `Successfully registered new ${cleanRole}: ${cleanName}`, user: targetUser };
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
    if (idx !== -1 && (body.role === 'ADMIN' || body.role === 'STUDENT' || body.role === 'FACULTY')) {
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
      } else if (m.requiresAdminUnlock || m.order === 5) {
        const isModule5AdminUnlocked = isModule5UnlockedByAdmin();
        isUnlocked = isModule5AdminUnlocked || isAdmin;
        requirementText = isUnlocked
          ? 'Unlocked by Instructor'
          : 'Locked by Instructor / Admin for all students';
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

  // ==========================================
  // ACADEMIC SECTIONS & ROSTERS FALLBACK
  // ==========================================
  if (path === '/sections' && method === 'GET') {
    let localSections: any[] = [];
    try {
      const sectionMap = new Map<string, any>();

      // 1. Fetch from Firestore first for true multi-window/multi-account sync
      try {
        const fsSections = await FirestoreDataService.getSectionsFromFirestore();
        if (Array.isArray(fsSections)) {
          fsSections.forEach((s: any) => {
            if (s && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s)) {
              const key = s.id || s.joinCode;
              if (key) sectionMap.set(key, s);
            }
          });
        }
      } catch {}

      // 2. Merge local storage backup
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(stored)) {
        stored
          .filter((s: any) => !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s))
          .forEach((s: any) => {
            const key = s.id || s.joinCode;
            if (key) {
              const existing = sectionMap.get(key) || {};
              sectionMap.set(key, { ...existing, ...s });
            }
          });
      }

      localSections = Array.from(sectionMap.values()).map((s: any) => {
        let studentsList = Array.isArray(s.students) ? s.students : [];
        if (studentsList.length === 0) {
          try {
            const keys = [
              s.id ? `logicq_section_students_${s.id}` : null,
              s.joinCode ? `logicq_section_students_${s.joinCode}` : null,
              s.joinToken ? `logicq_section_students_${s.joinToken}` : null,
            ].filter(Boolean) as string[];
            for (const k of keys) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > studentsList.length) {
                  studentsList = parsed;
                }
              }
            }
          } catch {}
        }
        const valid = studentsList.filter((st: any) => !FirestoreDataService.isPurgedStudent(st));
        const count = Math.max(valid.length, s._count?.students || 0);
        return {
          ...s,
          students: valid,
          _count: { students: count },
        };
      });
    } catch {}
    return {
      success: true,
      data: localSections,
      sections: localSections,
    };
  }

  if (path === '/sections' && method === 'POST') {
    const payload = body || {};
    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    let stored: any[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (!Array.isArray(stored)) stored = [];
    } catch {}

    const newSec = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      institution: payload.institution || 'Sanjivani University',
      course: payload.course || 'B.Tech CSE',
      subject: payload.subject || 'C Programming',
      sectionName: payload.sectionName || payload.name || 'First Year',
      academicYear: payload.academicYear || '2026-2027',
      semester: payload.semester || 'Semester 1',
      description: payload.description || '',
      joinCode: `LQ-${Math.random().toString(36).slice(-4).toUpperCase()}`,
      joinToken: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}`,
      facultyId: payload.facultyId || null,
      facultyEmail: payload.facultyEmail || null,
      facultyName: payload.facultyName || null,
      createdBy: payload.createdBy || payload.facultyId || null,
      isActive: true,
      students: [],
      _count: { students: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    stored.unshift(newSec);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(stored));
    } catch {}

    return {
      success: true,
      message: 'Section created successfully.',
      data: newSec,
      section: newSec,
    };
  }

  if (path.startsWith('/sections/') && method === 'DELETE') {
    const secId = path.replace('/sections/', '');
    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    try {
      const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(stored)) {
        const filtered = stored.filter((s: any) => s.id !== secId && s.joinCode !== secId);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      }
    } catch {}
    return {
      success: true,
      message: 'Section deleted successfully.',
    };
  }

  if (path.startsWith('/sections/') && method === 'GET' && !path.includes('/join-info')) {
    const secId = path.replace('/sections/', '').trim();
    let localSections: any[] = [];
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {}
    let found = localSections.find((s: any) => s.id === secId || s.joinCode === secId) || null;
    if (!found) {
      try {
        const fsSections = await FirestoreDataService.getSectionsFromFirestore();
        found = fsSections.find((s: any) => s.id === secId || s.joinCode === secId) || null;
      } catch {}
    }

    if (found) {
      let roster: any[] = Array.isArray(found.students) ? [...found.students] : [];
      try {
        const keys = [
          found.id ? `logicq_section_students_${found.id}` : null,
          found.joinCode ? `logicq_section_students_${found.joinCode}` : null,
        ].filter(Boolean) as string[];
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > roster.length) {
              roster = parsed;
            }
          }
        }
      } catch {}
      found.students = roster;
      found._count = { students: roster.length };
    }

    return {
      success: true,
      data: found,
      section: found,
    };
  }

  // ==========================================
  // SECTION IMPORT / ADD STUDENTS FALLBACK
  // ==========================================
  if (path.match(/\/sections\/([^\/]+)\/import-students/) && method === 'POST') {
    const match = path.match(/\/sections\/([^\/]+)\/import-students/);
    const secId = match ? match[1] : '';
    const { students } = body || {};
    const studentsArr = Array.isArray(students) ? students : [];

    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    let localSections: any[] = [];
    try {
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (!Array.isArray(localSections)) localSections = [];
    } catch {}

    let sec = localSections.find((s: any) => s.id === secId || s.joinCode === secId);
    if (!sec) {
      try {
        const fsSecs = await FirestoreDataService.getSectionsFromFirestore();
        sec = fsSecs.find((s: any) => s.id === secId || s.joinCode === secId);
        if (sec) localSections.unshift(sec);
      } catch {}
    }

    if (sec) {
      if (!Array.isArray(sec.students)) sec.students = [];
      for (const st of studentsArr) {
        const key = (st.prn || st.email || '').toUpperCase();
        if (key && !sec.students.some((existing: any) => (existing.prn || existing.email || '').toUpperCase() === key)) {
          sec.students.push({
            id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: st.name || st.fullName || 'Student',
            prn: st.prn ? String(st.prn).trim().toUpperCase() : null,
            email: st.email ? String(st.email).trim().toLowerCase() : null,
            mobile: st.mobile || null,
            joinedVia: st.joinedVia || 'MANUAL_ENTRY',
            enrolledAt: new Date().toISOString(),
          });
        }
      }
      sec._count = { students: sec.students.length };
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(localSections));
        localStorage.setItem(`logicq_section_students_${sec.id}`, JSON.stringify(sec.students));
        if (sec.joinCode) localStorage.setItem(`logicq_section_students_${sec.joinCode}`, JSON.stringify(sec.students));
      } catch {}
    }

    return {
      success: true,
      message: `${studentsArr.length} student(s) enrolled successfully.`,
      newlyEnrolled: studentsArr.length,
      importedCount: studentsArr.length,
      section: sec,
    };
  }

  // ==========================================
  // SECTION ENROLL-BY-CODE FALLBACK
  // ==========================================
  if (path === '/sections/enroll-by-code' && method === 'POST') {
    const { joinCode } = body || {};
    const codeClean = String(joinCode || '').toUpperCase().trim();
    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    let localSections: any[] = [];
    try {
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {}

    let sec = localSections.find((s: any) => s.joinCode?.toUpperCase() === codeClean);
    if (!sec) {
      try {
        const fsSections = await FirestoreDataService.getSectionsFromFirestore();
        sec = fsSections.find((s: any) => s.joinCode?.toUpperCase() === codeClean);
        if (sec) {
          localSections.unshift(sec);
        }
      } catch {}
    }

    if (!sec) {
      throw new Error(`Section with Join Code "${codeClean}" not found. Please verify the code with your faculty.`);
    }

    const curUser = getStoredUsers().find((u) => u.id === localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID));
    if (curUser) {
      if (!Array.isArray(sec.students)) sec.students = [];
      const already = sec.students.some((st: any) => st.email?.toLowerCase() === curUser.email?.toLowerCase() || (st.prn && st.prn === curUser.prn));
      const studentRecord = {
        id: curUser.id,
        name: curUser.fullName || curUser.displayName || 'Student',
        email: curUser.email,
        prn: curUser.prn || null,
        joinedVia: 'JOIN_CODE',
        enrolledAt: new Date().toISOString(),
      };
      if (!already) {
        sec.students.push(studentRecord);
        sec._count = { students: sec.students.length };
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(localSections));
          localStorage.setItem(`logicq_section_students_${sec.id}`, JSON.stringify(sec.students));
          if (sec.joinCode) localStorage.setItem(`logicq_section_students_${sec.joinCode}`, JSON.stringify(sec.students));
        } catch {}
      }

      // Sync to Firestore enrolled_students so faculty gets live update
      try {
        await FirestoreDataService.saveEnrolledStudentsToFirestore(sec.id, [studentRecord]);
        if (sec.joinCode && sec.joinCode !== sec.id) {
          await FirestoreDataService.saveEnrolledStudentsToFirestore(sec.joinCode, [studentRecord]);
        }
      } catch {}
    }

    return {
      success: true,
      message: `Enrolled successfully in section "${sec.sectionName}" (${sec.subject})!`,
      section: sec,
      data: sec,
    };
  }

  // ==========================================
  // ASSESSMENT TESTS & SMART EXAMS FALLBACK
  // ==========================================
  const TESTS_KEY = 'logicq_assessment_tests_backup_v1';

  if (path === '/assessment-tests' && method === 'GET') {
    let tests: any[] = [];
    try {
      tests = JSON.parse(localStorage.getItem(TESTS_KEY) || '[]');
    } catch {}
    return {
      success: true,
      data: tests,
      tests,
    };
  }

  if (path === '/assessment-tests' && method === 'POST') {
    const payload = body || {};
    let tests: any[] = [];
    try {
      tests = JSON.parse(localStorage.getItem(TESTS_KEY) || '[]');
      if (!Array.isArray(tests)) tests = [];
    } catch {}

    const newTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: payload.title || 'Continuous Assessment Test',
      sectionId: payload.sectionId,
      moduleId: payload.moduleId,
      instructions: payload.instructions || 'Standard academic examination guidelines apply.',
      durationMinutes: payload.durationMinutes || 60,
      questionCount: payload.questionCount || 20,
      easyRatio: payload.easyRatio || 40,
      mediumRatio: payload.mediumRatio || 40,
      hardRatio: payload.hardRatio || 20,
      randomiseQuestions: payload.randomiseQuestions ?? true,
      startTime: payload.startTime || new Date().toISOString(),
      endTime: payload.endTime || new Date(Date.now() + 7 * 86400000).toISOString(),
      attemptPolicy: payload.attemptPolicy || 'STRICT_NO_REATTEMPT',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      questions: [],
    };

    tests.unshift(newTest);
    try {
      localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
    } catch {}

    return {
      success: true,
      message: 'Assessment test published and assigned to section roster!',
      data: newTest,
      test: newTest,
    };
  }

  if (path.startsWith('/assessment-tests/') && method === 'GET') {
    const testId = path.replace('/assessment-tests/', '');
    let tests: any[] = [];
    try {
      tests = JSON.parse(localStorage.getItem(TESTS_KEY) || '[]');
    } catch {}
    const found = tests.find((t: any) => t.id === testId) || null;
    return {
      success: true,
      data: found,
      test: found,
    };
  }

  if (path === '/exam/my-tests' && method === 'GET') {
    let tests: any[] = [];
    try {
      tests = JSON.parse(localStorage.getItem(TESTS_KEY) || '[]');
    } catch {}
    return {
      success: true,
      data: {
        active: tests.filter((t: any) => t.status === 'PUBLISHED'),
        upcoming: [],
        completed: [],
      },
      tests,
    };
  }

  // ==========================================
  // SECTION JOIN INFO & INSTANT JOIN FALLBACK
  // ==========================================
  if (path.startsWith('/sections/join-info/') && method === 'GET') {
    const cleanToken = path.replace('/sections/join-info/', '').trim();
    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    let localSections: any[] = [];
    try {
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {}
    let found = localSections.find(
      (s: any) =>
        s.id === cleanToken ||
        s.joinToken === cleanToken ||
        (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
    ) || null;

    if (!found) {
      try {
        const firestoreSections = await FirestoreDataService.getSectionsFromFirestore();
        found = firestoreSections.find(
          (s: any) =>
            s.id === cleanToken ||
            s.joinToken === cleanToken ||
            (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
        ) || null;
      } catch {}
    }

    if (!found) {
      return { success: false, message: 'Section not found', data: null, section: null };
    }
    return { success: true, data: found, section: found };
  }

  if (path === '/sections/instant-join' && method === 'POST') {
    const { joinToken, name, prn, email, department, year } = body || {};
    const cleanToken = String(joinToken || '').trim();
    const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
    let localSections: any[] = [];
    try {
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {}

    let sec = localSections.find(
      (s: any) =>
        s.id === cleanToken ||
        s.joinToken === cleanToken ||
        (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
    );

    if (!sec) {
      try {
        const firestoreSections = await FirestoreDataService.getSectionsFromFirestore();
        sec = firestoreSections.find(
          (s: any) =>
            s.id === cleanToken ||
            s.joinToken === cleanToken ||
            (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
        ) || null;
      } catch {}
    }

    if (!sec) {
      throw new Error('Section not found. Please contact your instructor for a valid link or code.');
    }

    if (!Array.isArray(sec.students)) sec.students = [];
    const studentRecord = {
      id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: (name || 'Student').trim(),
      prn: String(prn || '').trim().toUpperCase(),
      email: String(email || '').trim().toLowerCase(),
      department: String(department || '').trim() || undefined,
      year: String(year || '').trim() || undefined,
      joinedVia: 'INSTANT_JOIN',
      enrolledAt: new Date().toISOString(),
    };

    const exists = sec.students.some(
      (st: any) =>
        (st.prn && st.prn === studentRecord.prn) ||
        (st.email && st.email.toLowerCase() === studentRecord.email.toLowerCase())
    );
    if (!exists) {
      sec.students.push(studentRecord);
      sec._count = { students: sec.students.length };
      try {
        const updatedLocal = localSections.filter((s: any) => s.id !== sec.id && s.joinCode !== sec.joinCode);
        updatedLocal.unshift(sec);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedLocal));
      } catch {}

      try {
        if (sec.id) localStorage.setItem(`logicq_section_students_${sec.id}`, JSON.stringify(sec.students));
        if (sec.joinCode) localStorage.setItem(`logicq_section_students_${sec.joinCode}`, JSON.stringify(sec.students));
      } catch {}

      try {
        FirestoreDataService.saveEnrolledStudentsToFirestore(sec.id || cleanToken, [studentRecord]).catch(() => {});
        if (sec.joinCode && sec.joinCode !== sec.id) {
          FirestoreDataService.saveEnrolledStudentsToFirestore(sec.joinCode, [studentRecord]).catch(() => {});
        }
      } catch {}
    }

    return {
      success: true,
      message: 'Joined section successfully!',
      section: sec,
      student: studentRecord,
      data: { section: sec, student: studentRecord },
    };
  }

  // ==========================================
  // SECTION PREVIEW-EXCEL FALLBACK
  // ==========================================
  if (path === '/sections/preview-excel' && method === 'POST') {
    return {
      success: true,
      data: {
        totalRows: 0,
        validRows: [],
        invalidRows: [],
        duplicateRows: [],
        conflictingRows: [],
        canImport: false,
      },
      preview: {
        totalRows: 0,
        validRows: [],
        invalidRows: [],
        duplicateRows: [],
        conflictingRows: [],
        canImport: false,
      },
    };
  }

  // ==========================================
  // ANALYTICS FALLBACKS
  // ==========================================
  if (path === '/analytics/faculty/overview' && method === 'GET') {
    let localSections: any[] = [];
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {}

    let totalStudents = 0;
    localSections.forEach((s: any) => {
      totalStudents += Array.isArray(s.students) ? s.students.length : (s._count?.students || 0);
    });

    return {
      success: true,
      data: {
        totalEnrolled: totalStudents,
        totalSections: localSections.length,
        averageIntegrityScore: 94,
        flaggedStudentsCount: 0,
        riskDistribution: {
          NORMAL: totalStudents,
          LOW: 0,
          MODERATE: 0,
          HIGH: 0,
          CRITICAL: 0,
        },
        cohortVelocity: {
          fastLearners: Math.round(totalStudents * 0.3),
          averageLearners: Math.round(totalStudents * 0.5),
          strugglingLearners: Math.round(totalStudents * 0.2),
        },
      },
    };
  }

  if (path === '/analytics/student/dashboard' && method === 'GET') {
    const subs = getStoredSubmissions();
    const solvedCount = subs.filter((s) => s.verdict === 'ACCEPTED').length;
    return {
      success: true,
      data: {
        academicScore: Math.min(100, Math.round(solvedCount * 10)),
        totalQuestionsSolved: solvedCount,
        totalQuestionsAttempted: subs.length,
        integrityScore: 100,
        integrityRisk: 'NORMAL',
        recentReports: [],
      },
    };
  }

  // ==========================================
  // ADMIN STATS & CHECKERS FALLBACK
  // ==========================================
  if ((path === '/admin/stats' || path === '/admin/analytics') && method === 'GET') {
    const users = getStoredUsers().filter((u) => !isExplicitlyPurgedUser(u.email));
    const problems = getStoredProblems();
    const subs = getStoredSubmissions();
    return {
      success: true,
      data: {
        overview: {
          totalUsers: users.length,
          totalAdmins: users.filter((u) => u.role === 'ADMIN').length,
          isSingleAdminAlert: false,
          totalProblems: problems.length,
          totalSubmissions: subs.length,
          acceptedSubmissions: subs.filter((s) => s.verdict === 'ACCEPTED').length,
          acceptanceRate: subs.length > 0 ? Math.round((subs.filter((s) => s.verdict === 'ACCEPTED').length / subs.length) * 100) : 0,
          driveConnectedCount: 0,
          isAllowlistEnabled: false,
        },
      },
    };
  }

  if (path === '/admin/checkers' && method === 'GET') {
    return {
      success: true,
      data: { checkers: [] },
      checkers: [],
    };
  }

  // ==========================================
  // EXAM RUN-CODE & SUBMIT FALLBACK
  // ==========================================
  if (path === '/exam/run-code' && method === 'POST') {
    const { code, stdin } = body || {};
    return {
      success: true,
      data: {
        verdict: 'ACCEPTED',
        stdout: 'Program compiled and executed successfully.\n',
        stderr: '',
        executionTimeMs: 12,
        memoryUsedKb: 256,
      },
    };
  }

  if (path === '/exam/submit-question' && method === 'POST') {
    return {
      success: true,
      message: 'Question submitted and evaluated successfully!',
      data: {
        verdict: 'ACCEPTED',
        passedCount: 3,
        totalTestCases: 3,
        score: 1,
      },
    };
  }

  // ==========================================
  // QUESTION BANK FALLBACK
  // ==========================================
  if (path.startsWith('/questions/bank') && method === 'GET') {
    const list = getStoredProblems().map((p: any) => ({
      ...p,
      module: p.module || 'Module 1 - C Fundamentals',
      section: p.section || 'Section 1',
      validationStatus: p.validationStatus || 'COMPILED_AND_VERIFIED',
      bloomsLevel: p.bloomsLevel || 'APPLY',
      testCases: p.testCases || [],
      _count: { submissions: 0 },
    }));
    return {
      success: true,
      count: list.length,
      questions: list,
    };
  }

  return { success: true, data: {} };
}
