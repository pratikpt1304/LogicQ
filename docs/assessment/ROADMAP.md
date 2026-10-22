# Phased Implementation Roadmap: LogicQ Assessment Platform

**Document Version**: 1.0.0  
**Date**: October 22, 2026  
**Status**: Architecture & Implementation Strategy (Documents-Only)  
**Target Path**: `/docs/assessment/ROADMAP.md`  

---

## 1. Executive Sequence & Architectural Rationale

To transition LogicQ from a formative practice tool to an institutionally accredited assessment platform without destabilizing active students or violating privacy laws, execution is structured across **five sequential phases**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASED IMPLEMENTATION SEQUENCE                                │
│                                                                                                 │
│  Phase 1: Faculty Administration & Section Management                                           │
│  ├── Institutional RBAC (Faculty role, section scoping)                                         │
│  ├── Excel roster upload with preview & mandatory confirmation                                  │
│  └── Verified Google OAuth + PRN allowlist identity binding                                    │
│                                                                                                 │
│  Phase 2: Core Assessment Mode & Anti-Sharing Delivery                                          │
│  ├── Test Builder wizard (duration, E/M/H ratio validation)                                     │
│  ├── Isomorphic question variants & randomized assignment                                       │
│  ├── Server-side time scoring (1.0 / 0.5 / 0.0) & locking on success                             │
│  └── 2 Visible + 3 Hidden test case evaluation                                                  │
│                                                                                                 │
│  Phase 3: Telemetry Collection, Signal Calibration & Audit Trails                               │
│  ├── Non-intrusive client telemetry agent (clipboard, focus, blur)                              │
│  ├── Silent data collection on pilot cohort (NO automated penalties)                            │
│  └── Statistical baseline calibration (distinguishing noise from cheating)                      │
│                                                                                                 │
│  Phase 4: Comprehension Vivas & Human-Governed Integrity Review                                  │
│  ├── Code-specific typed AI vivas (2.5-minute timer, Gemini Flash)                              │
│  ├── Faculty viva evaluation & score override console                                           │
│  └── Advisory risk tiering for human invigilator review                                         │
│                                                                                                 │
│  Phase 5: Mini-Projects, Institutional Analytics & ERP Exports                                  │
│  ├── 20-mark integrated mini-project workspace & rubric scoring                                 │
│  ├── Individual manual project activation workflow                                              │
│  └── Cohort analytics, learning gap detection & university marks exports                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why This Order Is Optimal
1. **Administrative Trust First (Phase 1)**: Faculty must have working section rosters and student rosters before any test can be authored or assigned.
2. **Deterministic Evaluation Before Telemetry (Phase 2)**: Core test delivery and grading must be bulletproof before adding behavioral monitoring layers.
3. **Data Calibration Before Action (Phase 3)**: Telemetry algorithms must be benchmarked silently on real lab computers to measure hardware noise (trackpads, antivirus popups) before faculty rely on them.
4. **Humane Verification (Phase 4)**: AI vivas are introduced with typed inputs and human faculty overrides, avoiding the panic of strict 60-second voice vivas.
5. **Advanced Capstone Last (Phase 5)**: Multi-file mini-projects require prior mastery of the basic four modules and substantial faculty training.

---

## 2. Phase 1: Faculty Roles, Section Management & Identity

### 2.1 Deliverables
- Role-based access control adding `FACULTY` role; custom claims in Firebase Auth tokens.
- Faculty Portal navigation: Section List, Create Section, Student Roster, Allowlist Import.
- Excel Roster Importer: In-memory parser, syntax validation, duplicate checks, dry-run preview table, and uncommitted error report export.
- Instant Student Join URL and dynamic QR code generation.
- Verified College Google OAuth + PRN Allowlist matching.

