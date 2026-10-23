export interface PracticeProblemDef {
  slug: string;
  moduleSlug: string;
  moduleOrder: number; // 1 to 10
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  tags: string[];
  description: string;
  starterCode: string;
  solutionCode: string;
  wrongSolution1: string;
  wrongSolution2: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  sampleTests: Array<{ input: string; expectedOutput: string }>;
  hiddenTests: Array<{ input: string; expectedOutput: string }>;
}

export const PRACTICE_MODULE_1_PROBLEMS: PracticeProblemDef[] = [
  // 1. Easy: Largest of Three Numbers (if-else)
  {
    slug: 'practice-c1-largest-of-three',
    moduleSlug: 'control-structures',
    moduleOrder: 1,
    title: 'Largest of Three Numbers',
    difficulty: 'EASY',
    category: 'Control Structures',
    tags: ['If-Else', 'Comparison', 'Basics'],
    description: `### Problem Description

Given three distinct or identical integers A, B, and C, determine the maximum value among them using conditional control flow.

### Input Format
A single line containing three space-separated integers A, B, C (−10⁹ ≤ A, B, C ≤ 10⁹).

### Output Format
Print the largest integer followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    
    // TODO: Determine maximum among a, b, c and print it
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) != 3) return 0;
    long long max = a;
    if (b > max) max = b;
    if (c > max) max = c;
    printf("%lld\\n", max);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) != 3) return 0;
    printf("%lld\\n", a > b ? a : b); // Ignores c
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) != 3) return 0;
    printf("%lld\\n", a < b ? a : b); // Calculates min
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '12 45 30\n', expectedOutput: '45\n' },
      { input: '-10 -5 -20\n', expectedOutput: '-5\n' },
    ],
    hiddenTests: [
      { input: '0 0 0\n', expectedOutput: '0\n' },
      { input: '1000000000 500000000 -1000000000\n', expectedOutput: '1000000000\n' },
      { input: '-999999999 -999999999 -999999999\n', expectedOutput: '-999999999\n' },
      { input: '42 42 10\n', expectedOutput: '42\n' },
      { input: '10 42 42\n', expectedOutput: '42\n' },
      { input: '-50 -50 0\n', expectedOutput: '0\n' },
      { input: '7 9 2\n', expectedOutput: '9\n' },
      { input: '-1 0 1\n', expectedOutput: '1\n' },
    ],
  },

  // 2. Easy: Four-Operation Arithmetic Calculator (switch)
  {
    slug: 'practice-c1-arithmetic-calculator-switch',
    moduleSlug: 'control-structures',
    moduleOrder: 2,
    title: 'Arithmetic Calculator with Switch',
    difficulty: 'EASY',
    category: 'Control Structures',
    tags: ['Switch-Case', 'Arithmetic', 'Basics'],
    description: `### Problem Description

Given two integers X and Y and an operator character OP ∈ {'+', '-', '*', '/'}, evaluate the arithmetic expression using a \`switch\` statement. For integer division, output integer quotient truncated towards zero. If division by zero is attempted (OP = '/' \ and  Y = 0), output \`ERROR\`.

### Input Format
A single line containing: integer X, character OP, and integer Y separated by spaces.

### Output Format
Print the computed integer result or \`ERROR\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int x, y;
    char op;
    scanf("%d %c %d", &x, &op, &y);
    
    // TODO: Evaluate using switch(op) and print result (or ERROR for division by 0)
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long x, y;
    char op;
    if (scanf("%lld %c %lld", &x, &op, &y) != 3) return 0;
    switch (op) {
        case '+': printf("%lld\\n", x + y); break;
        case '-': printf("%lld\\n", x - y); break;
        case '*': printf("%lld\\n", x * y); break;
        case '/':
            if (y == 0) {
                printf("ERROR\\n");
            } else {
                printf("%lld\\n", x / y);
            }
            break;
        default:
            printf("ERROR\\n");
            break;
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long x, y;
    char op;
    if (scanf("%lld %c %lld", &x, &op, &y) != 3) return 0;
    printf("%lld\\n", x + y); // Always adds
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long x, y;
    char op;
    if (scanf("%lld %c %lld", &x, &op, &y) != 3) return 0;
    if (op == '/') printf("%lld\\n", x / y); // Doesn't handle div by 0
    else printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '25 + 17\n', expectedOutput: '42\n' },
      { input: '100 / 0\n', expectedOutput: 'ERROR\n' },
    ],
    hiddenTests: [
      { input: '50 - 80\n', expectedOutput: '-30\n' },
      { input: '12 * 12\n', expectedOutput: '144\n' },
      { input: '7 / 2\n', expectedOutput: '3\n' },
      { input: '-7 / 2\n', expectedOutput: '-3\n' },
      { input: '0 * 999\n', expectedOutput: '0\n' },
      { input: '0 / 5\n', expectedOutput: '0\n' },
      { input: '-15 / 0\n', expectedOutput: 'ERROR\n' },
      { input: '1000000000 - 500000000\n', expectedOutput: '500000000\n' },
    ],
  },

  // 3. Easy: Sum of Digits of an Integer (loop)
  {
    slug: 'practice-c1-sum-of-digits-loop',
    moduleSlug: 'control-structures',
    moduleOrder: 3,
    title: 'Sum of Digits of an Integer',
    difficulty: 'EASY',
    category: 'Control Structures',
    tags: ['Loops', 'Modulo', 'Math'],
    description: `### Problem Description

Given an integer N (positive, negative, or zero), compute the sum of all digits in its base-10 decimal representation.

### Input Format
A single line containing integer N (−2 × 10⁹ ≤ N ≤ 2 × 10⁹).

### Output Format
Print the non-negative sum of its decimal digits followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    scanf("%d", &n);
    
    // TODO: Compute and print the sum of digits of n
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    if (n < 0) n = -n;
    long long sum = 0;
    if (n == 0) {
        printf("0\\n");
        return 0;
    }
    while (n > 0) {
        sum += (n % 10);
        n /= 10;
    }
    printf("%lld\\n", sum);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", n % 10); // Only last digit
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", n); // Prints n as is
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '12345\n', expectedOutput: '15\n' },
      { input: '-907\n', expectedOutput: '16\n' },
    ],
    hiddenTests: [
      { input: '0\n', expectedOutput: '0\n' },
      { input: '9\n', expectedOutput: '9\n' },
      { input: '1000000\n', expectedOutput: '1\n' },
      { input: '999999999\n', expectedOutput: '81\n' },
      { input: '-1000000000\n', expectedOutput: '1\n' },
      { input: '2147483647\n', expectedOutput: '46\n' },
      { input: '555\n', expectedOutput: '15\n' },
      { input: '-44\n', expectedOutput: '8\n' },
    ],
  },

  // 4. Easy: Formatted Multiplication Table
  {
    slug: 'practice-c1-multiplication-table',
    moduleSlug: 'control-structures',
    moduleOrder: 4,
    title: 'Formatted Multiplication Table',
    difficulty: 'EASY',
    category: 'Control Structures',
    tags: ['Loops', 'Formatting', 'Basics'],
    description: `### Problem Description

Given two integers N and K, print the multiplication table of N from 1 through K in the exact format:
\`N x i = Result\`

### Input Format
A single line containing integers N and K (1 ≤ N ≤ 1000, 1 ≤ K ≤ 100).

### Output Format
Print K lines, each formatted as \`N x i = (N*i)\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    
    // TODO: Print multiplication table
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    for (int i = 1; i <= k; i++) {
        printf("%d x %d = %d\\n", n, i, n * i);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    for (int i = 0; i < k; i++) printf("%d x %d = %d\\n", n, i, n * i); // 0-indexed error
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    printf("%d x %d = %d\\n", n, k, n * k); // Prints only last row
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '7 3\n', expectedOutput: '7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n' },
      { input: '12 2\n', expectedOutput: '12 x 1 = 12\n12 x 2 = 24\n' },
    ],
    hiddenTests: [
      { input: '1 1\n', expectedOutput: '1 x 1 = 1\n' },
      { input: '5 5\n', expectedOutput: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n' },
      { input: '10 4\n', expectedOutput: '10 x 1 = 10\n10 x 2 = 20\n10 x 3 = 30\n10 x 4 = 40\n' },
      { input: '99 1\n', expectedOutput: '99 x 1 = 99\n' },
      { input: '2 6\n', expectedOutput: '2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n' },
      { input: '100 2\n', expectedOutput: '100 x 1 = 100\n100 x 2 = 200\n' },
      { input: '3 3\n', expectedOutput: '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n' },
      { input: '15 2\n', expectedOutput: '15 x 1 = 15\n15 x 2 = 30\n' },
    ],
  },

  // 5. Medium: Count Primes up to N (Sieve / Trial Division)
  {
    slug: 'practice-c1-count-primes-up-to-n',
    moduleSlug: 'control-structures',
    moduleOrder: 5,
    title: 'Prime Numbers Counter up to N',
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    tags: ['Nested Loops', 'Primes', 'Number Theory'],
    description: `### Problem Description

Given an integer N, count how many prime numbers exist in the inclusive range [2, N]. A prime number is an integer greater than 1 with no positive divisors other than 1 and itself.

### Input Format
A single line containing integer N (1 ≤ N ≤ 2 × 10⁵).

### Output Format
Print the total count of primes ≤ N followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Count primes in [2, n]
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdbool.h>

#define MAX 200005
bool is_prime[MAX];

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    if (n < 2) {
        printf("0\\n");
        return 0;
    }
    for (int i = 2; i <= n; i++) is_prime[i] = true;
    for (int p = 2; p * p <= n; p++) {
        if (is_prime[p]) {
            for (int i = p * p; i <= n; i += p)
                is_prime[i] = false;
        }
    }
    int count = 0;
    for (int i = 2; i <= n; i++) {
        if (is_prime[i]) count++;
    }
    printf("%d\\n", count);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%d\\n", n / 2); // Naive half-odds guess
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("1\\n"); // Hardcoded constant
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '10\n', expectedOutput: '4\n' },
      { input: '25\n', expectedOutput: '9\n' },
    ],
    hiddenTests: [
      { input: '1\n', expectedOutput: '0\n' },
      { input: '2\n', expectedOutput: '1\n' },
      { input: '3\n', expectedOutput: '2\n' },
      { input: '100\n', expectedOutput: '25\n' },
      { input: '1000\n', expectedOutput: '168\n' },
      { input: '10000\n', expectedOutput: '1229\n' },
      { input: '50000\n', expectedOutput: '5133\n' },
      { input: '200000\n', expectedOutput: '17984\n' },
    ],
  },

  // 6. Medium: Number Reversal and Palindrome Check
  {
    slug: 'practice-c1-number-palindrome-reversal',
    moduleSlug: 'control-structures',
    moduleOrder: 6,
    title: 'Number Reversal & Palindrome Check',
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    tags: ['Loops', 'Palindrome', 'Math'],
    description: `### Problem Description

Given a non-negative integer N, compute its reversed value R (with leading zeros stripped), and determine whether N is a decimal palindrome. Output \`R PALINDROME\` if N = R, or \`R NOT_PALINDROME\` otherwise.

### Input Format
A single line containing integer N (0 ≤ N ≤ 10¹⁴).

### Output Format
Print the reversed number and status separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    
    // TODO: Reverse number and check palindrome
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long orig = n;
    long long rev = 0;
    while (n > 0) {
        rev = rev * 10 + (n % 10);
        n /= 10;
    }
    if (orig == rev) {
        printf("%lld PALINDROME\\n", rev);
    } else {
        printf("%lld NOT_PALINDROME\\n", rev);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld PALINDROME\\n", n); // Always says palindrome
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("0 NOT_PALINDROME\\n"); // Always 0
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '12321\n', expectedOutput: '12321 PALINDROME\n' },
      { input: '12340\n', expectedOutput: '4321 NOT_PALINDROME\n' },
    ],
    hiddenTests: [
      { input: '0\n', expectedOutput: '0 PALINDROME\n' },
      { input: '7\n', expectedOutput: '7 PALINDROME\n' },
      { input: '10\n', expectedOutput: '1 NOT_PALINDROME\n' },
      { input: '1001\n', expectedOutput: '1001 PALINDROME\n' },
      { input: '12345678987654321\n', expectedOutput: '12345678987654321 PALINDROME\n' },
      { input: '9876543210\n', expectedOutput: '123456789 NOT_PALINDROME\n' },
      { input: '11\n', expectedOutput: '11 PALINDROME\n' },
      { input: '505\n', expectedOutput: '505 PALINDROME\n' },
    ],
  },

  // 7. Medium: Number Pyramid Pattern
  {
    slug: 'practice-c1-number-pyramid-pattern',
    moduleSlug: 'control-structures',
    moduleOrder: 7,
    title: 'Mirrored Number Pyramid Pattern',
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    tags: ['Nested Loops', 'Patterns', 'Printing'],
    description: `### Problem Description

Given an integer height H, print a centered mirrored number pyramid of height H.
For row r from 1 to H:
- Print 2 × (H - r) leading spaces.
- Print increasing numbers from 1 to r, space-separated.
- Print decreasing numbers from r - 1 down to 1, space-separated.

Do not print trailing spaces at the end of lines.

### Input Format
A single line containing integer H (1 ≤ H ≤ 9).

### Output Format
Print the H pyramid lines.`,
    starterCode: `#include <stdio.h>

int main() {
    int h;
    if (scanf("%d", &h) != 1) return 0;
    
    // TODO: Print mirrored pyramid
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int h;
    if (scanf("%d", &h) != 1) return 0;
    for (int r = 1; r <= h; r++) {
        for (int s = 0; s < 2 * (h - r); s++) putchar(' ');
        for (int i = 1; i <= r; i++) {
            printf("%d", i);
            if (i < r || r > 1) putchar(' ');
        }
        for (int i = r - 1; i >= 1; i--) {
            printf("%d", i);
            if (i > 1) putchar(' ');
        }
        putchar('\\n');
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int h;
    if (scanf("%d", &h) != 1) return 0;
    for (int i = 1; i <= h; i++) printf("%d\\n", i); // Plain lines
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int h;
    if (scanf("%d", &h) != 1) return 0;
    for (int r = 1; r <= h; r++) {
        for (int i = 1; i <= r; i++) printf("%d ", i);
        printf("\\n");
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '3\n', expectedOutput: '    1\n  1 2 1\n1 2 3 2 1\n' },
      { input: '1\n', expectedOutput: '1\n' },
    ],
    hiddenTests: [
      { input: '2\n', expectedOutput: '  1\n1 2 1\n' },
      { input: '4\n', expectedOutput: '      1\n    1 2 1\n  1 2 3 2 1\n1 2 3 4 3 2 1\n' },
      { input: '5\n', expectedOutput: '        1\n      1 2 1\n    1 2 3 2 1\n  1 2 3 4 3 2 1\n1 2 3 4 5 4 3 2 1\n' },
      { input: '6\n', expectedOutput: '          1\n        1 2 1\n      1 2 3 2 1\n    1 2 3 4 3 2 1\n  1 2 3 4 5 4 3 2 1\n1 2 3 4 5 6 5 4 3 2 1\n' },
      { input: '7\n', expectedOutput: '            1\n          1 2 1\n        1 2 3 2 1\n      1 2 3 4 3 2 1\n    1 2 3 4 5 4 3 2 1\n  1 2 3 4 5 6 5 4 3 2 1\n1 2 3 4 5 6 7 6 5 4 3 2 1\n' },
      { input: '8\n', expectedOutput: '              1\n            1 2 1\n          1 2 3 2 1\n        1 2 3 4 3 2 1\n      1 2 3 4 5 4 3 2 1\n    1 2 3 4 5 6 5 4 3 2 1\n  1 2 3 4 5 6 7 6 5 4 3 2 1\n1 2 3 4 5 6 7 8 7 6 5 4 3 2 1\n' },
      { input: '9\n', expectedOutput: '                1\n              1 2 1\n            1 2 3 2 1\n          1 2 3 4 3 2 1\n        1 2 3 4 5 4 3 2 1\n      1 2 3 4 5 6 5 4 3 2 1\n    1 2 3 4 5 6 7 6 5 4 3 2 1\n  1 2 3 4 5 6 7 8 7 6 5 4 3 2 1\n1 2 3 4 5 6 7 8 9 8 7 6 5 4 3 2 1\n' },
      { input: '3\n', expectedOutput: '    1\n  1 2 1\n1 2 3 2 1\n' },
    ],
  },

  // 8. Medium: Greatest Common Divisor & Least Common Multiple
  {
    slug: 'practice-c1-gcd-and-lcm-calculator',
    moduleSlug: 'control-structures',
    moduleOrder: 8,
    title: 'GCD and LCM Calculator',
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    tags: ['Euclidean Algorithm', 'Math', 'Loops'],
    description: `### Problem Description

Given two positive integers A and B, compute their Greatest Common Divisor (GCD) using the Euclidean algorithm and their Least Common Multiple (LCM).

### Input Format
A single line containing two space-separated integers A and B (1 ≤ A, B ≤ 2 × 10⁹).

### Output Format
Print GCD and LCM separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    
    // TODO: Compute GCD and LCM
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long gcd(long long a, long long b) {
    while (b != 0) {
        long long t = b;
        b = a % b;
        a = t;
    }
    return a;
}

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    long long g = gcd(a, b);
    long long l = (a / g) * b;
    printf("%lld %lld\\n", g, l);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    printf("%lld %lld\\n", 1LL, a * b); // Assumes coprime
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    printf("%lld %lld\\n", a, b); // Outputs input
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '24 36\n', expectedOutput: '12 72\n' },
      { input: '17 19\n', expectedOutput: '1 323\n' },
    ],
    hiddenTests: [
      { input: '1 1\n', expectedOutput: '1 1\n' },
      { input: '100 100\n', expectedOutput: '100 100\n' },
      { input: '123456 654321\n', expectedOutput: '3 26926617792\n' },
      { input: '1000000000 2000000000\n', expectedOutput: '1000000000 2000000000\n' },
      { input: '25 15\n', expectedOutput: '5 75\n' },
      { input: '81 27\n', expectedOutput: '27 81\n' },
      { input: '7 14\n', expectedOutput: '7 14\n' },
      { input: '999999937 999999929\n', expectedOutput: '1 999999866000004473\n' },
    ],
  },

  // 9. Hard: Longest Collatz Chain under N
  {
    slug: 'practice-c1-longest-collatz-chain',
    moduleSlug: 'control-structures',
    moduleOrder: 9,
    title: 'Longest Collatz Chain Under N',
    difficulty: 'HARD',
    category: 'Control Structures',
    tags: ['Collatz Conjecture', 'Loops', 'Optimization'],
    description: `### Problem Description

The Collatz sequence for a positive integer x is defined as:
- If x is even: x → x / 2
- If x is odd: x → 3x + 1
The chain stops when x = 1. The length of the chain is the number of steps taken to reach 1.

Given an integer N, find the starting integer S ≤ N that produces the maximum number of steps. If there are ties, output the smallest starting integer S.

### Input Format
A single line containing integer N (1 ≤ N ≤ 10⁵).

### Output Format
Print two integers separated by a space: the optimal starting number S and its chain step count, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    
    // TODO: Find starting integer S <= n with max steps
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long get_steps(long long x) {
    long long steps = 0;
    while (x > 1) {
        if (x % 2 == 0) x /= 2;
        else x = 3 * x + 1;
        steps++;
    }
    return steps;
}

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long best_start = 1;
    long long max_steps = 0;
    for (long long i = 1; i <= n; i++) {
        long long steps = get_steps(i);
        if (steps > max_steps) {
            max_steps = steps;
            best_start = i;
        }
    }
    printf("%lld %lld\\n", best_start, max_steps);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld 0\\n", n); // Always outputs n with 0 steps
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("1 0\\n"); // Always 1
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      { input: '10\n', expectedOutput: '9 19\n' },
      { input: '20\n', expectedOutput: '18 20\n' },
    ],
    hiddenTests: [
      { input: '1\n', expectedOutput: '1 0\n' },
      { input: '2\n', expectedOutput: '2 1\n' },
      { input: '50\n', expectedOutput: '27 111\n' },
      { input: '100\n', expectedOutput: '97 118\n' },
      { input: '1000\n', expectedOutput: '871 178\n' },
      { input: '5000\n', expectedOutput: '3711 237\n' },
      { input: '10000\n', expectedOutput: '6171 261\n' },
      { input: '50000\n', expectedOutput: '35655 323\n' },
    ],
  },

  // 10. Hard: Trailing Zeros in N! Factorial
  {
    slug: 'practice-c1-trailing-zeros-factorial',
    moduleSlug: 'control-structures',
    moduleOrder: 10,
    title: 'Trailing Zeros of Factorial for Large N',
    difficulty: 'HARD',
    category: 'Control Structures',
    tags: ['Legendre Formula', 'Math', 'Loops'],
    description: `### Problem Description

Given a non-negative integer N, calculate the exact number of trailing zeros in the decimal value of N! (N factorial). Since N can be up to 10¹⁴, you must compute this efficiently in O(log₅ N) time without computing the actual factorial.

### Input Format
A single line containing integer N (0 ≤ N ≤ 10¹⁴).

### Output Format
Print the count of trailing zeros followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    
    // TODO: Calculate Legendre formula count of factor 5
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long count = 0;
    while (n >= 5) {
        count += (n / 5);
        n /= 5;
    }
    printf("%lld\\n", count);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", n / 5); // Misses higher powers of 5
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", n / 10); // Divides by 10
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      { input: '25\n', expectedOutput: '6\n' },
      { input: '100\n', expectedOutput: '24\n' },
    ],
    hiddenTests: [
      { input: '0\n', expectedOutput: '0\n' },
      { input: '4\n', expectedOutput: '0\n' },
      { input: '5\n', expectedOutput: '1\n' },
      { input: '125\n', expectedOutput: '31\n' },
      { input: '1000\n', expectedOutput: '249\n' },
      { input: '1000000000\n', expectedOutput: '249999998\n' },
      { input: '1000000000000\n', expectedOutput: '249999999997\n' },
      { input: '100000000000000\n', expectedOutput: '24999999999998\n' },
    ],
  },
  {
    slug: "practice-c1-leap-year-calendar-checker",
    moduleSlug: "control-structures",
    moduleOrder: 11,
    title: "Leap Year Calendar Checker",
    difficulty: "EASY",
    category: "Control Structures",
    tags: ["Conditionals","Modulo","Calendar","Logic"],
    description: `### Problem Description

Write a C program that determines whether a given Gregorian calendar year \$Y\$ is a leap year.
A year is a leap year if:
- It is divisible by \$4\$, **and**
- It is **not** divisible by \$100\$, **unless** it is also divisible by \$400\$.

Print \`LEAP YEAR\` if it satisfies the condition; otherwise, print \`NOT LEAP YEAR\`.

### Input Format
A single line containing an integer \$Y\$ (\$1 \\le Y \\le 10^9\$).

### Output Format
Print \`LEAP YEAR\` or \`NOT LEAP YEAR\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long year;
    if (scanf("%lld", &year) != 1) return 0;
    
    // TODO: Determine leap year condition
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long year;
    if (scanf("%lld", &year) != 1) return 0;
    if ((year % 400 == 0) || (year % 4 == 0 && year % 100 != 0)) {
        printf("LEAP YEAR\\n");
    } else {
        printf("NOT LEAP YEAR\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long year;
    if (scanf("%lld", &year) != 1) return 0;
    if (year % 4 == 0) printf("LEAP YEAR\\n"); // Fails century rule
    else printf("NOT LEAP YEAR\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long year;
    if (scanf("%lld", &year) != 1) return 0;
    if (year % 400 == 0) printf("LEAP YEAR\\n");
    else printf("NOT LEAP YEAR\\n"); // Misses normal leap years
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "2024\n",
                "expectedOutput": "LEAP YEAR\n"
          },
          {
                "input": "1900\n",
                "expectedOutput": "NOT LEAP YEAR\n"
          }
    ],
    hiddenTests: [
          {
                "input": "2000\n",
                "expectedOutput": "LEAP YEAR\n"
          },
          {
                "input": "2023\n",
                "expectedOutput": "NOT LEAP YEAR\n"
          },
          {
                "input": "1600\n",
                "expectedOutput": "LEAP YEAR\n"
          },
          {
                "input": "2100\n",
                "expectedOutput": "NOT LEAP YEAR\n"
          },
          {
                "input": "2400\n",
                "expectedOutput": "LEAP YEAR\n"
          }
    ],
  },
  {
    slug: "practice-c1-grade-classifier-nested-if",
    moduleSlug: "control-structures",
    moduleOrder: 12,
    title: "Student Grade Percentage Classifier",
    difficulty: "EASY",
    category: "Control Structures",
    tags: ["If-Else","Branching","Ranges","Grades"],
    description: `### Problem Description

Given a student's total marks percentage \$M\$ (\$0 \\le M \\le 100\$), classify their grade as follows:
- \$M \\ge 90\$: \`Grade A\`
- \$80 \\le M < 90\$: \`Grade B\`
- \$70 \\le M < 80\$: \`Grade C\`
- \$60 \\le M < 70\$: \`Grade D\`
- \$M < 60\$: \`Grade F\`

### Input Format
A single floating-point number \$M\$ (\$0.0 \\le M \\le 100.0\$).

### Output Format
Print the classified grade string followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    double marks;
    if (scanf("%lf", &marks) != 1) return 0;
    
    // TODO: Classify grade
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    double marks;
    if (scanf("%lf", &marks) != 1) return 0;
    if (marks >= 90.0) {
        printf("Grade A\\n");
    } else if (marks >= 80.0) {
        printf("Grade B\\n");
    } else if (marks >= 70.0) {
        printf("Grade C\\n");
    } else if (marks >= 60.0) {
        printf("Grade D\\n");
    } else {
        printf("Grade F\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    double marks;
    if (scanf("%lf", &marks) != 1) return 0;
    if (marks > 90.0) printf("Grade A\\n"); // Strict inequality bug
    else printf("Grade B\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    double marks;
    if (scanf("%lf", &marks) != 1) return 0;
    printf("Grade A\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "92.5\n",
                "expectedOutput": "Grade A\n"
          },
          {
                "input": "74.0\n",
                "expectedOutput": "Grade C\n"
          }
    ],
    hiddenTests: [
          {
                "input": "90.0\n",
                "expectedOutput": "Grade A\n"
          },
          {
                "input": "89.9\n",
                "expectedOutput": "Grade B\n"
          },
          {
                "input": "60.0\n",
                "expectedOutput": "Grade D\n"
          },
          {
                "input": "59.9\n",
                "expectedOutput": "Grade F\n"
          },
          {
                "input": "0.0\n",
                "expectedOutput": "Grade F\n"
          }
    ],
  },
  {
    slug: "practice-c1-factorial-iterative-loop",
    moduleSlug: "control-structures",
    moduleOrder: 13,
    title: "Factorial Iterative Calculator",
    difficulty: "EASY",
    category: "Control Structures",
    tags: ["Loops","Factorial","Math","Iteration"],
    description: `### Problem Description

Given a non-negative integer \$N\$ (\$0 \\le N \\le 20\$), calculate \$N!\$ (factorial of \$N\$) using an iterative \`for\` or \`while\` loop.
Recall that \$0! = 1\$. Use a 64-bit integer (\`long long\` or \`unsigned long long\`) to prevent arithmetic overflow.

### Input Format
A single non-negative integer \$N\$ (\$0 \\le N \\le 20\$).

### Output Format
Print the factorial value followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Calculate factorial using loop
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    unsigned long long fact = 1;
    for (int i = 2; i <= n; i++) {
        fact *= (unsigned long long)i;
    }
    printf("%llu\\n", fact);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    int fact = 1;
    for (int i = 1; i <= n; i++) fact *= i; // 32-bit integer overflows for n > 12
    printf("%d\\n", fact);
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    if (n == 0) printf("0\\n"); // Fails 0! = 1
    else printf("1\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "5\n",
                "expectedOutput": "120\n"
          },
          {
                "input": "0\n",
                "expectedOutput": "1\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "10\n",
                "expectedOutput": "3628800\n"
          },
          {
                "input": "15\n",
                "expectedOutput": "1307674368000\n"
          },
          {
                "input": "20\n",
                "expectedOutput": "2432902008176640000\n"
          }
    ],
  },
  {
    slug: "practice-c1-sum-of-even-numbers-up-to-n",
    moduleSlug: "control-structures",
    moduleOrder: 14,
    title: "Sum of Even Numbers up to N",
    difficulty: "EASY",
    category: "Control Structures",
    tags: ["Loops","Accumulator","Arithmetic","Even"],
    description: `### Problem Description

Given a positive integer \$N\$, calculate the sum of all even integers from \$1\$ up to \$N\$ inclusive (\$2 + 4 + 6 + \\dots \\le N\$).

### Input Format
A single integer \$N\$ (\$1 \\le N \\le 10^6\$).

### Output Format
Print the total sum followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    
    // TODO: Calculate sum of all even integers <= n
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long sum = 0;
    long long k = n / 2;
    sum = k * (k + 1);
    printf("%lld\\n", sum);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    scanf("%lld", &n);
    printf("%lld\\n", n * (n + 1) / 2); // Sum of all numbers, not even
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    scanf("%lld", &n);
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "10\n",
                "expectedOutput": "30\n"
          },
          {
                "input": "5\n",
                "expectedOutput": "6\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "2\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "100\n",
                "expectedOutput": "2550\n"
          },
          {
                "input": "1000000\n",
                "expectedOutput": "250000500000\n"
          }
    ],
  },
  {
    slug: "practice-c1-fibonacci-sequence-generator",
    moduleSlug: "control-structures",
    moduleOrder: 15,
    title: "First N Fibonacci Numbers Generator",
    difficulty: "MEDIUM",
    category: "Control Structures",
    tags: ["Loops","Fibonacci","Sequence","State Update"],
    description: `### Problem Description

Given an integer \$N\$ (\$1 \\le N \\le 45\$), print the first \$N\$ terms of the Fibonacci sequence separated by a single space.
The sequence starts with \$F_1 = 0\$ and \$F_2 = 1\$, and \$F_i = F_{i-1} + F_{i-2}\$ for \$i \\ge 3\$.

### Input Format
A single integer \$N\$ (\$1 \\le N \\le 45\$).

### Output Format
Print the first \$N\$ Fibonacci numbers separated by a single space, followed by a newline. Do not print a trailing space at the end of the line.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Generate first N Fibonacci numbers
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    if (n == 1) {
        printf("0\\n");
        return 0;
    }
    long long a = 0, b = 1;
    printf("%lld %lld", a, b);
    for (int i = 3; i <= n; i++) {
        long long c = a + b;
        printf(" %lld", c);
        a = b;
        b = c;
    }
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    printf("0 1 1 2 3\\n"); // Hardcoded sequence
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    long long a = 1, b = 1; // Starts at 1 1 instead of 0 1
    for (int i = 1; i <= n; i++) {
        printf("%lld ", a);
        long long c = a + b;
        a = b; b = c;
    }
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "5\n",
                "expectedOutput": "0 1 1 2 3\n"
          },
          {
                "input": "1\n",
                "expectedOutput": "0\n"
          }
    ],
    hiddenTests: [
          {
                "input": "2\n",
                "expectedOutput": "0 1\n"
          },
          {
                "input": "7\n",
                "expectedOutput": "0 1 1 2 3 5 8\n"
          },
          {
                "input": "10\n",
                "expectedOutput": "0 1 1 2 3 5 8 13 21 34\n"
          },
          {
                "input": "15\n",
                "expectedOutput": "0 1 1 2 3 5 8 13 21 34 55 89 144 233 377\n"
          }
    ],
  },
  {
    slug: "practice-c1-armstrong-number-verifier",
    moduleSlug: "control-structures",
    moduleOrder: 16,
    title: "Armstrong Number Verifier",
    difficulty: "MEDIUM",
    category: "Control Structures",
    tags: ["Loops","Digits","Math","Powers"],
    description: `### Problem Description

An Armstrong number (narcissistic number) is a number that is equal to the sum of its own digits each raised to the power of the total number of digits.
For example:
- \$153\$ has \$3\$ digits: \$1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153\$ (Armstrong).
- \$1634\$ has \$4\$ digits: \$1^4 + 6^4 + 3^4 + 4^4 = 1 + 1296 + 81 + 256 = 1634\$ (Armstrong).

Given an integer \$N\$ (\$1 \\le N \\le 10^9\$), print \`ARMSTRONG\` if it is an Armstrong number; otherwise, print \`NOT ARMSTRONG\`.

### Input Format
A single integer \$N\$.

### Output Format
Print \`ARMSTRONG\` or \`NOT ARMSTRONG\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    
    // TODO: Verify Armstrong number condition
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

static long long power(long long base, int exp) {
    long long res = 1;
    for (int i = 0; i < exp; i++) res *= base;
    return res;
}

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long temp = n;
    int digits = 0;
    while (temp > 0) {
        digits++;
        temp /= 10;
    }
    temp = n;
    long long sum = 0;
    while (temp > 0) {
        int d = temp % 10;
        sum += power(d, digits);
        temp /= 10;
    }
    if (sum == n) {
        printf("ARMSTRONG\\n");
    } else {
        printf("NOT ARMSTRONG\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long n;
    scanf("%lld", &n);
    if (n == 153 || n == 370 || n == 371) printf("ARMSTRONG\\n");
    else printf("NOT ARMSTRONG\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long n;
    scanf("%lld", &n);
    printf("ARMSTRONG\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "153\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "123\n",
                "expectedOutput": "NOT ARMSTRONG\n"
          }
    ],
    hiddenTests: [
          {
                "input": "9\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "371\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "1634\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "9474\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "54748\n",
                "expectedOutput": "ARMSTRONG\n"
          },
          {
                "input": "100\n",
                "expectedOutput": "NOT ARMSTRONG\n"
          }
    ],
  },
  {
    slug: "practice-c1-binary-to-decimal-converter",
    moduleSlug: "control-structures",
    moduleOrder: 17,
    title: "Binary String to Decimal Converter",
    difficulty: "MEDIUM",
    category: "Control Structures",
    tags: ["Bitwise","Base Conversion","Loops","Parsing"],
    description: `### Problem Description

Given a string representing a non-empty binary number \$B\$ (up to 32 bits), convert it into its unsigned decimal integer representation using iterative bit manipulation or power accumulator without using standard conversion library functions like \`strtol\`.

### Input Format
A single string of '0' and '1' characters (length \$1 \\le |B| \\le 32\$).

### Output Format
Print the decimal value followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    char binary[35];
    if (scanf("%34s", binary) != 1) return 0;
    
    // TODO: Convert binary string to decimal integer
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    char binary[35];
    if (scanf("%34s", binary) != 1) return 0;
    unsigned long long decimal = 0;
    for (int i = 0; binary[i] != '\\0'; i++) {
        decimal = (decimal << 1) + (binary[i] - '0');
    }
    printf("%llu\\n", decimal);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    char binary[35];
    scanf("%34s", binary);
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    char binary[35];
    scanf("%34s", binary);
    printf("%d\\n", binary[0] - '0');
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "1101\n",
                "expectedOutput": "13\n"
          },
          {
                "input": "10000\n",
                "expectedOutput": "16\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "1\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "11111111\n",
                "expectedOutput": "255\n"
          },
          {
                "input": "1010101010\n",
                "expectedOutput": "682\n"
          },
          {
                "input": "1111111111111111\n",
                "expectedOutput": "65535\n"
          }
    ],
  },
  {
    slug: "practice-c1-diamond-star-pattern",
    moduleSlug: "control-structures",
    moduleOrder: 18,
    title: "Centered Diamond Star Pattern",
    difficulty: "MEDIUM",
    category: "Control Structures",
    tags: ["Nested Loops","Pattern Printing","Formatting"],
    description: `### Problem Description

Given an odd integer \$N\$ (\$1 \\le N \\le 25\$), print a centered diamond star pattern of height \$N\$.
For \$N = 5\$, the diamond has \$3\$ upper rows and \$2\$ lower rows:
\`\`\`
  *
 ***
*****
 ***
  *
\`\`\`
Each row consists of leading spaces followed by asterisks. Do not output any trailing spaces after the asterisks on any line.

### Input Format
A single odd integer \$N\$ (\$1 \\le N \\le 25\$).

### Output Format
Print the \$N\$-line diamond pattern followed by a newline on each line.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Print centered diamond pattern
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int mid = n / 2;
    for (int i = 0; i <= mid; i++) {
        for (int s = 0; s < mid - i; s++) printf(" ");
        for (int st = 0; st < 2 * i + 1; st++) printf("*");
        printf("\\n");
    }
    for (int i = mid - 1; i >= 0; i--) {
        for (int s = 0; s < mid - i; s++) printf(" ");
        for (int st = 0; st < 2 * i + 1; st++) printf("*");
        printf("\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) printf("*\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    printf("*\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "3\n",
                "expectedOutput": " *\n***\n *\n"
          },
          {
                "input": "5\n",
                "expectedOutput": "  *\n ***\n*****\n ***\n  *\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n",
                "expectedOutput": "*\n"
          },
          {
                "input": "7\n",
                "expectedOutput": "   *\n  ***\n *****\n*******\n *****\n  ***\n   *\n"
          },
          {
                "input": "9\n",
                "expectedOutput": "    *\n   ***\n  *****\n *******\n*********\n *******\n  *****\n   ***\n    *\n"
          }
    ],
  },
  {
    slug: "practice-c1-quadratic-equation-solver",
    moduleSlug: "control-structures",
    moduleOrder: 19,
    title: "Quadratic Equation Roots Classifier",
    difficulty: "HARD",
    category: "Control Structures",
    tags: ["Conditionals","Math","Discriminant","Floating Point"],
    description: `### Problem Description

Given the coefficients \$A, B, C\$ of a quadratic equation \$Ax^2 + Bx + C = 0\$ (\$A \\ne 0\$), classify and compute its roots based on the discriminant \$D = B^2 - 4AC\$:
1. If \$D > 0\$: The equation has two distinct real roots. Print:
   \`REAL DISTINCT: %.2f %.2f\\n\` with roots in ascending order (\$r_1 \\le r_2\$).
2. If \$D = 0\$: The equation has two equal real roots. Print:
   \`REAL EQUAL: %.2f\\n\` with the root.
3. If \$D < 0\$: The equation has two complex conjugate roots. Print:
   \`COMPLEX: %.2f + %.2fi, %.2f - %.2fi\\n\` with real part followed by imaginary magnitude (\$|\\sqrt{-D} / (2A)|\$). Note: print \$-0.00\$ normalized as \$0.00\$.

### Input Format
Three space-separated floating-point numbers \$A, B, C\$ with \$A \\ne 0\$.

### Output Format
Print the classified roots formatted to two decimal places followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <math.h>

int main() {
    double a, b, c;
    if (scanf("%lf %lf %lf", &a, &b, &c) != 3) return 0;
    
    // TODO: Calculate discriminant and roots
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <math.h>

int main() {
    double a, b, c;
    if (scanf("%lf %lf %lf", &a, &b, &c) != 3) return 0;
    double d = b * b - 4.0 * a * c;
    if (fabs(d) < 1e-9) {
        double r = -b / (2.0 * a);
        if (fabs(r) < 1e-9) r = 0.0;
        printf("REAL EQUAL: %.2f\\n", r);
    } else if (d > 0.0) {
        double sqrt_d = sqrt(d);
        double r1 = (-b - sqrt_d) / (2.0 * a);
        double r2 = (-b + sqrt_d) / (2.0 * a);
        if (r1 > r2) {
            double tmp = r1; r1 = r2; r2 = tmp;
        }
        if (fabs(r1) < 1e-9) r1 = 0.0;
        if (fabs(r2) < 1e-9) r2 = 0.0;
        printf("REAL DISTINCT: %.2f %.2f\\n", r1, r2);
    } else {
        double realPart = -b / (2.0 * a);
        double imagPart = sqrt(-d) / (2.0 * fabs(a));
        if (fabs(realPart) < 1e-9) realPart = 0.0;
        printf("COMPLEX: %.2f + %.2fi, %.2f - %.2fi\\n", realPart, imagPart, realPart, imagPart);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("REAL EQUAL: 0.00\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
#include <math.h>
int main() {
    double a, b, c;
    scanf("%lf %lf %lf", &a, &b, &c);
    printf("REAL DISTINCT: %.2f %.2f\\n", -b/(2*a), -b/(2*a));
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "1 -5 6\n",
                "expectedOutput": "REAL DISTINCT: 2.00 3.00\n"
          },
          {
                "input": "1 -2 1\n",
                "expectedOutput": "REAL EQUAL: 1.00\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 2 5\n",
                "expectedOutput": "COMPLEX: -1.00 + 2.00i, -1.00 - 2.00i\n"
          },
          {
                "input": "2 4 2\n",
                "expectedOutput": "REAL EQUAL: -1.00\n"
          },
          {
                "input": "1 0 -4\n",
                "expectedOutput": "REAL DISTINCT: -2.00 2.00\n"
          },
          {
                "input": "1 0 1\n",
                "expectedOutput": "COMPLEX: 0.00 + 1.00i, 0.00 - 1.00i\n"
          }
    ],
  },
  {
    slug: "practice-c1-pascal-triangle-rows",
    moduleSlug: "control-structures",
    moduleOrder: 20,
    title: "Pascal Triangle Matrix Form",
    difficulty: "HARD",
    category: "Control Structures",
    tags: ["Combinatorics","Nested Loops","Dynamic Form","Formatting"],
    description: `### Problem Description

Given an integer \$R\$ (\$1 \\le R \\le 20\$), generate and print the first \$R\$ rows of Pascal's Triangle.
Row \$0\$ starts with \$1\$. For each subsequent row \$i\$ (\$0 \\le i < R\$), the element at column \$j\$ (\$0 \\le j \\le i\$) is computed as:
\$\$C(i, j) = \\frac{i!}{j!(i - j)!}\$\$
Print each row on a new line with space-separated numbers without trailing spaces.

### Input Format
A single integer \$R\$ (\$1 \\le R \\le 20\$).

### Output Format
Print \$R\$ lines, where each line contains space-separated integers of that row.`,
    starterCode: `#include <stdio.h>

int main() {
    int r;
    if (scanf("%d", &r) != 1) return 0;
    
    // TODO: Generate Pascal's Triangle up to R rows
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r;
    if (scanf("%d", &r) != 1) return 0;
    for (int i = 0; i < r; i++) {
        long long val = 1;
        printf("%lld", val);
        for (int j = 1; j <= i; j++) {
            val = val * (i - j + 1) / j;
            printf(" %lld", val);
        }
        printf("\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int r;
    scanf("%d", &r);
    for (int i = 0; i < r; i++) printf("1\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("1\\n1 1\\n1 2 1\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "3\n",
                "expectedOutput": "1\n1 1\n1 2 1\n"
          },
          {
                "input": "5\n",
                "expectedOutput": "1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "2\n",
                "expectedOutput": "1\n1 1\n"
          },
          {
                "input": "4\n",
                "expectedOutput": "1\n1 1\n1 2 1\n1 3 3 1\n"
          },
          {
                "input": "7\n",
                "expectedOutput": "1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1\n1 5 10 10 5 1\n1 6 15 20 15 6 1\n"
          }
    ],
  }
];
