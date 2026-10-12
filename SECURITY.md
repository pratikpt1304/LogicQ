# Security Policy (`SECURITY.md`)

## 1. Supported Versions

Only the latest production release of LogicQ is actively supported with security patches:

| Version | Supported |
| :--- | :--- |
| `1.0.x` | ✅ Yes |
| `< 1.0.0` | ❌ No |

---

## 2. Reporting a Vulnerability

We take the security and academic integrity of LogicQ seriously. If you discover a security vulnerability or exploit (such as IDOR, privilege escalation, judging sandbox escapes, or student PII leaks), please report it responsibly:

- **Email**: Send vulnerability reports directly to the project maintainers at `security@logicq.io` or notify the Sanjivani University IT lead.
- **Response Time**: We acknowledge receipt of vulnerability reports within 24–48 hours.
- **Patch Window**: Critical security vulnerabilities will be addressed within 72 hours of confirmation.

**Please do NOT open public GitHub issues or publicly disclose vulnerabilities before a fix has been released.**

---

## 3. Scope & Threat Model

### In Scope
- Privilege escalation between roles (`student`, `checker`, `admin`).
- Leaks of private student data (PRN, email, non-public submissions).
- IDOR vulnerabilities allowing students to view or alter peers' uploaded solutions or draft code.
- Flaws in the sandboxed C11 judge execution allowing system tampering or unauthorized network requests.
- Firestore Security Rules or Storage Security Rules bypasses.

### Out of Scope
- Denial of Service attacks requiring volumetric traffic flooding beyond reasonable rate limits.
- Attacks requiring physical access to an unlocked student device.
- Social engineering attacks targeting university personnel.

---

## 4. Security Principles
- **Deny by Default**: All database and storage rules deny access unless explicitly permitted.
- **Minimal Privilege**: Checkers perform blind reviews with zero access to student PII.
- **Defense in Depth**: Client validation is always paired with strict server-side schema checking.
