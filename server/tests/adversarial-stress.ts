import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { Verdict } from '../src/judge/judge.interface.js';
import { execSync } from 'child_process';

const judge = new LocalGccJudge();

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  verdict: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  error?: string;
  notes: string;
}

const results: TestResult[] = [];

function checkOrphanedProcesses(): string[] {
  try {
    const out1 = execSync('tasklist /FI "IMAGENAME eq solution.exe" /NH').toString();
    const out2 = execSync('tasklist /FI "IMAGENAME eq win-sandbox-runner.exe" /NH').toString();
    const orphans: string[] = [];
    if (out1.toLowerCase().includes('solution.exe')) orphans.push('solution.exe');
    if (out2.toLowerCase().includes('win-sandbox-runner.exe')) orphans.push('win-sandbox-runner.exe');
    return orphans;
  } catch {
    return [];
  }
}

async function runTest(
  id: string,
  name: string,
  code: string,
  stdin: string,
  timeLimitMs: number,
  memLimitMb: number,
  expectedVerdict: Verdict | Verdict[],
  validate?: (res: any) => { ok: boolean; reason: string }
) {
  const start = performance.now();
  try {
    const res = await judge.compileAndRun(code, stdin, timeLimitMs, memLimitMb);
    const duration = Math.round(performance.now() - start);
    const orphans = checkOrphanedProcesses();
    const expectedList = Array.isArray(expectedVerdict) ? expectedVerdict : [expectedVerdict];
    const verdictMatch = expectedList.includes(res.verdict);
    const customValidation = validate ? validate(res) : { ok: true, reason: '' };
    const passed = verdictMatch && orphans.length === 0 && customValidation.ok;

    results.push({
      id,
      name,
      passed,
      verdict: res.verdict,
      runtimeMs: duration,
      memoryKb: res.memoryKb,
      stdoutSnippet: (res.stdout || '').slice(0, 100),
      stderrSnippet: (res.stderr || '').slice(0, 100),
      notes: [
        verdictMatch ? `Verdict ${res.verdict} matched` : `Verdict MISMATCH: got ${res.verdict}, expected ${expectedList.join('/')}`,
        orphans.length > 0 ? `ORPHAN PROCESS DETECTED: ${orphans.join(', ')}` : 'Zero orphans',
        customValidation.reason,
        `Wall-clock: ${duration}ms`
      ].filter(Boolean).join(' | ')
    });
  } catch (err: any) {
    results.push({
      id,
      name,
      passed: false,
      verdict: Verdict.RUNTIME_ERROR,
      runtimeMs: Math.round(performance.now() - start),
      stdoutSnippet: '',
      stderrSnippet: '',
      error: err.message,
      notes: `Exception thrown during execution: ${err.message}`
    });
  }
}

