# SegFault Reference Platform Analysis

**Reference Application URL:** [https://segfault-1304.web.app/](https://segfault-1304.web.app/)  
**Analyzed by:** Senior Full-Stack Engineering Team for the **LogicQ** Platform  
**Analysis Date:** October 2026  
**Artifacts & Evidence:** Screenshots collected under `/docs/screenshots/reference/` and AST/bundle extraction from `https://segfault-1304.web.app/`.

---

## 1. Executive Summary

SegFault is a web-based competitive C programming platform branded with the tagline *"Survive the Pointer — Daily C Challenge & Competitive Arena"*. It is built as a single-page application (React, Vite, Tailwind CSS, Lucide icons, Firebase/Firestore backend) with a dark crimson aesthetic (`#0D0406` background, `#C8102E` accent, `#240A10` containers, Sora and JetBrains Mono typography).

The platform engages students in solving one C challenge every day, competing on daily, weekly, and all-time leaderboards, maintaining streaks, unlocking mastery rank tiers, and participating in timed arena contests.

This analysis deconstructs all visible and client-bundle workflows, data models, and feature flows to guide the original design and architecture of **LogicQ**.

---

## 2. Information Architecture & Routing

From live browser testing and client route bundle decomposition, the application structures its routes into three tiers:

### 2.1 Public Routes
| Route | Purpose | Key UI Elements |
|---|---|---|
| `/` or `/landing` | Marketing & Hero landing page | Dynamic hero section, quick GCC sandbox demo, mastery ranks ladder, campus arena overview, how-it-works stepper, CTAs to Register/Login. |
| `/login` | Student Authentication | Email/password form, "Keep me logged in", link to password reset, link to registration, link to Faculty Portal. |
| `/register` | Student Registration | Full name, username, email, institution/college, password, confirmation, terms checkbox. |
| `/forgot-password` | Password Recovery | Email input, reset link trigger. |
| `/staff-login` or `/admin/login` | Faculty & Admin Gateway | Specialized authentication form for faculty and administrators with elevated privileges. |

### 2.2 Student / Challenger Protected Routes (Requires Auth)
| Route | Purpose | Key UI Elements |
|---|---|---|
| `/home` (or `/` when auth) | Student Dashboard | Daily challenge card with countdown timer, streak flame indicator, user rank & points banner, difficulty breakdown (Easy/Medium/Hard), activity calendar/heatmap, recent submissions feed. |
| `/challenge` | Daily Challenge Workspace | Split-pane code workspace: problem description (markdown, tags, constraints, examples), online code editor (C language syntax), run against custom input, submit against hidden/visible test suites, verdict drawer with compile/runtime output. |
| `/archive` | Problem Bank / Challenge Archive | Catalog of past daily challenges, searchable by title/topic, filterable by difficulty and completion status. |
| `/leaderboard` | Competitive Leaderboards | Multi-tab leaderboards (Daily, Weekly, All-Time), rank standings, user avatar/handle, college affiliation, current streak, total score. |
| `/history` | Submission Ledger | Tabular list of student's past submissions, timestamp, problem title, verdict badges (`AC`, `WA`, `TLE`, `RE`, `CE`), runtime, and full code viewer modal. |
| `/achievements` | Badges & Honors Grid | Mastery achievements (Streak milestones, solve counts, speed solves, contest finishes), progress indicators, unlock timestamps. |
| `/profile` & `/profile/:username` | User Profile & Portfolio | Public/private profile, avatar, bio, total points, global rank, streak stats, solved breakdown chart, activity heatmap, badge showcase. |

### 2.3 Faculty & Administrator Protected Routes (Requires Admin Role)
| Route | Purpose | Key UI Elements |
|---|---|---|
| `/admin` | Admin Overview | Platform health metrics: total registered students, active daily solvers, total submissions, overall acceptance rate %. |
| `/admin/questions` | Problem Management | Listing of all questions with status (`draft`, `published`), search, filter by category/difficulty. |
| `/admin/questions/create` | Question Authoring | Title, category, difficulty, duration hours, base points, markdown problem statement, starter C code, test cases manager (input, expected output, hidden toggle, memory limit, time limit). |
| `/admin/questions/:id` | Question Editor | Full editor to modify problem statements and update test suites. |
| `/admin/submissions` | Global Submission Monitor | Live stream of submissions across all students with verdict filters, student lookup, source code inspect, and re-judge action. |
| `/admin/users` | Student Management | User roster with search, ban/unban toggles, role assignment (`STUDENT`, `ADMIN`), solved count, points. |
| `/admin/analytics` | Analytical Trends | Charts displaying daily submission volume, pass vs. fail ratios, problem drop-off rates. |
| `/admin/settings` | System Configuration | Daily rotation scheduler, timezone settings (IST default), platform banner controls. |

---

## 3. Detailed Feature Workflows

### 3.1 Daily Challenge Flow
1. **Reset & Availability**: New challenge goes live every day at 00:00 IST (Indian Standard Time). A countdown clock displays time remaining until the next challenge drops.
2. **Problem View**: Problem is rendered with rich markdown typography:
   - Title, difficulty pill (Easy/Medium/Hard), tags (e.g., `#Pointers`, `#Bitwise`, `#DynamicMemory`).
   - Problem narrative with clear input specification and output format.
   - Example 1 and Example 2 with input, expected output, and explanation.
   - Constraints section (e.g., `0 <= N <= 10^5`, memory limit: 64MB, time limit: 1.0s).
3. **Editor & Execution**:
   - Pre-populated starter C code template with necessary standard library imports (`#include <stdio.h>`, etc.).
   - "Run Code" executes against user-supplied standard input (stdin) or sample test cases.
   - "Submit Solution" runs the code against the full evaluation suite containing visible and hidden test cases.
4. **Verdicts**:
   - `AC` (Accepted): All test cases passed within limits.
   - `WA` (Wrong Answer): Standard output did not match expected output.
   - `TLE` (Time Limit Exceeded): Execution exceeded allowed runtime (e.g., > 1000ms).
   - `RE` (Runtime Error): Non-zero exit code, segmentation fault (`SIGSEGV`), bus error, or abort.
   - `CE` (Compilation Error): `gcc` failed to compile; the compiler error log is displayed in the output drawer.

### 3.2 Scoring & Streak Mechanics
- **Difficulty Base Points**:
  - Easy: 10 - 15 points
  - Medium: 20 - 30 points
  - Hard: 40 - 50 points
- **Streak Bonus**:
  - Solving the daily challenge on its active calendar day increments the user's `current_streak` by 1.
  - If a consecutive calendar day passes without solving the daily challenge, `current_streak` resets to 0.
  - Multipliers or bonus points are awarded for milestone streaks (e.g., 7-day, 14-day, 30-day).
- **First Solve Bonus**: Bonus points awarded for solving a challenge on the first submission without failed attempts.

### 3.3 Competitive Arena / Contest Flow
- Scheduled contest events with predefined start and end times.
- Contest problems remain locked/hidden until the exact contest start timestamp.
- Live scoreboard ranking players by total points, then breaking ties using ICPC penalty time (minutes from contest start to accepted submission + 20 penalty minutes per failed attempt prior to AC).
- Countdown clock to contest start and contest end.

### 3.4 Leaderboard System
- **Daily Leaderboard**: Ranked by points earned and challenges completed today.
- **Weekly Leaderboard**: Resets weekly to give new users an equal opportunity to compete.
- **All-Time / Global Leaderboard**: Cumulative points, total problems solved, current active streak, and college/department affiliation.

### 3.5 Badges & Achievements System
- **Milestone Badges**:
  - *First Blood*: Submit your first accepted solution.
  - *Week Warrior (7-Day Streak)*: Maintain an unbroken 7-day daily streak.
  - *Monthly Master (30-Day Streak)*: Complete 30 consecutive daily challenges.
  - *Centurion*: Solve 100 challenges.
  - *Pointer Virtuoso*: Solve 10 Hard-level memory/pointer challenges.
  - *Arena Finisher*: Participate in and complete a timed arena contest.

### 3.6 Admin & Faculty Management
- Role-based authorization protecting administrative endpoints.
- Ability to author new challenges with custom test cases (stdin, stdout, hidden boolean).
- Ability to set scheduled release dates for future daily challenges.
- Ability to ban abusive accounts or reset invalid submissions.
- Live submission re-judging tool in case a problem test case is corrected.

---

## 4. Strengths, Observations & LogicQ Enhancements

| Area | SegFault Reference Observation | LogicQ Implementation Plan |
|---|---|---|
| **Architecture** | Built on Firebase client-side SDK directly querying Firestore; test evaluation via client/cloud function. | Enterprise-grade decoupled architecture: React + Vite frontend, Express + TypeScript backend, PostgreSQL + Prisma ORM, BullMQ queue, and pluggable Judge interface. |
| **Security** | Direct client database calls in Firebase can expose test case details or logic if security rules have flaws. | Zero leakage: Hidden test cases exist solely in backend database and judge sandbox. Submissions run in isolated processes with strict resource limits, time limits, memory limits, and file size limits. |
| **Compiler & Judge** | GCC compiler execution. | Pluggable `Judge` interface supporting `LocalGccJudge`, `Judge0Judge`, and `DockerJudge`. |
| **Realtime** | Firestore listeners. | Native WebSockets via Socket.IO for live contest scoreboards and instant submission status updates. |
| **Aesthetic** | Crimson/dark red theme (`#C8102E`). | Original **LogicQ** dark terminal aesthetic: deep obsidian/slate (`#0B0F17`, `#050811`), electric neon cyan/emerald accent (`#00F2FE` / `#10B981` / `#6366F1`), sleek glow effects, custom SVG logo with cursor terminal Q motif. |

---

## 5. Reference Screenshots Catalog

Screenshots captured from `https://segfault-1304.web.app/`:
- `01_landing_page.png`: Full landing page, hero section, interactive sandbox, and ranks.
- `route_login.png`: Authentication view.
- `route_register.png`: Registration form and input fields.
- `route_challenge.png`: Unauthenticated redirect protection.
- `route_leaderboard.png`: Protected leaderboard routing.
- `route_admin.png`: Admin gatekeeper screen.

All reference screenshots are archived in `/docs/screenshots/reference/`. Original LogicQ screenshots will be maintained in `/docs/screenshots/logicq/`.
