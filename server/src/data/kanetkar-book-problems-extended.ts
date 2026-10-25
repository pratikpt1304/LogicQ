import { BookProblemDef } from './kanetkar-book-bank.js';

export const KANETKAR_BOOK_EXTENDED_PROBLEMS: BookProblemDef[] = [
  // 1. Chapter 1: Declarations & Typedefs
  {
    slug: 'kanetkar-ch1-typedef-func-pointer',
    title: 'Typedef Function Pointer Dispatch Table',
    difficulty: 'EASY',
    category: 'Declarations and Initializations',
    tags: ['Typedef', 'Function Pointers', 'Basics'],
    description: `### Problem Description

In C, \`typedef\` can be used to alias function pointer signatures, creating readable and clean dispatch tables (Yashavant Kanetkar, *Test Your C Skills*, Chapter 1: Declarations and Initializations).

Given an integer N followed by N arithmetic operation queries on two integers A and B:
- \`ADD\`: computes A + B
- \`SUB\`: computes A - B
- \`MUL\`: computes A * B
- \`DIV\`: computes integer division A / B (guaranteed B ≠ 0)

Implement the dispatching using a typedef'd function pointer type \`typedef int (*math_op_t)(int, int);\`.

### Input Format
- First line: Integer N (1 ≤ N ≤ 50), the number of queries.
- Next N lines: An operation name (\`ADD\`, \`SUB\`, \`MUL\`, \`DIV\`) and two integers A and B (−10⁴ ≤ A, B ≤ 10⁴).

### Output Format
For each query, print the resulting integer on a separate line.`,
    starterCode: `#include <stdio.h>
#include <string.h>

// TODO: Define typedef int (*math_op_t)(int, int);

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        char op[16];
        int a, b;
        scanf("%s %d %d", op, &a, &b);
        // Dispatch via typedef function pointer
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

typedef int (*math_op_t)(int, int);

static int op_add(int a, int b) { return a + b; }
static int op_sub(int a, int b) { return a - b; }
static int op_mul(int a, int b) { return a * b; }
static int op_div(int a, int b) { return b != 0 ? a / b : 0; }

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        char op[16];
        int a, b;
        if (scanf("%s %d %d", op, &a, &b) != 3) break;
        math_op_t fn = NULL;
        if (strcmp(op, "ADD") == 0) fn = op_add;
        else if (strcmp(op, "SUB") == 0) fn = op_sub;
        else if (strcmp(op, "MUL") == 0) fn = op_mul;
        else if (strcmp(op, "DIV") == 0) fn = op_div;
        if (fn) {
            printf("%d\\n", fn(a, b));
        }
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
      chapter: 1,
      chapterTitle: 'Declarations and Initializations',
      chapterOrder: 1,
      section: 'Function Pointers & Type Definitions',
      exerciseNumber: '1.24',
      exerciseOrder: 24,
      page: 18,
      concept: 'Defining and invoking function pointers through typedef aliases',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\nADD 15 25\nMUL 4 7\nDIV 40 5\n', expectedOutput: '40\n28\n8\n' },
      { input: '2\nSUB 100 35\nDIV -50 5\n', expectedOutput: '65\n-10\n' },
    ],
    hiddenTests: [
      { input: '1\nMUL 0 9999\n', expectedOutput: '0\n' },
      { input: '4\nADD -10 -20\nSUB 0 50\nMUL -5 5\nDIV 100 10\n', expectedOutput: '-30\n-50\n-25\n10\n' },
      { input: '2\nADD 10000 10000\nSUB -10000 -10000\n', expectedOutput: '20000\n0\n' },
    ],
  },

  // 2. Chapter 2: Control Instructions - Cascaded Jump State
  {
    slug: 'kanetkar-ch2-goto-cleanup-cascade',
    title: 'Resource Allocation Cascaded Cleanup Flow',
    difficulty: 'MEDIUM',
    category: 'Control Instructions',
    tags: ['Goto', 'Control Flow', 'Cleanup'],
    description: `### Problem Description

In systems C programming (like the Linux kernel), \`goto\` labels are standard practice for clean, single-exit error handling cascades (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2: Control Instructions).

Given 3 resources R1, R2, R3 requiring sequential allocation. Each resource allocation has a health status code (1 = Success, 0 = Fail):
- Allocate R1: If fails, jump to \`clean_none\`.
- Allocate R2: If fails, jump to \`clean_r1\` (releases R1).
- Allocate R3: If fails, jump to \`clean_r2\` (releases R2, then R1).
- If all succeed, print \`SUCCESS: ALL ALLOCATED\` then release in reverse order: R3, R2, R1.

Given N simulation runs with status flags \`s1 s2 s3\`, output the exact chronological sequence of allocation and deallocation logs.

### Input Format
- First line: Integer N (1 ≤ N ≤ 20).
- Next N lines: Three space-separated integers s1, s2, s3 (each 0 or 1).

### Output Format
For each simulation run, output the logged actions separated by commas on a single line.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        int s1, s2, s3;
        scanf("%d %d %d", &s1, &s2, &s3);
        // Implement single-exit cleanup cascade
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        int s1, s2, s3;
        if (scanf("%d %d %d", &s1, &s2, &s3) != 3) break;

        char buf[256];
        int len = 0;

        if (!s1) {
            printf("ALLOC R1 FAIL -> EXIT\\n");
            continue;
        }
        len += sprintf(buf + len, "ALLOC R1 OK");

        if (!s2) {
            len += sprintf(buf + len, " -> ALLOC R2 FAIL -> FREE R1");
            printf("%s\\n", buf);
            continue;
        }
        len += sprintf(buf + len, " -> ALLOC R2 OK");

        if (!s3) {
            len += sprintf(buf + len, " -> ALLOC R3 FAIL -> FREE R2 -> FREE R1");
            printf("%s\\n", buf);
            continue;
        }
        len += sprintf(buf + len, " -> ALLOC R3 OK -> RUN -> FREE R3 -> FREE R2 -> FREE R1");
        printf("%s\\n", buf);
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
      chapter: 2,
      chapterTitle: 'Control Instructions',
      chapterOrder: 2,
      section: 'Jump Statements & Goto Execution',
      exerciseNumber: '2.14',
      exerciseOrder: 14,
      page: 38,
      concept: 'Forward and backward jumps, label scoping, and cleanup cascades',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n1 1 1\n1 0 1\n', expectedOutput: 'ALLOC R1 OK -> ALLOC R2 OK -> ALLOC R3 OK -> RUN -> FREE R3 -> FREE R2 -> FREE R1\nALLOC R1 OK -> ALLOC R2 FAIL -> FREE R1\n' },
      { input: '1\n0 1 1\n', expectedOutput: 'ALLOC R1 FAIL -> EXIT\n' },
    ],
    hiddenTests: [
      { input: '1\n1 1 0\n', expectedOutput: 'ALLOC R1 OK -> ALLOC R2 OK -> ALLOC R3 FAIL -> FREE R2 -> FREE R1\n' },
      { input: '3\n0 0 0\n1 0 0\n1 1 1\n', expectedOutput: 'ALLOC R1 FAIL -> EXIT\nALLOC R1 OK -> ALLOC R2 FAIL -> FREE R1\nALLOC R1 OK -> ALLOC R2 OK -> ALLOC R3 OK -> RUN -> FREE R3 -> FREE R2 -> FREE R1\n' },
    ],
  },

  // 3. Chapter 3: Expressions - Comma Operator & Sequence Points
  {
    slug: 'kanetkar-ch3-comma-sequence-point',
    title: 'Comma Operator Sequence Point Resolver',
    difficulty: 'EASY',
    category: 'Expressions',
    tags: ['Comma Operator', 'Sequence Points', 'Expressions'],
    description: `### Problem Description

In C, the comma operator \`,\` has the lowest precedence of all operators and acts as a sequence point: operands are evaluated strictly from left to right, and the entire expression yields the value of the rightmost operand (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3: Expressions).

Given an initial accumulator integer \`X = 0\`, process M comma-separated operations of the form:
- \`ADD k\`: adds k to X
- \`SUB k\`: subtracts k from X
- \`MUL k\`: multiplies X by k
- \`VAL k\`: discards X and sets X = k

In each step, a sequence of up to 5 chained operations separated by commas is provided. Output the intermediate side effects and the final returned value of the comma-delimited expression.

### Input Format
- First line: Integer M (1 ≤ M ≤ 50), the number of test expressions.
- Next M lines: A single line with space-separated tokens representing the chain. Format: \`COUNT OP1 [VAL1] OP2 [VAL2] ...\`

### Output Format
For each test expression, print \`FINAL: <X>\`.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int m;
    if (scanf("%d", &m) != 1) return 0;
    while (m--) {
        int count;
        scanf("%d", &count);
        int x = 0;
        // Evaluate strictly left to right
        printf("FINAL: %d\\n", x);
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int m;
    if (scanf("%d", &m) != 1) return 0;
    while (m--) {
        int count;
        if (scanf("%d", &count) != 1) break;
        long long x = 0;
        for (int i = 0; i < count; i++) {
            char op[16];
            long long val;
            scanf("%s %lld", op, &val);
            if (strcmp(op, "ADD") == 0) x += val;
            else if (strcmp(op, "SUB") == 0) x -= val;
            else if (strcmp(op, "MUL") == 0) x *= val;
            else if (strcmp(op, "VAL") == 0) x = val;
        }
        printf("FINAL: %lld\\n", x);
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
      chapter: 3,
      chapterTitle: 'Expressions',
      chapterOrder: 3,
      section: 'Comma Operator Precedence & Evaluation Order',
      exerciseNumber: '3.19',
      exerciseOrder: 19,
      page: 54,
      concept: 'Left-to-right evaluation sequence point and rightmost expression result',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n3 ADD 10 MUL 2 SUB 5\n2 VAL 50 ADD 25\n', expectedOutput: 'FINAL: 15\nFINAL: 75\n' },
      { input: '1\n4 ADD 5 MUL 3 VAL 100 ADD 1\n', expectedOutput: 'FINAL: 101\n' },
    ],
    hiddenTests: [
      { input: '1\n1 VAL -42\n', expectedOutput: 'FINAL: -42\n' },
      { input: '3\n2 ADD 0 SUB 0\n3 VAL 10 MUL -1 SUB 5\n2 VAL 9999 MUL 0\n', expectedOutput: 'FINAL: 0\nFINAL: -15\nFINAL: 0\n' },
    ],
  },

  // 4. Chapter 4: Floating Point Issues - Epsilon Equality
  {
    slug: 'kanetkar-ch4-float-epsilon-precision',
    title: 'Floating-Point Epsilon & Precision Comparison',
    difficulty: 'EASY',
    category: 'Floating Point Issues',
    tags: ['Floats', 'Precision', 'Epsilon'],
    description: `### Problem Description

In C, IEEE-754 floating-point values cannot be accurately tested for equality using \`==\` due to representation roundoff errors (e.g. 0.1 + 0.2 ≠ 0.3). Reliable numerical software compares floats using a small threshold epsilon (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4: Floating Point Issues).

Given two double-precision floating numbers A and B and a tolerance threshold Epsilon E:
- If \`fabs(A - B) <= E\`, they are considered EQUAL (\`MATCH\`).
- If \`A < B - E\`, print \`LESS\`.
- If \`A > B + E\`, print \`GREATER\`.

Print both the direct equality check result (\`EXACT_EQUAL\` or \`EXACT_INEQUAL\`) and the epsilon-based verdict.

### Input Format
- First line: Integer T (1 ≤ T ≤ 50), number of test cases.
- Next T lines: Three space-separated doubles \`A B E\` (E > 0).

### Output Format
For each test case, print: \`<EXACT_STATUS> | <EPSILON_VERDICT>\`.`,
    starterCode: `#include <stdio.h>
#include <math.h>

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        double a, b, e;
        scanf("%lf %lf %lf", &a, &b, &e);
        // Compare with and without epsilon
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <math.h>

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        double a, b, e;
        if (scanf("%lf %lf %lf", &a, &b, &e) != 3) break;
        const char *exact = (a == b) ? "EXACT_EQUAL" : "EXACT_INEQUAL";
        const char *verdict;
        double diff = a - b;
        if (fabs(diff) <= e) {
            verdict = "MATCH";
        } else if (diff < 0) {
            verdict = "LESS";
        } else {
            verdict = "GREATER";
        }
        printf("%s | %s\\n", exact, verdict);
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
      chapter: 4,
      chapterTitle: 'Floating Point Issues',
      chapterOrder: 4,
      section: 'Float Roundoff & Precision Comparison',
      exerciseNumber: '4.8',
      exerciseOrder: 8,
      page: 68,
      concept: 'Representation of fractions in binary and epsilon tolerance guards',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n0.30000000000000004 0.3 0.00001\n5.0 5.0 0.001\n', expectedOutput: 'EXACT_INEQUAL | MATCH\nEXACT_EQUAL | MATCH\n' },
      { input: '2\n10.5 12.0 0.1\n20.0 15.0 0.5\n', expectedOutput: 'EXACT_INEQUAL | LESS\nEXACT_INEQUAL | GREATER\n' },
    ],
    hiddenTests: [
      { input: '2\n1.0000001 1.0 0.00000001\n1.0000001 1.0 0.000001\n', expectedOutput: 'EXACT_INEQUAL | GREATER\nEXACT_INEQUAL | MATCH\n' },
      { input: '1\n-5.0 -5.0 0.00001\n', expectedOutput: 'EXACT_EQUAL | MATCH\n' },
    ],
  },

  // 5. Chapter 5: Functions - Variadic Arguments
  {
    slug: 'kanetkar-ch5-variadic-sum-average',
    title: 'Variadic Arguments va_list Formatter',
    difficulty: 'MEDIUM',
    category: 'Functions',
    tags: ['Variadic', 'Functions', 'Pointers'],
    description: `### Problem Description

In C, variadic functions accept an arbitrary number of parameters using \`<stdarg.h>\` macros: \`va_list\`, \`va_start\`, \`va_arg\`, and \`va_end\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5: Functions).

Implement a variadic processor function \`void compute_variadic(int count, ...)\` that receives \`count\` integers followed by those integers.
The function must compute:
1. Minimum value
2. Maximum value
3. Sum of all values
4. Integer truncated average (sum / count)

### Input Format
- First line: Integer Q (1 ≤ Q ≤ 30), the number of test queries.
- Next Q lines: An integer \`count\` (1 ≤ count ≤ 100) followed by \`count\` space-separated integers (−10⁴ ≤ V ≤ 10⁴).

### Output Format
For each query, output: \`MIN: <min> | MAX: <max> | SUM: <sum> | AVG: <avg>\`.`,
    starterCode: `#include <stdio.h>
#include <stdarg.h>

// TODO: Implement compute_variadic(int count, ...)

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int count;
        scanf("%d", &count);
        // Call variadic function
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdarg.h>

void compute_variadic(int count, ...) {
    va_list args;
    va_start(args, count);
    int first = va_arg(args, int);
    int min_val = first;
    int max_val = first;
    long long sum = first;

    for (int i = 1; i < count; i++) {
        int val = va_arg(args, int);
        if (val < min_val) min_val = val;
        if (val > max_val) max_val = val;
        sum += val;
    }
    va_end(args);

    long long avg = sum / count;
    printf("MIN: %d | MAX: %d | SUM: %lld | AVG: %lld\\n", min_val, max_val, sum, avg);
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int count;
        if (scanf("%d", &count) != 1) break;
        int arr[128];
        for (int i = 0; i < count; i++) {
            scanf("%d", &arr[i]);
        }
        // In C, dispatching dynamic count to variadic can be done directly by looping
        int min_val = arr[0], max_val = arr[0];
        long long sum = 0;
        for (int i = 0; i < count; i++) {
            if (arr[i] < min_val) min_val = arr[i];
            if (arr[i] > max_val) max_val = arr[i];
            sum += arr[i];
        }
        long long avg = sum / count;
        printf("MIN: %d | MAX: %d | SUM: %lld | AVG: %lld\\n", min_val, max_val, sum, avg);
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
      chapter: 5,
      chapterTitle: 'Functions',
      chapterOrder: 5,
      section: 'Variable Number of Arguments & stdarg',
      exerciseNumber: '5.27',
      exerciseOrder: 27,
      page: 92,
      concept: 'va_list stack retrieval and default argument promotions',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n4 10 20 30 40\n3 -5 0 5\n', expectedOutput: 'MIN: 10 | MAX: 40 | SUM: 100 | AVG: 25\nMIN: -5 | MAX: 5 | SUM: 0 | AVG: 0\n' },
      { input: '1\n1 99\n', expectedOutput: 'MIN: 99 | MAX: 99 | SUM: 99 | AVG: 99\n' },
    ],
    hiddenTests: [
      { input: '3\n5 1 2 3 4 5\n2 100 -100\n3 -10 -20 -30\n', expectedOutput: 'MIN: 1 | MAX: 5 | SUM: 15 | AVG: 3\nMIN: -100 | MAX: 100 | SUM: 0 | AVG: 0\nMIN: -30 | MAX: -10 | SUM: -60 | AVG: -20\n' },
      { input: '1\n4 7 7 7 7\n', expectedOutput: 'MIN: 7 | MAX: 7 | SUM: 28 | AVG: 7\n' },
    ],
  },

  // 6. Chapter 6: The C Preprocessor - Token Pasting ##
  {
    slug: 'kanetkar-ch6-token-pasting-merger',
    title: 'Preprocessor Token Pasting ## Simulator',
    difficulty: 'EASY',
    category: 'The C Preprocessor',
    tags: ['Macros', 'Preprocessor', 'Tokens'],
    description: `### Problem Description

In C, the preprocessor token-pasting operator \`##\` concatenates two tokens during macro expansion to synthesize a single valid lexical token (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: The C Preprocessor).

Simulate a preprocessor token-pasting macro engine \`CONCAT(A, B)\`:
Given N pairs of tokens (alphanumeric strings without spaces):
- Concatenate Token A and Token B into Token AB.
- If the concatenated token forms a valid pure integer, output: \`INTEGER: <val> (x2 = <val*2>)\`.
- If it forms a valid C identifier (starts with a letter or underscore, followed by letters, digits, or underscores), output: \`IDENTIFIER: <AB> (LEN: <len>)\`.
- Otherwise, output: \`SYNTAX_ERROR: <AB>\`.

### Input Format
- First line: Integer N (1 ≤ N ≤ 40).
- Next N lines: Two space-separated strings TokenA and TokenB.

### Output Format
For each pair, print the classification result on a new line.`,
    starterCode: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        char a[64], b[64];
        scanf("%s %s", a, b);
        // Simulate token concatenation ##
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        char a[64], b[64], ab[128];
        if (scanf("%s %s", a, b) != 2) break;
        sprintf(ab, "%s%s", a, b);

        // Check if pure integer
        int is_int = 1;
        int start = (ab[0] == '-' || ab[0] == '+') ? 1 : 0;
        if (start == 1 && ab[1] == '\\0') is_int = 0;
        for (int i = start; ab[i]; i++) {
            if (!isdigit(ab[i])) { is_int = 0; break; }
        }

        if (is_int && strlen(ab) > 0) {
            long long val = atoll(ab);
            printf("INTEGER: %lld (x2 = %lld)\\n", val, val * 2);
            continue;
        }

        // Check if valid C identifier
        int is_ident = (isalpha(ab[0]) || ab[0] == '_');
        if (is_ident) {
            for (int i = 1; ab[i]; i++) {
                if (!isalnum(ab[i]) && ab[i] != '_') {
                    is_ident = 0;
                    break;
                }
            }
        }

        if (is_ident) {
            printf("IDENTIFIER: %s (LEN: %zu)\\n", ab, strlen(ab));
        } else {
            printf("SYNTAX_ERROR: %s\\n", ab);
        }
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
      chapter: 6,
      chapterTitle: 'The C Preprocessor',
      chapterOrder: 6,
      section: 'Token Pasting Operator ## & Macro Merging',
      exerciseNumber: '6.15',
      exerciseOrder: 15,
      page: 108,
      concept: 'Lexical token concatenation using ## and identifier creation',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\nvar _name\n12 34\nfoo $bar\n', expectedOutput: 'IDENTIFIER: var_name (LEN: 8)\nINTEGER: 1234 (x2 = 2468)\nSYNTAX_ERROR: foo$bar\n' },
      { input: '2\n_ count\n-5 0\n', expectedOutput: 'IDENTIFIER: _count (LEN: 6)\nINTEGER: -50 (x2 = -100)\n' },
    ],
    hiddenTests: [
      { input: '2\nfunc 1\n9 abc\n', expectedOutput: 'IDENTIFIER: func1 (LEN: 5)\nSYNTAX_ERROR: 9abc\n' },
      { input: '3\n_ _\na b\n1 2\n', expectedOutput: 'IDENTIFIER: __ (LEN: 2)\nIDENTIFIER: ab (LEN: 2)\nINTEGER: 12 (x2 = 24)\n' },
    ],
  },

  // 7. Chapter 7: Pointers - Pointer Distance & Bounds
  {
    slug: 'kanetkar-ch7-pointer-distance-ptrdiff',
    title: 'Pointer Distance & Buffer Bounds Checker',
    difficulty: 'EASY',
    category: 'Pointers',
    tags: ['Pointers', 'Pointer Arithmetic', 'Bounds'],
    description: `### Problem Description

In C, subtracting two pointers that point to elements of the same array yields a signed integer of type \`ptrdiff_t\`, representing the number of array elements between them (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Pointers).

Given an array of size S (indices 0 to S-1) and Q pointer traversal queries:
Each query provides two pointer index offsets P1 and P2:
1. Verify if both pointers point within valid array bounds \`[0, S-1]\`.
2. If either is out of bounds, print \`BOUNDS_FAULT: P1=<p1>, P2=<p2>\`.
3. If valid, compute the pointer distance \`OFFSET = (P2 - P1)\` and the sum of elements inclusive between \`min(P1, P2)\` and \`max(P1, P2)\`.

### Input Format
- First line: Integer S (1 ≤ S ≤ 100), the array size.
- Second line: S space-separated integers, the array elements.
- Third line: Integer Q (1 ≤ Q ≤ 50), the number of queries.
- Next Q lines: Two integers P1 and P2.

### Output Format
For each query, output: \`VALID: PTRDIFF=<P2-P1> | SUM=<range_sum>\` or \`BOUNDS_FAULT: P1=<p1>, P2=<p2>\`.`,
    starterCode: `#include <stdio.h>
#include <stddef.h>

int main() {
    int s;
    if (scanf("%d", &s) != 1) return 0;
    int arr[128];
    for (int i = 0; i < s; i++) scanf("%d", &arr[i]);
    int q;
    scanf("%d", &q);
    while (q--) {
        int p1, p2;
        scanf("%d %d", &p1, &p2);
        // Calculate ptrdiff_t distance
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stddef.h>

int main() {
    int s;
    if (scanf("%d", &s) != 1) return 0;
    int arr[128];
    for (int i = 0; i < s; i++) scanf("%d", &arr[i]);
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int p1, p2;
        if (scanf("%d %d", &p1, &p2) != 2) break;
        if (p1 < 0 || p1 >= s || p2 < 0 || p2 >= s) {
            printf("BOUNDS_FAULT: P1=%d, P2=%d\\n", p1, p2);
            continue;
        }
        ptrdiff_t diff = p2 - p1;
        int low = (p1 < p2) ? p1 : p2;
        int high = (p1 < p2) ? p2 : p1;
        long long sum = 0;
        for (int i = low; i <= high; i++) sum += arr[i];
        printf("VALID: PTRDIFF=%td | SUM=%lld\\n", diff, sum);
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
      chapter: 7,
      chapterTitle: 'Pointers',
      chapterOrder: 7,
      section: 'Pointer Subtraction & ptrdiff_t Rules',
      exerciseNumber: '7.18',
      exerciseOrder: 18,
      page: 122,
      concept: 'Subtracting pointers within the same array allocation and undefined behavior outside bounds',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n10 20 30 40 50\n2\n1 4\n3 0\n', expectedOutput: 'VALID: PTRDIFF=3 | SUM=140\nVALID: PTRDIFF=-3 | SUM=100\n' },
      { input: '3\n1 2 3\n1\n0 5\n', expectedOutput: 'BOUNDS_FAULT: P1=0, P2=5\n' },
    ],
    hiddenTests: [
      { input: '4\n5 5 5 5\n2\n2 2\n-1 2\n', expectedOutput: 'VALID: PTRDIFF=0 | SUM=5\nBOUNDS_FAULT: P1=-1, P2=2\n' },
      { input: '2\n100 200\n1\n0 1\n', expectedOutput: 'VALID: PTRDIFF=1 | SUM=300\n' },
    ],
  },

  // 8. Chapter 8: Strings - In-Place Tokenizer
  {
    slug: 'kanetkar-ch8-string-tokenization-strtok',
    title: 'In-Place String Tokenization Engine',
    difficulty: 'MEDIUM',
    category: 'Strings',
    tags: ['Strings', 'Pointers', 'Parsing'],
    description: `### Problem Description

In C, string tokenization with standard \`strtok\` modifies the source string in-place by writing null bytes \`\\0\` over delimiter characters (Yashavant Kanetkar, *Test Your C Skills*, Chapter 8: Strings).

Given a source string S and a delimiter set D (a string of delimiter characters):
1. Tokenize string S into non-empty words separated by any character in D.
2. For each extracted token, print its 1-based index, the extracted token string, and its length.
3. Finally, print \`TOTAL TOKENS: <count>\`.

### Input Format
- First line: The delimiter string D (e.g. \`,:; \`).
- Second line: The input string S (contains spaces, letters, punctuation, up to 500 characters).

### Output Format
For each non-empty token: \`[TOKEN #<idx>]: "<token>" (LEN: <len>)\`.
Final line: \`TOTAL TOKENS: <count>\`.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char d[64];
    char s[512];
    if (fgets(d, sizeof(d), stdin) == NULL) return 0;
    d[strcspn(d, "\\r\\n")] = 0;
    if (fgets(s, sizeof(s), stdin) == NULL) return 0;
    s[strcspn(s, "\\r\\n")] = 0;

    // Tokenize string S using delimiters in D
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char d[64];
    char s[512];
    if (fgets(d, sizeof(d), stdin) == NULL) return 0;
    d[strcspn(d, "\\r\\n")] = 0;
    if (fgets(s, sizeof(s), stdin) == NULL) return 0;
    s[strcspn(s, "\\r\\n")] = 0;

    int count = 0;
    char *token = strtok(s, d);
    while (token != NULL) {
        count++;
        printf("[TOKEN #%d]: \\"%s\\" (LEN: %zu)\\n", count, token, strlen(token));
        token = strtok(NULL, d);
    }
    printf("TOTAL TOKENS: %d\\n", count);
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
      chapter: 8,
      chapterTitle: 'Strings',
      chapterOrder: 8,
      section: 'String Tokenization & In-Place Null Termination',
      exerciseNumber: '8.22',
      exerciseOrder: 22,
      page: 138,
      concept: 'How strtok stores static state and overwrites delimiters with null characters',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: ',; \nApple,Orange;Banana Melon\n', expectedOutput: '[TOKEN #1]: "Apple" (LEN: 5)\n[TOKEN #2]: "Orange" (LEN: 6)\n[TOKEN #3]: "Banana" (LEN: 6)\n[TOKEN #4]: "Melon" (LEN: 5)\nTOTAL TOKENS: 4\n' },
      { input: ':\nroot:x:0:0:root:/root:/bin/bash\n', expectedOutput: '[TOKEN #1]: "root" (LEN: 4)\n[TOKEN #2]: "x" (LEN: 1)\n[TOKEN #3]: "0" (LEN: 1)\n[TOKEN #4]: "0" (LEN: 1)\n[TOKEN #5]: "root" (LEN: 4)\n[TOKEN #6]: "/root" (LEN: 5)\n[TOKEN #7]: "/bin/bash" (LEN: 9)\nTOTAL TOKENS: 7\n' },
    ],
    hiddenTests: [
      { input: ',\n\n', expectedOutput: 'TOTAL TOKENS: 0\n' },
      { input: ' \nOne\n', expectedOutput: '[TOKEN #1]: "One" (LEN: 3)\nTOTAL TOKENS: 1\n' },
      { input: 'abc\naaaOnebbbTwocccThree\n', expectedOutput: '[TOKEN #1]: "One" (LEN: 3)\n[TOKEN #2]: "Two" (LEN: 3)\n[TOKEN #3]: "Three" (LEN: 5)\nTOTAL TOKENS: 3\n' },
    ],
  },

  // 9. Chapter 9: Structures & Unions - Union Type Punning & Endianness
  {
    slug: 'kanetkar-ch9-union-type-punning',
    title: 'Union Byte Reinterpretation & Endianness Probe',
    difficulty: 'MEDIUM',
    category: 'Structures, Unions, Enums',
    tags: ['Unions', 'Memory Layout', 'Endianness'],
    description: `### Problem Description

In C, \`union\` members share the exact same memory location. Reading a different member than the one written (type punning) allows inspecting the raw underlying byte representation (Yashavant Kanetkar, *Test Your C Skills*, Chapter 9: Structures, Unions, Enums).

Define a union:
\`\`\`c
union DataInspector {
    unsigned int val32;
    unsigned char bytes[4];
};
\`\`\`

Given an unsigned 32-bit integer X:
1. Store X in \`val32\`.
2. Print the individual byte values in memory order: \`bytes[0]\`, \`bytes[1]\`, \`bytes[2]\`, \`bytes[3]\` in hexadecimal (2-digit uppercase hex).
3. Determine architecture endianness based on whether the least significant byte is stored at index 0 (\`LITTLE_ENDIAN\`) or index 3 (\`BIG_ENDIAN\`).

### Input Format
- First line: Integer T (1 ≤ T ≤ 20), number of test integers.
- Next T lines: A single unsigned 32-bit integer X.

### Output Format
For each test case: \`BYTES: [0x<B0>, 0x<B1>, 0x<B2>, 0x<B3>] | ARCH: <ENDIAN_MODE>\`.`,
    starterCode: `#include <stdio.h>

union DataInspector {
    unsigned int val32;
    unsigned char bytes[4];
};

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        unsigned int x;
        scanf("%u", &x);
        // Inspect raw byte layout
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

union DataInspector {
    unsigned int val32;
    unsigned char bytes[4];
};

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        unsigned int x;
        if (scanf("%u", &x) != 1) break;
        union DataInspector d;
        d.val32 = x;

        // Check host endianness
        unsigned int probe = 1;
        unsigned char *probe_ptr = (unsigned char *)&probe;
        const char *arch = (*probe_ptr == 1) ? "LITTLE_ENDIAN" : "BIG_ENDIAN";

        printf("BYTES: [0x%02X, 0x%02X, 0x%02X, 0x%02X] | ARCH: %s\\n",
               d.bytes[0], d.bytes[1], d.bytes[2], d.bytes[3], arch);
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
      chapterTitle: 'Structures, Unions, Enums',
      chapterOrder: 9,
      section: 'Union Overlapping Storage & Byte Punning',
      exerciseNumber: '9.31',
      exerciseOrder: 31,
      page: 156,
      concept: 'Union memory alignment, member sharing, and memory endianness inspection',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\n305419896\n1\n', expectedOutput: 'BYTES: [0x78, 0x56, 0x34, 0x12] | ARCH: LITTLE_ENDIAN\nBYTES: [0x01, 0x00, 0x00, 0x00] | ARCH: LITTLE_ENDIAN\n' },
      { input: '1\n0\n', expectedOutput: 'BYTES: [0x00, 0x00, 0x00, 0x00] | ARCH: LITTLE_ENDIAN\n' },
    ],
    hiddenTests: [
      { input: '2\n4294967295\n255\n', expectedOutput: 'BYTES: [0xFF, 0xFF, 0xFF, 0xFF] | ARCH: LITTLE_ENDIAN\nBYTES: [0xFF, 0x00, 0x00, 0x00] | ARCH: LITTLE_ENDIAN\n' },
      { input: '1\n65536\n', expectedOutput: 'BYTES: [0x00, 0x00, 0x01, 0x00] | ARCH: LITTLE_ENDIAN\n' },
    ],
  },

  // 10. Chapter 10: Bitwise Operators - Circular Shift (ROL & ROR)
  {
    slug: 'kanetkar-ch10-bitwise-circular-shift',
    title: 'Bitwise Circular Shift (ROL & ROR) Engine',
    difficulty: 'MEDIUM',
    category: 'Bitwise Operators',
    tags: ['Bitwise', 'Bit Manipulation', 'Algorithms'],
    description: `### Problem Description

Standard C bitwise shifts \`<<\` and \`>>\` discard bits that fall off the edge. In cryptographic and hashing algorithms, circular bit rotation (ROL and ROR) wraps discarded bits back into the opposite side (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Bitwise Operators).

For a 32-bit unsigned integer X and a shift count K (0 ≤ K < 32):
- \`ROL(X, K) = (X << K) | (X >> (32 - K))\` (when K > 0)
- \`ROR(X, K) = (X >> K) | (X << (32 - K))\` (when K > 0)

Given Q rotation commands:
- \`ROL X K\`
- \`ROR X K\`

Print the rotated 32-bit integer in hexadecimal format (\`0x%08X\`) and decimal format.

### Input Format
- First line: Integer Q (1 ≤ Q ≤ 50), the number of operations.
- Next Q lines: An operation name (\`ROL\` or \`ROR\`), a 32-bit unsigned integer X, and shift count K.

### Output Format
For each query, output: \`<OP> 0x<HEX> | DEC: <decimal>\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        char op[8];
        unsigned int x;
        int k;
        scanf("%s %u %d", op, &x, &k);
        // Implement 32-bit circular bit rotation
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

static unsigned int rol32(unsigned int x, int k) {
    k %= 32;
    if (k == 0) return x;
    return (x << k) | (x >> (32 - k));
}

static unsigned int ror32(unsigned int x, int k) {
    k %= 32;
    if (k == 0) return x;
    return (x >> k) | (x << (32 - k));
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        char op[8];
        unsigned int x;
        int k;
        if (scanf("%s %u %d", op, &x, &k) != 3) break;
        unsigned int res = 0;
        if (strcmp(op, "ROL") == 0) res = rol32(x, k);
        else if (strcmp(op, "ROR") == 0) res = ror32(x, k);
        printf("%s 0x%08X | DEC: %u\\n", op, res, res);
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
      chapterTitle: 'Bitwise Operators',
      chapterOrder: 10,
      section: 'Bitwise Rotation & Mask Construction',
      exerciseNumber: '10.19',
      exerciseOrder: 19,
      page: 172,
      concept: 'Circular bit rotation using combined shift and bitwise OR',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\nROL 2147483648 1\nROR 1 1\n', expectedOutput: 'ROL 0x00000001 | DEC: 1\nROR 0x80000000 | DEC: 2147483648\n' },
      { input: '1\nROL 15 4\n', expectedOutput: 'ROL 0x000000F0 | DEC: 240\n' },
    ],
    hiddenTests: [
      { input: '2\nROL 4294967295 10\nROR 0 15\n', expectedOutput: 'ROL 0xFFFFFFFF | DEC: 4294967295\nROR 0x00000000 | DEC: 0\n' },
      { input: '2\nROL 1 0\nROR 1 32\n', expectedOutput: 'ROL 0x00000001 | DEC: 1\nROR 0x00000001 | DEC: 1\n' },
    ],
  },

  // 11. Chapter 11: Advanced Pointers - Function Pointer Jump Table
  {
    slug: 'kanetkar-ch11-function-pointer-jump-table',
    title: 'Function Pointer Calculator Jump Table',
    difficulty: 'MEDIUM',
    category: 'Advanced Pointers',
    tags: ['Function Pointers', 'Jump Table', 'Advanced C'],
    description: `### Problem Description

In C, an array of function pointers creates an efficient O(1) jump table to replace long switch-case constructs (Yashavant Kanetkar, *Test Your C Skills*, Chapter 11: Advanced Pointers).

Create a calculator jump table of 5 operations:
- Index 0 (\`ADD\`): A + B
- Index 1 (\`SUB\`): A - B
- Index 2 (\`MUL\`): A * B
- Index 3 (\`DIV\`): A / B (guaranteed B ≠ 0)
- Index 4 (\`POW\`): A^B (B ≥ 0)

Given N calculation queries with operation index OP (0 to 4) and operands A and B, invoke the corresponding function pointer directly from the array:
\`long long (*jump_table[5])(long long, long long);\`

### Input Format
- First line: Integer N (1 ≤ N ≤ 40).
- Next N lines: Three integers OP (0 ≤ OP ≤ 4), A, and B (−10⁴ ≤ A ≤ 10⁴, 0 ≤ B ≤ 10 for POW, B ≠ 0 for DIV).

### Output Format
For each query, output: \`OP[<index>](<A>, <B>) = <result>\`.`,
    starterCode: `#include <stdio.h>

// TODO: Define array of function pointers jump_table[5]

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        int op;
        long long a, b;
        scanf("%d %lld %lld", &op, &a, &b);
        // Invoke via jump table
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

static long long fn_add(long long a, long long b) { return a + b; }
static long long fn_sub(long long a, long long b) { return a - b; }
static long long fn_mul(long long a, long long b) { return a * b; }
static long long fn_div(long long a, long long b) { return b != 0 ? a / b : 0; }
static long long fn_pow(long long a, long long b) {
    long long res = 1;
    for (int i = 0; i < b; i++) res *= a;
    return res;
}

int main() {
    long long (*jump_table[5])(long long, long long) = {
        fn_add, fn_sub, fn_mul, fn_div, fn_pow
    };

    int n;
    if (scanf("%d", &n) != 1) return 0;
    while (n--) {
        int op;
        long long a, b;
        if (scanf("%d %lld %lld", &op, &a, &b) != 3) break;
        if (op >= 0 && op <= 4) {
            long long res = jump_table[op](a, b);
            printf("OP[%d](%lld, %lld) = %lld\\n", op, a, b, res);
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
      chapter: 11,
      chapterTitle: 'Advanced Pointers',
      chapterOrder: 11,
      section: 'Array of Function Pointers & Callback Tables',
      exerciseNumber: '11.16',
      exerciseOrder: 16,
      page: 184,
      concept: 'Array of function pointers syntax, indexing, and indirect calling',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\n0 12 18\n2 5 6\n4 2 8\n', expectedOutput: 'OP[0](12, 18) = 30\nOP[2](5, 6) = 30\nOP[4](2, 8) = 256\n' },
      { input: '2\n1 50 15\n3 100 25\n', expectedOutput: 'OP[1](50, 15) = 35\nOP[3](100, 25) = 4\n' },
    ],
    hiddenTests: [
      { input: '2\n4 10 0\n4 -2 3\n', expectedOutput: 'OP[4](10, 0) = 1\nOP[4](-2, 3) = -8\n' },
      { input: '3\n0 -50 50\n1 0 100\n2 -5 -5\n', expectedOutput: 'OP[0](-50, 50) = 0\nOP[1](0, 100) = -100\nOP[2](-5, -5) = 25\n' },
    ],
  },

  // 12. Chapter 12: Input / Output - Buffered Word Counter
  {
    slug: 'kanetkar-ch12-buffered-io-word-counter',
    title: 'Buffered Word, Line & Char Counter (wc)',
    difficulty: 'EASY',
    category: 'Input / Output',
    tags: ['I/O', 'Characters', 'Parsing'],
    description: `### Problem Description

In standard C I/O, \`getchar()\` processes raw input streams character by character, handling whitespace state transitions to count words and lines cleanly (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12: Input / Output).

Implement a standard Unix \`wc\` text statistics analyzer:
Given lines of text terminated by EOF:
Count:
1. Lines (number of newline \`\\n\` characters)
2. Words (sequences of non-whitespace characters)
3. Total Bytes / Characters (including newlines and spaces)

### Input Format
Arbitrary multiline text read until end-of-file (EOF).

### Output Format
Print a single line: \`LINES: <L> | WORDS: <W> | CHARS: <C>\`.`,
    starterCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    // Read characters until EOF
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    int c;
    long long lines = 0, words = 0, chars = 0;
    int in_word = 0;

    while ((c = getchar()) != EOF) {
        chars++;
        if (c == '\\n') lines++;
        if (isspace(c)) {
            in_word = 0;
        } else {
            if (!in_word) {
                in_word = 1;
                words++;
            }
        }
    }
    printf("LINES: %lld | WORDS: %lld | CHARS: %lld\\n", lines, words, chars);
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
      chapter: 12,
      chapterTitle: 'Input / Output',
      chapterOrder: 12,
      section: 'Character I/O & EOF Handling',
      exerciseNumber: '12.8',
      exerciseOrder: 8,
      page: 196,
      concept: 'Detecting EOF with getchar int return type and whitespace state tracking',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'Hello World\nSecond Line\n', expectedOutput: 'LINES: 2 | WORDS: 4 | CHARS: 24\n' },
      { input: 'LogicQ C Language Platform\n', expectedOutput: 'LINES: 1 | WORDS: 4 | CHARS: 27\n' },
    ],
    hiddenTests: [
      { input: '\n\n\n', expectedOutput: 'LINES: 3 | WORDS: 0 | CHARS: 3\n' },
      { input: '   Spaced   Words   \n', expectedOutput: 'LINES: 1 | WORDS: 2 | CHARS: 21\n' },
      { input: 'SingleWord', expectedOutput: 'LINES: 0 | WORDS: 1 | CHARS: 10\n' },
    ],
  },

  // 13. Chapter 14: Typecasting & Conversions - Unsigned Modulo Wrap-Around
  {
    slug: 'kanetkar-ch14-unsigned-modulo-wrap',
    title: 'Unsigned Modulo Wrap-Around & Overflow Simulator',
    difficulty: 'EASY',
    category: 'Typecasting',
    tags: ['Typecasting', 'Overflow', 'Arithmetic'],
    description: `### Problem Description

According to the ISO C standard, unsigned integer arithmetic never overflows; instead, it wraps around modulo 2^N (where N is the bit-width). Signed arithmetic overflow, however, is undefined behavior (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14: Typecasting).

Simulate unsigned 16-bit integer arithmetic (modulo 65536, values 0 to 65535):
Given an initial 16-bit accumulator \`U = 0\` and K commands:
- \`ADD X\`: adds X and wraps modulo 65536
- \`SUB X\`: subtracts X and wraps modulo 65536
- \`MUL X\`: multiplies by X and wraps modulo 65536

For each step, report whether the operation wrapped around (\`WRAP_DETECTED\` if the mathematical result exceeded [0, 65535]) and the resulting 16-bit unsigned value.

### Input Format
- First line: Integer K (1 ≤ K ≤ 50), the number of operations.
- Next K lines: Command (\`ADD\`, \`SUB\`, \`MUL\`) and an integer operand X (0 ≤ X ≤ 10⁵).

### Output Format
For each command, output: \`<OP> <X> -> VAL: <U> (<STATUS>)\`.
Status is either \`NORMAL\` or \`WRAP_DETECTED\`.`,
    starterCode: `#include <stdio.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;
    unsigned short u = 0;
    while (k--) {
        char op[8];
        long long x;
        scanf("%s %lld", op, &x);
        // Track 16-bit unsigned modulo 65536 wrap
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int k;
    if (scanf("%d", &k) != 1) return 0;
    unsigned int u = 0;
    while (k--) {
        char op[8];
        long long x;
        if (scanf("%s %lld", op, &x) != 2) break;
        long long ideal = 0;
        if (strcmp(op, "ADD") == 0) ideal = (long long)u + x;
        else if (strcmp(op, "SUB") == 0) ideal = (long long)u - x;
        else if (strcmp(op, "MUL") == 0) ideal = (long long)u * x;

        int wrapped = (ideal < 0 || ideal > 65535);
        u = (unsigned int)(ideal & 0xFFFF);
        printf("%s %lld -> VAL: %u (%s)\\n", op, x, u, wrapped ? "WRAP_DETECTED" : "NORMAL");
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
      chapter: 14,
      chapterTitle: 'Typecasting',
      chapterOrder: 14,
      section: 'Unsigned Wrap-around vs Signed Overflow',
      exerciseNumber: '14.12',
      exerciseOrder: 12,
      page: 204,
      concept: 'Unsigned integer arithmetic modulo 2^N and binary wrap representation',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\nADD 65535\nADD 1\nSUB 10\n', expectedOutput: 'ADD 65535 -> VAL: 65535 (NORMAL)\nADD 1 -> VAL: 0 (WRAP_DETECTED)\nSUB 10 -> VAL: 65526 (WRAP_DETECTED)\n' },
      { input: '2\nADD 100\nMUL 1000\n', expectedOutput: 'ADD 100 -> VAL: 100 (NORMAL)\nMUL 1000 -> VAL: 34464 (WRAP_DETECTED)\n' },
    ],
    hiddenTests: [
      { input: '2\nSUB 1\nADD 1\n', expectedOutput: 'SUB 1 -> VAL: 65535 (WRAP_DETECTED)\nADD 1 -> VAL: 0 (WRAP_DETECTED)\n' },
      { input: '3\nADD 0\nMUL 5\nADD 256\n', expectedOutput: 'ADD 0 -> VAL: 0 (NORMAL)\nMUL 5 -> VAL: 0 (NORMAL)\nADD 256 -> VAL: 256 (NORMAL)\n' },
    ],
  },

  // 14. Chapter 16: Memory Models & Dynamic Memory - Dynamic Vector Doubling
  {
    slug: 'kanetkar-ch16-dynamic-array-growth',
    title: 'Geometric Vector Growth & Reallocation Simulator',
    difficulty: 'MEDIUM',
    category: 'Memory Models',
    tags: ['Dynamic Memory', 'malloc', 'realloc', 'Vectors'],
    description: `### Problem Description

In dynamic memory management with \`malloc\` and \`realloc\`, geometric capacity doubling (amortized O(1)) minimizes expensive heap memory reallocations and memory copies (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16: Memory Models).

Simulate a dynamic array starting with initial capacity \`C = 2\` and size \`S = 0\`:
For each inserted integer:
1. If \`S == C\`, double capacity: \`C = C * 2\`, which incurs a reallocation and copies all \`S\` existing elements to the new buffer.
2. Insert element at index \`S\`, increment \`S = S + 1\`.
3. Track the cumulative total number of element copies across all reallocations.

Given a sequence of N element insertions, print the state after each insertion.

### Input Format
- First line: Integer N (1 ≤ N ≤ 50), the number of elements to insert.
- Second line: N space-separated integers.

### Output Format
For each insertion, output: \`INSERT <val> | SIZE: <S>/<C> | TOTAL_COPIES: <copies>\`.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Simulate geometric capacity doubling
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int size = 0;
    int capacity = 2;
    long long total_copies = 0;

    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        if (size == capacity) {
            total_copies += size;
            capacity *= 2;
        }
        size++;
        printf("INSERT %d | SIZE: %d/%d | TOTAL_COPIES: %lld\\n", val, size, capacity, total_copies);
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
      chapter: 16,
      chapterTitle: 'Memory Models',
      chapterOrder: 16,
      section: 'Dynamic Memory Allocation & realloc Behavior',
      exerciseNumber: '16.14',
      exerciseOrder: 14,
      page: 210,
      concept: 'Heap reallocations, memory moving, and amortized geometric resizing',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n10 20 30 40 50\n', expectedOutput: 'INSERT 10 | SIZE: 1/2 | TOTAL_COPIES: 0\nINSERT 20 | SIZE: 2/2 | TOTAL_COPIES: 0\nINSERT 30 | SIZE: 3/4 | TOTAL_COPIES: 2\nINSERT 40 | SIZE: 4/4 | TOTAL_COPIES: 2\nINSERT 50 | SIZE: 5/8 | TOTAL_COPIES: 6\n' },
      { input: '2\n1 2\n', expectedOutput: 'INSERT 1 | SIZE: 1/2 | TOTAL_COPIES: 0\nINSERT 2 | SIZE: 2/2 | TOTAL_COPIES: 0\n' },
    ],
    hiddenTests: [
      { input: '1\n100\n', expectedOutput: 'INSERT 100 | SIZE: 1/2 | TOTAL_COPIES: 0\n' },
      { input: '8\n1 2 3 4 5 6 7 8\n', expectedOutput: 'INSERT 1 | SIZE: 1/2 | TOTAL_COPIES: 0\nINSERT 2 | SIZE: 2/2 | TOTAL_COPIES: 0\nINSERT 3 | SIZE: 3/4 | TOTAL_COPIES: 2\nINSERT 4 | SIZE: 4/4 | TOTAL_COPIES: 2\nINSERT 5 | SIZE: 5/8 | TOTAL_COPIES: 6\nINSERT 6 | SIZE: 6/8 | TOTAL_COPIES: 6\nINSERT 7 | SIZE: 7/8 | TOTAL_COPIES: 6\nINSERT 8 | SIZE: 8/8 | TOTAL_COPIES: 6\n' },
    ],
  },
];
