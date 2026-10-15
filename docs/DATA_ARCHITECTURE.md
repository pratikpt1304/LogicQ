# LogicQ Data Architecture Specification (`/docs/DATA_ARCHITECTURE.md`)

**Document Version**: 2.0.0 (Authoritative)  
**Date**: October 15, 2026  
**Status**: Authoritative Architectural Directive — Single Source of Truth for Platform Data  
**Target Environment**: Firebase (Firestore, Storage, Auth, Functions) & Optional Student Google Drive  

---

## 1. The Core Decision Rule

All data storage and lifecycle decisions in LogicQ follow this strict, unambiguous rule:

> **THE LOGICQ DATA DECISION RULE**:  
> **Data goes to Firebase** if:  
> 1. It affects **points, rank, streak, or verdict**;  
> 2. **Anyone other than the student** (admin, checker, or other students) needs it; OR  
> 3. The student **altering or deleting it would harm the platform**, fairness, or institutional integrity.  
>  
> **Only personal convenience data** may live in the student's own Google Drive.

```
+----------------------------------------------------------------------------------------------------+
|                                    LOGICQ DATA ALLOCATION DECISION TREE                             |
|                                                                                                    |
|                             [ Data Entity to Store ]                                               |
|                                        |                                                           |
|                                        v                                                           |
|                 Does it affect points, rank, streak, or verdict?                                    |
|                                    /       \                                                       |
|                               (YES)         (NO)                                                   |
|                                /               \                                                   |
|                               v                 v                                                  |
|                        [ FIREBASE ]      Does anyone else need it                                  |
|                   (Authoritative Source) (admin, checker, peers)?                                  |
|                                                 /      \                                           |
|                                            (YES)        (NO)                                       |
|                                             /              \                                       |
|                                            v                v                                      |
|                                     [ FIREBASE ]     Would altering/deleting it                     |
|                                                      harm the platform/fairness?                   |
|                                                          /      \                                  |
|                                                     (YES)        (NO)                              |
|                                                      /              \                              |
|                                                     v                v                             |
|                                              [ FIREBASE ]   [ STUDENT GOOGLE DRIVE ]               |
|                                             (Default Vault)  (Optional Personal Convenience Only)  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Central Tier: Firebase as the Authoritative Source of Truth

Firebase is the central, trusted backbone of LogicQ. All platform operations, evaluations, rankings, and default user workspaces are governed here under strict server-side Firestore security rules and Cloud Functions.

### 2.1 Complete Firebase Data Inventory

1. **User Identity, Authentication & Profile**:
   - Accounts, roles (`student`, `checker`, `admin`), email verification, and security timestamps (`users/{uid}`).
   - **PRN**: Canonical 12-character alphanumeric PRN (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`), masked as `••••••••1039` for the owner, strictly private, never exposed to peers.
   - **Academic Details**: Locked college (`"Sanjivani University"`), department, academic year (`FY`, `SY`, `TY`), optional division (`^[A-Z0-9]{0,3}$`).
   - **PRN Uniqueness & Anti-Squatting Index**: `prnIndex/{prn}` document transactions enforcing 1-to-1 mapping, 30-day self-service cooldown, and 30-day release reservations.
   - **PRN History Ledger**: Append-only `users/{uid}/prnHistory/{id}` logging all changes with client IP and request telemetry.
   - **Public Profile Mirror**: `publicProfiles/{uid}` containing only non-PII display labels, college, department, year, division, and stats. Never exposes `prn` or `email`.
   - **User Preferences**: Theme preference (`light` | `dark` | `system`), storage preference (`firebase` | `drive`), and editor font sizing.

2. **Problem Catalog, Hidden Tests & Reference Solutions (Private & Server-Only)**:
   - Problem statements, memory limits, time limits, starter templates, tags, difficulty (`problems/{problemId}`).
   - **Hidden Test Cases**: Stored in server-only subcollection `problems/{problemId}/hidden_tests`. Zero client read or write permissions (`allow read, write: if false;`). Evaluated strictly inside the sandboxed compiler judge.
   - **Reference Solutions & Wrong Solutions**: Admin-only validation fixtures ensuring 1-pass / 2-fail quality gate before publishing (`allow read, write: if isAdmin();`).
   - **Scheduling & Challenge Pipeline**: Active challenge pointer, 30-day scheduling calendar, and chapter order metadata.

