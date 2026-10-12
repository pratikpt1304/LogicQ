# LogicQ — Competitive C Programming & Daily Challenges

<p align="center">
  <img src="client/public/favicon.svg" width="96" height="96" alt="LogicQ Logo" />
</p>

<p align="center">
  <strong>Think in logic. Code in C.</strong><br />
  A modern, high-performance web platform for competitive C programming, daily low-level challenges, weekly competitions, and automated sandboxed judging.
</p>

---

## 🌟 Features

- **Daily & Current-Week C Challenges**: A featured challenge unlocks every day at **17:00 IST**. Students can solve any already-unlocked challenge from the current week directly from the Daily Challenge workspace (`Day 1`–`Day 7` strip) and maintain consecutive daily solve streaks.
- **Sandboxed Online C IDE**: Monaco Editor pre-configured with C11 syntax, indentation, custom shortcuts (`Ctrl+Enter` to Submit, `Alt+Enter` to Run), and starter boilerplates.
- **Pluggable Multi-Backend Judge**:
  - `LocalGccJudge`: Compiles natively using GCC (`-O2 -Wall -std=c11`) with strict timeout limits (1000ms), buffer caps (1MB), and temporary directory isolation.
  - `Judge0Judge`: Submits code to a remote Judge0 CE/Extra instance via REST API.
  - `DockerJudge`: Runs GCC inside an ephemeral container (`--network none`, restricted CPU/memory).
- **Zero Test Case Leakage**: Hidden evaluation test cases are strictly guarded in the backend database and judge sandbox. They are never sent to the browser.
- **Weekly Leaderboard & Past Weeks History**: Weekly leaderboard ranked by points and submission time, featuring a pinned student row, percentile, previous-week delta, Department/Year filters, and a **Past Weeks** selector for viewing historical weekly rankings and weekly result summaries.
- **Daily Streaks & Weekly Freezes**: Track consecutive daily solve streaks with automatic weekly streak freezes (`1` per week) and admin-configured exam pause windows.
- **Enterprise-Grade Security & PRN Privacy**:
  - 12-digit University PRN signup with atomic `prnIndex` uniqueness and privacy masking (`••••••5678` visible only to the student themselves).
  - JWT Access Token (15m) + Refresh Token (7d) stored in secure `httpOnly` cookies.
  - Role-based authorization (`STUDENT`, `ADMIN`).
  - Rate limiting on authentication (`/api/auth`) and code submission (`/api/submissions/submit`).
  - Strict input validation using Zod schemas.
- **Comprehensive Admin Dashboard**:
  - Author and edit problems with Markdown preview and test case management (visible & hidden flags).
  - Schedule daily challenges for upcoming dates.
  - Live global submission stream with source code inspector and re-judge triggers.
  - Student moderation (ban/unban, role management, audited PRN/college updates with step-up re-authentication).
  - Platform & 2-Week Pilot analytics (submission volume, pass rate, cohort retention, difficulty distributions).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Monaco Editor (local Vite worker bundle), TanStack Query, Framer Motion, Sonner, Canvas Confetti, PWA (`manifest.webmanifest` + Workbox `/sw.js`) |
| **Backend** | Node.js (v24), Express, TypeScript, Prisma ORM, Zod, Bcrypt, Helmet, Express Rate Limit |
| **Database** | SQLite (zero-config local dev & tests) / Cloud Firestore (`firestore.rules`) & Cloud Storage (`storage.rules`) |
| **Queue** | InMemoryQueue (zero-dependency local async worker) / BullMQ + Redis (production) |
| **Judge Subsystem** | Fail-closed Local GCC 16.2.0 (`-std=c11 -O2 -Wall -lm`), Remote Judge0 API, Docker container |
| **Testing** | Vitest + Supertest (`14` suites, `77` tests) + Headless Chrome Console & Accessibility Audits |

### 🌐 Live Deployment (`v1.0.0-pilot`)
- **Production URL**: `https://logicq-clanguage.web.app`
- **Staging Preview Channel**: `https://logicq-clanguage--staging-myz67fzi.web.app`
- **Release Tag**: `v1.0.0-pilot` (Rollback tag: `v0.9.0-pre-pilot` — see [`docs/STATUS.md`](./docs/STATUS.md), [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md), and [`docs/ROLLBACK.md`](./docs/ROLLBACK.md))

---

## 🚀 Quick Start (Development)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/pratikpt1304/LogicQ.git
cd LogicQ
npm run setup
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and in `/server`:
```bash
cp .env.example .env
cp .env.example server/.env
```

### 3. Database Migration & Seed
Run Prisma to sync schema and seed 16+ original C challenges and sample users:
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Servers
Start both the backend API (port 5000) and frontend (port 5173) simultaneously:
```bash
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Default Accounts (Seeded)

| Account Role | Identifier / Email | Password |
|---|---|---|
| **Administrator** | `admin@logicq.io` | `AdminPassword123!` |
| **Student** | `aiml.fy1@sanjivani.org.in` | `StudentPass123!` |
| **Student** | `cse.ty3@sanjivani.org.in` | `StudentPass123!` |

---

## 🧪 Running Automated Tests

```bash
npm run test
```

---

## 📜 License
Original code and design built by **Bitwise Club** for LogicQ. MIT License.
