import { PracticeProblemDef } from './practice-module1.data';

export const PRACTICE_MODULE_5_PROBLEMS: PracticeProblemDef[] = [
  // 1. Easy: Count Set Bits (Hamming Weight)
  {
    slug: 'practice-m5-p1-count-set-bits',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 1,
    title: 'Count Set Bits (Brian Kernighan)',
    difficulty: 'EASY',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Bitwise', 'Bits', 'Algorithms'],
    description: `### Problem Description

Given an unsigned 32-bit integer N, calculate the total number of set bits (1s in binary representation) using bitwise operations.

### Input Format
First line contains an integer T (1 ≤ T ≤ 100), the number of test cases.
Each test case contains a single 32-bit non-negative integer N (0 ≤ N ≤ 2^31 - 1).

### Output Format
For each test case, print the number of set bits on a new line.`,
    starterCode: `#include <stdio.h>

int countSetBits(unsigned int n) {
    // TODO: Use bitwise Brian Kernighan or shift
    return 0;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        unsigned int n;
        scanf("%u", &n);
        printf("%d\\n", countSetBits(n));
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int countSetBits(unsigned int n) {
    int count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    return count;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        unsigned int n;
        if (scanf("%u", &n) == 1) {
            printf("%d\\n", countSetBits(n));
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 10,
    sampleTests: [
      { input: '3\n5\n7\n0', expectedOutput: '2\n3\n0' },
      { input: '2\n15\n16', expectedOutput: '4\n1' },
    ],
    hiddenTests: [
      { input: '1\n1023', expectedOutput: '10' },
      { input: '1\n2147483647', expectedOutput: '31' },
    ],
  },

  // 2. Easy: Power of Two Check (Bitwise)
  {
    slug: 'practice-m5-p2-power-of-two',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 2,
    title: 'Bitwise Power of Two Verification',
    difficulty: 'EASY',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Bitwise', 'Power of 2'],
    description: `### Problem Description

Given a positive 32-bit integer N, determine whether N is a power of 2 using bitwise operations in O(1) time.

### Input Format
First line contains T test cases.
Each test case contains an integer N (1 ≤ N ≤ 2^31 - 1).

### Output Format
Print \`YES\` if N is a power of two, otherwise \`NO\`.`,
    starterCode: `#include <stdio.h>

int isPowerOfTwo(long long n) {
    // TODO: Return 1 if power of 2, else 0
    return 0;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long n;
        scanf("%lld", &n);
        printf("%s\\n", isPowerOfTwo(n) ? "YES" : "NO");
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int isPowerOfTwo(long long n) {
    if (n <= 0) return 0;
    return (n & (n - 1)) == 0;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long n;
        if (scanf("%lld", &n) == 1) {
            printf("%s\\n", isPowerOfTwo(n) ? "YES" : "NO");
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("NO\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("YES\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 10,
    sampleTests: [
      { input: '3\n1\n16\n18', expectedOutput: 'YES\nYES\nNO' },
      { input: '2\n64\n100', expectedOutput: 'YES\nNO' },
    ],
    hiddenTests: [
      { input: '1\n1073741824', expectedOutput: 'YES' },
      { input: '1\n1073741825', expectedOutput: 'NO' },
    ],
  },

  // 3. Easy: Find Non-Repeating Element (XOR)
  {
    slug: 'practice-m5-p3-single-number-xor',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 3,
    title: 'Single Unique Element via XOR',
    difficulty: 'EASY',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Bitwise', 'XOR', 'Arrays'],
    description: `### Problem Description

Given an array of integers where every element appears exactly twice except for one unique element, find and print that single unique element using bitwise XOR in O(N) time and O(1) space.

### Input Format
First line contains integer N (1 ≤ N ≤ 100000, N is odd).
Second line contains N space-separated integers.

### Output Format
Print the single element that appears only once.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // TODO: Read array and XOR all elements
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int res = 0;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        res ^= x;
    }
    printf("%d\\n", res);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("-1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 10,
    sampleTests: [
      { input: '5\n4 1 2 1 2', expectedOutput: '4' },
      { input: '3\n9 5 9', expectedOutput: '5' },
    ],
    hiddenTests: [
      { input: '7\n10 20 30 40 30 20 10', expectedOutput: '40' },
      { input: '1\n999', expectedOutput: '999' },
    ],
  },

  // 4. Easy: Swap Two Numbers without Temporary Variable
  {
    slug: 'practice-m5-p4-bitwise-swap',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 4,
    title: 'Bitwise In-Place Swap',
    difficulty: 'EASY',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Bitwise', 'XOR', 'In-place'],
    description: `### Problem Description

Given two integers A and B, swap them using bitwise XOR operations without using any temporary variable or arithmetic operations (+, -).

### Input Format
Single line with two integers A and B (-10^9 ≤ A, B ≤ 10^9).

### Output Format
Print the swapped values: B then A separated by a space.`,
    starterCode: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 0;
    // TODO: In-place XOR swap
    printf("%d %d\\n", a, b);
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
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0 0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){int a,b;scanf("%d%d",&a,&b);printf("%d %d\\n",a,b);return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 10,
    sampleTests: [
      { input: '10 20', expectedOutput: '20 10' },
      { input: '-5 15', expectedOutput: '15 -5' },
    ],
    hiddenTests: [
      { input: '0 100', expectedOutput: '100 0' },
      { input: '42 42', expectedOutput: '42 42' },
    ],
  },

  // 5. Medium: Fast Modular Exponentiation (Binary Exponentiation)
  {
    slug: 'practice-m5-p5-binary-exponentiation',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 5,
    title: 'Fast Modular Exponentiation (a^b mod m)',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Algorithms', 'Math', 'Binary Exponentiation'],
    description: `### Problem Description

Given integers a, b, and m (where m > 0), compute (a^b) % m in O(log b) time using binary exponentiation.

### Input Format
First line contains T test cases.
Each test case contains three space-separated integers: a, b, and m (0 ≤ a, b ≤ 10^9, 1 ≤ m ≤ 10^9 + 7).

### Output Format
For each test case, print the result on a new line.`,
    starterCode: `#include <stdio.h>

long long powerMod(long long a, long long b, long long m) {
    // TODO: Compute (a^b) % m in O(log b)
    return 0;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long a, b, m;
        scanf("%lld %lld %lld", &a, &b, &m);
        printf("%lld\\n", powerMod(a, b, m));
    }
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long powerMod(long long a, long long b, long long m) {
    if (m == 1) return 0;
    long long res = 1;
    a %= m;
    while (b > 0) {
        if (b & 1) res = (res * a) % m;
        a = (a * a) % m;
        b >>= 1;
    }
    return res;
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long a, b, m;
        if (scanf("%lld %lld %lld", &a, &b, &m) == 3) {
            printf("%lld\\n", powerMod(a, b, m));
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '2\n2 10 1000000007\n3 5 13', expectedOutput: '1024\n9' },
      { input: '1\n5 0 100', expectedOutput: '1' },
    ],
    hiddenTests: [
      { input: '1\n7 1000000 1000000007', expectedOutput: '685160867' },
      { input: '1\n10 10 1', expectedOutput: '0' },
    ],
  },

  // 6. Medium: Next Permutation (Lexicographical)
  {
    slug: 'practice-m5-p6-next-permutation',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 6,
    title: 'Lexicographical Next Permutation',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Algorithms', 'Array', 'Permutation'],
    description: `### Problem Description

Given an array of N integers, rearrange the numbers into the lexicographically next greater permutation of numbers.
If such arrangement is not possible, it must rearrange it as the lowest possible order (sorted in ascending order).

### Input Format
First line: integer N (1 ≤ N ≤ 1000).
Second line: N space-separated integers.

### Output Format
Print the rearranged array elements separated by spaces.`,
    starterCode: `#include <stdio.h>

void nextPermutation(int* nums, int n) {
    // TODO: Compute next permutation in-place
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    nextPermutation(arr, n);
    for (int i = 0; i < n; i++) printf("%d%c", arr[i], i == n - 1 ? '\\n' : ' ');
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void swap(int* a, int* b) { int t = *a; *a = *b; *b = t; }
void reverse(int* arr, int s, int e) { while (s < e) { swap(&arr[s], &arr[e]); s++; e--; } }

void nextPermutation(int* nums, int n) {
    int i = n - 2;
    while (i >= 0 && nums[i] >= nums[i + 1]) i--;
    if (i >= 0) {
        int j = n - 1;
        while (nums[j] <= nums[i]) j--;
        swap(&nums[i], &nums[j]);
    }
    reverse(nums, i + 1, n - 1);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    nextPermutation(arr, n);
    for (int i = 0; i < n; i++) printf("%d%c", arr[i], i == n - 1 ? '\\n' : ' ');
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("1 2 3\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '3\n1 2 3', expectedOutput: '1 3 2' },
      { input: '3\n3 2 1', expectedOutput: '1 2 3' },
    ],
    hiddenTests: [
      { input: '4\n1 1 5 1', expectedOutput: '1 5 1 1' },
      { input: '1\n42', expectedOutput: '42' },
    ],
  },

  // 7. Medium: Custom Dynamic Stack (LIFO) in C
  {
    slug: 'practice-m5-p7-custom-dynamic-stack',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 7,
    title: 'Custom Dynamic Stack with Resizing',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Data Structures', 'Stack', 'Pointers', 'Memory'],
    description: `### Problem Description

Implement a custom stack supporting four operations:
- \`PUSH x\`: Push integer x onto stack.
- \`POP\`: Pop top element and print it (or \`-1\` if stack is empty).
- \`TOP\`: Print top element without popping (or \`-1\` if empty).
- \`SIZE\`: Print current number of elements in the stack.

### Input Format
First line contains Q (1 ≤ Q ≤ 5000), the number of operations.
Next Q lines contain operations as specified above.

### Output Format
Print outputs for POP, TOP, and SIZE operations.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    // TODO: Implement dynamic stack
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    int stack[10000];
    int top = -1;
    while (q--) {
        char op[10];
        scanf("%s", op);
        if (strcmp(op, "PUSH") == 0) {
            int val;
            scanf("%d", &val);
            stack[++top] = val;
        } else if (strcmp(op, "POP") == 0) {
            if (top == -1) printf("-1\\n");
            else printf("%d\\n", stack[top--]);
        } else if (strcmp(op, "TOP") == 0) {
            if (top == -1) printf("-1\\n");
            else printf("%d\\n", stack[top]);
        } else if (strcmp(op, "SIZE") == 0) {
            printf("%d\\n", top + 1);
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("-1\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '6\nPUSH 10\nPUSH 20\nTOP\nPOP\nPOP\nPOP', expectedOutput: '20\n20\n10\n-1' },
      { input: '3\nSIZE\nPUSH 5\nSIZE', expectedOutput: '0\n1' },
    ],
    hiddenTests: [
      { input: '4\nPUSH 1\nPUSH 2\nSIZE\nTOP', expectedOutput: '2\n2' },
      { input: '2\nPOP\nTOP', expectedOutput: '-1\n-1' },
    ],
  },

  // 8. Medium: Binary Search on Monotonic Predicate
  {
    slug: 'practice-m5-p8-binary-search-predicate',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 8,
    title: 'Integer Square Root via Binary Search',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Binary Search', 'Algorithms', 'Math'],
    description: `### Problem Description

Given a non-negative integer X, compute and return the integer square root of X (i.e. floor(sqrt(X))) using binary search without using \`sqrt()\` function.

### Input Format
Single line with integer X (0 ≤ X ≤ 2^62 - 1).

### Output Format
Print the floor integer square root of X.`,
    starterCode: `#include <stdio.h>

long long integerSqrt(long long x) {
    // TODO: Binary search in range [0, 2^31 - 1]
    return 0;
}

int main() {
    long long x;
    if (scanf("%lld", &x) != 1) return 0;
    printf("%lld\\n", integerSqrt(x));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long integerSqrt(long long x) {
    if (x <= 1) return x;
    long long low = 1, high = x, ans = 0;
    if (high > 3037000499LL) high = 3037000499LL;
    while (low <= high) {
        long long mid = low + (high - low) / 2;
        if (mid <= x / mid) {
            ans = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return ans;
}

int main() {
    long long x;
    if (scanf("%lld", &x) == 1) {
        printf("%lld\\n", integerSqrt(x));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '4', expectedOutput: '2' },
      { input: '8', expectedOutput: '2' },
    ],
    hiddenTests: [
      { input: '1000000000000', expectedOutput: '1000000' },
      { input: '0', expectedOutput: '0' },
    ],
  },

  // 9. Medium: Find Missing and Repeating Number
  {
    slug: 'practice-m5-p9-missing-repeating',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 9,
    title: 'Find Missing and Repeating Number',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Array', 'Math', 'Bitwise'],
    description: `### Problem Description

Given an unsorted array of size N containing numbers from 1 to N, one number from 1 to N is missing and one number occurs twice. Find both numbers in O(N) time and O(1) extra space.

### Input Format
First line: integer N (2 ≤ N ≤ 100000).
Second line: N space-separated integers.

### Output Format
Print the repeating number followed by the missing number separated by a space.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // TODO: Find repeating and missing
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    long long sumN = (long long)n * (n + 1) / 2;
    long long sumSqN = (long long)n * (n + 1) * (2 * n + 1) / 6;

    long long sum = 0, sumSq = 0;
    for (int i = 0; i < n; i++) {
        sum += arr[i];
        sumSq += (long long)arr[i] * arr[i];
    }

    // diff = repeating - missing
    long long diff = sum - sumN;
    // sumDiff = repeating^2 - missing^2 = (repeating - missing)(repeating + missing)
    long long sumDiff = sumSq - sumSqN;
    long long sumPlus = sumDiff / diff;

    long long repeating = (diff + sumPlus) / 2;
    long long missing = repeating - diff;

    printf("%lld %lld\\n", repeating, missing);
    free(arr);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("1 2\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '3\n1 3 3', expectedOutput: '3 2' },
      { input: '2\n2 2', expectedOutput: '2 1' },
    ],
    hiddenTests: [
      { input: '5\n1 2 2 4 5', expectedOutput: '2 3' },
      { input: '4\n4 3 2 4', expectedOutput: '4 1' },
    ],
  },

  // 10. Medium: String Anagram Search (Rolling Frequency Hash)
  {
    slug: 'practice-m5-p10-anagram-substring-search',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 10,
    title: 'Anagram Substring Indices (Sliding Window)',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Sliding Window', 'Strings', 'Frequency Array'],
    description: `### Problem Description

Given two strings S and P, find all start indices of P's anagrams in S using sliding window in O(|S|) time.

### Input Format
First line contains string S (1 ≤ |S| ≤ 100000, lowercase letters).
Second line contains string P (1 ≤ |P| ≤ |S|, lowercase letters).

### Output Format
Print space-separated 0-based indices where an anagram of P starts in S. If none, print \`-1\`.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005], p[100005];
    if (scanf("%s %s", s, p) != 2) return 0;
    // TODO: Sliding window anagram search
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005], p[100005];
    if (scanf("%s %s", s, p) != 2) return 0;
    int sLen = strlen(s), pLen = strlen(p);
    if (pLen > sLen) { printf("-1\\n"); return 0; }

    int pCount[26] = {0}, sCount[26] = {0};
    for (int i = 0; i < pLen; i++) {
        pCount[p[i] - 'a']++;
        sCount[s[i] - 'a']++;
    }

    int found = 0;
    for (int i = 0; i <= sLen - pLen; i++) {
        int match = 1;
        for (int c = 0; c < 26; c++) {
            if (pCount[c] != sCount[c]) { match = 0; break; }
        }
        if (match) {
            printf("%d ", i);
            found = 1;
        }
        if (i + pLen < sLen) {
            sCount[s[i] - 'a']--;
            sCount[s[i + pLen] - 'a']++;
        }
    }
    if (!found) printf("-1");
    printf("\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("-1\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: 'cbaebabacd abc', expectedOutput: '0 6 \n' },
      { input: 'abab ab', expectedOutput: '0 1 2 \n' },
    ],
    hiddenTests: [
      { input: 'hello world', expectedOutput: '-1\n' },
      { input: 'aa aa', expectedOutput: '0 \n' },
    ],
  },

  // 11. Medium: Longest Substring Without Repeating Characters
  {
    slug: 'practice-m5-p11-longest-unique-substring',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 11,
    title: 'Longest Substring with Unique Characters',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Sliding Window', 'Two Pointers'],
    description: `### Problem Description

Given a string S consisting of ASCII characters, find the length of the longest substring without repeating characters in O(|S|) time.

### Input Format
First line contains the string S (1 ≤ |S| ≤ 100000).

### Output Format
Print the length of the longest substring without duplicates.`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%s", s) != 1) return 0;
    // TODO: Compute longest unique substring
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%s", s) != 1) return 0;
    int lastPos[256];
    for (int i = 0; i < 256; i++) lastPos[i] = -1;

    int maxLen = 0, left = 0;
    for (int right = 0; s[right]; right++) {
        unsigned char c = (unsigned char)s[right];
        if (lastPos[c] >= left) {
            left = lastPos[c] + 1;
        }
        lastPos[c] = right;
        int cur = right - left + 1;
        if (cur > maxLen) maxLen = cur;
    }
    printf("%d\\n", maxLen);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: 'abcabcbb', expectedOutput: '3' },
      { input: 'bbbbb', expectedOutput: '1' },
    ],
    hiddenTests: [
      { input: 'pwwkew', expectedOutput: '3' },
      { input: 'abcdefg', expectedOutput: '7' },
    ],
  },

  // 12. Medium: Merge Intervals
  {
    slug: 'practice-m5-p12-merge-intervals',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 12,
    title: 'Merge Overlapping Intervals',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Sorting', 'Intervals', 'qsort'],
    description: `### Problem Description

Given an array of intervals [start, end], merge all overlapping intervals and output the result in ascending order of start times.

### Input Format
First line: integer N (1 ≤ N ≤ 5000).
Next N lines: two space-separated integers representing start and end (0 ≤ start ≤ end ≤ 10^6).

### Output Format
Print merged intervals, each on a new line with start and end separated by a space.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Interval { int s, e; };

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // TODO: Sort intervals and merge
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Interval { int s, e; };

int cmp(const void* a, const void* b) {
    struct Interval* i1 = (struct Interval*)a;
    struct Interval* i2 = (struct Interval*)b;
    if (i1->s != i2->s) return i1->s - i2->s;
    return i1->e - i2->e;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    struct Interval arr[5000];
    for (int i = 0; i < n; i++) scanf("%d %d", &arr[i].s, &arr[i].e);

    qsort(arr, n, sizeof(struct Interval), cmp);

    int curS = arr[0].s, curE = arr[0].e;
    for (int i = 1; i < n; i++) {
        if (arr[i].s <= curE) {
            if (arr[i].e > curE) curE = arr[i].e;
        } else {
            printf("%d %d\\n", curS, curE);
            curS = arr[i].s;
            curE = arr[i].e;
        }
    }
    printf("%d %d\\n", curS, curE);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("0 0\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18' },
      { input: '2\n1 4\n4 5', expectedOutput: '1 5' },
    ],
    hiddenTests: [
      { input: '3\n1 10\n2 3\n4 5', expectedOutput: '1 10' },
      { input: '1\n5 10', expectedOutput: '5 10' },
    ],
  },

  // 13. Medium: Trapping Rain Water (Two Pointers)
  {
    slug: 'practice-m5-p13-trapping-rain-water',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 13,
    title: 'Trapping Rain Water (O(N) Two Pointers)',
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Two Pointers', 'Array', 'Algorithms'],
    description: `### Problem Description

Given N non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining using two pointers in O(N) time and O(1) space.

### Input Format
First line: integer N (1 ≤ N ≤ 50000).
Second line: N space-separated non-negative integers.

### Output Format
Print the total units of trapped rain water.`,
    starterCode: `#include <stdio.h>

long long trapWater(int* height, int n) {
    // TODO: Two pointers
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int h[50000];
    for (int i = 0; i < n; i++) scanf("%d", &h[i]);
    printf("%lld\\n", trapWater(h, n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long trapWater(int* height, int n) {
    if (n <= 2) return 0;
    int left = 0, right = n - 1;
    int maxLeft = 0, maxRight = 0;
    long long water = 0;
    while (left <= right) {
        if (height[left] <= height[right]) {
            if (height[left] >= maxLeft) maxLeft = height[left];
            else water += maxLeft - height[left];
            left++;
        } else {
            if (height[right] >= maxRight) maxRight = height[right];
            else water += maxRight - height[right];
            right--;
        }
    }
    return water;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int h[50000];
    for (int i = 0; i < n; i++) scanf("%d", &h[i]);
    printf("%lld\\n", trapWater(h, n));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '6\n0 1 0 2 1 0', expectedOutput: '1' },
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6' },
    ],
    hiddenTests: [
      { input: '6\n4 2 0 3 2 5', expectedOutput: '9' },
      { input: '3\n3 0 2', expectedOutput: '2' },
    ],
  },

  // 14. Medium: Kadane's Algorithm for Maximum Subarray Sum
  {
    slug: 'practice-m5-p14-kadanes-algorithm',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 14,
    title: "Maximum Subarray Sum (Kadane's)",
    difficulty: 'MEDIUM',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Dynamic Programming', 'Kadane', 'Array'],
    description: `### Problem Description

Given an integer array of size N, find the contiguous subarray (containing at least one number) which has the largest sum and print that sum.

### Input Format
First line: integer N (1 ≤ N ≤ 100000).
Second line: N space-separated integers (-10^4 ≤ arr[i] ≤ 10^4).

### Output Format
Print the maximum contiguous subarray sum.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // TODO: Kadane's algorithm
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long maxSoFar, curMax;
    long long first;
    scanf("%lld", &first);
    maxSoFar = curMax = first;
    for (int i = 1; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        curMax = (x > curMax + x) ? x : (curMax + x);
        if (curMax > maxSoFar) maxSoFar = curMax;
    }
    printf("%lld\\n", maxSoFar);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 20,
    sampleTests: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
      { input: '1\n1', expectedOutput: '1' },
    ],
    hiddenTests: [
      { input: '5\n5 4 -1 7 8', expectedOutput: '23' },
      { input: '3\n-3 -2 -1', expectedOutput: '-1' },
    ],
  },

  // 15. Hard: Median of Two Sorted Arrays (O(log(min(M,N))))
  {
    slug: 'practice-m5-p15-median-two-sorted-arrays',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 15,
    title: 'Median of Two Sorted Arrays',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Binary Search', 'Divide and Conquer', 'Algorithms'],
    description: `### Problem Description

Given two sorted arrays nums1 of size M and nums2 of size N, return the median of the two sorted arrays with a runtime complexity of O(log(min(M,N))).

### Input Format
First line contains two integers M and N (0 ≤ M, N ≤ 1000, M + N ≥ 1).
Second line contains M space-separated sorted integers.
Third line contains N space-separated sorted integers.

### Output Format
Print the median formatted to 1 decimal place.`,
    starterCode: `#include <stdio.h>

double findMedian(int* nums1, int m, int* nums2, int n) {
    // TODO: Binary search partition
    return 0.0;
}

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    int a[1000], b[1000];
    for (int i = 0; i < m; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) scanf("%d", &b[i]);
    printf("%.1f\\n", findMedian(a, m, b, n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

double findMedian(int* a, int m, int* b, int n) {
    if (m > n) return findMedian(b, n, a, m);
    int low = 0, high = m;
    while (low <= high) {
        int i = (low + high) / 2;
        int j = (m + n + 1) / 2 - i;
        int maxLeftA = (i == 0) ? -1000000000 : a[i - 1];
        int minRightA = (i == m) ? 1000000000 : a[i];
        int maxLeftB = (j == 0) ? -1000000000 : b[j - 1];
        int minRightB = (j == n) ? 1000000000 : b[j];

        if (maxLeftA <= minRightB && maxLeftB <= minRightA) {
            int maxLeft = maxLeftA > maxLeftB ? maxLeftA : maxLeftB;
            if ((m + n) % 2 == 1) return (double)maxLeft;
            int minRight = minRightA < minRightB ? minRightA : minRightB;
            return (maxLeft + minRight) / 2.0;
        } else if (maxLeftA > minRightB) {
            high = i - 1;
        } else {
            low = i + 1;
        }
    }
    return 0.0;
}

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    int a[1000], b[1000];
    for (int i = 0; i < m; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) scanf("%d", &b[i]);
    printf("%.1f\\n", findMedian(a, m, b, n));
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0.0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '2 1\n1 3\n2', expectedOutput: '2.0' },
      { input: '2 2\n1 2\n3 4', expectedOutput: '2.5' },
    ],
    hiddenTests: [
      { input: '0 2\n\n1 2', expectedOutput: '1.5' },
      { input: '1 1\n0\n0', expectedOutput: '0.0' },
    ],
  },

  // 16. Hard: LRU Cache Implementation (Doubly Linked List + Hash Map)
  {
    slug: 'practice-m5-p16-lru-cache-simulator',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 16,
    title: 'LRU Cache Design & Execution',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['LRU Cache', 'Doubly Linked List', 'Systems'],
    description: `### Problem Description

Design a Least Recently Used (LRU) cache with a positive capacity.
Support two operations:
- \`GET key\`: Return the value of the key if it exists, otherwise return \`-1\`. Accessing marks it as recently used.
- \`PUT key value\`: Insert or update the key-value pair. If number of keys exceeds capacity, evict the least recently used key.

### Input Format
First line: integer C (capacity, 1 ≤ C ≤ 100) and integer Q (operations count, 1 ≤ Q ≤ 5000).
Next Q lines: \`GET key\` or \`PUT key value\`.

### Output Format
Print the output for each \`GET\` operation on a new line.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int cap, q;
    if (scanf("%d %d", &cap, &q) != 2) return 0;
    // TODO: LRU Cache simulation
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Node {
    int key, val;
    struct Node *prev, *next;
};

int main() {
    int cap, q;
    if (scanf("%d %d", &cap, &q) != 2) return 0;

    struct Node* head = (struct Node*)malloc(sizeof(struct Node));
    struct Node* tail = (struct Node*)malloc(sizeof(struct Node));
    head->next = tail; tail->prev = head;

    struct Node* map[10001] = {NULL};
    int count = 0;

    auto void removeNode(struct Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }
    auto void addHead(struct Node* node) {
        node->next = head->next;
        node->prev = head;
        head->next->prev = node;
        head->next = node;
    }

    while (q--) {
        char op[10];
        scanf("%s", op);
        if (strcmp(op, "GET") == 0) {
            int k;
            scanf("%d", &k);
            if (k >= 0 && k <= 10000 && map[k]) {
                removeNode(map[k]);
                addHead(map[k]);
                printf("%d\\n", map[k]->val);
            } else {
                printf("-1\\n");
            }
        } else if (strcmp(op, "PUT") == 0) {
            int k, v;
            scanf("%d %d", &k, &v);
            if (map[k]) {
                map[k]->val = v;
                removeNode(map[k]);
                addHead(map[k]);
            } else {
                if (count == cap) {
                    struct Node* lru = tail->prev;
                    map[lru->key] = NULL;
                    removeNode(lru);
                    free(lru);
                    count--;
                }
                struct Node* node = (struct Node*)malloc(sizeof(struct Node));
                node->key = k; node->val = v;
                map[k] = node;
                addHead(node);
                count++;
            }
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("-1\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '2 5\nPUT 1 10\nPUT 2 20\nGET 1\nPUT 3 30\nGET 2', expectedOutput: '10\n-1' },
      { input: '1 3\nPUT 5 50\nGET 5\nGET 6', expectedOutput: '50\n-1' },
    ],
    hiddenTests: [
      { input: '2 4\nPUT 1 1\nPUT 2 2\nPUT 1 10\nGET 1', expectedOutput: '10' },
      { input: '1 2\nGET 1\nGET 2', expectedOutput: '-1\n-1' },
    ],
  },

  // 17. Hard: Custom Memory Pool Allocator
  {
    slug: 'practice-m5-p17-custom-memory-pool',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 17,
    title: 'Block Memory Pool Allocator Simulation',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Memory Management', 'Pointers', 'Systems'],
    description: `### Problem Description

Simulate a contiguous memory pool allocator with M total byte blocks (indexed 0 to M - 1).
Support:
- \`ALLOC size\`: Allocate the first available contiguous free block of length \`size\`. Output the starting offset (or \`-1\` if insufficient memory).
- \`FREE offset\`: Free the block that was allocated at \`offset\` and return its memory to the pool.

### Input Format
First line: integer M (pool size, 1 ≤ M ≤ 10000) and Q (operations, 1 ≤ Q ≤ 1000).
Next Q lines: \`ALLOC size\` or \`FREE offset\`.

### Output Format
Print the starting offset for each \`ALLOC\` operation.`,
    starterCode: `#include <stdio.h>

int main() {
    int m, q;
    if (scanf("%d %d", &m, &q) != 2) return 0;
    // TODO: Simulate memory pool
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int m, q;
    if (scanf("%d %d", &m, &q) != 2) return 0;
    char mem[10005];
    memset(mem, 0, sizeof(mem));
    int allocSize[10005];
    memset(allocSize, 0, sizeof(allocSize));

    while (q--) {
        char op[10];
        scanf("%s", op);
        if (strcmp(op, "ALLOC") == 0) {
            int sz;
            scanf("%d", &sz);
            int start = -1;
            for (int i = 0; i <= m - sz; i++) {
                int free = 1;
                for (int j = 0; j < sz; j++) {
                    if (mem[i + j]) { free = 0; i += j; break; }
                }
                if (free) { start = i; break; }
            }
            if (start != -1) {
                for (int j = 0; j < sz; j++) mem[start + j] = 1;
                allocSize[start] = sz;
            }
            printf("%d\\n", start);
        } else if (strcmp(op, "FREE") == 0) {
            int off;
            scanf("%d", &off);
            if (off >= 0 && off < m && allocSize[off] > 0) {
                int sz = allocSize[off];
                for (int j = 0; j < sz; j++) mem[off + j] = 0;
                allocSize[off] = 0;
            }
        }
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("-1\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '10 4\nALLOC 4\nALLOC 4\nFREE 0\nALLOC 4', expectedOutput: '0\n4\n0' },
      { input: '5 2\nALLOC 6\nALLOC 2', expectedOutput: '-1\n0' },
    ],
    hiddenTests: [
      { input: '10 3\nALLOC 5\nALLOC 5\nALLOC 1', expectedOutput: '0\n5\n-1' },
      { input: '10 3\nALLOC 10\nFREE 0\nALLOC 10', expectedOutput: '0\n0' },
    ],
  },

  // 18. Hard: Bitwise N-Queens Counter
  {
    slug: 'practice-m5-p18-bitwise-n-queens',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 18,
    title: 'Bitwise N-Queens Solution Counter',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Backtracking', 'Bitwise', 'Recursion'],
    description: `### Problem Description

Given an integer N, count the total number of distinct solutions to place N non-attacking queens on an N×N chessboard using bitwise backtracking.

### Input Format
Single line with integer N (1 ≤ N ≤ 14).

### Output Format
Print the total number of valid board configurations.`,
    starterCode: `#include <stdio.h>

int solveNQueens(int n) {
    // TODO: Bitwise backtracking with cols, d1, d2
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%d\\n", solveNQueens(n));
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int count = 0;
void solve(int row, int cols, int d1, int d2, int fullMask) {
    if (cols == fullMask) { count++; return; }
    int available = fullMask & ~(cols | d1 | d2);
    while (available) {
        int bit = available & (-available);
        available -= bit;
        solve(row + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1, fullMask);
    }
}

int solveNQueens(int n) {
    count = 0;
    int fullMask = (1 << n) - 1;
    solve(0, 0, 0, 0, fullMask);
    return count;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%d\\n", solveNQueens(n));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){printf("1\\n");return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '4', expectedOutput: '2' },
      { input: '1', expectedOutput: '1' },
    ],
    hiddenTests: [
      { input: '8', expectedOutput: '92' },
      { input: '6', expectedOutput: '4' },
    ],
  },

  // 19. Hard: Maximum Subarray XOR (Trie-based O(N))
  {
    slug: 'practice-m5-p19-max-xor-trie',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 19,
    title: 'Maximum Subarray XOR (Binary Trie)',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Trie', 'Bitwise', 'Advanced Data Structures'],
    description: `### Problem Description

Given an array of N integers, find the maximum XOR subarray value (i.e. maximum XOR sum of contiguous elements) in O(N log(max_val)) using a binary Trie.

### Input Format
First line: integer N (1 ≤ N ≤ 50000).
Second line: N space-separated non-negative integers (0 ≤ arr[i] ≤ 10^7).

### Output Format
Print the maximum XOR sum among all contiguous subarrays.`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // TODO: Trie for prefix XOR
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct TrieNode {
    struct TrieNode* next[2];
} TrieNode;

TrieNode* createNode() {
    TrieNode* node = (TrieNode*)malloc(sizeof(TrieNode));
    node->next[0] = node->next[1] = NULL;
    return node;
}

void insert(TrieNode* root, int val) {
    TrieNode* cur = root;
    for (int i = 30; i >= 0; i--) {
        int b = (val >> i) & 1;
        if (!cur->next[b]) cur->next[b] = createNode();
        cur = cur->next[b];
    }
}

int queryMax(TrieNode* root, int val) {
    TrieNode* cur = root;
    int maxVal = 0;
    for (int i = 30; i >= 0; i--) {
        int b = (val >> i) & 1;
        int opp = 1 - b;
        if (cur->next[opp]) {
            maxVal |= (1 << i);
            cur = cur->next[opp];
        } else if (cur->next[b]) {
            cur = cur->next[b];
        } else {
            break;
        }
    }
    return maxVal;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    TrieNode* root = createNode();
    insert(root, 0);

    int maxRes = 0, prefixXor = 0;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        prefixXor ^= x;
        insert(root, prefixXor);
        int curMax = queryMax(root, prefixXor);
        if (curMax > maxRes) maxRes = curMax;
    }
    printf("%d\\n", maxRes);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '4\n1 2 3 4', expectedOutput: '7' },
      { input: '3\n8 1 2', expectedOutput: '11' },
    ],
    hiddenTests: [
      { input: '5\n3 10 5 25 2', expectedOutput: '28' },
      { input: '1\n15', expectedOutput: '15' },
    ],
  },

  // 20. Hard: Expression Evaluator with Operator Precedence (Dijkstra Shunting-Yard)
  {
    slug: 'practice-m5-p20-shunting-yard-evaluator',
    moduleSlug: 'advanced-competitive-c',
    moduleOrder: 20,
    title: 'Arithmetic Expression Evaluator (Shunting-Yard)',
    difficulty: 'HARD',
    category: 'Competitive Mastery & Capstone Arena',
    tags: ['Stack', 'Algorithms', 'Parsers', 'Systems'],
    description: `### Problem Description

Given a string expression containing non-negative integers, addition \`+\`, subtraction \`-\`, multiplication \`*\`, integer division \`/\`, and parentheses \`(\` and \`)\`, evaluate the expression honoring operator precedence and associativity.

### Input Format
A single line containing the expression (without spaces, 1 ≤ length ≤ 1000).

### Output Format
Print the evaluated integer result.`,
    starterCode: `#include <stdio.h>

int evaluateExpression(const char* s) {
    // TODO: Shunting-yard or recursive descent
    return 0;
}

int main() {
    char s[1005];
    if (scanf("%s", s) != 1) return 0;
    printf("%d\\n", evaluateExpression(s));
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <ctype.h>
#include <string.h>

long long applyOp(long long a, long long b, char op) {
    if (op == '+') return a + b;
    if (op == '-') return a - b;
    if (op == '*') return a * b;
    if (op == '/') return b != 0 ? a / b : 0;
    return 0;
}

int precedence(char op) {
    if (op == '+' || op == '-') return 1;
    if (op == '*' || op == '/') return 2;
    return 0;
}

int evaluateExpression(const char* s) {
    long long values[1000]; int valTop = -1;
    char ops[1000]; int opTop = -1;

    for (int i = 0; s[i]; i++) {
        if (isdigit(s[i])) {
            long long val = 0;
            while (s[i] && isdigit(s[i])) {
                val = (val * 10) + (s[i] - '0');
                i++;
            }
            i--;
            values[++valTop] = val;
        } else if (s[i] == '(') {
            ops[++opTop] = s[i];
        } else if (s[i] == ')') {
            while (opTop >= 0 && ops[opTop] != '(') {
                long long val2 = values[valTop--];
                long long val1 = values[valTop--];
                char op = ops[opTop--];
                values[++valTop] = applyOp(val1, val2, op);
            }
            if (opTop >= 0) opTop--; // remove '('
        } else if (s[i] == '+' || s[i] == '-' || s[i] == '*' || s[i] == '/') {
            while (opTop >= 0 && precedence(ops[opTop]) >= precedence(s[i])) {
                long long val2 = values[valTop--];
                long long val1 = values[valTop--];
                char op = ops[opTop--];
                values[++valTop] = applyOp(val1, val2, op);
            }
            ops[++opTop] = s[i];
        }
    }
    while (opTop >= 0) {
        long long val2 = values[valTop--];
        long long val1 = values[valTop--];
        char op = ops[opTop--];
        values[++valTop] = applyOp(val1, val2, op);
    }
    return (int)values[valTop];
}

int main() {
    char s[1005];
    if (scanf("%s", s) == 1) {
        printf("%d\\n", evaluateExpression(s));
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>\nint main(){printf("0\\n");return 0;}`,
    wrongSolution2: `#include <stdio.h>\nint main(){return 0;}`,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    basePoints: 30,
    sampleTests: [
      { input: '3+2*2', expectedOutput: '7' },
      { input: '(1+(4+5+2)-3)+(6+8)', expectedOutput: '23' },
    ],
    hiddenTests: [
      { input: '100/(2+3)*4', expectedOutput: '80' },
      { input: '42', expectedOutput: '42' },
    ],
  },
];
