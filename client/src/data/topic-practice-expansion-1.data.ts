import type { TopicPracticeItem } from './topic-practice.data.js';

export const EXPANSION_PRACTICE_TOPICS_1: TopicPracticeItem[] = [
  // ==========================================
  // MODULE 1: CONTROL STRUCTURES & MATH (m1-t13 to m1-t25)
  // ==========================================
  {
    id: 'm1-t13-armstrong-number',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Armstrong Number Verification',
    summary: 'Extract decimal digits and verify whether sum of cubed digits equals the number.',
    tipBox: {
      syntax: `int temp = n, sum = 0;
while (temp > 0) {
    int digit = temp % 10;
    sum += digit * digit * digit;
    temp /= 10;
}`,
      application: 'Cryptographic hash checking, data parity validation, and number theory checksums.',
      example: `#include <stdio.h>
int main() {
    int n = 153, temp = 153, sum = 0;
    while (temp > 0) {
        int d = temp % 10;
        sum += d * d * d;
        temp /= 10;
    }
    printf("%s\\n", (sum == n) ? "ARMSTRONG" : "NOT ARMSTRONG");
    return 0;
}`,
    },
    problem: {
      title: 'Armstrong Number Checker',
      difficulty: 'EASY',
      description: `### Problem Description
Given a 3-digit positive integer $N$, determine if it is an Armstrong number. A 3-digit number is an Armstrong number if the sum of the cubes of its digits is equal to the number itself:
$$N = d_1^3 + d_2^3 + d_3^3$$

### Input Format
A single positive integer $N$ ($100 \\le N \\le 999$).

### Output Format
Print \`ARMSTRONG\` if $N$ is an Armstrong number, otherwise print \`NOT ARMSTRONG\` followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Your logic here
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int temp = n, sum = 0;
    while (temp > 0) {
        int d = temp % 10;
        sum += d * d * d;
        temp /= 10;
    }
    if (sum == n) {
        printf("ARMSTRONG\\n");
    } else {
        printf("NOT ARMSTRONG\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '153',
        expectedOutput: 'ARMSTRONG',
        explanation: '1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153.',
      },
      hiddenTestCase: {
        input: '370',
        expectedOutput: 'ARMSTRONG',
      },
    },
  },
  {
    id: 'm1-t14-gcd-lcm-euclid',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Greatest Common Divisor & LCM (Euclid)',
    summary: 'Implement the Euclidean modulo reduction algorithm to compute GCD and LCM in O(log(min(A, B))).',
    tipBox: {
      syntax: `// Euclidean GCD loop
while (b != 0) {
    int r = a % b;
    a = b;
    b = r;
}
// a is GCD`,
      application: 'Aspect ratio scaling in graphics displays, clock divider frequencies in digital design, and public-key cryptography (RSA).',
      example: `#include <stdio.h>
int main() {
    int a = 48, b = 18;
    while (b != 0) { int r = a % b; a = b; b = r; }
    printf("GCD: %d\\n", a);
    return 0;
}`,
    },
    problem: {
      title: 'Euclidean GCD & LCM Engine',
      difficulty: 'EASY',
      description: `### Problem Description
Given two positive integers $A$ and $B$, compute their Greatest Common Divisor (GCD) and Least Common Multiple (LCM).
$$\\text{LCM}(A, B) = \\frac{A \\times B}{\\text{GCD}(A, B)}$$

### Input Format
Two space-separated positive integers $A$ and $B$ ($1 \\le A, B \\le 10^6$).

### Output Format
Print GCD and LCM separated by a single space, followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    // Compute GCD and LCM
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    long long origA = a, origB = b;
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    long long gcd = a;
    long long lcm = (origA / gcd) * origB;
    printf("%lld %lld\\n", gcd, lcm);
    return 0;
}`,
      openTestCase: {
        input: '24 36',
        expectedOutput: '12 72',
        explanation: 'GCD(24, 36) = 12. LCM(24, 36) = (24 * 36) / 12 = 72.',
      },
      hiddenTestCase: {
        input: '17 19',
        expectedOutput: '1 323',
      },
    },
  },
  {
    id: 'm1-t15-palindrome-number',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Palindrome Integer Verification',
    summary: 'Reverse an integer mathematically and determine whether it reads the same backward as forward.',
    tipBox: {
      syntax: `long long rev = 0, temp = n;
while (temp > 0) {
    rev = rev * 10 + (temp % 10);
    temp /= 10;
}`,
      application: 'Sequence symmetry checking in bioinformatics (DNA palindromes) and communication protocol frame markers.',
      example: `#include <stdio.h>
int main() {
    int n = 1221, t = 1221, rev = 0;
    while (t > 0) { rev = rev * 10 + (t % 10); t /= 10; }
    printf("%s\\n", (n == rev) ? "PALINDROME" : "NO");
    return 0;
}`,
    },
    problem: {
      title: 'Mathematical Palindrome Checker',
      difficulty: 'EASY',
      description: `### Problem Description
Given a positive integer $N$, check whether it is a palindrome without converting it into a string.

### Input Format
A single positive integer $N$ ($1 \\le N \\le 10^9$).

### Output Format
Print \`PALINDROME\` if $N$ is identical reversed, else print \`NOT PALINDROME\` followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    // Reverse integer and compare
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long temp = n, rev = 0;
    while (temp > 0) {
        rev = rev * 10 + (temp % 10);
        temp /= 10;
    }
    if (rev == n) {
        printf("PALINDROME\\n");
    } else {
        printf("NOT PALINDROME\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '1331',
        expectedOutput: 'PALINDROME',
        explanation: '1331 reversed is 1331.',
      },
      hiddenTestCase: {
        input: '12345',
        expectedOutput: 'NOT PALINDROME',
      },
    },
  },
  {
    id: 'm1-t16-fibonacci-iterative',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Iterative Fibonacci Generation',
    summary: 'Generate Fibonacci numbers sequentially using O(1) auxiliary space without recursion overhead.',
    tipBox: {
      syntax: `long long a = 0, b = 1;
for (int i = 2; i <= n; i++) {
    long long c = a + b;
    a = b;
    b = c;
}`,
      application: 'Rate limiting token bucket growth, financial modeling, and algorithmic dynamic programming baselines.',
      example: `#include <stdio.h>
int main() {
    long long a = 0, b = 1;
    for (int i = 0; i < 5; i++) {
        printf("%lld ", a);
        long long next = a + b; a = b; b = next;
    }
    return 0;
}`,
    },
    problem: {
      title: 'N-th Fibonacci Term',
      difficulty: 'EASY',
      description: `### Problem Description
The Fibonacci sequence starts with $F(0) = 0, F(1) = 1$. Each subsequent term is the sum of the preceding two terms:
$$F(n) = F(n-1) + F(n-2)$$
Given an integer $N$, find $F(N)$ using an iterative loop.

### Input Format
A single non-negative integer $N$ ($0 \\le N \\le 45$).

### Output Format
Print the $N$-th Fibonacci number followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Calculate F(n)
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    if (n == 0) { printf("0\\n"); return 0; }
    if (n == 1) { printf("1\\n"); return 0; }
    long long a = 0, b = 1, c = 0;
    for (int i = 2; i <= n; i++) {
        c = a + b;
        a = b;
        b = c;
    }
    printf("%lld\\n", b);
    return 0;
}`,
      openTestCase: {
        input: '7',
        expectedOutput: '13',
        explanation: 'Sequence: 0, 1, 1, 2, 3, 5, 8, 13.',
      },
      hiddenTestCase: {
        input: '10',
        expectedOutput: '55',
      },
    },
  },
  {
    id: 'm1-t17-hollow-square-pattern',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: '2D Star Pattern: Hollow Square Matrix',
    summary: 'Use row and column coordinate conditions (i == 0, i == N-1, j == 0, j == N-1) to render hollow borders.',
    tipBox: {
      syntax: `for (int r = 0; r < N; r++) {
    for (int c = 0; c < N; c++) {
        if (r == 0 || r == N - 1 || c == 0 || c == N - 1)
            putchar('*');
        else
            putchar(' ');
    }
    putchar('\\n');
}`,
      application: 'ASCII rendering engines, raster graphics bounding box clipping, and UI viewport frame layout.',
      example: `#include <stdio.h>
int main() {
    int n = 3;
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < n; c++) {
            putchar((r == 0 || r == n-1 || c == 0 || c == n-1) ? '*' : ' ');
        }
        putchar('\\n');
    }
    return 0;
}`,
    },
    problem: {
      title: 'Hollow Square Border Generator',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer $N$, print a hollow square pattern of stars (\`*\`) of size $N \\times N$. The border consists of asterisks, while the interior cells contain spaces.

### Input Format
A single integer $N$ ($2 \\le N \\le 20$).

### Output Format
Print the $N \\times N$ pattern with lines terminated by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Generate hollow square
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 0 || r == n - 1 || c == 0 || c == n - 1) {
                putchar('*');
            } else {
                putchar(' ');
            }
        }
        putchar('\\n');
    }
    return 0;
}`,
      openTestCase: {
        input: '4',
        expectedOutput: `****
*  *
*  *
****`,
        explanation: 'Top and bottom rows are solid 4 stars; middle rows have star at edges only.',
      },
      hiddenTestCase: {
        input: '3',
        expectedOutput: `***
* *
***`,
      },
    },
  },
  {
    id: 'm1-t18-pyramid-number-pattern',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Inverted Number Half-Pyramid Pattern',
    summary: 'Coordinate outer decrementing loop with inner incrementing column counter.',
    tipBox: {
      syntax: `for (int i = N; i >= 1; i--) {
    for (int j = 1; j <= i; j++) {
        printf("%d ", j);
    }
    printf("\\n");
}`,
      application: 'Text layout alignment, hierarchical debugging output, and visual pyramid decomposition.',
      example: `#include <stdio.h>
int main() {
    for (int i = 3; i >= 1; i--) {
        for (int j = 1; j <= i; j++) printf("%d ", j);
        printf("\\n");
    }
    return 0;
}`,
    },
    problem: {
      title: 'Inverted Number Half-Pyramid',
      difficulty: 'EASY',
      description: `### Problem Description
Write a program that takes an integer $N$ and prints an inverted half-pyramid of numbers. Row 1 has numbers from 1 to $N$, Row 2 has 1 to $N-1$, down to Row $N$ with only 1. Numbers in each row are separated by a space.

### Input Format
A single integer $N$ ($1 \\le N \\le 9$).

### Output Format
Print the inverted number pattern with each line ending with a newline. Each number on a line is followed by a space except the last, or space-separated.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Print inverted number pattern
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    for (int i = n; i >= 1; i--) {
        for (int j = 1; j <= i; j++) {
            printf("%d%s", j, (j == i) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '4',
        expectedOutput: `1 2 3 4
1 2 3
1 2
1`,
        explanation: 'Row 1 has 1 to 4; Row 2 has 1 to 3; Row 3 has 1 to 2; Row 4 has 1.',
      },
      hiddenTestCase: {
        input: '3',
        expectedOutput: `1 2 3
1 2
1`,
      },
    },
  },
  {
    id: 'm1-t19-pascals-triangle-row',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: "Pascal's Triangle Nth Row Generator",
    summary: 'Compute combinatorial binomial coefficients using iterative multiplication and division.',
    tipBox: {
      syntax: `// C(n, k) = C(n, k-1) * (n - k + 1) / k
long long val = 1;
printf("%lld ", val);
for (int k = 1; k <= n; k++) {
    val = val * (n - k + 1) / k;
    printf("%lld ", val);
}`,
      application: 'Combinatorics, polynomial expansion, binomial probability calculations, and Gaussian filters.',
      example: `#include <stdio.h>
int main() {
    int n = 4; long long val = 1;
    printf("%lld ", val);
    for (int k = 1; k <= n; k++) {
        val = val * (n - k + 1) / k;
        printf("%lld ", val);
    }
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: "Pascal's Triangle Row Evaluator",
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a 0-indexed row index $N$, compute and print all coefficients of the $N$-th row of Pascal's Triangle separated by spaces.
Row 0: \`1\`
Row 1: \`1 1\`
Row 2: \`1 2 1\`
Row 3: \`1 3 3 1\`

### Input Format
A single integer $N$ ($0 \\le N \\le 30$).

### Output Format
Print the numbers of row $N$ separated by single spaces, followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Generate Nth row of Pascal's Triangle
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long val = 1;
    printf("%lld", val);
    for (int k = 1; k <= n; k++) {
        val = val * (n - k + 1) / k;
        printf(" %lld", val);
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: '4',
        expectedOutput: '1 4 6 4 1',
        explanation: 'Binomial coefficients for n=4: C(4,0)=1, C(4,1)=4, C(4,2)=6, C(4,3)=4, C(4,4)=1.',
      },
      hiddenTestCase: {
        input: '5',
        expectedOutput: '1 5 10 10 5 1',
      },
    },
  },
  {
    id: 'm1-t20-power-of-two-bitwise',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Power of Two Bitwise Fast Test',
    summary: 'Evaluate powers of 2 in single instruction using (n > 0) && !(n & (n - 1)).',
    tipBox: {
      syntax: `// Power of 2 has exactly 1 bit set
// n - 1 flips that bit and sets all lower bits
int isPowerOfTwo = (n > 0) && ((n & (n - 1)) == 0);`,
      application: 'Memory block alignment verification, GPU texture dimensions checking, and binary heap indexing.',
      example: `#include <stdio.h>
int main() {
    int n = 16;
    printf("%s\\n", (n > 0 && !(n & (n - 1))) ? "YES" : "NO");
    return 0;
}`,
    },
    problem: {
      title: 'Bitwise Power of Two Detector',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer $N$, determine whether $N$ is a power of 2 using bitwise operations in $O(1)$ time.

### Input Format
A single integer $N$ ($-2^{31} \\le N \\le 2^{31}-1$).

### Output Format
Print \`YES\` if $N$ is a power of two, otherwise print \`NO\` followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    // Check if n is power of 2 using bitwise logic
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    if (n > 0 && ((n & (n - 1)) == 0)) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '64',
        expectedOutput: 'YES',
        explanation: '64 = 2^6, exactly 1 set bit.',
      },
      hiddenTestCase: {
        input: '18',
        expectedOutput: 'NO',
      },
    },
  },
  {
    id: 'm1-t21-swap-numbers-xor',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'In-Place Number Swap Using XOR',
    summary: 'Swap two variables without using a third temporary variable via XOR identity properties.',
    tipBox: {
      syntax: `a = a ^ b;
b = a ^ b; // b becomes original a
a = a ^ b; // a becomes original b`,
      application: 'Register-constrained embedded CPUs and cache-friendly in-place array permutations.',
      example: `#include <stdio.h>
int main() {
    int a = 5, b = 9;
    a ^= b; b ^= a; a ^= b;
    printf("a=%d, b=%d\\n", a, b);
    return 0;
}`,
    },
    problem: {
      title: 'In-Place XOR Variable Swap',
      difficulty: 'EASY',
      description: `### Problem Description
Read two integers $A$ and $B$, swap their values using the XOR bitwise operator without declaring any additional third variable, and print the swapped values.

### Input Format
Two space-separated integers $A$ and $B$.

### Output Format
Print the swapped values formatted as \`A B\` followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    // Swap using XOR
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    if (a != b) {
        a = a ^ b;
        b = a ^ b;
        a = a ^ b;
    }
    printf("%d %d\\n", a, b);
    return 0;
}`,
      openTestCase: {
        input: '42 99',
        expectedOutput: '99 42',
        explanation: 'A became 99 and B became 42 without any temp variable.',
      },
      hiddenTestCase: {
        input: '-10 25',
        expectedOutput: '25 -10',
      },
    },
  },
  {
    id: 'm1-t22-reverse-bits',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Reverse 32-bit Unsigned Integer Bits',
    summary: 'Traverse all 32 bits, shifting extracted LSB into a reversed accumulator.',
    tipBox: {
      syntax: `unsigned int rev = 0;
for (int i = 0; i < 32; i++) {
    rev = (rev << 1) | (n & 1);
    n >>= 1;
}`,
      application: 'DSP FFT butterfly indexing, telecommunications bit ordering (MSB vs LSB first), and CRC algorithms.',
      example: `#include <stdio.h>
int main() {
    unsigned int n = 1, rev = 0;
    for (int i = 0; i < 32; i++) {
        rev = (rev << 1) | (n & 1);
        n >>= 1;
    }
    printf("%u\\n", rev);
    return 0;
}`,
    },
    problem: {
      title: '32-Bit Reversal Engine',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a 32-bit unsigned integer $N$, reverse the binary bit sequence from MSB to LSB and print the resulting decimal number.

### Input Format
A single unsigned 32-bit integer $N$.

### Output Format
Print the decimal value of the bit-reversed integer followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    unsigned int n;
    if (scanf("%u", &n) != 1) return 0;
    // Reverse 32 bits
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    unsigned int n;
    if (scanf("%u", &n) != 1) return 0;
    unsigned int rev = 0;
    for (int i = 0; i < 32; i++) {
        rev = (rev << 1) | (n & 1);
        n >>= 1;
    }
    printf("%u\\n", rev);
    return 0;
}`,
      openTestCase: {
        input: '43261596',
        expectedOutput: '964176192',
        explanation: '00000010100101000001111010011100 reversed is 00111001011110000010100101000000 = 964176192.',
      },
      hiddenTestCase: {
        input: '1',
        expectedOutput: '2147483648',
      },
    },
  },
  {
    id: 'm1-t23-collatz-conjecture',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Collatz Conjecture (3N + 1) Cycle Length',
    summary: 'Apply conditional rule while (n > 1) to count the number of transformations until reaching 1.',
    tipBox: {
      syntax: `int steps = 0;
while (n > 1) {
    if (n % 2 == 0) n /= 2;
    else n = 3 * n + 1;
    steps++;
}`,
      application: 'Dynamical systems chaos analysis, benchmark loop unrolling stress testing, and loop invariant verification.',
      example: `#include <stdio.h>
int main() {
    long long n = 6; int steps = 0;
    while (n > 1) {
        n = (n % 2 == 0) ? (n / 2) : (3 * n + 1);
        steps++;
    }
    printf("Steps: %d\\n", steps);
    return 0;
}`,
    },
    problem: {
      title: 'Collatz Step Counter',
      difficulty: 'EASY',
      description: `### Problem Description
Given a positive integer $N$, count how many steps it takes to reach 1 following the rules:
- If $N$ is even: $N = N / 2$
- If $N$ is odd: $N = 3N + 1$
Repeat until $N = 1$.

### Input Format
A single positive integer $N$ ($1 \\le N \\le 10^6$).

### Output Format
Print the total number of transition steps followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    // Count Collatz steps
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    int steps = 0;
    while (n > 1) {
        if (n % 2 == 0) {
            n /= 2;
        } else {
            n = 3 * n + 1;
        }
        steps++;
    }
    printf("%d\\n", steps);
    return 0;
}`,
      openTestCase: {
        input: '6',
        expectedOutput: '8',
        explanation: 'Path: 6 -> 3 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1 (8 steps).',
      },
      hiddenTestCase: {
        input: '12',
        expectedOutput: '9',
      },
    },
  },
  {
    id: 'm1-t24-binary-to-decimal',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Binary String to Decimal Integer Conversion',
    summary: 'Accumulate weighted positional powers of 2 using character scanning and Horner scheme.',
    tipBox: {
      syntax: `long long dec = 0;
for (int i = 0; s[i] != '\\0'; i++) {
    dec = (dec << 1) + (s[i] - '0');
}`,
      application: 'Parsing network bitfields, decoding microinstruction opcodes, and embedded sensor binary telemetry decoding.',
      example: `#include <stdio.h>
int main() {
    char s[] = "1101";
    int dec = 0;
    for (int i = 0; s[i]; i++) dec = (dec << 1) + (s[i] - '0');
    printf("%d\\n", dec);
    return 0;
}`,
    },
    problem: {
      title: 'Binary Stream Parser',
      difficulty: 'EASY',
      description: `### Problem Description
Given a binary string composed of characters \`0\` and \`1\`, parse and compute its decimal equivalent using bitwise shift accumulation.

### Input Format
A string of up to 30 binary digits (\`0\` and \`1\`).

### Output Format
Print the decimal integer followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    char bin[64];
    if (scanf("%63s", bin) != 1) return 0;
    // Convert to decimal
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    char bin[64];
    if (scanf("%63s", bin) != 1) return 0;
    long long dec = 0;
    for (int i = 0; bin[i] != '\\0'; i++) {
        dec = (dec << 1) + (bin[i] - '0');
    }
    printf("%lld\\n", dec);
    return 0;
}`,
      openTestCase: {
        input: '10101',
        expectedOutput: '21',
        explanation: '16 + 4 + 1 = 21.',
      },
      hiddenTestCase: {
        input: '11111111',
        expectedOutput: '255',
      },
    },
  },
  {
    id: 'm1-t25-sum-of-digits-loop',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Digital Root (Recursive Sum of Digits)',
    summary: 'Iteratively sum digits until only a single digit remains (or use the modulo 9 identity).',
    tipBox: {
      syntax: `// Digital root modulo identity
if (n == 0) return 0;
return 1 + (n - 1) % 9;`,
      application: 'Vedic mathematics checks, credit card Luhn checksum variants, and fast data sanity verification.',
      example: `#include <stdio.h>
int main() {
    int n = 9875;
    int root = (n == 0) ? 0 : (1 + (n - 1) % 9);
    printf("%d\\n", root);
    return 0;
}`,
    },
    problem: {
      title: 'Digital Root Calculator',
      difficulty: 'EASY',
      description: `### Problem Description
Given a non-negative integer $N$, repeatedly add all its digits until the result has only one single digit. Print this digital root.

### Input Format
A single non-negative integer $N$ ($0 \\le N \\le 10^{14}$).

### Output Format
Print the single-digit digital root followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    // Calculate digital root
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    if (n == 0) {
        printf("0\\n");
        return 0;
    }
    long long root = 1 + (n - 1) % 9;
    printf("%lld\\n", root);
    return 0;
}`,
      openTestCase: {
        input: '9875',
        expectedOutput: '2',
        explanation: '9 + 8 + 7 + 5 = 29 -> 2 + 9 = 11 -> 1 + 1 = 2.',
      },
      hiddenTestCase: {
        input: '456',
        expectedOutput: '6',
      },
    },
  },

  // ==========================================
  // MODULE 2: POINTERS, FUNCTIONS & RECURSION (m2-t13 to m2-t25)
  // ==========================================
  {
    id: 'm2-t13-recursive-tower-of-hanoi',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Tower of Hanoi Step Counter & Moves',
    summary: 'Solve the classical 3-peg Tower of Hanoi recurrence T(n) = 2T(n-1) + 1.',
    tipBox: {
      syntax: `void hanoi(int n, char from, char to, char aux) {
    if (n == 0) return;
    hanoi(n - 1, from, aux, to);
    printf("Move disk %d from %c to %c\\n", n, from, to);
    hanoi(n - 1, aux, to, from);
}`,
      application: 'Recursive divide-and-conquer proof patterns, call frame stack tracing, and disk backup schedule rotations.',
      example: `#include <stdio.h>
void hanoi(int n, char from, char to, char aux) {
    if (n == 0) return;
    hanoi(n-1, from, aux, to);
    printf("%c->%c\\n", from, to);
    hanoi(n-1, aux, to, from);
}
int main() { hanoi(2, 'A', 'C', 'B'); return 0; }`,
    },
    problem: {
      title: 'Tower of Hanoi Move Generator',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given $N$ disks numbered 1 through $N$ (where 1 is smallest and $N$ is largest), print all moves required to transfer all disks from peg \`A\` to peg \`C\` using auxiliary peg \`B\`.
Each move must follow the rule: only one disk may move at a time, and a larger disk can never sit on top of a smaller disk.

### Input Format
A single integer $N$ ($1 \\le N \\le 6$).

### Output Format
Print each move on a new line in the format:
\`Move disk X from Y to Z\`
followed by the total count line:
\`Total Moves: M\``,
      starterCode: `#include <stdio.h>

void hanoi(int n, char from, char to, char aux, int *count) {
    // Recursive moves
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int count = 0;
    // Call hanoi
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void hanoi(int n, char from, char to, char aux, int *count) {
    if (n == 0) return;
    hanoi(n - 1, from, aux, to, count);
    printf("Move disk %d from %c to %c\\n", n, from, to);
    (*count)++;
    hanoi(n - 1, aux, to, from, count);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int count = 0;
    hanoi(n, 'A', 'C', 'B', &count);
    printf("Total Moves: %d\\n", count);
    return 0;
}`,
      openTestCase: {
        input: '2',
        expectedOutput: `Move disk 1 from A to B
Move disk 2 from A to C
Move disk 1 from B to C
Total Moves: 3`,
        explanation: 'For 2 disks, exactly 2^2 - 1 = 3 moves are made.',
      },
      hiddenTestCase: {
        input: '3',
        expectedOutput: `Move disk 1 from A to C
Move disk 2 from A to B
Move disk 1 from C to B
Move disk 3 from A to C
Move disk 1 from B to A
Move disk 2 from B to C
Move disk 1 from A to C
Total Moves: 7`,
      },
    },
  },
  {
    id: 'm2-t14-recursive-factorial',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Recursive Factorial with Base Case',
    summary: 'Demonstrate fundamental recursion call stack winding and unwinding with n == 0 base case.',
    tipBox: {
      syntax: `long long fact(int n) {
    if (n <= 1) return 1;
    return (long long)n * fact(n - 1);
}`,
      application: 'Combinatorics, permutation indexing, Taylor series expansion, and recursion stack memory profiling.',
      example: `#include <stdio.h>
long long fact(int n) { return (n <= 1) ? 1 : n * fact(n - 1); }
int main() { printf("%lld\\n", fact(5)); return 0; }`,
    },
    problem: {
      title: 'Recursive Factorial Function',
      difficulty: 'EASY',
      description: `### Problem Description
Write a recursive function \`long long factorial(int n)\` to compute the factorial of an integer $N$.
$$N! = N \\times (N-1) \\times \\dots \\times 1, \\quad 0! = 1$$

### Input Format
A single integer $N$ ($0 \\le N \\le 20$).

### Output Format
Print the factorial value followed by a newline.`,
      starterCode: `#include <stdio.h>

long long factorial(int n) {
    // Recursive implementation
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%lld\\n", factorial(n));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

long long factorial(int n) {
    if (n <= 1) return 1;
    return (long long)n * factorial(n - 1);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%lld\\n", factorial(n));
    return 0;
}`,
      openTestCase: {
        input: '5',
        expectedOutput: '120',
        explanation: '5! = 5 * 4 * 3 * 2 * 1 = 120.',
      },
      hiddenTestCase: {
        input: '0',
        expectedOutput: '1',
      },
    },
  },
  {
    id: 'm2-t15-recursive-sum-array',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Recursive Array Sum using Pointer Offsets',
    summary: 'Accumulate values of an array recursively by passing pointer offsets arr + 1 and size - 1.',
    tipBox: {
      syntax: `int sumArray(const int *arr, int n) {
    if (n <= 0) return 0;
    return *arr + sumArray(arr + 1, n - 1);
}`,
      application: 'Linked data streaming, functional programming in C, and pointer-based list folding.',
      example: `#include <stdio.h>
int sum(const int *a, int n) { return (n <= 0) ? 0 : *a + sum(a + 1, n - 1); }
int main() { int arr[] = {1, 2, 3}; printf("%d\\n", sum(arr, 3)); return 0; }`,
    },
    problem: {
      title: 'Pointer-Offset Recursive Array Sum',
      difficulty: 'EASY',
      description: `### Problem Description
Given an array of $N$ integers, compute its sum using a recursive function that advances through memory using pointer arithmetic (\`arr + 1\`).

### Input Format
- First line: integer $N$ ($1 \\le N \\le 1000$).
- Second line: $N$ space-separated integers.

### Output Format
Print the total sum followed by a newline.`,
      starterCode: `#include <stdio.h>

int recursiveSum(const int *arr, int n) {
    // Advance pointer recursively
}

int main() {
    int n, arr[1000];
    if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    printf("%d\\n", recursiveSum(arr, n));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int recursiveSum(const int *arr, int n) {
    if (n <= 0) return 0;
    return *arr + recursiveSum(arr + 1, n - 1);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    printf("%d\\n", recursiveSum(arr, n));
    return 0;
}`,
      openTestCase: {
        input: `5
10 20 30 40 50`,
        expectedOutput: '150',
        explanation: '10 + 20 + 30 + 40 + 50 = 150.',
      },
      hiddenTestCase: {
        input: `4
-5 15 -10 20`,
        expectedOutput: '20',
      },
    },
  },
  {
    id: 'm2-t16-pass-by-const-pointer',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Const Pointer to Prevent Mutability',
    summary: 'Protect large data buffers from unintentional modification while avoiding struct copy overhead.',
    tipBox: {
      syntax: `// const int *ptr means the value pointed to CANNOT be changed
void inspectBuffer(const int *data, size_t len) {
    // *data = 10; // Compiler Error! Read-only
}`,
      application: 'Kernel system call buffers, read-only hardware register mappings, and secure memory access APIs.',
      example: `#include <stdio.h>
int findMin(const int *arr, int n) {
    int m = *arr;
    for (int i = 1; i < n; i++) if (arr[i] < m) m = arr[i];
    return m;
}
int main() { int a[] = {4, 1, 9}; printf("%d\\n", findMin(a, 3)); return 0; }`,
    },
    problem: {
      title: 'Read-Only Buffer Minimum Finder',
      difficulty: 'EASY',
      description: `### Problem Description
Implement a function \`int findMinimum(const int *arr, int n)\` that accepts a read-only pointer to an array of integers and returns its minimum element.

### Input Format
- First line: integer $N$ ($1 \\le N \\le 1000$).
- Second line: $N$ integers.

### Output Format
Print the minimum integer in the array followed by a newline.`,
      starterCode: `#include <stdio.h>

int findMinimum(const int *arr, int n) {
    // Read-only pointer traversal
}

int main() {
    int n, arr[1000];
    if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    printf("%d\\n", findMinimum(arr, n));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int findMinimum(const int *arr, int n) {
    int minVal = *arr;
    for (int i = 1; i < n; i++) {
        if (*(arr + i) < minVal) {
            minVal = *(arr + i);
        }
    }
    return minVal;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    printf("%d\\n", findMinimum(arr, n));
    return 0;
}`,
      openTestCase: {
        input: `5
34 12 89 5 44`,
        expectedOutput: '5',
        explanation: 'Minimum element in the buffer is 5.',
      },
      hiddenTestCase: {
        input: `3
-100 -20 -300`,
        expectedOutput: '-300',
      },
    },
  },
  {
    id: 'm2-t17-void-pointer-generic',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Generic Memory Inspector via void*',
    summary: 'Cast void* to char*, int*, or float* dynamically to implement polymorphic memory routines.',
    tipBox: {
      syntax: `void printAsType(void *ptr, char type) {
    if (type == 'i') printf("%d\\n", *(int*)ptr);
    else if (type == 'f') printf("%.2f\\n", *(float*)ptr);
    else if (type == 'c') printf("%c\\n", *(char*)ptr);
}`,
      application: 'Standard C library qsort/bsearch, memory allocators (malloc returns void*), and generic packet decoders.',
      example: `#include <stdio.h>
void showInt(void *p) { printf("%d\\n", *(int*)p); }
int main() { int x = 42; showInt(&x); return 0; }`,
    },
    problem: {
      title: 'Polymorphic Memory Printer',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Write a generic printer function that accepts a \`void*\` pointer and a character tag representing its type (\`'i'\` for int, \`'c'\` for char, \`'d'\` for double). Cast the void pointer and print the decoded value.
For double, print strictly formatted to **2 decimal places**.

### Input Format
First character is the type tag (\`i\`, \`c\`, or \`d\`), followed by the value on the same or next token.

### Output Format
Print the decoded value followed by a newline.`,
      starterCode: `#include <stdio.h>

void printGeneric(void *ptr, char type) {
    // Cast void pointer according to type
}

int main() {
    char type;
    if (scanf(" %c", &type) != 1) return 0;
    // Read value and dispatch
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void printGeneric(void *ptr, char type) {
    if (type == 'i') {
        printf("%d\\n", *(int*)ptr);
    } else if (type == 'c') {
        printf("%c\\n", *(char*)ptr);
    } else if (type == 'd') {
        printf("%.2f\\n", *(double*)ptr);
    }
}

int main() {
    char type;
    if (scanf(" %c", &type) != 1) return 0;
    if (type == 'i') {
        int v;
        if (scanf("%d", &v) == 1) printGeneric(&v, 'i');
    } else if (type == 'c') {
        char v;
        if (scanf(" %c", &v) == 1) printGeneric(&v, 'c');
    } else if (type == 'd') {
        double v;
        if (scanf("%lf", &v) == 1) printGeneric(&v, 'd');
    }
    return 0;
}`,
      openTestCase: {
        input: 'i 1304',
        expectedOutput: '1304',
        explanation: 'Type tag i cast pointer to int* and dereferenced 1304.',
      },
      hiddenTestCase: {
        input: 'd 3.14159',
        expectedOutput: '3.14',
      },
    },
  },
  {
    id: 'm2-t18-pointer-array-indexing',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Array-Pointer Duality (*(arr + i))',
    summary: 'Demonstrate pointer arithmetic equivalency *(arr + i) == arr[i] == *(i + arr).',
    tipBox: {
      syntax: `int *ptr = arr;
for (int i = 0; i < n; i++) {
    printf("%d ", *(ptr + i)); // Exact equivalent of arr[i]
}`,
      application: 'Low-overhead DMA memory copies, high-speed audio buffer processing, and compiler optimization understanding.',
      example: `#include <stdio.h>
int main() {
    int arr[] = {10, 20, 30};
    int *p = arr;
    printf("%d %d\\n", *(p + 1), p[2]);
    return 0;
}`,
    },
    problem: {
      title: 'Pointer-Only Array Doubler',
      difficulty: 'EASY',
      description: `### Problem Description
Given an array of $N$ integers, double each element in-place strictly using pointer dereferencing \`*(ptr + i)\` (do not use bracket subscript \`arr[i]\`). Then print the modified array.

### Input Format
- First line: integer $N$ ($1 \\le N \\le 100$).
- Second line: $N$ space-separated integers.

### Output Format
Print the doubled values separated by spaces, followed by a newline.`,
      starterCode: `#include <stdio.h>

void doubleElements(int *ptr, int n) {
    // In-place double using *(ptr + i)
}

int main() {
    int n, arr[100];
    if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) scanf("%d", arr + i);
    doubleElements(arr, n);
    for (int i = 0; i < n; i++) printf("%d%s", *(arr + i), (i == n-1) ? "" : " ");
    printf("\\n");
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void doubleElements(int *ptr, int n) {
    for (int i = 0; i < n; i++) {
        *(ptr + i) = *(ptr + i) * 2;
    }
}

int main() {
    int n, arr[100];
    if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d", arr + i) != 1) return 0;
    }
    doubleElements(arr, n);
    for (int i = 0; i < n; i++) {
        printf("%d%s", *(arr + i), (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `3
5 10 15`,
        expectedOutput: '10 20 30',
        explanation: 'Each element doubled via pointer offsets: 5*2=10, 10*2=20, 15*2=30.',
      },
      hiddenTestCase: {
        input: `4
-1 0 7 25`,
        expectedOutput: '-2 0 14 50',
      },
    },
  },
  {
    id: 'm2-t19-string-length-pointer',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Pointer Distance Metric (strlen Manual)',
    summary: 'Calculate string length by subtracting the start pointer from end pointer at null terminator.',
    tipBox: {
      syntax: `size_t my_strlen(const char *s) {
    const char *p = s;
    while (*p != '\\0') p++;
    return (size_t)(p - s); // Pointer subtraction yields distance in elements
}`,
      application: 'Zero-overhead string scanning, custom embedded libc implementations, and boundary safety audits.',
      example: `#include <stdio.h>
int main() {
    const char *s = "LogicQ";
    const char *p = s;
    while (*p) p++;
    printf("Length: %td\\n", p - s);
    return 0;
}`,
    },
    problem: {
      title: 'Pointer Subtraction String Length',
      difficulty: 'EASY',
      description: `### Problem Description
Implement a function \`int stringLength(const char *str)\` that computes the number of characters in a string without calling \`strlen\`, strictly using pointer subtraction (\`end - start\`).

### Input Format
A single line string of up to 100 characters (may contain letters, numbers, symbols, no spaces).

### Output Format
Print the length of the string followed by a newline.`,
      starterCode: `#include <stdio.h>

int stringLength(const char *str) {
    // Pointer subtraction
}

int main() {
    char buf[128];
    if (scanf("%127s", buf) != 1) return 0;
    printf("%d\\n", stringLength(buf));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int stringLength(const char *str) {
    const char *ptr = str;
    while (*ptr != '\\0') {
        ptr++;
    }
    return (int)(ptr - str);
}

int main() {
    char buf[128];
    if (scanf("%127s", buf) != 1) return 0;
    printf("%d\\n", stringLength(buf));
    return 0;
}`,
      openTestCase: {
        input: 'BitwiseClub',
        expectedOutput: '11',
        explanation: '11 characters traversed before null byte.',
      },
      hiddenTestCase: {
        input: 'C',
        expectedOutput: '1',
      },
    },
  },
  {
    id: 'm2-t20-callback-sorting-comparator',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Function Pointer Comparator for qsort',
    summary: 'Pass custom comparator callbacks int (*cmp)(const void*, const void*) to sort complex orders.',
    tipBox: {
      syntax: `int compareDesc(const void *a, const void *b) {
    int valA = *(const int*)a;
    int valB = *(const int*)b;
    return (valB - valA); // Positive if valB > valA (descending)
}`,
      application: 'High-performance quicksort in databases, GUI event dispatchers, and customizable sorting engines.',
      example: `#include <stdio.h>
#include <stdlib.h>
int desc(const void *a, const void *b) { return (*(int*)b - *(int*)a); }
int main() {
    int arr[] = {3, 1, 4};
    qsort(arr, 3, sizeof(int), desc);
    printf("%d %d %d\\n", arr[0], arr[1], arr[2]);
    return 0;
}`,
    },
    problem: {
      title: 'Descending Sorter with Function Pointer',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given an array of $N$ integers, sort them in **descending order** using the C standard library function \`qsort\` with a custom comparator function pointer.

### Input Format
- First line: integer $N$ ($1 \\le N \\le 500$).
- Second line: $N$ space-separated integers.

### Output Format
Print the sorted integers in descending order separated by a space, followed by a newline.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int compareDescending(const void *a, const void *b) {
    // Comparator implementation
}

int main() {
    int n, arr[500];
    if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    // Call qsort with compareDescending
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int compareDescending(const void *a, const void *b) {
    int valA = *(const int*)a;
    int valB = *(const int*)b;
    if (valB > valA) return 1;
    if (valB < valA) return -1;
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[500];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    qsort(arr, (size_t)n, sizeof(int), compareDescending);
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `5
12 45 2 90 33`,
        expectedOutput: '90 45 33 12 2',
        explanation: 'Array sorted in descending order.',
      },
      hiddenTestCase: {
        input: `3
10 10 10`,
        expectedOutput: '10 10 10',
      },
    },
  },
  {
    id: 'm2-t21-recursive-power',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Fast Recursive Exponentiation (A^B)',
    summary: 'Compute power in O(log B) steps by recursively halving the exponent: A^(2k) = (A^k)^2.',
    tipBox: {
      syntax: `long long fastPow(long long a, int b) {
    if (b == 0) return 1;
    long long half = fastPow(a, b / 2);
    if (b % 2 == 0) return half * half;
    return half * half * a;
}`,
      application: 'Diffie-Hellman cryptographic key exchange, computer graphics matrix transformations, and fast matrix exponentiation.',
      example: `#include <stdio.h>
long long p(long long a, int b) {
    if (b == 0) return 1;
    long long h = p(a, b/2);
    return (b % 2 == 0) ? h * h : h * h * a;
}
int main() { printf("%lld\\n", p(2, 10)); return 0; }`,
    },
    problem: {
      title: 'Fast Exponentiation Recurrence',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Compute $A^B$ for positive integer base $A$ and non-negative exponent $B$ using recursive divide-and-conquer ($O(\\log B)$ operations).

### Input Format
Two space-separated integers $A$ and $B$ ($1 \\le A \\le 10$, $0 \\le B \\le 18$).

### Output Format
Print the computed power value followed by a newline.`,
      starterCode: `#include <stdio.h>

long long fastPower(long long a, int b) {
    // Recursive O(log B)
}

int main() {
    long long a;
    int b;
    if (scanf("%lld %d", &a, &b) != 2) return 0;
    printf("%lld\\n", fastPower(a, b));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

long long fastPower(long long a, int b) {
    if (b == 0) return 1;
    long long half = fastPower(a, b / 2);
    if (b % 2 == 0) {
        return half * half;
    } else {
        return half * half * a;
    }
}

int main() {
    long long a;
    int b;
    if (scanf("%lld %d", &a, &b) != 2) return 0;
    printf("%lld\\n", fastPower(a, b));
    return 0;
}`,
      openTestCase: {
        input: '2 10',
        expectedOutput: '1024',
        explanation: '2^10 = 1024 calculated in 4 recursive multiplications.',
      },
      hiddenTestCase: {
        input: '3 8',
        expectedOutput: '6561',
      },
    },
  },
  {
    id: 'm2-t22-dangling-pointer-guard',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Safe Pointer Invalidation & NULL Guarding',
    summary: 'Zero out pointers immediately after releasing dynamic memory to eliminate use-after-free vulnerabilities.',
    tipBox: {
      syntax: `// Secure free macro idiom
#define SAFE_FREE(p) do { \\
    free(p);             \\
    (p) = NULL;          \\
} while (0)`,
      application: 'Critical defense against CVE Use-After-Free (UAF) exploits in web browsers, operating systems, and network daemon services.',
      example: `#include <stdio.h>
#include <stdlib.h>
int main() {
    int *ptr = malloc(sizeof(int));
    *ptr = 42;
    free(ptr);
    ptr = NULL; // Safe! Dereferencing now guarantees segfault instead of silent corruption
    printf("%s\\n", (ptr == NULL) ? "SAFE_NULL" : "DANGLING");
    return 0;
}`,
    },
    problem: {
      title: 'Safe Memory Invalidator',
      difficulty: 'EASY',
      description: `### Problem Description
Write a program that dynamically allocates memory for an integer, stores an input value, prints it, safely deallocates the memory using \`free\`, and resets the pointer to \`NULL\`. Print \`SAFE_NULL\` if the pointer was properly neutralized to \`NULL\`.

### Input Format
A single integer $V$.

### Output Format
- Line 1: \`Allocated: V\`
- Line 2: \`Pointer Status: SAFE_NULL\``,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int val;
    if (scanf("%d", &val) != 1) return 0;
    // Allocate, print, free, and nullify
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int val;
    if (scanf("%d", &val) != 1) return 0;
    int *ptr = (int*)malloc(sizeof(int));
    if (!ptr) return 0;
    *ptr = val;
    printf("Allocated: %d\\n", *ptr);
    free(ptr);
    ptr = NULL;
    if (ptr == NULL) {
        printf("Pointer Status: SAFE_NULL\\n");
    } else {
        printf("Pointer Status: DANGLING\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '77',
        expectedOutput: `Allocated: 77
Pointer Status: SAFE_NULL`,
        explanation: 'Memory freed and pointer zeroed to NULL.',
      },
      hiddenTestCase: {
        input: '0',
        expectedOutput: `Allocated: 0
Pointer Status: SAFE_NULL`,
      },
    },
  },
  {
    id: 'm2-t23-command-line-args',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Command-Line Arguments & atoi Parsing',
    summary: 'Process argc and argv argument vector arrays to control program execution mode.',
    tipBox: {
      syntax: `int main(int argc, char *argv[]) {
    for (int i = 1; i < argc; i++) {
        int val = atoi(argv[i]);
    }
}`,
      application: 'Unix command-line tools (grep, gcc, ls, git) and microservice configuration flags.',
      example: `#include <stdio.h>
#include <stdlib.h>
int main(int argc, char *argv[]) {
    int sum = 0;
    for (int i = 1; i < argc; i++) sum += atoi(argv[i]);
    printf("%d\\n", sum);
    return 0;
}`,
    },
    problem: {
      title: 'String-to-Integer Custom atoi',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Implement your own version of the standard \`atoi\` function: \`int my_atoi(const char *str)\` that converts a numeric string containing optional leading spaces and an optional leading sign (\`+\` or \`-\`) into a 32-bit signed integer.

### Input Format
A string representing a number.

### Output Format
Print the parsed integer followed by a newline.`,
      starterCode: `#include <stdio.h>

int my_atoi(const char *str) {
    // Custom atoi implementation
}

int main() {
    char s[64];
    if (scanf("%63s", s) != 1) return 0;
    printf("%d\\n", my_atoi(s));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int my_atoi(const char *str) {
    while (*str == ' ') str++;
    int sign = 1;
    if (*str == '-') {
        sign = -1;
        str++;
    } else if (*str == '+') {
        str++;
    }
    long long res = 0;
    while (*str >= '0' && *str <= '9') {
        res = res * 10 + (*str - '0');
        str++;
    }
    return (int)(res * sign);
}

int main() {
    char s[64];
    if (scanf("%63s", s) != 1) return 0;
    printf("%d\\n", my_atoi(s));
    return 0;
}`,
      openTestCase: {
        input: '-4289',
        expectedOutput: '-4289',
        explanation: 'Negative sign processed and digits accumulated into integer.',
      },
      hiddenTestCase: {
        input: '+12345',
        expectedOutput: '12345',
      },
    },
  },
  {
    id: 'm2-t24-inline-and-register',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Inline Function Optimization & Macro Safety',
    summary: 'Replace error-prone preprocessor macros with type-safe static inline functions.',
    tipBox: {
      syntax: `// Safe replacement for #define SQUARE(x) ((x)*(x))
static inline int square(int x) {
    return x * x; // Evaluates arguments exactly once (no side effects like square(i++))
}`,
      application: 'High-frequency trading engines, game physics loops, and Linux kernel inline driver utilities.',
      example: `#include <stdio.h>
static inline int clamp(int val, int lo, int hi) {
    if (val < lo) return lo;
    if (val > hi) return hi;
    return val;
}
int main() { printf("%d\\n", clamp(15, 0, 10)); return 0; }`,
    },
    problem: {
      title: 'Type-Safe Inline Clamp Function',
      difficulty: 'EASY',
      description: `### Problem Description
Write a \`static inline int clamp(int val, int low, int high)\` function that confines a value to a given range $[low, high]$.
- If $val < low$, return $low$.
- If $val > high$, return $high$.
- Otherwise, return $val$.

### Input Format
Three space-separated integers: $val, low, high$ ($low \\le high$).

### Output Format
Print the clamped value followed by a newline.`,
      starterCode: `#include <stdio.h>

static inline int clamp(int val, int low, int high) {
    // Inline clamping logic
}

int main() {
    int v, l, h;
    if (scanf("%d %d %d", &v, &l, &h) != 3) return 0;
    printf("%d\\n", clamp(v, l, h));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

static inline int clamp(int val, int low, int high) {
    if (val < low) return low;
    if (val > high) return high;
    return val;
}

int main() {
    int v, l, h;
    if (scanf("%d %d %d", &v, &l, &h) != 3) return 0;
    printf("%d\\n", clamp(v, l, h));
    return 0;
}`,
      openTestCase: {
        input: '15 0 10',
        expectedOutput: '10',
        explanation: '15 exceeds upper bound 10, clamped to 10.',
      },
      hiddenTestCase: {
        input: '-5 0 100',
        expectedOutput: '0',
      },
    },
  },
  {
    id: 'm2-t25-tail-call-recursion',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers & Functions',
    topicTitle: 'Tail Call Recursion & Stack Optimization',
    summary: 'Structure recursive return expression as pure function call without pending operations for compiler O(1) stack reuse.',
    tipBox: {
      syntax: `// Tail-recursive GCD: the return expression is purely gcd(b, a % b)
int gcdTail(int a, int b) {
    if (b == 0) return a;
    return gcdTail(b, a % b); // Compiler converts this to a jump instruction (zero stack frames!)
}`,
      application: 'Functional language compilers, real-time aerospace firmware requiring provable stack depth limits.',
      example: `#include <stdio.h>
int gcd(int a, int b) { return (b == 0) ? a : gcd(b, a % b); }
int main() { printf("%d\\n", gcd(48, 18)); return 0; }`,
    },
    problem: {
      title: 'Tail-Recursive GCD Evaluator',
      difficulty: 'EASY',
      description: `### Problem Description
Implement Greatest Common Divisor strictly using a **tail-recursive** function \`int gcd(int a, int b)\` where the recursive call is the final operation in the code path.

### Input Format
Two space-separated positive integers $A$ and $B$.

### Output Format
Print the computed GCD followed by a newline.`,
      starterCode: `#include <stdio.h>

int gcd(int a, int b) {
    // Pure tail call
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    printf("%d\\n", gcd(a, b));
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    printf("%d\\n", gcd(a, b));
    return 0;
}`,
      openTestCase: {
        input: '56 98',
        expectedOutput: '14',
        explanation: 'GCD(56, 98) = 14 computed via tail-recursive Euclidean reduction.',
      },
      hiddenTestCase: {
        input: '101 103',
        expectedOutput: '1',
      },
    },
  },
];
