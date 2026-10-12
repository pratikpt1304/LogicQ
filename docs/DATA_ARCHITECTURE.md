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
| **Private User Document (PII + PRN)** | Firebase Auth + Firestore (`users/{uid}`) | Owner / Admin Read; Validated Student Update (`department`, `year`, `division`, `displayName`) | **YES** | Stores private `prn` (`^[0-9]{12}$`) and `email`. Never readable by other students. `prn` and `college` are immutable after signup except via audited Admin re-authenticated action. |
| **PRN Uniqueness Index** | Firestore (`prnIndex/{prn}`) / SQL (`PrnIndex`) | **Server Transaction Only** (`allow read, write: if false;`) | **YES** | Enforces 1-to-1 uniqueness of 12-digit PRNs inside an atomic transaction on signup/profile completion. Freed upon account deletion. |
| **Public Profile Mirror (Non-PII)** | Firestore (`publicProfiles/{uid}`) | Authenticated Read / Server Write | **YES** | Exposes non-PII fields (`displayName` or `"Student <shortId>"`, `college`, `department`, `year`, `division`, `stats`). **Never** contains `prn` or `email`. |
| **Problem Statements & Samples** | Firestore (`problems`) | Public Read (Published only) | **YES** | Problem catalog, constraints, and visible samples. Client read-only. |
| **Hidden Test Cases** | Firestore (`problems/{id}/hidden_tests`) | **Server Only** (`allow: false`) | **YES** | Encrypted/hidden test cases. Clients have zero read access. Executed only by judge worker. |
| **Evaluated Submissions & Verdicts**| Firestore (`submissions`) | Server Write / Owner or Admin Read | **YES** | Authoritative submission log, runtime (ms), memory (KB), and verdict. Client cannot create or edit. |
| **Points & Streaks** | Firestore (`users/{uid}/stats`) | Server Write Only | **YES** | Progression metrics calculated strictly in Cloud Functions upon Accepted verdicts (`FEATURE_BADGES=false` disables badge awarding and client access). |
| **Weekly Summaries & Leaderboards** | Firestore (`weeks/{id}/leaderboard`, `weekly_summaries`) | Server Write / Filtered Read | **YES** | Supports optional `department` and `year` filtering; own row displays masked PRN (`••••••5678`) only to the student themselves. |
| **Admin Audit Trail** | Firestore (`admin_audit_logs`) | Server-Admin SDK Only | **YES** | Immutable log of administrative actions (PRN/college edits with re-auth, bans, problem publishing, rejudges). |
| **In-Progress Code Drafts** | **Student Google Drive** (`drive.appdata`) | Client via Google OAuth | **NO** | Draft code per problem (`drafts/{slug}.c`). Never read by server judge. |
| **Draft Fallback (When Drive Blocked)**| Firestore (`users/{uid}/drafts`) or Local | Private Client / Per-User Rule | **NO** | Fallback when campus Google Workspace blocks third-party Drive access. |
| **Student Personal Notes** | **Student Google Drive** (`notes/{slug}.md`)| Client via Google OAuth | **NO** | Private scratchpads for algorithmic brainstorming. |
| **Editor Preferences** | **Student Google Drive** (`settings/editor.json`)| Client via Google OAuth | **NO** | Monaco font size, theme preference, vim keybindings. |
| **Exportable Submission Backup** | **Student Google Drive** (`backups/*.json`) | Client via Google OAuth | **NO** | Student-owned portable archive of their coding history. |
| **Support / Debug Reports** | Firestore (`support_reports`) | User Create / Admin Read | **YES** | Student-initiated, consented error report with environment telemetry. |

---

## 3. Firestore Entity Schemas & Collections

