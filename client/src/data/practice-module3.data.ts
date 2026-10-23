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

Given an array of N integers, compute the sum of all elements and find the maximum element in the array.

### Input Format
First line: an integer N (1 ≤ N ≤ 10⁵).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

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

Given an array of N integers and a target key K, find the 0-based index of the first occurrence of K in the array. If K is not present, output \`-1\`.

### Input Format
First line: two integers N and K (1 ≤ N ≤ 10⁵, −10⁹ ≤ K ≤ 10⁹).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
Print the 0-based index of the first occurrence of K, or \`-1\` if not found, followed by a newline.`,
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

Given an array of N integers and a query value X, count how many times X appears in the array.

### Input Format
First line: two integers N and X (1 ≤ N ≤ 10⁵, −10⁹ ≤ X ≤ 10⁹).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
Print the number of times X occurs in the array, followed by a newline.`,
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

Given an array of N integers, find the second strictly largest distinct element. If no such element exists (i.e., all elements in the array are identical), output \`NO_SECOND_LARGEST\`.

### Input Format
First line: an integer N (1 ≤ N ≤ 10⁵).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

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

Given an array of N integers, perform a cyclic left rotation of the array by K positions. That is, each element at index i moves to (i - K + N) pmod N. Output the rotated array.

### Input Format
First line: two integers N and K (1 ≤ N ≤ 10⁵, 0 ≤ K ≤ 10⁹).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
Print the N integers after left-rotation, separated by spaces and followed by a newline.`,
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

Given a 2D matrix with R rows and C columns of integers:
1. Print the sum of each row, separated by spaces.
2. Print the sum of each column, separated by spaces.

### Input Format
First line: two integers R and C (1 ≤ R, C ≤ 500).
Next R lines: each line contains C space-separated integers (−10⁶ ≤ M_{i,j} ≤ 10⁶).

### Output Format
First line: R space-separated integers representing row sums.
Second line: C space-separated integers representing column sums.`,
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

Given an array of N integers, sort the array in ascending order using standard Bubble Sort. Count and output the total number of adjacent swaps performed during the sorting process, followed by the sorted array.

### Input Format
First line: an integer N (1 ≤ N ≤ 2000).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
First line: total number of swaps.
Second line: N space-separated integers representing the sorted array.`,
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

Given an array of N integers, find the contiguous subarray (containing at least one element) which has the largest sum. Implement Kadane's algorithm to solve this in O(N) time.

### Input Format
First line: an integer N (1 ≤ N ≤ 10⁵).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

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

Given a 2D matrix of R rows and C columns, traverse all elements of the matrix in spiral order starting from top-left (0, 0) and moving clockwise (right → down → left → up).

### Input Format
First line: two integers R and C (1 ≤ R, C ≤ 100).
Next R lines: each line contains C space-separated integers (−10⁹ ≤ M_{i,j} ≤ 10⁹).

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

Given a matrix A of dimensions N × M and a matrix B of dimensions M × K, compute their matrix product C = A × B of dimensions N × K, where C_{i,j} = sum_{p=0}^{M-1} A_{i,p} × B_{p,j}.

### Input Format
First line: three integers N, M, K (1 ≤ N, M, K ≤ 100).
Next N lines: each line contains M space-separated integers for matrix A (−10⁴ ≤ A_{i,j} ≤ 10⁴).
Next M lines: each line contains K space-separated integers for matrix B (−10⁴ ≤ B_{i,j} ≤ 10⁴).

### Output Format
Print the N × K result matrix C, with each row containing K space-separated integers followed by a newline.`,
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
  {
    slug: "practice-m3-p11-array-element-frequency",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 11,
    title: "Array Element Frequency Counter",
    difficulty: "EASY",
    category: "Array and its Applications",
    tags: ["Arrays","Frequency Array","Counting","Hashing"],
    description: `### Problem Description

