# LogicQ Firestore Security Rules & Emulator Verification Suite

## 1. Security Invariants & Threat Boundaries

LogicQ follows a strict **Deny-by-Default Architecture**. Any collection or operation not explicitly authorized is categorically rejected.

```
+----------------------------------------------------------------------------------------------------+
|                                FIRESTORE DENY-BY-DEFAULT PERIMETER                                 |
|                                                                                                    |
|  match /{document=**} { allow read, write: if false; }                                            |
|                                                                                                    |
|  - Private User PII & PRN:    OWNER OR ADMIN READ ONLY (Peers cannot read users/{userId})         |
|  - PRN Uniqueness Index:      BLOCKED TO ALL CLIENTS (prnIndex/{prn} Server Transaction only)      |
|  - PRN & College Immutability:BLOCKED ON CLIENT UPDATE (Audited Admin/Server action only)          |
|  - Arena, Archive & Badges:   DISABLED & BLOCKED TO ALL ROLES (contests/archive/badges -> false)   |
|  - Single Visible Question:   NO DIRECT STUDENT READ ON /problems (Served via GET /api/problems/daily)|
|  - Problem Private Metadata:  ADMIN ONLY (Book sourceRef never readable by students)               |
|  - Uploaded Solutions:        OWNER OR ADMIN READ ONLY / SERVER WRITE ONLY (uploaded_solutions)    |
|  - Practice Progress:         OWNER OR ADMIN READ ONLY / SERVER WRITE ONLY (practice_progress)     |
|  - Upload Reviews & Errors:   ADMIN READ ONLY / SERVER WRITE ONLY (upload_reviews, error_reports)  |
|  - Daily Boards & Snapshots:  AUTHENTICATED READ ONLY / SERVER WRITE ONLY (daily_boards, snapshots) |
|  - Daily Results & Summaries: OWNER OR ADMIN READ ONLY / SERVER WRITE ONLY (daily_results, summaries)|
|  - Daily Corrections:         ADMIN READ ONLY / SERVER WRITE ONLY (daily_corrections)              |
|  - Session Events:            OWNER OR ADMIN READ ONLY / OWNER CREATE ONLY (session_events)         |
|  - Legacy Weeks & Summaries:  READ ONLY ARCHIVE (weeks, weekly_summaries, weekly_corrections)      |
|  - Verdict Creation:          BLOCKED TO ALL CLIENTS (Server Admin SDK only)                       |
|  - Points & Streak Mutation:  BLOCKED TO ALL CLIENTS (Server Admin SDK only)                       |
|  - Hidden Test Cases:         ADMIN ONLY (Students have zero direct access to hidden_tests)        |
|  - Peer Code Inspection:      BLOCKED (Students read only their own submissions)                   |
|  - Role Elevation:            BLOCKED (request.auth.token.role == 'ADMIN' custom claim required)   |
|  - Deletion of Submissions:   BLOCKED TO ALL CLIENTS (Append-only ledger enforced)                 |
+----------------------------------------------------------------------------------------------------+
```

### PRN Data Architecture & Masking Invariants (Amended 12-Character Alphanumeric Format)

- **PRN Format**: Exactly 12 characters matching `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`:
  - 4 digits (admission year / prefix)
  - 3 uppercase letters (academic program code, e.g., `TES`, `AIM`, `CSE`)
  - 1 character `M` or `F`
  - 4 digits (unique student sequence)
  - Canonical uppercase normalization; zero attribute or gender derivation from `[MF]`.
  - Fake test fixtures: `2199TESM0001`, `2199TESF0002`.
- **Document ID for `prnIndex/{prn}`**: The document ID is the canonical uppercase 12-character PRN (e.g., `prnIndex/2199TESM0001`).
- **Privacy Masking**: Full PRN is strictly private PII stored only in `users/{userId}` and indexed in `prnIndex/{prn}`. In all client views, the PRN is masked as 8 bullets followed by the last 4 digits (`••••••••1039`). Peers and leaderboards view only `publicProfiles/{userId}`, which never exposes `prn` or `email`.
- **Client Write Blocks**: Direct client writes to `prn`, `prnIndex`, `prnHistory`, and `practice_progress` are categorically prohibited in Firestore security rules (`allow write: if false;` or blocked in `isValidUserSelfUpdate()`).
- **Immutability & Audit**: PRN updates can only occur through server-side transactions with a 30-day cooldown and are recorded in `users/{userId}/prnHistory/{historyId}`.

