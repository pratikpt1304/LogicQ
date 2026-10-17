# Changelog

All notable changes to LogicQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-pilot] - 2026-10-17

### Added
- **Practice Active Timers & Completion Reports**:
  - Each Practice question tracks active engagement time (accumulates only while page is open, tab is visible, and student is active within 2 minutes; pauses on tab hide/idle; continues across close/reopen and devices).
  - Permanent timer freeze upon first `ACCEPTED` verdict ("Solved in mm:ss"); untimed retries.
  - "Hide timer" preference toggle for distraction-free coding without stopping background recording.
  - Comprehensive per-module and final (40/40) performance audit reports with timing distributions, attempt metrics, and printable summaries (strictly protecting institutional privacy by omitting PRN and M/F indicators).
- **Judge Connectivity & Honest Error Classification**:
  - Authored `/docs/JUDGE_CONNECTIVITY_AUDIT.md` resolving the dual-channel paradox where network errors were falsely displayed on normal connections.
  - Client API client (`client.ts`) now classifies honest operational states (`OFFLINE`, `JUDGE_UNREACHABLE`, `SERVER_UNAVAILABLE`, `JUDGE_BUSY` with queue position, `RATE_LIMITED`, `SESSION_EXPIRED`, `TIMEOUT`).
  - Added non-destructive code retention and in-drawer interactive Retry button on execution errors.
- **Mathematical Typography & Universal LaTeX Sanitization**:
  - Converted all raw math to accessible, high-contrast Unicode (`≤`, `≥`, `×`, `−10⁹ ≤ A, B, C ≤ 10⁹`) across all 40 practice problems, daily challenges, and book banks.
  - Automated scanner verified 0 unrendered LaTeX tokens across all problem definitions.
  - Admin problem authoring features Live Student Preview, "Auto-Format to Clean Unicode" one-click action, and publish-time validation rejecting unrendered LaTeX.
- **Curriculum Practice Modules (4 Modules, 40 Problems)**:
  - 4 foundational modules covering the engineering C syllabus: Control Structures, Pointers & Functions, Arrays & Applications, and Advanced Data Types & Dynamic Memory.
  - Exactly 10 problems per module (4 Easy, 4 Medium, 2 Hard), fully authored and validated.
  - Sequential 10-of-10 unlock rule driven by single source of truth configuration (`PRACTICE_CONFIG.practiceUnlockThreshold = 10`).
- **Alphanumeric University PRN Identity & Mobile Keyboard**:
  - Enforced 12-character format: 4 digits + 3 letters + M/F + 4 digits (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`).
  - Mobile inputs open full alphanumeric keyboard (`type="text"`, `inputmode="text"`, `autocapitalize="characters"`), uppercase dynamically as students type, trim whitespace, and display live counter (`8/12`).
  - Unique atomic `prnIndex` registry with 30-day anti-squatting hold on released PRNs.
  - Self-service monthly PRN update with rolling 30-day cooldown and masked public display (`••••••••1039`).
- **Pure Daily Competition Engine (Paused for Pilot)**:
  - 17:00 IST daily challenge cycle with 24-hour evaluation window and 10-minute drain grace.
  - Safe pause switch (`dailyChallengePaused = true`) keeping daily pool active in paused preview mode until curriculum sign-off.
  - Consistency-ordered daily ranking (Streak -> Total Solved -> Stable ID; speed/attempt penalties removed).
  - Percentile scoring displayed only when $\ge 10$ unique students have solved the daily problem.
- **Cross-Device State Sync & Multi-Session Persistence**:
  - Firestore-backed draft autosaving with device labeling (`users/{userId}/drafts/{problemId}`) and conflict-resolution chooser.
  - Multi-session preservation across phones, laptops, and browsers; fixed empty data display on second device sign-in.
  - Splash screen and token refresh preventing unexpected session logouts on page reload (F5).
- **Blinded Checker Review Portal (`/checker/reviews`)**:
  - Anonymized token assignments (`SUB-XXXX`) protecting student identities from grading checkers.
  - Rubric-based scoring formula: Correct Logic (50%), Flowchart (30%), Code Clarity (20%).
  - 30-minute decision edit window with immutable `UploadReview` audit log and 48-hour SLA auto-reassignment.
- **Optional Student Google Drive Backup**:
  - Non-blocking, optional history and draft export using narrow `drive.file` / `drive.appdata` scope.
  - Core app operates 100% on Firebase with zero Drive dependency.

### Changed
- **Monaco Editor Ergonomics**:
  - Disabled font ligatures (`fontLigatures: false`) so `!=`, `<=`, `>=`, `==`, `->` show literally without glyph replacement.
  - Set `renderWhitespace: 'none'` to eliminate distracting whitespace dots.
  - Collapsed initial cursor selection to Line 1, Column 1 on mount; starter code is never pre-selected.
  - Sanitized starter boilerplate for beginner problems (`#include <stdio.h>`, `int main()`, clean `// TODO`, removing complex long-long checks).
  - Added "Reset to Starter Template" button and newline/BOM sanitization.
- **Toast Alert Positioning**:
  - Positioned toasts at bottom-center above safe area on mobile (`< 768px`) and top-right below header on desktop (`>= 768px`) with dismiss button and `aria-live: polite`.
  - Toasts never overlap or obscure the editor toolbar, Run, Submit, or timer.
- **Streamlined Roles**:
  - Simplified role matrix to `student`, `checker`, and `admin`. Admin self-demotion blocked; minimum 2 administrators invariant enforced.
- **Updated Idle Timeouts**:
  - 7 days for students, 8 hours for checkers, 30 minutes for admins.

### Removed
- **Practice Scope Enforcement**: Removed "Upload Files" tab from Practice workspace, preserving Practice mode as strictly code-only.
- **Legacy Features**: Removed Arena, Archive, and Badges features from UI, routes, database schemas, and Firestore security rules to focus purely on foundational C programming pedagogy.
