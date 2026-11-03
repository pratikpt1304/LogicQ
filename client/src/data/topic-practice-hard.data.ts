import type { TopicPracticeItem } from './topic-practice.data.js';

export const HARD_PRACTICE_TOPICS: TopicPracticeItem[] = [
  // ==========================================
  // MODULE 1: ADVANCED CONTROL & BITWISE (HARD)
  // ==========================================
  {
    id: 'm1-t11-bitwise-single-number',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Bitwise Tri-State Machine (Single Number II)',
    summary: 'Find the unique element where all other elements appear three times in O(N) time and O(1) space.',
    tipBox: {
      syntax: `// Tri-state bitmask counter using bitwise logic
int ones = 0, twos = 0;
for (int i = 0; i < n; i++) {
    ones = (ones ^ arr[i]) & ~twos;
    twos = (twos ^ arr[i]) & ~ones;
}
// 'ones' now holds the unique number`,
      application: 'Hardware signal demultiplexers and low-power telemetry protocols use bit-level tri-state counters to filter 3-way redundant noise pulses.',
      example: `#include <stdio.h>
int main() {
    int arr[] = {2, 2, 3, 2};
    int ones = 0, twos = 0;
    for (int i = 0; i < 4; i++) {
        ones = (ones ^ arr[i]) & ~twos;
        twos = (twos ^ arr[i]) & ~ones;
    }
    printf("Unique: %d\\n", ones);
    return 0;
}`,
    },
    problem: {
      title: 'Single Number in Triplicate Stream',
      difficulty: 'HARD',
      description: `### Problem Description

Given an array of $N$ integers where every element appears exactly **three times**, except for **one single element** which appears exactly **once**.

Find that single element. You must implement a solution strictly with **$O(N)$ runtime complexity** and **$O(1)$ extra memory** using bit manipulation.

### Input Format
- Line 1: An integer $N$ representing the number of elements.
- Line 2: $N$ space-separated integers.

### Output Format
Print the single unique integer followed by a newline.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    int ones = 0, twos = 0;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        // TODO: Update ones and twos state bitmasks
        
    }

    // TODO: Print the unique single number
    
    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    int ones = 0, twos = 0;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        ones = (ones ^ val) & ~twos;
        twos = (twos ^ val) & ~ones;
    }

    printf("%d\\n", ones);
    return 0;
}`,
      openTestCase: {
        input: `4
2 2 3 2`,
        expectedOutput: '3',
        explanation: 'The number 2 appears 3 times. The single unique number is 3.',
      },
      hiddenTestCase: {
        input: `7
0 1 0 1 0 1 99`,
        expectedOutput: '99',
      },
    },
  },

  {
    id: 'm1-t12-spiral-matrix-generation',
    moduleIndex: 1,
    moduleSlug: 'control-structures',
    moduleTitle: 'Module 1: Control Structures',
    topicTitle: 'Spiral Matrix Number Generation',
    summary: 'Fill an N x N matrix with numbers 1 to N^2 in clockwise spiral order with four boundary pointers.',
    tipBox: {
      syntax: `// 4 Boundary Pointers Traversal
int top = 0, bottom = n - 1, left = 0, right = n - 1;
while (top <= bottom && left <= right) {
    for (int col = left; col <= right; col++) mat[top][col] = val++;
    top++;
    for (int row = top; row <= bottom; row++) mat[row][right] = val++;
    right--;
    // repeat for bottom and left...
}`,
      application: 'Graphics rasterizers, display panel framebuffers, and radar sweeping coordinates trace 2D grids in outward/inward spiral vectors.',
      example: `#include <stdio.h>
int main() {
    int n = 2, mat[2][2];
    mat[0][0] = 1; mat[0][1] = 2;
    mat[1][1] = 3; mat[1][0] = 4;
    for (int i = 0; i < 2; i++) {
        printf("%d %d\\n", mat[i][0], mat[i][1]);
    }
    return 0;
}`,
    },
    problem: {
      title: 'Clockwise Spiral Matrix Generator',
      difficulty: 'HARD',
      description: `### Problem Description

Given a positive integer $N$ ($1 \\le N \\le 10$), generate an $N \\times N$ matrix filled with elements from $1$ to $N^2$ in clockwise spiral order starting at the top-left position $(0, 0)$.

### Input Format
A single integer $N$.

### Output Format
Print the $N \\times N$ matrix row by row. Each row must contain space-separated values followed by a newline. Do not leave a trailing space at the end of rows.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int mat[15][15];
    int top = 0, bottom = n - 1, left = 0, right = n - 1;
    int val = 1;

    // TODO: Implement 4-directional boundary pointer traversal
    

    // Print matrix
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], j == n - 1 ? "" : " ");
        }
        printf("\\n");
    }

    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int mat[15][15];
    int top = 0, bottom = n - 1, left = 0, right = n - 1;
    int val = 1;

    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) {
            mat[top][j] = val++;
        }
        top++;

        for (int i = top; i <= bottom; i++) {
            mat[i][right] = val++;
        }
        right--;

        if (top <= bottom) {
            for (int j = right; j >= left; j--) {
                mat[bottom][j] = val++;
            }
            bottom--;
        }

        if (left <= right) {
            for (int i = bottom; i >= top; i--) {
                mat[i][left] = val++;
            }
            left++;
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], j == n - 1 ? "" : " ");
        }
        printf("\\n");
    }

    return 0;
}`,
      openTestCase: {
        input: '3',
        expectedOutput: `1 2 3
8 9 4
7 6 5`,
        explanation: 'Elements 1..9 filled in clockwise spiral form a 3x3 grid.',
      },
      hiddenTestCase: {
        input: '4',
        expectedOutput: `1 2 3 4
12 13 14 5
11 16 15 6
10 9 8 7`,
      },
    },
  },

  // ==========================================
  // MODULE 2: POINTERS & RECURSION (HARD)
  // ==========================================
  {
    id: 'm2-t11-custom-strtok',
    moduleIndex: 2,
    moduleSlug: 'pointers-memory',
    moduleTitle: 'Module 2: Pointers & Memory',
    topicTitle: 'Custom String Tokenizer (my_strtok)',
    summary: 'Implement stateful tokenization using internal static pointers and double pointer traversal.',
    tipBox: {
      syntax: `// Stateful static pointer inside function
char* my_strtok(char* str, char delim) {
    static char* next_ptr = NULL;
    if (str != NULL) next_ptr = str;
    if (next_ptr == NULL || *next_ptr == '\\0') return NULL;
    char* start = next_ptr;
    // scan until delim or '\\0'...
}`,
      application: 'Command-line shells, HTTP request header parsers, and JSON tokenizers split input streams into distinct tokens with zero malloc overhead.',
      example: `#include <stdio.h>
#include <string.h>

char* my_strtok(char* str, char delim) {
    static char* last = NULL;
    if (str) last = str;
    if (!last || *last == '\\0') return NULL;
    char* token = last;
    while (*last && *last != delim) last++;
    if (*last == delim) {
        *last = '\\0';
        last++;
    }
    return token;
}

int main() {
    char s[] = "alpha,beta";
    char* t = my_strtok(s, ',');
    while (t) {
        printf("%s\\n", t);
        t = my_strtok(NULL, ',');
    }
    return 0;
}`,
    },
    problem: {
      title: 'Stateful Delimiter Tokenizer',
      difficulty: 'HARD',
      description: `### Problem Description

Implement a custom string tokenizer function:
\`char* my_strtok(char* str, char delim)\`

- On the first call, \`str\` points to the input string.
- On subsequent calls, passing \`NULL\` as \`str\` should resume from where the previous call stopped, using an internal \`static char*\` pointer.
- The function should replace the delimiter character with null terminator \`\\0\` and return the pointer to the current token.
- When no more tokens exist, return \`NULL\`.

### Input Format
A single line containing comma-separated words (e.g. \`apple,banana,cherry\`).

### Output Format
Print each token on a separate line.`,
      starterCode: `#include <stdio.h>
#include <string.h>

char* my_strtok(char* str, char delim) {
    static char* last = NULL;
    // TODO: Initialize last if str != NULL, search for delim, and return current token
    
    return NULL;
}

int main() {
    char line[512];
    if (scanf("%511s", line) != 1) return 0;

    char* token = my_strtok(line, ',');
    while (token != NULL) {
        printf("%s\\n", token);
        token = my_strtok(NULL, ',');
    }

    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

char* my_strtok(char* str, char delim) {
    static char* last = NULL;
    if (str != NULL) {
        last = str;
    }
    if (last == NULL || *last == '\\0') {
        return NULL;
    }

    char* token = last;
    while (*last != '\\0' && *last != delim) {
        last++;
    }

    if (*last == delim) {
        *last = '\\0';
        last++;
    }

    return token;
}

int main() {
    char line[512];
    if (scanf("%511s", line) != 1) return 0;

    char* token = my_strtok(line, ',');
    while (token != NULL) {
        printf("%s\\n", token);
        token = my_strtok(NULL, ',');
    }

    return 0;
}`,
      openTestCase: {
        input: 'apple,banana,cherry,mango',
        expectedOutput: `apple
banana
cherry
mango`,
        explanation: 'Each comma-separated word is extracted and printed on a new line.',
      },
      hiddenTestCase: {
        input: 'embedded,pointers,logicq,systems',
        expectedOutput: `embedded
pointers
logicq
systems`,
      },
    },
  },

  {
    id: 'm2-t12-modular-fast-pow',
    moduleIndex: 2,
    moduleSlug: 'pointers-memory',
    moduleTitle: 'Module 2: Pointers & Memory',
    topicTitle: 'Modular Binary Exponentiation (O(log B))',
    summary: 'Calculate (A^B) mod C for very large powers using logarithmic divide-and-conquer recursion.',
    tipBox: {
      syntax: `// Fast recursive binary exponentiation
long long modPow(long long base, long long exp, long long mod) {
    if (exp == 0) return 1 % mod;
    long long half = modPow(base, exp / 2, mod);
    long long res = (half * half) % mod;
    if (exp % 2 == 1) res = (res * (base % mod)) % mod;
    return res;
}`,
      application: 'RSA encryption, Diffie-Hellman cryptographic handshakes, and hashing engines compute 2048-bit modular powers in milliseconds.',
      example: `#include <stdio.h>
long long modPow(long long a, long long b, long long m) {
    if (b == 0) return 1;
    long long p = modPow(a, b / 2, m);
    p = (p * p) % m;
    return (b % 2) ? (p * (a % m)) % m : p;
}
int main() {
    printf("%lld\\n", modPow(2, 10, 1000)); // 1024 % 1000 = 24
    return 0;
}`,
    },
    problem: {
      title: 'Fast Modular Power Engine',
      difficulty: 'HARD',
      description: `### Problem Description

Given three positive integers $A, B, C$, calculate:
$$(A^B) \\pmod C$$

Using recursive binary exponentiation in **$O(\\log B)$** time. 
Note: $B$ can be up to $10^{18}$, so a naive $O(B)$ loop will result in Time Limit Exceeded. Ensure all intermediate products use 64-bit integer types (\`long long\`) to prevent arithmetic overflow.

### Input Format
A single line containing three space-separated integers $A, B, C$.

### Output Format
Print the result of $(A^B) \\pmod C$.`,
      starterCode: `#include <stdio.h>

long long modPow(long long a, long long b, long long c) {
    // TODO: Implement recursive O(log B) modular exponentiation
    return 0;
}

int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) == 3) {
        printf("%lld\\n", modPow(a, b, c));
    }
    return 0;
}`,
      solutionCode: `#include <stdio.h>

long long modPow(long long a, long long b, long long c) {
    if (c == 1) return 0;
    if (b == 0) return 1 % c;
    long long half = modPow(a, b / 2, c);
    long long res = (half * half) % c;
    if (b % 2 == 1) {
        res = (res * (a % c)) % c;
    }
    return res;
}

int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) == 3) {
        printf("%lld\\n", modPow(a, b, c));
    }
    return 0;
}`,
      openTestCase: {
        input: '2 10 1000',
        expectedOutput: '24',
        explanation: '2^10 = 1024. 1024 mod 1000 = 24.',
      },
      hiddenTestCase: {
        input: '3 181 1000000007',
        expectedOutput: '945419992',
      },
    },
  },

  // ==========================================
  // MODULE 3: ARRAYS & STRINGS (HARD)
  // ==========================================
  {
    id: 'm3-t11-longest-unique-substring',
    moduleIndex: 3,
    moduleSlug: 'arrays-strings',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'Longest Substring Without Repeating Chars',
    summary: 'Find the maximum length non-repeating substring in O(N) time with sliding window and ASCII hash map.',
    tipBox: {
      syntax: `// Sliding window with last-seen ASCII index
int lastPos[256];
memset(lastPos, -1, sizeof(lastPos));
int start = 0, maxLen = 0;
for (int i = 0; str[i]; i++) {
    unsigned char ch = str[i];
    if (lastPos[ch] >= start) start = lastPos[ch] + 1;
    lastPos[ch] = i;
    int curLen = i - start + 1;
    if (curLen > maxLen) maxLen = curLen;
}`,
      application: 'Data compression algorithms (e.g. Lempel-Ziv-Welch / LZW, gzip) maintain sliding window dictionaries of unique character sequences.',
      example: `#include <stdio.h>
#include <string.h>

int main() {
    char s[] = "abcabcbb";
    int last[256], maxLen = 0, start = 0;
    memset(last, -1, sizeof(last));
    for (int i = 0; s[i]; i++) {
        if (last[(unsigned char)s[i]] >= start) start = last[(unsigned char)s[i]] + 1;
        last[(unsigned char)s[i]] = i;
        if (i - start + 1 > maxLen) maxLen = i - start + 1;
    }
    printf("Max unique len: %d\\n", maxLen);
    return 0;
}`,
    },
    problem: {
      title: 'Longest Non-Repeating Substring',
      difficulty: 'HARD',
      description: `### Problem Description

Given a string $S$ consisting of printable ASCII characters without spaces, find the **length of the longest substring** without any repeating characters.

You must solve this in **$O(N)$ runtime** using a sliding window with an ASCII index table.

### Input Format
A single line string $S$ ($1 \\le |S| \\le 10^5$).

### Output Format
Print a single integer representing the maximum length of a substring with all distinct characters.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%100004s", s) != 1) return 0;

    int maxLen = 0;
    // TODO: Implement sliding window with ASCII index array
    

    printf("%d\\n", maxLen);
    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%100004s", s) != 1) return 0;

    int last[256];
    memset(last, -1, sizeof(last));

    int maxLen = 0;
    int start = 0;

    for (int i = 0; s[i] != '\\0'; i++) {
        unsigned char ch = (unsigned char)s[i];
        if (last[ch] >= start) {
            start = last[ch] + 1;
        }
        last[ch] = i;
        int curLen = i - start + 1;
        if (curLen > maxLen) {
            maxLen = curLen;
        }
    }

    printf("%d\\n", maxLen);
    return 0;
}`,
      openTestCase: {
        input: 'abcabcbb',
        expectedOutput: '3',
        explanation: 'The longest substring without repeating characters is "abc", with length 3.',
      },
      hiddenTestCase: {
        input: 'pwwkew',
        expectedOutput: '3',
      },
    },
  },

  {
    id: 'm3-t12-inplace-matrix-rotation',
    moduleIndex: 3,
    moduleSlug: 'arrays-strings',
    moduleTitle: 'Module 3: Array and its Applications',
    topicTitle: 'In-Place 90° Clockwise Matrix Rotation',
    summary: 'Rotate an N x N matrix clockwise with strictly O(1) auxiliary space using transpose + row reversal.',
    tipBox: {
      syntax: `// Step 1: Transpose matrix (swap mat[i][j] with mat[j][i])
for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
        int temp = mat[i][j]; mat[i][j] = mat[j][i]; mat[j][i] = temp;
    }
}
// Step 2: Reverse each row
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n / 2; j++) {
        int temp = mat[i][j]; mat[i][j] = mat[i][n - 1 - j]; mat[i][n - 1 - j] = temp;
    }
}`,
      application: 'Image processing filters, mobile camera portrait-to-landscape sensors, and game graphics pipeline rotate pixel grids in-place directly in GPU VRAM.',
      example: `#include <stdio.h>
int main() {
    int m[2][2] = {{1, 2}, {3, 4}};
    // Transpose -> {{1, 3}, {2, 4}}
    // Reverse rows -> {{3, 1}, {4, 2}}
    return 0;
}`,
    },
    problem: {
      title: 'In-Place 90-Degree Matrix Rotation',
      difficulty: 'HARD',
      description: `### Problem Description

Given an $N \\times N$ integer matrix, rotate the matrix by 90 degrees in a **clockwise direction** strictly **in-place** (i.e. using **$O(1)$ additional auxiliary memory** without allocating a second matrix).

Then print the rotated matrix row by row with space-separated numbers.

### Input Format
- Line 1: Integer $N$ ($1 \\le N \\le 20$).
- Next $N$ lines: $N$ space-separated integers representing each row.

### Output Format
Print the $N \\times N$ rotated matrix row by row.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int mat[25][25];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }

    // TODO: In-place rotate 90 degrees clockwise (Transpose then reverse rows)
    

    // Print result
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], j == n - 1 ? "" : " ");
        }
        printf("\\n");
    }

    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int mat[25][25];
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &mat[i][j]);
        }
    }

    // Step 1: Transpose
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int temp = mat[i][j];
            mat[i][j] = mat[j][i];
            mat[j][i] = temp;
        }
    }

    // Step 2: Reverse each row
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n / 2; j++) {
            int temp = mat[i][j];
            mat[i][j] = mat[i][n - 1 - j];
            mat[i][n - 1 - j] = temp;
        }
    }

    // Print
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%d%s", mat[i][j], j == n - 1 ? "" : " ");
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
        expectedOutput: `7 4 1
8 5 2
9 6 3`,
        explanation: 'The 3x3 matrix rotated clockwise by 90 degrees.',
      },
      hiddenTestCase: {
        input: `2
10 20
30 40`,
        expectedOutput: `30 10
40 20`,
      },
    },
  },

  // ==========================================
  // MODULE 4: STRUCTS & DYNAMIC MEMORY (HARD)
  // ==========================================
  {
    id: 'm4-t11-reverse-linked-list',
    moduleIndex: 4,
    moduleSlug: 'structures-advanced',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'In-Place Singly Linked List Reversal',
    summary: 'Reverse pointer directions of a dynamic singly linked list using the classical 3-pointer technique.',
    tipBox: {
      syntax: `// 3-Pointer in-place reversal
struct Node* prev = NULL;
struct Node* curr = head;
struct Node* next = NULL;
while (curr != NULL) {
    next = curr->next;
    curr->next = prev;
    prev = curr;
    curr = next;
}
head = prev;`,
      application: 'Undo/redo operation stacks, network socket buffer rewinds, and execution history replay algorithms reverse linked node sequences in O(1) space.',
      example: `#include <stdio.h>
#include <stdlib.h>

struct Node { int val; struct Node* next; };

struct Node* reverse(struct Node* head) {
    struct Node *prev = NULL, *curr = head, *nxt = NULL;
    while (curr) {
        nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}`,
    },
    problem: {
      title: 'In-Place Linked List Pointer Reversal',
      difficulty: 'HARD',
      description: `### Problem Description

Given a singly linked list containing $N$ integer nodes, reverse the order of the nodes **strictly in-place** by altering the node \`next\` pointers without allocating duplicate nodes or copying values into an auxiliary array.

Print the elements of the reversed linked list in the format:
\`val1 -> val2 -> ... -> NULL\`

### Input Format
- Line 1: An integer $N$ representing the number of nodes ($1 \\le N \\le 1000$).
- Line 2: $N$ space-separated integers.

### Output Format
Print the reversed list with arrows \` -> \` terminating with \`NULL\`.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node* next;
};

struct Node* reverseList(struct Node* head) {
    // TODO: In-place reverse pointers using prev, curr, next
    return head;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
        newNode->val = x;
        newNode->next = NULL;
        if (!head) head = tail = newNode;
        else { tail->next = newNode; tail = newNode; }
    }

    head = reverseList(head);

    struct Node* cur = head;
    while (cur) {
        printf("%d -> ", cur->val);
        cur = cur->next;
    }
    printf("NULL\\n");

    return 0;
}`,
      solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node* next;
};

struct Node* reverseList(struct Node* head) {
    struct Node* prev = NULL;
    struct Node* curr = head;
    struct Node* next = NULL;

    while (curr != NULL) {
        next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
        newNode->val = x;
        newNode->next = NULL;
        if (!head) head = tail = newNode;
        else { tail->next = newNode; tail = newNode; }
    }

    head = reverseList(head);

    struct Node* cur = head;
    while (cur) {
        printf("%d -> ", cur->val);
        cur = cur->next;
    }
    printf("NULL\\n");

    return 0;
}`,
      openTestCase: {
        input: `5
1 2 3 4 5`,
        expectedOutput: '5 -> 4 -> 3 -> 2 -> 1 -> NULL',
        explanation: 'The linked list 1->2->3->4->5 reversed becomes 5->4->3->2->1->NULL.',
      },
      hiddenTestCase: {
        input: `3
10 20 30`,
        expectedOutput: '30 -> 20 -> 10 -> NULL',
      },
    },
  },

  {
    id: 'm4-t12-cycle-detection-floyd',
    moduleIndex: 4,
    moduleSlug: 'structures-advanced',
    moduleTitle: 'Module 4: Advanced Data Types, Dynamic Memory',
    topicTitle: 'Cycle Detection & Entry Point (Floyd Algorithm)',
    summary: 'Detect cyclical reference loops in linked nodes using fast/slow pointer collision analysis.',
    tipBox: {
      syntax: `// Floyd's Cycle Detection (Tortoise and Hare)
int slow = 0, fast = 0;
while (fast != -1 && nxt[fast] != -1) {
    slow = nxt[slow];
    fast = nxt[nxt[fast]];
    if (slow == fast) {
        // Cycle confirmed! Find entry node:
        int entry = 0;
        while (entry != slow) {
            entry = nxt[entry];
            slow = nxt[slow];
        }
        return entry;
    }
}`,
      application: 'Memory leak garbage collectors, deadlock detection in OS mutex graphs, and distributed routing loop prevention use Floyd collision detection.',
      example: `#include <stdio.h>
int main() {
    int nxt[] = {1, 2, 0}; // 0->1->2->0 (cycle at 0)
    int slow = 0, fast = 0;
    do {
        slow = nxt[slow];
        fast = nxt[nxt[fast]];
    } while (slow != fast);
    printf("Cycle detected!\\n");
    return 0;
}`,
    },
    problem: {
      title: 'Linked Node Cycle & Entry Point Detection',
      difficulty: 'HARD',
      description: `### Problem Description

Given a linked node graph of $N$ nodes (indexed $0$ to $N - 1$), where node $i$ directs to target node \`nxt[i]\` (or \`-1\` if it terminates).

Starting from node $0$, determine whether the traversal enters an infinite cycle using **Floyd's Tortoise and Hare (Slow/Fast pointer)** algorithm. 

- If a cycle exists, identify the **0-indexed entry node** of the cycle and print:
  \`CYCLE DETECTED AT NODE X\`
- If the traversal reaches a terminating node (\`-1\`), print:
  \`NO CYCLE\`

### Input Format
- Line 1: Integer $N$ ($1 \\le N \\le 100$).
- Line 2: $N$ space-separated integers representing \`nxt[0] ... nxt[N - 1]\`.

### Output Format
Print \`CYCLE DETECTED AT NODE X\` or \`NO CYCLE\`.`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int nxt[105];
    for (int i = 0; i < n; i++) {
        scanf("%d", &nxt[i]);
    }

    // TODO: Implement Floyd's Tortoise and Hare to detect loop and find cycle entry
    

    return 0;
}`,
      solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;

    int nxt[105];
    for (int i = 0; i < n; i++) {
        scanf("%d", &nxt[i]);
    }

    int slow = 0, fast = 0;
    int hasCycle = 0;

    while (fast >= 0 && fast < n && nxt[fast] >= 0 && nxt[fast] < n) {
        slow = nxt[slow];
        fast = nxt[nxt[fast]];

        if (slow == fast) {
            hasCycle = 1;
            break;
        }
    }

    if (!hasCycle) {
        printf("NO CYCLE\\n");
    } else {
        int entry = 0;
        while (entry != slow) {
            entry = nxt[entry];
            slow = nxt[slow];
        }
        printf("CYCLE DETECTED AT NODE %d\\n", entry);
    }

    return 0;
}`,
      openTestCase: {
        input: `4
1 2 3 1`,
        expectedOutput: 'CYCLE DETECTED AT NODE 1',
        explanation: 'Traversal: 0 -> 1 -> 2 -> 3 -> 1. Node 1 is the entry point of the cycle.',
      },
      hiddenTestCase: {
        input: `3
1 2 -1`,
        expectedOutput: 'NO CYCLE',
      },
    },
  },
];
