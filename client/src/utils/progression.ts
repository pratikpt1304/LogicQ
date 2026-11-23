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
  return count >= 20 || count >= total;
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
    // Module 1 is always unlocked from Day 1 for all students
    return { isUnlocked: true, lockReason: '' };
  }

  if (moduleOrder === 2) {
    if (!isLabModuleComplete(1, solvedTopicIds)) {
      const lab1Solved = getLabModuleSolvedCount(1, solvedTopicIds);
      return {
        isUnlocked: false,
        lockReason: `Complete all 20 questions in Lab Internal Module 1 (${lab1Solved}/20 solved) to unlock Lab Internal Module 2.`,
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

/**
 * Authoritative single source of truth for distinguishing:
 * 1. OFFICIAL LAB INTERNAL ASSESSMENTS (Exams / Tests created by faculty with testId, timed proctoring, CIE grading)
 * 2. PRACTICE SOLUTIONS (Continuous Lab practicals, 100 topic practice problems, Module 1-4 coursework)
 */
export function isOfficialAssessmentTest(sub: any): boolean {
  if (!sub) return false;

  // 1. Explicit Assessment Test Identifiers from faculty or test runner
  const testId = String(sub.testId || sub.assessmentId || sub.examId || sub.testDocId || '').trim();
  if (testId.length > 0 && testId !== 'undefined' && testId !== 'null') {
    return true;
  }

  const subId = String(sub.id || '').trim();
  if (/^(test_|assess_|exam_|live_test_)/i.test(subId)) {
    return true;
  }

  // 2. Explicit assessment submission types (EXAM / ASSESSMENT / OFFICIAL_TEST)
  const subType = String(sub.submissionType || sub.type || '').toUpperCase();
  const contextType = String(sub.contextType || '').toUpperCase();
  const probId = String(sub.testId || sub.problemId || sub.problemSlug || '').trim();
  if (
    subType === 'ASSESSMENT' ||
    subType === 'TEST' ||
    subType === 'EXAM' ||
    subType === 'LAB_INTERNAL_TEST' ||
    subType === 'CONTINUOUS_LAB' ||
    subType === 'LAB_INTERNAL' ||
    probId.startsWith('practice-c') ||
    contextType === 'EXAM'
  ) {
    return true;
  }

  // 3. Official Test Title from faculty / exam orchestrator (NOT generic continuous practical lab)
  const testTitle = String(sub.testTitle || '').toLowerCase().trim();
  if (
    testTitle.length > 0 &&
    testTitle !== 'continuous practical lab' &&
    testTitle !== 'practice' &&
    testTitle !== 'daily challenge' &&
    (testTitle.includes('internal assessment') ||
      testTitle.includes('assessment 1') ||
      testTitle.includes('assessment 2') ||
      testTitle.includes('lab internal test') ||
      testTitle.includes('cie') ||
      testTitle.includes('midterm') ||
      testTitle.includes('final lab exam') ||
      testTitle.includes('semester internal'))
  ) {
    return true;
  }

  // 4. Specifically proctored lab internal exam attempt on assessment questions
  // (e.g. 55-minute test session with fullscreen exits on Largest of Three Numbers)
  const probTitle = String(sub.problemTitle || sub.title || '').toLowerCase().trim();
  const timeTaken = Number(sub.timeTakenSeconds || sub.timeToSolveSeconds || 0);
  const exits = Number(sub.fullscreenExits || sub.fullScreenExitCount || 0);
  const incidents = Array.isArray(sub.incidents) ? sub.incidents.length : 0;

  if (
    (testTitle.includes('internal') || probTitle.includes('largest of three numbers')) &&
    !probTitle.startsWith('practice') &&
    (timeTaken >= 300 || exits > 0 || incidents > 0)
  ) {
    return true;
  }

  // Everything else:
  // - Bubble Sort & Adjacent Pairwise Ordering
  // - Matrix Multiplication
  // - Module 1..4 curriculum topics
  // - Continuous practical lab exercises
  // are all PRACTICE SOLUTIONS!
  return false;
}

