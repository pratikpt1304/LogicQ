import type { TopicPracticeItem } from './topic-practice.data.js';

export const EXPANSION_PRACTICE_TOPICS_2: TopicPracticeItem[] = [
  // ==========================================
  // MODULE 3: ARRAYS, MATRICES & STRING PROCESSING (m3-t13 to m3-t25)
  // ==========================================
  {
    id: 'm3-t13-second-largest-element',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Second Largest Element in Array',
    summary: 'Find the second distinct largest number in an array in a single O(N) pass.',
    tipBox: {
      syntax: `int max1 = INT_MIN, max2 = INT_MIN;
for (int i = 0; i < n; i++) {
    if (arr[i] > max1) {
        max2 = max1;
        max1 = arr[i];
    } else if (arr[i] > max2 && arr[i] != max1) {
        max2 = arr[i];
    }
}`,
      application: 'Runner-up leaderboards, telemetry outlier filtering, and priority queue backup selectors.',
      example: `#include <stdio.h>
#include <limits.h>
int main() {
    int arr[] = {12, 35, 1, 10, 34, 1};
    int n = sizeof(arr)/sizeof(arr[0]);
    int m1 = INT_MIN, m2 = INT_MIN;
    for (int i = 0; i < n; i++) {
        if (arr[i] > m1) { m2 = m1; m1 = arr[i]; }
        else if (arr[i] > m2 && arr[i] != m1) { m2 = arr[i]; }
    }
    printf("Second largest: %d\\n", m2);
    return 0;
}`,
    },
    problem: {
      title: 'Second Largest Element',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer $N$ followed by $N$ integers in an array, find and print the **second largest distinct element** in the array. If no distinct second largest element exists (e.g. all elements are identical), print \`-1\`.

### Input Format
- First line contains an integer $N$ ($2 \\le N \\le 1000$).
- Second line contains $N$ space-separated integers ($-\\infty < arr[i] < \\infty$).

### Output Format
- Print the second largest distinct integer, or \`-1\` if none exists.`,
      starterCode: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) {
        printf("-1\\n");
        return 0;
    }
    
    // TODO: Read N elements and determine second largest in O(N) time
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) {
        printf("-1\\n");
        return 0;
    }
    long long max1 = -9223372036854775807LL - 1;
    long long max2 = -9223372036854775807LL - 1;
    for (int i = 0; i < n; i++) {
        long long val;
        scanf("%lld", &val);
        if (val > max1) {
            max2 = max1;
            max1 = val;
        } else if (val > max2 && val != max1) {
            max2 = val;
        }
    }
    if (max2 == -9223372036854775807LL - 1) {
        printf("-1\\n");
    } else {
        printf("%lld\\n", max2);
    }
    return 0;
}`,
      openTestCase: {
        input: `6
12 35 1 10 34 1`,
        expectedOutput: '34',
        explanation: 'The largest is 35, and the second distinct largest is 34.',
      },
      hiddenTestCase: {
        input: `4
50 50 50 50`,
        expectedOutput: '-1',
      },
    },
  },
  {
    id: 'm3-t14-remove-duplicates-sorted',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'In-Place Duplicate Removal (Sorted Array)',
    summary: 'Deduplicate a sorted array in-place using the two-pointer technique.',
    tipBox: {
      syntax: `// Two-pointer write head pattern
int writeIdx = 0;
for (int readIdx = 1; readIdx < n; readIdx++) {
    if (arr[readIdx] != arr[writeIdx]) {
        writeIdx++;
        arr[writeIdx] = arr[readIdx];
    }
}
int uniqueCount = writeIdx + 1;`,
      application: 'Memory compaction in storage engines, sorted log ingestion, and indexing pipelines.',
      example: `#include <stdio.h>