Given an array of \$N\$ integers where each integer is between \$0\$ and \$100\$ inclusive, count the frequency of each distinct number present in the array.
Print each distinct number and its frequency in ascending order of the number:
\`val: count\`

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 1000\$).
- Line 2: \$N\$ space-separated integers (\$0 \\le A[i] \\le 100\$).

### Output Format
For each distinct element present in the array in ascending order, print \`val: count\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Count frequencies and print in ascending order
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int freq[105] = {0};
    for (int i = 0; i < n; i++) {
        int x;
        if (scanf("%d", &x) == 1) {
            if (x >= 0 && x <= 100) freq[x]++;
        }
    }
    for (int i = 0; i <= 100; i++) {
        if (freq[i] > 0) {
            printf("%d: %d\\n", i, freq[i]);
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0: 1\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    printf("%d: 1\\n", n);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "6\n10 20 10 30 20 10\n",
                "expectedOutput": "10: 3\n20: 2\n30: 1\n"
          },
          {
                "input": "3\n5 5 5\n",
                "expectedOutput": "5: 3\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n0\n",
                "expectedOutput": "0: 1\n"
          },
          {
                "input": "5\n100 0 100 0 50\n",
                "expectedOutput": "0: 2\n50: 1\n100: 2\n"
          },
          {
                "input": "8\n1 2 3 4 5 6 7 8\n",
                "expectedOutput": "1: 1\n2: 1\n3: 1\n4: 1\n5: 1\n6: 1\n7: 1\n8: 1\n"
          }
    ],
  },
  {
    slug: "practice-m3-p12-is-array-sorted-checker",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 12,
    title: "Monotonic Sorted Array Verification",
    difficulty: "EASY",
    category: "Array and its Applications",
    tags: ["Arrays","Verification","Linear Scan","Invariants"],
    description: `### Problem Description

Given an array of \$N\$ integers, check whether the array is sorted in non-decreasing order (\$A[i] \\le A[i+1]\$ for all \$0 \\le i < N - 1\$).
Print \`SORTED\` if it is sorted; otherwise, print \`NOT SORTED\`.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 10^5\$).
- Line 2: \$N\$ space-separated integers (\$-10^9 \\le A[i] \\le 10^9\$).

### Output Format
Print \`SORTED\` or \`NOT SORTED\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Verify if array is sorted non-decreasingly
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long prev = -2000000000LL;
    int isSorted = 1;
    for (int i = 0; i < n; i++) {
        long long curr;
        if (scanf("%lld", &curr) != 1) return 0;
        if (i > 0 && curr < prev) {
            isSorted = 0;
        }
        prev = curr;
    }
    if (isSorted) printf("SORTED\\n");
    else printf("NOT SORTED\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("SORTED\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("NOT SORTED\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "5\n1 2 2 4 5\n",
                "expectedOutput": "SORTED\n"
          },
          {
                "input": "4\n10 20 15 30\n",
                "expectedOutput": "NOT SORTED\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n42\n",
                "expectedOutput": "SORTED\n"
          },
          {
                "input": "3\n5 4 3\n",
                "expectedOutput": "NOT SORTED\n"
          },
          {
                "input": "6\n-10 -5 -5 0 100 1000\n",
                "expectedOutput": "SORTED\n"
          },
          {
                "input": "2\n10 9\n",
                "expectedOutput": "NOT SORTED\n"
          }
    ],
  },
  {
    slug: "practice-m3-p13-matrix-diagonal-sum",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 13,
    title: "Square Matrix Dual Diagonal Sum",
    difficulty: "EASY",
    category: "Array and its Applications",
    tags: ["2D Arrays","Matrices","Diagonals","Linear Algebra"],
    description: `### Problem Description

Given an \$N \\times N\$ square matrix of integers, calculate the total sum of elements on both its primary diagonal (\$i = j\$) and secondary diagonal (\$i + j = N - 1\$).
If \$N\$ is odd, the central element belongs to both diagonals, but it must be counted **only once** in the final sum.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 100\$).
- Next \$N\$ lines: Each contains \$N\$ space-separated integers (\$-1000 \\le M_{i,j} \\le 1000\$).

