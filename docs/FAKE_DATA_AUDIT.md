# LogicQ Fake Data Audit & Purge Plan (`/docs/FAKE_DATA_AUDIT.md`)

> **STATUS: AUDIT COMPLETE — STOPPED AND AWAITING USER CONFIRMATION**  
> As required by safety instructions, no accounts, database rows, or documents have been deleted. This audit details the root cause of fake leaderboard accounts (including "Student MIN1"), inventory of all accounts, collection counts, evidence classifications, and the exact proposed purge procedure.

---

## 1. Root Cause Analysis: How "Student MIN1" Appeared

### A. Client Fallback Mock Engine (`client/src/api/fallbackEngine.ts`)
- **Root Cause**: In `client/src/api/fallbackEngine.ts`, lines 232–248, `getStoredUsers()` seeded a default user into browser `localStorage`:
  ```typescript
  {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@logicq.io',
    fullName: 'Bitwise Club Admin',
    role: 'ADMIN',
    totalPoints: 120,
    currentStreak: 5,
    longestStreak: 7,
    shortId: 'ADM1',
  }
  ```
- **Leaderboard Filter Defect**: On lines 1017–1021 of `fallbackEngine.ts`, the `/leaderboard` route handler evaluated:
  ```typescript
  const allUsers = getStoredUsers().filter((u) => !u.isBanned);
  const rankedEligible = allUsers
    .filter((u) => (u.totalPoints || 0) > 0)
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  ```
  It **failed to check** `u.role === 'STUDENT'`.
- **Display Fallback Transformation**: Because `admin-1` had no custom `displayName`, `formatPublicDisplayName()` took `shortId` (or generated one by slicing `id: 'admin-1'` $\rightarrow$ `'MIN1'`), rendering **`"Student MIN1"`** with **120 PTS**, **5d streak**, and rank **#1**.
- **Real Student Experience**: When a real student signed in with 0 points, the student's own account showed *"Not ranked yet"* while the mock admin was hoisted as the sole student on the board with 120 PTS.

---

## 2. Collection & Database Inventory

Audit performed on `server/prisma/dev.db` (and mirrors in Firestore):

| Collection / Table | Total Records | Real Student Records | Fake / Test Records | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **`User`** | **40** | **1** | **39** (1 Admin + 38 Test/Seed) | Real student: `usr_audit_student_6128` |
| **`PrnIndex`** | **18** | **1** | **17** | Active PRN mappings |
| **`Submission`** | **0** | **0** | **0** | Clean (no fake submissions in ledger) |
| **`UploadedSolution`** | **0** | **0** | **0** | Clean |
| **`UserBadge`** | **0** | **0** | **0** | Clean |
| **`WeeklyResult`** | **0** | **0** | **0** | Clean |
| **`PracticeProgress`**| **0** | **0** | **0** | Clean |

---

## 3. Detailed Account Audit & Evidence Classification

### Category A: Real Student Account (KEEP INTACT — DO NOT TOUCH)
| ID | Email | Username | PRN | ShortId | Points | Streak | Evidence & Classification |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `usr_audit_student_6128` | `student6128@sanjivani.edu.in` | `ipworker1908` | `2199TESM6128` | `7F67` | 0 | 0 | **REAL STUDENT (USER AUDIT ACCOUNT)**. Registered during real user verification session. Keep 100% intact. |

### Category B: Primary System Admin (PRESERVE ACCOUNT, VERIFY ZERO POINTS)
| ID | Email | Username | Role | Points | Evidence & Classification |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `89d322f2-738c-4f2b-92c1-8ba23a158c5a` | `admin@logicq.io` | `admin` | `ADMIN` | 0 | **CORE ADMIN**. Database administrator account created by `seed.ts`. Keep intact. Ensure excluded from all student leaderboards. |

### Category C: Seeded Demo Student Accounts (6 ACCOUNTS — SUSPECTED FAKE)
*Evidence: Created by `server/prisma/seed.ts:1352` fixture for multi-department UI demo.*
| # | ID | Email | Username | PRN | ShortId | Streak | Classification |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `fe48ccef-122f-43e8-87b2-eea5dcba6a65` | `aiml.fy1@sanjivani.org.in` | `student_4f9a` | `2199AIMM0001` | `4F9A` | 5 | **FAKE (SEED FIXTURE)** |
| 2 | `eea5d30c-eb8a-4e0b-bc66-69933f0cc654` | `aids.sy2@sanjivani.org.in` | `student_8b2c` | `2199AIDF0002` | `8B2C` | 4 | **FAKE (SEED FIXTURE)** |
| 3 | `7f39e3ab-9fd4-428d-8ec0-a9d28f2d59b8` | `cse.ty3@sanjivani.org.in` | `student_9d1e` | `2199CSEM0003` | `9D1E` | 7 | **FAKE (SEED FIXTURE)** |
| 4 | `ca38a044-f907-4e00-a492-b306d8f59999` | `mtech.fy4@sanjivani.org.in` | `student_3a7f` | `2199IMTF0004` | `3A7F` | 2 | **FAKE (SEED FIXTURE)** |
| 5 | `a96d9e64-22bf-4612-9149-11e8ea96ab63` | `mech.sy5@sanjivani.org.in` | `student_5e4b` | `2199MECM0005` | `5E4B` | 1 | **FAKE (SEED FIXTURE)** |
| 6 | `193c03f2-6221-485b-aa58-5f74352f39e6` | `btech.ty6@sanjivani.org.in` | `student_7c6d` | `2199IBTF0006` | `7C6D` | 3 | **FAKE (SEED FIXTURE)** |

