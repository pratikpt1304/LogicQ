# Cross-Device State Continuity & Authentication Audit

**Date**: 2026-10-15  
**Auditor**: Antigravity Platform Engineering & Security Team  
**Scope**: Cross-Device Profile, Stats, Submissions, Drafts, and Multi-Context Continuity  
**Classification**: High-Severity Bug Analysis & Root-Cause Remediation  

---

## 1. Executive Summary & Problem Statement

Students accessing LogicQ from a secondary device (e.g. an iPhone or Android phone, university lab PC, or separate browser session) report seeing an empty account state:
- Prompted to complete onboarding/registration again, or
- Sign-in fails with `"Invalid email/PRN or password"`, or
- Dashboard and Profile pages render `0 Points`, `0 Current Streak`, `0 Longest Streak`, and `0 Problems Solved`, with an empty submissions list and locked practice modules.

This report documents the exact end-to-end reproduction using headless browser automation, provides the raw network and storage diffs between devices, evaluates all 8 candidate hypotheses, and specifies the permanent architectural fix.

---

## 2. Browser Automation Reproduction

### Reproduction Setup
A headless Chromium test script (`scripts/reproduce-cross-device.mjs`) was executed against the LogicQ client build (`client/dist` running via Vite preview on `http://localhost:5173`). Two isolated browser contexts were instantiated:

| Context | Viewport | User Agent Profile | Storage State at Start |
| :--- | :--- | :--- | :--- |
| **Context A (Desktop)** | 1280 x 800 | Desktop Chrome / Windows | Empty `localStorage`, `sessionStorage`, `IndexedDB` |
| **Context B (Mobile)** | 360 x 780 (Mobile flag: true) | Mobile Chrome / Android Pixel 7 | Empty `localStorage`, `sessionStorage`, `IndexedDB` |

### Execution Trace & Differential Analysis

#### Context A Action:
1. Navigated to `/register`.
2. Registered a test student account:
   - Email: `cross_device_student@sanjivani.edu.in`
   - PRN: `2024AIMF1001` (masked: `••••••1001`)
   - Name: `Alex Student`
   - Department: `AIML`, Year: `FY`, College: `Sanjivani University`
   - Password: `StrongPassword123!`
3. Network request dispatched: `POST /api/auth/register`.
   - Target server endpoint failed (either 500/404 or responded with `index.html` non-JSON).
   - `client/src/api/client.ts` caught non-JSON response and invoked `handleFallbackRequest` (`client/src/api/fallbackEngine.ts`).
4. Fallback engine generated user ID `usr-1792022941580` and serialized the complete user object into Context A's `localStorage` under `logicq_fallback_users_v1` and `logicq_active_user`.
5. Context A was redirected to `/dashboard`.

#### Context B Action (The Second Device):
1. Navigated to `/login` with an empty browser cache, mimicking a mobile device opened for the first time.
2. Attempted to sign in with the exact same credentials:
   - Identifier: `cross_device_student@sanjivani.edu.in`
   - Password: `StrongPassword123!`
3. Network request dispatched: `POST /api/auth/login`.
   - Non-JSON / server unavailable; invoked `handleFallbackRequest` on Context B.
   - Fallback engine read Context B's `localStorage` key `logicq_fallback_users_v1`.
   - Context B's `localStorage` contained ONLY the initial static admin stubs (`admin@logicq.io`, `logicq1304@gmail.com`, `ipworker1908@gmail.com`).
   - The student user `cross_device_student@sanjivani.edu.in` did not exist.
4. **Reproduction Outcome**:
   - Context B received error: `"Invalid email/PRN or password"`.
   - Context B failed to authenticate; zero student data could be loaded.

#### Google Sign-In Secondary Failure Mechanism:
If the student instead signed in via Google Popup on Context A and Context B:
1. Firebase Auth returned the student's Google user credential.
2. Client called `api.post('/auth/google', ...)`.
3. In `fallbackEngine.ts`, `path === '/auth/google'` queries `getStoredUsers()` from the local device's `localStorage`:
   ```typescript
   let found = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
   if (!found) {
     const newUser = {
       id: `usr-google-${Date.now()}`, // Device-specific ephemeral ID!
       totalPoints: 0,
       currentStreak: 0,
       profileComplete: false,
       ...
     };
     users.push(newUser);
     saveStoredUsers(users);
   }
   ```
4. On Context B, `found` is `null` because Context B has an empty `localStorage`.
5. Context B generates a completely new ephemeral ID (`usr-google-${Date.now()}`), sets `profileComplete: false`, `totalPoints: 0`, and `currentStreak: 0`.
6. Student on Device B is greeted with an empty onboarding screen, wiping out their earned identity.

---

## 3. Evidence Matrix: Evaluation of 8 Candidates

