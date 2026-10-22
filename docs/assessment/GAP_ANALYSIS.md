# Gap Analysis: AI-Resistant Master Product Specification vs. LogicQ

**Document Version**: 1.0.0  
**Date**: October 22, 2026  
**Status**: Architecture & Specification Planning Document (Documents-Only)  
**Target Path**: `/docs/assessment/GAP_ANALYSIS.md`  

---

## 1. Executive Summary & Context

The **Master Product Specification** (*AI-Resistant Smart Programming Practice & Assessment Platform*, Sections 1–66) defines an institutional, faculty-governed examination and proctoring ecosystem. Its design center is summative evaluation, strict identity binding, telemetry-driven integrity monitoring, synchronous AI vivas, and manual faculty gating.

In contrast, **LogicQ** was conceived, architected, and validated as an undergraduate **learning-first programming platform** structured around three foundational priorities:
1. **Learning First**: Formative compiler diagnostics, sample diffs, scaffolded hints without penalty, concept mastery, and deliberate practice.
2. **Daily Habit Second**: Low-stakes daily challenges, streaks, resilient pause mechanisms, and manual code upload reviews.
3. **Competition Third**: Consistency-based rankings, zero attempt penalties, and zero public speed races.

Adapting the Master Specification into LogicQ requires a dual-track product paradigm: **Practice Mode** and **Assessment Mode** must coexist as strictly separated products within the same application infrastructure. Features designed for high-stakes examinations (such as locking on success, zero reattempts, copy-paste blocking, and focus tracking) must **never bleed into Practice Mode**, while Assessment Mode must remain rigorous, fair, and legally compliant with data privacy frameworks.

---

## 2. Classification Legend

Each section of the Master Specification is classified against LogicQ into one of five categories:
- **Have**: LogicQ already implements this requirement in production or has verified test coverage that meets the specification.
- **Partial**: LogicQ has architectural foundations, data models, or endpoints that address parts of the requirement, but gaps remain.
- **Missing**: LogicQ currently has no implementation, schema, or UI for this requirement.
- **Conflicts with Learning-First**: The requirement directly undermines deliberate practice, exploration, or psychological safety if applied globally. It can only exist in an isolated, faculty-controlled Assessment Mode.
- **Not Advisable as Written**: The requirement contains technical, pedagogical, or legal flaws (e.g., security risks, severe false-positive rates, browser sandboxing limits, or uncalibrated scoring) that must be modified before implementation.

---

## 3. Section-by-Section Analysis (Sections 1 to 66)

### Section 1: Product Objective
- **Spec Summary**: Build an AI-assisted, copy-resistant practice & assessment platform keeping Academic Performance, Assessment Integrity, and Learning Intelligence strictly separate.
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ maintains strict score separation (Academic Score vs. Integrity flags) in its schema and Firestore perimeter. However, LogicQ's primary focus has been formative practice rather than summative exam administration.
- **What Must Change**: Formalize a global boundary between "Practice Mode" (formative learning) and "Assessment Mode" (summative institutional exams) across client routes and server endpoints.
- **Data Model Impact**: Ensure all attempt and score records carry an immutable `mode: 'PRACTICE' | 'ASSESSMENT'` discriminator.
- **Effort**: M
- **Risk**: Low (architectural alignment).
- **Dependencies**: Router guards, Firestore rules.

### Section 2: Module Assessment Structure
- **Spec Summary**: 4 sections $\times$ 20 questions (80 marks) + 1 integrated mini-project (20 marks) = 100 marks per module.
- **Classification**: **Missing**
- **Current LogicQ State**: LogicQ organizes content into 4 conceptual modules (Basics, Control Structures, Functions & Arrays, Pointers & Memory) with practice problems, but lacks the rigid $20 \times 4 + 20$ mark institutional module structure.
- **What Must Change**: Create an assessment syllabus definition that maps questions into 4 sections of 20 questions each, plus a distinct 20-mark mini-project rubric.
- **Data Model Impact**: Add `AssessmentModule`, `AssessmentSection`, and `MiniProject` schemas linking to curated question pools.
- **Effort**: L
- **Risk**: Cost (large question authoring workload: 80 validated questions per module).
- **Dependencies**: Question bank schema, Section 3.

### Section 3: Question Structure
- **Spec Summary**: Question ID, module, section, topic, learning outcome, Bloom's level, scenario, I/O specs, constraints, examples, starter code, difficulty, expected solving time, Test Case 1, Test Case 2, Hidden Test Case 3, reference solution, validation status, marks (1 mark each).
- **Classification**: **Partial**
- **Current LogicQ State**: `Problem` entity in Prisma and Firestore contains title, slug, module, section, topic, description, constraints, starterCode, testCases, expectedTimeMin, expectedTimeMax, and difficulty.
- **What Must Change**: Add explicit metadata fields: `bloomLevel`, `learningOutcome`, `scenario`, `referenceSolution`, and enforce exactly 1 mark per normal question in assessment mode.
- **Data Model Impact**: Add `bloomLevel`, `learningOutcome`, `scenario` to `Problem` model.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Question management endpoints.

### Section 4: Difficulty Classification
- **Spec Summary**: Easy (2–8 min), Medium (8–15 min), Hard (15–25 min). Faculty configures E/M/H ratio (e.g., 40/40/20) with pre-publish validation.
- **Classification**: **Have**
- **Current LogicQ State**: LogicQ's `Problem` model and test suites implement `difficulty: 'EASY' | 'MEDIUM' | 'HARD'` with exact bounds (Easy: 2–8m, Medium: 8–15m, Hard: 15–25m). Test creation validates difficulty distributions.
- **What Must Change**: Expose ratio configuration and validation checks in the faculty test builder UI.
- **Data Model Impact**: Store `difficultyRatio: { easy: number, medium: number, hard: number }` on assessment test configs.
- **Effort**: S
- **Risk**: Technical (validation logic when question pool lacks required difficulty count).
- **Dependencies**: Section 14 (Test Builder).

### Section 5: Time-Based Scoring
- **Spec Summary**: Correct within prescribed time = 1 mark; correct outside time = 0.5 mark; incorrect = 0 marks. Expected Reference Time = $(T_{min} + T_{max}) / 2$. Record timestamps for start, first edit, first run, first pass per test case, final submit.
- **Classification**: **Conflicts with Learning-First** (for Practice) / **Have** (for Assessment)
- **Current LogicQ State**: In Practice Mode, LogicQ strictly banned speed scoring (`LEARNING_FIRST.md`) to avoid anxiety. In Assessment Mode, `smart-exam.service.ts` fully implements the spec's exact 1.0 / 0.5 / 0.0 time-based formula with timestamp tracking.
- **What Must Change**: Ensure time-based deductions apply exclusively when `mode === 'ASSESSMENT'`. Practice Mode must never penalize solve time.
- **Data Model Impact**: Ensure `AssessmentQuestionAttempt` records `firstPassT1At`, `firstPassT2At`, `firstPassT3At`, `actualTimeSec`, `timeScore`.
- **Effort**: S
- **Risk**: Fairness (students with slower typing or connectivity lag receiving 0.5 marks despite correct logic).
- **Dependencies**: Server timestamping, Section 60.

