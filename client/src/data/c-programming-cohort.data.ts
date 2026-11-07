/**
 * C Programming Cohort - Official Onboarded Students Roster
 * (All student rosters cleared per administrator wipe instruction)
 */

export interface EnrolledCohortStudent {
  index: number;
  prn: string;
  fullName: string;
  department: string;
  year: string;
  college: string;
  sectionId: string;
  sectionName: string;
  joinCode: string;
  email: string;
  role: 'STUDENT';
  profileComplete: boolean;
  password?: string;
  totalPoints?: number;
  totalSolved?: number;
  currentStreak?: number;
  labCompletedModules?: number;
  labInternalScore?: number;
  cieScore?: number;
  tabSwitchCount?: number;
}

export const C_PROGRAMMING_COHORT_STUDENTS: EnrolledCohortStudent[] = [];

export const DEMO_SECTION_COHORT_STUDENTS: EnrolledCohortStudent[] = [];

export const ALL_COHORT_STUDENTS: EnrolledCohortStudent[] = [];

/**
 * Fast lookup map by PRN (case-insensitive)
 */
export const COHORT_STUDENT_BY_PRN = new Map<string, EnrolledCohortStudent>();

export const COHORT_STUDENT_BY_EMAIL = new Map<string, EnrolledCohortStudent>();

/**
 * Helper to find cohort student by PRN or email
 */
export function findCohortStudent(identifier: string): EnrolledCohortStudent | null {
  if (!identifier) return null;
  return null;
}
