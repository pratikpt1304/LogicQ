# LogicQ Session Persistence & Refresh Audit (`/docs/SESSION_AUDIT.md`)

> **Executive Summary**: This document audits the root causes behind the bug where refreshing the page (F5), opening a new tab, or reopening the browser logged students out of LogicQ. It maps the end-to-end authentication lifecycle across Firebase Auth, JWT tokens, server cookies, and route guards, analyzes each of the 10 potential failure points, and details the production fix.

---

## 1. Reproduction Results Across Environments

### Testing Scenarios
1. **Scenario A (`/dashboard` Refresh)**:
   - *Action*: Student signs in via Google or credentials, lands on `/dashboard`, and presses F5 (or Ctrl+R).
   - *Observed Bug*: Instant flash of the landing/login page or immediate redirect to `/login`. React re-mounted with `user = null`, `fetchCurrentUser` failed or found no synchronized state before the route guard evaluated, and `ProtectedRoute` executed `<Navigate to="/login" replace />`.
2. **Scenario B (`/challenge` Deep Link Refresh)**:
   - *Action*: Student is solving today's active challenge on `/challenge`, types code, and presses F5.
   - *Observed Bug*: Student is redirected to `/login`. The deep link is lost or requires re-authentication, interrupting their solve session.
3. **Scenario C (`/profile` Refresh)**:
   - *Action*: Student views `/profile` and presses F5.
   - *Observed Bug*: Redirected to `/login`.
4. **Scenario D (New Tab / Browser Restart / PWA Launch)**:
   - *Action*: Student closes tab/browser and re-opens `https://logicq-clanguage.web.app/dashboard` or opens the installed PWA from home screen.
   - *Observed Bug*: Prompted to sign in again because component state and in-memory variables were discarded.

### Browser Compatibility Matrix (Observed Prior to Fix)

| Browser / Platform | Behavior on F5 | Cause Observed |
| :--- | :--- | :--- |
| **Google Chrome / Chromium** | Redirected to `/login` | `AuthContext` did not wait for Firebase `onAuthStateChanged`; `user` initialized as `null`. |
| **Microsoft Edge** | Redirected to `/login` | Same as Chromium; access token expired in 15m; idle timer was memory-only. |
| **Mozilla Firefox** | Redirected to `/login` | Total Cookie Protection blocked cross-domain cookies; Firebase Hosting stripped non-`__session` cookies. |
| **Safari / WebKit** | Redirected to `/login` | ITP partitioned storage; no `browserLocalPersistence` configuration. |
| **Mobile Chrome / PWA** | Redirected to `/login` | PWA opened app shell from cache, which initialized with unauthenticated state. |

---

## 2. End-to-End Authentication Architecture Mapping

```
+-----------------------------------------------------------------------------------+
| CLIENT BROWSER (React + Vite PWA)                                                 |
|                                                                                   |
|  [Google Sign-In] --------> signInWithPopup(firebaseAuth, googleAuthProvider)    |
|                                    |                                              |
|                                    v                                              |
|                           [Firebase Auth SDK]                                     |
|                       (browserLocalPersistence: IndexedDB)                        |
|                                    |                                              |
|                                    v                                              |
|                        onAuthStateChanged Listener                                |
|                                    |                                              |
|        +---------------------------+---------------------------+                  |
|        | State: 'loading'          | State: 'signedIn'         | State: 'signedOut'|
|        | (Branded Spinner)         | (User Profile Ready)      | (Redirect /login) |
|        +---------------------------+---------------------------+                  |
+-----------------------------------------------------------------------------------+
                                     |
                        HTTP Credentials: 'include'
                       Authorization: 'Bearer <token>'
                                     |
                                     v
+-----------------------------------------------------------------------------------+
| FIREBASE HOSTING CDN EDGE                                                         |
|  - Strictly forwards ONLY the cookie named '__session' to backend!                 |
|  - All other cookies ('accessToken', 'refreshToken') are stripped at the CDN edge!|
+-----------------------------------------------------------------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
| CENTRAL SERVER (Node / Express / Prisma)                                          |
|  - Cookie Parser reads req.cookies.__session                                      |
|  - Auth Middleware checks Bearer header OR req.cookies.__session                  |
|  - /api/auth/me returns student profile + role                                     |
|  - /api/auth/refresh rotates tokens with 7-day student inactivity window           |
+-----------------------------------------------------------------------------------+
```

---

## 3. Analysis of the 10 Potential Root Causes

### 1. Route Guards Reading User Before Session Restored — **REAL (CRITICAL)**
- **Findings**: In `client/src/App.tsx`, `ProtectedRoute` evaluated `if (!user)` while `AuthContext` did not listen to Firebase's `onAuthStateChanged`. When `fetchCurrentUser()` was called inside a simple `useEffect`, any delay or initial empty state caused the guard to redirect to `/login` before authentication completed.
- **Resolution**: Implemented a discrete three-state lifecycle (`loading`, `signedIn`, `signedOut`). `ProtectedRoute` and `AdminRoute` render a branded splash/loading screen with the LogicQ logo and spinner while `authState === 'loading'`, and redirect **only** when `authState === 'signedOut'`.

