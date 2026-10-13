# LogicQ Master Specification — Single Source of Truth (`/docs/MASTER_SPEC.md`)

> **AUTHORITATIVE DIRECTIVE**: This document is the Single Source of Truth for **LogicQ** ("Think in logic. Code in C."). Where any earlier prompt or design decision conflicts with this specification, this document wins.

---

## 1. Conflict Resolution Log (How Earlier Decisions Were Reconciled)

| # | Topic / Area | Earlier Decision | Authoritative Resolution (This Spec Wins) |
| :-: | :--- | :--- | :--- |
| **1** | **Target Audience & Signup** | Generic multi-college / open signup | **Sanjivani College only** (~300 total students, ~50 concurrent). Server-side college email domain check (`@sanjivani.org.in` / `@sanjivanicoe.org.in`), `email_verified` required, plus optional CSV allowlist of `(rollNumber, email)`. Never ask for or scrape college UMS passwords. |
| **2** | **Visual Theme & Tokens** | Light/white default or generic cyan `#05070D` dark theme | **`logicq.html` Dark Theme Reference**: Background `#0C0F1F`, Panel `#141932`, Line `#252C4F`, Text `#E8EAF6`, Muted `#9AA1C4`, Accent `#8B9BFF`, Success `#46D9A0`, Error `#FF7A8A`. Fonts: `Bricolage Grotesque`, `Inter`, `JetBrains Mono`. Brand SVGs in `/client/public/brand` + `<Logo />`. Matching WCAG AA Light Theme token set supported with pre-paint theme application. |
| **3** | **Daily Unlock Time** | `00:00 IST` midnight | **`17:00 IST` (`Asia/Kolkata`)** every day using the server clock only. Each challenge day runs `17:00 IST` to next `17:00 IST`. |
| **4** | **Daily Finalization vs. Unlock** | Simultaneous close & result compute at `17:00 IST` | Submissions close at **`16:59:59.999 IST` daily** (evaluated by server `submittedAt`, not `judgedAt`). Next challenge unlocks at **`17:00:00 IST`**. Daily finalization job runs at **`17:05 IST`** with a 10-minute grace wait (`17:10 IST`) for in-flight judge calls; unjudged items are flagged for admin review, never dropped. Finalizes yesterday's board, writes per-student daily result summaries, and freezes the day (idempotent, chunked, resumable, re-runnable by admin). |
| **5** | **Leaderboard, Daily Rank & Clean Data Architecture** | Global all-time XP leaderboard or weekly points leaderboard | **Leaderboard Tabs & Daily Rank Architecture**: Leaderboard features 3 tabs: **"Today"** (Daily Rank, default view for current 17:00–17:00 IST challenge day), **"Yesterday"** (frozen final board from yesterday's challenge), and **"Past days"** date selector (frozen daily archives, default 90 days).<br/>• **Daily Rank Tie-Break Order**: (1) earlier server-side accepted `submittedAt` ASC, (2) fewer wrong attempts before accepted ASC, (3) higher current streak DESC, (4) higher total points DESC (replaces "points this week"), (5) higher total solved count DESC, (6) stable tie-break (`createdAt` ASC, then `uid` ASC). Only students who solved today's challenge before cutoff are ranked. Students with no accepted solution today show "Not solved yet" and are not ranked. Percentile and `#R of N solvers` show only when $N \ge 10$ (config `MIN_RANKED_STUDENTS_FOR_PERCENTILE = 10`), else `"—"`. "Yesterday's final" frozen snapshot published at 17:05 IST finalization.<br/>• **Department & Year Display**: Column displays standardized `"AIML • FY"` format across leaderboard, dashboard, profile, and admin exports (never college name).<br/>• **Fake Data & Production Guards**: Seed scripts strictly refuse to run against production (`NODE_ENV === 'production'` guard); seeded test accounts marked with `isTest: true`; Leaderboard queries strictly filter `role === 'STUDENT'` and exclude `isTest === true`; build-time test fails if mock leaderboard data is bundled in production. |
| **6** | **Streak Rules** | Any miss resets streak to `0` immediately; or 1 freeze per week | **1 automatic streak freeze per rolling 7 days** (1st missed day records `FREEZE_USED` in `/streak_events` and preserves streak if no freeze was consumed in the preceding 7 days; 2nd miss inside rolling 7 days breaks it). Admins can declare **pause days** (`/streak_pauses`, e.g., exams) where streaks neither break nor extend. |
| **7** | **Problem Validation Gate** | Simple reference-solution pass check | Admin **Validate Problem** step requires: **1 reference C solution passes all tests**, AND **2 author-provided wrong C solutions fail**. Lifecycle: `Draft -> Validated -> Published -> Retired`. |
| **8** | **Navigation & Feature Removals (`Home`, `Daily Challenge`, `Leaderboard`)** | Arena (`/arena`), Archive (`/archive`), and Badges (`/badges`, `/achievements`) in navbar | **Arena, Archive, and Badges are removed** (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`). Signed-in navbar shows strictly: **Home** (`/dashboard`, house icon, first item), **Daily Challenge** (`/challenge`), **Practice** (`/practice`), **Leaderboard** (`/leaderboard`) with `aria-current="page"` on the active item. Logo links to `/dashboard` when signed in and `/` when signed out. Direct visits to `/archive`, `/arena`, `/arena/:id`, `/badges`, `/badges/*`, or `/achievements` render the 404 page; backend endpoints return `404 Not Found` for all roles; Firestore rules deny all client reads/writes to those collections. |
| **9** | **Security Claims & Status** | Claiming "100% secure" or marking untested items done | Never claim the app is "fully secure"; document layered controls, residual risks, and manual GCP steps honestly. Never mark anything done in `/docs/STATUS.md` unless run and tested (`WORKING` / `PARTIAL` / `BLOCKED`). |
| **10** | **Signup & Student Identity Fields (Amendment: 12-Character Alphanumeric PRN & Monthly Change)** | Username / Full Name signup; previously 12 digits | **PRN-based Academic Profile & 30-Day PRN Change Rule**: Form order: (1) **PRN** (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`, exactly 12 characters: 4 digits, 3 letters, M or F, 4 digits; canonical uppercase trimmed; configurable `allowedProgramCodes`; live `X/12` counter, unique via `prnIndex/{prn}` transaction), (2) **College** (`["Sanjivani University"]` - strictly locked), (3) **Department** (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`), (4) **Year** (`["FY", "SY", "TY"]`), (5) **Division** (optional, `^[A-Za-z0-9]{0,3}$`, uppercase), (6) **College email, password, confirm password** (or post-Google-login **"Complete your profile"** gate).<br/>**Self-Service PRN Change**: Students may change their PRN at most once in any rolling 30 days (`PRN_CHANGE_COOLDOWN_DAYS = 30`). Account signup does not count as a change (`prnChangedAt` is initially null), enabling an immediate correction if typo'd. Next change is gated 30 days after `prnChangedAt`. Points, streaks, submissions, daily ranks, and uploads stay bound to account UID, never PRN. Released PRNs are reserved for previous holder for 30 days (`PRN_RELEASE_RESERVATION_DAYS = 30`) to prevent squatting. Banned accounts' PRNs are permanently blocked. Full `prn` is private (masked as `••••••••1039` on own views showing only last 4 digits; never exposed to peers; no gender field is ever derived or stored from the M/F char). Admin can audit-reveal, override PRN, or reset cooldown. |
| **11** | **Editor Bottom Tabs & Uploaded Solutions (`Upload Files` replaces `Test Cases`)** | Bottom tabs were `Test Cases`, `Custom Stdin`, `Verdict & Output` | **`Test Cases` tab is removed** from the bottom bar (sample input/output examples remain in the left problem statement panel; hidden tests never leave the server). Bottom tabs are strictly: **Custom Stdin**, **Verdict & Output**, **Upload Files**. Students can upload up to **3 files** (`JPG`, `PNG`, `WebP`, `PDF`, max **5 MB** each, magic-byte verified, EXIF stripped, max **5 uploads/day**) with an optional approach note ($\le 1000$ chars). Uploaded solutions are stored as `PENDING_REVIEW` (never auto-judged; blocked if student already has an `ACCEPTED` code submission for the problem) and award points/streak/daily rank only when approved by an admin via an append-only review record. |
| **12** | **Mobile PWA & Standalone Polish** | Desktop-first web app without manifest or service worker | **Installable Mobile PWA**: `/manifest.webmanifest` (`name: "LogicQ"`, `lang: "en-IN"`, `start_url: "/dashboard"`, `display: "standalone"`, `#0C0F1F` dark / `#F4F6FB` light `theme-color`, crisp `192x192`, `512x512`, `512x512` maskable, and `180x180` apple-touch-icon from `/client/public/brand/logo-mark.svg`, shortcuts strictly `Daily Challenge` & `Leaderboard`). Service worker precaches only static shell assets (`prompt` update banner; network-only for all Auth/Firestore/API/Judge/Drive requests; clears caches on logout). Standalone polish includes `100dvh`, `viewport-fit=cover` safe-area insets, $\ge 44\times 44\text{px}$ tap targets, and a mobile C symbol helper bar (`Tab`, `{`, `}`, `;`, `*`, `&`, `#`, `<`, `>`). |
| **13** | **Real C Judge, Local Monaco & Zero Console Errors** | Client `fallbackEngine.ts` simulated C runs when `/api` was unreachable; `socket.io` and CDN Monaco caused console/CSP errors | **Real Judge Only & Clean Production Console**: Client mock fallback is strictly disabled in production builds and server judge fails closed if no real C compiler/sandbox is available. Socket.IO is removed (replaced by clean polling/listeners that pause when tab is hidden), and Monaco Editor is bundled locally via Vite with zero `cdn.jsdelivr.net` or `localhost:5000` CSP violations. |
| **14** | **Book-Only Content Source Governance** | AI-authored / multi-source C problem bank | **Single Designated Book Syllabus (`/docs/CONTENT_PIPELINE.md` & `/docs/CONTENT_RIGHTS.md`)**: Daily challenges come exclusively from the designated syllabus book (original-wording problem statements with new numbers/context unless explicit publisher permission is on file; admin-only `(book, chapter, exercise)` source reference never shown to students; `Season complete` state if unused approved pool runs out). Import execution awaits user approval of `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md`. |
| **15** | **Single Visible Question Rule (Strict 24h Window — Overrides Catch-Up & 7-Day Strip)** | 7-day current-week strip on `/challenge`, intra-week catch-up solving (`70%` points), and same-day solve bonus | **Exactly ONE Question Visible at a Time**: At **`17:00:00 IST`** (`Asia/Kolkata`) every day (server clock only), the new challenge becomes the **only** visible question for students and the previous challenge disappears immediately. There is **no** 7-day "this week's challenges" strip, **no** weekly catch-up solving, **no** same-day bonus, and **no** `70%` late catch-up rule (points are strictly by difficulty). Requesting an ended challenge shows a calm **"This challenge has ended"** page with no statement, samples, or tests; open pages crossing `17:00 IST` show **"A new challenge is live. Refresh to see it."** and switch the old editor to `readOnly`. Students have **no direct Firestore read access** to `/problems` (`allow read: if isAdmin();`). |
| **16** | **Simplified Admin & Checker Roles (Authoritative Consolidation)** | Multi-tier roles (`Owner`, `Content admin`, `Reviewer`, `Viewer`, Faculty, Moderator) | **Strict 3-Role System (`/docs/ADMIN_DESIGN.md`)**: Exactly 3 roles: **`admin`** (full access to every admin page, API, scheduling, submissions, students, daily results, reports, support, system, audit log, settings, checkers), **`checker`** (access exclusively to `/checker/reviews` for blind review of assigned uploads; zero access to other admin pages, code submissions, hidden tests, reference solutions, or student identities), and **`student`** (unchanged). Roles are stored as server-set custom claims; only an admin can change them via an audited action with re-authentication. An admin cannot remove their own admin role; system enforces at least 2 admins (warning on Overview if only 1). |
| **17** | **Practice Module System (Amendment to Single Visible Question Rule)** | Single visible question applied universally across entire site | **Dedicated "Practice" Tab with 4 Unlocking Modules**: Primary navbar becomes: **Home**, **Daily Challenge**, **Practice**, **Leaderboard**. Single visible question rule remains strictly enforced for Daily Challenge (17:00 IST switch, book pool, daily rankings, streaks). In Practice, students have access to 4 sequential syllabus modules (Control Structures, Pointers & Functions, Arrays & Applications, Advanced Data Types & Dynamic Memory), each containing 10 config-driven problems (4 Easy, 4 Medium, 2 Hard). Module 1 is unlocked by default; Module $N+1$ unlocks strictly when student solves $\ge 7$ questions in Module $N$. Practice submissions are code-only (`type = 'PRACTICE'`), have zero impact on daily points, daily rank, percentile, or daily streaks, run through the sandboxed C11 judge at lower queue priority, and server rules strictly block access to questions of locked modules. |
| **18** | **PRN Format Specification (Amendment to 12-Digit Rule)** | Exactly 12 digits (`^[0-9]{12}$`) | **12-Character Alphanumeric PRN (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`)**: Overrides earlier digits-only rule. Structure: 4 digits, 3 program letters, 1 M/F letter, 4 digits. Canonical uppercase normalization; configurable `allowedProgramCodes: string[]` (empty = any 3 letters accepted); zero attribute/gender derivation; privacy-preserved 8-bullet masking (`••••••••1039`); fake test fixtures only (`2199TESM0001`). |
| **19** | **Book-Only Daily Pool & Daily System Pause Architecture** | AI-generated / multi-source pool with continuously running 17:00 IST cycle | **Exclusive Book Source & Safe System Pause (`/docs/CONTENT_PIPELINE.md` & `/docs/CONTENT_RIGHTS.md`)**:<br/>• **Exclusive Source**: *"Test Your C Skills"* by Yashavant Kanetkar (`/private/book/`, strictly local and git-ignored). All legacy daily problems are retired (`status = 'RETIRED'`). Zero external AI-invented problems.<br/>• **Strict Transformative Authoring**: Zero verbatim copying of questions, code, or examples. Original wording, fresh variables, names, data, and context. Zero student-facing mentions of the book, author, chapter, exercise, or page.<br/>• **Daily System Pause Flag (`dailyChallengePaused`)**: Set to `true` while the new pool is being prepared. While paused: students see no question, no countdown, and no "Next Reset" timer; Daily Challenge, dashboard card, and 17:00 banner show calm message: *"Daily challenges are not live yet. We will announce the start."*; Leaderboard Today/Yesterday tabs show neutral paused state; no ranks, no daily points, no streak changes (paused days do not break streak, do not consume freezes, and are excluded from stats); schedulers (17:00 unlock, 17:05 finalization, auto-pick) are no-ops; `getCurrentChallenge`, Run, and Submit reject daily challenge calls with a generic "not available" response; Practice, profile, uploads, and admin remain fully operational.<br/>• **Audited Manual Resume**: Resuming is strictly a manual admin action requiring re-auth, reason, 7-day preview, and $\ge 14$ validated scheduled challenges. Admin overview displays a prominent pause banner with pause timestamp and resume control. |

---

## 2. Project Constraints & Institutional Context

- **Audience**: Sanjivani University students and faculty (~300 total users, ~50 concurrent users).
- **Navigation & Feature Scope (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`)**:
  - Signed-in primary navigation items (desktop and mobile, in exact order): **Home** (`/dashboard`, house icon), **Daily Challenge** (`/challenge`), **Practice** (`/practice`), **Leaderboard** (`/leaderboard`).
  - Logo in the navbar links to `/dashboard` when signed in and `/` (landing page) when signed out. Active nav item sets `aria-current="page"`.
  - Removed features: **Arena** (`/arena`, `/arena/:id`), **Archive** (`/archive`), **Badges** (`/badges`, `/achievements`), and the **7-day challenge strip / weekly catch-up** are disabled across UI routes, navigation, dashboard, profile, weekly summary, leaderboard, landing copy, manifest shortcuts, admin screens, API endpoints, and Firestore rules. Existing database records are preserved safely without deletion.
- **Identity & Signup**:
  - **Form Fields (in strict order)**:
    1. **PRN (required)**: Exactly 12 characters: 4 digits, 3 letters, M or F, 4 digits (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`). Normalized to uppercase, spaces trimmed, live `"8/12"` character counter, clear error message: `"Enter your 12-character PRN: 4 digits, 3 letters, M or F, then 4 digits."`. Configurable `allowedProgramCodes: string[]` (default: empty list `[]`, accepting any 3 letters; if populated, only listed program codes accepted). Enforced unique via `prnIndex/{prn}` transaction (canonical uppercase document ID). No attribute or gender is ever derived from the PRN.
    2. **College (required)**: Config-driven dropdown (`["Sanjivani University"]`).
    3. **Department (required)**: Config-driven dropdown (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`).
    4. **Year (required)**: Config-driven dropdown (`["FY", "SY", "TY"]`).
    5. **Division (optional)**: Up to 3 alphanumeric characters (`^[A-Za-z0-9]{0,3}$`), stored uppercase (e.g., `A`, `B`, `C1`).
    6. **College Email, Password, Confirm Password**: Server-verified college domain + optional admin CSV allowlist check of `(prn, email)`. For Google Sign-In or migrated incomplete accounts, a required **"Complete your profile"** step runs right after sign-in and blocks dashboard access until completed.
  - **Self-Service PRN Change Rules (Rolling 30 Days)**:
    - **Cooldown**: A student can change their own PRN at most once every rolling 30 days (`PRN_CHANGE_COOLDOWN_DAYS = 30`). Signup / initial profile completion does not count as a change (`prnChangedAt` is null); the student can fix a typo once right away. Subsequent changes are locked until 30 days after `prnChangedAt`. The profile settings modal shows the date when the next change becomes available.
    - **Validation & Uniqueness**: New PRN must be exactly 12 characters matching `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`, validated against `allowedProgramCodes`, unique in `prnIndex` (case-insensitive by canonical uppercase construction), and match verified email if allowlist CSV is active.
    - **Anti-Squatting & Anti-Abuse**: When a PRN is changed, the old PRN is marked in `prnIndex` as `RELEASED` with a reservation for the prior holder for 30 days (`PRN_RELEASE_RESERVATION_DAYS = 30`). Other students cannot claim it in this window. PRNs of banned accounts are permanently blocked. Generic error messages for PRN-already-taken prevent user enumeration. Rate limits enforce max 5 change attempts per hour.
    - **Privacy & Masking**: Masked PRN displays only the last 4 digits as `••••••••1039` (8 bullets + last 4 digits); program code letters and the M/F letter are never revealed in masked or unmasked form to peers, public profiles, leaderboards, URLs, logs, or error responses.
    - **Account State Invariant**: Points, streaks, submissions, weekly ranks, uploads, and bans belong to the account UID, never PRN; changing PRN never resets, moves, or merges any account state.
    - **Audit & History**: Append-only `prnHistory` subcollection/table per student logs `oldPrn`, `newPrn`, `changedAt`, `source` (`STUDENT` or `ADMIN`), and request telemetry. Admins can view PRN change logs, reset cooldowns with re-auth, and override PRNs. College remains strictly locked to `"Sanjivani University"`.
- **Budget & Plan**: Firebase **Blaze Plan** with Cloud Billing budget alerts ($0–$5/month expected for 300–500 students including Firebase Storage for uploaded solutions, with hard alerts at 50%, 80%, 100%). Two independent `Owner` accounts required on the Firebase project.
- **Problem Authoring & Syllabus Book Pipeline**: Governed by [`/docs/CONTENT_PIPELINE.md`](./CONTENT_PIPELINE.md) and [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md). Every problem requires human admin review and the automated **1-pass reference C solution + 2-fail wrong C solutions** validation gate (`Draft -> Validated -> Published -> Retired`).
- **Signature Differentiator**: The **Daily Competition** (`17:00 IST` to next `17:00 IST` server time) where each daily challenge is solvable strictly inside its own 24-hour window, with a personalized, read-only **Daily Result Summary** ("Yesterday's result") for every student.

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
  - Collections: `users`, `prnIndex`, `publicProfiles`, `problems` (+ `hidden_tests` and admin-only `sourceRef`), `daily_boards` (+ `daily_rank_snapshots`, and legacy `weeks` read-only archive), `submissions`, `uploaded_solutions` (+ append-only `upload_reviews`), `daily_results`, `daily_summaries` (and legacy `weekly_summaries` read-only archive), `daily_corrections`, `streak_events`, `streak_pauses`, `integrity_flags`, `admin_audit_logs`, `support_reports`, `error_reports`, `system_alerts`.
  - **Uploaded Solutions (`Upload Files` Tab)**:
    - Config-driven limits: `JPG`, `PNG`, `WebP`, `PDF` only; max `3` files per submission; max `5 MB` per file; max `5` upload submissions per student per day.
    - Validated on the server by magic bytes, sanitized/stripped of EXIF metadata (and active PDF scripts rejected), stored under randomized filenames, and served only via authenticated `nosniff` endpoints.
    - Must be submitted before the active challenge's `17:00:00 IST` end cutoff (`submittedAt` server timestamp). Stored as `PENDING_REVIEW` (never auto-judged). One pending upload per problem at a time; disallowed if the student already has an `ACCEPTED` code submission for that problem. Only an admin approval (with step-up re-authentication and audit log entry) awards configured problem points and records credit for the challenge's day using original `submittedAt` (or creates a `DailyCorrection` record if that day is already frozen).
  - **Append-Only Ledger**: `submissions`, `uploaded_solutions`, `upload_reviews`, `verdicts`, `points`, `streak_events`, `daily_results`, `daily_summaries`, `daily_corrections`, and `admin_audit_logs` are strictly append-only.
- **Tier B — Student Personal Google Drive (`DriveStorage`) & Local Offline Drafts**:
  - Stores non-authoritative `.c` code drafts, notes, editor settings, and self-service data exports, with automatic local draft persistence when offline (never storing problem statements).

---

## 5. Single Visible Question (`17:00 IST`) & Daily Competition System

1. **Single Visible Question (`17:00:00 IST` Daily Switch)**:
   - At `17:00:00 IST` every day (server clock only), the new challenge becomes the only visible question for students and the previous challenge disappears immediately.
   - Students can see and solve **ONLY** the current active challenge (`GET /api/problems/daily` / `getCurrentChallenge`, cached only until the next `17:00:00 IST`).
   - Old challenge URLs/IDs return `410 Gone` (`CHALLENGE_ENDED`) with zero problem statement, samples, or tests and display a calm **"This challenge has ended"** page with a link back to `/challenge`.
   - When an open challenge page crosses `17:00:00 IST`, a banner (**"A new challenge is live. Refresh to see it."**) appears, the ended challenge's editor becomes `readOnly`, and Run/Submit/Upload for the ended challenge are blocked while keeping the student's code in view and in local drafts.
   - Submission history (`HistoryPage`) and daily summaries (`DashboardPage`, `LeaderboardPage`) show date, challenge title (hideable via config `HIDE_ENDED_PROBLEM_TITLES`, default `false`), verdict, runtime, points, and the student's own code — never the old problem statement, samples, or any way to re-run or resubmit.
2. **Strict Cutoff (`submittedAt < next 17:00:00 IST`)**:
   - Code Run/Submit and File Uploads are accepted only when `problemId` matches the current active challenge and server `submittedAt` is inside its `[17:00:00 IST, next 17:00:00 IST)` window.
   - Any submission received at or before `16:59:59.999 IST` is judged normally and attributed to that challenge day even if the judge finishes after `17:00:00 IST`.
   - Points are determined strictly by problem difficulty (Easy: 100, Medium: 200, Hard: 300).
3. **Daily Finalization Job (`17:05 IST` Daily)**:
   - Runs daily at `17:05:00 IST` (5 minutes after the 17:00:00 switch).
   - Waits for pre-cutoff submissions to finish judging (up to a 10-minute grace period until `17:10:00 IST`). Unjudged items past grace are flagged for admin review, never dropped.
   - Finalizes yesterday's board, writes each student's read-only daily result summary, freezes the day, and writes the frozen top 20 snapshot to `daily_rank_snapshots`.
   - The job is strictly idempotent, resumable (chunked in batches with checkpoints in `daily_job_checkpoints`), re-runnable by admins, and alerts on failure.
   - Post-freeze rejudges, late upload approvals, or corrections create admin-approved `DailyCorrection` records and an audit entry; they never silently alter a frozen board.
4. **Leaderboard Architecture & Daily Rank (`/leaderboard` & `/dashboard`)**:
   - **Tabs**:
     - **"Today" (Default)**: Live Daily Rank for the CURRENT challenge day (`17:00:00 IST` to `16:59:59.999 IST`). Only students whose submission for today's challenge was Accepted before cutoff are ranked. Students who have not solved it show `"Not solved yet"` with a hint ("Solve today's challenge to enter the board"), never a rank.
     - **"Yesterday"**: Frozen final leaderboard from yesterday's finalized challenge day.
     - **"Past days"**: Date selector for viewing frozen daily final rankings (retaining the past 90 days of daily archives) and per-day results (`date`, `title`, `verdict`, `points`, `dailyRank`) without problem statements.
   - **Daily Rank 6-Tier Tie-Break Order**:
     1. Earlier server-side accepted time (`submittedAt` ASC of first accepted solve; judge latency does not matter);
     2. Fewer wrong attempts before the accepted solve ASC;
     3. Higher current streak DESC;
     4. Higher total points DESC (replaces old "points this week" everywhere);
     5. Higher total solved count DESC;
     6. Stable final tie-break: earlier account creation (`createdAt` ASC), then `uid` ASC.
   - **Metrics & Percentiles**: Show `"#R of N solvers today"` and `"Top X%"` only when $N \ge 10$ (config `MIN_RANKED_STUDENTS_FOR_PERCENTILE = 10`); otherwise show `"—"`.
   - **Points Today & Cumulative Stats**:
     - `"Points today"` is the difficulty points of today's challenge when solved, otherwise 0.
     - Cumulative stats (Total points, Total solved, Best daily rank, Longest streak) appear on the student's profile and dashboard cards, not as a leaderboard.
   - **Dashboard Cards**:
     - `Daily rank`, `Points today`, `Percentile`, `vs yesterday` (shows `"—"` when yesterday does not exist or user didn't participate), plus `Current streak` and `Total points/solved`.
   - **Daily Result Summary ("Yesterday's result")**:
     - Read-only card on dashboard: challenge title and date, verdict, points, daily rank (or `"Not solved"`), number of attempts, streak, and one constructive improvement hint. Never problem statements.
   - **Department & Year Formatting**: Always standardized as `"AIML • FY"` across leaderboard, profile, dashboard, admin, and CSV exports (never college name). College name is locked to "Sanjivani University" in header.
   - **Data Hygiene & Mock Elimination**: Seed scripts strictly refuse to run against production (`NODE_ENV === 'production'`); seeded test accounts carry `isTest: true`; Leaderboard queries strictly filter `role === 'STUDENT'` and exclude `isTest === true`.
5. **Streak Freeze (`1 per Rolling 7 Days`) & Admin Pause Days**:
   - Solving each day's challenge inside its 24-hour window extends the streak.
   - Automatic streak freeze: **1 automatic freeze per rolling 7 days** (config `STREAK_FREEZE_ROLLING_DAYS = 7`). Consuming a freeze preserves `currentStreak` on a missed day if no freeze was consumed in the previous 7 days (`FREEZE_USED` event logged).
   - Admin-declared pause days (`/streak_pauses`, e.g., exams/holidays) protect all students' streaks without consuming their rolling freeze.

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
---

## 8. Practice Module System Specification

1. **Information Architecture & Navigation**:
   - Primary Navigation (signed-in): **Home** (`/dashboard`), **Daily Challenge** (`/challenge`), **Practice** (`/practice`), **Leaderboard** (`/leaderboard`).
   - The Practice area lives at `/practice` (module overview & selection) and `/practice/:moduleSlug/:problemSlug` (practice workspace).
2. **Modules & Structure (Config-Driven)**:
   - Exactly 4 modules:
     1. `control-structures`: **Control Structures** (10 questions: 4 Easy, 4 Medium, 2 Hard)
     2. `pointers-functions`: **Pointers and functions** (10 questions: 4 Easy, 4 Medium, 2 Hard)
     3. `arrays-applications`: **Array and its Applications** (10 questions: 4 Easy, 4 Medium, 2 Hard)
     4. `advanced-types-memory`: **Advanced Data Types, Dynamic Memory** (10 questions: 4 Easy, 4 Medium, 2 Hard)
   - Config defined in `server/src/config/practice.config.ts` and `client/src/config/practice.config.ts`.
3. **Sequential Unlocking Rule**:
   - Module 1 is unlocked for every registered student.
   - Module $N+1$ unlocks if and only if the student has solved at least `UNLOCK_THRESHOLD = 7` of the 10 questions in Module $N$ (`verdict === 'ACCEPTED'`).
   - Solved status is permanent: once unlocked, a module stays unlocked.
   - Locked modules show a lock icon with the exact requirement (e.g. *"Solve 7 of 10 in Module 1 to unlock"*).
   - Server strictly enforces access: `GET /api/practice/modules/:moduleSlug/problems` returns `403 FORBIDDEN` (`MODULE_LOCKED`) if the student has not met the threshold for the prior module. Guessing problem IDs returns 403/404 without statements.
4. **Separation from Competition**:
   - Practice submissions are tagged with `type: 'PRACTICE'`.
   - Practice submissions **do not** award weekly points, do not affect weekly rank, do not impact percentile, and do not extend or break daily streaks.
   - Practice progress is tracked in dedicated records (`PracticeProgress`: `userId`, `problemId`, `moduleSlug`, `isSolved`, `attemptsCount`, `solvedAt`).
   - Dashboard features a compact **"Practice Progress"** widget showing current module progress (e.g. *"Module 1: 5/10 solved"*).
5. **Workspace & Sandbox**:
   - Reuses the standard Monaco editor, Run Code, Custom Stdin, and Verdict & Output.
   - Code-only track: No `Upload Files` tab in Practice.
   - Queue priority: Practice jobs run at priority 2, ensuring Daily Challenge submissions (priority 1) are never delayed during the 17:00 rush.
   - Answer shielding: Solutions and hints are never readable by student clients.
6. **Problem Validation & Admin Controls**:
   - Admin Practice Management: View all modules, problems, validation runner (1-pass reference, 2-fail wrong solutions), edit, publish, unlock threshold override, and module completion analytics.


