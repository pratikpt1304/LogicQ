import { PracticeProblemDef } from './practice-module1.data';

export const PRACTICE_MODULE_3_PROBLEMS: PracticeProblemDef[] = [
  // 1. Easy: Array Sum and Maximum
  {
    slug: 'practice-m3-p1-array-sum-max',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 1,
    title: 'Array Sum and Maximum',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Sum', 'Max'],
    description: `### Problem Description

Given an array of $N$ integers, compute the sum of all elements and find the maximum element in the array.

### Input Format
First line: an integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the total sum and the maximum value separated by a space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Read array, compute sum and max
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long sum = 0;
    long long mx;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 0;
        if (i == 0 || x > mx) mx = x;
        sum += x;
    }
    printf("%lld %lld\\n", sum, mx);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("0 0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) { long long x; scanf("%lld", &x); sum += x; }
    printf("%lld 0\\n", sum); // Max is always 0 bug
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '5\n1 2 3 4 5\n', expectedOutput: '15 5\n' },
      { input: '3\n-10 -5 -20\n', expectedOutput: '-35 -5\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '42 42\n' },
      { input: '2\n-100 100\n', expectedOutput: '0 100\n' },
      { input: '4\n0 0 0 0\n', expectedOutput: '0 0\n' },
      { input: '5\n-1 -2 -3 -4 -5\n', expectedOutput: '-15 -1\n' },
      { input: '3\n1000000000 1000000000 1000000000\n', expectedOutput: '3000000000 1000000000\n' },
      { input: '6\n10 90 20 80 30 70\n', expectedOutput: '300 90\n' },
      { input: '4\n-500 500 -200 200\n', expectedOutput: '0 500\n' },
      { input: '5\n7 7 7 7 7\n', expectedOutput: '35 7\n' },
    ],
  },

  // 2. Easy: Linear Search with First Occurrence
  {
    slug: 'practice-m3-p2-linear-search-first-index',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 2,
    title: 'Linear Search First Occurrence',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Search', 'Linear Search'],
    description: `### Problem Description

Given an array of $N$ integers and a target key $K$, find the 0-based index of the first occurrence of $K$ in the array. If $K$ is not present, output \`-1\`.

### Input Format
First line: two integers $N$ and $K$ ($1 \\le N \\le 10^5$, $-10^9 \\le K \\le 10^9$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the 0-based index of the first occurrence of $K$, or \`-1\` if not found, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2) return 0;
    // TODO: Find first index of k or -1
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2) return 0;
    int ans = -1;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 0;
        if (x == k && ans == -1) {
            ans = i;
        }
    }
    printf("%d\\n", ans);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; long long k; if (scanf("%d %lld", &n, &k) != 2) return 0;
    printf("-1\\n"); // Always -1
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; long long k; if (scanf("%d %lld", &n, &k) != 2) return 0;
    int ans = -1;
    for (int i = 0; i < n; i++) {
        long long x; scanf("%lld", &x);
        if (x == k) ans = i; // Finds LAST occurrence instead of first!
    }
    printf("%d\\n", ans);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '5 3\n1 2 3 4 5\n', expectedOutput: '2\n' },
      { input: '4 10\n1 2 3 4\n', expectedOutput: '-1\n' },
    ],
    hiddenTests: [
      { input: '5 2\n2 2 2 2 2\n', expectedOutput: '0\n' },
      { input: '1 42\n42\n', expectedOutput: '0\n' },
      { input: '1 42\n99\n', expectedOutput: '-1\n' },
      { input: '6 -5\n10 20 -5 30 -5 40\n', expectedOutput: '2\n' },
      { input: '5 100\n10 20 30 40 100\n', expectedOutput: '4\n' },
      { input: '4 0\n-1 -2 -3 0\n', expectedOutput: '3\n' },
      { input: '7 77\n1 2 3 4 5 6 77\n', expectedOutput: '6\n' },
      { input: '3 99\n10 20 30\n', expectedOutput: '-1\n' },
    ],
  },

  // 3. Easy: Count Occurrences in Array
  {
    slug: 'practice-m3-p3-count-occurrences',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 3,
    title: 'Count Element Occurrences',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Frequency', 'Counting'],
    description: `### Problem Description

Given an array of $N$ integers and a query value $X$, count how many times $X$ appears in the array.

### Input Format
First line: two integers $N$ and $X$ ($1 \\le N \\le 10^5$, $-10^9 \\le X \\le 10^9$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the number of times $X$ occurs in the array, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    long long x;
    if (scanf("%d %lld", &n, &x) != 2) return 0;
    // TODO: Count occurrences of x
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    long long x;
    if (scanf("%d %lld", &n, &x) != 2) return 0;
    int count = 0;
    for (int i = 0; i < n; i++) {
        long long val;
        if (scanf("%lld", &val) != 1) return 0;
        if (val == x) count++;
    }
    printf("%d\\n", count);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; long long x; if (scanf("%d %lld", &n, &x) != 2) return 0;
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; long long x; if (scanf("%d %lld", &n, &x) != 2) return 0;
    printf("1\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '6 2\n1 2 2 3 2 4\n', expectedOutput: '3\n' },
      { input: '4 5\n1 2 3 4\n', expectedOutput: '0\n' },
    ],
    hiddenTests: [
      { input: '5 7\n7 7 7 7 7\n', expectedOutput: '5\n' },
      { input: '1 9\n9\n', expectedOutput: '1\n' },
      { input: '1 9\n8\n', expectedOutput: '0\n' },
      { input: '4 -10\n-10 10 -10 20\n', expectedOutput: '2\n' },
      { input: '8 0\n0 1 0 2 0 3 0 4\n', expectedOutput: '4\n' },
      { input: '5 100\n100 200 100 300 100\n', expectedOutput: '3\n' },
      { input: '6 42\n1 2 3 4 5 6\n', expectedOutput: '0\n' },
      { input: '3 -5\n-5 -5 -5\n', expectedOutput: '3\n' },
    ],
  },

  // 4. Easy: Second Largest Distinct Element
  {
    slug: 'practice-m3-p4-second-largest-distinct',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 4,
    title: 'Second Largest Distinct Element',
    difficulty: 'EASY',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Extrema', 'Logic'],
    description: `### Problem Description

Given an array of $N$ integers, find the second strictly largest distinct element. If no such element exists (i.e., all elements in the array are identical), output \`NO_SECOND_LARGEST\`.

### Input Format
First line: an integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the second strictly largest distinct integer or \`NO_SECOND_LARGEST\`, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Find second largest distinct element
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long first = -2000000000000000000LL;
    long long second = -2000000000000000000LL;
    int has_first = 0;
    int has_second = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 0;
        if (!has_first) {
            first = x;
            has_first = 1;
        } else if (x > first) {
            second = first;
            has_second = 1;
            first = x;
        } else if (x < first) {
            if (!has_second || x > second) {
                second = x;
                has_second = 1;
            }
        }
    }
    if (has_second) {
        printf("%lld\\n", second);
    } else {
        printf("NO_SECOND_LARGEST\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("NO_SECOND_LARGEST\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long a[100];
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    printf("%lld\\n", a[1]); // Simply prints second array element
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '5\n10 20 5 8 20\n', expectedOutput: '10\n' },
      { input: '3\n5 5 5\n', expectedOutput: 'NO_SECOND_LARGEST\n' },
    ],
    hiddenTests: [
      { input: '1\n100\n', expectedOutput: 'NO_SECOND_LARGEST\n' },
      { input: '2\n10 20\n', expectedOutput: '10\n' },
      { input: '4\n-10 -20 -5 -1\n', expectedOutput: '-5\n' },
      { input: '5\n100 100 100 100 99\n', expectedOutput: '99\n' },
      { input: '4\n0 -1 -2 -3\n', expectedOutput: '-1\n' },
      { input: '6\n7 2 9 4 9 8\n', expectedOutput: '8\n' },
      { input: '2\n-5 -5\n', expectedOutput: 'NO_SECOND_LARGEST\n' },
      { input: '5\n50 40 30 20 10\n', expectedOutput: '40\n' },
    ],
  },

  // 5. Medium: Array Left Rotation by K Positions
  {
    slug: 'practice-m3-p5-rotate-array-k',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 5,
    title: 'Array Left Rotation by K Positions',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Rotation', 'Algorithms'],
    description: `### Problem Description

Given an array of $N$ integers, perform a cyclic left rotation of the array by $K$ positions. That is, each element at index $i$ moves to $(i - K + N) \\pmod N$. Output the rotated array.

### Input Format
First line: two integers $N$ and $K$ ($1 \\le N \\le 10^5$, $0 \\le K \\le 10^9$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the $N$ integers after left-rotation, separated by spaces and followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n <= 0) return 0;
    // TODO: Left rotate array by k
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2 || n <= 0) return 0;
    k = k % n;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    for (int i = 0; i < n; i++) {
        int idx = (int)((i + k) % n);
        printf("%d%c", arr[idx], (i == n - 1 ? '\\n' : ' '));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; long long k; if (scanf("%d %lld", &n, &k) != 2) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    for (int i = 0; i < n; i++) printf("%d%c", arr[i], i == n - 1 ? '\\n' : ' '); // Does not rotate
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; long long k; if (scanf("%d %lld", &n, &k) != 2) return 0;
    for (int i = 0; i < n; i++) printf("0%c", i == n - 1 ? '\\n' : ' ');
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '5 2\n1 2 3 4 5\n', expectedOutput: '3 4 5 1 2\n' },
      { input: '4 0\n10 20 30 40\n', expectedOutput: '10 20 30 40\n' },
    ],
    hiddenTests: [
      { input: '1 5\n42\n', expectedOutput: '42\n' },
      { input: '3 3\n1 2 3\n', expectedOutput: '1 2 3\n' },
      { input: '4 1\n10 20 30 40\n', expectedOutput: '20 30 40 10\n' },
      { input: '5 7\n1 2 3 4 5\n', expectedOutput: '3 4 5 1 2\n' },
      { input: '6 4\n-1 -2 -3 -4 -5 -6\n', expectedOutput: '-5 -6 -1 -2 -3 -4\n' },
      { input: '5 1000000000\n10 20 30 40 50\n', expectedOutput: '10 20 30 40 50\n' },
      { input: '4 5\n100 200 300 400\n', expectedOutput: '200 300 400 100\n' },
      { input: '2 1\n7 9\n', expectedOutput: '9 7\n' },
    ],
  },

  // 6. Medium: Matrix Transpose and Row-Column Sums
  {
    slug: 'practice-m3-p6-matrix-transpose-sums',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 6,
    title: 'Matrix Row and Column Sums',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    tags: ['2D Arrays', 'Matrices', 'Row Sum', 'Col Sum'],
    description: `### Problem Description

Given a 2D matrix with $R$ rows and $C$ columns of integers:
1. Print the sum of each row, separated by spaces.
2. Print the sum of each column, separated by spaces.

### Input Format
First line: two integers $R$ and $C$ ($1 \\le R, C \\le 500$).
Next $R$ lines: each line contains $C$ space-separated integers ($-10^6 \\le M_{i,j} \\le 10^6$).

### Output Format
First line: $R$ space-separated integers representing row sums.
Second line: $C$ space-separated integers representing column sums.`,
    starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    // TODO: Calculate and print row sums and col sums
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    static long long row_sum[505];
    static long long col_sum[505];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            long long val;
            if (scanf("%lld", &val) != 1) return 0;
            row_sum[i] += val;
            col_sum[j] += val;
        }
    }
    for (int i = 0; i < r; i++) {
        printf("%lld%c", row_sum[i], (i == r - 1 ? '\\n' : ' '));
    }
    for (int j = 0; j < c; j++) {
        printf("%lld%c", col_sum[j], (j == c - 1 ? '\\n' : ' '));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    printf("0\\n0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    for (int i = 0; i < r; i++) printf("1%c", i == r - 1 ? '\\n' : ' ');
    for (int j = 0; j < c; j++) printf("1%c", j == c - 1 ? '\\n' : ' ');
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: '6 15\n5 7 9\n' },
      { input: '2 2\n-1 1\n2 -2\n', expectedOutput: '0 0\n1 -1\n' },
    ],
    hiddenTests: [
      { input: '1 1\n42\n', expectedOutput: '42\n42\n' },
      { input: '3 1\n10\n20\n30\n', expectedOutput: '10 20 30\n60\n' },
      { input: '1 3\n10 20 30\n', expectedOutput: '60\n10 20 30\n' },
      { input: '3 3\n1 0 0\n0 1 0\n0 0 1\n', expectedOutput: '1 1 1\n1 1 1\n' },
      { input: '2 4\n5 5 5 5\n10 10 10 10\n', expectedOutput: '20 40\n15 15 15 15\n' },
      { input: '3 2\n-5 5\n-10 10\n-20 20\n', expectedOutput: '0 0 0\n-35 35\n' },
      { input: '2 2\n100 200\n300 400\n', expectedOutput: '300 700\n400 600\n' },
      { input: '4 4\n1 1 1 1\n2 2 2 2\n3 3 3 3\n4 4 4 4\n', expectedOutput: '4 8 12 16\n10 10 10 10\n' },
    ],
  },

  // 7. Medium: Bubble Sort Swap Counter
  {
    slug: 'practice-m3-p7-bubble-sort-swaps',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 7,
    title: 'Bubble Sort and Swap Counter',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Sorting', 'Bubble Sort'],
    description: `### Problem Description

Given an array of $N$ integers, sort the array in ascending order using standard Bubble Sort. Count and output the total number of adjacent swaps performed during the sorting process, followed by the sorted array.

### Input Format
First line: an integer $N$ ($1 \\le N \\le 2000$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
First line: total number of swaps.
Second line: $N$ space-separated integers representing the sorted array.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Bubble sort with swap count
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    static long long arr[2005];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) return 0;
    }
    long long swaps = 0;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                long long t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
                swaps++;
            }
        }
    }
    printf("%lld\\n", swaps);
    for (int i = 0; i < n; i++) {
        printf("%lld%c", arr[i], (i == n - 1 ? '\\n' : ' '));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    static long long arr[2005];
    for (int i = 0; i < n; i++) scanf("%lld", &arr[i]);
    printf("0\\n");
    for (int i = 0; i < n; i++) printf("%lld%c", arr[i], i == n - 1 ? '\\n' : ' '); // Does not sort
    return 0;
}`,
    timeLimitMs: 1500,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '4\n4 3 2 1\n', expectedOutput: '6\n1 2 3 4\n' },
      { input: '3\n1 2 3\n', expectedOutput: '0\n1 2 3\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '0\n42\n' },
      { input: '2\n10 5\n', expectedOutput: '1\n5 10\n' },
      { input: '5\n5 1 4 2 8\n', expectedOutput: '4\n1 2 4 5 8\n' },
      { input: '4\n-1 -5 10 0\n', expectedOutput: '2\n-5 -1 0 10\n' },
      { input: '5\n2 2 2 2 2\n', expectedOutput: '0\n2 2 2 2 2\n' },
      { input: '6\n6 5 4 3 2 1\n', expectedOutput: '15\n1 2 3 4 5 6\n' },
      { input: '5\n100 -20 50 0 -10\n', expectedOutput: '7\n-20 -10 0 50 100\n' },
      { input: '3\n3 1 2\n', expectedOutput: '2\n1 2 3\n' },
    ],
  },

  // 8. Medium: Maximum Subarray Sum (Kadane's Algorithm)
  {
    slug: 'practice-m3-p8-kadanes-algorithm',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 8,
    title: 'Maximum Subarray Sum (Kadane)',
    difficulty: 'MEDIUM',
    category: 'Array and its Applications',
    tags: ['Arrays', 'Kadane', 'Dynamic Programming'],
    description: `### Problem Description

Given an array of $N$ integers, find the contiguous subarray (containing at least one element) which has the largest sum. Implement Kadane's algorithm to solve this in $O(N)$ time.

### Input Format
First line: an integer $N$ ($1 \\le N \\le 10^5$).
Second line: $N$ space-separated integers ($-10^9 \\le A_i \\le 10^9$).

### Output Format
Print the maximum contiguous subarray sum followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Kadane's maximum subarray sum
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long max_so_far = -2000000000000000000LL;
    long long current_sum = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 0;
        if (i == 0) {
            max_so_far = x;
            current_sum = x;
        } else {
            if (current_sum + x > x) {
                current_sum += x;
            } else {
                current_sum = x;
            }
            if (current_sum > max_so_far) {
                max_so_far = current_sum;
            }
        }
    }
    printf("%lld\\n", max_so_far);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long total = 0;
    for (int i = 0; i < n; i++) { long long x; scanf("%lld", &x); total += x; }
    printf("%lld\\n", total); // Sums entire array, misses negative subarrays
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '8\n-2 -3 4 -1 -2 1 5 -3\n', expectedOutput: '7\n' },
      { input: '4\n-5 -2 -8 -1\n', expectedOutput: '-1\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '42\n' },
      { input: '1\n-100\n', expectedOutput: '-100\n' },
      { input: '5\n1 2 3 4 5\n', expectedOutput: '15\n' },
      { input: '5\n-1 -2 -3 -4 -5\n', expectedOutput: '-1\n' },
      { input: '6\n5 -6 4 2 -1 3\n', expectedOutput: '8\n' },
      { input: '4\n10 -20 30 40\n', expectedOutput: '70\n' },
      { input: '6\n-2 1 -3 4 -1 2\n', expectedOutput: '5\n' },
      { input: '7\n-4 5 -2 3 -1 6 -8\n', expectedOutput: '11\n' },
    ],
  },

  // 9. Hard: Spiral Matrix Traversal
  {
    slug: 'practice-m3-p9-spiral-matrix-traversal',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 9,
    title: 'Spiral Matrix Traversal',
    difficulty: 'HARD',
    category: 'Array and its Applications',
    tags: ['2D Arrays', 'Matrices', 'Spiral Traversal'],
    description: `### Problem Description

Given a 2D matrix of $R$ rows and $C$ columns, traverse all elements of the matrix in spiral order starting from top-left $(0, 0)$ and moving clockwise (right $\\to$ down $\\to$ left $\\to$ up).

### Input Format
First line: two integers $R$ and $C$ ($1 \\le R, C \\le 100$).
Next $R$ lines: each line contains $C$ space-separated integers ($-10^9 \\le M_{i,j} \\le 10^9$).

### Output Format
Print the matrix elements in spiral order on a single line, separated by spaces and followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    // TODO: Spiral order traversal
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    static long long mat[105][105];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            if (scanf("%lld", &mat[i][j]) != 1) return 0;
        }
    }
    int top = 0, bottom = r - 1, left = 0, right = c - 1;
    int first = 1;
    while (top <= bottom && left <= right) {
        // Traverse Right
        for (int j = left; j <= right; j++) {
            if (!first) printf(" ");
            printf("%lld", mat[top][j]);
            first = 0;
        }
        top++;

        // Traverse Down
        for (int i = top; i <= bottom; i++) {
            if (!first) printf(" ");
            printf("%lld", mat[i][right]);
            first = 0;
        }
        right--;

        // Traverse Left
        if (top <= bottom) {
            for (int j = right; j >= left; j--) {
                if (!first) printf(" ");
                printf("%lld", mat[bottom][j]);
                first = 0;
            }
            bottom--;
        }

        // Traverse Up
        if (left <= right) {
            for (int i = bottom; i >= top; i--) {
                if (!first) printf(" ");
                printf("%lld", mat[i][left]);
                first = 0;
            }
            left++;
        }
    }
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    for (int i = 0; i < r * c; i++) { long long x; scanf("%lld", &x); printf("%lld%c", x, i == r * c - 1 ? '\\n' : ' '); } // Row-major order
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9\n', expectedOutput: '1 2 3 6 9 8 7 4 5\n' },
      { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: '1 2 3 6 5 4\n' },
    ],
    hiddenTests: [
      { input: '1 1\n42\n', expectedOutput: '42\n' },
      { input: '1 4\n1 2 3 4\n', expectedOutput: '1 2 3 4\n' },
      { input: '4 1\n1\n2\n3\n4\n', expectedOutput: '1 2 3 4\n' },
      { input: '2 2\n1 2\n3 4\n', expectedOutput: '1 2 4 3\n' },
      { input: '3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n', expectedOutput: '1 2 3 4 8 12 11 10 9 5 6 7\n' },
      { input: '4 3\n1 2 3\n4 5 6\n7 8 9\n10 11 12\n', expectedOutput: '1 2 3 6 9 12 11 10 7 4 5 8\n' },
      { input: '4 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n', expectedOutput: '1 2 3 4 8 12 16 15 14 13 9 5 6 7 11 10\n' },
      { input: '3 2\n1 2\n3 4\n5 6\n', expectedOutput: '1 2 4 6 5 3\n' },
    ],
  },

  // 10. Hard: Matrix Multiplication (A x B)
  {
    slug: 'practice-m3-p10-matrix-multiplication',
    moduleSlug: 'array-and-its-applications',
    moduleOrder: 10,
    title: 'Matrix Multiplication',
    difficulty: 'HARD',
    category: 'Array and its Applications',
    tags: ['2D Arrays', 'Matrices', 'Matrix Multiplication'],
    description: `### Problem Description

Given a matrix $A$ of dimensions $N \\times M$ and a matrix $B$ of dimensions $M \\times K$, compute their matrix product $C = A \\times B$ of dimensions $N \\times K$, where $C_{i,j} = \\sum_{p=0}^{M-1} A_{i,p} \\times B_{p,j}$.

### Input Format
First line: three integers $N, M, K$ ($1 \\le N, M, K \\le 100$).
Next $N$ lines: each line contains $M$ space-separated integers for matrix $A$ ($-10^4 \\le A_{i,j} \\le 10^4$).
Next $M$ lines: each line contains $K$ space-separated integers for matrix $B$ ($-10^4 \\le B_{i,j} \\le 10^4$).

### Output Format
Print the $N \\times K$ result matrix $C$, with each row containing $K$ space-separated integers followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n, m, k;
    if (scanf("%d %d %d", &n, &m, &k) != 3 || n <= 0 || m <= 0 || k <= 0) return 0;
    // TODO: Multiply matrices A (n x m) and B (m x k)
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n, m, k;
    if (scanf("%d %d %d", &n, &m, &k) != 3 || n <= 0 || m <= 0 || k <= 0) return 0;
    static long long a[105][105];
    static long long b[105][105];
    static long long c[105][105];

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            if (scanf("%lld", &a[i][j]) != 1) return 0;
        }
    }

    for (int i = 0; i < m; i++) {
        for (int j = 0; j < k; j++) {
            if (scanf("%lld", &b[i][j]) != 1) return 0;
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < k; j++) {
            long long sum = 0;
            for (int p = 0; p < m; p++) {
                sum += a[i][p] * b[p][j];
            }
            c[i][j] = sum;
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < k; j++) {
            printf("%lld%c", c[i][j], (j == k - 1 ? '\\n' : ' '));
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n, m, k; if (scanf("%d %d %d", &n, &m, &k) != 3) return 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < k; j++) printf("0%c", j == k - 1 ? '\\n' : ' ');
    }
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n, m, k; if (scanf("%d %d %d", &n, &m, &k) != 3) return 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < k; j++) printf("1%c", j == k - 1 ? '\\n' : ' ');
    }
    return 0;
}`,
    timeLimitMs: 1500,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      {
        input: '2 2 2\n1 2\n3 4\n5 6\n7 8\n',
        expectedOutput: '19 22\n43 50\n',
      },
      {
        input: '1 2 1\n2 3\n4\n5\n',
        expectedOutput: '23\n',
      },
    ],
    hiddenTests: [
      {
        input: '1 1 1\n5\n7\n',
        expectedOutput: '35\n',
      },
      {
        input: '2 3 2\n1 2 3\n4 5 6\n1 0\n0 1\n1 1\n',
        expectedOutput: '4 5\n10 11\n',
      },
      {
        input: '2 2 3\n1 0\n0 1\n5 6 7\n8 9 10\n',
        expectedOutput: '5 6 7\n8 9 10\n',
      },
      {
        input: '3 3 3\n1 0 0\n0 1 0\n0 0 1\n10 20 30\n40 50 60\n70 80 90\n',
        expectedOutput: '10 20 30\n40 50 60\n70 80 90\n',
      },
      {
        input: '2 2 2\n0 0\n0 0\n1 2\n3 4\n',
        expectedOutput: '0 0\n0 0\n',
      },
      {
        input: '2 2 2\n-1 2\n3 -4\n2 -1\n-3 4\n',
        expectedOutput: '-8 9\n18 -19\n',
      },
      {
        input: '3 1 3\n2\n3\n4\n5 6 7\n',
        expectedOutput: '10 12 14\n15 18 21\n20 24 28\n',
      },
      {
        input: '2 2 2\n10 20\n30 40\n1 2\n3 4\n',
        expectedOutput: '70 100\n150 220\n',
      },
    ],
  },
];
