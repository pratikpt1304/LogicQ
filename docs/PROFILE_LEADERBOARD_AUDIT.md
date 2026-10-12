# LogicQ Profile & Leaderboard Audit Report (`/docs/PROFILE_LEADERBOARD_AUDIT.md`)

**Date:** October 12, 2026  
**Auditor:** LogicQ Core Engineering / Antigravity Agent  
**Environment:** Local testbed (`http://127.0.0.1:5173`) & Production Firebase (`https://logicq-clanguage.web.app`)  
**Target Areas:** Profile saving pipeline, Display Name fallbacks, Leaderboard rankings, Academic college naming, Modal stacking/scroll UI, Profile URL privacy.

---

## 1. Executive Summary & Root Cause Matrix

| Symptom | Reported Behavior | Root Cause | Severity |
| :--- | :--- | :--- | :---: |
| **1. Profile Save Failure & Fallback Mismatch** | Editing display name, department, year, division and saving does not persist. After reopen, field is empty with placeholder `Fallback: Student 4F9A` while header shows `Student 6128`. | **Dual Root Cause:**<br>1) On deployed Firebase Hosting without Cloud Functions, `/api/users/profile` falls back to `fallbackEngine.ts` which only copied `fullName`, `bio`, `college` and completely discarded `displayName`, `department`, `year`, `division`.<br>2) Placeholder had `'4F9A'` hardcoded (`placeholder={'Fallback: Student ' + (profile.shortId \|\| '4F9A')}`) while header dynamically hashed `id.slice(-4)` (`Student 6128`) because `shortId` was unpersisted. | **CRITICAL** |
| **2. Fake Leaderboard Rank with 0 Points** | Profile displays `RANK #1` or `#10 of 10` even when student has `0 PTS`. Leaderboard ranks unranked students with zero points. | **Flawed Ranking Invariant:**<br>1) `user.controller.ts` counts higher ranked users (`higherRankedCount + 1`); if points are 0 and no one is higher, it returns `1`.<br>2) `ProfilePage.tsx` had `RANK #{profile.rank \|\| 1}`, falling back to `1` when unranked.<br>3) `leaderboard.controller.ts` ranked all students in the database rather than filtering to students with $>0$ weekly points. | **HIGH** |
| **3. Stale College Name** | Locked college field shows `Sanjivani College of Engineering` instead of `Sanjivani University`. | Hardcoded fallback in `fallbackEngine.ts` (lines 195 and 673: `college: 'Sanjivani College of Engineering'`). | **MEDIUM** |
| **4. Modal Save Button Cut Off & Navbar Clipped** | Sticky navbar drawn above modal overlay; Save button cut off below visible area at 360px or with keyboard open. | Stacking context collision: `<header>` in `Navbar.tsx` had `z-50` and modal overlay in `ProfilePage.tsx` had `z-50`. Form footer was not sticky inside the scrollable dialog container. | **HIGH** |
| **5. Username Exposed in Profile URL** | Public URL uses `/profile/ipworker1908`. | Route in `App.tsx` was `/profile/:username`, and leaderboard/links generated `/profile/${u.username}`. | **HIGH** |

---

## 2. Deep Dive: Investigation of Likely Causes (Prompt Task 2)

We evaluated each hypothesis specified in the prompt:

### A. Firestore Rules Rejecting Write (`permission-denied`)
- **Analysis**: In `firestore.rules`, `users/{userId}` allows self-update only if `isValidUserSelfUpdate()` matches (`affectedKeys().hasOnly(['department', 'year', 'division', 'displayName', 'bio', 'photoURL', 'storagePreference', 'updatedAt'])`). However, `publicProfiles/{userId}` specifies `allow write: if false;`.
- **Finding**: **REAL RISK & ARCHITECTURAL GAP**. Any client attempt to write directly to `publicProfiles/{userId}` will be rejected with `permission-denied`. Updates to `publicProfiles` MUST be executed via a trusted server controller / Cloud Function or Admin SDK, while private profile self-updates to `users/{userId}` can be updated either through the server or directly by the owner.

### B. Function Not Deployed or Returning Error Swallowed by UI
- **Analysis**: On Firebase Hosting (`logicq-clanguage.web.app`), Cloud Functions (2nd Gen) cannot be deployed on the Spark (Free) plan. Requests to `/api/users/profile` hit Firebase Hosting rewrites (`** -> /index.html`), returning `200 OK` with HTML.
- **Finding**: **CONFIRMED REAL ROOT CAUSE**. `client/src/api/client.ts` detected non-JSON response and diverted to `fallbackEngine.ts`. Inside `fallbackEngine.ts`, `path === '/users/profile'` dropped `displayName`, `department`, `year`, `division` and only persisted `fullName` and `bio`.

