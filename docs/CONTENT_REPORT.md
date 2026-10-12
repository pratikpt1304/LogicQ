# LogicQ Book Content Extraction & Validation Report (`/docs/CONTENT_REPORT.md`)

> **STATUS**: `EXECUTED & 100% C11 GCC JUDGE VERIFIED`  
> **Book Source**: *Test Your C Skills* by Yashavant P. Kanetkar (1996 BPB Publications Edition)  
> **Source Path**: `C:\Users\thora\Downloads\Test Your C Skills-Yaswant Kanetkar ( PDFDrive.com ).pdf`

---

## 1. Current Pool Status

- **Book Designated**: *Test Your C Skills* by Yashavant P. Kanetkar (1996 BPB Publications).
- **Problems Seeded from Book**: `17` fully executable C11 challenges covering Chapters 1 through 18.
- **Test Case Coverage**: Every problem has **$\ge 2$ visible sample test cases** and **$\ge 5$ hidden evaluation test cases**.
- **Judge Pass Rate**: **100% Passed (17/17)** using real `LocalGccJudge` (`gcc -O2 -std=c11 -Wall`).
- **Non-Book Problems Status**: All non-book problems retired from student visibility. Only the canonical test fixture problems remain stored for test suite backward compatibility.
- **Active Featured Daily Challenge**: `kanetkar-ch1-scope-shadow-eval` (Chapter 1: Scope and Local Shadowing).

---

## 2. Chapter-by-Chapter Extraction & Classification Table

| Chapter | Topic / Theme | Slug | Class | Sample Tests | Hidden Tests | Base PTS | C11 GCC Pass Rate | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Ch. 1 | Declarations & Initializations | `kanetkar-ch1-scope-shadow-eval` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` (Active Today) |
| Ch. 2 | Control Instructions | `kanetkar-ch2-switch-fallthrough-calc` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 3 | Expressions & Sequence Points | `kanetkar-ch3-short-circuit-evaluation` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 5 | Functions & Recursion | `kanetkar-ch5-recursive-stack-depth` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 6 | The C Preprocessor | `kanetkar-ch6-macro-token-expansion` | Class B | 2 | 5 | 25 | 100% | `PUBLISHED` |
| Ch. 7 | Pointers & Row-Major Strides | `kanetkar-ch7-multidim-pointer-arithmetic` | Class B | 2 | 5 | 30 | 100% | `PUBLISHED` |
| Ch. 8 | More Pointers (Handles) | `kanetkar-ch8-pointer-to-pointer-swap` | Class B | 2 | 5 | 25 | 100% | `PUBLISHED` |
| Ch. 9 | Arrays & Pointer Decay | `kanetkar-ch9-array-decay-bounds` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 10 | Strings & String Literals | `kanetkar-ch10-string-literal-pointer-offset` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 11 | Struct Padding & Natural Alignment | `kanetkar-ch11-struct-padding-offset-calc` | Class B | 2 | 5 | 30 | 100% | `PUBLISHED` |
| Ch. 12 | File Input/Output (`fseek`) | `kanetkar-ch12-fseek-offset-stream` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 13 | Command Line Arguments (`argv`) | `kanetkar-ch13-argc-argv-parser` | Class B | 2 | 5 | 15 | 100% | `PUBLISHED` |
| Ch. 14 | Bitwise Operators & Register Masks | `kanetkar-ch14-bitwise-slot-masking` | Class B | 2 | 5 | 20 | 100% | `PUBLISHED` |
| Ch. 15 | Typecasting & Conversions | `kanetkar-ch15-typecast-promotion-eval` | Class B | 2 | 5 | 15 | 100% | `PUBLISHED` |
| Ch. 16 | Storage Classes & Static Scope | `kanetkar-ch16-typedef-storage-class` | Class B | 2 | 5 | 15 | 100% | `PUBLISHED` |
| Ch. 17 | Systems & Segmented Addressing | `kanetkar-ch17-segmented-memory-addressing` | Class B | 2 | 5 | 15 | 100% | `PUBLISHED` |
| Ch. 18 | Graphics & Bresenham Rasterization | `kanetkar-ch18-bresenham-line-raster` | Class B | 2 | 5 | 25 | 100% | `PUBLISHED` |

---

## 3. Governance & Single Visible Question Compliance

1. **Strictly Book-Only**: All problems derive exclusively from Yashavant Kanetkar's *Test Your C Skills*. Zero external or website problems exist in the student pool.
2. **Single Visible Question (17:00 IST Cutoff)**: Students see only the single active challenge for the current 17:00 IST challenge day. Ended challenges return 410 without statements, and future challenges return 404.
3. **Data Integrity & Invariants**: 100% passing across all 17 automated test suites (96 tests) and database integrity ledger audit.

---

## 4. Practice Curriculum Content & 3-Way Solution Validation

The Practice tab provides 4 sequentially unlocking modules derived from university C syllabus topics (distinct from the competitive Daily Challenge book pool).

### A. Module Summary & Distribution

| Module Order | Module Title | Slug | Total | Easy | Medium | Hard | Unlock Rule |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | Control Structures | `control-structures` | 10 | 4 | 4 | 2 | Unlocked for all students |
| **2** | Pointers and functions | `pointers-and-functions` | 10 | 4 | 4 | 2 | Solve $\ge 7$ in Module 1 |
| **3** | Array and its Applications | `array-and-its-applications` | 10 | 4 | 4 | 2 | Solve $\ge 7$ in Module 2 |
| **4** | Advanced Data Types, Dynamic Memory | `advanced-data-types-dynamic-memory` | 10 | 4 | 4 | 2 | Solve $\ge 7$ in Module 3 |

### B. GCC C11 3-Way Solution Verification
- **Reference Solution**: 40 / 40 (100%) passed all sample and hidden test cases with `LocalGccJudge` (`gcc -O2 -std=c11 -Wall`).
- **Wrong Solution 1**: 40 / 40 (100%) failed on expected test edge cases.
- **Wrong Solution 2**: 40 / 40 (100%) failed on expected test edge cases.
- **Test Case Density**: Exactly 2 visible sample test cases + 8 hidden test cases per problem (400 total test cases).
