# LogicQ Cross-Device Sync Audit & Inventory (`/docs/CROSS_DEVICE_AUDIT.md`)

**Date**: 2026-10-13  
**Status**: Comprehensive Baseline Audit & Remediation Plan  
**Target**: Complete, seamless cross-device synchronization for signed-in LogicQ students across laptop, mobile phone, secondary browsers, and installed PWA.

---

## 1. Executive Summary & Inventory Matrix

This audit maps every piece of student data across LogicQ, its exact authoritative storage location, client caching mechanisms, and whether it currently follows the authenticated student account across devices.

| Data Category | Specific Data Element | Authoritative Storage Location | Client / Browser Storage | Follows Account Across Devices? | Audit Finding & Required Remediation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Identity & Profile** | UID, PRN, Masked PRN, College | Server SQLite (`User`, `PrnIndex`) + Firestore (`users/{userId}`) | `localStorage[logicq_active_user]` | **YES** | Synced via `/auth/me` and Firestore `users/{userId}`. |
| **Profile Settings** | Display Name, Department, Year, Division, Bio, PhotoURL | Server SQLite (`User`) + Firestore (`users/{userId}`) & `publicProfiles/{userId}` | `localStorage[logicq_active_user]` | **YES** | Self-service edits update both server and Firestore. Follows account on any device upon sign-in. |
| **Appearance & Preferences** | Theme (`light` vs `dark`) | Currently ONLY `localStorage[logicq_theme]` | `localStorage` | **NO (Fix Required)** | **Gap**: Device 2 defaults to system theme instead of user's chosen theme. **Fix**: Store `themePreference` on `User` schema & Firestore document; sync via `ThemeContext`. |
| **Competition & Points** | Total Points, Total Solved, Longest Streak | Server SQLite (`User`) + Firestore (`users/{userId}`, `publicProfiles/{userId}`) | React Query cache | **YES** | Authoritative on server, recalculated on evaluation. Follows account across devices. |
| **Streaks** | Current Streak, Last Solved Date, Freeze Balance | Server SQLite (`User`) + Firestore (`streak_events`) | React Query cache | **YES** | Calculated server-side at 17:00 IST cutoff. Follows account across devices. |
| **Daily Competition** | Daily Rank, Today's Result, Daily Summary Card | Firestore (`daily_results/{dayId}_{userId}`, `daily_summaries/{dayId}_{userId}`) | React Query cache | **YES** | Fully synced across devices. Read-only for student, immutable on client. |
| **Submission History** | Code Submissions, Verdicts, Runtime, Memory, Test Outputs | Server SQLite (`Submission`, `SubmissionTestCaseResult`) | React Query cache (`/submissions/my`) | **YES** | Synced immediately upon page load / refresh across any signed-in device. |
| **Uploaded Solutions** | Uploaded files (ZIP/PDF/IMG), Checker reviews, Notes | Server SQLite (`UploadedSolution`, `UploadReview`) + Cloud Storage | React Query cache (`/uploads/my`) | **YES** | Synced across devices; students see review status identically on mobile and desktop. |
| **Practice Progress** | Unlocked Modules, Solved Problems, Attempt Counts | Server SQLite (`PracticeProgress`) + Firestore (`practice_progress/{id}`) | React Query cache (`/practice/modules`) | **YES** | Real-time unlocked state follows account. When Module 1 is completed on PC, Module 2 is unlocked on phone. |
| **Editor Drafts (Daily Challenge)** | In-progress code scratchpad for today's daily challenge | Currently ONLY `localStorage[logicq_draft_{slug}]` | `localStorage` | **NO (Fix Required)** | **Gap**: Code written on laptop does not appear on phone. **Fix**: Sync to private Firestore subcollection `users/{userId}/drafts/{slug}` with `updatedAt`, `deviceLabel`, and expiry at 17:00 IST cutoff. Conflict resolution prompt if versions diverge. |
| **Editor Drafts (Practice Problems)** | In-progress code scratchpad for practice problems | Currently ONLY `localStorage[logicq_practice_draft_{slug}]` | `localStorage` | **NO (Fix Required)** | **Gap**: Practice draft trapped on originating browser. **Fix**: Sync to private Firestore subcollection `users/{userId}/drafts/practice_{slug}` with debounced autosave (1.5s) and conflict prompt. |
| **Custom Stdin / Run Inputs** | User custom standard input in execution drawer | Local component state & memory | Memory only | **ACCEPTABLE** | Ephemeral by design. Populated initially with Problem sample test input. |
| **Authentication Sessions** | Active refresh tokens, JWTs, Firebase session | Server SQLite (`RefreshToken`) + Firebase Auth IndexedDB | Cookie `__session`, `localStorage[logicq_access_token]` | **PARTIAL (Fix Required)** | **Gap**: Multi-device login is supported, but students have no UI to view or revoke individual devices ("My Sessions"). **Fix**: Add active sessions endpoint + UI tab in Profile. |
| **Offline Queue (PWA)** | Queued submissions when offline | PWA Service Worker / Local memory | Cache Storage (`logicq-shell-v1`) | **NO** | Submissions cannot be judged offline; offline message informs student to reconnect. Must purge on logout. |
| **Session Inactivity** | Inactivity timeout timestamp | `localStorage[logicq_last_activity]` | `localStorage` | **YES** (Per-device) | 7-day rolling timeout for students, 8-hour for checkers, 30m for admins. |

