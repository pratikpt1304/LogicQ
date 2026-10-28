import type { TopicPracticeItem } from './topic-practice.data.js';

export const ADDITIONAL_PRACTICE_TOPICS: TopicPracticeItem[] = [
  // ==========================================
  // MODULE 1: CONTROL STRUCTURES & BITWISE (+4 Topics)
  // ==========================================
  {
    id: 'm1-t7-bitwise-parity',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Bitwise Operators & Even/Odd Parity',
    summary: 'Inspect lowest-order bits and compute parity without arithmetic modulo.',
    tipBox: {
      syntax: `// Check LSB (Least Significant Bit)
if (n & 1) {
    // Odd number (LSB is 1)
} else {
    // Even number (LSB is 0)
}`,
      application: 'High-frequency computing engines and microcontrollers use single-cycle bitwise masks (& 1) instead of expensive CPU division instructions (% 2).',
      example: `#include <stdio.h>
int main() {
    int num = 14;
    printf("%s\\n", (num & 1) ? "ODD" : "EVEN");
    return 0;
}`,
    },
    problem: {
      title: 'Bitwise Parity Checker',
      difficulty: 'EASY',
      description: `### Problem Description

Given an integer N, determine whether it is EVEN or ODD strictly using the bitwise AND operator (&).

### Input Format
A single integer N.

### Output Format
Print EVEN if the number is even, or ODD if the number is odd followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        // TODO: Use bitwise & 1 to check parity and print EVEN or ODD
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        if (n & 1) {
            printf("ODD\\n");
        } else {
            printf("EVEN\\n");
        }
    }
    return 0;
}`,
      openTestCase: {
        input: '17',
        expectedOutput: 'ODD',
        explanation: '17 in binary is 10001 (LSB is 1, so ODD).',
      },
      hiddenTestCase: {
        input: '42',
        expectedOutput: 'EVEN',
      },
    },
  },
  {
    id: 'm1-t8-count-set-bits',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Bitwise Shifts & Set Bit Counter',
    summary: 'Count total number of 1s in binary representation (Hamming weight).',
    tipBox: {
      syntax: `// Brian Kernighan's bit trick
int count = 0;
while (n > 0) {
    n = n & (n - 1); // Clears the lowest set bit
    count++;
}`,
      application: 'Network packet checksums, cryptographic hash computations, and database bitmap indices rely on rapid set bit counting.',
      example: `int count = 0;
while (n > 0) {
    count += (n & 1);
    n >>= 1;
}`,
    },
    problem: {
      title: 'Binary Set Bit Counter',
      difficulty: 'EASY',
      description: `### Problem Description

Given a non-negative integer N, count the total number of set bits (1s) in its binary representation.

### Input Format
A single non-negative integer N.

### Output Format
Print the total count of set bits.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        // TODO: Count set bits and print the count
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int count = 0;
        while (n > 0) {
            n = n & (n - 1);
            count++;
        }
        printf("%d\\n", count);
    }
    return 0;
}`,
      openTestCase: {
        input: '29',
        expectedOutput: '4',
        explanation: '29 in binary is 11101, which contains 4 set bits.',
      },
      hiddenTestCase: {
        input: '128',
        expectedOutput: '1',
      },
    },
  },
  {
    id: 'm1-t9-ternary-and-casting',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Ternary Conditional & Float Type Casting',
    summary: 'Compact conditional expressions and floating-point conversions.',
    tipBox: {
      syntax: `// Ternary & explicit cast
result = (condition) ? value_true : value_false;
float avg = (float)sum / count;`,
      application: 'Graphics shaders and physics simulations use ternary clamping and float casting to prevent integer truncation bugs in coordinate math.',
      example: `float ratio = (count > 0) ? ((float)sum / count) : 0.0f;`,
    },
    problem: {
      title: 'Floating Ratio Calculator',
      difficulty: 'EASY',
      description: `### Problem Description

Given two integers sum and count:
- If count == 0, print INVALID
- Otherwise, compute the float average ((float)sum / count) and print it rounded to 2 decimal places.

### Input Format
Two space-separated integers: sum and count.

### Output Format
Print the float average with 2 decimal places, or INVALID.`,
      starterCode: `#include <stdio.h>

int main() {
    int sum, count;
    if (scanf("%d %d", &sum, &count) == 2) {
        // TODO: Check count and print formatted ratio or INVALID
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int sum, count;
    if (scanf("%d %d", &sum, &count) == 2) {
        if (count == 0) {
            printf("INVALID\\n");
        } else {
            float avg = (float)sum / count;
            printf("%.2f\\n", avg);
        }
    }
    return 0;
}`,
      openTestCase: {
        input: '15 4',
        expectedOutput: '3.75',
        explanation: '15 / 4 = 3.75.',
      },
      hiddenTestCase: {
        input: '20 0',
        expectedOutput: 'INVALID',
      },
    },
  },
  {
    id: 'm1-t10-prime-checker',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Optimized Primality Verification',
    summary: 'Trial division up to sqrt(N) with early loop termination.',
    tipBox: {
      syntax: `// Check up to sqrt(n)
for (int i = 2; i * i <= n; i++) {
    if (n % i == 0) return 0; // Composite
}`,
      application: 'Public-key cryptography (RSA and Diffie-Hellman key exchanges) rely on primality verification for secure channel establishment.',
      example: `#include <stdio.h>
int isPrime(int n) {
    if (n <= 1) return 0;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}`,
    },
    problem: {
      title: 'Optimized Primality Tester',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given an integer N, determine whether N is a prime number using trial division up to sqrt(N).

### Input Format
A single integer N.

### Output Format
Print PRIME if N is prime, or NOT_PRIME otherwise.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        // TODO: Check primality using loop up to i * i <= n
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        if (n <= 1) {
            printf("NOT_PRIME\\n");
            return 0;
        }
        int isPrime = 1;
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                isPrime = 0;
                break;
            }
        }
        printf("%s\\n", isPrime ? "PRIME" : "NOT_PRIME");
    }
    return 0;
}`,
      openTestCase: {
        input: '29',
        expectedOutput: 'PRIME',
        explanation: '29 has no divisors other than 1 and 29.',
      },
      hiddenTestCase: {
        input: '49',
        expectedOutput: 'NOT_PRIME',
      },
    },
  },

  // ==========================================
  // MODULE 2: POINTERS & FUNCTIONS (+4 Topics)
  // ==========================================
  {
    id: 'm2-t7-double-pointer',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Pointer to Pointer (Double Indirection)',
    summary: 'Modify pointer addresses inside functions and dynamic handles.',
    tipBox: {
      syntax: `// Double pointer syntax
