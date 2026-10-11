# LogicQ End-to-End QA & Acceptance Test Plan (`/docs/TEST_PLAN.md`)

## 1. Testing Principles & Clean Environment Setup

1. **Zero Real Student Data**: All testing runs strictly against the **Firebase Local Emulator Suite** (or an isolated test database), never touching real Sanjivani student records.
2. **Honest Reporting**: Every test execution is recorded in [`/docs/TEST_REPORT.md`](./TEST_REPORT.md) with columns: `ID | Feature | Steps | Expected Result | Actual Result | Evidence (Screenshot/Log) | PASS / FAIL / BLOCKED`.
3. **Deterministic Seed Dataset**:
   - **1 Admin**: `admin@sanjivani.org.in` (custom claim `role: 'ADMIN'`).
   - **3 Students**: Student A (`student.a@sanjivani.org.in`), Student B (`student.b@sanjivani.org.in`), Student C (`student.c@sanjivani.org.in`).
   - **6 Validated Problems**: 2 Easy, 2 Medium, 2 Hard (each with Markdown statement, constraints, $\ge 2$ visible sample tests, $\ge 5$ hidden edge-case tests, and a verified C11 reference solution; seeded from a total pool of $16$ validated problems).
   - **1 Scheduled Daily Challenge**: Unlocked for the current `17:00 IST` challenge day.
   - **Badge Definitions**: Core streak and solve count badges.

---

## 2. Part 1 — Feature-by-Feature Test Matrix (Normal, Invalid & Edge Cases)

Each feature must pass a **Normal Case**, **Invalid Input**, and **Edge Case** in a real Chromium browser:

