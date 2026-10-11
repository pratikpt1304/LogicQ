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
    // 4. WEEKLY COMPETITION, LEADERBOARDS, SUMMARIES & CONTESTS
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
 ✓ tests/firestore-security-rules.test.ts (13 tests)
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
   ✓ VALID OPERATION: Student reads their own submission, own weekly summary, and own streak events -> MUST SUCCEED
   ✓ VALID OPERATION: Admin reads any submission, weekly correction queue, and declares a streak pause -> MUST SUCCEED
```

