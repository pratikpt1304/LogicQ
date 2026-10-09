# LogicQ Firestore Security Rules & Emulator Verification Suite

## 1. Security Invariants & Threat Boundaries

Firestore is the authoritative record for all trusted platform state. LogicQ enforces six uncompromising security invariants in Firestore Security Rules:

1. **Zero Client Verdict Creation**: A client web browser can **NEVER** write or update a `Submission` document. All submissions are processed and written strictly by backend Cloud Functions / Cloud Run containers using the privileged Firebase Admin SDK.
2. **Zero Client Point or Streak Mutation**: Clients can never write to user stats, points, streaks, or ranks. Any client attempt to alter `stats.points` or `stats.streak` is unconditionally rejected.
3. **Hidden Test Cases Are Inviolable**: The `hidden_tests` subcollection is blocked to all client queries (`allow read, write: if false;`). It can only be read by the server-side judge worker.
4. **Submission Privacy**: A student can only query and read their own submissions (`request.auth.uid == resource.data.userId`). They cannot view code or test breakdowns of other competitors.
5. **Admin Access Governed by Custom Claims**: Administrative privileges require `request.auth.token.role == 'ADMIN'`, a claim that can only be issued by trusted backend service accounts.
6. **Audit Trail Immutability**: `admin_audit_logs` cannot be queried or written by any client, ensuring administrators cannot tamper with audit trails via browser consoles.

---

## 2. Complete Production Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
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
    // USERS COLLECTION
    // -------------------------------------------------------------------------
    match /users/{userId} {
      // Any authenticated user can read public user profile data for leaderboards
      allow read: if isAuthenticated();

      // Users can only create their own base profile upon first login
      allow create: if isOwner(userId)
                    && request.resource.data.role == 'STUDENT'
                    && request.resource.data.stats.points == 0
                    && request.resource.data.stats.streak == 0;

      // Users can update non-authoritative profile fields (college, graduationYear)
      // BUT CANNOT modify role, status, points, or streaks!
      allow update: if isOwner(userId)
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny([
                         'role', 'status', 'banReason', 'stats'
                       ]);

      // Only server Admin SDK can delete users or update roles/stats
      allow delete: if false;

      // Private fallback drafts (used when Google Drive is unavailable/blocked)
      match /drafts/{draftId} {
        allow read, write: if isOwner(userId);
      }
    }

    // -------------------------------------------------------------------------
    // PROBLEMS COLLECTION
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
    // SUBMISSIONS COLLECTION
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
    // LEADERBOARDS & CONTESTS
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
    // SUPPORT & DEBUG REPORTS
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
    // ADMIN AUDIT LOGS
    // -------------------------------------------------------------------------
    match /admin_audit_logs/{logId} {
      // Audit logs are strictly written and managed by Firebase Admin SDK
      allow read, write: if false;
    }
  }
}
```

---

## 3. Firebase Emulator Test Suite Specification (`tests/firestore-rules.test.ts`)

To verify the rules against real-world adversarial attacks, LogicQ includes an automated test suite using `@firebase/rules-unit-testing`:

### Test Matrix & Adversarial Attack Scenarios

| Test ID | Scenario Description | Actor | Target Resource | Action | Expected Outcome |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | Student reads published challenge statement | Student (`alice`) | `/problems/two-sum` | `GET` | ✅ **PERMITTED** |
| **SEC-02** | Student attempts to read unpublished draft problem | Student (`alice`) | `/problems/draft-knapsack` | `GET` | 🛑 **DENIED** |
| **SEC-03** | Student attempts to read hidden test cases | Student (`alice`) | `/problems/two-sum/hidden_tests/test1` | `GET` | 🛑 **DENIED** |
| **SEC-04** | Student attempts to forge an `ACCEPTED` submission | Student (`alice`) | `/submissions/sub_123` | `SET` | 🛑 **DENIED** |
| **SEC-05** | Student attempts to inflate their XP points in profile | Student (`alice`) | `/users/alice` (`stats.points += 500`) | `UPDATE` | 🛑 **DENIED** |
| **SEC-06** | Student attempts to elevate themselves to `ADMIN` | Student (`alice`) | `/users/alice` (`role = 'ADMIN'`) | `UPDATE` | 🛑 **DENIED** |
| **SEC-07** | Student reads their own submission history | Student (`alice`) | `/submissions/alice_sub_1` | `GET` | ✅ **PERMITTED** |
| **SEC-08** | Student attempts to view rival competitor's submission | Student (`alice`) | `/submissions/bob_sub_1` | `GET` | 🛑 **DENIED** |
| **SEC-09** | Student saves private draft to their fallback vault | Student (`alice`) | `/users/alice/drafts/two-sum` | `SET` | ✅ **PERMITTED** |
| **SEC-10** | Student attempts to overwrite rival's private draft | Student (`alice`) | `/users/bob/drafts/two-sum` | `SET` | 🛑 **DENIED** |
| **SEC-11** | Student submits consented debug report with own UID | Student (`alice`) | `/support_reports/rep_1` | `CREATE` | ✅ **PERMITTED** |
| **SEC-12** | Student attempts to spoof debug report with victim UID | Student (`alice`) | `/support_reports/rep_1` (`userId: 'bob'`) | `CREATE` | 🛑 **DENIED** |
| **SEC-13** | Admin views all submissions and debug reports | Admin (`charlie`) | `/submissions/bob_sub_1`, `/support_reports` | `GET` | ✅ **PERMITTED** |
| **SEC-14** | Client attempts to tamper with audit logs directly | Admin (`charlie`) | `/admin_audit_logs/log_1` | `SET` | 🛑 **DENIED** |

---

## 4. Running the Rules Verification in Local Emulator

Run the automated security rules suite in the development environment:
```bash
# 1. Start Firebase Local Firestore Emulator
npx firebase emulators:exec --only firestore "npm run test:rules"
```
The test runner confirms that all 14 adversarial permutations return the exact expected security verdicts with zero privilege leaks.
