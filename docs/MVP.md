# LogicQ MVP Scope, Phased Release Plan & Milestone Roadmap (`/docs/MVP.md`)

## 1. Release Philosophy & Delivery Order

LogicQ is built in strict phases for **Sanjivani University** (~300 students total, ~50 concurrent). **Release 1 must be built, verified in a real browser, and pass the full QA acceptance suite before subsequent releases begin.**

> **Authoritative Scope Note**: Per the amended [`/docs/MASTER_SPEC.md`](./MASTER_SPEC.md), the **Arena** (`/arena`), **Archive** (`/archive`), and **Badges** (`/badges`, `/achievements`) features are removed and disabled (`FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`). Primary navigation contains strictly **Daily Challenge** and **Leaderboard**. Students solve any already-unlocked challenge of the current week directly from the **Daily Challenge** page (`Day 1`–`Day 7` strip), and view past weeks' final rankings and weekly result summaries via the **Past Weeks** selector on the **Leaderboard** and **Dashboard**.

### 9-Phase Delivery Sequence
1. **Phase 1**: Firebase Auth (`@sanjivani.org.in` + PRN `prnIndex` transaction + optional CSV allowlist), roles (`STUDENT`, `ADMIN` custom claims), Firestore Security Rules with passing emulator cheating tests.
2. **Phase 2**: Isolated Judge Service (`Docker` / `Cloud Run` / `Judge0`, fail-closed) with automated malicious-program tests passing.
3. **Phase 3**: Problem Management (15+ original C problems) and Admin **Validate Problem** workflow (`Draft -> Validated -> Published -> Retired`, requiring 1 passing reference C solution + 2 failing wrong C solutions).
4. **Phase 4**: Student UI (`logicq.html` dark & light palettes; `Bricolage Grotesque`, `Inter`, `JetBrains Mono`; SVG `<Logo />`) and Monaco C11 Editor.
5. **Phase 5**: Daily (`17:00 IST`) & Weekly System (Mon `17:00 IST` to Mon `16:59:59 IST` cutoff, current-week 7-day catch-up strip on `/challenge`, `17:05 IST` result job with 10-min grace period, pinned weekly leaderboard with percentile, prev-week delta & Past Weeks selector, weekly student result summary report, streak freezes & admin pause days).
6. **Phase 6**: Student Google Drive integration (`drive.appdata` / `drive.file`, `DriveStorage` interface, version conflict prompt, and automatic Firestore/localStorage fallback).
7. **Phase 7**: Admin Dashboard (problem CRUD, validation gate, daily scheduling, user ban/unban/role & audited PRN/college updates with step-up re-auth, submission monitor, rejudge, 2-Week Pilot Analytics, append-only audit log viewer, support reports).
8. **Phase 8**: Student Support ("Send debug report" with preview/consent, "Export my data", "Delete my account and data", "My sessions" revoke one/all).
9. **Phase 9**: Full QA Acceptance Pass (`/docs/TEST_REPORT.md`, `/docs/BUGS.md`, `/scripts/verify-integrity.ts`).

---

## 2. Release 1 vs. Release 2 vs. Release 3 Feature Matrix

### Release 1 (Required Core & Weekly Competition — Build First)
*Objective*: Deliver the complete daily C challenge and weekly competition platform with per-student weekly result reports.

| Feature Area | Release 1 Scope |
| :--- | :--- |
| **Visual Identity & Auth** | `logicq.html` dark & light themes & SVG `<Logo />`; 12-digit PRN + Academic Profile (`Sanjivani University`, `Department`, `Year`, `Division`); Google Sign-In with required post-login profile completion; `@sanjivani.org.in` domain & optional `(prn, email)` CSV allowlist check. |
| **Daily & Weekly System** | `17:00 IST` server-clock daily unlock; Mon `17:00 IST` – Mon `16:59:59 IST` week; current-week 7-day challenge strip on `/challenge` (unlocked challenges solvable, locked future challenges disabled with unlock time); ranked by `weeklyPoints` DESC then `lastAcSubmittedAt` ASC; `17:05 IST` idempotent weekly close job; read-only Weekly Result Summary per student; 1 auto streak freeze/week + admin pause days. |
| **Weekly Leaderboard & Profile** | Weekly rank on `/leaderboard`; pinned student row with percentile (`top X%`), students beaten count, and previous-week comparison; **Past Weeks** selector on `/leaderboard` and `/dashboard` for historical weekly rankings and weekly summaries; all-time stats on `/profile`. |
| **Problem Workspace & Judge** | Sanitized Markdown statement, samples, constraints, compile flags (`gcc -O2 -std=c11`); Monaco C editor; `Run` on custom input; `Submit` against hidden tests; all 6 verdicts; isolated fail-closed sandbox stopping malicious code. |
| **Google Drive & Privacy** | Optional `DriveStorage` for drafts/notes/settings with conflict prompt and automatic Firestore/localStorage fallback; "Export my data", "Delete my account & data" (freeing `prnIndex`), DPDP privacy notice, `/.well-known/security.txt`. |
| **Admin & 2-Week Pilot Analytics** | Problem CRUD + Validate Problem gate; schedule challenges; user ban/unban/role & audited PRN/college updates (with re-auth); rejudge; 2-Week Pilot Analytics (`DAU`, `>= 4/7` cohort, `drop-off by day`, `most-failed problems`); append-only audit log viewer & CSV export. |

---

### Release 2 (Weekly Phase 2 Enhancements — Build Only After Release 1 QA Approval)
*Objective*: Add weekly thematic depth and pre-publish similarity holds.

| Feature Area | Release 2 Scope |
| :--- | :--- |
| **Themed Weeks & Topic Insights** | Admin-defined weekly themes (`"Week 3: Pointers & Dynamic Memory"`), difficulty mix (2 Easy, 3 Medium, 1 Hard, 1 bonus), and strong/weak topic breakdown in student weekly summaries. |
| **Pre-Publish Integrity Review** | Token/AST similarity check on AC submissions; Top 3 weekly ranks held (`PENDING_INTEGRITY_REVIEW`) until admin reviews flagged pairs (flag only, never auto-ban). |
| **Late Catch-Up & Reminders** | Configurable `70%` base points for intra-week catch-up solves after a challenge's own 24h day; Weekly Top-3 recognition; opt-in `17:00 IST` push reminders (off by default). |

---

### Release 3 (Classroom & Multi-Batch Enterprise Tools)
*Objective*: Extend LogicQ for faculty grading and multi-department coursework at Sanjivani University.

| Feature Area | Release 3 Scope |
| :--- | :--- |
| **Instructor Role & Lab Sections** | Dedicated `INSTRUCTOR` role for assigning lab problem sets to specific Sanjivani divisions/batches. |
| **Academic Gradebook Exports** | One-click CSV/Excel exports mapping student `prn`, weekly solve counts (`>= 4/7`), and scores for lab internal assessment marks. |
| **Longitudinal Cohort Analytics** | Semester-wide topic mastery heatmaps and department-vs-department comparisons. |
