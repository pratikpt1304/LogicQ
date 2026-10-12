# LogicQ Deployment Plan & Release Verification (`/docs/DEPLOY_PLAN.md`)

> **RELEASE GATE 0 — AWAITING USER APPROVAL**  
> **Production Target**: Firebase Project `logicq-clanguage`  
> **Live Production URL**: `https://logicq-clanguage.web.app`  
> **Staging Target**: Preview Channel `https://logicq-clanguage--staging-myz67fzi.web.app` (on `logicq-clanguage`) and proposal for dedicated staging project `logicq-staging`  
> **Release Branch**: `release/2026-10-12`  
> **Release Tag**: `v1.0.0-pilot`  
> **Pre-Deploy Rollback Tag**: `v0.9.0-pre-pilot`

---

## 1. Environment & Project Identification

| Parameter | Production Target | Staging Environment | Status |
| :--- | :--- | :--- | :---: |
| **Firebase Project ID** | `logicq-clanguage` | `logicq-staging` *(proposed)* / preview channel | Connected & Verified |
| **Project Number** | `898954156375` | Propose creating via `firebase projects:create logicq-staging` | Active |
| **Hosting Domain** | `https://logicq-clanguage.web.app` | `https://logicq-clanguage--staging-myz67fzi.web.app` | Live |
| **Current Live Hosting** | Deployed (`client/dist` v1.0.0, 15 files) | Live preview channel (expires 2026-10-19) | Active |
| **Firestore Security Rules** | Compiled `rules_version = '2';` (Deny by default) | Mirror of `firestore.rules` | Ready |
| **Storage Security Rules** | Staged in `storage.rules` (Deny by default) | Requires Blaze plan bucket | Ready |
| **Cloud Functions & Scheduler**| 🔴 Staged locally (Blocked on Blaze plan) | 🔴 Staged locally (Blocked on Blaze plan) | Gated |

---

## 2. Current Production State

1. **Hosting Release**:
   - Live URL: `https://logicq-clanguage.web.app`
   - Active release serving single-page application bundle with client-side routing, service worker shell precaching, security headers (HSTS, CSP, X-Frame-Options DENY).
2. **Functions Versions**:
   - `firebase-tools functions:list` reports no deployed cloud functions on Spark plan.
   - Judge daemon, scheduled unlock jobs (`0 17 * * *`), and weekly result jobs (`5 17 * * 1`) currently run in local Node server runtime / GitHub Actions cron fallback.
3. **Rules Versions**:
   - `firestore.rules`: Version 2 (`rules_version = '2';`), deny-by-default architecture, client write denial on `prnIndex`, `prnHistory`, `practice_progress`, and public profiles; student owner-only reads on `users/{userId}`.
   - `storage.rules`: Version 2, deny-by-default, student write allowed only to own upload path with mime-type and 5MB size limits.
4. **Scheduled Jobs**:
   - 17:00 IST daily challenge switch: Handled by server scheduler / fallback runner.
   - 17:05 IST weekly results job: Handled by server scheduler with 10-minute judge drain grace.

---

## 3. List of Included Changes & Verified Test Status

All 18 test suites (**22 test files, 143/143 tests passing, 0 failures**) have been executed and verified:

