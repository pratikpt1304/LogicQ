# LogicQ Content Rights, Copyright & Original-Wording Policy (`/docs/CONTENT_RIGHTS.md`)

> **STATUS**: `DEFAULT STRICT ORIGINAL-WORDING MODE ACTIVE (NO VERBATIM COPYING)`  
> Unless the project owner confirms in writing that written permission has been granted by the book's author or publisher (or that the material is authored by the owner/faculty), LogicQ enforces strict non-infringing transformation rules.

---

## 1. What Is Used From the Designated Syllabus Book (Non-Copyrightable Ideas & Syllabus Sequence)

1. **Curriculum & Pedagogical Sequence**:
   - The order of C programming topics by chapter (e.g., Operators & Expressions $\rightarrow$ Control Flow $\rightarrow$ Functions & Recursion $\rightarrow$ Arrays $\rightarrow$ Pointers $\rightarrow$ Structures & File I/O).
2. **Underlying Algorithmic / Programming Concept**:
   - The mathematical or systems concept tested by an exercise (e.g., computing a greatest common divisor, reversing an array via pointers, checking matrix symmetry, or parsing a character buffer).
3. **Difficulty Progression & Verification Checks**:
   - Using the book's mathematical domain to verify that LogicQ's independent C11 reference implementation is algorithmically sound.
4. **Admin-Only Provenance Pointer (`sourceRef`)**:
   - Storing `{ bookTitle, edition, chapterNumber, exerciseNumber, pageNumber }` strictly as internal faculty/admin metadata so instructors know which syllabus concept each daily challenge covers.

---

## 2. What Is NEVER Copied or Displayed (Strict Prohibitions)

Unless explicit written license/permission is placed on file by the project owner:
1. **No Verbatim Problem Statements**: Never copy sentences, paragraphs, or narrative framing from the book. Every problem statement is written from scratch in original wording with new domain context, new variable names, and new story framing.
2. **No Verbatim Sample Numbers or Examples**: All visible sample inputs/outputs and all hidden test cases use freshly generated numerical values and edge cases.
3. **No Book Figures, Scans, or Page Images**: Never extract, bundle, or display scans, diagrams, or page crops from the book to students.
4. **No Verbatim Book Solutions**: All C11 reference solutions and starter code templates are written cleanly from scratch for the LogicQ C11 sandbox (`gcc -O2 -std=c11 -Wall`).
5. **No Student Exposure of `sourceRef`**: Book title, chapter number, and exercise number are never sent to student client bundles or API responses.

---

## 3. Private Storage & Git Exclusion Guarantees

- The source book file (`/private/books/*`) and intermediate extraction review files (`/private/review/*`) are listed in `.gitignore`.
- They are never placed in `client/public/`, `client/dist/`, Firebase Hosting, or public Cloud Storage buckets.
- Build-time verification (`scripts/check-bundle.mjs`) ensures no private book files are included in client build artifacts.
