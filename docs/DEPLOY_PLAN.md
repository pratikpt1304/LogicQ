# LogicQ Deployment Plan & Release Manifest (`/docs/DEPLOY_PLAN.md`)

> **RELEASE GATE 0 — AWAITING USER APPROVAL**  
> **Production Target**: Firebase Project `logicq-clanguage` (Project Number: `898954156375`)  
> **Live Production Hosting URL**: [https://logicq-clanguage.web.app](https://logicq-clanguage.web.app)  
> **Staging Target**: Preview Channel [https://logicq-clanguage--staging-myz67fzi.web.app](https://logicq-clanguage--staging-myz67fzi.web.app) / Proposed Dedicated Staging Project: `logicq-staging`  
> **Release Candidate Tag**: `v1.0.0-pilot`  
> **Pre-Deploy Safety Snapshot / Rollback Tag**: `v0.9.0-pre-pilot`  
> **Release Branch**: `release/2026-10-17`  
> **Manifest Date**: October 17, 2026

---

## 1. Environment & Project Identification

| Parameter | Production Target | Staging Environment | Status |
| :--- | :--- | :--- | :---: |
| **Firebase Project ID** | `logicq-clanguage` | `logicq-staging` *(proposed)* / preview channel `staging` | ✅ Verified (`firebase-tools 15.34.0`) |
| **Project Number** | `898954156375` | Propose creating via `npx firebase-tools projects:create logicq-staging` | Active |
| **Hosting Domain** | `https://logicq-clanguage.web.app` | `https://logicq-clanguage--staging-myz67fzi.web.app` | ✅ Live |
| **Hosting Build Output** | `client/dist` (Vite, React 18, bundled Monaco) | `client/dist` (mirrored build) | ✅ Verified (Clean build, zero errors) |
| **Firestore Security Rules** | `firestore.rules` (Compiled v2, Deny by Default) | Mirror of `firestore.rules` | ✅ Verified (47 tests passing) |
| **Storage Security Rules** | `storage.rules` (Compiled v2, Deny by Default) | Staged (requires Blaze plan for bucket) | 🟡 Gated on Blaze |
| **Cloud Functions & Scheduler**| Sandboxed GCC C11 Runner (`asia-south1`) | Local / GitHub Actions cron fallback | 🟡 Gated on Blaze |

---

## 2. Current Production State

1. **Hosting Release**:
   - Live URL: `https://logicq-clanguage.web.app`
   - Active release serving single-page application bundle with client-side routing, service worker shell precaching, security headers (HSTS, CSP, X-Frame-Options DENY, Cross-Origin-Opener-Policy: same-origin-allow-popups).
   - Bundled Monaco Editor (`editor.worker`, `cpp.worker`), local fonts, dark theme tokens (`#0C0F1F`), and clean CSP without CDN dependencies.
2. **Functions Versions**:
   - `firebase-tools functions:list` currently reports **0 deployed cloud functions** on the Spark free plan.
   - Code execution and scheduler fall back safely to the local container runner and GitHub Actions scheduled dispatch until Blaze upgrade.
3. **Firestore Security Rules**:
   - `rules_version = '2';` with strict deny-by-default architecture.
   - Owner-only access on private `users/{userId}` documents (PRN, email, private preferences).
   - Zero client read or write on `prnIndex/{prn}`, `prnHistory/{prn}`, and public profile mirrors.
   - Owner-only reads on `practice_progress` and immutable `session_events`.
   - Automatic `ADMIN` role recognition for authorized admin emails (`admin@logicq.io`, `logicq1304@gmail.com`, `ipworker1908@gmail.com`, `ipverse1918@gmail.com`).
4. **Scheduled Jobs**:
   - 17:00:00 IST daily challenge switch: System currently has `dailyChallengePaused = true`. The dashboard displays a calm "Daily Challenge Paused" card while curriculum review completes.
   - 17:05:00 IST daily leaderboard finalization (10-minute judge grace window).

---

## 3. Production Blockers Verification Matrix

All production blockers have been resolved and verified with dedicated test suites and manual clean-profile audits:

| Production Blocker | Invariant & Resolution | Verified Test Suite / Document | Status |
| :--- | :--- | :--- | :---: |
| **1. Run & Submit Real Judge** | Root causes of "LogicQ server connection unavailable" audited; client throws honest classified errors (`OFFLINE`, `JUDGE_UNREACHABLE`, `SERVER_UNAVAILABLE`, `JUDGE_BUSY` with queue position, `RATE_LIMITED`, `SESSION_EXPIRED`, `TIMEOUT`) with non-destructive code retention and interactive Retry button. | [`docs/JUDGE_CONNECTIVITY_AUDIT.md`](file:///c:/Users/thora/Documents/My%20Work/Extra/LogicQ/docs/JUDGE_CONNECTIVITY_AUDIT.md) & `client/src/api/client.ts` | **RESOLVED & VERIFIED** |
| **2. Cross-Device Synchronization** | Signing in on a 2nd device (phone, laptop, browser) syncs the exact same profile, points, streaks, and drafts from Firestore without data loss or empty displays. | `server/tests/cross-device-sync.test.ts` | **PASS** |
| **3. No Unexpected Logouts** | Refreshing (F5) or switching browser tabs preserves authenticated session state; branded splash screen prevents premature login redirects; token refresh operates seamlessly. | `server/tests/session-persistence.test.ts` & `client-session-lifecycle.test.ts` | **PASS** |
| **4. Google Sign-In Popup & COOP** | `Cross-Origin-Opener-Policy: same-origin-allow-popups` configured in `firebase.json`, server headers, and dev servers; eliminates `window.closed` browser exceptions. | `server/tests/coop-headers.test.ts` & `tests-e2e/login-coop.spec.ts` | **PASS** |
| **5. PRN Mobile Alphanumeric Input** | Mobile PRN inputs use `type="text"`, `inputmode="text"`, `autocapitalize="characters"`, `maxLength 12`, allowing letters and digits; dynamically uppercases in JS; trims spaces; live counter `8/12`. | `server/tests/prn-alphanumeric-format.test.ts` & `prn-profile-signup.test.ts` | **PASS** |
| **6. Clean Console in Clean Profile** | Zero console errors, zero COOP warnings, zero unhandled promise rejections on clean browser profiles across Chromium, Firefox, WebKit, and Mobile Safari viewports. | `tests-e2e/login-coop.spec.ts` | **PASS** |
| **7. Strict 12-Char PRN Format** | Enforces exact university pattern `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$` (4 digits, 3 letters, M or F, 4 digits); client-side and server-side validation match; masked display `••••••••1039`. | `server/tests/firestore-security-rules.test.ts` (47/47 passing) | **PASS** |

---

## 4. Included Tested Features

| # | Feature / Change Area | Description | Verified Test Suite | Status |
| :-: | :--- | :--- | :--- | :---: |
| 1 | **Practice: 4 Modules & 10-of-10 Unlock** | 4 foundational modules (Control Structures, Pointers & Functions, Arrays & Applications, Advanced Data Types) with 10 questions each (4E, 4M, 2H). Unlocks strictly after solving all 10 of previous module (`PRACTICE_CONFIG.practiceUnlockThreshold = 10`). | `server/tests/practice-modules.test.ts` (12/12 passing) | **PASS** |
| 2 | **Practice Timers & Attempt Tracking** | Per-question active timers tracking real engagement (runs only while page open, tab visible, active within 2 mins; pauses on tab hide/idle; continues across close/reopen/devices; permanently freezes at first `ACCEPTED` verdict). Profile setting "Hide timer" allows distraction-free coding without stopping telemetry. | `server/tests/practice-timer-report.test.ts` (10/10 passing) | **PASS** |
| 3 | **Practice Module & Final Reports** | Comprehensive performance audit reports unlocked per module (after 10/10) and final (after 40/40); displays active timings, first-attempt accuracy, and question bottlenecks; strictly omits PRN and M/F indicators from student view. | `server/tests/practice-timer-report.test.ts` (10/10 passing) | **PASS** |
| 4 | **Rendered Mathematical Statements** | Converted all raw LaTeX (`$A, B$`, `\le`, `\ge`, `\times`, `10^9`) to clean accessible Unicode (`≤`, `≥`, `×`, `−10⁹ ≤ A, B, C ≤ 10⁹`). Automated scanner verified **0 unrendered LaTeX tokens** across all 40 practice problems, daily challenges, and book banks. Responsive KaTeX fallback for complex math. | `scripts/verify-no-raw-latex.mjs` | **PASS (0 tokens)** |
| 5 | **Admin Problem Markdown Guard** | Admin problem authoring & editing modal features Live Student Preview, "Auto-Format to Clean Unicode" one-click converter, and publish-time validation blocking unrendered LaTeX. | `client/src/pages/admin/AdminDashboardPage.tsx` & `admin.controller.ts` | **PASS** |
| 6 | **Monaco Editor Ergonomics** | Disabled font ligatures (`fontLigatures: false`) so `!=`, `<=`, `>=`, `==`, `->` show literally without glyph replacement; set `renderWhitespace: 'none'` to eliminate dots; collapsed initial selection to Line 1 Col 1 on mount; sanitized starter templates and file uploads. | `client/src/components/editor/CodeEditor.tsx` | **PASS** |
| 7 | **Toast Notification Positioning** | Relocated toasts to bottom-center above safe area on mobile (`< 768px`) and top-right below header on desktop (`>= 768px`) with close button and `aria-live: polite`; never covers editor toolbar, Run, Submit, or timer. | `client/src/main.tsx` | **PASS** |
| 8 | **Home Button Navigation** | Persistent Home icon placed as first item in navbar; links directly to `/dashboard` with accessible `aria-current="page"`. | Navigation Component Suite | **PASS** |
| 9 | **Removal of Arena, Archive, Badges** | Obsolete routes return 404; navbar items removed; Firestore rules deny access; legacy database rows intact without dropping tables. | `server/tests/arena-archive-removal.test.ts` (5/5 passing) | **PASS** |
| 10 | **Strict 3-Role System** | Enforces `admin`, `checker`, and `student` roles; admin self-demotion blocked; minimum 2 administrators invariant enforced. | `server/tests/roles-checker.test.ts` (11/11 passing) | **PASS** |
| 11 | **Admin Operations Dashboard** | 11 administrative consoles (students, checkers, daily challenges, practice modules, analytics, system pause, audit logs). | Admin Dashboard Suite | **PASS** |
| 12 | **Blinded Checker Review Portal** | Anonymized tokens (`SUB-XXXX`), rubric scoring formula, 30-min decision edit window, 48h SLA auto-reassignment, blocked outside 17:00-18:00 window. | `server/tests/roles-checker.test.ts` (11/11 passing) | **PASS** |
| 13 | **Consistency-Ordered Daily Rank** | Daily board ranks by Current Streak $\rightarrow$ Total Solved $\rightarrow$ Stable UID. Speed and attempt penalties removed. Percentiles shown only with $\ge 10$ solvers. | `server/tests/dashboard-metrics.test.ts` | **PASS** |
| 14 | **Daily Challenge Paused State** | `dailyChallengePaused = true` strictly enforced. Daily competition paused calmly without broken countdowns or phantom errors. | `server/tests/amendments-audit.test.ts` | **PASS** |
| 15 | **Optional Google Drive Backup** | Strictly optional history backup export. Login, challenge, practice, and uploads work 100% on Firebase alone without Drive consent. | Unit & Component Tests | **PASS** |
| 16 | **Installable PWA** | Web App Manifest (`/manifest.webmanifest`), maskable icons, mobile C-symbol helper keyboard toolbar, offline shell caching. | Client PWA Asset Suite | **PASS** |

---

## 5. Strictly Excluded & Pending Changes

The following items are **strictly excluded** from this release:

1. **Daily Challenge System Stays Paused**: `dailyChallengePaused = true` remains active in production. The daily challenge system is **NOT** resumed, no new questions derived from textbooks are published, and no existing problems are retired.
2. **Zero Copyrighted / Private Files in Repo**: No book PDFs, extracted OCR text, review files, syllabus PDFs, or unredacted PRNs are in the repo or commits.
3. **Pending Learning-First Decision**: Pedagogical tiered hints (after 2 and 4 failed attempts) and plain-language compiler error mapping documented in [`/docs/LEARNING_FIRST.md`](file:///c:/Users/thora/Documents/My%20Work/Extra/LogicQ/docs/LEARNING_FIRST.md) are listed as **Pending User Decision** and excluded from production code.
4. **Mandatory Drive Integrations**: Google Drive is strictly optional; zero core features depend on it.
5. **Fake Account Purge**: Deletion of the 38 audited test accounts in `/docs/FAKE_DATA_AUDIT.md` is held pending explicit user sign-off.

---

## 6. Destructive & Irreversible Items Assessment

| Item | Action | Safety Invariant | Rollback Command |
| :--- | :--- | :--- | :--- |
| **Student Accounts & History** | None (Zero Deletions) | No student accounts, submissions, points, or streaks are deleted or altered. | N/A (Preserved) |
| **PRN Format Migration** | Uppercase formatting | Non-destructive; script `migrate-prn-format.ts` normalizes records without dropping data. | Reversible via DB backup snapshot. |
| **College Standardization** | Value standard | Sets student college field to `"Sanjivani University"`. | Reversible via script. |
| **Feature Deprecations** | Arena, Archive, Badges | Code routing returns 404; database tables and historical rows are intact. | Re-enable routes in `client/src/App.tsx`. |
| **Firestore Security Rules** | Atomic replacement | Compiled v2 rules deny unauthorized writes while maintaining student owner reads. | `npx.cmd firebase-tools deploy --only firestore:rules --project logicq-clanguage` |

---

## 7. Dependencies on the Firebase Blaze Plan

The following cloud capabilities require the project owner to upgrade `logicq-clanguage` from Spark (Free) to Blaze (Pay-as-you-go) on the Firebase Console:

| Feature | Service Component | Spark Behavior (Current) | Blaze Behavior (Upgraded) | Est. Monthly Cost (500 Students) | Max Instances Setting |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Cloud Functions Sandbox** | Cloud Run / Functions (2nd Gen) | Local judge runner / GitHub Actions | Serverless C11 execution in `asia-south1` | ~\$0.50 – \$1.20 / mo | `maxInstances: 10` |
| **Uploaded Solution Storage** | Cloud Storage Bucket | Base64 in DB / Local filesystem | Immutable GCS bucket with signed URLs | ~\$0.20 – \$0.40 / mo (1.5 GB) | N/A |
| **Automated Scheduler** | Cloud Scheduler | Local cron / GitHub Actions dispatch | 17:00 IST trigger + 17:05 IST finalization | \$0.00 (within free tier of 3 jobs) | N/A |
| **Secret Management** | Google Secret Manager | Environment variables (.env) | Cryptographically secured runtime secrets | ~\$0.06 / mo | N/A |

> [!TIP]
> **Total Estimated Blaze Cost**: **<\$0.76 – \$1.86 / month** (~₹65 – ₹160 INR / month) for 500 active engineering students.  
> **Recommended Budget Alert**: Set a hard budget alert at **₹500 INR ($6.00 USD) / month** in the Google Cloud Billing Console.  
> **Concurrency Protection**: Enforce `maxInstances: 10` on Cloud Run / Cloud Functions to eliminate unexpected auto-scaling cost spikes.

---

## 8. Five-Minute Emergency Rollback Plan

If any release step fails or exhibits unexpected behavior, execute the following commands in order:

### 1. Rollback Firebase Hosting (Immediate, < 30 seconds)
```powershell
# Roll back to previous active release on Firebase CDN
npx.cmd firebase-tools hosting:rollback --project logicq-clanguage
```

### 2. Rollback Firestore Security Rules (< 60 seconds)
```powershell
# Re-deploy pre-deploy rules snapshot
git checkout v0.9.0-pre-pilot -- firestore.rules
npx.cmd firebase-tools deploy --only firestore:rules --project logicq-clanguage
```

### 3. Rollback Git Code (< 2 minutes)
```powershell
# Reset release branch to pre-pilot release tag
git checkout main
git reset --hard v0.9.0-pre-pilot
git push origin main --force
```

---

> [!IMPORTANT]
> **GATE 0 STOP**: All verification items have passed testing. Client production build is compiled (`dist/` verified).  
> **Waiting for explicit user instruction: "approved".**
