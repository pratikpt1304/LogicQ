import { describe, it, expect } from 'vitest';
import { LocalGccJudge } from '../src/judge/local-gcc.judge.js';
import { Verdict } from '../src/judge/judge.interface.js';

describe('Judge Adversarial Security & Malicious Program Test Suite', () => {
  const judge = new LocalGccJudge();

  it('MALICIOUS 1: Infinite loop is halted strictly within time limit (TLE)', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          volatile int count = 0;
          while (1) {
              count++;
          }
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 1000, 64);
    expect(res.verdict).toBe(Verdict.TIME_LIMIT_EXCEEDED);
  }, 30000);

  it('MALICIOUS 2: Stack memory bomb / unbounded recursion is terminated safely', async () => {
    const code = `
      #include <stdio.h>
      void recurse(int d) {
          char buffer[1024 * 64]; // 64KB per stack frame
          buffer[0] = (char)d;
          recurse(d + 1);
      }
      int main() {
          recurse(0);
          printf("SURVIVED_STACK_BOMB\\n");
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 1500, 64);
    // Must crash or be killed by watchdog, never completing normally
    expect(res.stdout?.trim()).not.toBe('SURVIVED_STACK_BOMB');
    expect([Verdict.RUNTIME_ERROR, Verdict.TIME_LIMIT_EXCEEDED]).toContain(res.verdict);
  }, 30000);

  it('MALICIOUS 3: File read exfiltration attempt of private server secrets is blocked', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          // Attempt directory traversal out of temp sandbox to read server .env or database
          FILE *f1 = fopen("../../.env", "r");
          FILE *f2 = fopen("../../../server/.env", "r");
          FILE *f3 = fopen("/etc/shadow", "r");
          FILE *f4 = fopen("/etc/passwd", "r");

          if (f1 || f2 || f3 || f4) {
              printf("EXFILTRATION_SUCCEEDED\\n");
              if (f1) fclose(f1);
              if (f2) fclose(f2);
              if (f3) fclose(f3);
              if (f4) fclose(f4);
          } else {
              printf("ACCESS_DENIED\\n");
          }
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 2000, 64);
    expect(res.stdout?.trim()).not.toBe('EXFILTRATION_SUCCEEDED');
    expect(res.stdout?.trim()).toBe('ACCESS_DENIED');
  }, 30000);

  it('MALICIOUS 4: Huge stdout output flood is truncated safely without crashing host', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          for (int i = 0; i < 500000; i++) {
              printf("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\\n");
          }
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 2000, 64);
    expect(res.stdout).toBeDefined();
    expect(res.stdout!.length).toBeLessThanOrEqual(2 * 1024 * 1024); // Capped at <= 2MB
  }, 30000);

  it('MALICIOUS 5: Compile bomb macro recursion is halted by compiler timeout', async () => {
    const code = `
      #define A(x) x x x x x x x x x x
      #define B(x) A(A(x))
      #define C(x) B(B(x))
      int main() {
          int z = 0;
          C(z++);
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 2000, 64);
    expect([Verdict.ACCEPTED, Verdict.COMPILE_ERROR, Verdict.TIME_LIMIT_EXCEEDED]).toContain(res.verdict);
  }, 30000);

  it('MALICIOUS 6: Division by zero arithmetic exception is caught and reported cleanly', async () => {
    const code = `
      #include <stdio.h>
      int main() {
          volatile int a = 100;
          volatile int b = 0;
          volatile int c = a / b;
          printf("RESULT: %d\\n", c);
          return 0;
      }
    `;
    const res = await judge.compileAndRun(code, '', 2000, 64);
    expect(res.verdict).toBe(Verdict.RUNTIME_ERROR);
    expect(res.stdout?.trim()).not.toContain('RESULT:');
  }, 30000);
});
