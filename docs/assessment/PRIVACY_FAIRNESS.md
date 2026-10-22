# Privacy, Consent, Fairness & Legal Compliance Framework

**Document Version**: 1.0.0  
**Date**: October 22, 2026  
**Status**: Institutional Policy & Legal Compliance Architecture (Documents-Only)  
**Target Path**: `/docs/assessment/PRIVACY_FAIRNESS.md`  

---

## 1. Regulatory Context & Compliance Mandate

The introduction of behavioral telemetry, identity binding, and AI-assisted vivas transforms LogicQ from an educational tutor into an examination processor handling sensitive personal data. This deployment must comply with:
1. **The Digital Personal Data Protection Act, 2023 (DPDP Act - India)**:
   - Lawful purpose specification (Section 4).
   - Clear notice and informed consent (Section 5).
   - Data minimization and purpose limitation (Section 6).
   - Reasonable security safeguards and breach prevention (Section 8).
   - Protection of personal data of children / minors (Section 9).
   - Right to access, correction, and grievance redressal (Sections 11–13).
2. **University Academic Regulations & Ethical Codes**:
   - Natural justice: No student may be penalized without notice and a right to be heard.
   - Presumption of honesty: Automated indicators cannot substitute for human invigilation.
   - Protection against defamation: Internal review flags must never be publicized or shared with peers.

---

## 2. Personal & Behavioral Data Inventory

Every piece of data collected by the Assessment platform is strictly cataloged below:

| Data Category | Specific Data Item | Purpose of Collection | Access Permissions | Retention Period | Deletion Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity** | Full Name | Academic record identification | Student, Section Faculty, Admin | 3 Years (University Accreditation) | Account deletion or graduation |
| **Identity** | Institutional PRN / Roll No | Official university marks binding | Student, Section Faculty, Admin | 3 Years | Account deletion or graduation |
| **Identity** | College Email (`@sanjivani.edu.in`) | Authentication & notifications | Student, Section Faculty, Admin | 3 Years | Account deletion or graduation |
| **Identity** | Mobile Phone Number *(Future Phase)* | Secondary emergency OTP | Student, Admin (Restricted) | 1 Year post-academic term | On request or term completion |
| **Academic** | Submitted C Source Code | Automatic compilation & grading | Student, Section Faculty, Admin | 3 Years (ABET/NAAC audit) | Program end |
| **Academic** | Test Case Pass/Fail Timestamps | Code correctness verification | Student, Section Faculty, Admin | 3 Years | Program end |
| **Academic** | Solved Academic Marks ($0.0, 0.5, 1.0$) | Final semester gradebook compilation | Student, Section Faculty, Admin | Permanent (University Archive) | Official archive policy |
| **Academic** | AI Viva Prompts & Typed Answers | Code comprehension verification | Student, Section Faculty, Admin | 1 Year (Exam audit window) | Course completion |
| **Behavioral** | Clipboard Attempt Counts (Copy/Paste/Cut) | Indicator of external text insertion | Section Faculty, Admin (Faculty only) | 90 Days post-assessment | End of semester grade finalization |
| **Behavioral** | Focus Loss Events & Duration (ms) | Indicator of browser tab switching | Section Faculty, Admin (Faculty only) | 90 Days post-assessment | End of semester grade finalization |
| **Behavioral** | Full-Screen Exit Counts | Indicator of application switching | Section Faculty, Admin (Faculty only) | 90 Days post-assessment | End of semester grade finalization |
| **Behavioral** | Typing Rates (CPM, WPM, Char Delas) | Behavioral cadence aggregate | Section Faculty, Admin (Faculty only) | 90 Days post-assessment | End of semester grade finalization |
| **Behavioral** | Compilation Error Counts & Runs | Diagnostic debugging behavior | Student, Section Faculty, Admin | 90 Days post-assessment | End of semester grade finalization |

---

## 3. Strict Architectural Data Separation (Three-Tier Isolation)

