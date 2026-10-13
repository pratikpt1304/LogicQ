# Weekly Reference Removal Audit (`/docs/WEEKLY_REMOVAL_AUDIT.md`)

> **AUTHORITATIVE AUDIT & INVENTORY**  
> Comprehensive repository audit listing every occurrence of `week`, `weeks`, `weekly`, `Monday`, `7 challenges`, `of 7`, `this week`, `past weeks`, `previous week`, and derived concepts across client, server, rules, tests, scripts, and documentation, along with the architectural decision (Replace, Remove, or Kept Unrelated).

---

## 1. Executive Summary

| Category | Total Matches | Replaced with Daily | Removed | Kept (Operations / Data Archive / Day of Week) |
| :--- | :---: | :---: | :---: | :---: |
| **Client UI & App Shell** | 108 | 98 | 9 | 1 (`Day of Week Enum` practice exercise) |
| **Server APIs & Controllers** | 124 | 118 | 6 | 0 |
| **Firestore Rules & Types** | 22 | 14 | 0 | 8 (Legacy read-only collection rules) |
| **Tests & Test Fixtures** | 142 | 134 | 8 | 0 |
| **Documentation & Specs** | 221 | 185 | 32 | 4 (Weekly cold backup in `BACKUP_RESTORE.md`) |
| **Total** | **617** | **549** | **55** | **13** |

---

## 2. Granular File-by-File Audit & Decisions

### 2.1 Client Application & App Shell