---

## 2. Deep-Dive Audit Findings

### 2.1 Editor Drafts Isolation & Storage Budget
- **Previous State**: The Monaco editor in `ChallengePage.tsx` and `PracticeWorkspacePage.tsx` relied 100% on `localStorage.setItem('logicq_draft_' + slug, code)`. If a student started writing code in their college computer lab, none of that progress was accessible when opening LogicQ on their mobile phone or personal laptop.
- **Security & Privacy Rules Compliance**: `firestore.rules` already contains `match /users/{userId}/drafts/{draftId} { allow read, write: if isOwner(userId); }`. This allows private, owner-only draft syncing with zero cross-tenant data leakage.
- **Expiry Requirement**: Daily challenge drafts must strictly expire at the 17:00 IST daily cutoff. Expired daily drafts must never be loaded or leaked to display yesterday's question once closed.
- **Payload Limits**: Max draft code size is bounded to 64 KB to ensure zero bloat and protect Firestore write budgets.

### 2.2 Draft Conflict Detection
- When Device A (Laptop) and Device B (Phone) both edit code for the same problem:
  - If Device B has edits with `remoteDraft.updatedAt > localDraft.updatedAt` and `remoteDraft.code !== localDraft.code`:
  - **Do NOT silently overwrite**.
  - Present a modal: `"Draft Conflict Detected: Choose Version"` displaying:
    - This Device (timestamp, device label, preview)
    - Cloud Version (timestamp, device label, preview)
    - Actions: `[ Keep Cloud Version ]` or `[ Keep This Device ]`.

### 2.3 Preferences Sync (Theme)
- Currently `client/src/context/ThemeContext.tsx` reads and writes strictly to `localStorage.getItem('logicq_theme')`.
- If a user sets Dark Theme on their PC, signing in on their mobile phone reverts to the phone's system default (often Light).
- **Remediation**: Add `themePreference: 'light' | 'dark' | 'system'` to the user profile schema and sync with Firestore `users/{userId}` self-update rules.

### 2.4 Multi-Device Sessions & Revocation
- Signing in on device 2 creates a new `RefreshToken` record in the database without destroying device 1's refresh token.
- `api.post('/auth/logout-all')` revokes all refresh tokens.
- **Remediation**: Expose `GET /api/auth/sessions` and `DELETE /api/auth/sessions/:sessionId` so students can view active devices (Browser, OS, IP, Last Active) and revoke individual sessions or all other devices.

### 2.5 Freshness & Real-Time Invariants
- When a student submits a problem on Device A and gets an `ACCEPTED` verdict:
  - Total points and practice progress update immediately on the server.
  - Device B reflects the updated points and unlocked state upon tab focus / page reload via React Query stale-time configuration.
  - Zero polling storms: No infinite polling intervals. We rely on React Query cache invalidation and window focus revalidation.

### 2.6 Privacy on Logout
- When `logout()` or `logoutAllDevices()` is called:
  - `localStorage` items (`logicq_active_user`, `logicq_access_token`, `logicq_last_activity`, all `logicq_draft_*`, all `logicq_practice_draft_*`) must be completely purged.
  - The Service Worker must receive `CLEAR_USER_CACHE`.
  - IndexedDB Firebase Auth credentials are cleared via `firebaseAuth.signOut()`.
  - No drafts or private data remain visible on a shared college lab machine.

---

## 3. Remediation Architecture & Implementation Plan

1. **`client/src/services/draftSync.service.ts`**:
   - Manages debounced (1.5s) cloud saving to Firestore `users/{userId}/drafts/{draftId}`.
   - Attaches `deviceLabel` (e.g., `"Chrome on Windows"`, `"Safari on iOS"`, `"LogicQ PWA"`).
   - Enforces 64 KB size limit.
   - Detects remote vs local timestamp conflicts and exposes conflict resolution hooks.
   - Enforces expiration for daily challenge drafts past 17:00 IST.
2. **`client/src/context/ThemeContext.tsx`**:
   - Integrates with authenticated user's `themePreference` and updates Firestore `users/{userId}`.
3. **Session Management Endpoints & UI**:
   - Server: Update `RefreshToken` tracking to store `deviceLabel`, `userAgent`, and `lastActiveAt`.
   - Provide `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, and `POST /api/auth/logout-all`.
   - Client: Add "My Active Sessions" management section on the Profile page.
4. **Logout Purge Sanitizer**:
   - Extend `clearSessionStorage` in `AuthContext.tsx` to scrub all draft keys and local caches.
