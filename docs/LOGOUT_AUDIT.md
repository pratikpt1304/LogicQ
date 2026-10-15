# Session Persistence, Inactivity Timeout & Logout Audit

**Document Version:** 1.0.0  
**Status:** Implemented  
**Date:** 2026-10-13  
**Audience:** Security Engineering, Frontend & Backend Architects  

---

## 1. Executive Summary & Root Cause Analysis

A thorough forensic investigation of unexpected user logouts across web browsers, mobile PWA, and multiple devices identified four distinct triggers:

1. **Overly Aggressive Admin/Student Inactivity Limits:**
   - In earlier builds, the admin inactivity timeout was set to an overly stringent 30 minutes, and students were vulnerable to stale session clears.
   - *Fix:* Amended inactivity limits strictly align with operational guidelines:
     - **Students:** 7 days idle timeout (`7 * 24 * 60 * 60 * 1000` ms).
     - **Checkers:** 8 hours idle timeout (`8 * 60 * 60 * 1000` ms).
     - **Admins:** 2 hours idle timeout (`2 * 60 * 60 * 1000` ms).

2. **Inactivity Detection Narrowness:**
   - The user activity tracker was previously listening only to click events, causing students typing code in Monaco Editor or scrolling long problem statements to be erroneously flagged as "idle".
   - *Fix:* Expanded activity listener captures all natural user interactions: `mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`, `pointerdown`, and window `focus`. Throttled to 5 seconds to eliminate CPU/storage thrashing.

3. **Silent Redirects & Lack of User Explanation:**
   - When a session expired or refresh failed, the app performed a silent redirect to `/login` without explaining why the student had been signed out.
   - *Fix:* Every logout is accompanied by a structured reason code and user-facing explanation banner rendered prominently on the `/login` page.

4. **Transient Network Blips Erroneously Invalidating Sessions:**
   - When a student suffered momentary packet loss or mobile cell handover, failed `/auth/me` calls were treated as definitive 401s, immediately clearing authentication storage.
   - *Fix:* Network errors (`NetworkError`, offline status, fetch timeout) are treated strictly as offline state. Cached credentials and access tokens are retained, and token refresh is retried automatically upon reconnection.

5. **Multi-Device Session Preservation:**
   - Logging in on a phone or laptop must NEVER terminate the session on the student's primary desktop or lab computer.
   - *Fix:* Refresh tokens in the backend are device/session-scoped (`prisma.refreshToken`). Single device `logout` revokes only that specific device's token; `logoutAllDevices` remains an explicit, user-initiated security action.

---

## 2. Inactivity Warning Banner (2 Minutes Pre-Expiry)

To prevent students from unexpectedly losing their session while reviewing or composing, a floating **Inactivity Warning Banner** appears exactly 2 minutes before the role-based timeout threshold:
- For Admins: at 1 hour 58 minutes of inactivity.
- For Checkers: at 7 hours 58 minutes of inactivity.
- For Students: at 6 days 23 hours 58 minutes of inactivity.

**Banner UX:**
- Displays an alert icon with countdown timer: *"You will be signed out in {secondsLeft}s due to inactivity."*
- Features an immediate **"Stay signed in"** button that resets `logicq_last_activity` and performs a non-blocking token refresh.

---

## 3. Session Event Log Specification & Reason Codes

Both client and server maintain an append-only, privacy-compliant session event log (`session_events` collection).
- **Access Control:** Readable strictly by the account owner and administrators. Clients cannot forge foreign session events or alter existing logs.
- **Privacy Guarantee:** Never contains passwords, raw JWT tokens, PRNs, or PII.

### Validated Reason Codes

| Reason Code | Trigger Description | User-Facing Notice on Login Page |
| :--- | :--- | :--- |
| `manual` | Student or admin clicked "Sign Out". | *"You have been signed out successfully."* |
| `idle-timeout` | No user interaction for configured role duration. | *"You were signed out due to inactivity for {limit}."* |
| `token-refresh-failed` | Refresh token expired after maximum validity. | *"Your session expired. Please sign in again to continue."* |
| `revoked-by-user` | Student chose "Sign Out of All Devices" in settings. | *"You signed out of all devices from account settings."* |
| `revoked-by-admin` | Administrator revoked sessions or forced re-auth. | *"An administrator requested that you re-authenticate."* |
| `role-changed` | User role was upgraded or changed by admin. | *"Your permissions were updated. Please sign in to apply changes."* |
| `banned` | Account suspended for academic integrity violations. | *"Your account has been suspended by an administrator."* |
| `app-check-failed` | Security verification or integrity check failed. | *"Security verification could not be validated. Please sign in again."* |
| `unusual-login-flag` | Anomalous simultaneous IP or geolocation detected. | *"An unusual login was flagged. Please sign in to verify your identity."* |
| `multi-tab-sync` | Another browser tab on the same device signed out. | *"You signed out from another tab in this browser."* |
| `service-worker-update` | PWA cache update required authentication re-sync. | *"LogicQ was updated. Please sign in to continue."* |
| `unknown` | Unspecified or fallback disconnection. | *"Your session ended. Please sign in again."* |

---

## 4. Multi-Device Preservation Architecture

```
[Student Device A: Laptop]         [Student Device B: Mobile PWA]
          |                                      |
          |--- Refresh Token A                   |--- Refresh Token B
          |                                      |
          +-----------------> [Server] <---------+
                                 |
                 +---------------+---------------+
                 |                               |
        Token A: ACTIVE                 Token B: ACTIVE
        (Device A remains signed in)    (Device B remains signed in)
```

1. **Independent Device Tokens:** Each device receives a distinct cryptographically random refresh token record in `prisma.refreshToken` with a 7-day rolling expiry.
2. **Tab Synchronization vs. Device Synchronization:** `localStorage` events (e.g. `logicq_logout_event`) synchronize tabs *within the same local browser instance only*. They do not broadcast across the network to other devices.
3. **Selective Invalidation:** Calling `POST /api/auth/logout` revokes only the refresh token matching the active request cookie/header. Only `POST /api/auth/logout-all` revokes all active device tokens.