### Output Format
Print the diagonal sum followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Calculate primary and secondary diagonal sum
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            long long val;
            if (scanf("%lld", &val) != 1) return 0;
            if (i == j || (i + j == n - 1)) {
                sum += val;
            }
        }
    }
    printf("%lld\\n", sum);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            long long val;
            scanf("%lld", &val);
            if (i == j) sum += val; // Only primary diagonal
        }
    }
    printf("%lld\\n", sum);
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "3\n1 2 3\n4 5 6\n7 8 9\n",
                "expectedOutput": "25\n"
          },
          {
                "input": "2\n1 1\n1 1\n",
                "expectedOutput": "4\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n10\n",
                "expectedOutput": "10\n"
          },
          {
                "input": "4\n1 0 0 1\n0 2 2 0\n0 3 3 0\n4 0 0 4\n",
                "expectedOutput": "16\n"
          },
          {
                "input": "3\n-1 -2 -3\n-4 -5 -6\n-7 -8 -9\n",
                "expectedOutput": "-25\n"
          }
    ],
  },
  {
    slug: "practice-m3-p14-merge-two-sorted-arrays",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 14,
    title: "Merge Two Sorted Arrays in Linear Time",
    difficulty: "EASY",
    category: "Array and its Applications",
    tags: ["Arrays","Two Pointers","Merge Sort","Linear Time"],
    description: `### Problem Description

Given two sorted arrays \$A\$ of size \$N\$ and \$B\$ of size \$M\$, merge them into a single sorted array of size \$N + M\$ in \$O(N + M)\$ time using the two-pointer merging technique.

### Input Format
- Line 1: Two integers \$N\$ and \$M\$ (\$1 \\le N, M \\le 1000\$).
- Line 2: \$N\$ sorted integers for array \$A\$.
- Line 3: \$M\$ sorted integers for array \$B\$.

### Output Format
Print the \$N + M\$ merged sorted integers separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    
    // TODO: Read arrays and merge in O(N + M)
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    int a[1005], b[1005];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int j = 0; j < m; j++) scanf("%d", &b[j]);

    int i = 0, j = 0, first = 1;
    while (i < n && j < m) {
        if (a[i] <= b[j]) {
            printf("%s%d", first ? "" : " ", a[i++]);
        } else {
            printf("%s%d", first ? "" : " ", b[j++]);
        }
        first = 0;
    }
    while (i < n) {
        printf("%s%d", first ? "" : " ", a[i++]);
        first = 0;
    }
    while (j < m) {
        printf("%s%d", first ? "" : " ", b[j++]);
        first = 0;
    }
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    int a[1005], b[1005];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int j = 0; j < m; j++) scanf("%d", &b[j]);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    for (int j = 0; j < m; j++) printf("%d ", b[j]); // Just concatenates without sorting
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "3 3\n1 3 5\n2 4 6\n",
                "expectedOutput": "1 2 3 4 5 6\n"
          },
          {
                "input": "2 3\n10 20\n5 15 25\n",
                "expectedOutput": "5 10 15 20 25\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 1\n1\n2\n",
                "expectedOutput": "1 2\n"
          },
          {
                "input": "4 1\n1 2 3 4\n0\n",
                "expectedOutput": "0 1 2 3 4\n"
          },
          {
                "input": "3 3\n-5 0 5\n-10 0 10\n",
                "expectedOutput": "-10 -5 0 0 5 10\n"
          }
    ],
  },
  {
    slug: "practice-m3-p15-two-sum-sorted-pairs",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 15,
    title: "Two Sum in Sorted Array via Inward Pointers",
    difficulty: "MEDIUM",
    category: "Array and its Applications",
    tags: ["Two Pointers","Searching","Arrays","Two Sum"],
    description: `### Problem Description

Given a sorted array of \$N\$ distinct integers in ascending order and a target sum \$T\$, determine if there exist two elements \$A[i]\$ and \$A[j]\$ (\$i < j\$) such that \$A[i] + A[j] = T\$.
Use the optimal \$O(N)\$ two-pointer approach starting with \`left = 0\` and \`right = N - 1\`.

If found, print \`YES A[i] A[j]\`.
If no such pair exists, print \`NO\`.

### Input Format
- Line 1: Two integers \$N\$ (\$2 \\le N \\le 10^5\$) and \$T\$ (\$-2 \\cdot 10^9 \\le T \\le 2 \\cdot 10^9\$).
- Line 2: \$N\$ space-separated sorted integers.

### Output Format
Print \`YES A[i] A[j]\` with \$A[i] < A[j]\$, or \`NO\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    
    // TODO: Two pointers two-sum check
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    static long long arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) return 0;
    }
    int left = 0, right = n - 1;
    int found = 0;
    while (left < right) {
        long long sum = arr[left] + arr[right];
        if (sum == target) {
            printf("YES %lld %lld\\n", arr[left], arr[right]);
            found = 1;
            break;
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    if (!found) {
        printf("NO\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("NO\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("YES 0 0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "5 9\n1 2 4 7 11\n",
                "expectedOutput": "YES 2 7\n"
          },
          {
                "input": "4 10\n1 2 3 4\n",
                "expectedOutput": "NO\n"
          }
    ],
    hiddenTests: [
          {
                "input": "2 5\n2 3\n",
                "expectedOutput": "YES 2 3\n"
          },
          {
                "input": "6 0\n-10 -5 0 2 5 12\n",
                "expectedOutput": "YES -5 5\n"
          },
          {
                "input": "5 100\n10 20 30 40 50\n",
                "expectedOutput": "NO\n"
          },
          {
                "input": "4 2000000000\n100000000 500000000 1000000000 1500000000\n",
                "expectedOutput": "YES 500000000 1500000000\n"
          }
    ],
  },
  {
    slug: "practice-m3-p16-matrix-boundary-traversal",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 16,
    title: "Matrix Boundary Clockwise Traversal",
    difficulty: "MEDIUM",
    category: "Array and its Applications",
    tags: ["2D Arrays","Matrices","Traversal","Geometry"],
    description: `### Problem Description

Given an \$R \\times C\$ matrix, traverse and print its boundary elements in clockwise order starting from the top-left \$(0, 0)\$:
1. Top row from left to right.
2. Right column from row \$1\$ to \$R - 1\$.
3. Bottom row from column \$C - 2\$ down to \$0\$ (if \$R > 1\$).
4. Left column from row \$R - 2\$ up to \$1\$ (if \$C > 1\$).

### Input Format
- Line 1: Two integers \$R\$ and \$C\$ (\$1 \\le R, C \\le 100\$).
- Next \$R\$ lines: Each contains \$C\$ space-separated integers.

### Output Format
Print the boundary elements separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    // TODO: Traverse boundary in clockwise order
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    static int mat[105][105];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    int first = 1;
    // Top row
    for (int j = 0; j < c; j++) {
        printf("%s%d", first ? "" : " ", mat[0][j]);
        first = 0;
    }
    // Right column
    for (int i = 1; i < r; i++) {
        printf("%s%d", first ? "" : " ", mat[i][c - 1]);
        first = 0;
    }
    // Bottom row
    if (r > 1) {
        for (int j = c - 2; j >= 0; j--) {
            printf("%s%d", first ? "" : " ", mat[r - 1][j]);
            first = 0;
        }
    }
    // Left column
    if (c > 1) {
        for (int i = r - 2; i >= 1; i--) {
            printf("%s%d", first ? "" : " ", mat[i][0]);
            first = 0;
        }
    }
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int r, c;
    scanf("%d %d", &r, &c);
    for (int i = 0; i < r * c; i++) printf("1 ");
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "3 3\n1 2 3\n4 5 6\n7 8 9\n",
                "expectedOutput": "1 2 3 6 9 8 7 4\n"
          },
          {
                "input": "2 2\n1 2\n3 4\n",
                "expectedOutput": "1 2 4 3\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 4\n10 20 30 40\n",
                "expectedOutput": "10 20 30 40\n"
          },
          {
                "input": "4 1\n5\n6\n7\n8\n",
                "expectedOutput": "5 6 7 8\n"
          },
          {
                "input": "4 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n",
                "expectedOutput": "1 2 3 4 8 12 16 15 14 13 9 5\n"
          }
    ],
  },
  {
    slug: "practice-m3-p17-array-equilibrium-index",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 17,
    title: "Array Equilibrium Balance Point",
    difficulty: "MEDIUM",
    category: "Array and its Applications",
    tags: ["Arrays","Prefix Sum","Equilibrium","Linear Scan"],
    description: `### Problem Description

An equilibrium index of an array is an index \$i\$ (\$0 \\le i < N\$) such that the sum of elements at lower indices equals the sum of elements at higher indices:
\$\$\\sum_{k=0}^{i-1} A[k] = \\sum_{k=i+1}^{N-1} A[k]\$\$
(By convention, the sum of zero elements is \$0\$).

Given an array of \$N\$ integers, find the **first** (minimum) 0-based equilibrium index. If no equilibrium index exists, print \`-1\`.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 10^5\$).
- Line 2: \$N\$ space-separated integers.

### Output Format
Print the first equilibrium index or \`-1\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Find first equilibrium index in O(N)
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    static long long arr[100005];
    long long totalSum = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) return 0;
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
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("-1\\n");
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
                "input": "7\n-7 1 5 2 -4 3 0\n",
                "expectedOutput": "3\n"
          },
          {
                "input": "3\n1 2 3\n",
                "expectedOutput": "-1\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n100\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "2\n0 5\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "5\n1 2 3 2 1\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "4\n2 -2 2 -2\n",
                "expectedOutput": "-1\n"
          }
    ],
  },
  {
    slug: "practice-m3-p18-majority-element-moore-voting",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 18,
    title: "Majority Element via Boyer-Moore Voting",
    difficulty: "MEDIUM",
    category: "Array and its Applications",
    tags: ["Boyer-Moore","Majority Element","Arrays","Linear Time"],
    description: `### Problem Description

Given an array of \$N\$ integers, find the majority element. A majority element is an element that appears **strictly more than** \$\\lfloor N / 2 \\rfloor\$ times in the array.
Implement the Boyer-Moore Voting Algorithm in \$O(N)\$ time and \$O(1)\$ auxiliary space.

If a majority element exists, print it. Otherwise, print \`NO MAJORITY\`.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 10^5\$).
- Line 2: \$N\$ space-separated integers.

### Output Format
Print the majority element value or \`NO MAJORITY\` followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Boyer-Moore voting algorithm
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    static int arr[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &arr[i]) != 1) return 0;
    }
    // Phase 1: Candidate selection
    int candidate = 0, count = 0;
    for (int i = 0; i < n; i++) {
        if (count == 0) {
            candidate = arr[i];
            count = 1;
        } else if (arr[i] == candidate) {
            count++;
        } else {
            count--;
        }
    }
    // Phase 2: Verification
    int actualCount = 0;
    for (int i = 0; i < n; i++) {
        if (arr[i] == candidate) actualCount++;
    }
    if (actualCount > n / 2) {
        printf("%d\\n", candidate);
    } else {
        printf("NO MAJORITY\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("NO MAJORITY\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    int first;
    scanf("%d", &first);
    printf("%d\\n", first); // Assumes first element is always majority
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "7\n2 2 1 1 1 2 2\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "4\n1 2 3 4\n",
                "expectedOutput": "NO MAJORITY\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n99\n",
                "expectedOutput": "99\n"
          },
          {
                "input": "5\n3 3 4 2 4\n",
                "expectedOutput": "NO MAJORITY\n"
          },
          {
                "input": "9\n1 1 1 1 1 2 3 4 5\n",
                "expectedOutput": "1\n"
          },
          {
                "input": "6\n10 10 10 20 20 20\n",
                "expectedOutput": "NO MAJORITY\n"
          }
    ],
  },
  {
    slug: "practice-m3-p19-trapping-rainwater-histogram",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 19,
    title: "Trapping Rainwater Elevation Histogram",
    difficulty: "HARD",
    category: "Array and its Applications",
    tags: ["Two Pointers","Dynamic Programming","Histogram","Water Trapping"],
    description: `### Problem Description

Given an array of \$N\$ non-negative integers representing an elevation map where the width of each bar is \$1\$, compute how much rainwater can be trapped between the bars after a downpour.

Solve in \$O(N)\$ time and \$O(1)\$ auxiliary space using two pointers.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 10^5\$).
- Line 2: \$N\$ non-negative integers (\$0 \\le H[i] \\le 10^9\$).

