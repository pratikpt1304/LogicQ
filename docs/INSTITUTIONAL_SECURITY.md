# LogicQ Institutional Security, Identity Governance & Incident Runbook

> [!IMPORTANT]
> **Honest Security Posture**: LogicQ employs layered defense-in-depth across authentication, Firestore rules, Cloud Functions, browser headers, and container sandboxing. **We never claim the application is "100% unbreakable" or "fully secure."** Section 9 below explicitly documents residual risks and manual cloud configuration steps required from the project owners.

---

## 1. Campus Identity & Verification (Sanjivani College Only)

LogicQ is built exclusively for verified students and faculty of **Sanjivani College**.

### 1.1 Identity Rules
1. **Google Sign-In + Verified Email**:
   - Authentication uses Firebase Auth with Google Sign-In (plus optional verified email/password in local emulator testing).
   - Server middleware and Cloud Functions strictly require `request.auth.token.email_verified == true`.
2. **Server-Side College Domain Check**:
   - The server validates that the user's email domain matches `ALLOWED_EMAIL_DOMAINS` (e.g., `sanjivani.org.in`, `sanjivanicoe.org.in`). Client-side checks are for UX only; the server enforces the restriction on account creation and token exchange.
3. **Optional Roll-Number & Email Allowlist CSV**:
   - Admins can upload a CSV roster (`rollNumber,email,fullName,department,graduationYear`) to `/system_config/allowlist_roster`.
   - When `ENFORCE_ALLOWLIST_CSV=true`, a student can register only if their verified college email exists in the approved roster, automatically binding their official `rollNumber` to their profile.
4. **Zero College UMS Password Collection**:
   - LogicQ **never** asks for, stores, proxies, or scrapes any college ERP/UMS password or external institutional portal credential.

---

## 2. Session Management, Idle Timeout & Role-Change Revocation

1. **Short-Lived Tokens & 30-Minute Idle Timeout**:
   - ID/Access tokens are short-lived (15–60 minutes).
   - The client tracks user activity (`mousemove`, `keydown`, `click`, editor keystrokes) and enforces a default **30-minute idle timeout** (`VITE_IDLE_TIMEOUT_MINUTES=30`), automatically signing out inactive sessions on shared lab computers.
2. **"My Sessions" Management (`/profile` -> Active Sessions)**:
   - Each login creates a session metadata record in `/users/{uid}/sessions/{sessionId}` containing `device`, `browser`, `os`, `coarseLocation` (`city, country`), `createdAt`, and `lastActiveAt`.
   - Students can click **"Revoke Session"** on any individual device or **"Revoke All Other Sessions"** (which calls Firebase Admin `revokeRefreshTokens(uid)` and updates `tokensValidAfterTime`).
3. **Mandatory Re-Login on Role Change**:
   - Whenever an admin promotes or demotes a user (`STUDENT <-> ADMIN`), the server updates custom claims (`setCustomUserClaims`), revokes all refresh tokens for that `uid`, and increments `securityVersion`, forcing an immediate re-login.

---

## 3. Login History, Anomaly Detection & Brute-Force Protection

1. **Login Telemetry (`/users/{uid}/login_history/{loginId}`)**:
   - Stores `timestamp`, `ipHash` (salted SHA-256 for privacy), `coarseLocation` (Country/City derived from request geo headers), and parsed `deviceSummary` (`OS + Browser`).
2. **Unusual Login Flagging**:
   - If a login originates from a new country or an unrecognized device after a rapid geo-shift, the server flags the login (`isUnusual: true`), displays a security banner on the user's dashboard, and logs a security event for admin visibility.
3. **Lockout & Rate Limiting**:
   - Auth endpoints enforce strict IP and account rate limits (`10 attempts / 15 minutes`). Exceeding the threshold triggers a temporary 15-minute cooldown (`HTTP 429 Too Many Requests`).

---

## 4. Administrator Security, Mandatory MFA & Step-Up Re-Authentication

1. **Minimal Admin Footprint & Mandatory MFA**:
   - Production is restricted to a small number of named administrators (plus 2 Firebase Project Owners for break-glass continuity).
   - Admin accounts must enroll in Multi-Factor Authentication (TOTP/SMS) via Firebase Authentication settings; the backend checks `auth.token.firebase.sign_in_second_factor` when `ENFORCE_ADMIN_MFA=true`.
2. **Step-Up Re-Authentication for Destructive/Sensitive Actions**:
   - Before executing **Ban/Unban User**, **Role Change**, **Delete/Retire Problem**, or **Rejudge Submissions**, the admin must have a fresh authentication timestamp (`auth_time` within the last 5 minutes) or complete a step-up confirmation modal.
3. **Safe First-Admin Seed Command (Zero Default Passwords)**:
   - There are **no hardcoded default admin passwords** in source code.
   - The initial admin is provisioned via a CLI seed script (`npm --prefix server run seed:admin`) reading `ADMIN_EMAIL` (and environment-injected secret or Google UID) from environment variables.

---

## 5. Append-Only Audit Log (`/admin_audit_logs`)

