# LogicQ MVP Scope, Phased Release Plan & Milestone Roadmap

## 1. Release Philosophy & Milestone Staging

To guarantee rock-solid stability, safety, and rapid deployment, LogicQ follows a disciplined three-stage release plan. **Release 1 (MVP) must be deployed, end-to-end verified, and hardened before Release 2 features are introduced.**

```
+-----------------------------------------------------------------------------------------+
|                               LOGICQ RELEASE MILESTONES                                 |
|                                                                                         |
|  RELEASE 1 (MVP)         --->  RELEASE 2                  --->  RELEASE 3               |
|  "Core Daily Playground"       "Competitive Arena"              "Enterprise & Analytics"|
|                                                                                         |
|  - Auth & RBAC (Student/Admin) - Timed Contests (Arena)         - Platform Analytics &  |
|  - Daily Featured C Challenge  - Live WebSocket Scoreboard        Submission Heatmaps   |
|  - Monaco Web IDE              - Achievement Badges             - AST Code Similarity & |
|  - Linux Docker / Safe Judge   - Streak Bonus XP Mechanics        Plagiarism Queue      |
|  - Custom Input Sandbox        - Multi-College Filters          - Pluggable Instructor  |
|  - Submission History & Diffs  - Contest Participant Management   Role & Class Sections |
|  - Global XP Leaderboard       - Rejudge Worker Queue           - Exportable CSV Grades |
|  - Admin Problem CRUD + Gate                                                            |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Release Breakdown & Feature Matrix

### Release 1: The Core Daily Playground (Target: Immediate MVP)
*Objective*: Deliver a zero-flaw, fully functional daily C coding platform for students and instructors.

| Feature Area | Included Functionality | Verification Criteria |
| :--- | :--- | :--- |
| **Authentication & Access** | JWT Auth (Access + Refresh in httpOnly cookies), Bcrypt hashing, Email signup (Open or Domain-restricted), Password reset, Admin seed with env variables. | All unit tests pass; admin bootstrapped; student accounts register safely. |
| **Daily C Challenges** | One featured problem per calendar day (IST); 16 curated catalog problems; full problem statements in Markdown; formal input/output constraints. | Daily problem switches automatically at 00:00 IST. |
| **Monaco Code Editor** | C syntax highlighting, starter code templates, indentation helpers, keyboard shortcuts (`Ctrl+Enter` to run). | Editor loads cleanly; responsive tab views on mobile devices. |
| **Pluggable Safe Judge** | Sandboxed execution (`LocalGcc` in dev, `Docker`/`Judge0` in prod); memory limit (64MB); time limit (2000ms); process cap (32 PIDs); fail-closed security. | Intercepts infinite loops, fork bombs, memory hogs, and file reads. |
| **Custom Input Sandbox** | "Run Code" executes against student's arbitrary test input without recording official score or consuming cooldown. | Custom stdout and stderr returned in real-time. |
| **Submission Engine** | "Submit Code" tests against visible and hidden test suites; calculates verdict per test; records runtime and memory usage. | Verifies all test cases; hidden test cases never leaked to client. |
| **Submission History** | Chronological log of student's past submissions, verdicts, timestamps, runtime, and full source code review modal. | Historical submissions persist and display syntax-highlighted code. |
| **Global Leaderboard** | Real-time global ranking based on problems solved, solve speed, and total community XP. Excludes admin accounts. | Correct ordering; clean empty state when zero solves exist. |
| **Admin Problem Management**| Problem creation/editing; visible & hidden test cases; automated "Validate Problem" gate testing reference solution. | Only validated problems can be published or scheduled. |

---

### Release 2: The Competitive Arena (Post-MVP Milestone)
*Objective*: Enable real-time multiplayer tournaments, timed hackathons, and gamified achievement loops.

| Feature Area | Included Functionality |
| :--- | :--- |
| **Timed Arena Contests** | Scheduled rounds with synchronized start and end times; contest problem sets hidden until launch. |
| **Live WebSocket Scoreboard** | Real-time score updates streamed via Socket.IO; ICPC penalty time calculation ($T_{\text{solve}} + 20 \times \text{attempts}$). |
| **Achievement Badges** | 6 master badges awarded automatically upon trigger conditions (First Blood, 3-Day Streak, 7-Day Streak, 10 Solved, Hard Solver, Contest Finisher). |
| **Streak Multipliers** | Consecutive daily streak tracking; active-day solve bonuses; streak preservation mechanics. |
| **College & Batch Tabs** | Leaderboard filters separating university departments and graduation years. |
| **Bulk Rejudge Pipeline** | Admin utility to rejudge all submissions for a problem following test case adjustments. |

---

### Release 3: Intelligence, Analytics & Classroom Tools (Advanced Milestone)
*Objective*: Provide enterprise tools for college professors and anti-cheating analytics.

| Feature Area | Included Functionality |
| :--- | :--- |
| **Code Similarity Engine** | AST tokenization and Winnowing n-gram hash comparison across contest submissions. |
| **Admin Review Queue** | Side-by-side Monaco diff inspection for submissions with $\ge 85\%$ token similarity. |
| **Instructor Role** | Dedicated instructor dashboard for managing class rosters and assigning private problem sets. |
| **Classroom Grade Exports**| One-click CSV and JSON exports of student solve rates and contest results. |
| **Deep Platform Analytics** | Submissions per day trends, acceptance rate by topic/tag, memory usage distributions. |

---

## 3. Strict Development Invariant

> **STOP RULE**: Release 2 and Release 3 features will not be coded until Release 1 (MVP) has been completely verified via automated test suites, security checks, and client-side testing. All milestones require explicit review before advancing.
