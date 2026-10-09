export enum Verdict {
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILE_ERROR = 'COMPILE_ERROR',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  PENDING = 'PENDING',
  JUDGING = 'JUDGING',
}

export interface ExecutionResult {
  verdict: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
}

export interface IJudge {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitMb: number
  ): Promise<ExecutionResult>;
}
