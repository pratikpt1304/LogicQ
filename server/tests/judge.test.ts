import { describe, it, expect } from 'vitest';
import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { Verdict } from '../src/judge/judge.interface.js';

describe('LocalGccJudge', () => {
  const judge = new LocalGccJudge();

  it('should be available and detect GCC compiler', async () => {
    const isAvail = await judge.isAvailable();
    expect(isAvail).toBe(true);
  });

  it('should compile and execute valid C program successfully', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          printf("Hello LogicQ!\\n");
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 3000, 64);
    expect(res.verdict).toBe(Verdict.ACCEPTED);
    expect(res.stdout?.trim()).toBe('Hello LogicQ!');
  }, 15000);

  it('should process standard input (stdin) properly', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          int a, b;
          if (scanf("%d %d", &a, &b) == 2) {
              printf("%d\\n", a + b);
          }
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '15 27\n', 3000, 64);
    expect(res.verdict).toBe(Verdict.ACCEPTED);
    expect(res.stdout?.trim()).toBe('42');
  }, 15000);

  it('should return COMPILE_ERROR on syntax error', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          int x = // missing expression
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 3000, 64);
    expect(res.verdict).toBe(Verdict.COMPILE_ERROR);
    expect(res.compileOutput).toBeDefined();
  }, 15000);

  it('should return TIME_LIMIT_EXCEEDED on infinite loop', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          while (1) {}
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 1000, 64);
    expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
  }, 15000);

  it('should return RUNTIME_ERROR on division by zero', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          int a = 10;
          int b = 0;
          int c = a / b;
          printf("%d\\n", c);
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 2000, 64);
    expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
  }, 15000);
});
