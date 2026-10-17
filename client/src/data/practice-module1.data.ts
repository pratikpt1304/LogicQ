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
];
