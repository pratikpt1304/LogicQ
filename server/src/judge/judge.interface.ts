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

export interface CompilerDiagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'note';
  category: 'SYNTAX' | 'TYPE_MISMATCH' | 'POINTER_MEMORY' | 'FUNCTIONS_LINKER' | 'STANDARDS_SECURITY';
  ruleId: string;
  flag?: string;
  rawMessage: string;
  title: string;
  explanation: string;
  actionableHint: string;
  codeSnippet?: string;
  example?: {
    problematic: string;
    fixed: string;
    note?: string;
  };
}

export interface VisibleDiffView {
  isExactMatch: boolean;
  hasWhitespaceDifference: boolean;
  expected: string;
  actual: string;
  diffLines: Array<{
    type: 'EQUAL' | 'INSERT' | 'DELETE' | 'REPLACE';
    expectedLineNumber?: number;
    actualLineNumber?: number;
    expectedContent?: string;
    actualContent?: string;
  }>;
  remediationTip?: string;
}

export interface CompilationSuccess {
  success: true;
  binaryPath: string;
  cleanup: () => Promise<void>;
  compileOutput?: string;
  diagnostics?: CompilerDiagnostic[];
}

export interface CompilationFailure {
  success: false;
  verdict: Verdict.COMPILE_ERROR;
  compileOutput: string;
  diagnostics: CompilerDiagnostic[];
  primaryHint?: string;
}

export type CompilationResult = CompilationSuccess | CompilationFailure;

export interface ExecutionResult {
  verdict: Verdict;
  runtimeMs: number;
  userTimeMs?: number;
  kernelTimeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  exitCode?: number;
  signal?: string;
  signalDescription?: string;
  diagnostics?: CompilerDiagnostic[];
  diff?: VisibleDiffView;
}

export interface IJudge {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  compile?(code: string, options?: { timeLimitMs?: number }): Promise<CompilationResult>;
  execute?(binaryPath: string, stdin: string, timeLimitMs: number, memoryLimitMb: number): Promise<ExecutionResult>;
  compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs?: number,
    memoryLimitMb?: number
  ): Promise<ExecutionResult>;
}

export interface ITwoPhaseJudge extends IJudge {
  compile(code: string, options?: { timeLimitMs?: number }): Promise<CompilationResult>;
  execute(binaryPath: string, stdin: string, timeLimitMs: number, memoryLimitMb: number): Promise<ExecutionResult>;
}
