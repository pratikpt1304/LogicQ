import { PracticeProblemDef } from './practice-module1.data';

export const PRACTICE_MODULE_2_PROBLEMS: PracticeProblemDef[] = [
  // 1. Easy: Swap Two Values Using Pointers
  {
    slug: 'practice-m2-p1-swap-pointers',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 1,
    title: 'Swap Two Values Using Pointers',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Functions', 'Swap', 'Pass-by-Reference'],
    description: `### Problem Description

Write a function \`void swap(long long *a, long long *b)\` that swaps the contents of two \`long long\` variables using pointer dereferencing. In \`main\`, read two integers $A$ and $B$, invoke \`swap(&a, &b)\`, and print the swapped values.

### Input Format
A single line containing two space-separated integers $A$ and $B$ ($-10^{18} \\le A, B \\le 10^{18}$).

### Output Format
Print the swapped integers $B$ and $A$ separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

void swap(long long *a, long long *b) {
    // TODO: swap values using pointers
}

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    swap(&a, &b);
    printf("%lld %lld\\n", a, b);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void swap(long long *a, long long *b) {
    long long temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    swap(&a, &b);
    printf("%lld %lld\\n", a, b);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
void swap(long long a, long long b) { // Pass-by-value bug
    long long t = a; a = b; b = t;
}
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    swap(a, b);
    printf("%lld %lld\\n", a, b);
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
void swap(long long *a, long long *b) {
    *a = *b; // Overwrites *a without saving
    *b = *a;
}
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    swap(&a, &b);
    printf("%lld %lld\\n", a, b);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '10 20\n', expectedOutput: '20 10\n' },
      { input: '-5 99\n', expectedOutput: '99 -5\n' },
    ],
    hiddenTests: [
      { input: '0 0\n', expectedOutput: '0 0\n' },
      { input: '123456789012345 987654321098765\n', expectedOutput: '987654321098765 123456789012345\n' },
      { input: '-1000000000000000 1000000000000000\n', expectedOutput: '1000000000000000 -1000000000000000\n' },
      { input: '42 -42\n', expectedOutput: '-42 42\n' },
      { input: '1 2\n', expectedOutput: '2 1\n' },
      { input: '7 7\n', expectedOutput: '7 7\n' },
      { input: '-999 -111\n', expectedOutput: '-111 -999\n' },
      { input: '500 0\n', expectedOutput: '0 500\n' },
    ],
  },

  // 2. Easy: Min and Max via Pointer Parameters
  {
    slug: 'practice-m2-p2-find-min-max-pointers',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 2,
    title: 'Min and Max via Pointer Parameters',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Functions', 'Out-Parameters'],
    description: `### Problem Description

Implement a function \`void find_min_max(const long long *arr, int n, long long *min_val, long long *max_val)\` that computes both the minimum and maximum elements of an array of n integers and stores them in \`*min_val\` and \`*max_val\`.

### Input Format
The first line contains an integer N (1 ≤ N ≤ 10⁵).
The second line contains N space-separated integers (−10¹⁸ ≤ Aᵢ ≤ 10¹⁸).

### Output Format
Print the minimum and maximum values separated by a space, followed by a newline.`,
    starterCode: `#include <stdio.h>

void find_min_max(const long long *arr, int n, long long *min_val, long long *max_val) {
    // TODO: determine min and max and assign to pointers
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static long long arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) return 0;
    }
    long long min_v, max_v;
    find_min_max(arr, n, &min_v, &max_v);
    printf("%lld %lld\\n", min_v, max_v);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void find_min_max(const long long *arr, int n, long long *min_val, long long *max_val) {
    long long mn = arr[0];
    long long mx = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] < mn) mn = arr[i];
        if (arr[i] > mx) mx = arr[i];
    }
    *min_val = mn;
    *max_val = mx;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static long long arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) return 0;
    }
    long long min_v, max_v;
    find_min_max(arr, n, &min_v, &max_v);
    printf("%lld %lld\\n", min_v, max_v);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long v; for (int i = 0; i < n; i++) scanf("%lld", &v);
    printf("0 0\\n"); // Dummy constant output
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long first = 0, last = 0;
    for (int i = 0; i < n; i++) {
        long long x; scanf("%lld", &x);
        if (i == 0) first = x;
        if (i == n - 1) last = x;
    }
    printf("%lld %lld\\n", first, last); // Wrongly prints first and last
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '5\n3 1 4 1 5\n', expectedOutput: '1 5\n' },
      { input: '3\n-10 -20 -5\n', expectedOutput: '-20 -5\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '42 42\n' },
      { input: '2\n-100 100\n', expectedOutput: '-100 100\n' },
      { input: '4\n10 10 10 10\n', expectedOutput: '10 10\n' },
      { input: '6\n0 5 -9 12 4 -1\n', expectedOutput: '-9 12\n' },
      { input: '5\n1000000000000000 -1000000000000000 0 5 999\n', expectedOutput: '-1000000000000000 1000000000000000\n' },
      { input: '3\n7 2 9\n', expectedOutput: '2 9\n' },
      { input: '5\n-1 -2 -3 -4 -5\n', expectedOutput: '-5 -1\n' },
      { input: '4\n100 200 400 300\n', expectedOutput: '100 400\n' },
    ],
  },

  // 3. Easy: Factorial via Helper Function
  {
    slug: 'practice-m2-p3-factorial-function',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 3,
    title: 'Factorial via Function',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    tags: ['Functions', 'Recursion', 'Math'],
    description: `### Problem Description

Define a function \`unsigned long long factorial(int n)\` that calculates N! for 0 ≤ N ≤ 20. In \`main\`, read $N$ and output the calculated factorial.

### Input Format
A single line containing an integer $N$ ($0 \\le N \\le 20$).

### Output Format
Print $N!$ followed by a newline.`,
    starterCode: `#include <stdio.h>

unsigned long long factorial(int n) {
    // TODO: implement factorial
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%llu\\n", factorial(n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

unsigned long long factorial(int n) {
    if (n <= 1) return 1ULL;
    unsigned long long res = 1ULL;
    for (int i = 2; i <= n; i++) {
        res *= (unsigned long long)i;
    }
    return res;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%llu\\n", factorial(n));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("%d\\n", n); // Prints n instead of n!
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    int res = 1;
    for (int i = 1; i <= n; i++) res *= i; // 32-bit overflow for n >= 13
    printf("%d\\n", res);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '0\n', expectedOutput: '1\n' },
      { input: '5\n', expectedOutput: '120\n' },
    ],
    hiddenTests: [
      { input: '1\n', expectedOutput: '1\n' },
      { input: '3\n', expectedOutput: '6\n' },
      { input: '10\n', expectedOutput: '3628800\n' },
      { input: '12\n', expectedOutput: '479001600\n' },
      { input: '15\n', expectedOutput: '1307674368000\n' },
      { input: '18\n', expectedOutput: '6402373705728000\n' },
      { input: '20\n', expectedOutput: '2432902008176640000\n' },
      { input: '7\n', expectedOutput: '5040\n' },
    ],
  },

  // 4. Easy: Sum and Average via Pointers
  {
    slug: 'practice-m2-p4-sum-avg-pointers',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 4,
    title: 'Sum and Average via Pointer Arguments',
    difficulty: 'EASY',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Functions', 'Math'],
    description: `### Problem Description

Write a function \`void compute_sum_avg(const int *arr, int n, long long *sum_out, double *avg_out)\` that calculates the sum of all elements in \`arr\` and their arithmetic average. In \`main\`, read $N$ followed by $N$ integers, invoke the function, and print the sum and average rounded to 2 decimal places.

### Input Format
First line: an integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($ -10^6 \\le A_i \\le 10^6 $).

### Output Format
Print the total sum as an integer and the average formatted to two decimal places (\`%.2f\`), separated by a space and followed by a newline.`,
    starterCode: `#include <stdio.h>

void compute_sum_avg(const int *arr, int n, long long *sum_out, double *avg_out) {
    // TODO: Calculate sum and average via pointers
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    long long sum_val;
    double avg_val;
    compute_sum_avg(arr, n, &sum_val, &avg_val);
    printf("%lld %.2f\\n", sum_val, avg_val);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void compute_sum_avg(const int *arr, int n, long long *sum_out, double *avg_out) {
    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    *sum_out = total;
    *avg_out = (double)total / (double)n;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    long long sum_val;
    double avg_val;
    compute_sum_avg(arr, n, &sum_val, &avg_val);
    printf("%lld %.2f\\n", sum_val, avg_val);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) { int x; scanf("%d", &x); }
    printf("0 0.00\\n"); // Zero output
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    int sum = 0;
    for (int i = 0; i < n; i++) { int x; scanf("%d", &x); sum += x; }
    printf("%d %d.00\\n", sum, sum / n); // Integer truncation for average
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '4\n1 2 3 4\n', expectedOutput: '10 2.50\n' },
      { input: '3\n10 20 30\n', expectedOutput: '60 20.00\n' },
    ],
    hiddenTests: [
      { input: '1\n5\n', expectedOutput: '5 5.00\n' },
      { input: '2\n-5 5\n', expectedOutput: '0 0.00\n' },
      { input: '5\n1 2 3 4 5\n', expectedOutput: '15 3.00\n' },
      { input: '3\n1 1 2\n', expectedOutput: '4 1.33\n' },
      { input: '4\n-10 -20 -30 -40\n', expectedOutput: '-100 -25.00\n' },
      { input: '5\n100 200 300 400 500\n', expectedOutput: '1500 300.00\n' },
      { input: '3\n7 8 9\n', expectedOutput: '24 8.00\n' },
      { input: '6\n1 2 4 8 16 32\n', expectedOutput: '63 10.50\n' },
    ],
  },

  // 5. Medium: Recursive GCD and LCM
  {
    slug: 'practice-m2-p5-recursive-gcd-lcm',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 5,
    title: 'Recursive GCD and LCM',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    tags: ['Functions', 'Recursion', 'GCD', 'Math'],
    description: `### Problem Description

Write a recursive function \`long long gcd(long long a, long long b)\` using the Euclidean algorithm to find the Greatest Common Divisor of two positive integers A and B. Using \`gcd\`, compute their Least Common Multiple (LCM) as $\\text{LCM}(a, b) = \\frac{a}{\\gcd(a, b)} \\times b$.

### Input Format
A single line containing two positive integers $A$ and $B$ ($1 \\le A, B \\le 10^9$).

### Output Format
Print the GCD and LCM separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

long long gcd(long long a, long long b) {
    // TODO: implement recursive Euclidean gcd
    return 1;
}

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    long long g = gcd(a, b);
    long long l = (a / g) * b;
    printf("%lld %lld\\n", g, l);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long gcd(long long a, long long b) {
    if (b == 0) return a;
    return gcd(b, a % b);
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
    printf("1 %lld\\n", a * b); // Assumes gcd is always 1
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    printf("%lld %lld\\n", a < b ? a : b, a > b ? a : b); // Simply min and max
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '12 18\n', expectedOutput: '6 36\n' },
      { input: '7 13\n', expectedOutput: '1 91\n' },
    ],
    hiddenTests: [
      { input: '1 1\n', expectedOutput: '1 1\n' },
      { input: '100 25\n', expectedOutput: '25 100\n' },
      { input: '48 180\n', expectedOutput: '12 720\n' },
      { input: '1000000000 500000000\n', expectedOutput: '500000000 1000000000\n' },
      { input: '81 27\n', expectedOutput: '27 81\n' },
      { input: '17 31\n', expectedOutput: '1 527\n' },
      { input: '105 252\n', expectedOutput: '21 1260\n' },
      { input: '64 48\n', expectedOutput: '16 192\n' },
    ],
  },

  // 6. Medium: Array Reversal In-Place with Two Pointers
  {
    slug: 'practice-m2-p6-reverse-array-pointers',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 6,
    title: 'Array Reversal In-Place with Two Pointers',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Arrays', 'Two-Pointer'],
    description: `### Problem Description

Write a function \`void reverse_array(int *start, int *end)\` that reverses an array in-place using two pointers (\`start\` pointing to the first element and \`end\` pointing to the last element), advancing \`start\` and decrementing \`end\` until they cross.

### Input Format
First line: an integer N (1 ≤ N ≤ 10⁵).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
Print the reversed array on a single line with elements separated by spaces, followed by a newline.`,
    starterCode: `#include <stdio.h>

void reverse_array(int *start, int *end) {
    // TODO: two-pointer reverse
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    reverse_array(&arr[0], &arr[n - 1]);
    for (int i = 0; i < n; i++) {
        printf("%d%c", arr[i], (i == n - 1 ? '\\n' : ' '));
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void reverse_array(int *start, int *end) {
    while (start < end) {
        int temp = *start;
        *start = *end;
        *end = temp;
        start++;
        end--;
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    reverse_array(&arr[0], &arr[n - 1]);
    for (int i = 0; i < n; i++) {
        printf("%d%c", arr[i], (i == n - 1 ? '\\n' : ' '));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    static int a[100005];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) printf("%d%c", a[i], i == n - 1 ? '\\n' : ' '); // Does not reverse
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) { int x; scanf("%d", &x); }
    for (int i = 0; i < n; i++) printf("0%c", i == n - 1 ? '\\n' : ' '); // All zeros
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '5\n1 2 3 4 5\n', expectedOutput: '5 4 3 2 1\n' },
      { input: '2\n10 20\n', expectedOutput: '20 10\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '42\n' },
      { input: '4\n-1 -2 -3 -4\n', expectedOutput: '-4 -3 -2 -1\n' },
      { input: '6\n1 0 2 0 3 0\n', expectedOutput: '0 3 0 2 0 1\n' },
      { input: '3\n9 9 9\n', expectedOutput: '9 9 9\n' },
      { input: '7\n1 3 5 7 9 11 13\n', expectedOutput: '13 11 9 7 5 3 1\n' },
      { input: '8\n2 4 6 8 10 12 14 16\n', expectedOutput: '16 14 12 10 8 6 4 2\n' },
      { input: '5\n100 -50 200 -100 300\n', expectedOutput: '300 -100 200 -50 100\n' },
      { input: '4\n0 1 0 1\n', expectedOutput: '1 0 1 0\n' },
    ],
  },

  // 7. Medium: String Length and In-Place Reversal via Pointers
  {
    slug: 'practice-m2-p7-pointer-string-reverse',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 7,
    title: 'String Length and In-Place Reversal via Pointers',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Strings', 'Two-Pointer'],
    description: `### Problem Description

Write a function \`int str_len_ptr(const char *s)\` that calculates string length using pointer arithmetic without \`string.h\`, and a function \`void str_rev_ptr(char *s)\` that reverses the string in-place using two pointers. In \`main\`, read a string and print its length and reversed version.

### Input Format
A single line containing a single non-empty string without whitespace ($1 \\le |S| \\le 10^5$).

### Output Format
First line: the length of the string.
Second line: the reversed string.`,
    starterCode: `#include <stdio.h>

int str_len_ptr(const char *s) {
    // TODO: pointer length
    return 0;
}

void str_rev_ptr(char *s) {
    // TODO: pointer reverse
}

int main() {
    static char str[100005];
    if (scanf("%s", str) != 1) return 0;
    printf("%d\\n", str_len_ptr(str));
    str_rev_ptr(str);
    printf("%s\\n", str);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int str_len_ptr(const char *s) {
    const char *p = s;
    while (*p != '\\0') {
        p++;
    }
    return (int)(p - s);
}

void str_rev_ptr(char *s) {
    int len = str_len_ptr(s);
    char *left = s;
    char *right = s + len - 1;
    while (left < right) {
        char temp = *left;
        *left = *right;
        *right = temp;
        left++;
        right--;
    }
}

int main() {
    static char str[100005];
    if (scanf("%s", str) != 1) return 0;
    printf("%d\\n", str_len_ptr(str));
    str_rev_ptr(str);
    printf("%s\\n", str);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    static char s[100005];
    if (scanf("%s", s) != 1) return 0;
    printf("0\\n%s\\n", s); // Wrong length and does not reverse
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    static char s[100005];
    if (scanf("%s", s) != 1) return 0;
    printf("1\\nA\\n"); // Constant output
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: 'hello\n', expectedOutput: '5\nolleh\n' },
      { input: 'radar\n', expectedOutput: '5\nradar\n' },
    ],
    hiddenTests: [
      { input: 'a\n', expectedOutput: '1\na\n' },
      { input: 'ab\n', expectedOutput: '2\nba\n' },
      { input: 'LogicQ\n', expectedOutput: '6\nQcigoL\n' },
      { input: '123456789\n', expectedOutput: '9\n987654321\n' },
      { input: 'ProgrammingInC\n', expectedOutput: '14\nCnIgnimmargorP\n' },
      { input: 'racecar\n', expectedOutput: '7\nracecar\n' },
      { input: 'UPPERCASE\n', expectedOutput: '9\nESACREPPU\n' },
      { input: 'structures\n', expectedOutput: '10\nserutcurts\n' },
    ],
  },

  // 8. Medium: Recursive Fast Modular Exponentiation
  {
    slug: 'practice-m2-p8-fast-modular-power',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 8,
    title: 'Recursive Fast Modular Exponentiation',
    difficulty: 'MEDIUM',
    category: 'Pointers and Functions',
    tags: ['Functions', 'Recursion', 'Math', 'Fast Pow'],
    description: `### Problem Description

Write a recursive function \`long long mod_pow(long long base, long long exp, long long mod)\` that computes (base^{exp}) pmod{mod} in O(log(exp)) time using divide and conquer.

### Input Format
A single line containing three integers A, B, and M (0 ≤ A ≤ 10⁹, 0 ≤ B ≤ 10⁹, 1 ≤ M ≤ 10⁹ + 7). Note: 0⁰ = 1.

### Output Format
Print (A^B) pmod M followed by a newline.`,
    starterCode: `#include <stdio.h>

long long mod_pow(long long base, long long exp, long long mod) {
    // TODO: implement O(log exp) recursive mod pow
    return 0;
}

int main() {
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    printf("%lld\\n", mod_pow(a, b, m));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long mod_pow(long long base, long long exp, long long mod) {
    if (mod == 1) return 0;
    if (exp == 0) return 1 % mod;
    base %= mod;
    long long half = mod_pow(base, exp / 2, mod);
    long long res = (half * half) % mod;
    if (exp % 2 == 1) {
        res = (res * base) % mod;
    }
    return res;
}

int main() {
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    printf("%lld\\n", mod_pow(a, b, m));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    printf("%lld\\n", (a * b) % m); // Multiplication instead of exponentiation
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    printf("%lld\\n", a % m); // Returns base % m
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '2 10 1000000007\n', expectedOutput: '1024\n' },
      { input: '3 5 100\n', expectedOutput: '43\n' },
    ],
    hiddenTests: [
      { input: '5 0 1000\n', expectedOutput: '1\n' },
      { input: '2 30 1000000007\n', expectedOutput: '73741817\n' },
      { input: '10 9 1000000007\n', expectedOutput: '1000000000\n' },
      { input: '7 100000000 1000000007\n', expectedOutput: '755909328\n' },
      { input: '0 5 13\n', expectedOutput: '0\n' },
      { input: '12345 67890 999983\n', expectedOutput: '434547\n' },
      { input: '9 3 1\n', expectedOutput: '0\n' },
      { input: '4 12 100000\n', expectedOutput: '77216\n' },
    ],
  },

  // 9. Hard: Function Pointer Dispatch Calculator
  {
    slug: 'practice-m2-p9-func-pointer-dispatch',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 9,
    title: 'Function Pointer Dispatch Table',
    difficulty: 'HARD',
    category: 'Pointers and Functions',
    tags: ['Pointers', 'Function Pointers', 'Dispatch Table'],
    description: `### Problem Description

Implement a dispatch table using an array of function pointers \`long long (*ops[4])(long long, long long)\` to handle four operations:
- \`0\`: Add (A + B)
- \`1\`: Subtract (A - B)
- \`2\`: Multiply (A × B)
- \`3\`: Integer Division (A / B). If B = 0, output \`DIV_BY_ZERO\`.

Given Q queries, each with an operation code and operands A and B, evaluate each query using the function pointer table.

### Input Format
First line: integer Q (1 ≤ Q ≤ 10⁴).
Next Q lines: three integers op, A, B (0 ≤ op ≤ 3, −10⁹ ≤ A, B ≤ 10⁹).

### Output Format
For each query, print the computed integer result or \`DIV_BY_ZERO\` on its own line.`,
    starterCode: `#include <stdio.h>

// TODO: Define function pointer type and operations

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int op;
        long long a, b;
        if (scanf("%d %lld %lld", &op, &a, &b) != 3) break;
        // Dispatch via function pointers
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

typedef long long (*calc_func)(long long, long long);

long long do_add(long long a, long long b) { return a + b; }
long long do_sub(long long a, long long b) { return a - b; }
long long do_mul(long long a, long long b) { return a * b; }
long long do_div(long long a, long long b) { return a / b; }

int main() {
    calc_func ops[4] = { do_add, do_sub, do_mul, do_div };
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int op;
        long long a, b;
        if (scanf("%d %lld %lld", &op, &a, &b) != 3) break;
        if (op == 3 && b == 0) {
            printf("DIV_BY_ZERO\\n");
        } else {
            printf("%lld\\n", ops[op](a, b));
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int op; long long a, b; scanf("%d %lld %lld", &op, &a, &b);
        printf("%lld\\n", a + b); // Always adds
    }
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        int op; long long a, b; scanf("%d %lld %lld", &op, &a, &b);
        printf("0\\n"); // Stub
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      { input: '4\n0 10 20\n1 50 15\n2 6 7\n3 20 4\n', expectedOutput: '30\n35\n42\n5\n' },
      { input: '1\n3 10 0\n', expectedOutput: 'DIV_BY_ZERO\n' },
    ],
    hiddenTests: [
      { input: '2\n0 -5 5\n1 0 10\n', expectedOutput: '0\n-10\n' },
      { input: '2\n2 -100 -100\n3 7 2\n', expectedOutput: '10000\n3\n' },
      { input: '1\n3 0 0\n', expectedOutput: 'DIV_BY_ZERO\n' },
      { input: '3\n0 100 200\n2 12 12\n3 -15 3\n', expectedOutput: '300\n144\n-5\n' },
      { input: '2\n1 100 200\n2 0 9999\n', expectedOutput: '-100\n0\n' },
      { input: '3\n3 100 10\n3 100 0\n3 99 2\n', expectedOutput: '10\nDIV_BY_ZERO\n49\n' },
      { input: '2\n0 0 0\n1 0 0\n', expectedOutput: '0\n0\n' },
      { input: '2\n2 100000 10000\n3 1000000 1000\n', expectedOutput: '1000000000\n1000\n' },
    ],
  },

  // 10. Hard: Tower of Hanoi Step Tracer
  {
    slug: 'practice-m2-p10-tower-of-hanoi',
    moduleSlug: 'pointers-and-functions',
    moduleOrder: 10,
    title: 'Tower of Hanoi Step Tracer',
    difficulty: 'HARD',
    category: 'Pointers and Functions',
    tags: ['Functions', 'Recursion', 'Hanoi', 'Divide-and-Conquer'],
    description: `### Problem Description

The classic Tower of Hanoi problem consists of 3 rods (\`A\`, \`B\`, \`C\`) and $N$ disks of different sizes. All disks are initially on rod \`A\`. Implement the recursive solver \`void hanoi(int n, char from, char to, char aux, long long *move_count)\` that prints each move in the format \`Move disk X from Y to Z\` and records the total number of moves.

### Input Format
A single integer $N$ ($1 \\le N \\le 10$).

### Output Format
Print the sequence of moves, one per line.
On the final line, print \`Total moves: <count>\`.`,
    starterCode: `#include <stdio.h>

void hanoi(int n, char from, char to, char aux, long long *move_count) {
    // TODO: implement recursive Tower of Hanoi
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long count = 0;
    hanoi(n, 'A', 'C', 'B', &count);
    printf("Total moves: %lld\\n", count);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void hanoi(int n, char from, char to, char aux, long long *move_count) {
    if (n == 0) return;
    hanoi(n - 1, from, aux, to, move_count);
    printf("Move disk %d from %c to %c\\n", n, from, to);
    (*move_count)++;
    hanoi(n - 1, aux, to, from, move_count);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long count = 0;
    hanoi(n, 'A', 'C', 'B', &count);
    printf("Total moves: %lld\\n", count);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("Total moves: %d\\n", (1 << n) - 1); // Only prints the count, no moves
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("Move disk 1 from A to C\\nTotal moves: 1\\n"); // Only solves N=1
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      {
        input: '1\n',
        expectedOutput: 'Move disk 1 from A to C\nTotal moves: 1\n',
      },
      {
        input: '2\n',
        expectedOutput: 'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C\nTotal moves: 3\n',
      },
    ],
    hiddenTests: [
      {
        input: '3\n',
        expectedOutput:
          'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C\nTotal moves: 7\n',
      },
      {
        input: '4\n',
        expectedOutput:
          'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C\nMove disk 3 from A to B\nMove disk 1 from C to A\nMove disk 2 from C to B\nMove disk 1 from A to B\nMove disk 4 from A to C\nMove disk 1 from B to C\nMove disk 2 from B to A\nMove disk 1 from C to A\nMove disk 3 from B to C\nMove disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C\nTotal moves: 15\n',
      },
      {
        input: '5\n',
        expectedOutput:
          'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C\nMove disk 4 from A to B\nMove disk 1 from C to B\nMove disk 2 from C to A\nMove disk 1 from B to A\nMove disk 3 from C to B\nMove disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 5 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C\nMove disk 3 from B to A\nMove disk 1 from C to B\nMove disk 2 from C to A\nMove disk 1 from B to A\nMove disk 4 from B to C\nMove disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C\nTotal moves: 31\n',
      },
      {
        input: '1\n',
        expectedOutput: 'Move disk 1 from A to C\nTotal moves: 1\n',
      },
      {
        input: '2\n',
        expectedOutput: 'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C\nTotal moves: 3\n',
      },
      {
        input: '3\n',
        expectedOutput:
          'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C\nTotal moves: 7\n',
      },
      {
        input: '2\n',
        expectedOutput: 'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C\nTotal moves: 3\n',
      },
      {
        input: '1\n',
        expectedOutput: 'Move disk 1 from A to C\nTotal moves: 1\n',
      },
    ],
  },
];
