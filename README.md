# LogicQ — Competitive C Programming Arena & Daily Challenges

<p align="center">
  <img src="client/public/favicon.svg" width="96" height="96" alt="LogicQ Logo" />
</p>

<p align="center">
  <strong>Think in logic. Code in C.</strong><br />
  A modern, high-performance web platform for competitive C programming, daily low-level challenges, live arena contests, and automated sandboxed judging.
</p>

---

## 🌟 Features

- **Daily C Challenges**: A featured challenge drops every midnight (**00:00 IST**). Maintain consecutive daily solve streaks with flame indicators.
- **Sandboxed Online C IDE**: Monaco Editor pre-configured with C11 syntax, indentation, custom shortcuts (`Ctrl+Enter` to Submit, `Alt+Enter` to Run), and starter boilerplates.
- **Pluggable Multi-Backend Judge**:
  - `LocalGccJudge`: Compiles natively using GCC (`-O2 -Wall -std=c11`) with strict timeout limits (1000ms), buffer caps (1MB), and temporary directory isolation.
  - `Judge0Judge`: Submits code to a remote Judge0 CE/Extra instance via REST API.
  - `DockerJudge`: Runs GCC inside an ephemeral container (`--network none`, restricted CPU/memory).
- **Zero Test Case Leakage**: Hidden evaluation test cases are strictly guarded in the backend database and judge sandbox. They are never sent to the browser.
- **Competitive Arena**: Timed contest rounds with start/end countdowns, problem sets unlocked at kickoff, and live scoreboards scored by points and ICPC penalty time.
- **Real-Time WebSocket Architecture**: Socket.IO connects the client to live leaderboard broadcasts, contest standings, and instant submission verdicts.
- **Mastery Honors & Badges**: Unlock badges for First Blood, 7-Day Streaks, 30-Day Streaks, 10 Solves, Pointer Virtuoso, and Arena Gladiator.
- **Enterprise-Grade Security**:
  - JWT Access Token (15m) + Refresh Token (7d) stored in secure `httpOnly` cookies.
  - Role-based authorization (`STUDENT`, `ADMIN`).
  - Rate limiting on authentication (`/api/auth`) and code submission (`/api/submissions/submit`).
  - Strict input validation using Zod schemas.
  - Parameterized queries via Prisma ORM preventing SQL injection.
- **Comprehensive Admin Dashboard**:
  - Author and edit problems with Markdown preview and test case management (visible & hidden flags).
  - Schedule daily challenges for upcoming dates.
  - Live global submission stream with source code inspector and re-judge triggers.
  - Student moderation (ban/unban, promote to Admin).
  - Platform analytics (submission volume, pass rate, difficulty distributions).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Monaco Editor, TanStack Query, Framer Motion, Socket.IO Client, Sonner, Canvas Confetti |
| **Backend** | Node.js (v24), Express, TypeScript, Prisma ORM, Zod, Bcrypt, Helmet, Express Rate Limit |
| **Database** | SQLite (zero-config local dev & tests) / PostgreSQL (production & Docker) |
| **Queue** | InMemoryQueue (zero-dependency local async worker) / BullMQ + Redis (production) |
| **Judge Subsystem** | Local GCC 16.2.0 (C11), Remote Judge0 API, Docker container |
| **Testing** | Vitest + Supertest (API & integration suites) |

---

## 🚀 Quick Start (Development)

### Prerequisites
1. **Node.js**: v20 or v24 installed
2. **GCC Compiler**: (Optional for development, as a portable GCC 16.2.0 toolchain is bundled in `~/.tools/w64devkit` on Windows)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/logicq/logicq.git
cd LogicQ

# Install dependencies across all workspaces
npm run setup
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and in `/server`:
```bash
cp .env.example .env
cp .env.example server/.env
```

### 3. Database Migration & Seed
Run Prisma to sync schema and seed 16+ original C challenges, sample users, contests, and badges:
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

| Account Role | Username | Email | Password |
|---|---|---|---|
| **Administrator** | `admin` | `admin@logicq.io` | `AdminPassword123!` |
| **Student** | `c_wizard` | `alice@example.com` | `StudentPass123!` |
| **Student** | `pointer_ninja` | `devin@example.com` | `StudentPass123!` |

*Tip: On the login page, click the quick-fill buttons (`[Admin]` or `[Student]`) for instant authentication!*

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend HTTP & WebSocket port | `5000` |
| `CLIENT_URL` | Frontend origin for CORS and cookies | `http://localhost:5173` |
| `DATABASE_URL` | Prisma database connection string | `file:./dev.db` |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens | `logicq_super_secret_access_...` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `logicq_super_secret_refresh_...` |
| `ADMIN_USERNAME` | Default seed administrator handle | `admin` |
| `ADMIN_EMAIL` | Default seed administrator email | `admin@logicq.io` |
| `ADMIN_PASSWORD` | Default seed administrator password | `AdminPassword123!` |
| `JUDGE_TYPE` | Active judge implementation (`local_gcc`, `judge0`, `docker`) | `local_gcc` |
| `GCC_PATH` | Path to `gcc` binary (optional) | `~/.tools/w64devkit/bin/gcc.exe` |
| `JUDGE0_URL` | RapidAPI / self-hosted Judge0 URL | `https://judge0-ce.p.rapidapi.com` |
| `JUDGE0_KEY` | RapidAPI key for Judge0 | `""` |
| `REDIS_URL` | Redis connection URL for BullMQ (falls back to InMemory) | `""` |
| `MAIL_PROVIDER` | Mail service driver (`console` or `smtp`) | `console` |

---

## ⚖️ Switching Judges

LogicQ includes a pluggable judge architecture (`IJudge`):

### Option 1: Native Local GCC (Default)
```env
JUDGE_TYPE=local_gcc
GCC_PATH="" # Leave blank to auto-detect from PATH or ~/.tools/w64devkit/bin/gcc.exe
```

### Option 2: Judge0 API (Production Recommended)
```env
JUDGE_TYPE=judge0
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=your_rapidapi_key_here
```

### Option 3: Docker Container
```env
JUDGE_TYPE=docker
```

---

## 🧪 Running Automated Tests

Run unit and integration test suites:
```bash
# Run server test suite (vitest)
npm run test
```

---

## 🐳 Docker Deployment

To run PostgreSQL, Redis, and LogicQ with Docker Compose:
```bash
docker-compose up -d
```

---

## 📜 License
Original code and design built for LogicQ Arena. MIT License.