### 2.2 Acceptance Tests
- `[PASS]` A faculty member can only query and view sections where `facultyId == auth.uid`.
- `[PASS]` Uploading an Excel file with 50 valid rows, 2 invalid emails, and 1 duplicate PRN displays an interactive preview listing exactly 50 valid, 2 invalid, and 1 duplicate. Clicking "Confirm" imports only the 50 valid rows and produces an error download.
- `[PASS]` A student logging in with a non-institutional email (e.g. `@gmail.com`) is blocked from claiming a PRN.
- `[PASS]` An existing bound PRN cannot be claimed by a different user ID (enforced via `/prnIndex/{prn}` atomic transaction).

### 2.3 Data Model & Firestore Security Rules Changes
- **Prisma Schema**: `Section`, `SectionStudent`, `User.role` enum updated to include `FACULTY`.
- **Firestore Security Rules**:
  ```javascript
  match /sections/{sectionId} {
    allow read: if isAuthenticated() && (
      resource.data.facultyId == request.auth.uid ||
      resource.data.studentIds.hasAny([request.auth.uid]) ||
      isAdmin()
    );
    allow create: if isFaculty() || isAdmin();
    allow update, delete: if isFaculty() && resource.data.facultyId == request.auth.uid;
  }
  ```

### 2.4 Estimated Cloud Workload & Costs
- **Firebase Operations (500 Students)**:
  - Onboarding reads: ~2,500 reads (allowlist check + PRN index).
  - Onboarding writes: ~1,000 writes (user profile + PRN index).
- **Firebase Operations (3,000 Students)**:
  - Onboarding reads: ~15,000 reads.
  - Onboarding writes: ~6,000 writes.
  - *Within Firebase Free / Blaze baseline ($0.00 – $0.05).*
- **Other Costs**: $0 (uses existing Google Workspace OAuth domain restriction; zero SMS costs).

### 2.5 Security & Privacy Work
- Domain restriction configuration in Google Cloud Identity Console.
- Access audit logging for Excel roster uploads (`admin_audit_logs`).

### 2.6 Go / No-Go Gate
- **Go Criteria**: 100% of pilot faculty can create a section and import an Excel roster without technical support; zero cross-faculty section data leakage.

---

## 3. Phase 2: Assessment Mode, Time-Scoring & Question Variants

### 2.1 Deliverables
- Assessment Test Builder wizard for faculty (start/end window in IST, duration, E/M/H ratio validator).
- Student Assessment Room UI: Fullscreen container, navigation lock, live countdown timer, code editor.
- Server-side time-based scoring engine (1.0 mark $\le T_{\text{max}}$, 0.5 mark $> T_{\text{max}}$, 0.0 incorrect).
- Permanent locking of successfully submitted questions (`isLocked: true`).
- Anti-sharing question variant distributor (deterministic hashing by student ID).
- Multi-case evaluation: 2 visible + 3 hidden test cases.

### 2.2 Acceptance Tests
- `[PASS]` Test builder prevents publishing if the selected module does not contain enough approved questions to satisfy the E/M/H ratio.
- `[PASS]` Adjacent students starting the same assessment test receive different question variants.
- `[PASS]` Correct solution submitted at $T_{\text{actual}} \le T_{\text{max}}$ receives 1.0 mark; submitted at $T_{\text{actual}} > T_{\text{max}}$ receives 0.5 marks.
- `[PASS]` Once a question receives an `ACCEPTED` verdict, all subsequent POST requests to `submit-question` return HTTP 403 `QUESTION_LOCKED`.
- `[PASS]` Practice Mode remains 100% unrestricted with unlimited retries and zero time penalties.

### 2.3 Data Model & Firestore Security Rules Changes
- **Prisma Schema**: `AssessmentTest`, `AssessmentTestQuestion`, `AssessmentTestAssignment`, `AssessmentQuestionAttempt`.
- **Firestore Security Rules**:
  ```javascript
  match /assessment_attempts/{attemptId} {
    allow read: if isAuthenticated() && (
      resource.data.studentId == request.auth.uid ||
      isSectionFaculty(resource.data.sectionId) ||
      isAdmin()
    );
    // Writes strictly mediated by server judge API
    allow write: if false;
  }
  ```

