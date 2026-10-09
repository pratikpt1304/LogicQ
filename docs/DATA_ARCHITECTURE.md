# LogicQ Dual-Tier Data Architecture: Firebase & Google Drive

## 1. Architectural Philosophy & Dual-Tier Paradigm

LogicQ operates on a **Zero-Trust, User-Centric Data Partitioning Architecture**:

```
+----------------------------------------------------------------------------------------------------+
|                                    LOGICQ DUAL-TIER DATA TOPOLOGY                                  |
|                                                                                                    |
|  +--------------------------------------------+    +--------------------------------------------+  |
|  |           CENTRAL TIER: FIREBASE           |    |         PERSONAL TIER: GOOGLE DRIVE        |  |
|  |         (Trusted & Authoritative)          |    |          (User-Owned & Sovereign)          |  |
|  +--------------------------------------------+    +--------------------------------------------+  |
|  | - System Integrity & Leaderboard Trust     |    | - Student Code Drafts & In-Progress Work   |  |
|  | - Official Problem Catalog & Hidden Tests  |    | - Personal Learning Notes & Scratchpads    |  |
|  | - Evaluated Submissions & Verdicts         |    | - Custom IDE Settings & Keybindings        |  |
|  | - Student Experience Points & Streaks      |    | - Downloadable Submission Archive Backups  |  |
|  | - Arena Contests & Scoreboard State        |    | - Bound to Student's Personal Google Grant |  |
|  | - Admin Audit Logs & Security Reports      |    | - Completely Inaccessible to Admins        |  |
|  | - Governed by Server-Enforced Firestore    |    | - Fallback to Local/Firestore if Blocked   |  |
|  |   Security Rules & Cloud Functions         |    |                                            |  |
|  +--------------------------------------------+    +--------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### Why Data is Separated:
1. **Uncompromised Competitive Integrity**: Verdicts, points, daily streaks, global ranks, and contest standings must be mathematically tamper-proof. No client write can ever modify an authoritative score.
2. **Student Sovereignty & Privacy**: A student's unsubmitted thoughts, scratch code, iterative drafts, and personal notes belong to them. By storing drafts in their own Google Drive (`drive.appdata`), the platform avoids becoming a custodial eavesdropper on in-progress student work.
3. **Zero Exploitation Vector**: If a student attempts to tamper with files in their Google Drive or intercept network traffic, it has **zero impact** on the competitive ranking, because the server never reads Drive files to evaluate points, verdicts, or leaderboards.

---

## 2. Complete Data Allocation Matrix

| Data Entity | Primary Storage Location | Access Protocol | Authoritative Source? | Rationale & Security Rules |
| :--- | :--- | :--- | :---: | :--- |
| **User Account & Claims** | Firebase Auth + Firestore (`users`) | Server-Admin SDK / Auth Claims | **YES** | Identity, Google UID, and RBAC custom claims (`student`, `admin`). Client read-only. |
| **Problem Statements & Samples** | Firestore (`problems`) | Public Read (Published only) | **YES** | Problem catalog, constraints, and visible samples. Client read-only. |
| **Hidden Test Cases** | Firestore (`problems/{id}/hidden_tests`) | **Server Only** (`allow: false`) | **YES** | Encrypted/hidden test cases. Clients have zero read access. Executed only by judge worker. |
| **Evaluated Submissions & Verdicts**| Firestore (`submissions`) | Server Write / User Read | **YES** | Authoritative submission log, runtime (ms), memory (KB), and verdict. Client cannot create or edit. |
| **Points, Streaks & Badges** | Firestore (`users/{uid}/stats`, `badges`) | Server Write Only | **YES** | Gamification metrics calculated strictly in Cloud Functions upon Accepted verdicts. |
| **Contests & Scoreboards** | Firestore (`contests`) | Server Write / Public Read | **YES** | Synchronized contest definitions and ICPC penalty scoreboards. |
| **Admin Audit Trail** | Firestore (`admin_audit_logs`) | Server-Admin SDK Only | **YES** | Immutable log of administrative actions (bans, problem publishing, rejudges). |
| **In-Progress Code Drafts** | **Student Google Drive** (`drive.appdata`) | Client via Google OAuth | **NO** | Draft code per problem (`drafts/{slug}.c`). Never read by server judge. |
| **Draft Fallback (When Drive Blocked)**| Firestore (`users/{uid}/drafts`) or Local | Private Client / Per-User Rule | **NO** | Fallback when campus Google Workspace blocks third-party Drive access. |
| **Student Personal Notes** | **Student Google Drive** (`notes/{slug}.md`)| Client via Google OAuth | **NO** | Private scratchpads for algorithmic brainstorming. |
| **Editor Preferences** | **Student Google Drive** (`settings/editor.json`)| Client via Google OAuth | **NO** | Monaco font size, theme preference, vim keybindings. |
| **Exportable Submission Backup** | **Student Google Drive** (`backups/*.json`) | Client via Google OAuth | **NO** | Student-owned portable archive of their coding history. |
| **Support / Debug Reports** | Firestore (`support_reports`) | User Create / Admin Read | **YES** | Student-initiated, consented error report with environment telemetry. |

---

## 3. Firestore Entity Schemas & Collections

### Collection: `users/{userId}`
```typescript
interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'STUDENT' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
  banReason?: string;
  college?: string;
  graduationYear?: number;
  stats: {
    points: number;
    streak: number;
    lastActiveDate: string; // YYYY-MM-DD (IST)
    solvedProblemsCount: number;
    hardSolvedCount: number;
  };
  storagePreference: 'GOOGLE_DRIVE' | 'FIRESTORE_FALLBACK' | 'LOCAL_STORAGE';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### Collection: `problems/{problemId}`
```typescript
interface FirestoreProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  statementMarkdown: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  visibleSamples: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;
  referenceSolutionC: string;
  status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'RETIRED';
  hints: Array<{
    tier: 1 | 2 | 3;
    content: string;
  }>;
  authorUid: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// Subcollection: `problems/{problemId}/hidden_tests/{testId}`
// STRICTLY INACCESSIBLE TO CLIENTS (allow read, write: if false;)
interface FirestoreHiddenTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  order: number;
  isAdversarial?: boolean;
}
```

### Collection: `submissions/{submissionId}`
```typescript
interface FirestoreSubmission {
  id: string;
  userId: string;
  problemId: string;
  problemSlug: string;
  contestId?: string; // Present if submitted during active contest
  code: string;
  language: 'C17';
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILE_ERROR';
  runtimeMs: number;
  memoryKb: number;
  compilerOutput?: string;
  totalTests: number;
  passedTests: number;
  isDailyChallenge: boolean;
  awardedXp: number;
  testCaseSummaries: Array<{
    testIndex: number;
    verdict: string;
    runtimeMs: number;
    isSample: boolean; // Hidden test inputs are NOT reflected here
  }>;
  createdAt: FirebaseFirestore.Timestamp;
}
```

### Collection: `support_reports/{reportId}`
```typescript
interface FirestoreSupportReport {
  id: string;
  userId: string;
  userEmail: string;
  problemSlug?: string;
  category: 'BUG' | 'JUDGE_FAILURE' | 'DRIVE_SYNC' | 'ACCOUNT';
  description: string;
  clientTelemetry: {
    appVersion: string;
    browser: string;
    os: string;
    screenResolution: string;
    driveConnected: boolean;
  };
  consoleLogsSnippet?: string;
  draftSnippet?: string; // Explicitly consented snippet
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: FirebaseFirestore.Timestamp;
}
```

---

## 4. Google Drive AppData Folder Topology

When a student grants Google Drive access, files are written exclusively to the student's isolated **Application Data Folder** (`spaces=appDataFolder`):

```
Google Drive (drive.appdata) / LogicQ /
├── drafts/
│   ├── daily-longest-unique-substring.c
│   ├── two-sum.c
│   └── trapping-rain-water.c
├── notes/
│   ├── daily-longest-unique-substring.md
│   └── dynamic-programming-cheatsheet.md
├── settings/
│   └── editor_preferences.json
└── backups/
    └── logicq_submission_backup_2026-10-09.json
```

### Safety Advantages of `drive.appdata`:
- **Hidden from Main Drive UI**: Files do not clutter the student's regular Google Drive or confuse users.
- **Sandboxed from Other Apps**: Other applications with basic Drive scopes cannot view or modify LogicQ app data files.
- **Zero Host Liability**: Personal storage costs are covered by the student's Google account quota, eliminating centralized storage bills for scratchpads and drafts.
