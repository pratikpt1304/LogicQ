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
| **10** | **Signup & Student Identity Fields (Amendment)** | Username / Full Name signup with optional college & graduation year | **PRN-based Academic Profile**: Form order: (1) **PRN** (`^[0-9]{12}$`, 12 digits, live `X/12` counter, unique via `prnIndex/{prn}` transaction), (2) **College** (`["Sanjivani University"]`), (3) **Department** (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`), (4) **Year** (`["FY", "SY", "TY"]`), (5) **Division** (optional, `^[A-Za-z0-9]{0,3}$`, uppercase), (6) **College email, password, confirm password** (or post-Google-login **"Complete your profile"** gate). Full `prn` is private (masked as `••••••5678` on own views; never exposed to peers). |
| **11** | **Editor Bottom Tabs & Uploaded Solutions (`Upload Files` replaces `Test Cases`)** | Bottom tabs were `Test Cases`, `Custom Stdin`, `Verdict & Output` | **`Test Cases` tab is removed** from the bottom bar (sample input/output examples remain in the left problem statement panel; hidden tests never leave the server). Bottom tabs are strictly: **Custom Stdin**, **Verdict & Output**, **Upload Files**. Students can upload up to **3 files** (`JPG`, `PNG`, `WebP`, `PDF`, max **5 MB** each, magic-byte verified, EXIF stripped, max **5 uploads/day**) with an optional approach note ($\le 1000$ chars). Uploaded solutions are stored as `PENDING_REVIEW` (never auto-judged; blocked if student already has an `ACCEPTED` code submission for the problem) and award points/streak/weekly rank only when approved by an admin via an append-only review record. |
| **12** | **Mobile PWA & Standalone Polish** | Desktop-first web app without manifest or service worker | **Installable Mobile PWA**: `/manifest.webmanifest` (`name: "LogicQ"`, `lang: "en-IN"`, `start_url: "/dashboard"`, `display: "standalone"`, `#0C0F1F` dark / `#F4F6FB` light `theme-color`, crisp `192x192`, `512x512`, `512x512` maskable, and `180x180` apple-touch-icon from `/client/public/brand/logo-mark.svg`, shortcuts strictly `Daily Challenge` & `Leaderboard`). Service worker precaches only static shell assets (`prompt` update banner; network-only for all Auth/Firestore/API/Judge/Drive requests; clears caches on logout). Standalone polish includes `100dvh`, `viewport-fit=cover` safe-area insets, $\ge 44\times 44\text{px}$ tap targets, and a mobile C symbol helper bar (`Tab`, `{`, `}`, `;`, `*`, `&`, `#`, `<`, `>`). |
| **13** | **Real C Judge, Local Monaco & Zero Console Errors** | Client `fallbackEngine.ts` simulated C runs when `/api` was unreachable; `socket.io` and CDN Monaco caused console/CSP errors | **Real Judge Only & Clean Production Console**: Client mock fallback is strictly disabled in production builds and server judge fails closed if no real C compiler/sandbox is available. Socket.IO is removed (replaced by clean polling/listeners that pause when tab is hidden), and Monaco Editor is bundled locally via Vite with zero `cdn.jsdelivr.net` or `localhost:5000` CSP violations. |
| **14** | **Book-Only Content Source Governance** | AI-authored / multi-source C problem bank | **Single Designated Book Syllabus (`/docs/CONTENT_PIPELINE.md` & `/docs/CONTENT_RIGHTS.md`)**: Daily challenges come exclusively from the designated syllabus book (original-wording problem statements with new numbers/context unless explicit publisher permission is on file; admin-only `(book, chapter, exercise)` source reference never shown to students; `Season complete` state if unused approved pool runs out). Import execution awaits user approval of `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md`. |

---

## 2. Project Constraints & Institutional Context

- **Audience**: Sanjivani University students and faculty (~300 total users, ~50 concurrent users).
- **Navigation & Feature Scope (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`)**:
  - Signed-in primary navigation items (desktop and mobile, in exact order): **Home** (`/dashboard`, house icon), **Daily Challenge** (`/challenge`), **Leaderboard** (`/leaderboard`).
  - Logo in the navbar links to `/dashboard` when signed in and `/` (landing page) when signed out. Active nav item sets `aria-current="page"`.
  - Removed features: **Arena** (`/arena`, `/arena/:id`), **Archive** (`/archive`), and **Badges** (`/badges`, `/achievements`) are disabled via feature flags across UI routes, navigation, dashboard, profile, weekly summary, leaderboard, landing copy, manifest shortcuts, admin screens, API endpoints (`404 Not Found` for all roles), and Firestore rules (`allow read, write: if false;`). Existing database records are preserved safely without deletion.
- **Identity & Signup**:
  - **Form Fields (in strict order)**:
    1. **PRN (required)**: Replaces old `username`/`name` everywhere. Exactly 12 digits (`^[0-9]{12}$`), spaces trimmed, live `"8/12"` character counter, plain-language error (`"PRN must be exactly 12 digits."`). Enforced unique via `prnIndex/{prn}` transaction (one PRN per account).
    2. **College (required)**: Config-driven dropdown (`["Sanjivani University"]`).
    3. **Department (required)**: Config-driven dropdown (`["AIML", "AIDS", "Integrated M.Tech", "Mechanical", "CSE", "Integrated B.Tech"]`).
    4. **Year (required)**: Config-driven dropdown (`["FY", "SY", "TY"]`).
    5. **Division (optional)**: Up to 3 alphanumeric characters (`^[A-Za-z0-9]{0,3}$`), stored uppercase (e.g., `A`, `B`, `C1`).
    6. **College Email, Password, Confirm Password**: Server-verified college domain + optional admin CSV allowlist check of `(prn, email)`. For Google Sign-In or migrated incomplete accounts, a required **"Complete your profile"** step runs right after sign-in and blocks dashboard access until completed.
- **Budget & Plan**: Firebase **Blaze Plan** with Cloud Billing budget alerts ($0–$5/month expected for 300–500 students including Firebase Storage for uploaded solutions, with hard alerts at 50%, 80%, 100%). Two independent `Owner` accounts required on the Firebase project.
- **Problem Authoring & Syllabus Book Pipeline**: Governed by [`/docs/CONTENT_PIPELINE.md`](./CONTENT_PIPELINE.md) and [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md). Every problem requires human admin review and the automated **1-pass reference C solution + 2-fail wrong C solutions** validation gate (`Draft -> Validated -> Published -> Retired`).
- **Signature Differentiator**: The **Weekly Competition** (`Monday 17:00 IST` to `Monday 16:59:59 IST`) with a personalized, immutable **Weekly Result Report** for every participating student.

---

## 3. Technology Stack, PWA & Visual Design System (`logicq.html`)

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, Framer Motion, locally bundled Monaco Editor (`c` language mode, zero CDN dependencies), TanStack Query, `react-hook-form` + `Zod`, `DOMPurify`, PWA (`/manifest.webmanifest` + Workbox service worker in `prompt` update mode).
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
    - Stored as `PENDING_REVIEW` (never auto-judged). One pending upload per problem at a time; disallowed if the student already has an `ACCEPTED` code submission for that problem. Only an admin approval (with step-up re-authentication and audit log entry) awards configured problem points and updates streak & weekly rank.
  - **Append-Only Ledger**: `submissions`, `uploaded_solutions`, `upload_reviews`, `verdicts`, `points`, `streak_events`, `weekly_summaries`, and `admin_audit_logs` are strictly append-only.
- **Tier B — Student Personal Google Drive (`DriveStorage`) & Local Offline Drafts**:
  - Stores non-authoritative `.c` code drafts, notes, editor settings, and self-service data exports, with automatic local draft persistence when offline.

---

## 5. Daily (`17:00 IST`), Weekly Catch-Up & Weekly Leaderboard System

1. **Daily Unlock**: `17:00:00 IST` daily via server clock from the approved syllabus book pool (or `Season complete` state if exhausted).
2. **Weekly Window & Current-Week Catch-Up (`/challenge`)**: Monday `17:00:00 IST` to next Monday `16:59:59.999 IST` (7 challenges selectable via the 7-day strip on `/challenge`; locked future days disabled with unlock timestamp; past weeks' problems not exposed).
3. **Weekly Close Job (`17:05 IST`)**: 10-minute grace wait for in-flight submissions; computes ranks, percentiles, beaten counts, previous-week deltas, and department/year breakdowns; freezes the week.
4. **Leaderboard & Past Weeks Selector (`/leaderboard` & `/dashboard`)**: Ranked by `weeklyPoints` DESC, then earlier `lastAcSubmittedAt` ASC, with Department/Year filters and a **Past Weeks** selector (`Current Week`, `Last Week`, `2 Weeks Ago`, `3 Weeks Ago`).
5. **Streak Freeze & Pause Days**: 1 automatic freeze per week (`FREEZE_USED` on 1st missed day; 2nd miss breaks streak) + admin exam pause windows.

---

## 6. Layered Security & Problem Quality Gates

- **Firestore & Storage Rules**: Deny by default (`allow read, write: if false;`). Clients can never read or write `contests`, `archive`, `badges`, `user_badges`, `prnIndex`, `hidden_tests`, unreleased problems, or admin-only `sourceRef` metadata. Students can only access their own uploaded files; nobody can overwrite or delete submitted files except via account deletion.
- **Institutional & DPDP Privacy Controls**: `@sanjivani.org.in` verification, 30-min idle session timeout, mandatory Admin step-up re-authentication before destructive/PRN-update/upload-approval actions, strict CSP (`worker-src 'self' blob:`, `manifest-src 'self'`, no `localhost` or CDN script/connect sources in production), `/.well-known/security.txt`, and DPDP-aligned privacy controls ("Privacy Notice", "Export my data" including uploaded solutions, and "Delete my account & data" freeing `prnIndex` and deleting uploaded files).
- **Problem Validation Gate**: Reference C solution passes all tests and 2 wrong C solutions fail before any problem can transition from `Draft` to `Validated`/`Published`.

