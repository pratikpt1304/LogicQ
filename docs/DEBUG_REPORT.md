# LogicQ — Full Debugging Sweep Report (`/docs/DEBUG_REPORT.md`)

> **Scope & Safety Declaration**:  
> - All debugging, reproduction, and regression testing were performed strictly against the local development / test environment (`localhost:5000`, SQLite test DB, and Firestore security rules unit evaluator) using synthetic test accounts. Zero production student data or campus infrastructure was touched.  
> - Every bug logged in [`/docs/BUGS.md`](./BUGS.md) was reproduced, root-caused by tracing data end-to-end (UI $\rightarrow$ API/Function $\rightarrow$ Prisma/Firestore $\rightarrow$ C11 Judge), fixed with the smallest safe diff, and verified with an automated regression test before marking `FIXED`.

---

## 1. What Was Checked Across All 13 Mode B Sweep Areas

| Sweep # | Sweep Category | What Was Inspected & Executed | Outcome |
| :---: | :--- | :--- | :--- |
| **1** | **Build & Static Checks** | Ran `tsc && vite build` (`client`) and Vitest (`server`); audited imports, env vars (`server/src/config/env.ts`, `client/src/config/firebase.ts`), and lockfiles. | ✅ Clean production build (`0` TS/build errors); `10/10` test suites passing. |
| **2** | **Browser Runtime & Lifecycle** | Audited React hooks, socket listeners (`ChallengePage.tsx`), idle timer listeners (`AuthContext.tsx`), route guards (`App.tsx`), and session state on login/logout/ban/role-change. | 🔧 Fixed `BUG-02` (live ban/role check), `BUG-10` (editor reset on window focus + timer cleanup), and `BUG-12` (`/challenge` route guard + 30-min idle logout). |
| **3** | **Forms & Editor** | Checked Zod schemas (`auth`, `user`, `submission`, `admin`, `contest`), `Run Code` vs `Submit Solution`, `64KB` code/stdin limits, HTML stripping, and tab switching. | 🔧 Fixed `BUG-09` (`updateProfileSchema` + `64KB` caps) and `BUG-10` (preserved unsaved code on tab switch). |
| **4** | **Cloud Functions / API Endpoints** | Audited all 28 endpoints for missing `await`s, status codes, authorization checks, and evaluation ordering in `submission-evaluator.ts`. | 🔧 Fixed `BUG-01` (403 on cross-student submission read) and `BUG-04` (persisted `ACCEPTED` verdict before badge & contest evaluation). |
| **5** | **Firestore & Database Queries** | Ran `firestore-security-rules.test.ts` (8 adversarial rule tests); audited Prisma queries in `user.controller.ts`, `leaderboard.controller.ts`, and `admin.controller.ts`. | 🔧 Fixed `BUG-06` (`getUserProfile` `take: 10` truncation & rank filter) and `BUG-07` (soft-retire problems with submissions). |
| **6** | **Time & Date Logic (`17:00 IST`)** | Verified `16:59:59 IST` vs `17:00:00 IST` boundary (`ist.ts`), daily challenge unlock, future-scheduled problem guard, and streak continuation/reset (`scoring.test.ts`). | 🔧 Fixed `BUG-08` (future-scheduled problem guard) and `BUG-11` (`17:00 IST` rollover countdown & daily bonus). |
| **7** | **Concurrency & Idempotency** | Tested 5-second submission cooldown (`429`), repeated solves (`0` duplicate points), and admin rejudge idempotency (`rejudgeSubmission` + `evaluateSubmission`). | 🔧 Fixed `BUG-03` (`calculatePointsAndAward` & `updateContestScore` made 100% idempotent across rejudges). |
| **8** | **Judge & Verdicts** | Tested `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `MEMORY_LIMIT_EXCEEDED`, per-line trailing whitespace, and 6 malicious C payloads. | 🔧 Fixed `BUG-05` (per-line `.trimEnd()` normalization and explicit `MEMORY_LIMIT_EXCEEDED` branch in `submission-evaluator.ts`). |
| **9** | **Data Integrity & Cross-View Parity** | Executed [`/scripts/verify-integrity.ts`](../scripts/verify-integrity.ts) (`7/7` checks passing) and compared Dashboard, Profile, and Leaderboard outputs for the same student. | 🔧 Fixed `BUG-06` (Dashboard, Profile, and Leaderboard now report identical `rank`, `totalUsers`, and distinct `totalSolved`). |
| **10** | **Admin & Student Sync** | Tested problem creation/retirement, daily scheduling, user ban, role change, and submission rejudge between Admin and Student views. | 🔧 Fixed `BUG-02` (immediate token rejection on ban/role change), `BUG-03` (rejudge point safety), and `BUG-07` (soft-retire). |
| **11** | **UI & Accessibility** | Verified mobile (`360px`), tablet (`768px`), and desktop (`1280px`) responsive tabs, `NotFoundPage` (`*`), dark/light theme classes, and `/.well-known/security.txt`. | ✅ Verified responsive split-pane / mobile tab layout in `ChallengePage.tsx` and route protection in `App.tsx`. |
| **12** | **Performance** | Bounded pagination (`limit <= 50` student, `limit <= 100` admin), `256kb` JSON body limit, and disabled unnecessary `refetchOnWindowFocus` in `ChallengePage.tsx`. | ✅ Verified bounded queries and fast local build/test execution. |
| **13** | **Drive & LocalStorage Fallback** | Tested draft persistence when Google Drive is not connected or offline (`logicq_draft_<slug>` in `localStorage`) and reset behavior. | 🔧 Fixed `BUG-10` (automatic `localStorage` draft save/restore and clear on reset). |

---

## 2. Summary of Diffs Applied During This Debugging Sweep

1. **[`server/src/services/scoring.service.ts`](../server/src/services/scoring.service.ts)** (`BUG-03`):
   - Added optional `submissionId?: string` parameter to `calculatePointsAndAward`. If the submission being evaluated already has `pointsAwarded > 0` (e.g., during an admin rejudge), preserves its existing `pointsAwarded` without incrementing `User.totalPoints` again; also checks `OR: [{ verdict: 'ACCEPTED' }, { pointsAwarded: { gt: 0 } }]` across other submissions.
2. **[`server/src/services/submission-evaluator.ts`](../server/src/services/submission-evaluator.ts)** (`BUG-03`, `BUG-04`, `BUG-05`):
   - Updated `normalizeOutput` to trim trailing spaces on each line (`.split('\n').map(l => l.trimEnd()).join('\n').trim()`).
   - Added explicit `Verdict.MEMORY_LIMIT_EXCEEDED` branch so MLE verdicts do not fall through to `WRONG_ANSWER`.
   - Moved `prisma.submission.update` (`verdict: overallVerdict`) **before** `evaluateAndAwardBadges` and `updateContestScore` so first-solve badges (`first-blood`) and contest scores (`ContestParticipant.score`) unlock immediately on the 1st accepted solve.
   - Rewrote `updateContestScore` to idempotently sum points across distinct solved contest problems.
3. **[`server/src/controllers/user.controller.ts`](../server/src/controllers/user.controller.ts) & [`server/src/controllers/leaderboard.controller.ts`](../server/src/controllers/leaderboard.controller.ts)** (`BUG-06`):
   - Excluded `ADMIN` accounts (`role: { not: 'ADMIN' }`) and applied identical tie-breaking (`totalPoints DESC`, `currentStreak DESC`, `createdAt ASC`) in `getDashboardStats`, `getUserProfile`, and `getLeaderboard`.
   - Removed the premature `take: 10` limit in `getUserProfile`'s Prisma query so `totalSolved` and `difficultyBreakdown` count all distinct solved problems (slicing `recentSolves` to 10 in memory).
   - Updated `getLeaderboard` to compute `solvedCount` as the count of distinct solved `problemId`s (`new Set(...)`) rather than raw `ACCEPTED` submission rows, and aligned `type=daily` with `getChallengeDayBoundsUTC(getChallengeDayIST())`.
4. **[`client/src/pages/ChallengePage.tsx`](../client/src/pages/ChallengePage.tsx)** (`BUG-10`):
   - Added `initializedProblemIdRef` and `refetchOnWindowFocus: false` so switching browser tabs never overwrites unsaved student code.
   - Added automatic `localStorage` draft persistence (`logicq_draft_${problem.slug}`) on editor change and draft cleanup on reset.
   - Added an 800ms HTTP polling fallback (`GET /api/submissions/:id`) with unmount cleanup so verdicts always render even if WebSocket events are delayed.
5. **[`server/scripts/verify-integrity.ts`](../server/scripts/verify-integrity.ts) & [`scripts/verify-integrity.ts`](../scripts/verify-integrity.ts)**:
   - Added Streak Invariant check (`0 <= currentStreak <= longestStreak`) and Admin Analytics vs. Direct Database Counts Parity check (`7/7` checks passing).

---

## 3. What Remains `BLOCKED` on External Services (Manual Steps for User)

- **Real `@sanjivani.org.in` Google Drive OAuth Sync**: Requires configuring a Google Cloud OAuth 2.0 Client ID authorized for `drive.file` / `drive.appdata` in GCP Console (the `localStorage` fallback `logicq_draft_<slug>` is verified and active).
- **Production SMTP Email Delivery**: Local environment uses `ConsoleMailService`; production requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in Secret Manager.
- **Firebase App Check, Admin MFA & Blaze Budget Alerts**: Require one-time activation in Firebase / GCP Console (`logicq-clanguage`).