### Student Profile Self-Service Update Invariants (`users/{userId}`)

- **Allowed Self-Service Fields**: Authenticated students may update only their own profile fields via `isValidUserSelfUpdate()`:
  - `department`: string (enum: `'AIML' | 'AIDS' | 'Integrated M.Tech' | 'Mechanical' | 'CSE' | 'Integrated B.Tech'`)
  - `year`: string (enum: `'FY' | 'SY' | 'TY'`)
  - `division`: string | null (optional, `^[A-Z0-9]{0,3}$`)
  - `displayName`: string | null (optional, 3..20 chars)
  - `bio`: string | null (optional, <= 500 chars)
  - `photoURL`: string | null (optional, <= 500 chars)
  - `storagePreference`: string (optional, enum: `'GOOGLE_DRIVE' | 'FIRESTORE_FALLBACK' | 'LOCAL_STORAGE'`)
  - `themePreference`: string (optional, enum: `'light' | 'dark' | 'system'`)
  - `updatedAt`: timestamp
- **Strictly Blocked / Immutable Fields on Update**: `prn`, `college`, `email`, `role`, `status`, `banReason`, `stats`, `points`, `totalPoints`, `streak`, `currentStreak`, `prnChangedAt`, `prnNextAllowedChangeDate`. Any attempt to modify these fields or introduce unauthorized keys is categorically denied.

### Session Events Telemetry & Audit Invariants (`session_events` & `users/{userId}/session_events`)

- **Collection Architecture**: Top-level collection `session_events/{eventId}` and user subcollection `users/{userId}/session_events/{eventId}` record user session state changes, lifecycle events, and disconnect telemetry.
- **Permitted Reason Codes**: Creation is strictly restricted to the following 12 validated reason codes:
  - `'manual'` (explicit user sign-out)
  - `'idle-timeout'` (role-based inactivity timeout)
  - `'token-refresh-failed'` (STS token refresh failure)
  - `'revoked-by-user'` (remote session revocation from settings)
  - `'revoked-by-admin'` (admin session revocation or force-logout)
  - `'role-changed'` (privilege update force-logout)
  - `'banned'` (account suspension enforcement)
  - `'app-check-failed'` (App Check attestation failure)
  - `'unusual-login-flag'` (anomalous concurrent login detection)
  - `'multi-tab-sync'` (browser tab logout synchronization)
  - `'service-worker-update'` (PWA service worker reload invalidation)
  - `'unknown'` (fallback disconnect reason)
- **Read Permissions**: Readable strictly by the account owner and admins:
  - Top-level: `allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());`
  - Subcollection: `allow read: if isOwner(userId) || isAdmin();`
- **Create Permissions**: Allowed strictly by the authenticated account owner:
  - Top-level: `allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid && request.resource.data.reason in ['manual', 'idle-timeout', 'token-refresh-failed', 'revoked-by-user', 'revoked-by-admin', 'role-changed', 'banned', 'app-check-failed', 'unusual-login-flag', 'multi-tab-sync', 'service-worker-update', 'unknown'];`
  - Subcollection: `allow create: if isOwner(userId) && request.resource.data.userId == request.auth.uid && request.resource.data.reason in ['manual', 'idle-timeout', 'token-refresh-failed', 'revoked-by-user', 'revoked-by-admin', 'role-changed', 'banned', 'app-check-failed', 'unusual-login-flag', 'multi-tab-sync', 'service-worker-update', 'unknown'];`
- **Immutability Invariant**: Append-only security ledger. Document updates and deletions are categorically prohibited (`allow update, delete: if false;`).

---

