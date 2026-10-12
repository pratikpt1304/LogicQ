# Changelog

All notable changes to LogicQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-pilot] - 2026-10-12

### Added
- **Strict 3-Role Architecture**: Supported roles simplified to `admin`, `checker`, and `student`. Added extensible `ROLES_REGISTRY`.
- **Checker Blind Review Portal (`/checker/reviews`)**:
  - Blind reviews with `SUB-XXXX` tokens (zero student PII displayed).
  - Formula-driven rubric points calculation (Correct Logic 50%, Flowchart 30%, Clarity 20%).
  - 30-minute decision edit window with immutable history in `UploadReview`.
  - Conflict-of-interest rule preventing checkers from receiving their own uploads.
  - Automatic 48-hour SLA returning stale assigned uploads to unassigned pool.
- **Admin Checkers Workload Management**:
  - Live workload queue count, completed reviews telemetry, and pause/resume toggles.
  - Round-robin auto-balancing of unassigned uploads across active checkers.
  - Minimum 2 administrators invariant with overview warning banner.
- **Single Question Window Rule**:
  - Students see exactly ONE challenge at a time (from 17:00 IST to 17:00 IST).
  - All past and future challenges return 404/410 to students.
- **Session Persistence**:
  - Session persists across page refreshes, new tabs, browser restarts, and PWA launch.
  - Branded splash screen eliminating flashes of the login page.
- **Installable Progressive Web App (PWA)**:
  - Responsive down to 360px viewport with mobile C symbol toolbar.
  - Manifest and service worker caching shell assets while failing closed on auth/API.
- **PRN Academic Identity Enforcement**:
  - 12-digit PRN validation, atomic `prnIndex` uniqueness lock, and masked display.

### Changed
- Replaced binary role checks with extensible role definitions and normalized role middleware.
- Updated idle timeout limits: 7 days for students, 8 hours for checkers, 30 minutes for admins.

### Removed
- Removed Arena, Archive, and Badges features from UI, routes, database schemas, and Firestore security rules.
- Removed legacy `Owner`, `Content admin`, `Reviewer`, `Viewer`, Faculty, and Moderator concepts.