- Every admin mutation (problem create/update/retire, daily challenge schedule, auto-fallback selection, user ban/unban, role change, manual weekly job run, rejudge, integrity flag decision, pause day creation) writes an immutable record to `/admin_audit_logs/{logId}`:
  - Fields: `id`, `actorUid`, `actorEmail`, `action`, `targetType`, `targetId`, `metadata`, `ipHash`, `createdAt`.
- Firestore Security Rules enforce `allow read: if isAdmin(); allow write: if false;` (written exclusively via Firebase Admin SDK).
- Admins can view, filter, and export the audit log as `JSON` or `CSV` from the Admin Dashboard, and **nobody (including admins) can edit or delete audit entries** from the application.

---

## 6. Hosting Headers, Monaco CSP & Frontend Sanitization

### 6.1 Required HTTP Security Headers (`firebase.json` & Express Helmet)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

### 6.2 Browser-Tested Content-Security-Policy (Monaco Compatible)
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://cdn.jsdelivr.net; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.google.com; img-src 'self' data: https://*.googleusercontent.com; frame-src https://accounts.google.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self';
```

### 6.3 Frontend Sanitization & Bundle Hygiene
- All Markdown problem statements, editorials, and user-provided strings are sanitized with `DOMPurify` (no raw `dangerouslySetInnerHTML` with unsanitized user content).
- Client bundle contains zero secrets (only public `VITE_FIREBASE_*` identifiers).
- Automated `npm audit` and secret scanning run before deployment.

---

## 7. Vulnerability Disclosure (`/.well-known/security.txt`) & Policy

1. **`client/public/.well-known/security.txt`**:
   ```text
   Contact: mailto:security@sanjivani.org.in
   Policy: https://logicq-clanguage.web.app/security-policy
   Preferred-Languages: en
   Canonical: https://logicq-clanguage.web.app/.well-known/security.txt
   Expires: 2027-10-10T00:00:00.000Z
   ```
2. **Responsible Disclosure Page (`/security-policy`)**:
   - Defines scope (Firestore rules, auth bypass, judge sandbox escape, XSS/CSRF), safe-harbor rules for Sanjivani students reporting bugs in good faith, and prohibition of DoS or accessing other students' data.

---

## 8. Security Incident Response Runbook

| Severity | Trigger Event | Immediate Action (< 15 Mins) | Recovery & Post-Mortem |
| :--- | :--- | :--- | :--- |
| **SEV-1: Judge Sandbox Anomaly** | Container breakout attempt or host resource exhaustion | Rotate `JUDGE_SHARED_SECRET` in Secret Manager; scale Cloud Run judge max instances to `0` (`MAINTENANCE_MODE=true`). | Inspect container logs, patch seccomp/Dockerfile, run `judge-malicious.test.ts`, redeploy. |
| **SEV-1: Compromised Admin Account** | Unauthorized ban, role elevation, or problem tampering | Second Project Owner revokes admin claim via CLI, revokes refresh tokens, and disables account in Firebase Auth. | Audit `/admin_audit_logs`, restore affected problem metadata from PITR/backup, rotate admin credentials. |
| **SEV-2: Quota / Billing Spike** | 80% or 100% Cloud Billing alert | Enable strict submission cooldown (`30s`), switch leaderboard to static snapshot cache. | Identify abusive UID/IP from rate-limit logs, ban offending account if malicious. |

---

## 9. Honest Residual Risks & Manual Setup Checklist

### 9.1 What Cannot Be Prevented Technically (Residual Risks)
1. **Second-Device AI/LLM Assistance**: A student can photograph or retype a daily challenge on a phone to ask an external LLM. *Mitigation*: Weekly similarity checks (`Phase 2`), novel C pointer/memory constraints, and using LogicQ for low-stakes practice while proctored lab exams remain in-person.
2. **Offline Peer Collaboration**: Two students sitting together can discuss an algorithm before typing distinct C code.
3. **Compromised Student Device**: Malware on a student's personal laptop can steal their active browser session until the 30-minute idle timeout or manual session revocation.

### 9.2 Manual Steps Required from Project Owner (`BLOCKED` Until Configured in Cloud Console)
1. **Firebase Blaze Plan & Budget Alerts**: Enable Blaze billing on `logicq-clanguage` and set monthly budget alerts (e.g., ₹500 / $6 USD) at 50%, 80%, and 100%.
2. **Two Project Owners**: Add a second Sanjivani faculty/admin Google account as `Owner` in Google Cloud IAM.
3. **Firebase App Check**: Register the web app with reCAPTCHA Enterprise in Firebase Console -> App Check and enable enforcement for Firestore and Functions.
4. **Google Cloud API Key Restriction**: Restrict the browser `apiKey` in GCP Credentials to HTTP referrers (`https://logicq-clanguage.web.app/*`, `https://logicq-clanguage.firebaseapp.com/*`, `http://localhost:5173/*`).
5. **Admin MFA Enrollment**: Enable Multi-Factor Authentication in Firebase Console -> Authentication -> Settings and enroll admin accounts.
6. **Sanjivani College IT Approval**: Confirm with Sanjivani Google Workspace IT whether student `@sanjivani.org.in` accounts permit `drive.appdata` OAuth scope (if blocked, LogicQ's automatic Firestore/localStorage fallback handles drafts seamlessly).
