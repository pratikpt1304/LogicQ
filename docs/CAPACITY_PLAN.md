# LogicQ Comprehensive Capacity & Scaling Plan (`/docs/CAPACITY_PLAN.md`)

> **STATUS**: `PROPOSED — GATE 1 AWAITING APPROVAL`  
> **Environment**: Staging & Production Scaling Blueprint  
> **Date**: October 12, 2026  
> **Author**: LogicQ Core Architecture Team

---

## 1. Executive Summary & Hot Path Analysis

LogicQ exhibits a classic synchronized traffic pattern: **zero activity turns into an immediate avalanche at 17:00:00 IST**, when the daily challenge flips. 

To withstand 1x (800 concurrent, 600 subs/min), 2x (1,600 concurrent, 1,200 subs/min), and 5x (4,000 concurrent, 3,000 subs/min) spikes without crashing, every hot path must be protected against contention, single-document write saturation, and runaway Cloud billing.

### Hot Paths Identified:
1. **17:00 IST Daily Challenge Fetch**: 800–4,000 students hitting `/problems/daily` simultaneously within a 60-second window.
2. **Submit Solution ("Accept First, Judge Later")**: Up to 50 submissions per second hitting `/submissions/submit`.
3. **Sandbox Judge Execution & Queue**: Sandboxed GCC compilation and execution across 7+ test cases per submission.
4. **Leaderboard & Dashboard Reads**: Thousands of queries reading standings and computing percentiles while submissions land.
5. **PRN Enrollment & Signup Contention**: Up to 5,000 students completing onboarding within 1 hour, competing for `prnIndex/{prn}` locks.
6. **Weekly Freeze Job at 17:05 IST**: Snapshotting and finalizing points across thousands of students.

---

## 2. Component Limits, Risks & Mitigations Table

| Component / Subsystem | Load at 1x / 2x / 5x | Quota / Limit | Risk / Contention Point | Architectural Mitigation | Monthly Cost Est. (1x / 2x / 5x) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Firebase Hosting & CDN** | 800 / 1.6k / 4k concurrent | Unlimited bandwidth (Blaze); 10 GB/mo free (Spark) | Static assets / HTML traffic spikes | Cache-Control `max-age=31536000, immutable` on hashed assets; Service Worker caching for PWA offline shell. | Free / Free / ~₹80 ($1) |
| **Challenge Fetch API (`/problems/daily`)** | 800 / 1.6k / 4k req/min at 17:00 | Cloud Functions concurrency limit (1,000) | Cold starts at 17:00:00 IST; repetitive database reads | Cache active challenge in memory/Redis with TTL until 17:00 next day; pre-warm 2 instances at 16:55 IST. Add 0–5s random client jitter. | Free / ~₹120 / ~₹300 |
| **Submission Intake (`/submissions/submit`)** | 10 / 20 / 50 req/sec (17:00–17:15) | Database write throughput (SQLite local / Firestore 10k w/s) | Synchronous compiler invocation blocks request threads, leading to HTTP 504 timeouts | **Accept First, Judge Later**: Write submission as `PENDING` with server `submittedAt` in < 50ms; return HTTP 202 immediately. | ~₹50 / ~₹150 / ~₹450 |
| **Sandboxed C11 Judge Service** | 10 / 20 / 50 jobs/sec; ~70–350 test runs/sec | CPU / Memory exhaustion; worker fork limits | Long queues, runaway processes (infinite loops, memory bombs) crashing workers | Isolated BullMQ worker pool; hard cgroups limits (64MB RAM, 1000ms CPU); max concurrency per worker; dynamic queue depth throttling. | ~₹300 / ~₹750 / ~₹2,200 |
| **Firestore `users/{userId}` Points** | 10 / 20 / 50 writes/sec | 1 write/sec per individual document limit | Multiple submissions from the same user or single global counter hotspotting | Submissions written to append-only `submissions` collection. User points updated asynchronously; no shared document locks. | Free / ~₹150 / ~₹500 |
| **Leaderboard Queries** | 50 / 100 / 250 reads/sec | Firestore read pricing & query latency | Calculating live ranks over 15k students causes high latency and read costs | Precompute leaderboard snapshots every 30–60s; cache top 100 in Redis/memory; clients query cached projections. | ~₹100 / ~₹350 / ~₹1,200 |
| **PRN Signup & `prnIndex`** | 1,000 / 2k / 5k signups/hr | Firestore 500 writes/batch; transaction retry limits | Hostels sharing 1 campus IP trigger IP rate limits; duplicate PRN registration race conditions | Rate limit per account + soft burst IP limiter (allowing campus subnets); atomic transaction on `prnIndex/{prn}` with exponential retry. | Free / ~₹50 / ~₹150 |
| **Weekly Results Job (17:05 IST)** | 3k / 6k / 15k student evaluations | Function 9-min timeout (Cloud Functions 2nd Gen 60 min) | Function timeout or out-of-memory midway through 15k users, corrupting weekly freeze | Chunked processing in batches of 250 with checkpointing in `weekly_jobs/{jobId}`; fully idempotent and resumable. | Free / Free / ~₹50 |

---

## 3. Bottleneck Analysis & Engineering Redesigns