3. **Submissions, Verdicts, Daily Streaks & Results (Immutable & Append-Only)**:
   - **Submissions Ledger**: `submissions/{submissionId}` recording code snippet, problem ID, server timestamp `submittedAt`, verdict (`ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `MEMORY_LIMIT_EXCEEDED`), runtime (ms), memory (KB), points awarded, and submission type (`DAILY` vs `PRACTICE`).
   - **Daily Competition Boards**: `daily_boards/{dayId}` and frozen top-20 snapshots in `daily_rank_snapshots/{snapshotId}`.
   - **Daily Results & Personal Summaries**: `daily_results/{resultId}` and `daily_summaries/{summaryId}` (read-only for the student owner and admins).
   - **Streak Ledger & Pause Days**: `streak_events/{eventId}` recording solves, rolling 7-day freeze usages, and admin-declared pause calendar (`streak_pauses/{pauseId}`).
   - **Daily Corrections**: `daily_corrections/{correctionId}` recording audited admin corrections to finalized daily boards.

4. **Practice Curriculum Progress & Unlocks**:
   - 4 syllabus modules (Control Structures, Pointers & Functions, Arrays & Applications, Advanced Data Types & Dynamic Memory).
   - `practice_progress/{progressId}` tracking attempts, solved status, and timestamps.
   - Server-enforced module lock gate: Module $N+1$ accessible only when student solves $\ge 7$ questions in Module $N$. Practice submissions award 0 competition points and have 0 impact on daily streaks/rank.

5. **Uploaded Solutions in Firebase Storage**:
   - Flowchart and handwritten approach scans (`JPG`, `PNG`, `WebP`, `PDF`, max 3 files, 5 MB limit per submission, max 5 uploads/day).
   - Uploaded directly to secure Firebase Storage bucket via authenticated streams.
   - Copied at submission time, metadata sanitized (EXIF stripped, active PDF scripts rejected), and assigned immutable randomized storage paths.
   - Served strictly via short-lived signed URLs generated on demand for blind checker reviews; zero public bucket read access (`allow read, write: if false;` by default).

6. **Audit Logs, Support & Error Telemetry**:
   - `admin_audit_logs/{logId}`: Immutable ledger of all administrative mutations (role changes, bans, PRN reveals, rejudges, setting updates).
   - `session_events/{eventId}`: Telemetry ledger recording every sign-out/invalidation with explicit reason codes (`manual`, `idle-timeout`, `token-refresh-failed`, `multi-tab-sync`, etc.).
   - `support_reports/{reportId}` and `error_reports/{reportId}`: Consented student debug logs.

7. **Code Drafts by Default (Firebase Private Vault)**:
   - **Location**: `users/{userId}/drafts/{problemId}` subcollection in Cloud Firestore.
   - **Access Security**: Private per student (`allow read, write: if request.auth.uid == userId;`). No other student, checker, or non-admin client can access.
   - **Size-Limited**: Enforced client-side and server-side cap of **64 KB** per draft (more than ample for C solutions, preventing database bloat).
   - **Debounced Autosave**: Debounced at **2000 ms (2 seconds)** after active typing ceases, with a dirty-flag check to prevent duplicate writes of identical code. Flushed immediately on tab switch, visibility loss, or before code execution.
   - **Daily-Challenge Draft Expiration**: Drafts associated with a daily competition challenge expire at `17:00:00 IST` when the challenge ends. Expired drafts are marked inactive and cleaned up after 7 days, ensuring stale temporary code does not clutter storage. Practice drafts persist permanently.

---

## 3. Personal Convenience Tier: Student Google Drive

Student Google Drive integration is **strictly optional, user-sovereign, and never a prerequisite** for using LogicQ.

### 3.1 Principles of the Drive Integration
1. **Convenience Only**: Drive holds only personal convenience data:
   - A synchronized secondary copy of in-progress code drafts (`drafts/{slug}.c`);
   - Personal learning notes and scratchpads (`notes/{slug}.md`);
   - Custom Monaco editor settings and keybindings (`settings/editor.json`);
   - Portable, exportable JSON/ZIP backups of the student's own submission history and solved code (`backups/logicq_backup_<timestamp>.json`).
2. **Zero Platform Dependency**:
   - The platform never relies on Google Drive for verifying problem completion, computing ranks, checking streaks, or executing code.
   - If Google Drive is declined, disconnected, revoked, blocked by campus firewall, or out of quota, **LogicQ works 100% identically with Firebase**.
3. **Zero-Backdoor Invariant**:
   - Drive OAuth tokens live strictly inside the student's browser session memory / sessionStorage.
   - The central backend **never receives, stores, or handles Google Drive refresh tokens or service account Drive credentials**.
   - Platform administrators, faculty checkers, and developers have **zero technical capability to access, list, or read files in student Google Drive accounts**.

---

## 4. Release 1 Scope vs. Future Vision

To maintain rock-solid stability and zero onboarding friction for the pilot cohort, LogicQ establishes a clear phase distinction:

```
+----------------------------------------------------------------------------------------------------+
|                                    RELEASE 1 VS FUTURE VISION                                      |
|                                                                                                    |
|  [ RELEASE 1: PILOT SCOPE ] (CURRENT)             [ FUTURE VISION: POST-PILOT ENHANCEMENT ]        |
|  ------------------------------------             -----------------------------------------        |
|  * Drafts default to FIREBASE private vault.      * User-selected Primary Draft Store:             |
|  * Size-limited (64 KB) & 2s debounced autosave.    [ ] Firebase Vault                             |
|  * Automatic cleanup of expired daily drafts.       [ ] Student Google Drive                       |
|  * Google Drive built for EXPORT & BACKUP ONLY.   * Real-time multi-device draft sync via Drive.   |
|  * Single-click "Export My Data to Drive".        * Direct Monaco scratchpad saving to Drive.      |
|  * Zero Drive OAuth friction at signup.           * Automatic bidirectional conflict resolution.   |
+----------------------------------------------------------------------------------------------------+
```

### 4.1 Release 1: Export and Backup Only (Active Specification)
- Drafts are stored in **Firebase by default** (`users/{uid}/drafts/{problemId}`).
- Google Drive is used **exclusively for on-demand student data export and portable backup**:
  - A student can visit their **Profile** or **History** page and click **"Export History to Google Drive"**.
  - This prompts an optional Google OAuth popup requesting `drive.file` scope.
  - Upon authorization, LogicQ bundles the student's solved code, verdicts, submission dates, and points into a structured JSON/ZIP file and writes it to a student-visible `LogicQ_Backups` folder in their Drive.
  - The token is discarded from memory after the export operation completes.
- **Why this is optimal for Release 1**:
  - Eliminates OAuth friction and "Unverified App" screens during signup.
  - Completely sidesteps college Google Workspace third-party app blocks for everyday problem-solving.
  - Guarantees 100% reliable autosave on campus lab computers without needing Drive credentials.

### 4.2 Future Vision: Drive as Primary Draft Store (Described, NOT Built in Release 1)
- *Architectural Design for Post-Pilot*:
  - Students with unrestricted Google accounts may toggle "Save drafts directly to my Google Drive" in Settings.
  - Monaco editor debounced autosaves write directly to `spaces=appDataFolder` using `drive.appdata` scope.
  - If a student codes at home on a laptop and moves to a college desktop, the draft seamlessly syncs across devices via Google Drive.
  - If Drive errors occur (network drop, revoked token, quota exceeded), the client silently falls back to the Firebase private vault without interrupting the student.

---

## 5. Cost & Resource Analysis for 500 Active Students

A critical architectural consideration is Cloud Firestore read/write costs and storage volume when saving drafts.

### 5.1 Baseline Assumptions for 500-Student Pilot Cohort
- **Cohort Size**: 500 registered students (~50–75 concurrent at 16:00–17:00 IST peak).
- **Daily Participation**: ~300 students solve the daily challenge; ~200 practice across modules.
- **Average Active Coding Session**: 30 minutes of editor time per student per day.
- **Autosave Debounce Interval**: **2000 ms (2 seconds)** after typing ceases + dirty-check comparison.
- **Typing Pattern**: Students type in bursts (e.g. 15 bursts of code editing per session). A 2s debounce reduces continuous keystroke saves to an average of **12 to 20 Firestore draft writes per student per session**.
- **Draft Size**: Average C source file is 1.5 KB to 3.5 KB (capped at 64 KB).

### 5.2 Monthly Cost Breakdown: Firebase Default Drafts (Release 1)

| Resource Metric | Daily Volume (500 Students) | Monthly Volume (30 Days) | Firebase Blaze Quota & Rate | Net Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Draft Writes (`users/{uid}/drafts`)** | 500 students $\times$ 18 writes = 9,000 writes/day | 270,000 writes/mo | Free Tier: 20,000/day (600,000/mo). Excess: $0.18 per 100k writes | **$0.00** (Fully covered by free tier) |
| **Draft Reads (Session restore)** | 500 students $\times$ 2 restores = 1,000 reads/day | 30,000 reads/mo | Free Tier: 50,000/day. Excess: $0.06 per 100k reads | **$0.00** (Fully covered by free tier) |
| **Submissions & Verdict Writes** | 500 students $\times$ 3 attempts = 1,500 writes/day | 45,000 writes/mo | Free Tier: 20,000/day | **$0.00** (Covered by free tier) |
| **Leaderboard & Daily Reads** | 500 students $\times$ 10 views = 5,000 reads/day | 150,000 reads/mo | Free Tier: 50,000/day | **$0.00** (Covered by free tier) |
| **Draft Storage Volume** | 500 students $\times$ 2 active drafts $\times$ 3 KB = 3 MB | ~15 MB with history | Free Tier: 1.0 GB total storage | **$0.00** (Uses < 2% of free tier) |
| **Storage (Uploaded Solutions)** | 50 uploads/day $\times$ 1.5 MB = 75 MB/day | ~2.2 GB/mo | Free Tier: 5 GB. Excess: $0.026/GB | **$0.00** (Covered by free tier) |
| **Estimated Total Platform Cost** | — | — | **Total Expected Monthly Bill** | **$0.00 – $1.50 / month** |

### 5.3 Comparative Economic Verdict
- **Storing drafts in Firebase costs virtually $0.00/month** for a 500-student cohort because debounced autosaving generates under 10,000 writes/day, well below Firestore’s 20,000 free writes/day limit.
- Even if participation doubled to 1,000 students (yielding ~25,000 writes/day), the overage cost would be less than **$0.90 / month**.
- Therefore, there is **zero financial necessity** to force drafts into Google Drive for cost avoidance. Keeping drafts in Firebase delivers 100% operational reliability at near-zero expense.

---

## 6. Data Deletion Lifecycle: "Delete My Data" Matrix

When a student exercises their right to erasure under DPDP guidelines by clicking **"Delete My Account & Data"** in Profile Settings, the platform executes a complete purge across all storage locations.

| Storage Location | Data Entity | Deletion Behavior on "Delete My Data" | Platform Impact & Anonymization |
| :--- | :--- | :--- | :--- |
| **Firebase Auth** | User Authentication Record | Permanently deleted immediately via Firebase Admin SDK. | Student can no longer sign in. |
| **Firestore (`users/{uid}`)** | Private User Document | Document deleted completely. | All private PII (email, unmasked PRN, bio) erased. |
| **Firestore (`prnIndex/{prn}`)** | PRN Uniqueness Record | Document deleted, freeing the PRN reservation immediately. | PRN becomes available for re-registration after 30 days. |
| **Firestore (`users/{uid}/drafts`)**| In-progress Code Drafts | Subcollection documents deleted completely. | All unpublished code drafts permanently destroyed. |
| **Firestore (`users/{uid}/prnHistory`)** | PRN Audit Ledger | Subcollection documents deleted with user account. | Student change telemetry purged. |
| **Firestore (`practice_progress`)** | Practice Problem Records | Deleted where `userId == uid`. | Module progress and unlocks purged. |
| **Firestore (`session_events`)** | Session Telemetry Logs | Deleted where `userId == uid`. | Session history purged. |
| **Firebase Storage** | Uploaded Solution Scans | Files in `uploads/{uid}/*` deleted via Admin Storage SDK. | Stored image/PDF files permanently erased. |
| **Firestore (`publicProfiles/{uid}`)**| Public Profile Mirror | Document deleted immediately. | User disappears from active public directories. |
| **Firestore (`daily_boards`, `daily_rank_snapshots`)** | Frozen Past Leaderboards | **Anonymized in place**: Username replaced with `"Student [Deleted]"`; PRN masked; score and rank preserved. | Preserves historical contest rankings for surviving participants without storing PII. |
| **Firestore (`admin_audit_logs`)** | Administrative Action Logs | **Retained**: Target user marked `"DELETED_USER (<uid>)"`. | Legal and regulatory compliance requires maintaining immutable admin audit logs. |
| **Student Google Drive** | Exported Backups & App Data | **Client-Triggered Cleanup**: If Drive token is present in browser session, client calls `deleteAll()` on `appDataFolder`. | If disconnected, files remain in student's personal Drive; student can delete them via Google Drive settings. |

---

## 7. Google OAuth Scopes, Verification Status & Policies

### 7.1 Scope Classifications
LogicQ restricts its Drive integration strictly to two least-privilege scopes:

1. **`https://www.googleapis.com/auth/drive.file`** (Release 1 Primary Scope):
   - **Access Granted**: Creates and modifies **only** files and folders created by LogicQ or opened by the user via the app. Zero access to pre-existing files, photos, or documents in the student's Drive.
   - **Google Security Classification**: **Non-sensitive Scope** (*Source: Google Identity & Drive API Documentation, 2024–2026*).
   - **Verification Requirement**: Does **not** require CASA (Cloud Application Security Assessment) Tier 2/3 security audits.
   - **User Interface**: Created backup files are placed in a user-visible `LogicQ_Backups` folder where students can download, share, or archive them.

2. **`https://www.googleapis.com/auth/drive.appdata`** (Future Vision Scope):
   - **Access Granted**: Accesses the hidden `Application Data` folder (`spaces=appDataFolder`).
   - **Google Security Classification**: **Non-sensitive Scope** (*Source: Google Drive API AppData Guide, 2024–2026*).
   - **Verification Requirement**: Does **not** trigger restricted-scope CASA security assessments.
   - **User Interface**: Invisible in Google Drive dashboard; prevents students from accidentally tampering with internal JSON configuration files.

3. **Strictly Prohibited Scope**:
   - `https://www.googleapis.com/auth/drive` (Full Drive Access) is **categorically banned** from LogicQ.

### 7.2 Google Cloud Verification Status & Limits
- **Internal App Mode (College Google Workspace)**:
  - If LogicQ's Google Cloud project is configured as **"Internal"** under the college's Workspace organization (`sanjivani.edu.in`), verification by Google is **completely bypassed**.
  - There is no 100-user testing limit, and students see zero "Unverified App" warning screens.
- **External App Mode (Testing vs Production)**:
  - In "Testing" mode: Capped at **100 specific test users** who must be explicitly whitelisted by email in Google Cloud Console.
  - In "Published" mode with Non-sensitive scopes (`drive.file` / `drive.appdata`): Requires lightweight **Brand Verification** (submitting Privacy Policy URL, Terms of Service URL, and verified domain in Google Search Console). No code audits or penetration tests are required.

---

## 8. Failure Modes & Resilience Matrix

The following table documents every potential failure scenario, its detection mechanism, and the platform's automated fallback:

| # | Failure Mode | Trigger / Root Cause | Platform Detection | Automated System Reaction | User-Facing Experience |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **FM-1** | **OAuth Token Expiry** | 60-minute Google OAuth access token expires during long coding session. | Drive API returns `401 Unauthorized`. | Release 1: Next export re-prompts for consent. Future Vision: Client falls back to Firebase vault without interruption. | Non-blocking. Subtle status pill indicates *"Drive disconnected. Autosaving to LogicQ Vault."* |
| **FM-2** | **Student Revokes Drive Access** | Student removes LogicQ permissions at `myaccount.google.com/permissions`. | Drive API returns `403 Access Denied` / `invalid_grant`. | Client catches error, clears stale local token, switches `storagePreference` to `firebase`. | Info notification: *"Google Drive access disconnected. Your drafts remain safely stored in LogicQ."* |
| **FM-3** | **Student Deletes App Data Folder** | Student clears app data in Google Drive settings (`Settings > Manage Apps`). | Drive API returns `404 Not Found` when reading remote draft file. | Client treats as new draft session; writes fresh draft to Firebase vault. | Zero data loss. Current Monaco editor content remains intact. |
| **FM-4** | **Campus Workspace Blocks App** | College IT enforces *"Block third-party API access to Drive"* policy. | OAuth returns `admin_policy_enforced` or `access_blocked`. | System marks Drive unavailable for this domain; disables Drive buttons; defaults all storage to Firebase. | Honest alert: *"Campus Google Workspace has restricted third-party Drive access. All drafts and backups use your secure LogicQ vault."* |
| **FM-5** | **Student Drive Out of Quota** | Student's personal Google Drive exceeds 15 GB storage limit. | Drive API returns `403 userRateLimitExceeded` or `storageQuotaExceeded`. | Aborts Drive write; safely diverts draft/backup payload into Firebase. | Banner: *"Google Drive storage is full. Draft safely preserved in LogicQ vault."* |
| **FM-6** | **Network Offline During Coding** | Wi-Fi drops while student is actively editing code in Monaco. | Browser `navigator.onLine === false` or `fetch` network error. | Monaco changes buffer locally in `localStorage` with dirty flag. When network recovers, flushes to Firebase. | Status indicator shows *"Offline — Draft saved locally in browser"*. Run/Submit buttons disabled until reconnect. |
| **FM-7** | **Multi-Device Edit Conflict** | Student edits on Lab PC, leaves tab open, then opens same challenge at home. | Firestore draft `updatedAt` on remote document is newer than local draft load time. | Client halts autosave overwrite; displays **"Draft Conflict Detected"** modal comparing timestamps. | Student chooses: (1) Keep Local Version, (2) Load Cloud Version, or (3) View Side-by-Side Diff. |
| **FM-8** | **Drive API Rate Limit (429)** | Rapid burst of export/draft calls triggers Google API rate throttling. | Drive API returns `429 Too Many Requests`. | Client applies exponential backoff with jitter (1s, 2s, 4s). | Non-blocking; background retry indicator. |
| **FM-9** | **Daily Challenge Ends Mid-Draft** | Server clock passes `17:00:00 IST` while student has an active unsaved draft. | Server returns `410 CHALLENGE_ENDED` on submission/draft endpoints. | Active editor switches to `readOnly`; draft preserved locally for student reference; daily submission blocked. | Banner: *"A new challenge is live. Refresh to see today's question. Your code has been preserved in your drafts."* |

---

## 9. Implementation Reality & Testing Ledger

In strict accordance with project honesty guidelines, the exact implementation status of each architectural component is declared below:

| Component | Status | Verification Evidence & Location |
| :--- | :---: | :--- |
| **Firebase Auth, Roles & Profile Invariants** | 🟢 **IMPLEMENTED & TESTED** | Verified in `tests/prn-profile-signup.test.ts` & `tests/roles-checker.test.ts`. 190 Vitest tests pass. |
| **Firestore Security Rules for Drafts** | 🟢 **IMPLEMENTED & TESTED** | Verified in `firestore.rules` lines 240–242: `match /drafts/{draftId} { allow read, write: if isOwner(userId); }`. 32 security rule tests pass. |
| **Append-Only Submissions & Verdicts** | 🟢 **IMPLEMENTED & TESTED** | Verified in `tests/scoring.test.ts` and `tests/single-question-window.test.ts`. |
| **Practice Module Sequential Unlocking** | 🟢 **IMPLEMENTED & TESTED** | Verified in `tests/practice-modules.test.ts` (12 passing tests). 40 practice problems verified. |
| **Uploaded Solutions Validation & Review** | 🟢 **IMPLEMENTED & TESTED** | Verified in `tests/amendments-audit.test.ts` and `storage.rules`. Magic bytes, 5 MB limit, pending review state tested. |
| **Daily Results Finalization & Pause State** | 🟢 **IMPLEMENTED & TESTED** | Verified in `tests/daily-system-pause.test.ts` and `tests/admin-daily-results.test.ts`. Safe pause active by default. |
| **Debounced Firebase Draft Autosave** | 🟢 **IMPLEMENTED (CLIENT)** | Implemented in `ChallengePage.tsx` and `PracticeWorkspacePage.tsx` with 2000 ms debounce timer. |
| **Release 1: Google Drive History Export** | 🟡 **SPECIFIED / PROTOTYPED** | Architecture specified; client export button and payload formatting designed; awaits user review before full UI hookup. |
| **Future Vision: Drive as Primary Draft Store** | ⚪ **SPECIFIED ONLY (FUTURE)** | Described in Section 4.2; deliberately **NOT built in Release 1** per authoritative directive. |
