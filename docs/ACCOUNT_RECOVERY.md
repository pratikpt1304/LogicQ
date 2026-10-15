# Account Recovery, Reconciliation & Anti-Cheating Specification

**Document Version**: 1.0.0  
**Effective Date**: 2026-10-15  
**Scope**: Student Accounts, Split Identities, LocalStorage Recovery, and Invariant Guarantees  

---

## 1. Problem Definition & Scope

Due to legacy client-side reliance on browser `localStorage` fallback (as audited in `/docs/CROSS_DEVICE_BUG.md`), some students may have:
1. **Trapped Local Data**: Solved practice problems or daily challenges on a single machine or browser, with records stored only in `localStorage` under `logicq_fallback_*`.
2. **Split Accounts**: Created an account via Google Sign-In on one device (creating UID A) and Email/Password on another device (creating UID B) with the same academic email or PRN.
3. **Out-of-Sync Points & Streaks**: Browser display showing point values that differ from server-evaluated submissions.

This specification details the authoritative, idempotent migration and reconciliation protocol to restore unified student accounts without compromising platform security, leaderboard integrity, or academic honesty.

---

## 2. Core Non-Negotiable Invariants

1. **Server-Side Truth Only (Zero Trust in Client-Claimed Points)**:
   - Client-reported `totalPoints`, `currentStreak`, or `solvedProblems` counters are **NEVER trusted**.
   - Points are strictly recomputed from immutable `submissions` records in Firestore where `verdict == 'ACCEPTED'`.
   - Streaks are strictly reconstructed from daily challenge `submissions` with accepted verdicts within the official daily submission windows (17:00 IST to next day 17:00 IST).
2. **Deterministic Identity (1 Person = 1 Account = 1 UID = 1 PRN)**:
   - A student possesses exactly one Firebase Auth `uid`.
   - `prnIndex/{prn}` maps to exactly one canonical `uid`.
   - Multiple auth providers (Google, Email/Password) for the same verified email address must be linked to that single `uid`.
3. **No Unilateral Deletions**:
   - No production user account or submission record is destroyed during reconciliation.
   - Secondary split accounts are archived (`status: 'MERGED_INTO_CANONICAL'`) with full audit provenance logged in `admin_audit_logs`.
4. **Manual Review Escalation**:
   - Any ambiguous conflict (e.g., two distinct PRNs linked to the same email, or overlapping accepted submissions for identical challenges from divergent IP ranges during contest windows) is flagged for manual admin inspection with a structured diff.

---

## 3. Account Reconciliation Algorithm

```
                             [ Student Signs In ]
                                      │
                         Is Account Split Detected?
                   (Same Email/PRN across multiple UIDs)
                                  ┌───┴───┐
                                  │       │
                                 YES      NO ──> Proceed to Direct Firestore Sync
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [ Automated Safe Merge ]         [ Ambiguous Conflict ]
      - Same email & PRN              - Different PRNs or Names
      - Distinct submission sets       - Conflicting contest submissions
                  │                               │
                  ▼                               ▼
      1. Choose Canonical UID:          1. Do NOT auto-merge
         Oldest account with PRN        2. Lock secondary account
      2. Re-anchor Submissions:         3. Create `integrity_flags` document
         Update `userId` to canonical   4. Notify Platform Admin with Diff
      3. Re-anchor Practice Progress:
         Union of unlocked problems
      4. Recalculate Stats from zero:
         Points = sum(verified points)
         Streak = verify daily chain
      5. Link Auth Providers
      6. Archive Secondary UID
```

### 3.1 Step 1: Canonical UID Selection
When two accounts $A$ and $B$ share the same student email or PRN:
- If only one account has a completed academic profile (`profileComplete: true` and valid `prnIndex`), that account is designated **Canonical**.
- If both have completed profiles with identical PRNs, the account with earlier `createdAt` is designated **Canonical**.
- The other account is designated **Secondary**.

### 3.2 Step 2: Submission & Practice Migration
All Firestore records belonging to the secondary account are migrated to the canonical account:
```typescript
// Submissions migration
const secondarySubmissions = await db.collection('submissions')
  .where('userId', '==', secondaryUid)
  .get();

for (const subDoc of secondarySubmissions.docs) {
  await subDoc.ref.update({
    userId: canonicalUid,
    migratedFromUid: secondaryUid,
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Practice progress migration (Union strategy)
const canonicalProgRef = db.doc(`practice_progress/${canonicalUid}`);
const secondaryProgRef = db.doc(`practice_progress/${secondaryUid}`);
const [canSnap, secSnap] = await Promise.all([canonicalProgRef.get(), secondaryProgRef.get()]);

if (secSnap.exists) {
  const canData = canSnap.exists ? canSnap.data() : { completedProblems: [] };
  const secData = secSnap.data();
  const mergedProblems = Array.from(new Set([
    ...(canData.completedProblems || []),
    ...(secData.completedProblems || [])
  ]));
  await canonicalProgRef.set({
    userId: canonicalUid,
    completedProblems: mergedProblems,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
```

