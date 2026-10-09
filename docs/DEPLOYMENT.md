# LogicQ Deployment & Cloud Infrastructure Specification: Firebase + Cloud Run

## 1. Production Architecture Overview

The authoritative infrastructure for LogicQ combines **Firebase** for identity, authoritative data, and business logic, with **Google Cloud Run** for isolated C code compilation and execution:

```
+----------------------------------------------------------------------------------------------------+
|                                    LOGICQ CLOUD TOPOLOGY                                           |
|                                                                                                    |
|  [ Student Browser: React SPA + Monaco Editor + Google Identity Services (GIS) ]                   |
|        |                                     |                                                     |
|        | Direct OAuth (drive.appdata)        | HTTPS / WebSockets                                  |
|        v                                     v                                                     |
|  [ Student Google Drive ]         [ Firebase Hosting / Cloudflare CDN ]                            |
|    - drafts/*.c                              |                                                     |
|    - notes/*.md                              v                                                     |
|    - settings/editor.json         [ Firebase Cloud Functions (2nd Gen) / API Gateway ]             |
|                                     - Auth Verification (Google Sign-In + Custom Claims)            |
|                                     - Scoring, Streaks & Gamification Engine                       |
|                                     - Secret Manager Access (Judge Secrets, Service Accounts)     |
|                                              |                                                     |
|                      +-----------------------+-----------------------+                             |
|                      |                                               |                             |
|                      v                                               v                             |
|         [ Cloud Firestore Database ]                    [ Cloud Run Judge Sandbox ]                |
|           - Authoritative Accounts                        - Isolated Linux Container               |
|           - Problems & Hidden Tests                       - gcc -O2 -std=c17 Sandbox               |
|           - Submissions & Verdicts                        - Strict cgroups, timeouts, seccomp      |
|           - Contests & Leaderboards                       - Disabled Network (--network none)      |
|           - Support & Audit Logs                          (Or External Judge0 Instance)            |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Infrastructure Breakdown: What Runs Where

| Component | Cloud Service | Purpose & Trust Boundary |
| :--- | :--- | :--- |
| **Frontend Web App** | Firebase Hosting (or Cloudflare Pages) | Serves optimized React Vite SPA, static assets, and Monaco editor. |
| **Authentication** | Firebase Authentication | Google Sign-in provider. Enforces role-based custom claims (`student`, `admin`). |
| **Authoritative Database** | Cloud Firestore | Holds all trusted state (problems, hidden test suites, submissions, scores, audit trails). |
| **API & Business Logic** | Cloud Functions for Firebase (v2) | Validates submissions, calls judge service, updates streaks, and calculates XP. |
| **Secret Management** | Google Cloud Secret Manager | Holds Judge service auth tokens, internal API keys, and admin secrets. |
| **C Execution Judge** | Google Cloud Run Container (or Judge0) | Dedicated, isolated Docker container executing C binaries with strict CPU/memory limits. |
| **Student Personal Data**| **Student Google Drive** (`drive.appdata`) | Private, client-side autosave for code drafts and learning notes. |

---

## 3. Why Firebase Hosting & Plain Cloud Functions Cannot Run C Code

It is technically impossible and dangerous to compile and run untrusted C code directly within Firebase Hosting or plain Cloud Functions:

1. **Static CDN Limitation**: Firebase Hosting is strictly a distributed static file cache. It cannot execute server-side binaries or runtime scripts.
2. **Serverless Micro-VM Environment**:
   - Google Cloud Functions run in managed, read-only runtime containers. Standard compilers (`gcc`, `clang`, `make`) are not present in standard Node.js runtimes.
   - Cloud Functions lack the Linux kernel permissions needed to invoke `chroot`, configure `cgroups`, or apply `seccomp` system call filters.
3. **Severe Vulnerability to Denial-of-Service**:
   - Running user-submitted C code within the function's own process space exposes the runtime to fork bombs, thread starvation, and uncontrolled memory consumption.
4. **The Safe Solution**: Untrusted C compilation is strictly decoupled to an **isolated Cloud Run Sandbox Container** equipped with root cgroups and memory quotas, or delegated to a hardened **Judge0** instance.

---

## 4. Firebase Plan Requirements (Blaze Plan)

Deploying LogicQ requires upgrading the Firebase Project to the **Blaze Plan (Pay as you go)**.

### Why Blaze is Mandatory:
- **Cloud Functions (2nd Gen)**: Built on top of Google Cloud Run and Google Cloud Buildpacks, which require billing to be enabled.
- **Outbound Network Requests**: Free Spark tier blocks all outbound network requests from Cloud Functions to external hosts (such as Judge0 or custom judge runners).
- **Secret Manager Integration**: Accessing Google Cloud Secret Manager from Cloud Functions requires the Blaze tier.

---

## 5. Comprehensive Cost Estimates

### 5.1 Free Allowance Thresholds (Blaze Tier Includes Free Allowances)
Google Cloud and Firebase provide generous perpetual monthly free tier allowances:
- **Firebase Auth**: Unlimited Google Sign-In authentications.
- **Cloud Firestore**: 50,000 document reads, 20,000 document writes, 20,000 document deletes per day (FREE).
- **Cloud Functions (v2)**: 2,000,000 invocations, 400,000 GB-seconds of compute per month (FREE).
- **Cloud Run (Judge)**: 2,000,000 requests, 360,000 vCPU-seconds, 180 GB-hours of memory per month (FREE).
- **Google Drive Storage**: Stored in students' personal accounts (₹0 platform cost).

### 5.2 Estimated Monthly Cost by Scale

| Usage Scenario | Registered Users | Concurrent Contestants | Monthly Estimate (USD) | Monthly Estimate (INR) |
| :--- | :---: | :---: | :---: | :---: |
| **Pilot / College Class** | 50 – 150 | 25 | **$0.00 / month** | **₹0 / month** (Within free quotas) |
| **Campus Department** | 300 – 600 | 50 – 75 | **$1.50 – $4.00 / mo** | **₹125 – ₹330 / month** |
| **Multi-College Arena** | 1,000 – 2,500 | 150 – 250 | **$6.00 – $12.00 / mo** | **₹500 – ₹1,000 / month** |

---

## 6. Step-by-Step Deployment Runbook

### Step 6.1: Firebase Project Setup
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Upgrade project to **Blaze Plan**.
3. Enable **Authentication** -> Turn on **Google Sign-in Provider**.
4. Enable **Cloud Firestore** -> Select production mode and regional location (`asia-south1` Mumbai recommended for Indian colleges).
5. Install Firebase CLI locally:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add <your-firebase-project-id>
   ```

