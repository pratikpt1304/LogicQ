# LogicQ Student Google Drive Integration & Fallback Specification

## 1. OAuth Scopes & Least-Privilege Commitment

LogicQ strictly complies with Google's API Least Privilege Security Policy. Under no circumstances will LogicQ request broad Google Drive access.

### Scopes Requested
- **`https://www.googleapis.com/auth/drive.appdata`** (Primary):
  - Grants access exclusively to Google Drive's hidden Application Data folder (`spaces=appDataFolder`).
  - Does **NOT** allow reading, modifying, or viewing the student's personal documents, spreadsheets, slides, photos, or existing files.
- **`https://www.googleapis.com/auth/drive.file`** (Secondary / Export):
  - Allows LogicQ to create and read only the specific files opened or created by LogicQ itself (e.g., when exporting a zip backup to user-visible Drive).

### Strictly Forbidden Scope:
- **`https://www.googleapis.com/auth/drive` (Full Access)**:
  - **PROHIBITED BY DESIGN**. Full Drive scope is dangerous, unnecessary, and triggers high-friction security warnings. LogicQ does not need and will never ask for full Drive permissions.

---

## 2. Progressive Onboarding & Two-Step Consent Flow

Drive authorization is **NEVER requested at initial signup or login**. Bundling Drive access during account creation creates distrust and drives abandonment.

```
[Student Visits LogicQ]
       |
       v
[Step 1: Firebase Auth with Google Sign-In]
  - Requests standard profile & email scopes only.
  - Authenticates student identity, establishes session.
       |
       v
[Step 2: Post-Login Progressive Disclosure in Workspace]
  - Student opens the Monaco Editor or Dashboard.
  - A subtle, friendly card appears:
    +-------------------------------------------------------------------+
    | 📁 Save drafts to your personal Google Drive?                    |
    | LogicQ can sync your private scratchpads directly into your own   |
    | Google Drive app folder. Only you can view your drafts.           |
    |                                                                   |
    | [ Connect Google Drive ]     [ Not Now / Use Local Storage ]      |
    +-------------------------------------------------------------------+
```

---

## 3. The `DriveStorage` Interface & Architecture

All client interactions with storage run through an abstracted interface. The frontend interacts identically whether backing by Google Drive, private Firestore, or browser `localStorage`:

```typescript
export interface DraftRecord {
  problemSlug: string;
  code: string;
  language: string;
  lastModified: number; // Unix timestamp ms
  checksum: string;
}

export interface IDriveStorage {
  /** Connect / re-authorize Drive access */
  connect(): Promise<boolean>;

  /** Check current connection status */
  isConnected(): boolean;

  /** List all draft metadata in app folder */
  listDrafts(): Promise<Array<{ problemSlug: string; lastModified: number }>>;

  /** Save in-progress code draft with conflict detection */
  saveDraft(draft: DraftRecord): Promise<{ success: boolean; conflict?: DraftRecord }>;

  /** Load in-progress code draft */
  loadDraft(problemSlug: string): Promise<DraftRecord | null>;

  /** Export entire history archive into Drive */
  exportBackup(payload: object): Promise<{ fileId: string; webViewLink?: string }>;

  /** Erase all LogicQ app folder contents upon account deletion */
  deleteAll(): Promise<boolean>;
}
```

---

## 4. Conflict Resolution & Merging Flow

When students code across multiple machines (e.g., college lab desktop and home laptop), drafts can diverge. LogicQ strictly avoids silent overwrites:

```
[Save Draft Triggered]
        |
        v
Check Remote `lastModified` vs Local `lastModified`
        |
        +---> If Remote > Local: CONFLICT DETECTED!
        |
        v
[Display Modal: "Draft Conflict Detected"]
  - Left Pane: Remote Cloud Draft (Saved from Lab PC at 16:42)
  - Right Pane: Local Current Draft (Edited just now at 17:15)
  - Actions:
    [ Keep My Local Changes ]  -> Overwrite remote timestamp
    [ Discard & Load Cloud ]   -> Restore cloud version into Monaco
    [ Merge Both in Editor ]   -> Inserts diff markers in Monaco
```

