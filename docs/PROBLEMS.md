# LogicQ Problem Quality Pipeline & Validation Specification

## 1. Quality Standards for Every Problem

Every problem in the LogicQ catalog must fulfill strict curriculum standards before release. No problem can be scheduled or made visible to students without passing the automated quality gate:

### Mandatory Problem Components
1. **Title & Unique Slug**: Clean descriptive name and alphanumeric slug (e.g., `reverse-words-in-sentence`).
2. **Pedagogical Statement**: Written in Markdown, stating the real-world or theoretical context, exact input format, and exact output format.
3. **Formal Constraints**: Strict limits on array lengths, integer magnitudes, string length, and memory allowances (e.g., $1 \le N \le 10^5$, $-10^9 \le A[i] \le 10^9$).
4. **Visible Sample Test Cases ($\ge 2$)**:
   - Sample 1: Canonical everyday case demonstrating basic operation.
   - Sample 2: Non-trivial case demonstrating an edge scenario (e.g., duplicates, single-element).
   - Each sample must contain a clear Markdown explanation detailing how the output is derived from the input.
5. **Hidden Verification Test Cases ($\ge 5$)**:
   - **Edge 1: Minimum Bounds**: $N=0$ or $N=1$, empty strings, minimal inputs.
   - **Edge 2: Maximum Bounds**: Maximum scale (stressing time limits and memory).
   - **Edge 3: Integer Boundaries**: Handling $0$, negative numbers, or integer overflow triggers (`INT_MIN`, `INT_MAX`, `LONG_MAX`).
   - **Edge 4: Pointer / String Boundaries**: No spaces, leading/trailing spaces, duplicate characters, null byte handling.
   - **Edge 5: Random / Adversarial**: Anti-hash or non-sorted sequences designed to catch greedy or naive algorithms.
6. **Canonical Reference Solution (`reference_solution.c`)**:
   - Written in idiomatic, safe C17.
   - Fully memory leak free (passes Valgrind/ASan without warnings).
   - Time complexity strictly within problem constraints.
7. **Negative Control Solutions ($\ge 2$)**:
   - `wrong_solution_1.c`: A naive or greedy approach that misses subtle edge cases (must emit `WRONG_ANSWER` or `TIME_LIMIT_EXCEEDED`).
   - `wrong_solution_2.c`: An off-by-one or buffer-overflow-prone approach (must emit `WRONG_ANSWER` or `RUNTIME_ERROR`).

---

## 2. Problem Lifecycle & Status State Machine

Problems transition through four immutable state phases:

```
    +-----------+      Passes Automated Quality Gate      +---------------+
    |   DRAFT   | --------------------------------------> |   VALIDATED   |
    +-----------+   (Ref Sol = AC, 2x Neg Sols = Failed)   +---------------+
          ^                                                       |
          | (Edit / Modify)                                       | (Admin Schedule / Publish)
          v                                                       v
    +-----------+                                          +---------------+
    |  RETIRED  | <--------------------------------------- |   PUBLISHED   |
    +-----------+            (Deprecated / Flawed)         +---------------+
```

### State Definitions
- **DRAFT**: Problem is being authored or imported. Invisible to students. Cannot be selected for Daily Challenge or Arena contests.
- **VALIDATED**: Passed automated judge test gate (Reference solution scored 100% Accepted, all negative control solutions failed as expected). Ready for scheduling.
- **PUBLISHED**: Live in the catalog or scheduled as an active Daily Challenge or Contest round. Visible to students.
- **RETIRED**: Deprecated due to ambiguity, superseded by a better variant, or archived. Inactive for new submissions.

---

## 3. Automated Validation Pipeline (The Quality Gate)

The Admin Problem Editor includes a prominent **"Validate Problem"** action button. The pipeline executes the following checks synchronously or via background task:

```
[Trigger: Validate Problem]
        |
        v
1. Format & Lint Verification:
   - Are there >= 2 visible samples with explanations?
   - Are there >= 5 hidden test cases?
   - Are constraints clearly defined?
        |
        v
2. Positive Verification:
   - Compile reference_solution.c with `-O2 -std=c17 -Wall -Wextra -Werror=vla`
   - Run reference binary against ALL test cases (visible + hidden)
   - REQUIREMENT: 100% Verdict == ACCEPTED. (If any test fails or exceeds 50% time limit, REJECT).
        |
        v
3. Negative Verification:
   - Run wrong_solution_1.c: MUST FAIL at least 1 test case.
   - Run wrong_solution_2.c: MUST FAIL at least 1 test case.
   - (Protects against weak or vacuous test cases that accept broken code).
        |
        v
[Status Transition: Set status = 'VALIDATED']
```

---

## 4. Re-Validation of Current Seeded Catalog

The initial seed catalog includes 16 foundational C problems. Here is the validation audit status:

| # | Slug | Difficulty | Samples | Hidden Tests | Reference Solution Status | Audit Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `daily-longest-unique-substring` | Medium | 2 | 5 | ✅ Clean C sliding window | Verified |
| 2 | `two-sum` | Easy | 2 | 5 | ✅ Two-pointer / quadratic C | Verified |
| 3 | `valid-parentheses` | Easy | 2 | 5 | ✅ Stack implementation | Verified |
| 4 | `merge-sorted-arrays` | Easy | 2 | 5 | ✅ In-place merge from back | Verified |
| 5 | `reverse-linked-list` | Easy | 2 | 5 | ✅ Iterative pointer flip | Verified |
| 6 | `binary-tree-inorder` | Medium | 2 | 5 | ✅ Recursive traversal buffer | Verified |
| 7 | `maximum-subarray` | Medium | 2 | 5 | ✅ Kadane's algorithm | Verified |
| 8 | `lru-cache-impl` | Hard | 2 | 5 | ✅ Hash + Doubly linked list | Verified (Manual review recommended for memory cleanup) |
| 9 | `palindrome-number` | Easy | 2 | 5 | ✅ Math digit reverse | Verified |
| 10| `climbing-stairs` | Easy | 2 | 5 | ✅ Fibonacci dynamic programming| Verified |
| 11| `find-first-last-pos` | Medium | 2 | 5 | ✅ Binary search bounds | Verified |
| 12| `trapping-rain-water` | Hard | 2 | 5 | ✅ Two-pointer elevation trap | Verified |
| 13| `word-ladder-length` | Hard | 2 | 5 | ✅ BFS shortest path | Verified (Review word length limits) |
| 14| `coin-change` | Medium | 2 | 5 | ✅ DP table unbounded knapsack| Verified |
| 15| `rotate-image-matrix` | Medium | 2 | 5 | ✅ Transpose + row reverse | Verified |
| 16| `median-of-two-sorted-arrays` | Hard | 2 | 5 | ✅ Binary search partition | Verified |

### Problems Flagged for Human Review
1. **`lru-cache-impl`**: Ensure dynamic allocations in test harness properly free the entire cache on completion to avoid false-positive leak warnings.
2. **`word-ladder-length`**: Confirm word dictionary sizing does not cause stack overflows on large test cases.

---

## 5. Student Problem Reporting Feature

To preserve community trust and catch edge case ambiguities immediately:
- A prominent **"Report an Issue with this Problem"** flag button is embedded in the problem header next to difficulty.
- Clicking opens a concise modal with report categories:
  - `Incorrect Test Case`
  - `Ambiguous Constraints / Description`
  - `Time Limit Too Strict / Lenient`
  - `Memory Limit Issue`
  - `Spelling or Formatting Error`
- Submissions create an audit record in the `ProblemReport` table and alert the admin dashboard.