int val = 10;
int *p = &val;
int **pp = &p; // **pp dereferences to val`,
      application: 'Operating systems and matrix allocators use double pointers for ragged 2D memory arrays and reallocating memory buffers inside helper functions.',
      example: `void update(int **ptr, int newVal) {
    **ptr = newVal;
}`,
    },
    problem: {
      title: 'Double Pointer Value Multiplier',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given an integer N and multiplier M, use a double pointer (int **pp) to multiply the target integer by M in-place and print the updated value.

### Input Format
Two space-separated integers: N and M.

### Output Format
Print the updated value of N.`,
      starterCode: `#include <stdio.h>

void multiplyViaDoublePtr(int **pp, int mult) {
    // TODO: Multiply the target value using **pp
}

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) == 2) {
        int *p = &n;
        multiplyViaDoublePtr(&p, m);
        printf("%d\\n", n);
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

void multiplyViaDoublePtr(int **pp, int mult) {
    **pp = (**pp) * mult;
}

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) == 2) {
        int *p = &n;
        multiplyViaDoublePtr(&p, m);
        printf("%d\\n", n);
    }
    return 0;
}`,
      openTestCase: {
        input: '7 5',
        expectedOutput: '35',
        explanation: '7 * 5 = 35 updated via **pp.',
      },
      hiddenTestCase: {
        input: '12 3',
        expectedOutput: '36',
      },
    },
  },
  {
    id: 'm2-t8-dynamic-malloc-free',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Heap Allocation with malloc and free',
    summary: 'Allocate runtime-sized contiguous memory blocks on the heap.',
    tipBox: {
      syntax: `#include <stdlib.h>
