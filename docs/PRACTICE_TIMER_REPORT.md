# LogicQ Practice Per-Question Timers, Attempt Tracking & Practice Reports Specification (`/docs/PRACTICE_TIMER_REPORT.md`)

> **AUTHORITATIVE DESIGN SPECIFICATION**: This document details the technical architecture, data model, anti-tamper synchronization protocol, cost projections, and reporting pipeline for **Per-Question Timers, Attempt Tracking, and Module/Final Reports** in the LogicQ Practice Arena.

---

## 1. Executive Summary & Design Goals

The LogicQ Practice arena provides a 4-module sequential curriculum of 40 C programming problems (10 per module). Unlike the Daily Challenge (which features a 24-hour cutoff and competitive consistency ranking without time penalties), Practice is a self-paced mastery environment.

To support self-regulation, diagnostic feedback, and faculty content evaluation without inducing artificial time panic, the system implements:
1. **Per-Question Active Timers**: Every Practice question has an independent timer that accumulates active coding and thinking time only. It starts when the student opens the problem workspace, pauses during tab hiding or idle periods (> 2 minutes), and permanently freezes upon the first `ACCEPTED` solve.
2. **Anti-Tamper Server Delta Sync**: The client measures time locally and synchronizes deltas periodically (every 120s, on pause, on visibility change, on page hide via `sendBeacon`, and on Submit). The server validates deltas against true wall-clock passage, caps deltas at 150 seconds, and deduplicates multi-tab concurrent sessions.
3. **Server-Managed Attempt Counting**: Submit attempts and test runs are incremented idempotently by the server execution pipeline.
4. **Per-Module & Final Curriculum Reports**: Instant diagnostic reports unlocked upon module completion (10/10) and curriculum completion (40/40). Reports provide difficulty breakdowns, personal "Hardest Questions", attempt distributions, accessible visual charts, and educational topic recommendations.
5. **Strict Institutional Privacy**: Student-facing reports and PDF/CSV exports show only display name, department, and year. The 12-character PRN and M/F gender indicator are strictly excluded from exported reports.

---

## 2. Authoritative Data Model & Schema Specification

### 2.1. Firestore Document Architecture

Practice timer and attempt records are stored in a private subcollection per student:
`users/{userId}/practice_progress/{problemId}`  
*(Mirrored / Aliased in `practice_progress/{userId}_{problemId}` for top-level aggregation where required by admin queries)*.

#### Document Schema: `users/{userId}/practice_progress/{problemId}`
| Field Name | Type | Description | Invariants & Validation |
| :--- | :--- | :--- | :--- |
| `problemId` | `string` | ID of the practice problem | Valid UUID / alphanumeric slug |
| `moduleSlug` | `string` | Slug of parent practice module | Must match one of 4 curriculum modules |
| `firstOpenedAt` | `timestamp` | Timestamp when workspace first opened | Immutable once set |
| `activeSeconds` | `integer` | Total accumulated active solving time | Monotonically non-decreasing; $\ge 0$ |
| `lastSyncedAt` | `timestamp` | Server timestamp of last delta sync | Server-clock governed |
| `attempts` | `integer` | Count of judged `Submit` actions | Incremented strictly by server judge |
| `runs` | `integer` | Count of `Run Code` test executions | Incremented by server run controller |
| `attemptList` | `array<map>` | Append-only history of judged attempts | Max 50 items (see sub-schema below) |
| `solvedAt` | `timestamp \| null` | Timestamp of first `ACCEPTED` solve | Null until solved; frozen upon first solve |
| `timeToSolveSeconds` | `integer \| null` | `activeSeconds` at moment of first solve | Frozen permanently upon first `ACCEPTED` solve |
| `timeToFirstAttemptSeconds`| `integer \| null` | `activeSeconds` when attempt #1 occurred | Recorded once on first submit |
| `firstAttemptAccepted` | `boolean` | Whether attempt #1 was `ACCEPTED` | True if first submit passed |
| `deviceLabel` | `string` | Device/OS string of last sync client | e.g., `"Windows • Chrome"` |
| `hintsUsed` | `integer` | Number of hints accessed | Default 0 |
| `updatedAt` | `timestamp` | Last document modification time | Server timestamp |

#### Sub-Schema: `attemptList` item
```json
{
  "attemptNumber": 1,
  "verdict": "WRONG_ANSWER",
  "timestamp": "2026-10-16T10:15:30.000Z",
  "activeSeconds": 345
}
```

