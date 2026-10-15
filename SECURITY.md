# Security Policy (`SECURITY.md`)

## 1. Supported Versions

Only the current pre-release and pilot versions of LogicQ receive active security updates:

| Version | Status | Supported |
| :--- | :--- | :---: |
| `1.0.0-pilot` | Active Pilot / Release Candidate | ✅ Yes |
| `< 1.0.0` | Development Pre-Release | ❌ No |

---

## 2. Reporting a Vulnerability

We take the security of student academic data, identity privacy, and the integrity of code evaluation seriously. If you discover a security vulnerability (such as privilege escalation, judge sandbox escape, unauthorized PII exposure, IDOR, or bypass of Firestore/Storage rules):

1. **Email Privately**: Please submit vulnerability reports directly to the maintainers at `security@logicq.io` or to the university engineering IT coordinator.
2. **Do Not Disclose Publicly**: Do not open public GitHub issues or disclose technical exploit details publicly before a fix has been verified and released.
3. **Response SLA**:
   - Initial acknowledgment: within **24 hours**.
   - Severity triage & reproduction: within **48 hours**.
   - Critical patch deployment: within **72 hours**.

---

## 3. Security Model & Threat Model

### In Scope
- **Student Privacy & PII**: Enforcing that University PRN, email addresses, and private submissions are unreadable by other students or unauthenticated users.
- **Role Enforcement & Privilege Escalation**: Restricting administrative operations, checker blind grading, and student submissions strictly to verified roles (`admin`, `checker`, `student`).
- **Judge Sandboxing**: Preventing malicious C code execution (fork bombs, infinite loops, memory leaks, file system traversal, socket exfiltration, root privilege escalation) from compromising host runners.
- **Rule Verification**: Enforcing that all Firestore document access and Storage bucket operations strictly follow deny-by-default rules.
- **Session Integrity**: Mitigating unauthorized session takeover, replay attacks, and ensuring auditability via immutable session events.

### Out of Scope
- Denial of Service (DoS/DDoS) attacks against third-party edge networks.
- Attacks requiring physical device compromise or malware on an unlocked user workstation.
- Social engineering attacks targeting university faculty or administrators.

---

## 4. Security Rules Architecture

LogicQ utilizes a hardened, defense-in-depth security model across Firebase and the judge engine:

1. **Deny-by-Default Firestore Rules (`firestore.rules`)**:
   - All collections default to `allow read, write: if false;`.
   - `users/{userId}`: Readable only by the document owner or an verified administrator. Self-service updates are strictly constrained using `.diff(resource.data).affectedKeys().hasOnly(...)`. PRN and college name are immutable after signup.
   - `prnIndex/{prn}`: Read and write denied for all client requests; managed exclusively through server-side Admin SDK transactions to prevent PRN squatting or enumeration.
   - `publicProfiles/{userId}`: Non-PII projection (display name, department, year, solved count, streak) readable by authenticated peers; never leaks PRN or email.
   - `session_events/{eventId}`: Immutable security audit log. Owners can append verified logout reasons (`manual`, `idle-timeout`, etc.); entries cannot be modified or deleted.
   - `practice_progress`: Readable only by the student owner or administrators; written strictly by server judge evaluation.

2. **Storage Rules (`storage.rules`)**:
   - Deny-by-default storage architecture.
   - Students may write only to their own directory (`uploads/{userId}/{submissionId}/{fileName}`).
   - Uploads are constrained to images (`image/png`, `image/jpeg`) and PDFs (`application/pdf`) up to 5 MB per file.
   - Blinded grading: Checkers access anonymized copies via server-signed URLs without direct student folder traversal.

3. **Sandboxed GCC C11 Judge**:
   - Execution inside isolated runner environments with strict CPU time limits (1.0s) and memory caps (128 MB).
   - Compiler warning flags (`-Wall -Wextra -O2 -std=c11`) with dangerous syscall restrictions.
   - Pre-cutoff submission timestamps (`submittedAt`) prevent client-side clock tampering.
