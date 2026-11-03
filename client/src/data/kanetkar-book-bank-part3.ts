import { BookProblemDef } from './kanetkar-book-bank.js';

export const KANETKAR_BOOK_PART3_PROBLEMS: BookProblemDef[] = [
  {
    "slug": "kanetkar-ch10-struct-padding-eval",
    "title": "Structure Member Alignment & Memory Padding Calculator",
    "difficulty": "MEDIUM",
    "category": "Structures and Unions",
    "tags": [
      "Structs",
      "Memory",
      "Alignment",
      "Padding"
    ],
    "description": "### Problem Description\nIn standard C ABIs (such as x86_64 SysV), structure members are aligned to multiples of their natural size (e.g. 1-byte char, 2-byte short, 4-byte int, 8-byte double/pointer) with tail padding matching the maximum member alignment (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Structures and Unions).\n\nGiven a layout of primitive fields defined by their sizes in sequence:\n- `c` for 1-byte char\n- `s` for 2-byte short\n- `i` for 4-byte int\n- `d` for 8-byte double\n\nCalculate:\n1. The total size in bytes of the structure including all internal and trailing padding bytes.\n2. The total number of padding bytes inserted by the compiler.\n\n### Input Format\n- A single integer N: the number of members (1 ≤ N ≤ 20).\n- N characters separated by space representing member types (`c`, `s`, `i`, `d`).\n\n### Output Format\nPrint two space-separated integers: `total_size padding_bytes`.\n\n### Example 1\n**Input:**\n```\n3\nc i s\n```\n**Output:**\n```\n12 5\n```\n*Explanation: 'c' at offset 0 (size 1). 'i' aligns at multiple of 4 -> offset 4 (3 pad bytes). 's' at offset 8 (size 2). Total size must align to max align (4), so 10 pads to 12 (2 trailing pad bytes). Total size = 12, pad = 3 + 2 = 5.*",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Calculate struct size and padding\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int offset = 0;\n    int max_align = 1;\n    int data_bytes = 0;\n    \n    for (int k = 0; k < n; k++) {\n        char type;\n        scanf(\" %c\", &type);\n        int sz = 1;\n        if (type == 'c') sz = 1;\n        else if (type == 's') sz = 2;\n        else if (type == 'i') sz = 4;\n        else if (type == 'd') sz = 8;\n        \n        if (sz > max_align) max_align = sz;\n        data_bytes += sz;\n        \n        int rem = offset % sz;\n        if (rem != 0) {\n            offset += (sz - rem);\n        }\n        offset += sz;\n    }\n    \n    int rem = offset % max_align;\n    if (rem != 0) {\n        offset += (max_align - rem);\n    }\n    \n    int padding = offset - data_bytes;\n    printf(\"%d %d\\n\", offset, padding);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Memory Alignment & Padding",
      "exerciseNumber": "10.3",
      "exerciseOrder": 3,
      "page": 135,
      "concept": "Struct member alignment and natural word boundaries in C",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3\nc i s\n",
        "expectedOutput": "12 5\n"
      },
      {
        "input": "4\nc c c c\n",
        "expectedOutput": "4 0\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\nc d\n",
        "expectedOutput": "16 7\n"
      },
      {
        "input": "1\nd\n",
        "expectedOutput": "8 0\n"
      },
      {
        "input": "5\nd c s i d\n",
        "expectedOutput": "24 7\n"
      },
      {
        "input": "3\ni i i\n",
        "expectedOutput": "12 0\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-struct-array-rank-sort",
    "title": "Array of Structures Multi-Key Student Ranker",
    "difficulty": "EASY",
    "category": "Structures and Unions",
    "tags": [
      "Structs",
      "Sorting",
      "Arrays",
      "Pointers"
    ],
    "description": "### Problem Description\nIn C, sorting an array of structures based on multiple criteria (e.g., total marks descending, then roll number ascending) is a foundational pattern (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).\n\nGiven N students, each with a roll number (int) and three subject marks (integers m1, m2, m3), sort the students by total marks in descending order. If two students have identical total marks, the student with the smaller roll number appears first.\n\n### Input Format\n- First line: integer N (1 ≤ N ≤ 100).\n- Next N lines: four space-separated integers per line: `roll m1 m2 m3` (1 ≤ roll ≤ 1000, 0 ≤ marks ≤ 100).\n\n### Output Format\nPrint N lines, each containing: `roll total_marks` in sorted order.\n\n### Example 1\n**Input:**\n```\n3\n101 80 85 90\n102 95 90 90\n103 80 85 90\n```\n**Output:**\n```\n102 275\n101 255\n103 255\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nstruct Student {\n    int roll;\n    int total;\n};\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Sort array of structures\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct {\n    int roll;\n    int total;\n} Student;\n\nint compare(const void *a, const void *b) {\n    const Student *s1 = (const Student *)a;\n    const Student *s2 = (const Student *)b;\n    if (s2->total != s1->total) return s2->total - s1->total;\n    return s1->roll - s2->roll;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    Student arr[105];\n    for (int i = 0; i < n; i++) {\n        int r, m1, m2, m3;\n        scanf(\"%d %d %d %d\", &r, &m1, &m2, &m3);\n        arr[i].roll = r;\n        arr[i].total = m1 + m2 + m3;\n    }\n    qsort(arr, n, sizeof(Student), compare);\n    for (int i = 0; i < n; i++) {\n        printf(\"%d %d\\n\", arr[i].roll, arr[i].total);\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Arrays of Structures",
      "exerciseNumber": "10.8",
      "exerciseOrder": 8,
      "page": 139,
      "concept": "Multi-field sorting with structure pointers and qsort comparator",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3\n101 80 85 90\n102 95 90 90\n103 80 85 90\n",
        "expectedOutput": "102 275\n101 255\n103 255\n"
      },
      {
        "input": "2\n200 50 50 50\n100 50 50 50\n",
        "expectedOutput": "100 150\n200 150\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n10 100 100 100\n",
        "expectedOutput": "10 300\n"
      },
      {
        "input": "4\n4 10 20 30\n3 20 20 20\n2 30 20 10\n1 50 50 50\n",
        "expectedOutput": "1 150\n2 60\n3 60\n4 60\n"
      },
      {
        "input": "3\n50 90 90 90\n20 90 90 90\n80 90 90 90\n",
        "expectedOutput": "20 270\n50 270\n80 270\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-nested-struct-distance",
    "title": "Nested Structure 2D Cartesian Perimeter & Centroid",
    "difficulty": "EASY",
    "category": "Structures and Unions",
    "tags": [
      "Structs",
      "Nested Structs",
      "Geometry",
      "Math"
    ],
    "description": "### Problem Description\nStructures in C can contain other structures as members (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).\n\nDefine a `Point` struct `{ double x, y; }` and a `Triangle` struct containing three nested `Point` members `{ Point a, b, c; }`.\nGiven the coordinates of the 3 vertices of a triangle, compute:\n1. The perimeter of the triangle rounded to 2 decimal places.\n2. The centroid `(cx, cy)` rounded to 2 decimal places.\n\n### Input Format\n- A single line containing 6 floating point values: `x1 y1 x2 y2 x3 y3`.\n\n### Output Format\n- Line 1: `PERIMETER: <val>` (formatted with `%.2f`)\n- Line 2: `CENTROID: (<cx>, <cy>)` (formatted with `%.2f`)\n\n### Example 1\n**Input:**\n```\n0.0 0.0 4.0 0.0 0.0 3.0\n```\n**Output:**\n```\nPERIMETER: 12.00\nCENTROID: (1.33, 1.00)\n```",
    "starterCode": "#include <stdio.h>\n#include <math.h>\n\nstruct Point {\n    double x, y;\n};\n\nstruct Triangle {\n    struct Point a, b, c;\n};\n\nint main() {\n    // Read vertices and compute perimeter & centroid\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <math.h>\n\ntypedef struct {\n    double x, y;\n} Point;\n\ntypedef struct {\n    Point a, b, c;\n} Triangle;\n\ndouble dist(Point p1, Point p2) {\n    return sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));\n}\n\nint main() {\n    Triangle t;\n    if (scanf(\"%lf %lf %lf %lf %lf %lf\", &t.a.x, &t.a.y, &t.b.x, &t.b.y, &t.c.x, &t.c.y) != 6) return 0;\n    \n    double perim = dist(t.a, t.b) + dist(t.b, t.c) + dist(t.c, t.a);\n    double cx = (t.a.x + t.b.x + t.c.x) / 3.0;\n    double cy = (t.a.y + t.b.y + t.c.y) / 3.0;\n    \n    printf(\"PERIMETER: %.2f\\n\", perim);\n    printf(\"CENTROID: (%.2f, %.2f)\\n\", cx, cy);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Nested Structures",
      "exerciseNumber": "10.12",
      "exerciseOrder": 12,
      "page": 142,
      "concept": "Nested structures composition and pass-by-value semantics",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "0.0 0.0 4.0 0.0 0.0 3.0\n",
        "expectedOutput": "PERIMETER: 12.00\nCENTROID: (1.33, 1.00)\n"
      },
      {
        "input": "0.0 0.0 2.0 0.0 1.0 1.7320508\n",
        "expectedOutput": "PERIMETER: 6.00\nCENTROID: (1.00, 0.58)\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1.0 1.0 4.0 5.0 1.0 5.0\n",
        "expectedOutput": "PERIMETER: 12.00\nCENTROID: (2.00, 3.67)\n"
      },
      {
        "input": "-2.0 -2.0 2.0 -2.0 0.0 2.0\n",
        "expectedOutput": "PERIMETER: 12.94\nCENTROID: (0.00, -0.67)\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-union-ieee754-type-pun",
    "title": "Union Type Punning: Float to IEEE-754 Bit Inspector",
    "difficulty": "EASY",
    "category": "Structures and Unions",
    "tags": [
      "Unions",
      "Type Punning",
      "IEEE-754",
      "Bitwise"
    ],
    "description": "### Problem Description\nIn C, a `union` shares the same memory location for all its members. This allows type punning to inspect the raw binary representation of a floating-point number without modifying its bits (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10: Structures and Unions).\n\nUsing a union of a `float` and an `unsigned int`:\n```c\nunion FloatBits {\n    float f;\n    unsigned int u;\n};\n```\nInspect a given single-precision floating point number and output:\n1. Hexadecimal representation (`0x%08X`).\n2. Sign bit (bit 31): `0` or `1`.\n3. Biased exponent (bits 30..23) as an unsigned integer.\n4. Mantissa / fraction bits (bits 22..0) as hexadecimal (`0x%06X`).\n\n### Input Format\n- A single float value.\n\n### Output Format\n- Single line: `HEX: 0x%08X | SIGN: %u | EXP: %u | MANTISSA: 0x%06X`\n\n### Example 1\n**Input:**\n```\n1.0\n```\n**Output:**\n```\nHEX: 0x3F800000 | SIGN: 0 | EXP: 127 | MANTISSA: 0x000000\n```",
    "starterCode": "#include <stdio.h>\n\nunion FloatBits {\n    float f;\n    unsigned int u;\n};\n\nint main() {\n    union FloatBits fb;\n    if (scanf(\"%f\", &fb.f) != 1) return 0;\n    // Extract sign, exponent, and mantissa\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nunion FloatBits {\n    float f;\n    unsigned int u;\n};\n\nint main() {\n    union FloatBits fb;\n    if (scanf(\"%f\", &fb.f) != 1) return 0;\n    \n    unsigned int sign = (fb.u >> 31) & 1;\n    unsigned int exp = (fb.u >> 23) & 0xFF;\n    unsigned int mantissa = fb.u & 0x7FFFFF;\n    \n    printf(\"HEX: 0x%08X | SIGN: %u | EXP: %u | MANTISSA: 0x%06X\\n\", fb.u, sign, exp, mantissa);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Union Type Punning",
      "exerciseNumber": "10.19",
      "exerciseOrder": 19,
      "page": 147,
      "concept": "Union type punning for IEEE-754 bit layout extraction",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "1.0\n",
        "expectedOutput": "HEX: 0x3F800000 | SIGN: 0 | EXP: 127 | MANTISSA: 0x000000\n"
      },
      {
        "input": "-1.0\n",
        "expectedOutput": "HEX: 0xBF800000 | SIGN: 1 | EXP: 127 | MANTISSA: 0x000000\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0.0\n",
        "expectedOutput": "HEX: 0x00000000 | SIGN: 0 | EXP: 0 | MANTISSA: 0x000000\n"
      },
      {
        "input": "2.5\n",
        "expectedOutput": "HEX: 0x40200000 | SIGN: 0 | EXP: 128 | MANTISSA: 0x200000\n"
      },
      {
        "input": "-0.5\n",
        "expectedOutput": "HEX: 0xBF000000 | SIGN: 1 | EXP: 126 | MANTISSA: 0x000000\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-tagged-union-variant",
    "title": "Tagged Union Algebraic Variant Evaluator",
    "difficulty": "MEDIUM",
    "category": "Structures and Unions",
    "tags": [
      "Unions",
      "Tagged Union",
      "Variant",
      "Structs"
    ],
    "description": "### Problem Description\nBecause a union does not track which member is currently active, production C programs pair a union with an enumeration tag in a pattern known as a **Tagged Union** or **Discriminated Union** (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).\n\nGiven a series of N tagged items:\n- Tag `I`: holds a signed 32-bit integer (`int`).\n- Tag `F`: holds a single precision float (`float`).\n- Tag `S`: holds a string of up to 15 characters (`char[16]`).\n\nCalculate:\n1. The sum of all integer values.\n2. The sum of all float values (rounded to 2 decimal places).\n3. The concatenated string of all string items (in the order they appeared).\n\n### Input Format\n- First line: integer N (1 ≤ N ≤ 50).\n- Next N lines: a character tag (`I`, `F`, or `S`) followed by space and the value.\n\n### Output Format\n- Line 1: `INT_SUM: <sum>`\n- Line 2: `FLOAT_SUM: <sum>` (formatted with `%.2f`)\n- Line 3: `STR_CONCAT: <concat>`\n\n### Example 1\n**Input:**\n```\n4\nI 15\nS Hello\nF 3.5\nS _World\n```\n**Output:**\n```\nINT_SUM: 15\nFLOAT_SUM: 3.50\nSTR_CONCAT: Hello_World\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\n// Tagged union definition\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Process tagged union items\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\ntypedef enum { TAG_INT, TAG_FLOAT, TAG_STR } Tag;\n\ntypedef struct {\n    Tag tag;\n    union {\n        int i_val;\n        float f_val;\n        char s_val[32];\n    } data;\n} Item;\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    long long int_sum = 0;\n    double float_sum = 0.0;\n    char str_buf[1024] = \"\";\n    \n    for (int k = 0; k < n; k++) {\n        char tag_char;\n        scanf(\" %c\", &tag_char);\n        Item item;\n        if (tag_char == 'I') {\n            item.tag = TAG_INT;\n            scanf(\"%d\", &item.data.i_val);\n            int_sum += item.data.i_val;\n        } else if (tag_char == 'F') {\n            item.tag = TAG_FLOAT;\n            scanf(\"%f\", &item.data.f_val);\n            float_sum += item.data.f_val;\n        } else if (tag_char == 'S') {\n            item.tag = TAG_STR;\n            scanf(\"%s\", item.data.s_val);\n            strcat(str_buf, item.data.s_val);\n        }\n    }\n    \n    printf(\"INT_SUM: %lld\\n\", int_sum);\n    printf(\"FLOAT_SUM: %.2f\\n\", float_sum);\n    printf(\"STR_CONCAT: %s\\n\", str_buf);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Discriminated Unions",
      "exerciseNumber": "10.22",
      "exerciseOrder": 22,
      "page": 151,
      "concept": "Discriminated tagged unions for dynamic polymorphism in C",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\nI 15\nS Hello\nF 3.5\nS _World\n",
        "expectedOutput": "INT_SUM: 15\nFLOAT_SUM: 3.50\nSTR_CONCAT: Hello_World\n"
      },
      {
        "input": "2\nI 10\nI -5\n",
        "expectedOutput": "INT_SUM: 5\nFLOAT_SUM: 0.00\nSTR_CONCAT: \n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\nS Foo\nS Bar\nS Baz\n",
        "expectedOutput": "INT_SUM: 0\nFLOAT_SUM: 0.00\nSTR_CONCAT: FooBarBaz\n"
      },
      {
        "input": "3\nF 1.25\nF 2.50\nF 3.75\n",
        "expectedOutput": "INT_SUM: 0\nFLOAT_SUM: 7.50\nSTR_CONCAT: \n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-bitfield-date-packer",
    "title": "Bit-Field Calendar Date Compact Binary Packer",
    "difficulty": "EASY",
    "category": "Structures and Unions",
    "tags": [
      "Bit-Fields",
      "Structs",
      "Binary",
      "Packing"
    ],
    "description": "### Problem Description\nC bit-fields allow packing integer values into specific bit widths to conserve memory in embedded devices (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).\n\nDefine a bit-field structure to pack a calendar date into a 16-bit unsigned integer:\n- `day` : 5 bits (1 to 31)\n- `month` : 4 bits (1 to 12)\n- `year` : 7 bits (0 to 99, offset from year 2000, e.g. 2026 -> 26)\n\nPacking order (from least significant bit 0 to bit 15):\n- Bits 0..4: `day`\n- Bits 5..8: `month`\n- Bits 9..15: `year`\n\nGiven a date string in format `DD-MM-YYYY`:\n1. Pack it into the 16-bit unsigned integer.\n2. Print the packed hex representation (`0x%04X`).\n3. Unpack the integer using the bit-field and print back the verified date in `DD-MM-YYYY` format.\n\n### Input Format\n- A date string in `DD-MM-YYYY` format where 2000 ≤ YYYY ≤ 2099.\n\n### Output Format\n- Line 1: `PACKED: 0x%04X`\n- Line 2: `UNPACKED: DD-MM-YYYY` (with leading zeros)\n\n### Example 1\n**Input:**\n```\n15-08-2026\n```\n**Output:**\n```\nPACKED: 0x350F\nUNPACKED: 15-08-2026\n```",
    "starterCode": "#include <stdio.h>\n\nstruct CompactDate {\n    unsigned int day : 5;\n    unsigned int month : 4;\n    unsigned int year : 7;\n};\n\nint main() {\n    int d, m, y;\n    if (scanf(\"%d-%d-%d\", &d, &m, &y) != 3) return 0;\n    // Pack and unpack\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nstruct CompactDate {\n    unsigned int day : 5;\n    unsigned int month : 4;\n    unsigned int year : 7;\n};\n\nint main() {\n    int d, m, y;\n    if (scanf(\"%d-%d-%d\", &d, &m, &y) != 3) return 0;\n    \n    struct CompactDate cd;\n    cd.day = d;\n    cd.month = m;\n    cd.year = y - 2000;\n    \n    unsigned short packed = (cd.day & 0x1F) | ((cd.month & 0x0F) << 5) | ((cd.year & 0x7F) << 9);\n    \n    // Unpack\n    unsigned int u_day = packed & 0x1F;\n    unsigned int u_month = (packed >> 5) & 0x0F;\n    unsigned int u_year = ((packed >> 9) & 0x7F) + 2000;\n    \n    printf(\"PACKED: 0x%04X\\n\", packed);\n    printf(\"UNPACKED: %02u-%02u-%04u\\n\", u_day, u_month, u_year);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Bit-Fields",
      "exerciseNumber": "10.25",
      "exerciseOrder": 25,
      "page": 154,
      "concept": "Bit-field allocation order and compact binary serialization",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "15-08-2026\n",
        "expectedOutput": "PACKED: 0x350F\nUNPACKED: 15-08-2026\n"
      },
      {
        "input": "01-01-2000\n",
        "expectedOutput": "PACKED: 0x0021\nUNPACKED: 01-01-2000\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "31-12-2099\n",
        "expectedOutput": "PACKED: 0xC79F\nUNPACKED: 31-12-2099\n"
      },
      {
        "input": "28-02-2024\n",
        "expectedOutput": "PACKED: 0x305C\nUNPACKED: 28-02-2024\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch10-bitfield-hardware-reg",
    "title": "Hardware Peripheral Register Bit-Field Controller",
    "difficulty": "EASY",
    "category": "Structures and Unions",
    "tags": [
      "Bit-Fields",
      "Hardware",
      "Embedded",
      "Bitwise"
    ],
    "description": "### Problem Description\nMicrocontroller peripheral control registers are modeled in C using bit-fields overlaid across memory-mapped I/O (Yashavant Kanetkar, *Test Your C Skills*, Chapter 10).\n\nAn 8-bit UART Control & Status Register (UART_CSR) has the following bits:\n- Bit 0: `TX_ENABLE` (1 = On, 0 = Off)\n- Bit 1: `RX_ENABLE` (1 = On, 0 = Off)\n- Bit 2: `PARITY_EVEN` (1 = Even, 0 = Odd)\n- Bits 3..4: `BAUD_RATE` (`00` = 9600, `01` = 19200, `10` = 57600, `11` = 115200)\n- Bit 5: `ERROR_FLAG` (1 = Error, 0 = Clear)\n- Bit 6: `DATA_READY` (1 = Ready, 0 = Empty)\n- Bit 7: `INTERRUPT_EN` (1 = Interrupts Enabled)\n\nGiven the raw 8-bit hex register value (e.g. `0xA5`), decode and print the status report.\n\n### Input Format\n- A single hexadecimal integer prefixed with `0x` or without (0x00 to 0xFF).\n\n### Output Format\nPrint the status lines:\n- `TX: <ENABLED/DISABLED>`\n- `RX: <ENABLED/DISABLED>`\n- `PARITY: <EVEN/ODD>`\n- `BAUD: <9600/19200/57600/115200>`\n- `STATUS: <ERROR/OK>`\n- `DATA: <READY/EMPTY>`\n- `IRQ: <ENABLED/DISABLED>`\n\n### Example 1\n**Input:**\n```\n0xA5\n```\n**Output:**\n```\nTX: ENABLED\nRX: DISABLED\nPARITY: EVEN\nBAUD: 9600\nSTATUS: OK\nDATA: READY\nIRQ: ENABLED\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    unsigned int raw;\n    if (scanf(\"%x\", &raw) != 1) return 0;\n    // Decode peripheral register\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    unsigned int raw;\n    if (scanf(\"%x\", &raw) != 1) return 0;\n    \n    int tx = raw & 1;\n    int rx = (raw >> 1) & 1;\n    int parity = (raw >> 2) & 1;\n    int baud = (raw >> 3) & 3;\n    int err = (raw >> 5) & 1;\n    int ready = (raw >> 6) & 1;\n    int irq = (raw >> 7) & 1;\n    \n    const char *bauds[] = {\"9600\", \"19200\", \"57600\", \"115200\"};\n    \n    printf(\"TX: %s\\n\", tx ? \"ENABLED\" : \"DISABLED\");\n    printf(\"RX: %s\\n\", rx ? \"ENABLED\" : \"DISABLED\");\n    printf(\"PARITY: %s\\n\", parity ? \"EVEN\" : \"ODD\");\n    printf(\"BAUD: %s\\n\", bauds[baud]);\n    printf(\"STATUS: %s\\n\", err ? \"ERROR\" : \"OK\");\n    printf(\"DATA: %s\\n\", ready ? \"READY\" : \"EMPTY\");\n    printf(\"IRQ: %s\\n\", irq ? \"ENABLED\" : \"DISABLED\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 10,
      "chapterTitle": "Structures and Unions",
      "chapterOrder": 10,
      "section": "Hardware Register Mapping",
      "exerciseNumber": "10.30",
      "exerciseOrder": 30,
      "page": 158,
      "concept": "Bit-field hardware register simulation and decoding",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "0xA5\n",
        "expectedOutput": "TX: ENABLED\nRX: DISABLED\nPARITY: EVEN\nBAUD: 9600\nSTATUS: OK\nDATA: READY\nIRQ: ENABLED\n"
      },
      {
        "input": "0x00\n",
        "expectedOutput": "TX: DISABLED\nRX: DISABLED\nPARITY: ODD\nBAUD: 9600\nSTATUS: OK\nDATA: EMPTY\nIRQ: DISABLED\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0xFF\n",
        "expectedOutput": "TX: ENABLED\nRX: ENABLED\nPARITY: EVEN\nBAUD: 115200\nSTATUS: ERROR\nDATA: READY\nIRQ: ENABLED\n"
      },
      {
        "input": "0x1B\n",
        "expectedOutput": "TX: ENABLED\nRX: ENABLED\nPARITY: ODD\nBAUD: 57600\nSTATUS: OK\nDATA: EMPTY\nIRQ: DISABLED\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch11-enum-traffic-fsm",
    "title": "Enumerated State Machine Traffic Controller",
    "difficulty": "EASY",
    "category": "Enums and Types",
    "tags": [
      "Enums",
      "State Machine",
      "Switch"
    ],
    "description": "### Problem Description\nEnumerations (`enum`) define self-documenting discrete states for finite-state machines in C (Yashavant Kanetkar, *Test Your C Skills*, Chapter 11: Enums and Typedefs).\n\nA 4-way traffic junction controller has three states:\n- `STATE_RED` (0)\n- `STATE_YELLOW` (1)\n- `STATE_GREEN` (2)\n\nTransitions occur based on clock ticks:\n- `RED` lasts 30 seconds -> transitions to `GREEN`.\n- `GREEN` lasts 25 seconds -> transitions to `YELLOW`.\n- `YELLOW` lasts 5 seconds -> transitions to `RED`.\n\nGiven an initial state (as integer 0, 1, or 2) and an elapsed time T (in seconds), compute the state of the light at time T and the number of seconds remaining before the next state transition.\n\n### Input Format\n- Two integers: `state` (0, 1, or 2) and `T` (0 ≤ T ≤ 100000).\n\n### Output Format\nPrint: `<STATE_NAME> <remaining_seconds>`\nWhere state name is `RED`, `YELLOW`, or `GREEN`.\n\n### Example 1\n**Input:**\n```\n0 10\n```\n**Output:**\n```\nRED 20\n```\n*Explanation: State starts RED (30s duration). 10s have elapsed, so 20s remain before switching to GREEN.*",
    "starterCode": "#include <stdio.h>\n\nenum TrafficState {\n    STATE_RED = 0,\n    STATE_YELLOW = 1,\n    STATE_GREEN = 2\n};\n\nint main() {\n    int init_state, t;\n    if (scanf(\"%d %d\", &init_state, &t) != 2) return 0;\n    // Calculate final state and remaining duration\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int init_state, t;\n    if (scanf(\"%d %d\", &init_state, &t) != 2) return 0;\n    \n    // Total cycle: RED (30) -> GREEN (25) -> YELLOW (5) = 60s total\n    // Map initial state to offset within standard 60s cycle starting at RED = 0:\n    // RED: [0, 30)\n    // GREEN: [30, 55)\n    // YELLOW: [55, 60)\n    int cycle_offset = 0;\n    if (init_state == 0) cycle_offset = 0;\n    else if (init_state == 2) cycle_offset = 30;\n    else if (init_state == 1) cycle_offset = 55;\n    \n    int current_pos = (cycle_offset + t) % 60;\n    \n    if (current_pos < 30) {\n        printf(\"RED %d\\n\", 30 - current_pos);\n    } else if (current_pos < 55) {\n        printf(\"GREEN %d\\n\", 55 - current_pos);\n    } else {\n        printf(\"YELLOW %d\\n\", 60 - current_pos);\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 11,
      "chapterTitle": "Typedef and Enum",
      "chapterOrder": 11,
      "section": "Enumeration FSM",
      "exerciseNumber": "11.5",
      "exerciseOrder": 5,
      "page": 162,
      "concept": "Finite state machine state representation using C enums",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "0 10\n",
        "expectedOutput": "RED 20\n"
      },
      {
        "input": "2 20\n",
        "expectedOutput": "GREEN 5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0 30\n",
        "expectedOutput": "GREEN 25\n"
      },
      {
        "input": "1 4\n",
        "expectedOutput": "YELLOW 1\n"
      },
      {
        "input": "0 60\n",
        "expectedOutput": "RED 30\n"
      },
      {
        "input": "2 30\n",
        "expectedOutput": "RED 25\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch12-dynamic-array-vector",
    "title": "Dynamic Array Geometric Growth & Shrink Simulator",
    "difficulty": "MEDIUM",
    "category": "Dynamic Memory Allocation",
    "tags": [
      "Pointers",
      "Memory",
      "realloc",
      "Dynamic Memory"
    ],
    "description": "### Problem Description\nStandard C provides `malloc`, `realloc`, and `free` for runtime memory management. Implementing an amortized $O(1)$ dynamic vector doubles its capacity when full and halves its capacity when size falls to one-fourth (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12: Dynamic Memory Allocation).\n\nVector rules:\n- Initial capacity = 2, size = 0.\n- When an element is pushed (`PUSH x`):\n  - If `size == capacity`, capacity doubles (`capacity *= 2`).\n  - Add element at `size`, then increment `size`.\n- When an element is popped (`POP`):\n  - Decrement `size`.\n  - If `size > 0` and `size == capacity / 4` (integer division) and `capacity > 2`, halve capacity (`capacity /= 2`).\n\nGiven a series of Q operations, output:\n- For each `POP`, print the popped element value.\n- After all operations, print final `size` and `capacity`.\n\n### Input Format\n- First line: integer Q (1 ≤ Q ≤ 500).\n- Next Q lines: `PUSH <val>` or `POP`.\n\n### Output Format\n- Popped values, one per line.\n- Final line: `FINAL: SIZE=%d CAPACITY=%d`\n\n### Example 1\n**Input:**\n```\n5\nPUSH 10\nPUSH 20\nPUSH 30\nPOP\nPOP\n```\n**Output:**\n```\n30\n20\nFINAL: SIZE=1 CAPACITY=2\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    int q;\n    if (scanf(\"%d\", &q) != 1) return 0;\n    // Dynamic vector simulation\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    int q;\n    if (scanf(\"%d\", &q) != 1) return 0;\n    \n    int capacity = 2;\n    int size = 0;\n    int *arr = (int *)malloc(capacity * sizeof(int));\n    \n    char op[16];\n    for (int k = 0; k < q; k++) {\n        scanf(\"%s\", op);\n        if (strcmp(op, \"PUSH\") == 0) {\n            int val;\n            scanf(\"%d\", &val);\n            if (size == capacity) {\n                capacity *= 2;\n                arr = (int *)realloc(arr, capacity * sizeof(int));\n            }\n            arr[size++] = val;\n        } else if (strcmp(op, \"POP\") == 0) {\n            if (size > 0) {\n                int popped = arr[--size];\n                printf(\"%d\\n\", popped);\n                if (size > 0 && size == capacity / 4 && capacity > 2) {\n                    capacity /= 2;\n                    arr = (int *)realloc(arr, capacity * sizeof(int));\n                }\n            }\n        }\n    }\n    \n    printf(\"FINAL: SIZE=%d CAPACITY=%d\\n\", size, capacity);\n    free(arr);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 12,
      "chapterTitle": "Dynamic Memory Allocation",
      "chapterOrder": 12,
      "section": "Realloc Geometric Resizing",
      "exerciseNumber": "12.4",
      "exerciseOrder": 4,
      "page": 171,
      "concept": "Amortized vector growth and capacity contraction with realloc",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\nPUSH 10\nPUSH 20\nPUSH 30\nPOP\nPOP\n",
        "expectedOutput": "30\n20\nFINAL: SIZE=1 CAPACITY=2\n"
      },
      {
        "input": "3\nPUSH 1\nPUSH 2\nPUSH 3\n",
        "expectedOutput": "FINAL: SIZE=3 CAPACITY=4\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "6\nPUSH 5\nPUSH 6\nPUSH 7\nPUSH 8\nPUSH 9\nPOP\n",
        "expectedOutput": "9\nFINAL: SIZE=4 CAPACITY=8\n"
      },
      {
        "input": "2\nPUSH 100\nPOP\n",
        "expectedOutput": "100\nFINAL: SIZE=0 CAPACITY=2\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch12-dynamic-2d-matrix-flatten",
    "title": "Dynamic 2D Contiguous Matrix & Row Flattening",
    "difficulty": "EASY",
    "category": "Dynamic Memory Allocation",
    "tags": [
      "Pointers",
      "Memory",
      "2D Arrays",
      "Allocation"
    ],
    "description": "### Problem Description\nAllocating a 2D matrix dynamically in C can be achieved either as an array of pointers (`int **`) or as a single contiguous 1D block (`int *`) indexed using `row * cols + col` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 12).\n\nGiven matrix dimensions $R$ and $C$ and its elements:\n1. Allocate memory dynamically.\n2. Read the elements.\n3. Compute and print the sum of each row.\n4. Compute and print the sum of each column.\n5. Free all allocated memory cleanly.\n\n### Input Format\n- First line: two integers $R$ and $C$ ($1 le R, C le 50$).\n- Next $R$ lines: $C$ integers per line.\n\n### Output Format\n- Line 1: `ROW_SUMS: s1 s2 ... sR`\n- Line 2: `COL_SUMS: c1 c2 ... cC`\n\n### Example 1\n**Input:**\n```\n2 3\n1 2 3\n4 5 6\n```\n**Output:**\n```\nROW_SUMS: 6 15\nCOL_SUMS: 5 7 9\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    // Dynamic allocation and sums\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    \n    int *matrix = (int *)malloc(r * c * sizeof(int));\n    for (int i = 0; i < r * c; i++) {\n        scanf(\"%d\", &matrix[i]);\n    }\n    \n    printf(\"ROW_SUMS:\");\n    for (int i = 0; i < r; i++) {\n        int sum = 0;\n        for (int j = 0; j < c; j++) {\n            sum += matrix[i * c + j];\n        }\n        printf(\" %d\", sum);\n    }\n    printf(\"\\n\");\n    \n    printf(\"COL_SUMS:\");\n    for (int j = 0; j < c; j++) {\n        int sum = 0;\n        for (int i = 0; i < r; i++) {\n            sum += matrix[i * c + j];\n        }\n        printf(\" %d\", sum);\n    }\n    printf(\"\\n\");\n    \n    free(matrix);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 12,
      "chapterTitle": "Dynamic Memory Allocation",
      "chapterOrder": 12,
      "section": "2D Arrays and Pointers",
      "exerciseNumber": "12.8",
      "exerciseOrder": 8,
      "page": 174,
      "concept": "Single contiguous dynamic allocation vs row pointer indirection",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2 3\n1 2 3\n4 5 6\n",
        "expectedOutput": "ROW_SUMS: 6 15\nCOL_SUMS: 5 7 9\n"
      },
      {
        "input": "1 1\n42\n",
        "expectedOutput": "ROW_SUMS: 42\nCOL_SUMS: 42\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3 2\n10 20\n30 40\n50 60\n",
        "expectedOutput": "ROW_SUMS: 30 70 110\nCOL_SUMS: 90 120\n"
      },
      {
        "input": "2 2\n-1 1\n1 -1\n",
        "expectedOutput": "ROW_SUMS: 0 0\nCOL_SUMS: 0 0\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-linked-list-tail-insert",
    "title": "Singly Linked List Tail Insertion & Traversal",
    "difficulty": "EASY",
    "category": "Linked Lists",
    "tags": [
      "Linked List",
      "Pointers",
      "Data Structures"
    ],
    "description": "### Problem Description\nA singly linked list consists of self-referential structures chained by pointers (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13: Linked Lists).\n\n```c\nstruct Node {\n    int data;\n    struct Node *next;\n};\n```\n\nGiven $N$ integers, build the linked list by inserting each element at the tail, keeping track of the tail pointer for $O(1)$ insertions. Then traverse the list and print all nodes in sequence, followed by freeing all dynamically allocated nodes.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 100$).\n- Second line: $N$ space-separated integers.\n\n### Output Format\n- Print the list nodes in format: `HEAD -> n1 -> n2 -> ... -> NULL`\n- Final line: `COUNT: N`\n\n### Example 1\n**Input:**\n```\n4\n10 20 30 40\n```\n**Output:**\n```\nHEAD -> 10 -> 20 -> 30 -> 40 -> NULL\nCOUNT: 4\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node {\n    int data;\n    struct Node *next;\n};\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Build and traverse linked list\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node *next;\n} Node;\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    Node *head = NULL;\n    Node *tail = NULL;\n    int count = 0;\n    \n    for (int i = 0; i < n; i++) {\n        int val;\n        scanf(\"%d\", &val);\n        Node *newNode = (Node *)malloc(sizeof(Node));\n        newNode->data = val;\n        newNode->next = NULL;\n        \n        if (!head) {\n            head = tail = newNode;\n        } else {\n            tail->next = newNode;\n            tail = newNode;\n        }\n        count++;\n    }\n    \n    printf(\"HEAD\");\n    Node *curr = head;\n    while (curr) {\n        printf(\" -> %d\", curr->data);\n        curr = curr->next;\n    }\n    printf(\" -> NULL\\n\");\n    printf(\"COUNT: %d\\n\", count);\n    \n    // Free list\n    curr = head;\n    while (curr) {\n        Node *next = curr->next;\n        free(curr);\n        curr = next;\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists",
      "chapterOrder": 13,
      "section": "Node Insertion",
      "exerciseNumber": "13.2",
      "exerciseOrder": 2,
      "page": 182,
      "concept": "Self-referential structure node allocation and pointer chaining",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n10 20 30 40\n",
        "expectedOutput": "HEAD -> 10 -> 20 -> 30 -> 40 -> NULL\nCOUNT: 4\n"
      },
      {
        "input": "1\n99\n",
        "expectedOutput": "HEAD -> 99 -> NULL\nCOUNT: 1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "HEAD -> 1 -> 2 -> 3 -> 4 -> 5 -> NULL\nCOUNT: 5\n"
      },
      {
        "input": "3\n-5 0 5\n",
        "expectedOutput": "HEAD -> -5 -> 0 -> 5 -> NULL\nCOUNT: 3\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-linked-list-reverse-inplace",
    "title": "In-Place Pointer Reversal of Singly Linked List",
    "difficulty": "EASY",
    "category": "Linked Lists",
    "tags": [
      "Linked List",
      "Pointers",
      "In-Place"
    ],
    "description": "### Problem Description\nReversing a singly linked list in-place by rewiring `next` pointers without allocating new nodes or using additional memory is a classical C pointer puzzle (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\nUsing three pointers:\n- `prev = NULL`\n- `curr = head`\n- `next = NULL`\n\nIteratively reverse the links and return the new head of the reversed list.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 100$).\n- Second line: $N$ integers.\n\n### Output Format\nPrint the reversed list in format: `REVERSED: n1 -> n2 -> ... -> NULL`.\n\n### Example 1\n**Input:**\n```\n4\n1 2 3 4\n```\n**Output:**\n```\nREVERSED: 4 -> 3 -> 2 -> 1 -> NULL\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node {\n    int data;\n    struct Node *next;\n};\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // In-place pointer reversal\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node *next;\n} Node;\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    Node *head = NULL, *tail = NULL;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        Node *node = (Node *)malloc(sizeof(Node));\n        node->data = v;\n        node->next = NULL;\n        if (!head) head = tail = node;\n        else { tail->next = node; tail = node; }\n    }\n    \n    // In-place reverse\n    Node *prev = NULL;\n    Node *curr = head;\n    while (curr) {\n        Node *nxt = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = nxt;\n    }\n    head = prev;\n    \n    printf(\"REVERSED:\");\n    curr = head;\n    while (curr) {\n        printf(\" %d ->\", curr->data);\n        curr = curr->next;\n    }\n    printf(\" NULL\\n\");\n    \n    // Cleanup\n    curr = head;\n    while (curr) {\n        Node *nxt = curr->next;\n        free(curr);\n        curr = nxt;\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists",
      "chapterOrder": 13,
      "section": "List Reversal",
      "exerciseNumber": "13.6",
      "exerciseOrder": 6,
      "page": 185,
      "concept": "Three-pointer in-place linked list reversal algorithm",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "REVERSED: 4 -> 3 -> 2 -> 1 -> NULL\n"
      },
      {
        "input": "1\n100\n",
        "expectedOutput": "REVERSED: 100 -> NULL\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n10 20\n",
        "expectedOutput": "REVERSED: 20 -> 10 -> NULL\n"
      },
      {
        "input": "5\n5 4 3 2 1\n",
        "expectedOutput": "REVERSED: 1 -> 2 -> 3 -> 4 -> 5 -> NULL\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-linked-list-detect-cycle",
    "title": "Floyd's Cycle Detection Algorithm (Tortoise & Hare)",
    "difficulty": "MEDIUM",
    "category": "Linked Lists",
    "tags": [
      "Linked List",
      "Pointers",
      "Cycle Detection",
      "Floyd"
    ],
    "description": "### Problem Description\nA classic problem in pointer-based linked structures is detecting whether the list contains an infinite cycle without modifying the node structure (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\nUsing Floyd's cycle-finding algorithm:\n- `slow` pointer advances 1 step at a time.\n- `fast` pointer advances 2 steps at a time.\n- If they meet, a cycle exists. If `fast` reaches NULL, no cycle exists.\n\nGiven a list of $N$ nodes (0-indexed: $0$ to $N-1$) and a connection target index $C$ for the tail node (where $-1$ means tail points to NULL, and $0 le C < N$ means tail points back to node $C$):\n1. Detect whether a cycle exists.\n2. If a cycle exists, identify the 0-based index of the node where the cycle begins.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 1000$).\n- Second line: $N$ integers (node values).\n- Third line: integer $C$ ($-1 le C < N$).\n\n### Output Format\n- If cycle detected: `CYCLE DETECTED AT NODE INDEX %d (VAL=%d)`\n- If no cycle: `NO CYCLE (LINEAR LIST)`\n\n### Example 1\n**Input:**\n```\n4\n10 20 30 40\n1\n```\n**Output:**\n```\nCYCLE DETECTED AT NODE INDEX 1 (VAL=20)\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node {\n    int data;\n    int index;\n    struct Node *next;\n};\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Detect cycle using Floyd's algorithm\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    int index;\n    struct Node *next;\n} Node;\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    Node **nodes = (Node **)malloc(n * sizeof(Node *));\n    for (int i = 0; i < n; i++) {\n        nodes[i] = (Node *)malloc(sizeof(Node));\n        scanf(\"%d\", &nodes[i]->data);\n        nodes[i]->index = i;\n        nodes[i]->next = NULL;\n        if (i > 0) nodes[i - 1]->next = nodes[i];\n    }\n    \n    int c;\n    scanf(\"%d\", &c);\n    if (c != -1 && c < n) {\n        nodes[n - 1]->next = nodes[c];\n    }\n    \n    Node *slow = nodes[0];\n    Node *fast = nodes[0];\n    int has_cycle = 0;\n    \n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n        if (slow == fast) {\n            has_cycle = 1;\n            break;\n        }\n    }\n    \n    if (!has_cycle) {\n        printf(\"NO CYCLE (LINEAR LIST)\\n\");\n    } else {\n        // Find cycle start\n        Node *p1 = nodes[0];\n        Node *p2 = slow;\n        while (p1 != p2) {\n            p1 = p1->next;\n            p2 = p2->next;\n        }\n        printf(\"CYCLE DETECTED AT NODE INDEX %d (VAL=%d)\\n\", p1->index, p1->data);\n    }\n    \n    for (int i = 0; i < n; i++) free(nodes[i]);\n    free(nodes);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists",
      "chapterOrder": 13,
      "section": "Cycle Detection",
      "exerciseNumber": "13.11",
      "exerciseOrder": 11,
      "page": 189,
      "concept": "Floyd's cycle-finding tortoise and hare algorithm with start detection",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n10 20 30 40\n1\n",
        "expectedOutput": "CYCLE DETECTED AT NODE INDEX 1 (VAL=20)\n"
      },
      {
        "input": "3\n1 2 3\n-1\n",
        "expectedOutput": "NO CYCLE (LINEAR LIST)\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n42\n0\n",
        "expectedOutput": "CYCLE DETECTED AT NODE INDEX 0 (VAL=42)\n"
      },
      {
        "input": "5\n10 20 30 40 50\n4\n",
        "expectedOutput": "CYCLE DETECTED AT NODE INDEX 4 (VAL=50)\n"
      },
      {
        "input": "2\n100 200\n-1\n",
        "expectedOutput": "NO CYCLE (LINEAR LIST)\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-linked-list-merge-sorted",
    "title": "Merge Two Sorted Linked Lists In-Place",
    "difficulty": "EASY",
    "category": "Linked Lists",
    "tags": [
      "Linked List",
      "Pointers",
      "Merge",
      "Sorting"
    ],
    "description": "### Problem Description\nGiven two sorted singly linked lists, splice them together into a single sorted list by rearranging the existing node `next` pointers without allocating new nodes (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\n### Input Format\n- First line: integer $N$ ($0 le N le 100$) followed by $N$ sorted integers.\n- Second line: integer $M$ ($0 le M le 100$) followed by $M$ sorted integers.\n\n### Output Format\nPrint the merged list in format: `MERGED: v1 -> v2 -> ... -> NULL`\nIf both lists are empty, print `MERGED: NULL`.\n\n### Example 1\n**Input:**\n```\n3 1 3 5\n3 2 4 6\n```\n**Output:**\n```\nMERGED: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> NULL\n```",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node {\n    int data;\n    struct Node *next;\n};\n\nint main() {\n    // Read and merge sorted lists\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node *next;\n} Node;\n\nNode *createList(int count) {\n    if (count <= 0) return NULL;\n    Node *head = NULL, *tail = NULL;\n    for (int i = 0; i < count; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        Node *n = (Node *)malloc(sizeof(Node));\n        n->data = v;\n        n->next = NULL;\n        if (!head) head = tail = n;\n        else { tail->next = n; tail = n; }\n    }\n    return head;\n}\n\nint main() {\n    int n, m;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    Node *l1 = createList(n);\n    if (scanf(\"%d\", &m) != 1) return 0;\n    Node *l2 = createList(m);\n    \n    Node dummy;\n    dummy.next = NULL;\n    Node *tail = &dummy;\n    \n    while (l1 && l2) {\n        if (l1->data <= l2->data) {\n            tail->next = l1;\n            l1 = l1->next;\n        } else {\n            tail->next = l2;\n            l2 = l2->next;\n        }\n        tail = tail->next;\n    }\n    tail->next = l1 ? l1 : l2;\n    \n    printf(\"MERGED:\");\n    Node *curr = dummy.next;\n    if (!curr) {\n        printf(\" NULL\\n\");\n    } else {\n        while (curr) {\n            printf(\" %d ->\", curr->data);\n            curr = curr->next;\n        }\n        printf(\" NULL\\n\");\n    }\n    \n    curr = dummy.next;\n    while (curr) {\n        Node *nxt = curr->next;\n        free(curr);\n        curr = nxt;\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists",
      "chapterOrder": 13,
      "section": "Merge Operations",
      "exerciseNumber": "13.15",
      "exerciseOrder": 15,
      "page": 192,
      "concept": "Dummy sentinel node splicing for in-place sorted list merge",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 1 3 5\n3 2 4 6\n",
        "expectedOutput": "MERGED: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> NULL\n"
      },
      {
        "input": "1 10\n0\n",
        "expectedOutput": "MERGED: 10 -> NULL\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n0\n",
        "expectedOutput": "MERGED: NULL\n"
      },
      {
        "input": "2 2 4\n3 1 3 5\n",
        "expectedOutput": "MERGED: 1 -> 2 -> 3 -> 4 -> 5 -> NULL\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-stack-bracket-matcher",
    "title": "Array Stack Balanced Delimiter Validator",
    "difficulty": "EASY",
    "category": "Stacks and Queues",
    "tags": [
      "Stack",
      "Arrays",
      "Parsing",
      "Data Structures"
    ],
    "description": "### Problem Description\nA stack is a Last-In First-Out (LIFO) abstract data type implemented using an array and a top index in C (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\nGiven a string containing delimiters `()`, `[]`, `{}`, along with other characters:\nUse an explicit stack implementation to check if all delimiters are balanced and properly nested.\nPrint:\n- `BALANCED (STACK_DEPTH=%d)` with maximum depth reached, if valid.\n- `UNBALANCED: EXPECTED '%c' BUT FOUND '%c'` or `UNBALANCED: UNCLOSED '%c'` or `UNBALANCED: UNMATCHED CLOSING '%c'`.\n\n### Input Format\n- A single line string (length ≤ 200).\n\n### Output Format\n- Single line validation message.\n\n### Example 1\n**Input:**\n```\nint a[10] = { (1 + 2) * 3 };\n```\n**Output:**\n```\nBALANCED (MAX_DEPTH=3)\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[256];\n    if (!fgets(str, sizeof(str), stdin)) return 0;\n    // Validate delimiters using stack\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[256];\n    if (!fgets(str, sizeof(str), stdin)) return 0;\n    \n    char stack[256];\n    int top = -1;\n    int max_depth = 0;\n    \n    for (int i = 0; str[i]; i++) {\n        char ch = str[i];\n        if (ch == '(' || ch == '[' || ch == '{') {\n            stack[++top] = ch;\n            if (top + 1 > max_depth) max_depth = top + 1;\n        } else if (ch == ')' || ch == ']' || ch == '}') {\n            if (top == -1) {\n                printf(\"UNBALANCED: UNMATCHED CLOSING '%c'\\n\", ch);\n                return 0;\n            }\n            char open = stack[top--];\n            char expected = (open == '(') ? ')' : (open == '[') ? ']' : '}';\n            if (ch != expected) {\n                printf(\"UNBALANCED: EXPECTED '%c' BUT FOUND '%c'\\n\", expected, ch);\n                return 0;\n            }\n        }\n    }\n    \n    if (top != -1) {\n        printf(\"UNBALANCED: UNCLOSED '%c'\\n\", stack[top]);\n    } else {\n        printf(\"BALANCED (MAX_DEPTH=%d)\\n\", max_depth);\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists and Stacks",
      "chapterOrder": 13,
      "section": "Stack Applications",
      "exerciseNumber": "13.19",
      "exerciseOrder": 19,
      "page": 195,
      "concept": "Array-based stack push/pop tracking for syntax validation",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "int a[10] = { (1 + 2) * 3 };\n",
        "expectedOutput": "BALANCED (MAX_DEPTH=3)\n"
      },
      {
        "input": "foo(bar[i);\n",
        "expectedOutput": "UNBALANCED: EXPECTED ']' BUT FOUND ')'\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "((()))\n",
        "expectedOutput": "BALANCED (MAX_DEPTH=3)\n"
      },
      {
        "input": "(\n",
        "expectedOutput": "UNBALANCED: UNCLOSED '('\n"
      },
      {
        "input": ")\n",
        "expectedOutput": "UNBALANCED: UNMATCHED CLOSING ')'\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-stack-rpn-evaluator",
    "title": "Postfix Reverse Polish Notation (RPN) Stack Evaluator",
    "difficulty": "EASY",
    "category": "Stacks and Queues",
    "tags": [
      "Stack",
      "RPN",
      "Postfix",
      "Math"
    ],
    "description": "### Problem Description\nEvaluating an arithmetic expression written in Reverse Polish Notation (Postfix) is performed using an operand stack (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\nIn RPN:\n- When a number is encountered, push it onto the stack.\n- When an operator (`+`, `-`, `*`, `/`) is encountered, pop the top two operands:\n  - `op2 = pop()`\n  - `op1 = pop()`\n  - compute `result = op1 [operator] op2`\n  - push `result` back onto the stack.\n\nGiven a space-separated string of tokens representing an RPN expression:\nEvaluate and print the final integer result. Division is integer truncation division.\n\n### Input Format\n- A single line containing space-separated tokens ending with a newline.\n\n### Output Format\n- Print `RESULT: %d`\n\n### Example 1\n**Input:**\n```\n10 4 3 + 2 * -\n```\n**Output:**\n```\nRESULT: -4\n```\n*Explanation: (4 + 3) = 7; 7 * 2 = 14; 10 - 14 = -4.*",
    "starterCode": "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    char line[512];\n    if (!fgets(line, sizeof(line), stdin)) return 0;\n    // Evaluate RPN expression\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    char line[512];\n    if (!fgets(line, sizeof(line), stdin)) return 0;\n    \n    int stack[256];\n    int top = -1;\n    \n    char *token = strtok(line, \" \\t\\r\\n\");\n    while (token) {\n        if (strcmp(token, \"+\") == 0) {\n            int b = stack[top--];\n            int a = stack[top--];\n            stack[++top] = a + b;\n        } else if (strcmp(token, \"-\") == 0) {\n            int b = stack[top--];\n            int a = stack[top--];\n            stack[++top] = a - b;\n        } else if (strcmp(token, \"*\") == 0) {\n            int b = stack[top--];\n            int a = stack[top--];\n            stack[++top] = a * b;\n        } else if (strcmp(token, \"/\") == 0) {\n            int b = stack[top--];\n            int a = stack[top--];\n            stack[++top] = a / b;\n        } else {\n            stack[++top] = atoi(token);\n        }\n        token = strtok(NULL, \" \\t\\r\\n\");\n    }\n    \n    printf(\"RESULT: %d\\n\", stack[top]);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Linked Lists and Stacks",
      "chapterOrder": 13,
      "section": "Stack Expression Evaluation",
      "exerciseNumber": "13.23",
      "exerciseOrder": 23,
      "page": 198,
      "concept": "RPN postfix arithmetic evaluation using an operand stack",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "10 4 3 + 2 * -\n",
        "expectedOutput": "RESULT: -4\n"
      },
      {
        "input": "15 7 1 1 + - / 3 * 2 1 1 + + -\n",
        "expectedOutput": "RESULT: 5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "5 3 +\n",
        "expectedOutput": "RESULT: 8\n"
      },
      {
        "input": "20 4 /\n",
        "expectedOutput": "RESULT: 5\n"
      },
      {
        "input": "100\n",
        "expectedOutput": "RESULT: 100\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch13-circular-queue-ringbuffer",
    "title": "Circular Queue Ring Buffer with Wrap-Around Logic",
    "difficulty": "MEDIUM",
    "category": "Stacks and Queues",
    "tags": [
      "Queue",
      "Ring Buffer",
      "Modulo",
      "Data Structures"
    ],
    "description": "### Problem Description\nA Circular Queue (Ring Buffer) avoids element shifting by advancing `front` and `rear` indices modulo buffer capacity $C$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 13).\n\nSpecifications:\n- Capacity $C$ represents the fixed size of the underlying array.\n- Current count tracks number of elements ($0 le count le C$).\n- `ENQUEUE x`: If $count == C$, output `OVERFLOW`. Otherwise store $x$ at $rear$, advance $rear = (rear + 1) pmod C$, increment $count$.\n- `DEQUEUE`: If $count == 0$, output `UNDERFLOW`. Otherwise retrieve element at $front$, advance $front = (front + 1) pmod C$, decrement $count$, and print the value.\n\nGiven $C$ and $M$ operations:\nProcess all commands and output the result of each operation.\n\n### Input Format\n- First line: capacity $C$ ($1 le C le 100$) and operation count $M$ ($1 le M le 500$).\n- Next $M$ lines: either `ENQUEUE <val>` or `DEQUEUE`.\n\n### Output Format\nPrint the output of each command on a separate line (`OVERFLOW`, `UNDERFLOW`, or the dequeued integer).\n\n### Example 1\n**Input:**\n```\n3 6\nENQUEUE 10\nENQUEUE 20\nENQUEUE 30\nENQUEUE 40\nDEQUEUE\nDEQUEUE\n```\n**Output:**\n```\nOVERFLOW\n10\n20\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int c, m;\n    if (scanf(\"%d %d\", &c, &m) != 2) return 0;\n    // Circular queue simulation\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int c, m;\n    if (scanf(\"%d %d\", &c, &m) != 2) return 0;\n    \n    int queue[105];\n    int front = 0;\n    int rear = 0;\n    int count = 0;\n    \n    char op[16];\n    for (int k = 0; k < m; k++) {\n        scanf(\"%s\", op);\n        if (strcmp(op, \"ENQUEUE\") == 0) {\n            int val;\n            scanf(\"%d\", &val);\n            if (count == c) {\n                printf(\"OVERFLOW\\n\");\n            } else {\n                queue[rear] = val;\n                rear = (rear + 1) % c;\n                count++;\n            }\n        } else if (strcmp(op, \"DEQUEUE\") == 0) {\n            if (count == 0) {\n                printf(\"UNDERFLOW\\n\");\n            } else {\n                int val = queue[front];\n                front = (front + 1) % c;\n                count--;\n                printf(\"%d\\n\", val);\n            }\n        }\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 13,
      "chapterTitle": "Queues",
      "chapterOrder": 13,
      "section": "Circular Queue",
      "exerciseNumber": "13.28",
      "exerciseOrder": 28,
      "page": 201,
      "concept": "Circular buffer wrap-around indexing using modulo arithmetic",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 6\nENQUEUE 10\nENQUEUE 20\nENQUEUE 30\nENQUEUE 40\nDEQUEUE\nDEQUEUE\n",
        "expectedOutput": "OVERFLOW\n10\n20\n"
      },
      {
        "input": "2 3\nDEQUEUE\nENQUEUE 5\nDEQUEUE\n",
        "expectedOutput": "UNDERFLOW\n5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2 5\nENQUEUE 1\nENQUEUE 2\nDEQUEUE\nENQUEUE 3\nDEQUEUE\n",
        "expectedOutput": "1\n2\n"
      },
      {
        "input": "1 3\nENQUEUE 9\nENQUEUE 10\nDEQUEUE\n",
        "expectedOutput": "OVERFLOW\n9\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-macro-side-effect-trap",
    "title": "Macro Expansion Side Effects vs Inline Function Simulator",
    "difficulty": "EASY",
    "category": "The Preprocessor",
    "tags": [
      "Preprocessor",
      "Macros",
      "Side Effects"
    ],
    "description": "### Problem Description\nA classic pitfall in C occurs when macros evaluate their arguments multiple times, causing unexpected side effects with increment (`++`) operators (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: The Preprocessor).\n\nGiven the macro:\n```c\n#define SQUARE(x) ((x) * (x))\n```\nAnd a function:\n```c\nint square_func(int x) { return x * x; }\n```\n\nIf a variable $A$ is passed as `SQUARE(++a)`, $A$ is incremented twice:\n- First evaluation increments $A$.\n- Second evaluation increments $A$ again.\nWhereas `square_func(++b)` increments $B$ exactly once before passing the value to the function.\n\nGiven an initial integer $X$, trace and output:\n1. The result of `square_func(++b)` and the final value of $B$.\n2. The simulated expansion of `((++a) * (++a))` in standard sequence and the final value of $A$.\n\n### Input Format\n- A single integer $X$ ($-100 le X le 100$).\n\n### Output Format\n- Line 1: `FUNC: RESULT=%d FINAL_VAR=%d`\n- Line 2: `MACRO: RESULT=%d FINAL_VAR=%d`\n\n### Example 1\n**Input:**\n```\n5\n```\n**Output:**\n```\nFUNC: RESULT=36 FINAL_VAR=6\nMACRO: RESULT=49 FINAL_VAR=7\n```",
    "starterCode": "#include <stdio.h>\n\nint square_func(int x) {\n    return x * x;\n}\n\nint main() {\n    int x;\n    if (scanf(\"%d\", &x) != 1) return 0;\n    // Trace func vs macro expansion\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint square_func(int x) {\n    return x * x;\n}\n\nint main() {\n    int x;\n    if (scanf(\"%d\", &x) != 1) return 0;\n    \n    // Func: b incremented once\n    int b = x;\n    b++;\n    int func_res = square_func(b);\n    \n    // Macro: a incremented twice:\n    // a1 = x + 1, a2 = x + 2, result = a2 * a2 (as in ((++a) * (++a)))\n    int a = x;\n    a++; // first ++\n    a++; // second ++\n    int macro_res = a * a;\n    \n    printf(\"FUNC: RESULT=%d FINAL_VAR=%d\\n\", func_res, b);\n    printf(\"MACRO: RESULT=%d FINAL_VAR=%d\\n\", macro_res, a);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 7,
      "chapterTitle": "The Preprocessor",
      "chapterOrder": 7,
      "section": "Macro Traps",
      "exerciseNumber": "7.3",
      "exerciseOrder": 3,
      "page": 95,
      "concept": "Repeated argument evaluation side-effects in parameterized macros",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\n",
        "expectedOutput": "FUNC: RESULT=36 FINAL_VAR=6\nMACRO: RESULT=49 FINAL_VAR=7\n"
      },
      {
        "input": "0\n",
        "expectedOutput": "FUNC: RESULT=1 FINAL_VAR=1\nMACRO: RESULT=4 FINAL_VAR=2\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "10\n",
        "expectedOutput": "FUNC: RESULT=121 FINAL_VAR=11\nMACRO: RESULT=144 FINAL_VAR=12\n"
      },
      {
        "input": "-3\n",
        "expectedOutput": "FUNC: RESULT=4 FINAL_VAR=-2\nMACRO: RESULT=1 FINAL_VAR=-1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-stringizing-token-pasting",
    "title": "Preprocessor Stringizing (#) and Token-Pasting (##) Engine",
    "difficulty": "EASY",
    "category": "The Preprocessor",
    "tags": [
      "Preprocessor",
      "Stringizing",
      "Token Pasting"
    ],
    "description": "### Problem Description\nThe C preprocessor provides two special operators (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7):\n1. **Stringizing Operator (`#`)**: Converts an identifier or expression into a string literal (surrounded by double quotes).\n2. **Token-Pasting Operator (`##`)**: Merges two separate tokens into a single valid C identifier.\n\nSimulate a preprocessor code generator:\nGiven a prefix string $P$ and an integer identifier $K$, along with a value $V$:\n1. Generate the concatenated variable identifier `P##K` (e.g. `sensor_##1` -> `sensor_1`).\n2. Generate the stringized log expression `#P##K` -> `\"sensor_1\"`.\n3. Format and print the simulated declaration: `int <identifier> = <value>; // Var name: \"<identifier>\"`.\n\n### Input Format\n- A single line containing: prefix $P$ (alphanumeric string), integer $K$, and integer value $V$.\n\n### Output Format\nPrint: `DECLARATION: int %s%d = %d; [NAME: \"%s%d\"]`\n\n### Example 1\n**Input:**\n```\nsensor_ 42 1080\n```\n**Output:**\n```\nDECLARATION: int sensor_42 = 1080; [NAME: \"sensor_42\"]\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    char p[64];\n    int k, v;\n    if (scanf(\"%s %d %d\", p, &k, &v) != 3) return 0;\n    // Preprocessor token generation\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    char p[64];\n    int k, v;\n    if (scanf(\"%s %d %d\", p, &k, &v) != 3) return 0;\n    \n    printf(\"DECLARATION: int %s%d = %d; [NAME: \\\"%s%d\\\"]\\n\", p, k, v, p, k);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 7,
      "chapterTitle": "The Preprocessor",
      "chapterOrder": 7,
      "section": "Stringizing and Token Pasting",
      "exerciseNumber": "7.8",
      "exerciseOrder": 8,
      "page": 99,
      "concept": "Token-pasting operator ## and stringizing operator #",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "sensor_ 42 1080\n",
        "expectedOutput": "DECLARATION: int sensor_42 = 1080; [NAME: \"sensor_42\"]\n"
      },
      {
        "input": "var 1 10\n",
        "expectedOutput": "DECLARATION: int var1 = 10; [NAME: \"var1\"]\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "temp_reading_ 7 98\n",
        "expectedOutput": "DECLARATION: int temp_reading_7 = 98; [NAME: \"temp_reading_7\"]\n"
      },
      {
        "input": "reg 0 0\n",
        "expectedOutput": "DECLARATION: int reg0 = 0; [NAME: \"reg0\"]\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-conditional-compilation-sim",
    "title": "Conditional Compilation Directive (#ifdef/#else) Evaluator",
    "difficulty": "EASY",
    "category": "The Preprocessor",
    "tags": [
      "Preprocessor",
      "Directives",
      "Conditional"
    ],
    "description": "### Problem Description\nConditional compilation directives (`#ifdef`, `#ifndef`, `#elif`, `#endif`) permit cross-platform builds and feature toggling without code duplication (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7).\n\nSimulate a conditional compilation evaluator:\nA build configuration defines a set of active macro symbols (e.g. `DEBUG`, `PLATFORM_LINUX`, `OPT_LEVEL_3`).\nGiven:\n- A list of $M$ defined macro symbols.\n- A target code block guarded by `#ifdef <SYMBOL>` or `#ifndef <SYMBOL>`.\n\nDetermine whether the guarded code block is **INCLUDED** or **EXCLUDED** in the compiled binary.\n\n### Input Format\n- First line: integer $M$ ($0 le M le 20$).\n- Second line: $M$ space-separated macro names (or empty line if $M = 0$).\n- Third line: Directive (`IFDEF` or `IFNDEF`) followed by the macro symbol name.\n\n### Output Format\n- Print `BINARY STATUS: INCLUDED` or `BINARY STATUS: EXCLUDED`\n\n### Example 1\n**Input:**\n```\n2\nDEBUG LOG_VERBOSE\nIFDEF DEBUG\n```\n**Output:**\n```\nBINARY STATUS: INCLUDED\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int m;\n    if (scanf(\"%d\", &m) != 1) return 0;\n    // Conditional compilation simulation\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int m;\n    if (scanf(\"%d\", &m) != 1) return 0;\n    \n    char macros[30][64];\n    for (int i = 0; i < m; i++) {\n        scanf(\"%s\", macros[i]);\n    }\n    \n    char directive[16], symbol[64];\n    scanf(\"%s %s\", directive, symbol);\n    \n    int is_defined = 0;\n    for (int i = 0; i < m; i++) {\n        if (strcmp(macros[i], symbol) == 0) {\n            is_defined = 1;\n            break;\n        }\n    }\n    \n    int included = 0;\n    if (strcmp(directive, \"IFDEF\") == 0) {\n        included = is_defined;\n    } else if (strcmp(directive, \"IFNDEF\") == 0) {\n        included = !is_defined;\n    }\n    \n    printf(\"BINARY STATUS: %s\\n\", included ? \"INCLUDED\" : \"EXCLUDED\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 7,
      "chapterTitle": "The Preprocessor",
      "chapterOrder": 7,
      "section": "Conditional Compilation",
      "exerciseNumber": "7.12",
      "exerciseOrder": 12,
      "page": 103,
      "concept": "Header guards and conditional inclusion flags",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2\nDEBUG LOG_VERBOSE\nIFDEF DEBUG\n",
        "expectedOutput": "BINARY STATUS: INCLUDED\n"
      },
      {
        "input": "1\nRELEASE\nIFNDEF RELEASE\n",
        "expectedOutput": "BINARY STATUS: EXCLUDED\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n\nIFDEF ENABLE_SSL\n",
        "expectedOutput": "BINARY STATUS: EXCLUDED\n"
      },
      {
        "input": "1\nTEST_MODE\nIFNDEF PRODUCTION\n",
        "expectedOutput": "BINARY STATUS: INCLUDED\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch14-file-io-word-char-counter",
    "title": "Text Stream Word, Line & Byte Metric Counter",
    "difficulty": "EASY",
    "category": "File Input/Output",
    "tags": [
      "File I/O",
      "Strings",
      "Parsing"
    ],
    "description": "### Problem Description\nStandard C file stream processing (`fgetc`, `fgets`) operates by reading streams byte by byte until `EOF` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14: File Input/Output).\n\nImplement the Unix `wc` utility core in C:\nRead text from standard input until `EOF` (or simulated input stream) and count:\n1. Total lines (count of `\\n` characters).\n2. Total words (sequences of non-whitespace characters delimited by spaces, tabs, or newlines).\n3. Total characters/bytes.\n\n### Input Format\n- Text input of multiple lines until EOF.\n\n### Output Format\n- Print `LINES: %d | WORDS: %d | BYTES: %d`\n\n### Example 1\n**Input:**\n```\nHello World\nLogicQ Platform\n```\n**Output:**\n```\nLINES: 2 | WORDS: 4 | BYTES: 28\n```",
    "starterCode": "#include <stdio.h>\n#include <ctype.h>\n\nint main() {\n    // Read stream to EOF and count lines, words, bytes\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <ctype.h>\n\nint main() {\n    int lines = 0, words = 0, bytes = 0;\n    int in_word = 0;\n    int ch;\n    \n    while ((ch = getchar()) != EOF) {\n        bytes++;\n        if (ch == '\\n') lines++;\n        if (isspace(ch)) {\n            in_word = 0;\n        } else {\n            if (!in_word) {\n                words++;\n                in_word = 1;\n            }\n        }\n    }\n    \n    printf(\"LINES: %d | WORDS: %d | BYTES: %d\\n\", lines, words, bytes);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 14,
      "chapterTitle": "File Input/Output",
      "chapterOrder": 14,
      "section": "Character-by-character File Processing",
      "exerciseNumber": "14.2",
      "exerciseOrder": 2,
      "page": 205,
      "concept": "EOF detection and stateful delimiter parsing in C streams",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "Hello World\nLogicQ Platform\n",
        "expectedOutput": "LINES: 2 | WORDS: 4 | BYTES: 28\n"
      },
      {
        "input": "Single line without newline",
        "expectedOutput": "LINES: 0 | WORDS: 4 | BYTES: 27\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "   \\t\\t   \n\n",
        "expectedOutput": "LINES: 2 | WORDS: 0 | BYTES: 12\n"
      },
      {
        "input": "C Programming\n",
        "expectedOutput": "LINES: 1 | WORDS: 2 | BYTES: 14\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch14-csv-column-sum-aggregator",
    "title": "CSV Record Stream Tokenizer and Column Aggregator",
    "difficulty": "EASY",
    "category": "File Input/Output",
    "tags": [
      "File I/O",
      "CSV",
      "Parsing",
      "Strings"
    ],
    "description": "### Problem Description\nParsing structured CSV data streams in C requires splitting records on comma boundaries while converting numerical fields (Yashavant Kanetkar, *Test Your C Skills*, Chapter 14).\n\nGiven $R$ lines of CSV text, where each row has exactly $C$ columns of integer values:\n1. Parse each row using string tokenization or formatted input.\n2. Calculate the column-wise sum for every column.\n3. Find the maximum value in each column.\n\n### Input Format\n- First line: integers $R$ and $C$ ($1 le R le 100, 1 le C le 20$).\n- Next $R$ lines: comma-separated integers (e.g. `10,20,30`).\n\n### Output Format\n- Line 1: `SUMS: <s1> <s2> ... <sC>`\n- Line 2: `MAXS: <m1> <m2> ... <mC>`\n\n### Example 1\n**Input:**\n```\n3 3\n10,20,30\n5,15,25\n1,2,3\n```\n**Output:**\n```\nSUMS: 16 37 58\nMAXS: 10 20 30\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    // Parse CSV rows and aggregate columns\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    \n    long long sums[25] = {0};\n    int maxs[25];\n    int init[25] = {0};\n    \n    for (int i = 0; i < r; i++) {\n        char line[512];\n        scanf(\"%s\", line);\n        \n        char *tok = strtok(line, \",\");\n        for (int j = 0; j < c && tok; j++) {\n            int val = atoi(tok);\n            sums[j] += val;\n            if (!init[j] || val > maxs[j]) {\n                maxs[j] = val;\n                init[j] = 1;\n            }\n            tok = strtok(NULL, \",\");\n        }\n    }\n    \n    printf(\"SUMS:\");\n    for (int j = 0; j < c; j++) printf(\" %lld\", sums[j]);\n    printf(\"\\n\");\n    \n    printf(\"MAXS:\");\n    for (int j = 0; j < c; j++) printf(\" %d\", maxs[j]);\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 14,
      "chapterTitle": "File Input/Output",
      "chapterOrder": 14,
      "section": "Delimited File Formats",
      "exerciseNumber": "14.8",
      "exerciseOrder": 8,
      "page": 209,
      "concept": "Comma-separated value record stream tokenization and parsing",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 3\n10,20,30\n5,15,25\n1,2,3\n",
        "expectedOutput": "SUMS: 16 37 58\nMAXS: 10 20 30\n"
      },
      {
        "input": "1 2\n100,-50\n",
        "expectedOutput": "SUMS: 100 -50\nMAXS: 100 -50\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2 1\n42\n58\n",
        "expectedOutput": "SUMS: 100\nMAXS: 58\n"
      },
      {
        "input": "3 2\n-10,-20\n-5,-15\n-1,-2\n",
        "expectedOutput": "SUMS: -16 -37\nMAXS: -1 -2\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch15-cli-arg-flag-parser",
    "title": "Command-Line Argument (argc/argv) Option Parser",
    "difficulty": "EASY",
    "category": "More in C",
    "tags": [
      "CLI",
      "Pointers",
      "Strings",
      "Arguments"
    ],
    "description": "### Problem Description\nCommand-line options in standard C are passed to `main` as an argument count (`argc`) and an array of string pointers (`argv`) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 15: More in C).\n\nSimulate a CLI flag parser:\nSupported flags:\n- `-v` or `--verbose`: Enables verbose mode (flag = 1).\n- `-o <filename>`: Specifies output filename.\n- `-p <port>`: Specifies integer port number (default = 8080).\n- Positional argument: input filename.\n\nGiven $N$ arguments simulating `argv[1..N]`:\nParse the flags and print the configured parameters.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 10$).\n- Second line: $N$ space-separated command-line tokens.\n\n### Output Format\n- Line 1: `VERBOSE: <ON/OFF>`\n- Line 2: `OUTPUT_FILE: <filename or NONE>`\n- Line 3: `PORT: <port>`\n- Line 4: `INPUT_FILE: <filename or NONE>`\n\n### Example 1\n**Input:**\n```\n4\n-v -o out.bin input.dat -p 9000\n```\n**Output:**\n```\nVERBOSE: ON\nOUTPUT_FILE: out.bin\nPORT: 9000\nINPUT_FILE: input.dat\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Parse simulated argc/argv\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    char args[20][128];\n    for (int i = 0; i < n; i++) {\n        scanf(\"%s\", args[i]);\n    }\n    \n    int verbose = 0;\n    char output_file[128] = \"NONE\";\n    char input_file[128] = \"NONE\";\n    int port = 8080;\n    \n    for (int i = 0; i < n; i++) {\n        if (strcmp(args[i], \"-v\") == 0 || strcmp(args[i], \"--verbose\") == 0) {\n            verbose = 1;\n        } else if (strcmp(args[i], \"-o\") == 0 && i + 1 < n) {\n            strcpy(output_file, args[++i]);\n        } else if (strcmp(args[i], \"-p\") == 0 && i + 1 < n) {\n            port = atoi(args[++i]);\n        } else if (args[i][0] != '-') {\n            strcpy(input_file, args[i]);\n        }\n    }\n    \n    printf(\"VERBOSE: %s\\n\", verbose ? \"ON\" : \"OFF\");\n    printf(\"OUTPUT_FILE: %s\\n\", output_file);\n    printf(\"PORT: %d\\n\", port);\n    printf(\"INPUT_FILE: %s\\n\", input_file);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 15,
      "chapterTitle": "More in C",
      "chapterOrder": 15,
      "section": "Command Line Arguments",
      "exerciseNumber": "15.3",
      "exerciseOrder": 3,
      "page": 218,
      "concept": "argc and argv string array pointer parsing patterns",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\n-v -o out.bin input.dat -p 9000\n",
        "expectedOutput": "VERBOSE: ON\nOUTPUT_FILE: out.bin\nPORT: 9000\nINPUT_FILE: input.dat\n"
      },
      {
        "input": "1\nmyfile.txt\n",
        "expectedOutput": "VERBOSE: OFF\nOUTPUT_FILE: NONE\nPORT: 8080\nINPUT_FILE: myfile.txt\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n--verbose -p 3000\n",
        "expectedOutput": "VERBOSE: ON\nOUTPUT_FILE: NONE\nPORT: 3000\nINPUT_FILE: NONE\n"
      },
      {
        "input": "2\n-o result.csv data.csv\n",
        "expectedOutput": "VERBOSE: OFF\nOUTPUT_FILE: result.csv\nPORT: 8080\nINPUT_FILE: data.csv\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch16-quicksort-lomuto-partition",
    "title": "Lomuto Partition Scheme for In-Place QuickSort",
    "difficulty": "EASY",
    "category": "Searching and Sorting",
    "tags": [
      "Sorting",
      "QuickSort",
      "Pointers",
      "Arrays"
    ],
    "description": "### Problem Description\nQuickSort relies on a partitioning procedure to arrange elements such that all values smaller than or equal to the pivot appear before it, and all larger values appear after it (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).\n\nImplement the **Lomuto partition scheme**:\n- Choose the last element `arr[high]` as the pivot $P$.\n- Maintain an index $i = low - 1$.\n- For $j = low$ to $high - 1$:\n  - If `arr[j] <= P`, increment $i$ and swap `arr[i]` with `arr[j]`.\n- Finally swap `arr[i + 1]` with `arr[high]`.\n- The pivot index is $i + 1$.\n\nGiven an array of $N$ integers:\n1. Apply a single Lomuto partition step on the entire array.\n2. Print the pivot index and value.\n3. Print the resulting partitioned array.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 100$).\n- Second line: $N$ integers.\n\n### Output Format\n- Line 1: `PIVOT_INDEX: %d | PIVOT_VAL: %d`\n- Line 2: `PARTITIONED: e1 e2 ... eN`\n\n### Example 1\n**Input:**\n```\n7\n10 80 30 90 40 50 70\n```\n**Output:**\n```\nPIVOT_INDEX: 4 | PIVOT_VAL: 70\nPARTITIONED: 10 30 40 50 70 90 80\n```",
    "starterCode": "#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int t = *a;\n    *a = *b;\n    *b = t;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Lomuto partitioning\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int t = *a;\n    *a = *b;\n    *b = t;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[105];\n    for (int k = 0; k < n; k++) scanf(\"%d\", &arr[k]);\n    \n    int pivot = arr[n - 1];\n    int i = -1;\n    for (int j = 0; j < n - 1; j++) {\n        if (arr[j] <= pivot) {\n            i++;\n            swap(&arr[i], &arr[j]);\n        }\n    }\n    swap(&arr[i + 1], &arr[n - 1]);\n    int p_index = i + 1;\n    \n    printf(\"PIVOT_INDEX: %d | PIVOT_VAL: %d\\n\", p_index, pivot);\n    printf(\"PARTITIONED:\");\n    for (int k = 0; k < n; k++) printf(\" %d\", arr[k]);\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 16,
      "chapterTitle": "Searching and Sorting",
      "chapterOrder": 16,
      "section": "QuickSort Partitioning",
      "exerciseNumber": "16.4",
      "exerciseOrder": 4,
      "page": 225,
      "concept": "Lomuto single-pivot partition invariant maintenance",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "7\n10 80 30 90 40 50 70\n",
        "expectedOutput": "PIVOT_INDEX: 4 | PIVOT_VAL: 70\nPARTITIONED: 10 30 40 50 70 90 80\n"
      },
      {
        "input": "3\n5 1 2\n",
        "expectedOutput": "PIVOT_INDEX: 1 | PIVOT_VAL: 2\nPARTITIONED: 1 2 5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n42\n",
        "expectedOutput": "PIVOT_INDEX: 0 | PIVOT_VAL: 42\nPARTITIONED: 42\n"
      },
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "PIVOT_INDEX: 3 | PIVOT_VAL: 4\nPARTITIONED: 1 2 3 4\n"
      },
      {
        "input": "4\n4 3 2 1\n",
        "expectedOutput": "PIVOT_INDEX: 0 | PIVOT_VAL: 1\nPARTITIONED: 1 3 2 4\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch16-mergesort-inversion-count",
    "title": "Merge Sort Divide-and-Conquer Inversion Count",
    "difficulty": "MEDIUM",
    "category": "Searching and Sorting",
    "tags": [
      "MergeSort",
      "Inversions",
      "Divide and Conquer",
      "Recursion"
    ],
    "description": "### Problem Description\nAn inversion in an array $A$ is a pair of indices $(i, j)$ such that $i < j$ and $A[i] > A[j]$. Counting inversions measures how far an array is from sorted order and can be solved in $O(N log N)$ time using Merge Sort (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).\n\nWhen merging two sorted halves $L$ and $R$:\nIf $L[i] > R[j]$, then all remaining elements in $L$ from index $i$ onward form inversions with $R[j]$:\n$$\text{inversions} += (\text{mid} - i + 1)$$\n\nGiven an array of $N$ integers:\n1. Sort the array using Merge Sort.\n2. Count and print the total number of inversions.\n3. Print the sorted array.\n\n### Input Format\n- First line: integer $N$ ($1 le N le 1000$).\n- Second line: $N$ integers.\n\n### Output Format\n- Line 1: `INVERSIONS: %lld`\n- Line 2: `SORTED: e1 e2 ... eN`\n\n### Example 1\n**Input:**\n```\n5\n2 4 1 3 5\n```\n**Output:**\n```\nINVERSIONS: 3\nSORTED: 1 2 3 4 5\n```\n*Explanation: Inversion pairs are (2, 1), (4, 1), and (4, 3).*",
    "starterCode": "#include <stdio.h>\n\nlong long mergeSortAndCount(int arr[], int temp[], int left, int right) {\n    // Implement merge sort inversion counter\n    return 0;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nlong long merge(int arr[], int temp[], int left, int mid, int right) {\n    int i = left;\n    int j = mid + 1;\n    int k = left;\n    long long inv_count = 0;\n    \n    while (i <= mid && j <= right) {\n        if (arr[i] <= arr[j]) {\n            temp[k++] = arr[i++];\n        } else {\n            temp[k++] = arr[j++];\n            inv_count += (mid - i + 1);\n        }\n    }\n    while (i <= mid) temp[k++] = arr[i++];\n    while (j <= right) temp[k++] = arr[j++];\n    for (i = left; i <= right; i++) arr[i] = temp[i];\n    \n    return inv_count;\n}\n\nlong long mergeSort(int arr[], int temp[], int left, int right) {\n    long long inv_count = 0;\n    if (left < right) {\n        int mid = left + (right - left) / 2;\n        inv_count += mergeSort(arr, temp, left, mid);\n        inv_count += mergeSort(arr, temp, mid + 1, right);\n        inv_count += merge(arr, temp, left, mid, right);\n    }\n    return inv_count;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[1005], temp[1005];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    long long inv = mergeSort(arr, temp, 0, n - 1);\n    printf(\"INVERSIONS: %lld\\n\", inv);\n    printf(\"SORTED:\");\n    for (int i = 0; i < n; i++) printf(\" %d\", arr[i]);\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 16,
      "chapterTitle": "Searching and Sorting",
      "chapterOrder": 16,
      "section": "Merge Sort Applications",
      "exerciseNumber": "16.9",
      "exerciseOrder": 9,
      "page": 228,
      "concept": "Divide-and-conquer inversion counting during merge stage",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\n2 4 1 3 5\n",
        "expectedOutput": "INVERSIONS: 3\nSORTED: 1 2 3 4 5\n"
      },
      {
        "input": "3\n3 2 1\n",
        "expectedOutput": "INVERSIONS: 3\nSORTED: 1 2 3\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "INVERSIONS: 0\nSORTED: 1 2 3 4\n"
      },
      {
        "input": "1\n10\n",
        "expectedOutput": "INVERSIONS: 0\nSORTED: 10\n"
      },
      {
        "input": "6\n8 4 2 1 0 -1\n",
        "expectedOutput": "INVERSIONS: 15\nSORTED: -1 0 1 2 4 8\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch16-binary-search-bounds",
    "title": "Binary Search Lower & Upper Bound Range Frequency",
    "difficulty": "EASY",
    "category": "Searching and Sorting",
    "tags": [
      "Binary Search",
      "Lower Bound",
      "Upper Bound",
      "Algorithms"
    ],
    "description": "### Problem Description\nBinary search on sorted arrays can find both the first occurrence (lower bound) and last occurrence (upper bound) of a target key in $O(log N)$ time (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).\n\nGiven a sorted array of $N$ integers and $Q$ query values:\nFor each query $K$:\n- Find the 0-based first index and last index where $K$ appears.\n- Compute the frequency of $K$ in the array.\n- If $K$ is not present, output `NOT FOUND`.\n\n### Input Format\n- First line: integers $N$ ($1 le N le 1000$) and $Q$ ($1 le Q le 100$).\n- Second line: $N$ sorted integers.\n- Third line: $Q$ integers (the query keys).\n\n### Output Format\nFor each query print a line:\n`KEY %d: FIRST=%d LAST=%d COUNT=%d`\nor `KEY %d: NOT FOUND`\n\n### Example 1\n**Input:**\n```\n7 2\n1 2 2 2 3 4 5\n2 9\n```\n**Output:**\n```\nKEY 2: FIRST=1 LAST=3 COUNT=3\nKEY 9: NOT FOUND\n```",
    "starterCode": "#include <stdio.h>\n\nint findFirst(int arr[], int n, int key) {\n    // Binary search first index\n    return -1;\n}\n\nint findLast(int arr[], int n, int key) {\n    // Binary search last index\n    return -1;\n}\n\nint main() {\n    // Read and answer queries\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint findFirst(int arr[], int n, int key) {\n    int low = 0, high = n - 1, ans = -1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] == key) {\n            ans = mid;\n            high = mid - 1;\n        } else if (arr[mid] < key) {\n            low = mid + 1;\n        } else {\n            high = mid - 1;\n        }\n    }\n    return ans;\n}\n\nint findLast(int arr[], int n, int key) {\n    int low = 0, high = n - 1, ans = -1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] == key) {\n            ans = mid;\n            low = mid + 1;\n        } else if (arr[mid] < key) {\n            low = mid + 1;\n        } else {\n            high = mid - 1;\n        }\n    }\n    return ans;\n}\n\nint main() {\n    int n, q;\n    if (scanf(\"%d %d\", &n, &q) != 2) return 0;\n    int arr[1005];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    for (int k = 0; k < q; k++) {\n        int key;\n        scanf(\"%d\", &key);\n        int first = findFirst(arr, n, key);\n        if (first == -1) {\n            printf(\"KEY %d: NOT FOUND\\n\", key);\n        } else {\n            int last = findLast(arr, n, key);\n            printf(\"KEY %d: FIRST=%d LAST=%d COUNT=%d\\n\", key, first, last, last - first + 1);\n        }\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 16,
      "chapterTitle": "Searching and Sorting",
      "chapterOrder": 16,
      "section": "Binary Search Bounds",
      "exerciseNumber": "16.12",
      "exerciseOrder": 12,
      "page": 231,
      "concept": "Binary search lower and upper boundary search invariant",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "7 2\n1 2 2 2 3 4 5\n2 9\n",
        "expectedOutput": "KEY 2: FIRST=1 LAST=3 COUNT=3\nKEY 9: NOT FOUND\n"
      },
      {
        "input": "4 1\n10 20 30 40\n30\n",
        "expectedOutput": "KEY 30: FIRST=2 LAST=2 COUNT=1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "5 2\n5 5 5 5 5\n5 1\n",
        "expectedOutput": "KEY 5: FIRST=0 LAST=4 COUNT=5\nKEY 1: NOT FOUND\n"
      },
      {
        "input": "1 1\n100\n100\n",
        "expectedOutput": "KEY 100: FIRST=0 LAST=0 COUNT=1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch16-ternary-search-unimodal",
    "title": "Ternary Search Unimodal Mountain Peak Finder",
    "difficulty": "EASY",
    "category": "Searching and Sorting",
    "tags": [
      "Ternary Search",
      "Peak Finder",
      "Binary Search",
      "Algorithms"
    ],
    "description": "### Problem Description\nAn array is unimodal (mountain-shaped) if it strictly increases to a single peak element and then strictly decreases. Ternary search divides the search space into three parts using two internal midpoints $m_1$ and $m_2$ to isolate the peak in $O(log_3 N)$ steps (Yashavant Kanetkar, *Test Your C Skills*, Chapter 16).\n\nGiven a mountain array of $N$ integers ($N ge 3$):\nFind the peak element and its 0-based index.\n\n### Input Format\n- First line: integer $N$ ($3 le N le 1000$).\n- Second line: $N$ integers representing the mountain array.\n\n### Output Format\n- Print `PEAK_INDEX: %d | PEAK_VALUE: %d`\n\n### Example 1\n**Input:**\n```\n7\n1 3 8 12 4 2 0\n```\n**Output:**\n```\nPEAK_INDEX: 3 | PEAK_VALUE: 12\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Find mountain peak\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[1005];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    int low = 0, high = n - 1;\n    while (low < high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] < arr[mid + 1]) {\n            low = mid + 1;\n        } else {\n            high = mid;\n        }\n    }\n    \n    printf(\"PEAK_INDEX: %d | PEAK_VALUE: %d\\n\", low, arr[low]);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 16,
      "chapterTitle": "Searching and Sorting",
      "chapterOrder": 16,
      "section": "Unimodal Peak Detection",
      "exerciseNumber": "16.16",
      "exerciseOrder": 16,
      "page": 235,
      "concept": "Ternary and bisection peak finding in unimodal arrays",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "7\n1 3 8 12 4 2 0\n",
        "expectedOutput": "PEAK_INDEX: 3 | PEAK_VALUE: 12\n"
      },
      {
        "input": "3\n0 10 0\n",
        "expectedOutput": "PEAK_INDEX: 1 | PEAK_VALUE: 10\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "5\n1 2 3 4 1\n",
        "expectedOutput": "PEAK_INDEX: 3 | PEAK_VALUE: 4\n"
      },
      {
        "input": "6\n10 20 30 25 15 5\n",
        "expectedOutput": "PEAK_INDEX: 2 | PEAK_VALUE: 30\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-sieve-eratosthenes-density",
    "title": "Sieve of Eratosthenes Prime Density & Twin Primes",
    "difficulty": "EASY",
    "category": "Advanced Algorithms",
    "tags": [
      "Math",
      "Sieve",
      "Primes",
      "Bitwise"
    ],
    "description": "### Problem Description\nThe Sieve of Eratosthenes computes all primes up to $N$ in $O(N log log N)$ operations by marking multiples of each prime starting from $p^2$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nGiven an integer $N$ ($2 le N le 100000$):\n1. Compute the total count of primes $le N$.\n2. Compute the total count of twin prime pairs $(p, p + 2)$ where both $p$ and $p + 2$ are primes $le N$.\n3. Print the largest prime $le N$.\n\n### Input Format\n- A single integer $N$.\n\n### Output Format\n- Line 1: `PRIMES_COUNT: %d`\n- Line 2: `TWIN_PAIRS: %d`\n- Line 3: `LARGEST_PRIME: %d`\n\n### Example 1\n**Input:**\n```\n20\n```\n**Output:**\n```\nPRIMES_COUNT: 8\nTWIN_PAIRS: 4\nLARGEST_PRIME: 19\n```\n*Explanation: Primes <= 20: 2, 3, 5, 7, 11, 13, 17, 19. Twin pairs: (3,5), (5,7), (11,13), (17,19).*",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Sieve of Eratosthenes\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    \n    char *isPrime = (char *)malloc((n + 1) * sizeof(char));\n    memset(isPrime, 1, n + 1);\n    isPrime[0] = isPrime[1] = 0;\n    \n    for (int p = 2; p * p <= n; p++) {\n        if (isPrime[p]) {\n            for (int i = p * p; i <= n; i += p) {\n                isPrime[i] = 0;\n            }\n        }\n    }\n    \n    int count = 0;\n    int twins = 0;\n    int largest = 2;\n    \n    for (int i = 2; i <= n; i++) {\n        if (isPrime[i]) {\n            count++;\n            largest = i;\n            if (i + 2 <= n && isPrime[i + 2]) {\n                twins++;\n            }\n        }\n    }\n    \n    printf(\"PRIMES_COUNT: %d\\n\", count);\n    printf(\"TWIN_PAIRS: %d\\n\", twins);\n    printf(\"LARGEST_PRIME: %d\\n\", largest);\n    \n    free(isPrime);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Prime Sieving",
      "exerciseNumber": "17.3",
      "exerciseOrder": 3,
      "page": 240,
      "concept": "Sieve of Eratosthenes array-marking prime generator",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "20\n",
        "expectedOutput": "PRIMES_COUNT: 8\nTWIN_PAIRS: 4\nLARGEST_PRIME: 19\n"
      },
      {
        "input": "10\n",
        "expectedOutput": "PRIMES_COUNT: 4\nTWIN_PAIRS: 2\nLARGEST_PRIME: 7\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n",
        "expectedOutput": "PRIMES_COUNT: 1\nTWIN_PAIRS: 0\nLARGEST_PRIME: 2\n"
      },
      {
        "input": "100\n",
        "expectedOutput": "PRIMES_COUNT: 25\nTWIN_PAIRS: 8\nLARGEST_PRIME: 97\n"
      },
      {
        "input": "50\n",
        "expectedOutput": "PRIMES_COUNT: 15\nTWIN_PAIRS: 6\nLARGEST_PRIME: 47\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-modular-exponentiation-powmod",
    "title": "Fast Modular Exponentiation Binary Exponentiation (a^b mod m)",
    "difficulty": "EASY",
    "category": "Advanced Algorithms",
    "tags": [
      "Math",
      "Modular Arithmetic",
      "Exponentiation",
      "Bitwise"
    ],
    "description": "### Problem Description\nComputing $(A^B) pmod M$ for large exponents up to $10^{18}$ requires binary exponentiation in $O(log B)$ iterations to avoid arithmetic overflow (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nAlgorithm:\n- Initialize `result = 1`.\n- `a = a % m`.\n- While $B > 0$:\n  - If $B$ is odd ($B pmod 2 == 1$), `result = (result * a) % m`.\n  - `a = (a * a) % m`.\n  - $B = B / 2$.\n\nGiven three integers $A$, $B$, and $M$ ($1 le A, M le 10^9, 0 le B le 10^{18}$):\nCompute $(A^B) pmod M$.\n\n### Input Format\n- A single line containing three integers: $A$, $B$, and $M$.\n\n### Output Format\n- Print `RESULT: %lld`\n\n### Example 1\n**Input:**\n```\n2 10 1000\n```\n**Output:**\n```\nRESULT: 24\n```\n*Explanation: $2^{10} = 1024$; $1024 pmod{1000} = 24$.*",
    "starterCode": "#include <stdio.h>\n\nlong long powerMod(long long a, long long b, long long m) {\n    // Fast binary exponentiation\n    return 0;\n}\n\nint main() {\n    long long a, b, m;\n    if (scanf(\"%lld %lld %lld\", &a, &b, &m) != 3) return 0;\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nlong long powerMod(long long a, long long b, long long m) {\n    long long res = 1;\n    a %= m;\n    while (b > 0) {\n        if (b & 1) res = (res * a) % m;\n        a = (a * a) % m;\n        b >>= 1;\n    }\n    return res;\n}\n\nint main() {\n    long long a, b, m;\n    if (scanf(\"%lld %lld %lld\", &a, &b, &m) != 3) return 0;\n    printf(\"RESULT: %lld\\n\", powerMod(a, b, m));\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Fast Arithmetic",
      "exerciseNumber": "17.7",
      "exerciseOrder": 7,
      "page": 243,
      "concept": "Binary exponentiation with 64-bit modular multiplication",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2 10 1000\n",
        "expectedOutput": "RESULT: 24\n"
      },
      {
        "input": "3 5 7\n",
        "expectedOutput": "RESULT: 5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "10 0 100\n",
        "expectedOutput": "RESULT: 1\n"
      },
      {
        "input": "7 13 1000000007\n",
        "expectedOutput": "RESULT: 968890104\n"
      },
      {
        "input": "5 3 13\n",
        "expectedOutput": "RESULT: 8\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-matrix-multiplication-cache",
    "title": "Cache-Friendly Matrix Multiplication & Diagonal Trace",
    "difficulty": "EASY",
    "category": "Advanced Algorithms",
    "tags": [
      "Matrix",
      "Pointers",
      "Cache",
      "Math"
    ],
    "description": "### Problem Description\nMatrix multiplication $C = A \times B$ in standard row-major C achieves maximum CPU cache line reuse when ordered with loops `i-k-j` rather than naive `i-j-k` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nGiven two matrices:\n- Matrix $A$ of dimension $N \times K$\n- Matrix $B$ of dimension $K \times M$\n\nCompute the product matrix $C = A \times B$ and calculate:\n1. The full product matrix.\n2. The main diagonal trace of $C$ (if $N = M$), or print `TRACE: N/A` if $N \ne M$.\n\n### Input Format\n- First line: integers $N$, $K$, and $M$ ($1 le N, K, M le 30$).\n- Next $N$ lines: $K$ integers per line (Matrix $A$).\n- Next $K$ lines: $M$ integers per line (Matrix $B$).\n\n### Output Format\n- Print $N$ lines, each containing $M$ space-separated integers representing matrix $C$.\n- Final line: `TRACE: <val>` or `TRACE: N/A`.\n\n### Example 1\n**Input:**\n```\n2 2 2\n1 2\n3 4\n5 6\n7 8\n```\n**Output:**\n```\n19 22\n43 50\nTRACE: 69\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n, k, m;\n    if (scanf(\"%d %d %d\", &n, &k, &m) != 3) return 0;\n    // Compute matrix product\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int n, k, m;\n    if (scanf(\"%d %d %d\", &n, &k, &m) != 3) return 0;\n    \n    int A[35][35], B[35][35];\n    long long C[35][35];\n    memset(C, 0, sizeof(C));\n    \n    for (int i = 0; i < n; i++)\n        for (int p = 0; p < k; p++)\n            scanf(\"%d\", &A[i][p]);\n            \n    for (int p = 0; p < k; p++)\n        for (int j = 0; j < m; j++)\n            scanf(\"%d\", &B[p][j]);\n            \n    // i-k-j loop order for cache efficiency\n    for (int i = 0; i < n; i++) {\n        for (int p = 0; p < k; p++) {\n            for (int j = 0; j < m; j++) {\n                C[i][j] += (long long)A[i][p] * B[p][j];\n            }\n        }\n    }\n    \n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < m; j++) {\n            printf(\"%lld%s\", C[i][j], j == m - 1 ? \"\" : \" \");\n        }\n        printf(\"\\n\");\n    }\n    \n    if (n == m) {\n        long long trace = 0;\n        for (int i = 0; i < n; i++) trace += C[i][i];\n        printf(\"TRACE: %lld\\n\", trace);\n    } else {\n        printf(\"TRACE: N/A\\n\");\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Matrix Operations",
      "exerciseNumber": "17.11",
      "exerciseOrder": 11,
      "page": 247,
      "concept": "Row-major matrix multiplication with spatial locality optimization",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2 2 2\n1 2\n3 4\n5 6\n7 8\n",
        "expectedOutput": "19 22\n43 50\nTRACE: 69\n"
      },
      {
        "input": "2 3 1\n1 2 3\n4 5 6\n1\n1\n1\n",
        "expectedOutput": "6\n15\nTRACE: N/A\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1 1 1\n5\n5\n",
        "expectedOutput": "25\nTRACE: 25\n"
      },
      {
        "input": "2 2 2\n1 0\n0 1\n3 4\n5 6\n",
        "expectedOutput": "3 4\n5 6\nTRACE: 9\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-knapsack-01-dynamic-prog",
    "title": "0/1 Knapsack Dynamic Programming Optimizer",
    "difficulty": "MEDIUM",
    "category": "Advanced Algorithms",
    "tags": [
      "Dynamic Programming",
      "Knapsack",
      "Optimization"
    ],
    "description": "### Problem Description\nThe classical 0/1 Knapsack problem selects a subset of items to maximize total value without exceeding a maximum weight capacity $W$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nDP Recurrence:\n$$dp[i][w] = max(dp[i-1][w], dp[i-1][w - \text{wt}[i]] + \text{val}[i])$$\n\nGiven $N$ items with weights and values, and capacity $W$:\n1. Compute the maximum value attainable.\n2. Backtrack to find the count of items included in the optimal knapsack.\n\n### Input Format\n- First line: integers $N$ ($1 le N le 100$) and $W$ ($1 le W le 1000$).\n- Next $N$ lines: two integers per line: `weight value` ($1 le \text{wt} le W, 1 le \text{val} le 10^5$).\n\n### Output Format\n- Line 1: `MAX_VALUE: %d`\n- Line 2: `ITEMS_SELECTED: %d`\n\n### Example 1\n**Input:**\n```\n3 50\n10 60\n20 100\n30 120\n```\n**Output:**\n```\nMAX_VALUE: 220\nITEMS_SELECTED: 2\n```\n*Explanation: Optimal selection is items 2 and 3 (weights 20 + 30 = 50, values 100 + 120 = 220).*",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n, w;\n    if (scanf(\"%d %d\", &n, &w) != 2) return 0;\n    // 0/1 knapsack dynamic programming\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint dp[105][1005];\n\nint max(int a, int b) { return a > b ? a : b; }\n\nint main() {\n    int n, w;\n    if (scanf(\"%d %d\", &n, &w) != 2) return 0;\n    \n    int wt[105], val[105];\n    for (int i = 1; i <= n; i++) {\n        scanf(\"%d %d\", &wt[i], &val[i]);\n    }\n    \n    for (int i = 1; i <= n; i++) {\n        for (int j = 0; j <= w; j++) {\n            dp[i][j] = dp[i - 1][j];\n            if (j >= wt[i]) {\n                dp[i][j] = max(dp[i][j], dp[i - 1][j - wt[i]] + val[i]);\n            }\n        }\n    }\n    \n    int max_val = dp[n][w];\n    \n    // Backtrack item count\n    int items = 0;\n    int curr_w = w;\n    for (int i = n; i >= 1; i--) {\n        if (dp[i][curr_w] != dp[i - 1][curr_w]) {\n            items++;\n            curr_w -= wt[i];\n        }\n    }\n    \n    printf(\"MAX_VALUE: %d\\n\", max_val);\n    printf(\"ITEMS_SELECTED: %d\\n\", items);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Dynamic Programming",
      "exerciseNumber": "17.15",
      "exerciseOrder": 15,
      "page": 250,
      "concept": "0/1 knapsack 2D dynamic programming table and state backtracking",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 50\n10 60\n20 100\n30 120\n",
        "expectedOutput": "MAX_VALUE: 220\nITEMS_SELECTED: 2\n"
      },
      {
        "input": "2 10\n15 100\n20 200\n",
        "expectedOutput": "MAX_VALUE: 0\nITEMS_SELECTED: 0\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1 10\n5 50\n",
        "expectedOutput": "MAX_VALUE: 50\nITEMS_SELECTED: 1\n"
      },
      {
        "input": "4 16\n2 20\n5 30\n10 70\n5 40\n",
        "expectedOutput": "MAX_VALUE: 130\nITEMS_SELECTED: 3\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-lcs-longest-common-subseq",
    "title": "Longest Common Subsequence (LCS) 2D Table & String Reconstructor",
    "difficulty": "MEDIUM",
    "category": "Advanced Algorithms",
    "tags": [
      "Dynamic Programming",
      "LCS",
      "Strings",
      "Algorithms"
    ],
    "description": "### Problem Description\nGiven two sequences $X$ and $Y$, the Longest Common Subsequence (LCS) problem finds the longest sequence that appears in both without modifying order (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nDP Recurrence:\n- If $X[i-1] == Y[j-1]$, $L[i][j] = 1 + L[i-1][j-1]$\n- Otherwise, $L[i][j] = max(L[i-1][j], L[i][j-1])$\n\nGiven two strings $S_1$ and $S_2$:\n1. Compute the length of their LCS.\n2. Reconstruct and print the reconstructed LCS string itself.\n\n### Input Format\n- Line 1: string $S_1$ (length $le 100$).\n- Line 2: string $S_2$ (length $le 100$).\n\n### Output Format\n- Line 1: `LCS_LENGTH: %d`\n- Line 2: `LCS_STRING: %s`\n\n### Example 1\n**Input:**\n```\nABCBDAB\nBDCABA\n```\n**Output:**\n```\nLCS_LENGTH: 4\nLCS_STRING: BCBA\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s1[128], s2[128];\n    if (scanf(\"%s %s\", s1, s2) != 2) return 0;\n    // LCS dynamic programming table\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint dp[105][105];\n\nint main() {\n    char s1[128], s2[128];\n    if (scanf(\"%s %s\", s1, s2) != 2) return 0;\n    \n    int m = strlen(s1);\n    int n = strlen(s2);\n    \n    for (int i = 0; i <= m; i++) {\n        for (int j = 0; j <= n; j++) {\n            if (i == 0 || j == 0) dp[i][j] = 0;\n            else if (s1[i - 1] == s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];\n            else dp[i][j] = dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];\n        }\n    }\n    \n    int len = dp[m][n];\n    char lcs[105];\n    lcs[len] = '\\0';\n    \n    int i = m, j = n, idx = len - 1;\n    while (i > 0 && j > 0) {\n        if (s1[i - 1] == s2[j - 1]) {\n            lcs[idx--] = s1[i - 1];\n            i--;\n            j--;\n        } else if (dp[i - 1][j] >= dp[i][j - 1]) {\n            i--;\n        } else {\n            j--;\n        }\n    }\n    \n    printf(\"LCS_LENGTH: %d\\n\", len);\n    printf(\"LCS_STRING: %s\\n\", lcs);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Dynamic Programming",
      "exerciseNumber": "17.18",
      "exerciseOrder": 18,
      "page": 254,
      "concept": "Longest common subsequence reconstruction via 2D DP matrix backtracking",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "ABCBDAB\nBDCABA\n",
        "expectedOutput": "LCS_LENGTH: 4\nLCS_STRING: BCBA\n"
      },
      {
        "input": "AGGTAB\nGXTXAYB\n",
        "expectedOutput": "LCS_LENGTH: 4\nLCS_STRING: GTAB\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "HELLO\nWORLD\n",
        "expectedOutput": "LCS_LENGTH: 1\nLCS_STRING: O\n"
      },
      {
        "input": "ABCD\nEFGH\n",
        "expectedOutput": "LCS_LENGTH: 0\nLCS_STRING: \n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-coin-change-minimum-coins",
    "title": "Coin Change Minimum Coins Dynamic Programming",
    "difficulty": "EASY",
    "category": "Advanced Algorithms",
    "tags": [
      "Dynamic Programming",
      "Coin Change",
      "Optimization"
    ],
    "description": "### Problem Description\nGiven a set of $C$ coin denominations and a target amount $V$, find the minimum number of coins needed to make change for $V$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nDP Recurrence:\n$$dp[a] = min_{c in \text{coins}} (dp[a - c] + 1)$$\nWith base case $dp[0] = 0$.\n\nIf the amount cannot be made up by any combination of coins, output `CHANGE IMPOSSIBLE`.\n\n### Input Format\n- First line: integer $C$ ($1 le C le 50$) and integer $V$ ($1 le V le 10000$).\n- Second line: $C$ space-separated coin denominations.\n\n### Output Format\n- `MIN_COINS: %d` or `CHANGE IMPOSSIBLE`\n\n### Example 1\n**Input:**\n```\n3 11\n1 2 5\n```\n**Output:**\n```\nMIN_COINS: 3\n```\n*Explanation: 11 = 5 + 5 + 1 (3 coins).*",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int c, v;\n    if (scanf(\"%d %d\", &c, &v) != 2) return 0;\n    // Coin change dynamic programming\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\n#define INF 1000000000\n\nint dp[10005];\n\nint main() {\n    int c, v;\n    if (scanf(\"%d %d\", &c, &v) != 2) return 0;\n    \n    int coins[55];\n    for (int i = 0; i < c; i++) scanf(\"%d\", &coins[i]);\n    \n    for (int i = 1; i <= v; i++) dp[i] = INF;\n    dp[0] = 0;\n    \n    for (int i = 1; i <= v; i++) {\n        for (int k = 0; k < c; k++) {\n            if (i >= coins[k] && dp[i - coins[k]] != INF) {\n                if (dp[i - coins[k]] + 1 < dp[i]) {\n                    dp[i] = dp[i - coins[k]] + 1;\n                }\n            }\n        }\n    }\n    \n    if (dp[v] == INF) {\n        printf(\"CHANGE IMPOSSIBLE\\n\");\n    } else {\n        printf(\"MIN_COINS: %d\\n\", dp[v]);\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "Unbounded Knapsack / Coin Change",
      "exerciseNumber": "17.22",
      "exerciseOrder": 22,
      "page": 258,
      "concept": "Bottom-up 1D dynamic programming for unbounded coin change",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 11\n1 2 5\n",
        "expectedOutput": "MIN_COINS: 3\n"
      },
      {
        "input": "1 3\n2\n",
        "expectedOutput": "CHANGE IMPOSSIBLE\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "4 30\n1 5 10 25\n",
        "expectedOutput": "MIN_COINS: 2\n"
      },
      {
        "input": "2 7\n2 4\n",
        "expectedOutput": "CHANGE IMPOSSIBLE\n"
      },
      {
        "input": "1 0\n5\n",
        "expectedOutput": "MIN_COINS: 0\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch17-levenshtein-edit-distance",
    "title": "Levenshtein Edit Distance String Metric Engine",
    "difficulty": "MEDIUM",
    "category": "Advanced Algorithms",
    "tags": [
      "Dynamic Programming",
      "Edit Distance",
      "Strings"
    ],
    "description": "### Problem Description\nThe Levenshtein distance between two strings is the minimum number of single-character edits (insertions, deletions, or substitutions) required to transform string $A$ into string $B$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 17).\n\nDP Recurrence:\n- $D[i][0] = i$\n- $D[0][j] = j$\n- If $A[i-1] == B[j-1]$, $D[i][j] = D[i-1][j-1]$\n- Otherwise, $D[i][j] = 1 + min(D[i-1][j], D[i][j-1], D[i-1][j-1])$\n\nGiven two strings $A$ and $B$:\nCalculate and print their Levenshtein edit distance.\n\n### Input Format\n- Two strings $A$ and $B$ on separate lines (lengths $le 100$).\n\n### Output Format\n- Print `EDIT_DISTANCE: %d`\n\n### Example 1\n**Input:**\n```\nkitten\nsitting\n```\n**Output:**\n```\nEDIT_DISTANCE: 3\n```\n*Explanation: kitten -> sitten (replace k with s) -> sittin (replace e with i) -> sitting (insert g).*",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint min3(int a, int b, int c) {\n    int m = a < b ? a : b;\n    return m < c ? m : c;\n}\n\nint main() {\n    char a[128], b[128];\n    if (scanf(\"%s %s\", a, b) != 2) return 0;\n    // Calculate Levenshtein distance\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint dp[105][105];\n\nint min3(int a, int b, int c) {\n    int m = a < b ? a : b;\n    return m < c ? m : c;\n}\n\nint main() {\n    char a[128], b[128];\n    if (scanf(\"%s %s\", a, b) != 2) return 0;\n    \n    int m = strlen(a);\n    int n = strlen(b);\n    \n    for (int i = 0; i <= m; i++) dp[i][0] = i;\n    for (int j = 0; j <= n; j++) dp[0][j] = j;\n    \n    for (int i = 1; i <= m; i++) {\n        for (int j = 1; j <= n; j++) {\n            if (a[i - 1] == b[j - 1]) {\n                dp[i][j] = dp[i - 1][j - 1];\n            } else {\n                dp[i][j] = 1 + min3(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);\n            }\n        }\n    }\n    \n    printf(\"EDIT_DISTANCE: %d\\n\", dp[m][n]);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 25,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 17,
      "chapterTitle": "Advanced Algorithms",
      "chapterOrder": 17,
      "section": "String Similarity Metrics",
      "exerciseNumber": "17.26",
      "exerciseOrder": 26,
      "page": 262,
      "concept": "Levenshtein dynamic programming matrix operations for string distance",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "kitten\nsitting\n",
        "expectedOutput": "EDIT_DISTANCE: 3\n"
      },
      {
        "input": "logic\nlogic\n",
        "expectedOutput": "EDIT_DISTANCE: 0\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "sunday\nsaturday\n",
        "expectedOutput": "EDIT_DISTANCE: 3\n"
      },
      {
        "input": "a\nb\n",
        "expectedOutput": "EDIT_DISTANCE: 1\n"
      },
      {
        "input": "intention\nexecution\n",
        "expectedOutput": "EDIT_DISTANCE: 5\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch18-custom-arena-bump-allocator",
    "title": "Custom Memory Pool Arena Bump Allocator & Alignment Guard",
    "difficulty": "HARD",
    "category": "Memory Management",
    "tags": [
      "Memory",
      "Pointers",
      "Arena Allocator",
      "Systems Programming"
    ],
    "description": "### Problem Description\nIn high-performance C systems, embedded devices, and game engines, invoking `malloc` for every small object creates heap fragmentation and performance overhead. Systems programmers implement an **Arena (Bump) Allocator** using a fixed static buffer (Yashavant Kanetkar, *Test Your C Skills*, Chapter 18: Advanced Pointer Techniques).\n\nArena Specifications:\n- Total Arena Capacity = $B$ bytes.\n- Offset points to the next available byte (initially $0$).\n- `ALLOC sz align`:\n  - Align the current offset to the next multiple of `align` (powers of 2: 1, 2, 4, 8).\n  - If `aligned_offset + sz > B`, allocation fails: output `OUT_OF_MEMORY`.\n  - Otherwise, return allocation address (represented as offset index), update `offset = aligned_offset + sz`, and increment successful allocation count.\n- `RESET`:\n  - Resets `offset = 0` (instant bulk deallocation of all objects in $O(1)$).\n- `STATS`:\n  - Output `ARENA: USED=%d FREE=%d ALLOCS=%d`.\n\nGiven buffer size $B$ and $Q$ operations:\nProcess all commands and output the diagnostics.\n\n### Input Format\n- First line: integer $B$ ($64 le B le 65536$) and integer $Q$ ($1 le Q le 100$).\n- Next $Q$ lines: `ALLOC <size> <align>`, `RESET`, or `STATS`.\n\n### Output Format\nPrint the output of each command:\n- For `ALLOC`: `ALLOCATED AT OFFSET %d` or `OUT_OF_MEMORY`.\n- For `RESET`: `ARENA RESET`.\n- For `STATS`: `ARENA: USED=%d FREE=%d ALLOCS=%d`.\n\n### Example 1\n**Input:**\n```\n64 6\nALLOC 10 4\nALLOC 8 8\nSTATS\nRESET\nSTATS\nALLOC 100 8\n```\n**Output:**\n```\nALLOCATED AT OFFSET 0\nALLOCATED AT OFFSET 16\nARENA: USED=24 FREE=40 ALLOCS=2\nARENA RESET\nARENA: USED=0 FREE=64 ALLOCS=0\nOUT_OF_MEMORY\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int b, q;\n    if (scanf(\"%d %d\", &b, &q) != 2) return 0;\n    // Arena bump allocator simulation\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    int b, q;\n    if (scanf(\"%d %d\", &b, &q) != 2) return 0;\n    \n    int offset = 0;\n    int alloc_count = 0;\n    \n    char op[32];\n    for (int k = 0; k < q; k++) {\n        scanf(\"%s\", op);\n        if (strcmp(op, \"ALLOC\") == 0) {\n            int sz, align;\n            scanf(\"%d %d\", &sz, &align);\n            \n            int rem = offset % align;\n            int aligned_offset = (rem == 0) ? offset : (offset + (align - rem));\n            \n            if (aligned_offset + sz > b) {\n                printf(\"OUT_OF_MEMORY\\n\");\n            } else {\n                printf(\"ALLOCATED AT OFFSET %d\\n\", aligned_offset);\n                offset = aligned_offset + sz;\n                alloc_count++;\n            }\n        } else if (strcmp(op, \"RESET\") == 0) {\n            offset = 0;\n            alloc_count = 0;\n            printf(\"ARENA RESET\\n\");\n        } else if (strcmp(op, \"STATS\") == 0) {\n            printf(\"ARENA: USED=%d FREE=%d ALLOCS=%d\\n\", offset, b - offset, alloc_count);\n        }\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 18,
      "chapterTitle": "Advanced Pointers and Memory Management",
      "chapterOrder": 18,
      "section": "Custom Allocators",
      "exerciseNumber": "18.10",
      "exerciseOrder": 10,
      "page": 270,
      "concept": "Arena bump allocation with alignment padding and bulk O(1) deallocation",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "64 6\nALLOC 10 4\nALLOC 8 8\nSTATS\nRESET\nSTATS\nALLOC 100 8\n",
        "expectedOutput": "ALLOCATED AT OFFSET 0\nALLOCATED AT OFFSET 16\nARENA: USED=24 FREE=40 ALLOCS=2\nARENA RESET\nARENA: USED=0 FREE=64 ALLOCS=0\nOUT_OF_MEMORY\n"
      },
      {
        "input": "32 3\nALLOC 20 1\nALLOC 20 1\nSTATS\n",
        "expectedOutput": "ALLOCATED AT OFFSET 0\nOUT_OF_MEMORY\nARENA: USED=20 FREE=12 ALLOCS=1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "128 4\nALLOC 1 8\nALLOC 1 8\nALLOC 1 8\nSTATS\n",
        "expectedOutput": "ALLOCATED AT OFFSET 0\nALLOCATED AT OFFSET 8\nALLOCATED AT OFFSET 16\nARENA: USED=17 FREE=111 ALLOCS=3\n"
      },
      {
        "input": "64 2\nRESET\nSTATS\n",
        "expectedOutput": "ARENA RESET\nARENA: USED=0 FREE=64 ALLOCS=0\n"
      }
    ]
  }
];
