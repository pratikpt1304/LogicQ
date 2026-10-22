import {
  IJudge,
  ITwoPhaseJudge,
  ExecutionResult,
  CompilationResult,
  Verdict,
} from './judge.interface.js';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';
import { mapCompilerOutput } from './diagnostic-mapper.js';
import { decodeSignal } from './signal-mapper.js';

const getModuleDir = (): string => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.resolve(process.cwd(), 'src/judge');
};

const execFileAsync = promisify(execFile);

const EXIT_CODE_MLE = 99;
const EXIT_CODE_TIMEOUT = 124;
const WINDOWS_STACK_OVERFLOW = 3221225725; // 0xC00000FD

// Global registry of active temporary directories for zero dangling files guarantee
const activeTempDirs = new Set<string>();

function registerTempDir(dir: string): void {
  activeTempDirs.add(dir);
}

function unregisterTempDir(dir: string): void {
  activeTempDirs.delete(dir);
}

const cleanAllActiveDirs = () => {
  for (const dir of activeTempDirs) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }
  activeTempDirs.clear();
};

if (typeof process !== 'undefined') {
  process.once('exit', cleanAllActiveDirs);
  process.once('SIGINT', () => {
    cleanAllActiveDirs();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanAllActiveDirs();
    process.exit(143);
  });
}

function getJudgeWorkingRoot(): string {
  if (process.platform === 'win32') {
    const modDir = getModuleDir();
    const runnerDir = modDir.includes('dist')
      ? path.resolve(modDir, '../../src/judge')
      : modDir;
    return runnerDir;
  }
  return os.tmpdir();
}

function cleanStaleTempDirs(): void {
  try {
    const tmp = getJudgeWorkingRoot();
    if (!fs.existsSync(tmp)) return;
    const entries = fs.readdirSync(tmp);
    const now = Date.now();
    for (const entry of entries) {
      if (entry.startsWith('logicq_judge_')) {
        const fullPath = path.join(tmp, entry);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > 10 * 60 * 1000) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        } catch {}
      }
    }
  } catch {}
}

export class LocalGccJudge implements ITwoPhaseJudge, IJudge {
  readonly name = 'LocalGccJudge';
  private resolvedGccPath: string = '';
  private runnerExecutablePath: string = '';
  private static cachedRunnerPath: string = '';
  private static runnerBuildPromise: Promise<string> | null = null;
  private static runnerDisabledByPolicy = false;

