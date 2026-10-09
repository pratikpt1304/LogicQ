import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LogicQ database...');

  // 1. Create Badges
  const badgesData = [
    {
      slug: 'first-blood',
      name: 'First Blood',
      description: 'Submit your first Accepted C solution on LogicQ',
      iconName: 'Zap',
      category: 'SOLVE_COUNT',
      requirementCount: 1,
    },
    {
      slug: 'streak-7',
      name: 'Week Warrior',
      description: 'Maintain an active 7-day daily challenge streak',
      iconName: 'Flame',
      category: 'STREAK',
      requirementCount: 7,
    },
    {
      slug: 'streak-30',
      name: 'Iron Coder',
      description: 'Maintain an active 30-day daily challenge streak',
      iconName: 'Award',
      category: 'STREAK',
      requirementCount: 30,
    },
    {
      slug: 'solved-10',
      name: 'Decathlete',
      description: 'Successfully solve 10 distinct LogicQ challenges',
      iconName: 'CheckCircle2',
      category: 'SOLVE_COUNT',
      requirementCount: 10,
    },
    {
      slug: 'hard-solver',
      name: 'Pointer Virtuoso',
      description: 'Conquer 3 Hard-difficulty C challenges with clean memory',
      iconName: 'ShieldAlert',
      category: 'DIFFICULTY',
      requirementCount: 3,
    },
    {
      slug: 'contest-finisher',
      name: 'Arena Gladiator',
      description: 'Participate and score points in an official timed Arena contest',
      iconName: 'Trophy',
      category: 'CONTEST',
      requirementCount: 1,
    },
  ];

  for (const b of badgesData) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
  }
  console.log('Badges seeded.');

  // 2. Create Administrator Account
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@logicq.io';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      fullName: 'LogicQ Administrator',
      passwordHash: adminHash,
    },
    create: {
      username: adminUsername,
      email: adminEmail,
      fullName: 'LogicQ Administrator',
      passwordHash: adminHash,
      role: 'ADMIN',
      bio: 'Core Platform Administrator & Judge Maintainer',
      college: 'LogicQ Operations',
    },
  });
  console.log(`Admin created: ${adminUser.username} (${adminUser.email})`);

  // 3. Create Sample Student Users
  const studentsData = [
    {
      username: 'c_wizard',
      email: 'alice@example.com',
      fullName: 'Alice Chen',
      college: 'MIT EECS',
      bio: 'Pointers never segfault on my watch. C enthusiast.',
      totalPoints: 280,
      currentStreak: 9,
      longestStreak: 14,
      lastSolvedDate: '2026-10-09',
    },
    {
      username: 'pointer_ninja',
      email: 'devin@example.com',
      fullName: 'Devin Patel',
      college: 'IIT Bombay',
      bio: 'Low-level systems hacker and competitive coder.',
      totalPoints: 215,
      currentStreak: 5,
      longestStreak: 8,
      lastSolvedDate: '2026-10-09',
    },
    {
      username: 'bit_flipper',
      email: 'marcus@example.com',
      fullName: 'Marcus Vance',
      college: 'Stanford University',
      bio: 'Optimizing assembly and memory alignments.',
      totalPoints: 140,
      currentStreak: 3,
      longestStreak: 6,
      lastSolvedDate: '2026-10-08',
    },
    {
      username: 'null_pointer',
      email: 'elena@example.com',
      fullName: 'Elena Rostova',
      college: 'TU Munich',
      bio: 'Learning defensive C coding and debugging memory leaks.',
      totalPoints: 85,
      currentStreak: 1,
      longestStreak: 4,
      lastSolvedDate: '2026-10-07',
    },
  ];

  const defaultStudentHash = await bcrypt.hash('StudentPass123!', 10);
  const studentMap: Record<string, any> = {};

  for (const s of studentsData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: s,
      create: {
        ...s,
        passwordHash: defaultStudentHash,
        role: 'STUDENT',
      },
    });
    studentMap[s.username] = user;
  }
  console.log('Sample students seeded.');

  // Award First Blood badge to sample students
  const firstBloodBadge = await prisma.badge.findUnique({ where: { slug: 'first-blood' } });
  if (firstBloodBadge) {
    for (const u of Object.values(studentMap)) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: u.id, badgeId: firstBloodBadge.id } },
        update: {},
        create: { userId: u.id, badgeId: firstBloodBadge.id },
      });
    }
  }

  // 4. Create 16 Original C Problems
  const problemsData = [
    {
      slug: 'sum-of-multiples',
      title: 'Sum of Multiples',
      difficulty: 'EASY',
      category: 'Math & Loops',
      tags: JSON.stringify(['Math', 'Loops', 'Basics']),
      description: `### Problem Description

Given an integer \`N\`, calculate the sum of all natural numbers less than or equal to \`N\` that are multiples of either **3** or **5**.

### Input Format
A single line containing the integer \`N\` ($1 \\le N \\le 10^5$).

### Output Format
Print the total sum as an integer followed by a newline.

### Example 1
**Input:**
\`\`\`
10
\`\`\`
**Output:**
\`\`\`
33
\`\`\`
**Explanation:** Multiples of 3 or 5 up to 10 are 3, 5, 6, 9, 10. Their sum is 3 + 5 + 6 + 9 + 10 = 33.

### Constraints
- $1 \\le N \\le 10^5$
- Time Limit: 1000 ms
- Memory Limit: 64 MB`,
      starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Write your logic here
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 10,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: '10\n', expectedOutput: '33\n', isHidden: false },
        { input: '15\n', expectedOutput: '60\n', isHidden: false },
        { input: '1\n', expectedOutput: '0\n', isHidden: true },
        { input: '100\n', expectedOutput: '2418\n', isHidden: true },
        { input: '1000\n', expectedOutput: '234168\n', isHidden: true },
      ],
    },
    {
      slug: 'in-place-string-reversal',
      title: 'In-Place String Reversal',
      difficulty: 'EASY',
      category: 'Pointers & Strings',
      tags: JSON.stringify(['Pointers', 'Strings', 'Two-Pointers']),
      description: `### Problem Description

Write a C program to reverse a given string in-place using pointer arithmetic without using standard library \`strrev\` or auxiliary buffers.

### Input Format
A single line containing a null-terminated string \`S\` (length $\\le 1000$).

### Output Format
Print the reversed string.

### Example 1
**Input:**
\`\`\`
logicq
\`\`\`
**Output:**
\`\`\`
qcigol
\`\`\`

### Constraints
- $1 \\le |S| \\le 1000$
- Character set: printable ASCII characters excluding newline.`,
      starterCode: `#include <stdio.h>
#include <string.h>

void reverseString(char* str) {
    // TODO: Implement pointer-based in-place reversal
}

int main() {
    char str[1024];
    if (fgets(str, sizeof(str), stdin)) {
        // Strip trailing newline
        size_t len = strlen(str);
        if (len > 0 && str[len - 1] == '\\n') str[len - 1] = '\\0';
        
        reverseString(str);
        printf("%s\\n", str);
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 10,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: 'logicq\n', expectedOutput: 'qcigol\n', isHidden: false },
        { input: 'racecar\n', expectedOutput: 'racecar\n', isHidden: false },
        { input: 'A\n', expectedOutput: 'A\n', isHidden: true },
        { input: 'Hello World!\n', expectedOutput: '!dlroW olleH\n', isHidden: true },
        { input: 'Competitive C Programming 2026\n', expectedOutput: '6202 gnimmargorP C evititepmoC\n', isHidden: true },
      ],
    },
    {
      slug: 'bitwise-parity-check',
      title: 'Bitwise Parity Check',
      difficulty: 'EASY',
      category: 'Bit Manipulation',
      tags: JSON.stringify(['Bitwise', 'Performance', 'Bit-Hacks']),
      description: `### Problem Description

Given an unsigned 32-bit integer, determine if it has **even** parity or **odd** parity.
The parity of a number is defined as the count of \`1\` bits in its binary representation modulo 2.
- If the count of set bits is even, print \`EVEN\`.
- If the count of set bits is odd, print \`ODD\`.

### Input Format
A single unsigned integer $X$ ($0 \\le X < 2^{32}$).

### Output Format
Print \`EVEN\` or \`ODD\` followed by a newline.

### Example 1
**Input:**
\`\`\`
5
\`\`\`
**Output:**
\`\`\`
EVEN
\`\`\`
**Explanation:** 5 in binary is \`101_2\` which has two set bits (even).

### Constraints
- $0 \\le X \\le 4294967295$`,
      starterCode: `#include <stdio.h>

int main() {
    unsigned int x;
    if (scanf("%u", &x) != 1) return 0;
    
    // TODO: Compute parity using bitwise operators
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 10,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: '5\n', expectedOutput: 'EVEN\n', isHidden: false },
        { input: '7\n', expectedOutput: 'ODD\n', isHidden: false },
        { input: '0\n', expectedOutput: 'EVEN\n', isHidden: true },
        { input: '1\n', expectedOutput: 'ODD\n', isHidden: true },
        { input: '4294967295\n', expectedOutput: 'EVEN\n', isHidden: true },
      ],
    },
    {
      slug: 'count-words-and-chars',
      title: 'Word and Character Counter',
      difficulty: 'EASY',
      category: 'Strings',
      tags: JSON.stringify(['Strings', 'State Machine', 'Parsing']),
      description: `### Problem Description

Write a C program that reads a line of text and counts both the total number of words and the total number of non-whitespace characters.
Words are defined as continuous sequences of non-whitespace characters separated by one or more spaces or tabs.

### Input Format
A single line of text up to 1024 characters.

### Output Format
Print the number of words and non-whitespace characters formatted as:
\`WORDS: W CHARS: C\`

### Example 1
**Input:**
\`\`\`
Think in logic. Code in C.
\`\`\`
**Output:**
\`\`\`
WORDS: 6 CHARS: 21
\`\`\``,
      starterCode: `#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main() {
    char buf[1024];
    if (fgets(buf, sizeof(buf), stdin)) {
        // TODO: Count words and non-space characters
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 10,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: 'Think in logic. Code in C.\n', expectedOutput: 'WORDS: 6 CHARS: 21\n', isHidden: false },
        { input: '   gcc   clang  \n', expectedOutput: 'WORDS: 2 CHARS: 8\n', isHidden: false },
        { input: 'LogicQ\n', expectedOutput: 'WORDS: 1 CHARS: 6\n', isHidden: true },
        { input: '   \n', expectedOutput: 'WORDS: 0 CHARS: 0\n', isHidden: true },
      ],
    },
    {
      slug: 'daily-longest-unique-substring',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'MEDIUM',
      category: 'Sliding Window',
      tags: JSON.stringify(['Strings', 'Sliding Window', 'Hash Map']),
      description: `### Problem Description

**Featured Daily Challenge:** Given an ASCII string \`S\`, find the length of the longest contiguous substring that contains no duplicate characters.

### Input Format
A single line containing the string \`S\` ($0 \\le |S| \\le 10^5$).

### Output Format
An integer representing the maximum length of a non-repeating substring.

### Example 1
**Input:**
\`\`\`
abcabcbb
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:** The answer is \`abc\`, with length 3.

### Example 2
**Input:**
\`\`\`
bbbbb
\`\`\`
**Output:**
\`\`\`
1
\`\`\`

### Constraints
- $0 \\le |S| \\le 100,000$
- Memory Limit: 64 MB
- Time Limit: 1000 ms`,
      starterCode: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(const char* s) {
    // TODO: Implement sliding window with character frequency lookup
    return 0;
}

int main() {
    static char s[100005];
    if (fgets(s, sizeof(s), stdin)) {
        size_t len = strlen(s);
        if (len > 0 && s[len - 1] == '\\n') s[len - 1] = '\\0';
        printf("%d\\n", lengthOfLongestSubstring(s));
    } else {
        printf("0\\n");
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 25,
      isDaily: true,
      scheduledDate: '2026-10-09',
      status: 'PUBLISHED',
      testCases: [
        { input: 'abcabcbb\n', expectedOutput: '3\n', isHidden: false },
        { input: 'bbbbb\n', expectedOutput: '1\n', isHidden: false },
        { input: 'pwwkew\n', expectedOutput: '3\n', isHidden: false },
        { input: '\n', expectedOutput: '0\n', isHidden: true },
        { input: 'abcdefghijklmnopqrstuvwxyz\n', expectedOutput: '26\n', isHidden: true },
        { input: 'aabccdeffghiij\n', expectedOutput: '4\n', isHidden: true },
      ],
    },
    {
      slug: 'valid-parentheses-stack',
      title: 'Valid Parentheses with Fixed Stack',
      difficulty: 'MEDIUM',
      category: 'Data Structures',
      tags: JSON.stringify(['Stack', 'Parsing', 'Memory']),
      description: `### Problem Description

Given a string containing only the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, and \`]\`, determine if the input string is valid.
An input string is valid if:
1. Open brackets are closed by the same type of brackets.
2. Open brackets are closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Implement your own stack in C without dynamic allocations.

### Input Format
A single line containing the bracket string ($1 \\le |S| \\le 10^4$).

### Output Format
Print \`VALID\` if the sequence is balanced, otherwise print \`INVALID\`.

### Example 1
**Input:**
\`\`\`
()[]{}
\`\`\`
**Output:**
\`\`\`
VALID
\`\`\`

### Example 2
**Input:**
\`\`\`
(]
\`\`\`
**Output:**
\`\`\`
INVALID
\`\`\``,
      starterCode: `#include <stdio.h>
#include <stdbool.h>
#include <string.h>

bool isValid(const char* s) {
    // TODO: Implement custom stack verification
    return false;
}

int main() {
    char s[10005];
    if (scanf("%10004s", s) == 1) {
        if (isValid(s)) {
            printf("VALID\\n");
        } else {
            printf("INVALID\\n");
        }
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 20,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: '()[]{}\n', expectedOutput: 'VALID\n', isHidden: false },
        { input: '(]\n', expectedOutput: 'INVALID\n', isHidden: false },
        { input: '([)]\n', expectedOutput: 'INVALID\n', isHidden: true },
        { input: '{[]}\n', expectedOutput: 'VALID\n', isHidden: true },
        { input: '(((\n', expectedOutput: 'INVALID\n', isHidden: true },
      ],
    },
    {
      slug: 'matrix-spiral-traversal',
      title: 'Matrix Spiral Order Traversal',
      difficulty: 'MEDIUM',
      category: '2D Arrays',
      tags: JSON.stringify(['Matrix', 'Traversal', 'Pointers']),
      description: `### Problem Description

Given an $R \\times C$ 2D matrix of integers, output all elements of the matrix in **spiral clockwise order**, starting from the top-left corner.

### Input Format
- First line: Two integers $R$ and $C$ ($1 \\le R, C \\le 100$).
- Next $R$ lines: Each line contains $C$ space-separated integers.

### Output Format
Print the elements in spiral order, separated by a single space, followed by a newline.

### Example 1
**Input:**
\`\`\`
3 3
1 2 3
4 5 6
7 8 9
\`\`\`
**Output:**
\`\`\`
1 2 3 6 9 8 7 4 5
\`\`\``,
      starterCode: `#include <stdio.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    int matrix[100][100];
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            scanf("%d", &matrix[i][j]);
        }
    }
    
    // TODO: Traverse and print in spiral clockwise order
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 20,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: '3 3\n1 2 3\n4 5 6\n7 8 9\n', expectedOutput: '1 2 3 6 9 8 7 4 5\n', isHidden: false },
        { input: '1 4\n10 20 30 40\n', expectedOutput: '10 20 30 40\n', isHidden: false },
        { input: '3 1\n5\n10\n15\n', expectedOutput: '5 10 15\n', isHidden: true },
        { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: '1 2 3 6 5 4\n', isHidden: true },
      ],
    },
    {
      slug: 'circular-buffer-fifo',
      title: 'Circular FIFO Buffer Simulator',
      difficulty: 'MEDIUM',
      category: 'Data Structures',
      tags: JSON.stringify(['Queue', 'Ring Buffer', 'Pointers']),
      description: `### Problem Description

Implement a circular ring buffer with a fixed capacity $K$.
Process $Q$ operations:
- \`PUSH x\`: Insert integer $x$. If buffer is full, print \`OVERFLOW\` and discard $x$.
- \`POP\`: Remove and print the oldest item. If buffer is empty, print \`EMPTY\`.
- \`PEEK\`: Print the oldest item without removing it. If empty, print \`EMPTY\`.

### Input Format
- First line: Two integers $K$ (capacity, $1 \\le K \\le 1000$) and $Q$ (queries, $1 \\le Q \\le 5000$).
- Next $Q$ lines: An operation as described above.

### Output Format
Print the result of each query on a separate line.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int k, q;
    if (scanf("%d %d", &k, &q) != 2) return 0;
    
    // TODO: Implement circular buffer operations
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 25,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '3 7\nPUSH 10\nPUSH 20\nPUSH 30\nPUSH 40\nPOP\nPEEK\nPOP\n',
          expectedOutput: 'OVERFLOW\n10\n20\n20\n',
          isHidden: false,
        },
        {
          input: '2 4\nPOP\nPEEK\nPUSH 5\nPOP\n',
          expectedOutput: 'EMPTY\nEMPTY\n5\n',
          isHidden: false,
        },
        {
          input: '1 4\nPUSH 99\nPUSH 100\nPOP\nPOP\n',
          expectedOutput: 'OVERFLOW\n99\nEMPTY\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'endian-byte-swap',
      title: 'Endian Byte Swapping & Bit Manipulation',
      difficulty: 'MEDIUM',
      category: 'Low-Level Systems',
      tags: JSON.stringify(['Bitwise', 'Endianness', 'Memory Layout']),
      description: `### Problem Description

In network protocols and cross-architecture drivers, converting 32-bit words between Little Endian and Big Endian format is fundamental.
Given a 32-bit unsigned hex integer (e.g., \`0x12345678\`), swap its byte ordering such that:
- Byte 0 (least significant) swaps with Byte 3 (most significant).
- Byte 1 swaps with Byte 2.

### Input Format
A single 32-bit integer in hexadecimal format (e.g. \`0x12345678\` or \`12345678\`).

### Output Format
Print the resulting swapped 32-bit value in hexadecimal with 8 uppercase digits, prefixed with \`0x\`.

### Example 1
**Input:**
\`\`\`
12345678
\`\`\`
**Output:**
\`\`\`
0x78563412
\`\`\``,
      starterCode: `#include <stdio.h>

unsigned int swapEndian(unsigned int val) {
    // TODO: Use bitwise shifts and masks to swap byte positions
    return 0;
}

int main() {
    unsigned int val;
    if (scanf("%x", &val) == 1) {
        printf("0x%08X\\n", swapEndian(val));
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 20,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: '12345678\n', expectedOutput: '0x78563412\n', isHidden: false },
        { input: 'AABBCCDD\n', expectedOutput: '0xDDCCBBAA\n', isHidden: false },
        { input: '00000001\n', expectedOutput: '0x01000000\n', isHidden: true },
        { input: 'FFFFFFFF\n', expectedOutput: '0xFFFFFFFF\n', isHidden: true },
      ],
    },
    {
      slug: 'merge-k-sorted-arrays',
      title: 'Merge K Sorted Arrays',
      difficulty: 'HARD',
      category: 'Heaps & Sorting',
      tags: JSON.stringify(['Min-Heap', 'Pointers', 'Divide & Conquer']),
      description: `### Problem Description

You are given $K$ sorted arrays of integers. Write a C program to merge all $K$ arrays into one single sorted array.

To pass the time limits, you must achieve $O(N \\log K)$ time complexity (e.g., utilizing a Min-Heap of size $K$), where $N$ is the total count of elements across all arrays.

### Input Format
- First line: Two integers $K$ ($1 \\le K \\le 100$) and $M$ ($1 \\le M \\le 500$, length of each array).
- Next $K$ lines: Each line contains $M$ sorted space-separated integers.

### Output Format
Print all merged integers in ascending order, separated by space.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int k, m;
    if (scanf("%d %d", &k, &m) != 2) return 0;
    
    // TODO: Implement K-way merge using a Min-Heap
    
    return 0;
}`,
      timeLimitMs: 1500,
      memoryLimitMb: 64,
      basePoints: 40,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '3 3\n1 4 7\n2 5 8\n3 6 9\n',
          expectedOutput: '1 2 3 4 5 6 7 8 9\n',
          isHidden: false,
        },
        {
          input: '2 2\n10 20\n5 15\n',
          expectedOutput: '5 10 15 20\n',
          isHidden: false,
        },
        {
          input: '1 3\n100 200 300\n',
          expectedOutput: '100 200 300\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'lru-cache-c',
      title: 'LRU Cache with Doubly Linked List',
      difficulty: 'HARD',
      category: 'System Design',
      tags: JSON.stringify(['Doubly Linked List', 'Hash Map', 'Pointers']),
      description: `### Problem Description

Implement a **Least Recently Used (LRU) Cache** in C with capacity $C$.
Support two operations in $O(1)$ average time:
1. \`SET key value\`: Insert or update the value of the key. If the number of keys exceeds $C$, evict the least recently used key.
2. \`GET key\`: Return the value of the key if it exists, otherwise print \`-1\`. When a key is accessed, it becomes most recently used.

### Input Format
- First line: Capacity $C$ ($1 \\le C \\le 500$) and number of queries $Q$ ($1 \\le Q \\le 5000$).
- Next $Q$ lines: Either \`SET k v\` or \`GET k\`.

### Output Format
Print the output of each \`GET\` query on a new line.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// TODO: Define Doubly Linked List Node and Hash Table for LRU Cache

int main() {
    int capacity, q;
    if (scanf("%d %d", &capacity, &q) != 2) return 0;
    
    // Process queries
    
    return 0;
}`,
      timeLimitMs: 1500,
      memoryLimitMb: 64,
      basePoints: 45,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '2 6\nSET 1 10\nSET 2 20\nGET 1\nSET 3 30\nGET 2\nGET 3\n',
          expectedOutput: '10\n-1\n30\n',
          isHidden: false,
        },
        {
          input: '1 4\nSET 5 50\nGET 5\nSET 6 60\nGET 5\n',
          expectedOutput: '50\n-1\n',
          isHidden: false,
        },
        {
          input: '3 5\nSET 1 100\nSET 2 200\nSET 3 300\nGET 1\nGET 4\n',
          expectedOutput: '100\n-1\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'memory-pool-block-allocator',
      title: 'Fixed-Size Memory Pool Allocator',
      difficulty: 'HARD',
      category: 'Operating Systems',
      tags: JSON.stringify(['Memory Management', 'Custom Malloc', 'Pointers']),
      description: `### Problem Description

In real-time embedded systems, dynamic heap allocation (\`malloc\`) causes fragmentation and non-deterministic latency.
Implement a **Fixed-Size Block Memory Pool Allocator** managing a buffer of $N$ blocks of size $B$ bytes each.
Support operations:
- \`ALLOC\`: Allocates the first available free block and prints its 0-indexed ID. If no block is available, prints \`OUT_OF_MEMORY\`.
- \`FREE id\`: Marks block \`id\` as free. If \`id\` is out of bounds or already free, prints \`DOUBLE_FREE\`. If valid, prints \`OK\`.

### Input Format
- First line: Total block count $N$ ($1 \\le N \\le 1000$) and query count $Q$ ($1 \\le Q \\le 5000$).
- Next $Q$ lines: Commands \`ALLOC\` or \`FREE id\`.

### Output Format
Print the status of each command on a separate line.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) return 0;
    
    // TODO: Implement pool allocator tracking free blocks
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 40,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '2 5\nALLOC\nALLOC\nALLOC\nFREE 0\nALLOC\n',
          expectedOutput: '0\n1\nOUT_OF_MEMORY\nOK\n0\n',
          isHidden: false,
        },
        {
          input: '2 4\nFREE 1\nALLOC\nFREE 0\nFREE 0\n',
          expectedOutput: 'DOUBLE_FREE\n0\nOK\nDOUBLE_FREE\n',
          isHidden: false,
        },
        {
          input: '1 3\nALLOC\nFREE 0\nALLOC\n',
          expectedOutput: '0\nOK\n0\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'dijkstra-shortest-path',
      title: 'Dijkstras Shortest Path on Adjacency Matrix',
      difficulty: 'HARD',
      category: 'Graph Algorithms',
      tags: JSON.stringify(['Graphs', 'Shortest Path', 'Priority Queue']),
      description: `### Problem Description

Given a directed weighted graph with $V$ vertices numbered $0$ to $V-1$ represented as an adjacency matrix, find the shortest path distances from source vertex $0$ to all vertices. If a vertex is unreachable, output \`-1\`.

### Input Format
- First line: An integer $V$ ($1 \\le V \\le 100$).
- Next $V$ lines: $V$ integers per line representing the weight of edge $(i, j)$ ($0$ if no edge, unless $i=j$).

### Output Format
Print $V$ space-separated integers representing shortest distances from $0$ to $i$ ($0 \\le i < V$).`,
      starterCode: `#include <stdio.h>
#include <stdbool.h>

#define INF 1000000000

int main() {
    int v;
    if (scanf("%d", &v) != 1) return 0;
    
    // TODO: Implement Dijkstra shortest path algorithm
    
    return 0;
}`,
      timeLimitMs: 1500,
      memoryLimitMb: 64,
      basePoints: 45,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '3\n0 4 2\n0 0 1\n0 0 0\n',
          expectedOutput: '0 4 2\n',
          isHidden: false,
        },
        {
          input: '3\n0 10 0\n0 0 5\n0 0 0\n',
          expectedOutput: '0 10 15\n',
          isHidden: false,
        },
        {
          input: '2\n0 0\n0 0\n',
          expectedOutput: '0 -1\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'pointer-arithmetic-palindrome',
      title: 'Pointer Arithmetic Palindrome Verifier',
      difficulty: 'EASY',
      category: 'Pointers',
      tags: JSON.stringify(['Pointers', 'Strings', 'Memory']),
      description: `### Problem Description

Check if a given string is a palindrome by comparing characters using **only raw pointer arithmetic** (i.e. \`*left == *right\`, \`left++\`, \`right--\`). You may not use array indexing (\`str[i]\`).
Case-insensitive comparison is required, ignoring any non-alphanumeric characters.

### Input Format
A single line string $S$ ($1 \\le |S| \\le 1000$).

### Output Format
Print \`YES\` if palindrome, else \`NO\`.

### Example 1
**Input:**
\`\`\`
A man, a plan, a canal: Panama
\`\`\`
**Output:**
\`\`\`
YES
\`\`\``,
      starterCode: `#include <stdio.h>
#include <ctype.h>
#include <stdbool.h>
#include <string.h>

int main() {
    char buf[1024];
    if (fgets(buf, sizeof(buf), stdin)) {
        // TODO: Validate palindrome using raw pointer movements
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 15,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        { input: 'A man, a plan, a canal: Panama\n', expectedOutput: 'YES\n', isHidden: false },
        { input: 'race a car\n', expectedOutput: 'NO\n', isHidden: false },
        { input: 'Was it a car or a cat I saw?\n', expectedOutput: 'YES\n', isHidden: true },
        { input: 'LogicQ Arena\n', expectedOutput: 'NO\n', isHidden: true },
      ],
    },
    {
      slug: 'safe-string-splitter',
      title: 'Safe String Splitter with Custom Delimiters',
      difficulty: 'MEDIUM',
      category: 'Strings & Memory',
      tags: JSON.stringify(['Strings', 'Pointers', 'Tokenization']),
      description: `### Problem Description

The standard C library function \`strtok\` is notorious for being thread-unsafe and mutating the input buffer.
Implement a re-entrant, safe string splitter function that takes a string $S$ and a delimiter character $D$, and prints each extracted non-empty token enclosed in quotes (\`"token"\`) on a separate line.

### Input Format
- First line: The delimiter character $D$.
- Second line: The input string $S$ ($1 \\le |S| \\le 1000$).

### Output Format
Print each extracted token enclosed in double quotes on its own line.`,
      starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char delim;
    if (scanf("%c\\n", &delim) != 1) return 0;
    
    char str[1024];
    if (fgets(str, sizeof(str), stdin)) {
        // Strip trailing newline
        size_t len = strlen(str);
        if (len > 0 && str[len - 1] == '\\n') str[len - 1] = '\\0';
        
        // TODO: Safe token extraction
    }
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 20,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: ',\napple,banana,orange,grape\n',
          expectedOutput: '"apple"\n"banana"\n"orange"\n"grape"\n',
          isHidden: false,
        },
        {
          input: ':\nuser:password::home:bin\n',
          expectedOutput: '"user"\n"password"\n"home"\n"bin"\n',
          isHidden: false,
        },
        {
          input: ';\nsingle_token\n',
          expectedOutput: '"single_token"\n',
          isHidden: true,
        },
      ],
    },
    {
      slug: 'binary-tree-height',
      title: 'Binary Tree Height and Leaf Count',
      difficulty: 'EASY',
      category: 'Trees',
      tags: JSON.stringify(['Binary Tree', 'Recursion', 'Pointers']),
      description: `### Problem Description

Given a binary tree represented as level-order input where \`-1\` indicates a NULL child, compute:
1. The maximum height of the tree (root alone has height 1).
2. The total count of leaf nodes.

### Input Format
First line: Integer $N$ (number of elements in level order, $1 \\le N \\le 1000$).
Second line: $N$ space-separated integers.

### Output Format
Print \`HEIGHT: H LEAVES: L\` followed by a newline.`,
      starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Build tree and calculate height + leaf count
    
    return 0;
}`,
      timeLimitMs: 1000,
      memoryLimitMb: 64,
      basePoints: 15,
      isDaily: false,
      scheduledDate: null,
      status: 'PUBLISHED',
      testCases: [
        {
          input: '7\n1 2 3 4 5 -1 6\n',
          expectedOutput: 'HEIGHT: 3 LEAVES: 3\n',
          isHidden: false,
        },
        {
          input: '1\n10\n',
          expectedOutput: 'HEIGHT: 1 LEAVES: 1\n',
          isHidden: false,
        },
        {
          input: '3\n1 2 -1\n',
          expectedOutput: 'HEIGHT: 2 LEAVES: 1\n',
          isHidden: true,
        },
      ],
    },
  ];

  const problemMap: Record<string, any> = {};

  for (const p of problemsData) {
    const { testCases, ...problemFields } = p;
    const problem = await prisma.problem.upsert({
      where: { slug: p.slug },
      update: problemFields,
      create: problemFields,
    });
    problemMap[p.slug] = problem;

    // Delete existing test cases and re-create
    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      await prisma.testCase.create({
        data: {
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          orderIndex: i,
        },
      });
    }
  }
  console.log(`Seeded ${problemsData.length} original C problems with test cases.`);

  // 5. Create a Scheduled Contest: "Genesis C Arena Round 1"
  const now = new Date();
  const startTime = new Date(now.getTime() - 1000 * 60 * 30); // Started 30 mins ago (ONGOING)
  const endTime = new Date(now.getTime() + 1000 * 60 * 90);   // Ends in 90 mins

  const contest = await prisma.contest.upsert({
    where: { slug: 'genesis-c-arena-round-1' },
    update: {
      status: 'ONGOING',
      startTime,
      endTime,
    },
    create: {
      slug: 'genesis-c-arena-round-1',
      title: 'Genesis C Arena — Round 1',
      description: 'The inaugural competitive programming arena contest of LogicQ. Test your logic, pointer manipulation, and speed under ICPC penalty scoring.',
      startTime,
      endTime,
      durationMinutes: 120,
      status: 'ONGOING',
    },
  });

  // Link 4 problems to contest
  const contestProblemSlugs = [
    'in-place-string-reversal',
    'bitwise-parity-check',
    'valid-parentheses-stack',
    'merge-k-sorted-arrays',
  ];

  await prisma.contestProblem.deleteMany({ where: { contestId: contest.id } });
  for (let i = 0; i < contestProblemSlugs.length; i++) {
    const slug = contestProblemSlugs[i];
    const prob = problemMap[slug];
    if (prob) {
      await prisma.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: prob.id,
          orderIndex: i,
          points: (i + 1) * 100,
        },
      });
    }
  }

  // Register participants to contest
  await prisma.contestParticipant.deleteMany({ where: { contestId: contest.id } });
  const sampleParticipants = [
    { username: 'c_wizard', score: 300, penaltyTime: 42, rank: 1 },
    { username: 'pointer_ninja', score: 300, penaltyTime: 65, rank: 2 },
    { username: 'bit_flipper', score: 100, penaltyTime: 18, rank: 3 },
  ];

  for (const sp of sampleParticipants) {
    const u = studentMap[sp.username];
    if (u) {
      await prisma.contestParticipant.create({
        data: {
          contestId: contest.id,
          userId: u.id,
          score: sp.score,
          penaltyTime: sp.penaltyTime,
          rank: sp.rank,
        },
      });
    }
  }
  console.log('Sample contest seeded with participants.');

  // 6. Create sample accepted submissions for dashboard stats & leaderboards
  const sampleSubmissions = [
    {
      username: 'c_wizard',
      problemSlug: 'sum-of-multiples',
      code: '#include <stdio.h>\nint main() { int n; scanf("%d", &n); long long sum = 0; for(int i=1; i<=n; i++) if(i%3==0 || i%5==0) sum+=i; printf("%lld\\n", sum); return 0; }',
      verdict: 'ACCEPTED',
      runtimeMs: 4,
      memoryKb: 512,
      pointsAwarded: 10,
    },
    {
      username: 'c_wizard',
      problemSlug: 'bitwise-parity-check',
      code: '#include <stdio.h>\nint main() { unsigned int x; scanf("%u", &x); int c = 0; while(x) { c ^= (x & 1); x >>= 1; } printf("%s\\n", c ? "ODD" : "EVEN"); return 0; }',
      verdict: 'ACCEPTED',
      runtimeMs: 3,
      memoryKb: 480,
      pointsAwarded: 10,
    },
    {
      username: 'c_wizard',
      problemSlug: 'daily-longest-unique-substring',
      code: '#include <stdio.h>\n#include <string.h>\nint main() { printf("3\\n"); return 0; }',
      verdict: 'ACCEPTED',
      runtimeMs: 5,
      memoryKb: 520,
      pointsAwarded: 25,
    },
    {
      username: 'pointer_ninja',
      problemSlug: 'sum-of-multiples',
      code: '#include <stdio.h>\nint main() { int n; scanf("%d", &n); long long sum = 0; for(int i=1; i<=n; i++) if(i%3==0 || i%5==0) sum+=i; printf("%lld\\n", sum); return 0; }',
      verdict: 'ACCEPTED',
      runtimeMs: 4,
      memoryKb: 512,
      pointsAwarded: 10,
    },
    {
      username: 'bit_flipper',
      problemSlug: 'bitwise-parity-check',
      code: '#include <stdio.h>\nint main() { unsigned int x; scanf("%u", &x); int c = 0; while(x) { c ^= (x & 1); x >>= 1; } printf("%s\\n", c ? "ODD" : "EVEN"); return 0; }',
      verdict: 'ACCEPTED',
      runtimeMs: 3,
      memoryKb: 480,
      pointsAwarded: 10,
    },
  ];

  for (const sub of sampleSubmissions) {
    const user = studentMap[sub.username];
    const prob = problemMap[sub.problemSlug];
    if (user && prob) {
      await prisma.submission.create({
        data: {
          userId: user.id,
          problemId: prob.id,
          code: sub.code,
          verdict: sub.verdict,
          runtimeMs: sub.runtimeMs,
          memoryKb: sub.memoryKb,
          pointsAwarded: sub.pointsAwarded,
        },
      });
    }
  }
  console.log('Sample submissions seeded.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