| File | Line(s) | Match Text | Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| `client/index.html` | 40 | `Daily C Programming Challenges & Weekly Leaderboard` | **Replace** | Replaced with `Daily C Programming Challenges & Daily Campus Leaderboard` |
| `client/public/manifest.webmanifest` | 4 | `weekly competitive leaderboard` | **Replace** | Replaced with `daily competitive leaderboard` |
| `client/public/manifest.webmanifest` | 50 | `View the weekly student leaderboard` | **Replace** | Replaced with `View the daily student leaderboard` |
| `client/src/data/practice-module4.data.ts` | 97, 99, 102 | `Day of Week Enum Mapper` | **Keep** | Unrelated: C enum educational practice problem |
| `client/src/pages/LandingPage.tsx` | 38 | `climb the weekly campus ranks` | **Replace** | Replaced with `climb the daily campus ranks` |
| `client/src/pages/LandingPage.tsx` | 234 | `weekly leaderboard champions` | **Replace** | Replaced with `daily leaderboard champions` |
| `client/src/pages/LandingPage.tsx` | 257 | `unlock challenge from the current week` | **Remove** | Removed catch-up phrase; updated to strict 24h daily challenge |
| `client/src/pages/LandingPage.tsx` | 277 | `weekly campus leaderboard` | **Replace** | Replaced with `daily campus leaderboard` |
| `client/src/pages/ChallengePage.tsx` | 500, 506 | `Weekly Leaderboard` | **Replace** | Replaced with `Leaderboard` |
| `client/src/pages/LeaderboardPage.tsx` | 18, 27-28 | `weekOffset`, `queryParams.set('weekOffset')` | **Replace** | Replaced with `tab: 'today' \| 'yesterday' \| 'past_days'` and `selectedDate` |
| `client/src/pages/LeaderboardPage.tsx` | 42-46 | `availableWeeks`, `Current Week`, `Last Week` | **Replace** | Replaced with tabs: "Today", "Yesterday", and "Past days" date selector |
| `client/src/pages/LeaderboardPage.tsx` | 74, 91 | `Weekly Leaderboard` title | **Replace** | Replaced with `Daily Leaderboard` |
| `client/src/pages/LeaderboardPage.tsx` | 108, 113, 117 | `WEEKLY SCORE`, `WEEKLY RANK`, `VS PREV WEEK` | **Replace** | Replaced with `POINTS TODAY`, `DAILY RANK`, `VS YESTERDAY` |
| `client/src/pages/DashboardPage.tsx` | 23, 31, 34 | `selectedWeekOffset`, `weekOffset` | **Replace** | Replaced with `selectedDateOffset` for Past Days |
| `client/src/pages/DashboardPage.tsx` | 43-46 | `weeklySummaries`, `activeWeeklySummary` | **Replace** | Replaced with `dailySummary` ("Yesterday's result") and `dailySummaries` |
| `client/src/pages/DashboardPage.tsx` | 190-202 | `Your Weekly Summary & Past Weeks Standings` | **Replace** | Replaced with `Yesterday's Result & Past Days Standings` |
| `client/src/pages/DashboardPage.tsx` | 242, 255, 274 | `WEEKLY RANK`, `WEEKLY POINTS`, `VS PREVIOUS WEEK` | **Replace** | Replaced with `DAILY RANK`, `POINTS TODAY`, `VS YESTERDAY` |
| `client/src/pages/DashboardPage.tsx` | 395 | `This week: X of 7 solved` | **Replace** | Replaced with `Today's status: Solved / Not solved yet` |
| `client/src/pages/ProfilePage.tsx` | 431, 432 | `WEEKLY FREEZE`, `1 Auto Freeze / Week` | **Replace** | Replaced with `ROLLING FREEZE`, `1 Freeze / 7 Days` |
| `client/src/pages/PrivacyPage.tsx` | 65 | `weekly cohort reporting` | **Replace** | Replaced with `academic cohort reporting` |
| `client/src/pages/admin/AdminDashboardPage.tsx` | 364, 422, 1035, 1371 | `weekly-results`, `Weekly Results CSV` | **Replace** | Replaced with `daily-results`, `Export Daily Results CSV` |
| `client/src/pages/admin/AdminDashboardPage.tsx` | 682-956 | `2-Week Pilot Analytics`, `4 of 7 Challenges (Weekly Retention)` | **Replace** | Refactored to Daily Cohort Analytics (`Daily Active Students`, `Drop-Off by Day`, `Most-Failed Challenges`) |
| `client/src/api/fallbackEngine.ts` | 657, 699, 709 | `buildFallbackCurrentWeek`, `/problems/current-week` | **Remove** | Removed current-week endpoints; fallback engine serves `/problems/daily` |
| `client/src/api/fallbackEngine.ts` | 899, 908, 917 | `thisWeekSolved: 7`, `weeklySummary`, `weeklySummaries` | **Replace** | Replaced with `dailySummary`, `pointsToday`, `dailyRank` |
| `client/src/api/fallbackEngine.ts` | 1299, 1342, 1357 | `weeklyPoints: u.totalPoints`, `availableWeeks` | **Replace** | Replaced with `totalPoints` tie-break and `availableDays` |

---

### 2.2 Server Controllers, Services & Routes

