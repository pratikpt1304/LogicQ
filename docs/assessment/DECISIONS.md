# Key Architectural & Policy Decisions for Review

**Document Version**: 1.0.0  
**Date**: October 22, 2026  
**Status**: Strategic Decision Brief (Documents-Only)  
**Target Path**: `/docs/assessment/DECISIONS.md`  

---

## Executive Summary

Before transitioning any portion of the Assessment Mode specification into application code, seven foundational technical, pedagogical, and legal decisions must be approved by project leadership and university management. 

Each item below details the core dilemma, the trade-offs, and our explicit engineering recommendation.

---

### Decision 1: Identity Verification & OTP Provider Strategy

- **Dilemma**: The Master Specification mandates dual Email OTP + Mobile SMS OTP with permanent 3-way binding (`PRN <-> email <-> mobile`). Implementing SMS OTP requires Indian TRAI/DLT registration, commercial SMS gateway contracts (Twilio/AWS SNS/Gupshup at ₹0.20–₹0.35 per SMS), and introduces severe failure rates when network signal drops in college basements.
- **Options**:
  - *Option A (Spec Literal)*: Mandate Email OTP + Mobile SMS OTP immediately via commercial gateway.
  - *Option B (Recommended MVP)*: Authenticate students via institutional Google OAuth (`@sanjivani.edu.in`) matched against a faculty-uploaded PRN allowlist. Defer SMS OTP to Phase 3 pending college funding.
  - *Option C*: Email OTP only (via university SMTP or SendGrid) + PRN allowlist matching.
- **Recommendation**: **Option B (Google OAuth + PRN Allowlist)** for MVP. It achieves zero operational friction, zero SMS cost, zero delivery latency during exam hall check-ins, and 100% verified institutional identity.

---

### Decision 2: Number of Hidden Test Cases

- **Dilemma**: Section 6 and Section 65.4 strictly specify *exactly one hidden test case* alongside two visible test cases. A single hidden test case is trivially brute-forced by speculative conditional statements (`if (n == 0) return ...;`) and cannot evaluate multiple orthogonal edge conditions.
- **Options**:
  - *Option A (Spec Literal)*: Exactly 1 hidden test case per programming question.
  - *Option B (Recommended)*: **Minimum 3 (and preferably 3 to 5) hidden test cases**, evaluated server-side in the sandbox with randomized input parameters.
- **Recommendation**: **Option B (3 to 5 Hidden Tests)**. Testing edge boundaries (zero, negatives, maximum constraints, null pointers) requires multiple distinct inputs. A single hidden test case is an open invitation to student gaming.

---

### Decision 3: AI Viva Format, Timing & Evaluation

- **Dilemma**: Section 31 specifies a strict 1-minute timer for answering an AI viva on every 2nd successive correct solve. Section 32 suggests audio voice recording. Sixty seconds is psychologically punitive for typing complex technical explanations of C code; audio recording requires microphone access, WebM encoding, STT transcription, and heightened biometric consent under the DPDP Act.
- **Options**:
  - *Option A (Spec Literal)*: 60-second strict voice/audio recording analyzed by AI.
  - *Option B (Recommended)*: **Typed text response with a humane 2.5 to 3.0 minute timer**; evaluated by Gemini Flash as an advisory comprehension rating (0–100) presented to faculty for final human marking.
  - *Option C*: Multiple-choice code comprehension questions generated dynamically from student code.
- **Recommendation**: **Option B (Typed, 2.5-min timer, human faculty review)**. It eliminates audio capture technical failures and biometric liabilities while ensuring students have adequate time to articulate pointer and algorithmic logic.

---

### Decision 4: Student Visibility of Integrity Telemetry

- **Dilemma**: Section 45 mandates that students see their own Integrity Score, risk classification, and recorded metrics (without exposing detection thresholds). Displaying arbitrary numbers like *"Integrity Risk: 72/100 (High Risk)"* during an active exam induces severe panic, false accusations, and teaches students how to test the boundaries of evasion.
- **Options**:
  - *Option A (Spec Literal)*: Expose the numerical Integrity Score and risk tier directly on student dashboards.
  - *Option B (Recommended)*: **Strictly withhold integrity scores and risk classifications from students**. Show students only objective factual tallies upon request (e.g. *"Session completed. 1 tab switch logged."*). Display risk analysis exclusively on the faculty invigilation portal.
  - *Option C*: Complete secrecy (students see only academic marks; zero integrity data visible).
