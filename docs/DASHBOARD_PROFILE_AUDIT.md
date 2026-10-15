# Dashboard (Home) vs. Profile Statistics Audit & Deduplication Manifesto

**Document Version:** 1.0.0  
**Status:** Implemented  
**Date:** 2026-10-13  
**Audience:** Frontend, Backend, UI/UX Engineering, Faculty Reviewers  

---

## 1. Executive Summary & Purpose

In earlier iterations of LogicQ, several cumulative long-term metrics and activity widgets (total score, total problems solved, solve breakdown by difficulty, overall accuracy percentage, submission heatmap, and recent submissions table) were duplicated across both the **Home (Dashboard)** page and the **Profile** page.

This duplication introduced several issues:
1. **Cognitive Overload on Home:** The Home screen felt cluttered and unfocused, conflating "what do I need to do right now today" with "historical resume / lifelong transcript".
2. **Data Consistency Risks:** Cumulative metrics were pulled via `/users/dashboard/stats` on the Home page and `/users/profile/:username` on the Profile page; slight divergence in caching, parameter parsing, or aggregation timing risked displaying discordant numbers to the student.
3. **Empty / Misleading States:** The Profile page displayed a static placeholder (`"0 Recorded"`) for recent submissions rather than rendering the verified submission history and code viewer, while Home displayed a full raw submission log.

This audit establishes a strict architectural separation of concerns:
- **Home (Dashboard):** *"What to do today"* — immediate actionable competitive context.
- **Profile:** *"My long-term record"* — comprehensive, permanent academic and competitive transcript.

---

## 2. Page Responsibilities & Matrix

| Metric / Card / Widget | Home (Dashboard) | Profile Page | Authoritative Source Document | Rationale & Architectural Rule |
| :--- | :---: | :---: | :--- | :--- |
| **Featured Daily Challenge & Countdown** | **YES** | NO | `/problems/daily` / Server Config | Immediate action item: solve before 17:00 IST cutoff. Hidden/neutral banner when daily competition is paused. |
| **Daily Standing / Daily Rank Card** | **YES** | NO | Server Daily Board (`daily_boards/{dayId}`) | Answers *"Where do I stand in today's challenge?"* Shows `Today: #R of N` or `Not solved yet`. |
| **Points Today** | **YES** | NO | Current Day Solver Record (`daily_results`) | Today's earned delta (+20, +40, etc.). |
| **Percentile (Today)** | **YES** | NO | Current Day Solver Record (`daily_results`) | Top X% among today's ranked solvers (minimum 10 solvers). |
| **vs Yesterday Points Delta** | **YES** | NO | Finalized Daily Result (`daily_results`) | Comparison against yesterday's final score (+pts or -pts). |
| **Yesterday's Result Summary** | **YES** | NO | Finalized Summary (`daily_summaries/{day-1}_{uid}`) | Read-only breakdown of yesterday's verdict, rank, points, and improvement hint. |
| **Practice Modules Track Progress** | **YES** | NO | Practice Service (`/practice/modules`) | Direct CTA to C Syllabus Practice Modules track (self-paced mastery). |
| **Current Streak & Freeze Status** | **YES** | **YES** | Student Stats Summary (`users/{uid}.stats`) | Shared metric: Home displays current streak with active freeze badge (`1 Auto Freeze / 7 Days`); Profile displays streak within long-term achievements. |
| **Total Score (Cumulative Points)** | **REMOVED** | **YES** | Student Stats Summary (`users/{uid}.stats`) | Belongs exclusively to long-term record. |
| **Problems Solved (Total Count)** | **REMOVED** | **YES** | Student Stats Summary (`users/{uid}.stats`) | Belongs exclusively to long-term record. |
| **Solved by Difficulty (Easy/Med/Hard)** | **REMOVED** | **YES** | Unique Solved Aggregation (`users/{uid}.stats`) | Lifelong difficulty mastery profile belongs on Profile. |
| **Accuracy Rate (%)** | **REMOVED** | **YES** | Accepted / Total Submissions (`users/{uid}.stats`) | Displays `X%` or `—` when no submissions recorded. |
| **Best Daily Rank** | NO | **YES** | Historical Boards (`daily_results`) | Personal record for highest rank achieved across all daily challenges. |
| **Streak Heatmap (Last 90 Days)** | **REMOVED** | **YES** | Daily Results Ledger (90-day window) | Visual calendar of streak consistency (solved, missed, freeze used, paused). |
| **Daily Rank Trend Line (Last 30 Days)** | NO | **YES** | Daily Boards Snapshot (30-day window) | Longitudinal performance trajectory chart. |
| **Recent Submissions & Code Modal** | **REMOVED** | **YES** | User Submissions (`submissions/{id}`) | Student can review their own submitted C code. Never leaks problem statements or hidden test cases. |
| **Academic Details & Masked PRN** | NO | **YES** | User Document (`users/{uid}`) | College, Department, Year, Division, Bio, 30-day PRN change gate. |
| **Account Actions (Export, Delete)** | NO | **YES** | Data Portability Endpoints (`/users/me/*`) | Self-service data export and permanent deletion. |

---

## 3. Data Flow & Consistency Invariant

To guarantee that any metric appearing on both pages (specifically **Current Streak** and **Streak Freeze Status**) never flickers or differs:

1. **Single Source of Truth:**
   - Both `/users/dashboard/stats` and `/users/profile/:username` read from the authoritative user summary record updated transactionally by the Daily Finalization Service.
   - `stats.currentStreak`: Integer count of consecutive challenge days solved or frozen.
   - `stats.longestStreak`: Integer personal best.
   - `stats.streakFreezeStatus`: Formatted status string (`"1 Auto Freeze / 7 Days active"` or `"Used on YYYY-MM-DD"`).

2. **Zero Client Discrepancy:**
   - React Query query keys `['dashboard-stats']` and `['profile', targetIdentifier]` consume normalized properties. Invalidation on solve or profile update refreshes both caches seamlessly.

---

## 4. UI Audit Verification

- **Dashboard (Home):**
  - Contains strictly the 5 "what to do today" components:
    1. Featured Daily Challenge Card (or paused neutral state) with countdown clock to 17:00 IST.
    2. Today's Standings grid (Daily Rank, Points Today, Percentile, vs Yesterday).
    3. Yesterday's Result card (read-only finalization details with improvement hint).
    4. Current Streak & Freeze status badge.
    5. Practice Modules track navigation card.
  - Cumulative metrics, difficulty progress bars, heatmap, and recent submission table are entirely removed.

- **Profile:**
  - Displays avatar, academic tags, masked PRN (`••••••••1039` for owner), and bio.
  - Metrics row: Total Score, Current Streak, Longest Streak, Problems Solved.
  - Best Daily Rank card and Accuracy Rate card (`—` if 0 submissions).
  - Solved by Difficulty breakdown cards (Easy, Medium, Hard).
  - 90-Day Challenge Streak Heatmap (solved, missed, freeze used, pause days).
  - 30-Day Daily Rank Trend line chart.
  - Full Recent Submissions table with "View Code" modal.
  - Profile settings, 30-day PRN change modal, data export, and account deletion.