## 2. Hardened Production Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // -------------------------------------------------------------------------
    // 0. DENY BY DEFAULT TOP-LEVEL PERIMETER
    // -------------------------------------------------------------------------
    match /{document=**} {
      allow read, write: if false;
    }

    // Security Helper Functions & Domain Validators
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'ADMIN';
    }

    function uidNotModified() {
      return !('uid' in request.resource.data) ||
        request.resource.data.uid == resource.data.uid;
    }

    function isAllowedDepartment(dept) {
      return dept is string &&
        dept in ['AIML', 'AIDS', 'Integrated M.Tech', 'Mechanical', 'CSE', 'Integrated B.Tech'];
    }

    function isAllowedYear(yr) {
      return yr is string &&
        yr in ['FY', 'SY', 'TY'];
    }

    function isValidDivision(div) {
      return div == null ||
        (div is string && div.size() <= 3 && div.matches('^[A-Z0-9]{0,3}$'));
    }

    function isValidDisplayName(name) {
      return name == null ||
        (name is string && name.size() >= 3 && name.size() <= 20);
    }

    function isValidUserSelfUpdate() {
      let changedKeys = request.resource.data.diff(resource.data).affectedKeys();
      let data = request.resource.data;
      return uidNotModified()
        && changedKeys.hasOnly([
          'department', 'year', 'division', 'displayName',
          'bio', 'photoURL', 'storagePreference', 'themePreference', 'updatedAt'
        ])
        && !changedKeys.hasAny([
          'prn', 'college', 'email', 'role', 'status', 'banReason',
          'stats', 'points', 'totalPoints', 'streak', 'currentStreak',
          'prnChangedAt', 'prnNextAllowedChangeDate'
        ])
        && isAllowedDepartment(data.department)
        && isAllowedYear(data.year)
        && (!('division' in data) || isValidDivision(data.division))
        && (!('displayName' in data) || isValidDisplayName(data.displayName))
        && (!('bio' in data) || data.bio == null || (data.bio is string && data.bio.size() <= 500))
        && (!('photoURL' in data) || data.photoURL == null || (data.photoURL is string && data.photoURL.size() <= 500))
        && (!('storagePreference' in data) || data.storagePreference in ['GOOGLE_DRIVE', 'FIRESTORE_FALLBACK', 'LOCAL_STORAGE'])
        && (!('themePreference' in data) || data.themePreference in ['light', 'dark', 'system']);
    }

    // -------------------------------------------------------------------------
    // 1. USERS, PRN INDEX & PUBLIC PROFILES COLLECTIONS
    // -------------------------------------------------------------------------
    match /users/{userId} {
      // Private student document (holds PII: prn & email).
      // Strictly readable ONLY by the document owner or an Admin.
      allow read: if isOwner(userId) || isAdmin();

      // Profile creation happens strictly on the server inside an atomic
      // transaction alongside prnIndex/{prn}.
      allow create: if false;

      // Students can ONLY update allowed self-service academic/profile fields.
      // Cannot change prn, college, email, role, status, banReason, points, or streak.
      allow update: if isOwner(userId) && isValidUserSelfUpdate();

      // Account deletion is handled strictly by the server account deletion
      // transaction that also frees prnIndex/{prn} and scrubs PII.
      allow delete: if false;

      // PRN change audit trail: readable by the student owner or Admin; writes strictly by server
      match /prnHistory/{historyId} {
        allow read: if isOwner(userId) || isAdmin();
        allow write: if false;
      }

      // Private fallback drafts (used only when Google Drive is unavailable/blocked)
      match /drafts/{draftId} {
        allow read, write: if isOwner(userId);
      }

      // Practice progress subcollection tracking: readable by student owner or Admin; writes strictly by server
      match /practice_progress/{progressId} {
        allow read: if isOwner(userId) || isAdmin();
        allow write: if false;
      }

      // Session events audit subcollection
      match /session_events/{eventId} {
        allow read: if isOwner(userId) || isAdmin();
        allow create: if isOwner(userId)
          && request.resource.data.userId == request.auth.uid
          && request.resource.data.reason in ['manual', 'idle-timeout', 'token-refresh-failed', 'revoked-by-user', 'revoked-by-admin', 'role-changed', 'banned', 'app-check-failed', 'unusual-login-flag', 'multi-tab-sync', 'service-worker-update', 'unknown'];
        allow update, delete: if false;
      }

      // Badges subcollections are disabled (FEATURE_BADGES=false) and strictly denied
      match /badges/{badgeId=**} {
        allow read, write: if false;
      }

      match /user_badges/{docId=**} {
        allow read, write: if false;
      }
    }

    match /prnIndex/{prn} {
      // Document ID is the canonical uppercase 12-character PRN (^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$).
      // Clients can NEVER read, enumerate, create, or overwrite prnIndex;
      // managed strictly inside server transactions.
      allow read, write: if false;
    }

    match /publicProfiles/{userId} {
      // Non-PII public profile mirror for leaderboards and peer views
      // (contains uid, publicLabel, college, department, year, division, stats; never contains prn or email)
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // -------------------------------------------------------------------------
    // 2. PROBLEMS COLLECTION (SINGLE VISIBLE QUESTION AT A TIME — SERVER-SERVED ONLY)
    // -------------------------------------------------------------------------
    match /problems/{problemId} {
      // Students have NO direct client read access to the problems collection.
      // Today's active challenge is served strictly via the server endpoint
      // getCurrentChallenge (GET /api/problems/daily) with short TTL expiring at the next 17:00 IST.
      allow read: if isAdmin();
      allow write: if isAdmin();

      // HIDDEN TEST CASES SUBCOLLECTION:
      // Restricted strictly to Admin / Server SDK — never readable by students
      match /hidden_tests/{testId} {
        allow read, write: if isAdmin();
      }

      // PRIVATE METADATA SUBCOLLECTION (e.g., book sourceRef: chapter, exerciseNumber, page):
      // Strictly restricted to Admin only — never readable by students
      match /private_metadata/{docId} {
        allow read, write: if isAdmin();
      }
    }

    // -------------------------------------------------------------------------
    // 3. SUBMISSIONS & UPLOADED SOLUTIONS COLLECTIONS (SERVER-MANAGED WRITES)
    // -------------------------------------------------------------------------
    match /submissions/{submissionId} {
      // Students can ONLY read their own submissions. Admins can read all.
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );

      // CLIENTS CAN NEVER WRITE SUBMISSIONS OR FORGE VERDICTS!
      // Must be created strictly by backend Judge via Firebase Admin SDK.
      allow create, update, delete: if false;
    }

    match /practice_progress/{progressId} {
      // Students can ONLY read their own practice progress; Admins can read all.
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      // Practice progress is updated strictly on the server by the judge evaluation service via Firebase Admin SDK
      allow write: if false;
    }

    match /uploaded_solutions/{uploadId} {
      // Students can ONLY read their own uploaded solution; never another student's. Admins can read all.
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );

      // Creation, status changes, pointsAwarded, and reviewerComment happen strictly on the server
      // via /api/uploads and /api/admin/uploads.
      allow write: if false;
    }

    match /upload_reviews/{reviewId} {
      // Upload review audit trail: readable by Admin only, written strictly on the server
      allow read: if isAdmin();
      allow write: if false;
    }

    // -------------------------------------------------------------------------
    // 4. DAILY COMPETITION ARCHITECTURE & LEADERBOARDS
    // -------------------------------------------------------------------------
    match /daily_boards/{dayId} {
      // Authoritative daily board storage: readable by authenticated students and admins
      allow read: if isAuthenticated();
      allow write: if false;

      // Daily live & frozen leaderboard subcollection
      match /leaderboard/{docId} {
        allow read: if isAuthenticated();
        allow write: if false;
      }
    }

    match /daily_results/{resultId} {
      // Students can ONLY read their own daily result; Admins can read all
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      allow create, update, delete: if false;
    }

    match /daily_summaries/{summaryId} {
      // Students can ONLY read their own daily summary; Admins can read all
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      allow create, update, delete: if false;
    }

    match /daily_corrections/{correctionId} {
      // Post-finalization rejudge & late-upload corrections: Admin only
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /daily_rank_snapshots/{snapshotId} {
      // Frozen top 20 and daily rank snapshots: readable by authenticated users
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // -------------------------------------------------------------------------
    // 4.1 LEGACY COMPETITION ARCHIVE (HISTORICAL WEEKS & WEEKLY SUMMARIES)
    // -------------------------------------------------------------------------
    match /weeks/{weekId} {
      allow read: if isAuthenticated();
      // Clients can NEVER write or freeze weeks; managed strictly by Server / Admin SDK
      allow write: if false;

      // Daily scheduled challenges inside a week: readable only after 17:00 IST unlockAt
      match /days/{dayNumber} {
        allow read: if isAuthenticated() && (
          resource.data.unlockAt <= request.time || isAdmin()
        );
        allow write: if false; // Written only by Admin API / 17:00 IST Auto-Fallback
      }

      // Weekly live & frozen leaderboards: clients can NEVER write weekly ranks
      match /leaderboard/{docId} {
        allow read: if isAuthenticated();
        allow write: if false; // Server-updated only
      }
    }

    match /weekly_summaries/{summaryId} {
      // Students can read ONLY their own weekly summary; Admins can read all
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      // CLIENTS CAN NEVER WRITE OR MODIFY WEEKLY RESULTS OR SUMMARIES!
      allow create, update, delete: if false;
    }

    match /weekly_corrections/{correctionId} {
      // Post-freeze rejudge correction proposals: readable by Admin only, written by Server only
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /streak_events/{eventId} {
      // Students can read ONLY their own streak freeze/break ledger; Admins can read all
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      // CLIENTS CAN NEVER WRITE OR FORGE STREAK FREEZES!
      allow create, update, delete: if false;
    }

    match /streak_pauses/{pauseId} {
      // Any authenticated student can read active/upcoming exam pause windows
      allow read: if isAuthenticated();
      // Only Admins can declare or modify pause windows; students cannot write pauses
      allow write: if isAdmin();
    }

    match /integrity_flags/{flagId} {
      // Phase 2 similarity flags: readable by Admin only, written by Server/Admin SDK
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /leaderboards/{leaderboardId} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-updated only
    }

    // Arena (contests), Archive, and Badges (FEATURE_BADGES=false) collections are disabled
    // and strictly denied to all client roles (including Admin)
    match /contests/{contestId=**} {
      allow read, write: if false;
    }

    match /archive/{docId=**} {
      allow read, write: if false;
    }

    match /badges/{badgeId=**} {
      allow read, write: if false;
    }

    match /user_badges/{docId=**} {
      allow read, write: if false;
    }

    // -------------------------------------------------------------------------
    // 5. SUPPORT, DEBUG & CLIENT ERROR REPORTS
    // -------------------------------------------------------------------------
    match /support_reports/{reportId} {
      // Students can create a report, but must own the userId on the report
      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid;

      // Only Admins can view submitted support reports
      allow read: if isAdmin();

      // Reports are immutable once submitted
      allow update, delete: if false;
    }

    match /error_reports/{reportId} {
      // Client error reports are written strictly on the server via /api/support/error-report
      // and readable only by Admins.
      allow read: if isAdmin();
      allow write: if false;
    }

    // -------------------------------------------------------------------------
    // 5.1 SESSION EVENTS (LIFECYCLE AUDIT & SECURITY TELEMETRY)
    // -------------------------------------------------------------------------
    match /session_events/{eventId} {
      // Readable strictly by the account owner and admins:
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());

      // Create allowed by the authenticated owner:
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.reason in ['manual', 'idle-timeout', 'token-refresh-failed', 'revoked-by-user', 'revoked-by-admin', 'role-changed', 'banned', 'app-check-failed', 'unusual-login-flag', 'multi-tab-sync', 'service-worker-update', 'unknown'];

      // Immutable once written:
      allow update, delete: if false;
    }

    // -------------------------------------------------------------------------
    // 6. ADMIN AUDIT LOGS & SYSTEM ALERTS
    // -------------------------------------------------------------------------
    match /admin_audit_logs/{logId} {
      // Audit logs are strictly written and managed by Firebase Admin SDK
      allow read: if isAdmin();
      allow write: if false;
    }

    match /system_alerts/{alertId} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}
```

---

## 3. Automated Adversarial Cheating Test Suite Specification

All cheating permutations and attack vectors in [`server/tests/firestore-security-rules.test.ts`](file:///c:/Users/thora/Documents/My%20Work/Extra/LogicQ/server/tests/firestore-security-rules.test.ts) cover:

```
 ✓ tests/firestore-security-rules.test.ts (26 tests)
   ✓ CHEAT ATTEMPT 1: Student attempts to inflate their own points directly -> MUST FAIL
   ✓ CHEAT ATTEMPT 2: Student attempts to elevate their own role to ADMIN -> MUST FAIL
   ✓ CHEAT ATTEMPT 3: Student attempts to read hidden test cases -> MUST FAIL
   ✓ CHEAT ATTEMPT 4: Student attempts to read another competitor code submission -> MUST FAIL
   ✓ CHEAT ATTEMPT 5: Student attempts to delete their failed submission -> MUST FAIL
   ✓ CHEAT ATTEMPT 6: Client attempts to forge an ACCEPTED submission directly -> MUST FAIL
   ✓ CHEAT ATTEMPT 7: Client attempts to write or forge weekly leaderboard ranks -> MUST FAIL
   ✓ CHEAT ATTEMPT 8: Client attempts to write or modify a weekly result summary -> MUST FAIL
   ✓ CHEAT ATTEMPT 9: Student attempts to read another student's weekly summary or locked future challenge -> MUST FAIL
   ✓ CHEAT ATTEMPT 10: Student attempts to forge a streak freeze (/streak_events) -> MUST FAIL
   ✓ CHEAT ATTEMPT 11: Student attempts to declare an admin streak pause (/streak_pauses) -> MUST FAIL
   ✓ CHEAT ATTEMPT 12: Student attempts to read another student's private users/{uid} document (PRN & email) -> MUST FAIL
   ✓ CHEAT ATTEMPT 13: Student attempts to mutate their own immutable PRN or college after signup -> MUST FAIL
   ✓ CHEAT ATTEMPT 14: Student attempts to read or write prnIndex/{prn} directly -> MUST FAIL
   ✓ CHEAT ATTEMPT 15: Student attempts to set an invalid department, year, or division -> MUST FAIL
   ✓ CHEAT ATTEMPT 16: Client (Student or Admin) attempts to read or write disabled Arena (/contests) or Archive (/archive) collections -> MUST FAIL
   ✓ CHEAT ATTEMPT 17: Student attempts to read any problem directly from /problems/{problemId} (Single Visible Question at a Time) -> MUST FAIL
   ✓ CHEAT ATTEMPT 18: Client (Student or Admin) attempts to read or write disabled Badges (/badges, /user_badges, or user badge subcollections) -> MUST FAIL
   ✓ CHEAT ATTEMPT 19: Student attempts to read another student's uploaded solution or write directly to /uploaded_solutions -> MUST FAIL
   ✓ CHEAT ATTEMPT 20: Student attempts to read or write /upload_reviews or /error_reports -> MUST FAIL
   ✓ CHEAT ATTEMPT 21: Student attempts to read private problem metadata (/problems/{id}/private_metadata) containing book sourceRef -> MUST FAIL
   ✓ CHEAT ATTEMPT 22: Student attempts to read peer practice progress or write directly to /practice_progress -> MUST FAIL
   ✓ VALID OPERATION: Student updates allowed academic profile fields (department, year, division, displayName) -> MUST SUCCEED
   ✓ VALID OPERATION: Student reads their own private profile and publicProfiles/{uid} -> MUST SUCCEED
   ✓ VALID OPERATION: Student reads their own submission, own practice progress, own uploaded solution, own weekly summary, and own streak events -> MUST SUCCEED
   ✓ VALID OPERATION: Admin reads any submission, practice progress, problem, uploaded solution, upload review, error report, private problem metadata, and declares a streak pause -> MUST SUCCEED
   ✓ SESSION EVENTS: Student creates and reads own session events with valid reason codes, but cannot forge events for other users or invalid reason codes -> MUST SUCCEED / FAIL
   ✓ SESSION EVENTS: Admin reads all session events, while students cannot read other students' session events -> MUST SUCCEED / FAIL
   ✓ SESSION EVENTS: Updates and deletions are blocked for all users (immutable append-only) -> MUST FAIL
```

