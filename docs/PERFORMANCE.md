# LogicQ Performance & Service Goals (`/docs/PERFORMANCE.md`)

> **STATUS**: `PROPOSED SERVICE LEVEL OBJECTIVES (SLOs)`  
> **Environment**: Staging & Production Targets  
> **Date**: October 12, 2026  
> **Audience**: Engineering & Sanjivani University Stakeholders

---

## 1. Workload Scale Definitions

To prepare for peak traffic and growth, LogicQ measures performance at three distinct tiers:

| Parameter | Baseline (1x Target) | Scaled (2x Target) | Extreme Peak (5x Stress) |
| :--- | :---: | :---: | :---: |
| **Total Registered Students** | 3,000 students | 6,000 students | 15,000 students |
| **Daily Active Students (DAU)** | 1,800 students (60%) | 3,600 students (60%) | 9,000 students (60%) |
| **17:00 IST Peak Concurrent Users** | 800 users | 1,600 users | 4,000 users |
| **Peak Submissions per Minute (17:00–17:15)** | 600 subs/min (10 req/s) | 1,200 subs/min (20 req/s) | 3,000 subs/min (50 req/s) |
| **Enrollment Burst (1-Hour Window)** | 1,000 signups/hr | 2,000 signups/hr | 5,000 signups/hr |
| **Spike Scenario** | 0 to 800 users in < 60s | 0 to 1,600 users in < 60s | 0 to 4,000 users in < 60s |
| **Soak Test Duration** | 2 Hours continuous at 1x | — | — |

---

## 2. Service Level Objectives (SLOs) & Targets

| Metric | Target (1x) | Scaled Target (2x) | Stress Target (5x) | Measurement Point |
| :--- | :---: | :---: | :---: | :--- |
| **Page & Challenge Load (p95)** | $< 2.0\text{ s}$ | $< 2.0\text{ s}$ | $< 3.0\text{ s}$ | Browser Navigation / API `/problems/daily` |
| **Run / Submit API Intake (p95)** | $< 1.0\text{ s}$ | $< 1.0\text{ s}$ | $< 1.5\text{ s}$ | POST `/submissions/submit` (HTTP 202 Intake) |
| **End-to-End Judging Verdict (p95)**| $< 15.0\text{ s}$ | $< 30.0\text{ s}$ | $< 60.0\text{ s}$ | Queue Wait + Worker GCC Compilation & Run |
| **Global API Error Rate** | $< 1.0\%$ | $< 1.0\%$ | $< 2.0\%$ | Failed HTTP 5xx responses (excl. 429 backpressure) |
| **Submission Loss Rate** | **0% (Zero)** | **0% (Zero)** | **0% (Zero)** | Every received submission saved to durable ledger |
| **Duplicate Points Awarded** | **0 (Zero)** | **0 (Zero)** | **0 (Zero)** | Enforced via database transaction & unique constraints |

---

## 3. Graceful Degradation Tiers

When load exceeds provisioned capacity, the system degrades in ordered tiers rather than crashing:

1. **Tier 1 (Normal Operations - 0 to 1x)**:
   - Instant Run code and instant Submit evaluations.
   - Live WebSocket scoreboard and queue status updates.
2. **Tier 2 (Queue Backpressure - 1x to 2x)**:
   - Student sees `"Queued, Position #N"` and honest estimated wait time.
   - Run requests throttled to 1 run / 10s per student; Submit solution priority retained.
3. **Tier 3 (Heavy Load Shedding - 2x to 5x)**:
   - "Accept First, Judge Later" mode: Submissions saved instantly with server timestamp, judging queued asynchronously.
   - Run code requests temporarily paused with polite student toast: *"Challenge submission is prioritized during peak window. Please submit your final solution directly."*
   - Dashboard served from precomputed cached documents; leaderboard updates throttled to 60-second intervals.
4. **Tier 4 (Emergency Read-Only / Maintenance)**:
   - Dashboard and today's challenge remain readable.
   - Submissions paused with prominent banner if database write latency exceeds 5 seconds or budget alert fires.