int *arr = (int *)malloc(n * sizeof(int));
if (arr == NULL) { /* Out of memory */ }
free(arr);
arr = NULL;`,
      application: 'Dynamic data structures (vectors, linked lists, graphs) request heap memory on-demand to prevent stack overflow when data size is variable.',
      example: `int *buf = malloc(10 * sizeof(int));
buf[0] = 42;
free(buf);`,
    },
    problem: {
      title: 'Heap Buffer Summation',
      difficulty: 'EASY',
      description: `### Problem Description

Read an integer N, dynamically allocate an array of N integers using malloc, read the N values, compute their total sum, free the allocated buffer, and print the sum.

### Input Format
The first line contains N.
The second line contains N space-separated integers.

### Output Format
Print the total sum.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        // TODO: Allocate array with malloc, read values, sum, free, and print
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        int *arr = (int *)malloc(n * sizeof(int));
        if (!arr) return 1;
        long long sum = 0;
        for (int i = 0; i < n; i++) {
            scanf("%d", &arr[i]);
            sum += arr[i];
        }
        printf("%lld\\n", sum);
        free(arr);
    }
    return 0;
}`,
      openTestCase: {
        input: `4
10 20 30 40`,
        expectedOutput: '100',
        explanation: '10 + 20 + 30 + 40 = 100.',
      },
      hiddenTestCase: {
        input: `3
5 15 25`,
        expectedOutput: '45',
      },
    },
  },
  {
    id: 'm2-t9-static-variables',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Static Local Variables & Persistent State',
    summary: 'Maintain function variable state across multiple invocations.',
    tipBox: {
      syntax: `int trackCalls() {
    static int count = 0; // Initialized once in data segment
    return ++count;
}`,
      application: 'Telemetry recorders, unique ID generators, and token rate limiters store internal invocation tallies without polluting global scope.',
      example: `static int sum = 0; retains its value between function calls.`,
    },
    problem: {
      title: 'Cumulative Static Accumulator',
      difficulty: 'EASY',
      description: `### Problem Description

Implement a function int accumulate(int val) that uses a static variable to maintain a running total across calls. Read N numbers, pass each to accumulate, and print the final accumulated sum.

### Input Format
First line contains N.
Second line contains N space-separated integers.

### Output Format
Print the final accumulated value.`,
      starterCode: `#include <stdio.h>

int accumulate(int val) {
    // TODO: Use a static variable to accumulate values across calls
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int finalSum = 0;
        for (int i = 0; i < n; i++) {
            int x;
            scanf("%d", &x);
            finalSum = accumulate(x);
        }
        printf("%d\\n", finalSum);
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int accumulate(int val) {
    static int runningSum = 0;
    runningSum += val;
    return runningSum;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int finalSum = 0;
        for (int i = 0; i < n; i++) {
            int x;
            scanf("%d", &x);
            finalSum = accumulate(x);
        }
        printf("%d\\n", finalSum);
    }
    return 0;
}`,
      openTestCase: {
        input: `4
2 4 6 8`,
        expectedOutput: '20',
        explanation: '2 + 4 + 6 + 8 = 20 maintained via static variable.',
      },
      hiddenTestCase: {
        input: `3
