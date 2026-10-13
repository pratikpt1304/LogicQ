# LogicQ Book-Only Content Pipeline Specification (`/docs/CONTENT_PIPELINE.md`)

> **STATUS**: `BOOK PIPELINE ACTIVE — SYSTEM PAUSED`  
> **Source**: *"Test Your C Skills"* by Yashavant Kanetkar  
> **Storage**: `/private/book/` (git-ignored, strictly local)  
> **Current Mode**: `dailyChallengePaused = true` (Schedule Empty)

---

## 1. Authoritative Book Source Policy

1. **Sole Source of Daily Pool**:
   - The daily challenge pool is exclusively derived from *"Test Your C Skills"* by Yashavant Kanetkar.
   - Zero AI-invented problems outside the book are permitted.
   - The automated fallback auto-pick mechanism may select only approved problems from this verified pool.
   - If the pool is ever exhausted, the platform displays the **"Season complete"** state—never external or unapproved content.
   - The Admin dashboard displays a warning banner when fewer than **14 validated challenges** remain unscheduled.
2. **Retirement of Legacy Daily Problems**:
   - All pre-existing daily challenges are transitioned to `status = 'RETIRED'` (never deleted).
   - Historical submissions, scores, daily summaries, and streaks attached to past dates remain intact.
   - Retired problems are permanently excluded from future schedules and fallback pickers.
3. **Daily System Pause State**:
   - While `dailyChallengePaused = true`, the schedule remains completely empty.
   - No challenge is unlocked or scheduled.
   - Students see a neutral banner: *"Daily challenges are not live yet. We will announce the start."*

---

## 2. Six-Stage Extraction & Validation Pipeline

### Stage 1: Local PDF Extraction & OCR Audit
- Reads the book PDF locally from `/private/book/`.
- Extracts all programming exercises chapter by chapter from Chapter 1 to Chapter 14 (A through Z).
- Outputs a private, git-ignored review extract `/private/review/extracted-book-exercises.json` with fields:
  `{ chapterNumber, chapterTitle, exerciseNumber, pageNumber, rawPrompt, ocrQualityScore }`.
- Logs OCR quality and flags any character ambiguities.

### Stage 2: Three-Tier Classification (Classes A, B, C)
Every item is categorized into:
- **Class A (`JUDGEABLE_DIRECT`)**: Exercises that already imply a standard I/O algorithmic problem. Converted directly.
- **Class B (`JUDGEABLE_REWRITE`)**: Conceptual exercises (e.g., function bodies or pointer manipulations) that can be formulated as a complete deterministic program with `stdin` and `stdout`. Converted with clear specifications.
- **Class C (`NON_JUDGEABLE_IN_ORIGINAL_FORM`)**: Output-prediction snippets, find-the-bug puzzles, syntax oddities, and theoretical questions.
  - *Rule*: For each Class C item, LogicQ drafts either:
    1. A proposed rewrite into a judgeable program testing the same core concept (e.g., operator precedence or bitwise behavior), OR
    2. A recommendation to "skip".
  - *Gate*: No Class C item is published without explicit user decision.

### Stage 3: Original-Wording Problem Authoring
For every Class A and approved Class B/C problem:
- **Original Wording**: Fresh narrative, new variable names, fresh story, and new context (zero verbatim text).
- **Standard I/O Contract**: Explicit `stdin` and `stdout` formats with boundary constraints.
- **Test Suites**:
  - Exactly 2 visible sample test cases.
  - At least 8 hidden test cases (minimum 10 total) covering zero values, negative numbers, maximum limits, and edge inputs.
- **C11 Reference & Wrong Solutions**:
  - 1 standard C11 reference solution (`gcc -std=c11 -O2 -Wall`).
  - 2 deliberately wrong solutions (e.g., off-by-one bug, overflow bug, missing edge check).
- **Admin-Only Source Reference (`sourceRef`)**:
  - `{ book: "Test Your C Skills", author: "Yashavant Kanetkar", chapterNumber, exerciseNumber, pageNumber }`.
  - Excluded from all student-facing endpoints and verified by CI tests.
- **Points by Difficulty**: `EASY` = 20 PTS, `MEDIUM` = 30 PTS, `HARD` = 50 PTS.

### Stage 4: Automated GCC 1-Pass / 2-Fail Validation Gate
Every candidate problem undergoes automated compilation and execution using `LocalGccJudge`:
1. Reference solution **passes 100%** of sample and hidden tests within time (1000ms) and memory (64MB) limits under sanitizers.
2. Both wrong solutions **fail at least 1 test case**.
3. Output is verified to be completely deterministic (no dependencies on memory addresses, uninitialized variables, timing, or random numbers).
Any problem failing this gate remains `DRAFT` and is logged in `/docs/CONTENT_REPORT.md`.

### Stage 5: Chapter-by-Chapter Batch Review & Reporting
- Content is processed in batches by chapter.
- After each batch, `/docs/CONTENT_REPORT.md` is updated with counts by difficulty, status, titles, Class C proposals, and duplicate checks against the 40 Practice problems.
- All problems remain `DRAFT` or `VALIDATED` until explicit user approval for publishing.

### Stage 6: Audited Production Import & Resuming
- No seed scripts are run on production.
- Production content is imported exclusively via an audited admin import artifact (`server/src/data/daily-book-problems-import.json`).
- Resuming the daily system is a separate, manual admin action requiring:
  1. System owner command to resume.
  2. At least 14 validated book problems scheduled in chapter sequence.
  3. Admin re-authentication and audit log entry.