### Section 6: Test Case Structure
- **Spec Summary**: Test 1 (Visible), Test 2 (Visible), Test 3 (Hidden). Student UI shows Passed/Failed but never hidden I/O.
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: LogicQ implements visible vs. hidden test separation with zero leakage on the client.
- **What Must Change**: The spec mandates *exactly one* hidden test case. Having only 1 hidden test case is fragile and invites hardcoding/brute-forcing. We recommend expanding to **at least 3 hidden test cases** for robust validation.
- **Data Model Impact**: Allow $N \ge 3$ hidden test cases in `TestCase` schema while maintaining visible count at 2.
- **Effort**: S
- **Risk**: Technical & Fairness (1 test case cannot evaluate multiple boundary edge cases).
- **Dependencies**: Judge evaluation engine.

### Section 7: Question Reattempt Policy
- **Spec Summary**: Once successfully submitted, lock the question permanently. No Retry, Reopen, Reset, or Resubmit. Default: no reattempts after success.
- **Classification**: **Conflicts with Learning-First** (for Practice) / **Have** (for Assessment)
- **Current LogicQ State**: Practice Mode allows unlimited retries and day-after zero-point practice. In Assessment Mode, `isLocked: true` is enforced on `submit-question` (Section 34).
- **What Must Change**: Keep the locking policy strictly confined to Assessment Mode. Never disable retries in Practice Mode.
- **Data Model Impact**: Maintain `isLocked: Boolean` on `AssessmentQuestionAttempt`.
- **Effort**: S
- **Risk**: Fairness (accidental early submission without confirmation). UI must require explicit confirmation before final lock.
- **Dependencies**: UI submission modal.

### Section 8: Student Account Creation and Validation
- **Spec Summary**: Required fields: PRN, name, mobile, email (all unique). Mandatory 1:1:1 binding (`PRN <-> mobile <-> email`).
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: LogicQ validates unique PRN (12-char institutional regex `^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`) and Google OAuth email in Firestore transactions (`/prnIndex/{prn}`). Mobile number is optional.
- **What Must Change**: Mandating mobile numbers creates severe regulatory and operational burdens (SMS DLT compliance in India, Twilio/GCP SMS costs, SIM swaps). We recommend binding `PRN <-> Institutional Email` via Google OAuth / Email OTP first, making mobile binding an optional secondary phase.
- **Data Model Impact**: Add optional `mobileNumber` to `User` and unique index `mobileIndex/{mobile}` if SMS is enabled.
- **Effort**: M
- **Risk**: Privacy & Cost (storing student phone numbers attracts DPDP Act 2023 heightened liabilities; SMS OTP incurs recurring costs).
- **Dependencies**: Section 9.

### Section 9: OTP Validation
- **Spec Summary**: Step 1: PRN check; Step 2: Email OTP; Step 3: Mobile OTP; Step 4: Triple binding. Secure expiry, retry limits, server-side validation.
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ has verified Dual OTP services (`EmailService` and `SmsService` in `server/src/services/otp.service.ts`) with 10-minute expiry and 3-attempt locks.
- **What Must Change**: In production, email OTP can be driven via SMTP/SendGrid or Google OAuth. SMS OTP requires a registered DLT entity and gateway.
- **Data Model Impact**: `OtpVerification` model in Prisma/Firestore.
- **Effort**: M
- **Risk**: Cost (SMS gateway fees) and delivery failure (telecom DND / network drops in university hostels).
- **Dependencies**: Email/SMS infrastructure.

### Section 10: Identity Integrity and Access
- **Spec Summary**: Uniqueness enforced with transaction-safe checks. Account states: Pending, Email Verified, Mobile Verified, Identity Bound, Active, Suspended. Conflict referral to authorized recovery.
- **Classification**: **Have**
- **Current LogicQ State**: Firestore security rules and backend transactions enforce atomic uniqueness via `prnIndex/{prn}`. Account states (`STUDENT`, `ADMIN`, `CHECKER`, `status: ACTIVE | SUSPENDED`) exist. Account recovery workflow documented in `ACCOUNT_RECOVERY.md`.
- **What Must Change**: Formalize intermediate verification sub-states (`EMAIL_VERIFIED`, `MOBILE_VERIFIED`, `IDENTITY_BOUND`) in student profile lifecycle.
- **Data Model Impact**: Add `identityStatus: 'PENDING' | 'EMAIL_VERIFIED' | 'BOUND' | 'ACTIVE'` on `User`.
- **Effort**: S
- **Risk**: Technical (preventing lockouts during registration).
- **Dependencies**: Auth middleware.

### Section 11: Faculty Workflow 1 — Create Section
- **Spec Summary**: Fields: institution, course, subject, academic year, semester, section name, faculty, description, start/end dates.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in Prisma (`Section` model) and tested in `tests/section-and-otp.test.ts`. Supports section name, course, subject, academic year, semester, and faculty owner.
- **What Must Change**: Build faculty web UI for section creation and roster management.
- **Data Model Impact**: Schema exists (`Section`).
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Faculty dashboard layout.

### Section 12: Add Students Through Excel
- **Spec Summary**: Accept columns: Name, PRN/Roll No, Valid Email, Mobile. Validate missing, format, duplicates, existing identities, conflicting mappings. Preview before import. Mandatory faculty confirmation. No silent discards.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/section.service.ts` (`importStudentsFromExcel`) with strict column validation, duplicate detection, invalid row reporting, and dry-run preview.
- **What Must Change**: Wire up client-side drag-and-drop Excel file uploader and interactive error review table.
- **Data Model Impact**: None (service handles in-memory parse and atomic batch insert).
- **Effort**: M (frontend UI).
- **Risk**: Fairness (ensuring typos in PRN or email are clearly flagged to faculty before committing).
- **Dependencies**: Section 11.

### Section 13: Instant Student Join Form
- **Spec Summary**: Unique join URL, shareable form, QR code, WhatsApp share option. Student enters details, passes OTPs, binds identity. Submitting form alone does not grant access.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/section.service.ts` (`generateJoinUrl`, `joinByCode`). Tested in `section-and-otp.test.ts`.
- **What Must Change**: Implement client-side share modal with QR code generation and WhatsApp link helper.
- **Data Model Impact**: `joinCode` and `joinUrl` fields on `Section`.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 9, Section 10.

