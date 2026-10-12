# LogicQ Deployment & Environment Guide (`/docs/DEPLOYMENT.md`)

**Last Updated:** 2026-10-12

---

## 1. Environment Configuration Matrix

| Environment | Frontend Origin | API Base (`VITE_API_URL`) | Judge Backend (`JUDGE_PROVIDER`) | Database / Storage |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | `http://localhost:5173` | `/api` (proxied by Vite to `http://localhost:5000`) | `local` (`LocalGccJudge` with `gcc -std=c11`) | Local SQLite (`server/prisma/dev.db`) + `server/uploads` |
| **Staging / Preview** | `https://<staging-project>.web.app` | `/api` (Firebase Hosting rewrite to Cloud Run / Functions) | `local` (Container `gcc`) or `judge0` | Staging Database + Firebase Storage |
| **Production** | `https://logicq-clanguage.web.app` | `/api` (same-origin rewrite) | `local` (Cloud Run `gcc` container) or `judge0` | Production Database + Firebase Storage |

---

## 2. Pre-Deployment Verification Checklist

Every production build **must** pass these automated gates before deployment:

```bash
# 1. Build the client production bundle
npm --prefix client run build

# 2. Verify zero forbidden strings (localhost:5000, cdn.jsdelivr.net, socket.io) in client/dist
node scripts/check-bundle.mjs

# 3. Run backend unit & integration test suite
npm --prefix server test

# 4. Run database & scoring integrity check
npm --prefix server run verify-integrity
```

---

## 3. Deploying to Staging First (Mandatory Before Production)

Never deploy untested changes directly to production.

```bash
# Deploy to a Firebase Hosting preview channel first
firebase hosting:channel:deploy staging --project <staging-or-prod-project>

# Deploy Firestore & Storage security rules to staging
firebase deploy --only firestore:rules,storage --project <staging-project>
```

Once verified on staging and approved by the project owner:

```bash
firebase deploy --only hosting,firestore:rules,storage
```

---

## 4. Live Release Record (`v1.0.0-pilot` — 2026-10-12)

- **Production URL**: `https://logicq-clanguage.web.app` (Firebase Project `logicq-clanguage`, Project `#898954156375`)
- **Staging Preview URL**: `https://logicq-clanguage--staging-myz67fzi.web.app` (version `8732518ed04ee9c5`, expires `2026-10-19`)
- **GitHub Repository & Release Tag**: `https://github.com/pratikpt1304/LogicQ` (`main` tagged `v1.0.0-pilot`; pre-deploy rollback tag `v0.9.0-pre-pilot`)
- **Deployed Components**:
  - **Firebase Hosting**: Live (`15` files in `client/dist`, `0` console errors, `0` warnings, `0` CSP violations).
  - **Firestore Security Rules (`firestore.rules`)**: Compiled and released to `cloud.firestore`.
- **Blaze Plan Cost Estimate (`500` Students) & Manual Post-Deploy Checklist**:
  1. **Upgrade `logicq-clanguage` to Blaze Plan (`< $0.25–$1.75/month` for 500 students)**: Required for Firebase Cloud Storage (`storage.rules`, ~1.5 GB/mo = `< $0.25/mo`), Cloud Functions / Cloud Run C11 Judge (`asia-south1`), Cloud Scheduler (`17:00 IST` & `17:05 IST`), and Secret Manager. Set a **₹500 ($6/mo)** budget alert at `50%`, `80%`, `100%`.
  2. **Restrict Browser API Key (`AIza...`)**: In GCP Console $\rightarrow$ Credentials, restrict the Browser key to HTTP referrers `https://logicq-clanguage.web.app/*` and `https://logicq-clanguage.firebaseapp.com/*`.
  3. **Enroll Firebase App Check (reCAPTCHA Enterprise)**: Register `logicq-clanguage.web.app` in Firebase Console $\rightarrow$ App Check.
  4. **Enable Admin MFA & Add 2nd Project Owner**: Enforce MFA on all `ADMIN` accounts and add a 2nd Owner in GCP IAM.
  5. **Backup & Restore Verification**: Run `gcloud firestore export gs://logicq-clanguage-backups/YYYY-MM-DD` and test restoring into a staging collection.