| # | Feature / Change Area | Description | Test Suite & Status |
| :-: | :--- | :--- | :--- |
| 1 | **Practice Tab & 4 Modules** | Dedicated Practice navigation item with 4 curriculum modules (Control Structures, Pointers & Functions, Arrays & Applications, Advanced Data Types & Dynamic Memory), 10 questions each (4E, 4M, 2H), sequential unlocking ($\ge 7/10$ required in module $N$ to unlock $N+1$), code-only submissions (`type = 'PRACTICE'`), zero impact on streaks or weekly points. | `server/tests/practice-modules.test.ts` (PASS, 7/7 tests) |
| 2 | **New Alphanumeric PRN Format** | Exactly 12 characters: 4 digits, 3 letters, M or F, 4 digits (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`), canonical uppercase trimming, configurable `allowedProgramCodes`, live $X/12$ counter, unique `prnIndex` mapping, zero gender derivation from M/F character. | `server/tests/prn-alphanumeric-format.test.ts` (PASS, 11/11 tests) |
| 3 | **Monthly PRN Self-Service Change** | Rolling 30-day cooldown (`PRN_CHANGE_COOLDOWN_DAYS = 30`), signup correction exemption (`prnChangedAt` null), 30-day anti-squatting reservation on released PRNs, points/streaks permanently bound to account UID, masked display `••••••••1039`. | `server/tests/prn-monthly-change.test.ts` (PASS, 6/6 tests) |
| 4 | **Profile Save & Display Fixes** | Public display name fallback (`"Student 4F9A"`), locked college field showing `"Sanjivani University"`, modal z-index layer above sticky navbar, public URLs never exposing PRN or email. | `server/tests/prn-profile-signup.test.ts` (PASS, 9/9 tests) |
| 5 | **Real Weekly Rank & Percentiles** | Only active students with $\ge 1$ point ranked, unranked state ("Solve today's challenge to enter the board"), $\text{Top } X\% = \lceil \text{rank}/\text{ranked} \times 100 \rceil$ gated at $\ge 10$ ranked students, accurate accuracy percentage from non-zero evaluated submissions. | `server/tests/dashboard-metrics.test.ts` (PASS, 4/4 tests) |
| 6 | **Source & Pool-Size Leak Shields** | Stripped author/chapter/exercise references from student responses, challenge pool totals hidden from unauthenticated/student views, "season complete" message when pool ends. | `server/tests/single-question-window.test.ts` (PASS, 7/7 tests) |
| 7 | **Single Visible Question & 17:00 IST** | Exactly one daily question visible (17:00 IST to 17:00 IST), pre-cutoff judging grace, ended challenge returns 410, missing-question auto-fallback. | `server/tests/single-question-window.test.ts` (PASS, 7/7 tests) |
| 8 | **Home Button Navigation** | First item in navbar, house icon, links to `/dashboard` when signed in, accessible with `aria-current="page"`. | Verified in UI & client component suites |
| 9 | **Removal of Arena, Archive, Badges** | Routes return 404, navbar items removed, Firestore rules deny access, data safely preserved in DB. | `server/tests/arena-archive-removal.test.ts` (PASS, 5/5 tests) |
| 10 | **Upload Files Tab & Blind Review** | Max 3 files, 5 MB each, image/PDF magic bytes, blind review portal (`/checker/reviews`), 48h SLA, 30m edit window, rubric formula scoring. | `server/tests/roles-checker.test.ts` (PASS, 11/11 tests) |
| 11 | **Simplified Admin & Checker Roles** | Strict 3-role system (`admin`, `checker`, `student`), 2-admin minimum protection, self-demotion block, admin dashboard with 11 operational pages. | `server/tests/roles-checker.test.ts` (PASS, 11/11 tests) |
| 12 | **Session Persistence (F5 Refresh)** | Stays signed in across page refresh, new tab, and browser restart; branded splash screen prevents login flash. | `server/tests/session-persistence.test.ts` (PASS, 6/6 tests) |
| 13 | **Console, WebSocket & CSP Hardening** | Socket.IO removed, Monaco Editor bundled locally, clean CSP without `cdn.jsdelivr.net` or `localhost`, zero console errors. | `server/tests/security-audit-regressions.test.ts` (PASS, 7/7 tests) |
| 14 | **Real Judge Audit & Adversarial Safety** | C11 compiler sandbox, time/memory limit enforcement, pre-cutoff `submittedAt` timestamp accounting, recursion bombs, output floods, and file exfiltration blocked. | `server/tests/judge-malicious.test.ts` (PASS, 6/6 tests) & `server/tests/judge.test.ts` (PASS, 6/6 tests) |
| 15 | **Dark Mode & UI Accessibility** | `logicq.html` design tokens (#0C0F1F, #141932, etc.), WCAG AA contrast, responsive mobile/tablet/desktop layouts. | `server/tests/ui-accessibility.test.ts` (PASS, 7/7 tests) |
| 16 | **Installable Mobile PWA** | Standalone manifest (`/manifest.webmanifest`), maskable icons, mobile C-symbol helper bar, service worker precaching shell. | Verified in PWA asset suite |
| 17 | **Load-Test & Resilience Hardening** | Debounced queries, indexed lookups, rate limiting, graceful degradation under spike load. | Documented in `CAPACITY_PLAN.md` & `PERFORMANCE.md` |
| 18 | **Documentation & Audit Manifests** | Upgraded `MASTER_SPEC.md`, `WEEKLY_SYSTEM.md`, `DATA_ARCHITECTURE.md`, `FAKE_DATA_AUDIT.md`, `README.md`. | Verified |

---

## 4. Excluded Changes & Blocked Items

| Change / Feature | Status | Reason & Resolution |
| :--- | :---: | :--- |
| **Fake Account Deletion** | 🟡 **HELD AT GATE** | Audited in `/docs/FAKE_DATA_AUDIT.md`. Awaiting user's explicit confirmation before purging 38 fake/test accounts. |
| **Live Cloud Functions Deployment** | 🔴 **BLOCKED** | Requires Blaze Plan upgrade on Firebase Console. Runs locally and via GitHub Actions cron in the interim. |
| **Live Cloud Storage Bucket** | 🔴 **BLOCKED** | Requires Blaze Plan for GCS bucket provisioning. Upload feature runs with base64/local fallback in the interim. |

---

## 5. Destructive & Irreversible Items Assessment

| Operation | Risk Level | Safety Precaution & Validation |
| :--- | :---: | :--- |
| **PRN Alphanumeric Migration** | Low | Script `server/scripts/migrate-prn-format.ts` validates all existing PRNs to uppercase 12-char pattern. Verified by `verify-integrity.ts`. |
| **College Standardization** | Low | Standardizes any legacy college strings to `"Sanjivani University"`. Non-destructive to student accounts. |
| **Disabled Feature Routes** | Zero | `/arena`, `/archive`, `/badges` return 404 at routing layer; underlying data is preserved without dropping tables. |
| **Firestore Security Rules Deployment** | Zero | Deny-by-default architecture prevents unauthorized reads/writes; tested with 19 local rule test cases (`server/tests/firestore-security-rules.test.ts`). |

---

## 6. Dependencies on Blaze Plan (Honestly Disclosed)

The following production features require the project owner to upgrade `logicq-clanguage` from Spark (Free) to Blaze (Pay-as-you-go) in the Firebase Console:
1. **Cloud Run / Cloud Functions for Real C11 Judge**: Sandboxed `gcc` execution in `asia-south1`.
2. **Cloud Storage Bucket (`storage.rules`)**: Storing student uploaded flowchart/solution images and PDFs (~1.5 GB/mo = `< $0.25/mo`).
3. **Cloud Scheduler**: 17:00 IST daily challenge flip and 17:05 IST weekly leaderboard results job.
4. **Secret Manager**: Storing production JWT and database keys securely without environment variables.

*Estimated Blaze monthly cost for 500 students: `< $0.25 – $1.75/month`. Set a budget alert at ₹500 ($6/mo).*

---

## 7. Rollback Commands & Safety Net

If any release step fails or exhibits unexpected behavior, execute the following commands in order:

```bash
# 1. Rollback Firebase Hosting to prior release
npx firebase-tools hosting:rollback --project logicq-clanguage

# 2. Rollback Firestore Security Rules
# Re-deploy the pre-deploy rules tag
git checkout v0.9.0-pre-pilot -- firestore.rules
npx firebase-tools deploy --only firestore:rules --project logicq-clanguage

# 3. Rollback Git code
git checkout main
git reset --hard v0.9.0-pre-pilot
git push origin main --force
```

---

> [!IMPORTANT]
> **GATE 0 STOP**: `/docs/DEPLOY_PLAN.md` is complete and verified against 143 automated tests and live Firebase project `logicq-clanguage`. Please review and reply **"approved"** to proceed to Step 1 (Secrets and Privacy Scan).