### 2.2. Relational Database (Prisma) Parity Schema

To maintain complete dual-tier parity with LogicQ's server architecture, `schema.prisma` is augmented with matching fields:

```prisma
model PracticeProgress {
  id                        String    @id @default(uuid())
  userId                    String
  user                      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  problemId                 String
  problem                   Problem   @relation(fields: [problemId], references: [id], onDelete: Cascade)
  moduleSlug                String
  isSolved                  Boolean   @default(false)
  attemptsCount             Int       @default(0)
  runsCount                 Int       @default(0)
  activeSeconds             Int       @default(0)
  timeToSolveSeconds        Int?
  timeToFirstAttemptSeconds Int?
  firstAttemptAccepted      Boolean   @default(false)
  firstOpenedAt             DateTime?
  solvedAt                  DateTime?
  lastSyncedAt              DateTime?
  lastDeviceLabel           String?
  attemptsHistoryJson       String    @default("[]") // JSON stringified array of attempt logs
  hintsUsed                 Int       @default(0)
  updatedAt                 DateTime  @default(now()) @updatedAt

  @@unique([userId, problemId])
  @@index([userId, moduleSlug])
  @@index([problemId])
}
```

---

## 3. Client & Server Interaction Flow

```
+-----------------------------------------------------------------------------------------+
| STUDENT BROWSER CLIENT (PracticeWorkspacePage.tsx)                                      |
|                                                                                         |
|  1. Open Question Workspace (problemId)                                                 |
|     --> Start local active tick (1s intervals) if problem is unsolved                    |
|     --> User Activity Monitor (Keydown, Pointer, Touch, Monaco onChange)               |
|     --> Inactivity Timer (resets on activity; triggers IDLE PAUSE after 120s)           |
|     --> Tab Visibility Monitor (document.visibilityState: visible vs hidden)             |
|                                                                                         |
|  2. Delta Sync Triggers:                                                                |
|     [Periodic: 120s] | [Idle Pause] | [Tab Hidden] | [Page Hide/Unload] | [Submit Solution] |
|                                                                                         |
|  3. Dispatch Payload:                                                                   |
|     POST /api/practice/timer-sync                                                       |
|     { problemId, deltaSeconds, deviceLabel, clientTimestamp }                           |
|     (Uses navigator.sendBeacon or fetch(keepalive:true) during unload)                   |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
| SERVER CONTROLLER (practice.controller.ts) & ANTI-TAMPER VALIDATOR                      |
|                                                                                         |
|  1. Authenticate student via session/JWT. Verify problemId is a published practice item.  |
|  2. Retrieve authoritative progress record for (userId, problemId).                     |
|  3. If problem is already solved:                                                       |
|     --> Return current frozen record; reject any delta addition (solved is untimed).    |
|  4. Anti-Tamper Check:                                                                  |
|     * Bounded Delta: 0 <= deltaSeconds <= 150                                           |
|     * Wall-Clock Clamping:                                                              |
|       elapsedWallClock = now - (record.lastSyncedAt || record.firstOpenedAt || now)     |
|       maxAllowedDelta = elapsedWallClock + 5 (grace)                                    |
|       validatedDelta = min(deltaSeconds, maxAllowedDelta, 150)                          |
|     * Multi-Tab Concurrency Guard:                                                      |
|       Atomic update advances lastSyncedAt to 'now'. Second tab cannot replay delta.    |
|  5. Apply validatedDelta to activeSeconds. Update lastSyncedAt and deviceLabel.         |
|  6. Return updated progress payload.                                                    |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
| SERVER EVALUATION PIPELINE (submission-evaluator.ts)                                    |
|                                                                                         |
|  1. On Submit received:                                                                 |
|     --> Synchronize final pending timer delta.                                          |
|     --> Increment attemptsCount atomically.                                             |
|  2. On Judge Verdict calculated:                                                        |
|     --> Append attempt log entry { attemptNumber, verdict, timestamp, activeSeconds }.  |
|     --> If verdict == ACCEPTED and !existingProg.isSolved:                               |
|         - Mark isSolved = true                                                          |
|         - solvedAt = now                                                                |
|         - timeToSolveSeconds = current activeSeconds (FROZEN PERMANENTLY)               |
|         - If attemptsCount == 1: firstAttemptAccepted = true                            |
|     --> Emit realtime WebSocket & Query invalidate signals.                             |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Anti-Tamper & Concurrency Guards

| Threat Vector | Mitigation Mechanism |
| :--- | :--- |
| **Direct Database Manipulation** | Firestore rules strictly forbid student client writes (`allow write: if false;`). All updates occur via the authenticated backend API. |
| **Artificially Inflated Delta** | Client cannot send delta $> 150$ seconds in a single request. Server enforces `delta <= wallClockElapsed + 5s`. |
| **Negative Delta Reversal** | Server checks `deltaSeconds >= 0`. Any negative delta is dropped. |
| **Replayed Delta Requests** | Server records `lastSyncedAt` and verifies forward progression of server clock. |
| **Multi-Tab / Multi-Device Double Counting** | If a student opens Problem A in two tabs simultaneously, each sync call advances the server `lastSyncedAt`. The second tab's elapsed wall-clock from `lastSyncedAt` is reduced accordingly, ensuring 1 physical second equals at most 1 recorded second. |
| **Post-Solve Time Dilution** | Once `isSolved == true`, `timeToSolveSeconds` is immutable. Further coding is untimed and does not increment `timeToSolveSeconds`. |
| **Background Tab Inactivity** | When the browser tab is hidden or throttled, client active tick pauses immediately. When tab becomes visible, tick resumes with a 0-delta baseline. |

---

## 5. Capacity & Firestore Cost Projections (500 Students)

### 5.1. Daily Usage Modeling
- Cohort Size: 500 active engineering students.
- Average Practice Time: 45 minutes per student daily.
- Solves per Student: 2–3 questions per day.
- Sync Interval: Every 120 seconds active + ~2 event syncs (pause/submit/unload) per question $\approx 25$ syncs per student daily.

### 5.2. Operations Breakdown (Daily)
1. **Timer Delta Syncs (`POST /api/practice/timer-sync`)**:
   - $500 \text{ students} \times 25 \text{ syncs} = 12,500 \text{ writes/day}$.
   - Average document size: ~500 bytes.
   - Total network payload: $\approx 6.25 \text{ MB/day}$.
2. **Submission Attempt Increments**:
   - $500 \text{ students} \times 8 \text{ attempts} = 4,000 \text{ writes/day}$.
3. **Practice Progress Reads**:
   - Loading workspace & report views: $500 \times 15 = 7,500 \text{ reads/day}$.

### 5.3. Monthly Cost & Quota Analysis
| Metric | Projected Monthly Volume | Firebase Blaze Quota (Free Tier) | Net Billed | Estimated Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Document Writes** | $\approx 495,000 / \text{month}$ | 20,000 / day (600,000 / mo) | 0 (Within free tier) | **$0.00** |
| **Document Reads** | $\approx 225,000 / \text{month}$ | 50,000 / day (1,500,000 / mo) | 0 (Within free tier) | **$0.00** |
| **Storage & Egress** | $\approx 250 \text{ MB} / \text{month}$ | 10 GB / month | 0 | **$0.00** |
| **Total Practice Infra Cost** | — | — | — | **$0.00 / month** |

> [!NOTE]
> Even under a 2x stress peak (1,000 students or 1,000,000 writes/month), Blaze billing is charged at \$0.18 per 100,000 writes beyond free tier, resulting in an estimated maximum cost of **<$1.00/month**.

---

### 6. Practice Progress Reports Specification

### 6.1. Availability Rules & Formats
- **Formats**:
  * **PDF**: A4 portrait format, print-friendly light theme regardless of the user's active theme, embedded fonts, selectable text, accessible table markup. File name: `LogicQ-Practice-Report-<Module-N or Final>-<YYYY-MM-DD>.pdf`.
  * **CSV**: RFC 4180 standard CSV, one row per question, with raw numerical values. File name: `LogicQ-Practice-Report-<Module-N or Final>-<YYYY-MM-DD>.csv`.
- **Location**: Available on the student's Profile under "Practice report" on mobile phones and desktop laptops.
- **Unlocking Gates**:
  * **Per-Module Report**: Appears when that module is fully solved (10/10).
  * **Final Report**: Appears when all 4 modules are fully solved (40/40).
  * **In-Progress Report**: A student may download an "In progress" report at any time, clearly labeled with `IN PROGRESS (UNVERIFIED COMPLETION)` and without the verified completion seal or badge (governed by config flag `ALLOW_IN_PROGRESS_REPORT_DOWNLOAD = true`).

### 6.2. PDF Layout & Page Budgeting
1. **Page 1, Summary**:
   - Title: `"LogicQ Practice Report"` with subtitle `"Final, all 4 modules"`, `"Module N"`, or `"In progress"`.
   - Student Identity: Display Name (or fallback `"Student XXXX"`), department, year, and division.
   - Metadata: Generation date and unique cryptographic Report ID.
   - Summary Figures Row: Solved out of total, total attempts (with runs count), total active time, solved on the first try (count and percent), average time per question.
   - Charts: Horizontal distribution bar charts for active time per question and attempts per question (coloured by module) accompanied by accessible text alternatives.
   - "Your hardest questions": Top 5 questions with the most attempts and longest active solve times.
   - Encouraging Pedagogical Summary: Neutral and encouraging feedback (e.g. which modules had high first-try accuracy and topics taking more attempts). Strictly no speculation about ability and zero comparison with peer students.
   - Footer: `"Time means the time you were actively on the question. An attempt is a judged Submit. This is your own practice record, not an official college marksheet."` plus report ID and page number (`Page 1 of N`), plus short verification link / QR code.
2. **Page 2, Module-Wise & Difficulty Summary**:
   - Module Summary Table: One row per module (Module title, solved count, total attempts, total active time, first-try count).
   - Difficulty Table: `Easy`, `Medium`, `Hard` matrix detailing number of questions, average attempts, and average active time.
   - Online verification QR code and short link confirming genuine report authenticity with zero PII.
   - Page 2 footer note.
3. **Following Pages, One Section per Module**:
   - Section header with module title and solve progress.
   - Detailed Question-by-Question Table:
     * Columns: Number (`#`), Title, Difficulty, Attempts, Solved on first try (`Yes`/`No`), Time to first attempt, Time to solve, Hints used (or `—` if none).
     * Unopened or unsolved questions show `—`.
     * Time formatted as `mm:ss` or `h m`; extreme values $\ge 3$ hours display as `"3h+"` while preserving exact seconds in the CSV.
   - Page break between modules; rows never split across pages (`page-break-inside: avoid`).
   - Page footer on every page.

