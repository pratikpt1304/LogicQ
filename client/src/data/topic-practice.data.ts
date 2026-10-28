import { ADDITIONAL_PRACTICE_TOPICS } from './topic-practice-part2.data.js';

export interface TopicPracticeItem {
  id: string;
  moduleIndex: number;
  moduleSlug: string;
  moduleTitle: string;
  topicTitle: string;
  summary: string;
  tipBox: {
    syntax: string;
    application: string;
    example: string;
  };
  problem: {
    title: string;
    difficulty: 'EASY' | 'MEDIUM';
    description: string;
    starterCode: string;
    solutionCode: string;
    openTestCase: {
      input: string;
      expectedOutput: string;
      explanation: string;
    };
    hiddenTestCase: {
      input: string;
      expectedOutput: string;
    };
  };
}

const BASE_TOPIC_PRACTICE_DATA: TopicPracticeItem[] = [
  // ==========================================
  // MODULE 1: CONTROL STRUCTURES (6 Topics)
  // ==========================================
  {
    id: 'm1-t1-basic-io',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Basic Input / Output & Format Specifiers',
    summary: 'Master scanf, printf and precise numerical format control.',
    tipBox: {
      syntax: `// Standard formatted I/O syntax
#include <stdio.h>
scanf("%d %f", &intVar, &floatVar); // Notice the address-of operator '&'
printf("Result: %d, Float: %.2f\\n", intVar, floatVar);`,
      application: 'Embedded sensors and CLI utility tools read raw byte streams and telemetry via stdin and stream formatted diagnostics to stdout.',
      example: `#include <stdio.h>
int main() {
    int age;
    if (scanf("%d", &age) == 1) {
        printf("Recorded age: %d years\\n", age);
    }
    return 0;
}`,
    },
    problem: {
      title: 'Formatted Temperature Converter',
      difficulty: 'EASY',
      description: `### Problem Description
Write a C program that reads a temperature in Celsius (float) and prints its Fahrenheit equivalent formatted strictly to **2 decimal places**.

### Formula
$$F = (C \\times 9 / 5) + 32$$

### Input Format
A single floating-point number representing temperature in Celsius.

### Output Format
Print the Fahrenheit value formatted to exactly two decimal places, followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    float c, f;
    // Read temperature in Celsius
    if (scanf("%f", &c) != 1) return 0;
    
    // TODO: Convert to Fahrenheit and print with %.2f
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    float c, f;
    if (scanf("%f", &c) != 1) return 0;
    f = (c * 9.0f / 5.0f) + 32.0f;
    printf("%.2f\\n", f);
    return 0;
}`,
      openTestCase: {
        input: '0.0',
        expectedOutput: '32.00',
        explanation: 'At 0°C, Fahrenheit is exactly 32.00.',
      },
      hiddenTestCase: {
        input: '37.5',
        expectedOutput: '99.50',
      },
    },
  },

  {
    id: 'm1-t2-if-else',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Conditional Branching (if, else if, else)',
    summary: 'Direct execution flow based on boolean expressions and compound bounds.',
    tipBox: {
      syntax: `if (condition1) {
    // executes when condition1 is true (non-zero)
} else if (condition2) {
    // executes when condition1 is false and condition2 is true
} else {
    // default fallback branch
}`,
      application: 'Operating system scheduler state guards, access control privilege checks, and safety boundary interlocks.',
      example: `int speed = 85;
if (speed > 100) {
    printf("Critical Overspeed\\n");
} else if (speed > 80) {
    printf("Warning Zone\\n");
} else {
    printf("Safe Cruising\\n");
}`,
    },
    problem: {
      title: 'Triangle Validity & Classification',
      difficulty: 'EASY',
      description: `### Problem Description
Given three positive integers representing the side lengths of a triangle $A, B, C$:
1. Check if they form a valid triangle ($A+B>C$, $A+C>B$, and $B+C>A$).
2. If valid, print \`EQUILATERAL\` if all three sides are equal, \`ISOSCELES\` if any two are equal, or \`SCALENE\` if all three are distinct.
3. If invalid, print \`INVALID\`.

### Input Format
Three space-separated integers $A, B, C$.

### Output Format
A single line containing \`EQUILATERAL\`, \`ISOSCELES\`, \`SCALENE\`, or \`INVALID\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) return 0;

    // TODO: Verify triangle inequality and classify
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) return 0;
    if (a + b <= c || a + c <= b || b + c <= a) {
        printf("INVALID\\n");
    } else if (a == b && b == c) {
        printf("EQUILATERAL\\n");
    } else if (a == b || b == c || a == c) {
        printf("ISOSCELES\\n");
    } else {
        printf("SCALENE\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '5 5 5',
        expectedOutput: 'EQUILATERAL',
        explanation: 'All 3 sides equal = EQUILATERAL.',
      },
      hiddenTestCase: {
        input: '3 4 5',
        expectedOutput: 'SCALENE',
      },
    },
  },

  {
    id: 'm1-t3-switch-case',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Multi-Way Selection (switch-case & jump tables)',
    summary: 'High-speed discrete value branching compiled into efficient jump tables.',
    tipBox: {
      syntax: `switch (integralExpression) {
    case CONSTANT_1:
        // statements
        break; // crucial to prevent fallthrough
    case CONSTANT_2:
        // statements
        break;
    default:
        // fallback branch
}`,
      application: 'Compiler lexical scanners, virtual machine opcode dispatchers, and state machine transition tables.',
      example: `char op = '+';
switch (op) {
    case '+': printf("Sum\\n"); break;
    case '-': printf("Diff\\n"); break;
    default: printf("Unknown\\n");
}`,
    },
    problem: {
      title: 'Arithmetic Evaluator',
      difficulty: 'EASY',
      description: `### Problem Description
Write a program that takes two integers $A$ and $B$, and a character operator $OP$ (\`+\`, \`-\`, \`*\`, \`/\`), and computes the result using a \`switch\` statement. For division by zero, print \`ERROR\`.

### Input Format
Format: \`A OP B\` (e.g. \`10 + 5\` or \`8 / 2\`)

### Output Format
Print the integer result, or \`ERROR\` for division by zero.`,
      starterCode: `#include <stdio.h>

int main() {
    int a, b;
    char op;
    if (scanf("%d %c %d", &a, &op, &b) != 3) return 0;

    // TODO: Use switch(op) to calculate result
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int a, b;
    char op;
    if (scanf("%d %c %d", &a, &op, &b) != 3) return 0;
    switch (op) {
        case '+': printf("%d\\n", a + b); break;
        case '-': printf("%d\\n", a - b); break;
        case '*': printf("%d\\n", a * b); break;
        case '/':
            if (b == 0) printf("ERROR\\n");
            else printf("%d\\n", a / b);
            break;
        default: printf("ERROR\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '15 * 4',
        expectedOutput: '60',
        explanation: '15 multiplied by 4 is 60.',
      },
      hiddenTestCase: {
        input: '10 / 0',
        expectedOutput: 'ERROR',
      },
    },
  },

  {
    id: 'm1-t4-for-loops',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Definite Iteration (for loops & step sequences)',
    summary: 'Counting loops with initialization, boundary condition, and step increment.',
    tipBox: {
      syntax: `for (int i = 0; i < N; i++) {
    // executes N times (i ranges from 0 to N-1)
}`,
      application: 'Array iteration, buffer scanning, audio signal convolution, and cryptographic hashing rounds.',
      example: `int total = 0;
for (int i = 1; i <= 5; i++) {
    total += i;
}
printf("Total = %d\\n", total); // 15`,
    },
    problem: {
      title: 'Sum of Multiples',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer $N$, calculate the sum of all integers between $1$ and $N$ (inclusive) that are divisible by either $3$ or $5$.

### Input Format
A single integer $N$ ($1 \\le N \\le 10^5$).

### Output Format
Print the total sum as a 64-bit integer (\`long long\`).`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    long long sum = 0;
    // TODO: Iterate with a for loop and accumulate sum
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long sum = 0;
    for (int i = 1; i <= n; i++) {
        if (i % 3 == 0 || i % 5 == 0) {
            sum += i;
        }
    }
    printf("%lld\\n", sum);
    return 0;
}`,
      openTestCase: {
        input: '10',
        expectedOutput: '33',
        explanation: 'Multiples of 3 or 5 under 10 are: 3, 5, 6, 9, 10. Sum = 33.',
      },
      hiddenTestCase: {
        input: '100',
        expectedOutput: '2418',
      },
    },
  },

  {
    id: 'm1-t5-while-loops',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Indefinite Iteration (while & do-while loops)',
    summary: 'Condition-driven loops where step count is determined at runtime.',
    tipBox: {
      syntax: `while (condition) {
    // pre-checked: executes 0 or more times
}

do {
    // post-checked: executes AT LEAST once
} while (condition);`,
      application: 'Network socket polling, hardware DMA completion checks, and digit manipulation algorithms.',
      example: `int n = 1234, count = 0;
while (n > 0) {
    count++;
    n /= 10;
}
printf("Digits: %d\\n", count); // 4`,
    },
    problem: {
      title: 'Reverse and Sum Digits',
      difficulty: 'EASY',
      description: `### Problem Description
Given a non-negative integer $N$, use a \`while\` loop to compute:
1. The reversed integer.
2. The sum of its individual digits.

Print both separated by a space.

### Input Format
A single non-negative integer $N$ ($0 \\le N \\le 2 \\times 10^9$).

### Output Format
Print \`REVERSED SUM\` (e.g. for 1230 -> \`321 6\`).`,
      starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;

    // TODO: Extract digits with while loop
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    if (n == 0) {
        printf("0 0\\n");
        return 0;
    }
    long long temp = n;
    long long rev = 0;
    long long sum = 0;
    while (temp > 0) {
        int d = temp % 10;
        rev = rev * 10 + d;
        sum += d;
        temp /= 10;
    }
    printf("%lld %lld\\n", rev, sum);
    return 0;
}`,
      openTestCase: {
        input: '1234',
        expectedOutput: '4321 10',
        explanation: 'Reversed is 4321. Sum of digits 1+2+3+4 = 10.',
      },
      hiddenTestCase: {
        input: '908',
        expectedOutput: '809 17',
      },
    },
  },

  {
    id: 'm1-t6-nested-loops',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Nested Loops & Grid Coordinates',
    summary: 'Coordinate 2D loops for row-column processing and geometric patterns.',
    tipBox: {
      syntax: `for (int row = 0; row < R; row++) {
    for (int col = 0; col < C; col++) {
        // inner body runs R * C times
    }
}`,
      application: 'Pixel shader rasterization, matrix transformations, and cryptographic block permutations.',
      example: `for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= i; j++) printf("*");
    printf("\\n");
}`,
    },
    problem: {
      title: 'Inverted Right Pyramid',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer $N$, print an inverted right-angled pyramid of stars (\`*\`) of height $N$.
First row has $N$ stars, second has $N-1$, down to 1 star in the last row.

### Input Format
A single integer $N$ ($1 \\le N \\le 20$).

### Output Format
$N$ lines showing the pattern.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Nested loops to print pattern
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    for (int i = n; i >= 1; i--) {
        for (int j = 0; j < i; j++) {
            putchar('*');
        }
        putchar('\\n');
    }
    return 0;
}`,
      openTestCase: {
        input: '3',
        expectedOutput: `***
**
*`,
        explanation: 'Height 3 outputs 3 stars, then 2, then 1.',
      },
      hiddenTestCase: {
        input: '4',
        expectedOutput: `****
***
**
*`,
      },
    },
  },

  // ==========================================
  // MODULE 2: POINTERS & FUNCTIONS (6 Topics)
  // ==========================================
  {
    id: 'm2-t1-functions',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Modular Functions & Return Types',
    summary: 'Code modularity, forward prototyping, parameter passing and pure functions.',
    tipBox: {
      syntax: `// Function prototype declaration
int calculateGCD(int a, int b);

// Definition
int calculateGCD(int a, int b) {
    while (b != 0) {
        int t = b;
        b = a % b;
        a = t;
    }
    return a;
}`,
      application: 'Reusable system libraries (libc), OS API contracts, and modular firmware subsystems.',
      example: `int square(int x) { return x * x; }
int main() {
    printf("%d\\n", square(6)); // 36
}`,
    },
    problem: {
      title: 'Greatest Common Divisor (GCD)',
      difficulty: 'EASY',
      description: `### Problem Description
Implement a modular function \`int gcd(int a, int b)\` using the Euclidean algorithm to find and print the greatest common divisor of two integers.

### Input Format
Two space-separated integers $A, B$ ($1 \\le A, B \\le 10^9$).

### Output Format
Print the single integer GCD followed by a newline.`,
      starterCode: `#include <stdio.h>

int gcd(int a, int b) {
    // TODO: Return GCD of a and b
    return 1;
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    printf("%d\\n", gcd(a, b));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    printf("%d\\n", gcd(a, b));
    return 0;
}`,
      openTestCase: {
        input: '48 18',
        expectedOutput: '6',
        explanation: 'GCD of 48 and 18 is 6.',
      },
      hiddenTestCase: {
        input: '101 103',
        expectedOutput: '1',
      },
    },
  },

  {
    id: 'm2-t2-recursion',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Recursion & Call Stack Dynamics',
    summary: 'Self-referential functions with well-defined base cases and stack unwind.',
    tipBox: {
      syntax: `long long factorial(int n) {
    if (n <= 1) return 1; // Mandatory base case!
    return n * factorial(n - 1); // Recursive call step
}`,
      application: 'DOM tree traversal, file-system recursive directory walks, and divide-and-conquer algorithms (MergeSort).',
      example: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    },
    problem: {
      title: 'Fast Modular Power',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Using recursion, compute $(Base^{Exp}) \\pmod{1000000007}$ in $O(\\log Exp)$ time using binary exponentiation:
- If $Exp = 0$, result is $1$.
- If $Exp$ is even, $(Base^{Exp/2})^2 \\pmod M$.
- If $Exp$ is odd, $Base \\times Base^{Exp-1} \\pmod M$.

### Input Format
Two space-separated integers $Base$ and $Exp$.

### Output Format
The computed result modulo $10^9+7$.`,
      starterCode: `#include <stdio.h>

const long long MOD = 1000000007;

long long fastPower(long long base, long long exp) {
    // TODO: Implement recursive binary exponentiation
    return 1;
}

int main() {
    long long b, e;
    if (scanf("%lld %lld", &b, &e) != 2) return 0;
    printf("%lld\\n", fastPower(b, e));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

const long long MOD = 1000000007;

long long fastPower(long long base, long long exp) {
    if (exp == 0) return 1;
    base %= MOD;
    long long half = fastPower(base, exp / 2);
    long long halfSq = (half * half) % MOD;
    if (exp % 2 == 1) {
        return (halfSq * base) % MOD;
    }
    return halfSq;
}

int main() {
    long long b, e;
    if (scanf("%lld %lld", &b, &e) != 2) return 0;
    printf("%lld\\n", fastPower(b, e));
    return 0;
}`,
      openTestCase: {
        input: '2 10',
        expectedOutput: '1024',
        explanation: '2^10 = 1024.',
      },
      hiddenTestCase: {
        input: '3 13',
        expectedOutput: '1594323',
      },
    },
  },

  {
    id: 'm2-t3-pointer-basics',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Pointer Basics & Memory Dereferencing',
    summary: 'Variables storing raw memory addresses with address-of (&) and dereference (*).',
    tipBox: {
      syntax: `int val = 42;
int *ptr = &val; // ptr stores address of val
*ptr = 99;      // dereference ptr to directly mutate val!
printf("%d", val); // prints 99`,
      application: 'Direct hardware register manipulation, driver DMA buffers, and zero-copy data passing.',
      example: `int x = 10;
int *p = &x;
printf("Address: %p, Value: %d\\n", (void*)p, *p);`,
    },
    problem: {
      title: 'In-Place Pointer Mutation',
      difficulty: 'EASY',
      description: `### Problem Description
Write a function \`void doubleAndSquare(int *x, int *y)\` that receives pointers to two integers.
It must replace the first integer with its double ($x \\times 2$) and the second with its square ($y \\times y$).

### Input Format
Two space-separated integers $A$ and $B$.

### Output Format
Print the mutated values of $A$ and $B$ separated by a space.`,
      starterCode: `#include <stdio.h>

void doubleAndSquare(int *x, int *y) {
    // TODO: Mutate values pointed to by x and y
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    doubleAndSquare(&a, &b);
    printf("%d %d\\n", a, b);
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void doubleAndSquare(int *x, int *y) {
    *x = (*x) * 2;
    *y = (*y) * (*y);
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    doubleAndSquare(&a, &b);
    printf("%d %d\\n", a, b);
    return 0;
}`,
      openTestCase: {
        input: '5 4',
        expectedOutput: '10 16',
        explanation: '5 doubled = 10, 4 squared = 16.',
      },
      hiddenTestCase: {
        input: '7 9',
        expectedOutput: '14 81',
      },
    },
  },

  {
    id: 'm2-t4-call-by-reference',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Call by Value vs Call by Reference',
    summary: 'Overcoming C pass-by-value limitations by passing pointer addresses.',
    tipBox: {
      syntax: `void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}`,
      application: 'Functions needing multiple output return values (e.g. `pthread_join`, `scanf`, OS status codes).',
      example: `int u = 1, v = 2;
swap(&u, &v); // u is now 2, v is 1`,
    },
    problem: {
      title: 'Cyclic Triple Swap',
      difficulty: 'EASY',
      description: `### Problem Description
Implement a function \`void cyclicShift(int *a, int *b, int *c)\` that shifts values cyclically:
- $a$ takes original value of $c$
- $b$ takes original value of $a$
- $c$ takes original value of $b$

### Input Format
Three space-separated integers $A, B, C$.

### Output Format
Print the shifted values $A, B, C$.`,
      starterCode: `#include <stdio.h>

void cyclicShift(int *a, int *b, int *c) {
    // TODO: Perform cyclic shift using pointers
}

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) return 0;
    cyclicShift(&a, &b, &c);
    printf("%d %d %d\\n", a, b, c);
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void cyclicShift(int *a, int *b, int *c) {
    int oldA = *a;
    int oldB = *b;
    int oldC = *c;
    *a = oldC;
    *b = oldA;
    *c = oldB;
}

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) != 3) return 0;
    cyclicShift(&a, &b, &c);
    printf("%d %d %d\\n", a, b, c);
    return 0;
}`,
      openTestCase: {
        input: '10 20 30',
        expectedOutput: '30 10 20',
        explanation: 'a becomes 30, b becomes 10, c becomes 20.',
      },
      hiddenTestCase: {
        input: '5 9 1',
        expectedOutput: '1 5 9',
      },
    },
  },

  {
    id: 'm2-t5-pointer-arithmetic',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Pointer Arithmetic & Memory Offsets',
    summary: 'Stepping through memory contiguous segments: ptr + 1 scales by sizeof(*ptr).',
    tipBox: {
      syntax: `int arr[5] = {10, 20, 30, 40, 50};
int *p = arr; // points to arr[0]
p++;          // points to arr[1] (+4 bytes on 32-bit int)
printf("%d", *(p + 2)); // prints arr[3] = 40`,
      application: 'Memory allocator bucket navigators, network packet headers extraction, and hardware framebuffers.',
      example: `int arr[3] = {1, 2, 3};
for (int *p = arr; p < arr + 3; p++) {
    printf("%d ", *p);
}`,
    },
    problem: {
      title: 'Sum Array via Pointer Arithmetic Only',
      difficulty: 'EASY',
      description: `### Problem Description
Given an array of $N$ integers, compute the sum of all elements **using pointer arithmetic exclusively** (without using brackets \`[]\` in your traversal logic).

### Input Format
First line: Integer $N$ ($1 \\le N \\le 1000$).
Second line: $N$ space-separated integers.

### Output Format
Print the sum followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    long long sum = 0;
    int *ptr = arr;
    // TODO: Use *ptr and ptr++ to accumulate sum
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    long long sum = 0;
    int *ptr = arr;
    for (int i = 0; i < n; i++) {
        sum += *ptr;
        ptr++;
    }
    printf("%lld\\n", sum);
    return 0;
}`,
      openTestCase: {
        input: `4
5 10 15 20`,
        expectedOutput: '50',
        explanation: '5 + 10 + 15 + 20 = 50.',
      },
      hiddenTestCase: {
        input: `3
-5 10 -2`,
        expectedOutput: '3',
      },
    },
  },

  {
    id: 'm2-t6-function-pointers',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Function Pointers & Callbacks',
    summary: 'Statically typed pointers to executable code instructions.',
    tipBox: {
      syntax: `// Declares a pointer to a function returning int and taking two ints
int (*operation)(int, int);

// Assign and invoke
operation = &add;
int result = operation(5, 3);`,
      application: 'qsort comparison predicates, GUI event listeners, OS interrupt vector tables, and device driver vtables.',
      example: `int inc(int x) { return x + 1; }
int main() {
    int (*fn)(int) = inc;
    printf("%d\\n", fn(9)); // 10
}`,
    },
    problem: {
      title: 'Callback Array Transformer',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Implement a callback transform function:
\`void transform(int *arr, int n, int (*op)(int))\`
Apply the operation to each element in-place.
- If command is \`1\`, apply square ($x^2$).
- If command is \`2\`, apply negation ($-x$).

### Input Format
First line: Integer $N$ and Command $C$ (1 or 2).
Second line: $N$ integers.

### Output Format
Print the transformed array elements separated by spaces.`,
      starterCode: `#include <stdio.h>

int opSquare(int x) { return x * x; }
int opNegate(int x) { return -x; }

void transform(int *arr, int n, int (*op)(int)) {
    // TODO: Apply op(arr[i]) to each element
}

int main() {
    int n, cmd;
    if (scanf("%d %d", &n, &cmd) != 2) return 0;
    int arr[100];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    // TODO: Wire function pointer and call transform
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int opSquare(int x) { return x * x; }
int opNegate(int x) { return -x; }

void transform(int *arr, int n, int (*op)(int)) {
    for (int i = 0; i < n; i++) {
        arr[i] = op(arr[i]);
    }
}

int main() {
    int n, cmd;
    if (scanf("%d %d", &n, &cmd) != 2) return 0;
    int arr[100];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    if (cmd == 1) transform(arr, n, opSquare);
    else transform(arr, n, opNegate);

    for (int i = 0; i < n; i++) {
        printf("%d%c", arr[i], i == n - 1 ? '\\n' : ' ');
    }
    return 0;
}`,
      openTestCase: {
        input: `3 1
2 3 4`,
        expectedOutput: '4 9 16',
        explanation: 'Command 1 squares: 4 9 16.',
      },
      hiddenTestCase: {
        input: `3 2
5 -3 8`,
        expectedOutput: '-5 3 -8',
      },
    },
  },

  // ==========================================
  // MODULE 3: ARRAYS & APPLICATIONS (6 Topics)
  // ==========================================
  {
    id: 'm3-t1-1d-arrays',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: '1D Arrays & Memory Buffers',
    summary: 'Contiguous element buffers with constant O(1) random index access.',
    tipBox: {
      syntax: `int buffer[100]; // allocates 100 * sizeof(int) contiguous bytes
buffer[0] = 10;
int last = buffer[99];`,
      application: 'Audio sample buffers, network MTU packets, lookup tables, and telemetry queues.',
      example: `int nums[] = {2, 4, 6, 8};
int len = sizeof(nums) / sizeof(nums[0]);`,
    },
    problem: {
      title: 'Second Largest Element',
      difficulty: 'EASY',
      description: `### Problem Description
Given an array of $N$ integers, find and print the **second largest distinct element** in a single pass $O(N)$ without sorting. If no second distinct largest exists, print \`-1\`.

### Input Format
First line: Integer $N$ ($2 \\le N \\le 10^5$).
Second line: $N$ integers.

### Output Format
Print the second largest distinct integer or \`-1\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Single-pass scan to track max and secondMax
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long first = LLONG_MIN, second = LLONG_MIN;
    for (int i = 0; i < n; i++) {
        long long val;
        scanf("%lld", &val);
        if (val > first) {
            second = first;
            first = val;
        } else if (val < first && val > second) {
            second = val;
        }
    }
    if (second == LLONG_MIN) printf("-1\\n");
    else printf("%lld\\n", second);
    return 0;
}`,
      openTestCase: {
        input: `5
12 35 1 10 34`,
        expectedOutput: '34',
        explanation: '35 is first largest, 34 is second largest.',
      },
      hiddenTestCase: {
        input: `4
10 10 10 10`,
        expectedOutput: '-1',
      },
    },
  },

  {
    id: 'm3-t2-searching',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Binary Search on Sorted Arrays',
    summary: 'Divide-and-conquer logarithmic O(log N) lookup.',
    tipBox: {
      syntax: `int low = 0, high = N - 1;
while (low <= high) {
    int mid = low + (high - low) / 2; // prevents integer overflow!
    if (arr[mid] == target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
}`,
      application: 'B-tree database index scans, dictionary lookups, and virtual memory page translation.',
      example: `int idx = binarySearch(sortedArray, size, targetKey);`,
    },
    problem: {
      title: 'Binary Search Index Locator',
      difficulty: 'EASY',
      description: `### Problem Description
Given a sorted array of $N$ distinct integers and a query $Target$, return the zero-based index of $Target$. If not found, print \`-1\`.

### Input Format
First line: Integers $N$ and $Target$.
Second line: $N$ sorted integers.

### Output Format
Zero-based index or \`-1\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;

    // TODO: Implement binary search
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int arr[10005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    int low = 0, high = n - 1, ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            ans = mid;
            break;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    printf("%d\\n", ans);
    return 0;
}`,
      openTestCase: {
        input: `5 23
2 5 8 12 23`,
        expectedOutput: '4',
        explanation: '23 is at index 4.',
      },
      hiddenTestCase: {
        input: `4 100
10 20 30 40`,
        expectedOutput: '-1',
      },
    },
  },

  {
    id: 'm3-t3-2d-matrices',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: '2D Arrays & Matrix Algebra',
    summary: 'Row-major 2D grids mapped to contiguous linear memory addresses.',
    tipBox: {
      syntax: `int matrix[R][C];
// In row-major order: matrix[i][j] maps to *(matrix + i * C + j)`,
      application: 'Digital image convolutions, 3D graphics projection matrices, and physics simulations.',
      example: `int mat[2][2] = {{1, 2}, {3, 4}};
printf("%d\\n", mat[1][0]); // 3`,
    },
    problem: {
      title: 'Matrix Transposition',
      difficulty: 'EASY',
      description: `### Problem Description
Given an $R \\times C$ matrix, compute its transpose ($C \\times R$ where rows become columns).

### Input Format
First line: Integers $R$ and $C$ ($1 \\le R, C \\le 50$).
Following $R$ lines: $C$ integers each.

### Output Format
Print the transposed $C \\times R$ matrix.`,
      starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;

    // TODO: Read matrix and print transpose
    
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
    for (int j = 0; j < c; j++) {
        for (int i = 0; i < r; i++) {
            printf("%d%c", mat[i][j], i == r - 1 ? '\\n' : ' ');
        }
    }
    return 0;
}`,
      openTestCase: {
        input: `2 3
1 2 3
4 5 6`,
        expectedOutput: `1 4
2 5
3 6`,
        explanation: 'Rows become columns.',
      },
      hiddenTestCase: {
        input: `2 2
9 8
7 6`,
        expectedOutput: `9 7
8 6`,
      },
    },
  },

  {
    id: 'm3-t4-matrix-mult',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Matrix Multiplication (Dot Product)',
    summary: 'Multi-nested loop dot product for linear transformations.',
    tipBox: {
      syntax: `// For A (R1 x C1) and B (C1 x C2) -> Result (R1 x C2):
for (int i = 0; i < R1; i++) {
    for (int j = 0; j < C2; j++) {
        res[i][j] = 0;
        for (int k = 0; k < C1; k++) {
            res[i][j] += A[i][k] * B[k][j];
        }
    }
}`,
      application: 'Deep learning tensor operations, neural network layer feeds, and game physics engines.',
      example: `res[i][j] += A[i][k] * B[k][j];`,
    },
    problem: {
      title: 'Square Matrix Multiplication',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given an integer $N$ and two $N \\times N$ matrices $A$ and $B$, compute their matrix product $A \\times B$.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 30$).
Following $N$ lines: Matrix $A$.
Following $N$ lines: Matrix $B$.

### Output Format
Print the $N \\times N$ resulting matrix.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Multiply matrices A and B
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[35][35], b[35][35], c[35][35] = {0};
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) scanf("%d", &a[i][j]);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) scanf("%d", &b[i][j]);

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            for (int k = 0; k < n; k++) {
                c[i][j] += a[i][k] * b[k][j];
            }
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%c", c[i][j], j == n - 1 ? '\\n' : ' ');
        }
    }
    return 0;
}`,
      openTestCase: {
        input: `2
1 2
3 4
2 0
1 2`,
        expectedOutput: `4 4
10 8`,
        explanation: 'Row-column dot products.',
      },
      hiddenTestCase: {
        input: `2
1 0
0 1
5 6
7 8`,
        expectedOutput: `5 6
7 8`,
      },
    },
  },

  {
    id: 'm3-t5-strings',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Strings & Null-Terminator Character Traversal',
    summary: 'C-strings as null-terminated character arrays (\'\\0\').',
    tipBox: {
      syntax: `char str[] = "LogicQ"; // length 6 + 1 byte for '\\0'
// Iteration until null terminator:
for (int i = 0; str[i] != '\\0'; i++) {
    // process str[i]
}`,
      application: 'HTTP request headers parsing, compiler lexical tokens, command-line argument processing.',
      example: `char greeting[20] = "Hello";
greeting[0] = 'h'; // mutates in-place`,
    },
    problem: {
      title: 'String Vowel Inversion',
      difficulty: 'EASY',
      description: `### Problem Description
Given a string $S$, count the number of vowels (A, E, I, O, U, case-insensitive) and print the count followed by the string with all lowercase letters converted to uppercase.

### Input Format
A single line string $S$ (max 200 characters, no spaces).

### Output Format
Line 1: Number of vowels.
Line 2: Uppercase string.`,
      starterCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    char s[205];
    if (scanf("%200s", s) != 1) return 0;

    // TODO: Count vowels and uppercase string
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    char s[205];
    if (scanf("%200s", s) != 1) return 0;
    int vowels = 0;
    for (int i = 0; s[i] != '\\0'; i++) {
        char ch = toupper(s[i]);
        if (ch == 'A' || ch == 'E' || ch == 'I' || ch == 'O' || ch == 'U') {
            vowels++;
        }
        s[i] = ch;
    }
    printf("%d\\n%s\\n", vowels, s);
    return 0;
}`,
      openTestCase: {
        input: 'LogicQ',
        expectedOutput: `2
LOGICQ`,
        explanation: 'Vowels: o, i = 2. Uppercase: LOGICQ.',
      },
      hiddenTestCase: {
        input: 'Programming',
        expectedOutput: `3
PROGRAMMING`,
      },
    },
  },

  {
    id: 'm3-t6-anagrams',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Two-Pointer Technique & Anagram Checking',
    summary: 'Frequency hashing and two-pointer symmetric string comparisons.',
    tipBox: {
      syntax: `// Frequency array hashing
int freq[26] = {0};
for (int i = 0; str[i]; i++) freq[str[i] - 'a']++;`,
      application: 'DNA sequence alignment, spell checkers, and cryptographic collision searches.',
      example: `int isPalindrome(char *s, int len) {
    int l = 0, r = len - 1;
    while (l < r) {
        if (s[l++] != s[r--]) return 0;
    }
    return 1;
}`,
    },
    problem: {
      title: 'Anagram Detection',
      difficulty: 'EASY',
      description: `### Problem Description
Given two lowercase strings $S1$ and $S2$, check if they are anagrams (contain identical characters with identical frequencies).
Print \`YES\` or \`NO\`.

### Input Format
Two space-separated strings $S1$ and $S2$.

### Output Format
\`YES\` or \`NO\`.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s1[200], s2[200];
    if (scanf("%s %s", s1, s2) != 2) return 0;

    // TODO: Verify if s1 and s2 are anagrams
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s1[200], s2[200];
    if (scanf("%s %s", s1, s2) != 2) return 0;
    if (strlen(s1) != strlen(s2)) {
        printf("NO\\n");
        return 0;
    }
    int count[26] = {0};
    for (int i = 0; s1[i]; i++) count[s1[i] - 'a']++;
    for (int i = 0; s2[i]; i++) count[s2[i] - 'a']--;

    for (int i = 0; i < 26; i++) {
        if (count[i] != 0) {
            printf("NO\\n");
            return 0;
        }
    }
    printf("YES\\n");
    return 0;
}`,
      openTestCase: {
        input: 'listen silent',
        expectedOutput: 'YES',
        explanation: 'Both contain e, i, l, n, s, t.',
      },
      hiddenTestCase: {
        input: 'hello world',
        expectedOutput: 'NO',
      },
    },
  },

  // ==========================================
  // MODULE 4: DYNAMIC MEMORY & STRUCTS (6 Topics)
  // ==========================================
  {
    id: 'm4-t1-structs',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Structures (struct) & Member Access',
    summary: 'Bundling heterogeneous data attributes into a single composite type.',
    tipBox: {
      syntax: `struct Student {
    int prn;
    char name[50];
    float gpa;
};
// Member dot access:
struct Student s1 = {101, "Alice", 9.4f};
printf("%s: %.2f", s1.name, s1.gpa);`,
      application: 'Operating system file inodes, network packet frames, database records, and game entity components.',
      example: `typedef struct {
    int x, y;
} Point;
Point p = {10, 20};`,
    },
    problem: {
      title: 'Student Record Highest Ranker',
      difficulty: 'EASY',
      description: `### Problem Description
Define a \`struct Student\` with \`char name[30]\` and \`int marks\`.
Read records for $N$ students and print the name and marks of the student with the highest marks. If tied, print the first one encountered.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 50$).
Following $N$ lines: \`Name Marks\` (e.g. \`Aman 89\`)

### Output Format
Print \`Highest: Name (Marks)\`.`,
      starterCode: `#include <stdio.h>

struct Student {
    char name[35];
    int marks;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: Read struct array and find highest
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

struct Student {
    char name[35];
    int marks;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    struct Student best;
    best.marks = -1;
    for (int i = 0; i < n; i++) {
        struct Student curr;
        scanf("%s %d", curr.name, &curr.marks);
        if (curr.marks > best.marks) {
            best = curr;
        }
    }
    printf("Highest: %s (%d)\\n", best.name, best.marks);
    return 0;
}`,
      openTestCase: {
        input: `3
Aarav 82
Bhavya 95
Chirag 91`,
        expectedOutput: 'Highest: Bhavya (95)',
        explanation: 'Bhavya has highest marks (95).',
      },
      hiddenTestCase: {
        input: `2
Dev 78
Esha 84`,
        expectedOutput: 'Highest: Esha (84)',
      },
    },
  },

  {
    id: 'm4-t2-struct-pointers',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Pointers to Structures & Arrow Operator (->)',
    summary: 'Indirect structure access using pointer arrow syntax: ptr->member.',
    tipBox: {
      syntax: `struct Node {
    int val;
};
struct Node node = {100};
struct Node *ptr = &node;
// Access via arrow operator:
printf("%d", ptr->val); // Equivalent to (*ptr).val`,
      application: 'Passing large structure records to functions without expensive memory copy overhead.',
      example: `void updateGPA(struct Student *s, float newGpa) {
    s->gpa = newGpa;
}`,
    },
    problem: {
      title: '2D Distance Calculator via Struct Pointers',
      difficulty: 'EASY',
      description: `### Problem Description
Define \`struct Point { int x; int y; };\`.
Write a function \`long long squaredDistance(struct Point *p1, struct Point *p2)\` using structure pointers to calculate and return the squared Euclidean distance:
$$(p1->x - p2->x)^2 + (p1->y - p2->y)^2$$

### Input Format
Four space-separated integers $X_1, Y_1, X_2, Y_2$.

### Output Format
Print the squared distance followed by a newline.`,
      starterCode: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

long long squaredDistance(struct Point *p1, struct Point *p2) {
    // TODO: Calculate using arrow operator ->
    return 0;
}

int main() {
    struct Point p1, p2;
    if (scanf("%d %d %d %d", &p1.x, &p1.y, &p2.x, &p2.y) != 4) return 0;
    printf("%lld\\n", squaredDistance(&p1, &p2));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

long long squaredDistance(struct Point *p1, struct Point *p2) {
    long long dx = p1->x - p2->x;
    long long dy = p1->y - p2->y;
    return dx * dx + dy * dy;
}

int main() {
    struct Point p1, p2;
    if (scanf("%d %d %d %d", &p1.x, &p1.y, &p2.x, &p2.y) != 4) return 0;
    printf("%lld\\n", squaredDistance(&p1, &p2));
    return 0;
}`,
      openTestCase: {
        input: '0 0 3 4',
        expectedOutput: '25',
        explanation: '(3-0)^2 + (4-0)^2 = 9 + 16 = 25.',
      },
      hiddenTestCase: {
        input: '1 2 4 6',
        expectedOutput: '25',
      },
    },
  },

  {
    id: 'm4-t3-malloc-free',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Heap Memory Allocation (malloc, calloc & free)',
    summary: 'Dynamic runtime heap allocation and preventing memory leaks.',
    tipBox: {
      syntax: `// Allocate array of N ints on the heap
int *arr = (int *)malloc(N * sizeof(int));
if (ptr == NULL) { /* handle out of memory */ }

// Free memory when finished!
free(arr);
arr = NULL; // prevent dangling pointers`,
      application: 'Dynamic buffers sized by runtime user input, kernel memory management, and heap data structures.',
      example: `int *p = malloc(sizeof(int));
*p = 50;
free(p);`,
    },
    problem: {
      title: 'Dynamic Array Resizing & Filter',
      difficulty: 'EASY',
      description: `### Problem Description
Allocate a dynamic heap array of $N$ integers using \`malloc()\`.
Filter and print only the **positive integers ($> 0$)** in the original order, followed by properly freeing the allocated memory using \`free()\`. If no positives exist, print \`EMPTY\`.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 1000$).
Second line: $N$ integers.

### Output Format
Space-separated positive integers or \`EMPTY\`.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    // TODO: malloc heap buffer, filter positives, and free()
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int *arr = (int *)malloc(n * sizeof(int));
    if (!arr) return 0;

    int positiveCount = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
        if (arr[i] > 0) positiveCount++;
    }

    if (positiveCount == 0) {
        printf("EMPTY\\n");
    } else {
        int printed = 0;
        for (int i = 0; i < n; i++) {
            if (arr[i] > 0) {
                printf("%d%c", arr[i], ++printed == positiveCount ? '\\n' : ' ');
            }
        }
    }
    free(arr);
    return 0;
}`,
      openTestCase: {
        input: `5
-3 4 -1 8 0`,
        expectedOutput: '4 8',
        explanation: 'Only 4 and 8 are strictly positive.',
      },
      hiddenTestCase: {
        input: `3
-1 -2 -3`,
        expectedOutput: 'EMPTY',
      },
    },
  },

  {
    id: 'm4-t4-realloc',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Dynamic Block Resizing (realloc)',
    summary: 'Expanding or shrinking heap memory without losing existing data.',
    tipBox: {
      syntax: `// Resize existing allocated block
int *newPtr = (int *)realloc(oldPtr, newSize * sizeof(int));
if (newPtr != NULL) {
    oldPtr = newPtr; // assign only after NULL check!
}`,
      application: 'Dynamic arrays (std::vector equivalent in C), growing string buffers, and database cursor streams.',
      example: `int *arr = malloc(2 * sizeof(int));
arr = realloc(arr, 10 * sizeof(int));
free(arr);`,
    },
    problem: {
      title: 'Streaming Integer Accumulator',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Read integers until \`-1\` is encountered. Store them in a dynamically growing heap array that starts with capacity $2$ and doubles its capacity using \`realloc()\` whenever full.
Finally, print the total count of elements and their average formatted to 2 decimal places.

### Input Format
A series of space-separated non-negative integers terminated by \`-1\`.

### Output Format
\`Count: X, Average: Y.YY\` (or \`Count: 0, Average: 0.00\` if only -1 is passed).`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int capacity = 2;
    int size = 0;
    int *arr = (int *)malloc(capacity * sizeof(int));

    // TODO: Read until -1 and realloc as needed
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int capacity = 2;
    int size = 0;
    int *arr = (int *)malloc(capacity * sizeof(int));
    if (!arr) return 0;

    int val;
    while (scanf("%d", &val) == 1 && val != -1) {
        if (size == capacity) {
            capacity *= 2;
            int *temp = (int *)realloc(arr, capacity * sizeof(int));
            if (!temp) {
                free(arr);
                return 0;
            }
            arr = temp;
        }
        arr[size++] = val;
    }

    if (size == 0) {
        printf("Count: 0, Average: 0.00\\n");
    } else {
        long long sum = 0;
        for (int i = 0; i < size; i++) sum += arr[i];
        printf("Count: %d, Average: %.2f\\n", size, (double)sum / size);
    }
    free(arr);
    return 0;
}`,
      openTestCase: {
        input: '10 20 30 -1',
        expectedOutput: 'Count: 3, Average: 20.00',
        explanation: '3 numbers, sum = 60, average = 20.00.',
      },
      hiddenTestCase: {
        input: '-1',
        expectedOutput: 'Count: 0, Average: 0.00',
      },
    },
  },

  {
    id: 'm4-t5-singly-linked-list',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Singly Linked List Node Chaining',
    summary: 'Non-contiguous dynamic nodes linked via self-referential pointers.',
    tipBox: {
      syntax: `struct Node {
    int data;
    struct Node *next;
};
// Allocating node
struct Node *newNode = (struct Node *)malloc(sizeof(struct Node));
newNode->data = 10;
newNode->next = NULL;`,
      application: 'Operating system process scheduling lists, free-list memory tracking, and hash map bucket chains.',
      example: `struct Node *head = NULL;
// insert at head
struct Node *n = malloc(sizeof(struct Node));
n->data = 5; n->next = head; head = n;`,
    },
    problem: {
      title: 'Singly Linked List Append & Search',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Build a linked list by inserting $N$ values in order.
Then search for integer $K$.
Print \`FOUND AT INDEX X\` (0-based) or \`NOT FOUND\`.
Ensure all allocated nodes are freed before exiting.

### Input Format
First line: Integer $N$ and search target $K$.
Second line: $N$ space-separated integers.

### Output Format
\`FOUND AT INDEX X\` or \`NOT FOUND\`.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;

    // TODO: Build linked list, find k, and free all nodes
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *curr = (struct Node *)malloc(sizeof(struct Node));
        curr->data = v;
        curr->next = NULL;
        if (!head) head = tail = curr;
        else {
            tail->next = curr;
            tail = curr;
        }
    }

    int foundIdx = -1, idx = 0;
    struct Node *ptr = head;
    while (ptr) {
        if (ptr->data == k && foundIdx == -1) {
            foundIdx = idx;
        }
        idx++;
        ptr = ptr->next;
    }

    if (foundIdx != -1) printf("FOUND AT INDEX %d\\n", foundIdx);
    else printf("NOT FOUND\\n");

    // Clean up
    ptr = head;
    while (ptr) {
        struct Node *temp = ptr->next;
        free(ptr);
        ptr = temp;
    }
    return 0;
}`,
      openTestCase: {
        input: `4 25
10 20 25 30`,
        expectedOutput: 'FOUND AT INDEX 2',
        explanation: '25 is at 0-based index 2.',
      },
      hiddenTestCase: {
        input: `3 99
1 2 3`,
        expectedOutput: 'NOT FOUND',
      },
    },
  },

  {
    id: 'm4-t6-unions-enums',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Unions & Enumerations (enum)',
    summary: 'Memory-overlapping shared buffers and type-safe named constants.',
    tipBox: {
      syntax: `enum Status { SUCCESS = 0, ERR_TIMEOUT = 1, ERR_FAULT = 2 };

union Payload {
    int intVal;
    float floatVal;
    char bytes[4]; // All share identical 4 bytes in memory!
};`,
      application: 'Low-level network protocol packets, type-tagged variant records, and hardware register bit manipulation.',
      example: `union Data { int i; float f; };
union Data d;
d.i = 10;`,
    },
    problem: {
      title: 'Tagged Union Type Parser',
      difficulty: 'EASY',
      description: `### Problem Description
Define:
\`\`\`c
enum Type { INT = 1, FLOAT = 2 };
union Value { int i; float f; };
\`\`\`
Read an integer tag (1 or 2).
If 1: read an integer and print \`INT: [value * 2]\`.
If 2: read a float and print \`FLOAT: [value + 1.50]\` formatted to 2 decimals.

### Input Format
Line 1: Tag (1 or 2).
Line 2: The value.

### Output Format
Formated output string.`,
      starterCode: `#include <stdio.h>

enum Type { TYPE_INT = 1, TYPE_FLOAT = 2 };

union Value {
    int i;
    float f;
};

int main() {
    int tag;
    if (scanf("%d", &tag) != 1) return 0;

    // TODO: Process tagged union
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

enum Type { TYPE_INT = 1, TYPE_FLOAT = 2 };

union Value {
    int i;
    float f;
};

int main() {
    int tag;
    if (scanf("%d", &tag) != 1) return 0;
    union Value val;
    if (tag == TYPE_INT) {
        scanf("%d", &val.i);
        printf("INT: %d\\n", val.i * 2);
    } else if (tag == TYPE_FLOAT) {
        scanf("%f", &val.f);
        printf("FLOAT: %.2f\\n", val.f + 1.50f);
    }
    return 0;
}`,
      openTestCase: {
        input: `1
25`,
        expectedOutput: 'INT: 50',
        explanation: 'Integer 25 doubled = 50.',
      },
      hiddenTestCase: {
        input: `2
3.20`,
        expectedOutput: 'FLOAT: 4.70',
      },
    },
  },
];

export const TOPIC_PRACTICE_DATA: TopicPracticeItem[] = [
  ...BASE_TOPIC_PRACTICE_DATA,
  ...ADDITIONAL_PRACTICE_TOPICS,
].sort((a, b) => {
  if (a.moduleIndex !== b.moduleIndex) {
    return a.moduleIndex - b.moduleIndex;
  }
  return a.id.localeCompare(b.id, undefined, { numeric: true });
});