### 3.3 Step 3: Authoritative Stats Recomputation
After migrating submissions, the canonical account's stats are recalculated from first principles:
```typescript
export async function recalculateStudentStats(canonicalUid: string) {
  const subsSnap = await db.collection('submissions')
    .where('userId', '==', canonicalUid)
    .where('verdict', '==', 'ACCEPTED')
    .get();

  // Deduplicate points per problem (students receive points once per unique problem)
  const solvedProblems = new Map<string, number>();
  const dailySolvedDates = new Set<string>();

  for (const doc of subsSnap.docs) {
    const sub = doc.data();
    const probId = sub.problemId || sub.problemSlug;
    const pts = Number(sub.pointsAwarded || sub.points || 0);
    if (!solvedProblems.has(probId) || solvedProblems.get(probId)! < pts) {
      solvedProblems.set(probId, pts);
    }
    if (sub.isDaily && sub.challengeDate) {
      dailySolvedDates.add(sub.challengeDate);
    }
  }

  const totalPoints = Array.from(solvedProblems.values()).reduce((a, b) => a + b, 0);
  const totalSolved = solvedProblems.size;
  const { currentStreak, longestStreak } = computeStreakFromDates(dailySolvedDates);

  await db.doc(`users/${canonicalUid}`).update({
    totalPoints,
    solvedCount: totalSolved,
    currentStreak,
    longestStreak,
    statsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.doc(`publicProfiles/${canonicalUid}`).set({
    totalPoints,
    solvedCount: totalSolved,
    currentStreak,
    longestStreak,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
```

---

## 4. Recovering LocalStorage Data from a Single Device

For a student who has uncommitted local solutions in their browser's `localStorage` (`logicq_fallback_submissions_v1`):

### 4.1 Safe Client Upload Protocol
1. **Client Detection**:
   Upon successful Firestore sign-in, the client checks if `localStorage.getItem('logicq_fallback_submissions_v1')` exists and contains submissions.
2. **Server Verification Required**:
   - The client **CANNOT** simply upload points or verdicts.
   - The client transmits the raw code, problem slug, and language to the server endpoint `/api/submissions/reconcile-local`.
   - The judge re-executes the code against hidden test cases.
   - Only code that **passes official execution** produces an accepted `submission` document.
3. **Draft Migration**:
   - In-progress local drafts (`logicq_draft_*`) are pushed to `users/{uid}/drafts/{problemId}` via `DraftSyncService.syncOnLogin()`.
4. **Purge Local Cache**:
   - Once confirmed by the server, legacy fallback keys are safely purged from `localStorage`.

---

## 5. Security & Anti-Cheating Invariants

| Attack Vector | Defense / Security Invariant |
| :--- | :--- |
| **Fabricated Local Points** | Local storage counter `totalPoints` is completely discarded. Points are 100% computed from server-evaluated test runs in Firestore. |
| **Timestamp Spoofing** | Submissions created via local reconciliation are tagged `reconciledSubmission: true` and credited towards practice points, but **CANNOT retroactive claim past daily competition winner ranks**. |
| **Identity Hijacking via Merge** | Reconciling accounts requires authenticated ownership of both accounts (either matching verified email, or re-authentication with password + Google OAuth token). |
| **PRN Collision / Stealing** | `prnIndex/{prn}` is locked in Firestore security rules (`allow write: if false`). An account cannot claim a PRN already registered to another active UID without admin intervention. |

---

## 6. Admin Audit & Escalation Tooling

Any reconciliation execution automatically writes an immutable log entry to `admin_audit_logs`:
```typescript
await db.collection('admin_audit_logs').add({
  action: 'ACCOUNT_RECONCILIATION',
  canonicalUid,
  secondaryUid,
  reconciledBy: auth.currentUser?.uid || 'SYSTEM_MIGRATION',
  recalculatedPoints: totalPoints,
  recalculatedStreak: currentStreak,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
});
```

If an ambiguous conflict is detected:
```typescript
await db.collection('integrity_flags').add({
  type: 'AMBIGUOUS_SPLIT_ACCOUNT',
  canonicalUid,
  secondaryUid,
  details: 'Mismatched PRN or overlapping conflicting submissions detected.',
  status: 'PENDING_ADMIN_REVIEW',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```
Admin dashboard alerts the college coordinator to review the identity before manual merge.