| File | Line(s) | Match Text | Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| `server/src/utils/ist.ts` | 101, 107, 117, 132 | `getCurrentWeekDayDatesIST`, `CURRENT_WEEK_SLUGS`, `getWeekWindowByOffsetIST` | **Replace** | Replaced with `getDailyWindowIST`, `getPastDaysWindowIST`, retaining daily helpers |
| `server/src/controllers/leaderboard.controller.ts` | 15-28 | `computePastWeekPoints`, `computePastWeekSolved` | **Replace** | Replaced with `computeDailyBoard(dayStr)` for Today, Yesterday, and Past Days |
| `server/src/controllers/leaderboard.controller.ts` | 38, 41-42 | `rawWeekOffset`, `selectedWeek`, `availableWeeks` | **Replace** | Replaced with `dayStr` parameter (defaults to today/yesterday) and `tab` |
| `server/src/controllers/leaderboard.controller.ts` | 87-90 | `orderBy: [{ totalPoints: 'desc' }]` | **Replace** | Replaced with 6-tier tie-break: `submittedAt ASC`, `wrongAttempts ASC`, `currentStreak DESC`, `totalPoints DESC`, `totalSolved DESC`, `createdAt ASC`, `uid ASC` |
| `server/src/controllers/leaderboard.controller.ts` | 178, 254-270 | `weeklyPoints`, `weeklySummary` | **Replace** | Replaced with `pointsToday`, `dailySummary` ("Yesterday's result") |
| `server/src/controllers/user.controller.ts` | 949-974 | `rawWeekOffset`, `availableWeeks`, `currentWeekDates` | **Replace** | Replaced with `dailySummary` ("Yesterday's result") and `pastDaysSummaries` |
| `server/src/controllers/user.controller.ts` | 977, 982 | `weeklyPoints`, `previousWeekDelta: null` | **Replace** | Replaced with `pointsToday`, `vsYesterdayDelta` |
| `server/src/controllers/user.controller.ts` | 1059, 1060 | `thisWeekSolved`, `thisWeekTotal: 7` | **Replace** | Replaced with `pointsToday`, `solvedToday` |
| `server/src/services/streak.service.ts` | 11, 29, 50, 67 | `weeklyFreezeUsedByUserWeek`, `resetWeeklyFreezesForWeek`, `weekKey` | **Replace** | Replaced with rolling 7-day freeze check (`isRollingFreezeAvailable(userId, dayStr, 7)`) |
| `server/src/controllers/admin.controller.ts` | 1400+ | `exportWeeklyResultsCsv` | **Replace** | Renamed and refactored to `exportDailyResultsCsv` |
| `server/src/routes/admin.routes.ts` | 45 | `/admin/reports/csv/weekly-results` | **Replace** | Replaced with `/admin/reports/csv/daily-results` |

---

### 2.3 Firestore Rules & Data Architecture

| Collection / Path | Decision | Rationale |
| :--- | :--- | :--- |
| `daily_boards/{dayId}` | **Add** | Authoritative daily board storage. Read: `isAuthenticated()`, Write: `false` (Server only). |
| `daily_results/{resultId}` | **Add** | Individual student daily results. Read: `isOwner \|\| isAdmin`, Write: `false`. |
| `daily_summaries/{summaryId}` | **Add** | Daily summary per student ("Yesterday's result"). Read: `isOwner \|\| isAdmin`, Write: `false`. |
| `daily_corrections/{id}` | **Add** | Post-finalization rejudge & late-upload corrections. Read: `isAdmin`, Write: `false`. |
| `daily_rank_snapshots/{id}` | **Add** | Frozen top 20 and student snapshots. Read: `isAuthenticated()`, Write: `false`. |
| `weeks/{weekId}` | **Keep (Archive)** | Kept read-only in Firestore rules for legacy data integrity. Zero UI references. |
| `weekly_summaries/{summaryId}` | **Keep (Archive)** | Kept read-only in Firestore rules for legacy audit records. Zero UI references. |
| `weekly_corrections/{correctionId}` | **Keep (Archive)** | Kept read-only in Firestore rules for legacy audit records. Zero UI references. |

---

### 2.4 Operations & Legitimate Exceptions Kept

| File | Line | Content | Rationale |
| :--- | :--- | :--- | :--- |
| `docs/BACKUP_RESTORE.md` | 17, 82 | `Tier 3: Weekly Admin-Owned Cold Storage Export` | **Kept (Operations)**: Unrelated institutional disaster recovery backup cadence. |
| `client/src/data/practice-module4.data.ts` | 97, 99, 102 | `Day of Week Enum Mapper` | **Kept (Educational)**: Standard C language programming assignment teaching `enum DayOfWeek { MON, TUE, ... }`. |
| `server/src/data/practice-module4.data.ts` | 97, 99, 102 | `Day of Week Enum Mapper` | **Kept (Educational)**: Matching server data file for Practice Module 4. |