async function main() {
  console.log('=== STARTING EMPIRICAL CHALLENGER ADVERSARIAL SUITE ===\n');

  // DIMENSION 1: Infinite loops and timeouts (<= 3.0s kill, zero orphaned processes)
  console.log('[DIMENSION 1] Testing Timeouts & Process Cleanup...');
  await runTest(
    'D1_CPU_LOOP',
    'CPU-bound infinite loop (while 1)',
    `
    #include <stdio.h>
    int main() {
      volatile unsigned long long x = 0;
      while (1) { x++; }
      return 0;
    }
    `,
    '',
    1000,
    64,
    Verdict.TIME_LIMIT_EXCEEDED,
    (res) => ({
      ok: res.runtimeMs <= 3500,
      reason: `Runtime: ${res.runtimeMs}ms (must be <= 3000-3500ms)`
    })
  );

  await runTest(
    'D1_SLEEP_LOOP',
    'Wall-clock sleeping program (Sleep 10000)',
    `
    #include <stdio.h>
    extern void Sleep(unsigned long);
    int main() {
      Sleep(10000);
      printf("AWAKE\\n");
      return 0;
    }
    `,
    '',
    1000,
    64,
    Verdict.TIME_LIMIT_EXCEEDED,
    (res) => ({
      ok: res.runtimeMs <= 3500,
      reason: `Wall-clock runtime: ${res.runtimeMs}ms`
    })
  );

  await runTest(
    'D1_OUTPUT_LOOP',
    'Infinite loop flooding stdout',
    `
    #include <stdio.h>
    int main() {
      while (1) {
        printf("flooding\\n");
      }
      return 0;
    }
    `,
    '',
    1000,
    64,
    [Verdict.TIME_LIMIT_EXCEEDED, Verdict.MEMORY_LIMIT_EXCEEDED],
    (res) => ({
      ok: res.runtimeMs <= 3500,
      reason: `Loop terminated within ${res.runtimeMs}ms`
    })
  );

  // DIMENSION 2: Memory limits (>128MB malloc, calloc, BSS array, recursion; verify MEMORY_LIMIT_EXCEEDED)
  console.log('[DIMENSION 2] Testing Memory Limits...');
  await runTest(
    'D2_MALLOC_SINGLE',
    'Single malloc exceeding 128MB (135MB)',
    `
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      void *p = malloc(135ULL * 1024 * 1024);
      if (p) printf("ALLOC_OK\\n");
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  await runTest(
    'D2_MALLOC_MULTI',
    'Cumulative multiple mallocs exceeding 128MB (10x15MB = 150MB)',
    `
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      for (int i = 0; i < 10; i++) {
        void *p = malloc(15ULL * 1024 * 1024);
      }
      printf("MULTI_ALLOC_OK\\n");
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  await runTest(
    'D2_CALLOC',
    'Calloc exceeding 128MB',
    `
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      void *p = calloc(135 * 1024, 1024);
      if (p) printf("CALLOC_OK\\n");
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  await runTest(
    'D2_BSS_ARRAY',
    'Large global BSS array exceeding 128MB (140MB)',
    `
    #include <stdio.h>
    static char big_bss[140ULL * 1024 * 1024];
    int main() {
      big_bss[0] = 1;
      big_bss[139ULL * 1024 * 1024] = 2;
      printf("BSS_VAL: %d %d\\n", big_bss[0], big_bss[139ULL * 1024 * 1024]);
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  await runTest(
    'D2_RECURSION_STACK',
    'Stack memory exhaustion via unbounded recursion',
    `
    #include <stdio.h>
    void recurse(int depth) {
      char stack_frame[64 * 1024];
      stack_frame[0] = (char)depth;
      recurse(depth + 1);
    }
    int main() {
      recurse(0);
      return 0;
    }
    `,
    '',
    2000,
    64,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  // DIMENSION 3: Output pipe cap (10MB stdout truncation)
  console.log('[DIMENSION 3] Testing Output Pipe Cap...');
  await runTest(
    'D3_STDOUT_PIPE_CAP',
    'Stdout output flood exceeding 10MB (15MB)',
    `
    #include <stdio.h>
    int main() {
      // 150000 lines * 100 bytes = 15 MB
      for (int i = 0; i < 150000; i++) {
        printf("012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678\\n");
      }
      return 0;
    }
    `,
    '',
    3000,
    64,
    Verdict.MEMORY_LIMIT_EXCEEDED,
    (res) => ({
      ok: (res.stdout?.length || 0) <= 2 * 1024 * 1024 && (res.stderr?.includes('10MB') || false),
      reason: `Stdout cap: ${res.stdout?.length} bytes, Stderr mentions 10MB: ${res.stderr?.includes('10MB')}`
    })
  );

  // DIMENSION 4: #undef and macro bypass attempts
  console.log('[DIMENSION 4] Testing #undef and Macro Bypass Attempts...');
  await runTest(
    'D4_UNDEF_DIRECT',
    'Direct #undef malloc',
    `
    #undef malloc
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      void *p = malloc(135 * 1024 * 1024);
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D4_UNDEF_WHITESPACE',
    'Indented and spaced #  undef',
    `
      #   undef   malloc
    #include <stdio.h>
    int main() { return 0; }
    `,
    '',
    2000,
    128,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D4_DIGRAPH_UNDEF',
    'Digraph %:undef malloc bypass attempt',
    `
    %:undef malloc
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      void *p = malloc(135 * 1024 * 1024);
      return 0;
    }
    `,
    '',
    2000,
    128,
    [Verdict.COMPILE_ERROR, Verdict.MEMORY_LIMIT_EXCEEDED]
  );

  await runTest(
    'D4_PAREN_MACRO_BYPASS',
    'Function-like macro parenthesis bypass (malloc)(135MB)',
    `
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      // (malloc) bypasses function-like macro replacement in C standard
      char *p = (malloc)(135ULL * 1024 * 1024);
      if (p) {
        for (size_t i = 0; i < 135ULL * 1024 * 1024; i += 4096) p[i] = 1;
        printf("SURVIVED_ALLOC\\n");
      }
      return 0;
    }
    `,
    '',
    2000,
    128,
    Verdict.MEMORY_LIMIT_EXCEEDED
  );

  await runTest(
    'D4_REDEFINE_PRELUDE',
    'Redefining internal prelude identifier __lq_heap_limit',
    `
    #define __lq_heap_limit 999999999ULL
    #include <stdio.h>
    int main() { return 0; }
    `,
    '',
    2000,
    128,
    Verdict.COMPILE_ERROR
  );

  // DIMENSION 5: Process isolation (fork, system, CreateProcess blocked)
  console.log('[DIMENSION 5] Testing Process Isolation...');
  await runTest(
    'D5_FORK_DIRECT',
    'Direct fork() call',
    `
    #include <stdio.h>
    int main() {
      fork();
      return 0;
    }
    `,
    '',
    2000,
    64,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D5_SYSTEM_DIRECT',
    'Direct system("cmd.exe") call',
    `
    #include <stdio.h>
    int main() {
      system("echo MALICIOUS");
      return 0;
    }
    `,
    '',
    2000,
    64,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D5_CREATE_PROCESS',
    'CreateProcess call',
    `
    #include <stdio.h>
    int main() {
      CreateProcessA(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      return 0;
    }
    `,
    '',
    2000,
    64,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D5_WINDOWS_HEADER',
    'Direct #include <windows.h>',
    `
    #include <windows.h>
    int main() { return 0; }
    `,
    '',
    2000,
    64,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D5_DIGRAPH_INCLUDE',
    'Digraph %:include <windows.h> attempt',
    `
    %:include <windows.h>
    int main() { return 0; }
    `,
    '',
    2000,
    64,
    Verdict.COMPILE_ERROR
  );

  await runTest(
    'D5_SYSTEM_FN_PTR',
    'Function pointer bypass to system: int (*fn)(const char*) = system;',
    `
    #include <stdio.h>
    #include <stdlib.h>
    int main() {
      int (*fn)(const char*) = system;
      int ret = fn("echo FORK_SUCCESS");
      printf("RET: %d\\n", ret);
      return 0;
    }
    `,
    '',
    2000,
    64,
    [Verdict.COMPILE_ERROR, Verdict.RUNTIME_ERROR, Verdict.ACCEPTED],
    (res) => {
      // If it compiled, system() must have failed (ret == -1) and NOT executed child process!
      const executedChild = res.stdout?.includes('FORK_SUCCESS');
      return {
        ok: !executedChild,
        reason: executedChild ? 'SECURITY BREACH: Child process executed!' : `Kernel isolated: stdout does not contain FORK_SUCCESS (stdout: ${res.stdout?.trim()})`
      };
    }
  );

  console.log('\n=== EMPIRICAL TEST SUITE RESULTS ===');
  let passCount = 0;
  for (const r of results) {
    const icon = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${icon} [${r.id}] ${r.name}`);
    console.log(`       Verdict: ${r.verdict} | Time: ${r.runtimeMs}ms | Memory: ${r.memoryKb || 0}KB`);
    console.log(`       Notes: ${r.notes}`);
    if (r.error) console.log(`       Error: ${r.error}`);
    if (r.passed) passCount++;
  }
  console.log(`\nTOTAL: ${passCount} / ${results.length} PASSED`);
}

main().catch(console.error);
