# LogicQ Launch-Readiness & Architectural Audit (`/docs/LAUNCH_READINESS.md`)

**Date**: October 13, 2026  
**Auditor**: Antigravity Autonomous Pair Programmer  
**Target Repository**: `LogicQ` (`main` / `refactor/daily-system-architecture`)  
**Target Deployment**: Firebase Hosting (`logicq-clanguage.web.app`) & Central Backend Service  
**Execution Environment**: Windows PowerShell, Node.js v24.20.0, GCC 13.2.0, Vitest v2.1.9, Firebase SDK v13.0.0  

---

## 1. Executive Summary & Verdict

### Final Launch Decision: **🔴 NO-GO FOR IMMEDIATE CAMPUS PRODUCTION** / **🟡 GO FOR CONTROLLED SANDBOX STAGING**

| Pillar | Status | Core Justification |
| :--- | :---: | :--- |
| **1. Business Logic & Invariants** | 🟢 **PASS** | 190 / 190 Vitest tests pass across 25 suites; 32 / 32 Firestore rule tests pass; 6 / 6 malicious code execution tests pass. |
| **2. Client Web Build & Bundle** | 🟢 **PASS** | `tsc && vite build` builds in 45s with zero TypeScript or asset bundling errors. Monaco editor bundled locally without CDN dependencies. |
| **3. Central Backend & Cloud Judge** | 🔴 **BLOCKER** | The Express backend + C11 GCC judge runs strictly on `localhost:5000` or local dev machines. On Firebase Hosting (`logicq-clanguage.web.app`), requests to `/api` return `index.html` (rewrite fallback); code submissions fail closed because no containerized backend is deployed to Cloud Run or Render. |
| **4. Problem Content Leakage** | 🔴 **BLOCKER** | 17 daily problems in `server/src/data/kanetkar-book-bank.ts` contain literal citations to Yashavant Kanetkar and *Test Your C Skills* in student-facing Markdown descriptions and test fixtures, violating the zero-student-leakage invariant. |
| **5. Student Legal & Help Pages** | 🟡 **DEFICIT** | Missing student-facing routes for Terms of Service (`/terms`), Rules (`/rules`), How it Works (`/how-it-works`), FAQ (`/faq`), and Support Contact. |
| **6. Operational Cloud Controls** | 🔴 **BLOCKED (USER)** | Requires project owner actions: GCP Blaze plan upgrade, ₹500 budget alert, 2nd Firebase Owner, and App Check enrollment. |

---

## 2. Reality Check: Feature-by-Feature Implementation Status

| Feature / Subsystem | Implementation Status | Test Coverage | Production Verification & Reality |
| :--- | :---: | :---: | :--- |
| **Run & Submit with Real C11 Judge** | **Partly Implemented** | Tested locally (190 passing tests, 6 malicious suites) | `LocalGccJudge` runs locally via GCC CLI. In production Firebase Hosting, `/api` has no server backend; client fallback engine deliberately fails closed (`Code execution service is temporarily unavailable`). Requires Cloud Run deployment. |
| **Practice Module Track (40 Problems)** | **Implemented & Tested** | 12 tests in `practice-modules.test.ts` passing | 4 modules (10 problems each: 4 Easy, 4 Medium, 2 Hard). Sequential unlock at $\ge 7$ solves strictly enforced. Zero impact on daily streaks/rank. |
| **File Uploads & Checker Portal** | **Implemented & Tested** | Tested locally in `roles-checker.test.ts` & `amendments-audit.test.ts` | 3 files, 5 MB cap, magic bytes validated, EXIF stripped, `PENDING_REVIEW` state, blind checker review at `/checker/reviews`. Storage rules ready. |
| **Daily Competition & Cutoff (17:00 IST)** | **Implemented & Tested** | 7 tests in `single-question-window.test.ts` passing | Single visible question window (`17:00:00` to `16:59:59.999 IST`). Pre-cutoff submissions finishing after 17:00 IST judged and credited properly. |
| **Daily Finalization Job (17:05 IST)** | **Implemented & Tested** | 13 tests in `admin-daily-results.test.ts` passing | 10-minute grace window until 17:10 IST for in-flight jobs. Idempotent snapshot generation, per-student summaries, and correction records. |
| **System Pause & Resume (`dailyChallengePaused`)** | **Implemented & Tested** | 13 tests in `daily-system-pause.test.ts` passing | Safe pause active by default. Daily endpoints return calm notice; countdown suppressed; streaks preserved; admin re-auth resume required. |
| **3-Role Authorization (`student`, `checker`, `admin`)** | **Implemented & Tested** | Tested across rules and controllers (32 rule tests) | Strict 3-role hierarchy. Checkers restricted to blind upload reviews; admins have complete oversight; students barred from admin/checker portals. |
| **12-Char Alphanumeric PRN & 30-Day Change** | **Implemented & Tested** | 17 tests across `prn-alphanumeric-format.test.ts` & `prn-monthly-change.test.ts` | Regex `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`, `••••••••1039` masking, atomic `prnIndex` reservation, 30-day cooldown with free first correction. |
| **Session Persistence & Event Telemetry** | **Implemented & Tested** | 12 tests in `session-persistence.test.ts` & `client-session-lifecycle.test.ts` | Admin 30-min idle timeout, Student 7-day idle timeout, multi-device cross-login allowed, explicit reason logging in `session_events`. |
| **Installable Mobile PWA** | **Implemented & Tested** | PWA manifest, service worker & icons verified | Manifest configured (`standalone`, `#0C0F1F` dark / `#F4F6FB` light), prompt update banner, mobile C symbol toolbar, network-only auth/API. |
| **Admin Operations Dashboard** | **Implemented & Tested** | 13 tests in `admin-daily-results.test.ts` passing | 11 operational pages: Daily Results, Submissions, Challenges, Upload Reviews, Checkers, Students, Reports, Support, System, Audit Log, Settings. |
| **WebSocket / Socket.IO Integration** | **Superseded / Removed** | Verified in `amendments-audit.test.ts` & `SocketContext.tsx` | Socket.IO was removed from client bundle (`noopSocket` stub) and replaced with TanStack Query polling to avoid CSP violations on Firebase Hosting. |