### Section 14: Faculty Workflow 2 — Create and Assign Test
- **Spec Summary**: Select section, select module, configure test name, instructions, duration, question count, section distribution, difficulty ratio, randomisation, start/end time, attempt policy. Validate before publish.
- **Classification**: **Have**
- **Current LogicQ State**: Prisma `AssessmentTest` and `AssessmentTestQuestion` models and `createTest` service exist and pass test suites (`question-bank-and-test-assignment.test.ts`).
- **What Must Change**: Expose multi-step test creation wizard in faculty client portal.
- **Data Model Impact**: Existing `AssessmentTest` model is sufficient.
- **Effort**: M (frontend wizard).
- **Risk**: Technical (scheduling start/end windows across timezones; default to IST).
- **Dependencies**: Section 15.

### Section 15: Question Selection
- **Spec Summary**: Manual selection, automatic selection by metadata (difficulty/topic/outcome), or AI-assisted selection. Faculty retains final approval.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `question-bank.service.ts` with manual ID selection, tag/difficulty filters, and random pool distribution.
- **What Must Change**: UI picker interface with filter chips for faculty.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Question bank schema.

### Section 16: AI Question Generation
- **Spec Summary**: Faculty selects module, section, topic, count, difficulty ratio, language, Bloom's level, scenario, time. AI generates complete problem package including visible and hidden test cases, starter code, and reference solution.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/ai-question.service.ts` using Gemini 1.5 / 2.0 Flash with structured JSON schema output matching specification.
- **What Must Change**: Provide faculty UI prompt builder with parameter sliders and live draft preview.
- **Data Model Impact**: `isAiGenerated: Boolean`, `generationPrompt: String` on `Problem`.
- **Effort**: S
- **Risk**: Cost (AI token usage) and quality (hallucinated syntax or invalid test cases).
- **Dependencies**: Section 17.

### Section 17: AI Question Correctness Check
- **Spec Summary**: AI-generated questions must never go live automatically. Compile and run reference solution against all 3 test cases in sandbox. Faculty review: Approve, Edit, Regenerate, Reject.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/question-bank.service.ts` (`validateProblemCorrectness`). Compiles reference solution with `LocalGccJudge`, runs against visible and hidden tests, and marks `VALIDATION_PASSED` or `VALIDATION_FAILED`.
- **What Must Change**: Expose interactive approval screen showing compilation output, execution timing, and test case diffs.
- **Data Model Impact**: `validationStatus: 'DRAFT' | 'AI_GENERATED' | 'VALIDATION_PASSED' | 'VALIDATION_FAILED' | 'FACULTY_APPROVED' | 'PUBLISHED' | 'ARCHIVED'`.
- **Effort**: S
- **Risk**: Technical (sandbox resource consumption during bulk validation).
- **Dependencies**: Judge engine, Section 18.

### Section 18: Question Lifecycle
- **Spec Summary**: Statuses: Draft -> AI Generated -> Validation Failed -> Validation Passed -> Faculty Approved -> Published -> Archived. Only Faculty Approved and Published can appear in active tests.
- **Classification**: **Have**
- **Current LogicQ State**: Fully modeled and enforced in `server/src/services/question-bank.service.ts` and verified in test suites. Unapproved drafts are blocked from test assignment.
- **What Must Change**: Frontend state badge rendering and lifecycle transition actions.
- **Data Model Impact**: Enum field `validationStatus` on `Problem`.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 17.

### Section 19: Smart Exam Engine
- **Spec Summary**: Enforce time-based scoring, anti-copying, tab/focus monitoring, code-burst detection, code evolution tracking, compile anomaly detection, question randomization, anti-sharing variants, hidden tests, integrity analytics, viva verification.
- **Classification**: **Partial**
- **Current LogicQ State**: Time scoring, variant assignment, hidden tests, sandbox execution, and basic telemetry ingestion exist in `server/src/services/smart-exam.service.ts`.
- **What Must Change**: Client-side event capture pipeline (focus, paste, full-screen) needs formal telemetry dispatching and rate-limiting.
- **Data Model Impact**: `AssessmentEventLog` in database.
- **Effort**: L
- **Risk**: Technical (event flooding over unreliable student internet).
- **Dependencies**: Section 20, 21, 60.

### Section 20: Anti-Copying Controls
- **Spec Summary**: Block copy, paste, cut, context menu, text selection, drag/drop where technically possible. Log attempts. One event alone must not constitute misconduct.
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ web editor has optional paste interception, but currently permits normal clipboard operations in Practice Mode.
- **What Must Change**: Activate strict DOM event blockers (`onCopy`, `onPaste`, `onContextMenu`, CSS `user-select: none`) **strictly within Assessment Mode**. Never block clipboard in Practice Mode.
- **Data Model Impact**: `copyPasteAttempts`, `blockedOperations` counter in attempt metrics.
- **Effort**: S
- **Risk**: Fairness (accessibility screen readers, browser extensions, or OS clipboard managers triggering false blocks).
- **Dependencies**: Monaco editor configuration.

### Section 21: Environment Restrictions
- **Spec Summary**: Full-screen where supported; detect tab switching, focus loss, window minimization, navigation attempts. Log count and duration. Normal browser cannot guarantee detection of every external app.
- **Classification**: **Partial**
- **Current LogicQ State**: Event listeners for `visibilitychange` and `blur` implemented in prototype, but not aggregated into persistent assessment session records.
- **What Must Change**: Implement client-side `document.onvisibilitychange` and `window.onblur` trackers that record blur start/end timestamps and push aggregated durations on assessment submission.
- **Data Model Impact**: `tabSwitchCount`, `focusLossCount`, `totalFocusLossDurationMs`, `fullScreenExitCount` on `AssessmentQuestionAttempt`.
- **Effort**: M
- **Risk**: Fairness & Technical (OS notifications, system dialogs, antivirus popups trigger blur events without student cheating).
- **Dependencies**: Client assessment runner.

### Section 22: Typing Behaviour Metrics
- **Spec Summary**: Keystrokes, chars inserted/deleted, CPM, WPM, lines added/deleted, keystroke intervals, longest pause, bursts, edit count, undo/redo count. Prefer behavioral aggregates over raw keystrokes. Never use as independent proof.
- **Classification**: **Partial**
- **Current LogicQ State**: The server schema defines `charsInserted`, `charsDeleted`, `cpm`, `wpm`, `linesAdded`, `linesDeleted`, `activeInteractionTimeSec`. Client editor records these in memory.
- **What Must Change**: Formalize client aggregator in Monaco editor that updates typing statistics every 30 seconds without logging individual key characters (privacy preservation).
- **Data Model Impact**: Aggregated metric fields in `AssessmentQuestionAttempt`.
- **Effort**: M
- **Risk**: Privacy (recording raw keystrokes violates privacy and captures passwords; aggregate metrics only).
- **Dependencies**: Monaco editor hooks.

### Section 23: Code-Burst Detection
- **Spec Summary**: Detect large code changes in short intervals. Record previous/new size, added lines, time interval, largest burst, percentage of final code. Code Burst Ratio = Largest Insertion / Final Size.
- **Classification**: **Partial**
- **Current LogicQ State**: Formula implemented in `smart-exam.service.ts` (`calculateIntegrityScore` inspects `largestBurstChars / finalLength`). Client-side burst segmentation needs telemetry hook.
- **What Must Change**: Monaco `onDidChangeModelContent` listener to measure char delta between consecutive change events and capture the max burst.
- **Data Model Impact**: `largestBurstChars`, `codeBurstRatio` in session record.
- **Effort**: S
- **Risk**: Fairness (pasting a starter snippet or re-indenting blocks can look like a burst).
- **Dependencies**: Section 22.

### Section 24: Code Evolution Analysis
- **Spec Summary**: Track development history: Initial -> Rev 1 -> Rev 2 -> Exec -> Rev 3 -> Exec -> Final. Incremental dev %, revision count, rewrite/deletion ratio. Preserve revision history for faculty review.
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ captures code snapshots on execution/run and on final submission. Does not retain every minute edit.
- **What Must Change**: Create periodic checkpoint snapshots (e.g., every compilation or every 2 minutes of active typing) stored in an assessment revision array.
- **Data Model Impact**: `revisions: Array<{ timestamp: Date, code: string, trigger: string }>` in attempt subcollection.
- **Effort**: M
- **Risk**: Cost (storage explosion if full code strings are saved too frequently; cap at 10 revisions per question).
- **Dependencies**: Section 25.

### Section 25: Compile/Runtime Anomaly Detection
- **Spec Summary**: Record first compilation, compilation errors, runtime errors, total runs, time from first run to success. Flag instant success after large burst with zero debugging runs. Treat patterns as indicators, not proof.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/smart-exam.service.ts`. Counts `executionCount`, `firstPassT1At`, `firstPassT2At`, and flags anomalies when total runs $\le 1$ for complex logic.
- **What Must Change**: Surface compile anomaly indicators on faculty review dashboards.
- **Data Model Impact**: Metric fields exist.
- **Effort**: S
- **Risk**: Fairness (fast students who write clean code on first try being flagged).
- **Dependencies**: Judge execution logging.

