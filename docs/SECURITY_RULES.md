# LogicQ Firestore Security Rules & Emulator Verification Suite

## 1. Security Invariants & Threat Boundaries

LogicQ follows a strict **Deny-by-Default Architecture**. Any collection or operation not explicitly authorized is categorically rejected.

```
+----------------------------------------------------------------------------------------------------+
|                                FIRESTORE DENY-BY-DEFAULT PERIMETER                                 |
|                                                                                                    |
|  match /{document=**} { allow read, write: if false; }                                            |
|                                                                                                    |
|  - Verdict Creation:         BLOCKED TO ALL CLIENTS (Server Admin SDK only)                       |
|  - Points & Streak Mutation: BLOCKED TO ALL CLIENTS (Server Admin SDK only)                       |
|  - Hidden Test Cases:        BLOCKED TO ALL CLIENTS (allow read, write: if false;)                |
|  - Peer Code Inspection:     BLOCKED (Students read only their own submissions)                   |
|  - Role Elevation:           BLOCKED (request.auth.token.role == 'ADMIN' custom claim required)   |
|  - Deletion of Submissions:  BLOCKED TO ALL CLIENTS (Append-only ledger enforced)                |
+----------------------------------------------------------------------------------------------------+
```

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

    // Security Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'ADMIN';
    }

    // -------------------------------------------------------------------------
    // 1. USERS COLLECTION
    // -------------------------------------------------------------------------
    match /users/{userId} {
      // Authenticated users can read public user profile data for leaderboards
      allow read: if isAuthenticated();

      // Users can only create their own base profile upon first login
      allow create: if isOwner(userId)
                    && request.resource.data.role == 'STUDENT'
                    && request.resource.data.stats.points == 0
                    && request.resource.data.stats.streak == 0;

      // Users can update non-authoritative profile fields (college, graduationYear, bio)
      // BUT CANNOT modify role, status, points, or streaks!
      allow update: if isOwner(userId)
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny([
                         'role', 'status', 'banReason', 'stats', 'points', 'totalPoints', 'streak', 'currentStreak'
                       ]);

      // Submissions and user records cannot be deleted by clients
      allow delete: if false;

      // Private fallback drafts (used only when Google Drive is unavailable/blocked)
      match /drafts/{draftId} {
        allow read, write: if isOwner(userId);
      }
    }

    // -------------------------------------------------------------------------
    // 2. PROBLEMS COLLECTION
    // -------------------------------------------------------------------------
    match /problems/{problemId} {
      // Students can read published problems; admins can read drafts
      allow read: if isAuthenticated() && (
        resource.data.status == 'PUBLISHED' || isAdmin()
      );

      // Only Admins can create or update problem statements
      allow write: if isAdmin();

      // HIDDEN TEST CASES SUBCOLLECTION:
      // STRICTLY FORBIDDEN TO ALL CLIENTS - NEVER READABLE OR WRITABLE FROM BROWSER
      match /hidden_tests/{testId} {
        allow read, write: if false;
      }
    }

    // -------------------------------------------------------------------------
    // 3. SUBMISSIONS COLLECTION (APPEND-ONLY & UNTOUCHABLE BY CLIENTS)
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

    // -------------------------------------------------------------------------
    // 4. LEADERBOARDS & CONTESTS
    // -------------------------------------------------------------------------
    match /leaderboards/{leaderboardId} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-updated only
    }

    match /contests/{contestId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // -------------------------------------------------------------------------
    // 5. SUPPORT & DEBUG REPORTS
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

    // -------------------------------------------------------------------------
    // 6. ADMIN AUDIT LOGS
    // -------------------------------------------------------------------------
    match /admin_audit_logs/{logId} {
      // Audit logs are strictly written and managed by Firebase Admin SDK
      allow read, write: if false;
    }
  }
}
```

---

## 3. Automated Adversarial Cheating Test Suite Results

All cheating permutations and attack vectors are tested in [`server/tests/firestore-security-rules.test.ts`](file:///c:/Users/thora/Documents/My%20Work/Extra/LogicQ/server/tests/firestore-security-rules.test.ts):

```
 ✓ tests/firestore-security-rules.test.ts (8 tests)
   ✓ CHEAT ATTEMPT 1: Student attempts to inflate their own points directly -> MUST FAIL
   ✓ CHEAT ATTEMPT 2: Student attempts to elevate their own role to ADMIN -> MUST FAIL
   ✓ CHEAT ATTEMPT 3: Student attempts to read hidden test cases -> MUST FAIL
   ✓ CHEAT ATTEMPT 4: Student attempts to read another competitor code submission -> MUST FAIL
   ✓ CHEAT ATTEMPT 5: Student attempts to delete their failed submission -> MUST FAIL
   ✓ CHEAT ATTEMPT 6: Client attempts to forge an ACCEPTED submission directly -> MUST FAIL
   ✓ VALID OPERATION: Student reads their own submission -> MUST SUCCEED
   ✓ VALID OPERATION: Admin reads any submission -> MUST SUCCEED

 Test Files  1 passed (1)
      Tests  8 passed (8)
```