### 2.4 Estimated Cloud Workload & Costs
- **Firebase Operations (500 Students, 20 questions/test)**:
  - Reads: ~50,000 reads (test state queries, visible test cases).
  - Writes: ~15,000 writes (start attempt, submit attempt, grade records).
- **Firebase Operations (3,000 Students, 20 questions/test)**:
  - Reads: ~300,000 reads ($0.18 on Blaze plan).
  - Writes: ~90,000 writes ($0.16 on Blaze plan).
- **Server Execution Compute**: ~60,000 GCC compilations across 3,000 students; handled cleanly by existing isolated Windows Job Object runner / POSIX sandbox container instances.

### 2.5 Content Workload & Ownership
- **Requirement**: 80 core questions per module $\times$ 2 variants each = **160 validated questions per module**.
- **Hidden Tests**: Minimum 3 hidden test cases per question = **480 hidden test cases per module**.
- **Ownership**: CS Department Faculty Committee. Platform engineering provides AI generation tooling; faculty must inspect, edit, and click `Approve`.

### 2.6 Go / No-Go Gate
- **Go Criteria**: Server judge latency $\le 1.8$ seconds under simulated 200 concurrent student submissions; zero leaked hidden test cases in network inspect payloads.

---

## 4. Phase 3: Telemetry Collection & Signal Calibration (Silent Pilot)

### 3.1 Deliverables
- Non-intrusive client telemetry agent embedded in Assessment Room (copy/paste attempts, blur duration, tab switch count, full-screen toggles, compiler run frequency).
- Asynchronous telemetry ingestion endpoint (`POST /api/exam/telemetry`).
- Telemetry data separation: stored in `/assessment_integrity/{attemptId}`, isolated from academic grades.
- Faculty Advisory Review Panel: displays raw factual counts without automated penalties.
- Statistical calibration script: calculates cohort distributions, percentiles, and hardware noise floors.

### 3.2 Acceptance Tests
- `[PASS]` Telemetry dispatches consume $\le 5$ KB network bandwidth per question attempt.
- `[PASS]` Antivirus or OS system dialog blur events are logged as factual events without deducting academic marks.
- `[PASS]` Academic Score remains completely identical between students with 0 telemetry events and students with 10 telemetry events.
- `[PASS]` Students cannot view other students' telemetry records.

### 3.3 Data Model & Security Rules
- **Prisma Schema**: `AssessmentEventLog`, `AssessmentIntegrityRecord`.
- **Firestore Security Rules**:
  ```javascript
  match /assessment_integrity/{attemptId} {
    allow read: if isSectionFaculty(resource.data.sectionId) || isAdmin();
    allow write: if false; // Server-only append
  }
  ```

### 3.4 Estimated Cloud Workload & Costs
- **Firebase Operations (3,000 Students)**:
  - Writes: ~30,000 append-only log writes ($0.05).
  - Storage: ~150 MB telemetry JSON logs ($0.01).

### 3.5 Security & Privacy Work
- Draft and publish institutional **Assessment Telemetry Privacy Notice** explaining what browser events are monitored during exams and confirming that webcams, microphones, and keystroke character contents are not recorded.

### 3.6 Go / No-Go Gate
- **Go Criteria**: Department review of silent pilot telemetry shows zero false-positive accusations; noise thresholds calibrated on real computer lab hardware.

---

## 5. Phase 4: Typed AI Viva & Human-Governed Integrity Review

### 4.1 Deliverables
- Successive correct submission tracker (triggers viva verification on 2nd, 4th, 6th consecutive solve).
- Targeted AI Viva prompt generator (Gemini Flash API evaluates actual submitted C code and synthesizes a 1-question conceptual comprehension probe).
- Student Viva Interface: Displays code snippet, question, countdown timer (generous 2.5-minute timer), and text input area.
- Faculty Viva Review Console: Displays student answer, AI relevance rating (0–100), and manual grade override controls.
- Advisory Risk Tiering: Low, Moderate, High, Critical indicators based on calibrated Phase 3 thresholds.

