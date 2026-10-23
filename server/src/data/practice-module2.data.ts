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
  {
    slug: "practice-m2-p11-increment-by-reference",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 11,
    title: "Increment Variable by Reference",
    difficulty: "EASY",
    category: "Pointers and Functions",
    tags: ["Pointers","Pass-by-Reference","Functions","Dereference"],
    description: `### Problem Description

Write a function \`void incrementBy(long long *val, long long step)\` that modifies the variable pointed to by \`val\` by adding \`step\` to it using the dereference operator \`*\`.

Given the initial value \$V\$ and step \$S\$, invoke the function and print the updated value.

### Input Format
Two space-separated integers \$V\$ and \$S\$ (\$-10^{14} \\le V, S \\le 10^{14}\$).

### Output Format
Print the updated value followed by a newline.`,
    starterCode: `#include <stdio.h>

void incrementBy(long long *val, long long step) {
    // TODO: Dereference val and add step
}

int main() {
    long long v, s;
    if (scanf("%lld %lld", &v, &s) != 2) return 0;
    incrementBy(&v, s);
    printf("%lld\\n", v);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void incrementBy(long long *val, long long step) {
    if (val) {
        *val += step;
    }
}

int main() {
    long long v, s;
    if (scanf("%lld %lld", &v, &s) != 2) return 0;
    incrementBy(&v, s);
    printf("%lld\\n", v);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
void incrementBy(long long *val, long long step) {
    val += step; // Pointer arithmetic instead of dereferencing value!
}
int main() {
    long long v, s;
    scanf("%lld %lld", &v, &s);
    incrementBy(&v, s);
    printf("%lld\\n", v);
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long v, s;
    scanf("%lld %lld", &v, &s);
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "10 5\n",
                "expectedOutput": "15\n"
          },
          {
                "input": "-20 30\n",
                "expectedOutput": "10\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0 0\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "1000000000 -500000000\n",
                "expectedOutput": "500000000\n"
          },
          {
                "input": "-100000000000 -200000000000\n",
                "expectedOutput": "-300000000000\n"
          },
          {
                "input": "42 0\n",
                "expectedOutput": "42\n"
          }
    ],
  },
  {
    slug: "practice-m2-p12-count-vowels-pointer-walk",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 12,
    title: "Count Vowels Using Pointer Traversal",
    difficulty: "EASY",
    category: "Pointers and Functions",
    tags: ["Pointers","Strings","Pointer Arithmetic","Characters"],
    description: `### Problem Description

Given a string \$S\$ consisting of alphanumeric characters without spaces, count the total number of vowels ('A', 'E', 'I', 'O', 'U', case-insensitive) by traversing the string character-by-character using a character pointer \`const char *ptr = s;\` rather than array indexing \`s[i]\`.

### Input Format
A single line containing string \$S\$ (\$1 \\le |S| \\le 1000\$).

### Output Format
Print the count of vowels followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <ctype.h>

int countVowels(const char *str) {
    // TODO: Traverse using pointer: while (*str) { ... str++; }
    return 0;
}

int main() {
    char str[1024];
    if (scanf("%1023s", str) != 1) return 0;
    printf("%d\\n", countVowels(str));
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <ctype.h>

int countVowels(const char *str) {
    int count = 0;
    const char *ptr = str;
    while (*ptr != '\\0') {
        char ch = tolower((unsigned char)*ptr);
        if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') {
            count++;
        }
        ptr++;
    }
    return count;
}

int main() {
    char str[1024];
    if (scanf("%1023s", str) != 1) return 0;
    printf("%d\\n", countVowels(str));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int countVowels(const char *str) {
    return 0;
}
int main() {
    char str[1024];
    scanf("%1023s", str);
    printf("%d\\n", countVowels(str));
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int countVowels(const char *str) {
    int c = 0;
    while (*str) { if (*str == 'a') c++; str++; } // Only counts lowercase 'a'
    return c;
}
int main() {
    char str[1024];
    scanf("%1023s", str);
    printf("%d\\n", countVowels(str));
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "LogicQ\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "EDUCATION\n",
                "expectedOutput": "5\n"
          }
    ],
    hiddenTests: [
          {
                "input": "rhythm\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "AEIOUaeiou\n",
                "expectedOutput": "10\n"
          },
          {
                "input": "CProgrammingLanguage\n",
                "expectedOutput": "7\n"
          },
          {
                "input": "pointer2024\n",
                "expectedOutput": "3\n"
          }
    ],
  },
  {
    slug: "practice-m2-p13-copy-string-pointers",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 13,
    title: "Custom String Copy via Pointer Arithmetic",
    difficulty: "EASY",
    category: "Pointers and Functions",
    tags: ["Pointers","Strings","Pointer Arithmetic","Idiom"],
    description: `### Problem Description

Implement the classic C idiomatic string copy function:
\`\`\`c
void myStrcpy(char *dest, const char *src);
\`\`\`
using the pointer copy idiom \`while ((*dest++ = *src++));\`.
Do not use \`strcpy\` from \`<string.h>\`.

### Input Format
A single line containing a word \$S\$ (\$1 \\le |S| \\le 500\$).

### Output Format
Print the copied string from the destination buffer followed by a newline.`,
    starterCode: `#include <stdio.h>

void myStrcpy(char *dest, const char *src) {
    // TODO: Copy src to dest using pointer arithmetic
}

int main() {
    char src[512], dest[512];
    if (scanf("%511s", src) != 1) return 0;
    myStrcpy(dest, src);
    printf("%s\\n", dest);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void myStrcpy(char *dest, const char *src) {
    while ((*dest++ = *src++));
}

int main() {
    char src[512], dest[512];
    if (scanf("%511s", src) != 1) return 0;
    myStrcpy(dest, src);
    printf("%s\\n", dest);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
void myStrcpy(char *dest, const char *src) {
    dest = (char*)src; // Shallow pointer copy, does not copy contents into dest buffer
}
int main() {
    char src[512], dest[512];
    scanf("%511s", src);
    myStrcpy(dest, src);
    printf("%s\\n", dest);
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("EMPTY\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "HelloLogicQ\n",
                "expectedOutput": "HelloLogicQ\n"
          },
          {
                "input": "C11Standards\n",
                "expectedOutput": "C11Standards\n"
          }
    ],
    hiddenTests: [
          {
                "input": "a\n",
                "expectedOutput": "a\n"
          },
          {
                "input": "PointerArithmeticIsFun\n",
                "expectedOutput": "PointerArithmeticIsFun\n"
          },
          {
                "input": "1234567890\n",
                "expectedOutput": "1234567890\n"
          }
    ],
  },
  {
    slug: "practice-m2-p14-recursive-sum-digits",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 14,
    title: "Recursive Sum of Digits",
    difficulty: "EASY",
    category: "Pointers and Functions",
    tags: ["Recursion","Functions","Digits","Math"],
    description: `### Problem Description

Write a recursive function \`long long sumDigits(long long n)\` that computes the sum of the decimal digits of a non-negative integer \$N\$.
The recursive definition is:
- Base case: If \$N < 10\$, return \$N\$.
- Recursive step: Return \$(N \\% 10) + \\text{sumDigits}(N / 10)\$.

### Input Format
A single non-negative 64-bit integer \$N\$ (\$0 \\le N \\le 10^{15}\$).

### Output Format
Print the sum of digits followed by a newline.`,
    starterCode: `#include <stdio.h>

long long sumDigits(long long n) {
    // TODO: Implement recursive sum of digits
    return 0;
}

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", sumDigits(n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long sumDigits(long long n) {
    if (n < 10) return n;
    return (n % 10) + sumDigits(n / 10);
}

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    printf("%lld\\n", sumDigits(n));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
long long sumDigits(long long n) {
    return n; // Misses recursion
}
int main() {
    long long n;
    scanf("%lld", &n);
    printf("%lld\\n", sumDigits(n));
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
long long sumDigits(long long n) {
    return n % 10; // Only returns last digit
}
int main() {
    long long n;
    scanf("%lld", &n);
    printf("%lld\\n", sumDigits(n));
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "12345\n",
                "expectedOutput": "15\n"
          },
          {
                "input": "0\n",
                "expectedOutput": "0\n"
          }
    ],
    hiddenTests: [
          {
                "input": "9\n",
                "expectedOutput": "9\n"
          },
          {
                "input": "999999999\n",
                "expectedOutput": "81\n"
          },
          {
                "input": "1000000000000000\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "876543210987654\n",
                "expectedOutput": "71\n"
          }
    ],
  },
  {
    slug: "practice-m2-p15-pointer-array-subtraction",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 15,
    title: "Pointer Subtraction Distance",
    difficulty: "MEDIUM",
    category: "Pointers and Functions",
    tags: ["Pointers","Pointer Arithmetic","ptrdiff_t","Arrays"],
    description: `### Problem Description

In C, subtracting two pointers that point to elements of the same array yields the number of elements between them (\`ptrdiff_t\`).

Given an array of \$N\$ integers and two values \$X\$ and \$Y\$ guaranteed to exist in the array, find the pointer distance \`ptrY - ptrX\` using pointer subtraction, where \`ptrX\` points to the first occurrence of \$X\$ and \`ptrY\` points to the first occurrence of \$Y\$.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 1000\$).
- Line 2: \$N\$ space-separated integers.
- Line 3: Two integers \$X\$ and \$Y\$.

### Output Format
Print the difference \`ptrY - ptrX\` (positive, negative, or zero) followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stddef.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int x, y;
    if (scanf("%d %d", &x, &y) != 2) return 0;
    
    // TODO: Locate pointers to x and y and print ptrY - ptrX
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stddef.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    int x, y;
    if (scanf("%d %d", &x, &y) != 2) return 0;

    int *ptrX = NULL;
    int *ptrY = NULL;

    for (int *p = arr; p < arr + n; p++) {
        if (!ptrX && *p == x) ptrX = p;
        if (!ptrY && *p == y) ptrY = p;
        if (ptrX && ptrY) break;
    }

    ptrdiff_t diff = ptrY - ptrX;
    printf("%td\\n", diff);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d\\n", y - x); // Subtracts values instead of pointers!
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "5\n10 20 30 40 50\n20 50\n",
                "expectedOutput": "3\n"
          },
          {
                "input": "5\n10 20 30 40 50\n40 10\n",
                "expectedOutput": "-3\n"
          }
    ],
    hiddenTests: [
          {
                "input": "4\n1 2 3 4\n2 2\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "6\n5 2 8 2 9 8\n5 9\n",
                "expectedOutput": "4\n"
          },
          {
                "input": "6\n5 2 8 2 9 8\n8 5\n",
                "expectedOutput": "-2\n"
          },
          {
                "input": "1\n42\n42 42\n",
                "expectedOutput": "0\n"
          }
    ],
  },
  {
    slug: "practice-m2-p16-recursive-palindrome-string",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 16,
    title: "Recursive String Palindrome Check",
    difficulty: "MEDIUM",
    category: "Pointers and Functions",
    tags: ["Recursion","Pointers","Strings","Palindrome"],
    description: `### Problem Description

Write a recursive function \`int isPalindrome(const char *left, const char *right)\` that determines whether a given word is a palindrome.
- If \`left >= right\`, return \$1\$ (true).
- If \`*left != *right\`, return \$0\$ (false).
- Otherwise, return \`isPalindrome(left + 1, right - 1)\`.

### Input Format
A single line containing string \$S\$ (\$1 \\le |S| \\le 500\$) without spaces.

### Output Format
Print \`YES\` if \$S\$ is a palindrome; otherwise, print \`NO\`.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int isPalindrome(const char *left, const char *right) {
    // TODO: Recursive palindrome check using pointers
    return 0;
}

int main() {
    char s[512];
    if (scanf("%511s", s) != 1) return 0;
    int len = strlen(s);
    if (isPalindrome(s, s + len - 1)) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int isPalindrome(const char *left, const char *right) {
    if (left >= right) return 1;
    if (*left != *right) return 0;
    return isPalindrome(left + 1, right - 1);
}

int main() {
    char s[512];
    if (scanf("%511s", s) != 1) return 0;
    int len = strlen(s);
    if (isPalindrome(s, s + len - 1)) {
        printf("YES\\n");
    } else {
        printf("NO\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("YES\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int isPalindrome(const char *left, const char *right) {
    return *left == *right; // Only checks first and last characters!
}
int main() {
    char s[512];
    scanf("%511s", s);
    printf("NO\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "racecar\n",
                "expectedOutput": "YES\n"
          },
          {
                "input": "logic\n",
                "expectedOutput": "NO\n"
          }
    ],
    hiddenTests: [
          {
                "input": "a\n",
                "expectedOutput": "YES\n"
          },
          {
                "input": "noon\n",
                "expectedOutput": "YES\n"
          },
          {
                "input": "deified\n",
                "expectedOutput": "YES\n"
          },
          {
                "input": "palindrome\n",
                "expectedOutput": "NO\n"
          },
          {
                "input": "abccba\n",
                "expectedOutput": "YES\n"
          },
          {
                "input": "abccbx\n",
                "expectedOutput": "NO\n"
          }
    ],
  },
  {
    slug: "practice-m2-p17-function-pointer-comparator-sort",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 17,
    title: "Function Pointer Comparator Sort",
    difficulty: "MEDIUM",
    category: "Pointers and Functions",
    tags: ["Function Pointers","Sorting","Callbacks","High-Order Functions"],
    description: `### Problem Description

Implement a sorting function \`void sortArray(int *arr, int n, int (*cmp)(int, int))\` that sorts an array of integers using a function pointer comparator callback.
- Comparator 1 (Ascending): returns positive if \$A > B\$.
- Comparator 2 (Descending): returns positive if \$A < B\$.

Given \$N\$, the sort mode (\$1\$ for ascending, \$2\$ for descending), and \$N\$ integers, sort the array using the appropriate comparator function pointer.

### Input Format
- Line 1: Two integers \$N\$ (\$1 \\le N \\le 500\$) and \$mode\$ (\$1\$ or \$2\$).
- Line 2: \$N\$ space-separated integers.

### Output Format
Print the sorted integers separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int cmpAsc(int a, int b) { return a - b; }
int cmpDesc(int a, int b) { return b - a; }

void sortArray(int *arr, int n, int (*cmp)(int, int)) {
    // TODO: Sort arr using comparator function pointer cmp
}

int main() {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2) return 0;
    int arr[505];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    // TODO: Call sortArray with appropriate function pointer
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int cmpAsc(int a, int b) { return a - b; }
int cmpDesc(int a, int b) { return b - a; }

void sortArray(int *arr, int n, int (*cmp)(int, int)) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (cmp(arr[j], arr[j + 1]) > 0) {
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}

int main() {
    int n, mode;
    if (scanf("%d %d", &n, &mode) != 2) return 0;
    int arr[505];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    
    int (*comparator)(int, int) = (mode == 1) ? cmpAsc : cmpDesc;
    sortArray(arr, n, comparator);
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n, mode;
    scanf("%d %d", &n, &mode);
    int arr[505];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "5 1\n40 10 50 20 30\n",
                "expectedOutput": "10 20 30 40 50\n"
          },
          {
                "input": "5 2\n40 10 50 20 30\n",
                "expectedOutput": "50 40 30 20 10\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 1\n42\n",
                "expectedOutput": "42\n"
          },
          {
                "input": "4 1\n-5 10 -20 0\n",
                "expectedOutput": "-20 -5 0 10\n"
          },
          {
                "input": "4 2\n-5 10 -20 0\n",
                "expectedOutput": "10 0 -5 -20\n"
          },
          {
                "input": "6 1\n3 3 2 2 1 1\n",
                "expectedOutput": "1 1 2 2 3 3\n"
          }
    ],
  },
  {
    slug: "practice-m2-p18-simulate-call-by-value-swap",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 18,
    title: "Call-by-Value vs Call-by-Reference Demonstration",
    difficulty: "MEDIUM",
    category: "Pointers and Functions",
    tags: ["Pointers","Call-by-Value","Call-by-Reference","Memory Model"],
    description: `### Problem Description

Demonstrate the difference between Call-by-Value and Call-by-Reference in C:
1. Write \`void swapByVal(int a, int b)\`: attempts to swap the parameters locally. Note that because C passes arguments by value (copying), the caller's variables remain untouched.
2. Write \`void swapByRef(int *a, int *b)\`: swaps values at the memory addresses pointed to by \`a\` and \`b\`.

Given two integers \$X\$ and \$Y\$, invoke \`swapByVal(x, y)\` and print the values of \`x\` and \`y\` (Line 1: \`AFTER VAL: X Y\`). Then invoke \`swapByRef(&x, &y)\` and print the updated values of \`x\` and \`y\` (Line 2: \`AFTER REF: Y X\`).

### Input Format
Two space-separated integers \$X\$ and \$Y\$.

### Output Format
- Line 1: \`AFTER VAL: X Y\`
- Line 2: \`AFTER REF: Y X\``,
    starterCode: `#include <stdio.h>

void swapByVal(int a, int b) {
    int t = a; a = b; b = t;
}

void swapByRef(int *a, int *b) {
    // TODO: Swap dereferenced values
}

int main() {
    int x, y;
    if (scanf("%d %d", &x, &y) != 2) return 0;
    swapByVal(x, y);
    printf("AFTER VAL: %d %d\\n", x, y);
    swapByRef(&x, &y);
    printf("AFTER REF: %d %d\\n", x, y);
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void swapByVal(int a, int b) {
    int t = a; a = b; b = t;
}

void swapByRef(int *a, int *b) {
    if (a && b) {
        int t = *a;
        *a = *b;
        *b = t;
    }
}

int main() {
    int x, y;
    if (scanf("%d %d", &x, &y) != 2) return 0;
    swapByVal(x, y);
    printf("AFTER VAL: %d %d\\n", x, y);
    swapByRef(&x, &y);
    printf("AFTER REF: %d %d\\n", x, y);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("AFTER VAL: %d %d\\nAFTER REF: %d %d\\n", x, y, x, y); // Did not swap in ref
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("AFTER VAL: 0 0\\nAFTER REF: 0 0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "10 20\n",
                "expectedOutput": "AFTER VAL: 10 20\nAFTER REF: 20 10\n"
          },
          {
                "input": "-5 99\n",
                "expectedOutput": "AFTER VAL: -5 99\nAFTER REF: 99 -5\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0 0\n",
                "expectedOutput": "AFTER VAL: 0 0\nAFTER REF: 0 0\n"
          },
          {
                "input": "1000 -1000\n",
                "expectedOutput": "AFTER VAL: 1000 -1000\nAFTER REF: -1000 1000\n"
          },
          {
                "input": "42 7\n",
                "expectedOutput": "AFTER VAL: 42 7\nAFTER REF: 7 42\n"
          }
    ],
  },
  {
    slug: "practice-m2-p19-ackermann-function-recursion",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 19,
    title: "Ackermann Deep Recursion Function",
    difficulty: "HARD",
    category: "Pointers and Functions",
    tags: ["Recursion","Functions","Non-Primitive Recursive","Stack Frames"],
    description: `### Problem Description

The Ackermann function \$A(m, n)\$ is a classic example of a computable function that is not primitive recursive:
- \$A(0, n) = n + 1\$
- \$A(m, 0) = A(m - 1, 1)\$ for \$m > 0\$
- \$A(m, n) = A(m - 1, A(m, n - 1))\$ for \$m > 0, n > 0\$.

Write a recursive C function to evaluate \$A(m, n)\$ for small non-negative integers \$m\$ and \$n\$.

### Input Format
Two space-separated non-negative integers \$m\$ and \$n\$ (\$0 \\le m \\le 3\$, \$0 \\le n \\le 10\$).

### Output Format
Print the computed value \$A(m, n)\$ followed by a newline.`,
    starterCode: `#include <stdio.h>

long long ackermann(int m, int n) {
    // TODO: Implement Ackermann recursive definition
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
    if (m > 0 && n == 0) return ackermann(m - 1, 1);
    return ackermann(m - 1, ackermann(m, n - 1));
}

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    printf("%lld\\n", ackermann(m, n));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int m, n;
    scanf("%d %d", &m, &n);
    printf("%d\\n", m + n); // Primitive addition bug
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1500,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "1 2\n",
                "expectedOutput": "4\n"
          },
          {
                "input": "2 2\n",
                "expectedOutput": "7\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0 5\n",
                "expectedOutput": "6\n"
          },
          {
                "input": "1 0\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "2 4\n",
                "expectedOutput": "11\n"
          },
          {
                "input": "3 2\n",
                "expectedOutput": "29\n"
          },
          {
                "input": "3 4\n",
                "expectedOutput": "125\n"
          }
    ],
  },
  {
    slug: "practice-m2-p20-generic-pointer-byte-scanner",
    moduleSlug: "pointers-and-functions",
    moduleOrder: 20,
    title: "Generic Pointer Memory Byte Inspector",
    difficulty: "HARD",
    category: "Pointers and Functions",
    tags: ["Pointers","Generic Pointers","void*","Endianness","Type Punning"],
    description: `### Problem Description

In low-level systems programming, \`void*\` and \`unsigned char*\` allow examining raw memory byte-by-byte.

Write a function \`void dumpBytes(const void *ptr, size_t size)\` that casts \`ptr\` to \`const unsigned char*\` and prints each byte formatted as a two-digit uppercase hexadecimal number with leading zeros (e.g. \`%02X\`), separated by a single space.

Given a 32-bit unsigned integer \$X\$, pass its address and \`sizeof(unsigned int)\` to the function to inspect how the architecture stores \$X\$ in RAM.

### Input Format
A single 32-bit unsigned integer \$X\$ (\$0 \\le X \\le 4294967295\$).

### Output Format
Print the \$4\$ hexadecimal bytes in memory order separated by spaces, followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stddef.h>

void dumpBytes(const void *ptr, size_t size) {
    // TODO: Cast to const unsigned char* and print each byte as %02X
}

int main() {
    unsigned int x;
    if (scanf("%u", &x) != 1) return 0;
    dumpBytes(&x, sizeof(x));
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stddef.h>

void dumpBytes(const void *ptr, size_t size) {
    const unsigned char *p = (const unsigned char *)ptr;
    for (size_t i = 0; i < size; i++) {
        printf("%02X%s", p[i], (i == size - 1) ? "" : " ");
    }
    printf("\\n");
}

int main() {
    unsigned int x;
    if (scanf("%u", &x) != 1) return 0;
    dumpBytes(&x, sizeof(x));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    unsigned int x;
    scanf("%u", &x);
    printf("%08X\\n", x); // Prints full int in big-endian presentation rather than memory byte order
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("00 00 00 00\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "305419896\n",
                "expectedOutput": "78 56 34 12\n"
          },
          {
                "input": "1\n",
                "expectedOutput": "01 00 00 00\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0\n",
                "expectedOutput": "00 00 00 00\n"
          },
          {
                "input": "255\n",
                "expectedOutput": "FF 00 00 00\n"
          },
          {
                "input": "4294967295\n",
                "expectedOutput": "FF FF FF FF\n"
          },
          {
                "input": "65535\n",
                "expectedOutput": "FF FF 00 00\n"
          }
    ],
  }
];
