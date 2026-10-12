export type Role = 'STUDENT' | 'ADMIN' | 'CHECKER';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type Verdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'PENDING'
  | 'JUDGING';

export interface User {
  id: string;
  username: string;
  email: string;
  prn?: string | null;
  maskedPrn?: string | null;
  ownIdentityLabel?: string | null;
  displayName?: string | null;
  publicDisplayName?: string | null;
  shortId?: string | null;
  fullName: string;
  role: Role;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  division?: string | null;
  profileComplete?: boolean;
  bio?: string | null;
  avatarUrl?: string | null;
  totalPoints: number;
  currentStreak: number;
  longestStreak?: number;
  lastSolvedDate?: string | null;
  prnChangedAt?: string | null;
  prnNextAllowedDate?: string | null;
  isPrnChangeEligible?: boolean;
  createdAt?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderIndex: number;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  description: string;
  starterCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  isDaily: boolean;
  scheduledDate?: string | null;
  status: string;
  testCases?: TestCase[];
  isSolved?: boolean;
  totalSubmissions?: number;
}

export interface SubmissionTestCaseResult {
  id: string;
  testCaseId: string;
  verdict: Verdict;
  runtimeMs?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  orderIndex: number;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  contestId?: string | null;
  code: string;
  language: string;
  verdict: Verdict;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  compileOutput?: string | null;
  pointsAwarded: number;
  createdAt: string;
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: Difficulty;
  };
  user?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  testCaseResults?: SubmissionTestCaseResult[];
}