### Category D: Test-Generated Anonymized & Safety Test Accounts (29 ACCOUNTS — SUSPECTED FAKE)
*Evidence: Created during DPDP erasure tests, account deletion tests, and safety tests with `@anonymized.invalid` or `@example.com` domains.*
| IDs / Pattern | Email Pattern | Count | PRN | Points | Classification |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `3e0baf9e...`, `adfd2f27...`, `8127b16e...`, `1079bf5b...`, `f071ae7f...`, `ecf63f96...`, `a3375efa...`, `e83bbcf5...`, `e57f5044...`, `74322660...`, `3c4e75e1...`, `4548ffa6...`, `1198b42f...`, `b9e0353c...`, `3977cec7...`, `5cb0f55b...`, `6f4b3135...`, `bf8ab863...`, `522ec288...`, `a4fd3a59...`, `f0163eb4...`, `3de3de79...`, `39014cfc...`, `b655dfbd...`, `b484a8da...`, `5ed0b0b2...`, `fbcb0872...`, `7505cbe7...` | `deleted_*@anonymized.invalid` | **28** | `null` | 0 | **FAKE (TEST ARTIFACTS)** |
| `48d6a04f-37c5-4593-bafc-2cd5c308f231` | `safety_1791739237755@example.com` | **1** | `null` | 0 | **FAKE (TEST ARTIFACT)** |

### Category E: Automated Integration Test Accounts (3 ACCOUNTS — SUSPECTED FAKE)
*Evidence: Created during Vitest runs for PRN format validation and monthly change rules.*
| ID | Email | PRN | ShortId | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `7e2f51bb-621d-4c6a-aa74-ae279f69f908` | `prn_format_test_1@sanjivani.org.in` | `2199TESF0002` | `8BE7` | **FAKE (TEST ARTIFACT)** |
| `235ce0bf-50c8-4ba6-8c2c-14a1a43c39ff` | `prnchange.test1@sanjivani.org.in` | `2199TESM0003` | `6A1A` | **FAKE (TEST ARTIFACT)** |
| `40dd428a-8ef4-4a82-93b8-6258d0e7a448` | `prnchange.test2@sanjivani.org.in` | `2199TESF0099` | `F7F8` | **FAKE (TEST ARTIFACT)** |

---

## 4. Proposed Deletion & Sanitization Plan (PENDING USER CONFIRMATION)

Once you review and confirm the accounts above:
1. **Safety Backup**: Create a pre-cleanup snapshot `dev.db.backup.<timestamp>` and Firestore JSON export.
2. **Database Purge**:
   - Delete the 38 confirmed test accounts (`Category C`, `Category D`, `Category E`) and cascade delete their `PrnIndex` entries.
   - Retain strictly `Category A` (`usr_audit_student_6128`) and `Category B` (`admin@logicq.io`).
   - Log an append-only audit trail in `server/audit-cleanup.log`.
3. **Client Fallback Sanitization**:
   - Remove the mock `admin-1` user with 120 points from `client/src/api/fallbackEngine.ts`.
   - Update leaderboard filtering to enforce `u.role === 'STUDENT' && !u.isTest`.
4. **Prevention Guards**:
   - Add environment check in `server/prisma/seed.ts`:
     ```typescript
     if (process.env.NODE_ENV === 'production') {
       throw new Error('FATAL: Seed script cannot be run against production environment!');
     }
     ```
   - Add `isTest: true` attribute on seeded test fixtures.
   - Add build assertion script `npm run check:no-mock-data` that fails the build if fake leaderboard fixtures or seed data are bundled in client assets.
5. **Integrity Verification**: Run `verify-integrity.ts` immediately before and after the cleanup to verify 100% ledger consistency.

---

> [!CAUTION]
> **AWAITING CONFIRMATION**: No database deletion has occurred yet. Please review the audit list above and confirm whether to proceed with removing the 38 identified fake/test accounts.