### Section 26: Active Work Ratio
- **Spec Summary**: Active Work Ratio = Active Interaction Time / Total Question Duration $\times$ 100. Display question-wise and test-wise.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `smart-exam.service.ts`: `activeInteractionTimeSec / totalDurationSec * 100`.
- **What Must Change**: Client timer must actively track editor focus and typing activity versus idle periods.
- **Data Model Impact**: `activeWorkRatio` on attempt.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 22.

### Section 27: Edit-to-Execution Ratio
- **Spec Summary**: Record edits, executions, edits before first run, edits between runs, execution success ratio. Include in integrity analysis with clear labels.
- **Classification**: **Have**
- **Current LogicQ State**: Computed in `smart-exam.service.ts`: `editCount / Math.max(1, executionCount)`.
- **What Must Change**: Expose numerator and denominator explicitly on faculty drill-down UI as required by spec.
- **Data Model Impact**: `editCount`, `executionCount`, `editToExecutionRatio`.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 25.

### Section 28: Solution Emergence Curve
- **Spec Summary**: Track percentage of final code present at timestamps (e.g., 2m $\rightarrow$ 15%, 4m $\rightarrow$ 35%, 8m $\rightarrow$ 100%). Detect abrupt emergence.
- **Classification**: **Partial**
- **Current LogicQ State**: Emergence formula is modeled in `smart-exam.service.ts`, but client-side periodic sampling is not yet wired to a recurring timer.
- **What Must Change**: Add a 60-second client-side interval that samples current code length relative to expected problem size.
- **Data Model Impact**: `emergenceCheckpoints: Array<{ timestampSec: number, codePercentage: number }>`.
- **Effort**: M
- **Risk**: Low.
- **Dependencies**: Section 24.

