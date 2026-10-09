# LogicQ Architecture & Technical Specification

**System Name:** LogicQ  
**Tagline:** Think in logic. Code in C.  
**Version:** 1.0.0  
**Target Environment:** Cross-platform (Windows / Linux / macOS / Docker)

---

## 1. System Overview & Technology Stack

LogicQ is a high-performance, developer-focused competitive C programming platform and daily challenge arena. The architecture is engineered around low-latency real-time scoreboards, isolated code execution, granular role-based security, and a responsive dark terminal aesthetic.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|  React 18/19 + Vite + TypeScript | Tailwind CSS | Monaco Editor | TanStack Query  |
|         Framer Motion | Socket.IO Client | Lucide Icons | Sonner Notifications   |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS
+------------------------------------------v----------------------------------------+
|                                  SERVER TIER                                      |
|    Node.js (v24) + Express + TypeScript | Zod Validation | Helmet & RateLimit     |
|   JWT (Access + Refresh in httpOnly cookies) | Socket.IO Gateway | Bcrypt Auth    |
+-------------------+----------------------+--------------------+-------------------+
                    |                      |                    |
        +-----------v-----------+          |          +---------v---------+
        |     DATABASE TIER     |          |          |    QUEUE TIER     |
        |  PostgreSQL / SQLite  |          |          | BullMQ + Redis /  |
        |      Prisma ORM       |          |          |  InMemoryQueue    |
        +-----------------------+          |          +---------+---------+
                                           |                    |
                                 +---------v---------+          |
                                 |  JUDGE SUBSYSTEM  |          |
                                 |  Pluggable IJudge <----------+
                                 |  - LocalGccJudge  |
                                 |  - Judge0Judge    |
                                 |  - DockerJudge    |
                                 +-------------------+
