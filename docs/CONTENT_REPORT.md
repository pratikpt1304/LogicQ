# LogicQ Practice Content Master Report

**Document:** `/docs/CONTENT_REPORT.md`  
**Date:** October 13, 2026  
**Auditor:** Antigravity System Engineer  
**Status:** Validated & Awaiting User Approval for Production Land  
**Import File:** `server/src/data/practice-problems-import.json` (144.9 KB)  

---

## 1. Summary of Practice Content

| Module | Title | Total Questions | Easy | Medium | Hard | Validation Suite |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Module 1** | **Control Structures** | 10 | 4 | 4 | 2 | `100% PASSED (Local GCC C11)` |
| **Module 2** | **Pointers and functions** | 10 | 4 | 4 | 2 | `100% PASSED (Local GCC C11)` |
| **Module 3** | **Array and its Applications** | 10 | 4 | 4 | 2 | `100% PASSED (Local GCC C11)` |
| **Module 4** | **Advanced Data Types, Dynamic Memory** | 10 | 4 | 4 | 2 | `100% PASSED (Local GCC C11)` |
| **Total** | **Curriculum Suite** | **40** | **16** | **16** | **8** | **40 / 40 All Tests Verified** |

Every question features:
1. **Deterministic Standard I/O (stdin / stdout)**.
2. **2 visible sample test cases** with complete input/output specifications.
3. **$\ge 8$ hidden test cases** including minimum/maximum bounds, edge cases, negative integers, single elements, and multi-line inputs.
4. **C11 Reference Solution (`solutionCode`)** compiling under `-std=c11 -O2 -Wall` and passing 100% of sample and hidden tests.
5. **2 Deliberately Wrong Solutions (`wrongSolution1`, `wrongSolution2`)** that fail at least one test case to verify test suite efficacy.
6. **No source references, book citations, chapter titles, or page numbers** in student-facing problem descriptions.

---

## 2. Complete Inventory of All 40 Problems

### Module 1: Control Structures (`control-structures`)
*Syllabus Focus: Branching decisions, loops, switch-case, and iteration flow in C.*

| # | Slug | Title | Diff | Base Pts | Samples | Hidden | Rationale & Concept Tested |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `practice-c1-largest-of-three` | Largest of Three Numbers | EASY | 20 | 2 | 8 | Nested `if-else` branching and edge cases with equal numbers. |
| 2 | `practice-c1-arithmetic-calculator-switch` | Arithmetic Calculator (Switch) | EASY | 20 | 2 | 8 | `switch-case` statement, char operand matching, divide-by-zero check. |
| 3 | `practice-c1-sum-of-digits-loop` | Sum of Digits of a Number | EASY | 20 | 2 | 8 | `while` loop iteration, modulo arithmetic, handling single digits & zero. |
| 4 | `practice-c1-multiplication-table` | Multiplication Table Range | EASY | 20 | 2 | 8 | `for` loop iteration, formatted output formatting. |
| 5 | `practice-c1-count-primes-up-to-n` | Prime Numbers Count up to N | MEDIUM | 30 | 2 | 8 | Nested iteration, $O(\sqrt{N})$ trial division, boundary conditions ($N=1, 2$). |
| 6 | `practice-c1-number-palindrome-reversal` | Number Palindrome Verification | MEDIUM | 30 | 2 | 8 | Arithmetic reversal using `long long` avoiding integer overflow. |
| 7 | `practice-c1-number-pyramid-pattern` | Symmetrical Number Pyramid | MEDIUM | 30 | 2 | 8 | Multi-nested loops, space indentation alignment, descending inner loop. |
| 8 | `practice-c1-gcd-and-lcm-calculator` | GCD and LCM of Two Numbers | MEDIUM | 30 | 2 | 8 | Euclidean algorithm loop, $A \times B / \gcd$ with 64-bit precision. |
| 9 | `practice-c1-longest-collatz-chain` | Longest Collatz Chain in Range | HARD | 50 | 2 | 8 | Unbounded Collatz iteration, 64-bit chain length tracking, range scan. |
| 10 | `practice-c1-trailing-zeros-factorial` | Trailing Zeros in Factorial | HARD | 50 | 2 | 8 | Legendre's formula ($\sum \lfloor N / 5^k \rfloor$), log time computation for $N \le 10^9$. |