10 20 30`,
        expectedOutput: '60',
      },
    },
  },
  {
    id: 'm2-t10-recursion-fibonacci',
    moduleIndex: 2,
    moduleSlug: 'pointers-and-functions',
    moduleTitle: 'Module 2: Pointers and Functions',
    topicTitle: 'Recursive Sequences & Stack Dynamics',
    summary: 'Decompose recurrence relations into base cases and subproblems.',
    tipBox: {
      syntax: `int fib(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fib(n - 1) + fib(n - 2);
}`,
      application: 'Tree structures, directory traversal, divide-and-conquer algorithms, and mathematical recurrence solvers utilize recursion.',
      example: `Base case (n <= 1) is mandatory to prevent recursive call stack overflow.`,
    },
    problem: {
      title: 'Nth Fibonacci Number',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given a non-negative integer N (0 <= N <= 30), compute and print the Nth Fibonacci number recursively where Fib(0) = 0, Fib(1) = 1, Fib(2) = 1...

### Input Format
A single integer N.

### Output Format
Print the Nth Fibonacci number.`,
      starterCode: `#include <stdio.h>

int fib(int n) {
    // TODO: Implement recursive Fibonacci
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%d\\n", fib(n));
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int fib(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%d\\n", fib(n));
    }
    return 0;
}`,
      openTestCase: {
        input: '7',
        expectedOutput: '13',
        explanation: 'Fib(7) = 13.',
      },
      hiddenTestCase: {
        input: '10',
        expectedOutput: '55',
      },
    },
  },

  // ==========================================
  // MODULE 3: ARRAYS & APPLICATIONS (+4 Topics)
  // ==========================================
  {
    id: 'm3-t7-manual-string-reverse',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'In-Place String Reversal (Two-Pointer)',
    summary: 'Two-pointer technique on null-terminated character buffers without string.h.',
    tipBox: {
      syntax: `int left = 0, right = len - 1;
while (left < right) {
    char temp = s[left]; s[left] = s[right]; s[right] = temp;
    left++; right--;
}`,
      application: 'DNA reverse complement analyzers, network byte order flip operations, and text compression engines.',
      example: `Swap s[i] with s[len - 1 - i] until pointers meet in the center.`,
    },
    problem: {
      title: 'In-Place String Reverser',
      difficulty: 'EASY',
      description: `### Problem Description

Given a single-word string S (max length 100), reverse it in-place without using any <string.h> library functions, and print the reversed string.

### Input Format
A single line containing word S.

### Output Format
Print the reversed string.`,
      starterCode: `#include <stdio.h>

int main() {
    char s[105];
    if (scanf("%100s", s) == 1) {
        // TODO: Reverse the string in-place without string.h and print
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    char s[105];
    if (scanf("%100s", s) == 1) {
        int len = 0;
        while (s[len] != '\\0') len++;
        int left = 0, right = len - 1;
        while (left < right) {
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            left++;
            right--;
        }
        printf("%s\\n", s);
    }
    return 0;
}`,
      openTestCase: {
        input: 'programming',
        expectedOutput: 'gnimmargorp',
        explanation: 'Letters reversed in-place.',
      },
      hiddenTestCase: {
        input: 'racecar',
        expectedOutput: 'racecar',
      },
    },
  },
  {
    id: 'm3-t8-char-frequency',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Character Frequency Hashing (ASCII Mapping)',
    summary: 'Direct array indexing to tally character occurrences in O(N) time.',
    tipBox: {
      syntax: `int freq[26] = {0};
for (int i = 0; s[i] != '\\0'; i++) {
    if (s[i] >= 'a' && s[i] <= 'z') freq[s[i] - 'a']++;
}`,
      application: 'Anagram detectors, Huffman encoding frequency tables, and search engine tokenizer filters.',
      example: `'c' - 'a' produces index 2, enabling constant O(1) hash tallying.`,
    },
    problem: {
      title: 'Highest Frequency Character',
      difficulty: 'EASY',
      description: `### Problem Description

Given a lowercase string S, find and print the character that appears with the highest frequency, followed by its count. If multiple characters tie, print the alphabetically earliest character.

### Input Format
A single line containing lowercase string S (length <= 200).

### Output Format
Print the character and count separated by a space.`,
      starterCode: `#include <stdio.h>

int main() {
    char s[205];
    if (scanf("%200s", s) == 1) {
        // TODO: Count character frequencies and find max
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    char s[205];
    if (scanf("%200s", s) == 1) {
        int freq[26] = {0};
        for (int i = 0; s[i] != '\\0'; i++) {
            if (s[i] >= 'a' && s[i] <= 'z') {
                freq[s[i] - 'a']++;
            }
        }
        int maxCount = 0;
        char bestChar = 'a';
        for (int i = 0; i < 26; i++) {
            if (freq[i] > maxCount) {
                maxCount = freq[i];
                bestChar = 'a' + i;
            }
        }
        printf("%c %d\\n", bestChar, maxCount);
    }
    return 0;
}`,
      openTestCase: {
        input: 'success',
        expectedOutput: 's 3',
        explanation: 's appears 3 times in success.',
      },
      hiddenTestCase: {
        input: 'banana',
        expectedOutput: 'a 3',
      },
    },
  },
  {
    id: 'm3-t9-bubble-sort',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Bubble Sort & Adjacent Pairwise Ordering',
    summary: 'Sort array elements in ascending order via repeated adjacent swaps.',
    tipBox: {
      syntax: `for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
            int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
        }
    }
}`,
      application: 'Sorting sensor telemetry readings, ordering process scheduling priority queues, and preparing datasets for binary search.',
      example: `Larger elements bubble up to the rightmost positions after each pass.`,
    },
    problem: {
      title: 'Ascending Bubble Sorter',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given an integer array of N elements, sort the array in ascending order using Bubble Sort and print the space-separated sorted elements.

### Input Format
First line contains N.
Second line contains N space-separated integers.

### Output Format
Print the sorted array with single spaces between elements.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        // TODO: Bubble sort arr in ascending order and print
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = t;
                }
            }
        }
        for (int i = 0; i < n; i++) {
            printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: `5
64 25 12 22 11`,
        expectedOutput: '11 12 22 25 64',
        explanation: 'Sorted in ascending order.',
      },
      hiddenTestCase: {
        input: `4
5 1 4 2`,
        expectedOutput: '1 2 4 5',
      },
    },
  },
  {
    id: 'm3-t10-array-rotate',
    moduleIndex: 3,
    moduleSlug: 'array-and-its-applications',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Cyclic Array Shift (Right K Steps)',
    summary: 'Shift array elements circularly by K positions using modulo arithmetic.',
    tipBox: {
      syntax: `// Circular buffer index formula
int target_idx = (i + k) % n;`,
      application: 'Audio buffer looping, round-robin CPU task scheduling, and real-time scrolling graph displays.',
      example: `[1, 2, 3, 4, 5] rotated right by 2 steps produces [4, 5, 1, 2, 3].`,
    },
    problem: {
      title: 'Cyclic Array Right Shift',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given an array of N integers and a non-negative integer K, rotate the array to the right by K positions and print the resulting elements.

### Input Format
First line contains N.
Second line contains N space-separated integers.
Third line contains K.

### Output Format
Print the rotated array with space-separated values.`,
      starterCode: `#include <stdio.h>

int main() {
    int n, k;
    if (scanf("%d", &n) == 1 && n > 0) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        scanf("%d", &k);
        // TODO: Rotate array right by K positions and print
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n, k;
    if (scanf("%d", &n) == 1 && n > 0) {
        int arr[100];
        int res[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        scanf("%d", &k);
        k = k % n;
        for (int i = 0; i < n; i++) {
            res[(i + k) % n] = arr[i];
        }
        for (int i = 0; i < n; i++) {
            printf("%d%s", res[i], (i == n - 1) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: `5
1 2 3 4 5
2`,
        expectedOutput: '4 5 1 2 3',
        explanation: 'Array rotated right by 2 positions.',
      },
      hiddenTestCase: {
        input: `4
10 20 30 40
1`,
        expectedOutput: '40 10 20 30',
      },
    },
  },

  // ==========================================
  // MODULE 4: DYNAMIC MEMORY & STRUCTS (+4 Topics)
  // ==========================================
  {
    id: 'm4-t7-enums-state-machine',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Enumerated Types (enum) & State Modeling',
    summary: 'Define self-documenting named integer constants for discrete states.',
    tipBox: {
      syntax: `enum TrafficLight { RED = 0, GREEN = 1, YELLOW = 2 };
enum TrafficLight current = RED;`,
      application: 'Embedded firmware controllers, video game loop status trackers, and network protocol message status decoders.',
      example: `enum states { IDLE, RUNNING, STOPPED }; provides clear, error-free constants.`,
    },
    problem: {
      title: 'Traffic Light State Transition',
      difficulty: 'EASY',
      description: `### Problem Description

Define an enumerated type:
enum Light { RED = 0, GREEN = 1, YELLOW = 2 };

Read an integer state (0, 1, or 2). Print the next state in sequence:
- 0 (RED) -> GREEN
- 1 (GREEN) -> YELLOW
- 2 (YELLOW) -> RED

### Input Format
A single integer (0, 1, or 2).

### Output Format
Print the next state name.`,
      starterCode: `#include <stdio.h>

enum Light { RED = 0, GREEN = 1, YELLOW = 2 };

int main() {
    int state;
    if (scanf("%d", &state) == 1) {
        // TODO: Transition to next light state and print GREEN, YELLOW, or RED
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

enum Light { RED = 0, GREEN = 1, YELLOW = 2 };

int main() {
    int state;
    if (scanf("%d", &state) == 1) {
        if (state == RED) printf("GREEN\\n");
        else if (state == GREEN) printf("YELLOW\\n");
        else if (state == YELLOW) printf("RED\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: '0',
        expectedOutput: 'GREEN',
        explanation: 'RED transitions to GREEN.',
      },
      hiddenTestCase: {
        input: '1',
        expectedOutput: 'YELLOW',
      },
    },
  },
  {
    id: 'm4-t8-struct-array-sorting',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Array of Structures & Record Sorting',
    summary: 'Manage multi-record databases and sort by numeric member fields.',
    tipBox: {
      syntax: `typedef struct {
    char name[30];
    int score;
} Student;
Student batch[100];
// Access via batch[i].score`,
      application: 'Student information systems, e-commerce catalog search results, and inventory valuation tables.',
      example: `Sort array of struct items by comparing member field batch[j].score.`,
    },
    problem: {
      title: 'Top Student Record Finder',
      difficulty: 'EASY',
      description: `### Problem Description

Given N student records consisting of a Name (single word, max 30 chars) and Marks (integer), find and print the Name of the student who scored the highest marks.

### Input Format
First line contains N.
Next N lines each contain Name and Marks.

### Output Format
Print the Name of the top student.`,
      starterCode: `#include <stdio.h>

typedef struct {
    char name[35];
    int marks;
} Student;

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        Student list[50];
        // TODO: Read student records, find highest marks, print name
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

typedef struct {
    char name[35];
    int marks;
} Student;

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        Student list[50];
        int maxMarks = -1;
        int bestIdx = 0;
        for (int i = 0; i < n; i++) {
            scanf("%30s %d", list[i].name, &list[i].marks);
            if (list[i].marks > maxMarks) {
                maxMarks = list[i].marks;
                bestIdx = i;
            }
        }
        printf("%s\\n", list[bestIdx].name);
    }
    return 0;
}`,
      openTestCase: {
        input: `3
Alice 85
Bob 92
Charlie 78`,
        expectedOutput: 'Bob',
        explanation: 'Bob scored 92 (highest).',
      },
      hiddenTestCase: {
        input: `2
David 60
Emma 95`,
        expectedOutput: 'Emma',
      },
    },
  },
  {
    id: 'm4-t9-struct-padding',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Structure Memory Alignment & Padding',
    summary: 'Analyze CPU byte boundaries and alignment padding with sizeof.',
    tipBox: {
      syntax: `struct Sample { char a; int b; char c; };
// Typically 12 bytes on 32/64-bit systems (due to 3 + 3 padding bytes)`,
      application: 'Low-level device driver registers and network packet serializers must account for structure padding to avoid data corruption.',
      example: `sizeof(struct Sample) shows aligned byte layout allocated by compiler.`,
    },
    problem: {
      title: 'Structure Padding Inspector',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given the struct:
struct Sample {
    char a;
    int b;
    char c;
};

Print its size using sizeof(struct Sample) and whether padding bytes were added by the compiler (PADDED if sizeof > 6, else PACKED).

### Input Format
A single integer dummy input.

### Output Format
Print the sizeof value and status separated by a space (e.g. 12 PADDED).`,
      starterCode: `#include <stdio.h>

struct Sample {
    char a;
    int b;
    char c;
};

int main() {
    int dummy;
    if (scanf("%d", &dummy) == 1) {
        // TODO: Print sizeof(struct Sample) and PADDED or PACKED
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

struct Sample {
    char a;
    int b;
    char c;
};

int main() {
    int dummy;
    if (scanf("%d", &dummy) == 1) {
        size_t sz = sizeof(struct Sample);
        printf("%zu %s\\n", sz, (sz > 6) ? "PADDED" : "PACKED");
    }
    return 0;
}`,
      openTestCase: {
        input: '1',
        expectedOutput: '12 PADDED',
        explanation: '4-byte alignment pads char fields, making size 12 bytes.',
      },
      hiddenTestCase: {
        input: '0',
        expectedOutput: '12 PADDED',
      },
    },
  },
  {
    id: 'm4-t10-linked-list-node',
    moduleIndex: 4,
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Self-Referential Structs & Linked List Traversal',
    summary: 'Chain heap-allocated nodes together via pointer member fields.',
    tipBox: {
      syntax: `typedef struct Node {
    int data;
    struct Node *next;
} Node;
Node *head = (Node *)malloc(sizeof(Node));
head->next = NULL;`,
      application: 'Dynamic queues, OS kernel process scheduling runqueues, and hash table bucket chains use linked nodes.',
      example: `head->next stores the heap address of the next node.`,
    },
    problem: {
      title: 'Singly Linked List 3-Node Chain',
      difficulty: 'MEDIUM',
      description: `### Problem Description

Given 3 integers A, B, and C:
1. Dynamically allocate a 3-node singly linked list with values A -> B -> C.
2. Traverse the list from head and print: A -> B -> C -> NULL.
3. Free all allocated nodes.

### Input Format
Three space-separated integers A, B, and C.

### Output Format
Print the linked chain in the format: A -> B -> C -> NULL.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) == 3) {
        // TODO: Build 3-node list, print chain, free memory
        
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    int a, b, c;
    if (scanf("%d %d %d", &a, &b, &c) == 3) {
        Node *n1 = (Node *)malloc(sizeof(Node));
        Node *n2 = (Node *)malloc(sizeof(Node));
        Node *n3 = (Node *)malloc(sizeof(Node));
        if (!n1 || !n2 || !n3) return 1;

        n1->data = a; n1->next = n2;
        n2->data = b; n2->next = n3;
        n3->data = c; n3->next = NULL;

        Node *curr = n1;
        while (curr != NULL) {
            printf("%d -> ", curr->data);
            curr = curr->next;
        }
        printf("NULL\\n");

        free(n1);
        free(n2);
        free(n3);
    }
    return 0;
}`,
      openTestCase: {
        input: '10 20 30',
        expectedOutput: '10 -> 20 -> 30 -> NULL',
        explanation: 'Three nodes chained and traversed.',
      },
      hiddenTestCase: {
        input: '5 15 25',
        expectedOutput: '5 -> 15 -> 25 -> NULL',
      },
    },
  },
];
