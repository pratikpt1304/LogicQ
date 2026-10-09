# LogicQ Master Engineering Specification & Unified Blueprint

> **STATUS**: THE AUTHORITATIVE SINGLE SOURCE OF TRUTH FOR LOGICQ  
> This specification consolidates the original master requirements, the branding/visual guidelines, the deployment/judge policies, and the **Firebase Central Backend + Student Google Drive Dual-Tier Architecture**. All earlier prompt directives are superseded by this document where conflicts exist.

---

## 1. Conflict Resolution Log & Authoritative Decisions

| # | Dimension | Initial Prompt | Subsequent Directives | Final Authoritative Resolution (Master Spec) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Visual Theme** | Deep dark developer theme | "use white in bg" | **Crisp White Background (`#FFFFFF`)** with clean bordered cards as default; dark mode toggle supported. |
| **2** | **Data Policy** | Seed fake users and demo contest | "Clean and reset entire website for real launch" | **Zero Fake Data Policy**. All test users/submissions purged. 16 curated C problems and 6 badges preserved. |
| **3** | **Backend & Database** | Node.js + Express + PostgreSQL / SQLite | Firebase Central + Student Google Drive | **Dual-Tier Architecture**: Firebase (Auth, Firestore, Cloud Functions/Cloud Run) as trusted central authority + Student Google Drive (`drive.appdata`) for personal data. |
| **4** | **Identity & Roles** | Email/Password JWT in httpOnly cookies | Firebase Auth with Google Sign-in | **Firebase Auth + Google Sign-In Provider**. Roles (`STUDENT`, `ADMIN`) set via server-managed Firebase Custom Claims. |
| **5** | **Client Write Security**| Express REST API endpoints | Firestore Security Rules | **Server-Only Mutation Invariant**: Clients can NEVER write verdicts, points, streaks, or ranks. Firestore rules enforce zero client writes on authoritative collections. |
| **6** | **Student Drafts & Notes**| Centralized database records | Student-owned storage | **Student's Google Drive (`drive.appdata`)** with silent fallback to private Firestore vault/localStorage if college Workspace blocks Drive. |
| **7** | **Maintenance & Privacy**| Global admin access to everything | Zero backdoor into student Drives | **Zero-Backdoor Invariant**: Admins cannot access student Drives. System maintenance via Firebase audit logs; student-initiated "Send Debug Report" modal. |
| **8** | **Judge Sandboxing** | Local GCC in dev | Fail-closed sandboxing | **Isolated Linux Container (Cloud Run / Judge0)**. `LocalGccJudge` strictly disabled in production. Fail-closed if no safe judge configured. |
| **9** | **Scoring Economy** | Unified point counter | Separate daily vs contest ratings | **Dual-Economy Model**: Daily Challenge awards **XP & Streaks**; Arena Contests award **Competitive Rating (Elo)**. |
| **10**| **Release Scope** | Build all features simultaneously | Phased staging with stop checkpoints | **Three-Phase Staged Delivery**: Release 1 (MVP) -> Release 2 (Contests & Badges) -> Release 3 (Intelligence & Anti-Cheating). |

---

## 2. Product Identity & Branding

- **Platform Name**: **LogicQ**
- **Tagline**: *"Think in logic. Code in C."*
- **Visual Identity**: Modern technical minimalism. Sharp SVG logo featuring an interconnected terminal prompt arrow and monogram `Q`. High-contrast typography (Inter / JetBrains Mono).
- **Core Aesthetic**: Clean light workspace (`#FFFFFF` background, subtle borders, crisp code syntax highlighting), accessible contrast, responsive split-pane Monaco IDE.

---

