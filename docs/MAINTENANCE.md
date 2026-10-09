# LogicQ System Maintenance, Support & Operational Governance

## 1. Zero-Backdoor Invariant: Privacy Boundary Around Student Drives

LogicQ enforces an architectural barrier ensuring that **no developer, system administrator, or backend service can ever access, read, or list a student's Google Drive files**.

```
+-----------------------------------------------------------------------------------------+
|                               PRIVACY ISOLATION BOUNDARY                                |
|                                                                                         |
|   ADMIN CONSOLE                                      STUDENT GOOGLE DRIVE               |
|   (Admins & Operators)                               (Client-Side Token Only)           |
|  +--------------------+                             +--------------------------+        |
|  | Firebase Console   |                             | Personal Google Drive    |        |
|  | Firestore Database |        NO BACKDOOR          | - drafts/problem.c       |        |
|  | Cloud Run Logs     | <=========================> | - notes/cheatsheet.md    |        |
|  | Cloud Functions    |   No Service Accounts       | - settings/editor.json   |        |
|  | Audit Logs Table   |   No Drive API Secrets      |                          |        |
|  +--------------------+                             +--------------------------+        |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

### Architectural Guarantees:
1. **Client-Side Token Isolation**: The OAuth 2.0 access token granted for `drive.appdata` lives strictly inside the student's browser session. It is **never sent to the Firebase backend or logged**.
2. **Zero Service Account Drive Delegations**: LogicQ backend servers possess Google Service Accounts restricted solely to Firebase, Firestore, and Cloud Run. They have zero Google Drive scopes or domain-wide delegation rights.
3. **Cryptographic & OAuth Separation**: Even if an administrator directly queries the Firestore database or Cloud Functions environment variables, there are no Drive tokens or credentials available to inspect student files.

---

## 2. Administrative Operations & Immutable Audit Trail

All legitimate system maintenance occurs strictly within central Firebase infrastructure and is guarded by automated audit logging:

### 2.1 Permitted Administrator Actions:
- **Problem Authoring & Validation**: Creating problems, adding test cases, running reference validations, publishing to catalog.
- **Contest Operations**: Scheduling rounds, monitoring live WebSocket scoreboards, rejudging submissions following test corrections.
- **User Moderation**: Suspending accounts violating platform integrity guidelines, adjusting user roles.
- **Support Triage**: Reviewing bug reports submitted directly by students via the consent-driven support pipeline.

### 2.2 Immutable Audit Trail (`admin_audit_logs`)
Every administrative mutation triggers an automatic record in `admin_audit_logs`:
```typescript
interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: 'USER_BANNED' | 'PROBLEM_PUBLISHED' | 'REJUDGE_INITIATED' | 'CONTEST_CREATED';
  targetResource: string; // e.g. "users/alice" or "problems/two-sum"
  previousState?: object;
  newState?: object;
  ipAddress: string;
  timestamp: FirebaseFirestore.Timestamp;
}
```
*Note: Firestore Security Rules prohibit all client-side writes and reads on `admin_audit_logs`. Only the Firebase Admin SDK can append records.*

---

## 3. Student-Initiated "Send Debug Report" Workflow

When a student experiences an unexpected compiler issue, sync anomaly, or IDE bug, they can initiate a transparent debug report:

```
[Student Clicks "Report Issue / Send Debug Report" in Help Menu]
        |
        v
[Modal Displays Exact JSON Payload to be Submitted]
  +---------------------------------------------------------------------+
  | 🔍 Review Diagnostic Information Before Sending                    |
  | LogicQ only submits what you see below. No private files are sent.   |
  |                                                                     |
  |  App Version:       v1.2.0 (Commit 5128461)                         |
  |  Browser & OS:      Chrome 124 / Windows 11                         |
  |  Drive Status:      Connected (drive.appdata active)                |
  |  Recent Console:    [TypeError: failed to fetch test results...]    |
  |                                                                     |
  |  [ ] Include a snippet of my current code draft (Optional)          |
  |                                                                     |
  |  [ Confirm & Send to Support ]               [ Cancel ]             |
  +---------------------------------------------------------------------+
        |
        v
[Submitted directly to Firestore `support_reports`]
  - Accessible ONLY by administrators in Admin Dashboard.
  - Student receives a tracking reference ID.
```

---

## 4. Self-Service "Export My Data" (Data Portability)

In accordance with data sovereignty principles and privacy rights, students can download their entire platform footprint at any time:

1. **Trigger**: Click **"Export My Data"** in Profile Settings.
2. **Compilation Pipeline**:
   - Fetches authoritative data from Firestore: profile details, all past submissions, code history, verdicts, contest participations, and unlocked badges.
   - If Google Drive is connected: pulls current drafts, personal notes, and editor preferences from `drive.appdata`.
   - Packages all assets into a single structured ZIP archive:
     ```
     logicq_data_export_2026-10-09.zip
     ├── profile.json
     ├── submissions_history.json
     ├── achievements_and_stats.json
     ├── drafts/
     │   └── daily-longest-unique-substring.c
     └── notes/
         └── learning_notes.md
     ```
3. **Delivery**: Direct, client-side ZIP stream downloaded to student's local machine via JSZip.

---

## 5. Self-Service "Delete My Account & Data" (Right to Erasure)

Students retain the unconditional right to erase their personal information:

```
[Student Clicks "Delete Account & All Data" in Settings]
        |
        v
[Confirmation Modal Requiring Password / Auth Re-Verification]
        |
        v
[Execution: Cloud Function `deleteUserAccount`]
  1. Revokes Firebase Auth session tokens and permanently deletes Auth account.
  2. Permanently erases `users/{uid}` and private subcollections (`users/{uid}/drafts`).
  3. Purges all support reports authored by the user.
  4. Deletes the LogicQ AppData folder from student's Google Drive via client token.
  5. Anonymization of Historical Records:
     - To ensure mathematical continuity of historical contest scoreboards,
       past submissions are detached: `userId` is set to null, and displayName
       is replaced with `[Deleted User]`.
     - Code text and personal identifiers are expunged from the record.
```

---

## 6. Retention Policy Summary

| Item | Account Active | Account Deleted | Reason for Retention Policy |
| :--- | :--- | :--- | :--- |
| **Email, Name, Profile** | Stored in Firestore | **Permanently Erased** | Pure personal identity; zero reason to retain post-deletion. |
| **Drafts & Personal Notes** | Stored in Student Drive | **Folder Deleted in Drive** | Student personal property. |
| **Historical Contest Scores** | Displayed with Name | **Anonymized (`[Deleted User]`)** | Preserves score ranks and medals won by other contestants in past rounds. |
| **Admin Audit Trail** | Logged permanently | **Retained** | Security compliance; tracks administrator actions for accountability. |
