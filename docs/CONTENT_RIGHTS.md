# LogicQ Content Rights, Copyright & Original-Wording Policy (`/docs/CONTENT_RIGHTS.md`)

> **STATUS**: `STRICT ORIGINAL-WORDING MODE ACTIVE (ZERO VERBATIM COPYING)`  
> **Source Material**: *"Test Your C Skills"* by Yashavant Kanetkar.  
> **Storage & Privacy Location**: `/private/book/` (local only, strictly excluded from Git, Hosting, Storage, client bundles, backups, and 3rd-party APIs).  
> **Rights Default**: No written license from the author or publisher is confirmed. LogicQ strictly enforces non-infringing transformative authoring.

---

## 1. Authoritative Rights Policy & Prohibitions

1. **Zero Verbatim Copying**:
   - Never copy question text, code snippets, diagrams, figures, examples, answers, or explanations verbatim from the book.
   - Every LogicQ problem statement is authored from scratch with original narrative context, original variable names, fresh data types, and freshly created input/output formats.
2. **Book's Role**:
   - The book serves solely as the source of:
     - Core programming concepts (e.g., operator precedence, pointer arithmetic, recursion mechanics, struct padding).
     - Chapter sequence and syllabus progression.
     - Calibrated difficulty benchmarks.
   - The book's printed answers are used strictly to verify the correctness of LogicQ's independent C11 reference solutions, and are never displayed or stored in student-accessible assets.
3. **Admin-Only Metadata Boundary (`sourceRef`)**:
   - Any provenance reference (`bookTitle: "Test Your C Skills"`, `author: "Yashavant Kanetkar"`, `chapterNumber`, `exerciseNumber`, `pageNumber`) must be stored strictly in private, admin-only metadata.
   - **No student-facing field** (title, description, input format, output format, hints, error messages, client code, API responses, or notification templates) may ever contain the words "Kanetkar", "Test Your C Skills", "Chapter", "Exercise", or page numbers.
   - Automated CI and test scripts search all problem payloads before publishing and block any problem containing source references.

---

## 2. Classification & Problem Adaptation Standard

Every problem extracted from the book is classified into one of three tiers:
- **Class A (`JUDGEABLE_DIRECT`)**:
  - The underlying concept can be directly formulated as a deterministic standard I/O (`stdin` $\rightarrow$ `stdout`) C program checkable by the automated judge.
  - Converted with original wording, 2 visible samples, $\ge 8$ hidden test cases, a C reference solution, and 2 deliberately failing wrong solutions.
- **Class B (`JUDGEABLE_REWRITE`)**:
  - A programming exercise requiring adaptation into an input/output specification (e.g., converting a function specification into a complete deterministic program with bounds and edge cases).
  - Converted with clear constraints and original test cases.
- **Class C (`NON_JUDGEABLE_IN_ORIGINAL_FORM`)**:
  - Output prediction snippets, syntax error puzzles, theory questions, and open-ended case discussions.
  - Must NOT be published in their original form.
  - For each Class C item, LogicQ drafts a proposed transformation into a judgeable program testing the same concept, or marks it "skip", subject to explicit project owner decision.

---

## 3. Storage, Git Exclusion & Leak Prevention

1. **Local File Path**: `/private/book/` (and `/private/review/` for extraction logs).
2. **Git Exclusion**: Covered by root `.gitignore` (`private/`).
3. **No Network Transmission**: The raw book PDF and extracted snippets must never be committed to Git, uploaded to Firebase Hosting or Cloud Storage, bundled into the Vite client distribution, included in database backups, or passed to external AI APIs.
4. **Automated Leak Scanning**: All client bundles, Firestore security rules, and API endpoints are verified via automated regression tests to guarantee zero source citations or unreleased problem data reach the student interface.
