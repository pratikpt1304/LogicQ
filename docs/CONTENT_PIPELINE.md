# LogicQ Book-Only Content Pipeline Specification (`/docs/CONTENT_PIPELINE.md`)

> **STATUS**: `AWAITING USER APPROVAL & BOOK FILE ATTACHMENT`  
> Per the authoritative directive: *"Update `/docs/MASTER_SPEC.md` and write `/docs/CONTENT_PIPELINE.md` first, then STOP for my review before importing or building anything. ... Do the import only after I approve `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md`."*

---

## 1. Authoritative Content Source Rule

1. **Single Designated Book Source**:
   - **Book Placeholder**: `[BOOK TITLE, AUTHOR, EDITION]` (to be supplied by the project owner in a private local folder `/private/books/<filename>`, excluded by `.gitignore`).
   - **Zero External / AI-Invented Problems**: Once the book import is approved and executed, **no other question source is allowed**—no ungrounded AI-invented problems and no problems from external books or websites.
   - **Existing Seeded Problems Policy**: By default, all earlier seeded/sample problems (such as `"In-Place Pointer Swap & Sum"`) will be transitioned to `status = 'RETIRED'` upon book import execution unless explicitly approved in writing by the project owner. Retired problems are **never deleted** (preserving all historical student submissions, points, streaks, and weekly summaries) and can never be scheduled or displayed as today's challenge.

---

## 2. Six-Stage Import & Validation Pipeline (`/scripts/import-book.ts`)

### Stage 1 — Private Extraction
- Reads the private book file from `/private/books/` (never committed to Git, never placed in `client/public`, `client/dist`, or public Firebase Storage).
- Extracts every programming exercise chapter by chapter into `/private/review/extracted-exercises.json` (excluded by `.gitignore`) with fields:
  - `bookTitle`, `edition`, `chapterNumber`, `chapterTitle`, `exerciseNumber`, `pageNumber`, `rawExtractedText`.

### Stage 2 — 3-Class Classification (`A`, `B`, `C`)
Every extracted item is deterministically classified into one of three classes:
- **Class A (`JUDGEABLE_DIRECT`)**: Already specifies deterministic `stdin` / `stdout` behavior checkable by the C11 judge.
- **Class B (`JUDGEABLE_REWRITE`)**: Core C programming exercise that requires defining explicit `stdin` / `stdout` formatting and constraints so the automated C11 judge can evaluate it.
- **Class C (`NON_JUDGEABLE`)**: Theory questions, definitions, MCQs, output-prediction snippets, diagrams, or open-ended case studies. **Class C items are never dropped silently**—they are exported into `/docs/CONTENT_REPORT.md` for human owner decision (e.g., whether to convert selected items into upload-based exercises later).

### Stage 3 — Original-Wording Draft Conversion (Classes `A` & `B`)
- Converts each Class A and Class B exercise into a LogicQ `DRAFT` problem:
  - **Original Wording**: Rewritten from scratch with new narrative context, variable names, and sample numbers (see [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md)).
  - **Structured Specification**: Markdown problem statement, input format, output format, constraints, difficulty (`EASY` = 20–25 PTS, `MEDIUM` = 40–50 PTS, `HARD` = 70–80 PTS), and topic tags derived from the chapter.
  - **Test Suite**: $\ge 2$ visible sample test cases + $\ge 5$ hidden edge-case test cases (minimum/maximum bounds, zero/negative values, boundary conditions).
  - **Reference & Wrong C Solutions**: 1 standard C11 reference solution (`gcc -O2 -std=c11 -Wall`) + 2 deliberately wrong C11 solutions (e.g., off-by-one and naive overflow/wrong-operator variants).
  - **Admin-Only Source Metadata (`sourceRef`)**: `{ bookTitle, chapterNumber, chapterTitle, exerciseNumber, pageNumber }` stored strictly in admin-only fields and stripped from all student/public API responses.

### Stage 4 — Automated 1-Pass / 2-Fail Judge Validation Gate
- Runs every `DRAFT` problem through the real `LocalGccJudge` (`validateProblemGate`):
  1. Reference C11 solution **must pass 100%** of visible and hidden test cases within time/memory limits.
  2. Both deliberately wrong C11 solutions **must fail** at least one test case.
- Any problem that fails this gate remains `DRAFT` and is flagged in `/docs/CONTENT_REPORT.md` for manual review.

### Stage 5 — Human Admin Review & Approval Gate
- In the Admin Dashboard (`Problems & Book Review`), administrators inspect each `DRAFT` alongside its admin-only `sourceRef` (`Chapter X, Exercise Y`), edit statement/tests if needed, and explicitly mark it **`VALIDATED` / `PUBLISHED`** or **`REJECTED`**.
- Only problems explicitly approved by the project owner transition to `PUBLISHED`.

### Stage 6 — Chapter-Ordered Weekly Scheduling & Pool Exhaustion Protection
- **Chapter-Ordered Queue**: Daily challenges unlock at **`17:00 IST`** following the book's chapter sequence, rising from `EASY` to `MEDIUM`/`HARD` within each Monday-to-Monday week and assigning the chapter topic as the week's theme.
- **Auto-Pick From Book Pool Only**: If a day has no manual schedule, the `17:00 IST` job auto-picks the next unused `PUBLISHED` problem where `sourceType === 'BOOK'` in chapter order and writes an `/admin_audit_logs` entry.
- **14-Day Low-Pool Alert & `Season Complete` State**:
  - When fewer than **14 unused approved book problems** remain, the Admin Dashboard displays a prominent low-pool warning banner.
  - If the approved book pool reaches `0`, the Daily Challenge page displays a clean **"Season Complete"** state instead of repeating problems or falling back to non-book content.

---

## 3. Action Required From User Before Running Import

1. Attach or place the designated book file at `/private/books/<filename>` and specify `[BOOK TITLE, AUTHOR, EDITION]`.
2. Confirm whether any currently seeded problems should be kept (`default: none — all 16 current problems will be marked RETIRED upon import`).
3. Confirm approval of this pipeline (`/docs/CONTENT_PIPELINE.md`) and [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md).
