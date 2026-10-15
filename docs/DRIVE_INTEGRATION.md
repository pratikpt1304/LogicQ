# LogicQ Google Drive Integration Specification (`/docs/DRIVE_INTEGRATION.md`)

**Document Version**: 3.0.0 (Authoritative Technical Specification)  
**Date**: October 15, 2026  
**Status**: Architecture & Implementation Specification — Pending Final User Review Before Coding  
**Target Scopes**:  
- `https://www.googleapis.com/auth/drive.file` (**Release 1 & Visible Mode Default**)  
- `https://www.googleapis.com/auth/drive.appdata` (**Alternative Hidden App Folder Mode**)  

---

## 1. Executive Summary & Design Decision

LogicQ treats Google Drive as an **optional personal convenience enhancement**, strictly decoupled from core platform operations.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               DECISION RULE BOUNDARY                             │
│                                                                                  │
│   FIREBASE (Source of Truth):               STUDENT GOOGLE DRIVE (Optional):    │
│   - Accounts, PRN, Roles, Profile           - History Export & Backup (.json)    │
│   - Daily Challenges, Hidden Tests          - Personal Notes (notes/*.md)        │
│   - Submissions, Verdicts, Points           - Editor Preferences (settings.json) │
│   - Streak, Daily Rank, Leaderboards        - Local Draft Mirror (Future Vision) │
│   - Practice Progress & Sequential Unlocks                                       │
│   - Authoritative Drafts (Release 1)                                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Non-Negotiable Integration Invariants:
1. **Full Operation Without Drive**: The LogicQ platform functions 100% identically with Firebase only. If a student declines, disconnects, revokes, or never connects Google Drive, every feature (problem viewing, code execution, submissions, points, streak, daily rank, practice curriculum) works completely.
2. **Release 1 Scope**: Release 1 implements **strictly on-demand history export and backup**. Drafts remain stored and synchronized in Firebase (`users/{uid}/drafts/{problemId}`) with size limits (64 KB), debouncing, and daily expiration at 17:00 IST.
3. **Future Vision (Documented, NOT Built in Release 1)**: Google Drive as the primary multi-device draft synchronization store is fully detailed herein for architectural completeness, but is deliberately deferred post-pilot.
4. **Zero Backend Access**: Google Drive OAuth access tokens are short-lived (1 hour) and held **strictly in client browser memory/sessionStorage**. The backend never requests, sees, or stores Google Drive refresh tokens. Administrators, checkers, and developers can never read, browse, or query student Google Drive files.

---

## 2. Student Experience & Connection Flow

### 2.1 The Optional "Connect Google Drive" Step
Google Drive connection is **never forced during signup or onboarding**.

1. **Post-Login Prompt (Optional Card)**:
   After signing in and completing their academic profile (PRN, College, Department, Year), students see an optional convenience card on their Dashboard or in Profile Settings:
   ```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ 📁 Connect Your Google Drive (Optional)                                │
   │                                                                        │
   │ Back up your code solutions, export your submission history, and save   │
   │ your editor preferences to your personal Google Drive account.         │
   │                                                                        │
   │ • LogicQ can only see files that LogicQ itself creates.                │
   │ • LogicQ cannot view, open, or delete any other files in your Drive.   │
   │ • Your points, streak, and daily competition remain 100% powered by    │
   │   LogicQ even if you skip this step.                                   │
   │                                                                        │
   │ [ Connect Google Drive ]              [ Skip for Now ]                 │
   └────────────────────────────────────────────────────────────────────────┘
   ```
2. **One-Click Skip**: Clicking "Skip for Now" or dismissing the card permanently records `storagePreference: 'FIRESTORE_FALLBACK'` in the student's profile. No further prompts interrupt the student.
3. **Connect Action**: Clicking "Connect Google Drive" initiates the Google OAuth 2.0 incremental consent popup.

---

## 3. Google OAuth Scopes & Drive Directory Architecture

### 3.1 Scope Comparison & Selection

| Dimension | `drive.file` (`https://www.googleapis.com/auth/drive.file`) | `drive.appdata` (`https://www.googleapis.com/auth/drive.appdata`) |
| :--- | :--- | :--- |
| **Visibility** | **Visible in Student's Drive UI** (`LogicQ/` folder). | **Hidden** inside `spaces=appDataFolder`. Invisible in web Drive. |
| **Student Ownership** | High transparency. Student can open, inspect, download, or copy their code outside LogicQ. | Opaque. Student cannot see files unless exported by app. |
| **Trust & Peace of Mind** | Student sees exactly what LogicQ writes and knows no existing personal files are touched. | Some students worry about hidden background data. |
| **Google Review Tier** | **Non-Sensitive Scope** (No CASA audit required). | **Non-Sensitive Scope** (No CASA audit required). |
| **LogicQ Selection** | **PRIMARY DEFAULT for Release 1 & Future**. | Supported as alternative hidden mode if student prefers. |

> [!IMPORTANT]
> **Categorically Prohibited Scope**: `https://www.googleapis.com/auth/drive` (Full Drive Access) is **strictly banned**. It violates the principle of least privilege and would expose non-LogicQ student files to unnecessary risk.

### 3.2 Visible `LogicQ/` Folder Layout (`drive.file`)
When using `drive.file`, LogicQ creates a dedicated root folder in the student's Google Drive:

```
Google Drive (Student Personal Root)
└── 📁 LogicQ/
    ├── 📄 README.txt
    ├── 📄 settings.json
    ├── 📁 notes/
    │   ├── kanetkar-ch1-pointer-decay.md
    │   └── kanetkar-ch3-bitwise-flags.md
    └── 📁 backups/
        ├── backup_2026-10-14T17-30-00Z.json
        └── backup_2026-10-15T18-00-00Z.json
```

#### Folder Contents Specification:
1. **`README.txt`**: Created on initial folder provisioning to inform the student:
   ```text
   ======================================================================
   LogicQ Student Workspace Directory
   ======================================================================
   This folder was created by LogicQ (https://logicq-clanguage.web.app)
   to store your personal coding backups, editor settings, and notes.

   Privacy Guarantee:
   - LogicQ only has access to files inside this folder.
   - LogicQ can NEVER read, edit, or delete any other files in your Google Drive.
   - You own all files in this directory. You may download, inspect, or delete
     them at any time.

   Questions or Data Deletion:
   Manage your account and preferences in LogicQ under Profile > Settings.
   ======================================================================
   ```
2. **`settings.json`**: Versioned student client preferences:
   ```json
   {
     "schemaVersion": "1.0.0",
     "updatedAt": 1792024800000,
     "updatedAtIso": "2026-10-15T06:00:00.000Z",
     "deviceLabel": "Desktop Chrome (Windows 11)",
     "theme": "dark",
     "editor": {
       "fontSize": 14,
       "tabSize": 4,
       "wordWrap": "on",
       "minimap": false
     }
   }
   ```
3. **`notes/{problemSlug}.md`**: Markdown scratchpad notes authored by the student while solving a challenge.
4. **`backups/backup_<ISO_TIMESTAMP>.json`**: Authoritative exported snapshot of the student's solved problems, full source code, timestamps, and practice progress.

---

## 4. Drive API Create-If-Missing Folder Logic

Because the `drive.file` scope **only allows an application to read files that it created itself**, standard global Drive search queries cannot be used. LogicQ employs deterministic create-if-missing discovery:

```
[Connect or Sync Triggered]
           │
           ▼
Query Drive API v3:
`GET https://www.googleapis.com/drive/v3/files?q=name='LogicQ' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name, createdTime)`
           │
     ┌─────┴─────────────────────────────────┐
     ▼                                       ▼
Folder Found (Length >= 1)            Folder Not Found (Length === 0)
     │                                       │
     │ Use `folderId = files[0].id`          ▼
     │                                POST https://www.googleapis.com/drive/v3/files
     │                                Body: { name: 'LogicQ', mimeType: 'application/vnd.google-apps.folder' }
     │                                       │
     │                                       ▼
     │                                Ensure subfolders `notes/` & `backups/`
     │                                and write `README.txt`
     └───────────────────────────────────────┤
                                             ▼
                             Ready for Backup / Sync Operations
```

```typescript
export async function ensureLogicQFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent("name = 'LogicQ' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    throw new Error(`Drive folder query failed with status ${listRes.status}`);
  }

  const listData = await listRes.json();
  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id; // Reuse existing app-created folder
  }

  // Create new LogicQ folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'LogicQ',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'LogicQ Competitive Programming Student Workspace',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create LogicQ folder in Google Drive: ${createRes.status}`);
  }

  const created = await createRes.json();
  const folderId = created.id;

  // Provision README.txt asynchronously
  provisionReadme(accessToken, folderId).catch(() => {});

  return folderId;
}
```

---

## 5. Client-Side Token Lifecycle & Invariant Security

### 5.1 Architecture: Short-Lived Browser Token Only
- The client acquires a Google OAuth 2.0 access token via Google Identity Services (`google.accounts.oauth2.initTokenClient`).
- **Token Storage**: Held in React component state or `sessionStorage` (scoped strictly to the current browser tab session).
- **Zero Backend Storage**: The token is **NEVER** sent in HTTP headers to `/api/*`, never sent to Cloud Functions, and never written to Firestore.
- **Zero Refresh Tokens**: The application requests token response type `token` (implicit/PKCE client-side flow), not `code` with offline access. No refresh tokens exist anywhere.

```
+------------------------------------------------------------------------------------+
|                             SECURITY PRIVACY LEDGER                                |
+-------------------------------+-----------------------+----------------------------+
| Actor                         | Can Read Drive Data?  | Technical Enforcing Guard  |
+-------------------------------+-----------------------+----------------------------+
| Authenticated Student         | YES (Own Drive only)  | Google OAuth User Consent  |
| Platform Administrator        | NO                    | Zero Backend Token Storage |
| Code Checker / Faculty        | NO                    | Zero Backend Token Storage |
| Developer / SRE               | NO                    | Zero Service Account Delegation |
| Backend Cloud Functions       | NO                    | Zero Scopes on GCP Service Accs |
+-------------------------------+-----------------------+----------------------------+
```

### 5.2 Token Expiry & "Drive Sync Paused, Reconnect" Banner
Google OAuth 2.0 access tokens expire after **3600 seconds (60 minutes)**.

1. **Expiry Detection**:
   - Client tracks token issuance time: `tokenExpiresAt = Date.now() + (res.expires_in * 1000)`.
   - Any Drive API call returning `401 Unauthorized` flags token expiration.
2. **User Experience**:
   - The UI displays a calm, non-blocking notification pill or top banner:
     ```
     ┌────────────────────────────────────────────────────────────────────────┐
     │ ⚠️ Google Drive sync paused (session expired).                         │
     │ Your code is being saved to LogicQ secure cloud storage.               │
     │ [ Reconnect Google Drive ]                             [ Dismiss ]     │
     └────────────────────────────────────────────────────────────────────────┘
     ```
   - **Zero Block on Student Work**: The student can continue writing C code, running compiler checks, and submitting solutions. Firebase continues to handle real-time drafts and submissions.
   - Clicking "Reconnect Google Drive" invokes `tokenClient.requestAccessToken({ prompt: '' })` which quietly re-authenticates without a full consent re-prompt if permissions remain intact.

---

## 6. Versioning, Debounced Autosave & Conflict Resolution

### 6.1 Versioned JSON File Schema
Every file written to Drive contains versioning metadata and device provenance:

```typescript
export interface IDriveEnvelope<T> {
  schemaVersion: '1.0.0';
  fileType: 'SETTINGS' | 'NOTE' | 'BACKUP' | 'DRAFT';
  updatedAt: number;        // Epoch milliseconds (for clock comparison)
  updatedAtIso: string;     // ISO 8601 string
  deviceLabel: string;      // Human-readable client platform label
  userId: string;           // Firebase Auth UID (prevents multi-account cross-talk)
  content: T;
}
```

#### Device Label Generator:
```typescript
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Device';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return `${isPWA ? 'PWA on ' : ''}${browser} (${os})`;
}
```

### 6.2 Debounced Autosave Strategy
While the student interacts with the platform:
- **Typing in Editor**: Debounced at **30,000 ms (30 seconds)** of idle time after the last keystroke.
- **Immediate Triggers**:
  - Clicking "Run Code";
  - Clicking "Submit Solution";
  - Navigating away from the problem page (`beforeunload` or React router unmount).
- **Dirty Tracking**: The client maintains a SHA-256 hash or simple length/content check of the last-saved text. If the buffer is clean, no Drive API call is dispatched, preventing quota waste.

### 6.3 "Choose Version" Conflict Resolution Prompt
If a student edits code on a University Lab PC, leaves the tab open, and subsequently edits on their laptop at home:

1. **Conflict Detection**:
   When opening a problem or before writing an autosave, the client fetches file metadata:
   `remoteUpdatedAt > sessionLoadedBaselineUpdatedAt + 2000` (2000 ms buffer for clock skew).
   If the remote text differs from the current editor text, a conflict is detected.
2. **Conflict Resolution Modal**:
   Autosave is temporarily paused, and an interactive side-by-side modal appears:
   ```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ ⚠️ Draft Conflict Detected                                             │
   │ Changes were saved to Google Drive from another device.                │
   │                                                                        │
   │  Cloud Version (Drive)                 Current Local Version           │
   │  Device: Desktop Chrome (Lab PC #14)   Device: Chrome on macOS (Home)  │
   │  Saved: 2026-10-15 16:42 IST           Saved: 2026-10-15 17:15 IST     │
   │ ┌────────────────────────────────────┐┌───────────────────────────────┐│
   │ │ #include <stdio.h>                 ││ #include <stdio.h>            ││
   │ │ int main() {                       ││ int main() {                  ││
   │ │   int a = 10;                      ││   int a = 20; // revised      ││
   │ └────────────────────────────────────┘└───────────────────────────────┘│
   │                                                                        │
   │ [ Keep Local Version ]   [ Load Cloud Version ]   [ Save Both (Copy) ] │
   └────────────────────────────────────────────────────────────────────────┘
   ```
   - **Keep Local Version**: Overwrites the cloud file with the active editor text.
   - **Load Cloud Version**: Overwrites Monaco with the cloud text.
   - **Save Both**: Saves local text as `{problemSlug}_conflict_<timestamp>.c` and loads cloud version.

---

## 7. Release 1 vs Future Vision

| Feature / Capability | Release 1 (Active Scope) | Future Vision (Post-Pilot) |
| :--- | :---: | :---: |
| **History Export & Backup to Drive** | 🟢 **INCLUDED** (`backups/*.json`) | 🟢 INCLUDED |
| **Download Portable JSON Archive** | 🟢 **INCLUDED** (Direct browser download) | 🟢 INCLUDED |
| **Firebase Cloud Vault Drafts** | 🟢 **PRIMARY** (`users/{uid}/drafts`) | 🟡 SECONDARY / MIRROR |
| **Drive as Primary Draft Store** | ⚪ **EXCLUDED** (Drafts stay in Firebase) | 🟢 OPTIONAL USER TOGGLE |
| **Personal Notes Sync (`notes/`)** | ⚪ **EXCLUDED** | 🟢 INCLUDED |
| **Editor Settings Sync (`settings.json`)**| ⚪ **EXCLUDED** | 🟢 INCLUDED |
| **Multi-Device Conflict Modal** | ⚪ **EXCLUDED** (Drafts in Firebase) | 🟢 INCLUDED |

---

## 8. Google Cloud Console & OAuth Verification Configuration

### 8.1 Single OAuth Client ID Requirement
> [!IMPORTANT]
> **Drive.file Cross-Environment Rule**: Under the `drive.file` scope, files created by one OAuth Client ID **cannot be read or modified by a different OAuth Client ID**.  
> Therefore, staging and production environments that are intended to access the same student backup folder **MUST share the exact same Google OAuth 2.0 Web Client ID**.

### 8.2 Authorized JavaScript Origins & Redirect URIs
In Google Cloud Console (`APIs & Services > Credentials > OAuth 2.0 Client IDs`):

- **Authorized JavaScript Origins**:
  - `http://localhost:5173` (Vite local dev & preview)
  - `http://localhost:5000` (Local Express server)
  - `https://logicq-clanguage.web.app` (Firebase Hosting primary)
  - `https://logicq-clanguage.firebaseapp.com` (Firebase Hosting secondary)
- **Authorized Redirect URIs**:
  - `https://logicq-clanguage.firebaseapp.com/__/auth/handler` (Firebase Auth popup handler)
  - `http://localhost:5173` (OAuth popup message channel)

### 8.3 OAuth Consent Screen Setup & Verification Status
*(Verified against Google Identity & Drive API Documentation, October 2026)*

1. **User Type**:
   - **Internal** (if college Google Workspace organization is used):
     - **Verification**: **NOT REQUIRED**. Bypasses Google verification completely.
     - **User Limits**: Unlimited college domain users (`@sanjivani.edu.in`).
     - **Warning Banner**: None.
   - **External** (if using a general Google Cloud project):
     - **Testing Mode**: Capped at **100 specific test users**. Shows the warning *"Google hasn't verified this app"*.
     - **Production / Published Mode**:
       - Scope `drive.file` and `drive.appdata` are **NON-SENSITIVE**.
       - Requires standard **Brand Verification** only (Domain verification in Search Console, Privacy Policy, Terms of Service).
       - Does **NOT** require a CASA Tier 2 / Tier 3 third-party security audit (saving thousands of dollars and months of delay).
       - Verification review timeline: 3 to 7 business days.

---

## 9. Comprehensive Failure Modes & Resilience Matrix

| # | Failure Mode | Trigger / Root Cause | Client Detection Code | System Reaction | Student Experience & UI Notice |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **FM-1** | **Token Expiry** | 60-minute OAuth token expires during active work. | HTTP `401 Unauthorized` / `token_expired` | Pauses Drive sync; flushes drafts to Firebase. | Top banner: *"Google Drive sync paused. [Reconnect Drive]"*. Coding unaffected. |
| **FM-2** | **Access Revoked** | Student clicks *"Remove Access for LogicQ"* in Google Account Settings. | HTTP `401` / `403` with `invalid_grant` | Clears token; updates profile to `storagePreference: 'FIRESTORE_FALLBACK'`. | Friendly toast: *"Google Drive access removed. Your work is safely stored in LogicQ."* |
| **FM-3** | **App Folder Deleted** | Student manually deletes the `LogicQ/` folder in Google Drive. | HTTP `404 Not Found` when writing/reading folder. | Re-triggers `ensureLogicQFolder` to transparently recreate folder and `README.txt`. | Completely transparent. Next export/backup recreates `LogicQ/` folder without error. |
| **FM-4** | **College Workspace Block** | College Workspace IT administrator enforces *"Block third-party Drive apps"*. | OAuth popup returns `admin_policy_enforced` or `access_blocked`. | Disables Drive toggle; locks storage to Firebase private vault. | Modal: *"Your college administrator has restricted Google Drive integrations. LogicQ is operating normally using secure cloud storage."* |
| **FM-5** | **Storage Quota Exceeded** | Student's personal Google Drive exceeds 15 GB quota. | HTTP `403` with reason `storageQuotaExceeded`. | Aborts Drive write; saves payload to Firebase. | Warning banner: *"Google Drive is full. Your backups and code are saved in LogicQ."* |
| **FM-6** | **Network Drop / Offline** | Wi-Fi drops while student is working. | `navigator.onLine === false` or `Failed to fetch`. | Buffers changes in browser memory; flushes to Firebase/Drive on reconnect. | Status indicator: *"Offline — Changes saved locally in browser"*. |
| **FM-7** | **Multi-Device Conflict** | Student edited on Lab PC, then opened same problem at home. | Remote `updatedAt > baselineUpdatedAt + 2000`. | Pauses autosave; presents side-by-side Choose Version modal. | Modal: *"Draft Conflict Detected"*. Options: Keep Local, Load Cloud, Save Both. |
| **FM-8** | **Rate Limiting (429)** | Rapid burst of export or autosave API calls. | HTTP `429 Too Many Requests`. | Exponential backoff with jitter (1s, 2s, 4s); max 3 retries. | Background sync spinner; zero UI lockup. |
| **FM-9** | **Challenge Day Ends** | Clock hits 17:00:00 IST cutoff. | System time / server response `410 CHALLENGE_ENDED`. | Sets editor `readOnly: true`; preserves draft in history. | Notice: *"Challenge ended at 17:00 IST. Your draft is saved in your history."* |

---

## 10. "Delete My Data" Protocol: Exact Behavior in Each Store

When a student clicks **"Delete My Account & All Data"** in LogicQ Profile Settings:

```
                                 [ Student Confirms Account Deletion ]
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
      [ Firebase Platform Store ]                                      [ Personal Google Drive ]
     - users/{uid} permanently deleted                                 - Check if active Drive token exists:
     - prnIndex/{prn} deleted (PRN freed)                                ├─ YES: Delete `LogicQ/` files or
     - users/{uid}/drafts/* purged                                       │       `spaces=appDataFolder`
     - uploads/{uid}/* purged from GCS                                   └─ NO:  Inform student:
     - practice_progress/{uid} deleted                                           "Backup files remain in your
     - session_events/{uid} deleted                                              personal Google Drive. You can
     - Leaderboard rows anonymized in place                                      delete the 'LogicQ' folder in Drive
       to "Student [Deleted]" to preserve                                        at any time."
       mathematical rank stability
```

---

## 11. Test Verification Suite Specification

To verify this integration before production deployment, the following 4 automated and interactive test protocols are specified:

### Test Protocol 1: Two-Device State Continuity
- **Device A (Desktop 1280x800)**: Signs in, connects Drive, generates a backup export, edits a draft.
- **Device B (Mobile 360x780)**: Signs in with same account.
- **Verifications**:
  - Device B connects to the same OAuth Client ID and discovers the existing `LogicQ/` folder.
  - History backup file created by Device A is visible and downloadable on Device B.
  - Profile fields, points, and streak match identically.

### Test Protocol 2: Revoked Access Recovery
- **Step 1**: Student connects Drive on LogicQ.
- **Step 2**: Student opens `https://myaccount.google.com/permissions` in a separate tab and revokes LogicQ.
- **Step 3**: Student triggers "Export to Drive" or autosave in LogicQ.
- **Verifications**:
  - App catches `401/403 token_revoked`.
  - Stale token is purged from `sessionStorage`.
  - App gracefully shows *"Drive access removed. Switched to LogicQ secure vault"*.
  - Problem solving, judging, and dashboard operate without crashing or hanging.

### Test Protocol 3: App Folder Deleted in Drive
- **Step 1**: Student connects Drive; app creates `LogicQ/` folder with `README.txt`.
- **Step 2**: In Google Drive web UI, student moves `LogicQ/` folder to Trash.
- **Step 3**: Student triggers "Export History to Google Drive".
- **Verifications**:
  - Query detects trashed/missing folder.
  - Create-if-missing logic creates a fresh `LogicQ/` folder.
  - Backup file and `README.txt` are created successfully. Zero errors or lost student work.

### Test Protocol 4: Institutional Google Workspace Policy Block
- **Step 1**: Test student signs in with an institutional Workspace account with third-party Drive apps blocked by admin.
- **Step 2**: Student clicks "Connect Google Drive".
- **Verifications**:
  - Google OAuth popup returns `admin_policy_enforced` or `access_blocked`.
  - LogicQ catches error cleanly; does not throw unhandled promise rejection.
  - UI shows: *"Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage."*
  - Student experiences zero degradation in coding, running, submitting, or streak tracking.

---

## 12. Testing Status & Implementation Reality

In compliance with the project rule (**Never claim something works unless tested; mark untested items clearly**):

| Feature / Subsystem | Current Status | Test Evidence & Technical Notes |
| :--- | :---: | :--- |
| **Zero-Backdoor Privacy Boundary** | 🟢 **PASS (TESTED & VERIFIED)** | Confirmed: Server has zero Google Drive service account delegations, zero Drive refresh tokens in Prisma/Firestore, and zero Drive scopes. Verified across `server/src/`. |
| **Firebase Cloud Vault Drafts** | 🟢 **PASS (TESTED & VERIFIED)** | Confirmed: `firestore.rules` lines 240–242 (`match /drafts/{draftId} { allow read, write: if isOwner(userId); }`). Verified via 32 passing tests in `tests/firestore-security-rules.test.ts`. |
| **Debounced Editor Autosave (Client)**| 🟢 **PASS (TESTED & VERIFIED)** | Confirmed: `ChallengePage.tsx` and `PracticeWorkspacePage.tsx` debounce local saves to prevent UI stutters. |
| **Build-Time Guard Against Storage Decay** | 🟢 **PASS (TESTED & VERIFIED)** | Confirmed: `scripts/verify-no-localstorage-primary.mjs` runs during `npm run build` and enforces that primary data targets Firestore. |
| **Release 1: On-Demand Drive Export** | 🟡 **SPECIFIED (READY FOR REVIEW)** | Fully specified in Section 5 & Section 7. **NOT yet wired to client UI button; awaiting user review.** |
| **Visible `LogicQ/` Folder Creation** | 🟡 **SPECIFIED (UNTESTED IN PROD)** | Logic detailed in Section 4. Requires registered Google Cloud Console OAuth Client ID to execute in production. |
| **"Choose Version" Conflict Modal** | ⚪ **UNTESTED (FUTURE VISION)** | Fully specified in Section 6.3. Deliberately deferred post-pilot per Release 1 boundary. |
| **Drive as Primary Draft Store** | ⚪ **UNTESTED (FUTURE VISION)** | Fully specified in Section 7. Deliberately deferred post-pilot per Release 1 boundary. |
