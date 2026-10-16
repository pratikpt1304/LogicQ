# LogicQ: Learning-First Architecture & Specification (`/docs/LEARNING_FIRST.md`)

**Document Version**: 1.0.0 (Authoritative Pedagogical & Technical Specification)  
**Date**: October 15, 2026  
**Status**: Architecture & System Design — Awaiting User Approval Before Code Execution  
**Core Hierarchy**: **Learning First** $\rightarrow$ **Daily Habit Second** $\rightarrow$ **Competition Third**

---

## 1. Executive Summary & Paradigm Shift

LogicQ was initially conceived as a high-stakes competitive programming platform featuring rapid 17:00 IST submission speed races, attempt penalty point deductions, and public ranking based on clock timing.

**This specification re-prioritizes LogicQ around teaching C.**
Speed races and penalty deductions discourage deliberate experimentation, promote anxiety, and incentivize students to copy code or rush through fundamental syntax without understanding pointer decay, operator precedence, or memory layouts.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE LOGICQ HIERARCHY OF PRIORITIES                           │
│                                                                                              │
│   1. LEARNING FIRST:                                                                         │
│      - Formative diagnostics (plain-English GCC error translations, sample diffs).           │
│      - Graduated scaffolding (Tier 1 hint at 2 fails, Tier 2 hint at 4 fails; never answers).│
│      - Day-after review mode (approach explanations, common pitfalls, zero-point retry).      │
│      - Module concept notes and diagnostic skill breakdown on profile.                       │
│                                                                                              │
│   2. DAILY HABIT SECOND:                                                                     │
│      - 1 challenge every 24h (17:00 IST boundary), keeping daily focus.                      │
│      - Streaks celebrate regular daily engagement (1 rolling 7-day freeze for resilience).   │
│      - Uploads provide personalized checker feedback and preserve streak (zero rank points). │
│                                                                                              │
│   3. COMPETITION THIRD:                                                                      │
│      - Daily board ranks strictly by consistency (current streak, total solved).             │
│      - ZERO speed penalties. ZERO attempt penalties. ZERO public timing comparisons.         │
│      - Percentile displayed ONLY when ≥ 10 students solve today (avoids discouraging small   │
│        cohorts; displays total solver count otherwise).                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inviolable Security & Data Boundaries

1. **Unreleased Content Security**: Future, unreleased, and draft challenges remain strictly server-side (`allow read: if false` on `/problems/{id}`). Students can never read ahead or inspect tomorrow's challenge.
2. **Hidden Test Secrecy**: Hidden test inputs, expected outputs, and reference solutions NEVER leave the server judge sandbox. Only high-level category hints (e.g., *"Boundary condition failed"*) are returned on failure.
3. **Private Attempt Counts**: Wrong attempts are stored in private student submission records (`users/{uid}/submissions/{id}`) and are visible **only to the student and system admins**. No peer, leaderboard, or public profile can inspect another student's failed attempt count.
4. **Deny-by-Default Firestore Rules**: All existing security invariants in `firestore.rules` (tamper-proof scores, immutable historical boards, strict owner-only reads of private data) remain 100% intact and unweakened.

---

## 3. Detailed Item-by-Item Specifications

### Item 1: Consistency-First Daily Ranking (No Speed or Attempt Penalties)

#### Change Description:
- **Remove Timing Penalties**: Elimination of server-side `submittedAt ASC` as a primary sorting key. Two students who solve today's challenge—one at 17:05 IST and one at 15:30 IST the next afternoon—are evaluated on identical footing.
- **Remove Attempt Deductions**: Wrong submissions do not deduct points, decrease ranking, or hurt public standing. Mistakes are treated as an essential part of learning C.
- **Consistency-Based Rank Sorting**:
  1. `currentStreak DESC` (Primary: Rewards daily habit and regular problem solving).
  2. `totalSolved DESC` (Secondary: Cumulative problems solved across daily challenges and practice).
  3. `stableTieBreak` (`createdAt ASC`, then `uid ASC` for deterministic, non-flickering display).
- **Public Display**: The daily leaderboard table displays: `Rank`, `Student Display Name / Anonymous ID`, `Department & Year`, `Status (Solved Today)`, and `Streak`. It **does not display submission time, execution speed, or attempt count**.
- **Percentile Display Gate**:
  - If today's solver count $N \ge 10$: Display *"Top P%"* (where $P = \lceil (R / N) \times 100 \rceil$).
  - If $N < 10$: Hide percentile and display *"Solved by N students today"* (removes artificial "Top 50%" or "Top 100%" discouragement on quiet days).

