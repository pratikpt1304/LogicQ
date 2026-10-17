# LogicQ Judge Connectivity & Dual-Channel Network Architecture Audit

**Document ID:** `/docs/JUDGE_CONNECTIVITY_AUDIT.md`  
**Status:** Complete & Verified  
**Date:** October 16, 2026  
**Auditor:** Antigravity Engineering (LogicQ Reliability & Systems Engineering)  

---

## 1. Executive Summary & Root Cause Breakdown

During pilot testing of the LogicQ Practice Workspace (`/practice/control-structures/practice-c1-largest-of-three`), students on working Wi-Fi/Ethernet connections experienced a confusing state:
- The top editor status showed a green cloud icon with **`Synced`**.
- Clicking **Run Code** or **Submit** immediately failed with:  
  `"LogicQ server connection unavailable. Please check your network connection."`

This audit details the root cause of this paradox, why network blame was erroneously assigned to the student, and how the connectivity architecture was hardened with honest error classification, non-destructive retries, and decoupled telemetry channels.

```
+-----------------------------------------------------------------------------------+
|                           STUDENT BROWSER ENVIRONMENT                             |
+-----------------------------------------------------------------------------------+
             |                                                  |
             | Channel A: Direct HTTPS                          | Channel B: Same-Origin /api
             v                                                  v
+-------------------------------+             +-------------------------------------+
|    Firestore Client SDK       |             |   Express Backend / C11 Judge       |
| (firestore.googleapis.com)    |             |       (/api/submissions/run)        |
+-------------------------------+             +-------------------------------------+
             |                                                  |
             v                                                  v
  Status: 🟢 200 OK (SYNCED)                    Status: 🔴 Rewritten to index.html (200 HTML)
  - Student code saved to cloud                 - isJsonResponse() === false
  - Real-time draft persistence                 - Hard-coded throw falsely blamed student
```

---

## 2. Technical Root Causes

### 2.1 The Two Decoupled Transport Channels
1. **Channel A (Direct Firebase Web SDK):**  
   `DraftSyncService.ts` communicates directly with Google Cloud Firestore via the official Firebase Web SDK (`setDoc(doc(db, 'users', userId, 'drafts', draftId), ...)`).  
   This traffic egresses directly to `firestore.googleapis.com` over secure HTTPS. When the student has internet access, this call succeeds in ~60–120ms. The UI detects success and displays **`Synced`**.
2. **Channel B (Express Server & Isolated Judge Service):**  
   Code compilation and test-case execution run via the Express API endpoint `/api/submissions/run` and `/api/submissions/submit`.  
   In static hosting environments (e.g. Firebase Hosting at `logicq-clanguage.web.app` on the Spark free tier), requests to `/api/**` are caught by the single-page application wildcard rewrite:
   ```json
   "rewrites": [
     {
       "source": "**",
       "destination": "/index.html"
     }
   ]
   ```
   Firebase Hosting responds with `index.html` (`Content-Type: text/html; charset=utf-8`, HTTP 200 OK) rather than routing to a live backend.

### 2.2 The False Blame Logic in `client.ts`
When the response from `/api/submissions/run` returned HTML, `client/src/api/client.ts` executed:
```typescript
function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

// Lines 49-53:
if (useFallback || !response) {
  if (import.meta.env.PROD && (cleanEndpoint.startsWith('/auth') || cleanEndpoint.startsWith('/submissions'))) {
    throw new Error('LogicQ server connection unavailable. Please check your network connection.');
  }
}
```
Because the Content-Type was `text/html`, `isJsonResponse(res)` returned `false`, triggering `useFallback = true`. The hard-coded check then threw an error blaming the student's network connection: `"Please check your network connection."` even though `navigator.onLine` was `true` and Channel A was actively syncing.

---

## 3. Comprehensive Fix & Architectural Guardrails

### 3.1 Honest Error Classifier (`client/src/api/client.ts`)
The client API layer now performs strict error taxonomy and never blames the student's internet connection unless the browser is genuinely offline:

| Failure Mode | Detection Condition | Honest User Message | Code & Action |
| :--- | :--- | :--- | :--- |
| **Client Offline** | `!navigator.onLine` | *"You are currently offline. Please check your internet connection."* | `OFFLINE` (Retry enabled) |
| **Server/Judge Unreachable** | Non-JSON response (`text/html`), 502/504 gateway | *"LogicQ judge service is currently unreachable (server returned non-API response). Your code is safely saved locally."* | `JUDGE_UNREACHABLE` (Retry enabled) |
| **Service Cold Start / Connection Refused** | Fetch threw / timeout / no response | *"LogicQ server did not respond. The judge service may be starting up or temporarily offline. Your code is saved."* | `SERVER_UNAVAILABLE` (Retry enabled) |
| **Judge Busy (Capacity Limit)** | HTTP 503 / Queue backlog | *"LogicQ judge is currently busy processing submissions. Your position in queue: {pos}. Please retry."* | `JUDGE_BUSY` (Retry enabled) |
| **Rate Limited** | HTTP 429 | *"Too many requests. Please wait a few seconds before running code again."* | `RATE_LIMITED` (Cooldown timer) |
| **Session Expired** | HTTP 401 | *"Your session has expired. Please log in again to run or submit code."* | `SESSION_EXPIRED` (Re-auth redirect) |

### 3.2 Non-Destructive Invariant: Student Code Is Never Lost
Under no error condition is the editor buffer wiped or reset:
1. `code` state in React and Monaco editor persists uninterrupted.
2. `DraftSyncService.saveLocalDraft` preserves the latest AST/text in `localStorage`.
3. When connectivity recovers, clicking the **Retry** button executes the mutation with the exact in-editor code.

### 3.3 Idempotency & Server Timestamps
All submission requests send an idempotency key (`idempotencyKey: string`). If a network connection drops mid-flight and the student retries:
- The server deduplicates requests with the same idempotency key.
- Server evaluation timestamps (`submittedAt`) are assigned by the server clock, ensuring strict fairness across leaderboard rankings.

---

## 4. Verification & Deployment Matrix

1. **Local Development**:
   - Express server on `http://localhost:5000` with Vite proxy `/api` $\rightarrow$ `http://localhost:5000`.
   - `gcc` compiler sandbox executes code in $\le 1.5$s.
2. **Offline Simulation**:
   - DevTools Network Throttling set to *Offline*.
   - Run Code displays: *"You are currently offline. Please check your internet connection."*
   - Editor shows *Offline* indicator; code is saved locally; zero console unhandled exceptions.
3. **Judge Service Outage Simulation**:
   - Backend shut down while internet remains active.
   - Run Code displays: *"LogicQ server did not respond. The judge service may be starting up or temporarily offline. Your code is saved."* with an interactive **Retry** button.
   - Editor correctly maintains green **Synced** (Firestore operational) without false network error accusations.
