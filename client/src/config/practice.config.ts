export interface PracticeModuleConfig {
  id: string;
  slug: string;
  title: string;
  order: number;
  description: string;
  requiredSolvedToUnlock: number;
  totalQuestions: number;
  requiresAdminUnlock?: boolean;
  distribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export const PRACTICE_CONFIG = {
  practiceUnlockThreshold: 20,
  DEFAULT_UNLOCK_THRESHOLD: 20,
  practiceHintUnlockAssist: false, // default OFF
  hintUnlockAssistAttemptThreshold: 6, // default 6 failed attempts
  allowSkipOneQuestionAfterDays: false, // default OFF
  skipQuestionAfterDaysThreshold: 3, // default 3 days
  MODULES: [
    {
      id: 'module-1',
      slug: 'control-structures',
      title: 'Control Structures',
      order: 1,
      description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
      requiredSolvedToUnlock: 0,
      totalQuestions: 20,
      distribution: { EASY: 8, MEDIUM: 8, HARD: 4 },
    },
    {
      id: 'module-2',
      slug: 'pointers-and-functions',
      title: 'Pointers and Functions',
      order: 2,
      description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
      requiredSolvedToUnlock: 20,
      totalQuestions: 20,
      distribution: { EASY: 8, MEDIUM: 8, HARD: 4 },
    },
    {
      id: 'module-3',
      slug: 'array-and-its-applications',
      title: 'Array and its Applications',
      order: 3,
      description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
      requiredSolvedToUnlock: 20,
      totalQuestions: 20,
      distribution: { EASY: 8, MEDIUM: 8, HARD: 4 },
    },
    {
      id: 'module-4',
      slug: 'advanced-data-types-dynamic-memory',
      title: 'Advanced Data Types, Dynamic Memory',
      order: 4,
      description: 'Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked structures.',
      requiredSolvedToUnlock: 20,
      totalQuestions: 20,
      distribution: { EASY: 8, MEDIUM: 8, HARD: 4 },
    },
    {
      id: 'module-5',
      slug: 'advanced-competitive-c',
      title: 'Competitive Mastery & Capstone Arena',
      order: 5,
      description: 'Bitwise algorithms, performance optimization, system-level C, and instructor capstone challenges.',
      requiredSolvedToUnlock: 20,
      totalQuestions: 20,
      requiresAdminUnlock: true,
      distribution: { EASY: 4, MEDIUM: 10, HARD: 6 },
    },
  ] as PracticeModuleConfig[],
};

export function isModule5UnlockedByAdmin(): boolean {
  try {
    return localStorage.getItem('logicq_module5_unlocked') === 'true';
  } catch {
    return false;
  }
}

export function setModule5UnlockedByAdmin(unlocked: boolean): void {
  try {
    localStorage.setItem('logicq_module5_unlocked', unlocked ? 'true' : 'false');
  } catch {}
}

export function getModuleRequirementText(
  prevModuleTitle: string,
  threshold: number = PRACTICE_CONFIG.practiceUnlockThreshold,
  prevSolved: number = 0,
  prevTotal: number = 20
): string {
  const solvePrefix = threshold >= prevTotal ? `Solve all ${threshold}` : `Solve ${threshold} of ${prevTotal}`;
  return `${solvePrefix} in ${prevModuleTitle} to unlock (${prevSolved} of ${prevTotal} solved)`;
}