### A. Accept First, Judge Later (Fair Cutoff Guarantee)
- **Current Behavior**: Submission intake verifies compiler availability and queues the job, but if the compiler daemon is slow, API intake can block or fail closed.
- **Redesign**:
  - `POST /submissions/submit` records the submission in the database with an authoritative server `submittedAt = getServerNow()` in $< 40\text{ ms}$.
  - The request returns `HTTP 202 Accepted` with `{ submissionId, queuePosition, estimatedWaitMs }`.
  - If submitted at `16:59:59 IST`, the student is guaranteed on-time credit even if the judge evaluation completes at `17:02:00 IST`.

### B. Judge Queue with Backpressure & Queue Position
- **Queue Mechanics**:
  - Persistent queue with idempotency key (`submissionId`).
  - Worker concurrency pool scaled with CPU cores.
  - Student client polls or receives WebSocket updates: `"Queued (Position 14 of 42) — Estimated wait: 18s"`.
- **Throttling & Backpressure Thresholds**:
  - If queue length $> 100$, student `Run Code` requests are throttled with HTTP 429 (`"Queue busy. Challenge submission is prioritized."`), reserving 100% judge bandwidth for real `Submit` jobs.
  - Per-student concurrency cap: Max 1 active judging job per student; subsequent submits rejected until previous evaluation completes.
  - 5-second cooldown strictly enforced between submissions.

### C. Read Reduction & Caching Strategy
- **Daily Problem**: The active problem statement is immutable between 17:00 and 17:00. Cache it in-memory / CDN with `s-maxage=60` and local LRU cache. Zero database reads for repeat fetches.
- **Client Auto-Refresh Jitter**: The client countdown timer applies a randomized jitter of $+0$ to $+5000\text{ ms}$ upon reaching `17:00:00 IST` to spread the fetch request wave.
- **Tab Inactivity Detection**: WebSocket connections and polling loops halt when `document.visibilityState === 'hidden'`.

### D. Weekly Freeze Job at 17:05 IST (Chunked & Resumable)
- **Problem**: A monolithic query iterating over 15,000 students risks timeout (Firestore 540s limit) and partial write failures.
- **Solution**:
  - Partition students into deterministic chunks of 250 (`batchSize = 250`).
  - Store progress checkpoint in `weekly_job_checkpoints/{weekId}` after each chunk.
  - If interrupted, the job resumes from the last completed offset.
  - Idempotent: re-running does not duplicate points or alter finalized ranks.

### E. Campus IP Awareness for Signup & Rate Limiting
- **Problem**: In college hostel networks, hundreds of students share a single public NAT IP address (`103.x.x.x`). A standard per-IP rate limit of 10 requests/minute blocks entire hostels.
- **Solution**:
  - Rate limiting key = `IP + (deviceFingerprint || emailHash)`.
  - Global IP limiter set to a generous campus burst threshold (100 req/min/IP), while per-account limiter strictly blocks brute-force abuse (5 attempts/min/account).

---

## 4. Financial Cost Envelope & Budget Controls

### Estimated Monthly Cloud Cost Breakdown:

| Service | 1x Load (3k Users) | 2x Load (6k Users) | 5x Stress (15k Users) |
| :--- | :---: | :---: | :---: |
| **Firebase Hosting** | ₹0 (Free Tier) | ₹0 (Free Tier) | ~₹80 ($1) |
| **Firestore Reads / Writes** | ~₹150 ($1.80) | ~₹450 ($5.40) | ~₹1,800 ($21.60) |
| **Cloud Functions (2nd Gen)** | ~₹100 ($1.20) | ~₹280 ($3.35) | ~₹900 ($10.80) |
| **Cloud Run / Worker (Judge)** | ~₹300 ($3.60) | ~₹750 ($9.00) | ~₹2,200 ($26.40) |
| **Cloud Storage** | ~₹20 ($0.25) | ~₹50 ($0.60) | ~₹150 ($1.80) |
| **Total Estimated Monthly Cost** | **~₹570 (~$6.85)** | **~₹1,530 (~$18.35)** | **~₹5,130 (~$61.60)** |

### Cost Guardrails:
1. **Hard Budget Alert**: GCP budget alert configured at **₹500 ($6)**, triggering email notifications at 50%, 80%, and 100%.
2. **Cloud Functions Max Instances**: Cap critical Cloud Functions at `maxInstances: 10` (or `maxInstances: 20` for 5x) to guarantee spend cannot exceed budget under DDoS.
3. **Emergency Circuit Breaker**: If monthly billing reaches ₹1,000 ($12), the admin dashboard enables one-click **Read-Only Mode**, disabling judge execution and submissions while keeping student dashboards accessible.

---

## 5. Next Steps & Approval Gate

1. **Awaiting User Decision on Hard Test Budget**:
   - Please specify the testing budget limit (e.g., ₹500, ₹1,000, or Local Emulator Only).
2. **Phase 2 Implementation Scope (Upon Approval)**:
   - Implement Judge Queue with dynamic backpressure, queue position telemetry, and graceful run-throttling.
   - Implement in-memory cache for 17:00 challenge and leaderboard snapshots.
   - Implement chunked, resumable weekly result job.
   - Implement client jitter and tab visibility suspension.
   - Write load-test harness in `/load-tests` with staging safety locks.