---

## 3. Spec Conflicts & Consolidated Truth

### A. Superseded Rules Cleaned Up
1. **Weekly Wording vs. Daily System**: All leftover occurrences of "weekly job status", "weekly rankings", and "weekly points" in `/docs/MASTER_SPEC.md` and admin pages have been eliminated and aligned with the **Daily Competition** and **Daily Results** architecture.
2. **Old Roles**: Simplified strictly to `admin`, `checker`, `student` (deprecated multi-tier Owner/Reviewer/Faculty).
3. **PRN Definition**: Unified to 12-character alphanumeric `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$` with 8-bullet masking (`••••••••1039`).
4. **Single Question Window**: Exactly 1 daily question visible at a time. Ended challenges return 410 with zero problem statement.

### B. Proposed Feature Freeze
The platform enters an institutional **Feature Freeze** for the pilot launch:
- **Locked**: Daily 17:00 IST competition cycle, 40 Practice problems across 4 modules, 12-char PRN structure, 30-day cooldown, 3-role permissions, dual-theme styling tokens, and session telemetry.
- **Allowed**: Content wording hygiene (author citation removal), adding student help/legal pages, and Cloud Run production infrastructure scripts.

---

## 4. Content Audit: Daily Pool & Practice Curriculum

### A. Practice Curriculum (40 Problems)
- **Module 1 (Control Structures)**: 10 problems (4 Easy, 4 Medium, 2 Hard) — **Validated, non-duplicate, zero source references**.
- **Module 2 (Pointers & Functions)**: 10 problems (4 Easy, 4 Medium, 2 Hard) — **Validated, non-duplicate, zero source references**.
- **Module 3 (Arrays & Applications)**: 10 problems (4 Easy, 4 Medium, 2 Hard) — **Validated, non-duplicate, zero source references**.
- **Module 4 (Advanced Data Types & Dynamic Memory)**: 10 problems (4 Easy, 4 Medium, 2 Hard) — **Validated, non-duplicate, zero source references**.
- **Verification**: Verified via `server/tests/practice-modules.test.ts`. All 40 problems have separate sample and hidden test cases, compile cleanly, and yield zero leakages.

### B. Daily Challenge Pool (`server/src/data/kanetkar-book-bank.ts`)
- **Total Count**: **17 Problems** (Sufficient for a 14-day pilot with 3 backup days).
- **Audit Defect (CRITICAL)**: In 14 of the 17 problems, the `description` string explicitly contains citations such as:
  - `(Yashavant Kanetkar, *Test Your C Skills*, Chapter 1: Declarations and Initializations)`
  - `(Yashavant Kanetkar, *Test Your C Skills*, Chapter 6: The C Preprocessor, Q 6.4, Q 6.23)`
  - Problem 10 contains `'Kanetkar\n4\ntkar\n'` in test input.
