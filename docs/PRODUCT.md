# LogicQ Product Differentiation & Feature Specifications

## 1. Core Vision & Value Proposition

While reference platforms like SegFault provide basic C problem statements and binary pass/fail verdicts, **LogicQ is engineered specifically as a pedagogical C mastery arena**.

In C programming, beginner and intermediate developers struggle most with **pointer arithmetic, manual memory management, silent undefined behavior, and cryptic segmentation faults**. LogicQ bridges the gap between raw competitive judging and guided computer science education.

---

## 2. Key Differentiators vs SegFault

| Dimension | SegFault (Reference Site) | LogicQ (Our Platform) |
| :--- | :--- | :--- |
| **Runtime Diagnostics** | Opaque "Runtime Error" without context | **C-Specific Memory & Signal Diagnostics** with actionable suggestions |
| **Learning Assistance** | None; pass or fail with no assistance | **Tiered Progressive Hints** (Concept -> Edge Case -> C Pointer Tip) |
| **Post-Solve Education** | Binary solve confirmation only | **Post-Solve Editorial & C Deep Dive** (Complexity, Memory Safety, Idioms) |
| **Test Case Feedback** | Text dump or hidden mismatch | **Side-by-Side Visual Diffing** for sample inputs highlighting whitespace/chars |
| **Institutional Scope** | Single global leaderboard | **College & Batch-Level Leaderboards** with class & department filters |

---

## 3. Concrete Differentiator Feature Specifications

### Feature 1: C-Specific Runtime Diagnostics & Fault Translation
* **Release Scope**: **Release 1 (MVP)**
* **User Story**:
  > As a computer science student learning C, when my program crashes with a segmentation fault or memory error, I want LogicQ to translate the raw OS signal into a clear, understandable explanation so that I can learn how to debug my pointers without getting frustrated.
* **Acceptance Criteria**:
  1. If a program exits with Unix signal 11 (`SIGSEGV`), the verdict displays: *"Segmentation Fault: Attempted to read or write to an unmapped memory address (likely null pointer dereference, uninitialized pointer, or out-of-bounds array access)."*
  2. If a program exits with Unix signal 8 (`SIGFPE`), the verdict displays: *"Arithmetic Exception: Division by zero or modulo by zero detected."*
  3. If a program exceeds memory ceiling, the verdict displays: *"Memory Limit Exceeded: Heap or stack exceeded the 64 MB ceiling (check for unbounded recursion or memory leaks)."*
  4. Diagnostics are displayed in a clean, highlighted callout box in the Output Panel.

---

### Feature 2: Tiered Progressive Hint System
* **Release Scope**: **Release 1 (MVP)**
* **User Story**:
  > As a challenger attempting the Daily Challenge, when I am stuck on a problem, I want to unlock hints one level at a time instead of giving up or searching online for solutions, so that I can solve it through my own deductive reasoning.
* **Acceptance Criteria**:
  1. Each problem can contain up to 3 structured hints:
     - **Hint 1 (Conceptual Approach)**: High-level algorithmic pattern (e.g., "Consider using a sliding window with two pointers").
     - **Hint 2 (Edge Case Watch)**: Specific input boundary to watch out for (e.g., "What happens if all characters are identical?").
     - **Hint 3 (C Implementation Tip)**: Concrete C advice (e.g., "Use an integer array of size 256 initialized to -1 to track character indices").
  2. Unlocking a hint requires explicit student confirmation (e.g., "Reveal Hint 1 (-5% score penalty)?").
  3. Hints are logged on the submission record. Unused hints preserve full 100% points.
  4. During active timed Arena contests, hints are strictly disabled.

---

### Feature 3: Post-Solve Editorial & Idiomatic C Deep Dive
* **Release Scope**: **Release 1 (MVP)**
* **User Story**:
  > As a student who just submitted an Accepted solution, I want to review an authoritative editorial explaining optimal time complexity, memory allocation practices, and idiomatic C techniques, so that I understand how a senior engineer writes this in production C.
* **Acceptance Criteria**:
  1. The "Editorial" tab remains locked until the user achieves an **Accepted** verdict on that problem (or until an Arena contest ends).
  2. The editorial contains:
     - Asymptotic complexity breakdown (Big-O Time and Space).
     - Clean, annotated reference C solution with comments.
     - Common C pitfalls for this problem (e.g., memory leaks, buffer overflow risks).
  3. If a student has not solved the problem, attempting to access the editorial URL redirects to the problem workspace with a prompt to submit first.

---

### Feature 4: Side-by-Side Visual Diffing for Failed Sample Cases
* **Release Scope**: **Release 1 (MVP)**
* **User Story**:
  > As a developer testing my code against sample test cases, when my output is marked Wrong Answer, I want to see an exact side-by-side diff between expected output and actual output so that I can spot missing newlines or formatting discrepancies immediately.
* **Acceptance Criteria**:
  1. On visible sample test runs, the test case results display two aligned columns: **Expected Output** vs **Your Output**.
  2. Differing characters and missing trailing newlines are highlighted in red/green background tags.
  3. Hidden test cases NEVER display expected output or diffs; they only display status: *"Hidden Test Case #3: Wrong Answer"*.

---

### Feature 5: College & Batch Institutional Leaderboards
* **Release Scope**: **Release 2**
* **User Story**:
  > As a college coding club member, I want to filter the leaderboard by my university and graduation year so that I can compete directly against my classmates and peers rather than anonymous global accounts.
* **Acceptance Criteria**:
  1. User profiles include optional `college` and `graduationYear` attributes.
  2. Leaderboard page features toggle tabs: `Global`, `My College`, `My Batch`.
  3. Minimum 5 active users from a college required to activate a college leaderboard tab.
