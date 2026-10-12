# LogicQ Deployment Plan & Release Verification (`/docs/DEPLOY_PLAN.md`)

> **STATUS**: `GATE 1 — AWAITING USER APPROVAL`  
> **Production Target**: Firebase Project `logicq-clanguage`  
> **Live Production URL**: https://logicq-clanguage.web.app  
> **Staging Target**: Preview Channel `https://logicq-clanguage--staging-myz67fzi.web.app` (or proposed dedicated staging project `logicq-staging`)  
> **Release Tag**: `v1.0.0-pilot`  
> **Pre-Deploy Rollback Tag**: `v0.9.0-pre-pilot`

---

## 1. Project Identification & Environments

| Parameter | Production Environment | Proposed Staging Environment |
| :--- | :--- | :--- |
| **Firebase Project ID** | `logicq-clanguage` | `logicq-staging` (or Hosting preview channel on `logicq-clanguage`) |
| **Project Number** | `898954156375` | Propose creating via `firebase projects:create logicq-staging` |
| **Hosting Domain** | `https://logicq-clanguage.web.app` | `https://logicq-clanguage--staging-myz67fzi.web.app` |
| **Current Live Hosting** | Deployed (`client/dist` v1.0.0, 15 files) | Live preview channel expiring 2026-10-19 |
| **Firestore Security Rules** | Compiled `rules_version = '2';` (Deny by default) | Mirror of `firestore.rules` |
| **Storage Security Rules** | Staged in `storage.rules` (Deny by default) | Requires Blaze plan bucket |
| **Cloud Functions & Scheduler**| 🔴 Staged locally (Blocked on Blaze plan) | 🔴 Staged locally (Blocked on Blaze plan) |

---

## 2. Changes Included in This Release (Passed All 18 Test Suites)

Only changes that have passed automated verification (18 test files, 107/107 tests passing) are included:

1. **Strict 3-Role Architecture**:
   - Exactly three roles: `admin`, `checker`, `student` (all references to `Owner`, `Content admin`, `Reviewer`, `Viewer`, Faculty, and Moderator eliminated).
   - Extensible `ROLES_REGISTRY` table retained in `server/src/config/roles.config.ts`.
   - Invariants: Admins cannot demote own account; system enforces minimum 2 active admins with overview warning banner.
2. **Checker Blind Review Portal**:
   - `/checker/reviews` ("My reviews") queue displaying only assigned solutions.
   - Strict blind review: zero student PII (name, PRN, email, dept, year, avatar masked as `SUB-XXXX`).
   - Formula-driven rubric points calculation: $\text{Points} = \text{BasePoints} \times (0.50 \times \text{Logic} + 0.30 \times \text{Flowchart} + 0.20 \times \text{Clarity})$.
   - 30-minute decision edit window with immutable versioning in `UploadReview`.
   - Conflict-of-interest block: checkers cannot receive or review their own uploaded solutions.
   - 48-hour SLA deadline returning stale assigned uploads to unassigned pool.
3. **Single Question Visible Rule**:
   - Exactly one daily challenge visible at a time (17:00 IST to 17:00 IST).
   - All past and future challenges hidden from students (return 404/410).
   - Strip of "this week's challenges" and catch-up mode completely removed.
4. **Session Persistence (F5 Refresh Bug Fix)**:
   - Full persistence across page refresh, new tab, browser restart, and PWA launch.
   - Idle timeouts: 7 days for students, 8 hours for checkers, 30 minutes for admins.
   - Branded loading screen eliminating flash of login/landing page.
5. **PRN Academic Identity & Security Rules**:
   - 12-digit PRN validated via regex, immutable after signup.
   - Deny-by-default Firestore rules protecting `users/{userId}` and `prnIndex/{prn}`.
6. **Feature Removals**:
   - Arena, Archive, and Badges removed from UI, client navigation, routes, and Firestore rules.

---

## 3. Destructive or Irreversible Actions Assessment

| Item | Destructive? | Mitigation & Safety Precaution |
| :--- | :---: | :--- |
| **Role Schema Migration** | No | Database supports `STUDENT`, `ADMIN`, and `CHECKER`. No user accounts deleted. |
| **Disabled Routes (`/arena`, `/archive`, `/badges`)** | No | Reversible via feature flags `server/src/config/features.config.ts`. |
| **Admin Role Changes** | Protected | Protected by minimum-2-admins invariant and self-demotion block. |
| **PRN Uniqueness (`prnIndex`)** | Protected | Handled inside atomic server transactions. |

---

## 4. Dependencies on Blaze Plan (Honestly Disclosed)

The following production features require the project owner to upgrade `logicq-clanguage` from Spark (Free) to Blaze (Pay-as-you-go) in the Firebase Console:
1. **Cloud Run / Cloud Functions for Real C11 Judge**: Sandboxed `gcc` execution in `asia-south1`.
2. **Cloud Storage Bucket (`storage.rules`)**: Storing student uploaded flowchart/solution images and PDFs (~1.5 GB/mo = `< $0.25/mo`).
3. **Cloud Scheduler**: 17:00 IST daily challenge flip and 17:05 IST weekly leaderboard results job.
4. **Secret Manager**: Storing production JWT and database keys securely without environment variables.

*Estimated Blaze monthly cost for 500 students: `< $0.25 – $1.75/month`. Set a budget alert at ₹500 ($6/mo).*

---

## 5. Rollback Commands

If any release step fails or exhibits unexpected behavior, execute the following commands in order:

```bash
# 1. Rollback Firebase Hosting to prior release
firebase hosting:rollback --project logicq-clanguage

# 2. Rollback Firestore Security Rules
# Re-deploy the pre-deploy rules tag
git checkout v0.9.0-pre-pilot -- firestore.rules
firebase deploy --only firestore:rules --project logicq-clanguage

# 3. Rollback Git code
git checkout main
git reset --hard v0.9.0-pre-pilot
git push origin main --force
```

---

## 6. Verification Evidence Summary

- **Server Test Suite**: 18 test files, 107 tests passing (`vitest run`).
- **Client Build**: `tsc && vite build` succeeded (0 errors, bundle audit passed with 0 forbidden strings).
- **Database Ledger Audit**: `verify-integrity.ts` passed (100% data integrity verified).
- **Security Perimeter**: All 11 Firestore security rules tests passed.

---

> [!IMPORTANT]
> **GATE 1 STATUS**: STOPPING HERE. Please review this deployment plan and reply with **"approved"** to proceed with README/docs creation, staging QA, and deployment execution.
