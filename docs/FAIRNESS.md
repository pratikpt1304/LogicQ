# LogicQ Competitive Fairness & Academic Integrity Assessment (`/docs/FAIRNESS.md`)

## 1. Uploaded Solutions (`Upload Files` Tab) vs. Auto-Judged C Code

### Honest Risk Assessment
1. **Ease of Copying or External Generation**:
   - Handwritten notes, photographed flowcharts/code sheets, or PDF write-ups submitted through the **Upload Files** tab are inherently easier for students to copy from peers or generate with external assistance than live, sandbox-tested C11 code.
   - **Honest Limitation**: **Automatic detection of copied handwritten or photographed solutions is not reliable.** Optical character recognition (OCR) and image perceptual hashing can be trivially bypassed by rewriting on a fresh sheet of paper or re-photographing at a different angle.
2. **Mitigations & Admin Controls Implemented in LogicQ**:
   - **Never Auto-Judged / Never Instant Points**: Uploaded solutions are stored with status `PENDING_REVIEW` (`0` points at upload time). They only award points, extend streaks, or affect the weekly leaderboard after an administrator explicitly inspects and approves the upload with step-up password re-authentication.
   - **Blocked After Accepted Code Solve**: If a student already has an `ACCEPTED` code submission for a problem, file uploads for that problem are rejected so students cannot double-claim points.
   - **One Pending Upload Per Problem & Daily Rate Cap**: Each student can have at most `1` pending upload per problem at a time and at most `5` upload submissions per day.
   - **Admin Side-by-Side Comparison & Suspicion Flagging**: The Admin **Review Uploads** queue includes:
     - **Flag Suspicious Upload (`isFlagged`, `flagReason`)**: Admins can flag any upload for academic integrity review and attach internal faculty notes (`adminInternalNote`) invisible to students.
     - **Side-by-Side Upload Comparator**: Admins can select any two uploaded submissions for the same problem and compare their images/PDFs, approach notes, timestamps, and departments side by side before approving.
   - **Append-Only Audit Trail**: Every admin view of an uploaded file and every review decision (`APPROVED`, `REJECTED`, `NEEDS_CHANGES`) is permanently logged in `/admin_audit_logs`.

---

## 2. Syllabus Book Source Metadata & Solution Manual Risk

### Honest Risk Assessment
1. **Book & Solution Manual Lookup**:
   - When daily challenges are derived from a known textbook, students who own the textbook, a published solution manual, or an AI assistant could attempt to look up standard solutions if they know the chapter and exercise number.
   - **Honest Limitation**: No online daily challenge platform can completely prevent a student working on an unsupervised device from consulting a book or AI assistant.
2. **Mitigations Enforced in LogicQ**:
   - **Admin-Only `sourceRef` Metadata**: The book title, chapter number, exercise number, and page number (`sourceRef`) are stored strictly as admin-only metadata. They are stripped from all student-facing API endpoints (`/api/problems/daily`, `/api/problems/:slug`, `/api/problems/current-week`) and blocked by Firestore security rules.
   - **Original Wording & Fresh Constants**: Per [`/docs/CONTENT_RIGHTS.md`](./CONTENT_RIGHTS.md), every problem statement is rewritten in original wording with modified constants, input/output formats, and custom hidden edge-case tests so copy-pasted textbook code will fail input parsing or edge-case assertions.
   - **Strict Unreleased Problem Isolation**: Future days of the current week (`status: 'LOCKED'`), `DRAFT` problems, `VALIDATED` problems, and `RETIRED` problems are completely unreadable by student clients via both API checks and Firestore rules.