To eliminate the risk of accidental PII leakage or unauthorized behavioral tracking, LogicQ implements strict three-tier data isolation at the schema, storage, and Firestore rules levels:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THREE-TIER DATA ISOLATION PERIMETER                           │
│                                                                                                 │
│  TIER 1: IDENTITY VAULT (`/users/{uid}`, `/prnIndex/{prn}`)                                     │
│  ├── Private PII: Name, PRN, Email, Department, Year, College.                                  │
│  └── Access: Student owner (read-only self), Institution Admins. Peer access: FORBIDDEN.       │
│                                                                                                 │
│  TIER 2: ACADEMIC STORE (`/assessments/{id}`, `/assessment_attempts/{id}`)                      │
│  ├── Official Submissions: Problem ID, Submitted Code, Execution Result, Academic Marks.        │
│  └── Access: Student owner (own marks), Section Faculty (assigned cohort), University Registrar.│
│                                                                                                 │
│  TIER 3: BEHAVIORAL AUDIT VAULT (`/assessment_integrity/{id}`, `/admin_audit_logs/{id}`)       │
│  ├── Telemetry Indicators: Blur duration, paste counts, full-screen toggles, typing aggregates. │
│  └── Access: Assigned Section Faculty & Exam Disciplinary Cell ONLY.                             │
│      Student access: Obfuscated/Aggregated summary only. Peer access: FORBIDDEN.                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Invariant Rules:
1. **No Mixed Payloads**: An API request querying an academic score (`GET /api/exam/my-grades`) **never** includes behavioral telemetry or integrity indicators in its JSON response.
2. **No Automated Deductions**: Academic scores and integrity scores are calculated in distinct decoupled services and stored in separate database columns.

---

## 4. Special Provisions for Students Under 18 (DPDP Act Section 9)

In Indian undergraduate engineering institutions, a subset of First-Year (FY) students may be 17 years old upon admission.

### 4.1 Legal Mandates (DPDP Act, 2023)
- Section 9(1): Verifiable consent of parent/lawful guardian must be obtained before processing personal data of a child.
- Section 9(2): A data fiduciary shall **not undertake tracking or behavioral monitoring** of children or targeted advertising directed at children.

### 4.2 Institutional Framework & Recommendations
1. **Institutional Authorization (*In Loco Parentis*)**:
   - The college legal counsel and Registrar must confirm whether the institutional admission agreement includes parental authorization for university examination proctoring and educational technology processing.
2. **Alternative Assessment Provision**:
   - If parental consent cannot be verified for a minor student, the student must be provided an equivalent paper-and-pen or physical lab assessment with manual human invigilation, **with zero academic disadvantage**.
3. **Behavioral Tracking Restriction**:
   - For confirmed minors without explicit parental consent on file, client-side behavioral telemetry (typing cadence, focus tracking) is **automatically bypassed**, relying strictly on manual human lab invigilation.
4. *Disclaimer*: This document outlines technical mechanisms and does not constitute formal legal counsel. University management must validate these workflows with their designated legal officer.

---

## 5. Mandatory Assessment Consent & Disclosure Notice

Before entering any Assessment Mode session, students must read and affirmatively accept the following standardized notice:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      LOGICQ INSTITUTIONAL ASSESSMENT CONSENT & INTEGRITY NOTICE                 │
│                                                                                                 │
│  Course: [Course Name]                          Section: [Section Name]                         │
│  Duration: [X] Minutes                          Exam Window: [Start Time] to [End Time] IST    │
│                                                                                                 │
│  NOTICE TO STUDENTS REGARDING EXAMINATION MONITORING:                                           │
│  This is an official university assessment. By clicking "I Agree & Enter Assessment", you       │
│  acknowledge and consent to the following examination environment parameters:                  │
│                                                                                                 │
│  1. What We Collect During This Session:                                                        │
│     - Your submitted C source code, compilation outputs, and execution results.                 │
│     - The exact timestamp when you start, run, and submit each question.                        │
│     - Browser focus-loss events (tab switches or minimizing this window).                       │
│     - Clipboard interactions (copy and paste attempts inside the code editor).                  │
│     - Answering brief typed comprehension questions (AI Viva) on selected submissions.          │
│                                                                                                 │
│  2. What We DO NOT Collect:                                                                     │
│     - We DO NOT access your webcam, microphone, or camera.                                      │
│     - We DO NOT record your screen outside this browser tab.                                    │
│     - We DO NOT log your passwords, personal files, or browsing history.                        │
│                                                                                                 │
│  3. How Data Is Evaluated:                                                                      │
│     - Your Academic Score is based strictly on code correctness and completion within time.     │
│     - Behavioral events (such as tab switches) are advisory indicators provided exclusively to   │
│       your faculty instructor for manual human review.                                          │
│     - NO AUTOMATED PENALTY OR GRADE DEDUCTION IS EVER APPLIED BY AN ALGORITHM.                  │
│                                                                                                 │
│  [ ] I confirm that I am logged in with my official university PRN and institutional email.     │
│  [ ] I have read, understood, and accept the assessment environment terms.                      │
│                                                                                                 │
│                                  [ I AGREE & ENTER ASSESSMENT ]                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Student Visibility of Integrity Telemetry & Evasion Prevention