| ID | Feature Area | Normal Case | Invalid Input | Edge Case |
| :--- | :--- | :--- | :--- | :--- |
| **TP-01** | **Landing Page & Visual Design** | Matches `logicq.html` dark palette (`#0C0F1F` bg, `#141932` panel, `#8B9BFF` accent, Bricolage Grotesque / Inter / JetBrains Mono fonts) and SVG `<Logo />`. | Broken route `/unknown-route` renders clean `404` page with return CTA. | Responsive check at `360px`, `768px`, and `1280px` with zero horizontal scroll (`scrollWidth <= clientWidth`). |
| **TP-02** | **Sign Up & College Domain Check** | Valid `@sanjivani.org.in` registration creates user profile and shows in Admin User Roster. | Empty fields, bad email format, non-college email (`@gmail.com` when restricted), short/mismatched password rejected. | Duplicate email registration attempt returns generic error without leaking account details. |
| **TP-03** | **Sign In, Sign Out & Sessions** | Valid credentials sign in, refresh preserves session, show/hide password toggle works, logout clears session. | Wrong password rejected; brute-force rate limit (`429`) triggers after repeated failures. | Browser Back button after logout cannot view cached `/dashboard` or `/admin`; 30-min idle timeout logs out inactive tab. |
| **TP-04** | **Route & Role Protection** | Logged-out user redirected from `/dashboard`, `/admin`, `/challenge/:slug` to `/login`. | Authenticated `STUDENT` opening `/admin` or calling `/api/admin/*` receives `403 Forbidden`. | Role demotion (`ADMIN -> STUDENT`) revokes session and forces re-login. |
| **TP-05** | **Student Dashboard** | Displays today's `17:00 IST` challenge, live countdown, current streak (with freeze/pause status), weekly points, weekly rank, solved counts, recent submissions, and activity heatmap. | Unauthenticated API fetch blocked. | Brand-new student with `0` solves sees clean empty state and `"Unranked — Solve 1 challenge"` banner. |
| **TP-06** | **Problem Workspace & Monaco C Editor** | Renders sanitized Markdown statement, samples, constraints, `gcc -O2 -std=c11` flags; `Run Code` executes custom stdin. | Empty source code or >64KB payload rejected by Zod schema (`400`). | Double-clicking `Submit` rapidly sends only 1 submission (button disabled + server rate-limit); 100KB custom stdin handled safely. |
| **TP-07** | **All 6 Judge Verdicts** | `ACCEPTED` awards base points (+ same-day bonus if solved during the challenge's own 24h day). | `COMPILE_ERROR` (syntax error) and `WRONG_ANSWER` return clear feedback without leaking hidden test inputs/outputs. | `TIME_LIMIT_EXCEEDED` (`while(1)`), `RUNTIME_ERROR` (`1/0` or segfault), and `MEMORY_LIMIT_EXCEEDED` caught within sandbox limits. |
| **TP-08** | **Weekly Scoring & Streaks** | First AC on an unlocked challenge in the current week adds difficulty points; solving on the challenge's own day adds same-day bonus. | Resubmitting AC on an already-solved challenge awards `0` extra points. | 1st missed day in a week consumes automatic **Streak Freeze** (`FREEZE_USED`, streak preserved); 2nd miss breaks streak (`0`); admin **Pause Days** neither break nor extend streak. |
| **TP-09** | **Submission History** | Shows student's own chronological submissions with verdict badge, runtime (`ms`), timestamp, and source code viewer modal. | Attempt to query another student's `submissionId` via API or Firestore rules fails (`403` / `PERMISSION_DENIED`). | Paginated history (`limit(10)`) keeps Firestore read cost $\le 10$ reads per view. |
| **TP-10** | **Weekly Leaderboard & Archive** | Shows current week's rankings only, tie-break rule banner (`weeklyPoints` DESC, `lastAcSubmittedAt` ASC), pinned student row with percentile (`top X%`), students beaten count, and previous-week delta. | All-time points leaderboard is absent from `/leaderboard` (all-time stats live on `/profile` only). | Past weeks archive (`/leaderboard` week selector) displays frozen historical weekly standings and weekly result summaries. |
| **TP-11** | **Google Drive Drafts & Fallback** | `DriveStorage` autosaves C code drafts, personal notes, and editor preferences to `drive.appdata`. | When Drive OAuth is declined, blocked by college IT, or offline, silent fallback saves drafts to Firestore/localStorage without breaking editor workflow. | Version conflict between local draft and newer remote draft prompts the student with a **Choose Version** modal. |
| **TP-12** | **Admin Dashboard & 2-Week Pilot Analytics** | Problem CRUD, **Validate Problem** gate (1 reference C solution passes all tests + 2 wrong C solutions fail), schedule daily challenges, user ban/unban/role, rejudge, audit log viewer, support reports, and 2-Week Pilot Analytics (`DAU`, `>= 4/7` cohort, `drop-off by day`, `most-failed problems`). | Non-admin user blocked; invalid problem failing validation gate cannot be set to `PUBLISHED`. | Rejudging a submission after a week is `FROZEN` creates an admin-approved `/weekly_corrections` record instead of mutating frozen results. |
| **TP-13** | **Privacy, Support, Export & Delete** | Student previews exact JSON payload before submitting **Send Debug Report**; **Export My Data** downloads JSON/ZIP portfolio; **Delete My Account** purges profile & anonymizes historical records. | Unconsented debug report cannot be submitted. | Deleted user's past leaderboard entries remain intact as `[Deleted Student]` without broken references. |

---

## 3. Part 2 — Cross-Session Synchronization Checks (`Student <-> Admin <-> DB`)

Using simultaneous browser sessions (Session 1: `Admin`, Session 2: `Student A`, Session 3: `Student B`), verify and record propagation latency (`ms`):

1. **Student Submission -> Admin Monitor & DB**: Student A submits C code -> verify verdict appears in Student A UI, Admin Live Submissions tab, and DB `submissions` collection.
2. **Admin Publish/Edit Problem -> Student Catalog**: Admin validates and publishes a problem -> verify it appears in Student A's catalog.
3. **Admin Schedule Challenge -> `17:00 IST` Unlock**: Admin schedules a challenge for a day -> verify it remains locked before `17:00 IST` and unlocks at `17:00 IST`.
4. **Admin Ban User -> Immediate Student Eviction**: Admin bans Student B -> verify Student B's active session is immediately rejected (`403 ACCOUNT_SUSPENDED`).
5. **Admin Rejudge -> Verdict & Audit Log**: Admin triggers rejudge -> verify append-only rejudge record and `/admin_audit_logs` entry.
6. **Role Change -> Forced Re-login**: Admin changes Student C's role -> verify token revocation forces re-authentication.
7. **Simultaneous Submissions -> Tie-Break & Concurrency**: Student A and Student B submit simultaneously -> verify isolated judge execution, accurate `submittedAt` tie-break ordering, and zero race-condition point duplication.

---

## 4. Part 3 — Simulated-Time Test Suite (`server/tests/weekly-system.test.ts`)

All time-boundary rules are tested deterministically via an injected clock (`SimulatedClock`) with zero real-time waiting:
- **`T-01`**: `16:59:59.200 IST` submission (judged at `17:01:10 IST`) counts for closing Week $W$; `17:00:00.000 IST` submission counts for Week $W+1$.
- **`T-02`**: Submission stuck in `PENDING` past the `17:10:00 IST` 10-minute grace window is flagged in `/system_alerts` and `/weekly_corrections` (`UNJUDGED_PAST_GRACE_PERIOD`), never silently dropped.
- **`T-03`**: `closeAndSummarizeWeek` at `17:05 IST` is idempotent on double execution, recovers cleanly from mid-run partial failure, and can be manually re-run by an admin.
- **`T-04`**: Streak continues on daily solve, uses 1 automatic freeze on 1st missed day (`FREEZE_USED`), resets to `0` on 2nd missed day in the same week (`STREAK_BROKEN`), ignores admin-declared exam pause days (`ADMIN_PAUSE_PROTECTED`), and resets weekly freeze allowance on Monday `17:00 IST`.
- **`T-05`**: Simple tie-break ranks equal-point students strictly by earlier `lastAcSubmittedAt` ASC (ignoring wrong attempt counts).
- **`T-06`**: Student joining mid-week, percentile (`top X%`), students beaten count, and previous-week comparison delta.
- **`T-07`**: Missing scheduled challenge at `17:00 IST` auto-selects an unused `PUBLISHED` problem and writes an `AUTO_FALLBACK_SCHEDULED` entry to `/admin_audit_logs`.
- **`T-08`**: Rejudge after week close writes a `/weekly_corrections` proposal without silently mutating the frozen weekly summary.

---

## 5. Part 4 — Data Integrity Verification Script (`/scripts/verify-integrity.ts`)

The automated CLI verification script (`/scripts/verify-integrity.ts`) audits the database and exits non-zero on any violation:
1. **Referential Integrity**: Every submission references a valid user and problem; every weekly summary references a valid week and user.
2. **Points Ledger Conservation**: Every student's `totalPoints` (and `weeklyPoints`) equals the exact sum of their first-accepted point awards (zero negative points, zero duplicate point awards for the same problem).
3. **Streak History Consistency**: Every student's `currentStreak` matches their chronological solve + `/streak_events` freeze + `/streak_pauses` history.
4. **Analytics Parity**: Admin `/api/admin/analytics` output matches direct database count queries (`totalUsers`, `totalProblems`, `totalSubmissions`, `acceptedSubmissions`, `DAU`, `>= 4/7` cohort).

---

## 6. External Dependencies Marked `BLOCKED` (With Exact Instructions for User)

Items that require external production credentials or institutional IT approval are honestly marked `BLOCKED` in [`/docs/STATUS.md`](./STATUS.md) and [`/docs/TEST_REPORT.md`](./TEST_REPORT.md):
1. **Real Google Drive OAuth on `@sanjivani.org.in` Accounts**:
   - *Why Blocked Locally*: Requires a Sanjivani Google Workspace student account and OAuth consent screen approval for `drive.appdata`.
   - *How User Can Test*: Sign in on `https://logicq-clanguage.web.app` with a `@sanjivani.org.in` account, click **Connect Google Drive** in the editor, and verify `.c` draft sync (or confirm automatic fallback if campus IT blocks third-party Drive scopes).
2. **Production SMTP Email Delivery**:
   - *Why Blocked Locally*: Uses `ConsoleMailService` by default (`ENABLE_WEEKLY_SUMMARY_EMAIL=false`).
   - *How User Can Test*: Provide `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in Secret Manager / `.env` and trigger a password reset or opt-in weekly summary email.
3. **Production Cloud Run / Judge0 Remote Sandbox**:
   - *Why Blocked Locally*: Local environment uses native GCC / local Docker sandbox.
   - *How User Can Test*: Deploy `/server/docker` to Google Cloud Run (`asia-south1`) per [`/docs/DEPLOYMENT.md`](./DEPLOYMENT.md) and set `JUDGE_URL` + `JUDGE_SHARED_SECRET`.