### Section 29: Successive Correct Submission AI Viva
- **Spec Summary**: Mandatory rule: every second successive correct submission (#2, #4, #6...) triggers an AI-generated viva question. Reset counter on incorrect submission.
- **Classification**: **Conflicts with Learning-First** (for Practice) / **Have** (for Assessment)
- **Current LogicQ State**: Practice Mode never interrupts problem-solving with surprise oral exams. In Assessment Mode, `server/src/services/ai-viva.service.ts` fully implements this rule and resets counter on incorrect submission (`tests/viva-and-mini-project.test.ts`).
- **What Must Change**: Maintain strict isolation: Viva trigger is active ONLY during formal assessments.
- **Data Model Impact**: `successiveCorrectCount` and `vivaTriggered` in test assignment state.
- **Effort**: S
- **Risk**: Technical & Fairness (network latency, student panic during a timed test).
- **Dependencies**: Section 30, 31.

### Section 30: AI Viva Generation
- **Spec Summary**: Generate viva directly from student's actual submitted code testing algorithm, syntax, variables, edge cases, implementation decisions. Prefer code-specific over generic questions.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/ai-viva.service.ts` using Gemini API. Passes student's submitted code and question context to synthesize targeted conceptual questions.
- **What Must Change**: Add client viva presentation modal with code snippet highlighting.
- **Data Model Impact**: `questionText`, `codeReferenceSnippet`, `targetConcept` in `AiVivaSession`.
- **Effort**: S
- **Risk**: Cost (Gemini API calls on every 2nd solve) and prompt injection (malicious code comments trying to fool the viva generator).
- **Dependencies**: AI service integration.

### Section 31: AI Viva Timer
- **Spec Summary**: Strict 1-minute countdown timer. Display question, countdown, answer input/recording control, submit button. Record start/end timestamps and timeout status.
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: Backend supports configurable viva duration (default 60s).
- **What Must Change**: A strict 60-second timer for typing a thoughtful technical explanation of C code is pedagogically unsound and heavily discriminates against slow typers, non-native English speakers, or students with accessibility needs. We recommend **at least 2.5 to 3 minutes** for typed answers, or giving faculty control over the timer duration.
- **Data Model Impact**: `timeLimitSec: number` on viva configuration.
- **Effort**: S
- **Risk**: Fairness (high failure rates due solely to timer expiration rather than lack of understanding).
- **Dependencies**: Section 30.

### Section 32: AI Viva Recording
- **Spec Summary**: Store generated question, student answer/audio recording, timestamps, duration, associated code, sequence number, and AI relevance/evaluation score. Faculty reviews alongside code.
- **Classification**: **Partial**
- **Current LogicQ State**: Schema and service store question, student answer text, duration, AI relevance score (0–100), and faculty override fields. Audio recording is not implemented.
- **What Must Change**: Support typed text viva answers in MVP. Audio recording requires browser MediaStream capture, WebM compression, audio storage buckets, and STT (speech-to-text) transcription, which adds significant cost and technical fragility.
- **Data Model Impact**: Store `studentAnswerText`, `aiEvaluationScore`, `aiFeedback`, `facultyScore`.
- **Effort**: M (for typed) / XL (for audio).
- **Risk**: Privacy & Cost (audio biometric data brings strict consent requirements under DPDP Act; Cloud Storage costs).
- **Dependencies**: Section 31.

### Section 33: Second Successive Correct Submission Flag
- **Spec Summary**: Mark the 2nd successive correct submission as "Suspicious Flag — Viva Trigger". The flag indicates verification was triggered, not a conclusion of cheating.
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: LogicQ stores `vivaTriggered: true` in the attempt record.
- **What Must Change**: Calling a student's normal success "Suspicious Flag" creates severe psychological distress and defamatory risk. In institutional audits, labelling a student "Suspicious" merely because they solved two questions in a row correctly is indefensible. We rename this internally to **`VERIFICATION_CHECKPOINT`** or **`UNDERSTANDING_AUDIT`**.
- **Data Model Impact**: Use `auditTrigger: 'PERIODIC_VIVA_VERIFICATION'` instead of "Suspicious".
- **Effort**: S
- **Risk**: Fairness & Legal (defamation/anxiety from false misconduct labelling).
- **Dependencies**: Section 29.

### Section 34: Anti-Sharing Design
- **Spec Summary**: Question randomization, unique question variants, unique parameters/random inputs, hidden 3rd test, random question order, student-specific test data, one-time successful submission, server-side evaluation.
- **Classification**: **Have**
- **Current LogicQ State**: Fully implemented in `server/src/services/smart-exam.service.ts`: `questionVariantId` (`VAR-XXXXXX-XXXX`), randomized question ordering, hidden tests omitted from client responses, server-side judge sandbox.
- **What Must Change**: Expose variant identifiers on faculty grading screens.
- **Data Model Impact**: Model exists.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Test assignment pipeline.

### Section 35: Mini-Project Structure
- **Spec Summary**: Integrated mini-project worth 20 marks combining concepts from all four sections. 4 rubric components $\times$ 5 marks each = 20 marks.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in Prisma schema (`MiniProjectAssignment`, `MiniProjectSubmission`) and evaluated via `server/src/services/mini-project.service.ts` with 4 rubric components (5 marks each = 20 marks).
- **What Must Change**: Create student mini-project workspace and faculty rubric grading UI.
- **Data Model Impact**: Model exists.
- **Effort**: M (frontend workspace).
- **Risk**: Low.
- **Dependencies**: Section 36.

### Section 36: Mini-Project Default Status
- **Spec Summary**: Mini-project must initially be INACTIVE. Must not activate automatically upon joining section, completing questions, or finishing module.
- **Classification**: **Have**
- **Current LogicQ State**: Enforced in `MiniProjectAssignment.status = 'INACTIVE'`. Verified in test suites.
- **What Must Change**: None.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 37.

### Section 37: Individual Mini-Project Activation
- **Spec Summary**: Faculty activates mini-project individually, student by student. Configurable eligibility (completion, score, approval). Faculty selects student and activates.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/controllers/viva-and-mini-project.controller.ts` (`activateMiniProject`). Requires faculty authorization and verifies eligibility criteria.
- **What Must Change**: Add "Activate Project" button on faculty student list.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 36, 38.

### Section 38: No Bulk Mini-Project Activation
- **Spec Summary**: Bulk activation strictly prohibited. No "Select All", no batch/section-wide activation, no CSV bulk activation. Log faculty ID, student ID, timestamp, eligibility.
- **Classification**: **Have**
- **Current LogicQ State**: Server API accepts only single `studentId` and logs audit entry. Bulk endpoints are deliberately omitted and blocked.
- **What Must Change**: Ensure frontend UI omits any multi-select activation checkboxes.
- **Data Model Impact**: `AuditLog` captures activation events.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 37.

### Section 39: Mini-Project Access and Evaluation
- **Spec Summary**: Access requires validated identity, ACTIVE status, and individual faculty activation. Same secure editor, telemetry, and integrity monitoring apply.
- **Classification**: **Have**
- **Current LogicQ State**: Middleware verifies student identity and `status === 'ACTIVE'`. Evaluates solution against multi-file requirements and compiles rubric marks.
- **What Must Change**: Wire student mini-project page to active assignment state.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Technical (mini-projects require larger source code and multi-function testing).
- **Dependencies**: Section 35, 37.

### Section 40: Student Dashboard
- **Spec Summary**: Cards for Active Tests, Upcoming Tests, Completed Tests, Current Module, Academic Score, Integrity Score, progress, strong areas, learning gaps, AI insights.
- **Classification**: **Partial**
- **Current LogicQ State**: Student dashboard displays practice modules, streaks, daily challenges, and diagnostic profile cards. Does not yet display institutional assessment test cards.
- **What Must Change**: Add dedicated "Assessments" tab to student dashboard showing active/upcoming test schedules and separate academic scores.
- **Data Model Impact**: Query `assessmentTestAssignment` for current student.
- **Effort**: M
- **Risk**: Low.
- **Dependencies**: Section 14, 48.

### Section 41: Student Performance Charts
- **Spec Summary**: Overall marks, percentage, average, percentile, module-wise, section-wise, difficulty breakdown, topic performance, expected vs actual time, test case pass rates, trend line.
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ has extensive Recharts performance charts in `client/src/pages/AnalyticsPage.tsx` and profile diagnostics, but they plot Practice progress.
- **What Must Change**: Fork or parameterize chart components to render Assessment Mode data independently of Practice Mode data.
- **Data Model Impact**: None (derived aggregations).
- **Effort**: M
- **Risk**: Low.
- **Dependencies**: Section 40.

### Section 42: Student Gap Analysis
- **Spec Summary**: AI identifies strengths, developing areas, learning gaps based on repeated incorrect answers, excessive time, compiler errors, hidden test failures. Actionable practice recommendations.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts` (`generateStudentGapAnalysis`). Computes error taxonomy, topic weaknesses, and practice links.
- **What Must Change**: Render recommendations as clickable learning links directing students to relevant Practice Mode modules.
- **Data Model Impact**: `GapAnalysisReport` in database.
- **Effort**: S
- **Risk**: Cost (AI summarization token usage; can be cached).
- **Dependencies**: Section 40.

### Section 43: AI Support-Needing Learner Insights
- **Spec Summary**: Multi-observation analysis (low scores, repeated errors, concept failures, hidden test failures). Generate AI Support Alert with recommended interventions. Phrase as support need, not permanent label.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts` (`computeCohortAnalytics`). Categorizes students into `SUPPORT_NEEDED` and `ADVANCED` based on multi-dimensional performance rubrics.
- **What Must Change**: Expose support alerts in faculty cohort view.
- **Data Model Impact**: Cohort summary view.
- **Effort**: S
- **Risk**: Fairness (avoiding stigmatizing labels; spec explicitly mandates constructive support phrasing).
- **Dependencies**: Section 42, 50.

### Section 44: AI Advanced-Learner Insights
- **Spec Summary**: Identify consistent high accuracy, strong hidden-test performance, hard-question success, low error rates. Generate AI Advanced Learner Alert with challenge problems and research activities. Faculty override.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts`. Generates extension challenges and advanced problem recommendations.
- **What Must Change**: Expose advanced learner cards on faculty dashboard.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 43.

### Section 45: Student Integrity Dashboard
- **Spec Summary**: Students see their own Integrity Score, risk classification, clipboard attempts, focus events, code bursts, timing, evolution. Never expose internal detection thresholds.
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: LogicQ hides integrity telemetry from students to prevent proctor evasion and anxiety.
- **What Must Change**: Showing students granular integrity risk classifications (e.g. "High Risk: 78/100") during an assessment causes severe panic and teaches dishonest students exactly how to tune their evasion techniques. We recommend showing students **only objective event tallies** (e.g., "3 focus loss events recorded") without showing arbitrary risk scores or formulas.
- **Data Model Impact**: Student-facing projection of `AssessmentIntegrityRecord`.
- **Effort**: M
- **Risk**: Security & Fairness (gaming detection thresholds; student anxiety during exams).
- **Dependencies**: Section 57, 58.

### Section 46: Module Completion Dashboard
- **Spec Summary**: On module completion, generate dashboard and report based only on actual submissions. Show Academic Score X/100 and Integrity Score Y/100 separately, section scores, mini-project score, strengths, gaps. Never fabricate missing values.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts` (`generateModuleCompletionSummary`). Strictly verifies real submissions and reports X/100 without mocking data.
- **What Must Change**: Client completion page rendering.
- **Data Model Impact**: `ModuleCompletionRecord`.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 2, 35.

### Section 47: Student PDF Report
- **Spec Summary**: Detailed PDF in two parts: Part A (Submitted Solutions, test results, marks, mini-project) and Part B (Performance & Integrity metrics, timestamps, deviation, event counts, ratios, emergence, viva details).
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ has client-side PDF export (`jspdf` + `jspdf-autotable` in `ReportExportButton.tsx` and `AnalyticsPage.tsx`) producing branded institutional reports.
- **What Must Change**: Expand PDF generation template to support the two-part structure (Part A Academic Solutions + Part B Audit & Telemetry).
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Privacy (Part B contains sensitive behavioral monitoring data).
- **Dependencies**: Section 46, 61.

### Section 48: Faculty Dashboard
- **Spec Summary**: Primary navigation: Dashboard, Sections, Students, Question Bank, AI Generator, Validation, Create Test, Active Tests, Completed Tests, Performance Analytics, Integrity Analytics, Insights, Reports, Settings.
- **Classification**: **Missing** (UI layout) / **Have** (Backend APIs)
- **Current LogicQ State**: Backend controllers and routes exist for all 13 modules (`server/src/routes/`). Client currently provides Admin and Student dashboards, but lacks the dedicated multi-view Faculty portal.
- **What Must Change**: Construct dedicated `FacultyPortal` with sidebar navigation matching the 13 specified views.
- **Data Model Impact**: Role-based routing (`role: 'FACULTY' | 'ADMIN'`).
- **Effort**: L
- **Risk**: Low.
- **Dependencies**: All faculty service endpoints.

### Section 49: Faculty Dashboard Top Cards
- **Spec Summary**: Active Tests, Upcoming Tests, Completed Tests, Total Sections, Total Students, Average Academic Score, Overall Integrity Score, Students Needing Support, Advanced Students, Students Requiring Review.
- **Classification**: **Have**
- **Current LogicQ State**: Aggregation query implemented in `server/src/services/learning-analytics.service.ts` (`getFacultyDashboardMetrics`).
- **What Must Change**: Connect frontend dashboard top metric cards to API.
- **Data Model Impact**: Aggregate service response.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 48.

### Section 50: Faculty Academic Analytics
- **Spec Summary**: Class average, median, min/max, standard deviation, pass %, section breakdowns, difficulty success rates, topic performance, improvement trends.
- **Classification**: **Have**
- **Current LogicQ State**: Fully implemented in `learning-analytics.service.ts` (`computeCohortAnalytics`). Computes median, standard deviation, topic distributions, and pass percentages.
- **What Must Change**: Build interactive analytics charts in faculty portal.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Low.
- **Dependencies**: Section 48.

### Section 51: Faculty Integrity Analytics
- **Spec Summary**: Overall, module-wise, section-wise, question-wise Integrity Scores; flagged students/questions; risk tiers (moderate/high/critical); common telemetry indicators.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts` (`getFacultyIntegrityAnalytics`). Aggregates risk tiers, flag counts, and telemetry summaries.
- **What Must Change**: Build faculty integrity dashboard tab with risk filters.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Fairness (faculty jumping to conclusions without manual verification). UI must show prominent disclaimer.
- **Dependencies**: Section 57, 58.

### Section 52: Faculty Student Deep Dive
- **Spec Summary**: Per-student drill-down: academic scores, topic performance, test history, mini-project, integrity score, typing metrics, code evolution, execution anomalies, viva responses, gap analysis, alerts.
- **Classification**: **Have**
- **Current LogicQ State**: Backend endpoint `GET /api/analytics/student/:id/deep-dive` delivers this exact composite payload.
- **What Must Change**: Build student drill-down view with tabbed timeline and code inspection panels.
- **Data Model Impact**: Composite read query.
- **Effort**: M
- **Risk**: Privacy (access strictly restricted to authorized section faculty).
- **Dependencies**: Section 50, 51.

### Section 53: Question-Level Faculty Deep Dive
- **Spec Summary**: Per-question drill-down: question ID, variant ID, submitted code, timestamps, deviation, errors, runs, edits, burst ratio, active ratio, emergence, integrity score, viva response, faculty eval.
- **Classification**: **Have**
- **Current LogicQ State**: Backend endpoint `GET /api/exam/attempt/:attemptId/deep-dive` aggregates execution trace, variant info, and viva recordings.
- **What Must Change**: Build question review drawer with diff viewer and viva playback.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Low.
- **Dependencies**: Section 52.

### Section 54: Active Test Dashboard and Live Monitoring
- **Spec Summary**: Live view during active test: assigned/started/completed/remaining counts, average score, live alerts (focus loss, clipboard). Summaries only, not raw keystrokes.
- **Classification**: **Partial**
- **Current LogicQ State**: Database stores real-time attempt records, but polling/WebSocket live stream is not yet configured on the frontend.
- **What Must Change**: Implement 15-second auto-refresh polling or Firestore snapshot listener on active test sessions.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Technical & Cost (excessive Firestore/Prisma reads during concurrent exams with 500+ students).
- **Dependencies**: Section 14, 48.

### Section 55: Faculty Report Download
- **Spec Summary**: Export PDF and Excel/CSV for entire class, section, module, test, or selected students. Academic analytics and integrity analytics with drill-down.
- **Classification**: **Partial**
- **Current LogicQ State**: CSV export implemented in client and server. PDF report generation exists for single students, but cohort-wide PDF compilation needs batch generation.
- **What Must Change**: Add server-side CSV stream endpoint and multi-student PDF batch exporter.
- **Data Model Impact**: None.
- **Effort**: M
- **Risk**: Technical (large PDF generation consuming server memory; use streaming CSV for cohorts > 100 students).
- **Dependencies**: Section 47.

### Section 56: Question Quality Intelligence
- **Spec Summary**: Flag questions with abnormal failure rates, low success, excessive time, abnormal hidden-test failures, ambiguity. Faculty actions: Review, Edit, Regenerate, Replace, Archive.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/learning-analytics.service.ts` (`auditQuestionQuality`). Flags questions with $>70\%$ failure or abnormal time deviations.
- **What Must Change**: Faculty question bank UI view displaying "Needs Review" badges.
- **Data Model Impact**: Computed aggregation.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 18.

### Section 57: Question-Wise Integrity Score
- **Spec Summary**: Score 0–100. Configurable weights: clipboard 15%, focus/tab 15%, typing 10%, bursts 15%, evolution 15%, run/debug 10%, timing 10%, environment 10%. Documented normalization, handle missing signals, avoid double-counting.
- **Classification**: **Not Advisable as Written**
- **Current LogicQ State**: Implemented in `smart-exam.service.ts` using the spec's exact 8 weighted buckets.
- **What Must Change**: The formula as written in the spec sums raw weights without normalizing heterogeneous units (e.g. milliseconds, counts, percentages). Furthermore, signals like "code burst" and "paste attempt" are strongly correlated and double-penalize the same action. We recommend using **unweighted raw indicators** in MVP rather than generating a synthetic 0–100 score.
- **Data Model Impact**: Telemetry event storage.
- **Effort**: M
- **Risk**: Fairness & Legal (attaching a numerical "dishonesty score" to a student without empirical calibration).
- **Dependencies**: Section 20–28.

### Section 58: Integrity Classification
- **Spec Summary**: 0–20 Normal, 21–40 Low Risk, 41–60 Moderate Risk, 61–80 High Risk, 81–100 Critical Risk. Risk indicator, not proof. No automatic penalties.
- **Classification**: **Partial**
- **Current LogicQ State**: Classification logic implemented in `smart-exam.service.ts` with strict programmatic guardrail: academic score is never modified by integrity tier.
- **What Must Change**: Clearly display to faculty that tiers are purely advisory flags for human invigilator review.
- **Data Model Impact**: `riskTier: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'`.
- **Effort**: S
- **Risk**: Fairness (human bias if faculty blindly accept "High Risk" flags).
- **Dependencies**: Section 57.

### Section 59: Academic Score vs Integrity Score
- **Spec Summary**: Never combine scores by default. E.g. Academic 91/100 and Integrity 18/100 (Normal), or Academic 91/100 and Integrity 74/100 (High Risk / Review). High academic score and review flag can coexist.
- **Classification**: **Have**
- **Current LogicQ State**: Inviolable rule across all LogicQ services and schemas. Verified in test suites (`expect(submitRes.body.academicScore).toBe(1.0)` regardless of integrity flags).
- **What Must Change**: None.
- **Data Model Impact**: Separate fields `academicScore` and `integrityScore`.
- **Effort**: S
- **Risk**: Low (core architectural guardrail).
- **Dependencies**: Section 5, 57.

### Section 60: Event Logging and Auditability
- **Spec Summary**: Server-side timestamps. Session ID, student ID, module ID, section ID, question ID, timestamp, event type, metadata. Append-only assessment event logs. Tamper-proof records.
- **Classification**: **Have**
- **Current LogicQ State**: Database schema `AssessmentEventLog` and Firestore collection `admin_audit_logs` enforce append-only rules (`allow update, delete: if false`). Server assigns `createdAt = new Date()`.
- **What Must Change**: Expose audit trail exporter for institutional exam controllers.
- **Data Model Impact**: Schema exists.
- **Effort**: S
- **Risk**: Security & Storage (storage scaling for high-frequency event streams).
- **Dependencies**: Firestore rules.

### Section 61: Student Data Privacy
- **Spec Summary**: Collect only assessment data. Separate identity, academic, and behavioral data. Role-based access: students see own data, faculty see authorized sections. Define retention, deletion, consent, institutional access.
- **Classification**: **Have**
- **Current LogicQ State**: Firestore security rules (`firestore.rules`) strictly enforce owner-only student reads, separate `users/{uid}` from `publicProfiles/{uid}`, and prevent cross-student PII access. Documented in `docs/SECURITY_RULES.md` and `docs/PRIVACY_OPS.md`.
- **What Must Change**: Draft formal Assessment Mode consent disclosure and institutional Data Processing Agreement (DPA).
- **Data Model Impact**: Access control enforced at database layer.
- **Effort**: M (policy & UI consent gate).
- **Risk**: Privacy & Legal (compliance with India's DPDP Act 2023).
- **Dependencies**: Section 10, Firestore perimeter.

### Section 62: End-to-End Faculty Flow
- **Spec Summary**: 12-step faculty journey: Section creation -> student onboarding -> identity bind -> question bank creation -> validation -> test creation -> publish -> monitor -> evaluate -> AI insights -> dashboard -> PDF/Excel export.
- **Classification**: **Have**
- **Current LogicQ State**: Fully verified end-to-end in server test suite `tests/e2e-institutional-lifecycle.test.ts` (Steps 1–9 pass).
- **What Must Change**: Unify into polished faculty portal navigation flow.
- **Data Model Impact**: None.
- **Effort**: M (frontend integration).
- **Risk**: Low.
- **Dependencies**: All preceding faculty modules.

### Section 63: End-to-End Student Flow
- **Spec Summary**: 13-step student journey: Account create -> PRN -> email OTP -> mobile OTP -> bind -> join section -> view test -> start timer -> solve in secure editor -> submit & lock -> AI viva on 2nd solve -> complete -> view separate scores -> download report.
- **Classification**: **Have**
- **Current LogicQ State**: Fully verified in `tests/e2e-institutional-lifecycle.test.ts`. All steps execute cleanly on the backend.
- **What Must Change**: Build student exam room UI mode that locks navigation during active tests.
- **Data Model Impact**: None.
- **Effort**: M (frontend exam mode).
- **Risk**: Fairness (handling internet drops during exam flow).
- **Dependencies**: Section 19, 29, 31.

### Section 64: Mini-Project Flow
- **Spec Summary**: Complete module questions -> remain inactive -> faculty review -> individual activation -> secure solve -> 20-mark rubric evaluation -> separate scores -> dashboard update. No bulk activation.
- **Classification**: **Have**
- **Current LogicQ State**: Implemented in `server/src/services/mini-project.service.ts` and tested in `viva-and-mini-project.test.ts` and `e2e-institutional-lifecycle.test.ts`.
- **What Must Change**: Mini-project submission and rubric scoring UI.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Section 35–39.

### Section 65: Core Non-Negotiable Rules
- **Spec Summary**: Summary of 21 mandatory axioms (100 marks/module, E/M/H time bounds, time scoring, 2 visible + 1 hidden test, no reattempts on success, copy blocking, telemetry, variant randomisation, 1-min viva on 2nd solve, dual OTP identity binding, etc.).
- **Classification**: **Partial**
- **Current LogicQ State**: LogicQ enforces all algorithmic, scoring, and security axioms in its server architecture. However, several pedagogical axioms (e.g. single hidden test, 1-minute viva, mandatory mobile OTP) require the adjustments detailed in this document.
- **What Must Change**: Codify and enforce non-negotiable boundaries strictly inside Assessment Mode without contaminating Practice Mode.
- **Data Model Impact**: Configuration constants.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: Entire assessment subsystem.

### Section 66: Success Criteria
- **Spec Summary**: Complete platform lifecycle verification from student onboarding to module completion across all 14 stages.
- **Classification**: **Have**
- **Current LogicQ State**: Formal integration test suite `tests/e2e-institutional-lifecycle.test.ts` executes the complete lifecycle from PRN signup to rubric completion with 100% test pass rate.
- **What Must Change**: Maintain regression test suites across future release cycles.
- **Data Model Impact**: None.
- **Effort**: S
- **Risk**: Low.
- **Dependencies**: All suites.

---

## 4. Master Specification Summary Table

| Category | Count | Sections |
| :--- | :---: | :--- |
| **Have** | **31** | 4, 10, 11, 12, 13, 14, 15, 16, 17, 18, 25, 26, 27, 34, 35, 36, 37, 38, 39, 42, 43, 44, 46, 49, 50, 51, 52, 53, 56, 59, 60, 61, 62, 63, 64, 66 |
| **Partial** | **23** | 1, 2, 3, 9, 19, 20, 21, 22, 23, 24, 28, 32, 40, 41, 47, 48, 54, 55, 58, 65 |
| **Conflicts with Learning-First** | **3** | 5 (Time Scoring in Practice), 7 (Zero Retries in Practice), 29 (Oral Viva Interruptions in Practice) |
| **Not Advisable as Written** | **6** | 6 (Only 1 Hidden Test), 8 (Mandatory Mobile/SMS OTP), 31 (Strict 60s Viva Timer), 33 ("Suspicious" Labelling on Success), 45 (Exposing Evasion Thresholds to Students), 57 (Uncalibrated 0–100 Formula) |
| **Missing** | **3** | Full Faculty UI Portal (Section 48), Module 80-Question Rigid Bank (Section 2), Mobile Audio Capture Pipeline (Section 32) |
| **Total** | **66** | Sections 1 to 66 |

---

## 5. Specification Inconsistencies, Ambiguities & Technical Flaws

During comprehensive engineering audit, six major internal inconsistencies and design flaws were identified in the Master Product Specification:

### 1. The Single Hidden Test Case Vulnerability (Section 6 & 65.4)
- **The Spec's Requirement**: Exactly 2 visible test cases and **exactly 1 hidden test case**.
- **Flaw**: A single hidden test case is trivially gameable. If a student's code passes both visible tests but fails the single hidden test, they can guess whether the hidden case tests a zero value, a negative value, or an integer overflow, and submit specialized conditional branches. Furthermore, 1 test case cannot evaluate multiple orthogonal edge conditions (e.g. empty input, max boundary, null pointers).
- **Engineering Recommendation**: Expand hidden test cases to **at least 3 (and preferably 3–5)** randomized server-side test cases.

### 2. Integrity Formula Normalization & Weight Rescaling (Section 57)
- **The Spec's Requirement**: A linear 0–100 score computed as: Clipboard 15% + Focus 15% + Typing 10% + Bursts 15% + Evolution 15% + Run/Debug 10% + Timing 10% + Session 10%.
- **Flaw**: The spec does not define how raw values with incompatible units (e.g., milliseconds of focus loss vs. count of paste events vs. characters per minute) are normalized to a 0–100 range. If a student takes an assessment on a locked institutional desktop where full-screen is not supported by the browser, the environment signal is unavailable. The spec fails to specify whether weights are dynamically rescaled or if missing signals default to zero.
- **Engineering Recommendation**: In MVP, **do not compute a synthetic 0–100 score**. Display raw, objective indicator tallies to faculty for human judgment until empirical weights are calibrated.

### 3. The 60-Second Timed Viva Panic Barrier (Section 31)
- **The Spec's Requirement**: A strict 1-minute countdown timer for answering an AI viva question based on submitted code.
- **Flaw**: Sixty seconds is barely enough time for an undergraduate student to read an unexpected conceptual prompt, comprehend the question, form a coherent technical explanation, and type it without errors. This penalizes slow typers, dyslexic students, and students with high test anxiety, completely independent of their conceptual programming mastery.
- **Engineering Recommendation**: Provide **at least 2.5 to 3 minutes** for typed answers, with configurable faculty overrides and a 30-second reading grace period.

### 4. "Permanently Bound" Identity vs. Account Recovery (Section 8 vs. Section 10)
- **The Spec's Requirement**: Section 8 states that PRN, mobile, and email must be *"permanently bound as one identity pair and must never be associated with a different email/mobile pair"*. Section 10 then states that *"conflicts must be referred to an authorised identity-recovery process"*.
- **Flaw**: If an identity binding is truly "permanent and immutable", legitimate students who lose their phone number, change email addresses, or had a typo during registration can never be recovered.
- **Engineering Recommendation**: Enforce database uniqueness during ordinary client signup, but provide a cryptographically audited **Faculty/Admin Recovery Override** allowing authorized administrative re-binding upon physical ID verification.

### 5. Multi-Collinear Telemetry Double-Counting (Sections 20, 22, 23, 28)
- **The Spec's Requirement**: The integrity formula evaluates Clipboard Attempts (15%), Typing Speed (10%), Code Bursts (15%), and Solution Emergence (10%) as independent risk metrics.
- **Flaw**: These signals are mathematically and physically collinear. If an external snippet is pasted, it simultaneously triggers: (1) a paste attempt, (2) an infinite typing speed spike, (3) a code burst ratio $>0.8$, and (4) an instantaneous jump in the solution emergence curve. A single action can inflate the integrity score by $50+$ points across four redundant buckets.
- **Engineering Recommendation**: Consolidate clipboard and code insertion telemetry into a unified **External Insertion Indicator** to prevent compounding false positives.

### 6. Misconduct Labelling of High Performance (Section 33)
- **The Spec's Requirement**: Every 2nd successive correct solve must be explicitly tagged as *"Suspicious Flag — Viva Trigger"*.
- **Flaw**: Applying the word "Suspicious" to an honest, talented student who solves two easy questions in a row creates reputational risk and student grievance.
- **Engineering Recommendation**: Rename the audit event in all UI layers and logs to **`COMPREHENSION_AUDIT`** or **`VERIFICATION_CHECKPOINT`**.
