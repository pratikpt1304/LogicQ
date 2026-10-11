# LogicQ Data Safety, Caching Architecture & Operational Quota Budget

## 1. Append-Only Invariant & Soft-Retirement Policy

LogicQ enforces an immutable, append-only ledger for all authoritative academic and competitive records:

```
+----------------------------------------------------------------------------------------------------+
|                                 LOGICQ APPEND-ONLY LEDGER MODEL                                    |
|                                                                                                    |
|  [ Student Submits Code ]                                                                          |
|            |                                                                                       |
|            v                                                                                       |
|  +----------------------------------------------------------------------------------------------+  |
|  | NEW SUBMISSION RECORD CREATED (UUIDv4)                                                       |  |
|  | - Immutable fields: id, userId, problemId, code, verdict, runtimeMs, memoryKb, createdAt   |  |
|  | - NEVER OVERWRITTEN. NEVER HARD-DELETED.                                                     |  |
|  +----------------------------------------------------------------------------------------------+  |
|            |                                                                                       |
|            v (If Test Suite Corrected by Admin -> REJUDGE TRIGGERED)                               |
|  +----------------------------------------------------------------------------------------------+  |
|  | NEW REJUDGE RECORD CREATED (UUIDv4)                                                          |  |
|  | - supersedesSubmissionId: "original_sub_123"                                                  |  |
|  | - status: "ACCEPTED"                                                                         |  |
|  | - Previous submission marked: status: "SUPERSEDED" (History preserved for audit)            |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### 1.1 Invariants Codified:
1. **Zero Overwrites**: Once written, a `Submission` document cannot have its code, verdict, or test case outputs altered.
2. **Zero Hard Deletions**: The `deleteDoc()` operation on `submissions`, `user_stats_ledger`, and `admin_audit_logs` is rejected at both the Firestore Security Rule level and the Cloud Function application layer.
3. **Soft-Retirement for Problems & Contests**: Deleting a problem or contest sets `status: 'RETIRED'` and `retiredAt: Timestamp`. All past student solutions against that problem remain intact in their portfolios.

---

## 2. Read/Write Caching Architecture (< 20 Reads Per Screen)

Cloud Firestore charges per document read. Uncontrolled reads can rapidly exhaust quotas. LogicQ employs **Aggregated Document Caching & Materialized Views** to ensure **no screen exceeds 2–10 reads per student visit**.

### 2.1 Caching Design by Screen

| Application Screen | Raw Query Cost (Without Cache) | LogicQ Cached Architecture | Actual Firestore Reads |
| :--- | :--- | :--- | :---: |
| **Global Leaderboard** | Reading 100 to 500 individual user documents (**100–500 reads**) | Reads single pre-aggregated document: `/leaderboards/global_top100` | **1 READ** |
| **Student Dashboard** | Querying submissions + problems + user + streak (**15–30 reads**) | Reads single materialized view: `/users/{uid}/dashboard_summary` | **1 READ** |
| **Problem Workspace** | Reading problem statement + 10 sample test documents (**11 reads**) | Problem statement and visible samples bundled in single `/problems/{id}` doc | **1 READ** |
| **Personal Submission History**| Reading full submission collection (**50+ reads**) | Paginated query (`limit(10)`) fetching only recent records | **10 READS (Max)** |
| **Arena Contest Scoreboard** | Listening to 100 competitor updates in real-time (**thousands of reads**) | Real-time listener on single debounced scoreboard doc: `/contests/{id}/scoreboard` | **1 READ / Refresh** |

*Result: Every major screen operates at between **1 and 10 reads**, well below the 20-read budget ceiling.*

---

## 3. Daily Read/Write Budget Estimate for 500 Active Students

### 3.1 Assumptions & Usage Patterns
- **Active User Base**: 500 active students per 24-hour cycle.
- **Average Engagement**:
  - 2 Daily Dashboard views per student.
  - 3 Problem statement views per student.
  - 4 Code submissions per student (2000 total submissions/day).
  - 2 Leaderboard views per student.
  - 1 Submission history check per student.

### 3.2 Daily Firestore Operation Math

| User Action / Workflow | Event Count (500 Students) | Reads per Action | Daily Reads | Writes per Action | Daily Writes |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard Load** | 1,000 views | 1 (Summary Doc) | 1,000 | 0 | 0 |
| **Problem Statement Open** | 1,500 opens | 1 (Problem Doc) | 1,500 | 0 | 0 |
| **Submission Evaluation** | 2,000 submissions | 1 (Problem checks) | 2,000 | 2 (Submission + Ledger) | 4,000 |
| **Dashboard Summary Sync** | 2,000 solves | 0 | 0 | 1 (Materialized View) | 2,000 |
| **Current Week Leaderboard Check** | 1,000 checks | 1 (Cached Week Doc) | 1,000 | 0 | 0 |
| **Leaderboard Background Sync**| 24 hours (1/min debounce) | 0 | 0 | 1 (Every 5 mins) | 288 |
| **Submission History Open** | 500 views | 10 (Recent 10) | 5,000 | 0 | 0 |
| **17:00 IST Daily Release & Streak Freeze Cron** | 1 run/day (`0 17 * * *`) | ~155 (Active streak + pause check) | 155 | ~65 (Freezes + breaks + fallback) | 65 |
| **Mon 17:05 IST Weekly Close & Summary Cron** | 1 run/week (`5 17 * * 1`, amortized/day) | ~290 / day (`2,030/wk`) | 290 | ~75 / day (`525/wk` summaries) | 75 |
| **Client TanStack Cache Hit**| 3,000 cached loads | 0 (In-Memory) | 0 | 0 | 0 |
| **TOTAL ESTIMATED DAILY** | — | — | **~10,945 Reads** | — | **~6,428 Writes** |

### 3.3 Comparison Against Perpetual Free Tier Allowances

| Quota Dimension | Perpetual Free Quota (Blaze/Spark) | LogicQ 500-User Consumption | Utilization % | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Document Reads** | **50,000 / day** | ~10,945 / day | **21.9%** | 🟢 **WELL WITHIN QUOTA (FREE)** |
| **Document Writes** | **20,000 / day** | ~6,428 / day | **32.1%** | 🟢 **WELL WITHIN QUOTA (FREE)** |
| **Document Deletes** | **20,000 / day** | 0 / day (Append-only) | **0.0%** | 🟢 **ZERO UTILIZATION** |
| **Cloud Scheduler Jobs** | **3 free jobs / month** | 2 jobs (`daily` + `weekly`) | **66.7%** | 🟢 **$0.00 / MONTH (REQUIRES BLAZE PLAN)** |

> [!WARNING]
> **Blaze Plan Requirement for Scheduled Functions (`onSchedule`)**:  
> Deploying Firebase Scheduled Cloud Functions (`dailyReleaseAndStreakJob` at `0 17 * * *` and `closeAndSummarizeWeekJob` at `5 17 * * 1` `Asia/Kolkata`) requires upgrading the Firebase project to the **Blaze (Pay-As-You-Go) Plan** because Cloud Scheduler and Pub/Sub APIs require an active billing account. Actual monthly cost for 2 cron jobs and 500 students remains **$0.00/month** (within Google Cloud's perpetual free tier of 3 free scheduler jobs and 2M function invocations). If operating strictly without a billing card on Spark, use the GitHub Actions cron webhook fallback + lazy `17:00 IST` server evaluation documented in [`/docs/WEEKLY_SYSTEM.md`](./WEEKLY_SYSTEM.md).

---

## 4. High-Risk Features Flagged & Mitigations

Without proper controls, the following features would rapidly exceed the 50,000 free read quota:

### ⚠️ Flag 1: High-Frequency Real-Time Contest Scoreboard Listeners
- **Risk**: 100 contestants attaching individual Firestore snapshot listeners to 100 competitor documents during an active contest. Every solve triggers $100 \times 100 = 10,000$ reads. Five solves exhausts the entire daily free quota!
- **Mitigation**: Scoreboards are compiled by a Cloud Function into a single denormalized document (`/contests/{id}/scoreboard`), debounced at **10-second intervals**. All 100 contestants listen to that single document. (Cost: 1 read per client per update).

### ⚠️ Flag 2: Submission Status Polling
- **Risk**: Client polling `GET /submissions/{id}` every 500ms while waiting for judge results.
- **Mitigation**: Clients attach a single reactive listener or WebSocket event with a 15-second timeout. Polling loops are strictly blocked.

### ⚠️ Flag 3: Unbounded Historical Queries
- **Risk**: Fetching all historical submissions for a student on page load.
- **Mitigation**: Enforce mandatory `.limit(10)` pagination on all history queries.

---

## 5. Google Cloud Billing Budget Alerts & Incident Runbook

### 5.1 Setting Budget Alerts in Google Cloud Console
1. Navigate to **Google Cloud Console** -> **Billing** -> **Budgets & alerts**.
2. Create Budget:
   - **Target Budget**: $10.00 USD / month (~₹800 INR).
   - **Trigger Thresholds**:
     - **50% ($5.00)**: Informational email sent to both Project Owners.
     - **80% ($8.00)**: Warning email; inspect Cloud Run compute and Firestore write counts.
     - **100% ($10.00)**: High Priority Alert; triggers operational mitigation.
     - **120% ($12.00)**: Emergency Threshold; triggers automated rate-limiting.

### 5.2 Quota & Budget Exhaustion Runbook

If 80% or 100% budget alerts fire, execute the following emergency triage:

```
[ALERT: 100% BUDGET OR QUOTA CEILING HIT]
        |
        v