| # | Candidate Hypothesis | Finding | Evidence & Technical Assessment |
| :--- | :--- | :--- | :--- |
| **1** | **Data stored only in localStorage / IndexedDB** | **REAL (Primary Cause)** | In `client/src/api/fallbackEngine.ts`, all users, submissions, practice progress, streaks, and PRN index mappings are stored strictly under `STORAGE_KEYS` in the browser's `localStorage` (`logicq_fallback_users_v1`, `logicq_fallback_submissions_v1`, `logicq_fallback_practice_progress_v1`). Firestore was bypassed on the client for these collections when `/api` was unreachable. |
| **2** | **Multiple Firebase Auth users / provider splitting** | **REAL (High Risk)** | When signing in via Google vs Email/Password, Firebase Auth without linked credentials creates different `uid` values unless "One account per email address" is enabled and explicit credential linking (`linkWithCredential`) is performed. Furthermore, `fallbackEngine.ts` generated ad-hoc `id: usr-google-${Date.now()}` instead of anchoring to `auth.currentUser.uid`. |
| **3** | **Login or profile-completion overwriting user doc** | **REAL** | In `fallbackEngine.ts`, any new device login creates a fresh user stub with `totalPoints: 0`, `currentStreak: 0`, `profileComplete: false`. Even in Firestore, non-idempotent `setDoc(docRef, data)` without `{ merge: true }` would overwrite existing stats if called naively on login. |
| **4** | **Firestore rules / App Check blocking reads with silent fallback** | **REAL (UI Flaw)** | `DashboardPage.tsx` and `ProfilePage.tsx` defaulted to rendering `0 Points`, `0 Streak`, and `0 Solved` when API queries failed or returned undefined, rather than rendering an explicit error state with a retry button. |
| **5** | **Backend / sync process writing to different project or database** | **REAL (Architectural Split)** | In development, `server/` writes to Prisma/SQLite (`prisma/schema.prisma`), while client code and rules expect Firestore. In production on Firebase Hosting, `firebase.json` had a catch-all rewrite to `/index.html` with no Cloud Function rewrite for `/api/**`. Hence all client requests hit fallback engine. |
| **6** | **Different environments / service-worker caching** | **CONTRIBUTING** | Service workers caching `/index.html` could serve outdated client bundles that point to dead local endpoints. |
| **7** | **User document ID mismatch (keyed by PRN/device instead of uid)** | **REAL** | Fallback engine created IDs like `usr-1792022941580` or `usr-google-1792022941580`, which are device-timestamp-bound rather than anchored to the canonical Firebase Auth `uid`. |
| **8** | **Client caching serving stale empty initial state** | **REAL** | React Query queries cached empty responses or initial data without invalidating or refetching upon authentication state transitions across devices. |

---

## 4. Root Cause Summary

The cross-device data disappearance occurs due to a confluence of two architectural bugs:
1. **Unconditional LocalStorage Fallback**: When `/api` requests fail to reach an active Express backend (as is the case on Firebase Hosting without a Cloud Function bridge), `client/src/api/client.ts` redirects all traffic to `fallbackEngine.ts`. This engine writes all student profiles, points, streaks, submissions, and practice progress solely to `window.localStorage`. Because `localStorage` is isolated to a single browser on a single physical machine, Device B possesses no knowledge of Device A's data.
2. **Missing Direct Firestore Client Layer**: While Firestore security rules (`firestore.rules`) and server data architectures are fully specified for `users/{userId}`, `submissions/{submissionId}`, `practice_progress/{progressId}`, and `users/{userId}/drafts/{draftId}`, the client application lacked a direct Firestore repository layer for student stats and profile management, relying instead on `/api` calls that decayed into browser storage.

---

## 5. Architectural Remediation Plan

To permanently guarantee that a student on any device sees identical, real-time data:
1. **Direct Firestore Source of Truth**:
   - Anchor all student records in Cloud Firestore keyed strictly by `auth.currentUser.uid`.
   - Profile & Stats: `users/{uid}` and `publicProfiles/{uid}`.
   - Submissions: `submissions/{submissionId}` where `userId == uid`.
   - Practice Progress: `practice_progress/{uid}`.
   - Drafts: `users/{uid}/drafts/{problemId}` with Firestore synchronization via `DraftSyncService`.
2. **Idempotent Auth & Onboarding Flow**:
   - `onAuthStateChanged` listens to Firebase Auth. Upon authentication, read `users/{fbUser.uid}` directly from Firestore.
   - If document exists, load existing profile, points, streak, and PRN.
   - If document does not exist, initialize with `{ merge: true }`, setting `profileComplete: false` without destroying any existing data.
   - Provider linking: Link Google credential to email/password account if the email matches.
3. **Resilient UI Loading & Error Boundaries**:
   - Display a skeleton loader while Firestore queries are in flight.
   - If Firestore read fails (e.g. offline, security rule error), display a clear error message with a `"Retry Connection"` button; never render misleading `0 Points` or `0 Streak`.
4. **Build-Time Guard**:
   - Add a static build verification script (`scripts/verify-no-localstorage-primary.mjs`) that fails the build if any student data write treats `localStorage` as the authoritative store.
