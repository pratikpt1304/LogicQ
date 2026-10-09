# LogicQ Security Controls, Verification Matrix & Residual Risk Audit

> **SECURITY POSTURE DECLARATION**:  
> No software system is "100% unbreakable" or "fully secure." LogicQ enforces rigorous defense-in-depth controls across authentication, database access, compiler execution, and network transport. This document provides a transparent audit of all controls, automated test results, manual Google Cloud Console dependencies, and honest residual risks.

---

## 1. Comprehensive Security Controls Verification Matrix

| # | Security Control Domain | Specific Security Mechanism | Verification Method | Verification Result | Dependency / Manual Action Needed |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **1.1** | **Firestore Access** | Deny-by-default top-level rule (`allow read, write: if false;`) | `firestore-security-rules.test.ts` | ✅ **PASS** | Verified in local rules test suite. |
| **1.2** | **Score Tampering** | Clients blocked from writing verdicts, points, streaks, or ranks | `firestore-security-rules.test.ts` (CHEAT 1, 6) | ✅ **PASS** | Automated test proves client write rejected. |
| **1.3** | **Privilege Escalation**| Clients blocked from self-assigning `ADMIN` role | `firestore-security-rules.test.ts` (CHEAT 2) | ✅ **PASS** | Role modifications rejected. Custom claims required. |
| **1.4** | **Test Suite Secrecy** | Hidden test cases subcollection completely unreadable by clients | `firestore-security-rules.test.ts` (CHEAT 3) | ✅ **PASS** | Rules evaluate to false for all client tokens. |
| **1.5** | **Peer Code Privacy** | Students can read only their own submissions | `firestore-security-rules.test.ts` (CHEAT 4) | ✅ **PASS** | Cross-student queries rejected. |
| **1.6** | **History Immutability**| Clients blocked from deleting submissions | `firestore-security-rules.test.ts` (CHEAT 5) | ✅ **PASS** | Submission `delete` operation rejected. |
| **2.1** | **Backend Auth & RBAC**| Cloud Functions check `context.auth` and custom claims | Middleware unit tests | ✅ **PASS** | Unauthenticated and unauthorized calls rejected. |
| **2.2** | **Input Validation** | All endpoint parameters validated via strict Zod schemas | Server integration tests | ✅ **PASS** | Malformed payloads rejected with HTTP 400. |
| **2.3** | **Error Sanitization** | Generic error messages returned to clients (no stack traces) | Express error handler audit | ✅ **PASS** | Internal database paths masked in responses. |
| **2.4** | **Firebase App Check** | Rejects requests without valid App Check token | Code verification | ⚠️ **PENDING GCP SETUP** | Requires registering Web App in Firebase App Check with reCAPTCHA Enterprise. |
| **2.5** | **Secret Management** | Judge secrets and OAuth keys stored in Secret Manager | Architecture verification | ⚠️ **PENDING GCP SETUP** | Secrets must be provisioned in Google Cloud Secret Manager. |
| **3.1** | **Identity Provider** | Google Sign-In only (password authentication disabled in prod) | Auth provider configuration | ✅ **PASS** | Native Google Identity Services OAuth. |
| **3.2** | **Campus Whitelist** | Server-side validation of college email domain | `ACCESS.md` & Auth service | ✅ **PASS** | Rejects non-whitelisted domains when `DOMAIN_RESTRICTED`. |
| **3.3** | **Email Verification** | Requires `email_verified: true` from Google Identity | Auth token verification | ✅ **PASS** | Handled natively by Google OAuth ID tokens. |
| **3.4** | **Admin MFA** | Multi-Factor Authentication mandatory for admin accounts | Firebase Auth console policy | ⚠️ **PENDING GCP SETUP** | Admin accounts must enroll in TOTP/SMS 2FA in Firebase Auth. |
| **3.5** | **Safe Admin Seed** | First admin generated via environment variable / crypto seed | `launch_reset.ts` / `seed.ts` | ✅ **PASS** | Zero default passwords in source code. |
| **4.1** | **Transport Security** | Strict-Transport-Security (HSTS), nosniff, frame protection | Express Helmet & Caddy headers | ✅ **PASS** | Verified security headers in server response. |
| **4.2** | **Monaco Editor CSP** | Content-Security-Policy supporting Monaco Web Workers (`blob:`) | Browser console & CSP test | ✅ **PASS** | Monaco initializes without CSP console violations. |
| **5.1** | **XSS Prevention** | DOMPurify sanitization on all Markdown and user inputs | Component audit (`react-markdown`) | ✅ **PASS** | Script injection tags stripped before rendering. |
| **5.2** | **Client Bundle Audit**| Zero secrets or private keys in Vite frontend bundle | Build inspection (`dist/`) | ✅ **PASS** | Only `VITE_` public Firebase config present. |
| **5.3** | **Dependency Safety** | Dependency vulnerability scan (`npm audit`) | CI audit | ✅ **PASS** | High and Critical vulnerabilities remediated. |
| **6.1** | **Infinite Loop Stop** | Watchdog timer terminates runaway processes (`SIGKILL`) | `judge-malicious.test.ts` (MALICIOUS 1) | ✅ **PASS** | Intercepted strictly within timeout limit (TLE). |
| **6.2** | **Stack Bomb Crash** | Stack overflow crashes caught cleanly without hanging process | `judge-malicious.test.ts` (MALICIOUS 2) | ✅ **PASS** | Caught and reported as `RUNTIME_ERROR`. |
| **6.3** | **Path Traversal Stop** | Directory traversal out of temp sandbox to read server `.env` | `judge-malicious.test.ts` (MALICIOUS 3) | ✅ **PASS** | Private server files return NULL / Access Denied. |
| **6.4** | **Stdout Flood Capping**| Output streams truncated at buffer cap (64KB–1MB) | `judge-malicious.test.ts` (MALICIOUS 4) | ✅ **PASS** | Process terminated upon exceeding output cap. |
| **6.5** | **Compile Bomb Stop** | Macro recursion halted by compiler timeout | `judge-malicious.test.ts` (MALICIOUS 5) | ✅ **PASS** | Intercepted within compiler timeout ceiling. |
| **6.6** | **Arithmetic Errors** | Division by zero reported cleanly without process zombie | `judge-malicious.test.ts` (MALICIOUS 6) | ✅ **PASS** | Emits clean `RUNTIME_ERROR`. |
| **6.7** | **Fail-Closed Sandbox** | Refuses to judge if safe sandbox is unconfigured in production | `judge.factory.ts` | ✅ **PASS** | Prevents accidental execution of local GCC in production. |
| **7.1** | **Audit Logging** | All administrative actions logged to immutable collection | `admin_audit_logs` schema | ✅ **PASS** | Admins cannot edit or clear audit records. |
| **7.2** | **Abuse Alerting** | Spikes in failed logins or submissions trigger rate limits | Rate limiter middleware | ✅ **PASS** | 429 Too Many Requests emitted upon exceeding thresholds. |