```

### 1.1 Stack Breakdown
- **Frontend**:
  - **Framework**: React + Vite + TypeScript
  - **Styling**: Tailwind CSS (obsidian palette, neon cyan/emerald accents, glowing borders, custom glass cards)
  - **Animations**: Framer Motion (page transitions, streak flames, verdict reveals, badge toasts)
  - **Code Editor**: Monaco Editor (`@monaco-editor/react`) configured for C syntax highlighting, line numbers, automatic layout, minimap toggle, keyboard shortcuts
  - **State & Server Cache**: TanStack Query (`@tanstack/react-query`) for asynchronous cache invalidation
  - **Routing**: React Router (`react-router-dom`)
  - **Realtime**: Socket.IO Client (`socket.io-client`)
- **Backend**:
  - **Runtime & Server**: Node.js + Express + TypeScript
  - **Data Validation**: Zod for type-safe schema validation
  - **ORM & Database**: Prisma ORM with PostgreSQL (production/docker) and SQLite (zero-config local development and testing)
  - **Authentication**: JWT access token (15-min TTL) + refresh token (7-day TTL) stored in secure `httpOnly`, `SameSite=lax` cookies. Role-based access control (`STUDENT`, `ADMIN`)
  - **Queue Engine**: Pluggable Queue (`IQueueService`):
    - `BullMQQueue` when Redis is configured via `REDIS_URL`
    - `InMemoryQueue` with concurrency limits for standalone zero-dependency environments
  - **Realtime Gateway**: Socket.IO server for real-time leaderboard broadcasts, submission verdict updates, and contest synchronizations
  - **Security**: Helmet headers, CORS policies, express-rate-limit on authentication and submission endpoints
- **Testing**:
  - Vitest + Supertest for unit and API integration testing
  - Playwright for end-to-end browser user flows

---

## 2. Monorepo Folder Structure

```
LogicQ/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets, favicon.svg, robots.txt
│   ├── src/
│   │   ├── api/                # Axios / fetch wrapper, query keys
│   │   ├── assets/             # Brand SVGs (LogicQ logo, terminal motifs)
│   │   ├── components/         # Reusable UI primitives
│   │   │   ├── common/         # Button, Input, Modal, Card, Badge, Skeleton
│   │   │   ├── editor/         # Monaco editor wrapper, terminal drawer
│   │   │   ├── layout/         # Navbar, Sidebar, Footer, PageContainer
│   │   │   └── problem/        # Markdown renderer, test case tabs
│   │   ├── context/            # AuthContext, SocketContext, ThemeContext
│   │   ├── hooks/              # Custom hooks (useAuth, useSocket, useCountdown)
│   │   ├── pages/              # Views
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ChallengePage.tsx
│   │   │   ├── ArchivePage.tsx
│   │   │   ├── ArenaPage.tsx
│   │   │   ├── ContestDetailPage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── AchievementsPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── admin/          # Admin pages (Analytics, Questions, Submissions, Users)
│   │   ├── types/              # Client TypeScript models
│   │   ├── App.tsx             # Routing & Providers
│   │   └── main.tsx            # Entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── server/                     # Backend API & Execution Engine
│   ├── prisma/
│   │   ├── schema.prisma       # Database models
│   │   └── seed.ts             # 15+ original C problems, sample users, contests, badges
│   ├── src/
│   │   ├── config/             # Config loader, env parsing, constants
│   │   ├── controllers/        # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── problem.controller.ts
│   │   │   ├── submission.controller.ts
│   │   │   ├── contest.controller.ts
│   │   │   ├── leaderboard.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── middleware/         # Auth, RBAC, Rate limiter, Zod validator, Error handler
│   │   ├── routes/             # Express route registers
│   │   ├── services/           # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── mail.service.ts         # Pluggable console / SMTP
│   │   │   ├── scoring.service.ts      # Points, penalties, streak
│   │   │   ├── streak.service.ts       # Daily streak computation (IST)
│   │   │   ├── badge.service.ts        # Achievement evaluation
│   │   │   └── leaderboard.service.ts  # Daily, weekly, all-time caching
│   │   ├── judge/              # Code Execution Subsystem
│   │   │   ├── judge.interface.ts      # IJudge interface
│   │   │   ├── local-gcc.judge.ts      # Native gcc compilation sandbox
│   │   │   ├── judge0.judge.ts         # Remote Judge0 API client
│   │   │   ├── docker.judge.ts         # Isolated container judge
│   │   │   └── judge.factory.ts        # Pluggable resolver
│   │   ├── queue/              # Submission Job Queue
│   │   │   ├── queue.interface.ts      # IQueueService interface
│   │   │   ├── bullmq.queue.ts         # Redis BullMQ worker
│   │   │   ├── memory.queue.ts         # In-process asynchronous worker
│   │   │   └── queue.factory.ts        # Pluggable queue selector
│   │   ├── sockets/            # Socket.IO connection manager & events
│   │   ├── utils/              # Helper utilities
│   │   ├── app.ts              # Express application configuration
│   │   └── index.ts            # HTTP & WebSocket server bootstrap
│   ├── tests/                  # Automated integration & unit tests
│   │   ├── auth.test.ts
│   │   ├── judge.test.ts
│   │   ├── problem.test.ts
│   │   └── scoring.test.ts
│   ├── tsconfig.json
│   └── package.json
├── docs/                       # Architectural and status documentation
│   ├── REFERENCE_ANALYSIS.md
│   ├── ARCHITECTURE.md
│   ├── STATUS.md
│   └── screenshots/
├── docker-compose.yml          # Container orchestration (Postgres, Redis, LogicQ)
├── .env.example
├── package.json                # Monorepo root scripts
└── README.md
```

---

## 3. Data Model (Prisma Schema)

```prisma
datasource db {
  provider = "sqlite" // Toggleable to "postgresql" for production
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  ADMIN
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum Verdict {
  ACCEPTED
  WRONG_ANSWER
  TIME_LIMIT_EXCEEDED
  RUNTIME_ERROR
  COMPILE_ERROR
  MEMORY_LIMIT_EXCEEDED
  PENDING
  JUDGING
}

enum ContestStatus {
  UPCOMING
  ONGOING
  ENDED
}

model User {
  id             String         @id @default(uuid())
  username       String         @unique
  email          String         @unique
  passwordHash   String
  role           Role           @default(STUDENT)
  fullName       String
  college        String?
  bio            String?
  avatarUrl      String?
  totalPoints    Int            @default(0)
  currentStreak  Int            @default(0)
  longestStreak  Int            @default(0)
  lastSolvedDate String?        // YYYY-MM-DD in IST
  isBanned       Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  submissions          Submission[]
  userBadges           UserBadge[]
  refreshTokens        RefreshToken[]
  contestParticipants ContestParticipant[]
}

model RefreshToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}

model Problem {
  id               String       @id @default(uuid())
  slug             String       @unique
  title            String
  difficulty       Difficulty   @default(MEDIUM)
  category         String       @default("Algorithms")
  tags             String       // JSON string array e.g. '["Pointers","Strings"]'
  description      String       // Full Markdown content
  starterCode      String
  solutionTemplate String?
  timeLimitMs      Int          @default(1000)
  memoryLimitMb    Int          @default(64)
  basePoints       Int          @default(20)
  isDaily          Boolean      @default(false)
  scheduledDate    String?      // YYYY-MM-DD for daily challenge scheduling
  status           String       @default("PUBLISHED") // DRAFT, PUBLISHED
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  testCases        TestCase[]
  submissions      Submission[]
  contestProblems  ContestProblem[]
}

model TestCase {
  id             String   @id @default(uuid())
  problemId      String
  problem        Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  input          String
  expectedOutput String
  isHidden       Boolean  @default(false)
  orderIndex     Int      @default(0)
}

