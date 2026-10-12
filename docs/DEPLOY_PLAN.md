# LogicQ Safe Staged Deployment Plan (`/docs/DEPLOY_PLAN.md`)

> **STATUS**: **STEP 0 COMPLETE — STOPPED AWAITING YOUR `"approved"` BEFORE STEP 1**  
> Per your deployment instructions, no Git branch pushes, staging deployments, or production deployments have been executed yet. Review the current state, release scope, staging proposal, and Blaze dependencies below, then reply **`"approved"`** to proceed.

---

## 1. Current Production & Repository State (Verified Read-Only)

| Component | Current Live State | Evidence / Notes |
| :--- | :--- | :--- |
| **GitHub Repository** | `https://github.com/pratikpt1304/LogicQ.git` | Default branch `main` at commit `a35f86c` (`feat: LogicQ competitive C programming platform (Bitwise Club)`). |
| **Production Firebase Project** | **`logicq-clanguage`** (Project Number `898954156375`) | Verified via `npx firebase-tools projects:list`. |
| **Live Firebase Hosting Site** | **`https://logicq-clanguage.web.app`** | Site ID `logicq-clanguage`, Web App ID `1:898954156375:web:838cb0fbbd27bb65f30612`. |
| **Staging Firebase Project** | **None exists yet** on this Firebase account (`1 project(s) total`) | **Proposal**: (A) Create isolated staging project `logicq-clanguage-staging` (`npx firebase-tools projects:create logicq-clanguage-staging`), **OR** (B) Deploy frontend to a Firebase Hosting Preview Channel (`npx firebase-tools hosting:channel:deploy staging --expires 7d --project logicq-clanguage`) backed by the local Emulator Suite with fake seed data so zero production data is touched. |
| **Deployed Cloud Functions & Scheduled Jobs** | **None (`0` deployed)** | `logicq-clanguage` currently has `[Not specified]` GCP resource location and is on the Spark (free) plan; only static Firebase Hosting is currently deployed. |
| **Firestore & Storage Rules** | Local `firestore.rules` and `storage.rules` ready (`rules_version = '2'`) | Not yet deployed to `logicq-clanguage` pending GCP resource location initialization (`asia-south1`) and your approval. |

---

## 2. Every Change To Be Released (8 Grouped Commits on Branch `release/2026-10-12`)

1. **`feat(auth-profile)` — 12-Digit PRN & Academic Identity**:
   - Replaces username signup with required 12-digit **PRN** (live `8/12` counter), config-driven **College** (`Sanjivani University`), **Department** (`AIML`, `AIDS`, `Integrated M.Tech`, `Mechanical`, `CSE`, `Integrated B.Tech`), **Year** (`FY`, `SY`, `TY`), and optional uppercase **Division** (`<= 3` chars).
   - Enforces atomic `prnIndex/{prn}` uniqueness, peer privacy (`displayName` or `Student XXXX` on leaderboards; masked PRN `••••••0001` shown only to self), and audited Admin PRN changes with password re-authentication.
2. **`feat(ui-theme)` — Dark (`#0C0F1F`) & Light (`#F4F6FB`) Brand Themes**:
   - Central WCAG AA CSS variables (`client/src/index.css`), pre-paint theme script (`client/index.html`), sticky navbar offset (`--navbar-height: 4rem`), and custom Monaco themes (`logicq-dark`, `logicq-light`).
3. **`feat(nav-removals)` — Home Button + Arena, Archive & Badges Removal**:
   - Signed-in navbar shows strictly **Home** (`/dashboard`), **Daily Challenge** (`/challenge`), **Leaderboard** (`/leaderboard`).
   - Disables Arena, Archive, and Badges via `FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`; returns `404` on `/arena*`, `/archive*`, `/badges*`, and their APIs; preserves **Weekly Catch-Up** (7-day strip on `/challenge`) and **Past Weeks selector** (`?weekOffset=0|-1|-2|-3`) on `/leaderboard` and `/dashboard`.
4. **`feat(pwa-mobile)` — Installable Mobile PWA & C Symbol Helper Bar**:
   - Adds `/manifest.webmanifest`, crisp PNG icons (`192x192`, `512x512`, `maskable-512x512`, `apple-touch-icon`), safe Workbox `/sw.js` (`NetworkOnly` for all Auth/Firestore/API/Judge requests, `prompt` update banner, cache wipe on logout), `/offline.html`, `/how-to-install`, and mobile C symbol bar (`{ } ( ) [ ] ; # " * & -> = == != < > \n Tab`).