### 2. Inadequate Persistence Configuration — **REAL (CRITICAL)**
- **Findings**: In `client/src/config/firebase.ts`, `getAuth(app)` was called without explicitly enforcing `browserLocalPersistence`. In `AuthContext.tsx`, `user` was stored solely in React component state `useState(null)`, which is wiped on every F5 refresh.
- **Resolution**: Explicitly configured `setPersistence(auth, browserLocalPersistence)`. Created persistent cached session storage (`logicq_active_user`) synchronized with Firebase Auth's IndexedDB ledger.

### 3. Session Cookie Naming for Firebase Hosting — **REAL (CRITICAL)**
- **Findings**: The server controller (`server/src/controllers/auth.controller.ts`) set cookies named `accessToken` and `refreshToken`. Firebase Hosting documentation specifies that the CDN edge **strips all cookies except `__session`** before forwarding requests to Cloud Functions or Cloud Run.
- **Resolution**: Standardized the server-side cookie name to `__session` with `httpOnly: true`, `secure: true` (in production), `sameSite: 'lax'`, and `path: '/'`. Updated `auth.middleware.ts` to parse `req.cookies?.__session`.

### 4. Short Token Expiry (15-Minute Ceiling) Without Silent Background Refresh — **REAL (MAJOR)**
- **Findings**: Access tokens were minted with `expiresIn: '15m'`. If a student stepped away or refreshed after 15 minutes, the token was expired. If `/api/auth/refresh` failed, `fetchCurrentUser` threw an error and cleared the session.
- **Resolution**: Implemented automatic silent background token refresh via Firebase Auth and JWT refresh fallback, backed by exponential backoff on network failures.

### 5. Global Handler Signing User Out on Transient Network Errors — **REAL (MAJOR)**
- **Findings**: In `AuthContext.tsx`, `fetchCurrentUser` wrapped the API call in a `try...catch` where the `catch` block unconditionally executed `setUser(null)`. Flaky WiFi or offline PWA mode instantly converted a temporary network drop into a permanent logout.
- **Resolution**: Network errors or timeouts now preserve the authenticated state, marking the app as offline/reconnecting rather than logging out. The user is signed out **only** when the server explicitly returns a 401/403 with `INVALID_TOKEN`, `SESSION_REVOKED`, or `ACCOUNT_SUSPENDED`.

### 6. Idle Timeout Measuring Page Load Time Instead of Inactivity — **REAL (MAJOR)**
- **Findings**: `AuthContext.tsx` used a single `setTimeout` initialized on mount with a 30-minute default for all users. A page refresh or closing the tab reset or misaligned the timer, and 30 minutes was too aggressive for students solving complex C problems.
- **Resolution**: Enforced config-driven inactivity limits: **7 days for students** and **30 minutes for admins**. Activity is tracked by recording a timestamp (`logicq_last_activity`) on user interaction events (`mousemove`, `keydown`, `pointerdown`, `touchstart`, `scroll`, and API calls). A refresh checks elapsed inactivity against the limit; if within limit, the student remains logged in.

### 7. Auth Domain and Cross-Site Partitioning — **REAL (MODERATE)**
- **Findings**: Using third-party auth domains with redirect sign-in causes storage partitioning failures in Safari and Firefox.
- **Resolution**: Kept primary sign-in as `signInWithPopup` with account selection prompt (`prompt: 'select_account'`), which completes inside an isolated popup window immune to top-level redirect partitioning.

### 8. Service Worker & PWA Caching Serving Logged-Out Shell — **POTENTIAL RISK (MITIGATED)**
- **Findings**: Service worker precaches `/index.html` for offline support. If the app shell assumes logged-out state on boot, it flashes the login page before hydrating.
- **Resolution**: The app shell displays the neutral brand loading state until `AuthProvider` establishes whether a valid session exists. `CLEAR_USER_CACHE` is dispatched exclusively on intentional logout.

### 9. Code Calling `signOut` on Unload/Visibility Change — **NOT PRESENT (VERIFIED)**
- **Findings**: Audit confirmed no code called `signOut` on `beforeunload` or `visibilitychange`.

### 10. Browser InPrivate / Incognito Mode Restrictions — **DOCUMENTED**
- **Findings**: InPrivate windows isolate storage and wipe IndexedDB on closing the last window. Within the same InPrivate window, F5 refresh and new tabs function correctly with `browserLocalPersistence`.

---

## 4. Architectural Fix Plan
1. **`client/src/config/firebase.ts`**: Configure `setPersistence(auth, browserLocalPersistence)`.
2. **`client/src/context/AuthContext.tsx`**: Complete rewrite to provide:
   - States: `loading`, `signedIn`, `signedOut`.
   - Native integration with `onAuthStateChanged`.
   - Inactivity tracking: 7 days for students, 30 minutes for admins.
   - Cross-tab synchronization via `storage` event.
   - Offline-resilient session validation (no logout on network errors).
3. **`server/src/controllers/auth.controller.ts` & `auth.middleware.ts`**:
   - Issue `__session` cookie for Firebase Hosting CDN compatibility.
   - Accept `__session` cookie in `auth.middleware.ts`.
4. **`client/src/App.tsx`**: Update `ProtectedRoute` and `AdminRoute` to show the branded splash screen during `loading`, and navigate with deep-link preservation (`state: { from: location }`).
5. **Testing**: Comprehensive automated test coverage in Vitest and end-to-end audit report in `/docs/TEST_REPORT.md`.