---

## 5. College Google Workspace Blocking & Silent Fallback

### The Real-World Challenge:
Many Indian engineering colleges, universities, and enterprise Google Workspace domains enforce strict admin policies that block unapproved third-party OAuth access:
> *"Access blocked: Your institution's administrator has not authorized LogicQ to access institutional Drive."*

### Resilience Strategy:
LogicQ treats Google Drive as an **optional enhancement, never a hard dependency**.

```typescript
// Fallback Determination
export async function initializeStudentStorage(user: User): Promise<IStorageProvider> {
  const token = getGoogleDriveToken();

  if (!token) {
    return new FirestoreFallbackStorage(user.uid);
  }

  try {
    const driveClient = new GoogleDriveStorage(token);
    await driveClient.verifyAccess();
    return driveClient;
  } catch (error: any) {
    if (error.status === 403 || error.code === 'admin_policy_enforced') {
      console.warn('[Storage] Workspace policy blocked Drive. Activating silent Firestore fallback.');
      notifyUser({
        type: 'info',
        message: 'Campus Workspace restricted Drive access. Drafts are safely autosaved to your private LogicQ vault.'
      });
      return new FirestoreFallbackStorage(user.uid);
    }
    return new LocalStorageProvider();
  }
}
```

### The Three Storage Tiers:
1. **Tier 1 (Google Drive AppData)**: Default when granted. Stored in student's Google account.
2. **Tier 2 (Private Firestore Vault)**: Stored in per-user collection `users/{uid}/drafts/{slug}` protected by rule `allow read, write: if request.auth.uid == userId;`.
3. **Tier 3 (Browser LocalStorage)**: Zero-network fallback for offline or incognito sessions.

---

## 6. Drive Indicator in UI

In the top navbar and inside Profile Settings, an unobtrusive status pill indicates active storage mode:
- 🟢 **Drive Connected**: *"Autosaving to Google Drive (Private AppData)"*
- 🟡 **Cloud Vault Active**: *"Autosaving to Private Firestore Vault (Drive Disconnected)"*
- ⚪ **Local Only**: *"Autosaving to Browser Local Storage"*

Clicking the pill allows students to connect, disconnect, or test their Drive connection at any time.

---

## 7. Google OAuth Consent Screen Verification & Policy Limits

Deploying Google OAuth with the `drive.appdata` scope requires adherence to Google Cloud Console identity policies:

### 1. Development & Unverified App Phase
- **App Status**: "Testing" in Google Cloud Console.
- **Allowed Users**: Up to **100 specific test users** explicitly whitelisted by email address in Google Cloud Console.
- **User Experience**: Google displays an unverified app banner ("Google hasn't verified this app") requiring clicking "Advanced -> Go to LogicQ (unsafe)".
- **Viability**: Suitable for early internal testing and initial developer evaluation.

### 2. Institutional Internal Verification (College Workspaces)
- If deployed exclusively within a single college domain (e.g., `@vit.ac.in` or `@iitd.ac.in`), the Google Cloud OAuth app type can be configured as **"Internal"**.
- **Internal apps bypass Google verification entirely**, require no CASA assessment, and display zero warning banners for campus domain accounts.

### 3. Public Production Verification
- If opened to external public `@gmail.com` accounts:
  - `drive.appdata` is classified by Google as a **Sensitive / Restricted Scope**.
  - Requires submitting an OAuth Verification Request to Google Trust & Safety.
  - Requires:
    1. Publicly accessible Domain with verified Google Search Console ownership.
    2. Comprehensive Privacy Policy URL (compliant with Google API User Data Policy).
    3. Terms of Service URL.
    4. YouTube demonstration video showing the OAuth consent screen and explaining why `drive.appdata` is needed.
    5. Cloud Application Security Assessment (CASA Tier 2) scan if requested by Google.