int main() {
    int arr[] = {1, 1, 2, 2, 3, 4, 4};
    int n = 7, w = 0;
    for (int r = 1; r < n; r++) {
        if (arr[r] != arr[w]) {
            arr[++w] = arr[r];
        }
    }
    for (int i = 0; i <= w; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Remove Duplicates from Sorted Array',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a sorted array of $N$ integers in non-decreasing order, remove duplicates **in-place** such that each unique element appears only once. Print the unique elements separated by space.

### Input Format
- First line contains $N$ ($1 \\le N \\le 1000$).
- Second line contains $N$ space-separated integers in non-decreasing order.

### Output Format
- Print the compacted array of unique elements separated by space, followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    // TODO: Compact arr in-place and print unique elements
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    int w = 0;
    for (int r = 1; r < n; r++) {
        if (arr[r] != arr[w]) {
            w++;
            arr[w] = arr[r];
        }
    }
    for (int i = 0; i <= w; i++) {
        printf("%d%s", arr[i], (i == w) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `7
1 1 2 2 3 4 4`,
        expectedOutput: '1 2 3 4',
        explanation: 'Duplicates of 1, 2, and 4 are removed.',
      },
      hiddenTestCase: {
        input: `5
10 10 10 10 10`,
        expectedOutput: '10',
      },
    },
  },
  {
    id: 'm3-t15-kadanes-algorithm',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: "Maximum Subarray Sum (Kadane's Algorithm)",
    summary: 'Compute contiguous subarray with the largest sum in optimal O(N) dynamic programming.',
    tipBox: {
      syntax: `long long currentSum = arr[0], maxSum = arr[0];
for (int i = 1; i < n; i++) {
    currentSum = (arr[i] > currentSum + arr[i]) ? arr[i] : (currentSum + arr[i]);
    if (currentSum > maxSum) maxSum = currentSum;
}`,
      application: 'Stock market profit analysis, image burst noise detection, and genomic DNA peak scoring.',
      example: `#include <stdio.h>
int main() {
    int a[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int n = 9;
    int curr = a[0], best = a[0];
    for (int i = 1; i < n; i++) {
        curr = (a[i] > curr + a[i]) ? a[i] : curr + a[i];
        if (curr > best) best = curr;
    }
    printf("Max Subarray Sum: %d\\n", best);
    return 0;
}`,
    },
    problem: {
      title: "Kadane's Maximum Subarray Sum",
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given an array of $N$ integers containing positive and negative values, find the maximum sum of a contiguous non-empty subarray using **Kadane's Algorithm**.

### Input Format
- First line contains integer $N$ ($1 \\le N \\le 10^5$).
- Second line contains $N$ space-separated integers.

### Output Format
- Print a single integer representing the maximum subarray sum.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    // TODO: Implement Kadane's algorithm in O(N) time and O(1) extra space
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long first;
    scanf("%lld", &first);
    long long curr = first;
    long long best = first;
    for (int i = 1; i < n; i++) {
        long long val;
        scanf("%lld", &val);
        curr = (val > curr + val) ? val : (curr + val);
        if (curr > best) best = curr;
    }
    printf("%lld\\n", best);
    return 0;
}`,
      openTestCase: {
        input: `9
-2 1 -3 4 -1 2 1 -5 4`,
        expectedOutput: '6',
        explanation: 'Contiguous subarray [4, -1, 2, 1] has maximum sum 6.',
      },
      hiddenTestCase: {
        input: `4
-5 -3 -8 -2`,
        expectedOutput: '-2',
      },
    },
  },
  {
    id: 'm3-t16-two-sum-sorted',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Two-Pointer Target Sum',
    summary: 'Find two indices in a sorted array that sum to a target value in linear time.',
    tipBox: {
      syntax: `int left = 0, right = n - 1;
while (left < right) {
    int sum = arr[left] + arr[right];
    if (sum == target) { /* found */ break; }
    else if (sum < target) left++;
    else right--;
}`,
      application: 'Financial portfolio balance matching, packet pairing, and collision resolution.',
      example: `#include <stdio.h>
int main() {
    int arr[] = {2, 7, 11, 15}, target = 9;
    int l = 0, r = 3;
    while (l < r) {
        int s = arr[l] + arr[r];
        if (s == target) { printf("%d %d\\n", arr[l], arr[r]); break; }
        else if (s < target) l++;
        else r--;
    }
    return 0;
}`,
    },
    problem: {
      title: 'Two Sum in Sorted Array',
      difficulty: 'EASY',
      description: `### Problem Description
Given a sorted array of $N$ integers and a target sum $T$, find two elements in the array whose sum equals $T$. Print the two elements separated by space (smaller element first). If no pair exists, print \`NO PAIR\`.

### Input Format
- First line contains $N$ and $T$.
- Second line contains $N$ space-separated integers in ascending order.

### Output Format
- Print \`val1 val2\` or \`NO PAIR\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    // TODO: Two-pointer search for target sum
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int l = 0, r = n - 1;
    int found = 0;
    while (l < r) {
        int s = arr[l] + arr[r];
        if (s == target) {
            printf("%d %d\\n", arr[l], arr[r]);
            found = 1;
            break;
        } else if (s < target) {
            l++;
        } else {
            r--;
        }
    }
    if (!found) printf("NO PAIR\\n");
    return 0;
}`,
      openTestCase: {
        input: `4 9
2 7 11 15`,
        expectedOutput: '2 7',
        explanation: '2 + 7 = 9.',
      },
      hiddenTestCase: {
        input: `4 20
1 3 5 7`,
        expectedOutput: 'NO PAIR',
      },
    },
  },
  {
    id: 'm3-t17-matrix-transpose',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'In-Place Square Matrix Transpose',
    summary: 'Transpose an N x N 2D matrix by swapping elements across the main diagonal.',
    tipBox: {
      syntax: `for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
        int temp = mat[i][j];
        mat[i][j] = mat[j][i];
        mat[j][i] = temp;
    }
}`,
      application: 'Computer graphics transformations, DSP frequency convolution, and tensor algebra.',
      example: `#include <stdio.h>
int main() {
    int m[2][2] = {{1, 2}, {3, 4}};
    int t = m[0][1]; m[0][1] = m[1][0]; m[1][0] = t;
    printf("%d %d\\n%d %d\\n", m[0][0], m[0][1], m[1][0], m[1][1]);
    return 0;
}`,
    },
    problem: {
      title: 'In-Place Matrix Transpose',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given an $N \\times N$ square matrix, transpose the matrix in-place by swapping $A[i][j]$ with $A[j][i]$ for all $j > i$. Print the transposed matrix.

### Input Format
- First line contains $N$ ($1 \\le N \\le 20$).
- Next $N$ lines each contain $N$ space-separated integers.

### Output Format
- Print the transposed $N \\times N$ matrix with elements separated by space and rows on newlines.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int mat[20][20];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    
    // TODO: In-place transpose across main diagonal
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int mat[20][20];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int tmp = mat[i][j];
            mat[i][j] = mat[j][i];
            mat[j][i] = tmp;
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], (j == n - 1) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
      openTestCase: {
        input: `3
1 2 3
4 5 6
7 8 9`,
        expectedOutput: `1 4 7
2 5 8
3 6 9`,
        explanation: 'Rows become columns across the main diagonal.',
      },
      hiddenTestCase: {
        input: `2
1 9
4 8`,
        expectedOutput: `1 4
9 8`,
      },
    },
  },
  {
    id: 'm3-t18-symmetric-matrix',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Symmetric Matrix Validator',
    summary: 'Check if a matrix equals its transpose (A[i][j] == A[j][i] for all pairs).',
    tipBox: {
      syntax: `int isSymmetric = 1;
for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
        if (mat[i][j] != mat[j][i]) { isSymmetric = 0; break; }
    }
    if (!isSymmetric) break;
}`,
      application: 'Graph adjacency matrices for undirected graphs, covariance matrices in statistics, and stress tensors in mechanics.',
      example: `#include <stdio.h>
int main() {
    int m[2][2] = {{1, 3}, {3, 5}};
    printf("%s\\n", (m[0][1] == m[1][0]) ? "SYMMETRIC" : "NOT SYMMETRIC");
    return 0;
}`,
    },
    problem: {
      title: 'Symmetric Matrix Checker',
      difficulty: 'EASY',
      description: `### Problem Description
Given an $N \\times N$ matrix, determine whether it is symmetric. A matrix is symmetric if $A[i][j] = A[j][i]$ for all $0 \\le i, j < N$.

### Input Format
- First line contains $N$ ($1 \\le N \\le 20$).
- Next $N$ lines each contain $N$ space-separated integers.

### Output Format
- Print \`SYMMETRIC\` if symmetric, otherwise \`NOT SYMMETRIC\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int mat[20][20];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    
    // TODO: Verify if mat[i][j] == mat[j][i]
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int mat[20][20];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }
    int sym = 1;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (mat[i][j] != mat[j][i]) {
                sym = 0;
                break;
            }
        }
        if (!sym) break;
    }
    printf("%s\\n", sym ? "SYMMETRIC" : "NOT SYMMETRIC");
    return 0;
}`,
      openTestCase: {
        input: `3
1 2 3
2 4 5
3 5 6`,
        expectedOutput: 'SYMMETRIC',
        explanation: 'All off-diagonal pairs are mirrored identically.',
      },
      hiddenTestCase: {
        input: `2
1 2
3 4`,
        expectedOutput: 'NOT SYMMETRIC',
      },
    },
  },
  {
    id: 'm3-t19-count-vowels-consonants',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Character Categorization & Counts',
    summary: 'Categorize string characters into vowels, consonants, digits, and spaces.',
    tipBox: {
      syntax: `#include <ctype.h>
if (isalpha(ch)) {
    char lower = tolower(ch);
    if (lower == 'a' || lower == 'e' || lower == 'i' || lower == 'o' || lower == 'u')
        vowels++;
    else
        consonants++;
} else if (isdigit(ch)) digits++;
else if (isspace(ch)) spaces++;`,
      application: 'Text processing NLP pipelines, compiler lexical tokenization, and input sanitary scoring.',
      example: `#include <stdio.h>
#include <ctype.h>
int main() {
    char s[] = "Hello 123";
    int v = 0, c = 0;
    for (int i = 0; s[i]; i++) {
        if (isalpha(s[i])) {
            char l = tolower(s[i]);
            if (l=='a'||l=='e'||l=='i'||l=='o'||l=='u') v++;
            else c++;
        }
    }
    printf("Vowels: %d, Consonants: %d\\n", v, c);
    return 0;
}`,
    },
    problem: {
      title: 'Count Vowels and Consonants',
      difficulty: 'EASY',
      description: `### Problem Description
Given a line of text, count the total number of vowels and consonants (case-insensitive). Ignore digits, spaces, and punctuation.

### Input Format
- A single line of text (up to 200 characters, may contain spaces).

### Output Format
- Print: \`Vowels: <v>, Consonants: <c>\``,
      starterCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    char str[256];
    if (!fgets(str, sizeof(str), stdin)) return 0;
    
    // TODO: Count vowels and consonants
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    char str[256];
    if (!fgets(str, sizeof(str), stdin)) return 0;
    int v = 0, c = 0;
    for (int i = 0; str[i] != '\\0'; i++) {
        if (isalpha((unsigned char)str[i])) {
            char ch = tolower((unsigned char)str[i]);
            if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') {
                v++;
            } else {
                c++;
            }
        }
    }
    printf("Vowels: %d, Consonants: %d\\n", v, c);
    return 0;
}`,
      openTestCase: {
        input: 'Programming in C is fun!',
        expectedOutput: 'Vowels: 6, Consonants: 12',
        explanation: 'Vowels: o, a, i, i, i, u (6). Consonants: P, r, g, r, m, m, n, g, n, C, s, f, n (12 total letters minus vowels).',
      },
      hiddenTestCase: {
        input: 'AEIOU aeiou',
        expectedOutput: 'Vowels: 10, Consonants: 0',
      },
    },
  },
  {
    id: 'm3-t20-reverse-words-sentence',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Reverse Individual Words in a Sentence',
    summary: 'Reverse each word in place within a sentence while preserving original word ordering.',
    tipBox: {
      syntax: `void reverseRange(char *s, int start, int end) {
    while (start < end) {
        char temp = s[start];
        s[start++] = s[end];
        s[end--] = temp;
    }
}`,
      application: 'Text formatting utilities, palindrome sentence detection, and stream token reversal.',
      example: `#include <stdio.h>
