export type Role = 'STUDENT' | 'ADMIN';

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
  fullName: string;
  role: Role;
  college?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastSolvedDate?: string | null;
  createdAt?: string;
  userBadges?: Array<{ badge: Badge; unlockedAt: string }>;
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

export interface Contest {
  id: string;
  slug: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'UPCOMING' | 'ONGOING' | 'ENDED';
  participantCount?: number;
  problemCount?: number;
  isUserRegistered?: boolean;
  problems?: Array<Problem & { points: number; orderIndex: number }>;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  category: string;
  requirementCount: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
}