### 6.1 What Students May See (Post-Exam)
To ensure transparency without compromising examination security:
- **Permitted Student Visibility**:
  - Number of questions completed and academic marks awarded.
  - Objective session facts: *"Session completed in 42 minutes. 1 focus-loss event logged (duration 3s)."*
  - The status of their viva submission: *"Comprehension answer submitted for review."*
- **Prohibited Student Visibility**:
  - Students are **never shown an internal numeric "Integrity Score" (e.g. 74/100)** or subjective risk tiers (*"High Risk"*, *"Suspicious"*).
  - Students are **never shown internal detection thresholds** (e.g., that $>15\%$ burst triggers a review flag). Exposing thresholds provides dishonest actors with an exact roadmap to tune automated cheating scripts just below the trigger line.

---

## 7. Due Process, Appeals & Non-Automated Penalty Rule

### 7.1 Absolute Rule Against Automated Academic Penalties
> **Fundamental Fairness Guarantee**: Under no circumstances shall an algorithm, telemetry indicator, or AI score automatically deduct marks, invalidate a test, or issue a disciplinary penalty against a student.

Every integrity flag is strictly an **advisory alert for human review**. Only an authorized faculty invigilator or Departmental Disciplinary Committee has the legal authority to award a penalty.

### 7.2 Formal Student Appeal & Review Workflow
1. **Notice of Inquiry**: If faculty flags a session for severe irregularities (e.g., multiple large paste bursts accompanied by extensive focus loss), the student receives a written notification specifying the questions under review.
2. **Code Defense Hearing**: The student is invited to explain their code logic in person or during office hours before the faculty instructor. If the student demonstrates full mastery of their solution, the submission is confirmed and marks are upheld.
3. **Immutable Audit Playback**: Faculty have access to the complete session playback (revisions, timestamps, and test pass progression) to verify whether code emerged naturally or was pasted in bulk.
4. **Appeals Body**: Students have the formal right to appeal any adverse departmental finding to the College Examination Cell within 7 working days.

---

## 8. Technical Boundaries of In-Browser Proctoring

### What the Platform CANNOT Detect (Zero False Guarantees)
To prevent creating a false sense of security or overpromising to college administration, the platform explicitly acknowledges the hardware and sandboxing limits of modern web browsers:
1. **Physical External Devices**: A standard web browser running on a lab PC **cannot** detect a smartphone, tablet, or secondary laptop placed directly beside the screen.
2. **Secondary Hardware Displays**: The browser cannot detect hardware HDMI splitters, video capture cards, or physical screen mirrors configured at the OS hardware layer.
3. **Virtual Machines & RDP Sessions**: Running the browser inside a VMware/VirtualBox guest or remote desktop session cannot be reliably differentiated from a native host without kernel-level spyware.
4. **Hardware Keyloggers & Macro Keyboards**: Programmable USB keyboards that type out stored code at human typing speeds (300 CPM) appear identical to manual typing.
5. **Physical Impersonation**: Without active proctoring cameras or biometric hardware, the browser cannot verify the physical identity of the person sitting in front of the keyboard.

### Operational Implication:
LogicQ must be marketed and deployed as an **AI-resistant lab assistant for proctored computer labs**, where physical faculty invigilators walk the aisles. It must **never** be marketed as an unmonitored "take-home anti-cheat proctoring" solution.