### C. Zod Validation Failing Silently
- **Analysis**: We inspected `updateProfileSchema` in `server/src/controllers/user.controller.ts`.
- **Finding**: Zod schema is strict. When valid data is provided, it passes; however, client errors did not surface structured field errors in a dedicated banner in the modal.

### D. Wrong Field Names or Collection Paths
- **Analysis**: Client sent `{ displayName, department, year, division, bio }`.
- **Finding**: **CONFIRMED**. `fallbackEngine.ts` expected `fullName` instead of `displayName`, causing silent omission of the public display name.

### E. Save Button Disabled or Not Reachable
- **Analysis**: The modal dialog lacked a sticky footer. On screens $\le 360\text{px}$ or with mobile virtual keyboards open, the Save button scrolled below the fold. Both navbar and modal used `z-50`, causing navbar layering over the modal backdrop.
- **Finding**: **CONFIRMED UI DEFECT**.

### F. State Reset After Saving
- **Analysis**: `ProfilePage.tsx` called `await refreshUser();` and `invalidateQueries(['profile'])`.
- **Finding**: **CONFIRMED**. Because the persistence layer did not save the fields, the subsequent refresh refetched the stale data and wiped the form inputs.

### G. Public Profile Document Never Created or Updated
- **Analysis**: No routine in `fallbackEngine.ts` or `user.controller.ts` created or updated `publicProfiles/{userId}`.
- **Finding**: **CONFIRMED**. Public profile mirrors were never written.

---

## 3. Reproduction Evidence & Logs

Automated reproduction executed via Puppeteer (`server/scripts/audit_profile_leaderboard.ts`):

```json
{
  "headerDataBeforeSave": {
    "h1": "CSE • FY • ••••••6128",
    "rankBadge": "RANK #8",
    "collegeSpan": "Sanjivani College of Engineering",
    "url": "/profile/ipworker1908"
  },
  "modalState": {
    "placeholder": "Fallback: Student 6128",
    "modalZIndex": "50",
    "headerZIndex": "50",
    "collegeLocked": "Sanjivani College of Engineering"
  },
  "leaderboardState": {
    "pinned": "#10 Your Standing ... 0 PTS",
    "rankBadge": "#10"
  }
}
```

### Visual Evidence Captured:
- `docs/screenshots/audit/01_symptom_profile_header.png`: Shows 0-point rank badge and old college name.
- `docs/screenshots/audit/02_symptom_profile_modal_opened.png`: Shows modal z-index clash and locked college name.
- `docs/screenshots/audit/03_symptom_profile_modal_filled.png`: Form fields filled before save.
- `docs/screenshots/audit/04_symptom_profile_after_save.png`: Post-save state verification.
- `docs/screenshots/audit/05_symptom_mobile_360_modal.png`: 360px viewport showing cut-off Save button.
- `docs/screenshots/audit/06_symptom_leaderboard_rank.png`: Leaderboard awarding rank to 0-point student.

---

## 4. Remediation Plan

1. **Unified Display Name & Stable Fallback**:
   - Store immutable `shortId` on user account derived deterministically (`generateShortId(userId)`).
   - Single source of truth: `formatPublicDisplayName({ displayName, shortId, id })`.
   - Placeholder in modal must read `Fallback: Student ${profile.shortId}` (never hardcoded `4F9A`).
2. **Profile Save Pipeline (Server & Client & Fallback)**:
   - Update `fallbackEngine.ts` to strictly handle `displayName`, `department`, `year`, `division`, and `bio`.
   - Update `user.controller.ts` to save all fields, validate with Zod and profanity filter, update `publicProfiles/{userId}` in Firestore / local mirror.
   - Enforce client-side validation and clear error/success alerts.
3. **Leaderboard Real-Rank Algorithm**:
   - Students with `0` weekly points receive NO rank (`rank: null`, display `"Not ranked yet"`).
   - "Rank X of N" counts strictly students with $> 0$ points.
   - Order: `weeklyPoints DESC`, then `earliest lastAcceptedSolve timestamp ASC`.
   - Sync rank display across Profile Header, Dashboard, and Leaderboard.
4. **College Name Uniformity**:
   - Change all defaults to `'Sanjivani University'`.
   - Create idempotent database migration `server/scripts/migrate-users-college.ts` to update any legacy `'Sanjivani College of Engineering'` records.
5. **Modal & Navbar Accessibility**:
   - Modal overlay z-index elevated to `z-[100]`.
   - Sticky footer with Save/Cancel always visible.
   - Keyboard trap, `Escape` key close, body scroll-lock.
6. **Opaque Profile URLs**:
   - Change public routes to `/profile/:id` (using opaque `shortId` or user ID, never `username`, `prn`, or `email`).
   - Old `/profile/:username` redirects to `/profile/:id` or 404 without leaking PII.
