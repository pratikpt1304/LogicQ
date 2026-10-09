import { IJudge, ExecutionResult, Verdict } from './judge.interface.js';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';

const execFileAsync = promisify(execFile);

export class LocalGccJudge implements IJudge {
  readonly name = 'LocalGccJudge';
  private resolvedGccPath: string = '';

  private getGccExecutable(): string {
    if (this.resolvedGccPath) return this.resolvedGccPath;

    if (ENV.GCC_PATH && fs.existsSync(ENV.GCC_PATH)) {
      this.resolvedGccPath = ENV.GCC_PATH;
      return this.resolvedGccPath;
    }

    // Check user tools directory
    const userProfile = process.env.USERPROFILE || '';
    const toolsGcc = path.join(userProfile, '.tools', 'w64devkit', 'bin', 'gcc.exe');
    if (fs.existsSync(toolsGcc)) {
      this.resolvedGccPath = toolsGcc;
      return this.resolvedGccPath;
    }

    // Default to PATH 'gcc'
    this.resolvedGccPath = 'gcc';
    return this.resolvedGccPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const gcc = this.getGccExecutable();
      await execFileAsync(gcc, ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 64
  ): Promise<ExecutionResult> {
    const tempId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `logicq_judge_${tempId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const sourceFile = path.join(tempDir, 'solution.c');
    const isWindows = process.platform === 'win32';
    const binaryFile = path.join(tempDir, isWindows ? 'solution.exe' : 'solution');

    try {
      fs.writeFileSync(sourceFile, code, 'utf8');

      const gcc = this.getGccExecutable();

      // 1. Compile Phase
      try {
        const compileArgs = ['-O2', '-Wall', '-std=c11', '-o', binaryFile, sourceFile];
        await execFileAsync(gcc, compileArgs, { timeout: 10000 });
      } catch (compileErr: any) {
        return {
          verdict: Verdict.COMPILE_ERROR,
          runtimeMs: 0,
          compileOutput: (compileErr.stderr || compileErr.stdout || compileErr.message || '').toString(),
        };
      }

      // 2. Execution Phase
      const startTime = performance.now();
      const runResult = await this.executeBinary(binaryFile, stdin, timeLimitMs);
      const runtimeMs = Math.round(performance.now() - startTime);

      return {
        verdict: runResult.verdict,
        runtimeMs,
        stdout: runResult.stdout,
        stderr: runResult.stderr,
      };
    } finally {
      // 3. Cleanup temp directory and files
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        // Silently handle temp cleanup race condition
      }
    }
  }

  private executeBinary(
    binaryPath: string,
    stdin: string,
    timeLimitMs: number
  ): Promise<{ verdict: Verdict; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const maxBuffer = 1024 * 1024; // 1 MB output limit
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      const child = spawn(binaryPath, [], {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        child.kill('SIGKILL');
      }, timeLimitMs);

      child.stdout.on('data', (data) => {
        if (stdout.length < maxBuffer) {
          stdout += data.toString();
        } else if (!killed) {
          killed = true;
          child.kill('SIGKILL');
          clearTimeout(timer);
          resolve({
            verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
            stdout,
            stderr: 'Output buffer size limit exceeded (1MB)',
          });
        }
      });

      child.stderr.on('data', (data) => {
        if (stderr.length < maxBuffer) {
          stderr += data.toString();
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          verdict: Verdict.RUNTIME_ERROR,
          stdout,
          stderr: err.message,
        });
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);

        if (timedOut || signal === 'SIGKILL' || signal === 'SIGTERM') {
          resolve({
            verdict: Verdict.TIME_LIMIT_EXCEEDED,
            stdout,
            stderr: 'Execution timed out',
          });
          return;
        }

        if (code !== 0) {
          resolve({
            verdict: Verdict.RUNTIME_ERROR,
            stdout,
            stderr: stderr || `Process exited with code ${code}`,
          });
          return;
        }

        resolve({
          verdict: Verdict.ACCEPTED, // Initial process completion status; test case verifier will check stdout match
          stdout,
          stderr,
        });
      });

      // Write stdin and close pipe
      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch (pipeErr) {
        // If child already terminated, ignore
      }
    });
  }
}