---

### Module 2: Pointers and functions (`pointers-and-functions`)
*Syllabus Focus: Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.*

| # | Slug | Title | Diff | Base Pts | Samples | Hidden | Rationale & Concept Tested |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `practice-m2-p1-swap-pointers` | Swap Two Numbers via Pointers | EASY | 20 | 2 | 8 | Pointer parameters, dereference operator `*`, memory address manipulation. |
| 2 | `practice-m2-p2-find-min-max-pointers` | Find Min and Max using Pointers | EASY | 20 | 2 | 8 | Pass-by-pointer output parameters `*min_val`, `*max_val`. |
| 3 | `practice-m2-p3-factorial-function` | Factorial using Modular Function | EASY | 20 | 2 | 8 | Function abstraction, modular parameter passing, base cases ($0! = 1$). |
| 4 | `practice-m2-p4-sum-avg-pointers` | Sum and Average via Pointers | EASY | 20 | 2 | 8 | Pointer arithmetic, floating-point formatting via output reference. |
| 5 | `practice-m2-p5-recursive-gcd-lcm` | Recursive GCD and LCM | MEDIUM | 30 | 2 | 8 | Recursive call stack, termination condition, Euclidean recursion. |
| 6 | `practice-m2-p6-reverse-array-pointers` | In-Place Array Reverse (Pointers) | MEDIUM | 30 | 2 | 8 | Two-pointer technique (`ptr_left++`, `ptr_right--`), in-place memory swaps. |
| 7 | `practice-m2-p7-pointer-string-reverse` | String Length and Copy via Pointer | MEDIUM | 30 | 2 | 8 | Pointer traversal on null-terminated character buffers (`*p != '\0'`). |
| 8 | `practice-m2-p8-fast-modular-power` | Fast Modular Exponentiation | MEDIUM | 30 | 2 | 8 | Recursive divide-and-conquer exponentiation $O(\log B)$ with modulo. |
| 9 | `practice-m2-p9-func-pointer-dispatch` | Function Pointer Dispatch Table | HARD | 50 | 2 | 8 | Array of function pointers `int (*ops[])(int, int)`, opcode dispatching. |
| 10 | `practice-m2-p10-tower-of-hanoi` | Tower of Hanoi Recursive Steps | HARD | 50 | 2 | 8 | Multi-branch recursion, state printing, tracking exact move count $2^N - 1$. |

---

### Module 3: Array and its Applications (`array-and-its-applications`)
*Syllabus Focus: Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.*

| # | Slug | Title | Diff | Base Pts | Samples | Hidden | Rationale & Concept Tested |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `practice-m3-p1-array-sum-max` | Array Sum and Maximum | EASY | 20 | 2 | 8 | 1D array traversal, cumulative summation with negative integers. |
| 2 | `practice-m3-p2-linear-search-first-index` | Linear Search First Occurrence | EASY | 20 | 2 | 8 | Sequential array inspection, early exit on match, $-1$ not found case. |
| 3 | `practice-m3-p3-count-occurrences` | Count Element Occurrences | EASY | 20 | 2 | 8 | Frequency tallying, full array traversal, boundary conditions. |
| 4 | `practice-m3-p4-second-largest-distinct` | Second Largest Distinct Element | EASY | 20 | 2 | 8 | Single-pass dual-variable tracking (`first`, `second`), handling duplicates. |
| 5 | `practice-m3-p5-rotate-array-k` | Array Left Rotation by K Positions | MEDIUM | 30 | 2 | 8 | Modulo normalization ($K \bmod N$), block reversal or cyclic shifting. |
| 6 | `practice-m3-p6-matrix-transpose-sums` | Matrix Row and Column Sums | MEDIUM | 30 | 2 | 8 | 2D array indexing `A[i][j]`, nested accumulation across axes. |
| 7 | `practice-m3-p7-bubble-sort-swaps` | Bubble Sort and Swap Counter | MEDIUM | 30 | 2 | 8 | Bubble sort algorithm, tracking exact swap count, stability test. |
| 8 | `practice-m3-p8-kadanes-algorithm` | Maximum Subarray Sum (Kadane) | MEDIUM | 30 | 2 | 8 | Dynamic programming / Kadane's algorithm, handling all-negative arrays. |
| 9 | `practice-m3-p9-spiral-matrix-traversal` | Spiral Matrix Traversal | HARD | 50 | 2 | 8 | 4-boundary traversal (`top`, `bottom`, `left`, `right`), $M \times N$ matrices. |
| 10 | `practice-m3-p10-matrix-multiplication` | Matrix Multiplication | HARD | 50 | 2 | 8 | 3-nested loop matrix product $C_{ik} = \sum A_{ij} B_{jk}$, dimension checking. |

