# LogicQ Institutional Pilot Plan & Learning Metrics (`/docs/PILOT_PLAN.md`)

**Document Version**: 1.0.0 (Authoritative Pilot Specification)  
**Date**: October 15, 2026  
**Context**: Sanjivani University Pilot Deployment (~300 enrolled C programming students)  
**Primary Goal**: Measure learning efficacy, conceptual retention, and positive coding habits in C.

---

## 1. Pilot Objectives & Hypotheses

The LogicQ pilot is designed to prove that a **learning-first daily coding habit** produces measurably superior C comprehension compared to high-stakes competitive speed races.

### Core Hypotheses:
1. **Resilience Hypothesis**: Friendly GCC compiler explanations and tiered scaffolding increase the **Retry-After-Failure Rate** by $\ge 35\%$, reducing premature abandonment.
2. **Scaffolding Hypothesis**: Students accessing Hint 1 (after 2 failed attempts) achieve a $\ge 50\%$ subsequent solve rate without needing external solution copying.
3. **Consistency Hypothesis**: Removing speed and wrong-attempt penalties fosters sustained daily participation, achieving $\ge 40\%$ Week-2 active retention.
4. **Mastery Progression**: At least $60\%$ of active students complete Practice Module 1 (Control Structures) and unlock Module 2 (Pointers).

---

## 2. Quantitative Learning Metrics

| # | Metric Name | Definition & Formula | Target Benchmark | Educational Signal |
| :-: | :--- | :--- | :---: | :--- |
| **M-1** | **Retry-After-Failure Rate** | $\frac{\text{Sessions with an immediate retry within 30 min of fail}}{\text{Total failed attempts}}$ | $\ge 70\%$ | Measures grit and psychological safety; students view failures as learning opportunities rather than punitive events. |
| **M-2** | **Practice Module 1 Unlock Rate** | $\frac{\text{Students who solve } \ge 7 \text{ Module 1 problems}}{\text{Total active students}}$ | $\ge 60\%$ | Measures foundational competence in C control structures before encountering pointers. |
| **M-3** | **Hint Efficacy Rate** | $\frac{\text{Students who reach ACCEPTED within 3 attempts after viewing a Hint}}{\text{Total students who viewed a Hint}}$ | $\ge 55\%$ | Confirms hints provide actionable scaffolding without spoiling the answer. |
| **M-4** | **Week 2 Retention Rate** | $\frac{\text{Students active on } \ge 3 \text{ days in Week 2}}{\text{Students active on } \ge 3 \text{ days in Week 1}}$ | $\ge 50\%$ | Validates long-term habit formation over short-lived initial curiosity. |
| **M-5** | **Mean Time-to-Solve** | Average active editing and execution minutes between a student's first run and final accepted submission. | $15 - 35\text{ min}$ | Confirms problems are appropriately calibrated for deliberate student practice. |
| **M-6** | **Day-After Review Engagement** | $\frac{\text{Students who view the Review Guide for ended challenges}}{\text{Total students who missed or failed that day's challenge}}$ | $\ge 40\%$ | Demonstrates self-directed study and learning from missed opportunities. |
| **M-7** | **Optional Concept Delta (Quiz)** | $\text{Post-Pilot Score} - \text{Pre-Pilot Baseline Score}$ on identical 5-question conceptual C assessment. | $+25\%\text{ gain}$ | Quantifiable cognitive growth in pointer arithmetic and memory mental models. |

---

## 3. Pre/Post Pilot Diagnostic Assessment (Optional with Consent)

### Protocol:
1. **Voluntary Participation**: An optional, un-timed 5-question multiple-choice diagnostic presented during initial profile onboarding.
2. **Explicit Consent**:
   - Clear disclaimer: *"This quick 5-question check helps evaluate learning effectiveness. It does not affect your grades, points, streak, or ranking."*
   - Student can opt out with a single click (*"Skip assessment"*).
3. **Curriculum Alignment**:
   - Question 1: Operator precedence and integer division (`5 / 2 * 2.0`).
   - Question 2: Scope and lifetime of local variables.
   - Question 3: Pointer dereferencing and address-of operations (`*ptr = &val`).
   - Question 4: Array indexing vs pointer arithmetic (`*(arr + i)`).
   - Question 5: String termination and buffer boundaries (`'\0'`).
4. **Matched Post-Assessment**: At the conclusion of the 14-day pilot, consenting students are invited to take the parallel exit assessment to calculate cohort normalized learning gain ($g$).

---

## 4. Admin Reports Page Visualizations

The **Admin Reports Page** (`/admin/reports`) surfaces these pilot metrics in real time:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PILOT LEARNING ANALYTICS                                  │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ RETRY AFTER FAILURE      │ MODULE 1 COMPLETION      │ HINT EFFECTIVENESS               │
│        74.2%             │        63.8%             │        58.1%                     │
│ Target: ≥ 70% (ON TRACK) │ Target: ≥ 60% (ON TRACK) │ Solved after Hint 1 or 2         │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ WEEK-2 RETENTION         │ MEAN TIME-TO-SOLVE       │ REVIEW PAGE VISITS               │
│        52.4%             │       22.4 min           │        46.0%                     │
│ 157 of 299 students      │ Median: 18.2 min         │ 92 students reviewed missed days │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘

[ Chart: Daily Retry-After-Failure vs Abandonment Trend ]
[ Chart: Module Progression Funnel: M1 (100%) -> M2 (64%) -> M3 (38%) -> M4 (19%) ]
[ Table: Top GCC Compiler Errors Encountered & Translation Frequency ]
```

---

## 5. Privacy, Ethics & Safeguards

- **Anonymity**: All pilot metrics are aggregated across cohorts. Individual student retry counts or quiz answers are never published, shared with peers, or displayed on competitive boards.
- **Academic Freedom**: Faculty and administrators receive aggregate reports to guide classroom lectures (e.g. *"62% of students struggled with pointer decay; dedicate 15 minutes in tomorrow's lecture to this topic"*).
- **Zero Grading Penalties**: LogicQ performance does not penalize college coursework marks; it serves purely as formative learning enrichment.

---
