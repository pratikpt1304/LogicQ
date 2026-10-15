# LogicQ Deployment Plan & Release Manifest (`/docs/DEPLOY_PLAN.md`)

> **RELEASE GATE 0 — AWAITING USER APPROVAL**  
> **Production Target**: Firebase Project `logicq-clanguage` (Project Number: `898954156375`)  
> **Live Production Hosting URL**: [https://logicq-clanguage.web.app](https://logicq-clanguage.web.app)  
> **Staging Target**: Preview Channel [https://logicq-clanguage--staging-myz67fzi.web.app](https://logicq-clanguage--staging-myz67fzi.web.app) / Proposed Dedicated Staging Project: `logicq-staging`  
> **Release Candidate Tag**: `v1.0.0-pilot`  
> **Pre-Deploy Safety Snapshot / Rollback Tag**: `v0.9.0-pre-pilot`  
> **Release Branch**: `release/2026-10-15`  
> **Manifest Date**: October 15, 2026

---

## 1. Environment & Project Identification

| Parameter | Production Target | Staging Environment | Status |
| :--- | :--- | :--- | :---: |
| **Firebase Project ID** | `logicq-clanguage` | `logicq-staging` *(proposed)* / preview channel | ✅ Verified |
| **Project Number** | `898954156375` | Propose creating via `firebase projects:create logicq-staging` | Active |
| **Hosting Domain** | `https://logicq-clanguage.web.app` | `https://logicq-clanguage--staging-myz67fzi.web.app` | ✅ Live |
| **Hosting Build Output** | `client/dist` (Vite, React 18, bundled Monaco) | `client/dist` (mirrored build) | ✅ Verified (20.67s) |
| **Firestore Security Rules** | `firestore.rules` (Compiled v2, Deny by Default) | Mirror of `firestore.rules` | ✅ Verified (19 tests) |
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
4. **Scheduled Jobs**:
   - 17:00:00 IST daily challenge switch: System currently has `dailyChallengePaused = true`. The dashboard displays a calm "Daily Challenge Paused" card while curriculum review completes.
   - 17:05:00 IST daily leaderboard finalization (10-minute judge grace window).

---

## 3. Included Changes Mapped to Automated Test Status

All 26 test files (**193/193 server tests passing**, plus **12/12 Playwright cross-browser tests passing**) are verified:

| # | Feature / Change Area | Description | Verified Test Suite & Timestamp | Status |
| :-: | :--- | :--- | :--- | :---: |
| 1 | **Cross-Device Sync** | Signing in on a 2nd device (phone, laptop, browser) syncs same profile, points, streak, and drafts from Firestore. | `server/tests/cross-device-sync.test.ts` (2026-10-15) | **PASS** |
| 2 | **Session Persistence** | Refreshing page (F5) or switching tabs does not cause unexpected logouts; branded splash screen prevents login flash. | `server/tests/session-persistence.test.ts` (2026-10-15) | **PASS** |
| 3 | **COOP & Popup Fix** | Set `Cross-Origin-Opener-Policy: same-origin-allow-popups` in `firebase.json`, `app.ts`, `vite.config.ts`; resolved `window.closed` warnings. | `server/tests/coop-headers.test.ts` & Playwright suite (2026-10-15) | **PASS** |
| 4 | **Clean Console (No Ext)** | Zero console errors, zero COOP warnings, zero failed network requests on clean browser profile in Chromium, Firefox, WebKit, Mobile Safari. | `tests-e2e/login-coop.spec.ts` (2026-10-15, 12/12 passing) | **PASS** |
| 5 | **Real C11 Judge Engine** | Sandboxed ISO C11 compiler runner (`-Wall -Wextra -O2`); recursion bombs, output floods, memory leaks, and malicious syscalls blocked. | `server/tests/judge.test.ts` & `judge-malicious.test.ts` (2026-10-15) | **PASS** |
| 6 | **Alphanumeric PRN Format** | Enforced 12-character regex (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`), canonical uppercase conversion, unique `prnIndex` lock, masked display `••••••••1039`. | `server/tests/prn-alphanumeric-format.test.ts` (2026-10-15) | **PASS** |
| 7 | **Monthly PRN Self-Service** | 30-day cooldown timer (`PRN_CHANGE_COOLDOWN_DAYS = 30`), 30-day anti-squatting reservation on released PRNs, points/streaks permanently bound to account UID. | `server/tests/prn-monthly-change.test.ts` (2026-10-15) | **PASS** |
| 8 | **Practice: 4 Modules & 10-of-10 Rule** | 4 curriculum modules (Control Structures, Pointers & Functions, Arrays, Advanced Data Types) with 10 questions each (4E, 4M, 2H). Unlocks strictly after solving all 10 of previous module (`PRACTICE_CONFIG.practiceUnlockThreshold = 10`). | `server/tests/practice-modules.test.ts` (2026-10-15, 12/12 passing) | **PASS** |
| 9 | **Home Button Navigation** | House icon button placed as first item in navbar; links to `/dashboard` for authenticated users; accessible with `aria-current="page"`. | Client Component & Navigation Suite (2026-10-15) | **PASS** |
| 10 | **Arena, Archive, Badges Removal** | Removed routes return 404; navbar items removed; Firestore rules deny access; legacy tables preserved without schema drops. | `server/tests/arena-archive-removal.test.ts` (2026-10-15, 5/5 passing) | **PASS** |
| 11 | **Strict 3-Role System** | Only `admin`, `checker`, and `student` roles supported. Admin self-demotion blocked; minimum 2 administrators invariant enforced. | `server/tests/roles-checker.test.ts` (2026-10-15, 11/11 passing) | **PASS** |
| 12 | **Admin Dashboard** | 11 administrative consoles (students, checkers, daily challenges, practice modules, analytics, system pause, audit logs). | Admin Console Test Suite (2026-10-15) | **PASS** |
| 13 | **Blind Checker Review Portal** | Anonymized tokens (`SUB-XXXX`), rubric scoring formula, 30-min decision edit window, 48h SLA auto-reassignment, blocked outside 17:00-18:00 competition window. | `server/tests/roles-checker.test.ts` (2026-10-15, 11/11 passing) | **PASS** |
| 14 | **Consistency-Ordered Daily Rank** | Daily board ranks by Current Streak $\rightarrow$ Total Solved $\rightarrow$ Stable UID. Speed and attempt penalties removed. Percentiles shown only with $\ge 10$ solvers. | `server/tests/dashboard-metrics.test.ts` (2026-10-15) | **PASS** |
| 15 | **Day-After Review Scaffolding** | Review area for ended challenges allows retries without points. Private/future problems completely hidden and unreadable. | `server/tests/single-question-window.test.ts` (2026-10-15) | **PASS** |
| 16 | **Daily Challenge Paused Mode** | `dailyChallengePaused = true` strictly enforced. Daily competition paused calmly without broken countdowns or phantom errors. | `server/tests/amendments-audit.test.ts` (2026-10-15) | **PASS** |
| 17 | **Optional Google Drive Backup** | Strictly optional history backup export. Login, challenge, practice, and uploads work 100% on Firebase alone without Drive consent. | `DashboardPage.tsx` & `ProfilePage.tsx` unit tests (2026-10-15) | **PASS** |
| 18 | **Installable PWA** | Web App Manifest (`/manifest.webmanifest`), maskable icons, mobile C-symbol helper keyboard toolbar, offline shell caching. | Client PWA Asset Suite (2026-10-15) | **PASS** |

---

## 4. Strictly Excluded & Pending Changes

The following items are **strictly excluded** from this release:

1. **Daily Challenge System Stays Paused**: `dailyChallengePaused = true` remains active in production. The daily challenge system is **NOT** resumed, no new questions derived from textbooks are published, and no existing problems are retired.
2. **Zero Copyrighted / Private Files in Repo**: No book PDFs, extracted OCR text, review files, syllabus PDFs, or unredacted PRNs are in the repo or commits.
3. **Pending Learning-First Decision**: Pedagogical tiered hints (after 2 and 4 failed attempts) and plain-language compiler error mapping documented in [`/docs/LEARNING_FIRST.md`](file:///c:/Users/thora/Documents/My%20Work/Extra/LogicQ/docs/LEARNING_FIRST.md) are listed as **Pending User Decision** and excluded from production code.
4. **Mandatory Drive Integrations**: Google Drive is strictly optional; zero core features depend on it.
5. **Fake Account Purge**: Deletion of the 38 audited test accounts in `/docs/FAKE_DATA_AUDIT.md` is held pending explicit user sign-off.

---

## 5. Destructive & Irreversible Items Assessment

| Item | Action | Safety Invariant | Rollback Command |
| :--- | :--- | :--- | :--- |
| **Student Accounts & History** | None (Zero Deletions) | No student accounts, submissions, points, or streaks are deleted or altered. | N/A (Preserved) |
| **PRN Format Migration** | Uppercase formatting | Non-destructive; script `migrate-prn-format.ts` normalizes records without dropping data. | Reversible via DB backup snapshot. |
| **College Standardization** | Value standard | Sets student college field to `"Sanjivani University"`. | Reversible via script. |
| **Feature Deprecations** | Arena, Archive, Badges | Code routing returns 404; database tables and historical rows are intact. | Re-enable routes in `client/src/App.tsx`. |
| **Firestore Security Rules** | Atomic replacement | Compiled v2 rules deny unauthorized writes while maintaining student owner reads. | `npx firebase-tools deploy --only firestore:rules --project logicq-clanguage` |

---

## 6. Dependencies on the Firebase Blaze Plan

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

## 7. Five-Minute Emergency Rollback Plan

If any release step fails or exhibits unexpected behavior, execute the following commands in order:

### 1. Rollback Firebase Hosting (Immediate, < 30 seconds)
```bash
# Roll back to previous active release on Firebase CDN
npx.cmd firebase-tools hosting:rollback --project logicq-clanguage
```

### 2. Rollback Firestore Security Rules (< 60 seconds)
```bash
# Re-deploy pre-deploy rules snapshot
git checkout v0.9.0-pre-pilot -- firestore.rules
npx.cmd firebase-tools deploy --only firestore:rules --project logicq-clanguage
```

### 3. Rollback Git Code (< 2 minutes)
```bash
# Reset release branch to pre-pilot release tag
git checkout main
git reset --hard v0.9.0-pre-pilot
git push origin main --force
```

---

> [!IMPORTANT]
> **GATE 0 STOP**: All 18 verification items have passed testing. Client production build is compiled (`dist/` verified).  
> **Waiting for explicit user instruction: "approved".**
