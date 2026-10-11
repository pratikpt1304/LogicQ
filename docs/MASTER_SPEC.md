# LogicQ Master Specification — Single Source of Truth (`/docs/MASTER_SPEC.md`)

> **AUTHORITATIVE DIRECTIVE**: This document is the Single Source of Truth for **LogicQ** ("Think in logic. Code in C."). Where any earlier prompt or design decision conflicts with this specification, this document wins.

---

## 1. Conflict Resolution Log (How Earlier Decisions Were Reconciled)

| # | Topic / Area | Earlier Decision | Authoritative Resolution (This Spec Wins) |
| :-: | :--- | :--- | :--- |
| **1** | **Target Audience & Signup** | Generic multi-college / open signup | **Sanjivani College only** (~300 total students, ~50 concurrent). Server-side college email domain check (`@sanjivani.org.in` / `@sanjivanicoe.org.in`), `email_verified` required, plus optional CSV allowlist of `(rollNumber, email)`. Never ask for or scrape college UMS passwords. |
| **2** | **Visual Theme & Tokens** | Light/white default or generic cyan `#05070D` dark theme | **`logicq.html` Dark Theme Reference**: Background `#0C0F1F`, Panel `#141932`, Line `#252C4F`, Text `#E8EAF6`, Muted `#9AA1C4`, Accent `#8B9BFF`, Success `#46D9A0`, Error `#FF7A8A`. Fonts: `Bricolage Grotesque`, `Inter`, `JetBrains Mono`. Brand SVGs in `/client/public/brand` + `<Logo />`. |
| **3** | **Daily Unlock Time** | `00:00 IST` midnight | **`17:00 IST` (`Asia/Kolkata`)** every day using the server clock only. Each challenge day runs `17:00 IST` to next `17:00 IST`. |
| **4** | **Week Close vs. Unlock** | Simultaneous close & result compute at `17:00 IST` | Submissions close at **`16:59:59.999 IST` Monday** (evaluated by server `submittedAt`, not `judgedAt`). Next challenge unlocks at **`17:00:00 IST`**. Weekly result job runs at **`17:05 IST`** with a 10-minute grace wait (`17:10 IST`) for in-flight judge calls; unjudged items are flagged for admin review, never dropped. |
| **5** | **Leaderboard & Tie-Break** | Global all-time XP leaderboard + wrong-attempt penalty tie-break | **Weekly Leaderboard only** on `/leaderboard` (all-time stats live on `/profile` only). Rank by **`weeklyPoints` DESC**, then **earlier `lastAcSubmittedAt` ASC** (wrong-attempt penalty removed). Pinned user row shows **percentile (`top X%`)**, **students beaten count**, and **previous-week comparison**. |
| **6** | **Streak Rules** | Any miss resets streak to `0` immediately | **1 automatic streak freeze per week** (1st missed day records `FREEZE_USED` in `/streak_events` and preserves streak; 2nd miss in same week breaks it). Admins can declare **pause days** (`/streak_pauses`, e.g., exams) where streaks neither break nor extend. |
| **7** | **Problem Validation Gate** | Simple reference-solution pass check | Admin **Validate Problem** step requires: **1 reference C solution passes all tests**, AND **2 author-provided wrong C solutions fail**. Lifecycle: `Draft -> Validated -> Published -> Retired`. |
| **8** | **Release Staging** | Contests/Arena bundled into initial build | **Release 1** finishes core platform + weekly competition + weekly student result reports + 2-week pilot analytics first. **Contests/Arena, extended badges, and Phase 2 weekly enhancements** belong to **Release 2** (started only after Release 1 passes QA). |
| **9** | **Security Claims & Status** | Claiming "100% secure" or marking untested items done | Never claim the app is "fully secure"; document layered controls, residual risks, and manual GCP steps honestly. Never mark anything done in `/docs/STATUS.md` unless run and tested (`WORKING` / `PARTIAL` / `BLOCKED`). |