model Submission {
  id             String    @id @default(uuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  problemId      String
  problem        Problem   @relation(fields: [problemId], references: [id], onDelete: Cascade)
  contestId      String?
  contest        Contest?  @relation(fields: [contestId], references: [id], onDelete: SetNull)
  code           String
  language       String    @default("c")
  verdict        Verdict   @default(PENDING)
  runtimeMs      Int?
  memoryKb       Int?
  compileOutput  String?
  pointsAwarded  Int       @default(0)
  createdAt      DateTime  @default(now())

  testCaseResults SubmissionTestCaseResult[]
}

model SubmissionTestCaseResult {
  id           String      @id @default(uuid())
  submissionId String
  submission   Submission  @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  testCaseId   String
  verdict      Verdict
  runtimeMs    Int?
  stdout       String?
  stderr       String?
  orderIndex   Int         @default(0)
}

model Contest {
  id              String        @id @default(uuid())
  slug            String        @unique
  title           String
  description     String
  startTime       DateTime
  endTime         DateTime
  durationMinutes Int
  status          ContestStatus @default(UPCOMING)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  problems        ContestProblem[]
  participants    ContestParticipant[]
  submissions     Submission[]
}

model ContestProblem {
  id         String   @id @default(uuid())
  contestId  String
  contest    Contest  @relation(fields: [contestId], references: [id], onDelete: Cascade)
  problemId  String
  problem    Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  orderIndex Int      @default(0)
  points     Int      @default(100)
}

model ContestParticipant {
  id          String   @id @default(uuid())
  contestId   String
  contest     Contest  @relation(fields: [contestId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  score       Int      @default(0)
  penaltyTime Int      @default(0)
  rank        Int?
  joinedAt    DateTime @default(now())
}

model Badge {
  id               String      @id @default(uuid())
  slug             String      @unique
  name             String
  description      String
  iconName         String
  category         String      // STREAK, SOLVE_COUNT, DIFFICULTY, CONTEST
  requirementCount Int         @default(1)

  userBadges       UserBadge[]
}

model UserBadge {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeId    String
  badge      Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  unlockedAt DateTime @default(now())

  @@unique([userId, badgeId])
}
```

---

## 4. API Endpoints Specification

### 4.1 Authentication (`/api/auth`)
- `POST /register`: Register student account (Zod validated: username, email, password, fullName, college). Sets httpOnly access + refresh tokens.
- `POST /login`: Authenticate with username or email + password. Returns user object, sets cookies.
- `POST /refresh`: Uses valid refresh cookie to issue fresh access token.
- `POST /logout`: Revokes refresh token in database and clears cookies.
- `GET /me`: Returns currently authenticated user session.
- `POST /forgot-password`: Generates reset token and dispatches email via pluggable `MailService`.
- `POST /reset-password`: Validates token and resets password.

### 4.2 Dashboard & Problems (`/api/problems`, `/api/dashboard`)
- `GET /api/problems/daily`: Returns today's active featured problem (IST timezone). Hidden test cases are stripped out.
- `GET /api/problems`: List all published problems with filters (`difficulty`, `category`, `search`, `page`, `limit`).
- `GET /api/problems/:slug`: Fetch single problem details, starter code, sample test cases (hidden cases excluded).
- `GET /api/dashboard/stats`: Returns student overview (streak, points, rank, difficulty solve counts, recent activity).

### 4.3 Submissions & Execution (`/api/submissions`)
- `POST /api/submissions/run`: Ephemeral dry-run of C code against arbitrary user-provided input. Does not save to database.
- `POST /api/submissions/submit`: Submits C code for official evaluation. Queues job, triggers judge, records verdicts, updates points, evaluates streaks and badges, broadcasts real-time verdict via WebSocket.
- `GET /api/submissions/my`: Paginated list of student's past submissions.
- `GET /api/submissions/:id`: Submission details (verdicts, execution metrics, source code). Unauthorized access to other users' source code is blocked.
- `GET /api/submissions/problem/:problemId`: Solved status and past attempts on a specific problem.

### 4.4 Competitive Arena & Contests (`/api/contests`)
- `GET /api/contests`: List all contests (upcoming, ongoing, past).
- `GET /api/contests/:slug`: Contest metadata and rules. Problems list is returned only if `status === ONGOING` or `ENDED`.
- `POST /api/contests/:id/join`: Register user as a contest participant.
- `GET /api/contests/:id/scoreboard`: Live scoreboard (ICPC penalty time or points). Also broadcast via WebSocket room `contest:${id}`.

### 4.5 Leaderboards & Profiles (`/api/leaderboard`, `/api/users`, `/api/badges`)
- `GET /api/leaderboard?type=daily|weekly|all_time`: Ranked users with pagination.
- `GET /api/users/:username`: Public profile stats, streak, badges, solve breakdown, and heatmap data.
- `PUT /api/users/profile`: Update bio, full name, college, avatar.
- `GET /api/badges`: Master list of available platform badges and user unlock status.

### 4.6 Administrative Endpoints (`/api/admin` - Role: `ADMIN`)
- `GET /api/admin/analytics`: Platform analytics (total users, daily submissions, pass rates, popular tags).
- `GET /api/admin/problems`: All problems including draft and scheduled problems.
- `POST /api/admin/problems`: Create new problem with test cases (including hidden test cases).
- `PUT /api/admin/problems/:id`: Edit problem and test cases.
- `DELETE /api/admin/problems/:id`: Soft or hard delete problem.
- `GET /api/admin/submissions`: Filterable global submission log.
- `POST /api/admin/submissions/:id/rejudge`: Re-evaluates submission through judge.
- `GET /api/admin/users`: Searchable student roster.
- `PUT /api/admin/users/:id/role`: Change role (`STUDENT` <-> `ADMIN`).
- `PUT /api/admin/users/:id/ban`: Toggle account ban status.
- `POST /api/admin/daily/schedule`: Schedule problem as daily challenge for target date (IST).

---

## 5. Judge Subsystem Design

```typescript
export interface ExecutionResult {
  verdict: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
}

export interface IJudge {
  name: string;
  isAvailable(): Promise<boolean>;
  compileAndRun(code: string, stdin: string, timeLimitMs: number, memoryLimitMb: number): Promise<ExecutionResult>;
}
```

### 5.1 Implementations
1. **`LocalGccJudge`**:
   - Compiles code with `gcc -O2 -Wall -std=c11 -o <temp_binary> <temp_source>.c`.
   - Runs the executable inside an isolated child process using `spawn`.
   - Passes `stdin` via pipe and enforces hard timeout with `SIGKILL` after `timeLimitMs`.
   - Enforces max buffer limits on `stdout` and `stderr` to prevent resource exhaustion attacks.
   - Cleans up temporary directory in a `finally` block.
2. **`Judge0Judge`**:
   - Submits source code and base64-encoded stdin to Judge0 CE/Extra API (`POST /submissions?wait=true`).
   - Translates Judge0 status IDs (3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded, 6: Compilation Error, 7-12: Runtime Error) to LogicQ `Verdict` enum.
3. **`DockerJudge` (Optional container backend)**:
   - Spawns disposable container: `docker run --rm -i --network none -m 64m --cpus 0.5 gcc:alpine`.

---

## 6. Security Model & Resource Protection

1. **Sandboxed Code Execution**:
   - User code is NEVER evaluated in the main Node.js process.
   - Spawned processes have restricted execution time (e.g. 1000ms max default), buffer caps (1MB max output), and no shell interpretation (`shell: false`).
2. **Data & Test Case Isolation**:
   - Hidden test cases are marked `isHidden = true` and are explicitly excluded from public problem queries.
   - Unauthorized users cannot view another student's submission source code until after the contest or challenge concludes.
3. **Authentication & Token Lifecycle**:
   - Short-lived Access Token (JWT, 15 minutes) signed with `JWT_SECRET`.
   - Long-lived Refresh Token (7 days) stored in database and provided as `httpOnly`, `SameSite=lax`, `secure` (in production) cookie.
   - Token revocation on logout or password change.
4. **Rate Limiting & Cooldown**:
   - Submission endpoint rate limited (e.g. max 5 submissions per minute per user).
   - Login endpoint rate limited (e.g. max 5 attempts per 15 minutes per IP).
5. **Input Validation**:
   - All client payloads pass through strict Zod validators before controller logic executes.
   - Prisma uses parameterized queries, eliminating SQL injection vectors.

---

## 7. Assumptions & Flags

1. **Database Default**: SQLite is configured by default for effortless zero-configuration local runs and automated tests on any machine, while PostgreSQL is fully supported via `DATABASE_URL` and `prisma/schema.prisma` provider configuration with Docker Compose.
2. **Queue Default**: In-memory async queue is active when `REDIS_URL` is omitted, and BullMQ connects seamlessly when Redis is available.
3. **Timezone**: Indian Standard Time (`UTC+05:30`) is utilized for daily challenge cutoff calculations, streak transitions, and scheduling.
4. **Email Service**: Console logger formats mock emails in development mode; standard SMTP/SendGrid can be enabled via environment variables.

---

## 8. Deployment Strategy

- **Local Development**: One command `npm run dev` boots backend (port 5000) and frontend (port 5173).
- **Docker Compose**: Containerized multi-service setup (`docker-compose up` runs PostgreSQL, Redis, and LogicQ).
- **Production**: Frontend built as static SPA via `npm run build` and served via Nginx or Express static serving; backend containerized and deployed to cloud provider (AWS, GCP, Railway, or Render).