### Step 6.2: Google Cloud Console Configuration (OAuth & Secrets)
1. In [Google Cloud Console](https://console.cloud.google.com/), go to **APIs & Services** -> **Enabled APIs**.
2. Enable:
   - Google Drive API
   - Secret Manager API
   - Cloud Run Admin API
3. Configure **OAuth Consent Screen**:
   - User Type: **External** (or **Internal** if restricted to single Google Workspace).
   - Scopes: `.../auth/drive.appdata` and `.../auth/drive.file`.
   - Add test user email addresses if in Testing mode.
4. Set up Secrets in Secret Manager:
   ```bash
   gcloud secrets create JUDGE0_KEY --data-file=-
   gcloud secrets create JUDGE_ENDPOINT --data-file=-
   ```

### Step 6.3: Deploy Firestore Security Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 6.4: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### Step 6.5: Deploy Cloud Run Judge Service (Optional if using self-hosted sandbox)
```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/logicq-judge-sandbox ./server/docker
gcloud run deploy logicq-judge-sandbox \
  --image gcr.io/<PROJECT_ID>/logicq-judge-sandbox \
  --platform managed \
  --region asia-south1 \
  --no-allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

### Step 6.6: Deploy Frontend SPA to Firebase Hosting
```bash
cd client
npm run build
cd ..
firebase deploy --only hosting
```
