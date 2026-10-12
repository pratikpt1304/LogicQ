# LogicQ Dashboard Statistics & Content Audit Report (`/docs/DASHBOARD_AUDIT.md`)

> **STATUS**: `AUDITED & ROOT-CAUSED`  
> **Environment**: LogicQ Local & Staging Simulation  
> **Date**: October 12, 2026  
> **Author**: Antigravity Engineering

---

## 1. Executive Summary

A comprehensive forensic audit of the LogicQ deployed application uncovered five critical UI/logic defects in dashboard metrics and content delivery:

1. **Unranked Defaulting to Rank #1 & 100th Percentile**:
   - Students with 0 weekly points / 0 lifetime points were presented with `#1` global and weekly ranks and `100%` percentile.
2. **Accuracy Rate 100% on Zero Submissions**:
   - Zero evaluated submissions resulted in a divide-by-zero fallback evaluating to `100% accepted`.
3. **Synthetic "+0 PTS" vs Previous Week**:
   - Students with no previous-week history displayed `+0 PTS` instead of an empty state indicating no prior week records exist.
4. **Source Metadata Leak in Featured Challenge**:
   - Problem statements in the student-facing dashboard included parenthetical source citations citing Yashavant Kanetkar, book title, and chapter.
5. **Question Pool Size Leak**:
   - The solved problems card displayed `0 / 16`, revealing the internal problem pool inventory to students.

---

## 2. Root Cause Analysis (Formulas & Placeholder Defaults)

### Symptom 1: "Weekly points 0 PTS" but "Weekly rank #1" and "Percentile 100%"
- **Locations**:
  - `client/src/pages/DashboardPage.tsx`: Line 105 (`#{stats?.rank || 1}`) and Line 235 (`#{activeWeeklySummary?.rank || stats?.rank || 1}`).
  - `server/src/controllers/user.controller.ts`: Lines 926–929 (`percentile = !rank || totalUsers <= 1 ? 100 : ...`).
  - `server/src/controllers/leaderboard.controller.ts`: Lines 142–145 (`total <= 1 ? 100 : ...`).
- **Mechanism**:
  - In `DashboardPage.tsx`, when `stats?.rank` was `null` (because `user.totalPoints === 0`), logical OR fallback `|| 1` triggered, displaying `#1` to unranked students.
  - In `user.controller.ts` and `leaderboard.controller.ts`, the percentile fallback formula explicitly returned `100` when `!rank` or when `totalUsers <= 1`.
- **Remediation**:
  - Ranks for students with `0` points must be strictly `null`.
  - When `rank === null`, UI displays `"Not ranked yet"` and `"Solve today's challenge to enter the board"`.
  - Global rank header displays `"NOT RANKED YET"` with `"Solve today's challenge to enter the board"`.
  - Percentile must require at least `MIN_RANKED_FOR_PERCENTILE = 10` ranked students. If `totalRanked < 10` or student is unranked, return `null`. UI displays `"Needs 10 ranked students"` or `"—"`.
  - Server calculation: For a student with rank $R$ out of $N$ ranked students ($N \ge 10$):
    $$\text{Top } X\% = \left\lceil \frac{R}{N} \times 100 \right\rceil$$

---

### Symptom 2: "Accuracy rate 100% accepted" while "0 total submissions evaluated"
- **Locations**:
  - `server/src/controllers/user.controller.ts`: Lines 894–897 (`totalSubmissionsCount > 0 ? Math.round(...) : 0;`).
  - `client/src/pages/DashboardPage.tsx`: Line 353 (`{stats?.accuracy ?? 100}% accepted`).
- **Mechanism**:
  - The server returned `accuracy: 0` when `totalSubmissionsCount === 0`.
  - However, in `DashboardPage.tsx`, the nullish coalescing or falsy fallback was coded as `{stats?.accuracy ?? 100}%`. When `accuracy` was `0` or `null`, it fell back to `100%`, rendering `100% accepted` on `0 total submissions`.
- **Remediation**:
  - Server returns `accuracy: null` when `totalSubmissions === 0`.
  - Client displays `"—"` and `"No submissions yet"` when `accuracy === null` or `totalSubmissions === 0`.
  - Audit all ratios and percentages for zero denominators:
    - Pass rate: `totalAttempts === 0 ? null : (passed / totalAttempts)`
    - Drop-off rate: `previousDayActive === 0 ? 0 : ...`

