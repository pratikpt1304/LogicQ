import { IJudge, ExecutionResult, Verdict } from './judge.interface.js';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';

const execFileAsync = promisify(execFile);

const EXIT_CODE_MLE = 99;
const EXIT_CODE_SECURITY = 98;
const WINDOWS_STACK_OVERFLOW = 3221225725; // 0xC00000FD

export class LocalGccJudge implements IJudge {
  readonly name = 'LocalGccJudge';
  private resolvedGccPath: string = '';

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
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Static source guard against host-escape headers and forbidden syscalls before invoking GCC.
   */
  private validateSourceSecurity(code: string): string | null {
    // 1. Block arbitrary path #include directives (e.g., #include "/etc/passwd", #include "../...", #include "C:\...")
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
    ]);

    while ((match = includeRegex.exec(code)) !== null) {
      const header = match[1].trim().replace(/\\/g, '/');
      if (
        header.startsWith('/') ||
        header.includes('..') ||
        /^[a-zA-Z]:/.test(header) ||
        header.includes('passwd') ||
        header.includes('shadow') ||
        header.includes('proc/')
      ) {
        return `Security violation: forbidden file path in #include "${match[1]}"`;
      }
      if (forbiddenHeaders.has(header.toLowerCase())) {
        return `Security violation: restricted system/network header <${match[1]}> is not permitted in the C11 sandbox`;
      }
    }

    // 2. Block process creation, shell execution, and raw socket creation
    const forbiddenCallPatterns: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /\bfork\s*\(/, reason: 'Process creation (fork) is disabled in the sandbox' },
      { pattern: /\bvfork\s*\(/, reason: 'Process creation (vfork) is disabled in the sandbox' },
      { pattern: /\bsystem\s*\(/, reason: 'Shell execution (system) is disabled in the sandbox' },
      { pattern: /\bpopen\s*\(/, reason: 'Pipe execution (popen) is disabled in the sandbox' },
      { pattern: /\bexec(?:l|le|lp|v|ve|vp|vpe)\s*\(/, reason: 'Process exec family is disabled in the sandbox' },
      { pattern: /\bsocket\s*\(/, reason: 'Network socket creation is disabled in the sandbox' },
      { pattern: /\bWSAStartup\s*\(/, reason: 'Network Winsock initialization is disabled in the sandbox' },
    ];

    for (const rule of forbiddenCallPatterns) {
      if (rule.pattern.test(code)) {
        return `Security violation: ${rule.reason}`;
      }
    }

    return null;
  }

  /**
   * Builds a C11 sandbox prelude header injected via `-include` to enforce:
   * - Strict heap allocation cap (`memoryLimitMb` MB) -> exits with EXIT_CODE_MLE (99)
   * - Environment variable isolation (`getenv` always returns NULL)
   * - Filesystem isolation (`fopen`/`freopen`/`remove`/`rename` blocked -> returns NULL or exits with EXIT_CODE_SECURITY)
   */
  private buildSandboxPrelude(memoryLimitMb: number): string {
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

static inline char* __lq_getenv(const char *name) {
    (void)name;
    return (char*)0;
}

static inline FILE* __lq_fopen(const char *path, const char *mode) {
    (void)path;
    (void)mode;
    return (FILE*)0;
}

static inline FILE* __lq_freopen(const char *path, const char *mode, FILE *stream) {
    (void)path;
    (void)mode;
    (void)stream;
    return (FILE*)0;
}

static inline int __lq_deny_path(const char *path) {
    (void)path;
    return -1;
}

#define malloc(sz) __lq_malloc(sz)
#define calloc(n, sz) __lq_calloc(n, sz)
#define realloc(p, sz) __lq_realloc(p, sz)
#define getenv(name) __lq_getenv(name)
#define fopen(path, mode) __lq_fopen(path, mode)
#define freopen(path, mode, stream) __lq_freopen(path, mode, stream)
#define remove(path) __lq_deny_path(path)
#endif
`;
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 64
  ): Promise<ExecutionResult> {
    const securityError = this.validateSourceSecurity(code);
    if (securityError) {
      return {
        verdict: Verdict.COMPILE_ERROR,
        runtimeMs: 0,
        compileOutput: securityError,
      };
    }

    const tempId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `logicq_judge_${tempId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const preludeFile = path.join(tempDir, 'sandbox_prelude.h');
    const sourceFile = path.join(tempDir, 'solution.c');
    const isWindows = process.platform === 'win32';
    const binaryFile = path.join(tempDir, isWindows ? 'solution.exe' : 'solution');

    try {
      fs.writeFileSync(preludeFile, this.buildSandboxPrelude(memoryLimitMb), 'utf8');
      fs.writeFileSync(sourceFile, code, 'utf8');

      const gcc = this.getGccExecutable();
      const gccDir = path.dirname(gcc);

      // 1. Compile Phase
      try {
        const compileArgs = [
          '-O2',
          '-Wall',
          '-std=c11',
          '-include',
          preludeFile,
          '-o',
          binaryFile,
          sourceFile,
          '-lm',
        ];
        await execFileAsync(gcc, compileArgs, {
          timeout: 10000,
          cwd: tempDir,
          env: {
            PATH: gccDir ? `${gccDir}${path.delimiter}${process.env.PATH || ''}` : process.env.PATH,
            SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
            TEMP: tempDir,
            TMP: tempDir,
          },
        });
      } catch (compileErr: any) {
        return {
          verdict: Verdict.COMPILE_ERROR,
          runtimeMs: 0,
          compileOutput: (compileErr.stderr || compileErr.stdout || compileErr.message || '').toString(),
        };
      }

      // 2. Execution Phase (isolated cwd, zero secret env vars)
      const startTime = performance.now();
      const runResult = await this.executeBinary(binaryFile, stdin, timeLimitMs, tempDir);
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
      } catch {
        // Silently handle temp cleanup race condition
      }
    }
  }

  private executeBinary(
    binaryPath: string,
    stdin: string,
    timeLimitMs: number,
    workDir: string
  ): Promise<{ verdict: Verdict; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const maxBuffer = 1024 * 1024; // 1 MB output limit
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      const child = spawn(binaryPath, [], {
        cwd: workDir,
        shell: false,
        env: {
          PATH: '',
          SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
        },
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

        const unsignedCode = code !== null ? code >>> 0 : 0;
        if (code === EXIT_CODE_MLE || unsignedCode === WINDOWS_STACK_OVERFLOW) {
          resolve({
            verdict: Verdict.MEMORY_LIMIT_EXCEEDED,
            stdout,
            stderr: stderr || 'Memory limit exceeded',
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
          verdict: Verdict.ACCEPTED,
          stdout,
          stderr,
        });
      });

      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch {
        // Ignore if child already terminated
      }
    });
  }
}
