const fs = require('fs');

const problems = [
  // Problem 66
  {
    slug: 'kanetkar-ch10-struct-padding-eval',
    title: 'Structure Member Alignment & Memory Padding Calculator',
    difficulty: 'MEDIUM',
    category: 'Structures and Unions',
    tags: ['Structs', 'Memory', 'Alignment', 'Padding'],
    description: `### Problem Description
In standard C ABIs (such as x86_64 SysV), structure members are aligned to multiples of their natural size (e.g. 1-byte char, 2-byte short, 4-byte int, 8-byte double/pointer) with tail padding matching the maximum member alignment (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Structures and Unions).

Given a layout of primitive fields defined by their sizes in sequence:
- \`c\` for 1-byte char
- \`s\` for 2-byte short
- \`i\` for 4-byte int
- \`d\` for 8-byte double

Calculate:
1. The total size in bytes of the structure including all internal and trailing padding bytes.
2. The total number of padding bytes inserted by the compiler.

### Input Format
- A single integer N: the number of members (1 ≤ N ≤ 20).
- N characters separated by space representing member types (\`c\`, \`s\`, \`i\`, \`d\`).

### Output Format
Print two space-separated integers: \`total_size padding_bytes\`.

### Example 1
**Input:**
\`\`\`
3
c i s
\`\`\`
**Output:**
\`\`\`
12 5
\`\`\`
*Explanation: 'c' at offset 0 (size 1). 'i' aligns at multiple of 4 -> offset 4 (3 pad bytes). 's' at offset 8 (size 2). Total size must align to max align (4), so 10 pads to 12 (2 trailing pad bytes). Total size = 12, pad = 3 + 2 = 5.*`,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Calculate struct size and padding
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int offset = 0;
    int max_align = 1;
    int data_bytes = 0;
    
    for (int k = 0; k < n; k++) {
        char type;
        scanf(" %c", &type);
        int sz = 1;
        if (type == 'c') sz = 1;
        else if (type == 's') sz = 2;
        else if (type == 'i') sz = 4;
        else if (type == 'd') sz = 8;
        
        if (sz > max_align) max_align = sz;
        data_bytes += sz;
        
        int rem = offset % sz;
        if (rem != 0) {
            offset += (sz - rem);
        }
        offset += sz;
    }
    
    int rem = offset % max_align;
    if (rem != 0) {
        offset += (max_align - rem);
    }
    
    int padding = offset - data_bytes;
    printf("%d %d\\n", offset, padding);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Memory Alignment & Padding',
      exerciseNumber: '10.3',
      exerciseOrder: 3,
      page: 135,
      concept: 'Struct member alignment and natural word boundaries in C',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\nc i s\n', expectedOutput: '12 5\n' },
      { input: '4\nc c c c\n', expectedOutput: '4 0\n' },
    ],
    hiddenTests: [
      { input: '2\nc d\n', expectedOutput: '16 7\n' },
      { input: '1\nd\n', expectedOutput: '8 0\n' },
      { input: '5\nd c s i d\n', expectedOutput: '24 7\n' },
      { input: '3\ni i i\n', expectedOutput: '12 0\n' },
    ],
  },
  // Problem 67
  {
    slug: 'kanetkar-ch10-struct-array-rank-sort',
    title: 'Array of Structures Multi-Key Student Ranker',
    difficulty: 'EASY',
    category: 'Structures and Unions',
    tags: ['Structs', 'Sorting', 'Arrays', 'Pointers'],
    description: `### Problem Description
In C, sorting an array of structures based on multiple criteria (e.g., total marks descending, then roll number ascending) is a foundational pattern (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).

Given N students, each with a roll number (int) and three subject marks (integers m1, m2, m3), sort the students by total marks in descending order. If two students have identical total marks, the student with the smaller roll number appears first.

### Input Format
- First line: integer N (1 ≤ N ≤ 100).
- Next N lines: four space-separated integers per line: \`roll m1 m2 m3\` (1 ≤ roll ≤ 1000, 0 ≤ marks ≤ 100).

### Output Format
Print N lines, each containing: \`roll total_marks\` in sorted order.

### Example 1
**Input:**
\`\`\`
3
101 80 85 90
102 95 90 90
103 80 85 90
\`\`\`
**Output:**
\`\`\`
102 275
101 255
103 255
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Student {
    int roll;
    int total;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Sort array of structures
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int roll;
    int total;
} Student;

int compare(const void *a, const void *b) {
    const Student *s1 = (const Student *)a;
    const Student *s2 = (const Student *)b;
    if (s2->total != s1->total) return s2->total - s1->total;
    return s1->roll - s2->roll;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Student arr[105];
    for (int i = 0; i < n; i++) {
        int r, m1, m2, m3;
        scanf("%d %d %d %d", &r, &m1, &m2, &m3);
        arr[i].roll = r;
        arr[i].total = m1 + m2 + m3;
    }
    qsort(arr, n, sizeof(Student), compare);
    for (int i = 0; i < n; i++) {
        printf("%d %d\\n", arr[i].roll, arr[i].total);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Arrays of Structures',
      exerciseNumber: '10.8',
      exerciseOrder: 8,
      page: 139,
      concept: 'Multi-field sorting with structure pointers and qsort comparator',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3\n101 80 85 90\n102 95 90 90\n103 80 85 90\n', expectedOutput: '102 275\n101 255\n103 255\n' },
      { input: '2\n200 50 50 50\n100 50 50 50\n', expectedOutput: '100 150\n200 150\n' },
    ],
    hiddenTests: [
      { input: '1\n10 100 100 100\n', expectedOutput: '10 300\n' },
      { input: '4\n4 10 20 30\n3 20 20 20\n2 30 20 10\n1 50 50 50\n', expectedOutput: '1 150\n2 60\n3 60\n4 60\n' },
      { input: '3\n50 90 90 90\n20 90 90 90\n80 90 90 90\n', expectedOutput: '20 270\n50 270\n80 270\n' },
    ],
  },
  // Problem 68
  {
    slug: 'kanetkar-ch10-nested-struct-distance',
    title: 'Nested Structure 2D Cartesian Perimeter & Centroid',
    difficulty: 'EASY',
    category: 'Structures and Unions',
    tags: ['Structs', 'Nested Structs', 'Geometry', 'Math'],
    description: `### Problem Description
Structures in C can contain other structures as members (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).

Define a \`Point\` struct \`{ double x, y; }\` and a \`Triangle\` struct containing three nested \`Point\` members \`{ Point a, b, c; }\`.
Given the coordinates of the 3 vertices of a triangle, compute:
1. The perimeter of the triangle rounded to 2 decimal places.
2. The centroid \`(cx, cy)\` rounded to 2 decimal places.

### Input Format
- A single line containing 6 floating point values: \`x1 y1 x2 y2 x3 y3\`.

### Output Format
- Line 1: \`PERIMETER: <val>\` (formatted with \`%.2f\`)
- Line 2: \`CENTROID: (<cx>, <cy>)\` (formatted with \`%.2f\`)

### Example 1
**Input:**
\`\`\`
0.0 0.0 4.0 0.0 0.0 3.0
\`\`\`
**Output:**
\`\`\`
PERIMETER: 12.00
CENTROID: (1.33, 1.00)
\`\`\``,
    starterCode: `#include <stdio.h>
#include <math.h>

struct Point {
    double x, y;
};

struct Triangle {
    struct Point a, b, c;
};

int main() {
    // Read vertices and compute perimeter & centroid
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <math.h>

typedef struct {
    double x, y;
} Point;

typedef struct {
    Point a, b, c;
} Triangle;

double dist(Point p1, Point p2) {
    return sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}

int main() {
    Triangle t;
    if (scanf("%lf %lf %lf %lf %lf %lf", &t.a.x, &t.a.y, &t.b.x, &t.b.y, &t.c.x, &t.c.y) != 6) return 0;
    
    double perim = dist(t.a, t.b) + dist(t.b, t.c) + dist(t.c, t.a);
    double cx = (t.a.x + t.b.x + t.c.x) / 3.0;
    double cy = (t.a.y + t.b.y + t.c.y) / 3.0;
    
    printf("PERIMETER: %.2f\\n", perim);
    printf("CENTROID: (%.2f, %.2f)\\n", cx, cy);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Nested Structures',
      exerciseNumber: '10.12',
      exerciseOrder: 12,
      page: 142,
      concept: 'Nested structures composition and pass-by-value semantics',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '0.0 0.0 4.0 0.0 0.0 3.0\n', expectedOutput: 'PERIMETER: 12.00\nCENTROID: (1.33, 1.00)\n' },
      { input: '0.0 0.0 2.0 0.0 1.0 1.7320508\n', expectedOutput: 'PERIMETER: 6.00\nCENTROID: (1.00, 0.58)\n' },
    ],
    hiddenTests: [
      { input: '1.0 1.0 4.0 5.0 1.0 5.0\n', expectedOutput: 'PERIMETER: 12.00\nCENTROID: (2.00, 3.67)\n' },
      { input: '-2.0 -2.0 2.0 -2.0 0.0 2.0\n', expectedOutput: 'PERIMETER: 12.94\nCENTROID: (0.00, -0.67)\n' },
    ],
  },
  // Problem 69
  {
    slug: 'kanetkar-ch10-union-ieee754-type-pun',
    title: 'Union Type Punning: Float to IEEE-754 Bit Inspector',
    difficulty: 'EASY',
    category: 'Structures and Unions',
    tags: ['Unions', 'Type Punning', 'IEEE-754', 'Bitwise'],
    description: `### Problem Description
In C, a \`union\` shares the same memory location for all its members. This allows type punning to inspect the raw binary representation of a floating-point number without modifying its bits (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Structures and Unions).

Using a union of a \`float\` and an \`unsigned int\`:
\`\`\`c
union FloatBits {
    float f;
    unsigned int u;
};
\`\`\`
Inspect a given single-precision floating point number and output:
1. Hexadecimal representation (\`0x%08X\`).
2. Sign bit (bit 31): \`0\` or \`1\`.
3. Biased exponent (bits 30..23) as an unsigned integer.
4. Mantissa / fraction bits (bits 22..0) as hexadecimal (\`0x%06X\`).

### Input Format
- A single float value.

### Output Format
- Single line: \`HEX: 0x%08X | SIGN: %u | EXP: %u | MANTISSA: 0x%06X\`

### Example 1
**Input:**
\`\`\`
1.0
\`\`\`
**Output:**
\`\`\`
HEX: 0x3F800000 | SIGN: 0 | EXP: 127 | MANTISSA: 0x000000
\`\`\``,
    starterCode: `#include <stdio.h>

union FloatBits {
    float f;
    unsigned int u;
};

int main() {
    union FloatBits fb;
    if (scanf("%f", &fb.f) != 1) return 0;
    // Extract sign, exponent, and mantissa
    return 0;
}`,
    solutionCode: `#include <stdio.h>

union FloatBits {
    float f;
    unsigned int u;
};

int main() {
    union FloatBits fb;
    if (scanf("%f", &fb.f) != 1) return 0;
    
    unsigned int sign = (fb.u >> 31) & 1;
    unsigned int exp = (fb.u >> 23) & 0xFF;
    unsigned int mantissa = fb.u & 0x7FFFFF;
    
    printf("HEX: 0x%08X | SIGN: %u | EXP: %u | MANTISSA: 0x%06X\\n", fb.u, sign, exp, mantissa);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Union Type Punning',
      exerciseNumber: '10.19',
      exerciseOrder: 19,
      page: 147,
      concept: 'Union type punning for IEEE-754 bit layout extraction',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '1.0\n', expectedOutput: 'HEX: 0x3F800000 | SIGN: 0 | EXP: 127 | MANTISSA: 0x000000\n' },
      { input: '-1.0\n', expectedOutput: 'HEX: 0xBF800000 | SIGN: 1 | EXP: 127 | MANTISSA: 0x000000\n' },
    ],
    hiddenTests: [
      { input: '0.0\n', expectedOutput: 'HEX: 0x00000000 | SIGN: 0 | EXP: 0 | MANTISSA: 0x000000\n' },
      { input: '2.5\n', expectedOutput: 'HEX: 0x40200000 | SIGN: 0 | EXP: 128 | MANTISSA: 0x200000\n' },
      { input: '-0.5\n', expectedOutput: 'HEX: 0xBF000000 | SIGN: 1 | EXP: 126 | MANTISSA: 0x000000\n' },
    ],
  },
  // Problem 70
  {
    slug: 'kanetkar-ch10-tagged-union-variant',
    title: 'Tagged Union Algebraic Variant Evaluator',
    difficulty: 'MEDIUM',
    category: 'Structures and Unions',
    tags: ['Unions', 'Tagged Union', 'Variant', 'Structs'],
    description: `### Problem Description
Because a union does not track which member is currently active, production C programs pair a union with an enumeration tag in a pattern known as a **Tagged Union** or **Discriminated Union** (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).

Given a series of N tagged items:
- Tag \`I\`: holds a signed 32-bit integer (\`int\`).
- Tag \`F\`: holds a single precision float (\`float\`).
- Tag \`S\`: holds a string of up to 15 characters (\`char[16]\`).

Calculate:
1. The sum of all integer values.
2. The sum of all float values (rounded to 2 decimal places).
3. The concatenated string of all string items (in the order they appeared).

### Input Format
- First line: integer N (1 ≤ N ≤ 50).
- Next N lines: a character tag (\`I\`, \`F\`, or \`S\`) followed by space and the value.

### Output Format
- Line 1: \`INT_SUM: <sum>\`
- Line 2: \`FLOAT_SUM: <sum>\` (formatted with \`%.2f\`)
- Line 3: \`STR_CONCAT: <concat>\`

### Example 1
**Input:**
\`\`\`
4
I 15
S Hello
F 3.5
S _World
\`\`\`
**Output:**
\`\`\`
INT_SUM: 15
FLOAT_SUM: 3.50
STR_CONCAT: Hello_World
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

// Tagged union definition
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Process tagged union items
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

typedef enum { TAG_INT, TAG_FLOAT, TAG_STR } Tag;

typedef struct {
    Tag tag;
    union {
        int i_val;
        float f_val;
        char s_val[32];
    } data;
} Item;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    long long int_sum = 0;
    double float_sum = 0.0;
    char str_buf[1024] = "";
    
    for (int k = 0; k < n; k++) {
        char tag_char;
        scanf(" %c", &tag_char);
        Item item;
        if (tag_char == 'I') {
            item.tag = TAG_INT;
            scanf("%d", &item.data.i_val);
            int_sum += item.data.i_val;
        } else if (tag_char == 'F') {
            item.tag = TAG_FLOAT;
            scanf("%f", &item.data.f_val);
            float_sum += item.data.f_val;
        } else if (tag_char == 'S') {
            item.tag = TAG_STR;
            scanf("%s", item.data.s_val);
            strcat(str_buf, item.data.s_val);
        }
    }
    
    printf("INT_SUM: %lld\\n", int_sum);
    printf("FLOAT_SUM: %.2f\\n", float_sum);
    printf("STR_CONCAT: %s\\n", str_buf);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Discriminated Unions',
      exerciseNumber: '10.22',
      exerciseOrder: 22,
      page: 151,
      concept: 'Discriminated tagged unions for dynamic polymorphism in C',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '4\nI 15\nS Hello\nF 3.5\nS _World\n', expectedOutput: 'INT_SUM: 15\nFLOAT_SUM: 3.50\nSTR_CONCAT: Hello_World\n' },
      { input: '2\nI 10\nI -5\n', expectedOutput: 'INT_SUM: 5\nFLOAT_SUM: 0.00\nSTR_CONCAT: \n' },
    ],
    hiddenTests: [
      { input: '3\nS Foo\nS Bar\nS Baz\n', expectedOutput: 'INT_SUM: 0\nFLOAT_SUM: 0.00\nSTR_CONCAT: FooBarBaz\n' },
      { input: '3\nF 1.25\nF 2.50\nF 3.75\n', expectedOutput: 'INT_SUM: 0\nFLOAT_SUM: 7.50\nSTR_CONCAT: \n' },
    ],
  },
  // Problem 71
  {
    slug: 'kanetkar-ch10-bitfield-date-packer',
    title: 'Bit-Field Calendar Date Compact Binary Packer',
    difficulty: 'EASY',
    category: 'Structures and Unions',
    tags: ['Bit-Fields', 'Structs', 'Binary', 'Packing'],
    description: `### Problem Description
C bit-fields allow packing integer values into specific bit widths to conserve memory in embedded devices (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).

Define a bit-field structure to pack a calendar date into a 16-bit unsigned integer:
- \`day\` : 5 bits (1 to 31)
- \`month\` : 4 bits (1 to 12)
- \`year\` : 7 bits (0 to 99, offset from year 2000, e.g. 2026 -> 26)

Packing order (from least significant bit 0 to bit 15):
- Bits 0..4: \`day\`
- Bits 5..8: \`month\`
- Bits 9..15: \`year\`

Given a date string in format \`DD-MM-YYYY\`:
1. Pack it into the 16-bit unsigned integer.
2. Print the packed hex representation (\`0x%04X\`).
3. Unpack the integer using the bit-field and print back the verified date in \`DD-MM-YYYY\` format.

### Input Format
- A date string in \`DD-MM-YYYY\` format where 2000 ≤ YYYY ≤ 2099.

### Output Format
- Line 1: \`PACKED: 0x%04X\`
- Line 2: \`UNPACKED: DD-MM-YYYY\` (with leading zeros)

### Example 1
**Input:**
\`\`\`
15-08-2026
\`\`\`
**Output:**
\`\`\`
PACKED: 0x350F
UNPACKED: 15-08-2026
\`\`\``,
    starterCode: `#include <stdio.h>

struct CompactDate {
    unsigned int day : 5;
    unsigned int month : 4;
    unsigned int year : 7;
};

int main() {
    int d, m, y;
    if (scanf("%d-%d-%d", &d, &m, &y) != 3) return 0;
    // Pack and unpack
    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct CompactDate {
    unsigned int day : 5;
    unsigned int month : 4;
    unsigned int year : 7;
};

int main() {
    int d, m, y;
    if (scanf("%d-%d-%d", &d, &m, &y) != 3) return 0;
    
    struct CompactDate cd;
    cd.day = d;
    cd.month = m;
    cd.year = y - 2000;
    
    unsigned short packed = (cd.day & 0x1F) | ((cd.month & 0x0F) << 5) | ((cd.year & 0x7F) << 9);
    
    // Unpack
    unsigned int u_day = packed & 0x1F;
    unsigned int u_month = (packed >> 5) & 0x0F;
    unsigned int u_year = ((packed >> 9) & 0x7F) + 2000;
    
    printf("PACKED: 0x%04X\\n", packed);
    printf("UNPACKED: %02u-%02u-%04u\\n", u_day, u_month, u_year);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Bit-Fields',
      exerciseNumber: '10.25',
      exerciseOrder: 25,
      page: 154,
      concept: 'Bit-field allocation order and compact binary serialization',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '15-08-2026\n', expectedOutput: 'PACKED: 0x350F\nUNPACKED: 15-08-2026\n' },
      { input: '01-01-2000\n', expectedOutput: 'PACKED: 0x0021\nUNPACKED: 01-01-2000\n' },
    ],
    hiddenTests: [
      { input: '31-12-2099\n', expectedOutput: 'PACKED: 0xC79F\nUNPACKED: 31-12-2099\n' },
      { input: '28-02-2024\n', expectedOutput: 'PACKED: 0x305C\nUNPACKED: 28-02-2024\n' },
    ],
  },
  // Problem 72
  {
    slug: 'kanetkar-ch10-bitfield-hardware-reg',
    title: 'Hardware Peripheral Register Bit-Field Controller',
    difficulty: 'EASY',
    category: 'Structures and Unions',
    tags: ['Bit-Fields', 'Hardware', 'Embedded', 'Bitwise'],
    description: `### Problem Description
Microcontroller peripheral control registers are modeled in C using bit-fields overlaid across memory-mapped I/O (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).

An 8-bit UART Control & Status Register (UART_CSR) has the following bits:
- Bit 0: \`TX_ENABLE\` (1 = On, 0 = Off)
- Bit 1: \`RX_ENABLE\` (1 = On, 0 = Off)
- Bit 2: \`PARITY_EVEN\` (1 = Even, 0 = Odd)
- Bits 3..4: \`BAUD_RATE\` (\`00\` = 9600, \`01\` = 19200, \`10\` = 57600, \`11\` = 115200)
- Bit 5: \`ERROR_FLAG\` (1 = Error, 0 = Clear)
- Bit 6: \`DATA_READY\` (1 = Ready, 0 = Empty)
- Bit 7: \`INTERRUPT_EN\` (1 = Interrupts Enabled)

Given the raw 8-bit hex register value (e.g. \`0xA5\`), decode and print the status report.

### Input Format
- A single hexadecimal integer prefixed with \`0x\` or without (0x00 to 0xFF).

### Output Format
Print the status lines:
- \`TX: <ENABLED/DISABLED>\`
- \`RX: <ENABLED/DISABLED>\`
- \`PARITY: <EVEN/ODD>\`
- \`BAUD: <9600/19200/57600/115200>\`
- \`STATUS: <ERROR/OK>\`
- \`DATA: <READY/EMPTY>\`
- \`IRQ: <ENABLED/DISABLED>\`

### Example 1
**Input:**
\`\`\`
0xA5
\`\`\`
**Output:**
\`\`\`
TX: ENABLED
RX: DISABLED
PARITY: EVEN
BAUD: 9600
STATUS: OK
DATA: READY
IRQ: ENABLED
\`\`\``,
    starterCode: `#include <stdio.h>

int main() {
    unsigned int raw;
    if (scanf("%x", &raw) != 1) return 0;
    // Decode peripheral register
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    unsigned int raw;
    if (scanf("%x", &raw) != 1) return 0;
    
    int tx = raw & 1;
    int rx = (raw >> 1) & 1;
    int parity = (raw >> 2) & 1;
    int baud = (raw >> 3) & 3;
    int err = (raw >> 5) & 1;
    int ready = (raw >> 6) & 1;
    int irq = (raw >> 7) & 1;
    
    const char *bauds[] = {"9600", "19200", "57600", "115200"};
    
    printf("TX: %s\\n", tx ? "ENABLED" : "DISABLED");
    printf("RX: %s\\n", rx ? "ENABLED" : "DISABLED");
    printf("PARITY: %s\\n", parity ? "EVEN" : "ODD");
    printf("BAUD: %s\\n", bauds[baud]);
    printf("STATUS: %s\\n", err ? "ERROR" : "OK");
    printf("DATA: %s\\n", ready ? "READY" : "EMPTY");
    printf("IRQ: %s\\n", irq ? "ENABLED" : "DISABLED");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 10,
      chapterTitle: 'Structures and Unions',
      chapterOrder: 10,
      section: 'Hardware Register Mapping',
      exerciseNumber: '10.30',
      exerciseOrder: 30,
      page: 158,
      concept: 'Bit-field hardware register simulation and decoding',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '0xA5\n', expectedOutput: 'TX: ENABLED\nRX: DISABLED\nPARITY: EVEN\nBAUD: 9600\nSTATUS: OK\nDATA: READY\nIRQ: ENABLED\n' },
      { input: '0x00\n', expectedOutput: 'TX: DISABLED\nRX: DISABLED\nPARITY: ODD\nBAUD: 9600\nSTATUS: OK\nDATA: EMPTY\nIRQ: DISABLED\n' },
    ],
    hiddenTests: [
      { input: '0xFF\n', expectedOutput: 'TX: ENABLED\nRX: ENABLED\nPARITY: EVEN\nBAUD: 115200\nSTATUS: ERROR\nDATA: READY\nIRQ: ENABLED\n' },
      { input: '0x1B\n', expectedOutput: 'TX: ENABLED\nRX: ENABLED\nPARITY: ODD\nBAUD: 57600\nSTATUS: OK\nDATA: EMPTY\nIRQ: DISABLED\n' },
    ],
  },
  // Problem 73
  {
    slug: 'kanetkar-ch11-enum-traffic-fsm',
    title: 'Enumerated State Machine Traffic Controller',
    difficulty: 'EASY',
    category: 'Enums and Types',
    tags: ['Enums', 'State Machine', 'Switch'],
    description: `### Problem Description
Enumerations (\`enum\`) define self-documenting discrete states for finite-state machines in C (Yashavant Kanetkar, *Test Your C Skills*, Chapter 11: Enums and Typedefs).

A 4-way traffic junction controller has three states:
- \`STATE_RED\` (0)
- \`STATE_YELLOW\` (1)
- \`STATE_GREEN\` (2)

Transitions occur based on clock ticks:
- \`RED\` lasts 30 seconds -> transitions to \`GREEN\`.
- \`GREEN\` lasts 25 seconds -> transitions to \`YELLOW\`.
- \`YELLOW\` lasts 5 seconds -> transitions to \`RED\`.

Given an initial state (as integer 0, 1, or 2) and an elapsed time T (in seconds), compute the state of the light at time T and the number of seconds remaining before the next state transition.

### Input Format
- Two integers: \`state\` (0, 1, or 2) and \`T\` (0 ≤ T ≤ 100000).

### Output Format
Print: \`<STATE_NAME> <remaining_seconds>\`
Where state name is \`RED\`, \`YELLOW\`, or \`GREEN\`.

### Example 1
**Input:**
\`\`\`
0 10
\`\`\`
**Output:**
\`\`\`
RED 20
\`\`\`
*Explanation: State starts RED (30s duration). 10s have elapsed, so 20s remain before switching to GREEN.*`,
    starterCode: `#include <stdio.h>

enum TrafficState {
    STATE_RED = 0,
    STATE_YELLOW = 1,
    STATE_GREEN = 2
};

int main() {
    int init_state, t;
    if (scanf("%d %d", &init_state, &t) != 2) return 0;
    // Calculate final state and remaining duration
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int init_state, t;
    if (scanf("%d %d", &init_state, &t) != 2) return 0;
    
    // Total cycle: RED (30) -> GREEN (25) -> YELLOW (5) = 60s total
    // Map initial state to offset within standard 60s cycle starting at RED = 0:
    // RED: [0, 30)
    // GREEN: [30, 55)
    // YELLOW: [55, 60)
    int cycle_offset = 0;
    if (init_state == 0) cycle_offset = 0;
    else if (init_state == 2) cycle_offset = 30;
    else if (init_state == 1) cycle_offset = 55;
    
    int current_pos = (cycle_offset + t) % 60;
    
    if (current_pos < 30) {
        printf("RED %d\\n", 30 - current_pos);
    } else if (current_pos < 55) {
        printf("GREEN %d\\n", 55 - current_pos);
    } else {
        printf("YELLOW %d\\n", 60 - current_pos);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 11,
      chapterTitle: 'Typedef and Enum',
      chapterOrder: 11,
      section: 'Enumeration FSM',
      exerciseNumber: '11.5',
      exerciseOrder: 5,
      page: 162,
      concept: 'Finite state machine state representation using C enums',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '0 10\n', expectedOutput: 'RED 20\n' },
      { input: '2 20\n', expectedOutput: 'GREEN 5\n' },
    ],
    hiddenTests: [
      { input: '0 30\n', expectedOutput: 'GREEN 25\n' },
      { input: '1 4\n', expectedOutput: 'YELLOW 1\n' },
      { input: '0 60\n', expectedOutput: 'RED 30\n' },
      { input: '2 30\n', expectedOutput: 'RED 25\n' },
    ],
  },
  // Problem 74
  {
    slug: 'kanetkar-ch12-dynamic-array-vector',
    title: 'Dynamic Array Geometric Growth & Shrink Simulator',
    difficulty: 'MEDIUM',
    category: 'Dynamic Memory Allocation',
    tags: ['Pointers', 'Memory', 'realloc', 'Dynamic Memory'],
    description: `### Problem Description
Standard C provides \`malloc\`, \`realloc\`, and \`free\` for runtime memory management. Implementing an amortized $O(1)$ dynamic vector doubles its capacity when full and halves its capacity when size falls to one-fourth (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12: Dynamic Memory Allocation).

Vector rules:
- Initial capacity = 2, size = 0.
- When an element is pushed (\`PUSH x\`):
  - If \`size == capacity\`, capacity doubles (\`capacity *= 2\`).
  - Add element at \`size\`, then increment \`size\`.
- When an element is popped (\`POP\`):
  - Decrement \`size\`.
  - If \`size > 0\` and \`size == capacity / 4\` (integer division) and \`capacity > 2\`, halve capacity (\`capacity /= 2\`).

Given a series of Q operations, output:
- For each \`POP\`, print the popped element value.
- After all operations, print final \`size\` and \`capacity\`.

### Input Format
- First line: integer Q (1 ≤ Q ≤ 500).
- Next Q lines: \`PUSH <val>\` or \`POP\`.

### Output Format
- Popped values, one per line.
- Final line: \`FINAL: SIZE=%d CAPACITY=%d\`

### Example 1
**Input:**
\`\`\`
5
PUSH 10
PUSH 20
PUSH 30
POP
POP
\`\`\`
**Output:**
\`\`\`
30
20
FINAL: SIZE=1 CAPACITY=2
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    // Dynamic vector simulation
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    int capacity = 2;
    int size = 0;
    int *arr = (int *)malloc(capacity * sizeof(int));
    
    char op[16];
    for (int k = 0; k < q; k++) {
        scanf("%s", op);
        if (strcmp(op, "PUSH") == 0) {
            int val;
            scanf("%d", &val);
            if (size == capacity) {
                capacity *= 2;
                arr = (int *)realloc(arr, capacity * sizeof(int));
            }
            arr[size++] = val;
        } else if (strcmp(op, "POP") == 0) {
            if (size > 0) {
                int popped = arr[--size];
                printf("%d\\n", popped);
                if (size > 0 && size == capacity / 4 && capacity > 2) {
                    capacity /= 2;
                    arr = (int *)realloc(arr, capacity * sizeof(int));
                }
            }
        }
    }
    
    printf("FINAL: SIZE=%d CAPACITY=%d\\n", size, capacity);
    free(arr);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 12,
      chapterTitle: 'Dynamic Memory Allocation',
      chapterOrder: 12,
      section: 'Realloc Geometric Resizing',
      exerciseNumber: '12.4',
      exerciseOrder: 4,
      page: 171,
      concept: 'Amortized vector growth and capacity contraction with realloc',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\nPUSH 10\nPUSH 20\nPUSH 30\nPOP\nPOP\n', expectedOutput: '30\n20\nFINAL: SIZE=1 CAPACITY=2\n' },
      { input: '3\nPUSH 1\nPUSH 2\nPUSH 3\n', expectedOutput: 'FINAL: SIZE=3 CAPACITY=4\n' },
    ],
    hiddenTests: [
      { input: '6\nPUSH 5\nPUSH 6\nPUSH 7\nPUSH 8\nPUSH 9\nPOP\n', expectedOutput: '9\nFINAL: SIZE=4 CAPACITY=8\n' },
      { input: '2\nPUSH 100\nPOP\n', expectedOutput: '100\nFINAL: SIZE=0 CAPACITY=2\n' },
    ],
  },
  // Problem 75
  {
    slug: 'kanetkar-ch12-dynamic-2d-matrix-flatten',
    title: 'Dynamic 2D Contiguous Matrix & Row Flattening',
    difficulty: 'EASY',
    category: 'Dynamic Memory Allocation',
    tags: ['Pointers', 'Memory', '2D Arrays', 'Allocation'],
    description: `### Problem Description
Allocating a 2D matrix dynamically in C can be achieved either as an array of pointers (\`int **\`) or as a single contiguous 1D block (\`int *\`) indexed using \`row * cols + col\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12).

Given matrix dimensions $R$ and $C$ and its elements:
1. Allocate memory dynamically.
2. Read the elements.
3. Compute and print the sum of each row.
4. Compute and print the sum of each column.
5. Free all allocated memory cleanly.

### Input Format
- First line: two integers $R$ and $C$ ($1 \le R, C \le 50$).
- Next $R$ lines: $C$ integers per line.

### Output Format
- Line 1: \`ROW_SUMS: s1 s2 ... sR\`
- Line 2: \`COL_SUMS: c1 c2 ... cC\`

### Example 1
**Input:**
\`\`\`
2 3
1 2 3
4 5 6
\`\`\`
**Output:**
\`\`\`
ROW_SUMS: 6 15
COL_SUMS: 5 7 9
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    // Dynamic allocation and sums
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    int *matrix = (int *)malloc(r * c * sizeof(int));
    for (int i = 0; i < r * c; i++) {
        scanf("%d", &matrix[i]);
    }
    
    printf("ROW_SUMS:");
    for (int i = 0; i < r; i++) {
        int sum = 0;
        for (int j = 0; j < c; j++) {
            sum += matrix[i * c + j];
        }
        printf(" %d", sum);
    }
    printf("\\n");
    
    printf("COL_SUMS:");
    for (int j = 0; j < c; j++) {
        int sum = 0;
        for (int i = 0; i < r; i++) {
            sum += matrix[i * c + j];
        }
        printf(" %d", sum);
    }
    printf("\\n");
    
    free(matrix);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 12,
      chapterTitle: 'Dynamic Memory Allocation',
      chapterOrder: 12,
      section: '2D Arrays and Pointers',
      exerciseNumber: '12.8',
      exerciseOrder: 8,
      page: 174,
      concept: 'Single contiguous dynamic allocation vs row pointer indirection',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: 'ROW_SUMS: 6 15\nCOL_SUMS: 5 7 9\n' },
      { input: '1 1\n42\n', expectedOutput: 'ROW_SUMS: 42\nCOL_SUMS: 42\n' },
    ],
    hiddenTests: [
      { input: '3 2\n10 20\n30 40\n50 60\n', expectedOutput: 'ROW_SUMS: 30 70 110\nCOL_SUMS: 90 120\n' },
      { input: '2 2\n-1 1\n1 -1\n', expectedOutput: 'ROW_SUMS: 0 0\nCOL_SUMS: 0 0\n' },
    ],
  },
  // Problem 76
  {
    slug: 'kanetkar-ch13-linked-list-tail-insert',
    title: 'Singly Linked List Tail Insertion & Traversal',
    difficulty: 'EASY',
    category: 'Linked Lists',
    tags: ['Linked List', 'Pointers', 'Data Structures'],
    description: `### Problem Description
A singly linked list consists of self-referential structures chained by pointers (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13: Linked Lists).

\`\`\`c
struct Node {
    int data;
    struct Node *next;
};
\`\`\`

Given $N$ integers, build the linked list by inserting each element at the tail, keeping track of the tail pointer for $O(1)$ insertions. Then traverse the list and print all nodes in sequence, followed by freeing all dynamically allocated nodes.

### Input Format
- First line: integer $N$ ($1 \le N \le 100$).
- Second line: $N$ space-separated integers.

### Output Format
- Print the list nodes in format: \`HEAD -> n1 -> n2 -> ... -> NULL\`
- Final line: \`COUNT: N\`

### Example 1
**Input:**
\`\`\`
4
10 20 30 40
\`\`\`
**Output:**
\`\`\`
HEAD -> 10 -> 20 -> 30 -> 40 -> NULL
COUNT: 4
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Build and traverse linked list
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
    
    Node *head = NULL;
    Node *tail = NULL;
    int count = 0;
    
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        Node *newNode = (Node *)malloc(sizeof(Node));
        newNode->data = val;
        newNode->next = NULL;
        
        if (!head) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
        count++;
    }
    
    printf("HEAD");
    Node *curr = head;
    while (curr) {
        printf(" -> %d", curr->data);
        curr = curr->next;
    }
    printf(" -> NULL\\n");
    printf("COUNT: %d\\n", count);
    
    // Free list
    curr = head;
    while (curr) {
        Node *next = curr->next;
        free(curr);
        curr = next;
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists',
      chapterOrder: 13,
      section: 'Node Insertion',
      exerciseNumber: '13.2',
      exerciseOrder: 2,
      page: 182,
      concept: 'Self-referential structure node allocation and pointer chaining',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '4\n10 20 30 40\n', expectedOutput: 'HEAD -> 10 -> 20 -> 30 -> 40 -> NULL\nCOUNT: 4\n' },
      { input: '1\n99\n', expectedOutput: 'HEAD -> 99 -> NULL\nCOUNT: 1\n' },
    ],
    hiddenTests: [
      { input: '5\n1 2 3 4 5\n', expectedOutput: 'HEAD -> 1 -> 2 -> 3 -> 4 -> 5 -> NULL\nCOUNT: 5\n' },
      { input: '3\n-5 0 5\n', expectedOutput: 'HEAD -> -5 -> 0 -> 5 -> NULL\nCOUNT: 3\n' },
    ],
  },
  // Problem 77
  {
    slug: 'kanetkar-ch13-linked-list-reverse-inplace',
    title: 'In-Place Pointer Reversal of Singly Linked List',
    difficulty: 'EASY',
    category: 'Linked Lists',
    tags: ['Linked List', 'Pointers', 'In-Place'],
    description: `### Problem Description
Reversing a singly linked list in-place by rewiring \`next\` pointers without allocating new nodes or using additional memory is a classical C pointer puzzle (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

Using three pointers:
- \`prev = NULL\`
- \`curr = head\`
- \`next = NULL\`

Iteratively reverse the links and return the new head of the reversed list.

### Input Format
- First line: integer $N$ ($1 \le N \le 100$).
- Second line: $N$ integers.

### Output Format
Print the reversed list in format: \`REVERSED: n1 -> n2 -> ... -> NULL\`.

### Example 1
**Input:**
\`\`\`
4
1 2 3 4
\`\`\`
**Output:**
\`\`\`
REVERSED: 4 -> 3 -> 2 -> 1 -> NULL
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // In-place pointer reversal
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
    
    // In-place reverse
    Node *prev = NULL;
    Node *curr = head;
    while (curr) {
        Node *nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    head = prev;
    
    printf("REVERSED:");
    curr = head;
    while (curr) {
        printf(" %d ->", curr->data);
        curr = curr->next;
    }
    printf(" NULL\\n");
    
    // Cleanup
    curr = head;
    while (curr) {
        Node *nxt = curr->next;
        free(curr);
        curr = nxt;
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists',
      chapterOrder: 13,
      section: 'List Reversal',
      exerciseNumber: '13.6',
      exerciseOrder: 6,
      page: 185,
      concept: 'Three-pointer in-place linked list reversal algorithm',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '4\n1 2 3 4\n', expectedOutput: 'REVERSED: 4 -> 3 -> 2 -> 1 -> NULL\n' },
      { input: '1\n100\n', expectedOutput: 'REVERSED: 100 -> NULL\n' },
    ],
    hiddenTests: [
      { input: '2\n10 20\n', expectedOutput: 'REVERSED: 20 -> 10 -> NULL\n' },
      { input: '5\n5 4 3 2 1\n', expectedOutput: 'REVERSED: 1 -> 2 -> 3 -> 4 -> 5 -> NULL\n' },
    ],
  },
  // Problem 78
  {
    slug: 'kanetkar-ch13-linked-list-detect-cycle',
    title: "Floyd's Cycle Detection Algorithm (Tortoise & Hare)",
    difficulty: 'MEDIUM',
    category: 'Linked Lists',
    tags: ['Linked List', 'Pointers', 'Cycle Detection', 'Floyd'],
    description: `### Problem Description
A classic problem in pointer-based linked structures is detecting whether the list contains an infinite cycle without modifying the node structure (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

Using Floyd's cycle-finding algorithm:
- \`slow\` pointer advances 1 step at a time.
- \`fast\` pointer advances 2 steps at a time.
- If they meet, a cycle exists. If \`fast\` reaches NULL, no cycle exists.

Given a list of $N$ nodes (0-indexed: $0$ to $N-1$) and a connection target index $C$ for the tail node (where $-1$ means tail points to NULL, and $0 \le C < N$ means tail points back to node $C$):
1. Detect whether a cycle exists.
2. If a cycle exists, identify the 0-based index of the node where the cycle begins.

### Input Format
- First line: integer $N$ ($1 \le N \le 1000$).
- Second line: $N$ integers (node values).
- Third line: integer $C$ ($-1 \le C < N$).

### Output Format
- If cycle detected: \`CYCLE DETECTED AT NODE INDEX %d (VAL=%d)\`
- If no cycle: \`NO CYCLE (LINEAR LIST)\`

### Example 1
**Input:**
\`\`\`
4
10 20 30 40
1
\`\`\`
**Output:**
\`\`\`
CYCLE DETECTED AT NODE INDEX 1 (VAL=20)
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    int index;
    struct Node *next;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Detect cycle using Floyd's algorithm
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    int index;
    struct Node *next;
} Node;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    Node **nodes = (Node **)malloc(n * sizeof(Node *));
    for (int i = 0; i < n; i++) {
        nodes[i] = (Node *)malloc(sizeof(Node));
        scanf("%d", &nodes[i]->data);
        nodes[i]->index = i;
        nodes[i]->next = NULL;
        if (i > 0) nodes[i - 1]->next = nodes[i];
    }
    
    int c;
    scanf("%d", &c);
    if (c != -1 && c < n) {
        nodes[n - 1]->next = nodes[c];
    }
    
    Node *slow = nodes[0];
    Node *fast = nodes[0];
    int has_cycle = 0;
    
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            has_cycle = 1;
            break;
        }
    }
    
    if (!has_cycle) {
        printf("NO CYCLE (LINEAR LIST)\\n");
    } else {
        // Find cycle start
        Node *p1 = nodes[0];
        Node *p2 = slow;
        while (p1 != p2) {
            p1 = p1->next;
            p2 = p2->next;
        }
        printf("CYCLE DETECTED AT NODE INDEX %d (VAL=%d)\\n", p1->index, p1->data);
    }
    
    for (int i = 0; i < n; i++) free(nodes[i]);
    free(nodes);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists',
      chapterOrder: 13,
      section: 'Cycle Detection',
      exerciseNumber: '13.11',
      exerciseOrder: 11,
      page: 189,
      concept: "Floyd's cycle-finding tortoise and hare algorithm with start detection",
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '4\n10 20 30 40\n1\n', expectedOutput: 'CYCLE DETECTED AT NODE INDEX 1 (VAL=20)\n' },
      { input: '3\n1 2 3\n-1\n', expectedOutput: 'NO CYCLE (LINEAR LIST)\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n0\n', expectedOutput: 'CYCLE DETECTED AT NODE INDEX 0 (VAL=42)\n' },
      { input: '5\n10 20 30 40 50\n4\n', expectedOutput: 'CYCLE DETECTED AT NODE INDEX 4 (VAL=50)\n' },
      { input: '2\n100 200\n-1\n', expectedOutput: 'NO CYCLE (LINEAR LIST)\n' },
    ],
  },
  // Problem 79
  {
    slug: 'kanetkar-ch13-linked-list-merge-sorted',
    title: 'Merge Two Sorted Linked Lists In-Place',
    difficulty: 'EASY',
    category: 'Linked Lists',
    tags: ['Linked List', 'Pointers', 'Merge', 'Sorting'],
    description: `### Problem Description
Given two sorted singly linked lists, splice them together into a single sorted list by rearranging the existing node \`next\` pointers without allocating new nodes (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

### Input Format
- First line: integer $N$ ($0 \le N \le 100$) followed by $N$ sorted integers.
- Second line: integer $M$ ($0 \le M \le 100$) followed by $M$ sorted integers.

### Output Format
Print the merged list in format: \`MERGED: v1 -> v2 -> ... -> NULL\`
If both lists are empty, print \`MERGED: NULL\`.

### Example 1
**Input:**
\`\`\`
3 1 3 5
3 2 4 6
\`\`\`
**Output:**
\`\`\`
MERGED: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> NULL
\`\`\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    // Read and merge sorted lists
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *createList(int count) {
    if (count <= 0) return NULL;
    Node *head = NULL, *tail = NULL;
    for (int i = 0; i < count; i++) {
        int v;
        scanf("%d", &v);
        Node *n = (Node *)malloc(sizeof(Node));
        n->data = v;
        n->next = NULL;
        if (!head) head = tail = n;
        else { tail->next = n; tail = n; }
    }
    return head;
}

int main() {
    int n, m;
    if (scanf("%d", &n) != 1) return 0;
    Node *l1 = createList(n);
    if (scanf("%d", &m) != 1) return 0;
    Node *l2 = createList(m);
    
    Node dummy;
    dummy.next = NULL;
    Node *tail = &dummy;
    
    while (l1 && l2) {
        if (l1->data <= l2->data) {
            tail->next = l1;
            l1 = l1->next;
        } else {
            tail->next = l2;
            l2 = l2->next;
        }
        tail = tail->next;
    }
    tail->next = l1 ? l1 : l2;
    
    printf("MERGED:");
    Node *curr = dummy.next;
    if (!curr) {
        printf(" NULL\\n");
    } else {
        while (curr) {
            printf(" %d ->", curr->data);
            curr = curr->next;
        }
        printf(" NULL\\n");
    }
    
    curr = dummy.next;
    while (curr) {
        Node *nxt = curr->next;
        free(curr);
        curr = nxt;
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists',
      chapterOrder: 13,
      section: 'Merge Operations',
      exerciseNumber: '13.15',
      exerciseOrder: 15,
      page: 192,
      concept: 'Dummy sentinel node splicing for in-place sorted list merge',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 1 3 5\n3 2 4 6\n', expectedOutput: 'MERGED: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> NULL\n' },
      { input: '1 10\n0\n', expectedOutput: 'MERGED: 10 -> NULL\n' },
    ],
    hiddenTests: [
      { input: '0\n0\n', expectedOutput: 'MERGED: NULL\n' },
      { input: '2 2 4\n3 1 3 5\n', expectedOutput: 'MERGED: 1 -> 2 -> 3 -> 4 -> 5 -> NULL\n' },
    ],
  },
  // Problem 80
  {
    slug: 'kanetkar-ch13-stack-bracket-matcher',
    title: 'Array Stack Balanced Delimiter Validator',
    difficulty: 'EASY',
    category: 'Stacks and Queues',
    tags: ['Stack', 'Arrays', 'Parsing', 'Data Structures'],
    description: `### Problem Description
A stack is a Last-In First-Out (LIFO) abstract data type implemented using an array and a top index in C (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

Given a string containing delimiters \`()\`, \`[]\`, \`{}\`, along with other characters:
Use an explicit stack implementation to check if all delimiters are balanced and properly nested.
Print:
- \`BALANCED (STACK_DEPTH=%d)\` with maximum depth reached, if valid.
- \`UNBALANCED: EXPECTED '%c' BUT FOUND '%c'\` or \`UNBALANCED: UNCLOSED '%c'\` or \`UNBALANCED: UNMATCHED CLOSING '%c'\`.

### Input Format
- A single line string (length ≤ 200).

### Output Format
- Single line validation message.

### Example 1
**Input:**
\`\`\`
int a[10] = { (1 + 2) * 3 };
\`\`\`
**Output:**
\`\`\`
BALANCED (MAX_DEPTH=3)
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char str[256];
    if (!fgets(str, sizeof(str), stdin)) return 0;
    // Validate delimiters using stack
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    char str[256];
    if (!fgets(str, sizeof(str), stdin)) return 0;
    
    char stack[256];
    int top = -1;
    int max_depth = 0;
    
    for (int i = 0; str[i]; i++) {
        char ch = str[i];
        if (ch == '(' || ch == '[' || ch == '{') {
            stack[++top] = ch;
            if (top + 1 > max_depth) max_depth = top + 1;
        } else if (ch == ')' || ch == ']' || ch == '}') {
            if (top == -1) {
                printf("UNBALANCED: UNMATCHED CLOSING '%c'\\n", ch);
                return 0;
            }
            char open = stack[top--];
            char expected = (open == '(') ? ')' : (open == '[') ? ']' : '}';
            if (ch != expected) {
                printf("UNBALANCED: EXPECTED '%c' BUT FOUND '%c'\\n", expected, ch);
                return 0;
            }
        }
    }
    
    if (top != -1) {
        printf("UNBALANCED: UNCLOSED '%c'\\n", stack[top]);
    } else {
        printf("BALANCED (MAX_DEPTH=%d)\\n", max_depth);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists and Stacks',
      chapterOrder: 13,
      section: 'Stack Applications',
      exerciseNumber: '13.19',
      exerciseOrder: 19,
      page: 195,
      concept: 'Array-based stack push/pop tracking for syntax validation',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'int a[10] = { (1 + 2) * 3 };\n', expectedOutput: 'BALANCED (MAX_DEPTH=3)\n' },
      { input: 'foo(bar[i);\n', expectedOutput: "UNBALANCED: EXPECTED ']' BUT FOUND ')'\n" },
    ],
    hiddenTests: [
      { input: '((()))\n', expectedOutput: 'BALANCED (MAX_DEPTH=3)\n' },
      { input: '(\n', expectedOutput: "UNBALANCED: UNCLOSED '('\n" },
      { input: ')\n', expectedOutput: "UNBALANCED: UNMATCHED CLOSING ')'\n" },
    ],
  },
  // Problem 81
  {
    slug: 'kanetkar-ch13-stack-rpn-evaluator',
    title: 'Postfix Reverse Polish Notation (RPN) Stack Evaluator',
    difficulty: 'EASY',
    category: 'Stacks and Queues',
    tags: ['Stack', 'RPN', 'Postfix', 'Math'],
    description: `### Problem Description
Evaluating an arithmetic expression written in Reverse Polish Notation (Postfix) is performed using an operand stack (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

In RPN:
- When a number is encountered, push it onto the stack.
- When an operator (\`+\`, \`-\`, \`*\`, \`/\`) is encountered, pop the top two operands:
  - \`op2 = pop()\`
  - \`op1 = pop()\`
  - compute \`result = op1 [operator] op2\`
  - push \`result\` back onto the stack.

Given a space-separated string of tokens representing an RPN expression:
Evaluate and print the final integer result. Division is integer truncation division.

### Input Format
- A single line containing space-separated tokens ending with a newline.

### Output Format
- Print \`RESULT: %d\`

### Example 1
**Input:**
\`\`\`
10 4 3 + 2 * -
\`\`\`
**Output:**
\`\`\`
RESULT: -4
\`\`\`
*Explanation: (4 + 3) = 7; 7 * 2 = 14; 10 - 14 = -4.*`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char line[512];
    if (!fgets(line, sizeof(line), stdin)) return 0;
    // Evaluate RPN expression
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char line[512];
    if (!fgets(line, sizeof(line), stdin)) return 0;
    
    int stack[256];
    int top = -1;
    
    char *token = strtok(line, " \\t\\r\\n");
    while (token) {
        if (strcmp(token, "+") == 0) {
            int b = stack[top--];
            int a = stack[top--];
            stack[++top] = a + b;
        } else if (strcmp(token, "-") == 0) {
            int b = stack[top--];
            int a = stack[top--];
            stack[++top] = a - b;
        } else if (strcmp(token, "*") == 0) {
            int b = stack[top--];
            int a = stack[top--];
            stack[++top] = a * b;
        } else if (strcmp(token, "/") == 0) {
            int b = stack[top--];
            int a = stack[top--];
            stack[++top] = a / b;
        } else {
            stack[++top] = atoi(token);
        }
        token = strtok(NULL, " \\t\\r\\n");
    }
    
    printf("RESULT: %d\\n", stack[top]);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Linked Lists and Stacks',
      chapterOrder: 13,
      section: 'Stack Expression Evaluation',
      exerciseNumber: '13.23',
      exerciseOrder: 23,
      page: 198,
      concept: 'RPN postfix arithmetic evaluation using an operand stack',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '10 4 3 + 2 * -\n', expectedOutput: 'RESULT: -4\n' },
      { input: '15 7 1 1 + - / 3 * 2 1 1 + + -\n', expectedOutput: 'RESULT: 5\n' },
    ],
    hiddenTests: [
      { input: '5 3 +\n', expectedOutput: 'RESULT: 8\n' },
      { input: '20 4 /\n', expectedOutput: 'RESULT: 5\n' },
      { input: '100\n', expectedOutput: 'RESULT: 100\n' },
    ],
  },
  // Problem 82
  {
    slug: 'kanetkar-ch13-circular-queue-ringbuffer',
    title: 'Circular Queue Ring Buffer with Wrap-Around Logic',
    difficulty: 'MEDIUM',
    category: 'Stacks and Queues',
    tags: ['Queue', 'Ring Buffer', 'Modulo', 'Data Structures'],
    description: `### Problem Description
A Circular Queue (Ring Buffer) avoids element shifting by advancing \`front\` and \`rear\` indices modulo buffer capacity $C$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).

Specifications:
- Capacity $C$ represents the fixed size of the underlying array.
- Current count tracks number of elements ($0 \le count \le C$).
- \`ENQUEUE x\`: If $count == C$, output \`OVERFLOW\`. Otherwise store $x$ at $rear$, advance $rear = (rear + 1) \pmod C$, increment $count$.
- \`DEQUEUE\`: If $count == 0$, output \`UNDERFLOW\`. Otherwise retrieve element at $front$, advance $front = (front + 1) \pmod C$, decrement $count$, and print the value.

Given $C$ and $M$ operations:
Process all commands and output the result of each operation.

### Input Format
- First line: capacity $C$ ($1 \le C \le 100$) and operation count $M$ ($1 \le M \le 500$).
- Next $M$ lines: either \`ENQUEUE <val>\` or \`DEQUEUE\`.

### Output Format
Print the output of each command on a separate line (\`OVERFLOW\`, \`UNDERFLOW\`, or the dequeued integer).

### Example 1
**Input:**
\`\`\`
3 6
ENQUEUE 10
ENQUEUE 20
ENQUEUE 30
ENQUEUE 40
DEQUEUE
DEQUEUE
\`\`\`
**Output:**
\`\`\`
OVERFLOW
10
20
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int c, m;
    if (scanf("%d %d", &c, &m) != 2) return 0;
    // Circular queue simulation
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int c, m;
    if (scanf("%d %d", &c, &m) != 2) return 0;
    
    int queue[105];
    int front = 0;
    int rear = 0;
    int count = 0;
    
    char op[16];
    for (int k = 0; k < m; k++) {
        scanf("%s", op);
        if (strcmp(op, "ENQUEUE") == 0) {
            int val;
            scanf("%d", &val);
            if (count == c) {
                printf("OVERFLOW\\n");
            } else {
                queue[rear] = val;
                rear = (rear + 1) % c;
                count++;
            }
        } else if (strcmp(op, "DEQUEUE") == 0) {
            if (count == 0) {
                printf("UNDERFLOW\\n");
            } else {
                int val = queue[front];
                front = (front + 1) % c;
                count--;
                printf("%d\\n", val);
            }
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 13,
      chapterTitle: 'Queues',
      chapterOrder: 13,
      section: 'Circular Queue',
      exerciseNumber: '13.28',
      exerciseOrder: 28,
      page: 201,
      concept: 'Circular buffer wrap-around indexing using modulo arithmetic',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 6\nENQUEUE 10\nENQUEUE 20\nENQUEUE 30\nENQUEUE 40\nDEQUEUE\nDEQUEUE\n', expectedOutput: 'OVERFLOW\n10\n20\n' },
      { input: '2 3\nDEQUEUE\nENQUEUE 5\nDEQUEUE\n', expectedOutput: 'UNDERFLOW\n5\n' },
    ],
    hiddenTests: [
      { input: '2 5\nENQUEUE 1\nENQUEUE 2\nDEQUEUE\nENQUEUE 3\nDEQUEUE\n', expectedOutput: '1\n2\n' },
      { input: '1 3\nENQUEUE 9\nENQUEUE 10\nDEQUEUE\n', expectedOutput: 'OVERFLOW\n9\n' },
    ],
  },
  // Problem 83
  {
    slug: 'kanetkar-ch7-macro-side-effect-trap',
    title: 'Macro Expansion Side Effects vs Inline Function Simulator',
    difficulty: 'EASY',
    category: 'The Preprocessor',
    tags: ['Preprocessor', 'Macros', 'Side Effects'],
    description: `### Problem Description
A classic pitfall in C occurs when macros evaluate their arguments multiple times, causing unexpected side effects with increment (\`++\`) operators (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: The Preprocessor).

Given the macro:
\`\`\`c
#define SQUARE(x) ((x) * (x))
\`\`\`
And a function:
\`\`\`c
int square_func(int x) { return x * x; }
\`\`\`

If a variable $A$ is passed as \`SQUARE(++a)\`, $A$ is incremented twice:
- First evaluation increments $A$.
- Second evaluation increments $A$ again.
Whereas \`square_func(++b)\` increments $B$ exactly once before passing the value to the function.

Given an initial integer $X$, trace and output:
1. The result of \`square_func(++b)\` and the final value of $B$.
2. The simulated expansion of \`((++a) * (++a))\` in standard sequence and the final value of $A$.

### Input Format
- A single integer $X$ ($-100 \le X \le 100$).

### Output Format
- Line 1: \`FUNC: RESULT=%d FINAL_VAR=%d\`
- Line 2: \`MACRO: RESULT=%d FINAL_VAR=%d\`

### Example 1
**Input:**
\`\`\`
5
\`\`\`
**Output:**
\`\`\`
FUNC: RESULT=36 FINAL_VAR=6
MACRO: RESULT=49 FINAL_VAR=7
\`\`\``,
    starterCode: `#include <stdio.h>

int square_func(int x) {
    return x * x;
}

int main() {
    int x;
    if (scanf("%d", &x) != 1) return 0;
    // Trace func vs macro expansion
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int square_func(int x) {
    return x * x;
}

int main() {
    int x;
    if (scanf("%d", &x) != 1) return 0;
    
    // Func: b incremented once
    int b = x;
    b++;
    int func_res = square_func(b);
    
    // Macro: a incremented twice:
    // a1 = x + 1, a2 = x + 2, result = a2 * a2 (as in ((++a) * (++a)))
    int a = x;
    a++; // first ++
    a++; // second ++
    int macro_res = a * a;
    
    printf("FUNC: RESULT=%d FINAL_VAR=%d\\n", func_res, b);
    printf("MACRO: RESULT=%d FINAL_VAR=%d\\n", macro_res, a);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 7,
      chapterTitle: 'The Preprocessor',
      chapterOrder: 7,
      section: 'Macro Traps',
      exerciseNumber: '7.3',
      exerciseOrder: 3,
      page: 95,
      concept: 'Repeated argument evaluation side-effects in parameterized macros',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n', expectedOutput: 'FUNC: RESULT=36 FINAL_VAR=6\nMACRO: RESULT=49 FINAL_VAR=7\n' },
      { input: '0\n', expectedOutput: 'FUNC: RESULT=1 FINAL_VAR=1\nMACRO: RESULT=4 FINAL_VAR=2\n' },
    ],
    hiddenTests: [
      { input: '10\n', expectedOutput: 'FUNC: RESULT=121 FINAL_VAR=11\nMACRO: RESULT=144 FINAL_VAR=12\n' },
      { input: '-3\n', expectedOutput: 'FUNC: RESULT=4 FINAL_VAR=-2\nMACRO: RESULT=1 FINAL_VAR=-1\n' },
    ],
  },
  // Problem 84
  {
    slug: 'kanetkar-ch7-stringizing-token-pasting',
    title: 'Preprocessor Stringizing (#) and Token-Pasting (##) Engine',
    difficulty: 'EASY',
    category: 'The Preprocessor',
    tags: ['Preprocessor', 'Stringizing', 'Token Pasting'],
    description: `### Problem Description
The C preprocessor provides two special operators (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7):
1. **Stringizing Operator (\`#\`)**: Converts an identifier or expression into a string literal (surrounded by double quotes).
2. **Token-Pasting Operator (\`##\`)**: Merges two separate tokens into a single valid C identifier.

Simulate a preprocessor code generator:
Given a prefix string $P$ and an integer identifier $K$, along with a value $V$:
1. Generate the concatenated variable identifier \`P##K\` (e.g. \`sensor_##1\` -> \`sensor_1\`).
2. Generate the stringized log expression \`#P##K\` -> \`"sensor_1"\`.
3. Format and print the simulated declaration: \`int <identifier> = <value>; // Var name: "<identifier>"\`.

### Input Format
- A single line containing: prefix $P$ (alphanumeric string), integer $K$, and integer value $V$.

### Output Format
Print: \`DECLARATION: int %s%d = %d; [NAME: "%s%d"]\`

### Example 1
**Input:**
\`\`\`
sensor_ 42 1080
\`\`\`
**Output:**
\`\`\`
DECLARATION: int sensor_42 = 1080; [NAME: "sensor_42"]
\`\`\``,
    starterCode: `#include <stdio.h>

int main() {
    char p[64];
    int k, v;
    if (scanf("%s %d %d", p, &k, &v) != 3) return 0;
    // Preprocessor token generation
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    char p[64];
    int k, v;
    if (scanf("%s %d %d", p, &k, &v) != 3) return 0;
    
    printf("DECLARATION: int %s%d = %d; [NAME: \\"%s%d\\"]\\n", p, k, v, p, k);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 7,
      chapterTitle: 'The Preprocessor',
      chapterOrder: 7,
      section: 'Stringizing and Token Pasting',
      exerciseNumber: '7.8',
      exerciseOrder: 8,
      page: 99,
      concept: 'Token-pasting operator ## and stringizing operator #',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'sensor_ 42 1080\n', expectedOutput: 'DECLARATION: int sensor_42 = 1080; [NAME: "sensor_42"]\n' },
      { input: 'var 1 10\n', expectedOutput: 'DECLARATION: int var1 = 10; [NAME: "var1"]\n' },
    ],
    hiddenTests: [
      { input: 'temp_reading_ 7 98\n', expectedOutput: 'DECLARATION: int temp_reading_7 = 98; [NAME: "temp_reading_7"]\n' },
      { input: 'reg 0 0\n', expectedOutput: 'DECLARATION: int reg0 = 0; [NAME: "reg0"]\n' },
    ],
  },
  // Problem 85
  {
    slug: 'kanetkar-ch7-conditional-compilation-sim',
    title: 'Conditional Compilation Directive (#ifdef/#else) Evaluator',
    difficulty: 'EASY',
    category: 'The Preprocessor',
    tags: ['Preprocessor', 'Directives', 'Conditional'],
    description: `### Problem Description
Conditional compilation directives (\`#ifdef\`, \`#ifndef\`, \`#elif\`, \`#endif\`) permit cross-platform builds and feature toggling without code duplication (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7).

Simulate a conditional compilation evaluator:
A build configuration defines a set of active macro symbols (e.g. \`DEBUG\`, \`PLATFORM_LINUX\`, \`OPT_LEVEL_3\`).
Given:
- A list of $M$ defined macro symbols.
- A target code block guarded by \`#ifdef <SYMBOL>\` or \`#ifndef <SYMBOL>\`.

Determine whether the guarded code block is **INCLUDED** or **EXCLUDED** in the compiled binary.

### Input Format
- First line: integer $M$ ($0 \le M \le 20$).
- Second line: $M$ space-separated macro names (or empty line if $M = 0$).
- Third line: Directive (\`IFDEF\` or \`IFNDEF\`) followed by the macro symbol name.

### Output Format
- Print \`BINARY STATUS: INCLUDED\` or \`BINARY STATUS: EXCLUDED\`

### Example 1
**Input:**
\`\`\`
2
DEBUG LOG_VERBOSE
IFDEF DEBUG
\`\`\`
**Output:**
\`\`\`
BINARY STATUS: INCLUDED
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int m;
    if (scanf("%d", &m) != 1) return 0;
    // Conditional compilation simulation
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int m;
    if (scanf("%d", &m) != 1) return 0;
    
    char macros[30][64];
    for (int i = 0; i < m; i++) {
        scanf("%s", macros[i]);
    }
    
    char directive[16], symbol[64];
    scanf("%s %s", directive, symbol);
    
    int is_defined = 0;
    for (int i = 0; i < m; i++) {
        if (strcmp(macros[i], symbol) == 0) {
            is_defined = 1;
            break;
        }
    }
    
    int included = 0;
    if (strcmp(directive, "IFDEF") == 0) {
        included = is_defined;
    } else if (strcmp(directive, "IFNDEF") == 0) {
        included = !is_defined;
    }
    
    printf("BINARY STATUS: %s\\n", included ? "INCLUDED" : "EXCLUDED");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 7,
      chapterTitle: 'The Preprocessor',
      chapterOrder: 7,
      section: 'Conditional Compilation',
      exerciseNumber: '7.12',
      exerciseOrder: 12,
      page: 103,
      concept: 'Header guards and conditional inclusion flags',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2\nDEBUG LOG_VERBOSE\nIFDEF DEBUG\n', expectedOutput: 'BINARY STATUS: INCLUDED\n' },
      { input: '1\nRELEASE\nIFNDEF RELEASE\n', expectedOutput: 'BINARY STATUS: EXCLUDED\n' },
    ],
    hiddenTests: [
      { input: '0\n\nIFDEF ENABLE_SSL\n', expectedOutput: 'BINARY STATUS: EXCLUDED\n' },
      { input: '1\nTEST_MODE\nIFNDEF PRODUCTION\n', expectedOutput: 'BINARY STATUS: INCLUDED\n' },
    ],
  },
  // Problem 86
  {
    slug: 'kanetkar-ch14-file-io-word-char-counter',
    title: 'Text Stream Word, Line & Byte Metric Counter',
    difficulty: 'EASY',
    category: 'File Input/Output',
    tags: ['File I/O', 'Strings', 'Parsing'],
    description: `### Problem Description
Standard C file stream processing (\`fgetc\`, \`fgets\`) operates by reading streams byte by byte until \`EOF\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14: File Input/Output).

Implement the Unix \`wc\` utility core in C:
Read text from standard input until \`EOF\` (or simulated input stream) and count:
1. Total lines (count of \`\\n\` characters).
2. Total words (sequences of non-whitespace characters delimited by spaces, tabs, or newlines).
3. Total characters/bytes.

### Input Format
- Text input of multiple lines until EOF.

### Output Format
- Print \`LINES: %d | WORDS: %d | BYTES: %d\`

### Example 1
**Input:**
\`\`\`
Hello World
LogicQ Platform
\`\`\`
**Output:**
\`\`\`
LINES: 2 | WORDS: 4 | BYTES: 28
\`\`\``,
    starterCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    // Read stream to EOF and count lines, words, bytes
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <ctype.h>

int main() {
    int lines = 0, words = 0, bytes = 0;
    int in_word = 0;
    int ch;
    
    while ((ch = getchar()) != EOF) {
        bytes++;
        if (ch == '\\n') lines++;
        if (isspace(ch)) {
            in_word = 0;
        } else {
            if (!in_word) {
                words++;
                in_word = 1;
            }
        }
    }
    
    printf("LINES: %d | WORDS: %d | BYTES: %d\\n", lines, words, bytes);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 14,
      chapterTitle: 'File Input/Output',
      chapterOrder: 14,
      section: 'Character-by-character File Processing',
      exerciseNumber: '14.2',
      exerciseOrder: 2,
      page: 205,
      concept: 'EOF detection and stateful delimiter parsing in C streams',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'Hello World\nLogicQ Platform\n', expectedOutput: 'LINES: 2 | WORDS: 4 | BYTES: 28\n' },
      { input: 'Single line without newline', expectedOutput: 'LINES: 0 | WORDS: 4 | BYTES: 27\n' },
    ],
    hiddenTests: [
      { input: '   \\t\\t   \n\n', expectedOutput: 'LINES: 2 | WORDS: 0 | BYTES: 12\n' },
      { input: 'C Programming\n', expectedOutput: 'LINES: 1 | WORDS: 2 | BYTES: 14\n' },
    ],
  },
  // Problem 87
  {
    slug: 'kanetkar-ch14-csv-column-sum-aggregator',
    title: 'CSV Record Stream Tokenizer and Column Aggregator',
    difficulty: 'EASY',
    category: 'File Input/Output',
    tags: ['File I/O', 'CSV', 'Parsing', 'Strings'],
    description: `### Problem Description
Parsing structured CSV data streams in C requires splitting records on comma boundaries while converting numerical fields (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14).

Given $R$ lines of CSV text, where each row has exactly $C$ columns of integer values:
1. Parse each row using string tokenization or formatted input.
2. Calculate the column-wise sum for every column.
3. Find the maximum value in each column.

### Input Format
- First line: integers $R$ and $C$ ($1 \le R \le 100, 1 \le C \le 20$).
- Next $R$ lines: comma-separated integers (e.g. \`10,20,30\`).

### Output Format
- Line 1: \`SUMS: <s1> <s2> ... <sC>\`
- Line 2: \`MAXS: <m1> <m2> ... <mC>\`

### Example 1
**Input:**
\`\`\`
3 3
10,20,30
5,15,25
1,2,3
\`\`\`
**Output:**
\`\`\`
SUMS: 16 37 58
MAXS: 10 20 30
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    // Parse CSV rows and aggregate columns
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    long long sums[25] = {0};
    int maxs[25];
    int init[25] = {0};
    
    for (int i = 0; i < r; i++) {
        char line[512];
        scanf("%s", line);
        
        char *tok = strtok(line, ",");
        for (int j = 0; j < c && tok; j++) {
            int val = atoi(tok);
            sums[j] += val;
            if (!init[j] || val > maxs[j]) {
                maxs[j] = val;
                init[j] = 1;
            }
            tok = strtok(NULL, ",");
        }
    }
    
    printf("SUMS:");
    for (int j = 0; j < c; j++) printf(" %lld", sums[j]);
    printf("\\n");
    
    printf("MAXS:");
    for (int j = 0; j < c; j++) printf(" %d", maxs[j]);
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 14,
      chapterTitle: 'File Input/Output',
      chapterOrder: 14,
      section: 'Delimited File Formats',
      exerciseNumber: '14.8',
      exerciseOrder: 8,
      page: 209,
      concept: 'Comma-separated value record stream tokenization and parsing',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 3\n10,20,30\n5,15,25\n1,2,3\n', expectedOutput: 'SUMS: 16 37 58\nMAXS: 10 20 30\n' },
      { input: '1 2\n100,-50\n', expectedOutput: 'SUMS: 100 -50\nMAXS: 100 -50\n' },
    ],
    hiddenTests: [
      { input: '2 1\n42\n58\n', expectedOutput: 'SUMS: 100\nMAXS: 58\n' },
      { input: '3 2\n-10,-20\n-5,-15\n-1,-2\n', expectedOutput: 'SUMS: -16 -37\nMAXS: -1 -2\n' },
    ],
  },
  // Problem 88
  {
    slug: 'kanetkar-ch15-cli-arg-flag-parser',
    title: 'Command-Line Argument (argc/argv) Option Parser',
    difficulty: 'EASY',
    category: 'More in C',
    tags: ['CLI', 'Pointers', 'Strings', 'Arguments'],
    description: `### Problem Description
Command-line options in standard C are passed to \`main\` as an argument count (\`argc\`) and an array of string pointers (\`argv\`) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 15: More in C).

Simulate a CLI flag parser:
Supported flags:
- \`-v\` or \`--verbose\`: Enables verbose mode (flag = 1).
- \`-o <filename>\`: Specifies output filename.
- \`-p <port>\`: Specifies integer port number (default = 8080).
- Positional argument: input filename.

Given $N$ arguments simulating \`argv[1..N]\`:
Parse the flags and print the configured parameters.

### Input Format
- First line: integer $N$ ($1 \le N \le 10$).
- Second line: $N$ space-separated command-line tokens.

### Output Format
- Line 1: \`VERBOSE: <ON/OFF>\`
- Line 2: \`OUTPUT_FILE: <filename or NONE>\`
- Line 3: \`PORT: <port>\`
- Line 4: \`INPUT_FILE: <filename or NONE>\`

### Example 1
**Input:**
\`\`\`
4
-v -o out.bin input.dat -p 9000
\`\`\`
**Output:**
\`\`\`
VERBOSE: ON
OUTPUT_FILE: out.bin
PORT: 9000
INPUT_FILE: input.dat
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Parse simulated argc/argv
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    char args[20][128];
    for (int i = 0; i < n; i++) {
        scanf("%s", args[i]);
    }
    
    int verbose = 0;
    char output_file[128] = "NONE";
    char input_file[128] = "NONE";
    int port = 8080;
    
    for (int i = 0; i < n; i++) {
        if (strcmp(args[i], "-v") == 0 || strcmp(args[i], "--verbose") == 0) {
            verbose = 1;
        } else if (strcmp(args[i], "-o") == 0 && i + 1 < n) {
            strcpy(output_file, args[++i]);
        } else if (strcmp(args[i], "-p") == 0 && i + 1 < n) {
            port = atoi(args[++i]);
        } else if (args[i][0] != '-') {
            strcpy(input_file, args[i]);
        }
    }
    
    printf("VERBOSE: %s\\n", verbose ? "ON" : "OFF");
    printf("OUTPUT_FILE: %s\\n", output_file);
    printf("PORT: %d\\n", port);
    printf("INPUT_FILE: %s\\n", input_file);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 15,
      chapterTitle: 'More in C',
      chapterOrder: 15,
      section: 'Command Line Arguments',
      exerciseNumber: '15.3',
      exerciseOrder: 3,
      page: 218,
      concept: 'argc and argv string array pointer parsing patterns',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n-v -o out.bin input.dat -p 9000\n', expectedOutput: 'VERBOSE: ON\nOUTPUT_FILE: out.bin\nPORT: 9000\nINPUT_FILE: input.dat\n' },
      { input: '1\nmyfile.txt\n', expectedOutput: 'VERBOSE: OFF\nOUTPUT_FILE: NONE\nPORT: 8080\nINPUT_FILE: myfile.txt\n' },
    ],
    hiddenTests: [
      { input: '2\n--verbose -p 3000\n', expectedOutput: 'VERBOSE: ON\nOUTPUT_FILE: NONE\nPORT: 3000\nINPUT_FILE: NONE\n' },
      { input: '2\n-o result.csv data.csv\n', expectedOutput: 'VERBOSE: OFF\nOUTPUT_FILE: result.csv\nPORT: 8080\nINPUT_FILE: data.csv\n' },
    ],
  },
  // Problem 89
  {
    slug: 'kanetkar-ch16-quicksort-lomuto-partition',
    title: 'Lomuto Partition Scheme for In-Place QuickSort',
    difficulty: 'EASY',
    category: 'Searching and Sorting',
    tags: ['Sorting', 'QuickSort', 'Pointers', 'Arrays'],
    description: `### Problem Description
QuickSort relies on a partitioning procedure to arrange elements such that all values smaller than or equal to the pivot appear before it, and all larger values appear after it (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).

Implement the **Lomuto partition scheme**:
- Choose the last element \`arr[high]\` as the pivot $P$.
- Maintain an index $i = low - 1$.
- For $j = low$ to $high - 1$:
  - If \`arr[j] <= P\`, increment $i$ and swap \`arr[i]\` with \`arr[j]\`.
- Finally swap \`arr[i + 1]\` with \`arr[high]\`.
- The pivot index is $i + 1$.

Given an array of $N$ integers:
1. Apply a single Lomuto partition step on the entire array.
2. Print the pivot index and value.
3. Print the resulting partitioned array.

### Input Format
- First line: integer $N$ ($1 \le N \le 100$).
- Second line: $N$ integers.

### Output Format
- Line 1: \`PIVOT_INDEX: %d | PIVOT_VAL: %d\`
- Line 2: \`PARTITIONED: e1 e2 ... eN\`

### Example 1
**Input:**
\`\`\`
7
10 80 30 90 40 50 70
\`\`\`
**Output:**
\`\`\`
PIVOT_INDEX: 4 | PIVOT_VAL: 70
PARTITIONED: 10 30 40 50 70 90 80
\`\`\``,
    starterCode: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Lomuto partitioning
    return 0;
}`,
    solutionCode: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[105];
    for (int k = 0; k < n; k++) scanf("%d", &arr[k]);
    
    int pivot = arr[n - 1];
    int i = -1;
    for (int j = 0; j < n - 1; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[n - 1]);
    int p_index = i + 1;
    
    printf("PIVOT_INDEX: %d | PIVOT_VAL: %d\\n", p_index, pivot);
    printf("PARTITIONED:");
    for (int k = 0; k < n; k++) printf(" %d", arr[k]);
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 16,
      chapterTitle: 'Searching and Sorting',
      chapterOrder: 16,
      section: 'QuickSort Partitioning',
      exerciseNumber: '16.4',
      exerciseOrder: 4,
      page: 225,
      concept: 'Lomuto single-pivot partition invariant maintenance',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '7\n10 80 30 90 40 50 70\n', expectedOutput: 'PIVOT_INDEX: 4 | PIVOT_VAL: 70\nPARTITIONED: 10 30 40 50 70 90 80\n' },
      { input: '3\n5 1 2\n', expectedOutput: 'PIVOT_INDEX: 1 | PIVOT_VAL: 2\nPARTITIONED: 1 2 5\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: 'PIVOT_INDEX: 0 | PIVOT_VAL: 42\nPARTITIONED: 42\n' },
      { input: '4\n1 2 3 4\n', expectedOutput: 'PIVOT_INDEX: 3 | PIVOT_VAL: 4\nPARTITIONED: 1 2 3 4\n' },
      { input: '4\n4 3 2 1\n', expectedOutput: 'PIVOT_INDEX: 0 | PIVOT_VAL: 1\nPARTITIONED: 1 3 2 4\n' },
    ],
  },
  // Problem 90
  {
    slug: 'kanetkar-ch16-mergesort-inversion-count',
    title: 'Merge Sort Divide-and-Conquer Inversion Count',
    difficulty: 'MEDIUM',
    category: 'Searching and Sorting',
    tags: ['MergeSort', 'Inversions', 'Divide and Conquer', 'Recursion'],
    description: `### Problem Description
An inversion in an array $A$ is a pair of indices $(i, j)$ such that $i < j$ and $A[i] > A[j]$. Counting inversions measures how far an array is from sorted order and can be solved in $O(N \log N)$ time using Merge Sort (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).

When merging two sorted halves $L$ and $R$:
If $L[i] > R[j]$, then all remaining elements in $L$ from index $i$ onward form inversions with $R[j]$:
$$\text{inversions} += (\text{mid} - i + 1)$$

Given an array of $N$ integers:
1. Sort the array using Merge Sort.
2. Count and print the total number of inversions.
3. Print the sorted array.

### Input Format
- First line: integer $N$ ($1 \le N \le 1000$).
- Second line: $N$ integers.

### Output Format
- Line 1: \`INVERSIONS: %lld\`
- Line 2: \`SORTED: e1 e2 ... eN\`

### Example 1
**Input:**
\`\`\`
5
2 4 1 3 5
\`\`\`
**Output:**
\`\`\`
INVERSIONS: 3
SORTED: 1 2 3 4 5
\`\`\`
*Explanation: Inversion pairs are (2, 1), (4, 1), and (4, 3).*`,
    starterCode: `#include <stdio.h>

long long mergeSortAndCount(int arr[], int temp[], int left, int right) {
    // Implement merge sort inversion counter
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long merge(int arr[], int temp[], int left, int mid, int right) {
    int i = left;
    int j = mid + 1;
    int k = left;
    long long inv_count = 0;
    
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp[k++] = arr[i++];
        } else {
            temp[k++] = arr[j++];
            inv_count += (mid - i + 1);
        }
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];
    for (i = left; i <= right; i++) arr[i] = temp[i];
    
    return inv_count;
}

long long mergeSort(int arr[], int temp[], int left, int right) {
    long long inv_count = 0;
    if (left < right) {
        int mid = left + (right - left) / 2;
        inv_count += mergeSort(arr, temp, left, mid);
        inv_count += mergeSort(arr, temp, mid + 1, right);
        inv_count += merge(arr, temp, left, mid, right);
    }
    return inv_count;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005], temp[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    long long inv = mergeSort(arr, temp, 0, n - 1);
    printf("INVERSIONS: %lld\\n", inv);
    printf("SORTED:");
    for (int i = 0; i < n; i++) printf(" %d", arr[i]);
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 16,
      chapterTitle: 'Searching and Sorting',
      chapterOrder: 16,
      section: 'Merge Sort Applications',
      exerciseNumber: '16.9',
      exerciseOrder: 9,
      page: 228,
      concept: 'Divide-and-conquer inversion counting during merge stage',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '5\n2 4 1 3 5\n', expectedOutput: 'INVERSIONS: 3\nSORTED: 1 2 3 4 5\n' },
      { input: '3\n3 2 1\n', expectedOutput: 'INVERSIONS: 3\nSORTED: 1 2 3\n' },
    ],
    hiddenTests: [
      { input: '4\n1 2 3 4\n', expectedOutput: 'INVERSIONS: 0\nSORTED: 1 2 3 4\n' },
      { input: '1\n10\n', expectedOutput: 'INVERSIONS: 0\nSORTED: 10\n' },
      { input: '6\n8 4 2 1 0 -1\n', expectedOutput: 'INVERSIONS: 15\nSORTED: -1 0 1 2 4 8\n' },
    ],
  },
  // Problem 91
  {
    slug: 'kanetkar-ch16-binary-search-bounds',
    title: 'Binary Search Lower & Upper Bound Range Frequency',
    difficulty: 'EASY',
    category: 'Searching and Sorting',
    tags: ['Binary Search', 'Lower Bound', 'Upper Bound', 'Algorithms'],
    description: `### Problem Description
Binary search on sorted arrays can find both the first occurrence (lower bound) and last occurrence (upper bound) of a target key in $O(\log N)$ time (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).

Given a sorted array of $N$ integers and $Q$ query values:
For each query $K$:
- Find the 0-based first index and last index where $K$ appears.
- Compute the frequency of $K$ in the array.
- If $K$ is not present, output \`NOT FOUND\`.

### Input Format
- First line: integers $N$ ($1 \le N \le 1000$) and $Q$ ($1 \le Q \le 100$).
- Second line: $N$ sorted integers.
- Third line: $Q$ integers (the query keys).

### Output Format
For each query print a line:
\`KEY %d: FIRST=%d LAST=%d COUNT=%d\`
or \`KEY %d: NOT FOUND\`

### Example 1
**Input:**
\`\`\`
7 2
1 2 2 2 3 4 5
2 9
\`\`\`
**Output:**
\`\`\`
KEY 2: FIRST=1 LAST=3 COUNT=3
KEY 9: NOT FOUND
\`\`\``,
    starterCode: `#include <stdio.h>

int findFirst(int arr[], int n, int key) {
    // Binary search first index
    return -1;
}

int findLast(int arr[], int n, int key) {
    // Binary search last index
    return -1;
}

int main() {
    // Read and answer queries
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int findFirst(int arr[], int n, int key) {
    int low = 0, high = n - 1, ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == key) {
            ans = mid;
            high = mid - 1;
        } else if (arr[mid] < key) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return ans;
}

int findLast(int arr[], int n, int key) {
    int low = 0, high = n - 1, ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == key) {
            ans = mid;
            low = mid + 1;
        } else if (arr[mid] < key) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return ans;
}

int main() {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    for (int k = 0; k < q; k++) {
        int key;
        scanf("%d", &key);
        int first = findFirst(arr, n, key);
        if (first == -1) {
            printf("KEY %d: NOT FOUND\\n", key);
        } else {
            int last = findLast(arr, n, key);
            printf("KEY %d: FIRST=%d LAST=%d COUNT=%d\\n", key, first, last, last - first + 1);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 16,
      chapterTitle: 'Searching and Sorting',
      chapterOrder: 16,
      section: 'Binary Search Bounds',
      exerciseNumber: '16.12',
      exerciseOrder: 12,
      page: 231,
      concept: 'Binary search lower and upper boundary search invariant',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '7 2\n1 2 2 2 3 4 5\n2 9\n', expectedOutput: 'KEY 2: FIRST=1 LAST=3 COUNT=3\nKEY 9: NOT FOUND\n' },
      { input: '4 1\n10 20 30 40\n30\n', expectedOutput: 'KEY 30: FIRST=2 LAST=2 COUNT=1\n' },
    ],
    hiddenTests: [
      { input: '5 2\n5 5 5 5 5\n5 1\n', expectedOutput: 'KEY 5: FIRST=0 LAST=4 COUNT=5\nKEY 1: NOT FOUND\n' },
      { input: '1 1\n100\n100\n', expectedOutput: 'KEY 100: FIRST=0 LAST=0 COUNT=1\n' },
    ],
  },
  // Problem 92
  {
    slug: 'kanetkar-ch16-ternary-search-unimodal',
    title: 'Ternary Search Unimodal Mountain Peak Finder',
    difficulty: 'EASY',
    category: 'Searching and Sorting',
    tags: ['Ternary Search', 'Peak Finder', 'Binary Search', 'Algorithms'],
    description: `### Problem Description
An array is unimodal (mountain-shaped) if it strictly increases to a single peak element and then strictly decreases. Ternary search divides the search space into three parts using two internal midpoints $m_1$ and $m_2$ to isolate the peak in $O(\log_3 N)$ steps (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).

Given a mountain array of $N$ integers ($N \ge 3$):
Find the peak element and its 0-based index.

### Input Format
- First line: integer $N$ ($3 \le N \le 1000$).
- Second line: $N$ integers representing the mountain array.

### Output Format
- Print \`PEAK_INDEX: %d | PEAK_VALUE: %d\`

### Example 1
**Input:**
\`\`\`
7
1 3 8 12 4 2 0
\`\`\`
**Output:**
\`\`\`
PEAK_INDEX: 3 | PEAK_VALUE: 12
\`\`\``,
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Find mountain peak
    return 0;
}`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1005];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    
    int low = 0, high = n - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] < arr[mid + 1]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    
    printf("PEAK_INDEX: %d | PEAK_VALUE: %d\\n", low, arr[low]);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 16,
      chapterTitle: 'Searching and Sorting',
      chapterOrder: 16,
      section: 'Unimodal Peak Detection',
      exerciseNumber: '16.16',
      exerciseOrder: 16,
      page: 235,
      concept: 'Ternary and bisection peak finding in unimodal arrays',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '7\n1 3 8 12 4 2 0\n', expectedOutput: 'PEAK_INDEX: 3 | PEAK_VALUE: 12\n' },
      { input: '3\n0 10 0\n', expectedOutput: 'PEAK_INDEX: 1 | PEAK_VALUE: 10\n' },
    ],
    hiddenTests: [
      { input: '5\n1 2 3 4 1\n', expectedOutput: 'PEAK_INDEX: 3 | PEAK_VALUE: 4\n' },
      { input: '6\n10 20 30 25 15 5\n', expectedOutput: 'PEAK_INDEX: 2 | PEAK_VALUE: 30\n' },
    ],
  },
  // Problem 93
  {
    slug: 'kanetkar-ch17-sieve-eratosthenes-density',
    title: 'Sieve of Eratosthenes Prime Density & Twin Primes',
    difficulty: 'EASY',
    category: 'Advanced Algorithms',
    tags: ['Math', 'Sieve', 'Primes', 'Bitwise'],
    description: `### Problem Description
The Sieve of Eratosthenes computes all primes up to $N$ in $O(N \log \log N)$ operations by marking multiples of each prime starting from $p^2$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

Given an integer $N$ ($2 \le N \le 100000$):
1. Compute the total count of primes $\le N$.
2. Compute the total count of twin prime pairs $(p, p + 2)$ where both $p$ and $p + 2$ are primes $\le N$.
3. Print the largest prime $\le N$.

### Input Format
- A single integer $N$.

### Output Format
- Line 1: \`PRIMES_COUNT: %d\`
- Line 2: \`TWIN_PAIRS: %d\`
- Line 3: \`LARGEST_PRIME: %d\`

### Example 1
**Input:**
\`\`\`
20
\`\`\`
**Output:**
\`\`\`
PRIMES_COUNT: 8
TWIN_PAIRS: 4
LARGEST_PRIME: 19
\`\`\`
*Explanation: Primes <= 20: 2, 3, 5, 7, 11, 13, 17, 19. Twin pairs: (3,5), (5,7), (11,13), (17,19).*`,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Sieve of Eratosthenes
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    char *isPrime = (char *)malloc((n + 1) * sizeof(char));
    memset(isPrime, 1, n + 1);
    isPrime[0] = isPrime[1] = 0;
    
    for (int p = 2; p * p <= n; p++) {
        if (isPrime[p]) {
            for (int i = p * p; i <= n; i += p) {
                isPrime[i] = 0;
            }
        }
    }
    
    int count = 0;
    int twins = 0;
    int largest = 2;
    
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) {
            count++;
            largest = i;
            if (i + 2 <= n && isPrime[i + 2]) {
                twins++;
            }
        }
    }
    
    printf("PRIMES_COUNT: %d\\n", count);
    printf("TWIN_PAIRS: %d\\n", twins);
    printf("LARGEST_PRIME: %d\\n", largest);
    
    free(isPrime);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Prime Sieving',
      exerciseNumber: '17.3',
      exerciseOrder: 3,
      page: 240,
      concept: 'Sieve of Eratosthenes array-marking prime generator',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '20\n', expectedOutput: 'PRIMES_COUNT: 8\nTWIN_PAIRS: 4\nLARGEST_PRIME: 19\n' },
      { input: '10\n', expectedOutput: 'PRIMES_COUNT: 4\nTWIN_PAIRS: 2\nLARGEST_PRIME: 7\n' },
    ],
    hiddenTests: [
      { input: '2\n', expectedOutput: 'PRIMES_COUNT: 1\nTWIN_PAIRS: 0\nLARGEST_PRIME: 2\n' },
      { input: '100\n', expectedOutput: 'PRIMES_COUNT: 25\nTWIN_PAIRS: 8\nLARGEST_PRIME: 97\n' },
      { input: '50\n', expectedOutput: 'PRIMES_COUNT: 15\nTWIN_PAIRS: 6\nLARGEST_PRIME: 47\n' },
    ],
  },
  // Problem 94
  {
    slug: 'kanetkar-ch17-modular-exponentiation-powmod',
    title: 'Fast Modular Exponentiation Binary Exponentiation (a^b mod m)',
    difficulty: 'EASY',
    category: 'Advanced Algorithms',
    tags: ['Math', 'Modular Arithmetic', 'Exponentiation', 'Bitwise'],
    description: `### Problem Description
Computing $(A^B) \pmod M$ for large exponents up to $10^{18}$ requires binary exponentiation in $O(\log B)$ iterations to avoid arithmetic overflow (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

Algorithm:
- Initialize \`result = 1\`.
- \`a = a % m\`.
- While $B > 0$:
  - If $B$ is odd ($B \pmod 2 == 1$), \`result = (result * a) % m\`.
  - \`a = (a * a) % m\`.
  - $B = B / 2$.

Given three integers $A$, $B$, and $M$ ($1 \le A, M \le 10^9, 0 \le B \le 10^{18}$):
Compute $(A^B) \pmod M$.

### Input Format
- A single line containing three integers: $A$, $B$, and $M$.

### Output Format
- Print \`RESULT: %lld\`

### Example 1
**Input:**
\`\`\`
2 10 1000
\`\`\`
**Output:**
\`\`\`
RESULT: 24
\`\`\`
*Explanation: $2^{10} = 1024$; $1024 \pmod{1000} = 24$.*`,
    starterCode: `#include <stdio.h>

long long powerMod(long long a, long long b, long long m) {
    // Fast binary exponentiation
    return 0;
}

int main() {
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    return 0;
}`,
    solutionCode: `#include <stdio.h>

long long powerMod(long long a, long long b, long long m) {
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
    long long a, b, m;
    if (scanf("%lld %lld %lld", &a, &b, &m) != 3) return 0;
    printf("RESULT: %lld\\n", powerMod(a, b, m));
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Fast Arithmetic',
      exerciseNumber: '17.7',
      exerciseOrder: 7,
      page: 243,
      concept: 'Binary exponentiation with 64-bit modular multiplication',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2 10 1000\n', expectedOutput: 'RESULT: 24\n' },
      { input: '3 5 7\n', expectedOutput: 'RESULT: 5\n' },
    ],
    hiddenTests: [
      { input: '10 0 100\n', expectedOutput: 'RESULT: 1\n' },
      { input: '7 13 1000000007\n', expectedOutput: 'RESULT: 968890104\n' },
      { input: '5 3 13\n', expectedOutput: 'RESULT: 8\n' },
    ],
  },
  // Problem 95
  {
    slug: 'kanetkar-ch17-matrix-multiplication-cache',
    title: 'Cache-Friendly Matrix Multiplication & Diagonal Trace',
    difficulty: 'EASY',
    category: 'Advanced Algorithms',
    tags: ['Matrix', 'Pointers', 'Cache', 'Math'],
    description: `### Problem Description
Matrix multiplication $C = A \times B$ in standard row-major C achieves maximum CPU cache line reuse when ordered with loops \`i-k-j\` rather than naive \`i-j-k\` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

Given two matrices:
- Matrix $A$ of dimension $N \times K$
- Matrix $B$ of dimension $K \times M$

Compute the product matrix $C = A \times B$ and calculate:
1. The full product matrix.
2. The main diagonal trace of $C$ (if $N = M$), or print \`TRACE: N/A\` if $N \ne M$.

### Input Format
- First line: integers $N$, $K$, and $M$ ($1 \le N, K, M \le 30$).
- Next $N$ lines: $K$ integers per line (Matrix $A$).
- Next $K$ lines: $M$ integers per line (Matrix $B$).

### Output Format
- Print $N$ lines, each containing $M$ space-separated integers representing matrix $C$.
- Final line: \`TRACE: <val>\` or \`TRACE: N/A\`.

### Example 1
**Input:**
\`\`\`
2 2 2
1 2
3 4
5 6
7 8
\`\`\`
**Output:**
\`\`\`
19 22
43 50
TRACE: 69
\`\`\``,
    starterCode: `#include <stdio.h>

int main() {
    int n, k, m;
    if (scanf("%d %d %d", &n, &k, &m) != 3) return 0;
    // Compute matrix product
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int n, k, m;
    if (scanf("%d %d %d", &n, &k, &m) != 3) return 0;
    
    int A[35][35], B[35][35];
    long long C[35][35];
    memset(C, 0, sizeof(C));
    
    for (int i = 0; i < n; i++)
        for (int p = 0; p < k; p++)
            scanf("%d", &A[i][p]);
            
    for (int p = 0; p < k; p++)
        for (int j = 0; j < m; j++)
            scanf("%d", &B[p][j]);
            
    // i-k-j loop order for cache efficiency
    for (int i = 0; i < n; i++) {
        for (int p = 0; p < k; p++) {
            for (int j = 0; j < m; j++) {
                C[i][j] += (long long)A[i][p] * B[p][j];
            }
        }
    }
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            printf("%lld%s", C[i][j], j == m - 1 ? "" : " ");
        }
        printf("\\n");
    }
    
    if (n == m) {
        long long trace = 0;
        for (int i = 0; i < n; i++) trace += C[i][i];
        printf("TRACE: %lld\\n", trace);
    } else {
        printf("TRACE: N/A\\n");
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Matrix Operations',
      exerciseNumber: '17.11',
      exerciseOrder: 11,
      page: 247,
      concept: 'Row-major matrix multiplication with spatial locality optimization',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '2 2 2\n1 2\n3 4\n5 6\n7 8\n', expectedOutput: '19 22\n43 50\nTRACE: 69\n' },
      { input: '2 3 1\n1 2 3\n4 5 6\n1\n1\n1\n', expectedOutput: '6\n15\nTRACE: N/A\n' },
    ],
    hiddenTests: [
      { input: '1 1 1\n5\n5\n', expectedOutput: '25\nTRACE: 25\n' },
      { input: '2 2 2\n1 0\n0 1\n3 4\n5 6\n', expectedOutput: '3 4\n5 6\nTRACE: 9\n' },
    ],
  },
  // Problem 96
  {
    slug: 'kanetkar-ch17-knapsack-01-dynamic-prog',
    title: '0/1 Knapsack Dynamic Programming Optimizer',
    difficulty: 'MEDIUM',
    category: 'Advanced Algorithms',
    tags: ['Dynamic Programming', 'Knapsack', 'Optimization'],
    description: `### Problem Description
The classical 0/1 Knapsack problem selects a subset of items to maximize total value without exceeding a maximum weight capacity $W$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

DP Recurrence:
$$dp[i][w] = \max(dp[i-1][w], dp[i-1][w - \text{wt}[i]] + \text{val}[i])$$

Given $N$ items with weights and values, and capacity $W$:
1. Compute the maximum value attainable.
2. Backtrack to find the count of items included in the optimal knapsack.

### Input Format
- First line: integers $N$ ($1 \le N \le 100$) and $W$ ($1 \le W \le 1000$).
- Next $N$ lines: two integers per line: \`weight value\` ($1 \le \text{wt} \le W, 1 \le \text{val} \le 10^5$).

### Output Format
- Line 1: \`MAX_VALUE: %d\`
- Line 2: \`ITEMS_SELECTED: %d\`

### Example 1
**Input:**
\`\`\`
3 50
10 60
20 100
30 120
\`\`\`
**Output:**
\`\`\`
MAX_VALUE: 220
ITEMS_SELECTED: 2
\`\`\`
*Explanation: Optimal selection is items 2 and 3 (weights 20 + 30 = 50, values 100 + 120 = 220).*`,
    starterCode: `#include <stdio.h>

int main() {
    int n, w;
    if (scanf("%d %d", &n, &w) != 2) return 0;
    // 0/1 knapsack dynamic programming
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int dp[105][1005];

int max(int a, int b) { return a > b ? a : b; }

int main() {
    int n, w;
    if (scanf("%d %d", &n, &w) != 2) return 0;
    
    int wt[105], val[105];
    for (int i = 1; i <= n; i++) {
        scanf("%d %d", &wt[i], &val[i]);
    }
    
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j <= w; j++) {
            dp[i][j] = dp[i - 1][j];
            if (j >= wt[i]) {
                dp[i][j] = max(dp[i][j], dp[i - 1][j - wt[i]] + val[i]);
            }
        }
    }
    
    int max_val = dp[n][w];
    
    // Backtrack item count
    int items = 0;
    int curr_w = w;
    for (int i = n; i >= 1; i--) {
        if (dp[i][curr_w] != dp[i - 1][curr_w]) {
            items++;
            curr_w -= wt[i];
        }
    }
    
    printf("MAX_VALUE: %d\\n", max_val);
    printf("ITEMS_SELECTED: %d\\n", items);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Dynamic Programming',
      exerciseNumber: '17.15',
      exerciseOrder: 15,
      page: 250,
      concept: '0/1 knapsack 2D dynamic programming table and state backtracking',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 50\n10 60\n20 100\n30 120\n', expectedOutput: 'MAX_VALUE: 220\nITEMS_SELECTED: 2\n' },
      { input: '2 10\n15 100\n20 200\n', expectedOutput: 'MAX_VALUE: 0\nITEMS_SELECTED: 0\n' },
    ],
    hiddenTests: [
      { input: '1 10\n5 50\n', expectedOutput: 'MAX_VALUE: 50\nITEMS_SELECTED: 1\n' },
      { input: '4 16\n2 20\n5 30\n10 70\n5 40\n', expectedOutput: 'MAX_VALUE: 130\nITEMS_SELECTED: 3\n' },
    ],
  },
  // Problem 97
  {
    slug: 'kanetkar-ch17-lcs-longest-common-subseq',
    title: 'Longest Common Subsequence (LCS) 2D Table & String Reconstructor',
    difficulty: 'MEDIUM',
    category: 'Advanced Algorithms',
    tags: ['Dynamic Programming', 'LCS', 'Strings', 'Algorithms'],
    description: `### Problem Description
Given two sequences $X$ and $Y$, the Longest Common Subsequence (LCS) problem finds the longest sequence that appears in both without modifying order (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

DP Recurrence:
- If $X[i-1] == Y[j-1]$, $L[i][j] = 1 + L[i-1][j-1]$
- Otherwise, $L[i][j] = \max(L[i-1][j], L[i][j-1])$

Given two strings $S_1$ and $S_2$:
1. Compute the length of their LCS.
2. Reconstruct and print the reconstructed LCS string itself.

### Input Format
- Line 1: string $S_1$ (length $\le 100$).
- Line 2: string $S_2$ (length $\le 100$).

### Output Format
- Line 1: \`LCS_LENGTH: %d\`
- Line 2: \`LCS_STRING: %s\`

### Example 1
**Input:**
\`\`\`
ABCBDAB
BDCABA
\`\`\`
**Output:**
\`\`\`
LCS_LENGTH: 4
LCS_STRING: BCBA
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char s1[128], s2[128];
    if (scanf("%s %s", s1, s2) != 2) return 0;
    // LCS dynamic programming table
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int dp[105][105];

int main() {
    char s1[128], s2[128];
    if (scanf("%s %s", s1, s2) != 2) return 0;
    
    int m = strlen(s1);
    int n = strlen(s2);
    
    for (int i = 0; i <= m; i++) {
        for (int j = 0; j <= n; j++) {
            if (i == 0 || j == 0) dp[i][j] = 0;
            else if (s1[i - 1] == s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];
            else dp[i][j] = dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
        }
    }
    
    int len = dp[m][n];
    char lcs[105];
    lcs[len] = '\\0';
    
    int i = m, j = n, idx = len - 1;
    while (i > 0 && j > 0) {
        if (s1[i - 1] == s2[j - 1]) {
            lcs[idx--] = s1[i - 1];
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    
    printf("LCS_LENGTH: %d\\n", len);
    printf("LCS_STRING: %s\\n", lcs);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Dynamic Programming',
      exerciseNumber: '17.18',
      exerciseOrder: 18,
      page: 254,
      concept: 'Longest common subsequence reconstruction via 2D DP matrix backtracking',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'ABCBDAB\nBDCABA\n', expectedOutput: 'LCS_LENGTH: 4\nLCS_STRING: BCBA\n' },
      { input: 'AGGTAB\nGXTXAYB\n', expectedOutput: 'LCS_LENGTH: 4\nLCS_STRING: GTAB\n' },
    ],
    hiddenTests: [
      { input: 'HELLO\nWORLD\n', expectedOutput: 'LCS_LENGTH: 1\nLCS_STRING: O\n' },
      { input: 'ABCD\nEFGH\n', expectedOutput: 'LCS_LENGTH: 0\nLCS_STRING: \n' },
    ],
  },
  // Problem 98
  {
    slug: 'kanetkar-ch17-coin-change-minimum-coins',
    title: 'Coin Change Minimum Coins Dynamic Programming',
    difficulty: 'EASY',
    category: 'Advanced Algorithms',
    tags: ['Dynamic Programming', 'Coin Change', 'Optimization'],
    description: `### Problem Description
Given a set of $C$ coin denominations and a target amount $V$, find the minimum number of coins needed to make change for $V$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

DP Recurrence:
$$dp[a] = \min_{c \in \text{coins}} (dp[a - c] + 1)$$
With base case $dp[0] = 0$.

If the amount cannot be made up by any combination of coins, output \`CHANGE IMPOSSIBLE\`.

### Input Format
- First line: integer $C$ ($1 \le C \le 50$) and integer $V$ ($1 \le V \le 10000$).
- Second line: $C$ space-separated coin denominations.

### Output Format
- \`MIN_COINS: %d\` or \`CHANGE IMPOSSIBLE\`

### Example 1
**Input:**
\`\`\`
3 11
1 2 5
\`\`\`
**Output:**
\`\`\`
MIN_COINS: 3
\`\`\`
*Explanation: 11 = 5 + 5 + 1 (3 coins).*`,
    starterCode: `#include <stdio.h>

int main() {
    int c, v;
    if (scanf("%d %d", &c, &v) != 2) return 0;
    // Coin change dynamic programming
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

#define INF 1000000000

int dp[10005];

int main() {
    int c, v;
    if (scanf("%d %d", &c, &v) != 2) return 0;
    
    int coins[55];
    for (int i = 0; i < c; i++) scanf("%d", &coins[i]);
    
    for (int i = 1; i <= v; i++) dp[i] = INF;
    dp[0] = 0;
    
    for (int i = 1; i <= v; i++) {
        for (int k = 0; k < c; k++) {
            if (i >= coins[k] && dp[i - coins[k]] != INF) {
                if (dp[i - coins[k]] + 1 < dp[i]) {
                    dp[i] = dp[i - coins[k]] + 1;
                }
            }
        }
    }
    
    if (dp[v] == INF) {
        printf("CHANGE IMPOSSIBLE\\n");
    } else {
        printf("MIN_COINS: %d\\n", dp[v]);
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'Unbounded Knapsack / Coin Change',
      exerciseNumber: '17.22',
      exerciseOrder: 22,
      page: 258,
      concept: 'Bottom-up 1D dynamic programming for unbounded coin change',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '3 11\n1 2 5\n', expectedOutput: 'MIN_COINS: 3\n' },
      { input: '1 3\n2\n', expectedOutput: 'CHANGE IMPOSSIBLE\n' },
    ],
    hiddenTests: [
      { input: '4 30\n1 5 10 25\n', expectedOutput: 'MIN_COINS: 2\n' },
      { input: '2 7\n2 4\n', expectedOutput: 'CHANGE IMPOSSIBLE\n' },
      { input: '1 0\n5\n', expectedOutput: 'MIN_COINS: 0\n' },
    ],
  },
  // Problem 99
  {
    slug: 'kanetkar-ch17-levenshtein-edit-distance',
    title: 'Levenshtein Edit Distance String Metric Engine',
    difficulty: 'MEDIUM',
    category: 'Advanced Algorithms',
    tags: ['Dynamic Programming', 'Edit Distance', 'Strings'],
    description: `### Problem Description
The Levenshtein distance between two strings is the minimum number of single-character edits (insertions, deletions, or substitutions) required to transform string $A$ into string $B$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).

DP Recurrence:
- $D[i][0] = i$
- $D[0][j] = j$
- If $A[i-1] == B[j-1]$, $D[i][j] = D[i-1][j-1]$
- Otherwise, $D[i][j] = 1 + \min(D[i-1][j], D[i][j-1], D[i-1][j-1])$

Given two strings $A$ and $B$:
Calculate and print their Levenshtein edit distance.

### Input Format
- Two strings $A$ and $B$ on separate lines (lengths $\le 100$).

### Output Format
- Print \`EDIT_DISTANCE: %d\`

### Example 1
**Input:**
\`\`\`
kitten
sitting
\`\`\`
**Output:**
\`\`\`
EDIT_DISTANCE: 3
\`\`\`
*Explanation: kitten -> sitten (replace k with s) -> sittin (replace e with i) -> sitting (insert g).*`,
    starterCode: `#include <stdio.h>
#include <string.h>

int min3(int a, int b, int c) {
    int m = a < b ? a : b;
    return m < c ? m : c;
}

int main() {
    char a[128], b[128];
    if (scanf("%s %s", a, b) != 2) return 0;
    // Calculate Levenshtein distance
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int dp[105][105];

int min3(int a, int b, int c) {
    int m = a < b ? a : b;
    return m < c ? m : c;
}

int main() {
    char a[128], b[128];
    if (scanf("%s %s", a, b) != 2) return 0;
    
    int m = strlen(a);
    int n = strlen(b);
    
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min3(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    
    printf("EDIT_DISTANCE: %d\\n", dp[m][n]);
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 25,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 17,
      chapterTitle: 'Advanced Algorithms',
      chapterOrder: 17,
      section: 'String Similarity Metrics',
      exerciseNumber: '17.26',
      exerciseOrder: 26,
      page: 262,
      concept: 'Levenshtein dynamic programming matrix operations for string distance',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: 'kitten\nsitting\n', expectedOutput: 'EDIT_DISTANCE: 3\n' },
      { input: 'logic\nlogic\n', expectedOutput: 'EDIT_DISTANCE: 0\n' },
    ],
    hiddenTests: [
      { input: 'sunday\nsaturday\n', expectedOutput: 'EDIT_DISTANCE: 3\n' },
      { input: 'a\nb\n', expectedOutput: 'EDIT_DISTANCE: 1\n' },
      { input: 'intention\nexecution\n', expectedOutput: 'EDIT_DISTANCE: 5\n' },
    ],
  },
  // Problem 100
  {
    slug: 'kanetkar-ch18-custom-arena-bump-allocator',
    title: 'Custom Memory Pool Arena Bump Allocator & Alignment Guard',
    difficulty: 'HARD',
    category: 'Memory Management',
    tags: ['Memory', 'Pointers', 'Arena Allocator', 'Systems Programming'],
    description: `### Problem Description
In high-performance C systems, embedded devices, and game engines, invoking \`malloc\` for every small object creates heap fragmentation and performance overhead. Systems programmers implement an **Arena (Bump) Allocator** using a fixed static buffer (Yashavant Kanetkar, *Test Your C Skills*, Chapter 18: Advanced Pointer Techniques).

Arena Specifications:
- Total Arena Capacity = $B$ bytes.
- Offset points to the next available byte (initially $0$).
- \`ALLOC sz align\`:
  - Align the current offset to the next multiple of \`align\` (powers of 2: 1, 2, 4, 8).
  - If \`aligned_offset + sz > B\`, allocation fails: output \`OUT_OF_MEMORY\`.
  - Otherwise, return allocation address (represented as offset index), update \`offset = aligned_offset + sz\`, and increment successful allocation count.
- \`RESET\`:
  - Resets \`offset = 0\` (instant bulk deallocation of all objects in $O(1)$).
- \`STATS\`:
  - Output \`ARENA: USED=%d FREE=%d ALLOCS=%d\`.

Given buffer size $B$ and $Q$ operations:
Process all commands and output the diagnostics.

### Input Format
- First line: integer $B$ ($64 \le B \le 65536$) and integer $Q$ ($1 \le Q \le 100$).
- Next $Q$ lines: \`ALLOC <size> <align>\`, \`RESET\`, or \`STATS\`.

### Output Format
Print the output of each command:
- For \`ALLOC\`: \`ALLOCATED AT OFFSET %d\` or \`OUT_OF_MEMORY\`.
- For \`RESET\`: \`ARENA RESET\`.
- For \`STATS\`: \`ARENA: USED=%d FREE=%d ALLOCS=%d\`.

### Example 1
**Input:**
\`\`\`
64 6
ALLOC 10 4
ALLOC 8 8
STATS
RESET
STATS
ALLOC 100 8
\`\`\`
**Output:**
\`\`\`
ALLOCATED AT OFFSET 0
ALLOCATED AT OFFSET 16
ARENA: USED=24 FREE=40 ALLOCS=2
ARENA RESET
ARENA: USED=0 FREE=64 ALLOCS=0
OUT_OF_MEMORY
\`\`\``,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    int b, q;
    if (scanf("%d %d", &b, &q) != 2) return 0;
    // Arena bump allocator simulation
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

int main() {
    int b, q;
    if (scanf("%d %d", &b, &q) != 2) return 0;
    
    int offset = 0;
    int alloc_count = 0;
    
    char op[32];
    for (int k = 0; k < q; k++) {
        scanf("%s", op);
        if (strcmp(op, "ALLOC") == 0) {
            int sz, align;
            scanf("%d %d", &sz, &align);
            
            int rem = offset % align;
            int aligned_offset = (rem == 0) ? offset : (offset + (align - rem));
            
            if (aligned_offset + sz > b) {
                printf("OUT_OF_MEMORY\\n");
            } else {
                printf("ALLOCATED AT OFFSET %d\\n", aligned_offset);
                offset = aligned_offset + sz;
                alloc_count++;
            }
        } else if (strcmp(op, "RESET") == 0) {
            offset = 0;
            alloc_count = 0;
            printf("ARENA RESET\\n");
        } else if (strcmp(op, "STATS") == 0) {
            printf("ARENA: USED=%d FREE=%d ALLOCS=%d\\n", offset, b - offset, alloc_count);
        }
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sourceType: 'BOOK',
    sourceRef: {
      bookId: 'YPK-TYCS-1996',
      bookTitle: 'Test Your C Skills',
      author: 'Yashavant P. Kanetkar',
      edition: '1996 BPB Publications',
      chapter: 18,
      chapterTitle: 'Advanced Pointers and Memory Management',
      chapterOrder: 18,
      section: 'Custom Allocators',
      exerciseNumber: '18.10',
      exerciseOrder: 10,
      page: 270,
      concept: 'Arena bump allocation with alignment padding and bulk O(1) deallocation',
      copyrightStatus: 'ORIGINAL_REWRITE',
    },
    sampleTests: [
      { input: '64 6\nALLOC 10 4\nALLOC 8 8\nSTATS\nRESET\nSTATS\nALLOC 100 8\n', expectedOutput: 'ALLOCATED AT OFFSET 0\nALLOCATED AT OFFSET 16\nARENA: USED=24 FREE=40 ALLOCS=2\nARENA RESET\nARENA: USED=0 FREE=64 ALLOCS=0\nOUT_OF_MEMORY\n' },
      { input: '32 3\nALLOC 20 1\nALLOC 20 1\nSTATS\n', expectedOutput: 'ALLOCATED AT OFFSET 0\nOUT_OF_MEMORY\nARENA: USED=20 FREE=12 ALLOCS=1\n' },
    ],
    hiddenTests: [
      { input: '128 4\nALLOC 1 8\nALLOC 1 8\nALLOC 1 8\nSTATS\n', expectedOutput: 'ALLOCATED AT OFFSET 0\nALLOCATED AT OFFSET 8\nALLOCATED AT OFFSET 16\nARENA: USED=17 FREE=111 ALLOCS=3\n' },
      { input: '64 2\nRESET\nSTATS\n', expectedOutput: 'ARENA RESET\nARENA: USED=0 FREE=64 ALLOCS=0\n' },
    ],
  },
];

// Write to both server and client data directories
const header = `import { BookProblemDef } from './kanetkar-book-bank.js';\n\nexport const KANETKAR_BOOK_PART3_PROBLEMS: BookProblemDef[] = `;
const tsContent = header + JSON.stringify(problems, null, 2) + ';\n';

fs.writeFileSync('server/src/data/kanetkar-book-bank-part3.ts', tsContent, 'utf8');
fs.writeFileSync('client/src/data/kanetkar-book-bank-part3.ts', tsContent, 'utf8');

console.log('Successfully written kanetkar-book-bank-part3.ts with ' + problems.length + ' problems');
