# LogicQ Admin & Checker Technical Design (`/docs/ADMIN_DESIGN.md`)

> **STATUS**: `AMENDED & CONSOLIDATED — STRICT 3-ROLE SYSTEM`  
> Authoritative specification for **admin**, **checker**, and **student** roles. Consolidates and supersedes all earlier admin role definitions.

---

## 1. Information Architecture & Navigation

The platform provides two isolated operations zones: the full **Admin Portal** (`/admin/*`) and the restricted, blind **Checker Portal** (`/checker/*`).

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Logo Mark] LOGICQ OPS  | Role: [ADMIN / CHECKER] | User: admin@sanjivani.edu  │
├─────────────────┬───────────────────────────────────────────────────────────────────────┤
│ ADMIN SIDEBAR   │ ADMIN VIEWPORT (/admin/*)                                             │
│                 │                                                                       │
│ 1. Overview     │ 1. /admin/overview   -> Today's stats, queue age, single-admin alert  │
│ 2. Challenges   │ 2. /admin/challenges -> Book bank, 1-pass/2-fail gate, calendar       │
│ 3. Submissions  │ 3. /admin/submissions-> Code logs, hidden tests, rejudge with reason  │
│ 4. Uploads      │ 4. /admin/uploads    -> Full uploads list, admin overrides, re-checks │
│ 5. Checkers     │ 5. /admin/checkers   -> Add/pause checkers, workload, round-robin togg│
│ 6. Students     │ 6. /admin/students   -> Masked PRN, audited unmask, ban, identity edit│
│ 7. Weekly       │ 7. /admin/weekly     -> Live rankings, freeze, pause days, top-3 gate │
│ 8. Reports      │ 8. /admin/reports    -> 14-day metrics, heatmaps, audited CSV exports │
│ 9. Support      │ 9. /admin/support    -> Student issue triage and internal notes       │
│ 10. System      │ 10. /admin/system    -> Judge health, cron logs, quota vs budget      │
│ 11. Audit Log   │ 11. /admin/audit-log -> Immutable ledger of every admin/checker action│
│ 12. Settings    │ 12. /admin/settings  -> Points, rubrics, 48h deadline, announcements  │
├─────────────────┼───────────────────────────────────────────────────────────────────────┤
│ CHECKER VIEWPORT│ /checker/reviews     -> "My reviews" ONLY (Blind review, assigned queue│
│ (No admin menu) │                         image/PDF zoom, rubric marks, conflict blocked)│
└─────────────────┴───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Roles & Permissions Table (Server-Enforced)

Roles are stored as server-set custom claims in Firebase Authentication and validated in API middleware and Firestore security rules.

### 2.1 The Exactly 3 Roles
1. **`admin`**: Full access to all 12 admin pages, APIs, and functions (challenges, schedule, submissions, students, weekly, reports, support, system, audit log, settings, managing checkers and other admins).
2. **`checker`**: Can **only** use the `/checker/reviews` ("My reviews") page. Zero access to any other admin page, API, student profile, code submission, hidden tests, or settings.
3. **`student`**: Student portal only.

*Note: The codebase preserves an extensible `ROLES_REGISTRY` table so future roles can be added without architectural rewrites.*

### 2.2 Permissions Matrix

| Capability / Resource | `admin` | `checker` | `student` |
| :--- | :---: | :---: | :---: |
| **Admin Overview & Alerts** | Full | Denied (403) | Denied (403) |
| **Challenges Bank & 30-Day Calendar** | Full | Denied (403) | Denied (403) |
| **Code Submissions & Hidden Tests** | Full | Denied (403) | Own Only (no hidden) |
| **All Uploads & Admin Overrides** | Full | Denied (403) | Own Uploads Only |
| **Checker Management (`/admin/checkers`)** | Full | Denied (403) | Denied (403) |
| **"My reviews" Queue (`/checker/reviews`)** | Read/Supervise | Assigned Only | Denied (403) |
| **Blind Review (No Student PII)** | Can view PII | Blind (ID only) | N/A |
| **Formula-Based Rubric Grading** | Configure | Enter Marks | N/A |
| **Students Directory & PRN Unmasking** | Full (Audited) | Denied (403) | Denied (403) |
| **Weekly Freeze, Job Re-Run, Pause Days**| Full | Denied (403) | Denied (403) |
| **Reports & Audited CSV Exports** | Full | Denied (403) | Denied (403) |
| **System Health & Blaze Quotas** | Full | Denied (403) | Denied (403) |
| **Append-Only Audit Log Access** | Full | Denied (403) | Denied (403) |
| **Change User Roles / Add Admins** | Yes (Re-auth) | Denied (403) | Denied (403) |
| **Remove Own Admin Role** | **Blocked** | Denied (403) | Denied (403) |
| **Access Student Google Drive Files** | **NEVER** | **NEVER** | Self Only |

---

## 3. Checker Features ("My reviews")

1. **Queue Architecture**:
   - Displays only uploads assigned to this checker, sorted **oldest first**.
   - Mobile-first layout (responsive down to 360px viewport).
2. **Blind Review Guarantee**:
   - Checkers **never see** the student's name, PRN, email, department, year, division, or avatar.
   - Identified strictly by a generic `Submission #SUB-XXXX` token.
3. **Artifacts Rendered for Checker**:
   - Image pan/zoom viewer and sandboxed/rasterized PDF viewer.
   - Challenge title and problem statement for that challenge day.
   - Configured rubric breakdown.
   - Admin guidance note for that challenge (if configured).
   - Student's handwritten approach note ($\le 1000$ chars).
   - Reference solution is **hidden by default** (only visible if admin toggles "Show reference solution to checkers" for that challenge).
4. **Formula-Driven Decision Model**:
   - Actions: `Approve`, `Reject`, `Request Changes` (each requires a comment).
   - For `Approve`: Checker enters marks across rubric items:
     - Default rubric: **Correct Logic (50%)**, **Flowchart / Explanation (30%)**, **Clarity & Code Structure (20%)**.
     - System calculates final points via formula: $\text{Points} = \text{BasePoints} \times \sum (\text{ItemMark} \times \text{Weight})$. Checkers cannot freely type arbitrary points.
5. **30-Minute Edit Window**:
   - A checker can edit their decision within 30 minutes of submission, provided an admin has not finalized/overridden it.
   - Every version is permanently archived in the append-only audit trail.
6. **Conflict of Interest Rule**:
   - If a checker also has a student account, their own uploaded solutions (or any challenge they are barred from) are **strictly barred** from their queue (enforced in assignment logic and Firestore rules).
7. **Keyboard Shortcuts**:
   - `Shift + A`: Approve modal.
   - `Shift + R`: Reject modal.
   - `Shift + N`: Load next assigned review.

---

## 4. Assignment, Deadlines & Admin Controls

1. **Assignment Engine**:
   - **Manual Assignment**: Admin assigns individual uploads to specific active checkers.
   - **Auto Round-Robin**: Automatically distributes new incoming uploads evenly across active, non-paused checkers.
2. **Checkers Directory (`/admin/checkers`)**:
   - Add checker by verified email (requires admin step-up re-auth).
   - Activate / Pause status toggle (paused checkers receive zero new uploads).
   - Real-time telemetry: Active workload queue size, average review turnaround time, and historical decision count.
3. **48-Hour SLA & Reassignment**:
   - If an upload remains unreviewed for $> 48$ hours, it automatically returns to the unassigned pool, triggers an alert on `/admin/overview`, and is reassigned to the next available checker.
4. **Optional Top-3 Second Checker Gate**:
   - Configuration flag `REQUIRE_SECOND_CHECKER_TOP3` (default: false). When true, any upload submitted by a student currently in the top 3 weekly ranks requires dual-checker approval before points are finalized.
5. **Admin Override & Student Re-Check**:
   - Admins can override any checker decision with a mandatory reason.
   - Students can request a "Re-check"; re-checks flow directly to the admin queue.
   - All overrides and re-checks create new immutable records without altering historical entries.
   - Points are credited using original `submittedAt`; post-freeze approvals generate `WeeklyCorrection` ledger events.

---

## 5. Security & Privacy Hardening

1. **Authentication & Session Timeouts**:
   - Google sign-in with college email domain verification (`@sanjivani.org.in`).
   - Mandatory Multi-Factor Authentication (MFA).
   - Idle timeouts: **Admin: 30 minutes**, **Checker: 8 hours** (configurable in Settings).
2. **Signed File URLs & Sandboxing**:
   - Solution files rendered via short-lived signed URLs (15-minute expiry). Bulk downloading is disabled.
   - Images rendered via standard `<img>` without execution contexts. PDFs rendered in sandboxed iframes or rasterized canvases.
3. **Minimum 2 Admins Invariant**:
   - System requires at least 2 active `admin` accounts. If count drops to 1, `/admin/overview` displays a persistent high-priority alert, and self-demotion or admin deletion is blocked.
4. **Privacy Notice Alignment**:
   - Student Privacy Policy updated to explicitly inform students that assigned institutional checkers evaluate uploads under strict anonymity (blind review) and that all file views are audit-logged.
