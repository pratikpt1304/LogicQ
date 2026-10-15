# Student-Facing Charts & Visual Analytics Audit

**Document Version:** 1.0.0  
**Status:** Implemented  
**Date:** 2026-10-13  
**Audience:** Frontend Engineers, Product Owners, Academic Evaluators  

---

## 1. Inventory of Charts & Visual Elements Across LogicQ

An audit of the student-facing pages in LogicQ reveals the following inventory of visual charts, progress meters, and graphs:

| Page | Visual Element | Type | Status & Audit Finding |
| :--- | :--- | :--- | :--- |
| **Home (Dashboard)** | Submission Heatmap (90 Days) | 7x12 SVG/HTML Grid | **Migrated to Profile.** In earlier spec it lived on Home; per deduplication directive, Home is strictly *"what to do today"*, so historical heatmap moved to Profile. |
| **Home (Dashboard)** | Difficulty Progress Bars | Horizontal Fill Bars | **Migrated to Profile.** Cumulative Easy/Med/Hard progress bars belong in the long-term transcript on Profile. |
| **Home (Dashboard)** | 17:00 IST Countdown Ring | SVG Circular Clock | **Retained on Home.** Real-time countdown to daily challenge rollover. Hidden/neutralized during daily pause. |
| **Profile** | 90-Day Challenge Streak Heatmap | 7x13 Day Grid Matrix | **Added to Profile.** Visual calendar tracking the last 90 challenge days with 4 distinct states: Solved (green/emerald), Missed (subtle dark), Streak-Freeze Used (cyan/ice-blue), and Admin Paused (amber). |
| **Profile** | 30-Day Daily Rank Trend | SVG Polyline & Area Chart | **Added to Profile.** Longitudinal trajectory showing daily rank across the past 30 days. Inverted Y-axis (#1 at top, #20/unranked at bottom), hover tooltips, and responsive layout. |
| **Profile** | Difficulty Breakdown Badges | Metric Cards | Solved counts for Easy, Medium, and Hard challenges. |
| **Practice** | Module Progress Ring | SVG Circular Meter | Shows `X / 10` solved questions within each curriculum module with unlocked/locked states. |
| **Leaderboard** | Daily Solvers Bar & Percentile | Standings Badges | Ranks #1 through #20+ with medal badges (gold, silver, bronze) and percentile chips. |

---

## 2. Activity Heatmap Audit & Historical Spec Alignment

- **Original Spec Finding:** The original master spec referenced an activity heatmap intended to record low-level C problem-solving cadence. In the prototype, this was rendered on the Home dashboard as raw submission activity.
- **Flaw in Prototype:** The prototype heatmap counted *every submission attempt* (including compilation errors and test failures), rewarding brute force rather than true challenge-day consistency.
- **Specification:**
  1. Relocated exclusively to the **Profile** page under "Challenge Streak Heatmap (Last 90 Days)".
  2. Each cell represents exactly one **Challenge Day** (17:00 IST to 17:00 IST).
  3. Cell color coding:
     - **Solved (Accepted):** Bright emerald (`#10B981` / `bg-emerald-500`) with checkmark indicator or vibrant fill, showing points earned.
     - **Streak Freeze Used:** Cool cyan / ice-blue (`#06B6D4` / `bg-cyan-500`) indicating the automated 7-day freeze protected the student's streak.
     - **Admin Pause Day:** Warm amber / yellow (`#F59E0B` / `bg-amber-500`) indicating official institutional pause (exams, festival break).
     - **Missed Day:** Muted neutral dark tile (`#1F2937` / `bg-dark-800`) with subtle dashed outline.

---

## 3. Daily Rank Trend Line Chart Specification (Last 30 Days)

- **Target Location:** Profile page, adjacent to the 90-Day Streak Heatmap.
- **Chart Type:** Native lightweight SVG line chart with gradient fill and interactive hover nodes (zero third-party bundle bloat).
- **Y-Axis Inversion:**
  - Rank `#1` is displayed at the top of the chart coordinate space.
  - Higher numbers (e.g. Rank `#20`, `#50`) and unranked days are mapped toward the bottom.
- **Data Points:**
  - 30 discrete daily points corresponding to the rolling 30 challenge days.
  - Solved days feature solid circular data points.
  - Hover tooltip displays: `Date`, `Rank: #R`, `Points: +P`, and `Status`.
- **Empty State:**
  - If a student has no ranked solves in the 30-day window, a clear guidance message is rendered: *"No daily rank records yet. Solve today's challenge before 17:00 IST to establish your ranking trend!"*