#include <string.h>
void rev(char *s, int i, int j) {
    while (i < j) { char t = s[i]; s[i++] = s[j]; s[j--] = t; }
}
int main() {
    char str[] = "hello world";
    rev(str, 0, 4);
    rev(str, 6, 10);
    printf("%s\\n", str); // olleh dlrow
    return 0;
}`,
    },
    problem: {
      title: 'Reverse Words in Sentence',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a single line containing words separated by single spaces, reverse the characters of each individual word in-place while keeping the relative order of the words intact.

### Input Format
- A single line of text with space-separated words (up to 300 characters).

### Output Format
- Print the sentence with every word reversed.`,
      starterCode: `#include <stdio.h>
#include <string.h>

// TODO: Helper function to reverse characters between start and end

int main() {
    char s[350];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    // Strip trailing newline if present
    s[strcspn(s, "\\r\\n")] = 0;
    
    // TODO: Reverse each word
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

void rev(char *s, int i, int j) {
    while (i < j) {
        char t = s[i];
        s[i++] = s[j];
        s[j--] = t;
    }
}

int main() {
    char s[350];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    s[strcspn(s, "\\r\\n")] = 0;
    int len = strlen(s);
    int start = 0;
    for (int i = 0; i <= len; i++) {
        if (s[i] == ' ' || s[i] == '\\0') {
            rev(s, start, i - 1);
            start = i + 1;
        }
    }
    printf("%s\\n", s);
    return 0;
}`,
      openTestCase: {
        input: 'hello world logicq',
        expectedOutput: 'olleh dlrow qcigol',
        explanation: 'Each individual word is reversed while maintaining word positions.',
      },
      hiddenTestCase: {
        input: 'Embedded Systems',
        expectedOutput: 'deddebmE smetsyS',
      },
    },
  },
  {
    id: 'm3-t21-run-length-compression',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Run-Length String Compression',
    summary: 'Compress consecutive identical characters into character and frequency counts.',
    tipBox: {
      syntax: `int count = 1;
for (int i = 0; str[i]; i++) {
    if (str[i] == str[i+1]) count++;
    else {
        printf("%c%d", str[i], count);
        count = 1;
    }
}`,
      application: 'Lossless image compression (TIFF, BMP), sensor stream deduplication, and fax protocols.',
      example: `#include <stdio.h>
int main() {
    char s[] = "aaabbc";
    int c = 1;
    for (int i = 0; s[i]; i++) {
        if (s[i] == s[i+1]) c++;
        else { printf("%c%d", s[i], c); c = 1; }
    }
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Run-Length Compression',
      difficulty: 'EASY',
      description: `### Problem Description
Given a string of lowercase alphabet characters, encode it using basic Run-Length Encoding (RLE). Output each distinct character followed immediately by its consecutive count.

### Input Format
- A single non-empty string consisting of lowercase letters (up to 200 characters).

### Output Format
- Print the compressed string.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char str[256];
    if (scanf("%s", str) != 1) return 0;
    
    // TODO: Perform Run-Length Encoding
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char str[256];
    if (scanf("%s", str) != 1) return 0;
    int count = 1;
    for (int i = 0; str[i] != '\\0'; i++) {
        if (str[i] == str[i + 1]) {
            count++;
        } else {
            printf("%c%d", str[i], count);
            count = 1;
        }
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: 'aaabbc',
        expectedOutput: 'a3b2c1',
        explanation: '3 a\'s, 2 b\'s, 1 c.',
      },
      hiddenTestCase: {
        input: 'wwwwaaadexxxxxx',
        expectedOutput: 'w4a3d1e1x6',
      },
    },
  },
  {
    id: 'm3-t22-subsequence-checker',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'String Subsequence Validator',
    summary: 'Check if string S is a subsequence of string T using the two-pointer technique.',
    tipBox: {
      syntax: `int i = 0, j = 0;
while (i < lenS && j < lenT) {
    if (S[i] == T[j]) i++;
    j++;
}
int isSubsequence = (i == lenS);`,
      application: 'Fuzzy search autocompletion, DNA sequence motif matching, and git diff hunk matching.',
      example: `#include <stdio.h>
int main() {
    char s[] = "abc", t[] = "ahbgdc";
    int i = 0, j = 0;
    while (s[i] && t[j]) {
        if (s[i] == t[j]) i++;
        j++;
    }
    printf("%s\\n", s[i] == '\\0' ? "YES" : "NO");
    return 0;
}`,
    },
    problem: {
      title: 'Subsequence Checker',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given two strings $S$ and $T$, determine if $S$ is a subsequence of $T$. A subsequence is formed from another string by deleting zero or more characters without changing the relative order of the remaining characters.

### Input Format
- First line contains string $S$ (up to 100 characters).
- Second line contains string $T$ (up to 500 characters).

### Output Format
- Print \`YES\` if $S$ is a subsequence of $T$, otherwise print \`NO\`.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char S[128], T[512];
    if (scanf("%s %s", S, T) != 2) return 0;
    
    // TODO: Verify if S is a subsequence of T
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char S[128], T[512];
    if (scanf("%s %s", S, T) != 2) return 0;
    int i = 0, j = 0;
    while (S[i] != '\\0' && T[j] != '\\0') {
        if (S[i] == T[j]) {
            i++;
        }
        j++;
    }
    printf("%s\\n", (S[i] == '\\0') ? "YES" : "NO");
    return 0;
}`,
      openTestCase: {
        input: `abc
ahbgdc`,
        expectedOutput: 'YES',
        explanation: 'Characters a, b, c appear in order within ahbgdc.',
      },
      hiddenTestCase: {
        input: `axc
ahbgdc`,
        expectedOutput: 'NO',
      },
    },
  },
  {
    id: 'm3-t23-selection-sort',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Selection Sort Algorithm',
    summary: 'Sort an array by repeatedly finding the minimum element from the unsorted part.',
    tipBox: {
      syntax: `for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
        if (arr[j] < arr[minIdx]) minIdx = j;
    }
    int temp = arr[minIdx];
    arr[minIdx] = arr[i];
    arr[i] = temp;
}`,
      application: 'Flash memory systems where writing to flash is very expensive (Selection Sort makes minimum O(N) swaps).',
      example: `#include <stdio.h>
int main() {
    int a[] = {64, 25, 12, 22, 11};
    int n = 5;
    for (int i = 0; i < n - 1; i++) {
        int m = i;
        for (int j = i + 1; j < n; j++) if (a[j] < a[m]) m = j;
        int t = a[m]; a[m] = a[i]; a[i] = t;
    }
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Selection Sort',
      difficulty: 'EASY',
      description: `### Problem Description
Given an integer array of size $N$, sort it in ascending order using **Selection Sort**. Print the sorted array elements separated by a space.

### Input Format
- First line contains $N$ ($1 \\le N \\le 500$).
- Second line contains $N$ space-separated integers.

### Output Format
- Print the sorted array separated by spaces.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[500];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    // TODO: Implement Selection Sort
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[500];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        int tmp = arr[minIdx];
        arr[minIdx] = arr[i];
        arr[i] = tmp;
    }
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `5
64 25 12 22 11`,
        expectedOutput: '11 12 22 25 64',
        explanation: 'Array is sorted in ascending order.',
      },
      hiddenTestCase: {
        input: `4
9 -2 0 5`,
        expectedOutput: '-2 0 5 9',
      },
    },
  },
  {
    id: 'm3-t24-merge-sorted-arrays',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Merge Two Sorted Arrays',
    summary: 'Merge two separately sorted arrays into a single combined sorted array in O(N+M) time.',
    tipBox: {
      syntax: `int i = 0, j = 0, k = 0;
while (i < n1 && j < n2) {
    if (a[i] <= b[j]) c[k++] = a[i++];
    else c[k++] = b[j++];
}
while (i < n1) c[k++] = a[i++];
while (j < n2) c[k++] = b[j++];`,
      application: 'Core merge step in MergeSort, multi-way external merge sort in databases, and feed aggregation.',
      example: `#include <stdio.h>
int main() {
    int a[] = {1, 3, 5}, b[] = {2, 4, 6};
    int c[6], i = 0, j = 0, k = 0;
    while (i < 3 && j < 3) c[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];
    while (i < 3) c[k++] = a[i++];
    while (j < 3) c[k++] = b[j++];
    for (int x = 0; x < 6; x++) printf("%d ", c[x]);
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Merge Two Sorted Arrays',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given two sorted arrays $A$ of size $N$ and $B$ of size $M$, merge them into a single sorted array of size $N+M$ in linear $O(N+M)$ time.

### Input Format
- First line contains $N$ and $M$ ($1 \\le N, M \\le 500$).
- Second line contains $N$ space-separated integers in ascending order.
- Third line contains $M$ space-separated integers in ascending order.

### Output Format
- Print the merged $N+M$ sorted integers separated by space.`,
      starterCode: `#include <stdio.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    int a[500], b[500];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < m; i++) scanf("%d", &b[i]);
    
    // TODO: Merge a and b in O(N+M) time
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    int a[500], b[500], c[1000];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < m; i++) scanf("%d", &b[i]);
    
    int i = 0, j = 0, k = 0;
    while (i < n && j < m) {
        if (a[i] <= b[j]) {
            c[k++] = a[i++];
        } else {
            c[k++] = b[j++];
        }
    }
    while (i < n) c[k++] = a[i++];
    while (j < m) c[k++] = b[j++];
    
    for (int x = 0; x < k; x++) {
        printf("%d%s", c[x], (x == k - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `3 3
1 3 5
2 4 6`,
        expectedOutput: '1 2 3 4 5 6',
        explanation: 'Both arrays are interleaved into sorted order.',
      },
      hiddenTestCase: {
        input: `2 4
10 20
5 15 25 30`,
        expectedOutput: '5 10 15 20 25 30',
      },
    },
  },
  {
    id: 'm3-t25-dutch-national-flag',
    moduleIndex: 3,
    moduleSlug: 'arrays-and-strings',
    moduleTitle: 'Module 3: Arrays & Strings',
    topicTitle: 'Dutch National Flag 3-Way Partition',
    summary: 'Sort an array of 0s, 1s, and 2s in a single pass with O(1) extra space.',
    tipBox: {
      syntax: `int low = 0, mid = 0, high = n - 1;
while (mid <= high) {
    if (arr[mid] == 0) {
        swap(&arr[low++], &arr[mid++]);
    } else if (arr[mid] == 1) {
        mid++;
    } else {
        swap(&arr[mid], &arr[high--]);
    }
}`,
      application: 'QuickSort 3-way partition optimization (handling multiple duplicate pivots), classifier binning, and traffic priority sorting.',
      example: `#include <stdio.h>
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
int main() {
    int a[] = {2, 0, 2, 1, 1, 0}, n = 6;
    int lo = 0, mid = 0, hi = n - 1;
    while (mid <= hi) {
        if (a[mid] == 0) swap(&a[lo++], &a[mid++]);
        else if (a[mid] == 1) mid++;
        else swap(&a[mid], &a[hi--]);
    }
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Sort 0s, 1s, and 2s',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given an array consisting only of $0$s, $1$s, and $2$s, sort the array in ascending order in a single pass using Dijkstra's **Dutch National Flag algorithm** without using library sorting functions.

### Input Format
- First line contains $N$ ($1 \\le N \\le 1000$).
- Second line contains $N$ space-separated integers (each is $0, 1,$ or $2$).

### Output Format
- Print the sorted array separated by spaces.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    // TODO: Dutch National Flag 3-way partition
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

static inline void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    int low = 0, mid = 0, high = n - 1;
    while (mid <= high) {
        if (arr[mid] == 0) {
            swap(&arr[low++], &arr[mid++]);
        } else if (arr[mid] == 1) {
            mid++;
        } else {
            swap(&arr[mid], &arr[high--]);
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}`,
      openTestCase: {
        input: `6
2 0 2 1 1 0`,
        expectedOutput: '0 0 1 1 2 2',
        explanation: 'All 0s come first, then 1s, then 2s.',
      },
      hiddenTestCase: {
        input: `4
2 1 1 0`,
        expectedOutput: '0 1 1 2',
      },
    },
  },

  // ==========================================
  // MODULE 4: STRUCTS, UNIONS, DMA & LINKED LISTS (m4-t13 to m4-t25)
  // ==========================================
  {
    id: 'm4-t13-dynamic-1d-array',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Dynamic 1D Array Allocation & Growth',
    summary: 'Allocate heap memory dynamically with malloc and expand capacity with realloc.',
    tipBox: {
      syntax: `int *arr = (int *)malloc(initialCap * sizeof(int));
// Resizing safely:
int *temp = (int *)realloc(arr, newCap * sizeof(int));
if (temp != NULL) arr = temp;
free(arr);
arr = NULL;`,
      application: 'Dynamic vector implementations, variable-length network packet buffers, and heap-allocated telemetry streams.',
      example: `#include <stdio.h>
#include <stdlib.h>
int main() {
    int *a = malloc(2 * sizeof(int));
    a[0] = 10; a[1] = 20;
    a = realloc(a, 3 * sizeof(int));
    a[2] = 30;
    printf("%d %d %d\\n", a[0], a[1], a[2]);
    free(a);
    return 0;
}`,
    },
    problem: {
      title: 'Dynamic Array Resizer',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Allocate an initial heap array of size $2$. Read integers one by one until $-1$ is encountered. Whenever the current capacity is reached, double the capacity using \`realloc\`. Finally, print all stored numbers, the count of elements stored, and the final allocated capacity. Ensure all allocated heap memory is freed before program termination.

### Input Format
- A sequence of non-negative integers terminated by \`-1\`.

### Output Format
- Line 1: Stored numbers separated by space.
- Line 2: \`Count: <c>, Capacity: <cap>\``,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int capacity = 2;
    int count = 0;
    int *arr = (int *)malloc(capacity * sizeof(int));
    if (!arr) return 1;
    
    // TODO: Read integers, resize on full, stop on -1
    
    free(arr);
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int capacity = 2;
    int count = 0;
    int *arr = (int *)malloc(capacity * sizeof(int));
    if (!arr) return 1;
    
    int val;
    while (scanf("%d", &val) == 1 && val != -1) {
        if (count == capacity) {
            capacity *= 2;
            int *tmp = (int *)realloc(arr, capacity * sizeof(int));
            if (!tmp) {
                free(arr);
                return 1;
            }
            arr = tmp;
        }
        arr[count++] = val;
    }
    for (int i = 0; i < count; i++) {
        printf("%d%s", arr[i], (i == count - 1) ? "" : " ");
    }
    printf("\\nCount: %d, Capacity: %d\\n", count, capacity);
    free(arr);
    return 0;
}`,
      openTestCase: {
        input: '10 20 30 -1',
        expectedOutput: `10 20 30
Count: 3, Capacity: 4`,
        explanation: 'Initial capacity is 2. 3 elements trigger doubling capacity to 4.',
      },
      hiddenTestCase: {
        input: '1 2 3 4 5 -1',
        expectedOutput: `1 2 3 4 5
Count: 5, Capacity: 8`,
      },
    },
  },
  {
    id: 'm4-t14-dynamic-2d-matrix',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Dynamic 2D Matrix (Pointer to Pointer)',
    summary: 'Allocate and deallocate a heap 2D matrix using an array of row pointers (int**).',
    tipBox: {
      syntax: `int **mat = (int **)malloc(rows * sizeof(int *));
for (int i = 0; i < rows; i++) {
    mat[i] = (int *)malloc(cols * sizeof(int));
}
// Clean-up must be reverse order:
for (int i = 0; i < rows; i++) free(mat[i]);
free(mat);`,
      application: 'Dynamic jagged arrays, image convolution filters with runtime dimensions, and graph adjacency lists.',
      example: `#include <stdio.h>
#include <stdlib.h>
int main() {
    int r = 2, c = 2;
    int **m = malloc(r * sizeof(int*));
    for (int i = 0; i < r; i++) m[i] = malloc(c * sizeof(int));
    m[0][0] = 5; m[0][1] = 6; m[1][0] = 7; m[1][1] = 8;
    printf("%d %d\\n", m[0][0], m[1][1]);
    for (int i = 0; i < r; i++) free(m[i]);
    free(m);
    return 0;
}`,
    },
    problem: {
      title: 'Dynamic 2D Matrix Sum',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given dimensions $R$ and $C$, dynamically allocate an $R \\times C$ matrix on the heap using \`int **\`. Read the matrix elements, compute the sum of each row, and print the row sums. Ensure all heap allocations are safely freed without memory leaks.

### Input Format
- First line contains $R$ and $C$ ($1 \\le R, C \\le 50$).
- Next $R$ lines each contain $C$ space-separated integers.

### Output Format
- Print $R$ lines, where line $i$ is: \`Row <i>: <sum>\` (0-indexed).`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    // TODO: Dynamically allocate R x C matrix, calculate row sums, and free
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    int **mat = (int **)malloc(r * sizeof(int *));
    if (!mat) return 1;
    for (int i = 0; i < r; i++) {
        mat[i] = (int *)malloc(c * sizeof(int));
    }
    
    for (int i = 0; i < r; i++) {
        long long sum = 0;
        for (int j = 0; j < c; j++) {
            scanf("%d", &mat[i][j]);
            sum += mat[i][j];
        }
        printf("Row %d: %lld\\n", i, sum);
    }
    
    for (int i = 0; i < r; i++) {
        free(mat[i]);
    }
    free(mat);
    return 0;
}`,
      openTestCase: {
        input: `2 3
1 2 3
4 5 6`,
        expectedOutput: `Row 0: 6
Row 1: 15`,
        explanation: 'Row 0 sum: 1+2+3 = 6. Row 1 sum: 4+5+6 = 15.',
      },
      hiddenTestCase: {
        input: `3 2
10 20
30 40
50 60`,
        expectedOutput: `Row 0: 30
Row 1: 70
Row 2: 110`,
      },
    },
  },
  {
    id: 'm4-t15-student-record-aggregate',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Student Record Struct & Grade Aggregator',
    summary: 'Design a student record struct, compute aggregate marks, and determine performance rank.',
    tipBox: {
      syntax: `typedef struct {
    int roll;
    char name[50];
    int marks[3];
    float percentage;
} Student;`,
      application: 'Academic grading databases, employee payroll compensation calculators, and medical records aggregation.',
      example: `#include <stdio.h>
typedef struct {
    char name[20];
    int total;
} Student;
int main() {
    Student s = {"Aman", 270};
    printf("%s: %.2f%%\\n", s.name, s.total / 3.0);
    return 0;
}`,
    },
    problem: {
      title: 'Student Grade Evaluator',
      difficulty: 'EASY',
      description: `### Problem Description
Define a struct \`Student\` with fields: \`roll\` (integer), \`name\` (string up to 30 chars), and 3 subject marks ($m_1, m_2, m_3$). Calculate the average percentage. If average $\\ge 75.0$, grade is \`DISTINCTION\`; if $\\ge 60.0$, \`FIRST CLASS\`; if $\\ge 40.0$, \`PASS\`; otherwise \`FAIL\`.

### Input Format
- \`<roll> <name> <m1> <m2> <m3>\`

### Output Format
- Print: \`<name> (Roll <roll>): Average = <avg>%, Grade = <grade>\` (avg formatted to 2 decimal places).`,
      starterCode: `#include <stdio.h>

typedef struct {
    int roll;
    char name[32];
    int marks[3];
} Student;

int main() {
    Student s;
    if (scanf("%d %s %d %d %d", &s.roll, s.name, &s.marks[0], &s.marks[1], &s.marks[2]) != 5) return 0;
    
    // TODO: Compute average and assign grade
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

typedef struct {
    int roll;
    char name[32];
    int marks[3];
} Student;

int main() {
    Student s;
    if (scanf("%d %s %d %d %d", &s.roll, s.name, &s.marks[0], &s.marks[1], &s.marks[2]) != 5) return 0;
    
    float avg = (s.marks[0] + s.marks[1] + s.marks[2]) / 3.0f;
    const char *grade;
    if (avg >= 75.0f) grade = "DISTINCTION";
    else if (avg >= 60.0f) grade = "FIRST CLASS";
    else if (avg >= 40.0f) grade = "PASS";
    else grade = "FAIL";
    
    printf("%s (Roll %d): Average = %.2f%%, Grade = %s\\n", s.name, s.roll, avg, grade);
    return 0;
}`,
      openTestCase: {
        input: '101 Rahul 80 85 90',
        expectedOutput: 'Rahul (Roll 101): Average = 85.00%, Grade = DISTINCTION',
        explanation: 'Average is (80+85+90)/3 = 85.00% >= 75, so DISTINCTION.',
      },
      hiddenTestCase: {
        input: '102 Priya 55 60 50',
        expectedOutput: 'Priya (Roll 102): Average = 55.00%, Grade = PASS',
      },
    },
  },
  {
    id: 'm4-t16-nested-struct-employee',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Nested Structures Composition',
    summary: 'Compose real-world domain models using nested structs (e.g. Employee with DateOfBirth).',
    tipBox: {
      syntax: `typedef struct {
    int day, month, year;
} Date;

typedef struct {
    int empId;
    Date dob;
} Employee;
emp.dob.year = 2000;`,
      application: 'Complex business entities, geometric shapes (Triangle containing 3 Point structs), and protocol headers containing IP/TCP headers.',
      example: `#include <stdio.h>
typedef struct { int dd, mm, yyyy; } Date;
typedef struct { char name[20]; Date joined; } Emp;
int main() {
    Emp e = {"Neha", {15, 8, 2024}};
    printf("%s joined %02d/%02d/%d\\n", e.name, e.joined.dd, e.joined.mm, e.joined.yyyy);
    return 0;
}`,
    },
    problem: {
      title: 'Nested Employee Date Validation',
      difficulty: 'EASY',
      description: `### Problem Description
Define a nested struct where \`Date\` has \`day, month, year\`, and \`Employee\` has \`id, name\`, and \`Date doj\` (date of joining). Given employee data, print their details in the standard format: \`ID: <id> | Name: <name> | Joined: DD-MM-YYYY\` (with 2-digit zero-padded day and month).

### Input Format
- \`<id> <name> <day> <month> <year>\`

### Output Format
- Print: \`ID: <id> | Name: <name> | Joined: DD-MM-YYYY\``,
      starterCode: `#include <stdio.h>

typedef struct {
    int day;
    int month;
    int year;
} Date;

typedef struct {
    int id;
    char name[32];
    Date doj;
} Employee;

int main() {
    Employee emp;
    // TODO: Read inputs and print formatted date
    return 0;
}`,
      solutionCode: `#include <stdio.h>

typedef struct {
    int day;
    int month;
    int year;
} Date;

typedef struct {
    int id;
    char name[32];
    Date doj;
} Employee;

int main() {
    Employee emp;
    if (scanf("%d %s %d %d %d", &emp.id, emp.name, &emp.doj.day, &emp.doj.month, &emp.doj.year) != 5) return 0;
    printf("ID: %d | Name: %s | Joined: %02d-%02d-%04d\\n", emp.id, emp.name, emp.doj.day, emp.doj.month, emp.doj.year);
    return 0;
}`,
      openTestCase: {
        input: '1001 Anita 5 3 2024',
        expectedOutput: 'ID: 1001 | Name: Anita | Joined: 05-03-2024',
        explanation: 'Day 5 and month 3 are zero-padded to 05 and 03.',
      },
      hiddenTestCase: {
        input: '2044 Vikram 25 12 2021',
        expectedOutput: 'ID: 2044 | Name: Vikram | Joined: 25-12-2021',
      },
    },
  },
  {
    id: 'm4-t17-bitfield-flags',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Bit-Field Packed Structures',
    summary: 'Package multiple boolean flags and compact fields into sub-byte bitfields for embedded drivers.',
    tipBox: {
      syntax: `struct HardwareStatus {
    unsigned int isPowerOn : 1;
    unsigned int isOverheated : 1;
    unsigned int fanSpeed : 3; // 0 to 7
    unsigned int reserved : 3;
};`,
      application: 'Embedded microcontroller register maps, IP header flag fields, and memory-constrained IoT sensors.',
      example: `#include <stdio.h>
struct Flags {
    unsigned int active : 1;
    unsigned int mode : 3;
};
int main() {
    struct Flags f = {1, 5};
    printf("Size: %zu, Active: %u, Mode: %u\\n", sizeof(f), f.active, f.mode);
    return 0;
}`,
    },
    problem: {
      title: 'Sensor Status Bitfield Register',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Define a packed struct \`SensorRegister\` containing:
- \`power\` (1 bit: 0 = Off, 1 = On)
- \`error\` (1 bit: 0 = Normal, 1 = Error)
- \`channel\` (3 bits: channel id 0 to 7)
- \`battery\` (3 bits: battery level 0 to 7)

Read integers for \`power, error, channel, battery\` and assign them to the struct bitfields. Print the total sizeof the struct, whether system is \`READY\` (power == 1 and error == 0) or \`ALERT\`, and channel + battery levels.

### Input Format
- Four integers: \`<power> <error> <channel> <battery>\`

### Output Format
- Line 1: \`Status: <READY|ALERT>\`
- Line 2: \`Channel: <ch>, Battery: <bat>/7\``,
      starterCode: `#include <stdio.h>

struct SensorRegister {
    unsigned int power : 1;
    unsigned int error : 1;
    unsigned int channel : 3;
    unsigned int battery : 3;
};

int main() {
    int p, e, c, b;
    if (scanf("%d %d %d %d", &p, &e, &c, &b) != 4) return 0;
    
    // TODO: Map to SensorRegister and print status diagnostics
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

struct SensorRegister {
    unsigned int power : 1;
    unsigned int error : 1;
    unsigned int channel : 3;
    unsigned int battery : 3;
};

int main() {
    int p, e, c, b;
    if (scanf("%d %d %d %d", &p, &e, &c, &b) != 4) return 0;
    
    struct SensorRegister reg;
    reg.power = p & 1;
    reg.error = e & 1;
    reg.channel = c & 7;
    reg.battery = b & 7;
    
    if (reg.power == 1 && reg.error == 0) {
        printf("Status: READY\\n");
    } else {
        printf("Status: ALERT\\n");
    }
    printf("Channel: %u, Battery: %u/7\\n", reg.channel, reg.battery);
    return 0;
}`,
      openTestCase: {
        input: '1 0 4 6',
        expectedOutput: `Status: READY
Channel: 4, Battery: 6/7`,
        explanation: 'Power is on and no error, so READY.',
      },
      hiddenTestCase: {
        input: '1 1 2 3',
        expectedOutput: `Status: ALERT
Channel: 2, Battery: 3/7`,
      },
    },
  },
  {
    id: 'm4-t18-singly-linked-list-insert',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Singly Linked List: Head & Tail Insertion',
    summary: 'Build a singly linked list from scratch by dynamically allocating nodes and linking next pointers.',
    tipBox: {
      syntax: `typedef struct Node {
    int data;
    struct Node *next;
} Node;

void insertTail(Node **head, int val) {
    Node *newNode = (Node *)malloc(sizeof(Node));
    newNode->data = val; newNode->next = NULL;
    if (*head == NULL) { *head = newNode; return; }
    Node *curr = *head;
    while (curr->next) curr = curr->next;
    curr->next = newNode;
}`,
      application: 'Dynamic job scheduling queues, undo/redo chains, and hash table collision buckets.',
      example: `#include <stdio.h>
#include <stdlib.h>
typedef struct Node { int data; struct Node *next; } Node;
int main() {
    Node *head = malloc(sizeof(Node));
    head->data = 10; head->next = malloc(sizeof(Node));
    head->next->data = 20; head->next->next = NULL;
    printf("%d -> %d\\n", head->data, head->next->data);
    free(head->next); free(head);
    return 0;
}`,
    },
    problem: {
      title: 'Linked List Append & Print',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given $N$ integers, build a singly linked list by inserting each element at the tail (end) of the list. Then traverse the list and print all node values formatted as:
\`<val1> -> <val2> -> ... -> NULL\`
Ensure all allocated nodes are safely freed before exit.

### Input Format
- First line contains integer $N$ ($1 \\le N \\le 100$).
- Second line contains $N$ space-separated integers.

### Output Format
- Print the list nodes connected by \` -> \` ending with \`NULL\`.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

// TODO: Implement append and traversal

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    Node *head = NULL;
    Node *tail = NULL;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        Node *newNode = (Node *)malloc(sizeof(Node));
        newNode->data = val;
        newNode->next = NULL;
        if (!head) {
            head = newNode;
            tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
    }
    
    Node *curr = head;
    while (curr) {
        printf("%d -> ", curr->data);
        curr = curr->next;
    }
    printf("NULL\\n");
    
    curr = head;
    while (curr) {
        Node *temp = curr->next;
        free(curr);
        curr = temp;
    }
    return 0;
}`,
      openTestCase: {
        input: `3
10 20 30`,
        expectedOutput: '10 -> 20 -> 30 -> NULL',
        explanation: 'Three nodes linked sequentially.',
      },
      hiddenTestCase: {
        input: `1
99`,
        expectedOutput: '99 -> NULL',
      },
    },
  },
  {
    id: 'm4-t19-singly-linked-list-delete',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Singly Linked List: Node Deletion',
    summary: 'Delete the first node with a matching key value while carefully reconnecting next pointers.',
    tipBox: {
      syntax: `Node *curr = *head, *prev = NULL;
if (curr && curr->data == key) {
    *head = curr->next;
    free(curr);
    return;
}
while (curr && curr->data != key) {
    prev = curr;
    curr = curr->next;
}
if (curr) {
    prev->next = curr->next;
    free(curr);
}`,
      application: 'Garbage collection reference removal, process termination in OS kernel task lists, and cache eviction.',
      example: `#include <stdio.h>
#include <stdlib.h>
typedef struct N { int d; struct N *nxt; } N;
int main() {
    N *h = malloc(sizeof(N)); h->d = 1;
    h->nxt = malloc(sizeof(N)); h->nxt->d = 2; h->nxt->nxt = NULL;
    // Delete 1 (head)
    N *t = h; h = h->nxt; free(t);
    printf("New head: %d\\n", h->d);
    free(h);
    return 0;
}`,
    },
    problem: {
      title: 'Delete Node by Value',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a singly linked list of $N$ integers and a key $K$, delete the first occurrence of $K$ from the linked list. If $K$ is not found, leave the list unchanged. Print the resulting list.

### Input Format
- First line contains $N$ ($1 \\le N \\le 100$).
- Second line contains $N$ space-separated integers.
- Third line contains integer $K$ to be deleted.

### Output Format
- Print the remaining list as \`<v1> -> <v2> -> ... -> NULL\` (or \`NULL\` if empty).`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

// TODO: Create list, delete key, print list, free memory

int main() {
    int n, k;
    if (scanf("%d", &n) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node *node = (Node *)malloc(sizeof(Node));
        node->data = v;
        node->next = NULL;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }
    int k;
    if (scanf("%d", &k) != 1) return 0;
    
    Node *curr = head, *prev = NULL;
    while (curr && curr->data != k) {
        prev = curr;
        curr = curr->next;
    }
    if (curr) {
        if (!prev) head = curr->next;
        else prev->next = curr->next;
        free(curr);
    }
    
    curr = head;
    while (curr) {
        printf("%d -> ", curr->data);
        curr = curr->next;
    }
    printf("NULL\\n");
    
    curr = head;
    while (curr) {
        Node *t = curr->next;
        free(curr);
        curr = t;
    }
    return 0;
}`,
      openTestCase: {
        input: `4
10 20 30 40
20`,
        expectedOutput: '10 -> 30 -> 40 -> NULL',
        explanation: 'Node with value 20 is removed and 10 points to 30.',
      },
      hiddenTestCase: {
        input: `3
5 10 15
5`,
        expectedOutput: '10 -> 15 -> NULL',
      },
    },
  },
  {
    id: 'm4-t20-linked-list-middle-node',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Middle of Linked List (Tortoise and Hare)',
    summary: 'Find the middle node of a linked list in a single pass using slow and fast pointers.',
    tipBox: {
      syntax: `Node *slow = head, *fast = head;
while (fast != NULL && fast->next != NULL) {
    slow = slow->next;
    fast = fast->next->next;
}
// slow points to the middle node`,
      application: 'Merge sort for linked lists, finding palindrome midpoint, and cycle detection (Floyd’s algorithm).',
      example: `#include <stdio.h>
#include <stdlib.h>
typedef struct N { int d; struct N* n; } N;
int main() {
    N a = {1, NULL}, b = {2, NULL}, c = {3, NULL};
    a.n = &b; b.n = &c;
    N *s = &a, *f = &a;
    while (f && f->n) { s = s->n; f = f->n->n; }
    printf("Middle: %d\\n", s->d);
    return 0;
}`,
    },
    problem: {
      title: 'Find Middle Node of Linked List',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a singly linked list with $N$ nodes, find the value of the middle node using the **slow and fast pointer approach** in a single pass. If there are two middle nodes (even $N$), return the second middle node.

### Input Format
- First line contains $N$ ($1 \\le N \\le 100$).
- Second line contains $N$ space-separated integers.

### Output Format
- Print the data value of the middle node.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

// TODO: Find middle node using slow/fast pointers

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node *node = (Node *)malloc(sizeof(Node));
        node->data = v;
        node->next = NULL;
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }
    
    Node *slow = head;
    Node *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    printf("%d\\n", slow->data);
    
    Node *curr = head;
    while (curr) {
        Node *t = curr->next;
        free(curr);
        curr = t;
    }
    return 0;
}`,
      openTestCase: {
        input: `5
