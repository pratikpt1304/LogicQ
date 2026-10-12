# LogicQ Book Content Extraction & Validation Report (`/docs/CONTENT_REPORT.md`)

> **STATUS**: `BLOCKED ON USER BOOK ATTACHMENT & APPROVAL`  
> Per the user's instruction: *"Update `/docs/MASTER_SPEC.md` and write `/docs/CONTENT_PIPELINE.md` first, then STOP for my review before importing or building anything. Do the import only after I approve `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md`."*

---

## 1. Current Pool Status (Pre-Import Baseline)

- **Book File Attached**: `None yet` (`[BOOK TITLE, AUTHOR, EDITION]` placeholder in prompt; awaiting file in `/private/books/`).
- **Existing Seeded Problems**: `16` validated original C11 problems currently active so local testing, daily challenges, and weekly leaderboards remain functional until the book import is approved and run.
  - All `16/16` seeded problems have **$\ge 2$ visible sample test cases** and **$\ge 5$ hidden evaluation test cases** (including `"In-Place Pointer Swap & Sum"` (`pointer-swap-in-place`), which has `2` visible sample tests and `5` hidden edge-case tests).

---

## 2. Chapter-by-Chapter Extraction & Classification Table (Template Populated by `/scripts/import-book.ts`)

Once `/docs/CONTENT_PIPELINE.md` and `/docs/CONTENT_RIGHTS.md` are approved and the book file is placed in `/private/books/`, running `npx tsx scripts/import-book.ts <path-to-book>` automatically populates this table:

| Chapter | Topic / Theme | Total Found | Class A (Direct `stdin`/`stdout`) | Class B (Rewritten `stdin`/`stdout`) | Class C (Non-Judgeable — Listed for Owner Decision) | Passed 1-Pass/2-Fail Gate | Approved / Published |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| *Pending* | *Awaiting `[BOOK TITLE, AUTHOR, EDITION]`* | `0` | `0` | `0` | `0` | `0` | `0` |

---

## 3. Items Requiring Project Owner Decision

1. **Book File & Metadata**: Please provide the book file path and `[BOOK TITLE, AUTHOR, EDITION]`.
2. **Rights Confirmation**: Confirm whether we should operate in **Strict Original-Wording Mode** (default in `/docs/CONTENT_RIGHTS.md`) or if you hold written author/publisher permission.
3. **Existing 16 Seeded Problems**: Confirm whether all 16 existing seeded problems should be marked `RETIRED` upon import (default: `RETIRED`, preserving existing student submissions and points).