---

## 2. Project Constraints & Institutional Context

- **Audience**: Sanjivani College students and faculty (~300 total users, ~50 concurrent users).
- **Identity & Signup**: Google Sign-In (plus verified email auth for emulator testing) restricted on the server to Sanjivani college email domains + optional roll-number/email CSV allowlist.
- **Budget & Plan**: Firebase **Blaze Plan** with Cloud Billing budget alerts ($0–$4/month expected for 300–500 students, well within Google Cloud's perpetual free tiers, with hard alerts at 50%, 80%, 100%). Two independent `Owner` accounts required on the Firebase project.
- **Problem Authoring**: Authored by admins (AI-assisted with human admin review and mandatory automated 1-pass / 2-fail validation gate).
- **Signature Differentiator**: The **Weekly Competition** (`Monday 17:00 IST` to `Monday 16:59:59 IST`) with a personalized, immutable **Weekly Result Report** for every participating student.

---

## 3. Technology Stack & Visual Design System (`logicq.html`)

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, Framer Motion, Monaco Editor (`c` language mode), TanStack Query, `react-hook-form` + `Zod`, `DOMPurify`.
- **Visual Design Tokens**:
  - `bg`: `#0C0F1F` | `panel`: `#141932` | `line`: `#252C4F`
  - `text`: `#E8EAF6` | `muted`: `#9AA1C4`
  - `accent`: `#8B9BFF` | `success`: `#46D9A0` | `error`: `#FF7A8A`
  - Typography: `Bricolage Grotesque` (headings/display), `Inter` (UI body), `JetBrains Mono` (code/metrics/timers).
  - Brand assets stored as SVGs in `/client/public/brand/` and rendered via `<Logo />`.
- **Central Backend**: Firebase Authentication, Cloud Firestore, Cloud Functions (2nd Gen / Express API), Firebase Hosting, Firebase App Check, Google Cloud Secret Manager, Cloud Scheduler.
- **Sandboxed C Judge**: Separate isolated Linux container on Google Cloud Run (`gcc -O2 -std=c11 -Wall`, non-root, `--network none`, `--read-only`, CPU/memory/PID/output caps) or Judge0 configured via Secret Manager. Fails closed if no safe judge is configured in production. Docker/WSL setup provided for local development.

---

## 4. Dual-Tier Data Architecture & Immutability

- **Tier A — Authoritative Central Firestore**:
  - Collections: `users`, `problems` (+ `hidden_tests` subcollection unreadable by clients), `weeks` (+ `days`, `leaderboard`), `submissions`, `weekly_summaries`, `weekly_corrections`, `streak_events`, `streak_pauses`, `integrity_flags`, `badges`, `admin_audit_logs`, `support_reports`, `system_alerts`.
  - **Append-Only Ledger**: `submissions`, `verdicts`, `points`, `streak_events`, `weekly_summaries`, and `admin_audit_logs` are strictly append-only. Corrections create new records (`/weekly_corrections` or `supersedesSubmissionId`); deleting a problem marks it `RETIRED`.
  - **Read/Write Cost Ceiling**: Cached weekly leaderboard and materialized dashboard summary keep every screen under **$\le 20$ reads per student** (~10.9k reads/day and ~6.4k writes/day for 500 students).
- **Tier B — Student Personal Google Drive (`DriveStorage`)**:
  - Stores only non-authoritative personal data: `.c` code drafts, problem notes, editor settings, and self-service data exports.
  - Uses minimal `drive.appdata` / `drive.file` scopes requested optionally after login.
  - Includes token refresh, quota/offline handling, version-conflict modal (**Choose Local vs. Drive Version**), and automatic fallback to private Firestore drafts (`/users/{uid}/drafts`) or `localStorage` if Drive is declined or blocked by campus IT.
  - **Zero Admin Drive Access**: Neither developers nor admins can read student Google Drives.

---

## 5. Daily (`17:00 IST`) & Weekly System Summary

1. **Daily Unlock**: `17:00:00 IST` daily via server clock. Missing scheduled challenge auto-picks an unused `PUBLISHED` problem and logs to `/admin_audit_logs`.
2. **Weekly Window & Cutoff**: Monday `17:00:00 IST` to next Monday `16:59:59.999 IST` (7 challenges). Eligibility and tie-break use server `submittedAt`.
3. **Weekly Close Job (`17:05 IST`)**: Waits up to `17:10 IST` (10-min grace) for pre-cutoff submissions to finish judging; flags any still-unjudged submissions for admin review; computes ranks, percentiles, beaten counts, and previous-week deltas; writes read-only `/weekly_summaries/{weekId}_{uid}` with 1 personalized improvement hint; freezes the week. Idempotent and re-runnable by admins.
4. **Leaderboard & Tie-Break**: Ranks by `weeklyPoints` DESC, then earlier `lastAcSubmittedAt` ASC. Shows current week only (with past-week archive), pinned user row, percentile, students beaten, and previous-week delta. All-time stats stay on `/profile`.
5. **Streak Freeze & Pause Days**: 1 automatic freeze per week (`FREEZE_USED` on 1st missed day; 2nd miss breaks streak). Admins can declare exam pause windows (`/streak_pauses`).

---

## 6. Layered Security & Problem Quality Gates

- **Firestore Rules**: Deny by default (`allow read, write: if false;`). Clients can never write verdicts, points, streaks, ranks, roles, badges, freezes, or weekly results. Verified by 13 emulator cheating tests (`firestore-security-rules.test.ts`).
- **Institutional Controls**: `@sanjivani.org.in` verification, 30-min idle session timeout, "My Sessions" revocation, login history with coarse location & anomaly flags, mandatory Admin MFA + step-up re-authentication before destructive actions, seed-based first admin (no default password), HSTS/CSP/DOMPurify, `/.well-known/security.txt`, and DPDP-aligned privacy controls ("Send debug report", "Export my data", "Delete my account & data").
- **Problem Validation Gate**: 15+ original C problems with constraints, $\ge 2$ visible samples, $\ge 5$ hidden edge-case tests, and C reference solution. Publishing requires passing the automated validator (reference solution passes all tests; 2 wrong solutions fail).

---

## 7. Delivery Order & Phase Gate Protocol

Work proceeds strictly in phases, pausing for user `"approved"` after each phase summary ($\le 10$ lines):
- **Phase 0**: Complete all 18 `/docs` files (Current Phase — **STOP FOR APPROVAL**).
- **Phase 1**: Firebase Auth, Sanjivani identity checks, custom claims, and Firestore Security Rules + emulator tests.
- **Phase 2**: Sandboxed Judge Service + automated malicious-program test suite.
- **Phase 3**: Problem Catalog (15+ problems) + automated 1-pass/2-fail Validation Gate + "Report a problem".
- **Phase 4**: Student UI (`logicq.html` design system & `<Logo />`), Dashboard, and Monaco C Editor.
- **Phase 5**: Weekly System (`17:00 IST` schedule, `16:59:59` cutoff, `17:05` job, Weekly Leaderboard, Weekly Result Summary, Streak Freezes & Pauses).
- **Phase 6**: Google Drive `DriveStorage` integration with conflict prompt & Firestore/localStorage fallback.
- **Phase 7**: Admin Dashboard (CRUD, validation, scheduling, user moderation with step-up re-auth, rejudge, 2-Week Pilot Analytics, audit log viewer, support reports).
- **Phase 8**: Student Support, Data Export, Account Deletion, Session Management, and Privacy/Security pages.
- **Phase 9**: Full Browser QA Acceptance Pass (`/docs/TEST_REPORT.md`, `/docs/BUGS.md`, `/scripts/verify-integrity.ts`).
