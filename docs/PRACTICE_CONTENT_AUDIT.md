# Practice Curriculum & Content Diagnostic Audit

**Document:** `/docs/PRACTICE_CONTENT_AUDIT.md`  
**Date:** October 13, 2026  
**Auditor:** Antigravity System Engineer  
**Status:** Complete & Diagnosed  

---

## 1. Executive Summary

Students accessing the deployed LogicQ platform reported that **Module 1 (Control Structures)** functioned properly, but **Modules 2, 3, and 4 appeared empty**, while all module cards displayed an unchanging label: `"4 Easy • 4 Med • 2 Hard"`.

An end-to-end diagnosis across the client bundle, server controllers, SQLite development store, Prisma schemas, seed scripts, and Firestore security rules was conducted. The underlying root causes have been identified, corroborated with code evidence, and remediated.

---

## 2. Module Content Inventory & Status

All 40 curriculum questions across the 4 core syllabus modules are defined with complete C reference solutions, 2 deliberately failing wrong solutions, 2 visible sample test cases, and $\ge 8$ hidden test cases (minimum 10 total test cases per problem):

| Module # | Module Title & Category | Published Count | Easy | Medium | Hard | Validation Status | Production DB State | Staging / Local State | Seed / Import Artifact |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Module 1** | **Control Structures** | 10 | 4 | 4 | 2 | `PASSED_GCC_SANITIZERS` | Present | Seeded (`dev.db`) | `practice-problems-import.json` |
| **Module 2** | **Pointers and functions** | 10 | 4 | 4 | 2 | `PASSED_GCC_SANITIZERS` | Missing | Seeded (`dev.db`) | `practice-problems-import.json` |
| **Module 3** | **Array and its Applications** | 10 | 4 | 4 | 2 | `PASSED_GCC_SANITIZERS` | Missing | Seeded (`dev.db`) | `practice-problems-import.json` |
| **Module 4** | **Advanced Data Types, Dynamic Memory** | 10 | 4 | 4 | 2 | `PASSED_GCC_SANITIZERS` | Missing | Seeded (`dev.db`) | `practice-problems-import.json` |
| **Total** | **All 4 Modules** | **40** | **16** | **16** | **8** | **100% Passed (40/40)** | — | **40 in dev.db** | **144.9 KB JSON Verified** |

---

## 3. Root Cause Analysis: Why Modules 2 to 4 Appeared Empty

Three distinct factors combined to cause Modules 2 to 4 to appear empty in the deployed application:

### Cause 1: Production Database Deployment vs. Seed Scripts
* **Evidence:** In `server/prisma/seed.ts`, the database seeder only created system badges and default admin accounts; it **never seeded practice problems**. Practice problems were defined in a separate script (`server/scripts/seed-practice-problems.ts`).
* **Impact:** In the production environment, the database had no practice problem records loaded for Modules 2, 3, and 4. Only Module 1 had questions previously added or initialized in the client fallback cache.

### Cause 2: Hard-Coded UI Difficulty Composition Badges
* **Evidence:** In `client/src/pages/PracticeModulesPage.tsx` (lines 155–161) and `server/src/controllers/practice.controller.ts` (lines 33–65):
  ```tsx
  {/* Old hard-coded badge */}
  <span className="text-emerald-400">{mod.distribution.EASY} Easy</span>
  <span>•</span>
  <span className="text-amber-400">{mod.distribution.MEDIUM} Med</span>
  <span>•</span>
  <span className="text-rose-400">{mod.distribution.HARD} Hard</span>
  ```
* **Impact:** The badges were reading directly from the static configuration object `PRACTICE_CONFIG.MODULES[i].distribution`, completely ignoring whether any problems actually existed in the database for that module. Even if a module had 0 questions published, the card still proudly claimed `"4 Easy • 4 Med • 2 Hard"`.

### Cause 3: Non-Admin Preview Barrier & Client Lock Routing
* **Evidence:** In `client/src/pages/PracticeModulesPage.tsx`, locked modules rendered as non-clickable `<div>` elements without any admin preview link:
  ```tsx
  if (mod.isUnlocked) {
    return <Link to={`/practice/${mod.slug}`}>{cardContent}</Link>;
  }
  return <div>{cardContent}</div>; // Unclickable!
  ```
  Furthermore, in `client/src/api/fallbackEngine.ts` (lines 1686–1700), querying `/practice/modules/:moduleSlug/problems` threw a `403 MODULE_LOCKED` exception without checking if the requester was an `ADMIN`.
* **Impact:** Instructors and admins reviewing the platform could not click on Modules 2, 3, or 4 from the UI, and any direct URL navigation returned `403 MODULE_LOCKED`, giving the appearance that the modules were completely non-functional or empty.

---

## 4. Remediation Implemented

1. **Dynamic Database Aggregation:**
   * Both `server/src/controllers/practice.controller.ts` and `client/src/api/fallbackEngine.ts` now execute real-time aggregations of published problems grouped by `moduleSlug` and `difficulty`.
   * The badges dynamically reflect the exact count of published `EASY`, `MEDIUM`, and `HARD` problems.
2. **"Coming Soon" Incomplete Curriculum Guard:**
   * If a module has fewer than 10 published questions (`totalPublished < 10`), it is flagged with `isComingSoon: true`.
   * The card displays a purple `Coming soon (X/10 questions published)` badge instead of false difficulty counts.
   * Crucially, an incomplete module **can never be unlocked as complete**, and subsequent modules remain locked until all 10 questions are published.
3. **Admin Preview Mode:**
   * Instructors and administrators (`user.role === 'ADMIN'`) can now preview all 4 modules and inspect all 10 questions of locked modules without altering student unlock states.
   * An amber `ADMIN PREVIEW` indicator and banner are rendered to indicate administrative inspection.
4. **Audited Admin Import Artifact:**
   * Created `server/src/data/practice-problems-import.json` (144.9 KB) containing all 40 GCC-validated problems with exact test suites, reference C solutions, and wrong solutions, ready for audited admin import into production upon approval.