#### Data Model & Schema Modifications:
- `DailyResult` / `DailyBoardEntry`:
  ```typescript
  interface DailyBoardEntry {
    userId: string;
    displayName: string;
    department: string;
    year: string;
    currentStreak: number;     // Rank sorting key 1
    totalSolved: number;       // Rank sorting key 2
    solvedAt: number;          // Stored for auditing only; NOT used in rank sort or public UI
    attempts: number;          // PRIVATE to user; stripped from public board responses
    isDailySolved: boolean;
  }
  ```
- Firestore Security Rules: Public `daily_boards/{dayId}/leaderboard/{id}` documents omit `attempts` and `solvedAt` fields or restrict them via server projection.

#### Cost Impact:
- **Reads/Writes**: Zero net change. Daily finalization continues to compute rank once at 17:05 IST. Sorting complexity is $O(N \log N)$ where $N \le 300$, consuming negligible compute.

#### Content Work Needed:
- None.

#### Test Specifications:
- Test sorting order with identical solvers having different `submittedAt` times $\rightarrow$ Verify solver with higher streak ranks higher regardless of solve time.
- Test that student with 10 wrong attempts before solve ranks identically to student with 1 attempt if streaks and total solved match.
- Test that public leaderboard API and client views never leak `attempts` or `runtimeMs`.
- Test percentile renders `"—"` or `"Solved by 4 students"` when $N = 4$, and renders `"Top 20%"` when $N = 10$.

#### What Becomes Contradicted / Unnecessary:
- Contradicts and overrides `MASTER_SPEC.md` Section 1, Item 5 tie-break rule: `(1) earlier server-side accepted submittedAt ASC, (2) fewer wrong attempts before accepted ASC`.
- Speed comparison badges and `runtimeMs` columns on public leaderboards are removed.

---

### Item 2: Read-Only "Review" Area After the Day Ends

#### Change Description:
- **Day Cutoff Transition**: At `17:00:00 IST`, the active daily challenge moves from the active "Solve" workspace into the **Review Archive**.
- **Pedagogical Review Page**:
  - Accessible to all enrolled students for challenges where `dayDate < todayDateIST`.
  - Displays:
    1. Problem Statement & visible sample cases.
    2. **Concept & Approach Guide**: Explanation of the core concept (e.g. *"Pointer arithmetic vs array indexing in C"*).
    3. **Common Pitfalls & Mistakes**: Explicit breakdown of compiler warnings, off-by-one errors, buffer overruns, or uninitialized variables that tripped up peers.
    4. **Interactive Sandbox / Retry Without Points**: An embedded editor allowing students to write, compile, and run C code against the problem's tests with immediate feedback, awarding **zero points, zero streak, and zero rank impact**.
- **Future Challenge Secrecy**: Challenges scheduled for future dates remain strictly inaccessible. Requesting a future challenge ID returns HTTP 404 / Firestore permission denied.

#### Data Model & Schema Modifications:
- `Problem` schema updated with learning fields:
  ```prisma
  // In server/prisma/schema.prisma
  model Problem {
    // Existing fields...
    approachExplanation  String?   // Markdown approach guide
    commonMistakes       String?   // Markdown common pitfalls breakdown
    reviewPublished      Boolean   @default(false)
  }
  ```
- `ReviewSession` (or transient client practice run):
  - Retries use `type: 'REVIEW_RETRY'` in the judge client, updating local student feedback without writing to competitive `submissions` collection.

#### Cost Impact:
- **Reads**: Minimal increase (1 read per review page visit). Cached via HTTP `Cache-Control: public, max-age=3600` for finalized days since review content is immutable once published.
- **Writes**: Zero writes for review viewing. Sandboxed retry runs through Cloud Run judge at lowest priority queue.

#### Content Work Needed:
- Every daily challenge requires an admin-reviewed **Approach Explanation** ($\approx 150-300$ words) and **Common Pitfalls** section before being validated and scheduled.

#### Test Specifications:
- Verify challenge at date $T-1$ allows viewing statement, approach explanation, and common mistakes.
- Verify challenge at date $T+1$ rejects client requests with 404 / 403.
- Verify retry submissions on ended challenges succeed in judge execution but award 0 points and 0 streak.

#### What Becomes Contradicted / Unnecessary:
- Contradicts earlier rule stating: *"Requesting an ended challenge shows a calm 'This challenge has ended' page with no statement, samples, or tests"*.
- The blank/empty ended page is replaced with the structured pedagogical Review page.

---

### Item 3: Tiered Hints & Diagnostic Feedback

