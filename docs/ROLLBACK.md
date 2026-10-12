# LogicQ Rollback Procedures (`/docs/ROLLBACK.md`)

> **Production Project**: `logicq-clanguage`  
> **Rollback Reference Tag**: `v0.9.0-pre-pilot`  
> **Pre-Deploy Hosting Version**: Prior release in Firebase Console

---

## 1. Fast Emergency Rollback (Within 60 Seconds)

If the live site at `https://logicq-clanguage.web.app` experiences unexpected client errors, run:

```bash
# Roll back Firebase Hosting to previous version instantly
firebase hosting:rollback --project logicq-clanguage
```

---

## 2. Component-by-Component Rollback

### A. Firestore Security Rules
```bash
# Check out the stable pre-deploy rules
git checkout v0.9.0-pre-pilot -- firestore.rules

# Re-deploy security rules immediately
firebase deploy --only firestore:rules --project logicq-clanguage
```

### B. Storage Security Rules
```bash
git checkout v0.9.0-pre-pilot -- storage.rules
firebase deploy --only storage:rules --project logicq-clanguage
```

### C. Git Codebase
```bash
# Checkout previous release commit or tag
git checkout main
git reset --hard v0.9.0-pre-pilot
git push origin main --force
```

### D. Local Database (dev.db)
```bash
# Restore dev.db from latest backup if database corruption occurred
copy server\backups\dev_pre_deploy.db server\prisma\dev.db
```
