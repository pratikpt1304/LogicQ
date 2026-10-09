# LogicQ Master Engineering Specification & Unified Blueprint

> **STATUS**: THE SINGLE SOURCE OF TRUTH FOR LOGICQ  
> This specification consolidates the original architecture requirements, the branding/visual guidelines, and the deployment, judge safety, and governance decisions. All previous prompt directives are superseded by this document where conflicts exist.

---

## 1. Conflict Resolution Log & Authoritative Decisions

| Dimension | Initial Build Prompt | Subsequent Directives | Final Resolved Decision (Master Spec) |
| :--- | :--- | :--- | :--- |
| **1. Background & Theme** | Deep near-black dark developer theme | "use white in bg" | **Crisp White Theme (`#FFFFFF`)** with clean bordered cards as default; dark mode toggle supported. |
| **2. Demo Content vs Launch** | Seed sample users, fake submissions, demo contest | "Clean and reset the entire website for real launch" | **Zero Fake Data Policy**. All test users/submissions purged. 16 curated master C problems and 6 badges preserved. |
| **3. Judge Security in Prod** | Local GCC judge used throughout | Strict threat model & fail-closed security | **Fail-Closed Sandbox**. `LocalGccJudge` strictly disabled in `NODE_ENV=production`. Requires `DockerJudge` or `Judge0`. |
| **4. Admin Bootstrapping** | Seeded with static credentials in code | Secure credentials without hardcoded defaults | **Environment Injection Only**. Admin created via `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars. Zero static passwords in source code. |
| **5. Signup Policy** | Open email registration | Campus restriction vs open signup options | **Configurable `AUTH_MODE`**. Supports `OPEN` (any email), `DOMAIN_RESTRICTED` (campus whitelist), and `INVITE_ONLY`. |
| **6. Scoring Economy** | Single unified point counter | Prevent daily grinding from skewing contests | **Dual-Economy Model**. Daily challenges grant **XP & Streaks**; Arena contests grant **Competitive Rating**. |
| **7. Release Scope** | Build all features simultaneously | Phased staging with stop checkpoints | **Three-Phase Staged Delivery**: Release 1 (MVP) -> Release 2 (Contests & Badges) -> Release 3 (Intelligence & Anti-Cheating). |

---

## 2. Product Identity & Branding

- **Platform Name**: **LogicQ**
- **Tagline**: *"Think in logic. Code in C."*
- **Visual Identity**: Modern technical minimalism. Sharp SVG logo featuring an interconnected terminal prompt arrow and monogram `Q`. High-contrast typography (Inter / JetBrains Mono).
- **Core Aesthetic**: Clean light workspace (`#FFFFFF` background, subtle borders, crisp code syntax highlighting), accessible contrast, responsive split-pane Monaco IDE.

---

## 3. Technology Stack Architecture

