<p align="center">
  <img src="client/public/brand/logo-mark.svg" alt="LogicQ Logo" width="96" height="96" />
</p>

# LogicQ

> **AI-Resistant Smart Programming Practice & Institutional Assessment Platform for Higher Education**  
> *Engineered for Undergraduate Engineering Programs • ISO C11 Sandboxed Compilation • Sanjivani University*

[![Release Status](https://img.shields.io/badge/Release_Status-Production_Live-46D9A0?style=for-the-badge&logo=rocket&logoColor=white)](https://logicq-clanguage.web.app)
[![Live Frontend](https://img.shields.io/badge/Live_Client-logicq--clanguage.web.app-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](https://logicq-clanguage.web.app)
[![Backend API](https://img.shields.io/badge/Render_API-Live_Online-8B9BFF?style=for-the-badge&logo=render&logoColor=white)](https://logicq-bitwiseclub.onrender.com)
[![Firestore Security](https://img.shields.io/badge/Firestore_Rules-47%2F47_Verified-success?style=for-the-badge&logo=firebase&logoColor=white)](docs/SECURITY_RULES.md)
[![Assessment Lifecycle](https://img.shields.io/badge/Assessment_Engine-66%2F66_Spec_Verified-emerald?style=for-the-badge&logo=checkmarx&logoColor=white)](docs/assessment/GAP_ANALYSIS.md)
[![Build Guard](https://img.shields.io/badge/Build_Guard-Zero_Storage_Violations-success?style=for-the-badge&logo=typescript&logoColor=white)](#testing--verification-suites)
[![Security Policy](https://img.shields.io/badge/Security-Deny_by_Default-crimson?style=for-the-badge&logo=shield&logoColor=white)](SECURITY.md)

---

## 📌 Executive Summary

**LogicQ** is a dual-engine competitive programming, curriculum mastery, and institutional continuous assessment platform. Engineered specifically for engineering universities, LogicQ provides a complete, copy-resistant, behaviour-aware ecosystem designed to evaluate genuine student programming competency while insulating foundational learning from high-stakes exam pressure.

LogicQ operates on a strict **Two-Product Architectural Separation**:
1. **📘 Practice Mode (Learning-First Habit & Mastery)**: Unlimited attempts, hint unlocks, compiler guidance, 10-of-10 sequential module gating, 17:00 IST daily challenges, and streak protection.
2. **🛡️ Assessment Mode (AI-Resistant Institutional Examination)**: 100-mark modular assessments, strict 1:1:1 identity binding (PRN + Email OTP + Mobile OTP), section-based roster management, zero-reattempt locks on successful solve, 2 visible + 1 hidden test cases, time-based scoring, silent proctoring telemetry, code-specific AI viva voce verification, individual-activation mini-projects, and dual-score reporting (Academic Score $X/100$ vs Integrity Score $Y/100$).

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Student & Faculty Tier (React 18 + TypeScript + Monaco)"]
        StudentUI["Student Client (/practice, /challenge, /student/tests, /analytics)"]
        FacultyUI["Faculty Dashboard (/faculty/sections, /faculty/tests, /faculty/analytics)"]
        AdminUI["Institutional SuperAdmin Console (/admin)"]
    end

    subgraph FirebaseLayer ["Firebase & Google Cloud Platform"]
        Hosting["Firebase Hosting (CDN Static SPA Assets & Service Worker)"]
        Auth["Firebase Authentication (Google OAuth & University Allowlist)"]
        Firestore["Cloud Firestore (Deny-by-Default Security Rules)"]
        Storage["Cloud Storage (Flowchart Proofs & Visual Audits)"]
    end

    subgraph BackendLayer ["Secure Node.js / Express API Runtime"]
        APIServer["Express REST API (Render.com Docker Container)"]
        PrismaORM["Prisma ORM (SQLite Dev / PostgreSQL Prod)"]
        IdentityService["1:1:1 PRN + Dual OTP Verification Service"]
        ExamEngine["Smart Exam Engine (Time Scoring & Zero-Reattempt Locks)"]
        TelemetryService["Silent Telemetry Collector (Bursts, Evolution, Ratios)"]
        VivaEngine["AI Viva Voce Engine (2nd Successive Solve Trigger)"]
        MiniProjectService["Integrated Mini-Project 20-Mark Rubric Engine"]
        PDFReportEngine["2-Part Printable PDF Audit & ERP CSV Exporter"]
    end

    subgraph JudgeSandbox ["Sandboxed ISO C11 Execution Sandbox"]
        GCCRunner["Local GCC C11 Compiler (-Wall -Wextra -O2 -std=c11)"]
        WinJobSandbox["Windows Job Object Runner (Hard Limits: 2.0s, 128MB, Output Cap)"]
        POSIXRunner["POSIX Fork/Exec Sandbox with Resource Limits"]
    end

    StudentUI -->|HTTPS CDN Assets| Hosting
    FacultyUI -->|HTTPS CDN Assets| Hosting
    AdminUI -->|HTTPS CDN Assets| Hosting

    StudentUI -->|Token Exchange| Auth
    StudentUI -->|Direct Profile & Draft Sync| Firestore
    StudentUI -->|Proctored Submissions & Telemetry| APIServer
    FacultyUI -->|Section Roster & Test Builder| APIServer

    APIServer -->|Database Queries| PrismaORM
    APIServer -->|Enrollment & OTP Binding| IdentityService
    APIServer -->|Compile & Run Requests| GCCRunner
    GCCRunner -->|Isolate Execution| WinJobSandbox
    GCCRunner -->|POSIX Fallback| POSIXRunner
    APIServer -->|Timing & Lock Rules| ExamEngine
    APIServer -->|Behavioral Signals| TelemetryService
    APIServer -->|Trigger 60s Viva| VivaEngine
    APIServer -->|Grade Rubrics| MiniProjectService
    APIServer -->|Generate Official Audits| PDFReportEngine
```

---

## 🌟 The Two Operating Modes

| Feature | 📘 Practice Mode (`/practice`) | 🛡️ Assessment Mode (`/student/tests`) |
| :--- | :--- | :--- |
| **Primary Goal** | Habit formation, conceptual mastery, daily challenge | Formal institutional evaluation, grading, accreditation |
| **Attempts Allowed** | **Unlimited** (encourages trial, error, debugging) | **Zero reattempt** once question is successfully solved |
| **Scoring Model** | Difficulty Points (+10 Easy, +20 Medium, +30 Hard) | **Time-Based Marks** (1.0 in-time, 0.5 late, 0.0 incorrect) |
| **Hints & Guidance** | Unlocks after 6 failed attempts | **Strictly blocked**; zero hints provided |
| **Test Cases** | 2 Visible sample test cases | **2 Visible + 1 Server-Side Hidden Test Case** |
| **Copy/Paste** | Permitted for learning & drafting | **Blocked** where technically feasible; paste events logged |
| **Identity Binding** | Google Sign-in with verified college PRN | **Mandatory 1:1:1 PRN $\leftrightarrow$ Email OTP $\leftrightarrow$ Mobile OTP** |
| **Behavioral Telemetry** | Active focus timer only (anti-idle) | Full telemetry (bursts, edit-to-execution, emergence curve) |
| **AI Viva Voce** | None | **Mandatory 1-minute viva** on every 2nd successive correct solve |
| **Mini-Project** | Optional self-paced projects | **20-Mark Integrated Mini-Project** (individual faculty activation) |
| **Final Output** | LeetCode-style Donut charts, 90-day streak heatmaps | **Dual-Score Report** (Academic $X/100$, Integrity $Y/100$, PDF audit) |

---

## ✨ Key Platform Features & Modules

### 1. 🛡️ Institutional Assessment Framework (Sections 1–7, 59, 65)
- **100-Mark Continuous Assessment Model**:
  - **4 Modular Sections × 20 Questions**: $80 \text{ Marks}$ evaluated via deterministic time-scoring.
  - **1 Integrated Mini-Project**: $20 \text{ Marks}$ assessed across a 4-competency rubric.
- **Time-Based Scoring Formula**:
  $$\text{Expected Reference Time} = \frac{\text{Expected Min} + \text{Expected Max}}{2}$$
  $$\text{Academic Mark} = \begin{cases} 1.0 & \text{if Verdict is ACCEPTED and } \text{Actual Time} \le \text{Expected Max} \\ 0.5 & \text{if Verdict is ACCEPTED and } \text{Actual Time} > \text{Expected Max} \\ 0.0 & \text{if Verdict is not ACCEPTED} \end{cases}$$
- **2 Visible + 1 Hidden Test Case**: Visible test cases provide interactive debugging feedback; the hidden test case executes server-side with zero input/output leakage to ensure genuine algorithmic logic.
- **Section 59 Strict Separation**: Academic Scores ($X/100$) and Integrity Scores ($Y/100$) are **never combined by default**. A student with a 95/100 academic score and a flagged session are represented transparently for faculty review.

### 2. 🔐 Student Account Creation, 1:1:1 Binding & Sections (Sections 8–14)
- **Strict 1:1:1 Identity Uniqueness**: In the database, one PRN belongs to exactly one verified college email and one verified mobile number. Impersonation and account multiplexing are architecturally prevented.
- **Dual OTP Verification**:
  1. Student enters PRN $\rightarrow$ allowlist existence checked.
  2. Student verifies 6-digit Email OTP (10-minute expiry, rate-limited).
  3. Student verifies 6-digit Mobile OTP.
  4. Only upon dual success does account transition to `IDENTITY_BOUND` and `ACTIVE`.
- **Faculty Section Roster Management**:
  - Faculty can create sections (Course, Subject, Academic Year, Semester).
  - Bulk student onboarding via **Excel Import** with full validation preview (valid, invalid, duplicate, and conflicting identity rows). Zero silent row discards.
  - **Instant Student Join Link**: Unique URL with QR code and WhatsApp share support.

### 3. 🧠 Smart Exam Engine & Proctored Telemetry (Sections 19–28, 57–58)
- **Environment & Input Restrictions**: Text selection, context menu right-clicks, copy, paste, and drag-and-drop are restricted within the exam coding workspace.
- **Comprehensive Behavioral Metrics**:
  - **Active Work Ratio**: Genuine interaction time vs total question duration.
  - **Code-Burst Detection**: Monitors instantaneous code insertion size against total submission size ($>\!60\%$ triggers a review indicator).
  - **Edit-to-Execution Ratio**: Number of code edits between compilation runs.
  - **Solution Emergence Curve**: Incremental code progression over time ($2 \text{ min} \to 15\%, 4 \text{ min} \to 35\%, \dots, 8 \text{ min} \to 100\%$).
- **5-Tier Calibrated Integrity Risk Classification**:
  $$\text{Normal (0–20)} \quad\vert\quad \text{Low Risk (21–40)} \quad\vert\quad \text{Moderate Risk (41–60)} \quad\vert\quad \text{High Risk (61–80)} \quad\vert\quad \text{Critical Risk (81–100)}$$
  *Proctoring signals serve strictly as review indicators for human faculty review; automated academic penalties are prohibited.*

### 4. 🎙️ AI Viva Voce Engine (Sections 29–33)
- **Deterministic 2nd Successive Solve Trigger**: When a student solves two questions correctly in a row (#2, #4, #6, ...), the AI Viva Voce modal immediately interrupts the workflow.
- **Code-Specific Oral/Written Prompts**: Questions are generated dynamically from the student's *actual submitted code* (probing specific variable choices, pointer arithmetic, loop bounds, and edge-case handling).
- **Strict 60-Second Timer**: Countdown timer with mandatory submission or timeout logging.
- **Faculty Review & Human Override**: Course faculty can review the recorded viva response alongside the student's source code and override the assessment status.

### 5. 🧩 Integrated Mini-Project Framework (Sections 35–39, 64)
- **20-Mark Structured Rubric**:
  - Section 1 Competency (Control Structures): 5 Marks
  - Section 2 Competency (Pointers & Functions): 5 Marks
  - Section 3 Competency (Arrays & Data Structures): 5 Marks
  - Section 4 Competency (Dynamic Memory & Structs): 5 Marks
- **Strict Anti-Bulk Activation Rule**: Mini-projects are initially `INACTIVE`. Bulk activation ("Select All", batch scripts) is strictly banned. Faculty must inspect each student's eligibility and activate on an individual student-by-student basis.

### 6. 📊 Institutional Reporting, PDF Audits & ERP Export (Sections 45–55)
- **Student Dual-Score Analytics (`/analytics`)**:
  - High-contrast WCAG AAA cards showing Layer A Academic Score and Layer B Integrity Score.
  - Difficulty Mastery bars (Easy/Medium/Hard breakdown).
  - Timing deviation indicators and AI Learning Gap alerts.
- **Official 2-Part Printable PDF Audit Report**:
  - **Part A (Submitted Solutions)**: Question statements, submitted code, verdict, timestamps, and marks.
  - **Part B (Integrity Audit Trail)**: Keystroke aggregates, clipboard attempts, tab switches, focus loss duration, and viva evaluation records.
- **Faculty ERP CSV Export**: 1-click export of complete section marks formatted for institutional university ERP ingestion.

### 7. 📘 4-Phase Sequential Practice Curriculum (`/practice`)
- **4 Curated Modules (40 Problems)**:
  - **Module 1**: Control Structures (Branching, Loops, Switch-Case, Iteration flow)
  - **Module 2**: Pointers and Functions (Addresses, Dereferencing, Pass-by-reference, Recursion)
  - **Module 3**: Arrays and Applications (1D/2D Arrays, Searching, Sorting, Matrix operations)
  - **Module 4**: Advanced Data Types & Dynamic Memory (`struct`, `union`, `enum`, `malloc`, `free`)
- **10-of-10 Sequential Mastery Rule**: Module $N+1$ unlocks only after all 10 problems in Module $N$ are solved.
- **Fair Points & Anti-Farming**: Base points awarded on first Accepted solve (+10 Easy, +20 Medium, +30 Hard). Repeat submissions award +0 PTS.

### 8. ⚡ Daily 17:00 IST Challenge & Streak Engine (`/challenge`)
- **Single Active Question**: Exactly one daily challenge active from 17:00 IST to 17:00 IST (+10 min drain grace).
- **Streak Consistency (🔥)**: Increments daily upon accepted solve before cutoff.
- **Auto-Freeze Protection**: 1 automated freeze per rolling 7-day window protects student streaks against unforeseen disruptions.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Description |
| :--- | :--- | :---: | :--- |
| **Frontend Framework** | React | `18.3.1` | Component-based reactive UI |
| **Language** | TypeScript | `5.6.2` | Strict end-to-end type safety |
| **Styling & Design** | Tailwind CSS | `3.4.11` | Custom WCAG AAA cyber-dark & high-contrast design system |
| **Code Editor** | Monaco Editor | `0.57.0` | Browser-based ISO C11 syntax-highlighted editor |
| **Client Bundler** | Vite | `5.4.21` | High-speed production build system |
| **Backend API** | Node.js / Express | `20.x` / `4.21.0` | REST API, role-based auth middleware, rate-limiters |
| **Database ORM** | Prisma ORM | `5.22.0` | SQLite (dev) / PostgreSQL (production) |
| **Cloud Document Store** | Google Cloud Firestore | `v2` | Primary state store with 47 verified deny-by-default rules |
| **Cloud Hosting** | Firebase Hosting | `v15.x` | Global edge CDN, custom headers (COOP, CSP, HSTS) |
| **C11 Compilation Sandbox** | GCC Compiler | `13.2+` (C11) | Native MinGW-w64 / Linux GCC sandbox runner |
| **Process Sandbox (Win32)**| Windows Job Object | Native | Memory caps (128MB), CPU limits (2.0s), OLE output protection |
| **Testing Harness** | Vitest & Playwright | `2.1.9` / `1.64.1` | 85 automated lifecycle, rules, and proctoring test suites |

---

## 📁 Repository Directory Structure

```
LogicQ/
├── client/                                 # Frontend Vite + React 18 SPA & PWA
│   ├── public/                             # Favicons, PWA manifest, brand SVGs, icons
│   ├── src/
│   │   ├── api/                            # Axios API client with offline retry handling
│   │   ├── components/                     # Monaco editor, Navbar, Workspace, Donut charts
│   │   ├── config/                         # Academic PRN rules, practice configs, brand tokens
│   │   ├── context/                        # Firebase AuthContext state machine & role guards
│   │   ├── pages/
│   │   │   ├── analytics/                  # StudentDashboardAnalyticsPage (Dual-Score + PDF Audit)
│   │   │   ├── exam/                       # StudentTestListPage, StudentExamWorkspacePage
│   │   │   ├── faculty/                    # SectionManagerPage, TestBuilderPage, AnalyticsDeepDive
│   │   │   ├── admin/                      # AdminDashboardPage, ProblemManager
│   │   │   ├── LeaderboardPage.tsx         # University Overall & Daily Sprint Leaderboard
│   │   │   └── PracticeModulesPage.tsx     # 4-Module Sequential Practice Curriculum
│   │   └── services/                       # FirestoreDataService & Drive Backup
│   └── vite.config.ts                      # Bundler configuration
├── server/                                 # Backend Express API & Sandboxed Judge
│   ├── prisma/                             # Prisma schema definitions & migrations
│   ├── src/
│   │   ├── config/                         # Academic PRN regex, features config, practice config
│   │   ├── controllers/
│   │   │   ├── assessment.controller.ts    # Section management, test builder, roster import
│   │   │   ├── exam.controller.ts          # Exam attempts, time-scoring, zero-reattempt lock
│   │   │   ├── viva.controller.ts          # AI viva trigger, 60s countdown, faculty override
│   │   │   ├── mini-project.controller.ts  # Mini-project activation, 20-mark rubric grading
│   │   │   ├── analytics.controller.ts     # Dual-score computation, PDF reports, ERP CSV export
│   │   │   ├── leaderboard.controller.ts   # Points + Streak ranking formula
│   │   │   └── practice.controller.ts      # 10-of-10 sequential gating controller
│   │   ├── judge/                          # GCC C11 sandbox runners & Win32 Job Object runner
│   │   │   ├── local-gcc.judge.ts          # Local MinGW/GCC C11 compile-and-run executor
│   │   │   ├── win-sandbox-runner.c        # Native C Win32 Job Object sandbox source
│   │   │   └── win-sandbox-runner.exe      # Compiled Windows Job Object binary
│   │   ├── middleware/                     # JWT verification, RBAC guards (Student/Faculty/Admin)
│   │   ├── routes/                         # Express REST API endpoints
│   │   └── services/                       # Telemetry ingestion, cohort calibration, streaks
│   └── tests/                              # Automated Vitest test suites (85 verified tests)
│       ├── firestore-security-rules.test.ts# 47 Firestore security rule tests
│       ├── e2e-institutional-lifecycle.test.ts # Complete Sections 1–66 lifecycle verification
│       ├── smart-exam-engine.test.ts       # Time scoring, reattempt lock, integrity telemetry
│       ├── viva-and-mini-project.test.ts   # 2nd successive viva & 20-mark mini-project rubric
│       └── practice-modules.test.ts        # 10-of-10 practice sequential gating tests
├── docs/                                   # Specifications, architecture, and security reports
│   ├── assessment/                         # Master Product Specification Adaptation
│   │   ├── GAP_ANALYSIS.md                 # Sections 1–66 exhaustive gap analysis
│   │   ├── ASSESSMENT_MODE_MVP.md          # Trimmed MVP architecture & specifications
│   │   ├── ROADMAP.md                      # Phased rollout roadmap (Phases 1–5)
│   │   ├── PRIVACY_FAIRNESS.md             # DPDP Act, PII separation & fairness guidelines
│   │   └── DECISIONS.md                    # Key architectural decisions log
│   ├── SECURITY_RULES.md                   # Cloud Firestore security rules specification
│   └── MASTER_SPEC.md                      # Practice curriculum and daily challenge specification
├── firestore.rules                         # Production deny-by-default Firestore rules
├── storage.rules                           # Cloud Storage security rules for student proofs
├── firebase.json                           # Firebase Hosting & Firestore deploy configuration
└── package.json                            # Root monorepo configuration
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or higher ([Download Node.js](https://nodejs.org/)).
- **GCC / MinGW-w64**: Required for local ISO C11 compilation (`gcc --version`).
- **Git**: Version control CLI.
- **Firebase CLI**: `npm install -g firebase-tools` (or bundled `npx.cmd firebase-tools`).

### Quickstart Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pratikpt1304/LogicQ.git
   cd LogicQ
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   cp .env.example server/.env
   ```

4. **Initialize Local Database & Seed**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing & Verification Suites

Execute automated verification across all institutional assessment and practice layers:

```bash
# 1. Run all core Assessment & Institutional Lifecycle Test Suites (85 tests)
npm --prefix server test -- tests/e2e-institutional-lifecycle.test.ts tests/smart-exam-engine.test.ts tests/viva-and-mini-project.test.ts tests/firestore-security-rules.test.ts tests/practice-modules.test.ts

# 2. Run Firestore Deny-by-Default Security Rules Suite (47 tests)
npm --prefix server test tests/firestore-security-rules.test.ts

# 3. Run End-to-End Institutional Platform Lifecycle Verification (Sections 1–66)
npm --prefix server test tests/e2e-institutional-lifecycle.test.ts

# 4. Run Smart Exam Engine, Time Scoring & Zero-Reattempt Locking
npm --prefix server test tests/smart-exam-engine.test.ts

# 5. Run AI Viva Engine & Integrated Mini-Project Rubric Suite
npm --prefix server test tests/viva-and-mini-project.test.ts

# 6. Run Practice Curriculum & 10-of-10 Sequential Gating Suite
npm --prefix server test tests/practice-modules.test.ts

# 7. Run Client Build Guard (Verifies zero primary localStorage student data leaks)
npm --prefix client run build
```

---

## 🌐 Live Deployments & Cloud Operations

- **Frontend Application**: Hosted on **Firebase Hosting** with global edge CDN caching and automated SSL.
  - **Live URL**: [https://logicq-clanguage.web.app](https://logicq-clanguage.web.app)
  - **Deploy Command**:
    ```bash
    npm --prefix client run build
    npx.cmd firebase-tools deploy --only hosting
    ```
- **Backend API & Judge Sandbox**: Hosted on **Render.com** (Docker container running native GCC 13 C11 compiler).
  - **Live API Endpoint**: [https://logicq-bitwiseclub.onrender.com](https://logicq-bitwiseclub.onrender.com)
  - **Deployment Mechanism**: Automatic continuous deployment on push to GitHub `main` branch.
- **Database & Security Rules**: **Google Cloud Firestore**.
  - **Deploy Command**:
    ```bash
    npx.cmd firebase-tools deploy --only firestore:rules
    ```

---

## 📚 Architectural Documentation Index

Comprehensive architectural specifications and engineering analyses are maintained in `/docs`:

- **[docs/assessment/GAP_ANALYSIS.md](docs/assessment/GAP_ANALYSIS.md)**: Exhaustive section-by-section analysis of all 66 sections of the Master Product Specification mapped to LogicQ.
- **[docs/assessment/ASSESSMENT_MODE_MVP.md](docs/assessment/ASSESSMENT_MODE_MVP.md)**: Minimum Viable Product specification for institutional assessment rollout.
- **[docs/assessment/ROADMAP.md](docs/assessment/ROADMAP.md)**: 5-Phase rollout roadmap with capacity planning for 500 and 3,000 students.
- **[docs/assessment/PRIVACY_FAIRNESS.md](docs/assessment/PRIVACY_FAIRNESS.md)**: Student data privacy, India DPDP Act compliance, and procedural fairness guidelines.
- **[docs/assessment/DECISIONS.md](docs/assessment/DECISIONS.md)**: Architectural decisions and trade-offs log.
- **[docs/SECURITY_RULES.md](docs/SECURITY_RULES.md)**: Cloud Firestore deny-by-default security rules specification and test coverage.
- **[docs/MASTER_SPEC.md](docs/MASTER_SPEC.md)**: Practice curriculum and daily challenge specification.

---

## 📄 License & Maintainers

- **Copyright**: © 2026 LogicQ / Sanjivani University. All rights reserved.
- **Lead Architect & Maintainer**: Pratik Thorat ([@pratikpt1304](https://github.com/pratikpt1304))
- **Institution**: Sanjivani University Undergraduate Engineering Programs
