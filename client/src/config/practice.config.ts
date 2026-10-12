export interface PracticeModuleConfig {
  id: string;
  slug: string;
  title: string;
  order: number;
  description: string;
  requiredSolvedToUnlock: number;
  totalQuestions: number;
  distribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export const PRACTICE_CONFIG = {
  DEFAULT_UNLOCK_THRESHOLD: 7,
  MODULES: [
    {
      id: 'module-1',
      slug: 'control-structures',
      title: 'Control Structures',
      order: 1,
      description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
      requiredSolvedToUnlock: 0,
      totalQuestions: 10,
      distribution: { EASY: 4, MEDIUM: 4, HARD: 2 },
    },
    {
      id: 'module-2',
      slug: 'pointers-and-functions',
      title: 'Pointers and functions',
      order: 2,
      description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
      requiredSolvedToUnlock: 7,
      totalQuestions: 10,
      distribution: { EASY: 4, MEDIUM: 4, HARD: 2 },
    },
    {
      id: 'module-3',
      slug: 'array-and-its-applications',
      title: 'Array and its Applications',
      order: 3,
      description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
      requiredSolvedToUnlock: 7,
      totalQuestions: 10,
      distribution: { EASY: 4, MEDIUM: 4, HARD: 2 },
    },
    {
      id: 'module-4',
      slug: 'advanced-data-types-dynamic-memory',
      title: 'Advanced Data Types, Dynamic Memory',
      order: 4,
      description: 'Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked structures.',
      requiredSolvedToUnlock: 7,
      totalQuestions: 10,
      distribution: { EASY: 4, MEDIUM: 4, HARD: 2 },
    },
  ] as PracticeModuleConfig[],
};