---

## 2. Tested Monaco-Compatible Content-Security-Policy (CSP)

Monaco Editor dynamically instantiates syntax-highlighting Web Workers via `blob:` URLs. Standard restrictive CSP headers will break Monaco unless specifically configured:

### Validated CSP Header:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com; img-src 'self' data: https://*.googleusercontent.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self';
```

---

## 3. Manual Google Cloud Console Setup Requirements

The following controls cannot be configured purely in code and require manual configuration in the Google Cloud Console / Firebase Console before opening to external users:

1. **Firebase App Check Enrollment**:
   - Navigate to **Firebase Console** -> **App Check**.
   - Register the Web App using **reCAPTCHA Enterprise** (or reCAPTCHA v3).
   - Enforce App Check on Cloud Firestore and Cloud Functions.
2. **Google Cloud API Key Restrictions**:
   - In **Google Cloud Console** -> **APIs & Services** -> **Credentials**:
   - Restrict Browser API Key to **HTTP referrers**: `https://logicq.yourcollege.edu/*`.
   - Restrict API Key services exclusively to: *Firebase Authentication, Cloud Firestore, Google Drive API*.
3. **Admin Multi-Factor Authentication (MFA)**:
   - In **Firebase Console** -> **Authentication** -> **Settings**:
   - Enable Multi-Factor Authentication (SMS or TOTP Authenticator Apps) for all users with `ADMIN` role.
4. **Google Cloud Secret Manager**:
   - Create secret `JUDGE0_KEY` and `JUDGE_SECRET` in Secret Manager.
   - Grant `Secret Manager Secret Accessor` role to the default Cloud Functions service account (`<project>@appspot.gserviceaccount.com`).
5. **Google Cloud Billing Budget Alerts**:
   - Create monthly budget alert of $10.00 / month with 50%, 80%, 100%, 120% email triggers to both Project Owners.

---

## 4. Honest Residual Risk Assessment

LogicQ candidly documents the residual risks inherent to web-based educational competitive programming:

1. **Second-Device & LLM Cheating**:
   - *Risk*: A student can paste problem statements into an LLM (e.g. ChatGPT, Claude) on a separate laptop, tablet, or smartphone and retype the C solution into Monaco.
   - *Mitigation*: Timed contests with rapid solve velocity, AST token similarity comparison, and original/novel problem statements. Invasive proctoring spyware is rejected for ethical privacy reasons.
2. **Offline Peer Collaboration**:
   - *Risk*: Students physically co-located in dorms or communicating via private Discord/WhatsApp groups can share logic.
   - *Mitigation*: Code token similarity detection flags $\ge 85\%$ matching ASTs for instructor review.
3. **Compromised Student Google Accounts**:
   - *Risk*: If a student's personal Gmail account is phished or hacked, an adversary gains access to their LogicQ profile and Google Drive drafts.
   - *Mitigation*: Student account sessions can be revoked; personal drafts in `drive.appdata` are isolated from other applications.
4. **Linux Kernel Sandbox Zero-Days**:
   - *Risk*: Highly sophisticated adversaries could theoretically attempt a Linux kernel container escape from within the C judge container.
   - *Mitigation*: The container runs unprivileged (`uid=1001`), with read-only root, no network (`--network none`), stripped capabilities (`--cap-drop=ALL`), and seccomp filters.
