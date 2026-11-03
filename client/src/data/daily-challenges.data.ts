export interface DailyChallengeProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  moduleIndex: 1 | 2 | 3 | 4;
  moduleName: string;
  basePoints: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  isDaily: true;
  isPractice: false;
  tags: string[];
  description: string;
  starterCode: string;
  solutionCode: string;
  sampleTests: { input: string; expectedOutput: string }[];
  hiddenTests: { input: string; expectedOutput: string }[];
}

export const DAILY_CHALLENGES: DailyChallengeProblem[] = [
  // =========================================================================
  // MODULE 1: CONTROL STRUCTURES
  // =========================================================================
  {
    id: 'daily-c1-collatz-max-peak',
    slug: 'daily-c1-collatz-max-peak',
    title: 'Collatz Sequence Peak Extractor',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Loops', '#Collatz', '#Math', '#ControlFlow'],
    description: `### Problem Description
Given a positive integer $N \\ge 1$, generate the Collatz sequence until $N$ becomes $1$:
- If current $N$ is even: $N = N / 2$
- If current $N$ is odd: $N = 3N + 1$

Your task is to determine the **maximum peak value** that $N$ attains at any point throughout the sequence (including the starting value $N$).

### Input Format
A single line containing integer $N$ ($1 \\le N \\le 10^6$).

### Output Format
Print the maximum peak value followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    // TODO: Compute the maximum peak value reached in the Collatz sequence

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    long long peak = n;
    while (n > 1) {
        if (n % 2 == 0) {
            n = n / 2;
        } else {
            n = 3 * n + 1;
        }
        if (n > peak) peak = n;
    }
    printf("%lld\\n", peak);
    return 0;
}`,
    sampleTests: [
      { input: '6\n', expectedOutput: '16\n' },
      { input: '11\n', expectedOutput: '52\n' },
    ],
    hiddenTests: [
      { input: '1\n', expectedOutput: '1\n' },
      { input: '27\n', expectedOutput: '9232\n' },
      { input: '100\n', expectedOutput: '100\n' },
    ],
  },

  {
    id: 'daily-c1-kaprekar-routine',
    slug: 'daily-c1-kaprekar-routine',
    title: "Kaprekar's Constant Routine Steps",
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Digits', '#Sorting', '#WhileLoop', '#NumberTheory'],
    description: `### Problem Description
The number **6174** is known as Kaprekar's constant. For any 4-digit number with at least two distinct digits:
1. Arrange digits in descending order to form $D_1$.
2. Arrange digits in ascending order to form $D_2$.
3. Compute $N = D_1 - D_2$.
4. Repeat until $N = 6174$.

Given an initial 4-digit number $N$, output the number of iterations required to reach $6174$. If $N$ is already $6174$, print $0$.

### Input Format
A 4-digit integer $N$.

### Output Format
Print the number of iterations required.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Determine iterations to reach 6174 via Kaprekar routine

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int kaprekarNext(int n) {
    int digits[4];
    for (int i = 3; i >= 0; i--) {
        digits[i] = n % 10;
        n /= 10;
    }
    for (int i = 0; i < 4; i++) {
        for (int j = i + 1; j < 4; j++) {
            if (digits[i] < digits[j]) {
                int t = digits[i]; digits[i] = digits[j]; digits[j] = t;
            }
        }
    }
    int desc = digits[0]*1000 + digits[1]*100 + digits[2]*10 + digits[3];
    int asc = digits[3]*1000 + digits[2]*100 + digits[1]*10 + digits[0];
    return desc - asc;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int steps = 0;
    while (n != 6174) {
        n = kaprekarNext(n);
        steps++;
    }
    printf("%d\\n", steps);
    return 0;
}`,
    sampleTests: [
      { input: '3524\n', expectedOutput: '3\n' },
      { input: '6174\n', expectedOutput: '0\n' },
    ],
    hiddenTests: [
      { input: '1234\n', expectedOutput: '3\n' },
      { input: '9831\n', expectedOutput: '7\n' },
      { input: '1000\n', expectedOutput: '5\n' },
    ],
  },

  {
    id: 'daily-c1-leap-calendar-offset',
    slug: 'daily-c1-leap-calendar-offset',
    title: 'Gregorian Leap Century Classifier',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#IfElse', '#Modulo', '#Calendar', '#Logic'],
    description: `### Problem Description
Under the Gregorian calendar system:
- A year divisible by $400$ is a **Leap Century** (\`LEAP_CENTURY\`).
- A year divisible by $4$ but NOT by $100$ is a standard leap year (\`LEAP_STANDARD\`).
- All other years are common years (\`COMMON_YEAR\`).

Write a C program using clean conditional logic to classify year $Y$.

### Input Format
A single integer $Y$ ($1582 \\le Y \\le 9999$).

### Output Format
Print \`LEAP_CENTURY\`, \`LEAP_STANDARD\`, or \`COMMON_YEAR\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int y;
    if (scanf("%d", &y) != 1) return 0;

    // TODO: Classify year as LEAP_CENTURY, LEAP_STANDARD, or COMMON_YEAR

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int y;
    if (scanf("%d", &y) != 1) return 0;

    if (y % 400 == 0) {
        printf("LEAP_CENTURY\\n");
    } else if (y % 4 == 0 && y % 100 != 0) {
        printf("LEAP_STANDARD\\n");
    } else {
        printf("COMMON_YEAR\\n");
    }
    return 0;
}`,
    sampleTests: [
      { input: '2000\n', expectedOutput: 'LEAP_CENTURY\n' },
      { input: '2024\n', expectedOutput: 'LEAP_STANDARD\n' },
    ],
    hiddenTests: [
      { input: '1900\n', expectedOutput: 'COMMON_YEAR\n' },
      { input: '2400\n', expectedOutput: 'LEAP_CENTURY\n' },
      { input: '2023\n', expectedOutput: 'COMMON_YEAR\n' },
    ],
  },

  {
    id: 'daily-c1-prime-factors-condensed',
    slug: 'daily-c1-prime-factors-condensed',
    title: 'Condensed Prime Factorization Formatter',
    difficulty: 'MEDIUM',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Loops', '#PrimeFactors', '#Formatting'],
    description: `### Problem Description
Given a positive integer $N \\ge 2$, compute its prime factorization and print it in canonical condensed form:
\`p1^k1 * p2^k2 * ...\` where $p_i$ are prime factors in strictly ascending order.

### Input Format
A single positive integer $N$ ($2 \\le N \\le 10^7$).

### Output Format
Print the formatted string with prime factors and their powers separated by \` * \`.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    // TODO: Output canonical prime factorization p1^k1 * p2^k2 ...

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    int first = 1;
    for (long long p = 2; p * p <= n; p++) {
        if (n % p == 0) {
            int count = 0;
            while (n % p == 0) {
                count++;
                n /= p;
            }
            if (!first) printf(" * ");
            printf("%lld^%d", p, count);
            first = 0;
        }
    }
    if (n > 1) {
        if (!first) printf(" * ");
        printf("%lld^1", n);
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '12\n', expectedOutput: '2^2 * 3^1\n' },
      { input: '13\n', expectedOutput: '13^1\n' },
    ],
    hiddenTests: [
      { input: '360\n', expectedOutput: '2^3 * 3^2 * 5^1\n' },
      { input: '1024\n', expectedOutput: '2^10\n' },
      { input: '97\n', expectedOutput: '97^1\n' },
    ],
  },

  // =========================================================================
  // MODULE 2: POINTERS AND FUNCTIONS
  // =========================================================================
  {
    id: 'daily-c2-pointer-endian-inspector',
    slug: 'daily-c2-pointer-endian-inspector',
    title: 'Pointer-Based Endianness & Byte Inspector',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers and Functions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Pointers', '#TypeCasting', '#MemoryLayout'],
    description: `### Problem Description
In computer architecture, memory byte ordering differs across CPU architectures:
- **Little-Endian**: The least-significant byte (LSB) is stored at the lowest memory address.
- **Big-Endian**: The most-significant byte (MSB) is stored at the lowest memory address.

Write a C program that inspects an unsigned 32-bit integer $X$ via an \`unsigned char*\` pointer to address $0$. Print \`LITTLE_ENDIAN\` or \`BIG_ENDIAN\`, followed by a single space and the hex byte value at address $0$ formatted as \`0x%02X\`.

### Input Format
A single unsigned integer $X$ ($0 \\le X \\le 2^{32}-1$).

### Output Format
Print the architecture endianness and the lowest byte in hex.`,
    starterCode: `#include <stdio.h>

int main() {
    unsigned int x;
    if (scanf("%u", &x) != 1) return 0;

    // TODO: Use a byte pointer to inspect byte 0 of unsigned int x

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    unsigned int x;
    if (scanf("%u", &x) != 1) return 0;

    unsigned int test = 1;
    unsigned char *testPtr = (unsigned char*)&test;
    int isLittle = (*testPtr == 1);

    unsigned char *p = (unsigned char*)&x;
    unsigned char firstByte = *p;

    if (isLittle) {
        printf("LITTLE_ENDIAN 0x%02X\\n", firstByte);
    } else {
        printf("BIG_ENDIAN 0x%02X\\n", firstByte);
    }
    return 0;
}`,
    sampleTests: [
      { input: '305419896\n', expectedOutput: 'LITTLE_ENDIAN 0x78\n' },
      { input: '1\n', expectedOutput: 'LITTLE_ENDIAN 0x01\n' },
    ],
    hiddenTests: [
      { input: '255\n', expectedOutput: 'LITTLE_ENDIAN 0xFF\n' },
      { input: '256\n', expectedOutput: 'LITTLE_ENDIAN 0x00\n' },
      { input: '4294967295\n', expectedOutput: 'LITTLE_ENDIAN 0xFF\n' },
    ],
  },

  {
    id: 'daily-c2-recursive-tribonacci',
    slug: 'daily-c2-recursive-tribonacci',
    title: 'Recursive Tribonacci Sequence Evaluator',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers and Functions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Recursion', '#Functions', '#Series'],
    description: `### Problem Description
The Tribonacci sequence $T_n$ is defined by:
- $T_0 = 0$
- $T_1 = 1$
- $T_2 = 1$
- $T_n = T_{n-1} + T_{n-2} + T_{n-3}$ for $n \\ge 3$.

Given $N$, compute $T_N$ using a modular recursive function.

### Input Format
A single integer $N$ ($0 \\le N \\le 30$).

### Output Format
Print the $N$-th Tribonacci number.`,
    starterCode: `#include <stdio.h>

long long tribonacci(int n) {
    // TODO: Implement recursive tribonacci logic
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    printf("%lld\\n", tribonacci(n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long memo[35];

long long trib(int n) {
    if (n == 0) return 0;
    if (n == 1 || n == 2) return 1;
    if (memo[n] != 0) return memo[n];
    return memo[n] = trib(n - 1) + trib(n - 2) + trib(n - 3);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    printf("%lld\\n", trib(n));
    return 0;
}`,
    sampleTests: [
      { input: '4\n', expectedOutput: '4\n' },
      { input: '7\n', expectedOutput: '24\n' },
    ],
    hiddenTests: [
      { input: '0\n', expectedOutput: '0\n' },
      { input: '1\n', expectedOutput: '1\n' },
      { input: '25\n', expectedOutput: '1389537\n' },
    ],
  },

  {
    id: 'daily-c2-function-pointer-calculator',
    slug: 'daily-c2-function-pointer-calculator',
    title: 'Function Pointer Dispatch Table Calculator',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers and Functions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#FunctionPointers', '#DispatchTable', '#ModularC'],
    description: `### Problem Description
In advanced C programming, function pointers allow runtime dispatching without bulky \`switch\` statements.
Define four discrete functions matching prototype \`long long op(long long a, long long b)\`:
- Op 0: Addition ($A + B$)
- Op 1: Subtraction ($A - B$)
- Op 2: Multiplication ($A \\times B$)
- Op 3: Modulo ($A \\% B$) (Assume $B \\neq 0$)

Store them in a function pointer array \`long long (*ops[4])(long long, long long)\`.
Read the opcode and operands, dispatch through the pointer array, and print the result.

### Input Format
A single line with three integers: \`opcode A B\` ($0 \\le \\text{opcode} \\le 3$).

### Output Format
Print the evaluated integer result.`,
    starterCode: `#include <stdio.h>

typedef long long (*MathOp)(long long, long long);

// TODO: Define add, sub, mul, mod functions and dispatch table

int main() {
    int opcode;
    long long a, b;
    if (scanf("%d %lld %lld", &opcode, &a, &b) != 3) return 0;

    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long add(long long a, long long b) { return a + b; }
long long sub(long long a, long long b) { return a - b; }
long long mul(long long a, long long b) { return a * b; }
long long mod(long long a, long long b) { return a % b; }

int main() {
    int opcode;
    long long a, b;
    if (scanf("%d %lld %lld", &opcode, &a, &b) != 3) return 0;

    long long (*ops[4])(long long, long long) = { add, sub, mul, mod };
    if (opcode >= 0 && opcode < 4) {
        printf("%lld\\n", ops[opcode](a, b));
    }
    return 0;
}`,
    sampleTests: [
      { input: '2 6 7\n', expectedOutput: '42\n' },
      { input: '0 15 25\n', expectedOutput: '40\n' },
    ],
    hiddenTests: [
      { input: '1 50 100\n', expectedOutput: '-50\n' },
      { input: '3 29 5\n', expectedOutput: '4\n' },
      { input: '2 12345 6789\n', expectedOutput: '83810205\n' },
    ],
  },

  // =========================================================================
  // MODULE 3: ARRAY AND ITS APPLICATIONS
  // =========================================================================
  {
    id: 'daily-c3-matrix-saddle-point',
    slug: 'daily-c3-matrix-saddle-point',
    title: 'Matrix Saddle Point Finder',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#2DArrays', '#Matrices', '#Searching', '#Optimization'],
    description: `### Problem Description
A **saddle point** in an $R \\times C$ matrix is an element $M[i][j]$ that is:
1. The **minimum** element in row $i$, AND
2. The **maximum** element in column $j$.

Given dimensions $R, C$ and the matrix elements, find if a saddle point exists.
- If found, print \`<value> at (<row>,<col>)\` using 0-based indexing.
- If multiple exist, print the first one encountered in row-major order.
- If none exists, print \`NONE\`.

### Input Format
First line: $R$ and $C$ ($1 \\le R, C \\le 50$).
Following $R$ lines: $C$ integers each.

### Output Format
Print the saddle point or \`NONE\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;

    // TODO: Determine matrix saddle point

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;

    int m[55][55];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            scanf("%d", &m[i][j]);
        }
    }

    for (int i = 0; i < r; i++) {
        int minCol = 0;
        for (int j = 1; j < c; j++) {
            if (m[i][j] < m[i][minCol]) minCol = j;
        }

        int val = m[i][minCol];
        int isSaddle = 1;
        for (int k = 0; k < r; k++) {
            if (m[k][minCol] > val) {
                isSaddle = 0;
                break;
            }
        }

        if (isSaddle) {
            printf("%d at (%d,%d)\\n", val, i, minCol);
            return 0;
        }
    }
    printf("NONE\\n");
    return 0;
}`,
    sampleTests: [
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9\n', expectedOutput: '7 at (2,0)\n' },
      { input: '2 2\n3 4\n5 2\n', expectedOutput: 'NONE\n' },
    ],
    hiddenTests: [
      { input: '1 1\n42\n', expectedOutput: '42 at (0,0)\n' },
      { input: '3 3\n10 12 7\n3 11 2\n5 6 4\n', expectedOutput: 'NONE\n' },
      { input: '3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n', expectedOutput: '9 at (2,0)\n' },
    ],
  },

  {
    id: 'daily-c3-equilibrium-index',
    slug: 'daily-c3-equilibrium-index',
    title: 'Array Equilibrium Balance Point',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Arrays', '#PrefixSum', '#LinearScan'],
    description: `### Problem Description
An **equilibrium index** of a sequence is an index such that the sum of elements at lower indices is equal to the sum of elements at higher indices:
$$\\sum_{j=0}^{i-1} A[j] = \\sum_{k=i+1}^{N-1} A[k]$$

Given an array of $N$ integers, find the **first** 0-indexed equilibrium point. If no such index exists, output \`-1\`.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($-10^4 \\le A[i] \\le 10^4$).

### Output Format
Print the first equilibrium index or \`-1\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Find first equilibrium balance index in O(N) time

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long arr[100005];
    long long totalSum = 0;
    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
        totalSum += arr[i];
    }

    long long leftSum = 0;
    for (int i = 0; i < n; i++) {
        long long rightSum = totalSum - leftSum - arr[i];
        if (leftSum == rightSum) {
            printf("%d\\n", i);
            return 0;
        }
        leftSum += arr[i];
    }

    printf("-1\\n");
    return 0;
}`,
    sampleTests: [
      { input: '7\n-7 1 5 2 -4 3 0\n', expectedOutput: '3\n' },
      { input: '3\n1 2 3\n', expectedOutput: '-1\n' },
    ],
    hiddenTests: [
      { input: '1\n10\n', expectedOutput: '0\n' },
      { input: '2\n1 -1\n', expectedOutput: '-1\n' },
      { input: '5\n1 3 5 2 2\n', expectedOutput: '2\n' },
    ],
  },

  {
    id: 'daily-c3-rotate-matrix-anticlockwise',
    slug: 'daily-c3-rotate-matrix-anticlockwise',
    title: 'In-Place 90° Counter-Clockwise Matrix Rotation',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#2DArrays', '#Rotation', '#Matrices', '#InPlace'],
    description: `### Problem Description
Given an $N \\times N$ square matrix of integers, rotate the matrix **90 degrees counter-clockwise (anti-clockwise)**.
Print the resulting rotated matrix row by row with space-separated numbers.

### Input Format
First line: $N$ ($1 \\le N \\le 50$).
Following $N$ lines: $N$ integers each.

### Output Format
Print the rotated $N \\times N$ matrix.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Rotate matrix 90 degrees anti-clockwise

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int a[55][55];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &a[i][j]);
        }
    }

    for (int col = n - 1; col >= 0; col--) {
        for (int row = 0; row < n; row++) {
            printf("%d%c", a[row][col], (row == n - 1) ? '\\n' : ' ');
        }
    }
    return 0;
}`,
    sampleTests: [
      { input: '2\n1 2\n3 4\n', expectedOutput: '2 4\n1 3\n' },
      { input: '3\n1 2 3\n4 5 6\n7 8 9\n', expectedOutput: '3 6 9\n2 5 8\n1 4 7\n' },
    ],
    hiddenTests: [
      { input: '1\n99\n', expectedOutput: '99\n' },
      { input: '4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n', expectedOutput: '4 8 12 16\n3 7 11 15\n2 6 10 14\n1 5 9 13\n' },
    ],
  },

  // =========================================================================
  // MODULE 4: ADVANCED DATA TYPES, DYNAMIC MEMORY
  // =========================================================================
  {
    id: 'daily-c4-struct-inventory-manager',
    slug: 'daily-c4-struct-inventory-manager',
    title: 'Item Inventory Valuation via Structures',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types, Dynamic Memory',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Structures', '#Aggregation', '#DataTypes'],
    description: `### Problem Description
Define a structure representing warehouse inventory:
\`\`\`c
struct InventoryItem {
    int id;
    int quantity;
    double unitPrice;
};
\`\`\`

Given $N$ inventory items:
1. Compute the **total valuation** of the warehouse (sum of $\\text{quantity} \\times \\text{unitPrice}$).
2. Identify the item ID that holds the **highest single unit price**.

### Input Format
First line: $N$ ($1 \\le N \\le 100$).
Next $N$ lines: \`id quantity unitPrice\` (e.g. \`101 10 15.50\`).

### Output Format
Print formatted as:
\`Total Value: %.2f, Highest Price Item: %d\` followed by newline.`,
    starterCode: `#include <stdio.h>

struct InventoryItem {
    int id;
    int quantity;
    double unitPrice;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Calculate total inventory value and identify item with highest unitPrice

    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct InventoryItem {
    int id;
    int quantity;
    double unitPrice;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    struct InventoryItem items[105];
    double totalVal = 0.0;
    int highestId = -1;
    double maxPrice = -1.0;

    for (int i = 0; i < n; i++) {
        scanf("%d %d %lf", &items[i].id, &items[i].quantity, &items[i].unitPrice);
        totalVal += (items[i].quantity * items[i].unitPrice);
        if (items[i].unitPrice > maxPrice) {
            maxPrice = items[i].unitPrice;
            highestId = items[i].id;
        }
    }

    printf("Total Value: %.2f, Highest Price Item: %d\\n", totalVal, highestId);
    return 0;
}`,
    sampleTests: [
      { input: '3\n101 10 15.50\n102 5 99.00\n103 20 5.25\n', expectedOutput: 'Total Value: 755.00, Highest Price Item: 102\n' },
    ],
    hiddenTests: [
      { input: '1\n500 1 12.34\n', expectedOutput: 'Total Value: 12.34, Highest Price Item: 500\n' },
      { input: '2\n1 100 2.50\n2 50 10.00\n', expectedOutput: 'Total Value: 750.00, Highest Price Item: 2\n' },
    ],
  },

  {
    id: 'daily-c4-dynamic-string-concat',
    slug: 'daily-c4-dynamic-string-concat',
    title: 'Heap-Allocated Dynamic String Joiner & Reverser',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types, Dynamic Memory',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#DynamicMemory', '#malloc', '#free', '#Strings'],
    description: `### Problem Description
Write a program that demonstrates proper dynamic memory lifecycle in C:
1. Read two words $S_1$ and $S_2$.
2. Dynamically allocate exact heap memory using \`malloc\` for $S_1 + \\text{" "} + S_2 + \\text{"\\\\0"}$.
3. Reverse the concatenated string in-place on the heap.
4. Print the reversed string.
5. Deallocate the buffer using \`free\`.

### Input Format
Two single-word strings $S_1$ and $S_2$ separated by a space or newline (each length $\\le 100$).

### Output Format
Print the reversed combined string followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char s1[105], s2[105];
    if (scanf("%s %s", s1, s2) != 2) return 0;

    // TODO: Dynamically allocate exact heap buffer, concatenate with space, reverse, print, and free

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char s1[105], s2[105];
    if (scanf("%s %s", s1, s2) != 2) return 0;

    int len1 = strlen(s1);
    int len2 = strlen(s2);
    int totalLen = len1 + 1 + len2; // s1 + space + s2

    char *buf = (char*)malloc((totalLen + 1) * sizeof(char));
    if (!buf) return 1;

    sprintf(buf, "%s %s", s1, s2);

    for (int i = 0, j = totalLen - 1; i < j; i++, j--) {
        char tmp = buf[i];
        buf[i] = buf[j];
        buf[j] = tmp;
    }

    printf("%s\\n", buf);
    free(buf);
    return 0;
}`,
    sampleTests: [
      { input: 'hello world\n', expectedOutput: 'dlrow olleh\n' },
      { input: 'data structures\n', expectedOutput: 'serutcurts atad\n' },
    ],
    hiddenTests: [
      { input: 'a b\n', expectedOutput: 'b a\n' },
      { input: 'LogicQ Platform\n', expectedOutput: 'mroftalP QmigoL\n' },
    ],
  },

  {
    id: 'daily-c4-singly-list-remove-kth-end',
    slug: 'daily-c4-singly-list-remove-kth-end',
    title: 'Singly Linked List K-th from End Removal',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types, Dynamic Memory',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#LinkedList', '#DynamicMemory', '#Nodes', '#malloc'],
    description: `### Problem Description
Construct a singly linked list from $N$ integers using dynamically allocated nodes:
\`\`\`c
struct Node {
    int val;
    struct Node* next;
};
\`\`\`

Given $K$ ($1 \\le K \\le N$), remove the $K$-th node from the **end** of the list in a single pass (using two pointers separated by $K$ steps).
Print the resulting linked list values separated by spaces.

### Input Format
First line: $N$ and $K$ ($1 \\le K \\le N \\le 1000$).
Second line: $N$ space-separated integers.

### Output Format
Print the updated linked list elements space-separated.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node* next;
};

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;

    // TODO: Build linked list, delete K-th node from end, print result, free nodes

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node* next;
};

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;

    struct Node dummy;
    dummy.next = NULL;
    struct Node* tail = &dummy;

    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
        newNode->val = v;
        newNode->next = NULL;
        tail->next = newNode;
        tail = newNode;
    }

    struct Node* fast = dummy.next;
    struct Node* slow = &dummy;

    for (int i = 0; i < k; i++) {
        if (fast) fast = fast->next;
    }

    while (fast != NULL) {
        fast = fast->next;
        slow = slow->next;
    }

    struct Node* toDelete = slow->next;
    if (toDelete) {
        slow->next = toDelete->next;
        free(toDelete);
    }

    struct Node* cur = dummy.next;
    int first = 1;
    while (cur) {
        if (!first) printf(" ");
        printf("%d", cur->val);
        first = 0;
        struct Node* tmp = cur;
        cur = cur->next;
        free(tmp);
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '5 2\n1 2 3 4 5\n', expectedOutput: '1 2 3 5\n' },
      { input: '1 1\n42\n', expectedOutput: '\n' },
    ],
    hiddenTests: [
      { input: '2 1\n10 20\n', expectedOutput: '10\n' },
      { input: '4 4\n10 20 30 40\n', expectedOutput: '20 30 40\n' },
      { input: '6 3\n5 10 15 20 25 30\n', expectedOutput: '5 10 15 25 30\n' },
    ],
  },

  {
    id: 'daily-c4-union-ieee-float-analyzer',
    slug: 'daily-c4-union-ieee-float-analyzer',
    title: 'IEEE 754 Float Bitfield Analyzer via Union',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types, Dynamic Memory',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Unions', '#Bitfields', '#IEEE754', '#Binary'],
    description: `### Problem Description
