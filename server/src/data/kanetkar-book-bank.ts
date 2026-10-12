export interface BookProblemDef {
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  tags: string[];
  description: string;
  starterCode: string;
  solutionCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  sourceType: 'BOOK';
  sourceRef: {
    bookId: string;
    bookTitle: string;
    author: string;
    edition: string;
    chapter: number;
    chapterTitle: string;
    chapterOrder: number;
    section: string;
    exerciseNumber: string;
    exerciseOrder: number;
    page: number;
    concept: string;
    copyrightStatus: 'ORIGINAL_REWRITE' | 'WRITTEN_PERMISSION_ON_FILE';
  };
  sampleTests: Array<{ input: string; expectedOutput: string }>;
  hiddenTests: Array<{ input: string; expectedOutput: string }>;
}

export const KANETKAR_BOOK_PROBLEMS: BookProblemDef[] = [
  // 1. Chapter 1: Declarations & Initializations (Q 1.2 / Q 1.3 / Q 1.22)
  {
    slug: 'kanetkar-ch1-scope-shadow-eval',
    title: 'Block Scope & Variable Shadowing Evaluator',
    difficulty: 'EASY',
    category: 'Declarations and Initializations',
    tags: ['Scope', 'Shadowing', 'Variables', 'Basics'],
    description: `### Problem Description

In C, variables declared in an inner block shadow variables of the same name declared in an enclosing outer block or at file scope (Yashavant Kanetkar, *Test Your C Skills*, Chapter 1: Declarations and Initializations).

Given three integer inputs:
- An outer global initial base value $G$
- An enclosing function local value $L$
- An innermost block value $B$
- A sequence of $K$ block entry and exit operations (\`ENTER\` to enter an inner scope multiplying the active value by $M$, or \`EXIT\` to return to the outer scope)

Simulate the lexical scope resolution and print the resolved active value after each operation.

### Input Format
- First line: Three space-separated integers $G$, $L$, and $B$ ($-10^4 \\le G, L, B \\le 10^4$).
- Second line: Integer $K$ ($1 \\le K \\le 100$), the number of operations.
- Next $K$ lines: Either \`ENTER M\` (where $M$ is an integer multiplier) or \`EXIT\`.

### Output Format
Print the active scoped value after each of the $K$ operations on a separate line.

### Example 1
**Input:**
\`\`\`
10 20 30
3
ENTER 2
EXIT
ENTER 5
\`\`\`
**Output:**
\`\`\`
60
30
150
\`\`\`

### Example 2
**Input:**
\`\`\`
5 15 25
2
EXIT
EXIT
\`\`\`
**Output:**
\`\`\`
15
5
\`\`\`

### Constraints
- $1 \\le K \\le 100$
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int g, l, b;
    if (scanf("%d %d %d", &g, &l, &b) != 3) return 0;
    
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    // TODO: Track nested scope stack and print resolved value after each operation
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    long long g, l, b;
    if (scanf("%lld %lld %lld", &g, &l, &b) != 3) return 0;
    
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    long long stack[256];
    int top = 2;
    stack[0] = g;
    stack[1] = l;
    stack[2] = b;
    
    for (int i = 0; i < k; i++) {
        char op[16];
        if (scanf("%s", op) != 1) break;
        if (strcmp(op, "ENTER") == 0) {
            long long m;
            scanf("%lld", &m);
            long long cur = stack[top];
            top++;
            stack[top] = cur * m;
        } else if (strcmp(op, "EXIT") == 0) {
            if (top > 0) {
                top--;
            }
        }
        printf("%lld\\n", stack[top]);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 1,
      chapterTitle: 'Declarations and Initializations',
      chapterOrder: 1,
      section: 'Scope and Linkage',
      exerciseNumber: '1.2',
      exerciseOrder: 2,
      page: 2,
      concept: 'Lexical block scoping and local shadowing of enclosing identifiers',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '10 20 30\n3\nENTER 2\nEXIT\nENTER 5\n', expectedOutput: '60\n30\n150\n' },
      { input: '5 15 25\n2\nEXIT\nEXIT\n', expectedOutput: '15\n5\n' },
    ],
    hiddenTests: [
      { input: '1 2 3\n1\nENTER 10\n', expectedOutput: '30\n' },
      { input: '100 200 400\n4\nEXIT\nEXIT\nEXIT\nENTER 3\n', expectedOutput: '200\n100\n100\n300\n' },
      { input: '-5 10 -20\n3\nENTER -2\nENTER 3\nEXIT\n', expectedOutput: '40\n120\n40\n' },
      { input: '0 0 7\n2\nENTER 99\nEXIT\n', expectedOutput: '693\n7\n' },
      { input: '42 84 126\n3\nENTER 1\nENTER 1\nEXIT\n', expectedOutput: '126\n126\n126\n' },
    ],
  },

  // 2. Chapter 2: Control Instructions (Q 2.1 / Q 2.8)
  {
    slug: 'kanetkar-ch2-switch-fallthrough-calc',
    title: 'Switch-Case Fallthrough State Machine',
    difficulty: 'EASY',
    category: 'Control Instructions',
    tags: ['Switch Case', 'Fallthrough', 'Control Flow', 'Basics'],
    description: `### Problem Description

In standard C, \`switch\` statements execute sequentially from the matched \`case\` label until an explicit \`break\` statement is encountered or the block terminates (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2: Control Instructions, Q 2.1).

Implement a simulation of a 4-state accumulator register $A$ starting at an initial value $V_0$.
Given an integer code $C \\in \\{1, 2, 3, 4\\}$ and an array of 4 operation modifiers:
- Case 1: Add $X_1$ to $A$ (no break $\\rightarrow$ falls through to Case 2)
- Case 2: Multiply $A$ by $X_2$ (no break $\\rightarrow$ falls through to Case 3)
- Case 3: Subtract $X_3$ from $A$ (has break $\\rightarrow$ terminates switch)
- Case 4: Default case: Set $A = A \\oplus X_4$ (has break)

Compute the final accumulator value after the switch executes according to standard C fallthrough semantics.

### Input Format
- First line: The initial accumulator value $V_0$ and the switch code $C$ ($-10^4 \\le V_0 \\le 10^4$, $1 \\le C \\le 4$).
- Second line: Four space-separated integers $X_1, X_2, X_3, X_4$ (modifiers for cases 1 to 4).

### Output Format
Print the single resulting accumulator value followed by a newline.

### Example 1
**Input:**
\`\`\`
10 1
5 2 7 9
\`\`\`
**Output:**
\`\`\`
23
\`\`\`
**Explanation:** Starts at 10. Code 1: adds $X_1=5$ ($10+5=15$). Falls through to Case 2: multiplies by $X_2=2$ ($15 \\times 2 = 30$). Falls through to Case 3: subtracts $X_3=7$ ($30-7=23$). Hits break! Final = 23.

### Example 2
**Input:**
\`\`\`
10 2
5 2 7 9
\`\`\`
**Output:**
\`\`\`
13
\`\`\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    long long v0;
    int c;
    if (scanf("%lld %d", &v0, &c) != 2) return 0;
    
    long long x1, x2, x3, x4;
    if (scanf("%lld %lld %lld %lld", &x1, &x2, &x3, &x4) != 4) return 0;
    
    // TODO: Implement switch-case with fallthrough semantics
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    long long a;
    int c;
    if (scanf("%lld %d", &a, &c) != 2) return 0;
    
    long long x1, x2, x3, x4;
    if (scanf("%lld %lld %lld %lld", &x1, &x2, &x3, &x4) != 4) return 0;
    
    switch (c) {
        case 1:
            a += x1;
            // fall through
        case 2:
            a *= x2;
            // fall through
        case 3:
            a -= x3;
            break;
        case 4:
        default:
            a ^= x4;
            break;
    }
    
    printf("%lld\\n", a);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 2,
      chapterTitle: 'Control Instructions',
      chapterOrder: 2,
      section: 'Switch & Selection Statements',
      exerciseNumber: '2.1',
      exerciseOrder: 1,
      page: 17,
      concept: 'Switch-case statement fall-through execution when break is omitted',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '10 1\n5 2 7 9\n', expectedOutput: '23\n' },
      { input: '10 2\n5 2 7 9\n', expectedOutput: '13\n' },
    ],
    hiddenTests: [
      { input: '10 3\n5 2 7 9\n', expectedOutput: '3\n' },
      { input: '10 4\n5 2 7 9\n', expectedOutput: '3\n' },
      { input: '0 1\n10 3 5 1\n', expectedOutput: '25\n' },
      { input: '-5 1\n15 2 10 0\n', expectedOutput: '10\n' },
      { input: '100 2\n1 0 50 12\n', expectedOutput: '-50\n' },
    ],
  },

  // 3. Chapter 3: Expressions (Q 3.8 / Q 3.13 / Q 3.14)
  {
    slug: 'kanetkar-ch3-short-circuit-evaluation',
    title: 'Short-Circuit Logical Expression Evaluator',
    difficulty: 'EASY',
    category: 'Expressions',
    tags: ['Logical Operators', 'Short Circuit', 'Expressions', 'Evaluation Order'],
    description: `### Problem Description

In standard C, logical operators \`&&\` and \`||\` enforce strict left-to-right sequence points and short-circuit evaluation (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3: Expressions, Q 3.8, Q 3.13, Q 3.14).
If the left-hand operand of \`&&\` evaluates to zero (false), the right-hand operand is **never evaluated**.
Similarly, if the left-hand operand of \`||\` evaluates to non-zero (true), the right-hand operand is **never evaluated**.

Given four integer registers $I, J, K, M$ and an expression type:
- Type 1: \`M = (++I || ++J) && ++K;\`
- Type 2: \`M = (++I && ++J) || ++K;\`
- Type 3: \`M = (++I && ++J) && ++K;\`

Simulate the exact C standard evaluation order, accounting for all side-effects, and print the resulting values of $I, J, K, M$.

### Input Format
A single line containing 5 space-separated integers: $T$ (expression type 1, 2, or 3) followed by the initial values $I, J, K, M$ ($-100 \\le I, J, K, M \\le 100$).

### Output Format
Print the four updated values \`I J K M\` separated by single spaces.

### Example 1
**Input:**
\`\`\`
1 -1 0 0 0
\`\`\`
**Output:**
\`\`\`
0 1 1 1
\`\`\`
**Explanation:** Initial $I=-1, J=0, K=0$. Type 1: \`++I\` yields $0$ (false). Because it is false, \`++J\` must be evaluated! $J$ becomes $1$ (true). Now the left side of \`&&\` is true, so \`++K\` is evaluated ($K$ becomes 1). $M = 1$. Final values: $0, 1, 1, 1$.

### Example 2
**Input:**
\`\`\`
1 1 0 0 0
\`\`\`
**Output:**
\`\`\`
2 0 1 1
\`\`\`
**Explanation:** $I=1$. \`++I\` yields 2 (true). Short-circuit skips \`++J\` ($J$ remains 0). \`++K\` evaluates to 1. $M=1$. Final: $2, 0, 1, 1$.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int t, i, j, k, m;
    if (scanf("%d %d %d %d %d", &t, &i, &j, &k, &m) != 5) return 0;
    
    // TODO: Apply C standard short-circuit evaluation rules
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int t, i, j, k, m;
    if (scanf("%d %d %d %d %d", &t, &i, &j, &k, &m) != 5) return 0;
    
    if (t == 1) {
        m = (++i || ++j) && ++k;
    } else if (t == 2) {
        m = (++i && ++j) || ++k;
    } else if (t == 3) {
        m = (++i && ++j) && ++k;
    }
    
    printf("%d %d %d %d\\n", i, j, k, m);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 3,
      chapterTitle: 'Expressions',
      chapterOrder: 3,
      section: 'Sequence Points and Short-Circuit',
      exerciseNumber: '3.13',
      exerciseOrder: 13,
      page: 30,
      concept: 'Short-circuit evaluation of logical AND and OR operators in C expressions',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '1 -1 0 0 0\n', expectedOutput: '0 1 1 1\n' },
      { input: '1 1 0 0 0\n', expectedOutput: '2 0 1 1\n' },
    ],
    hiddenTests: [
      { input: '2 -1 0 0 0\n', expectedOutput: '0 0 1 1\n' },
      { input: '2 1 1 0 0\n', expectedOutput: '2 2 0 1\n' },
      { input: '3 0 0 0 0\n', expectedOutput: '1 1 1 1\n' },
      { input: '3 -1 5 5 0\n', expectedOutput: '0 5 5 0\n' },
      { input: '1 -1 -1 -1 0\n', expectedOutput: '0 0 -1 0\n' },
    ],
  },

  // 4. Chapter 5: Functions (Q 5.4 / Q 5.12)
  {
    slug: 'kanetkar-ch5-recursive-stack-depth',
    title: 'Tail Call & Recursion Stack Depth Tracer',
    difficulty: 'EASY',
    category: 'Functions',
    tags: ['Functions', 'Recursion', 'Call Stack'],
    description: `### Problem Description

In C, each recursive function call allocates a new stack frame storing local variables and return addresses until the base condition is met (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5: Functions).

Given two positive integers $N$ and $K$:
Implement a recursive function that tracks both the computed value and the maximum call stack depth.
The recurrence is defined as:
- $F(0) = 1$
- $F(x) = (x \\times F(x - 1) + K) \\pmod{10^9 + 7}$

Output the computed value $F(N)$ and the total number of stack frames instantiated.

### Input Format
A single line with two space-separated integers $N$ ($0 \\le N \\le 10^5$) and $K$ ($0 \\le K \\le 10^9$).

### Output Format
Print two space-separated integers: \`F(N) STACK_FRAMES\`.

### Example 1
**Input:**
\`\`\`
3 5
\`\`\`
**Output:**
\`\`\`
38 4
\`\`\`
**Explanation:** 
$F(0) = 1$ (1 frame)
$F(1) = 1 \\times 1 + 5 = 6$
$F(2) = 2 \\times 6 + 5 = 17$
$F(3) = 3 \\times 17 + 5 = 56 \\pmod{10^9+7} = 56$... For $N=3$, frames instantiated = 4 ($0, 1, 2, 3$).

### Constraints
- $0 \\le N \\le 10^5$
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    long long n, k;
    if (scanf("%lld %lld", &n, &k) != 2) return 0;
    
    // TODO: Calculate recurrence and frame count
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

#define MOD 1000000007LL

int main() {
    long long n, k;
    if (scanf("%lld %lld", &n, &k) != 2) return 0;
    
    long long f = 1;
    for (long long i = 1; i <= n; i++) {
        f = (i % MOD * f + k) % MOD;
    }
    
    printf("%lld %lld\\n", f, n + 1);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 5,
      chapterTitle: 'Functions',
      chapterOrder: 5,
      section: 'Recursion and Call Semantics',
      exerciseNumber: '5.4',
      exerciseOrder: 4,
      page: 48,
      concept: 'Stack frame allocation and state accumulation across recursive function invocations',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 5\n', expectedOutput: '56 4\n' },
      { input: '0 10\n', expectedOutput: '1 1\n' },
    ],
    hiddenTests: [
      { input: '1 0\n', expectedOutput: '1 2\n' },
      { input: '5 2\n', expectedOutput: '532 6\n' },
      { input: '10 7\n', expectedOutput: '47275907 11\n' },
      { input: '100 13\n', expectedOutput: '536207067 101\n' },
      { input: '1000 42\n', expectedOutput: '596789037 1001\n' },
    ],
  },

  // 5. Chapter 6: The C Preprocessor (Q 6.4 / Q 6.23 / Q 6.25 / Q 6.27)
  {
    slug: 'kanetkar-ch6-macro-token-expansion',
    title: 'C Preprocessor Macro Expansion & Stringizing Simulator',
    difficulty: 'MEDIUM',
    category: 'The C Preprocessor',
    tags: ['Preprocessor', 'Macros', 'Stringizing', 'Token Pasting'],
    description: `### Problem Description

In the C preprocessor, macro arguments undergo textual substitution without precedence grouping unless parenthesized, and the \`#\` operator transforms an argument into a string literal (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: The C Preprocessor, Q 6.4, Q 6.23).

Consider two classic preprocessor subtleties:
1. \`#define SQR(x) (x * x)\`: Passing an expression like \`a + b\` expands to \`a + b * a + b\` rather than \`((a + b) * (a + b))\`.
2. Safe macro: \`#define SAFE_SQR(x) ((x) * (x))\`.

Given $N$ pairs of integers $A$ and $B$, compute and print:
- The result of naive expansion: $A + B \\times A + B$
- The result of safe parenthesized expansion: $(A + B)^2$
- The absolute difference between the safe and naive evaluations.

### Input Format
- First line: Integer $N$ ($1 \\le N \\le 100$).
- Next $N$ lines: Two space-separated integers $A$ and $B$ ($-1000 \\le A, B \\le 1000$).

### Output Format
For each pair, print three space-separated integers on a line: \`NAIVE SAFE DIFF\`.

### Example 1
**Input:**
\`\`\`
2
2 3
4 5
\`\`\`
**Output:**
\`\`\`
11 25 14
29 81 52
\`\`\`
**Explanation:** For $A=2, B=3$: Naive = $2 + 3 \\times 2 + 3 = 2 + 6 + 3 = 11$. Safe = $(2 + 3)^2 = 25$. Diff = $25 - 11 = 14$.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Calculate naive vs safe macro expansions
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    for (int i = 0; i < n; i++) {
        long long a, b;
        if (scanf("%lld %lld", &a, &b) != 2) break;
        long long naive = a + b * a + b;
        long long safe = (a + b) * (a + b);
        long long diff = llabs(safe - naive);
        printf("%lld %lld %lld\\n", naive, safe, diff);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 6,
      chapterTitle: 'The C Preprocessor',
      chapterOrder: 6,
      section: 'Macro Parameter Substitution',
      exerciseNumber: '6.4',
      exerciseOrder: 4,
      page: 55,
      concept: 'Precedence anomalies during textual macro expansion without proper grouping parentheses',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n2 3\n4 5\n', expectedOutput: '11 25 14\n29 81 52\n' },
      { input: '1\n1 1\n', expectedOutput: '3 4 1\n' },
    ],
    hiddenTests: [
      { input: '1\n0 0\n', expectedOutput: '0 0 0\n' },
      { input: '1\n10 0\n', expectedOutput: '10 100 90\n' },
      { input: '1\n0 10\n', expectedOutput: '10 100 90\n' },
      { input: '2\n-2 3\n5 -2\n', expectedOutput: '-5 1 6\n-7 9 16\n' },
      { input: '1\n100 100\n', expectedOutput: '10200 40000 29800\n' },
    ],
  },

  // 6. Chapter 7: Pointers (Q 7.3 / Q 7.4 / Q 7.6 / Q 7.7)
  {
    slug: 'kanetkar-ch7-multidim-pointer-arithmetic',
    title: 'Multi-Dimensional Array Pointer Arithmetic & Offsets',
    difficulty: 'MEDIUM',
    category: 'Pointers',
    tags: ['Pointers', 'Arrays', 'Pointer Arithmetic', 'Address Calculations'],
    description: `### Problem Description

In C pointer arithmetic, array indexing is identical to pointer dereferencing: \`a[i][j][k]\` is strictly defined as \`*(*(*(a + i) + j) + k)\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Pointers, Q 7.5, Q 7.7, Q 7.8).
Furthermore, incrementing a pointer to an array of dimension $D_2 \\times D_3$ advances the address by $D_2 \\times D_3 \\times \\text{sizeof}(\\text{type})$ bytes.

Given a 3D array of dimensions $D_1 \\times D_2 \\times D_3$ populated in row-major order with sequential integers starting at $1$, and a base byte address $B_0$:
For $Q$ queries specifying either:
1. Index triplet $(i, j, k)$: Compute the element value, the linear element offset, and the exact byte address assuming 4-byte integers.
2. A linear index $L$: Compute the corresponding $(i, j, k)$ coordinate decomposition.

### Input Format
- First line: Dimensions $D_1, D_2, D_3$ and base address $B_0$ ($1 \\le D_1, D_2, D_3 \\le 50$, $1000 \\le B_0 \\le 10^6$).
- Second line: Number of queries $Q$ ($1 \\le Q \\le 100$).
- Next $Q$ lines: Either \`COORD i j k\` or \`LINEAR L\` ($0 \\le i < D_1, 0 \\le j < D_2, 0 \\le k < D_3$, $0 \\le L < D_1 D_2 D_3$).

### Output Format
- For \`COORD i j k\`: Print \`VAL: <v> OFFSET: <linear> ADDR: <addr>\`.
- For \`LINEAR L\`: Print \`I: <i> J: <j> K: <k>\`.

### Example 1
**Input:**
\`\`\`
2 3 4 1000
2
COORD 1 2 3
LINEAR 7
\`\`\`
**Output:**
\`\`\`
VAL: 24 OFFSET: 23 ADDR: 1092
I: 0 J: 1 K: 3
\`\`\`
**Explanation:** Total elements = $2 \\times 3 \\times 4 = 24$. Linear offset for $(1, 2, 3) = 1 \\times 12 + 2 \\times 4 + 3 = 23$. Value = $23 + 1 = 24$. Byte address = $1000 + 23 \\times 4 = 1092$.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int d1, d2, d3;
    long long b0;
    if (scanf("%d %d %d %lld", &d1, &d2, &d3, &b0) != 4) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Process coordinate and linear pointer offset queries
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int d1, d2, d3;
    long long b0;
    if (scanf("%d %d %d %lld", &d1, &d2, &d3, &b0) != 4) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    for (int query = 0; query < q; query++) {
        char type[16];
        if (scanf("%s", type) != 1) break;
        if (strcmp(type, "COORD") == 0) {
            int i, j, k;
            scanf("%d %d %d", &i, &j, &k);
            long long offset = (long long)i * d2 * d3 + (long long)j * d3 + k;
            long long val = offset + 1;
            long long addr = b0 + offset * 4;
            printf("VAL: %lld OFFSET: %lld ADDR: %lld\\n", val, offset, addr);
        } else if (strcmp(type, "LINEAR") == 0) {
            long long l;
            scanf("%lld", &l);
            int i = l / (d2 * d3);
            long long rem = l % (d2 * d3);
            int j = rem / d3;
            int k = rem % d3;
            printf("I: %d J: %d K: %d\\n", i, j, k);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 7,
      chapterTitle: 'Pointers',
      chapterOrder: 7,
      section: 'Multidimensional Array Pointers',
      exerciseNumber: '7.7',
      exerciseOrder: 7,
      page: 70,
      concept: 'Equivalence between pointer arithmetic indexing and multidimensional array row-major byte strides',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2 3 4 1000\n2\nCOORD 1 2 3\nLINEAR 7\n', expectedOutput: 'VAL: 24 OFFSET: 23 ADDR: 1092\nI: 0 J: 1 K: 3\n' },
      { input: '1 1 1 5000\n1\nCOORD 0 0 0\n', expectedOutput: 'VAL: 1 OFFSET: 0 ADDR: 5000\n' },
    ],
    hiddenTests: [
      { input: '3 4 5 2000\n2\nCOORD 0 0 0\nCOORD 2 3 4\n', expectedOutput: 'VAL: 1 OFFSET: 0 ADDR: 2000\nVAL: 60 OFFSET: 59 ADDR: 2236\n' },
      { input: '3 4 5 2000\n2\nLINEAR 0\nLINEAR 59\n', expectedOutput: 'I: 0 J: 0 K: 0\nI: 2 J: 3 K: 4\n' },
      { input: '2 2 2 10000\n4\nCOORD 1 0 0\nCOORD 0 1 0\nCOORD 0 0 1\nLINEAR 6\n', expectedOutput: 'VAL: 5 OFFSET: 4 ADDR: 10016\nVAL: 3 OFFSET: 2 ADDR: 10008\nVAL: 2 OFFSET: 1 ADDR: 10004\nI: 1 J: 1 K: 0\n' },
      { input: '5 5 5 1000\n1\nLINEAR 124\n', expectedOutput: 'I: 4 J: 4 K: 4\n' },
      { input: '10 10 10 500\n1\nCOORD 9 9 9\n', expectedOutput: 'VAL: 1000 OFFSET: 999 ADDR: 4496\n' },
    ],
  },

  // 7. Chapter 9: Arrays (Q 9.1 / Q 9.6 / Q 9.14)
  {
    slug: 'kanetkar-ch9-array-decay-bounds',
    title: 'Array Decay, Stride Traversal & Range Accumulator',
    difficulty: 'EASY',
    category: 'Arrays',
    tags: ['Arrays', 'Pointer Decay', 'Memory Layout', 'Basics'],
    description: `### Problem Description

In C, an array name decays to a pointer to its first element in most expression contexts, except when operand to \`sizeof\` or the unary \`&\` address-of operator (Yashavant Kanetkar, *Test Your C Skills*, Chapter 9: Arrays, Q 9.1, Q 9.5).

Given an array of $N$ integers and $M$ stride traversal operations:
Each operation gives a starting index $S$, a stride step $K$, and an element count $C$.
Accumulate the sum of values accessed by following the stride: $A[S], A[S + K], A[S + 2K], \\dots, A[S + (C - 1)K]$.
If any index exceeds the array bounds ($< 0$ or $\\ge N$), stop accumulating at that boundary and report \`BOUND_EXCEEDED\`. Otherwise, report \`OK\`.

### Input Format
- First line: Integer $N$ ($1 \\le N \\le 1000$).
- Second line: $N$ space-separated integers.
- Third line: Integer $M$ ($1 \\le M \\le 100$).
- Next $M$ lines: Three space-separated integers $S, K, C$.

### Output Format
For each operation, print \`SUM: <total> STATUS: <status>\` on a separate line.

### Example 1
**Input:**
\`\`\`
5
10 20 30 40 50
2
0 2 3
1 3 3
\`\`\`
**Output:**
\`\`\`
SUM: 90 STATUS: OK
SUM: 60 STATUS: BOUND_EXCEEDED
\`\`\`
**Explanation:** 
Query 1: accesses $A[0]=10, A[2]=30, A[4]=50$. Sum = 90. Status OK.
Query 2: accesses $A[1]=20, A[4]=40$. Next index $1 + 6 = 7 \\ge 5$, out of bounds! Sum = 60. Status BOUND_EXCEEDED.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Process array stride operations
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    long long arr[1024];
    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
    }
    
    int m;
    if (scanf("%d", &m) != 1) return 0;
    
    for (int q = 0; q < m; q++) {
        int s, k, c;
        scanf("%d %d %d", &s, &k, &c);
        long long sum = 0;
        int bounded = 1;
        for (int step = 0; step < c; step++) {
            int idx = s + step * k;
            if (idx < 0 || idx >= n) {
                bounded = 0;
                break;
            }
            sum += arr[idx];
        }
        printf("SUM: %lld STATUS: %s\\n", sum, bounded ? "OK" : "BOUND_EXCEEDED");
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 9,
      chapterTitle: 'Arrays',
      chapterOrder: 9,
      section: 'Array Decaying and Bounds',
      exerciseNumber: '9.1',
      exerciseOrder: 1,
      page: 91,
      concept: 'Array decaying into base element pointer and stride indexing arithmetic',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n10 20 30 40 50\n2\n0 2 3\n1 3 3\n', expectedOutput: 'SUM: 90 STATUS: OK\nSUM: 70 STATUS: BOUND_EXCEEDED\n' },
      { input: '3\n1 2 3\n1\n0 1 3\n', expectedOutput: 'SUM: 6 STATUS: OK\n' },
    ],
    hiddenTests: [
      { input: '4\n5 5 5 5\n1\n0 1 4\n', expectedOutput: 'SUM: 20 STATUS: OK\n' },
      { input: '4\n5 5 5 5\n1\n0 1 5\n', expectedOutput: 'SUM: 20 STATUS: BOUND_EXCEEDED\n' },
      { input: '6\n1 -2 3 -4 5 -6\n2\n0 1 6\n1 2 3\n', expectedOutput: 'SUM: -3 STATUS: OK\nSUM: -12 STATUS: OK\n' },
      { input: '1\n100\n2\n0 1 1\n0 1 2\n', expectedOutput: 'SUM: 100 STATUS: OK\nSUM: 100 STATUS: BOUND_EXCEEDED\n' },
      { input: '5\n2 4 6 8 10\n1\n4 -2 3\n', expectedOutput: 'SUM: 18 STATUS: OK\n' },
    ],
  },

  // 8. Chapter 10: Strings (Q 10.1 / Q 10.2 / Q 10.6)
  {
    slug: 'kanetkar-ch10-string-literal-pointer-offset',
    title: 'String Literal Pointer Offset & Comparison Engine',
    difficulty: 'EASY',
    category: 'Strings',
    tags: ['Strings', 'Pointers', 'String Literals', 'Basics'],
    description: `### Problem Description

In standard C, a string literal evaluates to a pointer to the first character of a null-terminated static array (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Strings, Q 10.1, Q 10.2).
Adding an integer offset $K$ to a string literal (\`K + "Fascimile"\`) yields a pointer starting $K$ characters into the string.
Additionally, comparing two string pointers using \`==\` checks for **pointer address identity**, NOT contents (which requires \`strcmp\`).

Given a string $S$ and an integer offset $K$ ($0 \\le K < |S|$):
1. Extract and print the substring starting at offset $K$: \`*(S + K)\`.
2. Given a second string $T$, report whether they are identical in content (\`CONTENT_EQUAL\` vs \`CONTENT_DIFFERENT\`).
3. Compute the lexicographical difference value (\`strcmp(S, T)\`).

### Input Format
- First line: The string $S$ (no spaces, length $1 \\le |S| \\le 1000$).
- Second line: An integer offset $K$ ($0 \\le K < |S|$).
- Third line: A comparison string $T$ (no spaces, length $1 \\le |T| \\le 1000$).

### Output Format
- Line 1: The substring starting at offset $K$.
- Line 2: Either \`CONTENT_EQUAL\` or \`CONTENT_DIFFERENT\`.
- Line 3: The sign of \`strcmp(S, T)\`: \`LESS\`, \`EQUAL\`, or \`GREATER\`.

### Example 1
**Input:**
\`\`\`
Fascimile
5
Fascimile
\`\`\`
**Output:**
\`\`\`
mile
CONTENT_EQUAL
EQUAL
\`\`\`

### Example 2
**Input:**
\`\`\`
LogicQ
2
Platform
\`\`\`
**Output:**
\`\`\`
gicQ
CONTENT_DIFFERENT
LESS
\`\`\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[1024];
    if (scanf("%s", s) != 1) return 0;
    
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    char t[1024];
    if (scanf("%s", t) != 1) return 0;
    
    // TODO: Substring offset and comparison logic
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[1024];
    if (scanf("%s", s) != 1) return 0;
    
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    char t[1024];
    if (scanf("%s", t) != 1) return 0;
    
    printf("%s\\n", s + k);
    
    int cmp = strcmp(s, t);
    if (cmp == 0) {
        printf("CONTENT_EQUAL\\nEQUAL\\n");
    } else {
        printf("CONTENT_DIFFERENT\\n");
        if (cmp < 0) {
            printf("LESS\\n");
        } else {
            printf("GREATER\\n");
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Strings',
      chapterOrder: 10,
      section: 'String Literals and Comparisons',
      exerciseNumber: '10.1',
      exerciseOrder: 1,
      page: 99,
      concept: 'String literal decaying to character pointers and offset address arithmetic',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'Fascimile\n5\nFascimile\n', expectedOutput: 'mile\nCONTENT_EQUAL\nEQUAL\n' },
      { input: 'LogicQ\n2\nPlatform\n', expectedOutput: 'gicQ\nCONTENT_DIFFERENT\nLESS\n' },
    ],
    hiddenTests: [
      { input: 'A\n0\nA\n', expectedOutput: 'A\nCONTENT_EQUAL\nEQUAL\n' },
      { input: 'Hello\n1\nHelp\n', expectedOutput: 'ello\nCONTENT_DIFFERENT\nLESS\n' },
      { input: 'Zebra\n0\nApple\n', expectedOutput: 'Zebra\nCONTENT_DIFFERENT\nGREATER\n' },
      { input: 'PointerArithmetic\n7\nPointerArithmetic\n', expectedOutput: 'Arithmetic\nCONTENT_EQUAL\nEQUAL\n' },
      { input: 'Kanetkar\n4\ntkar\n', expectedOutput: 'tkar\nCONTENT_DIFFERENT\nLESS\n' },
    ],
  },

  // 9. Chapter 11: Structures, Unions and Enumerations (Q 11.17 / Q 11.19 / Q 11.23)
  {
    slug: 'kanetkar-ch11-struct-padding-offset-calc',
    title: 'Structure Member Alignment & Offset Calculator',
    difficulty: 'MEDIUM',
    category: 'Structures, Unions and Enumerations',
    tags: ['Structures', 'Alignment', 'Padding', 'Memory Layout'],
    description: `### Problem Description

In standard C, compilers insert alignment padding between structure members so that multi-byte types align with natural hardware word boundaries (Yashavant Kanetkar, *Test Your C Skills*, Chapter 11: Structures, Unions and Enumerations, Q 11.17, Q 11.19).
The macro \`offsetof(type, member)\` computes the exact byte offset of a member from the start of the structure.

Consider a composite structure layout:
- Member 1: A \`char\` array of size $S_1$ bytes (alignment = 1)
- Member 2: A 4-byte \`int\` (natural alignment = 4 bytes)
- Member 3: A 2-byte \`short\` (natural alignment = 2 bytes)
- Member 4: An 8-byte \`long long\` (natural alignment = 8 bytes)

Given the character buffer size $S_1$, calculate:
1. The exact starting byte offset of each of the 4 members assuming standard natural alignment.
2. The total size in bytes of the structure including trailing padding (which must round up to the maximum member alignment, 8 bytes).

### Input Format
A single line containing the integer $S_1$ ($1 \\le S_1 \\le 128$).

### Output Format
- First line: Four space-separated integers: \`OFF_M1 OFF_M2 OFF_M3 OFF_M4\`.
- Second line: The total padded structure size: \`TOTAL_SIZE: <size>\`.

### Example 1
**Input:**
\`\`\`
15
\`\`\`
**Output:**
\`\`\`
0 16 20 24
TOTAL_SIZE: 32
\`\`\`
**Explanation:** Member 1 starts at 0 and occupies 15 bytes (0..14). Member 2 requires 4-byte alignment, so 1 byte of padding is added; it starts at 16 (16..19). Member 3 requires 2-byte alignment; 20 is already divisible by 2, so it starts at 20 (20..21). Member 4 requires 8-byte alignment; 22 is not divisible by 8, so 2 bytes of padding are added; it starts at 24 (24..31). Total size is 32 (already a multiple of 8).

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int s1;
    if (scanf("%d", &s1) != 1) return 0;
    
    // TODO: Compute member offsets and total padded struct size
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int s1;
    if (scanf("%d", &s1) != 1) return 0;
    
    long long off1 = 0;
    long long cur = s1;
    
    // M2: 4-byte alignment
    if (cur % 4 != 0) {
        cur += (4 - (cur % 4));
    }
    long long off2 = cur;
    cur += 4;
    
    // M3: 2-byte alignment
    if (cur % 2 != 0) {
        cur += (2 - (cur % 2));
    }
    long long off3 = cur;
    cur += 2;
    
    // M4: 8-byte alignment
    if (cur % 8 != 0) {
        cur += (8 - (cur % 8));
    }
    long long off4 = cur;
    cur += 8;
    
    // Total struct size rounds up to multiple of max align (8)
    if (cur % 8 != 0) {
        cur += (8 - (cur % 8));
    }
    long long total = cur;
    
    printf("%lld %lld %lld %lld\\nTOTAL_SIZE: %lld\\n", off1, off2, off3, off4, total);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 11,
      chapterTitle: 'Structures, Unions and Enumerations',
      chapterOrder: 11,
      section: 'Structure Padding and Offset Calculation',
      exerciseNumber: '11.17',
      exerciseOrder: 17,
      page: 122,
      concept: 'Hardware word boundary alignment padding and structure memory footprints',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '15\n', expectedOutput: '0 16 20 24\nTOTAL_SIZE: 32\n' },
      { input: '1\n', expectedOutput: '0 4 8 16\nTOTAL_SIZE: 24\n' },
    ],
    hiddenTests: [
      { input: '4\n', expectedOutput: '0 4 8 16\nTOTAL_SIZE: 24\n' },
      { input: '8\n', expectedOutput: '0 8 12 16\nTOTAL_SIZE: 24\n' },
      { input: '10\n', expectedOutput: '0 12 16 24\nTOTAL_SIZE: 32\n' },
      { input: '32\n', expectedOutput: '0 32 36 40\nTOTAL_SIZE: 48\n' },
      { input: '100\n', expectedOutput: '0 100 104 112\nTOTAL_SIZE: 120\n' },
    ],
  },

  // 10. Chapter 14: Bitwise Operators (Q 14.1 / Q 14.6 / Q 14.13 / Q 14.16)
  {
    slug: 'kanetkar-ch14-bitwise-slot-masking',
    title: 'Bitwise Slot Array Masking & Parity Inspector',
    difficulty: 'EASY',
    category: 'Bitwise Operators',
    tags: ['Bitwise', 'Bitmask', 'Shifting', 'Basics'],
    description: `### Problem Description

In systems C programming, bitwise operators (\`&\`, \`|\`, \`^\`, \`~\`, \`<<\`, \`>>\`) allow compact manipulation of packed bitfields and hardware flag registers (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14: Bitwise Operators, Q 14.1, Q 14.6, Q 14.13, Q 14.16).

Implement a 32-bit register flag manager supporting $Q$ operations:
- \`SET k\`: Set the $k$-th bit ($0 \\le k < 32$) to 1: \`reg |= (1U << k)\`.
- \`CLEAR k\`: Clear the $k$-th bit to 0: \`reg &= ~(1U << k)\`.
- \`FLIP k\`: Toggle the $k$-th bit: \`reg ^= (1U << k)\`.
- \`TEST k\`: Print \`1\` if the $k$-th bit is set, else \`0\`.
- \`COUNT\`: Print the total number of set bits (popcount) in the register.
- \`HEX\`: Print the register value formatted as an 8-character uppercase hexadecimal integer (\`%08X\`).

### Input Format
- First line: The initial 32-bit unsigned integer value $V_0$.
- Second line: Integer $Q$ ($1 \\le Q \\le 100$), the number of operations.
- Next $Q$ lines: Commands as described above.

### Output Format
Print the result of each \`TEST\`, \`COUNT\`, or \`HEX\` command on a separate line.

### Example 1
**Input:**
\`\`\`
0
5
SET 3
TEST 3
TEST 2
COUNT
HEX
\`\`\`
**Output:**
\`\`\`
1
0
1
00000008
\`\`\`

### Example 2
**Input:**
\`\`\`
15
3
FLIP 0
COUNT
HEX
\`\`\`
**Output:**
\`\`\`
3
0000000E
\`\`\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    unsigned int reg;
    if (scanf("%u", &reg) != 1) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Implement bitwise operations on reg
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    unsigned int reg;
    if (scanf("%u", &reg) != 1) return 0;
    
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    for (int i = 0; i < q; i++) {
        char op[16];
        if (scanf("%s", op) != 1) break;
        if (strcmp(op, "SET") == 0) {
            int k;
            scanf("%d", &k);
            reg |= (1U << k);
        } else if (strcmp(op, "CLEAR") == 0) {
            int k;
            scanf("%d", &k);
            reg &= ~(1U << k);
        } else if (strcmp(op, "FLIP") == 0) {
            int k;
            scanf("%d", &k);
            reg ^= (1U << k);
        } else if (strcmp(op, "TEST") == 0) {
            int k;
            scanf("%d", &k);
            printf("%d\\n", (reg & (1U << k)) ? 1 : 0);
        } else if (strcmp(op, "COUNT") == 0) {
            int cnt = 0;
            unsigned int tmp = reg;
            while (tmp) {
                cnt += (tmp & 1U);
                tmp >>= 1;
            }
            printf("%d\\n", cnt);
        } else if (strcmp(op, "HEX") == 0) {
            printf("%08X\\n", reg);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 14,
      chapterTitle: 'Bitwise Operators',
      chapterOrder: 14,
      section: 'Bit Manipulation and Masking',
      exerciseNumber: '14.16',
      exerciseOrder: 16,
      page: 165,
      concept: 'Bitwise bitfield manipulation, bitmask generation, and population counts',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '0\n5\nSET 3\nTEST 3\nTEST 2\nCOUNT\nHEX\n', expectedOutput: '1\n0\n1\n00000008\n' },
      { input: '15\n3\nFLIP 0\nCOUNT\nHEX\n', expectedOutput: '3\n0000000E\n' },
    ],
    hiddenTests: [
      { input: '0\n2\nSET 31\nHEX\n', expectedOutput: '80000000\n' },
      { input: '4294967295\n3\nCLEAR 15\nTEST 15\nCOUNT\n', expectedOutput: '0\n31\n' },
      { input: '255\n2\nCOUNT\nHEX\n', expectedOutput: '8\n000000FF\n' },
      { input: '1\n3\nFLIP 0\nTEST 0\nCOUNT\n', expectedOutput: '0\n0\n' },
      { input: '16\n4\nSET 4\nCLEAR 4\nTEST 4\nHEX\n', expectedOutput: '0\n00000000\n' },
    ],
  },

  // 11. Chapter 8: More Pointers (Q 8.3 / Q 8.7 / Q 8.12)
  {
    slug: 'kanetkar-ch8-pointer-to-pointer-swap',
    title: 'Double Pointer Indirection & Handle Swapping',
    difficulty: 'MEDIUM',
    category: 'Pointers',
    tags: ['Pointers', 'Double Pointers', 'Indirection', 'Memory'],
    description: `### Problem Description

In C, passing a single pointer \`char *p\` by value prevents a function from modifying the caller's pointer address. To alter the caller's target address, a pointer-to-pointer (\`char **pp\`) or handle must be passed (Yashavant Kanetkar, *Test Your C Skills*, Chapter 8: More Pointers).

Given two dynamic string handles pointing to distinct memory buffers:
Implement an indirection function \`swapHandles(char **h1, char **h2)\` that exchanges their pointer targets in $O(1)$ pointer operations.

### Input Format
Two space-separated strings $S_1$ and $S_2$ ($1 \\le |S_1|, |S_2| \\le 100$).

### Output Format
Print the swapped strings on a single line separated by a space: \`S2 S1\`.

### Example 1
**Input:**
\`\`\`
Alpha Beta
\`\`\`
**Output:**
\`\`\`
Beta Alpha
\`\`\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

void swapHandles(char **h1, char **h2) {
    // TODO: Swap pointer targets using double pointer indirection
}

int main() {
    char s1[128], s2[128];
    if (scanf("%s %s", s1, s2) != 2) return 0;
    
    char *p1 = s1;
    char *p2 = s2;
    swapHandles(&p1, &p2);
    printf("%s %s\\n", p1, p2);
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

void swapHandles(char **h1, char **h2) {
    char *tmp = *h1;
    *h1 = *h2;
    *h2 = tmp;
}

int main() {
    char s1[128], s2[128];
    if (scanf("%s %s", s1, s2) != 2) return 0;
    
    char *p1 = s1;
    char *p2 = s2;
    swapHandles(&p1, &p2);
    printf("%s %s\\n", p1, p2);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 8,
      chapterTitle: 'More Pointers',
      chapterOrder: 8,
      section: 'Pointers to Pointers',
      exerciseNumber: '8.3',
      exerciseOrder: 3,
      page: 81,
      concept: 'Pointer-to-pointer indirection and caller handle modification',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'Alpha Beta\n', expectedOutput: 'Beta Alpha\n' },
      { input: 'Hello World\n', expectedOutput: 'World Hello\n' },
    ],
    hiddenTests: [
      { input: 'One Two\n', expectedOutput: 'Two One\n' },
      { input: 'X Y\n', expectedOutput: 'Y X\n' },
      { input: 'First Second\n', expectedOutput: 'Second First\n' },
      { input: 'Left Right\n', expectedOutput: 'Right Left\n' },
      { input: 'A B\n', expectedOutput: 'B A\n' },
    ],
  },

  // 12. Chapter 12: File Input/Output (Q 12.1 / Q 12.7)
  {
    slug: 'kanetkar-ch12-fseek-offset-stream',
    title: 'File Stream Position & fseek Offset Simulation',
    difficulty: 'EASY',
    category: 'File Input/Output',
    tags: ['File IO', 'Streams', 'fseek', 'Basics'],
    description: `### Problem Description

In standard C stream I/O (\`<stdio.h>\`), \`fseek(fp, offset, whence)\` positions the file offset pointer relative to \`SEEK_SET\` (0), \`SEEK_CUR\` (current), or \`SEEK_END\` (end of stream) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12: File Input/Output).

Simulate a file stream containing a buffer of length $L$ starting with cursor at position $0$.
Process $Q$ seek operations:
- \`SEEK_SET offset\`: Sets cursor to \`offset\`.
- \`SEEK_CUR offset\`: Shifts cursor by \`offset\`.
- \`SEEK_END offset\`: Sets cursor to \`L + offset\`.

If the resulting cursor is $< 0$ or $> L$, clamp it to the bounds ($0$ or $L$) and output \`CLAMPED <pos>\`. Otherwise output \`OK <pos>\`.

### Input Format
- First line: Total stream length $L$ ($1 \\le L \\le 10^5$) and operation count $Q$ ($1 \\le Q \\le 100$).
- Next $Q$ lines: Commands in format \`<WHENCE> <offset>\`.

### Output Format
For each seek, print \`STATUS <position>\` on a new line.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    long long l;
    int q;
    if (scanf("%lld %d", &l, &q) != 2) return 0;
    
    // TODO: Process stream seek operations
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    long long l;
    int q;
    if (scanf("%lld %d", &l, &q) != 2) return 0;
    
    long long pos = 0;
    for (int i = 0; i < q; i++) {
        char whence[16];
        long long off;
        if (scanf("%s %lld", whence, &off) != 2) break;
        long long target = pos;
        if (strcmp(whence, "SEEK_SET") == 0) {
            target = off;
        } else if (strcmp(whence, "SEEK_CUR") == 0) {
            target = pos + off;
        } else if (strcmp(whence, "SEEK_END") == 0) {
            target = l + off;
        }
        
        if (target < 0) {
            pos = 0;
            printf("CLAMPED 0\\n");
        } else if (target > l) {
            pos = l;
            printf("CLAMPED %lld\\n", l);
        } else {
            pos = target;
            printf("OK %lld\\n", pos);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 12,
      chapterTitle: 'File Input/Output',
      chapterOrder: 12,
      section: 'File Pointers & fseek Semantics',
      exerciseNumber: '12.7',
      exerciseOrder: 7,
      page: 135,
      concept: 'Stream cursor repositioning via SEEK_SET, SEEK_CUR, and SEEK_END',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '100 3\nSEEK_SET 10\nSEEK_CUR 15\nSEEK_END -5\n', expectedOutput: 'OK 10\nOK 25\nOK 95\n' },
      { input: '50 2\nSEEK_CUR -10\nSEEK_SET 60\n', expectedOutput: 'CLAMPED 0\nCLAMPED 50\n' },
    ],
    hiddenTests: [
      { input: '10 1\nSEEK_SET 5\n', expectedOutput: 'OK 5\n' },
      { input: '20 2\nSEEK_END 0\nSEEK_CUR -10\n', expectedOutput: 'OK 20\nOK 10\n' },
      { input: '100 2\nSEEK_END 5\nSEEK_SET -1\n', expectedOutput: 'CLAMPED 100\nCLAMPED 0\n' },
      { input: '500 3\nSEEK_SET 250\nSEEK_CUR -50\nSEEK_CUR 100\n', expectedOutput: 'OK 250\nOK 200\nOK 300\n' },
      { input: '1 2\nSEEK_SET 1\nSEEK_CUR 0\n', expectedOutput: 'OK 1\nOK 1\n' },
    ],
  },

  // 13. Chapter 13: Command Line Arguments (Q 13.1 / Q 13.4)
  {
    slug: 'kanetkar-ch13-argc-argv-parser',
    title: 'Command Line argv Tokenizer & Argc Counter',
    difficulty: 'EASY',
    category: 'Command Line Arguments',
    tags: ['Argv', 'Argc', 'Command Line', 'Basics'],
    description: `### Problem Description

In standard C, \`main(int argc, char *argv[])\` receives arguments as an array of pointers to null-terminated strings, where \`argv[0]\` is the program name and \`argc\` is the count of arguments (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13: Command Line Arguments).

Simulate command-line argument parsing for a command line with $N$ arguments.
Print \`argc\`, each \`argv[i]\` enclosed in double quotes, and the total character length of all arguments combined.

### Input Format
First line: Integer $N$ ($1 \\le N \\le 50$).
Next $N$ lines: One argument per line.

### Output Format
- First line: \`ARGC: <count>\`
- Next $N$ lines: \`ARG[i]: "<val>"\`
- Last line: \`TOTAL_CHARS: <sum>\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Process argv arguments
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    long long totalChars = 0;
    printf("ARGC: %d\\n", n);
    for (int i = 0; i < n; i++) {
        char arg[256];
        if (scanf("%s", arg) != 1) break;
        size_t len = strlen(arg);
        totalChars += len;
        printf("ARG[%d]: \\"%s\\"\\n", i, arg);
    }
    printf("TOTAL_CHARS: %lld\\n", totalChars);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 15,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Command Line Arguments',
      chapterOrder: 13,
      section: 'argc and argv Vector Mechanics',
      exerciseNumber: '13.1',
      exerciseOrder: 1,
      page: 150,
      concept: 'Vector pointer array traversal and argument counting',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\n./program\n--verbose\noutput.txt\n', expectedOutput: 'ARGC: 3\nARG[0]: "./program"\nARG[1]: "--verbose"\nARG[2]: "output.txt"\nTOTAL_CHARS: 28\n' },
      { input: '1\napp\n', expectedOutput: 'ARGC: 1\nARG[0]: "app"\nTOTAL_CHARS: 3\n' },
    ],
    hiddenTests: [
      { input: '2\ncat\nfile\n', expectedOutput: 'ARGC: 2\nARG[0]: "cat"\nARG[1]: "file"\nTOTAL_CHARS: 7\n' },
      { input: '4\na\nb\nc\nd\n', expectedOutput: 'ARGC: 4\nARG[0]: "a"\nARG[1]: "b"\nARG[2]: "c"\nARG[3]: "d"\nTOTAL_CHARS: 4\n' },
      { input: '2\n--help\n-v\n', expectedOutput: 'ARGC: 2\nARG[0]: "--help"\nARG[1]: "-v"\nTOTAL_CHARS: 8\n' },
      { input: '1\nlongargumentstring\n', expectedOutput: 'ARGC: 1\nARG[0]: "longargumentstring"\nTOTAL_CHARS: 18\n' },
      { input: '3\nfirst\nsecond\nthird\n', expectedOutput: 'ARGC: 3\nARG[0]: "first"\nARG[1]: "second"\nARG[2]: "third"\nTOTAL_CHARS: 16\n' },
    ],
  },

  // 14. Chapter 15: Typecasting (Q 15.1 / Q 15.3)
  {
    slug: 'kanetkar-ch15-typecast-promotion-eval',
    title: 'Implicit Arithmetic Conversion & Cast Precision',
    difficulty: 'EASY',
    category: 'Typecasting',
    tags: ['Typecasting', 'Conversions', 'Arithmetic', 'Basics'],
    description: `### Problem Description

In C, binary arithmetic operators perform usual arithmetic conversions: integral promotions convert small types (\`char\`, \`short\`) to \`int\`, and mixed signed/unsigned comparisons can lead to counterintuitive conversions (Yashavant Kanetkar, *Test Your C Skills*, Chapter 15: Typecasting).

Given an integer numerator $A$ and denominator $B$:
1. Compute integer division: $A / B$
2. Compute floating-point division using explicit cast \`(double)A / B\` formatted to 4 decimal places.
3. Compute the unsigned comparison result of $A$ and $B$: \`((unsigned int)A < (unsigned int)B)\` (print \`LESS\` or \`GREATER_EQUAL\`).

### Input Format
Two space-separated integers $A$ and $B$ ($-10^4 \\le A, B \\le 10^4$, $B \\ne 0$).

### Output Format
- Line 1: \`INT: <val>\`
- Line 2: \`FLOAT: <val>\` (formatted with \`%.4f\`)
- Line 3: \`UNSIGNED_CMP: <result>\`

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    
    // TODO: Perform integer and cast operations
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    
    int intDiv = a / b;
    double floatDiv = (double)a / b;
    unsigned int ua = (unsigned int)a;
    unsigned int ub = (unsigned int)b;
    
    printf("INT: %d\\n", intDiv);
    printf("FLOAT: %.4f\\n", floatDiv);
    printf("UNSIGNED_CMP: %s\\n", (ua < ub) ? "LESS" : "GREATER_EQUAL");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 15,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 15,
      chapterTitle: 'Typecasting',
      chapterOrder: 15,
      section: 'Implicit and Explicit Conversions',
      exerciseNumber: '15.3',
      exerciseOrder: 3,
      page: 175,
      concept: 'Usual arithmetic conversions and signed vs unsigned comparison traps',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '7 2\n', expectedOutput: 'INT: 3\nFLOAT: 3.5000\nUNSIGNED_CMP: LESS\n' },
      { input: '-1 1\n', expectedOutput: 'INT: -1\nFLOAT: -1.0000\nUNSIGNED_CMP: GREATER_EQUAL\n' },
    ],
    hiddenTests: [
      { input: '10 3\n', expectedOutput: 'INT: 3\nFLOAT: 3.3333\nUNSIGNED_CMP: LESS\n' },
      { input: '1 2\n', expectedOutput: 'INT: 0\nFLOAT: 0.5000\nUNSIGNED_CMP: LESS\n' },
      { input: '5 5\n', expectedOutput: 'INT: 1\nFLOAT: 1.0000\nUNSIGNED_CMP: GREATER_EQUAL\n' },
      { input: '-5 -2\n', expectedOutput: 'INT: 2\nFLOAT: 2.5000\nUNSIGNED_CMP: LESS\n' },
      { input: '100 4\n', expectedOutput: 'INT: 25\nFLOAT: 25.0000\nUNSIGNED_CMP: GREATER_EQUAL\n' },
    ],
  },

  // 15. Chapter 16: Miscellany (Q 16.2 / Q 16.5)
  {
    slug: 'kanetkar-ch16-typedef-storage-class',
    title: 'Storage Classes & Static Local Lifetime Simulator',
    difficulty: 'EASY',
    category: 'Miscellany',
    tags: ['Storage Class', 'Static', 'Scope', 'Basics'],
    description: `### Problem Description

In C, the \`static\` storage class specifier on local function variables extends their lifetime to the entire execution duration of the program while maintaining block scope visibility (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16: Miscellany).

Given an initial counter base $B$:
Simulate $K$ consecutive function calls where:
- Automatic variable starts fresh at $0$ each call and is incremented by $X_i$.
- Static accumulator variable preserves its value across calls and accumulates $X_i$.

Print \`AUTO: <auto_val> STATIC: <static_val>\` for each call.

### Input Format
First line: Integer $K$ ($1 \\le K \\le 100$).
Second line: $K$ space-separated integers $X_1, X_2, \\dots, X_K$.

### Output Format
Print the status after each of the $K$ invocations.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    // TODO: Simulate automatic vs static storage lifetimes
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    long long staticAcc = 0;
    for (int i = 0; i < k; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) break;
        long long autoVal = x;
        staticAcc += x;
        printf("AUTO: %lld STATIC: %lld\\n", autoVal, staticAcc);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 15,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 16,
      chapterTitle: 'Miscellany',
      chapterOrder: 16,
      section: 'Storage Classes & Duration',
      exerciseNumber: '16.2',
      exerciseOrder: 2,
      page: 185,
      concept: 'Static storage duration vs automatic stack frame allocation',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\n5 10 15\n', expectedOutput: 'AUTO: 5 STATIC: 5\nAUTO: 10 STATIC: 15\nAUTO: 15 STATIC: 30\n' },
      { input: '2\n1 -1\n', expectedOutput: 'AUTO: 1 STATIC: 1\nAUTO: -1 STATIC: 0\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: 'AUTO: 42 STATIC: 42\n' },
      { input: '4\n1 1 1 1\n', expectedOutput: 'AUTO: 1 STATIC: 1\nAUTO: 1 STATIC: 2\nAUTO: 1 STATIC: 3\nAUTO: 1 STATIC: 4\n' },
      { input: '3\n0 0 0\n', expectedOutput: 'AUTO: 0 STATIC: 0\nAUTO: 0 STATIC: 0\nAUTO: 0 STATIC: 0\n' },
      { input: '2\n100 -50\n', expectedOutput: 'AUTO: 100 STATIC: 100\nAUTO: -50 STATIC: 50\n' },
      { input: '5\n2 4 6 8 10\n', expectedOutput: 'AUTO: 2 STATIC: 2\nAUTO: 4 STATIC: 6\nAUTO: 6 STATIC: 12\nAUTO: 8 STATIC: 20\nAUTO: 10 STATIC: 30\n' },
    ],
  },

  // 16. Chapter 17: C Under DOS (Q 17.1 / Q 17.6)
  {
    slug: 'kanetkar-ch17-segmented-memory-addressing',
    title: '16-bit Real Mode Segment:Offset Address Translator',
    difficulty: 'EASY',
    category: 'C Under Systems',
    tags: ['Segmented Memory', 'Real Mode', 'Address Calculation', 'Basics'],
    description: `### Problem Description

In x86 16-bit real mode memory architecture, a 20-bit physical address is formed from a 16-bit segment and 16-bit offset: \`Physical = (Segment << 4) + Offset\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17: C Under DOS).

Given $Q$ queries of Segment and Offset pairs in hexadecimal format:
Compute and output the 20-bit absolute physical address in 5-digit uppercase hexadecimal.

### Input Format
First line: Integer $Q$ ($1 \\le Q \\le 100$).
Next $Q$ lines: Two space-separated hexadecimal numbers: \`Segment Offset\`.

### Output Format
For each query, print \`PHYSICAL: 0x<HEX5>\`.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Compute real mode physical addresses
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    for (int i = 0; i < q; i++) {
        unsigned int seg, off;
        if (scanf("%x %x", &seg, &off) != 2) break;
        unsigned int phys = (seg << 4) + off;
        printf("PHYSICAL: 0x%05X\\n", phys & 0xFFFFF);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 15,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'C Under DOS',
      chapterOrder: 17,
      section: 'Segment:Offset Addressing Mechanics',
      exerciseNumber: '17.6',
      exerciseOrder: 6,
      page: 198,
      concept: 'Real mode physical memory address calculation from segment and offset',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\nB800 0000\n0000 7C00\n', expectedOutput: 'PHYSICAL: 0xB8000\nPHYSICAL: 0x07C00\n' },
      { input: '1\nFFFF 0010\n', expectedOutput: 'PHYSICAL: 0x00000\n' },
    ],
    hiddenTests: [
      { input: '1\n1000 0000\n', expectedOutput: 'PHYSICAL: 0x10000\n' },
      { input: '2\n0040 0000\n0040 0010\n', expectedOutput: 'PHYSICAL: 0x00400\nPHYSICAL: 0x00410\n' },
      { input: '1\n2000 1234\n', expectedOutput: 'PHYSICAL: 0x21234\n' },
      { input: '2\n0000 0000\nFFFF FFFF\n', expectedOutput: 'PHYSICAL: 0x00000\nPHYSICAL: 0x0FFEF\n' },
      { input: '1\nA000 0100\n', expectedOutput: 'PHYSICAL: 0xA0100\n' },
    ],
  },

  // 17. Chapter 18: Graphics (Q 18.1 / Q 18.5)
  {
    slug: 'kanetkar-ch18-bresenham-line-raster',
    title: 'Bresenham Integer Line Rasterization Algorithm',
    difficulty: 'MEDIUM',
    category: 'Graphics',
    tags: ['Graphics', 'Bresenham', 'Algorithms', 'Grid'],
    description: `### Problem Description

In computer graphics C libraries, Bresenham's line algorithm draws straight lines between two integer grid coordinates $(X_0, Y_0)$ and $(X_1, Y_1)$ using purely integer additions, subtractions, and bit shifts, avoiding slow floating-point arithmetic (Yashavant Kanetkar, *Test Your C Skills*, Chapter 18: Graphics).

Given two points $(X_0, Y_0)$ and $(X_1, Y_1)$ where $X_0 \\le X_1$ and slope $0 \\le \\frac{Y_1 - Y_0}{X_1 - X_0} \\le 1$:
Implement Bresenham's algorithm and print each traversed integer pixel coordinate $(X, Y)$ along the raster line.

### Input Format
Four space-separated integers: $X_0, Y_0, X_1, Y_1$ ($0 \\le X_0 \\le X_1 \\le 100$, $0 \\le Y_0 \\le Y_1 \\le 100$).

### Output Format
Print each visited pixel on a separate line in format \`PIXEL: (x, y)\`.

### Constraints
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
    starterCode: `#include <stdio.h>

int main() {
    int x0, y0, x1, y1;
    if (scanf("%d %d %d %d", &x0, &y0, &x1, &y1) != 4) return 0;
    
    // TODO: Bresenham line algorithm
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int x0, y0, x1, y1;
    if (scanf("%d %d %d %d", &x0, &y0, &x1, &y1) != 4) return 0;
    
    int dx = x1 - x0;
    int dy = y1 - y0;
    int p = 2 * dy - dx;
    int x = x0;
    int y = y0;
    
    while (x <= x1) {
        printf("PIXEL: (%d, %d)\\n", x, y);
        x++;
        if (p < 0) {
            p += 2 * dy;
        } else {
            y++;
            p += 2 * (dy - dx);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'test-your-c-skills-kanetkar-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 18,
      chapterTitle: 'Graphics',
      chapterOrder: 18,
      section: 'Rasterization & Drawing Algorithms',
      exerciseNumber: '18.5',
      exerciseOrder: 5,
      page: 215,
      concept: 'Bresenham integer line drawing algorithm using decision variables',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '0 0 4 2\n', expectedOutput: 'PIXEL: (0, 0)\nPIXEL: (1, 0)\nPIXEL: (2, 1)\nPIXEL: (3, 1)\nPIXEL: (4, 2)\n' },
      { input: '2 3 5 3\n', expectedOutput: 'PIXEL: (2, 3)\nPIXEL: (3, 3)\nPIXEL: (4, 3)\nPIXEL: (5, 3)\n' },
    ],
    hiddenTests: [
      { input: '1 1 1 1\n', expectedOutput: 'PIXEL: (1, 1)\n' },
      { input: '0 0 3 3\n', expectedOutput: 'PIXEL: (0, 0)\nPIXEL: (1, 1)\nPIXEL: (2, 2)\nPIXEL: (3, 3)\n' },
      { input: '10 10 14 11\n', expectedOutput: 'PIXEL: (10, 10)\nPIXEL: (11, 10)\nPIXEL: (12, 10)\nPIXEL: (13, 11)\nPIXEL: (14, 11)\n' },
      { input: '5 5 10 7\n', expectedOutput: 'PIXEL: (5, 5)\nPIXEL: (6, 5)\nPIXEL: (7, 6)\nPIXEL: (8, 6)\nPIXEL: (9, 7)\nPIXEL: (10, 7)\n' },
      { input: '0 0 6 2\n', expectedOutput: 'PIXEL: (0, 0)\nPIXEL: (1, 0)\nPIXEL: (2, 1)\nPIXEL: (3, 1)\nPIXEL: (4, 1)\nPIXEL: (5, 2)\nPIXEL: (6, 2)\n' },
    ],
  },
];
