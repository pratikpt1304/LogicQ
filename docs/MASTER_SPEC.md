# LogicQ Master Specification — Single Source of Truth (`/docs/MASTER_SPEC.md`)

> **AUTHORITATIVE DIRECTIVE**: This document is the Single Source of Truth for **LogicQ** ("Think in logic. Code in C."). Where any earlier prompt or design decision conflicts with this specification, this document wins.

---

## 1. Conflict Resolution Log (How Earlier Decisions Were Reconciled)

| # | Topic / Area | Earlier Decision | Authoritative Resolution (This Spec Wins) |
| :-: | :--- | :--- | :--- |
| **1** | **Target Audience & Signup** | Generic multi-college / open signup | **Sanjivani College only** (~300 total students, ~50 concurrent). Server-side college email domain check (`@sanjivani.org.in` / `@sanjivanicoe.org.in`), `email_verified` required, plus optional CSV allowlist of `(rollNumber, email)`. Never ask for or scrape college UMS passwords. |
| **2** | **Visual Theme & Tokens** | Light/white default or generic cyan `#05070D` dark theme | **`logicq.html` Dark Theme Reference**: Background `#0C0F1F`, Panel `#141932`, Line `#252C4F`, Text `#E8EAF6`, Muted `#9AA1C4`, Accent `#8B9BFF`, Success `#46D9A0`, Error `#FF7A8A`. Fonts: `Bricolage Grotesque`, `Inter`, `JetBrains Mono`. Brand SVGs in `/client/public/brand` + `<Logo />`. Matching WCAG AA Light Theme token set supported with pre-paint theme application. |
| **3** | **Daily Unlock Time** | `00:00 IST` midnight | **`17:00 IST` (`Asia/Kolkata`)** every day using the server clock only. Each challenge day runs `17:00 IST` to next `17:00 IST`. |
| **4** | **Week Close vs. Unlock** | Simultaneous close & result compute at `17:00 IST` | Submissions close at **`16:59:59.999 IST` Monday** (evaluated by server `submittedAt`, not `judgedAt`). Next challenge unlocks at **`17:00:00 IST`**. Weekly result job runs at **`17:05 IST`** with a 10-minute grace wait (`17:10 IST`) for in-flight judge calls; unjudged items are flagged for admin review, never dropped. |
| **5** | **Leaderboard & Tie-Break** | Global all-time XP leaderboard + wrong-attempt penalty tie-break | **Weekly Leaderboard only** on `/leaderboard` (all-time stats live on `/profile` only). Rank by **`weeklyPoints` DESC**, then **earlier `lastAcSubmittedAt` ASC** (wrong-attempt penalty removed). Pinned user row shows **percentile (`top X%`)**, **students beaten count**, and **previous-week comparison**. Includes a **"Past weeks" selector** on `/leaderboard` and `/dashboard` for viewing past weeks' final rankings and weekly result summaries. |
| **6** | **Streak Rules** | Any miss resets streak to `0` immediately | **1 automatic streak freeze per week** (1st missed day records `FREEZE_USED` in `/streak_events` and preserves streak; 2nd miss in same week breaks it). Admins can declare **pause days** (`/streak_pauses`, e.g., exams) where streaks neither break nor extend. |
| **7** | **Problem Validation Gate** | Simple reference-solution pass check | Admin **Validate Problem** step requires: **1 reference C solution passes all tests**, AND **2 author-provided wrong C solutions fail**. Lifecycle: `Draft -> Validated -> Published -> Retired`. |
| **8** | **Navigation & Feature Removals (`Home`, `Daily Challenge`, `Leaderboard`)** | Arena (`/arena`), Archive (`/archive`), and Badges (`/badges`, `/achievements`) in navbar | **Arena, Archive, and Badges are removed** (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`). Signed-in navbar shows strictly: **Home** (`/dashboard`, house icon, first item), **Daily Challenge** (`/challenge`), **Leaderboard** (`/leaderboard`) with `aria-current="page"` on the active item. Logo links to `/dashboard` when signed in and `/` when signed out. Direct visits to `/archive`, `/arena`, `/arena/:id`, `/badges`, `/badges/*`, or `/achievements` render the 404 page; backend endpoints return `404 Not Found` for all roles; Firestore rules deny all client reads/writes to those collections. |
| **9** | **Security Claims & Status** | Claiming "100% secure" or marking untested items done | Never claim the app is "fully secure"; document layered controls, residual risks, and manual GCP steps honestly. Never mark anything done in `/docs/STATUS.md` unless run and tested (`WORKING` / `PARTIAL` / `BLOCKED`). |
| **10** | **Signup & Student Identity Fields (Amendment: Monthly PRN Self-Service Change)** | Username / Full Name signup with optional college & graduation year; previously immutable PRN | **PRN-based Academic Profile & 30-Day PRN Change Rule**: Form order: (1) **PRN** (`^[0-9]{12}$`, 12 digits, live `X/12` counter, unique via `prnIndex/{prn}` transaction), (2) **College** (`["Sanjivani University"]` - strictly locked), (3) **Department** (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`), (4) **Year** (`["FY", "SY", "TY"]`), (5) **Division** (optional, `^[A-Za-z0-9]{0,3}$`, uppercase), (6) **College email, password, confirm password** (or post-Google-login **"Complete your profile"** gate).<br/>**Self-Service PRN Change**: Students may change their PRN at most once in any rolling 30 days (`PRN_CHANGE_COOLDOWN_DAYS = 30`). Account signup does not count as a change (`prnChangedAt` is initially null), enabling an immediate correction if typo'd. Next change is gated 30 days after `prnChangedAt`. Points, streaks, submissions, weekly ranks, and uploads stay bound to account UID, never PRN. Released PRNs are reserved for previous holder for 30 days (`PRN_RELEASE_RESERVATION_DAYS = 30`) to prevent squatting. Banned accounts' PRNs are permanently blocked. Full `prn` is private (masked as `••••••5678` on own views; never exposed to peers). Admin can audit-reveal, override PRN, or reset cooldown. |
| **11** | **Editor Bottom Tabs & Uploaded Solutions (`Upload Files` replaces `Test Cases`)** | Bottom tabs were `Test Cases`, `Custom Stdin`, `Verdict & Output` | **`Test Cases` tab is removed** from the bottom bar (sample input/output examples remain in the left problem statement panel; hidden tests never leave the server). Bottom tabs are strictly: **Custom Stdin**, **Verdict & Output**, **Upload Files**. Students can upload up to **3 files** (`JPG`, `PNG`, `WebP`, `PDF`, max **5 MB** each, magic-byte verified, EXIF stripped, max **5 uploads/day**) with an optional approach note ($\le 1000$ chars). Uploaded solutions are stored as `PENDING_REVIEW` (never auto-judged; blocked if student already has an `ACCEPTED` code submission for the problem) and award points/streak/weekly rank only when approved by an admin via an append-only review record. |
| **12** | **Mobile PWA & Standalone Polish** | Desktop-first web app without manifest or service worker | **Installable Mobile PWA**: `/manifest.webmanifest` (`name: "LogicQ"`, `lang: "en-IN"`, `start_url: "/dashboard"`, `display: "standalone"`, `#0C0F1F` dark / `#F4F6FB` light `theme-color`, crisp `192x192`, `512x512`, `512x512` maskable, and `180x180` apple-touch-icon from `/client/public/brand/logo-mark.svg`, shortcuts strictly `Daily Challenge` & `Leaderboard`). Service worker precaches only static shell assets (`prompt` update banner; network-only for all Auth/Firestore/API/Judge/Drive requests; clears caches on logout). Standalone polish includes `100dvh`, `viewport-fit=cover` safe-area insets, $\ge 44\times 44\text{px}$ tap targets, and a mobile C symbol helper bar (`Tab`, `{`, `}`, `;`, `*`, `&`, `#`, `<`, `>`). |
| **13** | **Real C Judge, Local Monaco & Zero Console Errors** | Client `fallbackEngine.ts` simulated C runs when `/api` was unreachable; `socket.io` and CDN Monaco caused console/CSP errors | **Real Judge Only & Clean Production Console**: Client mock fallback is strictly disabled in production builds and server judge fails closed if no real C compiler/sandbox is available. Socket.IO is removed (replaced by clean polling/listeners that pause when tab is hidden), and Monaco Editor is bundled locally via Vite with zero `cdn.jsdelivr.net` or `localhost:5000` CSP violations. |
| **14** | **Book-Only Content Source Governance** | AI-authored / multi-source C problem bank | **Single Designated Book Syllabus (`/docs/CONTENT_PIPELINE.md` & `/docs/CONTENT_RIGHTS.md`)**: Daily challenges come exclusively from the designated syllabus book (original-wording problem statements with new numbers/context unless explicit publisher permission is on file; admin-only `(book, chapter, exercise)` source reference never shown to students; `Season complete` state if unused approved pool runs out). Import execution awaits user approval of `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md`. |
| **15** | **Single Visible Question Rule (Strict 24h Window — Overrides Catch-Up & 7-Day Strip)** | 7-day current-week strip on `/challenge`, intra-week catch-up solving (`70%` points), and same-day solve bonus | **Exactly ONE Question Visible at a Time**: At **`17:00:00 IST`** (`Asia/Kolkata`) every day (server clock only), the new challenge becomes the **only** visible question for students and the previous challenge disappears immediately. There is **no** 7-day "this week's challenges" strip, **no** weekly catch-up solving, **no** same-day bonus, and **no** `70%` late catch-up rule (points are strictly by difficulty). Requesting an ended challenge shows a calm **"This challenge has ended"** page with no statement, samples, or tests; open pages crossing `17:00 IST` show **"A new challenge is live. Refresh to see it."** and switch the old editor to `readOnly`. Students have **no direct Firestore read access** to `/problems` (`allow read: if isAdmin();`). |
| **16** | **Simplified Admin & Checker Roles (Authoritative Consolidation)** | Multi-tier roles (`Owner`, `Content admin`, `Reviewer`, `Viewer`, Faculty, Moderator) | **Strict 3-Role System (`/docs/ADMIN_DESIGN.md`)**: Exactly 3 roles: **`admin`** (full access to every admin page, API, scheduling, submissions, students, weekly, reports, support, system, audit log, settings, checkers), **`checker`** (access exclusively to `/checker/reviews` for blind review of assigned uploads; zero access to other admin pages, code submissions, hidden tests, reference solutions, or student identities), and **`student`** (unchanged). Roles are stored as server-set custom claims; only an admin can change them via an audited action with re-authentication. An admin cannot remove their own admin role; system enforces at least 2 admins (warning on Overview if only 1). |

---

## 2. Project Constraints & Institutional Context

- **Audience**: Sanjivani University students and faculty (~300 total users, ~50 concurrent users).
- **Navigation & Feature Scope (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`)**:
  - Signed-in primary navigation items (desktop and mobile, in exact order): **Home** (`/dashboard`, house icon), **Daily Challenge** (`/challenge`), **Leaderboard** (`/leaderboard`).
  - Logo in the navbar links to `/dashboard` when signed in and `/` (landing page) when signed out. Active nav item sets `aria-current="page"`.
  - Removed features: **Arena** (`/arena`, `/arena/:id`), **Archive** (`/archive`), **Badges** (`/badges`, `/achievements`), and the **7-day challenge strip / weekly catch-up** are disabled across UI routes, navigation, dashboard, profile, weekly summary, leaderboard, landing copy, manifest shortcuts, admin screens, API endpoints, and Firestore rules. Existing database records are preserved safely without deletion.
- **Identity & Signup**:
  - **Form Fields (in strict order)**:
    1. **PRN (required)**: Replaces old `username`/`name` everywhere. Exactly 12 digits (`^[0-9]{12}$`), spaces trimmed, live `"8/12"` character counter, plain-language error (`"PRN must be exactly 12 digits."`). Enforced unique via `prnIndex/{prn}` transaction (one PRN per account).
    2. **College (required)**: Config-driven dropdown (`["Sanjivani University"]`).
    3. **Department (required)**: Config-driven dropdown (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`).
    4. **Year (required)**: Config-driven dropdown (`["FY", "SY", "TY"]`).
    5. **Division (optional)**: Up to 3 alphanumeric characters (`^[A-Za-z0-9]{0,3}$`), stored uppercase (e.g., `A`, `B`, `C1`).
    6. **College Email, Password, Confirm Password**: Server-verified college domain + optional admin CSV allowlist check of `(prn, email)`. For Google Sign-In or migrated incomplete accounts, a required **"Complete your profile"** step runs right after sign-in and blocks dashboard access until completed.
  - **Self-Service PRN Change Rules (Rolling 30 Days)**:
    - **Cooldown**: A student can change their own PRN at most once every rolling 30 days (`PRN_CHANGE_COOLDOWN_DAYS = 30`). Signup / initial profile completion does not count as a change (`prnChangedAt` is null); the student can fix a typo once right away. Subsequent changes are locked until 30 days after `prnChangedAt`. The profile settings modal shows the date when the next change becomes available.
    - **Validation & Uniqueness**: New PRN must be exactly 12 digits (`^[0-9]{12}$`), unique in `prnIndex`, and match verified email if allowlist CSV is active.
    - **Anti-Squatting & Anti-Abuse**: When a PRN is changed, the old PRN is marked in `prnIndex` as `RELEASED` with a reservation for the prior holder for 30 days (`PRN_RELEASE_RESERVATION_DAYS = 30`). Other students cannot claim it in this window. PRNs of banned accounts are permanently blocked. Generic error messages for PRN-already-taken prevent user enumeration. Rate limits enforce max 5 change attempts per hour.
    - **Account State Invariant**: Points, streaks, submissions, weekly ranks, uploads, and bans belong to the account UID, never PRN; changing PRN never resets, moves, or merges any account state.
    - **Audit & History**: Append-only `prnHistory` subcollection/table per student logs `oldPrn`, `newPrn`, `changedAt`, `source` (`STUDENT` or `ADMIN`), and request telemetry. Admins can view PRN change logs, reset cooldowns with re-auth, and override PRNs. College remains strictly locked to `"Sanjivani University"`.
- **Budget & Plan**: Firebase **Blaze Plan** with Cloud Billing budget alerts ($0–$5/month expected for 300–500 students including Firebase Storage for uploaded solutions, with hard alerts at 50%, 80%, 100%). Two independent `Owner` accounts required on the Firebase project.
- **Problem Authoring & Syllabus Book Pipeline**: Governed by [`/docs/CONTENT_PIPELINE.md`](./CONTENT_PIPELINE.md) and [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md). Every problem requires human admin review and the automated **1-pass reference C solution + 2-fail wrong C solutions** validation gate (`Draft -> Validated -> Published -> Retired`).
- **Signature Differentiator**: The **Weekly Competition** (`Monday 17:00 IST` to `Monday 16:59:59 IST`) where each of the 7 daily challenges is solvable strictly inside its own 24-hour `[17:00 IST, next 17:00 IST)` window, with a personalized, immutable **Weekly Result Report** for every participating student.

---

## 3. Technology Stack, PWA & Visual Design System (`logicq.html`)

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, Framer Motion, locally bundled Monaco Editor (`c` language mode, zero CDN dependencies), TanStack Query, `react-hook-form` + `Zod`, `DOMPurify`, PWA (`/manifest.webmanifest` + Workbox service worker in `prompt` update mode; problem content is strictly `NetworkOnly` and never cached in Cache Storage, `localStorage`, or `IndexedDB`).
- **Visual Design Tokens**:
  - Dark Theme: `bg`: `#0C0F1F` | `panel`: `#141932` | `line`: `#252C4F` | `text`: `#E8EAF6` | `muted`: `#9AA1C4` | `accent`: `#8B9BFF` | `success`: `#46D9A0` | `error`: `#FF7A8A`.
  - Light Theme: `bg`: `#F4F6FB` | `panel`: `#FFFFFF` | `line`: `#CBD2E6` | `text`: `#0C0F1F` | `muted`: `#434C6E` | `accent`: `#3643D0` | `success`: `#096B48` | `error`: `#B81B35`.
  - Typography: `Bricolage Grotesque` (headings/display), `Inter` (UI body), `JetBrains Mono` (code/metrics/timers).
  - Brand assets stored as SVGs in `/client/public/brand/` and rendered via `<Logo />`, with crisp generated PNG icons (`192x192`, `512x512`, `512x512` maskable, `180x180` apple-touch-icon).
- **Central Backend**: Firebase Authentication, Cloud Firestore, Firebase Storage (for uploaded solutions via authenticated/signed flows), Cloud Functions (2nd Gen / Express API), Firebase Hosting, Firebase App Check, Google Cloud Secret Manager, Cloud Scheduler.
- **Sandboxed C Judge**: Separate isolated Linux container on Google Cloud Run (`gcc -O2 -std=c11 -Wall`, non-root, `--network none`, `--read-only`, CPU/memory/PID/output caps) or Judge0 configured via Secret Manager, plus `LocalGccJudge` for local C11 compilation. Fails closed if no safe judge is configured in production.

---

## 4. Dual-Tier Data Architecture, Uploaded Solutions & Privacy

- **Tier A — Authoritative Central Firestore / Server DB & Storage**:
  - Collections: `users`, `prnIndex`, `publicProfiles`, `problems` (+ `hidden_tests` and admin-only `sourceRef`), `weeks` (+ `days`, `leaderboard`), `submissions`, `uploaded_solutions` (+ append-only `upload_reviews`), `weekly_summaries`, `weekly_corrections`, `streak_events`, `streak_pauses`, `integrity_flags`, `admin_audit_logs`, `support_reports`, `error_reports`, `system_alerts`.
  - **Uploaded Solutions (`Upload Files` Tab)**:
    - Config-driven limits: `JPG`, `PNG`, `WebP`, `PDF` only; max `3` files per submission; max `5 MB` per file; max `5` upload submissions per student per day.
    - Validated on the server by magic bytes, sanitized/stripped of EXIF metadata (and active PDF scripts rejected), stored under randomized filenames, and served only via authenticated `nosniff` endpoints.
    - Must be submitted before the active challenge's `17:00:00 IST` end cutoff (`submittedAt` server timestamp). Stored as `PENDING_REVIEW` (never auto-judged). One pending upload per problem at a time; disallowed if the student already has an `ACCEPTED` code submission for that problem. Only an admin approval (with step-up re-authentication and audit log entry) awards configured problem points and records credit for the challenge's day and week using original `submittedAt` (or creates a `WeeklyCorrection` record if that week is already frozen).
  - **Append-Only Ledger**: `submissions`, `uploaded_solutions`, `upload_reviews`, `verdicts`, `points`, `streak_events`, `weekly_summaries`, and `admin_audit_logs` are strictly append-only.
- **Tier B — Student Personal Google Drive (`DriveStorage`) & Local Offline Drafts**:
  - Stores non-authoritative `.c` code drafts, notes, editor settings, and self-service data exports, with automatic local draft persistence when offline (never storing problem statements).

---

## 5. Single Visible Question (`17:00 IST`) & Simplified Weekly System

1. **Single Visible Question (`17:00:00 IST` Daily Switch)**:
   - At `17:00:00 IST` every day (server clock only), the new challenge becomes the only visible question for students and the previous challenge disappears immediately.
   - Students can see and solve **ONLY** the current active challenge (`GET /api/problems/daily` / `getCurrentChallenge`, cached only until the next `17:00:00 IST`).
   - Old challenge URLs/IDs return `410 Gone` (`CHALLENGE_ENDED`) with zero problem statement, samples, or tests and display a calm **"This challenge has ended"** page with a link back to `/challenge`.
   - When an open challenge page crosses `17:00:00 IST`, a banner (**"A new challenge is live. Refresh to see it."**) appears, the ended challenge's editor becomes `readOnly`, and Run/Submit/Upload for the ended challenge are blocked while keeping the student's code in view and in local drafts.
   - Submission history (`HistoryPage`) and weekly summaries (`DashboardPage`, `LeaderboardPage`) show date, challenge title (hideable via config `HIDE_ENDED_PROBLEM_TITLES`, default `false`), verdict, runtime, points, and the student's own code — never the old problem statement, samples, or any way to re-run or resubmit.
2. **Strict Cutoff (`submittedAt < next 17:00:00 IST`)**:
   - Code Run/Submit and File Uploads are accepted only when `problemId` matches the current active challenge and server `submittedAt` is inside its `[17:00:00 IST, next 17:00:00 IST)` window.
   - Any submission received at or before `16:59:59.999 IST` is judged normally and attributed to that challenge day/week even if the judge finishes after `17:00:00 IST`.
   - Same-day bonus and `70%` late catch-up points are removed; points are determined strictly by problem difficulty.
3. **Weekly Window & Close Job (`Monday 17:00 IST` to `Monday 17:00 IST`, Close Job at `17:05 IST`)**:
   - Each week contains 7 daily challenges, each solvable only inside its own 24-hour window. Students joining mid-week start with the current challenge.
   - Weekly score = sum of points from accepted submissions in those 24-hour windows, ranked by `weeklyPoints` DESC, then earlier `lastAcSubmittedAt` ASC.
4. **Leaderboard & Past Weeks Selector (`/leaderboard` & `/dashboard`)**:
   - Displays weekly rank, percentile, beaten count, previous-week comparison, Department/Year filters, and the **Past Weeks** selector (`Current Week`, `Last Week`, `2 Weeks Ago`, `3 Weeks Ago`) showing per-day results (`date`, `title`, `verdict`, `points`) without problem statements.
5. **Streak Freeze (`1/Week`) & Admin Pause Days**:
   - Solving each day's challenge inside its 24-hour window extends the streak. One automatic streak freeze per week preserves the streak on the first missed day (`FREEZE_USED`). Admin-declared pause days (exams/holidays) protect streaks and are excluded from the week's maximum.

---

## 6. Layered Security & Problem Quality Gates

- **Firestore & Storage Rules**: Deny by default (`allow read, write: if false;`). Clients can never read or write `contests`, `archive`, `badges`, `user_badges`, `prnIndex`, `hidden_tests`, unreleased problems, or admin-only `sourceRef` metadata. Students can only access their own uploaded files; nobody can overwrite or delete submitted files except via account deletion.
- **Institutional & DPDP Privacy Controls**: `@sanjivani.org.in` verification, 30-min idle session timeout, mandatory Admin step-up re-authentication before destructive/PRN-update/upload-approval actions, strict CSP (`worker-src 'self' blob:`, `manifest-src 'self'`, no `localhost` or CDN script/connect sources in production), `/.well-known/security.txt`, and DPDP-aligned privacy controls ("Privacy Notice", "Export my data" including uploaded solutions, and "Delete my account & data" freeing `prnIndex` and deleting uploaded files).
- **Problem Validation Gate**: Reference C solution passes all tests and 2 wrong C solutions fail before any problem can transition from `Draft` to `Validated`/`Published`.

---

## 7. Unified Admin Dashboard & Simplified Checker Role Architecture

1. **Information Architecture & Route Structure (`/admin/*` and `/checker/*`)**:
   - The Admin Portal (`/admin/*`) is accessible strictly to users with custom claim `role === 'admin'` and consists of 11 operational pages:
     1. **Overview (Today)** (`/admin`): Today's challenge overview, submission rate, judge queue length, pending upload reviews count & oldest age, weekly job status, student active counts, pending queue age, and system alerts panel (including warning if only 1 admin exists).
     2. **Challenges** (`/admin/challenges`): Book-only problem bank management (`Draft`, `Validated`, `Published`, `Retired`), chapter order, Markdown preview, test case editor, 1-pass/2-fail validation runner, 30-day interactive scheduling calendar (drag/reorder, 7-day lock, gap warnings, low-pool alert), and content pipeline import review.
     3. **Submissions** (`/admin/submissions`): Live filterable log (date, challenge, verdict, department, year, division, PRN), code inspector, per-test case execution breakdown, hidden test view (admin-only), rejudge action with reason & re-auth, and similarity notes.
     4. **Upload Reviews** (`/admin/uploads`): Complete administrator view of all uploads and decisions, override capability (reason required), reassignment controls, audit marking, and student re-check request resolutions.
     5. **Checkers Management** (`/admin/checkers`): Add/remove checkers (by email, with re-auth), activate/pause checkers, monitor workload, average review time, decision count, and toggle auto round-robin assignment or manual allocation.
     6. **Students** (`/admin/students`): Server-paginated directory (PRN, name, email, department, year, division), masked PRN display (`••••••1234`) with audited reveal, student deep-dive (academic profile, submission & upload ledger, weekly rank, streak history, active sessions), allowlist CSV upload, and sensitive actions (ban/unban, PRN correction, profile reset, session revocation, account deletion). Zero access to student Google Drive data.
     7. **Weekly** (`/admin/weekly`): Live week rankings, per-day participation breakdown, scheduled result job status & run log, idempotent manual re-run & result publish controls, freeze status, correction record management, streak pause day calendar, and optional top-3 second-checker gate.
     8. **Reports** (`/admin/reports`): 14-day pilot analytics, daily active trends, 4-of-7 solver rates, drop-off curves, most-failed challenges, attempt distribution, 16:00–17:00 IST submission spike heatmap, demographic breakdowns (department, year, division), and audited CSV exports.
     9. **Support** (`/admin/support`): Student debug logs, problem reports, ticket triage workflow (`New`, `In Progress`, `Resolved`), internal administrator notes, and deep links to student/submission records.
     10. **System** (`/admin/system`): Judge daemon status & queue latency, scheduled Cloud Function run log, client error reporter telemetry, Firestore & Storage usage vs. Blaze quota, estimated monthly GCP costs vs. budget, backup/restore test verification dates, deployed commit hash, and live feature flags.
     11. **Audit Log** (`/admin/audit-log`): Append-only immutable ledger of every administrative and checker action (logins, role changes, bans, PRN unmasks, file reviews, rejudges, exports, setting updates) with before/after diffs and CSV export. Entries cannot be modified or deleted by any user or administrator.
     12. **Settings** (`/admin/settings`): Difficulty point values, upload daily quotas & approval points, rubric weights (default: logic 50%, flowchart/explanation 30%, clarity 20%), 48h assignment deadline, streak freeze/pause rules, idle session timeouts, academic configuration lists, student broadcast banner, and administrator management.
   - The Checker Portal (`/checker/reviews`): Accessible strictly to users with custom claim `role === 'checker'`.
     - "My reviews" page only: assigned queue, oldest first, image pan/zoom and sandboxed/rasterized PDF viewer, today's challenge statement, configured rubric, admin note, and student note.
     - **Blind review**: Zero student profile metadata (no name, PRN, email, department, year, division); identified purely by submission ID.
     - **Decision model**: Approve (with marks per rubric item $\rightarrow$ auto-calculated formula points), Reject, or Request Changes (each with mandatory comment).
     - **Edit window**: A checker can edit their own decision only within 30 minutes and before admin finalization; all versions are preserved.
     - **Conflict rule**: Checkers who also hold a student account are strictly barred from reviewing their own uploads or barred items (enforced in assignment logic and Firestore rules).
2. **Roles and Permissions Matrix (Strict 3 Roles)**:
   - **`admin`**: Full access to all admin pages, APIs, settings, and checkers management. Minimum 2 admins required; warning on Overview if only 1 exists. An admin cannot delete or remove their own admin role.
   - **`checker`**: Access exclusively to `/checker/reviews` for assigned uploads. Zero access to other admin pages, code submissions, hidden tests, reference solutions (unless explicitly toggled on per challenge by admin), settings, or student identities.
   - **`student`**: Student portal only. Zero access to `/admin/*` or `/checker/*`.
3. **Session Security & Privacy Boundaries**:
   - Mandatory MFA for admin and checker accounts. Idle timeout: 30 minutes for admin, 8 hours for checker.
   - Uploaded files shown via short-lived signed URLs with no bulk downloading for checkers.
   - Step-up re-authentication required for sensitive actions (banning, role changes, PRN updates, rejudging, adding/removing checkers).
   - Zero access to student Google Drive data across all roles.