## 3. Technology Stack & Dual-Tier Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                LOGICQ FULL-STACK ARCHITECTURE                                      |
|                                                                                                    |
|  [ Frontend Client: React 18 + Vite + TypeScript + Tailwind CSS + Monaco Editor ]                   |
|        |                                              |                                            |
|        | Google Identity Services                     | HTTPS / WebSockets / Cloud Functions v2    |
|        v (drive.appdata)                              v                                            |
|  +---------------------------+              +---------------------------------------------------+  |
|  | STUDENT GOOGLE DRIVE      |              | CENTRAL TRUSTED TIER: FIREBASE & GOOGLE CLOUD     |  |
|  | (User-Owned & Sovereign)  |              +---------------------------------------------------+  |
|  +---------------------------+              | - Firebase Auth (Google Provider + Custom Claims) |  |
|  | - drafts/{slug}.c         |              | - Cloud Firestore (Authoritative Data Store)      |  |
|  | - notes/{slug}.md         |              | - Cloud Functions v2 (Business Logic & Secrets)   |  |
|  | - settings/editor.json    |              | - Secret Manager (Judge0 Key, API Keys)           |  |
|  | - backups/*.json          |              | - Cloud Run C Judge Sandbox (or Judge0)           |  |
|  |                           |              | - Firebase App Check & Rate Limiting              |  |
|  | * Zero Admin Access       |              | - Firestore Security Rules (Tamper-Proof)         |  |
|  | * Silent Fallback if      |              +---------------------------------------------------+  |
|  |   Workspace Blocks Drive  |                                                                     |
|  +---------------------------+                                                                     |
+----------------------------------------------------------------------------------------------------+
```

### Technology Matrix
- **Frontend SPA**: React 18, Vite, TypeScript, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Google Identity Services (GIS).
- **Identity Provider**: Firebase Auth (Google Sign-In), custom claims for RBAC (`STUDENT`, `ADMIN`).
- **Authoritative Data**: Cloud Firestore (NoSQL, real-time listeners for live updates).
- **Backend API & Business Logic**: Cloud Functions for Firebase (2nd Gen) / Node.js 20 LTS + TypeScript + Zod.
- **Judge Execution**: Google Cloud Run sandbox container running Debian with `gcc -O2 -std=c17` (or Judge0 CE API).
- **Secrets Management**: Google Cloud Secret Manager (accessed only by Cloud Functions).
- **User-Owned Storage**: Student's personal Google Drive via `drive.appdata` (isolated AppData folder).

---

## 4. Dual-Tier Data Allocation & Storage Rules

### Tier A: Central Trusted Firestore (Platform Authoritative)
1. **`users`**: UID, email, displayName, photoURL, role (`STUDENT`|`ADMIN`), status (`ACTIVE`|`BANNED`), stats (points, streak, solved counts).
2. **`problems`**: Problem statement, constraints, time/memory limits, visible samples, reference solutions, hints, status (`DRAFT`|`VALIDATED`|`PUBLISHED`|`RETIRED`).
3. **`problems/{id}/hidden_tests`**: Subcollection containing private verification test suites. **STRICTLY INACCESSIBLE TO CLIENTS** (`allow read, write: if false;`).
4. **`submissions`**: Official records containing evaluated code, verdict, runtime (ms), memory (KB), and test results. **WRITTEN ONLY BY SERVER JUDGE**.
5. **`daily_schedule`**: IST calendar mapping of featured challenges and bonus multipliers.
6. **`leaderboards` & `contests`**: Live competitive rankings and tournament schedules.
7. **`admin_audit_logs`**: Immutable trail of administrative actions.
8. **`support_reports`**: Student-initiated diagnostic bug reports.
9. **`users/{uid}/drafts`**: Private fallback vault used **only** when a student's college Workspace blocks Google Drive.

### Tier B: Student Personal Google Drive (User Sovereignty)
1. **`drafts/{slug}.c`**: In-progress code drafts per problem.
2. **`notes/{slug}.md`**: Personal scratchpads and algorithmic notes.
3. **`settings/editor.json`**: Personal IDE settings (Monaco theme, font size, keybindings).
4. **`backups/*.json`**: Exportable archives of the student's personal submission history.

---

## 5. Security Model, App Check & Firestore Rules

### Tamper-Proof Guarantees
- **No Client Verdict Writes**: Firestore rules enforce `allow create, update, delete: if false;` on `/submissions`. Only the backend judge via Firebase Admin SDK can create submissions.
- **No Client Point/Streak Inflation**: User stats (`points`, `streak`) cannot be updated by client requests (`allow update: if !affectedKeys().hasAny(['role', 'status', 'stats'])`).
- **Hidden Test Case Secrecy**: Subcollection `hidden_tests` rejects all client queries.
- **Per-User Submission Privacy**: Students can only read submissions where `request.auth.uid == resource.data.userId`.
- **Firebase App Check**: Protects API endpoints and Firestore from unauthorized bot traffic and scraped calls.
- **Rate Limiting**: Cloud Functions enforce 10-second submission cooldowns and IP-level limits.

---

## 6. Sandboxed C Execution Engine & Compilation Standards

### Compilation Standard
```bash
gcc -O2 -std=c17 -Wall -Wextra -Werror=vla -fdiagnostics-color=never -pipe -lm solution.c -o solution
```

### Execution Guardrails (Linux Container)
- **CPU Time Limit**: 2000 ms hard limit (supervisor watchdog: 2500 ms).
- **Memory Limit**: 64 MB (RSS + Swap combined via Linux cgroups).
- **Process Limit**: Max 32 PIDs (`pids.max = 32` prevents fork bombs).
- **Output Limit**: 64 KB stdout/stderr buffer truncation.
- **Filesystem**: Read-only container root; ephemeral noexec `tmpfs`.
- **Networking**: Disabled (`--network none`).
- **Fail-Closed Security**: `LocalGccJudge` is strictly forbidden in production. If no safe Cloud Run / Judge0 runner is configured, the system fails closed with `JUDGE_UNAVAILABLE`.

---

## 7. Google Drive Integration & Resilience

- **Requested Scopes**: Minimal `https://www.googleapis.com/auth/drive.appdata` (hidden folder) and `https://www.googleapis.com/auth/drive.file`. Full Drive access is strictly prohibited.
- **Progressive Consent**: Never requested at registration; requested via an optional, explicit prompt inside the workspace after login.
- **DriveStorage Interface**: Provides `listDrafts`, `saveDraft`, `loadDraft`, `exportBackup`, `deleteAll`.
- **Conflict Handling**: Compares `lastModified` timestamps; prompts user to choose version or merge instead of silently overwriting.
- **Workspace Policy Resilience**: If a college Google Workspace domain blocks third-party Drive apps, LogicQ silently activates the private Firestore fallback (`users/{uid}/drafts`) or browser `localStorage`, displaying a non-alarming indicator. Full platform functionality remains available.

---

## 8. Zero-Backdoor Maintenance & Data Governance

- **Zero Drive Access for Admins**: No developer or administrator can read student Drives. No service accounts have Drive scopes.
- **Maintenance via Firebase**: Admins manage problems, contests, and users via Firebase Console and Admin Dashboard. All mutations are logged to `admin_audit_logs`.
- **Student "Send Debug Report"**: Student inspects the exact JSON telemetry payload (browser, OS, error log, optional draft snippet) before consenting to send to `support_reports`.
- **"Export My Data"**: Packages central Firestore history + Drive drafts into a downloadable ZIP.
- **"Delete My Account & Data"**: Revokes auth tokens, deletes Firestore user records, clears the Drive app data folder, and anonymizes contest scores (`[Deleted User]`). Aligned with India's DPDP Act principles.

---

## 9. Phased Release Milestone Plan

### Release 1 (MVP) — Current Focus:
1. Firebase Auth (Google Sign-In) + Custom Claims (`STUDENT`, `ADMIN`).
2. Firestore Security Rules + automated emulator test suite.
3. Daily C Challenge (IST calendar synchronization, 16 curated problems).
4. Monaco C Web IDE with Custom Input Sandbox and Submit Execution.
5. Cloud Run / Judge0 Safe C Judge with Fail-Closed Security Policy.
6. Detailed Submission History with Code Review Modal.
7. Global Student XP Leaderboard with clean empty state.
8. Student Google Drive integration with silent Firestore fallback.
9. Admin Problem Management with Automated Validation Gate.
10. Student "Send Debug Report", "Export Data", and "Delete Account" workflows.

### Release 2 (Competitive Arena):
- Timed Arena contests with countdowns and hidden problem set until start.
- Real-time live scoreboard streamed over Firestore real-time listeners / WebSockets.
- Gamified Achievement Badges and Streak multiplier mechanics.
- College and graduation year leaderboard filters.

### Release 3 (Enterprise & Classroom):
- AST Tokenization and Code Similarity Review Queue.
- Instructor Role and Course Section Management.
- CSV/JSON Grade and Solve Roster Exports.
- Deep Platform Analytics (submission velocity, tag accuracy).

---

## 10. Operational Guidelines & Verification Invariant

- **Zero Fake Data Invariant**: Production database begins with clean empty states. No dummy mock users or demo scores.
- **Test Before Complete Invariant**: No phase or task is marked complete without running automated test suites (`vitest`, `@firebase/rules-unit-testing`) and validating in the real application interface.