1 2 3 4 5`,
        expectedOutput: '3',
        explanation: '3 is the exact middle of 5 elements.',
      },
      hiddenTestCase: {
        input: `6
10 20 30 40 50 60`,
        expectedOutput: '40',
      },
    },
  },
  {
    id: 'm4-t21-stack-using-array',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'LIFO Stack Implementation via Struct',
    summary: 'Implement a Last-In First-Out (LIFO) stack data structure with push, pop, and peek operations.',
    tipBox: {
      syntax: `typedef struct {
    int items[MAX];
    int top;
} Stack;

void push(Stack *s, int val) { s->items[++(s->top)] = val; }
int pop(Stack *s) { return s->items[(s->top)--]; }
int peek(Stack *s) { return s->items[s->top]; }`,
      application: 'Function call call-stack simulation, expression evaluation (infix to postfix), and browser back-button history.',
      example: `#include <stdio.h>
typedef struct { int arr[5]; int top; } Stack;
int main() {
    Stack s; s.top = -1;
    s.arr[++s.top] = 10;
    s.arr[++s.top] = 20;
    printf("Popped: %d\\n", s.arr[s.top--]);
    return 0;
}`,
    },
    problem: {
      title: 'Array Stack Emulator',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Implement a stack using a fixed-size array in a struct. Support $Q$ operations:
- \`PUSH <val>\`: Push integer onto the stack.
- \`POP\`: Pop top element and print its value. If empty, print \`UNDERFLOW\`.
- \`PEEK\`: Print top element without removing. If empty, print \`EMPTY\`.

### Input Format
- First line contains $Q$ ($1 \\le Q \\le 50$).
- Next $Q$ lines each contain one instruction.

### Output Format
- Print output for each \`POP\` and \`PEEK\` command.`,
      starterCode: `#include <stdio.h>
#include <string.h>

typedef struct {
    int data[100];
    int top;
} Stack;

// TODO: Implement push, pop, peek operations

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

typedef struct {
    int data[100];
    int top;
} Stack;

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    Stack s;
    s.top = -1;
    char op[16];
    for (int i = 0; i < q; i++) {
        scanf("%s", op);
        if (strcmp(op, "PUSH") == 0) {
            int val;
            scanf("%d", &val);
            s.data[++s.top] = val;
        } else if (strcmp(op, "POP") == 0) {
            if (s.top == -1) {
                printf("UNDERFLOW\\n");
            } else {
                printf("%d\\n", s.data[s.top--]);
            }
        } else if (strcmp(op, "PEEK") == 0) {
            if (s.top == -1) {
                printf("EMPTY\\n");
            } else {
                printf("%d\\n", s.data[s.top]);
            }
        }
    }
    return 0;
}`,
      openTestCase: {
        input: `5
PUSH 10
PUSH 20
PEEK
POP
POP`,
        expectedOutput: `20
20
10`,
        explanation: 'Top is 20. Pop removes 20, then next Pop removes 10.',
      },
      hiddenTestCase: {
        input: `3
POP
PUSH 50
PEEK`,
        expectedOutput: `UNDERFLOW
50`,
      },
    },
  },
  {
    id: 'm4-t22-queue-using-circular-array',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Circular FIFO Queue',
    summary: 'Build a bounded circular FIFO queue using modulo arithmetic for wrap-around ring buffers.',
    tipBox: {
      syntax: `typedef struct {
    int arr[CAP];
    int front, rear, count;
} Queue;

void enqueue(Queue *q, int val) {
    q->arr[q->rear] = val;
    q->rear = (q->rear + 1) % CAP;
    q->count++;
}
int dequeue(Queue *q) {
    int val = q->arr[q->front];
    q->front = (q->front + 1) % CAP;
    q->count--;
    return val;
}`,
      application: 'UART serial driver ring buffers, audio DMA double buffering, and OS scheduler task ready queues.',
      example: `#include <stdio.h>
int main() {
    int q[3], f = 0, r = 0, cnt = 0;
    q[r] = 10; r = (r + 1) % 3; cnt++;
    q[r] = 20; r = (r + 1) % 3; cnt++;
    printf("Dequeued: %d\\n", q[f]); f = (f + 1) % 3;
    return 0;
}`,
    },
    problem: {
      title: 'Circular Queue Ring Buffer',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Implement a Circular Queue with capacity $K=5$ using an array and \`front, rear, count\` pointers. Execute $Q$ instructions:
- \`ENQUEUE <val>\`: Enqueue element. If full, print \`OVERFLOW\`.
- \`DEQUEUE\`: Dequeue and print element. If empty, print \`UNDERFLOW\`.

### Input Format
- First line contains $Q$ ($1 \\le Q \\le 50$).
- Next $Q$ lines each contain one instruction.

### Output Format
- Print output for each \`DEQUEUE\` or error messages.`,
      starterCode: `#include <stdio.h>
#include <string.h>

#define CAPACITY 5

typedef struct {
    int data[CAPACITY];
    int front;
    int rear;
    int count;
} Queue;

// TODO: Implement circular enqueue and dequeue

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

#define CAPACITY 5

typedef struct {
    int data[CAPACITY];
    int front;
    int rear;
    int count;
} Queue;

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    Queue queue = {.front = 0, .rear = 0, .count = 0};
    char op[16];
    for (int i = 0; i < q; i++) {
        scanf("%s", op);
        if (strcmp(op, "ENQUEUE") == 0) {
            int val;
            scanf("%d", &val);
            if (queue.count == CAPACITY) {
                printf("OVERFLOW\\n");
            } else {
                queue.data[queue.rear] = val;
                queue.rear = (queue.rear + 1) % CAPACITY;
                queue.count++;
            }
        } else if (strcmp(op, "DEQUEUE") == 0) {
            if (queue.count == 0) {
                printf("UNDERFLOW\\n");
            } else {
                int val = queue.data[queue.front];
                queue.front = (queue.front + 1) % CAPACITY;
                queue.count--;
                printf("%d\\n", val);
            }
        }
    }
    return 0;
}`,
      openTestCase: {
        input: `6
ENQUEUE 10
ENQUEUE 20
DEQUEUE
ENQUEUE 30
DEQUEUE
DEQUEUE`,
        expectedOutput: `10
20
30`,
        explanation: 'FIFO order: 10 is dequeued first, then 20, then 30.',
      },
      hiddenTestCase: {
        input: `2
DEQUEUE
ENQUEUE 99`,
        expectedOutput: 'UNDERFLOW',
      },
    },
  },
  {
    id: 'm4-t23-tagged-union-variant',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Tagged Variant Union (Polymorphic Payload)',
    summary: 'Design a tagged union struct to hold heterogeneous types safely without type confusion.',
    tipBox: {
      syntax: `typedef enum { TYPE_INT, TYPE_FLOAT, TYPE_STR } DataType;
typedef struct {
    DataType tag;
    union {
        int iVal;
        float fVal;
        char sVal[32];
    } payload;
} Variant;`,
      application: 'JSON parsers (where value is string, number, or boolean), network packet deserialization, and compiler AST tokens.',
      example: `#include <stdio.h>
typedef enum { INT, STR } Tag;
typedef struct {
    Tag tag;
    union { int i; char s[10]; } u;
} Var;
int main() {
    Var v = {INT, {.i = 42}};
    if (v.tag == INT) printf("%d\\n", v.u.i);
    return 0;
}`,
    },
    problem: {
      title: 'Tagged Union Parser',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Implement a tagged union for packet payloads.
- If type tag is \`1\` (\`INTEGER\`), read an integer and output \`INT: <val * 2>\`.
- If type tag is \`2\` (\`FLOAT\`), read a float and output \`FLOAT: <val + 0.50>\` (to 2 decimal places).
- If type tag is \`3\` (\`STRING\`), read a word and output \`STRING: <word>_LOGICQ\`.

### Input Format
- First line contains tag (1, 2, or 3).
- Second line contains the corresponding payload.

### Output Format
- Print the transformed payload output.`,
      starterCode: `#include <stdio.h>

typedef enum { TAG_INT = 1, TAG_FLOAT = 2, TAG_STRING = 3 } Tag;

typedef struct {
    Tag tag;
    union {
        int i;
        float f;
        char s[64];
    } data;
} Packet;

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    
    // TODO: Read payload according to tag and print result
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

typedef enum { TAG_INT = 1, TAG_FLOAT = 2, TAG_STRING = 3 } Tag;

typedef struct {
    Tag tag;
    union {
        int i;
        float f;
        char s[64];
    } data;
} Packet;

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    Packet p;
    p.tag = (Tag)t;
    
    if (p.tag == TAG_INT) {
        scanf("%d", &p.data.i);
        printf("INT: %d\\n", p.data.i * 2);
    } else if (p.tag == TAG_FLOAT) {
        scanf("%f", &p.data.f);
        printf("FLOAT: %.2f\\n", p.data.f + 0.50f);
    } else if (p.tag == TAG_STRING) {
        scanf("%s", p.data.s);
        printf("STRING: %s_LOGICQ\\n", p.data.s);
    }
    return 0;
}`,
      openTestCase: {
        input: `3
Hello`,
        expectedOutput: 'STRING: Hello_LOGICQ',
        explanation: 'Tag 3 is String, suffix appended.',
      },
      hiddenTestCase: {
        input: `2
4.25`,
        expectedOutput: 'FLOAT: 4.75',
      },
    },
  },
  {
    id: 'm4-t24-deep-copy-struct',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Deep Copy vs Shallow Copy in C',
    summary: 'Clone dynamically allocated heap pointer members to prevent double-free and shared mutation bugs.',
    tipBox: {
      syntax: `typedef struct {
    char *name;
    int id;
} Record;

Record deepCopy(const Record *src) {
    Record dest;
    dest.id = src->id;
    dest.name = (char *)malloc(strlen(src->name) + 1);
    strcpy(dest.name, src->name);
    return dest;
}`,
      application: 'State snapshots in simulations, thread-safe message passing, and copy-on-write buffer architectures.',
      example: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct { char *s; } Box;
int main() {
    Box b1; b1.s = strdup("Hello");
    Box b2; b2.s = strdup(b1.s); // Deep copy!
    b2.s[0] = 'J';
    printf("%s vs %s\\n", b1.s, b2.s); // Hello vs Jello
    free(b1.s); free(b2.s);
    return 0;
}`,
    },
    problem: {
      title: 'Deep Copy Heap String Struct',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Given a struct containing an ID and a heap-allocated string pointer \`char *title\`, perform a deep copy into a second struct. Modify the first character of the cloned copy to uppercase. Print both the original and cloned struct titles to prove that modifying the clone did not alter the original title. Finally, free both string pointers.

### Input Format
- First line contains integer \`id\`.
- Second line contains lowercase string \`title\` (up to 50 characters).

### Output Format
- Line 1: \`Original: <title>\`
- Line 2: \`Cloned: <cloned_title>\``,
      starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

typedef struct {
    int id;
    char *title;
} Document;

int main() {
    int id;
    char buf[128];
    if (scanf("%d %s", &id, buf) != 2) return 0;
    
    // TODO: Create doc1 on heap, deep copy to doc2, uppercase doc2[0], print both
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

typedef struct {
    int id;
    char *title;
} Document;

int main() {
    int id;
    char buf[128];
    if (scanf("%d %s", &id, buf) != 2) return 0;
    
    Document doc1;
    doc1.id = id;
    doc1.title = (char *)malloc(strlen(buf) + 1);
    strcpy(doc1.title, buf);
    
    Document doc2;
    doc2.id = doc1.id;
    doc2.title = (char *)malloc(strlen(doc1.title) + 1);
    strcpy(doc2.title, doc1.title);
    
    if (doc2.title[0] != '\\0') {
        doc2.title[0] = (char)toupper((unsigned char)doc2.title[0]);
    }
    
    printf("Original: %s\\n", doc1.title);
    printf("Cloned: %s\\n", doc2.title);
    
    free(doc1.title);
    free(doc2.title);
    return 0;
}`,
      openTestCase: {
        input: `10
compiler`,
        expectedOutput: `Original: compiler
Cloned: Compiler`,
        explanation: 'Deep copy clones the heap string buffer, so changing the clone does not corrupt the original.',
      },
      hiddenTestCase: {
        input: `99
algorithm`,
        expectedOutput: `Original: algorithm
Cloned: Algorithm`,
      },
    },
  },
  {
    id: 'm4-t25-doubly-linked-list-traversal',
    moduleIndex: 4,
    moduleSlug: 'structs-and-dynamic-memory',
    moduleTitle: 'Module 4: Structs & Dynamic Memory',
    topicTitle: 'Doubly Linked List Bidirectional Traversal',
    summary: 'Maintain both next and prev pointers to traverse forward and backward seamlessly.',
    tipBox: {
      syntax: `typedef struct DNode {
    int data;
    struct DNode *prev;
    struct DNode *next;
} DNode;

// Backward traversal starting from tail:
DNode *curr = tail;
while (curr != NULL) {
    printf("%d ", curr->data);
    curr = curr->prev;
}`,
      application: 'LRU cache implementations, audio playlist next/previous navigation, and text editor cursor movement.',
      example: `#include <stdio.h>
#include <stdlib.h>
typedef struct N { int d; struct N *p, *n; } N;
int main() {
    N *a = malloc(sizeof(N)), *b = malloc(sizeof(N));
    a->d = 1; a->p = NULL; a->n = b;
    b->d = 2; b->p = a; b->n = NULL;
    printf("Forward: %d %d | Back: %d %d\\n", a->d, a->n->d, b->d, b->p->d);
    free(a); free(b);
    return 0;
}`,
    },
    problem: {
      title: 'Doubly Linked List Reversal Print',
      difficulty: 'MEDIUM',
      description: `### Problem Description
Construct a doubly linked list of $N$ integers. Print the list in forward order from head to tail, and then in reverse order from tail to head using the \`prev\` pointers.

### Input Format
- First line contains $N$ ($1 \\le N \\le 100$).
- Second line contains $N$ space-separated integers.

### Output Format
- Line 1: \`Forward: <v1> <v2> ... <vn>\`
- Line 2: \`Backward: <vn> ... <v2> <v1>\``,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct DNode {
    int data;
    struct DNode *prev;
    struct DNode *next;
} DNode;

// TODO: Build DLL and print forward and backward

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct DNode {
    int data;
    struct DNode *prev;
    struct DNode *next;
} DNode;

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    DNode *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        DNode *node = (DNode *)malloc(sizeof(DNode));
        node->data = v;
        node->next = NULL;
        node->prev = tail;
        if (!head) {
            head = node;
            tail = node;
        } else {
            tail->next = node;
            tail = node;
        }
    }
    
    printf("Forward:");
    DNode *curr = head;
    while (curr) {
        printf(" %d", curr->data);
        curr = curr->next;
    }
    printf("\\n");
    
    printf("Backward:");
    curr = tail;
    while (curr) {
        printf(" %d", curr->data);
        curr = curr->prev;
    }
    printf("\\n");
    
    curr = head;
    while (curr) {
        DNode *temp = curr->next;
        free(curr);
        curr = temp;
    }
    return 0;
}`,
      openTestCase: {
        input: `3
10 20 30`,
        expectedOutput: `Forward: 10 20 30
Backward: 30 20 10`,
        explanation: 'Forward traverses next pointers; backward traverses prev pointers from tail.',
      },
      hiddenTestCase: {
        input: `4
1 4 9 16`,
        expectedOutput: `Forward: 1 4 9 16
Backward: 16 9 4 1`,
      },
    },
  },
];
