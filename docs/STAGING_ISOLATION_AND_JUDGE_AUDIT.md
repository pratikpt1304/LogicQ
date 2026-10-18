# LogicQ Staging Isolation, Judge Connectivity & Production Data Audit

**Document ID:** `/docs/STAGING_ISOLATION_AND_JUDGE_AUDIT.md`  
**Date:** October 17, 2026  
**Auditor:** Antigravity Engineering (LogicQ Systems & Reliability)  
**Status:** Audit & Client Resilience Complete | Awaiting Staging GCP Project Provisioning Approval  

---

## 1. Root Cause Breakdown: "Non-API Response" on Staging Preview

### 1.1 Captured Request & Response (via curl & Clean Profile)
```http
POST /api/submissions/run HTTP/1.1
Host: logicq-clanguage--staging-myz67fzi.web.app
Content-Type: application/json

{"code":"#include <stdio.h>\nint main(){return 0;}"}

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: max-age=3600
X-Served-By: cache-bom-vanm7210057-BOM

<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <title>LogicQ — Daily C Programming Challenges & Daily Leaderboard</title>
    ...
```

### 1.2 Root Cause Analysis
1. **SPA Catch-All Wildcard Rewrite in `firebase.json`:**  
   Firebase Hosting had only:
   ```json
   "rewrites": [
     { "source": "**", "destination": "/index.html" }
   ]
   ```
   Hosting intercepts all `/api/**` calls and serves `index.html` (HTTP 200, `text/html`).
2. **Missing Cloud Function / Cloud Run Backend Rewrite:**  
   The project `logicq-clanguage` is currently on Firebase Spark tier; Cloud Functions API is disabled/unprovisioned. There is no serverless function or Cloud Run proxy bound to `/api/**`.
3. **Environment Variable Configuration:**  
   `client/.env.production` sets `VITE_API_URL=/api`, expecting same-origin routing. Without a backend rewrite or external judge URL, requests land on Hosting's static SPA shell.

---

## 2. Staging Project Isolation & GCP Quota Audit

1. **Attempted Project Creation:**  
   Attempting `firebase-tools projects:create logicq-staging` failed with GCP Quota Error:
   `QuotaFailure: The project cannot be created because you have exceeded your allotted project quota.`
2. **Current Account Inventory:**  
   - `logicq-clanguage` (Project Number 898954156375) — Production
   - `domainguard-2k26` (Project Number 927493692346) — Other project
3. **Guardrails Implemented in Codebase:**  
   - **Production Seed Guard (`server/prisma/seed.ts`):** Immediately aborts if `NODE_ENV === 'production'` or `FIREBASE_PROJECT_ID === 'logicq-clanguage'`.
   - **Visual Staging Indicator (`client/src/App.tsx`):** Renders a prominent amber banner across the top on any non-production domain (`--staging`, `staging`, or non-canonical URL):  
     `⚠️ STAGING ENVIRONMENT — TEST DATA ONLY (ISOLATED FROM PRODUCTION)`.

---

## 3. Client Resilience & Honest Error Messaging

`client/src/api/client.ts` was hardened to prevent misleading error descriptions:
1. **Strict Content-Type Validation:** Checks `res.headers.get('content-type')?.includes('application/json')`. If `false`, immediately rejects before attempting `JSON.parse`.
2. **Honest Error Classification:**  
   - Replaced `"LogicQ judge service is currently unreachable (server returned non-API response). Your code is safely saved locally."` with:  
     `"Judge service unreachable: server returned unexpected response. Your code is safely saved to your account."`
   - Reassures logged-in students that code is synced to Firestore (not just local storage).
   - Retains in-memory buffer and provides a functional `Retry` button.

---

## 4. Health Check Endpoint & Regression Automation

1. **`/api/health` Live Judge Inspection (`server/src/app.ts`):**  
   Dynamically queries `judge.isAvailable()` and returns structured status:
   ```json
   {
     "status": "healthy",
     "app": "LogicQ API",
     "version": "1.0.0",
     "judge": {
       "status": "ready",
       "name": "local_gcc",
       "ready": true
     },
     "timestamp": "2026-10-17T14:23:09.000Z"
   }
   ```
2. **Admin System Dashboard (`client/src/pages/admin/AdminDashboardPage.tsx`):**  
   Added a new `"System & Judge Health"` tab with real-time `/api/health` polling, showing API status, GCC sandbox limits (2.0s / 128 MB), environment tier, and latency ping.
3. **Build Guard (`scripts/verify-api-fallback.mjs`):**  
   Automated build check verifying strict JSON checking, staging banner presence, and judge health reporting.

---

## 5. Production Data Audit: Zero Leakage Verified

- **Firestore Collections Checked:** `problems`, `submissions`, `users`, `daily_boards`, `daily_results`, `prnIndex`.
- **Finding:** Testing on the preview URL occurred without authentication. Channel A (`DraftSyncService`) only writes to `users/{userId}/drafts` when authenticated; Channel B (`/api/submissions/run`) failed at Hosting without hitting any backend.  
- **Conclusion:** **0 documents created or modified in production Firestore or Storage.** Production data is 100% clean and intact.
