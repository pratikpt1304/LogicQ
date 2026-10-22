# Trimmed Assessment Mode MVP Specification

**Document Version**: 1.0.0  
**Date**: October 22, 2026  
**Status**: Architecture & System Design (Documents-Only)  
**Target Path**: `/docs/assessment/ASSESSMENT_MODE_MVP.md`  

---

## 1. Vision & Core Boundary Principle

The **Trimmed Assessment Mode MVP** delivers the smallest, most reliable subset of the Master Product Specification that solves higher education exam delivery without compromising LogicQ’s founding principle: **teaching C first**.

### Inviolable Product Separation
1. **Practice Mode (Learning First)**:
   - Self-paced exploration, unlimited attempts, compiler error translations, graduated hints, and no time penalties.
   - Questions are never locked; clipboard and navigation are unrestricted; zero behavioral monitoring or penalty records.
2. **Assessment Mode (Institutional Evaluation)**:
   - Faculty-scheduled, time-bounded, graded tests.
   - Questions lock immediately upon successful submission (zero reattempts); anti-sharing variants; server-side time-based scoring; non-intrusive environment telemetry collected solely for post-exam human review.

Under no circumstances may Assessment Mode rules, locks, or monitoring leak into Practice Mode.

---

## 2. Faculty Role & Section Management

### 2.1 Role-Based Access Control (RBAC)
- LogicQ adds a distinct `FACULTY` role alongside `STUDENT` and `ADMIN` (and existing `CHECKER`).
- **Isolation Invariant**: A faculty member has access **strictly and exclusively** to sections where `facultyId === auth.uid`. Faculty cannot view other faculty members' sections, tests, rosters, or student attempt logs.
- Platform Admins retain global supervisory and audit access.

### 2.2 Section Creation Workflow (Section 11)
Faculty create sections with:
- Institution Name (default: *Sanjivani University*)
- Course / Department (e.g., *Computer Engineering*, *AIML*, *AIDS*)
- Subject (e.g., *Programming in C*, *Data Structures in C*)
- Academic Year (e.g., *2026–2027*) & Semester (e.g., *Sem I*, *Sem II*)
- Section Name (e.g., *Div A - Batch 1*)
- Description and optional test schedule windows.