### 6.3. Institutional Privacy & Data Protection
- **Strict Zero-PII**: Student-facing files, PDF prints, CSV exports, and verification endpoints strictly exclude the 12-character PRN, M/F gender indicator, student email, and source book references.
- **Server-Side Generation**: Reports are computed strictly on-demand from server-validated `practiceProgress` records.
- **Rate-Limiting**: Regeneration has a 30-second cooldown (`429 RATE_LIMITED`).
- **Data Export & Deletion**: Personal data export (`/users/me/export`) includes practice progress, and account deletion clears all records and invalidates verification.

---

## 7. Admin View & Aggregate Analytics

1. **Curriculum Diagnostic Overview (`/admin/reports` / `/admin/practice`)**:
   - Per-problem statistics across student cohort:
     * Solve Rate (`%` of students who solved problem).
     * Median Active Time & Mean Active Time.
     * Median Attempts & Mean Attempts.
     * Failure Rate (`WRONG_ANSWER`, `COMPILE_ERROR`, `TIME_LIMIT_EXCEEDED` breakdown).
2. **Identification of Problem Gaps**:
   - Highlights questions with anomalous attempt spikes or extreme solve times for faculty review.
3. **Audited CSV Export**:
   - Allows administrators to export institutional practice records grouped by Department, Year, and Division.
   - PRN is masked by default (`••••••••1039`) and unmasked only when an administrator triggers an audited identity reveal.

---

## 8. Security & Compliance Perimeter

1. **Firestore Security Rules**:
   - `match /users/{userId}/practice_progress/{problemId}`:
     * `allow read: if isOwner(userId) || isAdmin();`
     * `allow write: if false;` (Strictly managed by server API).
2. **Data Deletion & DPDP Compliance**:
   - When a student requests account deletion, all `practice_progress` documents are purged atomically.
   - When a student exports personal data (`GET /api/user/export-data`), practice timer and attempt logs are included in JSON/CSV archives.
3. **Backup Integration**:
   - Included in automated Firestore scheduled exports and Prisma database backup scripts.
