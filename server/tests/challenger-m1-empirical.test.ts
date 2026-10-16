import { describe, it, expect } from 'vitest';
import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { Verdict } from '../src/judge/judge.interface.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('Milestone 1 Empirical Challenger Benchmark & Stress Suite', () => {
  const judge = new LocalGccJudge();

  // =========================================================================
  // 1. MULTI-TEST BENCHMARK: Two-Phase compile()+execute() vs Repeated Compile
  // =========================================================================
  describe('Benchmark: Multi-Test Latency & Two-Phase Decoupling', () => {
    const testCases = [
      { in: '1 2\n', out: '3' },
      { in: '10 20\n', out: '30' },
      { in: '100 200\n', out: '300' },
      { in: '-5 5\n', out: '0' },
      { in: '42 58\n', out: '100' },
      { in: '999 1\n', out: '1000' },
      { in: '-50 -50\n', out: '-100' },
      { in: '12345 54321\n', out: '66666' },
      { in: '0 0\n', out: '0' },
      { in: '7 -7\n', out: '0' },
    ];

    const sourceCode = `
      #include <stdio.h>
      int main() {
          long long a, b;
          if (scanf("%lld %lld", &a, &b) == 2) {
              printf("%lld\\n", a + b);
          }
          return 0;
      }
    `;

    it('should demonstrate dramatic speedup with two-phase compile() once + execute() many', async () => {
      // 1. Baseline: Repeated compilation across 10 test cases
      const t0Repeated = performance.now();
      for (const tc of testCases) {
        const res = await judge.compileAndRun(sourceCode, tc.in, 2000, 64);
        expect(res.verdict).toBe(Verdict.ACCEPTED);
        expect(res.stdout?.trim()).toBe(tc.out);
      }
      const tRepeatedMs = performance.now() - t0Repeated;

      // 2. Two-Phase: Compile once, execute 10 times
      const t0Compile = performance.now();
      const comp = await judge.compile(sourceCode);
      const compileTimeMs = performance.now() - t0Compile;

      expect(comp.success).toBe(true);
      if (!comp.success) return;

      const execTimes: number[] = [];
      const t0TwoPhaseExec = performance.now();
      try {
        for (const tc of testCases) {
          const t0Single = performance.now();
          const res = await judge.execute(comp.binaryPath, tc.in, 2000, 64);
          const singleDuration = performance.now() - t0Single;
          execTimes.push(singleDuration);

          expect(res.verdict).toBe(Verdict.ACCEPTED);
          expect(res.stdout?.trim()).toBe(tc.out);
          // Each execution must be fast (well below 200ms on Windows)
          expect(singleDuration).toBeLessThan(500);
        }
      } finally {
        await comp.cleanup();
      }
      const totalTwoPhaseMs = performance.now() - t0Compile;
      const avgExecMs = execTimes.reduce((a, b) => a + b, 0) / execTimes.length;

      console.log(`[Multi-Test Benchmark Results]`);
      console.log(`  Repeated compileAndRun (10 tests): ${tRepeatedMs.toFixed(1)} ms`);
      console.log(`  Two-Phase total (compile + 10 execs): ${totalTwoPhaseMs.toFixed(1)} ms`);
      console.log(`  Compilation time: ${compileTimeMs.toFixed(1)} ms`);
      console.log(`  Average execute() per test: ${avgExecMs.toFixed(1)} ms`);
      console.log(`  Speedup factor: ${(tRepeatedMs / totalTwoPhaseMs).toFixed(2)}x`);

      // Verify two-phase is significantly faster than repeated compilation
      expect(totalTwoPhaseMs).toBeLessThan(tRepeatedMs);
      // Verify compile + single execute is <= 1500ms requirement under normal load
      expect(compileTimeMs + execTimes[0]).toBeLessThanOrEqual(1500);
    }, 60000);

    it('should support parallel execute() calls on the same pre-compiled binary', async () => {
      const comp = await judge.compile(sourceCode);
      expect(comp.success).toBe(true);
      if (!comp.success) return;

      try {
        const promises = testCases.map(async (tc) => {
          const res = await judge.execute(comp.binaryPath, tc.in, 2000, 64);
          expect(res.verdict).toBe(Verdict.ACCEPTED);
          expect(res.stdout?.trim()).toBe(tc.out);
          return res;
        });

        const results = await Promise.all(promises);
        expect(results).toHaveLength(10);
      } finally {
        await comp.cleanup();
      }
    }, 30000);
  });

  // =========================================================================
  // 2. METRICS ACCURACY: runtimeMs, userTimeMs, memoryKb vs actual allocations
  // =========================================================================
  describe('Metrics Accuracy: Memory & CPU Time Reporting', () => {
    it('should accurately measure heap memory allocation (30 MB resident)', async () => {
      // Allocate 30 MB and touch every page so it's committed to working set
      const code = `
        #include <stdio.h>
        #include <stdlib.h>
        #include <string.h>

        int main() {
            size_t size = 30 * 1024 * 1024; // 30 MB
            char *buf = (char *)malloc(size);
            if (!buf) {
                printf("MALLOC_FAILED\\n");
                return 1;
            }
            memset(buf, 0xAA, size);
            printf("ALLOCATED_30MB %c\\n", buf[size - 1]);
            free(buf);
            return 0;
        }
      `;

      const res = await judge.compileAndRun(code, '', 3000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toContain('ALLOCATED_30MB');
      expect(res.memoryKb).toBeDefined();

      console.log(`[Metrics Accuracy: 30MB Heap] reported memoryKb = ${res.memoryKb} KB`);
      // 30 MB = 30720 KB. Job Object PeakProcessMemoryUsed should be >= 30,000 KB and <= 45,000 KB
      expect(res.memoryKb!).toBeGreaterThanOrEqual(28000);
      expect(res.memoryKb!).toBeLessThanOrEqual(45000);
    }, 30000);

    it('should accurately track high-water mark memory (peak memory retention)', async () => {
      // Allocate 50 MB, touch it, then free it before exit.
      // Peak memory MUST still reflect the peak allocation (~50 MB), not post-free memory!
      const code = `
        #include <stdio.h>
        #include <stdlib.h>
        #include <string.h>

        int main() {
            size_t size = 50 * 1024 * 1024; // 50 MB
            char *buf = (char *)malloc(size);
            if (!buf) return 1;
            memset(buf, 0xBB, size);
            free(buf); // Freeing memory
            printf("FREED_50MB\\n");
            return 0;
        }
      `;

      const res = await judge.compileAndRun(code, '', 3000, 100);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('FREED_50MB');
      expect(res.memoryKb).toBeDefined();

      console.log(`[Metrics Accuracy: Peak Memory] reported memoryKb = ${res.memoryKb} KB`);
      // 50 MB = 51200 KB. Peak memory must be >= 48,000 KB despite free()
      expect(res.memoryKb!).toBeGreaterThanOrEqual(48000);
    }, 30000);

    it('should accurately report userTimeMs for CPU-bound computations', async () => {
      // Run busy loop calibrated to burn ~200-400ms of CPU time
      const code = `
        #include <stdio.h>
        int main() {
            volatile unsigned long long sum = 0;
            for (unsigned long long i = 0; i < 200000000ULL; i++) {
                sum += i;
            }
            printf("SUM: %llu\\n", sum);
            return 0;
        }
      `;

      const res = await judge.compileAndRun(code, '', 4000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.userTimeMs).toBeDefined();
      console.log(`[Metrics Accuracy: CPU Time] runtimeMs = ${res.runtimeMs}, userTimeMs = ${res.userTimeMs}, kernelTimeMs = ${res.kernelTimeMs}`);

      // userTimeMs should be non-zero and reasonable
      expect(res.userTimeMs!).toBeGreaterThan(50);
      expect(res.userTimeMs!).toBeLessThan(3500);
    }, 30000);

    it('should trigger MEMORY_LIMIT_EXCEEDED when exceeding memoryLimitMb (128 MB)', async () => {
      const code = `
        #include <stdio.h>
        #include <stdlib.h>
        #include <string.h>

        int main() {
            size_t size = 140 * 1024 * 1024; // 140 MB > 128 MB limit
            char *buf = (char *)malloc(size);
            if (buf) {
                memset(buf, 0xCC, size);
                printf("UNEXPECTED_SUCCESS\\n");
            }
            return 0;
        }
      `;

      const res = await judge.compileAndRun(code, '', 3000, 128);
      expect(res.verdict).toBe(Verdict.MEMORY_LIMIT_EXCEEDED);
      expect(res.stdout?.trim()).not.toContain('UNEXPECTED_SUCCESS');
    }, 30000);

    it('should enforce Windows Job Object memory limit even when prelude macro is bypassed via (malloc)()', async () => {
      // Bypass macro with (malloc)(...)
      const code = `
        #include <stdio.h>
        #include <stdlib.h>
        #include <string.h>

        int main() {
            size_t size = 150 * 1024 * 1024; // 150 MB > 128 MB limit
            char *buf = (char *)(malloc)(size);
            if (buf) {
                memset(buf, 0xDD, size); // Force OS to commit pages
                printf("BYPASSED_LIMIT\\n");
            } else {
                printf("MALLOC_RETURNED_NULL\\n");
            }
            return 0;
        }
      `;

      const res = await judge.compileAndRun(code, '', 3000, 128);
      // The Job Object limits the process memory to 128MB.
      // Either OS fails allocation (returns NULL) or kills the process with MLE
      expect(res.stdout?.trim()).not.toContain('BYPASSED_LIMIT');
      expect([Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.ACCEPTED]).toContain(res.verdict);
      if (res.verdict === Verdict.ACCEPTED) {
        expect(res.stdout?.trim()).toBe('MALLOC_RETURNED_NULL');
      }
    }, 30000);
  });

  // =========================================================================
  // 3. CONCURRENCY: Parallel Invocations, Temp Isolation, No Collisions
  // =========================================================================
  describe('Concurrency & Isolation: Parallel Invocations', () => {
    it('should safely execute 8 concurrent compilation and execution requests without race conditions', async () => {
      const concurrentTasks = Array.from({ length: 8 }, (_, i) => {
        const val = i * 10 + 7;
        const code = `
          #include <stdio.h>
          int main() {
              int x = ${val};
              printf("CONCURRENT_RESULT_%d: %d\\n", ${i}, x * 2);
              return 0;
          }
        `;
        return { index: i, expected: `CONCURRENT_RESULT_${i}: ${val * 2}`, code };
      });

      const promises = concurrentTasks.map(async (task) => {
        const res = await judge.compileAndRun(task.code, '', 3000, 64);
        return { task, res };
      });

      const results = await Promise.all(promises);

      for (const { task, res } of results) {
        expect(res.verdict).toBe(Verdict.ACCEPTED);
        expect(res.stdout?.trim()).toBe(task.expected);
      }

      // Check for zero lingering temp folders
      const tmp = os.tmpdir();
      const lingering = fs.readdirSync(tmp).filter((f) => f.startsWith('logicq_judge_'));
      expect(lingering.length).toBe(0);
    }, 60000);
  });

  // =========================================================================
  // 4. ADVERSARIAL STRESS TESTING: Stderr flooding, Output Limits, TLE Watchdog
  // =========================================================================
  describe('Adversarial Stress Testing: Edge Cases & Watchdog Limits', () => {
    it('should quickly abort infinite loop in 50ms polling loop without waiting for 3s watchdog', async () => {
      const code = `
        #include <stdio.h>
        int main() {
            while (1) {}
            return 0;
        }
      `;

      const t0 = performance.now();
      const res = await judge.compileAndRun(code, '', 500, 64);
      const elapsedMs = performance.now() - t0;

      expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
      console.log(`[Watchdog TLE Test] elapsedMs = ${elapsedMs.toFixed(1)} ms for 500ms timeLimit`);
      // Since timeLimit is 500ms, the 50ms CPU poller should terminate it well under 2500ms
      expect(elapsedMs).toBeLessThan(2500);
    }, 15000);

    it('should handle large stdin (20,000 numbers) correctly without pipe deadlock', async () => {
      const code = `
        #include <stdio.h>
        int main() {
            int n;
            if (scanf("%d", &n) != 1) return 1;
            long long sum = 0;
            for (int i = 0; i < n; i++) {
                int val;
                if (scanf("%d", &val) == 1) {
                    sum += val;
                }
            }
            printf("%lld\\n", sum);
            return 0;
        }
      `;

      const count = 20000;
      const numbers = Array.from({ length: count }, () => 1);
      const stdinData = `${count}\n${numbers.join(' ')}\n`;

      const res = await judge.compileAndRun(code, stdinData, 3000, 64);
      expect(res.verdict).toBe(Verdict.ACCEPTED);
      expect(res.stdout?.trim()).toBe('20000');
    }, 30000);

    it('ADVERSARIAL: Stderr flood followed by runtime error / non-zero exit', async () => {
      // Program prints 3MB of stderr then exits with 42 (RUNTIME_ERROR).
      // Tests whether stderr buffer cap drops the __LQ_META_ sentinel and incorrectly returns ACCEPTED.
      const code = `
        #include <stdio.h>
        #include <stdlib.h>

        int main() {
            // Write 3 MB to stderr
            for (int i = 0; i < 60000; i++) {
                fprintf(stderr, "STDERR_FLOOD_LINE_%05d_AAAAAAAAAAAAAAAAAAAAA\\n", i);
            }
            exit(42);
        }
      `;

      const res = await judge.compileAndRun(code, '', 3000, 64);
      console.log(`[Stderr Flood Test] Verdict: ${res.verdict}, exitCode: ${res.exitCode}`);
      // Must NOT be ACCEPTED! It exited with code 42!
      expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
    }, 30000);
  });
});
