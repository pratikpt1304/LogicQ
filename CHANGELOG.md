# Changelog

All notable changes to LogicQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-pilot] - 2026-10-15

### Added
- **Curriculum Practice Modules (4 Modules, 40 Problems)**:
  - 4 foundational modules covering the engineering C syllabus: Control Structures, Pointers & Functions, Arrays & Applications, and Advanced Data Types & Dynamic Memory.
  - Exactly 10 problems per module (4 Easy, 4 Medium, 2 Hard), fully authored and validated.
  - Sequential 10-of-10 unlock rule driven by single source of truth configuration (`PRACTICE_CONFIG.practiceUnlockThreshold = 10`).
  - Dynamic UI requirement labels and server-side unlock validation.
- **Pure Daily Competition Engine (Paused for Pilot)**:
  - 17:00 IST daily challenge cycle with 24-hour evaluation window and 10-minute drain grace.
  - Safe pause switch (`dailyChallengePaused = true`) keeping daily pool active in paused preview mode until curriculum sign-off.
  - Consistency-ordered daily ranking (Streak -> Total Solved -> Stable ID; speed/attempt penalties removed).
  - Percentile scoring displayed only when $\ge 10$ unique students have solved the daily problem.
- **Cross-Device State Sync & Multi-Session Persistence**:
  - Firestore-backed draft autosaving with device labeling (`users/{userId}/drafts/{problemId}`) and conflict-resolution chooser.
  - Multi-session preservation across phones, laptops, and browsers; fixed empty data display on second device sign-in.
  - Splash screen and token refresh preventing unexpected session logouts on page reload (F5).
- **Alphanumeric University PRN Identity**:
  - Enforced 12-character format: 4 digits + 3 letters + M/F + 4 digits (`^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$`).
  - Unique atomic `prnIndex` registry with 30-day anti-squatting hold on released PRNs.
  - Self-service monthly PRN update with rolling 30-day cooldown and masked public display (`••••••••1039`).
- **Blinded Checker Review Portal (`/checker/reviews`)**:
  - Anonymized token assignments (`SUB-XXXX`) protecting student identities from grading checkers.
  - Rubric-based scoring formula: Correct Logic (50%), Flowchart (30%), Code Clarity (20%).
  - 30-minute decision edit window with immutable `UploadReview` audit log and 48-hour SLA auto-reassignment.
- **Optional Student Google Drive Backup**:
  - Non-blocking, optional history and draft export using narrow `drive.file` / `drive.appdata` scope.
  - Core app (login, challenge, practice, code judge, uploads) operates 100% on Firebase with zero Drive dependency.
  - Dismissible reminder card and gentle handling of managed institutional Google Workspace account restrictions.
- **Security & Infrastructure Hardening**:
  - Comprehensive deny-by-default Firestore rules (`firestore.rules`) and Storage rules (`storage.rules`).
  - Session events logging (`session_events/{eventId}`) for auditability.
  - Sandboxed GCC C11 compiler runner with CPU time caps (1.0s), memory limits (128 MB), and malicious syscall protection.
  - Monaco editor bundled locally; removed CDN dependencies and Socket.IO runtime; clean CSP without console errors.
  - Fully installable PWA with custom mobile C-symbol helper keyboard toolbar.

### Changed
- Streamlined user role matrix into three distinct roles: `student`, `checker`, and `admin`.
- Simplified UI navigation: added persistent Home button; streamlined sidebar and top navbar.
- Updated idle timeouts: 7 days for students, 8 hours for checkers, 30 minutes for admins.

### Removed
- Removed Arena, Archive, and Badges features from UI, routes, database schemas, and Firestore security rules to focus purely on foundational C programming pedagogy.
- Removed legacy unvalidated questions and obsolete multi-role permissions.