### 4.2 Acceptance Tests
- `[PASS]` Solving question #1 correctly does NOT trigger a viva; solving question #2 correctly immediately displays the viva modal before advancing.
- `[PASS]` Failing a submission resets the consecutive solve counter to 0.
- `[PASS]` Student viva text answer is stored immutably and evaluated by Gemini within $\le 4.0$ seconds.
- `[PASS]` Faculty can override AI viva relevance scores with one click.

### 4.3 Estimated Cloud Workload & Costs
- **AI Costs (Gemini Flash)**:
  - 3,000 students solving 10 questions each $\approx$ 15,000 vivas triggered (on 2nd solves).
  - Prompt: 800 tokens input, 150 tokens output per viva.
  - Cost at Gemini 1.5 Flash rates ($\$0.075 / \text{1M tokens}$ input, $\$0.30 / \text{1M}$ output):
    $$15{,}000 \times \left(\frac{800}{10^6} \times \$0.075 + \frac{150}{10^6} \times \$0.30\right) \approx 15{,}000 \times (\$0.00006 + \$0.000045) \approx \mathbf{\$1.58 \text{ total}}$$
  - *Extremely cost-effective ($<\$2.00$ per 3,000-student midterm).*

### 4.4 Go / No-Go Gate
- **Go Criteria**: Faculty testing confirms viva questions accurately reflect submitted code logic; AI evaluation matches faculty judgment in $\ge 85\%$ of sample responses.

---

## 6. Phase 5: Integrated Mini-Projects & Institutional Analytics

### 5.1 Deliverables
- 20-mark Integrated Mini-Project student workspace (multi-function C program combining all 4 module concepts).
- Individual student activation workflow (no bulk activation; audited faculty approval button).
- 4-component rubric evaluation interface (5 marks per section competency).
- Cohort Performance Analytics: Class averages, standard deviations, difficulty success rates, topic gap breakdowns.
- University ERP Marks Exporter (CSV/Excel formatted for institutional registrars).

### 5.2 Acceptance Tests
- `[PASS]` Mini-project remains locked and inaccessible until faculty clicks "Activate Project" for that individual student.
- `[PASS]` Bulk activation API requests are rejected by backend guardrails.
- `[PASS]` Submitting rubric evaluation awards marks strictly out of 20 and compiles final Module Score $X/100$ ($80 \text{ questions} + 20 \text{ mini-project}$).
- `[PASS]` Official gradebook export matches institutional registrar formatting specifications.

### 5.3 Go / No-Go Gate
- **Go Criteria**: Academic Council approval of the 100-mark assessment structure; faculty sign-off on rubric grading workflow.

---

## 7. Comprehensive Resource & Staffing Matrix

| Phase | Duration | Core Engineering | Faculty / Pedagogical Staff | Estimated Cloud Cost |
| :--- | :---: | :--- | :--- | :---: |
| **Phase 1** | 2 Weeks | 1 Full-Stack Engineer | 2 Department Admins (Roster setup) | $<\$1.00$ |
| **Phase 2** | 3 Weeks | 2 Engineers (Backend/Judge + Frontend) | 4 Faculty Content Authors (Bank review) | $<\$5.00$ |
| **Phase 3** | 2 Weeks | 1 Engineer + 1 QA Specialist | 1 Lab Invigilator (Pilot supervision) | $<\$2.00$ |
| **Phase 4** | 3 Weeks | 1 Full-Stack Engineer + 1 AI Engineer | 3 Faculty Evaluators (Viva calibration) | $\sim \$10.00$ |
| **Phase 5** | 3 Weeks | 1 Full-Stack Engineer | Department Exam Cell (Rubric sign-off) | $<\$5.00$ |
| **Total** | **13 Weeks** | **Coordinated Platform Team** | **Faculty Committee** | **$\le \$25.00$** |
