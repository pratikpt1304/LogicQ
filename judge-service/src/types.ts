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
}

export interface CompilationResponse {
  success: boolean;
  compilationId?: string;
  verdict?: Verdict.COMPILE_ERROR;
  compileOutput?: string;
  diagnostics?: CompilerDiagnostic[];
  primaryHint?: string;
}

export interface ExecutionResponse {
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
}

export interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface BatchEvaluatePayload {
  code: string;
  testCases: TestCasePayload[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface TestCaseExecutionResult {
  testCaseId: string;
  verdict: Verdict;
  runtimeMs: number;
  stdout?: string;
  stderr?: string;
  orderIndex: number;
}

export interface BatchEvaluateResponse {
  overallVerdict: Verdict;
  maxRuntimeMs: number;
  compileOutput: string;
  diagnostics?: CompilerDiagnostic[];
  testResults: TestCaseExecutionResult[];
}