STEP 1: INSPECT LIVE METRICS
  - Open Cloud Console -> Firestore -> Usage.
  - Identify spike source: Is it Reads (Dashboard/Leaderboard) or Writes (Submission spam)?
        |
        v
STEP 2: ACTIVATE EMERGENCY CACHE TUNING (Zero-Downtime)
  - Update Remote Config / Environment Variable:
    `CACHE_TTL_MINUTES=15` (Increases TanStack Query cache from 2 min to 15 min).
    `LEADERBOARD_DEBOUNCE_SECONDS=60` (Throttles scoreboard writes to once per minute).
        |
        v
STEP 3: THROTTLE SUBMISSION VELOCITY
  - Adjust submission cooldown in Cloud Functions from 10s to 30s.
  - Halts automated brute-force attacks and stabilizes judge execution.
        |
        v
STEP 4: SWITCH LEADERBOARDS TO SCHEDULED SNAPSHOTS
  - Disable live real-time listeners; leaderboard displays static snapshot with
    a manual "Refresh Standings" button limited to once every 60 seconds per user.
```

---

## 6. Project Governance: Dual Project Owners Policy

Every production Firebase instance must maintain **two independent Owner accounts**:
1. **Primary Owner**: Platform Tech Lead (`lead@logicq.io` or institutional email).
2. **Secondary Owner / Break-Glass Account**: Head of Department or Institutional IT Admin (`hod-cse@college.edu`).

This ensures continuity if the primary administrator is unavailable, loses access, or graduates.