#### Change Description:
- **Tiered Hint Unlocks**:
  - **Hint 1 (Nudge / Conceptual Direction)**: Automatically unlocks for the student after **2 failed attempts** (`WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, or `COMPILE_ERROR`).
  - **Hint 2 (Structural Guidance / Edge Case Warning)**: Automatically unlocks after **4 failed attempts**.
  - **Zero Full Solutions**: Hints never provide copy-paste code or complete logic; they prompt critical thinking (e.g., *"Remember that `sizeof` on an array parameter inside a function returns pointer size, not array length"*).
- **Friendly Plain-Language GCC Compiler Help**:
  - The judge continues to return the raw GCC stderr for technical accuracy, but the UI presents a plain-language translation card directly above it.
  - Examples:
    - `error: expected ';' before '}'`: *"You may have forgotten a semicolon (;) on the line right before the closing brace."*
    - `warning: format '%d' expects argument of type 'int *', but argument 2 has type 'int'`: *"In `scanf`, remember to pass the address of your variable using `&` (e.g. `scanf(\"%d\", &num);`)."*
    - `error: subscripted value is neither array nor pointer`: *"You are using `[ ]` on a variable that isn't an array or pointer."*
    - `warning: implicit declaration of function 'malloc'`: *"Add `#include <stdlib.h>` at the top of your program to use dynamic memory functions."*
- **Visible Sample Diff**:
  - For visible sample cases that fail, show a side-by-side or inline character diff of **Expected Output** vs **Actual Output** with whitespace/newline highlights.
- **Hidden Test Privacy**:
  - For failures on hidden test cases, the system **never outputs input data or expected text**.
  - Returns strictly an abstracted diagnostic tag:
    - `"Edge Case Failure (e.g., zero, negative, or minimum/maximum constraints)"`
    - `"Boundary Condition Failure (e.g., array bounds, empty input)"`
    - `"Memory or Pointer Fault"`
- **Authoring & Admin Gate**:
  - Problem editor enforces: `hint1` and `hint2` are mandatory fields before a problem can move to `VALIDATED` or `PUBLISHED`.
  - Admin must explicitly review and approve any AI-drafted hint or explanation.

#### Data Model & Schema Modifications:
- `Problem` schema:
  ```prisma
  model Problem {
    // ...
    hint1             String?   // Unlocked after 2 fails
    hint2             String?   // Unlocked after 4 fails
    hiddenFailReason  String?   // High-level diagnostic category (e.g. "BOUNDARY_LIMITS")
  }
  ```
- Submissions API response includes:
  ```typescript
  interface JudgeFeedbackResponse {
    verdict: string;
    rawStderr?: string;
    friendlyCompilerHint?: string;  // Plain-English mapping
    sampleDiff?: {
      expected: string;
      actual: string;
      diffIndices?: number[];
    };
    hiddenCategoryHint?: string;    // Only category name; never data
    availableHints: {
      hint1Unlocked: boolean;
      hint1Text?: string;
      hint2Unlocked: boolean;
      hint2Text?: string;
      attemptsRemainingForNextHint: number;
    };
  }
  ```

#### Cost Impact:
- **Reads/Writes**: Hints are delivered conditionally in the submission response based on student attempt count calculated in memory. Zero additional database reads.

#### Content Work Needed:
- Hint authoring template for Kanetkar book pipeline (`hint1`, `hint2`, `hiddenCategory`).

#### Test Specifications:
- Attempt 1 fails $\rightarrow$ verify `hint1` is null / locked.
- Attempt 2 fails $\rightarrow$ verify `hint1` is unlocked and populated; `hint2` is locked.
- Attempt 4 fails $\rightarrow$ verify `hint2` is unlocked.
- Verify GCC error `format '%d' expects 'int *'` triggers plain-language translation.
- Verify hidden test failure response contains zero hidden input strings or expected values.

#### What Becomes Contradicted / Unnecessary:
- Contradicts strict "no feedback on failures except verdict code" approach.
- Raw unparsed compiler dumps without guidance are replaced by dual-layer feedback (friendly explanation + raw GCC output).

---

### Item 4: Practice Modules as the Core Learning Path

#### Change Description:
- **Concept Notes**: Each of the 4 syllabus modules opens with an author-curated, original **Concept Note** (markdown summary of key C principles, memory mental models, common syntax gotchas, and debugging tips).
  - Module 1: *Control Flow & Structured Logic* (branching, truthiness in C, loop termination).
  - Module 2: *Functions & Pointer Foundations* (stack frames, call by value vs reference, pointer dereferencing).
  - Module 3: *Arrays, Strings & Pointer Arithmetic* (array-pointer duality, null terminators, buffer sizing).
  - Module 4: *Structures & Dynamic Memory Allocation* (memory alignment, `malloc`/`free`, memory leaks).
- **Daily Challenge Topic Alignment**:
  - Daily challenges are organized in instructional thematic blocks aligning with the active practice module wherever the approved book pool allows (e.g. Week 1 daily challenges focus on control flow and expressions).
- **Configurable Module Unlock Threshold**:
  - Unlock threshold is configurable per module (default: all 10 of 10 solved). Admin can adjust based on pilot difficulty data.

#### Data Model & Schema Modifications:
- Practice Module Config / Table:
  ```typescript
  interface PracticeModuleConfig {
    id: string;
    title: string;
    conceptNoteMarkdown: string;  // Original pedagogical guide
    unlockThreshold: number;      // Default: 7
    problems: PracticeProblemSummary[];
  }
  ```

#### Cost Impact:
- **Reads**: Concept notes bundled into static module metadata; 0 additional Firestore queries.
- **Writes**: None.

#### Content Work Needed:
- Authoring 4 original concept notes ($\approx 400-600$ words each) with clear C code snippets.

#### Test Specifications:
- Verify Module 1 displays concept note before problem list.
- Verify solving 7 problems unlocks Module 2; verify config update to 6 changes unlock logic dynamically.

---

### Item 5: Uploaded Solutions as Pedagogical Feedback (Not Rank Points)

#### Change Description:
- **Pedagogical Shift**: Handwritten code/flowchart uploads are transformed from a point-scoring shortcut into a **mentorship and qualitative review channel**.
- **Checkers as Mentors**:
  - Checkers evaluate uploads against a qualitative rubric: *Logic clarity*, *Variable naming*, *Edge case consideration*, *Memory safety*.
  - Checkers provide **constructive written feedback** and mark the upload as `REVIEWED` or `NEEDS_REVISION`.
- **Zero Rank Impact**:
  - Approved/reviewed uploads **do NOT award leaderboard rank points**.
  - Rank points are earned solely through accepted automated judge execution.
- **Streak Integration Decision**:
  - **Decision**: A thoroughly reviewed upload marked `REVIEWED` by a checker **counts toward extending or preserving the student's daily streak** (capped at once per challenge day).
  - *Rationale*: A student who works out a complete algorithmic solution with paper/flowchart and receives checker validation has practiced C thinking and maintained the daily habit, even if they lacked access to a computer with a compiler that evening.

#### Data Model & Schema Modifications:
- `UploadedSolution` schema:
  ```prisma
  model UploadedSolution {
    id              String    @id @default(uuid())
    userId          String
    problemId       String
    status          String    // PENDING_REVIEW, REVIEWED, NEEDS_REVISION
    checkerFeedback String?   // Constructive feedback text
    reviewedBy      String?
    reviewedAt      DateTime?
    countsForStreak Boolean   @default(true)
    pointsAwarded   Int       @default(0) // Strictly 0
  }
  ```

#### Cost Impact:
- **Reads/Writes**: Zero net change. Checker review writes feedback text and triggers streak extension transaction if not already completed for the day.

#### Content Work Needed:
- Checker feedback rubric and standard feedback templates for common stylistic issues.

#### Test Specifications:
- Verify checker approving an upload marks it `REVIEWED` and awards `0` rank points.
- Verify `REVIEWED` status updates daily streak if student had not solved via code that day.
- Verify leaderboard points remain unchanged after upload approval.

#### What Becomes Contradicted / Unnecessary:
- Contradicts earlier rule where upload approvals awarded base points ($20/30/50$ PTS) and affected daily rank.

---

### Item 6: Student Learning Insights on Profile

#### Change Description:
- **Personalized Diagnostic Insights**:
  - Replaces generic statistics with formative learning feedback:
    1. **Topic-Level Mastery**: Strengths and weakness tags derived from verdicts across syllabus areas (e.g., *"Strong: Loops & Operators (92% accuracy)"*, *"Needs Practice: Pointer Arithmetic & Strings (42% accuracy)"*).
    2. **Suggested Practice Modules**: Dynamic recommendation cards linking directly to practice modules corresponding to frequent errors (e.g., *"Revisit Module 2: Pointer Foundations"*).
    3. **Verdict Breakdown**: Detailed personal chart showing Accepted vs Wrong Answer vs Compile Error vs Time Limit Exceeded.
- **Strict Privacy Invariant**:
  - Learning insights are rendered **strictly on the student's own private profile view**.
  - Public profile views (seen by peers via leaderboard links) omit error diagnostics and show only public display name, department, year, total solved count, and streak.

#### Data Model & Schema Modifications:
- Server computes student skill diagnostics on-the-fly or aggregates in `users/{uid}/stats/learning_insights`:
  ```typescript
  interface StudentLearningInsights {
    topicBreakdown: {
      topic: string;
      solved: number;
      totalAttempts: number;
      successRatePct: number;
      status: 'STRONG' | 'PROFICIENT' | 'NEEDS_FOCUS';
    }[];
    suggestedModules: {
      moduleId: string;
      title: string;
      reason: string;
    }[];
    verdictCounts: Record<string, number>;
  }
  ```

#### Cost Impact:
- Aggregated server-side during profile query; negligible cost.

#### Content Work Needed:
- Tagging all problems with standardized syllabus topic tags (`control-flow`, `pointers`, `arrays`, `dynamic-memory`, `recursion`, `strings`).

#### Test Specifications:
- Verify student profile displays topic breakdown and suggested module.
- Verify requesting another student's profile omits learning insights and topic weakness data.

---

### Item 7: Pilot Metrics for Learning (`/docs/PILOT_PLAN.md`)

#### Change Description:
- Defines the 14-day institutional pilot instrumentation focusing on learning efficacy rather than mere user volume.
- Key Metrics tracked anonymously on Admin Reports:
  1. **Retry-After-Failure Rate**: Percentage of students encountering a failed verdict who submit another attempt within 30 minutes.
  2. **Practice Module 1 Completion Rate**: Percentage of active students who successfully unlock Module 2 ($\ge 7$ problems solved in Module 1).
  3. **Hint Engagement & Efficacy**: Frequency of hint unlocks and percentage of students who solve a problem within 3 attempts after viewing Hint 1 or Hint 2.
  4. **Week 2 Retention**: Percentage of students active in Week 1 who return in Week 2.
  5. **Mean Time-to-Solve**: Average active minutes from first test run to accepted verdict.
  6. **Pre/Post Diagnostic Assessment**: Optional 5-question baseline C quiz upon signup and matched exit quiz at pilot completion (requires explicit student consent).

---

## 4. Release 1 vs Postponed Scope Matrix

| Feature / Amendment | Recommendation | Technical & Pedagogical Rationale |
| :--- | :---: | :--- |
| **Consistency Daily Rank (No speed/attempt penalties)** | 🟢 **RELEASE 1** | Immediate positive culture shift; eliminates solver anxiety and cheating races. |
| **Percentile Gate (Only when $\ge 10$ solvers)** | 🟢 **RELEASE 1** | Trivial logic change; prevents discouraging low-cohort percentile displays. |
| **Friendly GCC Compiler Error Mapping** | 🟢 **RELEASE 1** | High-impact learning intervention; turns frustrating GCC messages into teaching moments. |
| **Sample Test Expected vs Actual Diff** | 🟢 **RELEASE 1** | Immediate clarity on whitespace and formatting mismatches. |
| **Uploads as Feedback (0 rank points, streak only)** | 🟢 **RELEASE 1** | Aligns checkers as mentors; eliminates point-farming loop. |
| **Concept Notes for 4 Practice Modules** | 🟢 **RELEASE 1** | Essential scaffolding for students navigating self-paced practice. |
| **Day-After Review Mode (Approach & Pitfalls)** | 🟢 **RELEASE 1** | Students need to see how a problem should have been approached once closed. |
| **Tiered Hint System (At 2 and 4 fails)** | 🟡 **RELEASE 1 (Core)** | Requires authoring hints for initial pool; core UI and API included in R1. |
| **Diagnostic Learning Insights on Profile** | 🟡 **RELEASE 1 (Basic)** | Show verdict breakdown and basic topic accuracy; advanced recommendations in R1.1. |
| **Pre/Post Concept Assessment Quiz** | ⚪ **POSTPONE (R2)** | Avoids initial pilot onboarding friction; prioritize core challenge & practice flow first. |
| **Interactive Code Diff in Review Mode** | ⚪ **POSTPONE (R2)** | Visual review and zero-point retry is sufficient for Release 1. |

---

## 5. Security & Rule Compatibility Verification

- **Security Rules**: No security rules are weakened.
- **Client Privilege**: Clients remain completely blocked from reading unreleased challenges, hidden tests, or peers' private submission histories.
- **Private Data Vault**: Wrong attempts and topic diagnostics are private to the owning user and administrators.

---