- **Remediation Required**: Strip all book/author citations from `description` and test inputs prior to public student unpause. Retain citations strictly within admin-only `sourceRef` metadata.

---

## 5. Security & Compiler Sandbox Re-Verification

### A. Test Execution Evidence
- **Vitest Backend Test Suite**: **25 / 25 test files passed (190 / 190 tests)** in 56.41s.
- **Firestore Security Rules**: **1 / 1 file passed (32 / 32 tests)**.
- **Judge Malicious Code Tests (`tests/judge-malicious.test.ts`)**: **6 / 6 tests passed**:
  1. `MALICIOUS 1 (Infinite Loop)`: Terminated strictly within time limit (`TIME_LIMIT_EXCEEDED`).
  2. `MALICIOUS 2 (Stack Bomb / Unbounded Recursion)`: Terminated safely without host disruption (`RUNTIME_ERROR`).
  3. `MALICIOUS 3 (Secret File Access)`: Read attempts on host system files (`/etc/passwd`, `C:\Windows`) rejected or sandboxed (`SECURITY_VIOLATION` / `RUNTIME_ERROR`).
  4. `MALICIOUS 4 (Stdout Flood)`: Truncated safely at 64 KB cap.
  5. `MALICIOUS 5 (Division by Zero)`: Handled gracefully (`RUNTIME_ERROR`).
  6. `MALICIOUS 6 (Non-Zero Exit Code)`: Handled gracefully (`RUNTIME_ERROR`).

### B. Production Environment Configuration Audit
- `client/.env`: Contains `VITE_API_URL=http://localhost:5000/api`. In production, this must point to the secure HTTPS Cloud Run endpoint.
- `firebase.json`: Strict CSP header configured. No `unsafe-eval` in script-src. Worker-src configured with `'self' blob:`.

---

## 6. Operations, Reliability & Runbooks

| Area | Status | Evidence & Runbook Location | Owner Action Needed |
| :--- | :---: | :--- | :--- |
| **Point-in-Time Recovery (PITR)** | 🟢 Verified Doc | Documented in `/docs/BACKUP_RESTORE.md` (7-day microsecond restore) | Enable via `gcloud firestore databases update --point-in-time-recovery-enable` |
| **Backup / Restore Drill** | 🟢 Documented | Documented in `/docs/BACKUP_RESTORE.md` | Run export test to `gs://logicq-prod-backups` |
| **Two Admins & Two Firebase Owners** | 🔴 Untested in Prod | System warns if only 1 admin; requires 2 GCP IAM Owners | Project Owner must assign 2nd owner in Google Cloud IAM |
| **Budget Alerts & Max Instances** | 🔴 Untested in Prod | Budget caps defined in `/docs/CAPACITY_PLAN.md` | Configure ₹500 budget alert in Google Cloud Billing |
| **17:00 IST Spike Runbook** | 🟢 Documented | `/docs/CAPACITY_PLAN.md` (Cloud Run max 10 instances, concurrency 80) | Pre-warm instances 16:55–17:15 IST |
| **Judge Failure Runbook** | 🟢 Documented | `/docs/MAINTENANCE.md` (Fails closed; submissions queued safely) | Monitor judge queue latency on `/admin/system` |
| **Daily Finalization Failure Runbook** | 🟢 Documented | `/docs/DAILY_SYSTEM.md` & `/docs/ADMIN_DESIGN.md` (Idempotent re-run) | Admin can trigger manual re-run with re-auth from `/admin/weekly` |

---

## 7. Product Gaps & Non-Disruptive Solutions

| Missing Element | Current Reality | Non-Disruptive Solution |
| :--- | :--- | :--- |
| **Terms of Service (`/terms`)** | Route missing; redirects to 404 | Add lightweight Markdown-rendered `/terms` page covering academic honesty and fair play. |
| **Platform Rules (`/rules`)** | Described in spec; missing dedicated route | Add `/rules` summarizing: 17:00 cutoff, 1 solve/day, 1 freeze/7 days, Practice separation. |
| **How It Works (`/how-it-works`)** | Only `/how-to-install` PWA guide exists | Add concise visual guide explaining the daily rhythm, editor tools, and daily rank. |
| **FAQ (`/faq`)** | Missing dedicated route | Add collapsible FAQ addressing streaks, PRN changes, scoring, and upload grading. |
| **Support Contact** | In-app debug log reports only | Add email support anchor (`support@logicq.io` or department faculty coordinator). |
| **Pause State Message** | Fully implemented in UI and endpoints | Displays calm neutral notice: *"Daily challenges are not live yet. We will announce the start."* |
| **Ended Challenge Feedback** | Fully implemented | Displays calm 410 screen: *"This challenge has ended. Head to today's active challenge."* |

