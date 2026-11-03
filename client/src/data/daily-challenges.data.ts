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

  // =========================================================================
  // ADDITIONAL DEDICATED DAILY CHALLENGES (MODULES 1 - 4)
  // =========================================================================
  {
    id: 'daily-c1-armstrong-number-range',
    slug: 'daily-c1-armstrong-number-range',
    title: 'Armstrong Numbers in Interval',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Loops', '#Math', '#Armstrong'],
    description: `### Problem Description
An $N$-digit integer is an Armstrong (narcissistic) number if the sum of its digits each raised to the power of $N$ equals the number itself.
Given two inclusive limits $L$ and $R$, print all Armstrong numbers in this range separated by spaces. If none exist, print \`NONE\`.

### Input Format
Two space-separated positive integers $L$ and $R$ ($1 \\le L \\le R \\le 10^5$).

### Output Format
Space-separated Armstrong numbers followed by a newline, or \`NONE\`.`,
    starterCode: `#include <stdio.h>
#include <math.h>

int main() {
    int l, r;
    if (scanf("%d %d", &l, &r) != 2) return 0;

    // TODO: Find and print all Armstrong numbers in [l, r]

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <math.h>

int isArmstrong(int num) {
    if (num < 1) return 0;
    int temp = num, digits = 0;
    while (temp > 0) {
        digits++;
        temp /= 10;
    }
    temp = num;
    long long sum = 0;
    while (temp > 0) {
        int d = temp % 10;
        long long p = 1;
        for (int i = 0; i < digits; i++) p *= d;
        sum += p;
        temp /= 10;
    }
    return sum == num;
}

int main() {
    int l, r;
    if (scanf("%d %d", &l, &r) != 2) return 0;

    int found = 0;
    for (int i = l; i <= r; i++) {
        if (isArmstrong(i)) {
            if (found) printf(" ");
            printf("%d", i);
            found++;
        }
    }
    if (!found) printf("NONE");
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '1 10\n', expectedOutput: '1 2 3 4 5 6 7 8 9\n' },
      { input: '100 200\n', expectedOutput: '153\n' },
    ],
    hiddenTests: [
      { input: '370 371\n', expectedOutput: '370 371\n' },
      { input: '10 100\n', expectedOutput: 'NONE\n' },
      { input: '300 450\n', expectedOutput: '370 371 407\n' },
    ],
  },
  {
    id: 'daily-c1-decimal-to-roman',
    slug: 'daily-c1-decimal-to-roman',
    title: 'Integer to Roman Numeral Converter',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Greedy', '#SwitchCase', '#Conditionals'],
    description: `### Problem Description
Convert a positive integer $N$ ($1 \\le N \\le 3999$) into standard Roman numeral notation.
Standard values: \`M=1000, CM=900, D=500, CD=400, C=100, XC=90, L=50, XL=40, X=10, IX=9, V=5, IV=4, I=1\`.

### Input Format
A single line with integer $N$.

### Output Format
Print the Roman numeral representation followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Print Roman numeral for n

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int values[] = {1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1};
    const char *symbols[] = {"M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"};

    for (int i = 0; i < 13; i++) {
        while (n >= values[i]) {
            printf("%s", symbols[i]);
            n -= values[i];
        }
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '58\n', expectedOutput: 'LVIII\n' },
      { input: '1994\n', expectedOutput: 'MCMXCIV\n' },
    ],
    hiddenTests: [
      { input: '3\n', expectedOutput: 'III\n' },
      { input: '4\n', expectedOutput: 'IV\n' },
      { input: '3999\n', expectedOutput: 'MMMCMXCIX\n' },
    ],
  },
  {
    id: 'daily-c1-pascal-row-generator',
    slug: 'daily-c1-pascal-row-generator',
    title: 'Pascal Triangle Nth Row Generator',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Math', '#Loops', '#Combinatorics'],
    description: `### Problem Description
Given a 0-indexed row number $K$, compute all elements of the $K$-th row of Pascal's Triangle using the multiplicative formula:
$$C(k, i) = C(k, i - 1) \\times \\frac{k - i + 1}{i}$$
Print the numbers separated by a single space.

### Input Format
A single integer $K$ ($0 \\le K \\le 30$).

### Output Format
Space-separated integers of the $K$-th row followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;

    // TODO: Output kth row of Pascal's triangle

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;

    long long val = 1;
    printf("%lld", val);
    for (int i = 1; i <= k; i++) {
        val = val * (k - i + 1) / i;
        printf(" %lld", val);
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '0\n', expectedOutput: '1\n' },
      { input: '3\n', expectedOutput: '1 3 3 1\n' },
    ],
    hiddenTests: [
      { input: '4\n', expectedOutput: '1 4 6 4 1\n' },
      { input: '10\n', expectedOutput: '1 10 45 120 210 252 210 120 45 10 1\n' },
    ],
  },
  {
    id: 'daily-c1-hailstone-sequence-cycle',
    slug: 'daily-c1-hailstone-sequence-cycle',
    title: 'Hailstone Trajectory Step Counter',
    difficulty: 'EASY',
    category: 'Control Structures',
    moduleIndex: 1,
    moduleName: 'Control Structures',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Loops', '#Collatz', '#Hailstone'],
    description: `### Problem Description
The Hailstone sequence starts with a positive integer $N$.
In each step:
- If $N$ is even, $N = N / 2$
- If $N$ is odd, $N = 3N + 1$
Determine the total number of transitions required for $N$ to reach $1$.

### Input Format
A single integer $N$ ($1 \\le N \\le 10^6$).

### Output Format
Print the total step count followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    // TODO: Count transitions to reach 1

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    long long steps = 0;
    while (n > 1) {
        if (n % 2 == 0) {
            n /= 2;
        } else {
            n = 3 * n + 1;
        }
        steps++;
    }
    printf("%lld\\n", steps);
    return 0;
}`,
    sampleTests: [
      { input: '6\n', expectedOutput: '8\n' },
      { input: '1\n', expectedOutput: '0\n' },
    ],
    hiddenTests: [
      { input: '27\n', expectedOutput: '111\n' },
      { input: '12\n', expectedOutput: '9\n' },
      { input: '1000\n', expectedOutput: '111\n' },
    ],
  },
  {
    id: 'daily-c2-generic-swap-void-pointers',
    slug: 'daily-c2-generic-swap-void-pointers',
    title: 'Generic Memory Swap via Void Pointers',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers & Functions',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Pointers', '#VoidPointer', '#Memory'],
    description: `### Problem Description
Implement a generic memory swapping routine \`void generic_swap(void *a, void *b, size_t size)\` that swaps two arbitrarily typed memory regions byte by byte without standard library swap functions.
Read an indicator:
- \`I\` followed by two integers: swap and print them.
- \`D\` followed by two doubles (print with 2 decimal precision): swap and print them.

### Input Format
Indicator character (\`I\` or \`D\`) followed by the two values.

### Output Format
Print the two values after swapping, space-separated.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

void generic_swap(void *a, void *b, size_t size) {
    // TODO: Byte-by-byte swap
}

int main() {
    char type;
    if (scanf(" %c", &type) != 1) return 0;

    // TODO: Read, swap using generic_swap, and print

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

void generic_swap(void *a, void *b, size_t size) {
    unsigned char *p1 = (unsigned char *)a;
    unsigned char *p2 = (unsigned char *)b;
    while (size--) {
        unsigned char tmp = *p1;
        *p1++ = *p2;
        *p2++ = tmp;
    }
}

int main() {
    char type;
    if (scanf(" %c", &type) != 1) return 0;

    if (type == 'I') {
        int x, y;
        scanf("%d %d", &x, &y);
        generic_swap(&x, &y, sizeof(int));
        printf("%d %d\\n", x, y);
    } else if (type == 'D') {
        double x, y;
        scanf("%lf %lf", &x, &y);
        generic_swap(&x, &y, sizeof(double));
        printf("%.2f %.2f\\n", x, y);
    }
    return 0;
}`,
    sampleTests: [
      { input: 'I 42 99\n', expectedOutput: '99 42\n' },
      { input: 'D 3.14 2.71\n', expectedOutput: '2.71 3.14\n' },
    ],
    hiddenTests: [
      { input: 'I -5 0\n', expectedOutput: '0 -5\n' },
      { input: 'D 100.50 0.05\n', expectedOutput: '0.05 100.50\n' },
    ],
  },
  {
    id: 'daily-c2-string-split-pointer-array',
    slug: 'daily-c2-string-split-pointer-array',
    title: 'Delimiter Split into Pointer Array',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers & Functions',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Pointers', '#Strings', '#Parsing'],
    description: `### Problem Description
Given a single delimited string (up to 1000 characters) and a delimiter character, populate an array of pointers pointing to the beginning of each substring after replacing the delimiters with null bytes \`\\0\`.
Print each token on a new line with its 1-based index: \`[index]: token\`.

### Input Format
First line: The delimiter character.
Second line: The string to tokenize.

### Output Format
Print each token in format \`[index]: token\`.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char delim;
    if (scanf("%c\\n", &delim) != 1) return 0;
    char str[1024];
    if (!fgets(str, sizeof(str), stdin)) return 0;

    // TODO: Tokenize via pointer array and print

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char delim;
    if (scanf("%c", &delim) != 1) return 0;
    int c;
    while ((c = getchar()) != '\\n' && c != EOF);

    char str[1024];
    if (!fgets(str, sizeof(str), stdin)) return 0;
    size_t len = strlen(str);
    if (len > 0 && str[len - 1] == '\\n') str[len - 1] = '\\0';

    char *tokens[256];
    int count = 0;
    char *p = str;
    tokens[count++] = p;

    while (*p) {
        if (*p == delim) {
            *p = '\\0';
            p++;
            tokens[count++] = p;
        } else {
            p++;
        }
    }

    for (int i = 0; i < count; i++) {
        printf("[%d]: %s\\n", i + 1, tokens[i]);
    }
    return 0;
}`,
    sampleTests: [
      { input: ',\napple,banana,cherry\n', expectedOutput: '[1]: apple\n[2]: banana\n[3]: cherry\n' },
    ],
    hiddenTests: [
      { input: ':\nroot:bin:usr:local\n', expectedOutput: '[1]: root\n[2]: bin\n[3]: usr\n[4]: local\n' },
      { input: '#\nsingle\n', expectedOutput: '[1]: single\n' },
    ],
  },
  {
    id: 'daily-c2-ackermann-recursion',
    slug: 'daily-c2-ackermann-recursion',
    title: 'Ackermann-Péter Function Simulator',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers & Functions',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Recursion', '#Functions', '#Ackermann'],
    description: `### Problem Description
The Ackermann function $A(m, n)$ is defined recursively for non-negative integers $m$ and $n$:
- $A(0, n) = n + 1$
- $A(m, 0) = A(m - 1, 1)$ for $m > 0$
- $A(m, n) = A(m - 1, A(m, n - 1))$ for $m > 0$ and $n > 0$

Compute $A(m, n)$ for given inputs ($m \\le 3$, $n \\le 10$).

### Input Format
Two space-separated non-negative integers $m$ and $n$.

### Output Format
Print the computed integer $A(m, n)$ followed by a newline.`,
    starterCode: `#include <stdio.h>

long long ackermann(int m, int n) {
    // TODO: Recursive Ackermann implementation
    return 0;
}

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    printf("%lld\\n", ackermann(m, n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long ackermann(int m, int n) {
    if (m == 0) return n + 1;
    if (n == 0) return ackermann(m - 1, 1);
    return ackermann(m - 1, ackermann(m, n - 1));
}

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    printf("%lld\\n", ackermann(m, n));
    return 0;
}`,
    sampleTests: [
      { input: '1 2\n', expectedOutput: '4\n' },
      { input: '2 2\n', expectedOutput: '7\n' },
    ],
    hiddenTests: [
      { input: '3 2\n', expectedOutput: '29\n' },
      { input: '3 4\n', expectedOutput: '125\n' },
    ],
  },
  {
    id: 'daily-c2-pass-by-reference-stats',
    slug: 'daily-c2-pass-by-reference-stats',
    title: 'Pointer-Based Descriptive Statistics',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers & Functions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Pointers', '#Functions', '#Stats'],
    description: `### Problem Description
Implement a function \`void compute_stats(const int *arr, int n, int *min, int *max, double *avg)\` that computes the minimum, maximum, and arithmetic mean of an array of $N$ integers in a single pass.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 1000$).
Second line: $N$ space-separated integers.

### Output Format
Print \`Min: [min], Max: [max], Avg: [avg]\` where avg is formatted to 2 decimals.`,
    starterCode: `#include <stdio.h>

void compute_stats(const int *arr, int n, int *min, int *max, double *avg) {
    // TODO: Write pass-by-reference calculation
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    int minVal, maxVal;
    double avgVal;
    compute_stats(arr, n, &minVal, &maxVal, &avgVal);
    printf("Min: %d, Max: %d, Avg: %.2f\\n", minVal, maxVal, avgVal);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void compute_stats(const int *arr, int n, int *min, int *max, double *avg) {
    *min = arr[0];
    *max = arr[0];
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        if (arr[i] < *min) *min = arr[i];
        if (arr[i] > *max) *max = arr[i];
        sum += arr[i];
    }
    *avg = (double)sum / n;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    int minVal, maxVal;
    double avgVal;
    compute_stats(arr, n, &minVal, &maxVal, &avgVal);
    printf("Min: %d, Max: %d, Avg: %.2f\\n", minVal, maxVal, avgVal);
    return 0;
}`,
    sampleTests: [
      { input: '5\n10 20 5 40 25\n', expectedOutput: 'Min: 5, Max: 40, Avg: 20.00\n' },
    ],
    hiddenTests: [
      { input: '1\n100\n', expectedOutput: 'Min: 100, Max: 100, Avg: 100.00\n' },
      { input: '4\n-10 -20 0 30\n', expectedOutput: 'Min: -20, Max: 30, Avg: 0.00\n' },
    ],
  },
  {
    id: 'daily-c2-recursive-palindrome-pointer',
    slug: 'daily-c2-recursive-palindrome-pointer',
    title: 'Two-Pointer Recursive Palindrome Check',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    moduleIndex: 2,
    moduleName: 'Pointers & Functions',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Recursion', '#Pointers', '#Strings'],
    description: `### Problem Description
Implement a recursive function \`int is_palindrome_rec(const char *left, const char *right)\` that determines if a string is a palindrome ignoring case and alphanumeric filters (raw exact characters).
Print \`YES\` if palindrome, otherwise \`NO\`.

### Input Format
A single line string (up to 500 characters).

### Output Format
Print \`YES\` or \`NO\` followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int is_palindrome_rec(const char *left, const char *right) {
    // TODO: Recursive check
    return 1;
}

int main() {
    char s[512];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    size_t len = strlen(s);
    if (len > 0 && s[len - 1] == '\\n') s[len - 1] = '\\0';

    if (is_palindrome_rec(s, s + strlen(s) - 1)) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int is_palindrome_rec(const char *left, const char *right) {
    if (left >= right) return 1;
    if (*left != *right) return 0;
    return is_palindrome_rec(left + 1, right - 1);
}

int main() {
    char s[512];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    size_t len = strlen(s);
    if (len > 0 && s[len - 1] == '\\n') s[len - 1] = '\\0';

    if (len == 0 || is_palindrome_rec(s, s + strlen(s) - 1)) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}`,
    sampleTests: [
      { input: 'racecar\n', expectedOutput: 'YES\n' },
      { input: 'logicq\n', expectedOutput: 'NO\n' },
    ],
    hiddenTests: [
      { input: 'a\n', expectedOutput: 'YES\n' },
      { input: 'abccba\n', expectedOutput: 'YES\n' },
      { input: 'hello world\n', expectedOutput: 'NO\n' },
    ],
  },
  {
    id: 'daily-c3-kadane-max-subarray',
    slug: 'daily-c3-kadane-max-subarray',
    title: 'Kadane Maximum Subarray with Indices',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Kadane', '#DynamicProgramming', '#Arrays'],
    description: `### Problem Description
Given an array of $N$ integers (which may include negative values), find the contiguous subarray having the maximum sum using Kadane's Algorithm.
Print the maximum sum along with the 0-based start and end indices of that subarray. In case of ties, output the earliest starting index.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers.

### Output Format
Print \`Sum: [maxSum], Range: [[start]..[end]]\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Compute maximum subarray sum and indices via Kadane's Algorithm

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long arr[100005];
    for (int i = 0; i < n; i++) scanf("%lld", &arr[i]);

    long long maxSoFar = arr[0], currMax = arr[0];
    int start = 0, end = 0, tempStart = 0;

    for (int i = 1; i < n; i++) {
        if (arr[i] > currMax + arr[i]) {
            currMax = arr[i];
            tempStart = i;
        } else {
            currMax += arr[i];
        }

        if (currMax > maxSoFar) {
            maxSoFar = currMax;
            start = tempStart;
            end = i;
        }
    }

    printf("Sum: %lld, Range: [%d..%d]\\n", maxSoFar, start, end);
    return 0;
}`,
    sampleTests: [
      { input: '8\n-2 -3 4 -1 -2 1 5 -3\n', expectedOutput: 'Sum: 7, Range: [2..6]\n' },
    ],
    hiddenTests: [
      { input: '4\n-5 -2 -8 -1\n', expectedOutput: 'Sum: -1, Range: [3..3]\n' },
      { input: '5\n1 2 3 4 5\n', expectedOutput: 'Sum: 15, Range: [0..4]\n' },
    ],
  },
  {
    id: 'daily-c3-matrix-spiral-traversal',
    slug: 'daily-c3-matrix-spiral-traversal',
    title: 'Clockwise Spiral Matrix Unroller',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Matrix', '#Simulation', '#Arrays'],
    description: `### Problem Description
Given a 2D matrix with $R$ rows and $C$ columns, return all elements of the matrix in clockwise spiral order starting from top-left $(0, 0)$.

### Input Format
First line: Two integers $R$ and $C$ ($1 \\le R, C \\le 50$).
Next $R$ lines: $C$ integers per line.

### Output Format
Print the spiral traversal space-separated on a single line.`,
    starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;

    // TODO: Print matrix in clockwise spiral order

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    int mat[55][55];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            scanf("%d", &mat[i][j]);
        }
    }

    int top = 0, bottom = r - 1, left = 0, right = c - 1;
    int first = 1;

    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) {
            if (!first) printf(" ");
            printf("%d", mat[top][j]);
            first = 0;
        }
        top++;

        for (int i = top; i <= bottom; i++) {
            if (!first) printf(" ");
            printf("%d", mat[i][right]);
            first = 0;
        }
        right--;

        if (top <= bottom) {
            for (int j = right; j >= left; j--) {
                if (!first) printf(" ");
                printf("%d", mat[bottom][j]);
                first = 0;
            }
            bottom--;
        }

        if (left <= right) {
            for (int i = bottom; i >= top; i--) {
                if (!first) printf(" ");
                printf("%d", mat[i][left]);
                first = 0;
            }
            left++;
        }
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9\n', expectedOutput: '1 2 3 6 9 8 7 4 5\n' },
    ],
    hiddenTests: [
      { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: '1 2 3 6 5 4\n' },
      { input: '1 4\n10 20 30 40\n', expectedOutput: '10 20 30 40\n' },
    ],
  },
  {
    id: 'daily-c3-merge-sorted-intervals',
    slug: 'daily-c3-merge-sorted-intervals',
    title: 'Overlapping Interval Union Merger',
    difficulty: 'HARD',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 30,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Intervals', '#Sorting', '#Arrays'],
    description: `### Problem Description
Given a collection of $N$ closed intervals $[start, end]$, merge all overlapping intervals and print the consolidated intervals in ascending order of their start times.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 1000$).
Next $N$ lines: Two space-separated integers $start$ and $end$ ($0 \\le start \\le end \\le 10^5$).

### Output Format
Print each merged interval on a new line formatted as \`[start, end]\`.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Sort and merge overlapping intervals

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int start;
    int end;
} Interval;

int compareIntervals(const void *a, const void *b) {
    Interval *ia = (Interval *)a;
    Interval *ib = (Interval *)b;
    if (ia->start != ib->start) return ia->start - ib->start;
    return ia->end - ib->end;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Interval arr[1005];
    for (int i = 0; i < n; i++) scanf("%d %d", &arr[i].start, &arr[i].end);

    qsort(arr, n, sizeof(Interval), compareIntervals);

    Interval merged[1005];
    int mCount = 0;
    merged[mCount++] = arr[0];

    for (int i = 1; i < n; i++) {
        if (arr[i].start <= merged[mCount - 1].end) {
            if (arr[i].end > merged[mCount - 1].end) {
                merged[mCount - 1].end = arr[i].end;
            }
        } else {
            merged[mCount++] = arr[i];
        }
    }

    for (int i = 0; i < mCount; i++) {
        printf("[%d, %d]\\n", merged[i].start, merged[i].end);
    }
    return 0;
}`,
    sampleTests: [
      { input: '4\n1 3\n2 6\n8 10\n15 18\n', expectedOutput: '[1, 6]\n[8, 10]\n[15, 18]\n' },
    ],
    hiddenTests: [
      { input: '2\n1 4\n4 5\n', expectedOutput: '[1, 5]\n' },
      { input: '3\n5 8\n1 4\n6 7\n', expectedOutput: '[1, 4]\n[5, 8]\n' },
    ],
  },
  {
    id: 'daily-c3-longest-consecutive-subsequence',
    slug: 'daily-c3-longest-consecutive-subsequence',
    title: 'Longest Consecutive Elements Sequence',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Sorting', '#Arrays', '#Subsequence'],
    description: `### Problem Description
Given an unsorted array of $N$ integers, determine the length of the longest consecutive elements sequence (e.g., in \`100, 4, 200, 1, 3, 2\`, the longest sequence is \`1, 2, 3, 4\`, length = $4$). Duplicates do not extend the length.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers.

### Output Format
Print the integer length followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Determine length of longest consecutive sequence

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int cmp(const void *a, const void *b) {
    long long diff = (*(long long *)a - *(long long *)b);
    return (diff > 0) - (diff < 0);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long arr[100005];
    for (int i = 0; i < n; i++) scanf("%lld", &arr[i]);

    qsort(arr, n, sizeof(long long), cmp);

    int maxLen = 1, currLen = 1;
    for (int i = 1; i < n; i++) {
        if (arr[i] == arr[i - 1]) continue;
        if (arr[i] == arr[i - 1] + 1) {
            currLen++;
            if (currLen > maxLen) maxLen = currLen;
        } else {
            currLen = 1;
        }
    }
    printf("%d\\n", maxLen);
    return 0;
}`,
    sampleTests: [
      { input: '6\n100 4 200 1 3 2\n', expectedOutput: '4\n' },
    ],
    hiddenTests: [
      { input: '10\n0 3 7 2 5 8 4 6 0 1\n', expectedOutput: '9\n' },
      { input: '1\n50\n', expectedOutput: '1\n' },
    ],
  },
  {
    id: 'daily-c3-dutch-national-flag',
    slug: 'daily-c3-dutch-national-flag',
    title: 'In-Place Dutch National Flag Partition',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    moduleIndex: 3,
    moduleName: 'Array and its Applications',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#DutchNationalFlag', '#Pointers', '#Sorting'],
    description: `### Problem Description
Given an array containing only $0$s, $1$s, and $2$s, sort them in-place in a single pass using the Dutch National Flag 3-way partitioning algorithm.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($0$, $1$, or $2$).

### Output Format
Print the sorted integers space-separated on a single line.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: 3-way in-place partition

    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[100005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    int low = 0, mid = 0, high = n - 1;
    while (mid <= high) {
        if (arr[mid] == 0) {
            int tmp = arr[low];
            arr[low] = arr[mid];
            arr[mid] = tmp;
            low++;
            mid++;
        } else if (arr[mid] == 1) {
            mid++;
        } else {
            int tmp = arr[mid];
            arr[mid] = arr[high];
            arr[high] = tmp;
            high--;
        }
    }

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", arr[i]);
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '6\n2 0 2 1 1 0\n', expectedOutput: '0 0 1 1 2 2\n' },
    ],
    hiddenTests: [
      { input: '3\n2 0 1\n', expectedOutput: '0 1 2\n' },
      { input: '5\n0 0 0 0 0\n', expectedOutput: '0 0 0 0 0\n' },
    ],
  },
  {
    id: 'daily-c4-dynamic-circular-queue',
    slug: 'daily-c4-dynamic-circular-queue',
    title: 'Dynamic Ring Buffer Circular Queue',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types & DMA',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#DMA', '#Queue', '#RingBuffer'],
    description: `### Problem Description
Implement a dynamic circular queue (ring buffer) of capacity $K$ using heap memory (\`malloc\`).
Process $Q$ operations:
- \`ENQUEUE X\`: Push integer $X$. If full, print \`FULL\`.
- \`DEQUEUE\`: Pop and print integer. If empty, print \`EMPTY\`.

### Input Format
First line: Capacity $K$ ($1 \\le K \\le 1000$) and operation count $Q$ ($1 \\le Q \\le 5000$).
Next $Q$ lines: The operation.

### Output Format
Print outputs as dictated by operations.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int k, q;
    if (scanf("%d %d", &k, &q) != 2) return 0;

    // TODO: Dynamic circular queue implementation

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int k, q;
    if (scanf("%d %d", &k, &q) != 2) return 0;

    int *queue = (int *)malloc(k * sizeof(int));
    int front = 0, rear = 0, size = 0;

    for (int i = 0; i < q; i++) {
        char op[16];
        scanf("%s", op);
        if (strcmp(op, "ENQUEUE") == 0) {
            int val;
            scanf("%d", &val);
            if (size == k) {
                printf("FULL\\n");
            } else {
                queue[rear] = val;
                rear = (rear + 1) % k;
                size++;
            }
        } else if (strcmp(op, "DEQUEUE") == 0) {
            if (size == 0) {
                printf("EMPTY\\n");
            } else {
                printf("%d\\n", queue[front]);
                front = (front + 1) % k;
                size--;
            }
        }
    }
    free(queue);
    return 0;
}`,
    sampleTests: [
      { input: '3 5\nENQUEUE 10\nENQUEUE 20\nENQUEUE 30\nENQUEUE 40\nDEQUEUE\n', expectedOutput: 'FULL\n10\n' },
    ],
    hiddenTests: [
      { input: '2 4\nDEQUEUE\nENQUEUE 5\nDEQUEUE\nDEQUEUE\n', expectedOutput: 'EMPTY\n5\nEMPTY\n' },
    ],
  },
  {
    id: 'daily-c4-bitfield-packet-parser',
    slug: 'daily-c4-bitfield-packet-parser',
    title: 'Network Header Bitfield Packet Parser',
    difficulty: 'HARD',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types & DMA',
    basePoints: 30,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Bitfields', '#Structs', '#Systems'],
    description: `### Problem Description
A custom network protocol packet header contains a 16-bit integer encoding:
- Bits 0-3 (4 bits): Protocol Version
- Bits 4-5 (2 bits): Priority Level (0=Low, 1=Normal, 2=High, 3=Critical)
- Bit 6 (1 bit): Encryption Flag (0=No, 1=Yes)
- Bits 7-15 (9 bits): Payload Length in bytes

Parse a hexadecimal 16-bit integer into its constituent fields and print:
\`VER: [v] | PRIO: [p] | ENC: [e] | LEN: [len]\`.

### Input Format
A single line with a hexadecimal integer (e.g., \`0x12A4\` or \`12A4\`).

### Output Format
Print formatted header fields.`,
    starterCode: `#include <stdio.h>

int main() {
    unsigned int raw;
    if (scanf("%x", &raw) != 1) return 0;

    // TODO: Bitfield extraction

    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct PacketHeader {
    unsigned int version : 4;
    unsigned int priority : 2;
    unsigned int encrypted : 1;
    unsigned int length : 9;
};

int main() {
    unsigned int raw;
    if (scanf("%x", &raw) != 1) return 0;

    struct PacketHeader hdr;
    hdr.version = raw & 0x0F;
    hdr.priority = (raw >> 4) & 0x03;
    hdr.encrypted = (raw >> 6) & 0x01;
    hdr.length = (raw >> 7) & 0x1FF;

    const char *prioNames[] = {"Low", "Normal", "High", "Critical"};
    printf("VER: %u | PRIO: %s | ENC: %s | LEN: %u\\n",
           hdr.version,
           prioNames[hdr.priority],
           hdr.encrypted ? "Yes" : "No",
           hdr.length);
    return 0;
}`,
    sampleTests: [
      { input: '0x0A53\n', expectedOutput: 'VER: 3 | PRIO: Normal | ENC: Yes | LEN: 20\n' },
    ],
    hiddenTests: [
      { input: '0x0000\n', expectedOutput: 'VER: 0 | PRIO: Low | ENC: No | LEN: 0\n' },
      { input: '0xFFFF\n', expectedOutput: 'VER: 15 | PRIO: Critical | ENC: Yes | LEN: 511\n' },
    ],
  },
  {
    id: 'daily-c4-sorted-linked-list-merge',
    slug: 'daily-c4-sorted-linked-list-merge',
    title: 'In-Place Sorted Linked List Splice',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types & DMA',
    basePoints: 25,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#LinkedList', '#DMA', '#Pointers'],
    description: `### Problem Description
Given two singly linked lists sorted in non-decreasing order, splice their nodes together in-place without allocating new nodes to form one single sorted linked list.

### Input Format
First line: Length of List 1 ($N$) followed by $N$ integers.
Second line: Length of List 2 ($M$) followed by $M$ integers.

### Output Format
Print the merged sorted list space-separated on a single line.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    // TODO: Build lists, splice in-place, and print
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *createNode(int val) {
    Node *n = (Node *)malloc(sizeof(Node));
    n->data = val;
    n->next = NULL;
    return n;
}

int main() {
    int n, m;
    if (scanf("%d", &n) != 1) return 0;
    Node *head1 = NULL, *tail1 = NULL;
    for (int i = 0; i < n; i++) {
        int v; scanf("%d", &v);
        Node *node = createNode(v);
        if (!head1) head1 = tail1 = node;
        else { tail1->next = node; tail1 = node; }
    }

    if (scanf("%d", &m) != 1) return 0;
    Node *head2 = NULL, *tail2 = NULL;
    for (int i = 0; i < m; i++) {
        int v; scanf("%d", &v);
        Node *node = createNode(v);
        if (!head2) head2 = tail2 = node;
        else { tail2->next = node; tail2 = node; }
    }

    Node dummy;
    dummy.next = NULL;
    Node *tail = &dummy;
    Node *p1 = head1, *p2 = head2;

    while (p1 && p2) {
        if (p1->data <= p2->data) {
            tail->next = p1;
            p1 = p1->next;
        } else {
            tail->next = p2;
            p2 = p2->next;
        }
        tail = tail->next;
    }
    tail->next = p1 ? p1 : p2;

    Node *curr = dummy.next;
    int first = 1;
    while (curr) {
        if (!first) printf(" ");
        printf("%d", curr->data);
        first = 0;
        Node *tmp = curr;
        curr = curr->next;
        free(tmp);
    }
    printf("\\n");
    return 0;
}`,
    sampleTests: [
      { input: '3 1 2 4\n3 1 3 4\n', expectedOutput: '1 1 2 3 4 4\n' },
    ],
    hiddenTests: [
      { input: '0\n1 5\n', expectedOutput: '5\n' },
      { input: '2 10 30\n2 20 40\n', expectedOutput: '10 20 30 40\n' },
    ],
  },
  {
    id: 'daily-c4-student-grade-struct-sorter',
    slug: 'daily-c4-student-grade-struct-sorter',
    title: 'Multi-Level Struct Record Sorter',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    moduleIndex: 4,
    moduleName: 'Advanced Data Types & DMA',
    basePoints: 20,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    isDaily: true,
    isPractice: false,
    tags: ['#Structs', '#qsort', '#DMA'],
    description: `### Problem Description
Given $N$ student records consisting of \`Roll (int)\`, \`Name (string up to 30 chars)\`, and \`Score (double)\`, dynamically allocate an array of structs on the heap and sort them:
1. Higher score first (descending).
2. On tie: Ascending order of Roll number.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 100$).
Next $N$ lines: \`[Roll] [Name] [Score]\`.

### Output Format
Print sorted records: \`[Rank]. [Name] (Roll: [Roll]) - [Score]\` with score to 2 decimals.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Dynamic struct allocation and sorting

    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int roll;
    char name[32];
    double score;
} Student;

int cmpStudents(const void *a, const void *b) {
    Student *sa = (Student *)a;
    Student *sb = (Student *)b;
    if (sa->score != sb->score) {
        return (sb->score > sa->score) ? 1 : -1;
    }
    return sa->roll - sb->roll;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Student *students = (Student *)malloc(n * sizeof(Student));
    for (int i = 0; i < n; i++) {
        scanf("%d %s %lf", &students[i].roll, students[i].name, &students[i].score);
    }

    qsort(students, n, sizeof(Student), cmpStudents);

    for (int i = 0; i < n; i++) {
        printf("%d. %s (Roll: %d) - %.2f\\n", i + 1, students[i].name, students[i].roll, students[i].score);
    }
    free(students);
    return 0;
}`,
    sampleTests: [
      { input: '3\n101 Alice 85.50\n102 Bob 92.00\n103 Charlie 85.50\n', expectedOutput: '1. Bob (Roll: 102) - 92.00\n2. Alice (Roll: 101) - 85.50\n3. Charlie (Roll: 103) - 85.50\n' },
    ],
    hiddenTests: [
      { input: '1\n100 Solo 99.99\n', expectedOutput: '1. Solo (Roll: 100) - 99.99\n' },
    ],
  },
];
