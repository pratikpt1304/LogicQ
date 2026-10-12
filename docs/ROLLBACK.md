# LogicQ Emergency Rollback Runbook (`/docs/ROLLBACK.md`)

> **CRITICAL RULE**: If any step of the Staging or Production deployment fails smoke verification or triggers unexpected runtime errors, **STOP IMMEDIATELY** and execute the corresponding rollback command below in **reverse deployment order** (Hosting $\rightarrow$ Functions $\rightarrow$ Rules). Never delete production data and never weaken security rules (`allow read, write: if true`) to work around a failure.

---

## 1. Pre-Deploy Snapshot Record (To Capture Before Step 4 Production Deploy)

Before running any production deployment command on `logicq-clanguage`:
- **Current Git Commit on `main`**: `a35f86c` (`feat: LogicQ competitive C programming platform (Bitwise Club)`)
- **Pre-Deploy Git Tag**: `v0.9.0-pre-pilot` (`git tag v0.9.0-pre-pilot a35f86c`)
- **Firestore Export Bucket Path**: `gs://logicq-clanguage-backups/pre-deploy-YYYY-MM-DD/`

---

## 2. Step-by-Step Rollback Commands

### A. Roll Back Firebase Hosting (Instant — $< 15\text{ seconds}$)

If the new frontend bundle in `client/dist` exhibits any UI, routing, or CSP regressions on `https://logicq-clanguage.web.app`:

1. **Option 1 — Via Firebase CLI (Clone previous live version to live channel)**:
   ```bash
   # List recent Hosting releases to identify the previous version ID
   npx firebase-tools hosting:channel:list --project logicq-clanguage

   # Or redeploy the exact pre-deploy commit's Hosting build:
   git checkout v0.9.0-pre-pilot
   npm --prefix client run build
   npx firebase-tools deploy --only hosting --project logicq-clanguage
   ```
2. **Option 2 — One-Click Rollback in Firebase Console**:
   - Open **Firebase Console $\rightarrow$ `logicq-clanguage` $\rightarrow$ Hosting $\rightarrow$ Release History**.
   - Click the three-dot menu ($\vdots$) next to the release immediately preceding the deployment and select **Rollback**.

---

### B. Roll Back Cloud Functions & Scheduled Jobs (`17:00 IST` & `17:05 IST`)

If a newly deployed Cloud Function or Cloud Run Judge service returns `5xx` errors:

```bash
# Check out the tagged pre-deploy commit
git checkout v0.9.0-pre-pilot

# Redeploy only the previous Cloud Functions definition
npx firebase-tools deploy --only functions --project logicq-clanguage
```

---

### C. Roll Back Firestore & Cloud Storage Security Rules

If a rule syntax or permission regression blocks legitimate student or admin reads:

```bash
# Check out the previous rules from the tagged commit
git checkout v0.9.0-pre-pilot -- firestore.rules storage.rules firestore.indexes.json

# Redeploy the previous Firestore and Storage security rules
npx firebase-tools deploy --only firestore:rules,storage:rules --project logicq-clanguage
```

---

### D. Restore Firestore & Storage Data From Pre-Deploy Backup

> **Note**: Because our PRN/Academic schema migration (`server/scripts/migrate-users-prn.ts`) is **strictly additive and idempotent** (setting `profileComplete = false` for legacy accounts missing a 12-digit PRN and retiring removed features via `FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false` without deleting any `users`, `submissions`, `problems`, or `weekly_summaries` documents), rolling back code/rules does **not** require a destructive database wipe.

If an emergency point-in-time Firestore restore is ever required:

```bash
# 1. Import the pre-deploy Firestore backup from the admin GCS bucket
gcloud firestore import gs://logicq-clanguage-backups/pre-deploy-YYYY-MM-DD/ \
  --project=logicq-clanguage

# 2. Verify ledger and referential integrity after restore
npm --prefix server run verify-integrity
```