---

## 8. Privacy & Legal Compliance Checklist (DPDP & Institutional)

1. **Personal Data Inventory**:
   - Stored centrally: Email, 12-char PRN, Full Name (optional), Department, Year, Division, hashed passwords (local DB), IP address (security audit log), user agent.
   - Private tokens: Student Google Drive tokens stay strictly in client memory/browser session; backend never receives Drive tokens.
2. **Student Consent**:
   - Checkbox at registration acknowledging academic guidelines and code review participation.
3. **Data Retention & Deletion**:
   - Implemented self-service "Delete my account" under Profile Settings.
   - Deletion removes user profile, submissions, uploads, and frees the `prnIndex` reservation.
4. **Minors (< 18 Years)**:
   - College undergraduate students are typically 18–22. A student consent statement confirms university student status.
5. **Institutional Approval**:
   - Sanjivani University institutional approval for hosting student coding competition under faculty supervision.

---

## 9. 14-Day Pilot Plan

- **Cohort Size**: 50–75 First Year (FY) and Second Year (SY) AIML & Computer Engineering students.
- **Duration**: Exactly 14 Days (2 rolling freeze cycles).
- **Primary Success Metrics**:
  - Daily Participation Rate: $\ge 60\%$ daily active solvers.
  - Zero false-positive judge timeouts.
  - Zero PII leaks (PRN masked everywhere to `••••••••1039`).
  - Graceful handling of the 16:55–17:05 IST rush.
- **Rollback Procedure**:
  - Firebase Hosting instant rollback: `firebase hosting:rollback --project logicq-clanguage`.
  - Daily pause switch: Admin activates `dailyChallengePaused = true` in `/admin/settings` if any competition flaw arises.

---

## 10. Prioritized Blockers & Action Items Table

| # | Priority | Area | Issue Description | Remediation Plan | Owner |
| :-: | :---: | :--- | :--- | :--- | :---: |
| **B1** | 🔴 P0 | **Production Deployment** | Express API & GCC Judge exist only locally; Firebase Hosting serves static frontend with no active `/api` backend. | Deploy backend container to Cloud Run (or Render) and set `VITE_API_URL` to the HTTPS backend domain in production builds. | **User / DevOps** |
| **B2** | 🔴 P0 | **Content Integrity** | 14 daily problem descriptions in `kanetkar-book-bank.ts` contain literal citations to the author and textbook. | Strip all author and book citations from the Markdown descriptions and test fixtures; retain citations strictly in admin `sourceRef`. | **Agent** |
| **B3** | 🟡 P1 | **Student Legal/Help Pages** | Missing routes for `/terms`, `/rules`, `/how-it-works`, `/faq`, and support contact link in footer. | Create static pages using existing Markdown renderer and add footer navigation links. | **Agent** |
| **B4** | 🔴 P1 | **GCP Blaze & Budget Alerts** | Firebase project requires Blaze plan upgrade for Cloud Functions, Cloud Run, and Storage rules. | Upgrade `logicq-clanguage` to Blaze plan, configure ₹500 budget alert, and assign 2nd Owner. | **User** |
| **B5** | 🟡 P2 | **App Check Enrollment** | Firebase App Check not yet enrolled with reCAPTCHA Enterprise. | Register site key in Firebase Console and set `VITE_FIREBASE_APPCHECK_SITE_KEY`. | **User** |
| **B6** | 🟢 P2 | **Feature Freeze Enforcement** | Code and specs must remain locked against non-essential refactors during pilot. | Formally declared in `/docs/MASTER_SPEC.md` Section 9. | **Complete** |

---

## 11. Final Verification Stamp

- **Total Test Files**: 25 Passed
- **Total Tests**: 190 Passed
- **Security Rule Tests**: 32 Passed
- **Judge Sandboxing Tests**: 6 Passed
- **Client Build**: Clean (`dist/` generated, 0 TypeScript errors)
- **Status Verdict**: **Ready for Pilot Deployment once Blockers B1 (Cloud Run backend) and B2 (Book text stripping) are resolved.**
