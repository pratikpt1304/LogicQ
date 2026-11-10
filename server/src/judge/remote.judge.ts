import {
  IJudge,
  ITwoPhaseJudge,
  CompilationResult,
  ExecutionResult,
  Verdict,
} from './judge.interface.js';
import { ENV } from '../config/env.js';

export class RemoteJudge implements ITwoPhaseJudge, IJudge {
  readonly name = 'RemoteJudge';
  private baseUrl: string;
  private secret: string;

  constructor(baseUrl?: string, secret?: string) {
    this.baseUrl = (baseUrl || ENV.JUDGE_SERVICE_URL || 'http://localhost:5050').replace(/\/+$/, '');
    this.secret = secret || ENV.JUDGE_SERVICE_SECRET || '';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.secret) {
      headers['x-judge-secret'] = this.secret;
    }
    return headers;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) return false;

      const data = (await res.json()) as { status?: string; gcc?: { available?: boolean } };
      return data.status === 'ok' && data.gcc?.available === true;
    } catch {
      return false;
    }
  }

  async compile(code: string, options?: { timeLimitMs?: number }): Promise<CompilationResult> {
    try {
      const res = await fetch(`${this.baseUrl}/compile`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          code,
          timeLimitMs: options?.timeLimitMs || 10000,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string };
        return {
          success: false,
          verdict: Verdict.COMPILE_ERROR,
          compileOutput: `Judge service returned HTTP ${res.status}: ${errorData.error || 'Unknown error'}`,
          diagnostics: [],
        };
      }

      const data = (await res.json()) as {
        success: boolean;
        compilationId?: string;
        compileOutput?: string;
        diagnostics?: any[];
        primaryHint?: string;
      };

      if (!data.success || !data.compilationId) {
        return {
          success: false,
          verdict: Verdict.COMPILE_ERROR,
          compileOutput: data.compileOutput || 'Compilation failed.',
          diagnostics: data.diagnostics || [],
          primaryHint: data.primaryHint,
        };
      }

      const compilationId = data.compilationId;

      return {
        success: true,
        binaryPath: compilationId,
        compileOutput: data.compileOutput || '',
        diagnostics: data.diagnostics || [],
        cleanup: async () => {
          try {
            await fetch(`${this.baseUrl}/cleanup`, {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify({ compilationId }),
            });
          } catch {}
        },
      };
    } catch (err: any) {
      return {
        success: false,
        verdict: Verdict.COMPILE_ERROR,
        compileOutput: `Failed to contact judge service: ${err.message}`,
        diagnostics: [],
      };
    }
  }

  async execute(
    binaryPath: string,
    stdin: string,
    timeLimitMs: number = 2000,
    memoryLimitMb: number = 256
  ): Promise<ExecutionResult> {
    try {
      const res = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          compilationId: binaryPath,
          stdin,
          timeLimitMs,
          memoryLimitMb,
        }),
      });

      if (!res.ok) {
        return {
          verdict: Verdict.RUNTIME_ERROR,
          runtimeMs: 0,
          stderr: `Judge service execute failed: HTTP ${res.status}`,
        };
      }

      return (await res.json()) as ExecutionResult;
    } catch (err: any) {
      return {
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: 0,
        stderr: `Failed to execute binary on remote judge: ${err.message}`,
      };
    }
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 2000,
    memoryLimitMb: number = 256
  ): Promise<ExecutionResult> {
    try {
      const res = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          code,
          stdin,
          timeLimitMs,
          memoryLimitMb,
        }),
      });

      if (!res.ok) {
        return {
          verdict: Verdict.RUNTIME_ERROR,
          runtimeMs: 0,
          stderr: `Judge service run failed: HTTP ${res.status}`,
        };
      }

      return (await res.json()) as ExecutionResult;
    } catch (err: any) {
      return {
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: 0,
        stderr: `Failed to contact remote judge: ${err.message}`,
      };
    }
  }
}
