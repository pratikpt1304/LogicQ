import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { execSync } from 'child_process';

const judge = new LocalGccJudge();

async function run() {
  console.log('--- 1. Compile error in D2_MALLOC_SINGLE ---');
  const code1 = `
  #include <stdio.h>
  #include <stdlib.h>
  int main() {
    void *p = malloc(135ULL * 1024 * 1024);
    if (p) printf("ALLOC_OK\\n");
    return 0;
  }
  `;
  const comp1 = await judge.compile(code1);
  console.log('comp1 success:', comp1.success);
  if (!comp1.success) {
    console.log('comp1 output:', comp1.compileOutput);
  }

  console.log('\n--- 2. Compile error in D4_PAREN_MACRO_BYPASS ---');
  const code2 = `
  #include <stdio.h>
  #include <stdlib.h>
  int main() {
    char *p = (malloc)(135ULL * 1024 * 1024);
    if (p) {
      for (size_t i = 0; i < 135ULL * 1024 * 1024; i += 4096) p[i] = 1;
      printf("SURVIVED_ALLOC\\n");
    }
    return 0;
  }
  `;
  const comp2 = await judge.compile(code2);
  console.log('comp2 success:', comp2.success);
  if (!comp2.success) {
    console.log('comp2 output:', comp2.compileOutput);
  }

  console.log('\n--- 3. What happens in D2_BSS_ARRAY if we touch every page? ---');
  const code3 = `
  #include <stdio.h>
  static char big_bss[140ULL * 1024 * 1024];
  int main() {
    for (size_t i = 0; i < 140ULL * 1024 * 1024; i += 4096) {
      big_bss[i] = 1;
    }
    printf("BSS TOUCHED ALL PAGES\\n");
    return 0;
  }
  `;
  const res3 = await judge.compileAndRun(code3, '', 2000, 128);
  console.log('res3 verdict:', res3.verdict);
  console.log('res3 exitCode:', res3.exitCode);
  console.log('res3 memoryKb:', res3.memoryKb);
  console.log('res3 stderr:', res3.stderr);
  console.log('res3 stdout:', res3.stdout);

  console.log('\n--- 4. What happens in D2_RECURSION_STACK? ---');
  const code4 = `
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
  `;
  const res4 = await judge.compileAndRun(code4, '', 2000, 128);
  console.log('res4 verdict:', res4.verdict);
  console.log('res4 exitCode:', res4.exitCode);
  console.log('res4 memoryKb:', res4.memoryKb);
  console.log('res4 runtimeMs:', res4.runtimeMs);
  console.log('res4 userTimeMs:', res4.userTimeMs);
  console.log('res4 stderr:', res4.stderr);

  console.log('\n--- 5. Why are there orphaned processes after D1_SLEEP_LOOP? ---');
  const tasks = execSync('tasklist /FI "IMAGENAME eq solution.exe"').toString();
  console.log('Current solution.exe tasks:\n', tasks);
  const runners = execSync('tasklist /FI "IMAGENAME eq win-sandbox-runner.exe"').toString();
  console.log('Current win-sandbox-runner.exe tasks:\n', runners);
}

run().catch(console.error);