5. **`fix(judge-real)` — Real C11 Judge Pipeline & Expanded Hidden Tests**:
   - Removes simulated `Judge0MockJudge` fallback; `getJudge()` and `fallbackEngine.ts` fail closed (`503`) if GCC is unavailable. All 17 seeded problems have $\ge 2$ sample and $\ge 5$ hidden test cases (`122` total test cases).
6. **`feat(upload-files)` — Upload Files Tab & Admin Review Queue**:
   - Replaces bottom `Test Cases` tab under editor with `Custom Stdin`, `Verdict & Output`, `Upload Files` (`JPG`/`PNG`/`WebP`/`PDF`, max 3 files $\le 5\text{ MB}$, magic-byte check, JPEG EXIF stripping, PDF `/JavaScript` rejection, `PENDING_REVIEW` `0`-point rule, Admin **Review Uploads** queue, and `storage.rules`).
7. **`feat(content-pipeline)` — Book-Only Content Governance**:
   - Adds `/docs/CONTENT_PIPELINE.md`, `/docs/CONTENT_RIGHTS.md`, `/docs/CONTENT_REPORT.md`, `/scripts/import-book.ts`, student API stripping of `sourceRefJson`, 14-day low-pool alert, and `"Season Complete"` fallback.
8. **`fix(console-csp)` — Zero Console Errors, WebSocket Removal & Local Monaco Bundle**:
   - Replaces `socket.io-client` with zero-network stub (`SocketContext.tsx`), bundles Monaco locally via Vite workers (`monacoSetup.ts`), removes `http://localhost:5000` from production CSP in `firebase.json`, and adds `scripts/check-bundle.mjs` + `server/scripts/verify-console-clean.ts`.

---

## 3. Destructive / Irreversible vs. Safe / Reversible Impact Assessment

| Change Area | Destructive / Irreversible? | Safety & Rollback Guarantee |
| :--- | :---: | :--- |
| **Existing User / Submission / Problem Data** | **NO (Non-Destructive)** | Zero rows or documents are deleted. Historical `submissions`, `problems`, `contests`, `badges`, and `weekly_summaries` remain untouched. |
| **PRN & Academic Profile Migration (`migrate-users-prn.ts`)** | **NO (Additive & Idempotent)** | Only adds missing fields (`shortId`, `profileComplete = false`) to legacy users without overwriting existing data; safe to re-run multiple times. |
| **Arena, Archive & Badges Removal** | **NO (Feature-Flagged)** | Controlled by `FEATURE_ARENA=false`, `FEATURE_ARCHIVE=false`, `FEATURE_BADGES=false`; existing DB tables/records remain intact. |
| **Retiring Seeded Problems on Book Import** | **Soft-Retire Only (`status = 'RETIRED'`)** | Seeded problems are never hard-deleted so past student submissions and points remain 100% valid (`verify-integrity.ts` passes `8/8`). |

---

## 4. What Depends on the Firebase Blaze Plan vs. Spark Free Plan

| Resource | Works on Spark (Free) Plan? | Blaze Plan Requirement & Estimated Cost (`500` Students) |
| :--- | :---: | :--- |
| **Firebase Hosting (`https://logicq-clanguage.web.app`)** | **YES** | Free within 10 GB storage / 360 MB/day transfer (`$0.00/mo`). |
| **Firebase Authentication & Firestore (`firestore.rules`)** | **YES** | Free within 50k reads/day, 20k writes/day (`$0.00/mo`). |
| **Firebase Cloud Storage (`storage.rules` for `Upload Files`)** | **NO (Requires Blaze)** | Default GCS bucket creation requires Blaze since Oct 2024 (`~1.5 GB/mo` = **`< $0.25/mo`**). |
| **Cloud Functions (2nd Gen) & Cloud Run C11 Judge (`asia-south1`)** | **NO (Requires Blaze)** | Requires Blaze + Cloud Build API (`~150k` invocations/mo = **`$0.00–$1.50/mo`** within free tier). |
| **Cloud Scheduler (`17:00 IST` Daily Unlock & `17:05 IST` Freeze)** | **NO (Requires Blaze)** | Requires Blaze (`2` jobs $\le 3$ free jobs/billing account = **`$0.00/mo`**). |
| **Google Cloud Secret Manager (`JWT_ACCESS_SECRET`)** | **NO (Requires Blaze)** | Requires Blaze (`< 6` secret versions = **`$0.00/mo`** within free tier). |
