import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  Verdict,
  CompilationResponse,
  ExecutionResponse,
  BatchEvaluatePayload,
  BatchEvaluateResponse,
  TestCaseExecutionResult,
} from './types.js';

function getJudgeRoot(): string {
  const root = process.env.JUDGE_TMP_ROOT || path.join(os.tmpdir(), 'logicq-judge');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true, mode: 0o711 });
  }
  return root;
}

function sanitizeCompilerOutput(output: string, workingDir: string): string {
  if (!output) return '';
  return output
    .split(workingDir).join('.')
    .replace(/[A-Za-z]:\\[^:\n\r]+[\\/]/g, '')
    .replace(/\/tmp\/[^:\n\r]+[\\/]/g, '')
    .replace(/\/judge-tmp\/[^:\n\r]+[\\/]/g, '');
}

export class IsolatedGccRunner {
  private activeCompilations = new Map<string, string>(); // compilationId -> folderPath

  async checkGcc(): Promise<{ available: boolean; version?: string }> {
    return new Promise((resolve) => {
      const gcc = spawn('gcc', ['--version'], { timeout: 3000 });
      let out = '';
      gcc.stdout.on('data', (d) => (out += d.toString()));
      gcc.on('close', (code) => {
        if (code === 0) {
          const firstLine = out.split('\n')[0] || 'gcc';
          resolve({ available: true, version: firstLine.trim() });
        } else {
          resolve({ available: false });
        }
      });
      gcc.on('error', () => resolve({ available: false }));
    });
  }

  async compile(code: string, timeLimitMs: number = 10000): Promise<CompilationResponse> {
    const compilationId = uuidv4();
    const workDir = path.join(getJudgeRoot(), `job_${compilationId}`);
    fs.mkdirSync(workDir, { recursive: true, mode: 0o700 });

    const sourcePath = path.join(workDir, 'solution.c');
    const binaryExt = process.platform === 'win32' ? '.exe' : '';
    const binaryPath = path.join(workDir, `prog${binaryExt}`);

    fs.writeFileSync(sourcePath, code, { encoding: 'utf8', mode: 0o600 });

    return new Promise((resolve) => {
      const args = [
        '-std=c11',
        '-O2',
        '-Wall',
        '-Wextra',
        '-Werror=implicit-function-declaration',
        '-o',
        binaryPath,
        sourcePath,
        '-lm',
      ];

      const compileProc = spawn('gcc', args, {
        cwd: workDir,
        env: { PATH: process.env.PATH || '' },
        timeout: timeLimitMs,
      });

      let stderr = '';
      let stdout = '';

      compileProc.stdout.on('data', (d) => (stdout += d.toString()));
      compileProc.stderr.on('data', (d) => (stderr += d.toString()));

      compileProc.on('close', (code) => {
        const rawOutput = (stderr + stdout).trim();
        const compileOutput = sanitizeCompilerOutput(rawOutput, workDir);

        if (code === 0 && fs.existsSync(binaryPath)) {
          this.activeCompilations.set(compilationId, workDir);
          resolve({
            success: true,
            compilationId,
            compileOutput,
          });
        } else {
          // Cleanup failed compile dir
          try {
            fs.rmSync(workDir, { recursive: true, force: true });
          } catch {}
          resolve({
            success: false,
            verdict: Verdict.COMPILE_ERROR,
            compileOutput: compileOutput || 'Compilation failed with non-zero exit code.',
          });
        }
      });

      compileProc.on('error', (err) => {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch {}
        resolve({
          success: false,
          verdict: Verdict.COMPILE_ERROR,
          compileOutput: `Failed to invoke compiler: ${err.message}`,
        });
      });
    });
  }

