# LogicQ Access Control, Identity & Role-Based Authorization Specification

## 1. Authentication Modes & Signup Rules

LogicQ supports three institutional onboarding modes configured via the `AUTH_MODE` environment variable:

```
+-----------------------------------------------------------------------------------------+
|                                    LOGICQ AUTH MODES                                    |
|                                                                                         |
|  1. OPEN (Default):                                                                     |
|     - Any valid email address can register.                                             |
|                                                                                         |
|  2. DOMAIN_RESTRICTED (Campus Exclusive):                                               |
|     - Only emails matching ALLOWED_EMAIL_DOMAINS (e.g., @mit.edu, @iitb.ac.in) are       |
|       permitted. External registrations are rejected with a clear institutional banner. |
|                                                                                         |
|  3. INVITE_ONLY (Contests & Closed Hackathons):                                         |
|     - Requires an alphanumeric Access Code (e.g., "CAMPUS-C-HACK-2026") provided by    |
|       professors or club leads.                                                         |
+-----------------------------------------------------------------------------------------+
```

### Domain Enforcement Implementation
```typescript
export function validateEmailPolicy(email: string): { allowed: boolean; message?: string } {
  const mode = process.env.AUTH_MODE || 'OPEN';

  if (mode === 'DOMAIN_RESTRICTED') {
    const rawDomains = process.env.ALLOWED_EMAIL_DOMAINS || '';
    const allowed = rawDomains.split(',').map(d => d.trim().toLowerCase());
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain || !allowed.includes(domain)) {
      return {
        allowed: false,
        message: `Registration is restricted to institutional accounts (${allowed.map(d => '@' + d).join(', ')}).`
      };
    }
  }

  return { allowed: true };
}
```

---

## 2. Role Hierarchy & Permissions Matrix

LogicQ implements a three-tier Role-Based Access Control (RBAC) architecture:

```
              +--------------------------+
              |          ADMIN           |
              | (Platform Superuser)     |
              +--------------------------+
                           |
                           v
              +--------------------------+
              |        INSTRUCTOR        |
              | (Problem Author & Queue) |
              +--------------------------+
                           |
                           v
              +--------------------------+
              |         STUDENT          |
              | (Challenger & Competitor)|
              +--------------------------+
```

| Permission / Action | STUDENT | INSTRUCTOR | ADMIN |
| :--- | :---: | :---: | :---: |
| Solve Daily Challenge & Practice Catalog | ✅ | ✅ | ✅ |
| Join Public Arena Contests | ✅ | ✅ | ✅ |
| View Personal Profile & Submissions | ✅ | ✅ | ✅ |
| Access Post-Solve Problem Editorial | ✅ (Post-AC) | ✅ (Always) | ✅ (Always) |
| Author & Validate Problems (Draft / Validated) | ❌ | ✅ | ✅ |
| View Contest Integrity Review Queue | ❌ | ✅ | ✅ |
| Schedule Daily Challenges & Create Contests | ❌ | ✅ | ✅ |
| User Management (Ban/Unban, Role Elevation) | ❌ | ❌ | ✅ |
| Platform Analytics & System Configuration | ❌ | ❌ | ✅ |

---

## 3. Safe Provisioning of the First Admin Account

Default passwords (such as `admin123` or hardcoded fallbacks) represent severe vulnerability hazards. LogicQ enforces zero-hardcoded admin credentials:

### Invariants for Admin Creation:
1. **No Static Defaults in Code**: The codebase contains zero fallback credentials.
2. **Environment Variable Injection**: Admin credentials must be supplied via environment variables during initial system initialization:
   ```env
   ADMIN_EMAIL=system.admin@yourcollege.edu
   ADMIN_PASSWORD=MustBeStrongMin12CharsWithSymbols!
   ```
3. **One-Time Bootstrap Command**:
   ```bash
   npm run prisma:seed
   ```
   - Checks if an `ADMIN` role already exists.
   - If missing, validates that `ADMIN_PASSWORD` satisfies strict entropy requirements ($\ge 10$ characters, mixed case, numbers, special characters).
   - Generates a bcrypt salt with 12 rounds and persists the account.
   - If `ADMIN_PASSWORD` is omitted, the seed command generates a cryptographically secure 24-character random secret via `crypto.randomBytes(18).toString('base64url')`, outputs it to the secure server console once, and prompts for immediate password change.

---

## 4. Account Recovery & Password Reset Pipeline

LogicQ utilizes a token-based out-of-band password reset mechanism:

```
[User Requests Reset: POST /api/auth/forgot-password]
        |
        v
1. Generate Secure Random Token (crypto.randomBytes(32).toString('hex'))
2. Hash Token with SHA-256 and store in Database:
   - `passwordResetToken`: sha256(token)
   - `passwordResetExpires`: Date.now() + 3600000 (1 hour expiry)
3. Send Email via Pluggable Mailer:
   - Development Mode: Output reset link with raw token to console log.
   - Production Mode: Send HTML email via SMTP (Nodemailer / AWS SES / SendGrid).
        |
        v
[User Submits New Password: POST /api/auth/reset-password/:token]
        |
        v
1. Hash incoming token with SHA-256.
2. Verify token exists and `passwordResetExpires > Date.now()`.
3. Hash new password with bcrypt (12 rounds).
4. Invalidate all existing Refresh Tokens for that user across all devices.
5. Clear reset token and expiration fields.
```

---

## 5. Account Suspension & Banning Mechanics

When an account is flagged for severe integrity violations:
1. An administrator executes `PATCH /api/admin/users/:id/ban` with a mandatory `banReason`.
2. **Database Mutation**:
   - `isBanned`: set to `true`.
   - `banReason`: stored for student communication and audit logging.
3. **Immediate Session Eviction**:
   - The user's active `RefreshToken` records in the database are purged immediately.
   - Any currently active WebSocket connection is forcibly terminated (`socket.disconnect(true)`).
4. **Subsequent Request Rejection**:
   - Every API request checked by `requireAuth` queries the lightweight session state or cache.
   - If `user.isBanned === true`, the request is rejected with `403 Forbidden`:
     ```json
     {
       "error": "ACCOUNT_SUSPENDED",
       "message": "Your account has been suspended for violating platform integrity guidelines.",
       "reason": "Collusion detected during Arena Round #3.",
       "supportContact": "support@logicq.io"
     }
     ```
   - The frontend intercepts this error, clears local tokens, and redirects to a dedicated suspension explanation view.
