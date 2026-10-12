# LogicQ Mobile App & Play Store Packaging Guide (`/docs/MOBILE_APP.md`)

> **SCOPE NOTE**: Per Section 7 of the PWA specification, this document is a **design & operational guide only** for future packaging of the LogicQ PWA as an Android Play Store application via **Trusted Web Activity (TWA)** and optional `17:00 IST` Web Push reminders.

---

## 1. Progressive Web App (PWA) Architecture (Implemented Now)

LogicQ is directly installable on **Android (Chrome/Edge)** and **iOS/iPadOS (Safari Add to Home Screen)** without requiring an app store middleman:
- **Web App Manifest (`/manifest.webmanifest`)**: Standalone display mode, `#0C0F1F` dark brand theme color (with dynamic `#F4F6FB` light-mode `<meta name="theme-color">`), `192x192`, `512x512`, `512x512` maskable, and `180x180` Apple touch icons generated from `/client/public/brand/logo-mark.svg`, and shortcuts strictly for **Daily Challenge** (`/challenge`) and **Leaderboard** (`/leaderboard`).
- **Workbox Service Worker (`/sw.js`, `prompt` update mode)**: Precaches only the static application shell (JS, CSS, fonts, icons). All authentication, Firestore, API, Judge, Upload, and Drive endpoints use `NetworkOnly` so zero personal data, PRNs, tokens, or hidden test cases ever enter Cache Storage.

---

## 2. Packaging LogicQ for Google Play Store via Trusted Web Activity (TWA)

When Sanjivani University / Bitwise Club is ready to publish LogicQ on the Google Play Store:

### Step-by-Step Bubblewrap TWA Workflow
1. **Prerequisites**:
   - Node.js 20+, JDK 17, Android SDK Command-Line Tools, and `@bubblewrap/cli` (`npm i -g @bubblewrap/cli`).
2. **Initialize TWA Project from Live Manifest**:
   ```bash
   mkdir logicq-twa && cd logicq-twa
   bubblewrap init --manifest=https://logicq-clanguage.web.app/manifest.webmanifest
   ```
   - Application ID: `in.org.sanjivani.logicq`
   - Start URL: `/dashboard`
   - Status bar & splash screen color: `#0C0F1F`
3. **Generate Signing Keystore & Digital Asset Links (`assetlinks.json`)**:
   - Generate an upload keystore (`keytool -genkeypair -v -keystore logicq-upload.keystore -alias logicq -keyalg RSA -keysize 2048 -validity 10000`).
   - Extract the SHA-256 fingerprint and publish `/.well-known/assetlinks.json` in `client/public/.well-known/assetlinks.json` so Chrome verifies domain ownership and hides the browser URL bar in standalone TWA mode.
4. **Build Signed Android App Bundle (`.aab`)**:
   ```bash
   bubblewrap build
   ```
   Produces `app-release-bundle.aab` for Google Play Console upload.

### Costs & Google Play Review Requirements
| Item | Cost | Review / Operational Requirement |
| :--- | :--- | :--- |
| **Google Play Developer Account** | **$25 USD** (one-time registration fee) | Requires identity verification (DUNS number for organization accounts, or 14-day closed testing with 20 testers for personal developer accounts). |
| **Firebase Hosting & Digital Asset Links** | **$0 / month** (within Firebase free tier) | `https://logicq-clanguage.web.app/.well-known/assetlinks.json` must return `200 OK` with `application/json` and match the Play App Signing SHA-256 certificate. |
| **Play Store Data Safety & Account Deletion** | **$0** | Google Play mandates an in-app and web-accessible **Account Deletion** flow (`/profile` $\rightarrow$ **Delete Account**) and **Privacy Policy** (`/privacy`), both of which are already built into LogicQ. |

---

## 3. Optional Future Enhancement: `17:00 IST` Web Push Reminders (Design Only)

- **Opt-In Model**: Off by default. Students can toggle `"Daily 17:00 IST Challenge Reminder"` in Profile Settings.
- **Architecture**: Firebase Cloud Messaging (FCM) Web Push with VAPID keys; tokens stored in `/users/{uid}/pushTokens/{tokenId}` and triggered by the existing `17:00 IST` Cloud Scheduler job.
- **Privacy**: Push payload contains only generic text (`"Today's LogicQ C Challenge is live!"`) with zero PII or PRN data.
