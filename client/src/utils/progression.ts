import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { PRACTICE_MODULE_5_PROBLEMS } from '../data/practice-module5.data.js';
import { isModule5UnlockedByAdmin } from '../config/practice.config.js';

export const LAB_MODULE_SLUGS: Record<number, string[]> = {
  1: PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug),
  2: PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug),
  3: PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug),
  4: PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug),
  5: PRACTICE_MODULE_5_PROBLEMS.map((p) => p.slug),
};

export function getPracticeModuleSolvedCount(moduleIndex: number, solvedTopicIds: string[]): number {
  return TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === moduleIndex && solvedTopicIds.includes(t.id)).length;
}

export function isPracticeModuleComplete(moduleIndex: number, solvedTopicIds: string[]): boolean {
  return getPracticeModuleSolvedCount(moduleIndex, solvedTopicIds) >= 25;
}

export function getLabModuleSolvedCount(moduleOrder: number, solvedTopicIds: string[]): number {
  const slugs = LAB_MODULE_SLUGS[moduleOrder] || [];
  return slugs.filter((slug) => solvedTopicIds.includes(slug)).length;
}

export function isLabModuleComplete(moduleOrder: number, solvedTopicIds: string[]): boolean {
  const count = getLabModuleSolvedCount(moduleOrder, solvedTopicIds);
  const total = LAB_MODULE_SLUGS[moduleOrder]?.length || 20;
  if (count >= 20 || count >= total) return true;

  if (typeof localStorage !== 'undefined') {
    const reportKeyMap: Record<number, string> = {
      1: 'logicq_practice_report_control-structures',
      2: 'logicq_practice_report_pointers-and-functions',
      3: 'logicq_practice_report_arrays-and-strings',
      4: 'logicq_practice_report_recursion-and-bit-manipulation',
      5: 'logicq_practice_report_structures-unions-and-dma',
    };
    const key = reportKeyMap[moduleOrder];
    if (key && localStorage.getItem(key)) return true;
  }
  return false;
}

/**
 * PRACTICE UNLOCK RULES:
 * - Module 1: Always unlocked
 * - Module 2: Unlocks when Practice Module 1 is complete (25/25)
 * - Module 3: Unlocks when Practice Module 2 is complete (25/25)
 * - Module 4: Unlocks when Practice Module 3 is complete (25/25)
 */
export function getPracticeModuleUnlockInfo(
  moduleIndex: number,
  solvedTopicIds: string[],
  isPrivileged: boolean = false
): { isUnlocked: boolean; lockReason: string } {
  if (isPrivileged) return { isUnlocked: true, lockReason: '' };
  if (moduleIndex === 1) return { isUnlocked: true, lockReason: '' };

  if (moduleIndex === 2) {
    if (!isPracticeModuleComplete(1, solvedTopicIds)) {
      const solved = getPracticeModuleSolvedCount(1, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 25 practice questions in Module 1 (${solved}/25 solved) to unlock Module 2 Practice.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleIndex === 3) {
    if (!isPracticeModuleComplete(1, solvedTopicIds)) {
      return {
        isUnlocked: false,
        lockReason: `Complete all 25 practice questions in Module 1 first.`,
      };
    }
    if (!isPracticeModuleComplete(2, solvedTopicIds)) {
      const solved = getPracticeModuleSolvedCount(2, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 25 practice questions in Module 2 (${solved}/25 solved) to unlock Module 3 Practice.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleIndex === 4) {
    if (!isPracticeModuleComplete(2, solvedTopicIds)) {
      return {
        isUnlocked: false,
        lockReason: `Complete all 25 practice questions in Module 2 first.`,
      };
    }
    if (!isPracticeModuleComplete(3, solvedTopicIds)) {
      const solved = getPracticeModuleSolvedCount(3, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 25 practice questions in Module 3 (${solved}/25 solved) to unlock Module 4 Practice.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  return { isUnlocked: true, lockReason: '' };
}

/**
 * LAB INTERNAL UNLOCK RULES:
 * - Module 1: Unlocked when Practice Module 1 is complete (opens parallel with Practice Module 2!)
 * - Module 2: Unlocks when Lab Module 1 is complete AND Practice Module 2 is complete!
 * - Module 3: Unlocks when Lab Module 2 is complete AND Practice Module 3 is complete!
 * - Module 4: Unlocks when Lab Module 3 is complete AND Practice Module 4 is complete!
 * - Module 5: Unlocked by Faculty/Admin for supervised lab evaluation session (or Lab 4 complete).
 */
export function getLabModuleUnlockInfo(
  moduleOrder: number,
  solvedTopicIds: string[],
  isPrivileged: boolean = false
): { isUnlocked: boolean; lockReason: string } {
  if (isPrivileged) return { isUnlocked: true, lockReason: '' };

  if (moduleOrder === 1) {
    if (!isPracticeModuleComplete(1, solvedTopicIds)) {
      const solved = getPracticeModuleSolvedCount(1, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Solve all 25 practice questions in Module 1 (${solved}/25 solved) on the Practice tab to unlock Lab Internal Module 1.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleOrder === 2) {
    if (!isPracticeModuleComplete(1, solvedTopicIds)) {
      return {
        isUnlocked: false,
        lockReason: `Complete Module 1 Practice and Lab Internal Module 1 first.`,
      };
    }
    if (!isLabModuleComplete(1, solvedTopicIds)) {
      const lab1Solved = getLabModuleSolvedCount(1, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 20 questions in Lab Internal Module 1 (${lab1Solved}/20 solved) to unlock Lab Internal Module 2.`,
      };
    }
    if (!isPracticeModuleComplete(2, solvedTopicIds)) {
      const p2Solved = getPracticeModuleSolvedCount(2, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Solve all 25 practice questions in Module 2 (${p2Solved}/25 solved) on the Practice tab to unlock Lab Internal Module 2.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleOrder === 3) {
    if (!isLabModuleComplete(2, solvedTopicIds)) {
      const lab2Solved = getLabModuleSolvedCount(2, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 20 questions in Lab Internal Module 2 (${lab2Solved}/20 solved) to unlock Lab Internal Module 3.`,
      };
    }
    if (!isPracticeModuleComplete(3, solvedTopicIds)) {
      const p3Solved = getPracticeModuleSolvedCount(3, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Solve all 25 practice questions in Module 3 (${p3Solved}/25 solved) on the Practice tab to unlock Lab Internal Module 3.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleOrder === 4) {
    if (!isLabModuleComplete(3, solvedTopicIds)) {
      const lab3Solved = getLabModuleSolvedCount(3, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 20 questions in Lab Internal Module 3 (${lab3Solved}/20 solved) to unlock Lab Internal Module 4.`,
      };
    }
    if (!isPracticeModuleComplete(4, solvedTopicIds)) {
      const p4Solved = getPracticeModuleSolvedCount(4, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Solve all 25 practice questions in Module 4 (${p4Solved}/25 solved) on the Practice tab to unlock Lab Internal Module 4.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleOrder === 5) {
    const isM5Admin = isModule5UnlockedByAdmin();
    if (!isM5Admin) {
      return {
        isUnlocked: false,
        lockReason: `Locked by Faculty / Instructor. Will be unlocked during your faculty-supervised lab evaluation session.`,
      };
    }
    if (!isLabModuleComplete(4, solvedTopicIds)) {
      return {
        isUnlocked: false,
        lockReason: `Complete Lab Internal Module 4 before opening Module 5.`,
      };
    }
    return { isUnlocked: true, lockReason: '' };
  }

  return { isUnlocked: true, lockReason: '' };
}
