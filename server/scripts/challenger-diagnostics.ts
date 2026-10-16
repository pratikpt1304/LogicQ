import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { Verdict } from '../src/judge/judge.interface.js';
import fs from 'fs';
import os from 'os';

async function diagnose() {
  const judge = new LocalGccJudge();
  await judge.isAvailable();

  console.log('--- 1. DIAGNOSING CONCURRENT COMPILATION ERROR ---');
  const tasks = Array.from({ length: 8 }, (_, i) => {
    const code = `
      #include <stdio.h>
      int main() {
          printf("TASK %d\\n", ${i});
          return 0;
      }
    `;
    return judge.compileAndRun(code, '', 3000, 64);
  });
  const results = await Promise.all(tasks);
  results.forEach((r, i) => {
    console.log(`Task ${i}: verdict=${r.verdict}, compileOutput=${r.compileOutput?.trim()}`);
  });

  console.log('\n--- 2. DIAGNOSING MEMORY TRACKING & (malloc) BYPASS ---');
  // 30MB allocation
  const codeMem30 = `
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    int main() {
        size_t sz = 30 * 1024 * 1024;
        char *p = (char *)malloc(sz);
        if (p) {
            memset(p, 1, sz);
            printf("ALLOCATED\\n");
        }
        return 0;
    }
  `;
  const res30 = await judge.compileAndRun(codeMem30, '', 3000, 64);
  console.log('30MB Allocation Result:', {
    verdict: res30.verdict,
    memoryKb: res30.memoryKb,
    userTimeMs: res30.userTimeMs,
    kernelTimeMs: res30.kernelTimeMs,
    runtimeMs: res30.runtimeMs,
    stdout: res30.stdout?.trim(),
    stderr: res30.stderr?.trim(),
  });

  // 150MB allocation bypassing prelude macro
  const codeBypass = `
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    int main() {
        size_t sz = 150 * 1024 * 1024;
        char *p = (char *)(malloc)(sz);
        if (p) {
            memset(p, 1, sz);
            printf("BYPASSED\\n");
        } else {
            printf("NULL\\n");
        }
        return 0;
    }
  `;
  const resBypass = await judge.compileAndRun(codeBypass, '', 3000, 128);
  console.log('150MB Bypass Result:', {
    verdict: resBypass.verdict,
    memoryKb: resBypass.memoryKb,
    stdout: resBypass.stdout?.trim(),
    stderr: resBypass.stderr?.trim(),
  });

  console.log('\n--- 3. DIAGNOSING TLE / WATCHDOG TIMING ---');
  const t0 = performance.now();
  const resTLE = await judge.compileAndRun(`int main() { while(1); }`, '', 500, 64);
  console.log('TLE Result:', {
    verdict: resTLE.verdict,
    elapsedMs: performance.now() - t0,
    runtimeMs: resTLE.runtimeMs,
    userTimeMs: resTLE.userTimeMs,
  });
}

diagnose().catch(console.error);
