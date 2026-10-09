# LogicQ Backup, Point-in-Time Recovery & Disaster Recovery Runbook

## 1. Executive Summary & Regulatory Context
This runbook defines the multi-tiered data protection, Point-in-Time Recovery (PITR), and disaster recovery procedures for LogicQ's production Firebase and Google Cloud environment. It guarantees zero data loss for submissions, verdicts, and contest scoreboards.

---

## 2. Multi-Tiered Backup Architecture

LogicQ utilizes a three-tier backup defense strategy:

```
+----------------------------------------------------------------------------------------------------+
|                                  LOGICQ DATA PROTECTION TOPOLOGY                                    |
|                                                                                                    |
|  +-----------------------------+   +-----------------------------+   +--------------------------+  |
|  |     TIER 1: PITR (7-DAY)    |   |    TIER 2: SCHEDULED DAILY  |   |   TIER 3: WEEKLY COLD    |  |
|  |  Point-in-Time Continuous   |   |   Automated Daily Snapshots |   |   Admin GCS Bucket Export|  |
|  +-----------------------------+   +-----------------------------+   +--------------------------+  |
|  | - 7-day microsecond restore |   | - Daily cron export at 03:00|   | - Exported every Sunday  |  |
|  | - Near-instant rollbacks    |   | - Stored in regional bucket |   | - Admin cold storage     |  |
|  | - Protection from human     |   | - 30-day retention policy   |   | - 365-day archive        |  |
|  |   operational error         |   | - Automated health alert    |   | - Isolated GCP project   |  |
|  +-----------------------------+   +-----------------------------+   +--------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Tier 1: Configuring Point-in-Time Recovery (PITR)

Cloud Firestore Point-in-Time Recovery (PITR) provides continuous microsecond-level protection against accidental data deletion or corruption for up to 7 days.

### 3.1 Enabling PITR
PITR is enabled on the `(default)` database via Google Cloud CLI:
```bash
gcloud firestore databases update --database='(default)' \
  --type=firestore-native \
  --point-in-time-recovery-enable \
  --project=logicq-prod
```

### 3.2 Verifying PITR Status
```bash
gcloud firestore databases describe --database='(default)' --project=logicq-prod
```
Ensure output displays:
```json
{
  "pointInTimeRecoveryEnablement": "POINT_IN_TIME_RECOVERY_ENABLED",
  "earliestVersionTime": "2026-10-02T18:00:00.000000Z"
}
```

---

## 4. Tier 2: Automated Daily Scheduled Backups

In addition to PITR, automated daily backups capture complete database snapshots.

### 4.1 Creating the Daily Backup Schedule
Configure a daily backup schedule running at 03:00 IST (21:30 UTC):
```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=30d \
  --project=logicq-prod
```

### 4.2 Listing Active Backup Schedules & Existing Backups
```bash
# List configured schedules
gcloud firestore backups schedules list --database='(default)' --project=logicq-prod

# List available snapshots
gcloud firestore backups list --format="table(name,database,snapshotTime,state)" --project=logicq-prod
```

---

## 5. Tier 3: Weekly Admin-Owned Cold Storage Export

Every Sunday at midnight, a Cloud Function triggers a complete export of authoritative collections to an isolated, admin-owned Google Cloud Storage bucket (`gs://logicq-backups-admin-cold`):

### Collections Exported:
- `users`
- `problems`
- `problems/{id}/hidden_tests`
- `submissions`
- `leaderboards`
- `contests`
- `badges`
- `admin_audit_logs`

### Export Command (CLI / Cloud Scheduler):
```bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
gcloud firestore export gs://logicq-backups-admin-cold/$TIMESTAMP \
  --collection-ids='users,problems,submissions,leaderboards,contests,badges,admin_audit_logs' \
  --project=logicq-prod
```

---

## 6. Tested Restore Procedure (Step-by-Step into Staging Project)

> **SAFETY INVARIANT**: *A restore is NEVER performed blindly into the production database. All restores are first reconstituted into a dedicated staging/test database or project (`logicq-staging`) to verify document counts and checksum parity before redirecting traffic.*

### Step 6.1: Identify the Target Backup or Timestamp
To restore from PITR to an exact timestamp (e.g. 15 minutes before an incident):
```bash
TARGET_TIMESTAMP="2026-10-09T22:30:00.000000Z"
```

To restore from a scheduled snapshot:
```bash
BACKUP_ID=$(gcloud firestore backups list --project=logicq-prod --format="value(name)" --limit=1)
```

### Step 6.2: Execute Restore into Staging Database
```bash
# Option A: Restore from PITR timestamp into staging database
gcloud firestore databases restore \
  --source-database='(default)' \
  --destination-database='logicq-restored-audit' \
  --restore-time="$TARGET_TIMESTAMP" \
  --project=logicq-staging

# Option B: Restore from Backup Snapshot
gcloud firestore databases restore \
  --source-backup="$BACKUP_ID" \
  --destination-database='logicq-restored-audit' \
  --project=logicq-staging
```

### Step 6.3: Automated Data Integrity Verification
Run the verification check script to compare document counts between source and restored databases:
```bash
npm run test:restore-audit -- --project=logicq-staging --database=logicq-restored-audit
```
The audit verifies:
1. Total `users` count matches snapshot.
2. Total `submissions` count matches snapshot.
3. Points and streak sums match snapshot.
4. All hidden test cases are intact.

---

## 7. Dual Project Ownership Policy (Mandatory Requirement)

To prevent catastrophic single-operator lockouts, organizational disruption, or student graduation churn:

> **STRICT POLICY**: Every production Firebase and Google Cloud project (`logicq-prod`, `logicq-staging`) **MUST HAVE AT LEAST TWO INDEPENDENT OWNER ACCOUNTS**:
> 1. **Primary Project Owner**: Primary Lead / Professor (`lead@logicq.io` or institutional email).
> 2. **Secondary Co-Owner / Break-Glass Account**: Institutional Department Head, Co-Founder, or Dedicated Institutional Admin Group (`admin-team@college.edu`).

### Adding Secondary Owner via Google Cloud Console:
```bash
gcloud projects add-iam-policy-binding logicq-prod \
  --member='user:secondary-owner@college.edu' \
  --role='roles/owner'
```
Both owners must have:
- Multi-Factor Authentication (MFA) enabled.
- Access to the Billing Account and Google Cloud Console.
- Access to the Secret Manager and OAuth Credentials.