  async execute(
    compilationId: string,
    stdin: string,
    timeLimitMs: number = 2000,
    _memoryLimitMb: number = 256
  ): Promise<ExecutionResponse> {
    const workDir = this.activeCompilations.get(compilationId);
    if (!workDir || !fs.existsSync(workDir)) {
      return {
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: 0,
        stderr: 'Compilation session expired or not found.',
      };
    }

    const binaryExt = process.platform === 'win32' ? '.exe' : '';
    const binaryPath = path.join(workDir, `prog${binaryExt}`);

    if (!fs.existsSync(binaryPath)) {
      return {
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: 0,
        stderr: 'Compiled binary not found in session folder.',
      };
    }

    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      let stdout = '';
      let stderr = '';
      let isKilled = false;

      // Unprivileged spawn with empty env and strictly isolated cwd
      const proc = spawn(binaryPath, [], {
        cwd: workDir,
        env: {},
        timeout: timeLimitMs + 500,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        isKilled = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, timeLimitMs);

      const MAX_OUTPUT = 512 * 1024; // 512 KB limit

      proc.stdout.on('data', (d) => {
        if (stdout.length < MAX_OUTPUT) stdout += d.toString();
        else if (!isKilled) {
          isKilled = true;
          try {
            proc.kill('SIGKILL');
          } catch {}
        }
      });

      proc.stderr.on('data', (d) => {
        if (stderr.length < MAX_OUTPUT) stderr += d.toString();
      });

      proc.on('close', (code, signal) => {
        clearTimeout(timer);
        const endTime = process.hrtime.bigint();
        const runtimeMs = Math.round(Number(endTime - startTime) / 1_000_000);

        if (isKilled || signal === 'SIGKILL' || runtimeMs > timeLimitMs) {
          return resolve({
            verdict: Verdict.TIME_LIMIT_EXCEEDED,
            runtimeMs,
            stdout,
            stderr: 'Time limit exceeded.',
            signal: signal || 'SIGKILL',
          });
        }

        if (code !== 0 && code !== null) {
          return resolve({
            verdict: Verdict.RUNTIME_ERROR,
            runtimeMs,
            stdout,
            stderr: stderr.slice(0, 4096) || `Process exited with code ${code}`,
            exitCode: code,
          });
        }

        resolve({
          verdict: Verdict.ACCEPTED,
          runtimeMs,
          stdout,
          stderr: stderr.slice(0, 4096),
          exitCode: 0,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        const endTime = process.hrtime.bigint();
        const runtimeMs = Math.round(Number(endTime - startTime) / 1_000_000);

        resolve({
          verdict: Verdict.RUNTIME_ERROR,
          runtimeMs,
          stderr: `Execution error: ${err.message}`,
        });
      });

      if (stdin) {
        try {
          proc.stdin.write(stdin);
          proc.stdin.end();
        } catch {}
      } else {
        proc.stdin.end();
      }
    });
  }

  async cleanup(compilationId: string): Promise<void> {
    const workDir = this.activeCompilations.get(compilationId);
    if (workDir) {
      this.activeCompilations.delete(compilationId);
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {}
    }
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 2000,
    memoryLimitMb: number = 256
  ): Promise<ExecutionResponse> {
    const comp = await this.compile(code, 10000);
    if (!comp.success || !comp.compilationId) {
      return {
        verdict: Verdict.COMPILE_ERROR,
        runtimeMs: 0,
        compileOutput: comp.compileOutput || 'Compilation error.',
      };
    }

    try {
      return await this.execute(comp.compilationId, stdin, timeLimitMs, memoryLimitMb);
    } finally {
      await this.cleanup(comp.compilationId);
    }
  }

  async batchEvaluate(payload: BatchEvaluatePayload): Promise<BatchEvaluateResponse> {
    const { code, testCases, timeLimitMs = 2000, memoryLimitMb = 256 } = payload;
    const comp = await this.compile(code, 10000);

    if (!comp.success || !comp.compilationId) {
      return {
        overallVerdict: Verdict.COMPILE_ERROR,
        maxRuntimeMs: 0,
        compileOutput: comp.compileOutput || 'Compilation error.',
        testResults: testCases.map((tc, idx) => ({
          testCaseId: tc.id,
          verdict: Verdict.COMPILE_ERROR,
          runtimeMs: 0,
          stderr: comp.compileOutput,
          orderIndex: idx,
        })),
      };
    }

    const testResults: TestCaseExecutionResult[] = [];
    let overallVerdict = Verdict.ACCEPTED;
    let maxRuntimeMs = 0;

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const exec = await this.execute(comp.compilationId, tc.input, timeLimitMs, memoryLimitMb);

        if (exec.runtimeMs > maxRuntimeMs) maxRuntimeMs = exec.runtimeMs;

        if (exec.verdict !== Verdict.ACCEPTED) {
          testResults.push({
            testCaseId: tc.id,
            verdict: exec.verdict,
            runtimeMs: exec.runtimeMs,
            stdout: tc.isHidden ? undefined : exec.stdout,
            stderr: tc.isHidden ? undefined : exec.stderr,
            orderIndex: i,
          });
          if (overallVerdict === Verdict.ACCEPTED) overallVerdict = exec.verdict;
          continue;
        }

        // Compare output with expectedOutput
        const normActual = (exec.stdout || '').trim().replace(/\r\n/g, '\n');
        const normExpected = (tc.expectedOutput || '').trim().replace(/\r\n/g, '\n');

        if (normActual === normExpected) {
          testResults.push({
            testCaseId: tc.id,
            verdict: Verdict.ACCEPTED,
            runtimeMs: exec.runtimeMs,
            stdout: tc.isHidden ? undefined : exec.stdout,
            orderIndex: i,
          });
        } else {
          testResults.push({
            testCaseId: tc.id,
            verdict: Verdict.WRONG_ANSWER,
            runtimeMs: exec.runtimeMs,
            stdout: tc.isHidden ? undefined : exec.stdout,
            orderIndex: i,
          });
          if (overallVerdict === Verdict.ACCEPTED) overallVerdict = Verdict.WRONG_ANSWER;
        }
      }

      return {
        overallVerdict,
        maxRuntimeMs,
        compileOutput: comp.compileOutput || '',
        testResults,
      };
    } finally {
      await this.cleanup(comp.compilationId);
    }
  }
}