```
+-----------------------------------------------------------------------------------------+
|                                LOGICQ FULL-STACK TOPOLOGY                               |
|                                                                                         |
|  [ Frontend Client: React 18 + Vite + TypeScript + Tailwind CSS + Monaco Editor ]       |
|                                     |                                                   |
|                        REST API & WebSockets (Socket.IO)                                |
|                                     v                                                   |
|  [ Backend API: Node.js 20 + Express + TypeScript + Zod Validation + Helmet/CORS ]      |
|                                     |                                                   |
|         +---------------------------+---------------------------+                       |
|         |                           |                           |                       |
|         v                           v                           v                       |
|  [ PostgreSQL / SQLite ]     [ Redis / In-Memory Queue ]   [ C Judge Engine ]           |
|    Prisma ORM                  BullMQ Worker Pool           Docker / Judge0 / Local GCC |
+-----------------------------------------------------------------------------------------+
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide Icons, React Router v6, TanStack Query.
- **Backend**: Node.js 20 LTS, Express, TypeScript, Zod request schema validation, Helmet security headers, CORS cookie policies.
- **Data Persistence**: Prisma ORM with PostgreSQL 16 (production) or SQLite (`dev.db` for zero-setup local dev).
- **Task Queue**: BullMQ backed by Redis (or in-process graceful fallback).
- **Real-Time Communication**: Socket.IO for submission status streams and live contest leaderboards.

---

## 4. Sandboxed C Execution Engine (`IJudge`)

### Compilation Standard
```bash
gcc -O2 -std=c17 -Wall -Wextra -Werror=vla -fdiagnostics-color=never -pipe -lm solution.c -o solution
```

### Execution Limits
- **CPU Time Limit**: 2000 ms (Wall-clock watchdog: 2500 ms).
- **Memory Limit**: 64 MB (RSS + Swap combined).
- **Process Limit**: Max 32 PIDs (fork bomb mitigation).
- **Output Limit**: 64 KB stdout/stderr buffer truncation.
- **Filesystem**: Read-only root mount; ephemeral unprivileged `tmpfs`.
- **Networking**: Disabled (`--network none`).

### Supported Judge Implementations
1. `DockerJudge`: Runs untrusted binary inside isolated Linux container with cgroups and seccomp filters (Primary Production).
2. `Judge0Judge`: Submits code to external Judge0 CE / enterprise instance via REST API (Production Alternative).
3. `LocalGccJudge`: Local development runner for Windows/Linux. **Forbidden in production.**
4. `FailClosedJudge`: Default fallback when no safe judge is verified. Emits `JUDGE_UNAVAILABLE`.

---

## 5. Problem Quality & Validation Pipeline

### Required Problem Specifications
- Title, Slug, Markdown Statement, Input Format, Output Format, Constraints ($N, \text{values}$).
- $\ge 2$ Visible Samples with Markdown derivations.
- $\ge 5$ Hidden Test Cases covering minimum, maximum, integer boundary, pointer/string edge, and adversarial sequences.
- 1 Canonical Reference Solution in C (`reference_solution.c`).
- 2 Negative Control Solutions (`wrong_solution_1.c`, `wrong_solution_2.c`).

### Lifecycle State Machine
$$\text{Draft} \xrightarrow{\text{Automated Gate: Ref=AC, Neg=Fail}} \text{Validated} \xrightarrow{\text{Schedule/Publish}} \text{Published} \xrightarrow{\text{Deprecate}} \text{Retired}$$

---

## 6. Access Control & Authorization (RBAC)

### Roles & Capabilities
- **`STUDENT`**: Solve daily challenges, run custom inputs, submit code, view history, view post-solve editorials, participate in contests.
- **`INSTRUCTOR`**: All student permissions + problem authoring, test case creation, problem validation gate execution, contest review queue.
- **`ADMIN`**: Platform superuser. User management (bans/roles), system configuration, daily challenge scheduler, analytics.

### Authentication & Sessions
- Access Token (JWT, 15-minute expiry) in memory / authorization header.
- Refresh Token (JWT, 7-day expiry) stored in `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- Token rotation on every refresh; immediate revocation on password change or account suspension.
- Automated admin bootstrap from `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.

---

## 7. Product Differentiation & Learning Features

1. **C-Specific Runtime Diagnostics**: Translates `SIGSEGV`, `SIGFPE`, and `MLE` into actionable educational guidance rather than cryptic errors.
2. **Tiered Progressive Hints**: 3 structured hint levels (Logic Approach, Edge Case Watch, C Pointer Tip) with opt-in confirmation.
3. **Post-Solve Editorial & C Deep Dive**: Unlocked strictly after achieving Accepted verdict; details asymptotic complexity and safe pointer idioms.
4. **Visual Diff on Sample Cases**: Aligned character-level diff highlighting whitespace and newline divergence for failed visible tests.
5. **Student Problem Issue Reporting**: Immediate feedback modal for reporting ambiguous descriptions or flawed test suites.

---

## 8. Competitive Integrity & Scoring Rules

- **Dual-Economy Separation**:
  - Daily Challenge: Awards **10–30 XP** and increments **Daily Streak**. Active-day solve awards +5 bonus XP.
  - Arena Contests: Awards **Competitive Rating (Elo)** based on ICPC penalty points.
- **Submission Rate Limits**: 10-second cooldown on practice problems; 30-second cooldown in contests.
- **AST Token Similarity**: Submissions exhibiting $\ge 85\%$ token similarity during contests are flagged for manual admin inspection (never auto-banned).

---

## 9. Phased Release Milestone Plan

### Release 1 (MVP) — Current Focus:
- Full Authentication (JWT, Cookies, Open/Domain-restricted, Safe Admin Seed).
- Daily C Challenge (IST calendar synchronization, 16 curated problems).
- Monaco C Web IDE with Custom Input Sandbox and Submit Execution.
- Pluggable Safe C Judge with Fail-Closed Security Policy.
- Detailed Submission History with Code Review Modal.
- Global Student XP Leaderboard with clean empty state.
- Admin Problem Management with Automated Validation Gate.
- Problem Reporting Modal.
- Student Privacy Notice & Self-Service Account Deletion.

### Release 2 (The Arena):
- Timed Contests with countdowns and hidden problem set until start.
- Real-time live scoreboard streamed over WebSockets.
- Gamified Achievement Badges and Streak multiplier mechanics.
- College and graduation year leaderboard filters.

### Release 3 (Enterprise & Classroom):
- AST Tokenization and Code Similarity Review Queue.
- Instructor Role and Course Section Management.
- CSV/JSON Grade and Solve Roster Exports.
- Deep Platform Analytics (submission velocity, tag accuracy).

---

## 10. Operational Guidelines & Verification Invariant

- **Zero Fake Data Invariant**: Production database begins with clean empty states. No dummy mock users or demo scores.
- **Test Before Complete Invariant**: No phase or task is marked complete without running automated test suites (`vitest`, `supertest`) and validating in the real application interface.