### Config-Driven Academic Constants
```typescript
export const ALLOWED_COLLEGES = ['Sanjivani University'] as const;
export const ALLOWED_DEPARTMENTS = [
  'AIML',
  'AIDS',
  'Integrated M.Tech',
  'Mechanical',
  'CSE',
  'Integrated B.Tech',
] as const;
export const ALLOWED_YEARS = ['FY', 'SY', 'TY'] as const;
export const PRN_REGEX = /^[0-9]{12}$/;
export const DIVISION_REGEX = /^[A-Za-z0-9]{0,3}$/;
```

### Collection: `users/{userId}` (Private Student Document)
```typescript
// READABLE ONLY BY OWNER (request.auth.uid == userId) OR ADMIN
// STUDENT UPDATE ALLOWED ONLY ON: ['department', 'year', 'division', 'displayName', 'bio', 'photoURL', 'storagePreference']
// IMMUTABLE BY STUDENT: 'prn', 'college', 'email', 'role', 'status', 'stats'
interface FirestoreUser {
  uid: string;
  prn: string; // Exactly 12 digits (^[0-9]{12}$), private PII — NEVER exposed to other students
  email: string; // College email
  college: 'Sanjivani University'; // Immutable after signup (admin-only audited change)
  department: 'AIML' | 'AIDS' | 'Integrated M.Tech' | 'Mechanical' | 'CSE' | 'Integrated B.Tech';
  year: 'FY' | 'SY' | 'TY';
  division?: string | null; // Optional, 0-3 alphanumeric characters stored UPPERCASE (e.g. "A", "B", "C1")
  displayName?: string | null; // Optional student-chosen public label (3-20 chars, profanity-filtered)
  shortId: string; // Short random non-PII suffix used for fallback public label ("Student 4F9A")
  profileComplete: boolean; // False until PRN, college, department, year are completed (gates Google Sign-In)
  photoURL?: string;
  role: 'STUDENT' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
  banReason?: string;
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

### Collection: `prnIndex/{prn}` (Transactional PRN Uniqueness Lock)
```typescript
// STRICTLY SERVER-ONLY (allow read, write: if false;)
// Created atomically inside a transaction alongside users/{uid}.
// Deleted when the user deletes their account, or re-keyed in a transaction when an Admin updates a PRN.
interface FirestorePrnIndex {
  prn: string; // Document ID: 12-digit PRN (^[0-9]{12}$)
  userId: string; // Bound Firebase Auth UID / User ID (1 PRN per account)
  createdAt: FirebaseFirestore.Timestamp;
}
```

### Collection: `publicProfiles/{userId}` (Privacy-Safe Public View)
```typescript
// Readable by authenticated students for leaderboards and peer profiles.
// NEVER contains `prn` or `email`.
interface FirestorePublicProfile {
  uid: string;
  publicLabel: string; // displayName (3-20 chars) if set, otherwise "Student " + shortId
  college: string;
  department: string;
  year: string;
  division?: string | null;
  stats: {
    points: number;
    streak: number;
    solvedProblemsCount: number;
  };
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### Privacy, Masking, Data Export & Account Deletion Rules
- **Own-View Masked PRN**: When a student views their own profile or their own pinned row on the weekly leaderboard, the server formats their identity label with `department`, `year`, and the last 4 digits of their PRN masked as `"••••••5678"` (e.g., `"AIML • FY • ••••••5678"`).
- **Other Students' View**: Other students never receive the `prn` or `maskedPrn` of peers; they see `displayName` (if configured) or `"Student " + shortId`.
- **Data Export (`GET /api/users/me/export`)**: Exports full personal record including `prn`, `college`, `department`, `year`, `division`, `displayName`, `email`, submissions, and points.
- **Account Deletion (`DELETE /api/users/me`)**: Removes `prn` from `users/{uid}`, deletes `prnIndex/{prn}` so the PRN is freed, clears `publicProfiles/{uid}` and profile PII (`email`, `displayName`, `division`, `bio`, `avatarUrl`), and retains only anonymized submission/leaderboard aggregates with no link to the student's PRN or email.


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