- **Recommendation**: **Option B (Faculty-Only Risk Analysis)**. Telemetry is an advisory invigilation tool for educators, not a student-facing grading metric.

---

### Decision 5: Data Retention & Purge Lifecycles

- **Dilemma**: Retaining granular keystroke telemetry, code emergence snapshots, and blur event logs indefinitely creates severe privacy liabilities under India’s DPDP Act and consumes significant cloud storage.
- **Options**:
  - *Option A*: Retain all telemetry and submission data permanently.
  - *Option B (Recommended)*: **Tiered Purge Strategy**:
    - *Academic Records & Grades*: Retained for 3 years (conforming to university accreditation and NAAC/NBA audit cycles).
    - *Submitted Source Code*: Retained for 1 academic year post-term.
    - *Behavioral Telemetry (blur logs, paste counts)*: **Purged automatically after 90 days** once final semester grade appeals close.
- **Recommendation**: **Option B (Tiered Purge)**. It complies with data minimization principles under Section 6 of the DPDP Act while fulfilling university record-keeping requirements.

---

### Decision 6: Institutional Governance & Pilot Authorization

- **Dilemma**: Launching an assessment tool that determines academic marks, enforces irreversible locks, and monitors browser telemetry requires formal institutional authority.
- **Options**:
  - *Option A*: Deploy informally as a departmental classroom pilot under individual faculty discretion.
  - *Option B (Recommended)*: **Secure formal written approval from the Head of Department (HOD), Academic Dean, and University Examination Cell** prior to conducting any graded assessment.
- **Recommendation**: **Option B (Formal Governance Sign-Off)**. An unapproved assessment platform risks having its grades challenged or discarded by university tribunals if a student disputes an automated lock or time deduction.

---

### Decision 7: Content Ownership & Question Bank Maintenance

- **Dilemma**: The Master Specification requires 80 validated questions $\times$ 4 modules = 320 questions, each with 2 isomorphic variants and 3 hidden test cases (**640 distinct code solutions and 1,920 test cases**). Maintaining this quality cannot be outsourced to software engineers alone.
- **Options**:
  - *Option A*: Platform engineering team authors and maintains the question bank.
  - *Option B (Recommended)*: **Establish a designated Departmental Question Review Committee**. LogicQ provides AI authoring tools (Section 16) and sandbox correctness checks (Section 17); faculty members hold official curriculum ownership and sign off on all published items.
- **Recommendation**: **Option B (Faculty Content Committee)**. Pedagogical authority, academic syllabus alignment, and test case correctness must reside with qualified computer science educators.

---

## Summary Matrix of Recommended Decisions

| # | Decision Topic | Spec Proposal | Recommended Architecture | Primary Benefit |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Identity Binding** | Email OTP + Mobile SMS OTP | Google OAuth + PRN Allowlist | Zero SMS cost, zero check-in delays |
| **2** | **Hidden Test Cases** | Exactly 1 hidden test case | **3 to 5 hidden test cases** | Prevents brute-force hardcoding |
| **3** | **AI Viva Format** | 60-second voice viva | **Typed text, 2.5-min timer** | Eliminates panic & microphone failures |
| **4** | **Student Telemetry View** | Show 0–100 Integrity Score | **Faculty-Only advisory flags** | Prevents student exam panic and evasion |
| **5** | **Data Retention** | Indefinite / unstated | **90-Day Telemetry Purge** | DPDP Act compliance & low storage cost |
| **6** | **Institutional Sign-Off** | Direct deployment | **Formal Dean/HOD Approval** | Legal validity of exam grades |
| **7** | **Content Ownership** | Automated generation | **Faculty Review Committee** | Accredited syllabus alignment |