---

### Module 4: Advanced Data Types, Dynamic Memory (`advanced-data-types-dynamic-memory`)
*Syllabus Focus: Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked structures.*

| # | Slug | Title | Diff | Base Pts | Samples | Hidden | Rationale & Concept Tested |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `practice-m4-p1-struct-student-topper` | Student Record Highest Marks | EASY | 20 | 2 | 8 | `struct Student { char name[50]; int marks; }`, linear struct search. |
| 2 | `practice-m4-p2-enum-days-of-week` | Day of Week Enum Mapper | EASY | 20 | 2 | 8 | `enum Day`, integer-to-enum mapping, formatted weekday lookup. |
| 3 | `practice-m4-p3-dynamic-array-malloc` | Dynamic Array with malloc | EASY | 20 | 2 | 8 | Heap allocation `(int*)malloc(n * sizeof(int))`, memory freeing with `free`. |
| 4 | `practice-m4-p4-struct-point-distance` | Point Distance Squared (struct) | EASY | 20 | 2 | 8 | `struct Point`, geometric Cartesian coordinate computation $(x_2-x_1)^2 + (y_2-y_1)^2$. |
| 5 | `practice-m4-p5-struct-marks-sort` | Sort Students by Marks Descending | MEDIUM | 30 | 2 | 8 | Array of structs, sorting algorithm (selection/bubble/qsort), tie-breaking by name. |
| 6 | `practice-m4-p6-dynamic-2d-array-malloc` | Dynamic 2D Array Allocation | MEDIUM | 30 | 2 | 8 | Array of pointers heap allocation `int**`, row-by-row allocation & deallocation. |
| 7 | `practice-m4-p7-dynamic-string-reverse` | Dynamic String Reversal | MEDIUM | 30 | 2 | 8 | Heap string allocation with `malloc`, boundary reversing, null-terminator preservation. |
| 8 | `practice-m4-p8-nested-struct-date-compare` | Nested Struct Date Comparison | MEDIUM | 30 | 2 | 8 | Nested `struct Date`, hierarchical date comparison (`year`, `month`, `day`). |
| 9 | `practice-m4-p9-dynamic-vector-realloc` | Dynamic Resizable Array (realloc) | HARD | 50 | 2 | 8 | Dynamic capacity doubling with `realloc`, amortized array growth. |
| 10 | `practice-m4-p10-singly-linked-list` | Singly Linked List with Dynamic Nodes | HARD | 50 | 2 | 8 | Node allocation `struct Node`, pointer linking `->next`, linked list traversal & deallocation. |

---

## 3. Audited Production Import Readiness

* **Artifact Path:** `server/src/data/practice-problems-import.json`
* **Artifact Size:** 144.9 KB
* **Security & Invariants:**
  * No student PII involved.
  * No Firestore security rules altered or weakened.
  * No production changes or database migrations executed without explicit user approval.
  * Admin-only preview allows full platform inspection without changing student unlock state.