In C, a \`union\` shares the same memory address across different types.
Define a union:
\`\`\`c
union FloatConverter {
    float f;
    unsigned int u;
};
\`\`\`

Given a floating point number $F$:
1. Inspect its IEEE 754 single-precision bits.
2. Extract the **Sign bit** (1 bit, bit 31).
3. Extract the **Exponent** (8 bits, bits 23-30) formatted in binary.
4. Print: \`Sign: %u, Exponent: %s\`.

### Input Format
A single float $F$.

### Output Format
Print \`Sign: <0 or 1>, Exponent: <8-bit binary string>\`.`,
    starterCode: `#include <stdio.h>

union FloatConverter {
    float f;
    unsigned int u;
};

int main() {
    float val;
    if (scanf("%f", &val) != 1) return 0;

    // TODO: Use union to inspect IEEE 754 sign and 8-bit exponent in binary

    return 0;
}`,
    solutionCode: `#include <stdio.h>

union FloatConverter {
    float f;
    unsigned int u;
};

int main() {
    float val;
    if (scanf("%f", &val) != 1) return 0;

    union FloatConverter fc;
    fc.f = val;

    unsigned int sign = (fc.u >> 31) & 1;
    unsigned int exp = (fc.u >> 23) & 0xFF;

    char expBin[9];
    for (int i = 7; i >= 0; i--) {
        expBin[7 - i] = ((exp >> i) & 1) ? '1' : '0';
    }
    expBin[8] = '\\0';

    printf("Sign: %u, Exponent: %s\\n", sign, expBin);
    return 0;
}`,
    sampleTests: [
      { input: '1.0\n', expectedOutput: 'Sign: 0, Exponent: 01111111\n' },
      { input: '-2.5\n', expectedOutput: 'Sign: 1, Exponent: 10000000\n' },
    ],
    hiddenTests: [
      { input: '0.0\n', expectedOutput: 'Sign: 0, Exponent: 00000000\n' },
      { input: '-1.0\n', expectedOutput: 'Sign: 1, Exponent: 01111111\n' },
      { input: '4.0\n', expectedOutput: 'Sign: 0, Exponent: 10000001\n' },
    ],
  },
];
