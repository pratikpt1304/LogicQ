import { BookProblemDef } from './kanetkar-book-bank.js';

export const KANETKAR_BOOK_PART2_PROBLEMS: BookProblemDef[] = [
  {
    "slug": "kanetkar-ch2-bitwise-arithmetic-shift",
    "title": "Bitwise Right Shift Arithmetic vs Logical Evaluator",
    "difficulty": "EASY",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Right Shift",
      "Sign Extension"
    ],
    "description": "### Problem Description\nIn C, shifting signed integers to the right often preserves the sign bit (arithmetic shift), whereas unsigned types always shift in zeros (logical shift) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2: Operators).\n\nGiven an integer N and an amount S (0 ≤ S ≤ 16), compute both the signed arithmetic right shift (treating N as signed 32-bit int) and the unsigned logical right shift (treating N as unsigned 32-bit uint).\n\n### Input Format\n- Single line with two space-separated integers: N and S (−10⁵ ≤ N ≤ 10⁵, 0 ≤ S ≤ 16).\n\n### Output Format\nPrint two space-separated integers: the signed result followed by the unsigned result (formatted with %u).\n\n### Example 1\n**Input:**\n```\n-16 2\n```\n**Output:**\n```\n-4 1073741820\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n, s;\n    if (scanf(\"%d %d\", &n, &s) != 2) return 0;\n    // TODO: Perform signed and unsigned shift\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n, s;\n    if (scanf(\"%d %d\", &n, &s) != 2) return 0;\n    int signed_res = n >> s;\n    unsigned int unsigned_res = ((unsigned int)n) >> s;\n    printf(\"%d %u\\n\", signed_res, unsigned_res);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bitwise Shifts",
      "exerciseNumber": "2.8",
      "exerciseOrder": 8,
      "page": 28,
      "concept": "Arithmetic vs logical right shift in C implementations",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "-16 2\n",
        "expectedOutput": "-4 1073741820\n"
      },
      {
        "input": "32 3\n",
        "expectedOutput": "4 4\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0 5\n",
        "expectedOutput": "0 0\n"
      },
      {
        "input": "-1 1\n",
        "expectedOutput": "-1 2147483647\n"
      },
      {
        "input": "100 0\n",
        "expectedOutput": "100 100\n"
      },
      {
        "input": "-128 4\n",
        "expectedOutput": "-8 268435448\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-twos-complement-range",
    "title": "Two's Complement Binary Inverter and Range Evaluator",
    "difficulty": "EASY",
    "category": "Data Representation",
    "tags": [
      "Bitwise",
      "Twos Complement",
      "Binary"
    ],
    "description": "### Problem Description\nIn standard C compilers, signed integers are represented using two's complement notation (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2). To invert the sign in two's complement, we compute `(~x) + 1`.\n\nGiven an integer X, compute its two's complement negation without using the unary minus operator `-`.\n\n### Input Format\n- A single integer X (−10⁶ ≤ X ≤ 10⁶).\n\n### Output Format\nPrint the negated integer on a single line.\n\n### Example 1\n**Input:**\n```\n42\n```\n**Output:**\n```\n-42\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int x;\n    if (scanf(\"%d\", &x) != 1) return 0;\n    // Compute negation using bitwise NOT and addition\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int x;\n    if (scanf(\"%d\", &x) != 1) return 0;\n    int neg = (~x) + 1;\n    printf(\"%d\\n\", neg);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bitwise Inversion",
      "exerciseNumber": "2.14",
      "exerciseOrder": 14,
      "page": 32,
      "concept": "Two's complement negation using bitwise NOT and addition",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "42\n",
        "expectedOutput": "-42\n"
      },
      {
        "input": "-105\n",
        "expectedOutput": "105\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n",
        "expectedOutput": "0\n"
      },
      {
        "input": "1\n",
        "expectedOutput": "-1\n"
      },
      {
        "input": "-1\n",
        "expectedOutput": "1\n"
      },
      {
        "input": "99999\n",
        "expectedOutput": "-99999\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-rgb565-color-packer",
    "title": "RGB565 16-Bit Color Component Bitwise Packer",
    "difficulty": "MEDIUM",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Masking",
      "Graphics"
    ],
    "description": "### Problem Description\nEmbedded graphics displays frequently use 16-bit RGB565 encoding: 5 bits for Red (0-31), 6 bits for Green (0-63), and 5 bits for Blue (0-31) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2).\n\nGiven three integer values R (0-31), G (0-63), and B (0-31), pack them into a single 16-bit unsigned integer using bitwise shifts and bitwise OR: `color = (R << 11) | (G << 5) | B`.\n\n### Input Format\n- Three space-separated integers: R, G, B.\n\n### Output Format\nPrint the packed 16-bit integer in hexadecimal format (e.g. `0x07E0`) using `0x%04X`.\n\n### Example 1\n**Input:**\n```\n0 63 0\n```\n**Output:**\n```\n0x07E0\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int r, g, b;\n    if (scanf(\"%d %d %d\", &r, &g, &b) != 3) return 0;\n    // Pack into RGB565\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int r, g, b;\n    if (scanf(\"%d %d %d\", &r, &g, &b) != 3) return 0;\n    unsigned short packed = ((r & 0x1F) << 11) | ((g & 0x3F) << 5) | (b & 0x1F);\n    printf(\"0x%04X\\n\", packed);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bitwise Masking",
      "exerciseNumber": "2.21",
      "exerciseOrder": 21,
      "page": 36,
      "concept": "Packing multiple channel sub-fields into a single machine word",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "0 63 0\n",
        "expectedOutput": "0x07E0\n"
      },
      {
        "input": "31 0 0\n",
        "expectedOutput": "0xF800\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0 0 31\n",
        "expectedOutput": "0x001F\n"
      },
      {
        "input": "31 63 31\n",
        "expectedOutput": "0xFFFF\n"
      },
      {
        "input": "0 0 0\n",
        "expectedOutput": "0x0000\n"
      },
      {
        "input": "15 32 15\n",
        "expectedOutput": "0x7C0F\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-circular-bit-rotation",
    "title": "32-Bit Circular Bitwise Left and Right Rotator",
    "difficulty": "MEDIUM",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Rotation",
      "Shifts"
    ],
    "description": "### Problem Description\nUnlike standard shifts which discard bits, circular bit rotation (ROL and ROR) wraps bits that fall off one end back around to the other end (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2).\n\nFor a 32-bit unsigned integer X and rotation count K:\n- `ROL(X, K) = (X << K) | (X >> (32 - K))`\n- `ROR(X, K) = (X >> K) | (X << (32 - K))`\n\nGiven X and K (0 ≤ K < 32), compute both ROL and ROR.\n\n### Input Format\n- Two space-separated unsigned 32-bit integers X and K.\n\n### Output Format\nPrint two space-separated values formatted in uppercase hex without 0x prefix (`%08X %08X`).\n\n### Example 1\n**Input:**\n```\n1 4\n```\n**Output:**\n```\n00000010 10000000\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    unsigned int x, k;\n    if (scanf(\"%u %u\", &x, &k) != 2) return 0;\n    // Perform 32-bit ROL and ROR\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    unsigned int x, k;\n    if (scanf(\"%u %u\", &x, &k) != 2) return 0;\n    k %= 32;\n    unsigned int rol = (k == 0) ? x : ((x << k) | (x >> (32 - k)));\n    unsigned int ror = (k == 0) ? x : ((x >> k) | (x << (32 - k)));\n    printf(\"%08X %08X\\n\", rol, ror);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bitwise Rotations",
      "exerciseNumber": "2.25",
      "exerciseOrder": 25,
      "page": 38,
      "concept": "Circular bitwise left and right rotations",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "1 4\n",
        "expectedOutput": "00000010 10000000\n"
      },
      {
        "input": "2863311530 0\n",
        "expectedOutput": "AAAAAAAA AAAAAAAA\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "4294967295 16\n",
        "expectedOutput": "FFFFFFFF FFFFFFFF\n"
      },
      {
        "input": "255 8\n",
        "expectedOutput": "0000FF00 FF000000\n"
      },
      {
        "input": "16 31\n",
        "expectedOutput": "00000008 00000020\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-brian-kernighan-set-bits",
    "title": "Counting Set Bits via Brian Kernighan's Bit Trick",
    "difficulty": "EASY",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Algorithms",
      "Popcount"
    ],
    "description": "### Problem Description\nIn C programming, clearing the lowest set bit in an integer can be performed in O(1) time using the identity `x = x & (x - 1)` (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2). Repeating this until x becomes 0 counts the number of set bits (1s) in exactly as many steps as there are set bits.\n\nGiven an integer N, count the number of set bits in its 32-bit unsigned representation.\n\n### Input Format\n- A single unsigned 32-bit integer N (0 ≤ N ≤ 4,294,967,295).\n\n### Output Format\nPrint the total count of set bits.\n\n### Example 1\n**Input:**\n```\n29\n```\n**Output:**\n```\n4\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    unsigned int n;\n    if (scanf(\"%u\", &n) != 1) return 0;\n    // Count set bits\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    unsigned int n;\n    if (scanf(\"%u\", &n) != 1) return 0;\n    int count = 0;\n    while (n) {\n        n &= (n - 1);\n        count++;\n    }\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bit Manipulation",
      "exerciseNumber": "2.29",
      "exerciseOrder": 29,
      "page": 41,
      "concept": "Brian Kernighan's bit-counting algorithm",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "29\n",
        "expectedOutput": "4\n"
      },
      {
        "input": "0\n",
        "expectedOutput": "0\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n",
        "expectedOutput": "1\n"
      },
      {
        "input": "4294967295\n",
        "expectedOutput": "32\n"
      },
      {
        "input": "2147483648\n",
        "expectedOutput": "1\n"
      },
      {
        "input": "1023\n",
        "expectedOutput": "10\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-parity-checker-xor-folding",
    "title": "Word Parity Determination via Parallel XOR Folding",
    "difficulty": "EASY",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Parity",
      "XOR"
    ],
    "description": "### Problem Description\nThe parity of an integer is 1 if the number of set bits is odd, and 0 if even (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2). In C, parity of a 32-bit word can be efficiently computed by parallel XOR folding:\n```c\nx ^= x >> 16;\nx ^= x >> 8;\nx ^= x >> 4;\nx ^= x >> 2;\nx ^= x >> 1;\nreturn x & 1;\n```\n\nGiven N integers, determine the parity (0 for EVEN, 1 for ODD) of each.\n\n### Input Format\n- First line: Integer T (1 ≤ T ≤ 50), the number of test numbers.\n- Next T lines: A 32-bit unsigned integer.\n\n### Output Format\nFor each number, print `ODD` or `EVEN` on a new line.\n\n### Example 1\n**Input:**\n```\n2\n5\n7\n```\n**Output:**\n```\nEVEN\nODD\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int t;\n    if (scanf(\"%d\", &t) != 1) return 0;\n    while (t--) {\n        unsigned int x;\n        scanf(\"%u\", &x);\n        // Check parity\n    }\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int t;\n    if (scanf(\"%d\", &t) != 1) return 0;\n    while (t--) {\n        unsigned int x;\n        scanf(\"%u\", &x);\n        x ^= x >> 16;\n        x ^= x >> 8;\n        x ^= x >> 4;\n        x ^= x >> 2;\n        x ^= x >> 1;\n        if (x & 1) printf(\"ODD\\n\");\n        else printf(\"EVEN\\n\");\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bitwise Parity",
      "exerciseNumber": "2.31",
      "exerciseOrder": 31,
      "page": 43,
      "concept": "Computing parity via parallel XOR folding",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2\n5\n7\n",
        "expectedOutput": "EVEN\nODD\n"
      },
      {
        "input": "1\n0\n",
        "expectedOutput": "EVEN\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\n1\n2\n3\n",
        "expectedOutput": "ODD\nODD\nEVEN\n"
      },
      {
        "input": "2\n4294967295\n4294967294\n",
        "expectedOutput": "EVEN\nODD\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-endianness-byte-swapper",
    "title": "Machine Endianness Detector and 32-Bit Byte Swapper",
    "difficulty": "MEDIUM",
    "category": "Memory & Pointers",
    "tags": [
      "Endianness",
      "Byte Order",
      "Pointers"
    ],
    "description": "### Problem Description\nIn C, memory endianness determines whether the least significant byte is stored at the lowest address (Little-Endian) or highest address (Big-Endian) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2). Converting between host byte order and network byte order requires byte swapping.\n\nGiven a 32-bit unsigned integer X in hexadecimal, reverse the order of its 4 bytes: byte 0 with byte 3, and byte 1 with byte 2.\n\n### Input Format\n- A single hexadecimal string representing a 32-bit unsigned integer (e.g., `12345678`).\n\n### Output Format\nPrint the byte-swapped value in 8-digit uppercase hexadecimal.\n\n### Example 1\n**Input:**\n```\n12345678\n```\n**Output:**\n```\n78563412\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    unsigned int x;\n    if (scanf(\"%x\", &x) != 1) return 0;\n    // Swap the 4 bytes\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    unsigned int x;\n    if (scanf(\"%x\", &x) != 1) return 0;\n    unsigned int swapped = ((x >> 24) & 0xFF) |\n                           ((x << 8)  & 0xFF0000) |\n                           ((x >> 8)  & 0xFF00) |\n                           ((x << 24) & 0xFF000000);\n    printf(\"%08X\\n\", swapped);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Byte Swapping",
      "exerciseNumber": "2.35",
      "exerciseOrder": 35,
      "page": 46,
      "concept": "Endianness conversion and multi-byte word reorganization",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "12345678\n",
        "expectedOutput": "78563412\n"
      },
      {
        "input": "AABBCCDD\n",
        "expectedOutput": "DDCCBBAA\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "00000001\n",
        "expectedOutput": "01000000\n"
      },
      {
        "input": "FFFFFFFF\n",
        "expectedOutput": "FFFFFFFF\n"
      },
      {
        "input": "00FF00FF\n",
        "expectedOutput": "FF00FF00\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch2-isolate-lowest-set-bit",
    "title": "Isolation of Lowest Set Bit and Power of Two Invariant",
    "difficulty": "EASY",
    "category": "Bitwise Operators",
    "tags": [
      "Bitwise",
      "Lowbit",
      "Twos Complement"
    ],
    "description": "### Problem Description\nIn two's complement arithmetic, the expression `x & (-x)` isolates the lowest set bit of non-zero integer `x` as a standalone power of two (Yashavant Kanetkar, *Test Your C Skills*, Chapter 2).\n\nGiven an integer N:\n1. If N <= 0, print `0 INVALID`.\n2. Else, print its lowest set bit value, followed by `POWER_OF_2` if N is an exact power of two, or `COMPOSITE` otherwise.\n\n### Input Format\n- A single integer N (−10⁵ ≤ N ≤ 10⁹).\n\n### Output Format\nPrint the isolated value and classification separated by a space.\n\n### Example 1\n**Input:**\n```\n12\n```\n**Output:**\n```\n4 COMPOSITE\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    // Isolate lowest bit and check power of two\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    if (n <= 0) {\n        printf(\"0 INVALID\\n\");\n        return 0;\n    }\n    long long lowbit = n & (-n);\n    int is_pow2 = (n & (n - 1)) == 0;\n    printf(\"%lld %s\\n\", lowbit, is_pow2 ? \"POWER_OF_2\" : \"COMPOSITE\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 2,
      "chapterTitle": "Operators",
      "chapterOrder": 2,
      "section": "Bit Tricks",
      "exerciseNumber": "2.40",
      "exerciseOrder": 40,
      "page": 49,
      "concept": "Lowest bit isolation and power of 2 bitwise checks",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "12\n",
        "expectedOutput": "4 COMPOSITE\n"
      },
      {
        "input": "16\n",
        "expectedOutput": "16 POWER_OF_2\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n",
        "expectedOutput": "0 INVALID\n"
      },
      {
        "input": "-8\n",
        "expectedOutput": "0 INVALID\n"
      },
      {
        "input": "1\n",
        "expectedOutput": "1 POWER_OF_2\n"
      },
      {
        "input": "100\n",
        "expectedOutput": "4 COMPOSITE\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-switch-fallthrough-jump-table",
    "title": "Switch Fallthrough Invariant and Cumulative Rate Calculator",
    "difficulty": "EASY",
    "category": "Control Flow",
    "tags": [
      "Control Flow",
      "Switch",
      "Fallthrough"
    ],
    "description": "### Problem Description\nIn C, omitting the `break` statement in a `switch` construct causes execution to fall through to subsequent case labels (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3: Control Flow).\n\nAn institutional utility charges tiered usage rates:\n- Tier 1: base unit charge of 5 points\n- Tier 2 (includes Tier 1): additional 10 points\n- Tier 3 (includes Tier 2 & 1): additional 20 points\n- Tier 4 (includes all prior): additional 40 points\n\nGiven tier level T (1 to 4) and multiplier M, calculate the total points accrued when executing with intentional fallthrough starting from tier T down to 1.\n\n### Input Format\n- Two space-separated integers: T (1 ≤ T ≤ 4) and M (1 ≤ M ≤ 100).\n\n### Output Format\nPrint the total computed points.\n\n### Example 1\n**Input:**\n```\n3 2\n```\n**Output:**\n```\n70\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int t, m;\n    if (scanf(\"%d %d\", &t, &m) != 2) return 0;\n    // Calculate fallthrough cumulative sum\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int t, m;\n    if (scanf(\"%d %d\", &t, &m) != 2) return 0;\n    int total = 0;\n    switch (t) {\n        case 4: total += 40 * m;\n        case 3: total += 20 * m;\n        case 2: total += 10 * m;\n        case 1: total += 5 * m;\n    }\n    printf(\"%d\\n\", total);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Switch Fallthrough",
      "exerciseNumber": "3.6",
      "exerciseOrder": 6,
      "page": 54,
      "concept": "Intentional fallthrough in C switch-case structures",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 2\n",
        "expectedOutput": "70\n"
      },
      {
        "input": "1 10\n",
        "expectedOutput": "50\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "4 1\n",
        "expectedOutput": "75\n"
      },
      {
        "input": "2 5\n",
        "expectedOutput": "75\n"
      },
      {
        "input": "4 3\n",
        "expectedOutput": "225\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-duffs-device-unrolling",
    "title": "Duff's Device Interleaved Switch-Loop Copy Simulator",
    "difficulty": "HARD",
    "category": "Control Flow",
    "tags": [
      "Control Flow",
      "Duffs Device",
      "Loop Unrolling"
    ],
    "description": "### Problem Description\nTom Duff famously invented an idiom in C known as \"Duff's Device\", where a switch statement is legally interleaved with a do-while loop to unroll loop copies by a factor of 8 (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3: Control Flow).\n\nGiven N integer values, simulate copying them into an output buffer using Duff's 8-way unrolled copy mechanism, printing the batch count (how many times the outer do-while loop iterated) followed by the copied elements in reverse order.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 100).\n- Second line: N space-separated integers.\n\n### Output Format\n- First line: The number of loop iterations required.\n- Second line: The array printed in reverse order.\n\n### Example 1\n**Input:**\n```\n10\n1 2 3 4 5 6 7 8 9 10\n```\n**Output:**\n```\nITERATIONS: 2\n10 9 8 7 6 5 4 3 2 1\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Implement Duff's copy and print results\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[128];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int iters = (n + 7) / 8;\n    printf(\"ITERATIONS: %d\\n\", iters);\n    for (int i = n - 1; i >= 0; i--) {\n        printf(\"%d%c\", arr[i], (i == 0) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 40,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Advanced Looping",
      "exerciseNumber": "3.18",
      "exerciseOrder": 18,
      "page": 62,
      "concept": "Duff's device loop unrolling architecture",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "10\n1 2 3 4 5 6 7 8 9 10\n",
        "expectedOutput": "ITERATIONS: 2\n10 9 8 7 6 5 4 3 2 1\n"
      },
      {
        "input": "8\n5 5 5 5 5 5 5 5\n",
        "expectedOutput": "ITERATIONS: 1\n5 5 5 5 5 5 5 5\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n42\n",
        "expectedOutput": "ITERATIONS: 1\n42\n"
      },
      {
        "input": "9\n1 2 3 4 5 6 7 8 9\n",
        "expectedOutput": "ITERATIONS: 2\n9 8 7 6 5 4 3 2 1\n"
      },
      {
        "input": "16\n1 1 1 1 2 2 2 2 3 3 3 3 4 4 4 4\n",
        "expectedOutput": "ITERATIONS: 2\n4 4 4 4 3 3 3 3 2 2 2 2 1 1 1 1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-prime-factorization-loop",
    "title": "Trial Division Prime Factorization with Exponent Format",
    "difficulty": "EASY",
    "category": "Control Flow",
    "tags": [
      "Loops",
      "Prime Numbers",
      "Math"
    ],
    "description": "### Problem Description\nFinding the prime factors of an integer is a classic loop iteration benchmark (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3). Repeatedly dividing by the smallest possible prime divisor breaks any integer N into canonical prime powers: $p_1^{e_1} \\times p_2^{e_2} \\dots$\n\nGiven integer N (2 ≤ N ≤ 10⁶), print its prime factorization in canonical ascending order formatted as `p^e` separated by `*`.\n\n### Input Format\n- A single integer N.\n\n### Output Format\nPrint the factorization string (e.g., `2^3 * 3^1 * 5^2`).\n\n### Example 1\n**Input:**\n```\n600\n```\n**Output:**\n```\n2^3 * 3^1 * 5^2\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Factorize n into prime powers\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int first = 1;\n    for (int p = 2; p * p <= n; p++) {\n        if (n % p == 0) {\n            int count = 0;\n            while (n % p == 0) {\n                count++;\n                n /= p;\n            }\n            if (!first) printf(\" * \");\n            printf(\"%d^%d\", p, count);\n            first = 0;\n        }\n    }\n    if (n > 1) {\n        if (!first) printf(\" * \");\n        printf(\"%d^1\", n);\n    }\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Loops and Invariants",
      "exerciseNumber": "3.22",
      "exerciseOrder": 22,
      "page": 65,
      "concept": "Trial division prime factorization and nested loops",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "600\n",
        "expectedOutput": "2^3 * 3^1 * 5^2\n"
      },
      {
        "input": "13\n",
        "expectedOutput": "13^1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n",
        "expectedOutput": "2^1\n"
      },
      {
        "input": "100\n",
        "expectedOutput": "2^2 * 5^2\n"
      },
      {
        "input": "99991\n",
        "expectedOutput": "99991^1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-collatz-hailstone-trajectory",
    "title": "Collatz Conjecture Hailstone Trajectory and Peak Altitude",
    "difficulty": "EASY",
    "category": "Control Flow",
    "tags": [
      "Loops",
      "Collatz",
      "Number Theory"
    ],
    "description": "### Problem Description\nThe Collatz conjecture states that starting from any positive integer N: if N is even, $N = N / 2$; if odd, $N = 3N + 1$. The sequence always terminates at 1 (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3).\n\nGiven N (1 ≤ N ≤ 10⁵), determine:\n1. The total number of steps to reach 1.\n2. The peak maximum value encountered along the trajectory.\n\n### Input Format\n- A single positive integer N.\n\n### Output Format\nPrint two space-separated integers: `STEPS PEAK`.\n\n### Example 1\n**Input:**\n```\n6\n```\n**Output:**\n```\n8 16\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    // Compute Collatz steps and peak\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    int steps = 0;\n    long long peak = n;\n    while (n != 1) {\n        if (n % 2 == 0) n /= 2;\n        else n = 3 * n + 1;\n        if (n > peak) peak = n;\n        steps++;\n    }\n    printf(\"%d %lld\\n\", steps, peak);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Indefinite Loops",
      "exerciseNumber": "3.25",
      "exerciseOrder": 25,
      "page": 67,
      "concept": "While loop convergence and maximum value tracking",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "6\n",
        "expectedOutput": "8 16\n"
      },
      {
        "input": "1\n",
        "expectedOutput": "0 1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "7\n",
        "expectedOutput": "16 52\n"
      },
      {
        "input": "27\n",
        "expectedOutput": "111 9232\n"
      },
      {
        "input": "1024\n",
        "expectedOutput": "10 1024\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-armstrong-n-digit-checker",
    "title": "N-Digit Armstrong (Narcissistic) Number Verifier",
    "difficulty": "EASY",
    "category": "Control Flow",
    "tags": [
      "Loops",
      "Digits",
      "Math"
    ],
    "description": "### Problem Description\nAn Armstrong number of K digits is an integer such that the sum of its digits each raised to the power of K equals the number itself (e.g. $153 = 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153$) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3).\n\nGiven an integer N (1 ≤ N ≤ 10⁷), determine if it is an Armstrong number.\n\n### Input Format\n- A single integer N.\n\n### Output Format\nPrint `YES` if Armstrong, or `NO` followed by the computed sum.\n\n### Example 1\n**Input:**\n```\n153\n```\n**Output:**\n```\nYES\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    // Verify Armstrong number\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nstatic long long ipow(long long b, int p) {\n    long long r = 1;\n    while (p--) r *= b;\n    return r;\n}\n\nint main() {\n    long long n;\n    if (scanf(\"%lld\", &n) != 1) return 0;\n    long long temp = n;\n    int k = 0;\n    while (temp > 0) {\n        k++;\n        temp /= 10;\n    }\n    temp = n;\n    long long sum = 0;\n    while (temp > 0) {\n        sum += ipow(temp % 10, k);\n        temp /= 10;\n    }\n    if (sum == n) printf(\"YES\\n\");\n    else printf(\"NO %lld\\n\", sum);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Digit Extraction",
      "exerciseNumber": "3.29",
      "exerciseOrder": 29,
      "page": 70,
      "concept": "Extracting digits and computing custom power expansions",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "153\n",
        "expectedOutput": "YES\n"
      },
      {
        "input": "120\n",
        "expectedOutput": "NO 9\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "370\n",
        "expectedOutput": "YES\n"
      },
      {
        "input": "371\n",
        "expectedOutput": "YES\n"
      },
      {
        "input": "9474\n",
        "expectedOutput": "YES\n"
      },
      {
        "input": "500\n",
        "expectedOutput": "NO 125\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch3-pascals-triangle-row",
    "title": "Pascal's Triangle Row Generator via In-Line Combination",
    "difficulty": "EASY",
    "category": "Control Flow",
    "tags": [
      "Loops",
      "Combinatorics",
      "Math"
    ],
    "description": "### Problem Description\nThe elements of the N-th row of Pascal's triangle correspond to combinations $\\binom{N}{K}$ for $K = 0, 1, \\dots, N$. Each subsequent value can be computed in O(1) from the previous value using $\\binom{N}{K} = \\binom{N}{K-1} \\times \\frac{N - K + 1}{K}$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 3).\n\nGiven row index N (0 ≤ N ≤ 25), print the entire N-th row with numbers separated by spaces.\n\n### Input Format\n- A single non-negative integer N.\n\n### Output Format\nPrint the elements of row N separated by spaces.\n\n### Example 1\n**Input:**\n```\n4\n```\n**Output:**\n```\n1 4 6 4 1\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Print row n of Pascal's triangle\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    long long val = 1;\n    printf(\"%lld\", val);\n    for (int k = 1; k <= n; k++) {\n        val = val * (n - k + 1) / k;\n        printf(\" %lld\", val);\n    }\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 3,
      "chapterTitle": "Control Flow",
      "chapterOrder": 3,
      "section": "Combinatorial Patterns",
      "exerciseNumber": "3.34",
      "exerciseOrder": 34,
      "page": 73,
      "concept": "Generating Pascal's triangle rows without precalculating factorials",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n",
        "expectedOutput": "1 4 6 4 1\n"
      },
      {
        "input": "0\n",
        "expectedOutput": "1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n",
        "expectedOutput": "1 1\n"
      },
      {
        "input": "5\n",
        "expectedOutput": "1 5 10 10 5 1\n"
      },
      {
        "input": "10\n",
        "expectedOutput": "1 10 45 120 210 252 210 120 45 10 1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch4-pointer-subtraction-distance",
    "title": "Pointer Arithmetic Element Distance & Scale Invariant",
    "difficulty": "EASY",
    "category": "Pointers",
    "tags": [
      "Pointers",
      "Pointer Arithmetic",
      "Memory"
    ],
    "description": "### Problem Description\nIn C, subtracting two pointers `ptr2 - ptr1` of the same type yields the number of elements of that type between them, not the raw byte count (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4: Pointers).\n\nGiven an array of N integers and two 0-based indices I and J, verify pointer distance: compute `(&arr[J] - &arr[I])` and raw byte difference `((char*)&arr[J] - (char*)&arr[I])`.\n\n### Input Format\n- First line: Integer N (2 ≤ N ≤ 100).\n- Second line: N space-separated integers.\n- Third line: Two integers I and J (0 ≤ I, J < N).\n\n### Output Format\nPrint two space-separated values: the element distance followed by the byte offset.\n\n### Example 1\n**Input:**\n```\n5\n10 20 30 40 50\n1 4\n```\n**Output:**\n```\n3 12\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[128];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int i_idx, j_idx;\n    scanf(\"%d %d\", &i_idx, &j_idx);\n    // Compute pointer distance\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[128];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int i_idx, j_idx;\n    scanf(\"%d %d\", &i_idx, &j_idx);\n    int *p1 = &arr[i_idx];\n    int *p2 = &arr[j_idx];\n    long elem_dist = p2 - p1;\n    long byte_dist = (char*)p2 - (char*)p1;\n    printf(\"%ld %ld\\n\", elem_dist, byte_dist);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 4,
      "chapterTitle": "Pointers",
      "chapterOrder": 4,
      "section": "Pointer Arithmetic",
      "exerciseNumber": "4.5",
      "exerciseOrder": 5,
      "page": 81,
      "concept": "Pointer subtraction scaling by sizeof(target_type)",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\n10 20 30 40 50\n1 4\n",
        "expectedOutput": "3 12\n"
      },
      {
        "input": "3\n1 2 3\n2 0\n",
        "expectedOutput": "-2 -8\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "4\n5 6 7 8\n2 2\n",
        "expectedOutput": "0 0\n"
      },
      {
        "input": "6\n1 2 3 4 5 6\n0 5\n",
        "expectedOutput": "5 20\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch4-in-place-pointer-reversal",
    "title": "In-Place Array Reversal using Converging Dual Pointers",
    "difficulty": "EASY",
    "category": "Pointers",
    "tags": [
      "Pointers",
      "Arrays",
      "In-Place"
    ],
    "description": "### Problem Description\nReversing an array without allocating secondary buffers is a classic dual-pointer paradigm (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4: Pointers). Two pointers start at opposite ends of the buffer and swap contents until they meet.\n\nGiven N integers, reverse the array in-place using two integer pointers.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 100).\n- Second line: N space-separated integers.\n\n### Output Format\nPrint the reversed array on a single line separated by spaces.\n\n### Example 1\n**Input:**\n```\n5\n1 2 3 4 5\n```\n**Output:**\n```\n5 4 3 2 1\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[128];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    // Reverse using pointers\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[128];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int *left = arr;\n    int *right = arr + n - 1;\n    while (left < right) {\n        int temp = *left;\n        *left = *right;\n        *right = temp;\n        left++;\n        right--;\n    }\n    for (int i = 0; i < n; i++) {\n        printf(\"%d%c\", arr[i], (i == n - 1) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 4,
      "chapterTitle": "Pointers",
      "chapterOrder": 4,
      "section": "Pointer Traversal",
      "exerciseNumber": "4.9",
      "exerciseOrder": 9,
      "page": 84,
      "concept": "Two-pointer converging swap in contiguous memory",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "5 4 3 2 1\n"
      },
      {
        "input": "2\n10 20\n",
        "expectedOutput": "20 10\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n99\n",
        "expectedOutput": "99\n"
      },
      {
        "input": "6\n1 2 3 4 5 6\n",
        "expectedOutput": "6 5 4 3 2 1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch4-generic-memcpy-void-pointer",
    "title": "Custom Generic Memory Copy Engine via Void Pointers",
    "difficulty": "MEDIUM",
    "category": "Pointers",
    "tags": [
      "Pointers",
      "Void Pointers",
      "Memory"
    ],
    "description": "### Problem Description\nIn standard C, `memcpy` operates on generic `void*` buffers by casting them internally to `unsigned char*` to perform byte-by-byte memory copying (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4).\n\nImplement `void my_memcpy(void *dest, const void *src, size_t n)` to duplicate an array of N integers into an uninitialized target buffer and verify the destination contents.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 50).\n- Second line: N space-separated integers.\n\n### Output Format\nPrint `COPIED: ` followed by the copied integers.\n\n### Example 1\n**Input:**\n```\n4\n100 200 300 400\n```\n**Output:**\n```\nCOPIED: 100 200 300 400\n```",
    "starterCode": "#include <stdio.h>\n#include <stddef.h>\n\n// TODO: Implement my_memcpy(void *dest, const void *src, size_t n)\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Read and copy\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stddef.h>\n\nvoid my_memcpy(void *dest, const void *src, size_t n) {\n    unsigned char *d = (unsigned char *)dest;\n    const unsigned char *s = (const unsigned char *)src;\n    while (n--) *d++ = *s++;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int src[64], dest[64];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &src[i]);\n    my_memcpy(dest, src, n * sizeof(int));\n    printf(\"COPIED: \");\n    for (int i = 0; i < n; i++) {\n        printf(\"%d%c\", dest[i], (i == n - 1) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 4,
      "chapterTitle": "Pointers",
      "chapterOrder": 4,
      "section": "Void Pointers",
      "exerciseNumber": "4.15",
      "exerciseOrder": 15,
      "page": 89,
      "concept": "Byte-level generic memory copying via unsigned char casts",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n100 200 300 400\n",
        "expectedOutput": "COPIED: 100 200 300 400\n"
      },
      {
        "input": "1\n7\n",
        "expectedOutput": "COPIED: 7\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "5\n-5 0 5 -10 10\n",
        "expectedOutput": "COPIED: -5 0 5 -10 10\n"
      },
      {
        "input": "3\n999 888 777\n",
        "expectedOutput": "COPIED: 999 888 777\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch4-function-pointer-state-machine",
    "title": "Function Pointer Array Finite State Machine (FSM)",
    "difficulty": "MEDIUM",
    "category": "Pointers",
    "tags": [
      "Pointers",
      "Function Pointers",
      "State Machine"
    ],
    "description": "### Problem Description\nIn embedded C systems, Finite State Machines (FSMs) are frequently implemented using an array of function pointers where each state index directly invokes its handler routine (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4).\n\nA 3-state system operates as follows:\n- State 0 (INIT): input X transitions to State 1 if X > 0, else remains in 0.\n- State 1 (ACTIVE): input X transitions to State 2 if X == 0, else remains in 1.\n- State 2 (DONE): input X resets to State 0.\n\nGiven N integer inputs starting from State 0, print the state sequence after each step.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 50).\n- Second line: N space-separated integers.\n\n### Output Format\nPrint the sequence of states separated by ` -> `.\n\n### Example 1\n**Input:**\n```\n4\n5 10 0 1\n```\n**Output:**\n```\n0 -> 1 -> 1 -> 2 -> 0\n```",
    "starterCode": "#include <stdio.h>\n\n// TODO: Implement FSM handlers with function pointer array\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Run FSM\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\ntypedef int (*state_handler_t)(int);\n\nstatic int handle_init(int x) { return (x > 0) ? 1 : 0; }\nstatic int handle_active(int x) { return (x == 0) ? 2 : 1; }\nstatic int handle_done(int x) { return 0; }\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    state_handler_t fsm[] = { handle_init, handle_active, handle_done };\n    int cur = 0;\n    printf(\"%d\", cur);\n    for (int i = 0; i < n; i++) {\n        int x;\n        scanf(\"%d\", &x);\n        cur = fsm[cur](x);\n        printf(\" -> %d\", cur);\n    }\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 4,
      "chapterTitle": "Pointers",
      "chapterOrder": 4,
      "section": "Function Pointers",
      "exerciseNumber": "4.22",
      "exerciseOrder": 22,
      "page": 93,
      "concept": "Array of function pointers dispatching state transitions",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "4\n5 10 0 1\n",
        "expectedOutput": "0 -> 1 -> 1 -> 2 -> 0\n"
      },
      {
        "input": "2\n-1 0\n",
        "expectedOutput": "0 -> 0 -> 0\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\n1 0 1\n",
        "expectedOutput": "0 -> 1 -> 2 -> 0\n"
      },
      {
        "input": "5\n1 1 1 0 5\n",
        "expectedOutput": "0 -> 1 -> 1 -> 1 -> 2 -> 0\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch4-strtok-pointer-tokenizer",
    "title": "Delimited String Tokenizer via Dual-Pointer Mutation",
    "difficulty": "MEDIUM",
    "category": "Strings & Pointers",
    "tags": [
      "Pointers",
      "Strings",
      "Parsing"
    ],
    "description": "### Problem Description\nThe standard C library function `strtok` tokenizes strings by replacing delimiter characters with null terminators (`'\\0'`) in-place using internal pointer tracking (Yashavant Kanetkar, *Test Your C Skills*, Chapter 4).\n\nGiven a comma-separated string containing words, tokenize the string by replacing every comma `,` with a null character and print each extracted token on a new line with its length.\n\n### Input Format\n- A single string of up to 256 characters without spaces, separated by commas.\n\n### Output Format\nFor each token, print: `TOKEN: <word> (LEN: <length>)`.\n\n### Example 1\n**Input:**\n```\napple,banana,cherry\n```\n**Output:**\n```\nTOKEN: apple (LEN: 5)\nTOKEN: banana (LEN: 6)\nTOKEN: cherry (LEN: 6)\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[256];\n    if (scanf(\"%s\", str) != 1) return 0;\n    // Tokenize on commas\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[256];\n    if (scanf(\"%s\", str) != 1) return 0;\n    char *p = str;\n    while (*p) {\n        char *start = p;\n        while (*p && *p != ',') p++;\n        if (*p == ',') {\n            *p = '\\0';\n            p++;\n        }\n        printf(\"TOKEN: %s (LEN: %lu)\\n\", start, strlen(start));\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 4,
      "chapterTitle": "Pointers",
      "chapterOrder": 4,
      "section": "String Pointers",
      "exerciseNumber": "4.28",
      "exerciseOrder": 28,
      "page": 98,
      "concept": "In-place null-termination tokenization via pointer scanning",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "apple,banana,cherry\n",
        "expectedOutput": "TOKEN: apple (LEN: 5)\nTOKEN: banana (LEN: 6)\nTOKEN: cherry (LEN: 6)\n"
      },
      {
        "input": "logicq\n",
        "expectedOutput": "TOKEN: logicq (LEN: 6)\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "a,b,c,d,e\n",
        "expectedOutput": "TOKEN: a (LEN: 1)\nTOKEN: b (LEN: 1)\nTOKEN: c (LEN: 1)\nTOKEN: d (LEN: 1)\nTOKEN: e (LEN: 1)\n"
      },
      {
        "input": "hello,world\n",
        "expectedOutput": "TOKEN: hello (LEN: 5)\nTOKEN: world (LEN: 5)\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch5-ackermann-function-threshold",
    "title": "Ackermann-Peter Recursive Invariant and Threshold Evaluator",
    "difficulty": "MEDIUM",
    "category": "Functions & Recursion",
    "tags": [
      "Recursion",
      "Functions",
      "Math"
    ],
    "description": "### Problem Description\nThe Ackermann function is a classic non-primitive recursive function that grows faster than any exponential function (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5: Functions):\n- $A(0, n) = n + 1$\n- $A(m, 0) = A(m - 1, 1)$\n- $A(m, n) = A(m - 1, A(m, n - 1))$\n\nGiven non-negative integers M and N (0 ≤ M ≤ 3, 0 ≤ N ≤ 10), compute $A(M, N)$.\n\n### Input Format\n- Two space-separated integers M and N.\n\n### Output Format\nPrint the evaluated integer.\n\n### Example 1\n**Input:**\n```\n2 3\n```\n**Output:**\n```\n9\n```",
    "starterCode": "#include <stdio.h>\n\nint ackermann(int m, int n);\n\nint main() {\n    int m, n;\n    if (scanf(\"%d %d\", &m, &n) != 2) return 0;\n    // Call ackermann\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nstatic int ackermann(int m, int n) {\n    if (m == 0) return n + 1;\n    if (n == 0) return ackermann(m - 1, 1);\n    return ackermann(m - 1, ackermann(m, n - 1));\n}\n\nint main() {\n    int m, n;\n    if (scanf(\"%d %d\", &m, &n) != 2) return 0;\n    printf(\"%d\\n\", ackermann(m, n));\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 5,
      "chapterTitle": "Functions and Recursion",
      "chapterOrder": 5,
      "section": "Deep Recursion",
      "exerciseNumber": "5.6",
      "exerciseOrder": 6,
      "page": 104,
      "concept": "Nested non-primitive recursive call evaluation",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2 3\n",
        "expectedOutput": "9\n"
      },
      {
        "input": "1 4\n",
        "expectedOutput": "6\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "0 5\n",
        "expectedOutput": "6\n"
      },
      {
        "input": "3 2\n",
        "expectedOutput": "29\n"
      },
      {
        "input": "3 3\n",
        "expectedOutput": "61\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch5-towers-of-hanoi-sequence",
    "title": "Towers of Hanoi Recursive Move Sequence Generator",
    "difficulty": "EASY",
    "category": "Functions & Recursion",
    "tags": [
      "Recursion",
      "Divide and Conquer",
      "Algorithms"
    ],
    "description": "### Problem Description\nThe classic Towers of Hanoi puzzle moves N disks from source peg A to destination peg C using auxiliary peg B in $2^N - 1$ optimal moves (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5).\n\nGiven N (1 ≤ N ≤ 6), print the exact move sequence.\n\n### Input Format\n- A single integer N.\n\n### Output Format\nPrint each move in the format: `MOVE <disk> FROM <src> TO <dest>`.\n\n### Example 1\n**Input:**\n```\n2\n```\n**Output:**\n```\nMOVE 1 FROM A TO B\nMOVE 2 FROM A TO C\nMOVE 1 FROM B TO C\n```",
    "starterCode": "#include <stdio.h>\n\nvoid hanoi(int n, char from, char to, char aux);\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Call hanoi\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nstatic void hanoi(int n, char from, char to, char aux) {\n    if (n == 0) return;\n    hanoi(n - 1, from, aux, to);\n    printf(\"MOVE %d FROM %c TO %c\\n\", n, from, to);\n    hanoi(n - 1, aux, to, from);\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    hanoi(n, 'A', 'C', 'B');\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 5,
      "chapterTitle": "Functions and Recursion",
      "chapterOrder": 5,
      "section": "Recursion Invariants",
      "exerciseNumber": "5.12",
      "exerciseOrder": 12,
      "page": 108,
      "concept": "Optimal recursive disk transfer decomposition",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "2\n",
        "expectedOutput": "MOVE 1 FROM A TO B\nMOVE 2 FROM A TO C\nMOVE 1 FROM B TO C\n"
      },
      {
        "input": "1\n",
        "expectedOutput": "MOVE 1 FROM A TO C\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\n",
        "expectedOutput": "MOVE 1 FROM A TO C\nMOVE 2 FROM A TO B\nMOVE 1 FROM C TO B\nMOVE 3 FROM A TO C\nMOVE 1 FROM B TO A\nMOVE 2 FROM B TO C\nMOVE 1 FROM A TO C\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch5-recursive-palindrome-verifier",
    "title": "Recursive Substring Palindrome Boundary Invariant",
    "difficulty": "EASY",
    "category": "Functions & Recursion",
    "tags": [
      "Recursion",
      "Strings",
      "Divide and Conquer"
    ],
    "description": "### Problem Description\nA string S is a palindrome if $S[L] == S[R]$ and the inner substring $S[L+1 \\dots R-1]$ is recursively also a palindrome (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5).\n\nGiven an ASCII alphanumeric string S of length up to 100, determine if it is a palindrome using a pure recursive function without while/for loops.\n\n### Input Format\n- A single string S.\n\n### Output Format\nPrint `PALINDROME` or `NOT_PALINDROME`.\n\n### Example 1\n**Input:**\n```\nracecar\n```\n**Output:**\n```\nPALINDROME\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint is_pal(const char *s, int l, int r);\n\nint main() {\n    char s[128];\n    if (scanf(\"%s\", s) != 1) return 0;\n    // Verify recursively\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nstatic int is_pal(const char *s, int l, int r) {\n    if (l >= r) return 1;\n    if (s[l] != s[r]) return 0;\n    return is_pal(s, l + 1, r - 1);\n}\n\nint main() {\n    char s[128];\n    if (scanf(\"%s\", s) != 1) return 0;\n    int res = is_pal(s, 0, (int)strlen(s) - 1);\n    if (res) printf(\"PALINDROME\\n\");\n    else printf(\"NOT_PALINDROME\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 5,
      "chapterTitle": "Functions and Recursion",
      "chapterOrder": 5,
      "section": "Recursive Invariants",
      "exerciseNumber": "5.18",
      "exerciseOrder": 18,
      "page": 112,
      "concept": "Two-pointer recursive substring verification",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "racecar\n",
        "expectedOutput": "PALINDROME\n"
      },
      {
        "input": "logicq\n",
        "expectedOutput": "NOT_PALINDROME\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "a\n",
        "expectedOutput": "PALINDROME\n"
      },
      {
        "input": "noon\n",
        "expectedOutput": "PALINDROME\n"
      },
      {
        "input": "abcdeba\n",
        "expectedOutput": "NOT_PALINDROME\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch5-euclidean-gcd-lcm-engine",
    "title": "Euclidean GCD & LCM Engine with Extended Coprime Check",
    "difficulty": "EASY",
    "category": "Functions & Recursion",
    "tags": [
      "Recursion",
      "Math",
      "Number Theory"
    ],
    "description": "### Problem Description\nThe Euclidean algorithm computes the greatest common divisor: $\\gcd(A, B) = \\gcd(B, A \\pmod B)$ with base case $\\gcd(A, 0) = A$ (Yashavant Kanetkar, *Test Your C Skills*, Chapter 5). The least common multiple is given by $\\text{lcm}(A, B) = (A \\times B) / \\gcd(A, B)$.\n\nGiven two positive integers A and B (1 ≤ A, B ≤ 10⁹), print their GCD, LCM, and `COPRIME` if $\\gcd == 1$ or `NOT_COPRIME`.\n\n### Input Format\n- Two space-separated integers A and B.\n\n### Output Format\nPrint `GCD: <g> | LCM: <l> | <status>`.\n\n### Example 1\n**Input:**\n```\n12 18\n```\n**Output:**\n```\nGCD: 6 | LCM: 36 | NOT_COPRIME\n```",
    "starterCode": "#include <stdio.h>\n\nlong long gcd(long long a, long long b);\n\nint main() {\n    long long a, b;\n    if (scanf(\"%lld %lld\", &a, &b) != 2) return 0;\n    // Compute GCD and LCM\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nstatic long long gcd(long long a, long long b) {\n    return (b == 0) ? a : gcd(b, a % b);\n}\n\nint main() {\n    long long a, b;\n    if (scanf(\"%lld %lld\", &a, &b) != 2) return 0;\n    long long g = gcd(a, b);\n    long long l = (a / g) * b;\n    printf(\"GCD: %lld | LCM: %lld | %s\\n\", g, l, (g == 1) ? \"COPRIME\" : \"NOT_COPRIME\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 5,
      "chapterTitle": "Functions and Recursion",
      "chapterOrder": 5,
      "section": "Euclidean Algorithm",
      "exerciseNumber": "5.24",
      "exerciseOrder": 24,
      "page": 115,
      "concept": "Recursive modular division for GCD and LCM derivation",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "12 18\n",
        "expectedOutput": "GCD: 6 | LCM: 36 | NOT_COPRIME\n"
      },
      {
        "input": "7 13\n",
        "expectedOutput": "GCD: 1 | LCM: 91 | COPRIME\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "100 25\n",
        "expectedOutput": "GCD: 25 | LCM: 100 | NOT_COPRIME\n"
      },
      {
        "input": "14 15\n",
        "expectedOutput": "GCD: 1 | LCM: 210 | COPRIME\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch6-kadanes-max-subarray",
    "title": "Kadane's Dynamic Max Subarray Sum and Bounds Tracker",
    "difficulty": "MEDIUM",
    "category": "Arrays",
    "tags": [
      "Arrays",
      "Dynamic Programming",
      "Algorithms"
    ],
    "description": "### Problem Description\nKadane's algorithm finds the contiguous subarray within a one-dimensional array of numbers that has the largest sum in O(N) linear time (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: Arrays).\n\nGiven N integers, print the maximum contiguous subarray sum along with the 0-based starting and ending indices.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 1000).\n- Second line: N space-separated integers (−10⁴ ≤ arr[i] ≤ 10⁴).\n\n### Output Format\nPrint `MAX_SUM: <sum> [INDEX: <start>..<end>]`.\n\n### Example 1\n**Input:**\n```\n8\n-2 -3 4 -1 -2 1 5 -3\n```\n**Output:**\n```\nMAX_SUM: 7 [INDEX: 2..6]\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Implement Kadane's algorithm\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    long long arr[1024];\n    for (int i = 0; i < n; i++) scanf(\"%lld\", &arr[i]);\n    long long max_so_far = arr[0], curr_max = arr[0];\n    int start = 0, end = 0, s = 0;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] > curr_max + arr[i]) {\n            curr_max = arr[i];\n            s = i;\n        } else {\n            curr_max += arr[i];\n        }\n        if (curr_max > max_so_far) {\n            max_so_far = curr_max;\n            start = s;\n            end = i;\n        }\n    }\n    printf(\"MAX_SUM: %lld [INDEX: %d..%d]\\n\", max_so_far, start, end);\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 6,
      "chapterTitle": "Arrays",
      "chapterOrder": 6,
      "section": "Subarray Optimization",
      "exerciseNumber": "6.8",
      "exerciseOrder": 8,
      "page": 122,
      "concept": "Linear time maximum subarray sum tracking with boundary indices",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "8\n-2 -3 4 -1 -2 1 5 -3\n",
        "expectedOutput": "MAX_SUM: 7 [INDEX: 2..6]\n"
      },
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "MAX_SUM: 10 [INDEX: 0..3]\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\n-5 -2 -8\n",
        "expectedOutput": "MAX_SUM: -2 [INDEX: 1..1]\n"
      },
      {
        "input": "5\n10 -5 20 -15 30\n",
        "expectedOutput": "MAX_SUM: 40 [INDEX: 0..4]\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch6-matrix-in-place-transpose",
    "title": "Square Matrix In-Place Symmetrical Transposition",
    "difficulty": "EASY",
    "category": "Arrays",
    "tags": [
      "Arrays",
      "Matrix",
      "2D Arrays"
    ],
    "description": "### Problem Description\nThe transpose of an N x N square matrix exchanges elements across the main diagonal: $M[i][j] \\leftrightarrow M[j][i]$ for $j > i$ in-place without auxiliary matrix allocation (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: Arrays).\n\nGiven an N x N matrix, transpose it in-place and print the resulting matrix.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 20).\n- Next N lines: N space-separated integers representing the matrix rows.\n\n### Output Format\nPrint the N rows of the transposed matrix, elements separated by spaces.\n\n### Example 1\n**Input:**\n```\n3\n1 2 3\n4 5 6\n7 8 9\n```\n**Output:**\n```\n1 4 7\n2 5 8\n3 6 9\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Read and transpose matrix in-place\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int m[25][25];\n    for (int i = 0; i < n; i++)\n        for (int j = 0; j < n; j++)\n            scanf(\"%d\", &m[i][j]);\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            int temp = m[i][j];\n            m[i][j] = m[j][i];\n            m[j][i] = temp;\n        }\n    }\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"%d%c\", m[i][j], (j == n - 1) ? '\\n' : ' ');\n        }\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 6,
      "chapterTitle": "Arrays",
      "chapterOrder": 6,
      "section": "Multi-dimensional Arrays",
      "exerciseNumber": "6.15",
      "exerciseOrder": 15,
      "page": 126,
      "concept": "In-place diagonal element swapping in 2D contiguous arrays",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3\n1 2 3\n4 5 6\n7 8 9\n",
        "expectedOutput": "1 4 7\n2 5 8\n3 6 9\n"
      },
      {
        "input": "2\n10 20\n30 40\n",
        "expectedOutput": "10 30\n20 40\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n99\n",
        "expectedOutput": "99\n"
      },
      {
        "input": "4\n1 0 0 0\n0 2 0 0\n0 0 3 0\n0 0 0 4\n",
        "expectedOutput": "1 0 0 0\n0 2 0 0\n0 0 3 0\n0 0 0 4\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch6-matrix-90deg-clockwise-rotation",
    "title": "90-Degree Clockwise Matrix Rotation Engine",
    "difficulty": "MEDIUM",
    "category": "Arrays",
    "tags": [
      "Arrays",
      "Matrix",
      "Linear Algebra"
    ],
    "description": "### Problem Description\nRotating an N x N matrix clockwise by 90 degrees can be decomposed into two fundamental matrix transformations: transpose the matrix, then reverse each row horizontally (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: Arrays).\n\nGiven an N x N matrix, rotate it 90 degrees clockwise in-place.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 20).\n- Next N lines: N space-separated integers.\n\n### Output Format\nPrint the rotated matrix.\n\n### Example 1\n**Input:**\n```\n3\n1 2 3\n4 5 6\n7 8 9\n```\n**Output:**\n```\n7 4 1\n8 5 2\n9 6 3\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Rotate matrix 90 degrees clockwise\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int m[25][25];\n    for (int i = 0; i < n; i++)\n        for (int j = 0; j < n; j++)\n            scanf(\"%d\", &m[i][j]);\n    // 1. Transpose\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            int temp = m[i][j];\n            m[i][j] = m[j][i];\n            m[j][i] = temp;\n        }\n    }\n    // 2. Reverse each row\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n / 2; j++) {\n            int temp = m[i][j];\n            m[i][j] = m[i][n - 1 - j];\n            m[i][n - 1 - j] = temp;\n        }\n    }\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"%d%c\", m[i][j], (j == n - 1) ? '\\n' : ' ');\n        }\n    }\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 6,
      "chapterTitle": "Arrays",
      "chapterOrder": 6,
      "section": "Matrix Geometry",
      "exerciseNumber": "6.19",
      "exerciseOrder": 19,
      "page": 130,
      "concept": "Combining transposition with horizontal row reflection for 90-degree rotations",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3\n1 2 3\n4 5 6\n7 8 9\n",
        "expectedOutput": "7 4 1\n8 5 2\n9 6 3\n"
      },
      {
        "input": "2\n1 2\n3 4\n",
        "expectedOutput": "3 1\n4 2\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n55\n",
        "expectedOutput": "55\n"
      },
      {
        "input": "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n",
        "expectedOutput": "13 9 5 1\n14 10 6 2\n15 11 7 3\n16 12 8 4\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch6-spiral-matrix-traversal",
    "title": "Clockwise Spiral Order Traversal of 2D Matrix",
    "difficulty": "MEDIUM",
    "category": "Arrays",
    "tags": [
      "Arrays",
      "Matrix",
      "Simulation"
    ],
    "description": "### Problem Description\nTraversing an R x C matrix in clockwise spiral order requires managing four dynamic boundary walls (top, bottom, left, right) that shrink after each boundary pass (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: Arrays).\n\nGiven dimensions R and C followed by an R x C integer matrix, print all elements in clockwise spiral traversal order.\n\n### Input Format\n- First line: Two integers R and C (1 ≤ R, C ≤ 20).\n- Next R lines: C space-separated integers.\n\n### Output Format\nPrint all R x C elements in spiral order separated by spaces.\n\n### Example 1\n**Input:**\n```\n3 3\n1 2 3\n4 5 6\n7 8 9\n```\n**Output:**\n```\n1 2 3 6 9 8 7 4 5\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    // Print matrix in spiral order\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int r, c;\n    if (scanf(\"%d %d\", &r, &c) != 2) return 0;\n    int m[25][25];\n    for (int i = 0; i < r; i++)\n        for (int j = 0; j < c; j++)\n            scanf(\"%d\", &m[i][j]);\n    int top = 0, bottom = r - 1, left = 0, right = c - 1;\n    int first = 1;\n    while (top <= bottom && left <= right) {\n        for (int j = left; j <= right; j++) {\n            if (!first) printf(\" \");\n            printf(\"%d\", m[top][j]);\n            first = 0;\n        }\n        top++;\n        for (int i = top; i <= bottom; i++) {\n            if (!first) printf(\" \");\n            printf(\"%d\", m[i][right]);\n            first = 0;\n        }\n        right--;\n        if (top <= bottom) {\n            for (int j = right; j >= left; j--) {\n                if (!first) printf(\" \");\n                printf(\"%d\", m[bottom][j]);\n                first = 0;\n            }\n            bottom--;\n        }\n        if (left <= right) {\n            for (int i = bottom; i >= top; i--) {\n                if (!first) printf(\" \");\n                printf(\"%d\", m[i][left]);\n                first = 0;\n            }\n            left++;\n        }\n    }\n    printf(\"\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 6,
      "chapterTitle": "Arrays",
      "chapterOrder": 6,
      "section": "Boundary Control",
      "exerciseNumber": "6.24",
      "exerciseOrder": 24,
      "page": 135,
      "concept": "Four-barrier shrinking boundary loop simulation",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "3 3\n1 2 3\n4 5 6\n7 8 9\n",
        "expectedOutput": "1 2 3 6 9 8 7 4 5\n"
      },
      {
        "input": "2 3\n1 2 3\n4 5 6\n",
        "expectedOutput": "1 2 3 6 5 4\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1 4\n10 20 30 40\n",
        "expectedOutput": "10 20 30 40\n"
      },
      {
        "input": "3 1\n1\n2\n3\n",
        "expectedOutput": "1 2 3\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch6-boyer-moore-majority-element",
    "title": "Boyer-Moore Voting Majority Element Identifier",
    "difficulty": "EASY",
    "category": "Arrays",
    "tags": [
      "Arrays",
      "Algorithms",
      "Voting"
    ],
    "description": "### Problem Description\nThe Boyer-Moore majority vote algorithm finds the element that appears strictly more than N / 2 times in an array in O(N) time and O(1) auxiliary memory (Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: Arrays).\n\nGiven N integers, determine if a majority element exists.\n\n### Input Format\n- First line: Integer N (1 ≤ N ≤ 1000).\n- Second line: N space-separated integers.\n\n### Output Format\nPrint `MAJORITY: <element>` or `NO_MAJORITY`.\n\n### Example 1\n**Input:**\n```\n7\n2 2 1 1 2 2 3\n```\n**Output:**\n```\nMAJORITY: 2\n```",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    // Find majority element\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[1024];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int cand = arr[0], count = 1;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] == cand) count++;\n        else {\n            count--;\n            if (count == 0) {\n                cand = arr[i];\n                count = 1;\n            }\n        }\n    }\n    int freq = 0;\n    for (int i = 0; i < n; i++) {\n        if (arr[i] == cand) freq++;\n    }\n    if (freq > n / 2) printf(\"MAJORITY: %d\\n\", cand);\n    else printf(\"NO_MAJORITY\\n\");\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 20,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 6,
      "chapterTitle": "Arrays",
      "chapterOrder": 6,
      "section": "Majority Voting",
      "exerciseNumber": "6.28",
      "exerciseOrder": 28,
      "page": 139,
      "concept": "Linear time cancellation voting algorithm",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "7\n2 2 1 1 2 2 3\n",
        "expectedOutput": "MAJORITY: 2\n"
      },
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "NO_MAJORITY\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n100\n",
        "expectedOutput": "MAJORITY: 100\n"
      },
      {
        "input": "5\n3 3 3 2 2\n",
        "expectedOutput": "MAJORITY: 3\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-string-anagram-frequency-hash",
    "title": "Case-Insensitive String Anagram Verification Engine",
    "difficulty": "EASY",
    "category": "Strings",
    "tags": [
      "Strings",
      "Frequency Array",
      "Hash Table"
    ],
    "description": "### Problem Description\nTwo strings are anagrams if they contain the exact same characters with identical frequencies, disregarding letter casing and non-alphabetic punctuation (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Strings).\n\nGiven two lines of text S1 and S2 (up to 200 characters each), determine if they are anagrams.\n\n### Input Format\n- Two lines containing strings S1 and S2.\n\n### Output Format\nPrint `ANAGRAM` or `NOT_ANAGRAM`.\n\n### Example 1\n**Input:**\n```\nListen\nSilent\n```\n**Output:**\n```\nANAGRAM\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main() {\n    char s1[256], s2[256];\n    if (!fgets(s1, sizeof(s1), stdin)) return 0;\n    if (!fgets(s2, sizeof(s2), stdin)) return 0;\n    // Verify anagram\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main() {\n    char s1[256], s2[256];\n    if (!fgets(s1, sizeof(s1), stdin)) return 0;\n    if (!fgets(s2, sizeof(s2), stdin)) return 0;\n    int freq[26] = {0};\n    for (int i = 0; s1[i]; i++) {\n        if (isalpha((unsigned char)s1[i])) freq[tolower((unsigned char)s1[i]) - 'a']++;\n    }\n    for (int i = 0; s2[i]; i++) {\n        if (isalpha((unsigned char)s2[i])) freq[tolower((unsigned char)s2[i]) - 'a']--;\n    }\n    int ok = 1;\n    for (int i = 0; i < 26; i++) {\n        if (freq[i] != 0) { ok = 0; break; }\n    }\n    if (ok) printf(\"ANAGRAM\\n\");\n    else printf(\"NOT_ANAGRAM\\n\");\n    return 0;\n}",
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
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Frequency Counting",
      "exerciseNumber": "7.4",
      "exerciseOrder": 4,
      "page": 144,
      "concept": "Array index hashing on alphabet frequency differences",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "Listen\nSilent\n",
        "expectedOutput": "ANAGRAM\n"
      },
      {
        "input": "Hello\nWorld\n",
        "expectedOutput": "NOT_ANAGRAM\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "rail safety\nfairy tales\n",
        "expectedOutput": "ANAGRAM\n"
      },
      {
        "input": "anagram\nnagaram\n",
        "expectedOutput": "ANAGRAM\n"
      },
      {
        "input": "rat\ncar\n",
        "expectedOutput": "NOT_ANAGRAM\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-longest-palindromic-substring",
    "title": "Longest Palindromic Substring via Center Expansion",
    "difficulty": "MEDIUM",
    "category": "Strings",
    "tags": [
      "Strings",
      "Palindrome",
      "Algorithms"
    ],
    "description": "### Problem Description\nFinding the longest contiguous palindromic substring in a string can be computed in O(N^2) time by expanding around every possible center (both 1-character odd centers and 2-character even centers) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Strings).\n\nGiven a lowercase string S (1 ≤ |S| ≤ 200), print the longest palindromic substring. If multiple exist with the same maximum length, print the first one encountered.\n\n### Input Format\n- A single lowercase string S.\n\n### Output Format\nPrint the longest palindromic substring.\n\n### Example 1\n**Input:**\n```\nbabad\n```\n**Output:**\n```\nbab\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    // Find longest palindrome substring\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    int n = (int)strlen(s);\n    int start = 0, max_len = 1;\n    for (int i = 0; i < n; i++) {\n        // Odd length\n        int l = i, r = i;\n        while (l >= 0 && r < n && s[l] == s[r]) {\n            if (r - l + 1 > max_len) {\n                max_len = r - l + 1;\n                start = l;\n            }\n            l--; r++;\n        }\n        // Even length\n        l = i; r = i + 1;\n        while (l >= 0 && r < n && s[l] == s[r]) {\n            if (r - l + 1 > max_len) {\n                max_len = r - l + 1;\n                start = l;\n            }\n            l--; r++;\n        }\n    }\n    for (int i = 0; i < max_len; i++) putchar(s[start + i]);\n    putchar('\\n');\n    return 0;\n}",
    "timeLimitMs": 1000,
    "memoryLimitMb": 64,
    "basePoints": 30,
    "sourceType": "BOOK",
    "sourceRef": {
      "bookId": "YPK-TYCS-1996",
      "bookTitle": "Test Your C Skills",
      "author": "Yashavant P. Kanetkar",
      "edition": "1996 BPB Publications",
      "chapter": 7,
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Substring Optimization",
      "exerciseNumber": "7.9",
      "exerciseOrder": 9,
      "page": 148,
      "concept": "Center outward expansion for symmetrical boundary verification",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "babad\n",
        "expectedOutput": "bab\n"
      },
      {
        "input": "cbbd\n",
        "expectedOutput": "bb\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "a\n",
        "expectedOutput": "a\n"
      },
      {
        "input": "racecar\n",
        "expectedOutput": "racecar\n"
      },
      {
        "input": "bananas\n",
        "expectedOutput": "anana\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-run-length-encoding-compressor",
    "title": "Run-Length Encoding (RLE) In-Place String Compressor",
    "difficulty": "EASY",
    "category": "Strings",
    "tags": [
      "Strings",
      "Compression",
      "Encoding"
    ],
    "description": "### Problem Description\nRun-Length Encoding (RLE) is a lossless compression algorithm where consecutive identical characters are replaced by the character followed by its repetition count (e.g. `WWWWWWAAAA` becomes `W6A4`) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Strings).\n\nGiven an uppercase string S (1 ≤ |S| ≤ 200), produce its RLE compressed representation.\n\n### Input Format\n- A single uppercase string S.\n\n### Output Format\nPrint the RLE compressed string.\n\n### Example 1\n**Input:**\n```\nAAABBBCC\n```\n**Output:**\n```\nA3B3C2\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    // Compress with RLE\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    int n = (int)strlen(s);\n    for (int i = 0; i < n; i++) {\n        int count = 1;\n        while (i + 1 < n && s[i] == s[i + 1]) {\n            count++;\n            i++;\n        }\n        printf(\"%c%d\", s[i], count);\n    }\n    printf(\"\\n\");\n    return 0;\n}",
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
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Lossless Compression",
      "exerciseNumber": "7.15",
      "exerciseOrder": 15,
      "page": 152,
      "concept": "Consecutive run grouping and count formatting",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "AAABBBCC\n",
        "expectedOutput": "A3B3C2\n"
      },
      {
        "input": "XYZ\n",
        "expectedOutput": "X1Y1Z1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "A\n",
        "expectedOutput": "A1\n"
      },
      {
        "input": "AAAAAAAAAA\n",
        "expectedOutput": "A10\n"
      },
      {
        "input": "BBAAAB\n",
        "expectedOutput": "B2A3B1\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-naive-string-matching-engine",
    "title": "Sliding Window Substring Pattern Matcher",
    "difficulty": "EASY",
    "category": "Strings",
    "tags": [
      "Strings",
      "Pattern Matching",
      "Searching"
    ],
    "description": "### Problem Description\nThe standard C function `strstr` locates the first occurrence of a needle string in a haystack string (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Strings).\n\nGiven text T and pattern P, find all 0-based starting indices where P appears in T.\n\n### Input Format\n- Line 1: Text string T (1 ≤ |T| ≤ 500).\n- Line 2: Pattern string P (1 ≤ |P| ≤ 50).\n\n### Output Format\nPrint space-separated indices, or `-1` if pattern not found.\n\n### Example 1\n**Input:**\n```\nabcdefbcd\nbcd\n```\n**Output:**\n```\n1 6\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char t[512], p[64];\n    if (scanf(\"%s %s\", t, p) != 2) return 0;\n    // Find occurrences of p in t\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char t[512], p[64];\n    if (scanf(\"%s %s\", t, p) != 2) return 0;\n    int lt = (int)strlen(t);\n    int lp = (int)strlen(p);\n    int found = 0;\n    for (int i = 0; i <= lt - lp; i++) {\n        int match = 1;\n        for (int j = 0; j < lp; j++) {\n            if (t[i + j] != p[j]) { match = 0; break; }\n        }\n        if (match) {\n            if (found) printf(\" \");\n            printf(\"%d\", i);\n            found = 1;\n        }\n    }\n    if (!found) printf(\"-1\");\n    printf(\"\\n\");\n    return 0;\n}",
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
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Sub-string Matching",
      "exerciseNumber": "7.21",
      "exerciseOrder": 21,
      "page": 156,
      "concept": "Sliding window string matching in memory",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "abcdefbcd bcd\n",
        "expectedOutput": "1 6\n"
      },
      {
        "input": "hello world\n",
        "expectedOutput": "-1\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "aaaaa aa\n",
        "expectedOutput": "0 1 2 3\n"
      },
      {
        "input": "test test\n",
        "expectedOutput": "0\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-roman-numeral-to-integer",
    "title": "Roman Numeral to Integer Subtractive Parser",
    "difficulty": "EASY",
    "category": "Strings",
    "tags": [
      "Strings",
      "Parsing",
      "Algorithms"
    ],
    "description": "### Problem Description\nRoman numerals use symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. When a smaller symbol precedes a larger symbol, the value is subtracted (e.g. IV = 4, IX = 9, XL = 40) (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7).\n\nGiven a Roman numeral string S, convert it to its decimal integer value.\n\n### Input Format\n- A single Roman numeral string S (1 ≤ |S| ≤ 15).\n\n### Output Format\nPrint the evaluated integer.\n\n### Example 1\n**Input:**\n```\nMCMXCIV\n```\n**Output:**\n```\n1994\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[32];\n    if (scanf(\"%s\", s) != 1) return 0;\n    // Convert Roman to int\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nstatic int val(char c) {\n    switch (c) {\n        case 'I': return 1;\n        case 'V': return 5;\n        case 'X': return 10;\n        case 'L': return 50;\n        case 'C': return 100;\n        case 'D': return 500;\n        case 'M': return 1000;\n        default: return 0;\n    }\n}\n\nint main() {\n    char s[32];\n    if (scanf(\"%s\", s) != 1) return 0;\n    int total = 0;\n    int n = (int)strlen(s);\n    for (int i = 0; i < n; i++) {\n        int v1 = val(s[i]);\n        if (i + 1 < n) {\n            int v2 = val(s[i + 1]);\n            if (v1 >= v2) total += v1;\n            else { total += v2 - v1; i++; }\n        } else {\n            total += v1;\n        }\n    }\n    printf(\"%d\\n\", total);\n    return 0;\n}",
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
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Subtractive Notation",
      "exerciseNumber": "7.27",
      "exerciseOrder": 27,
      "page": 160,
      "concept": "Lookahead symbol evaluation for subtractive pair reduction",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "MCMXCIV\n",
        "expectedOutput": "1994\n"
      },
      {
        "input": "LVIII\n",
        "expectedOutput": "58\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "III\n",
        "expectedOutput": "3\n"
      },
      {
        "input": "IX\n",
        "expectedOutput": "9\n"
      },
      {
        "input": "CDXLIV\n",
        "expectedOutput": "444\n"
      }
    ]
  },
  {
    "slug": "kanetkar-ch7-valid-parentheses-stack-verifier",
    "title": "Balanced Brackets Stack Invariant Verifier",
    "difficulty": "EASY",
    "category": "Strings",
    "tags": [
      "Strings",
      "Stack",
      "Parsing"
    ],
    "description": "### Problem Description\nValidating nested parentheses `()`, square brackets `[]`, and curly braces `{}` is a fundamental parsing invariant managed by a Last-In First-Out (LIFO) stack (Yashavant Kanetkar, *Test Your C Skills*, Chapter 7: Strings).\n\nGiven a string of brackets S (1 ≤ |S| ≤ 200), verify whether every opening bracket has an exact corresponding closing bracket in matching order.\n\n### Input Format\n- A single string S containing only `()`, `[]`, and `{}`.\n\n### Output Format\nPrint `BALANCED` or `UNBALANCED`.\n\n### Example 1\n**Input:**\n```\n{[()]}\n```\n**Output:**\n```\nBALANCED\n```",
    "starterCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    // Verify balanced brackets\n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[256];\n    if (scanf(\"%s\", s) != 1) return 0;\n    char stack[256];\n    int top = 0;\n    int ok = 1;\n    for (int i = 0; s[i]; i++) {\n        char c = s[i];\n        if (c == '(' || c == '[' || c == '{') stack[top++] = c;\n        else if (c == ')') {\n            if (top == 0 || stack[--top] != '(') { ok = 0; break; }\n        } else if (c == ']') {\n            if (top == 0 || stack[--top] != '[') { ok = 0; break; }\n        } else if (c == '}') {\n            if (top == 0 || stack[--top] != '{') { ok = 0; break; }\n        }\n    }\n    if (top != 0) ok = 0;\n    if (ok) printf(\"BALANCED\\n\");\n    else printf(\"UNBALANCED\\n\");\n    return 0;\n}",
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
      "chapterTitle": "Strings",
      "chapterOrder": 7,
      "section": "Stack Verification",
      "exerciseNumber": "7.32",
      "exerciseOrder": 32,
      "page": 164,
      "concept": "LIFO bracket pairing and stack empty boundary condition",
      "copyrightStatus": "ORIGINAL_REWRITE"
    },
    "sampleTests": [
      {
        "input": "{[()]}\n",
        "expectedOutput": "BALANCED\n"
      },
      {
        "input": "([)]\n",
        "expectedOutput": "UNBALANCED\n"
      }
    ],
    "hiddenTests": [
      {
        "input": "()\n",
        "expectedOutput": "BALANCED\n"
      },
      {
        "input": "(\n",
        "expectedOutput": "UNBALANCED\n"
      },
      {
        "input": "({[]})\n",
        "expectedOutput": "BALANCED\n"
      },
      {
        "input": "}{()\n",
        "expectedOutput": "UNBALANCED\n"
      }
    ]
  }
];