### 2.3 Excel Student Roster Import (Section 12)
- **Accepted Columns**: `Name`, `PRN` (Roll No), `College Email` (mandatory institutional domain `@sanjivani.edu.in`), `Mobile` (optional in MVP).
- **Validation Pipeline**:
  1. *Syntax & Format*: Validates PRN regex (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`) and college email domain.
  2. *Duplicate Inspection*: Detects duplicates within the Excel file.
  3. *Conflict Detection*: Cross-references existing system identities to prevent associating an existing PRN with a conflicting email address.
  4. *Dry-Run Preview Table*: Displays total records categorized into: **Valid**, **Invalid Syntax**, **Duplicates in File**, and **Identity Conflicts**.
  5. *Mandatory Confirmation*: Faculty must inspect the error report and click **Confirm Import**. The system **never silently discards invalid rows**. Rows with errors are excluded from the import and exported as an annotated error spreadsheet for faculty correction.

### 2.4 Instant Student Join Link & QR Code (Section 13)
- Sections automatically generate an encrypted 8-character `Join Code` and URL (e.g., `https://logicq-clanguage.web.app/join/SEC-A1B2C3D4`).
- Faculty can project a dynamically rendered QR code or click "Copy WhatsApp Invite".
- Students opening the link are prompted to log in with their institutional Google account; if their email and PRN match the section allowlist, they are instantly enrolled.

---

## 3. Student Identity & Verification

### 3.1 MVP Identity Verification: College Google OAuth + Institutional Allowlist
To ensure zero operational disruption, zero SMS cost, and 100% reliable onboarding for 500+ students during campus lab sessions:
1. **Authentication**: Students authenticate using Google OAuth restricted to the institutional domain (`@sanjivani.edu.in`).
2. **PRN Allowlist Validation**: The student inputs their 12-character PRN. The server verifies that:
   - The PRN is present on the faculty-uploaded section roster or university allowlist.
   - The Google account email matches the student's assigned institutional email.
3. **Atomic Binding**: A Firestore transaction registers `prnIndex/{prn} = { uid, email, boundAt }`. A PRN cannot be claimed by another account.

### 3.2 Roadmap for OTP Validation (Sections 8–10)
- **Phase 1 (MVP)**: Verified College Email via Google OAuth + PRN Allowlist.
- **Phase 2 (Next Step)**: Email OTP sent via SMTP/SendGrid for non-Google institutional domains.
- **Phase 3 (Post-Pilot)**: Mobile SMS OTP introduced *only after* institutional TRAI/DLT registration is finalized, template IDs are approved, and per-SMS operational budgets are funded.

### 3.3 Identity Recovery & Conflict Resolution
- If a student encounters an identity conflict (e.g., duplicate PRN or lost account), client self-service overrides are prohibited.
- The platform provides a formal **Faculty/Admin Identity Resolution Console** allowing verified department heads to release or re-bind a PRN upon physical inspection of student college ID cards. Every recovery action generates an immutable record in `admin_audit_logs`.

---

## 4. Test Builder & Publishing Guardrails (Sections 4, 14, 18)

Faculty configure assessments through a guided 4-step wizard:
1. **Configuration**: Test Name, Section association, Module scope, Instructions, Start & End Timestamps (IST), and Duration (minutes).
2. **Difficulty Distribution (Section 4)**:
   - Faculty selects Easy / Medium / Hard target ratio (e.g., 40% Easy, 40% Medium, 20% Hard).
   - **Pre-Publish Gate**: The system calculates available questions in the question bank. If the question bank contains insufficient questions meeting the ratio, publishing is blocked with a clear warning: *"Cannot publish test: requires 8 Medium questions, but only 5 validated Medium questions are available in the selected module."*
3. **Validated Questions Only (Section 18)**:
   - Active tests may contain **strictly and exclusively** questions with status `FACULTY_APPROVED` or `PUBLISHED`.
   - AI-generated drafts (`AI_GENERATED`) or failed questions (`VALIDATION_FAILED`) are excluded from selection pools.
4. **Anti-Sharing Variant Allocation (Section 34)**:
   - For every question assigned to a test, the builder links at least two isomorphic question variants (e.g., Variant A evaluates `a > b`, Variant B evaluates `a < b`).
   - On starting the test, the engine assigns a deterministic pseudo-random variant to each student: `hash(studentId + questionId) % variantCount`. Students sitting adjacent to each other in a lab receive distinct variants.

---

## 5. Scoring & Question Locking Rules (Sections 5, 7, 59)

### 5.1 Time-Based Academic Scoring
Scoring follows the exact formula defined in Section 5:
$$\text{Expected Reference Time } (T_{\text{ref}}) = \frac{T_{\text{min}} + T_{\text{max}}}{2}$$
$$\text{Actual Time Taken } (T_{\text{actual}}) = T_{\text{submit}} - T_{\text{start}}$$

- **Award Criteria**:
  - **1.0 Mark**: All test cases pass AND $T_{\text{actual}} \le T_{\text{max}}$.
  - **0.5 Mark**: All test cases pass AND $T_{\text{actual}} > T_{\text{max}}$.
  - **0.0 Marks**: One or more test cases fail (regardless of time).
- **Server-Side Authority**: Timestamps are computed strictly by server clock on API arrival. Client clocks are untrusted.

### 5.2 Irreversible Question Locking (Section 7)
- In Assessment Mode, upon receiving an evaluation where all test cases pass (`ACCEPTED`), the server immediately sets `isLocked = true` and `lockedAt = new Date()`.
- **No Resubmission**: Subsequent attempts on a locked question are rejected with HTTP 403 (`QUESTION_LOCKED`).
- **Student Safeguard**: The client editor displays a prominent warning modal before final submission: *"Confirm Submission: Once submitted correctly, this question will be permanently locked and cannot be reopened."*
- **Practice Mode Immunity**: This rule never applies to Practice Mode.

### 5.3 Absolute Score Separation (Section 59)
- Academic marks ($0.0, 0.5, 1.0$) are stored in `academicScore` and reflect **strictly code correctness and time efficiency**.
- Telemetry events (paste attempts, blur counts) are stored in `integrityIndicators` and **never deduct academic marks**.

---

## 6. Test Case Architecture: The Hidden Test Compromise

### 6.1 The Spec’s Requirement (Section 6)
The specification mandates:
- Test Case 1: Visible (Input, Expected Output)
- Test Case 2: Visible (Input, Expected Output)
- Test Case 3: **Exactly 1 Hidden Test Case**

### 6.2 The Critical Vulnerability of 1 Hidden Test
A single hidden test case is critically vulnerable to student gaming:
1. **Hardcoding & Guessing**: If a student passes Visible 1 and Visible 2 but fails the hidden test, they know their general logic is accepted. Because there is only 1 hidden case, they can guess common edge cases (e.g., $N=0$, negative integers, maximum constraints) and submit speculative conditionals (`if (n == 0) return 0;`).
2. **Inadequate Edge Coverage**: High-quality C assessment requires testing at least: (a) zero or null boundary, (b) negative values or overflow boundaries, and (c) general multi-element arrays/strings. One test case cannot simultaneously cover all three.

### 6.3 MVP Recommendation: Minimum 3 Hidden Test Cases
- **Standard**: 2 Visible Test Cases + **3 to 5 Hidden Test Cases**.
- **Randomized Inputs**: Where possible, hidden test cases use parameterized random seeds to prevent students from sharing exact input values across exam sessions.
- **Client Secrecy**: The client response payload reports only the aggregate verdict:
  ```json
  {
    "visibleResults": [
      { "testIndex": 1, "passed": true, "input": "5 7", "expected": "12", "actual": "12" },
      { "testIndex": 2, "passed": true, "input": "-3 8", "expected": "5", "actual": "5" }
    ],
    "hiddenPassedCount": 3,
    "hiddenTotalCount": 3,
    "allPassed": true
  }
  ```
  Hidden inputs, expected outputs, and actual sandbox outputs are **never sent over the network**.

---

## 7. Integrity Monitoring in MVP: Non-Intrusive Indicators

### 7.1 Collected Telemetry Signals (Server-Side Aggregates)
During an active assessment, the client telemetry agent monitors non-intrusive browser events:
1. **Clipboard Events**: Count of copy, paste, and cut attempts within the editor container.
2. **Focus & Visibility Loss**: Count of `visibilitychange` (tab switches) and `window.onblur` events, along with total duration spent outside the exam tab.
3. **Full-Screen Exits**: Count of exits from browser full-screen mode (where supported by OS/browser).
4. **Execution & Run Activity**: Total compiler executions, compilation error count, and timestamp of first run vs. final solve.

### 7.2 Storage & Display Separation
- Telemetry is dispatched as lightweight JSON aggregates upon test execution or submission.
- Stored in a separate collection: `/assessment_integrity/{attemptId}` (accessible only by authorized faculty and admins).
- **No Automated Penalties**: In the MVP, **no automated integrity score (0–100) is computed**, no student is automatically penalized, and no student is automatically tagged "Cheater".
- **Faculty Human Review Dashboard**: Faculty see raw, factual indicators:
  - *"Student X: 0 paste attempts, 1 tab switch (total duration 4s), 6 compilation runs."*
  - *"Student Y: 12 paste attempts, 8 tab switches (total duration 142s), 1 run to instant success."*
  Human faculty make all final disciplinary determinations.

### 7.3 False-Positive Risks & Required Calibration
Before any automated scoring can ever be introduced, the college must calibrate against these real-world laboratory realities:
- **Operating System Notifications**: Antivirus popups, Windows Update dialogs, or institutional lock-screen timers trigger `window.blur` without any student wrongdoing.
- **Input Method Editors (IME) & Non-English Keyboards**: Students typing on accented, regional, or virtual keyboards trigger burst insertion events that resemble automated pasting.
- **Lab Hardware & Browser Extensions**: Trackpads with multi-touch gestures, sticky mouse buttons, or institutional accessibility tools (screen magnifiers, text-to-speech) can fire repeated context-menu and selection events.
- **Network Glitches**: Transient WiFi drops during submit can cause retry bursts that appear as rapid executions.

---

## 8. Export & Reporting Engine (Sections 47, 55)

The MVP reuses LogicQ’s existing PDF and CSV generation pipeline (`jspdf`, `jspdf-autotable`, and streaming CSV):
1. **Student Assessment Summary**:
   - Downloadable immediately after test completion.
   - Shows: Assessment Name, Student PRN, Submission Date, Final Academic Score ($X/100$ or $X/N$), question-by-question breakdown, and execution durations.
2. **Faculty Gradebook CSV Export**:
   - One-click export for university ERP/marks entry.
   - Columns: `PRN`, `Roll No`, `Student Name`, `Department`, `Section`, `Total Score`, `Time Taken (min)`, `Submission Status`.
3. **Faculty Audit Report (PDF)**:
   - Comprehensive section report showing class average, median, difficulty success rates, and a summary table of flagged sessions for human review.

---

## 9. Explicitly Out of Scope for MVP (Phase 1)

The following advanced components from the Master Specification are **deliberately deferred to subsequent phases** to ensure a hardened, stable, and legally safe initial release:

1. **AI Viva Voce Engine (Sections 29–33)**:
   - *Reason for Deferral*: Requires real-time Gemini LLM calls during live exam concurrency (high cost, token rate limits), browser audio recording/transcription infrastructure, and raises severe student panic concerns under strict 60-second timers.
   - *Future Requirement*: Phase 4 will introduce typed AI vivas with faculty review and a humane 3-minute timer.
2. **Integrated Mini-Project Activation (Sections 35–39, 64)**:
   - *Reason for Deferral*: Multi-file project workspace, manual 20-mark rubric grading UI, and individual activation workflows require substantial faculty training.
   - *Future Requirement*: Phase 5 introduces faculty rubric grading and project tracking.
3. **Synthetic 0–100 Integrity Scoring Formula (Section 57)**:
   - *Reason for Deferral*: Linear weighting without normalization is mathematically invalid and produces high false-positive rates on lab devices.
   - *Future Requirement*: Phase 3 collects silent telemetry to calibrate empirical thresholds on real student cohorts.
4. **AI Learner Categorization & Alerts (Sections 42–44)**:
   - *Reason for Deferral*: Categorizing students as "Support-Needing" based on early pilot tests risks premature academic bias.
   - *Future Requirement*: Phase 5 integrates cohort-level learning analytics after multiple tests are completed.
