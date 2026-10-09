# LogicQ Competitive Fairness, Anti-Cheating & Integrity Policy

## 1. Philosophical Stance & Threat Reality

LogicQ aims to foster genuine algorithmic problem-solving and C software mastery. In online competitive platforms, cheating generally takes three forms:
1. **Collusion**: Sharing source code among peers during active contests.
2. **Automated Submission Flooding**: Brute-forcing tests or DOSing the judge queue.
3. **Generative AI / External LLM Assistance**: Copying problem statements into ChatGPT/Claude and pasting generated C code.

### Honest Disclaimer: What CANNOT Be Prevented
No web-based platform can reliably prevent:
- A user querying an LLM or running code on a second monitor, smartphone, or separate device.
- Students collaborating verbally or via private messaging (WhatsApp, Discord, Telegram).
- Invasive "anti-cheat" browser extensions or webcam surveillance software that infringe on student privacy while being trivially bypassed by virtual machines.

**LogicQ rejects invasive spyware/proctoring.** Instead, we employ **structural, mathematical, and algorithmic integrity controls** that reward genuine effort, rate-limit abuse, flag suspicious similarities for human review, and protect private test suites.

---

## 2. Integrity Measures & Defenses

### 2.1 Code Tokenization & Similarity Detection (Flag, Never Auto-Ban)
* **Mechanism**:
  - Upon submission during contests, source code is normalized through a lightweight C AST tokenization preprocessor:
    1. Strip all single-line (`//`) and multi-line (`/* */`) comments.
    2. Normalize whitespace and newlines.
    3. Rename local variable and parameter identifiers to canonical tokens (`v0`, `v1`, `v2`, etc.).
    4. Compute a Winnowing fingerprint / Jaccard similarity hash across n-gram token sequences.
  - Submissions exhibiting **$\ge 85\%$ token similarity** against another participant in the same contest window are marked `isFlagged: true` in the database.
* **Non-Punitive Invariant**:
  - **Flagged submissions are NEVER automatically banned or disqualified by software.**
  - Automated flags merely push the pair into the **Admin Review Queue**. A human instructor or administrator must inspect the diff and make a final manual judgment.

### 2.2 Submission Rate Limits & Anti-Brute-Force Cooldowns
To prevent contestants from "probing" test cases or overwhelming the execution queue:
- **Per-User Submission Cooldown**:
  - **Daily Challenge / Practice**: Minimum 10-second cooldown between consecutive submissions on the same problem.
  - **Contests**: Minimum 30-second cooldown between submissions.
- **Global API Rate Limits**:
  - `/api/submissions/submit`: 10 requests per minute per IP.
  - `/api/submissions/run` (Custom Input sandbox): 15 requests per minute per IP.
- Violations receive HTTP 429 (`Too Many Requests`) with a friendly countdown timer in the IDE.

### 2.3 Strict Contest-Only Problem Hiding
- Problems assigned to an upcoming contest are stored with `status: 'CONTEST_LOCKED'`.
- The problem slug, description, tags, constraints, and test cases are completely excluded from API responses until `contest.startTime` is reached.
- Querying a contest problem before start time returns `403 Forbidden` (`CONTEST_NOT_STARTED`).
- All hidden test cases remain encrypted/unexposed on the server and are NEVER transmitted to the client application.

### 2.4 Synchronized vs Fixed-Duration Contests
LogicQ supports two contest timing models:
1. **Synchronized Contests (Standard Arena)**:
   - All participants start at $T_{\text{start}}$ and finish at $T_{\text{end}}$ (e.g., Friday 18:00 to 20:00 IST).
   - Real-time live scoreboard streamed over WebSockets.
   - Lowest risk of problem leak because everyone competes simultaneously.
2. **Flexible Window Contests (Campus Homework / Midterms)**:
   - Contest window is open for 24 hours (e.g., 00:00 to 23:59).
   - Once a student clicks "Begin Contest", a personalized 90-minute countdown starts.
   - Live scoreboard is frozen for that user until the total window concludes to prevent information leakage to unstarted peers.

---

## 3. Daily Challenge Scoring Policy: Streak vs Global Rank

A critical design choice is whether the Daily C Challenge should inflate the global competitive rank:

### Decision: Dual-Economy Model
To prevent daily "grinding" or AI copy-pasting from distorting competitive tournament rankings:
1. **Global Competitive Rating (Elo / Arena Points)**:
   - Driven **exclusively by Arena Contest performance** (ICPC / timed rounds).
   - This reflects true competitive problem-solving under pressure.
2. **Student Experience Points (XP) & Streaks**:
   - The **Daily Challenge awards XP (10–30 pts)** and advances the **Consecutive Daily Streak**.
   - Solves on the active calendar day receive a +5 bonus XP.
   - Streaks unlock tiered badges: *Streak Starter (3 days)*, *Week Warrior (7 days)*, *Code Ronin (30 days)*.
   - The Global Leaderboard features two distinct toggle views:
     - **Arena Rating Leaderboard** (True competitive merit).
     - **Community XP & Streaks Leaderboard** (Dedication and practice consistency).

---

## 4. Admin Review Queue Workflow

When code similarity or suspicious behavior is detected:
1. An alert appears on the Admin Dashboard under **"Integrity Flags"**.
2. The Admin viewer displays a side-by-side Monaco Diff of the two candidate submissions, highlighting:
   - Normalized token similarity score.
   - Submission timestamps and IP addresses.
   - Solve time difference.
3. Admin actions available:
   - **Dismiss Flag**: Mark as false positive (common boilerplate logic).
   - **Invalidate Submission**: Nullify points for that specific problem with an explanatory note to the student.
   - **Disqualify from Contest**: Remove student from current contest standings.
   - **Issue Warning**: Send platform notification to user.
