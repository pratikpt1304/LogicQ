import { describe, it, expect } from 'vitest';
import { PlagiarismService } from '../src/services/plagiarism.service.js';

describe('PlagiarismService: Advanced Structural Similarity Detection', () => {
  it('identifies identical code with 100% similarity', () => {
    const code = `
      #include <stdio.h>
      int main() {
        int a = 10;
        int b = 20;
        printf("%d\\n", a + b);
        return 0;
      }
    `;

    const res = PlagiarismService.compareCodes(code, code);
    expect(res.similarity).toBeGreaterThanOrEqual(0.95);
    expect(res.riskLevel).toBe('CRITICAL');
  });

  it('detects plagiarism despite identifier/variable renaming (e.g. count -> total)', () => {
    const student1 = `
      #include <stdio.h>
      int main() {
        int count = 0;
        int limit = 10;
        int sum = 0;
        while (count < limit) {
          sum += count;
          count++;
        }
        printf("Sum is %d\\n", sum);
        return 0;
      }
    `;

    const student2 = `
      #include <stdio.h>
      int main() {
        int idx = 0;
        int maxVal = 10;
        int total = 0;
        while (idx < maxVal) {
          total += idx;
          idx++;
        }
        printf("Sum is %d\\n", total);
        return 0;
      }
    `;

    const res = PlagiarismService.compareCodes(student1, student2);
    expect(res.similarity).toBeGreaterThanOrEqual(0.85);
    expect(res.riskLevel).toBe('CRITICAL');
  });

  it('detects similarity despite comments and whitespace obfuscation', () => {
    const clean = `
      #include <stdio.h>
      int gcd(int a, int b) {
        while (b != 0) {
          int t = b;
          b = a % b;
          a = t;
        }
        return a;
      }
    `;

    const obfuscated = `
      #include <stdio.h>
      /* This is my own unique GCD algorithm */
      int gcd(int x, int y) {
        // Loop until zero
        while (y != 0) {
          int temp = y; // store y
          y = x % y;    // remainder
          x = temp;     // assign back
        }
        return x;
      }
    `;

    const res = PlagiarismService.compareCodes(clean, obfuscated);
    expect(res.similarity).toBeGreaterThanOrEqual(0.80);
    expect(['HIGH', 'CRITICAL']).toContain(res.riskLevel);
  });

  it('scores completely distinct algorithms with low similarity', () => {
    const bubbleSort = `
      #include <stdio.h>
      void sort(int arr[], int n) {
        for (int i = 0; i < n - 1; i++) {
          for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
              int temp = arr[j];
              arr[j] = arr[j + 1];
              arr[j + 1] = temp;
            }
          }
        }
      }
    `;

    const factorial = `
      #include <stdio.h>
      long long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
      int main() {
        printf("%lld\\n", factorial(10));
        return 0;
      }
    `;

    const res = PlagiarismService.compareCodes(bubbleSort, factorial);
    expect(res.similarity).toBeLessThan(0.40);
    expect(['CLEAN', 'LOW']).toContain(res.riskLevel);
  });
});