---

### Symptom 3: "Vs previous week +0 PTS" when no previous week exists
- **Locations**:
  - `server/src/controllers/user.controller.ts`: Lines 962–971 and Line 1014 (`previousWeekDelta: weeklyPoints - prevPoints`).
  - `client/src/pages/DashboardPage.tsx`: Lines 253–256.
- **Mechanism**:
  - Synthetic past-week points calculations generated synthetic point deltas for offsets `-1, -2, -3` even when the student had never participated in previous weeks. For new students with `0` points, `0 - 0 = 0`, rendered as `+0 PTS`.
- **Remediation**:
  - Check whether the student has any historical submissions or points in the prior week window.
  - If no historical data exists for the previous week, return `previousWeekDelta: null`.
  - Client displays `"—"` and `"No previous week yet"`.

---

### Symptom 4: Featured challenge description source book leak
- **Locations**:
  - `server/prisma/dev.db`: Problem records in SQLite contained appended citations: `(Yashavant Kanetkar, *Test Your C Skills*, Chapter X: ...)`.
  - `client/src/api/fallbackEngine.ts`: `DEFAULT_PROBLEMS` contained the same citations in descriptions.
  - `client/src/pages/DashboardPage.tsx`: Line 145 regex stripper stripped Markdown headers but preserved text inside parentheses.
- **Mechanism**:
  - Seed scripts appended book citations directly into problem Markdown statements rather than isolating them strictly in admin-only metadata (`sourceRefJson`).
- **Remediation**:
  - Problem statements are original algorithmic rewordings with formal I/O specifications; strip all parenthetical book/author/chapter/exercise citations from student-visible descriptions across database and fallback fixtures.
  - Retain book origin exclusively in `sourceRefJson` which is restricted to admin APIs.
  - Admin problem authoring guard: Reject any problem description/title containing `"Kanetkar"` or `"Test Your C Skills"` (case-insensitive). Warn on `"Chapter"`, `"Exercise"`, `"Page"`.

---

### Symptom 5: "Problems solved 0 / 16" leaks question pool size
- **Locations**:
  - `server/src/controllers/user.controller.ts`: Line 871 (`totalProblems = await prisma.problem.count(...)`) and Line 1052 (`totalProblems`).
  - `client/src/pages/DashboardPage.tsx`: Lines 336–340 (`{stats?.totalSolved || 0} / {stats?.totalProblems || 16}`).
- **Mechanism**:
  - The server computed `totalProblems` using an unconstrained `prisma.problem.count({ where: { status: 'PUBLISHED' } })` and exposed it in the student dashboard payload.
  - The client displayed `/ 16`, revealing the entire question backlog and violating the "Single Visible Question" rule.
- **Remediation**:
  - Remove `totalProblems` from the student payload or replace with current weekly quota (`thisWeekTotal: 7`).
  - Update UI to show:
    - `"Problems solved: X"`
    - Subtitle: `"This week: Y of 7"` (or `"Distinct challenges solved in C"`).
  - Never expose total question pool size or future scheduled challenges to student clients.

---

## 3. Implementation Plan & Verifications

1. **Database & Fallback Data Sanitization**:
   - Execute regex removal of `(Yashavant Kanetkar, ...)` and similar citations from `dev.db` and `client/src/api/fallbackEngine.ts`.
2. **Server Controllers (`user.controller.ts`, `leaderboard.controller.ts`, `admin.controller.ts`)**:
   - Enforce `MIN_RANKED_FOR_PERCENTILE = 10`.
   - Return `rank: null`, `percentile: null`, `studentsBeaten: 0` for 0-point students.
   - Return `accuracy: null` when `totalSubmissions === 0`.
   - Return `previousWeekDelta: null` when student has no previous week activity.
   - Remove pool size exposure.
   - Admin guard blocking author/book citations and warning on chapter/exercise.
3. **Client UI Updates (`DashboardPage.tsx`, `LeaderboardPage.tsx`, `AdminDashboardPage.tsx`)**:
   - Handle empty states gracefully with clear, helpful microcopy.
4. **Automated Test Suite**:
   - Add comprehensive tests in `server/tests/dashboard-metrics.test.ts` to verify all five symptoms cannot regress.