### Output Format
Print the total volume of trapped water as a 64-bit integer followed by a newline.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Calculate trapped rainwater in O(N)
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    static long long h[100005];
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &h[i]) != 1) return 0;
    }
    int left = 0, right = n - 1;
    long long leftMax = 0, rightMax = 0;
    unsigned long long trapped = 0;
    while (left <= right) {
        if (h[left] <= h[right]) {
            if (h[left] >= leftMax) {
                leftMax = h[left];
            } else {
                trapped += (leftMax - h[left]);
            }
            left++;
        } else {
            if (h[right] >= rightMax) {
                rightMax = h[right];
            } else {
                trapped += (rightMax - h[right]);
            }
            right--;
        }
    }
    printf("%llu\\n", trapped);
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
    printf("%d\\n", n);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "12\n0 1 0 2 1 0 1 3 2 1 2 1\n",
                "expectedOutput": "6\n"
          },
          {
                "input": "6\n4 2 0 3 2 5\n",
                "expectedOutput": "9\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n5\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "3\n2 0 2\n",
                "expectedOutput": "2\n"
          },
          {
                "input": "5\n5 4 3 2 1\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "5\n1 2 3 4 5\n",
                "expectedOutput": "0\n"
          },
          {
                "input": "5\n3 0 0 0 3\n",
                "expectedOutput": "9\n"
          }
    ],
  },
  {
    slug: "practice-m3-p20-matrix-rotate-90-clockwise-inplace",
    moduleSlug: "array-and-its-applications",
    moduleOrder: 20,
    title: "In-Place Matrix Rotation 90 Degrees Clockwise",
    difficulty: "HARD",
    category: "Array and its Applications",
    tags: ["2D Arrays","In-Place","Linear Algebra","Matrix Rotation"],
    description: `### Problem Description

Given an \$N \\times N\$ square matrix of integers, rotate the matrix \$90^\\circ\$ clockwise **in-place** without allocating a second matrix.
The standard mathematical decomposition is:
1. **Transpose** the matrix: Swap \$M[i][j]\$ with \$M[j][i]\$ for all \$i < j\$.
2. **Reverse each row**: Swap elements from both ends towards the center.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 100\$).
- Next \$N\$ lines: Each contains \$N\$ space-separated integers.

### Output Format
Print the \$N \\times N\$ rotated matrix, each row on a new line with space-separated values without trailing spaces.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Rotate matrix in-place by transpose + row reversal
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    static int mat[105][105];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    // Step 1: Transpose
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int tmp = mat[i][j];
            mat[i][j] = mat[j][i];
            mat[j][i] = tmp;
        }
    }
    // Step 2: Reverse each row
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n / 2; j++) {
            int tmp = mat[i][j];
            mat[i][j] = mat[i][n - 1 - j];
            mat[i][n - 1 - j] = tmp;
        }
    }
    // Output
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], (j == n - 1) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("0%s", j == n - 1 ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("1\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "3\n1 2 3\n4 5 6\n7 8 9\n",
                "expectedOutput": "7 4 1\n8 5 2\n9 6 3\n"
          },
          {
                "input": "2\n1 2\n3 4\n",
                "expectedOutput": "3 1\n4 2\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n42\n",
                "expectedOutput": "42\n"
          },
          {
                "input": "4\n5 1 9 11\n2 4 8 10\n13 3 6 7\n15 14 12 16\n",
                "expectedOutput": "15 13 2 5\n14 3 4 1\n12 6 8 9\n16 7 10 11\n"
          }
    ],
  }
];