  private getGccExecutable(): string {
    if (this.resolvedGccPath) return this.resolvedGccPath;

    if (ENV.GCC_PATH && fs.existsSync(ENV.GCC_PATH)) {
      this.resolvedGccPath = ENV.GCC_PATH;
      return this.resolvedGccPath;
    }

    const userProfile = process.env.USERPROFILE || '';
    const toolsGcc = path.join(userProfile, '.tools', 'w64devkit', 'bin', 'gcc.exe');
    if (fs.existsSync(toolsGcc)) {
      this.resolvedGccPath = toolsGcc;
      return this.resolvedGccPath;
    }

    this.resolvedGccPath = 'gcc';
    return this.resolvedGccPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const gcc = this.getGccExecutable();
      await execFileAsync(gcc, ['--version']);
      cleanStaleTempDirs();
      if (process.platform === 'win32') {
        await this.ensureSandboxRunner();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensures the Win32 Job Object native C sandbox runner is compiled on startup or on demand.
   */
  async ensureSandboxRunner(): Promise<string> {
    if (process.platform !== 'win32' || LocalGccJudge.runnerDisabledByPolicy) return '';
    if (LocalGccJudge.cachedRunnerPath && fs.existsSync(LocalGccJudge.cachedRunnerPath)) {
      this.runnerExecutablePath = LocalGccJudge.cachedRunnerPath;
      return LocalGccJudge.cachedRunnerPath;
    }
    if (this.runnerExecutablePath && fs.existsSync(this.runnerExecutablePath)) {
      LocalGccJudge.cachedRunnerPath = this.runnerExecutablePath;
      return this.runnerExecutablePath;
    }

    if (LocalGccJudge.runnerBuildPromise) {
      return LocalGccJudge.runnerBuildPromise;
    }

    LocalGccJudge.runnerBuildPromise = (async () => {
      try {
        const modDir = getModuleDir();
        const runnerDir = modDir.includes('dist')
          ? path.resolve(modDir, '../../src/judge')
          : modDir;
        let runnerSource = path.join(runnerDir, 'win-sandbox-runner.c');
        if (!fs.existsSync(runnerSource)) {
          runnerSource = path.resolve(process.cwd(), 'src/judge/win-sandbox-runner.c');
        }

        const runnerExe = path.join(path.dirname(runnerSource), 'win-sandbox-runner.exe');

        // Check if existing binary is newer than or equal to source
        if (fs.existsSync(runnerExe) && fs.existsSync(runnerSource)) {
          const cMtime = fs.statSync(runnerSource).mtimeMs;
          const exeMtime = fs.statSync(runnerExe).mtimeMs;
          if (exeMtime >= cMtime) {
            this.runnerExecutablePath = runnerExe;
            LocalGccJudge.cachedRunnerPath = runnerExe;
            return runnerExe;
          }
        }

        if (!fs.existsSync(runnerSource)) {
          console.warn('[LocalGccJudge] win-sandbox-runner.c not found, falling back to Node runner');
          return '';
        }

        const gcc = this.getGccExecutable();
        await execFileAsync(gcc, ['-O2', '-Wall', '-s', runnerSource, '-o', runnerExe], {
          timeout: 10000,
        });

        this.runnerExecutablePath = runnerExe;
        LocalGccJudge.cachedRunnerPath = runnerExe;
        return runnerExe;
      } catch (err: any) {
        console.warn('[LocalGccJudge] Failed to build win-sandbox-runner.exe:', err.message);
        return '';
      } finally {
        LocalGccJudge.runnerBuildPromise = null;
      }
    })();

    return LocalGccJudge.runnerBuildPromise;
  }

  /**
   * Neutralizes comments and string literals to prevent false positive pattern matches.
   */
  private stripNonCode(code: string): string {
    return code.replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
      (match) => {
        if (match.startsWith('"') || match.startsWith("'")) {
          return '""';
        }
        return ' ';
      }
    );
  }

  /**
   * Hardened Static Source Security Guard
   * Blocks #undef, macro hijacking, dangerous headers, and forbidden syscalls before compiling.
   */
  private validateSourceSecurity(code: string): string | null {
    // 1. Block #undef preprocessor directives (anti-macro-bypass)
    if (/^\s*#\s*undef\b/m.test(code)) {
      return 'Security violation: #undef preprocessor directive is forbidden in the sandbox';
    }

    // 2. Block redefining internal sandbox symbols
    if (/^\s*#\s*define\s+(__lq_|LOGICQ_)/m.test(code)) {
      return 'Security violation: redefining reserved sandbox identifiers is forbidden';
    }

    // 3. Block arbitrary path #include directives and restricted system headers
    const includeRegex = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
    let match: RegExpExecArray | null;
    const forbiddenHeaders = new Set([
      'sys/socket.h',
      'netinet/in.h',
      'arpa/inet.h',
      'netdb.h',
      'winsock.h',
      'winsock2.h',
      'ws2tcpip.h',
      'windows.h',
      'unistd.h',
      'sys/wait.h',
      'pthread.h',
      'dlfcn.h',
      'sys/mman.h',
      'sys/syscall.h',
      'sys/ptrace.h',
      'sys/resource.h',
      'process.h',
      'io.h',
      'direct.h',
      'winternl.h',
      'tlhelp32.h',
    ]);

    while ((match = includeRegex.exec(code)) !== null) {
      const header = match[1].trim().replace(/\\/g, '/');
      if (
        header.startsWith('/') ||
        header.includes('..') ||
        /^[a-zA-Z]:/.test(header) ||
        header.includes('passwd') ||
        header.includes('shadow') ||
        header.includes('proc/') ||
        header.includes('hosts')
      ) {
        return `Security violation: forbidden file path in #include "${match[1]}"`;
      }
      if (forbiddenHeaders.has(header.toLowerCase())) {
        return `Security violation: restricted system/network header <${match[1]}> is not permitted in the C11 sandbox`;
      }
    }

    // 4. Block forbidden process creation, shell execution, raw socket creation, and inline assembly
    const strippedCode = this.stripNonCode(code);
    const forbiddenCallPatterns: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /\bfork\s*\(/, reason: 'Process creation (fork) is disabled in the sandbox' },
      { pattern: /\bvfork\s*\(/, reason: 'Process creation (vfork) is disabled in the sandbox' },
      { pattern: /\bclone\s*\(/, reason: 'Process cloning (clone) is disabled in the sandbox' },
      { pattern: /\bsystem\s*\(/, reason: 'Shell execution (system) is disabled in the sandbox' },
      { pattern: /\b_?wsystem\s*\(/, reason: 'Shell execution (wsystem) is disabled in the sandbox' },
      { pattern: /\bpopen\s*\(/, reason: 'Pipe execution (popen) is disabled in the sandbox' },
      { pattern: /\b_?wpopen\s*\(/, reason: 'Pipe execution (wpopen) is disabled in the sandbox' },
      { pattern: /\bexec(?:l|le|lp|lpe|v|ve|vp|vpe)\s*\(/, reason: 'Process exec family is disabled in the sandbox' },
      { pattern: /\b_?spawn(?:l|le|lp|lpe|v|ve|vp|vpe)?\s*\(/, reason: 'Process spawn family is disabled in the sandbox' },
      { pattern: /\bCreateProcess(?:A|W)?\s*\(/, reason: 'Windows process creation is disabled in the sandbox' },
      { pattern: /\bCreateThread\s*\(/, reason: 'Thread creation is disabled in the sandbox' },
      { pattern: /\bsocket\s*\(/, reason: 'Network socket creation is disabled in the sandbox' },
      { pattern: /\bWSAStartup\s*\(/, reason: 'Network Winsock initialization is disabled in the sandbox' },
      { pattern: /\bconnect\s*\(/, reason: 'Network connection is disabled in the sandbox' },
      { pattern: /\bptrace\s*\(/, reason: 'Process debugging/tracing is disabled in the sandbox' },
      { pattern: /\bkill\s*\(/, reason: 'Signal transmission (kill) is disabled in the sandbox' },
      { pattern: /\b(?:__asm__|asm)\s*(?:volatile)?\s*\(/, reason: 'Inline assembly is disabled in the sandbox' },
    ];

    for (const rule of forbiddenCallPatterns) {
      if (rule.pattern.test(strippedCode)) {
        return `Security violation: ${rule.reason}`;
      }
    }

    return null;
  }

  private buildSandboxPrelude(memoryLimitMb: number = 128): string {
    const limitBytes = Math.max(1, memoryLimitMb) * 1024 * 1024;
    return `
#ifndef LOGICQ_SANDBOX_PRELUDE_H
#define LOGICQ_SANDBOX_PRELUDE_H

#include <stdio.h>
#include <stdlib.h>

static size_t __lq_heap_used = 0;
static const size_t __lq_heap_limit = ${limitBytes}ULL;

static inline void* __lq_malloc(size_t sz) {
    if (sz > __lq_heap_limit || __lq_heap_used + sz > __lq_heap_limit) {
        fprintf(stderr, "Memory limit exceeded (${memoryLimitMb} MB)\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    void *ptr = malloc(sz);
    if (!ptr && sz > 0) {
        fprintf(stderr, "Memory allocation failed\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    __lq_heap_used += sz;
    return ptr;
}

static inline void* __lq_calloc(size_t n, size_t sz) {
    if (n > 0 && sz > __lq_heap_limit / n) {
        fprintf(stderr, "Memory limit exceeded (${memoryLimitMb} MB)\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    size_t total = n * sz;
    if (__lq_heap_used + total > __lq_heap_limit) {
        fprintf(stderr, "Memory limit exceeded (${memoryLimitMb} MB)\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    void *ptr = calloc(n, sz);
    if (!ptr && total > 0) {
        fprintf(stderr, "Memory allocation failed\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    __lq_heap_used += total;
    return ptr;
}

static inline void* __lq_realloc(void *p, size_t sz) {
    if (sz > __lq_heap_limit || __lq_heap_used + sz > __lq_heap_limit) {
        fprintf(stderr, "Memory limit exceeded (${memoryLimitMb} MB)\\n");
        fflush(stderr);
        _exit(${EXIT_CODE_MLE});
    }
    void *ptr = realloc(p, sz);
    if (!ptr && sz > 0) {
        _exit(${EXIT_CODE_MLE});
    }
    __lq_heap_used += sz;
    return ptr;
}

static inline FILE* __lq_fopen(const char *path, const char *mode) {
    (void)path;
    (void)mode;
    return NULL;
}

static inline FILE* __lq_freopen(const char *path, const char *mode, FILE *stream) {
    (void)path;
    (void)mode;
    (void)stream;
    return NULL;
}

static inline char* __lq_getenv(const char *name) {
    (void)name;
    return NULL;
}

#define malloc(sz) __lq_malloc(sz)
#define calloc(n, sz) __lq_calloc(n, sz)
#define realloc(p, sz) __lq_realloc(p, sz)
#define fopen(path, mode) __lq_fopen(path, mode)
#define freopen(path, mode, stream) __lq_freopen(path, mode, stream)
#define getenv(name) __lq_getenv(name)
#endif
`;
  }

  /**
   * Phase 1: Compile code once using GCC C11 standard.
   * Returns binary path and cleanup handle for subsequent multi-test executions.
   */
  async compile(code: string, options?: { timeLimitMs?: number }): Promise<CompilationResult> {
    const securityError = this.validateSourceSecurity(code);
    if (securityError) {
      const diagReport = mapCompilerOutput(securityError);
      return {
        success: false,
        verdict: Verdict.COMPILE_ERROR,
        compileOutput: securityError,
        diagnostics: diagReport.diagnostics,
        primaryHint: securityError,
      };
    }

    const tempId = uuidv4();
    const tempDir = path.join(getJudgeWorkingRoot(), `logicq_judge_${tempId}`);
    fs.mkdirSync(tempDir, { recursive: true });
    registerTempDir(tempDir);

    const preludeFile = path.join(tempDir, 'sandbox_prelude.h');
    const sourceFile = path.join(tempDir, 'solution.c');
    const isWindows = process.platform === 'win32';
    const binaryFile = isWindows
      ? path.join(getJudgeWorkingRoot(), `solution_${tempId}.exe`)
      : path.join(tempDir, 'solution');

    if (isWindows) {
      registerTempDir(binaryFile);
    }

    try {
      fs.writeFileSync(preludeFile, this.buildSandboxPrelude(128), 'utf8');
      fs.writeFileSync(sourceFile, code, 'utf8');

      const gcc = this.getGccExecutable();
      const gccDir = path.dirname(gcc);

      const compileArgs = [
        '-O2',
        '-Wall',
        '-std=c11',
        '-fno-asm',
        '-D__LQ_BUILD__="LOGICQ"',
        '-include',
        preludeFile,
        '-o',
        binaryFile,
        sourceFile,
        '-lm',
      ];

      const { stdout, stderr } = await execFileAsync(gcc, compileArgs, {
        timeout: options?.timeLimitMs || 10000,
        cwd: tempDir,
        env: {
          ...process.env,
          PATH: gccDir ? `${gccDir}${path.delimiter}${process.env.PATH || ''}` : (process.env.PATH || ''),
          SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
        },
      });

      if (isWindows) {
        await new Promise((r) => setTimeout(r, 120));
      }

      const cleanup = async () => {
        try {
          if (isWindows && fs.existsSync(binaryFile)) {
            await fs.promises.rm(binaryFile, { force: true }).catch(() => {});
          }
          if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
          }
        } catch {
          // Ignore transient lock cleanup races
        } finally {
          unregisterTempDir(tempDir);
          if (isWindows) unregisterTempDir(binaryFile);
        }
      };

      const rawCompileOutput = (stdout || '') + (stderr || '');
      const diagReport = mapCompilerOutput(rawCompileOutput);

      return {
        success: true,
        binaryPath: binaryFile,
        cleanup,
        compileOutput: diagReport.formattedOutput || rawCompileOutput,
        diagnostics: diagReport.diagnostics,
      };
    } catch (compileErr: any) {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {
        // Silent cleanup
      } finally {
        unregisterTempDir(tempDir);
      }

      const rawCompileOutput = (compileErr.stderr || compileErr.stdout || compileErr.message || '').toString();
      const diagReport = mapCompilerOutput(rawCompileOutput);
      return {
        success: false,
        verdict: Verdict.COMPILE_ERROR,
        compileOutput: diagReport.formattedOutput || rawCompileOutput,
        diagnostics: diagReport.diagnostics,
        primaryHint: diagReport.diagnostics[0]?.actionableHint || rawCompileOutput.slice(0, 200),
      };
    }
  }

  /**
   * Phase 2: Execute pre-compiled binary under the Win32 Job Object sandbox (or POSIX runner).
   */
  async execute(
    binaryPath: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 128
  ): Promise<ExecutionResult> {
    const isWindows = process.platform === 'win32';
    const workDir = path.dirname(binaryPath);

    if (isWindows) {
      const runnerExe = await this.ensureSandboxRunner();
      if (runnerExe && fs.existsSync(runnerExe)) {
        return this.executeWithWinSandbox(runnerExe, binaryPath, stdin, timeLimitMs, memoryLimitMb, workDir);
      }
    }

    // Fallback runner (POSIX or fallback if runnerExe not compiled)
    return this.executeFallback(binaryPath, stdin, timeLimitMs, memoryLimitMb, workDir);
  }

  /**
   * Executes binary via native Win32 Job Object runner helper (win-sandbox-runner.exe).
   */
  private executeWithWinSandbox(
    runnerExe: string,
    binaryPath: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitMb: number,
    workDir: string
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const runToken = uuidv4().replace(/-/g, '').slice(0, 16);
      const startTime = performance.now();
      const MAX_STDOUT_CAPTURE = 1024 * 1024; // 1 MB payload buffer cap

      const runnerArgs = [
        String(timeLimitMs),
        String(memoryLimitMb),
        workDir,
        binaryPath,
        runToken,
      ];

      const gcc = this.getGccExecutable();
      const gccDir = path.dirname(gcc);

      const child = spawn(runnerExe, runnerArgs, {
        cwd: workDir,
        shell: false,
        env: {
          ...process.env,
          PATH: gccDir ? `${gccDir}${path.delimiter}${process.env.PATH || ''}` : (process.env.PATH || ''),
          SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (child.stdin) {
        child.stdin.on('error', () => {});
        if (stdin) {
          child.stdin.write(stdin);
        }
        child.stdin.end();
      }

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        if (stdout.length < MAX_STDOUT_CAPTURE) {
          const remaining = MAX_STDOUT_CAPTURE - stdout.length;
          stdout += chunk.toString().slice(0, remaining);
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderr.length < 2 * 1024 * 1024) {
          stderr += chunk.toString();
        }
      });

      child.on('error', (_err) => {
        // Fallback to direct Node execution if sandbox runner fails to spawn
        this.executeFallback(binaryPath, stdin, timeLimitMs, memoryLimitMb, workDir).then(resolve);
      });

      child.on('close', (runnerExitCode) => {
        const runtimeMs = Math.round(performance.now() - startTime);

        // Parse structured sentinel from stderr:
        // __LQ_META_<runToken>__|exitCode|timedOut|ole|userTimeMs|kernelTimeMs|peakMemKb
        const sentinelPattern = new RegExp(
          `__LQ_META_${runToken}__\\|(\\d+)\\|([01])\\|([01])\\|(\\d+)\\|(\\d+)\\|(\\d+)`
        );
        const match = sentinelPattern.exec(stderr);

        // Strip sentinel line from stderr
        const cleanStderr = stderr.replace(sentinelPattern, '').trim();

        if (!match) {
          if (stderr.includes('4551')) {
            LocalGccJudge.runnerDisabledByPolicy = true;
            this.runnerExecutablePath = '';
            LocalGccJudge.cachedRunnerPath = '';
          }
          if (runnerExitCode !== 0) {
            this.executeFallback(binaryPath, stdin, timeLimitMs, memoryLimitMb, workDir).then(resolve);
            return;
          }
          resolve({
            verdict: Verdict.ACCEPTED,
            runtimeMs,
            stdout,
            stderr: cleanStderr,
          });
          return;
        }

        const exitCode = parseInt(match[1], 10);
        const timedOut = match[2] === '1';
        const ole = match[3] === '1';
        const userTimeMs = parseInt(match[4], 10);
        const kernelTimeMs = parseInt(match[5], 10);
        const peakMemKb = parseInt(match[6], 10);

        if (timedOut || userTimeMs >= timeLimitMs || exitCode === EXIT_CODE_TIMEOUT || runnerExitCode === EXIT_CODE_TIMEOUT) {
          resolve({
            verdict: Verdict.TIME_LIMIT_EXCEEDED,
            runtimeMs: Math.max(runtimeMs, userTimeMs),
            userTimeMs,
            kernelTimeMs,
            memoryKb: peakMemKb,
            stdout,
            stderr: 'Execution timed out',
            exitCode: EXIT_CODE_TIMEOUT,
          });
          return;
        }

        if (ole || peakMemKb > memoryLimitMb * 1024 || exitCode === EXIT_CODE_MLE || exitCode === WINDOWS_STACK_OVERFLOW) {
          resolve({
            verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
            runtimeMs: userTimeMs || runtimeMs,
            userTimeMs,
            kernelTimeMs,
            memoryKb: peakMemKb,
            stdout,
            stderr: ole ? 'Output buffer size limit exceeded (10MB)' : cleanStderr || 'Memory limit exceeded',
            exitCode,
          });
          return;
        }

        if (exitCode !== 0) {
          const decoded = decodeSignal(exitCode);
          resolve({
            verdict: Verdict.RUNTIME_ERROR,
            runtimeMs: userTimeMs || runtimeMs,
            userTimeMs,
            kernelTimeMs,
            memoryKb: peakMemKb,
            stdout,
            stderr: cleanStderr || decoded.description,
            exitCode,
            signal: decoded.signal,
            signalDescription: decoded.description,
          });
          return;
        }

        resolve({
          verdict: Verdict.ACCEPTED,
          runtimeMs: userTimeMs || runtimeMs,
          userTimeMs,
          kernelTimeMs,
          memoryKb: peakMemKb,
          stdout,
          stderr: cleanStderr,
          exitCode: 0,
        });
      });

      try {
        if (stdin) {
          child.stdin.write(stdin);
        }
        child.stdin.end();
      } catch {
        // Child terminated early
      }
    });
  }

  /**
   * Fallback streaming execution for POSIX environments.
   */
  private executeFallback(
    binaryPath: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitMb: number,
    workDir: string
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const maxPipeBytes = 10 * 1024 * 1024; // 10 MB cap
      const maxRetained = 1024 * 1024;       // 1 MB retained payload cap
      let stdout = '';
      let stderr = '';
      let totalStdoutBytes = 0;
      let timedOut = false;
      let killed = false;
      const startTime = performance.now();

      const gcc = this.getGccExecutable();
      const gccDir = path.dirname(gcc);

      let child: any;
      try {
        child = spawn(binaryPath, [], {
          cwd: workDir,
          shell: false,
          env: {
            ...process.env,
            PATH: gccDir ? `${gccDir}${path.delimiter}${process.env.PATH || ''}` : (process.env.PATH || ''),
            SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (spawnErr: any) {
        resolve({
          verdict: Verdict.RUNTIME_ERROR,
          runtimeMs: 0,
          stdout,
          stderr: spawnErr.message || 'Failed to spawn process',
        });
        return;
      }

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        child.kill('SIGKILL');
      }, timeLimitMs);

      child.stdout.on('data', (data: Buffer | string) => {
        totalStdoutBytes += data.length;
        if (stdout.length < maxRetained) {
          const remaining = maxRetained - stdout.length;
          stdout += data.toString().slice(0, remaining);
        }
        if (totalStdoutBytes >= maxPipeBytes && !killed) {
          killed = true;
          child.kill('SIGKILL');
          clearTimeout(timer);
          resolve({
            verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
            runtimeMs: Math.round(performance.now() - startTime),
            stdout,
            stderr: 'Output buffer size limit exceeded (10MB)',
          });
        }
      });

      child.stderr.on('data', (data: Buffer | string) => {
        if (stderr.length < 2 * 1024 * 1024) {
          stderr += data.toString();
        }
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({
          verdict: Verdict.RUNTIME_ERROR,
          runtimeMs: Math.round(performance.now() - startTime),
          stdout,
          stderr: err.message,
        });
      });

      child.on('close', (code: number | null, signal: string | null) => {
        clearTimeout(timer);
        const runtimeMs = Math.round(performance.now() - startTime);

        if (timedOut || signal === 'SIGKILL' || signal === 'SIGTERM') {
          resolve({
            verdict: Verdict.TIME_LIMIT_EXCEEDED,
            runtimeMs,
            stdout,
            stderr: 'Execution timed out',
            exitCode: EXIT_CODE_TIMEOUT,
          });
          return;
        }

        const unsignedCode = code !== null ? code >>> 0 : 0;
        if (code === EXIT_CODE_MLE || unsignedCode === WINDOWS_STACK_OVERFLOW) {
          const decoded = decodeSignal(code);
          resolve({
            verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
            runtimeMs,
            stdout,
            stderr: stderr || decoded.description,
            exitCode: code || undefined,
            signal: decoded.signal,
            signalDescription: decoded.description,
          });
          return;
        }

        if (code !== 0) {
          const decoded = decodeSignal(code);
          resolve({
            verdict: Verdict.RUNTIME_ERROR,
            runtimeMs,
            stdout,
            stderr: stderr || decoded.description,
            exitCode: code || undefined,
            signal: decoded.signal,
            signalDescription: decoded.description,
          });
          return;
        }

        resolve({
          verdict: Verdict.ACCEPTED,
          runtimeMs,
          stdout,
          stderr,
          exitCode: 0,
        });
      });

      try {
        if (stdin) {
          child.stdin.write(stdin);
        }
        child.stdin.end();
      } catch {
        // Child exited
      }
    });
  }

  /**
   * Backward-compatible compileAndRun wrapper.
   */
  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 64
  ): Promise<ExecutionResult> {
    const compilation = await this.compile(code, { timeLimitMs: 10000 });
    if (!compilation.success) {
      return {
        verdict: Verdict.COMPILE_ERROR,
        runtimeMs: 0,
        compileOutput: compilation.compileOutput,
        diagnostics: compilation.diagnostics,
      };
    }

    try {
      const execResult = await this.execute(
        compilation.binaryPath,
        stdin,
        timeLimitMs,
        memoryLimitMb
      );
      return {
        ...execResult,
        compileOutput: compilation.compileOutput,
      };
    } finally {
      await compilation.cleanup();
    }
  }
}
