# 📘 LogicQ User Guide
> **Practice C. Solve every module. Build real understanding.**  
> **Cohort:** Integrated M.Tech | Academic Year 2026-27  
> **Platform Link:** [https://logicq-clanguage.web.app](https://logicq-clanguage.web.app)  
> **Developed by:** Bitwise Club  

---

## 📌 At a glance
- **100 marks per module:** 4 sections &times; 20 questions (80 marks) + 1 integrated mini-project (20 marks).
- **3 test cases per question:** 2 visible and 1 hidden.
- **Time matters:** a correct answer within the prescribed time earns the full mark.
- **One submission per question:** once you submit a correct solution, it is locked.
- **Two separate scores:** your Academic Score and your Integrity Score are never merged.

---

## 1. Create your account and verify your identity
Your identity is bound to one PRN, one email address and one mobile number. You do this once.

1. **Open the portal** (or your instant join link) in Google Chrome or Microsoft Edge.
2. **Enter your PRN in UPPERCASE** with no spaces, for example `2126PMIM1003`. The system checks whether it already exists.
3. **Enter your email address** and verify the email OTP.
4. **Enter your mobile number** and verify the mobile OTP.
5. **Only after both OTPs succeed**, your PRN, email and mobile are bound to your account.

### Good to know
- Your PRN, email and mobile must each be unique. One email or mobile cannot belong to two PRNs, and one PRN cannot have two email/mobile pairs.
- OTPs expire and have retry limits. Request a new one if yours expires.
- Until your identity is bound and your account is Active, you cannot see questions, test cases, the code editor or any assessment.
- If your details conflict with an existing record, you cannot bypass it. Contact the Department Faculty Desk for identity recovery.

**Account states:** `Pending`, `Email OTP Verified`, `Mobile OTP Verified`, `Identity Bound`, `Active`, `Suspended`.

---

## 2. Join a section
Your faculty adds you to a section in one of two ways:
- **Excel upload:** faculty import your name, PRN, email and mobile. You still complete both OTPs.
- **Instant join form:** faculty share a link, QR code or WhatsApp message. Enter your name, PRN, email and mobile, then verify both OTPs. Submitting the form alone does not give you access.

---

## 3. Devices and sessions
- Each account can register up to **two devices** (for example one laptop and one phone). A third device is blocked.
- **Only one session is active at a time.** Signing in on another device ends the open session.
- If your device is damaged or replaced, ask department faculty to reset your registered devices.

---

## 4. Your dashboard
After login you see:
- **Test cards:** Active Tests, Upcoming Tests, Completed Tests.
- **Current Module** and your progress.
- **Academic Score and Integrity Score**, shown separately.
- **Strong areas**, areas of concern and learning gaps.
- **AI learning insights:** specific practice recommendations.

*Open Profile from your avatar to see your PRN, division, bound email, mobile and registered devices.*

---

## 5. How a module is scored (100 marks)

| Component | Calculation | Marks |
| :--- | :--- | :--- |
| Section 1 | 20 questions &times; 1 | 20 |
| Section 2 | 20 questions &times; 1 | 20 |
| Section 3 | 20 questions &times; 1 | 20 |
| Section 4 | 20 questions &times; 1 | 20 |
| Integrated Mini-Project | Rubric-based | 20 |
| **Total** | | **100** |

### Time-based marking

| Result | Mark |
| :--- | :--- |
| Correct and within the prescribed time | 1 |
| Correct but outside the prescribed time | 0.5 |
| Incorrect | 0 |

### Expected solving times by difficulty:

| Difficulty | Expected time |
| :--- | :--- |
| Easy | 2–8 minutes |
| Medium | 8–15 minutes |
| Hard | 15–25 minutes |

Your question timer starts when you **start the question**, not when you log in. After submission you can see your actual time, the expected reference time, and the deviation in minutes and percent.

---

## 6. The four modules
1. **Control Structures:** if-else, switch-case, nested loops, primality checking, bitwise operators.
2. **Arrays and Matrices:** 1D arrays, frequency counting, matrix multiplication, spiral generator, transposes.
3. **Strings and Buffers:** custom strlen, strcpy and strcmp without string.h, palindromes, anagrams, buffer safety.
4. **Functions and Pointers:** pass by value and reference, Tower of Hanoi, pointer arithmetic, malloc and free, structs.

*The mini-project combines concepts from all four sections (see Section 12).*

---

## 7. Solve a question
1. **Open and start the question.** The timer begins now.
2. **Read the problem:** statement, scenario, input and output format, constraints and examples. Starter code is provided where applicable.
3. **Write your code** in the built-in secure editor.
4. **Run.** Check against the two visible test cases and read the console output.
5. **Submit.** The hidden test case runs on the server. You see Passed or Failed for each case, but never the hidden input or output.
6. **Lock.** Once a correct submission is accepted, the question is locked. There is no Retry, Reopen, Reset or Attempt Again, and your original submission and timing are kept as a permanent record.

### Test cases
- **Test Case 1 and 2 (visible):** you see the input, expected output and test condition.
- **Test Case 3 (hidden):** evaluated on the server. Think about edge cases: zero, negative values, boundaries, large inputs.

### Keep input and output clean
Test harnesses match output character by character. Use only `scanf` and `printf` for the answer.
- ❌ **WRONG:** `printf("Enter n: ");`
- ✅ **RIGHT:** `scanf("%d", &n);`
- ✅ **RIGHT:** `printf("%d\n", ans);`

**Infinite loop guard:** The compiler allows 1.0 second of CPU time. Loops like `while(1)` end with Time Limit Exceeded.

### Different questions for different students
Question order and question variants are randomised, and inputs and parameters can differ per student. Each question you receive has its own **Question Variant ID**. Do not rely on a friend's solution.

---

## 8. Practice Mode
Practice Mode is for learning without pressure.
- Unlimited time per problem.
- Switching tabs or looking up syntax never affects your Integrity Score.
- Every keystroke is auto-saved to the cloud, so a dropped connection costs you nothing.

---

## 9. Assessments (timed and proctored)
Faculty create and assign tests. A test has a name, instructions, duration, question count and start and end time.
1. **Find the test** in Active Tests on your dashboard, or open the link shared by faculty.
2. **Start in fullscreen** where your browser supports it.
3. **Start each question** when you are ready; its timer begins then.
4. **Submit in time.** Everything auto-submits when the test timer ends.

*Before you start: check your connection and battery, and close other applications.*

---

## 10. AI Viva: verifying your understanding
As part of assessments, you may be asked a short viva about your own code.
- **When:** after every second successive correct submission (the 2nd, 4th, 6th and so on).
- **What:** an AI-generated question based on your **actual submitted code**. It may cover logic, variables, loops, conditions, pointers, edge cases, complexity or why you made a choice.
- **Time:** a strict **one-minute timer**. You see the question, the countdown and an answer field or recording control. Submit before time runs out.
- **What is recorded:** the question, your answer or recording, response time, whether you answered before timeout, and the linked code. Faculty review your response alongside your code.

> 🛡️ **This is not an accusation.** The viva is marked on your record as "Suspicious Flag - Viva Trigger", which only means an extra understanding check was triggered. It is not a conclusion that you cheated. If you wrote the code yourself, you will be able to explain it.  
> *If you submit an incorrect final answer, the successive-correct counter resets.*

---

## 11. Assessment integrity
During assessments, LogicQ looks for unusual behaviour that may need faculty review. Practice Mode is not affected.

### What the editor restricts
Where technically possible, the secure editor blocks copy, paste, cut, right-click, text selection, drag and drop, and external content insertion. Attempts are recorded with timestamps.

### What is recorded
- **Environment:** tab switches, focus loss (count and duration), fullscreen exits, navigation attempts.
- **Clipboard:** copy, paste, cut and drag-drop attempts.
- **Writing behaviour:** typing and editing patterns, large sudden code insertions, how your code grew over time.
- **Running and debugging:** compile and runtime errors, number of runs, time between edits and runs.
- **Engagement and timing:** active work time and how the solution emerged over time.

### How to read your Integrity Score
- It is a number from **0 to 100** for each question and for your whole assessment, where **lower is better**.
- **Classifications:** Normal, Low Risk, Moderate Risk, High Risk, Critical Risk.
- **It is a risk indicator, not proof.** No single signal and no single score leads to an automatic academic penalty. Faculty review flagged sessions.
- **It is separate from your Academic Score.** A high academic score and a review flag can exist together.
- You can see your own score, classification and recorded metrics. Internal thresholds and weights are not shown.

### Staying clean
- Stay in fullscreen and on the assessment tab.
- Type your own code. Do not paste from AI tools or websites.
- Work step by step: write, run, debug, improve.

---

## 12. Mini-project
The mini-project is worth **20 marks** and combines concepts from all four sections.

| Rubric component | Marks |
| :--- | :--- |
| Section 1 competency | 5 |
| Section 2 competency | 5 |
| Section 3 competency | 5 |
| Section 4 competency | 5 |
| **Total** | **20** |

- **It starts INACTIVE.** Joining a section, finishing questions or completing the module does not activate it.
- **Faculty activate it for you individually** after reviewing your progress. There is no bulk or automatic activation.
- Once active, you work in the same secure, monitored environment as other assessments.
- Your project score and Integrity Score are recorded separately.

*If you meet the eligibility criteria and your project is still inactive, speak to your faculty.*

---

## 13. Analytics, reports and transcripts
### Performance charts
- Overall marks, percentage and percentile.
- Module-wise and Section 1–4 performance.
- Easy, Medium and Hard performance.
- Topic and learning-outcome performance.
- Expected versus actual time and deviation.
- Success on Test Case 1, Test Case 2 and the hidden test.
- Performance trend across tests and modules.

### Gap analysis and learning insights
AI looks at repeated mistakes, long solving times, compilation errors, hidden-test failures and your improvement trend, then tells you your strengths, developing areas and gaps, with specific practice recommendations. One question never defines you. If you need support, you get a support alert with suggestions. Strong performers get challenge problems and extension activities. Faculty can review and override these insights.

### Module completion dashboard
When you complete a module you get a dashboard and downloadable report based only on your actual submissions. It shows Academic Score X/100 and Integrity Score Y/100 separately, plus question-wise and section scores, the mini-project score (if completed), strengths, concerns, gaps, timing and test-case performance.

### Performance Report (PDF)
Select **Download Performance Report**.
- **Part A, Submitted Solutions:** question ID and statement, difficulty, your code, submission time, all three test results and marks.
- **Part B, Performance and Integrity:** timing and deviation, marks, Integrity Score, recorded behaviour metrics, and viva details if triggered.

---

## 14. Your privacy
- Only data needed for assessment, academic analytics, integrity verification and learning analytics is collected.
- Identity, academic and behavioural data are kept separate.
- Students see only their own data. Faculty see only the sections and students they are authorised for.
- Faculty dashboards show summaries, not raw keystrokes.
- Ask your department for the retention and deletion policy.

---

## 15. Code of conduct
### ✅ Do
- Complete OTP verification and keep your details accurate.
- Stay within two registered devices.
- Start a question only when you are ready, because its timer begins immediately.
- Use Practice Mode to build speed and understanding.
- Explain your own code confidently when a viva appears.

### ❌ Don't
- Sign in from a third device or share your account.
- Leave fullscreen or switch tabs during an assessment.
- Paste code from AI tools or outside repositories.
- Add prompts like `printf("Enter: ")` to your code.
- Share solutions. Your variants are different, and sharing does not help you.

---

## 16. Troubleshooting

- **I cannot access any questions.**  
  Your identity must be bound and your account Active. Complete both OTPs, or contact the Department Faculty Desk.
- **My OTP did not arrive or has expired.**  
  Request a new one. There are retry and rate limits, so wait a moment between attempts.
- **My PRN, email or mobile is rejected as a conflict.**  
  Each must be unique and permanently paired. Contact the Department Faculty Desk for identity recovery.
- **My question is locked.**  
  A successfully submitted question cannot be reopened. This is by design.
- **"Wrong Answer" but my output looks right.**  
  Compare the console diff closely. Hidden trailing spaces or a missing `\n` cause a mismatch. Also test edge cases, since the hidden test may check one.
- **Compile error: "break statement outside loop or switch".**  
  Check your closing curly braces. A brace closed too early pushes `default:` and `break;` outside the switch.
- **I see Error 404 or "Segfault Encountered".**  
  You opened an outdated link or your session expired. Select Return Home.
- **My third device is blocked.**  
  This is the two-device limit working as designed. Ask department faculty to reset your registered devices.
- **My mini-project is inactive.**  
  Faculty activate it individually. Ask your faculty to review your progress.
- **I think my integrity flag is wrong.**  
  A flag is a risk indicator, not a verdict. Faculty review it, and you can discuss it with them.

**Still stuck?** Contact the Department Faculty Desk.
