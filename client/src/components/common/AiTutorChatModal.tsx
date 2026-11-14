import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  BookOpen,
  Code2,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Check,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AiTutorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// LogicQ Official App Logo Icon
const LogicQLogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="aiModalLogoQGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B9BFF" />
        <stop offset="100%" stopColor="#46D9A0" />
      </linearGradient>
    </defs>
    <circle
      cx="48"
      cy="44"
      r="28"
      stroke="url(#aiModalLogoQGrad)"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path
      d="M 38 38 L 47 44 L 38 50"
      stroke="#8B9BFF"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="51"
      y1="50"
      x2="59"
      y2="50"
      stroke="#46D9A0"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M 64 60 L 80 76 M 73 76 L 80 76 L 80 69"
      stroke="url(#aiModalLogoQGrad)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const STARTER_PROMPTS = [
  'Explain Pointers vs Arrays in C',
  'How does the 20-Mark CIE Score work?',
  'What causes a Segmentation Fault (Core Dumped)?',
  'How does the assessment integrity score work?',
];

// Built-in intelligent Socratic Knowledge Base & Policy Engine
function generateLocalSocraticResponse(query: string, studentName: string): string {
  const q = query.toLowerCase().trim();

  // 1. Casual Greetings & Social Chit-Chat
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'hey buddy' ||
    q === 'yo' ||
    q === 'sup' ||
    q === 'namaste' ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q.includes('good evening') ||
    q.includes('kya haal') ||
    q.includes('kaise ho') ||
    q.includes('how are you') ||
    q.includes('buddy')
  ) {
    const greetings = [
      `Hey ${studentName}! 😊 I'm doing great, thank you! Ready to dive into C programming with you. Stuck on any logic, pointer doubt, or need platform guidance?`,
      `Hello ${studentName}! 👋 Great to connect with you. I am your LogicQ Socratic C Mentor. What would you like to explore today—C memory models, module scoring, or debugging advice?`,
      `Hey ${studentName}! 🚀 Hope you're having an awesome coding session! How can I assist you right now?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 2. Who are you / Identity
  if (
    q.includes('who are you') ||
    q.includes('tum kaun ho') ||
    q.includes('what are you') ||
    q.includes('what is this') ||
    q.includes('your name')
  ) {
    return `🤖 **I am the LogicQ Socratic AI Mentor!**

I am built directly into the LogicQ platform to help undergraduate and Integrated M.Tech students master low-level C programming (C11 standard, GCC 14).

**What I do:**
• Guide you through difficult C concepts (Pointers, Memory allocation, Recursion, Bitwise logic).
• Decode cryptic GCC compiler warnings and Segmentation Faults.
• Explain LogicQ platform rules, official 20-mark CIE coursework scoring, and evaluation rubrics.
• Uphold academic integrity by giving hints and pseudo-logic rather than dump-and-copy code.

Ask me anything about C programming or platform rules!`;
  }

  // 2B. What can you do / Capabilities
  if (
    q.includes('what can you') ||
    q.includes('what can u') ||
    q.includes('what can you o') ||
    q.includes('can you do') ||
    q.includes('kya kar sakte ho') ||
    q.includes('capabilities') ||
    q.includes('features') ||
    q.includes('help me with')
  ) {
    return `💡 **Here is what I can do for you as your LogicQ AI Mentor:**

• **C Concepts Guidance:** Explain difficult topics like pointer arithmetic, \`malloc\` vs \`calloc\`, recursion trees, bitwise operations, and memory layouts.
• **GCC Debugging Help:** Decode cryptic compiler errors, warnings (\`-Wall -Wextra\`), and Segmentation Faults (\`SIGSEGV\`).
• **Academic & Grading Guidance:** Clarify how the 20-Mark CIE Coursework works, test cases evaluation, and mini-project rubrics.
• **Proctoring Telemetry:** Explain how tab switches, paste attempts, and the integrity score operate during internal tests.
• **Socratic Hints:** Give you logic hints and edge cases for your current practice problem without giving away copy-paste solution code.

What would you like to explore right now?`;
  }

  // 2C. About this App / Platform Overview
  if (
    q.includes('about this app') ||
    q.includes('about app') ||
    q.includes('tell me about this app') ||
    q.includes('about logicq') ||
    q.includes('what is logicq') ||
    q.includes('this app') ||
    q.includes('this platform') ||
    q.includes('ye app kya hai') ||
    q.includes('ye kya hai')
  ) {
    return `⚡ **Welcome to LogicQ — Smart C Programming & CIE Arena!**

LogicQ is an enterprise academic assessment and practice platform designed specifically for engineering students to master low-level C programming.

**Core Sections of LogicQ:**
1. **Dashboard:** Your personal command center displaying live CIE score, solved questions count, submission accuracy, and recent milestones.
2. **Practice Arena (\`/practice\`):** 100 open problems spanning Module 1 to 4 with immediate test case feedback and GCC 14 compiler output.
3. **Lab Internal (\`/lab-internal\`):** 80 official proctored questions worth **20.0 Marks Continuous Internal Evaluation (CIE)**.
4. **C Scratchpad (\`/compiler\`):** An online GCC 14 C11 scratchpad to test arbitrary code snippets, pointer logic, and memory experiments.
5. **Analytics & Submissions:** Track your accuracy, problem velocity, time-efficiency, and download official PDF report cards.

How can I help you navigate or practice right now?`;
  }

  // 3. Thank you & Acknowledgements
  if (
    q.includes('thank') ||
    q.includes('thanks') ||
    q.includes('shukriya') ||
    q.includes('dhanyawad') ||
    q === 'thx' ||
    q === 'tq'
  ) {
    return `You're very welcome, ${studentName}! 😊 Keep up the great effort. Writing robust C code takes practice, and you're making steady progress. Let me know if you run into any more doubts! 💻✨`;
  }

  // 4. Goodbyes
  if (
    q === 'bye' ||
    q === 'goodbye' ||
    q === 'tata' ||
    q.includes('see you') ||
    q.includes('good night')
  ) {
    return `Goodbye for now, ${studentName}! 👋 Best of luck with your coding practice. Remember: *Think in logic, code in C!*`;
  }

  // 5. Code begging / solution generation guard
  if (
    q.includes('give me code') ||
    q.includes('write code for') ||
    q.includes('solve this question') ||
    q.includes('solution for module') ||
    q.includes('full code of') ||
    q.includes('kisi question ka code') ||
    q.includes('code likh ke do') ||
    q.includes('give code')
  ) {
    return `Namaste ${studentName}! 🛡️ **Academic Integrity Guard:**
As your LogicQ Academic Mentor, I cannot write complete solution code for graded questions or modules. This protects your evaluation score and helps you build authentic low-level programming skills.

However, I would love to help you build the solution yourself!
1. Tell me what logic or step you are stuck on.
2. Are you having trouble with loop bounds, pointer arithmetic, or a specific GCC warning?
Let's break it down together!`;
  }

  // 6. Assessment Integrity & Proctoring Telemetry (Priority over generic 'score')
  if (
    q.includes('integrity') ||
    q.includes('proctor') ||
    q.includes('anti-cheat') ||
    q.includes('anti cheat') ||
    q.includes('flag') ||
    q.includes('cheat') ||
    q.includes('tab switch') ||
    q.includes('copy paste')
  ) {
    return `🛡️ **Assessment Integrity & Proctoring Telemetry:**

• **Formula:**
  Integrity Score = 0 + (Tab Switches × 5) + (Paste Attempts × 10) + (Auto-Locks × 20)
• **Score Range:** Starts at **0** (lower is better, 0 means 100% clean).
  - **0 – 15:** Clean (normal academic flow).
  - **16 – 40:** Elevated Risk.
  - **40+:** Critical Breach (auto-quarantined for faculty review).
• **Note:** Integrity score is an advisory invigilation indicator for faculty, not a permanent student-facing mark. Faculty can review audit logs and clear flags for genuine technical issues.`;
  }

  // 7. CIE Score (20 Marks Continuous Internal Evaluation)
  if (
    q.includes('cie') ||
    q.includes('20 mark') ||
    q.includes('20m') ||
    q.includes('lab internal') ||
    q.includes('continuous evaluation') ||
    q.includes('internal evaluation') ||
    q.includes('cie score')
  ) {
    return `📊 **How CIE Lab Internal Scoring Works (20 Marks Official Scale):**

• **Coursework Scope:** 4 Sequential Lab Modules × 20 Questions = **80 Lab Questions Total**.
• **Weightage:** Each successfully accepted solution awards **0.25 Mark**.
  $$80\\text{ Questions} \\times 0.25 = \\mathbf{20.0\\text{ Marks Total (Official CIE)}}$$
• **Grading Criteria:** Every question must pass **all 3 GCC 14 Test Cases** (2 visible sample tests + 1 hidden boundary test).
• **Live Progress:** Your score updates automatically on your Dashboard as **CIE Score: [Solved × 0.25] / 20.0 M**.
• **Academic Role:** This 20-mark score is submitted to your college faculty for official practical Continuous Internal Evaluation (CIE / Term Work).`;
  }

  // 8. General Scoring & Marks
  if (
    q.includes('score') ||
    q.includes('mark') ||
    q.includes('grading') ||
    q.includes('weight') ||
    q.includes('how much marks')
  ) {
    return `📊 **LogicQ Evaluation & Marks Breakdown:**

• **Lab Internal Coursework (CIE):** **20.0 Marks Total**
  - 4 Modules × 20 Questions = 80 Questions (0.25 Mark per question).
  - Evaluated on correctness across 3 GCC test cases.
• **Practice Arena:** 100 Open Problems for unlimited conceptual practice.
• **Mini-Project & Faculty Viva:** Dedicated rubric assessing code quality, memory safety, and viva defense.

Your current live marks are always visible under the **Lab Internal** card on your student Dashboard.`;
  }

  // 9. Platform Rules & Policies
  if (
    q.includes('rule') ||
    q.includes('policy') ||
    q.includes('guideline') ||
    q.includes('regulation') ||
    q.includes('instruction') ||
    q.includes('terms')
  ) {
    return `📋 **LogicQ Academic Platform Rules & Policies:**

1. **Single Session Policy:**
   • Only **1 active login session** is permitted at any given moment. Logging in on a second device automatically terminates the previous session.
   • Maximum **2 registered devices** allowed per student throughout the semester.

2. **Assessment Integrity & Proctoring:**
   • During Lab Internals and Tests, full-screen proctoring is enforced.
   • Tab switches, window defocus, and copy-paste attempts are tracked in your **Integrity Telemetry** (0 is 100% clean).

3. **CIE Coursework Evaluation (20 Marks Total):**
   • 4 Modules × 20 Questions = 80 practical submissions (0.25 mark each).
   • All 3 test cases must pass for credit.

4. **Compiler Standards:**
   • Code is evaluated against standard **GCC 14 (-std=c11 -Wall -Wextra)** with strict memory and time limits.`;
  }

  // 9. Pointers vs Arrays
  if (q.includes('pointer') || q.includes('array') || q.includes('dereference')) {
    return `💡 **Pointers vs. Arrays in C:**

1. **Memory Allocation:**
   - An array has a **fixed block of contiguous memory** allocated at compile time (or stack frame).
   - A pointer is simply an 8-byte variable (on 64-bit systems) that stores the **memory address** of another variable.

2. **Decay to Pointer:**
   - In most expressions, an array's name decays into a pointer to its first element:
     \`int arr[5]; int *p = arr;\` means \`p == &arr[0]\`.

3. **Reassignment:**
   - Pointers can be reassigned: \`p = p + 1;\` (valid, advances by \`sizeof(int)\` bytes).
   - Array names are **constant references**: \`arr = arr + 1;\` causes a GCC compilation error!

4. **Size Difference:**
   - \`sizeof(arr)\` gives total bytes: \`5 * sizeof(int) = 20\`.
   - \`sizeof(p)\` gives pointer size: \`8\` bytes.`;
  }

  // 10. Segmentation Fault
  if (
    q.includes('segfault') ||
    q.includes('segmentation') ||
    q.includes('core dump') ||
    q.includes('crash') ||
    q.includes('sigsegv')
  ) {
    return `⚡ **What Causes a Segmentation Fault in C?**

A Segmentation Fault (SIGSEGV) happens when your compiled binary attempts to read or write to a memory address that the OS has not mapped for your process.

**Top 4 Causes in LogicQ:**
1. **Dereferencing a NULL or Uninitialized Pointer:**
   \`\`\`c
   int *ptr = NULL;
   *ptr = 10; // 💥 CRASH: Operating system prohibits accessing address 0x0
   \`\`\`
2. **Buffer Overflow / Out-of-Bounds Indexing:**
   \`\`\`c
   int arr[10];
   arr[100] = 5; // 💥 Accessing outside stack boundary
   \`\`\`
3. **Missing \`&\` in \`scanf\`:**
   \`\`\`c
   int n;
   scanf("%d", n);  // 💥 WRONG! Passes garbage value of n as an address
   scanf("%d", &n); // ✅ CORRECT! Passes memory address
   \`\`\`
4. **Stack Overflow from Infinite Recursion:**
   Recursion without a proper base condition exhausts the process call stack.`;
  }

  // 11. Memory Management / malloc / free
  if (
    q.includes('malloc') ||
    q.includes('free') ||
    q.includes('calloc') ||
    q.includes('realloc') ||
    q.includes('dynamic memory') ||
    q.includes('heap')
  ) {
    return `🧠 **Dynamic Memory Management in C (<stdlib.h>):**

• \`malloc(size)\`: Allocates uninitialized memory on the **Heap**.
• \`calloc(n, size)\`: Allocates heap memory and initializes every byte to **0**.
• \`free(ptr)\`: Returns memory back to the operating system.

**Best Practice Rule:**
Always check if \`malloc\` returned \`NULL\` before dereferencing:
\`\`\`c
int *arr = (int *)malloc(n * sizeof(int));
if (arr == NULL) {
    fprintf(stderr, "Out of memory\\n");
    return 1;
}
// Use arr...
free(arr);
arr = NULL; // Prevent dangling pointer!
\`\`\``;
  }

  // 12. Mini-Project & Faculty Viva
  if (
    q.includes('mini-project') ||
    q.includes('mini project') ||
    q.includes('project') ||
    q.includes('viva') ||
    q.includes('rubric')
  ) {
    return `🎓 **Integrated Mini-Project & Faculty Viva (20 Marks):**

Each module ends with an Integrated Mini-Project that tests real-world problem solving:
• **Scope:** Requires applying functions, dynamic memory, structs, or algorithms from all 4 sections.
• **Unlocking:** Unlocks automatically once all 4 sections of that module are completed (or when faculty opens it for your batch).
• **Evaluation Rubric (20 Marks Total):**
  - **Code Quality & Modularity (6 Marks):** Clean C11 syntax, header guards, zero warnings.
  - **Algorithmic Correctness & Edge Cases (6 Marks):** Handling NULL pointers, boundary values, memory leaks.
  - **Faculty Viva Defense (8 Marks):** Answering conceptual questions from the faculty on memory flow, time complexity, and data structures.`;
  }

  // 13. Lab Internals vs Practice Mode
  if (
    q.includes('exam') ||
    q.includes('test') ||
    q.includes('internal') ||
    q.includes('practice')
  ) {
    return `🎯 **Practice Mode vs. Lab Internal / Exam Mode:**

• **Practice Mode:**
  - Unlimited runs and submissions.
  - Instant compiler error breakdown & test case feedback.
  - No countdown pressure; explore logic at your own pace.

• **Lab Internal / Exam Mode:**
  - Strict countdown timer.
  - Live proctoring & integrity monitoring (full-screen locked).
  - Only visible sample tests are shown; hidden evaluation test cases determine final marks.
  - Single submission finalized upon timer expiry or manual finish.`;
  }

  // 14. Devices & Sessions
  if (
    q.includes('device') ||
    q.includes('session') ||
    q.includes('login') ||
    q.includes('logout') ||
    q.includes('two device')
  ) {
    return `📱 **Devices and Session Policy:**

• **Single Active Session:** A student can only have **1 active login session** at any moment. Logging in on a second device automatically logs out the previous session.
• **Device Limit:** Maximum **2 authorized devices** per student throughout the semester.
• If you switch to a 3rd new device, contact the Department Faculty Desk or WhatsApp support to release older device slots.`;
  }

  // 15. Four Modules / Curriculum
  if (
    q.includes('module') ||
    q.includes('four module') ||
    q.includes('curriculum') ||
    q.includes('syllabus') ||
    q.includes('topic')
  ) {
    return `📚 **The Four Curriculum Modules:**

1. **Module 1: C Fundamentals & Control Structures**
   - Syntax, types, input/output (\`scanf\`/\`printf\`), \`if-else\`, \`switch-case\`, loops (\`for\`/\`while\`), bitwise operators.
2. **Module 2: Arrays, Strings & Pointers**
   - 1D/2D arrays, matrices, string manipulation without \`string.h\`, pointer basics and arithmetic.
3. **Module 3: Functions, Recursion & Scope**
   - Pass-by-value vs pass-by-reference, recursive algorithms (Factorial, Fibonacci, GCD, Hanoi), memory scopes.
4. **Module 4: Structures, Unions & Dynamic Memory**
   - User-defined types, nested structs, \`malloc\`, \`calloc\`, \`realloc\`, \`free\`, linked lists.`;
  }

  // 16. Help / Faculty / Support
  if (
    q.includes('faculty') ||
    q.includes('teacher') ||
    q.includes('sir') ||
    q.includes('whatsapp') ||
    q.includes('issue') ||
    q.includes('help') ||
    q.includes('contact') ||
    q.includes('support')
  ) {
    return `🤝 **Faculty Contact & Technical Support:**

• **Faculty WhatsApp:** You can reach your course faculty directly on WhatsApp at **+91 9834620537** using the shortcut in the floating bottom-right radial menu.
• **Report an Issue:** Click **Report Problem** from the radial menu to submit an academic ticket with your current question ID.
• **Faculty Email:** Inquiries can also be emailed to **logicqarena@gmail.com**.`;
  }

  // 17. Strings in C (<string.h> & Manual Implementations)
  if (
    q.includes('string') ||
    q.includes('strlen') ||
    q.includes('strcpy') ||
    q.includes('strcmp') ||
    q.includes('null terminator')
  ) {
    return `🧵 **Strings in C11 (<string.h>):**

In C, a string is simply a **1D array of characters terminated by the null character (\`'\\0'\`)**.

**Key Rules:**
1. **Always allocate +1 byte for \`'\\0'\`:**
   \`char str[6] = "Logic"; // 'L','o','g','i','c','\\0' (Length is 5, size is 6)\`
2. **Buffer Overflow Risk:**
   Never use \`gets()\`. Always use \`fgets(str, sizeof(str), stdin)\` to avoid security exploits.
3. **Manual Length Calculation (Without \`string.h\`):**
   \`\`\`c
   int len = 0;
   while (str[len] != '\\0') {
       len++;
   }
   \`\`\`
4. **Comparing Strings:**
   You cannot use \`str1 == str2\` (this only compares pointer addresses). Use \`strcmp(str1, str2) == 0\`.`;
  }

  // 18. Structures vs Unions (Memory Layout & Padding)
  if (
    q.includes('struct') ||
    q.includes('union') ||
    q.includes('typedef struct') ||
    q.includes('structure padding')
  ) {
    return `📦 **Structures (\`struct\`) vs. Unions (\`union\`):**

1. **Memory Allocation:**
   • **\`struct\`:** Every member has its **own independent memory space**. Total size is at least the sum of members (+ padding bytes for alignment).
   • **\`union\`:** All members **share the same memory location**. Total size equals the size of its **largest member**.

2. **Syntax Example:**
   \`\`\`c
   struct Point {
       int x; // 4 bytes
       int y; // 4 bytes
   }; // Total size = 8 bytes

   union Value {
       int i;    // 4 bytes
       double d; // 8 bytes
   }; // Total size = 8 bytes (shares memory)
   \`\`\`

3. **Arrow (\`->\`) vs Dot (\`.\`) Operator:**
   • Use \`.\` on direct variables: \`p.x = 10;\`
   • Use \`->\` on pointers to structs: \`ptr->x = 10;\``;
  }

  // 19. Bitwise Operators & Tricks
  if (
    q.includes('bitwise') ||
    q.includes('bit manipulation') ||
    q.includes('left shift') ||
    q.includes('right shift') ||
    q.includes('power of 2')
  ) {
    return `⚡ **Bitwise Operators in C:**

• **\`&\` (AND):** 1 only if both bits are 1.
• **\`|\` (OR):** 1 if either bit is 1.
• **\`^\` (XOR):** 1 if bits are different.
• **\`~\` (NOT):** Flips all bits.
• **\`<<\` (Left Shift):** \`x << k\` multiplies \`x\` by $2^k$.
• **\`>>\` (Right Shift):** \`x >> k\` divides \`x\` by $2^k$.

**Essential LogicQ Bit Tricks:**
1. **Check if Even/Odd:** \`(n & 1) == 0\` is even; \`(n & 1) == 1\` is odd.
2. **Check if Power of 2:** \`n > 0 && (n & (n - 1)) == 0\`
3. **Set $k$-th Bit:** \`num |= (1 << k);\`
4. **Clear $k$-th Bit:** \`num &= ~(1 << k);\``;
  }

  // 20. Recursion & Stack Trace
  if (
    q.includes('recursion') ||
    q.includes('recursive') ||
    q.includes('base condition') ||
    q.includes('call stack') ||
    q.includes('factorial') ||
    q.includes('fibonacci')
  ) {
    return `🔄 **Recursion in C — The 3 Golden Rules:**

1. **Base Case (Termination):** The stopping condition that prevents infinite stack exhaustion.
2. **Recursive Step:** Breaking the problem into a strictly smaller sub-problem ($N-1$).
3. **Stack Unwinding:** Combining return values as call frames pop off the stack.

**Classic Example (Factorial):**
\`\`\`c
long long factorial(int n) {
    if (n <= 1) return 1; // 🛑 BASE CASE
    return n * factorial(n - 1); // 🔄 RECURSIVE STEP
}
\`\`\`
⚠️ **Watch Out:** If you omit the base case, you will trigger a **Stack Overflow (Segmentation Fault)**.`;
  }

  // 21. Why Test Cases Fail & How to Pass Hidden Tests
  if (
    q.includes('test case') ||
    q.includes('fail') ||
    q.includes('hidden test') ||
    q.includes('wrong answer') ||
    q.includes('sample test')
  ) {
    return `🔍 **Why Test Cases Fail (Top 5 Pitfalls in LogicQ):**

1. **Extra Prompts in \`printf\`:**
   • ❌ \`printf("Enter the number: %d", ans);\`
   • ✅ \`printf("%d\\n", ans);\` (Automated judges require exact output matching).
2. **Missing Boundary Edge Cases:**
   • What if $N = 0$, $N = 1$, or $N < 0$?
   • What if the array is already sorted, or all elements are identical?
3. **Integer Overflow:**
   • Standard 32-bit \`int\` maxes out at $2 \\times 10^9$. For large sums or factorials, use \`long long\` with \`%lld\`.
4. **Off-by-One Array Bounds:**
   • Arrays are 0-indexed: valid indices for \`arr[N]\` are \`0\` to \`N-1\`. Accessing \`arr[N]\` yields garbage or crash.
5. **Dangling Newlines in Input:**
   • When using \`scanf("%c", &ch)\` after reading numbers, put a leading space \`scanf(" %c", &ch)\` to consume leftover newline characters.`;
  }

  // 22. Time Limit Exceeded (TLE)
  if (
    q.includes('tle') ||
    q.includes('time limit') ||
    q.includes('infinite loop') ||
    q.includes('timeout')
  ) {
    return `⏱️ **How to Fix Time Limit Exceeded (TLE):**

TLE means your program exceeded the 1.0-second CPU limit enforced by the GCC judge.

**Check these 3 common causes:**
1. **Missing Loop Increment:**
   Did you forget \`i++\` inside a \`while\` loop?
2. **Unreachable Loop Termination Condition:**
   Example: \`for (unsigned int i = 10; i >= 0; i--)\` never terminates because an \`unsigned int\` is always $\\ge 0$!
3. **Algorithmic Complexity ($O(N^2)$ vs $O(N)$):**
   If $N = 10^5$, nested loops will execute $10^{10}$ operations (which takes ~10 seconds). Replace nested searches with two-pointer techniques or frequency arrays.`;
  }

  // 23. Storage Classes in C (static, extern, auto, register)
  if (
    q.includes('storage class') ||
    q.includes('static') ||
    q.includes('extern') ||
    q.includes('register')
  ) {
    return `🏷️ **Storage Classes in C11:**

• **\`auto\`:** Default for local variables. Stored on the **Stack**, destroyed when block exits.
• **\`static\`:** Preserves its value across multiple function calls. Stored in the **Data Segment**, initialized only once.
• **\`extern\`:** Informs the compiler that a global variable or function is defined in another translation unit.
• **\`register\`:** Requests the compiler to store the variable directly in a CPU register for ultra-fast access (you cannot use the \`&\` address-of operator on register variables).`;
  }

  // 24. Viva & Placement Interview Questions
  if (
    q.includes('viva') ||
    q.includes('interview') ||
    q.includes('placement') ||
    q.includes('important question')
  ) {
    return `🎯 **Top 6 C Programming Viva & Interview Questions:**

1. **What is a Dangling Pointer?**
   A pointer pointing to a deallocated memory address (e.g. after \`free(ptr)\` without setting \`ptr = NULL\`).
2. **What is Memory Leakage?**
   Allocating heap memory via \`malloc\` and losing all pointer references without calling \`free()\`.
3. **Difference between \`const int *p\` and \`int * const p\`?**
   • \`const int *p\`: Pointer to constant data (data cannot change, pointer can).
   • \`int * const p\`: Constant pointer (pointer cannot change, data can).
4. **Why is \`sizeof\` an operator and not a function?**
   Because it is evaluated at **compile-time**, not runtime.
5. **What is Structure Padding?**
   Processors fetch memory in 32-bit or 64-bit word chunks. Compilers insert invisible padding bytes between struct members to align them with memory boundaries.
6. **What is the difference between \`i++\` and \`++i\`?**
   Post-increment yields the original value then increments; pre-increment increments first then yields the new value.`;
  }

  // 25. Beginner Guidance & Roadmaps
  if (
    q.includes('beginner') ||
    q.includes('start') ||
    q.includes('kaha se padhu') ||
    q.includes('first time') ||
    q.includes('kuch nahi aata') ||
    q.includes('roadmap')
  ) {
    return `🌱 **Beginner's Roadmap to Mastering C on LogicQ:**

Do not worry at all, ${studentName}! Every great systems engineer started exactly where you are today.

**Step-by-Step Learning Strategy:**
1. **Week 1 (Module 1):** Focus on \`printf\` formatting, \`scanf\`, \`if-else\`, and \`for\` loops. Write 5 small programs daily.
2. **Week 2 (Module 2):** Master 1D arrays, dry-run array indexing on paper, then transition to pointer arithmetic.
3. **Week 3 (Module 3):** Break large programs into functions. Trace recursion using call-stack diagrams.
4. **Week 4 (Module 4):** Learn structs and dynamic memory allocation (\`malloc\`/\`free\`).
5. **Golden Habit:** Always read compiler warnings. GCC is your best teacher!`;
  }

  // 26. Verified PDF Report Card & Downloads
  if (
    q.includes('pdf') ||
    q.includes('report') ||
    q.includes('download') ||
    q.includes('certificate')
  ) {
    return `📄 **Verified PDF Academic Report Cards:**

You can download your official student transcript at any time:
• **Where to find it:** Go to your **Profile** page or **Analytics** page from the top navigation.
• **What it includes:**
  - Official **20-Mark CIE Coursework Marks**
  - Section-by-section breakdown (M1 to M4)
  - Integrity Audit status (0 Breach Score)
  - Faculty verification QR code and SHA-256 tamper-proof security hash.
• You can present this PDF directly to your course coordinator or lab examiner.`;
  }

  // 27. Password & Account Security
  if (
    q.includes('password') ||
    q.includes('change password') ||
    q.includes('bind email') ||
    q.includes('google email')
  ) {
    return `🔐 **Account Settings & Security:**

• **Change Password:** Click your profile name avatar at the top-right corner of the navbar, then select **Change Password**.
• **Bind Institutional Google Email:** Select **Bind Google Email** in the profile dropdown to link your university Google account for one-click secure login.`;
  }

  // Dynamic, context-aware fallback (Never repeats rigid template or mentions 100 marks)
  const displayQuery = query.length > 40 ? `${query.slice(0, 37)}...` : query;
  return `I'm here to help, ${studentName}! 💡

Regarding **"${displayQuery}"**:
I am focused on helping you master C programming (C11 standard) and navigate the LogicQ platform.

Here are some helpful things you can ask me:
• *"Explain Pointers vs Arrays in C"*
• *"How does the 20-Mark CIE Score work?"*
• *"What causes a Segmentation Fault?"*
• *"Tell me about this app and its features"*
• *"How does the assessment integrity score work?"*

What topic or doubt would you like to explore?`;
}

// Helper to render formatted chat messages without raw markdown asterisks or LaTeX slashes
function renderFormattedChatMessage(rawText: string, isUser: boolean): React.ReactNode {
  if (isUser) {
    return rawText;
  }

  // 1. Clean any raw LaTeX / math slashes if present
  const cleaned = rawText
    .replace(/\$\$\\text\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\lt\b/g, '<')
    .replace(/\\gt\b/g, '>')
    .replace(/\\times\b/g, '×')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '');

  // 2. Parse multi-line code blocks
  const parts = cleaned.split(/(```[\s\S]*?```)/g);

  return parts.map((part, pIdx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const firstLine = lines[0]?.trim().toLowerCase();
      const isLang = ['c', 'cpp', 'bash', 'sql', 'python', 'text'].includes(firstLine);
      const code = (isLang ? lines.slice(1) : lines).join('\n');

      return (
        <pre
          key={pIdx}
          className="my-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto select-text shadow-inner"
        >
          <code>{code}</code>
        </pre>
      );
    }

    // 3. Process line-by-line for bold (**bold**) and inline code (`code`)
    const lines = part.split('\n');
    return (
      <React.Fragment key={pIdx}>
        {lines.map((line, lIdx) => {
          const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

          const renderedTokens = tokens.map((token, tIdx) => {
            if (token.startsWith('**') && token.endsWith('**')) {
              return (
                <strong key={tIdx} className="font-bold text-[var(--foreground)]">
                  {token.slice(2, -2)}
                </strong>
              );
            }
            if (token.startsWith('`') && token.endsWith('`')) {
              return (
                <code
                  key={tIdx}
                  className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-indigo-300 font-mono text-[11px]"
                >
                  {token.slice(1, -1)}
                </code>
              );
            }
            return token;
          });

          return (
            <React.Fragment key={lIdx}>
              {renderedTokens}
              {lIdx < lines.length - 1 && '\n'}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  });
}

export const AiTutorChatModal: React.FC<AiTutorChatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${user?.fullName || user?.displayName || 'Student'}! 👋
I am your **LogicQ C Mentor**. I am here to explain C concepts, discuss memory models, decode compiler warnings, and answer platform questions.

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const studentName = user?.fullName || user?.displayName || 'Student';
  const isBusy = isLoading || Boolean(streamingMsgId);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMsgId]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isBusy) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let replyText = '';

    try {
      // Check if Gemini API key exists
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || localStorage.getItem('logicq_gemini_api_key');

      if (apiKey) {
        try {
          const systemInstruction = `You are the LogicQ Academic Socratic C Mentor for undergraduate and Integrated M.Tech engineering students.
Your mission is to help students truly understand low-level C programming (C11 standard, GCC 14) and platform policies.
CRITICAL ACADEMIC RULE: Never give complete, copy-pasteable C code solutions to exam or assignment problems.
Instead, teach them the underlying concept, provide minimal pseudo-code or short 2-3 line syntax examples, and guide them to find the bug or implement the logic themselves.
Be polite, precise, and encouraging. Support both English and Hinglish seamlessly.`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: [
                  ...messages.slice(-4).map((m) => ({
                    role: m.sender === 'ai' ? 'model' : 'user',
                    parts: [{ text: m.text }],
                  })),
                  { role: 'user', parts: [{ text: query }] },
                ],
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch {
          // Fallback to local Socratic engine
        }
      }

      if (!replyText) {
        // Natural thinking delay for local Socratic policy engine
        await new Promise((r) => setTimeout(r, 450));
        replyText = generateLocalSocraticResponse(query, studentName);
      }
    } catch {
      replyText = 'I encountered a brief connection hiccup. Please ask again or refer to the Student User Guide.';
    } finally {
      setIsLoading(false);
    }

    // Modern ChatGPT-style streaming typewriter animation
    const aiMsgId = `ai-${Date.now()}`;
    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        sender: 'ai',
        text: '',
        timestamp: aiTimestamp,
      },
    ]);
    setStreamingMsgId(aiMsgId);

    const totalLen = replyText.length;
    const chunkSize = totalLen > 800 ? 9 : totalLen > 400 ? 5 : totalLen > 180 ? 3 : 2;
    let curr = 0;

    await new Promise<void>((resolve) => {
      const typeStep = () => {
        if (curr < totalLen) {
          curr = Math.min(totalLen, curr + chunkSize);
          const chunkStr = replyText.slice(0, curr);

          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: chunkStr } : m))
          );

          // Natural cadence: slight micro-pause on punctuation
          const lastCh = replyText[curr - 1];
          const punctuationDelay = (lastCh === '.' || lastCh === '?' || lastCh === '!' || lastCh === '\n') ? 30 : 0;

          typingTimerRef.current = setTimeout(typeStep, 16 + punctuationDelay);
        } else {
          setStreamingMsgId(null);
          typingTimerRef.current = null;
          resolve();
        }
      };

      typingTimerRef.current = setTimeout(typeStep, 20);
    });
  };

  const handleReset = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setStreamingMsgId(null);
    setIsLoading(false);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: `Conversation reset. What C programming topic or platform question would you like to explore?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-[10000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-xl w-full h-[85vh] max-h-[640px] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-indigo-400/30 p-1 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LogicQLogoIcon size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">LogicQ Socratic AI Mentor</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/20">
                  C11 Tutor
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Conceptual guidance &amp; policy assistance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              title="Reset conversation"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-indigo-500/30 p-0.5 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <LogicQLogoIcon size={18} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-[var(--muted)]/50 border border-[var(--border)] text-[var(--foreground)] rounded-tl-none'
                }`}
              >
                {renderFormattedChatMessage(m.text, m.sender === 'user')}
                {streamingMsgId === m.id && (
                  <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 translate-y-0.5 animate-pulse rounded-xs" />
                )}
                <div
                  className={`text-[9.5px] mt-1.5 font-mono ${
                    m.sender === 'user' ? 'text-indigo-200 text-right' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-indigo-500/30 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <LogicQLogoIcon size={18} className="animate-pulse" />
              </div>
              <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">Thinking conceptually...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[var(--border)]/60 bg-[var(--background)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isBusy}
              onClick={() => handleSend(prompt)}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)]/70 hover:bg-indigo-500/15 hover:text-indigo-500 hover:border-indigo-500/30 border border-[var(--border)] text-[var(--muted-foreground)] transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-[var(--border)] bg-[var(--card)] flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              streamingMsgId
                ? 'LogicQ AI Mentor is typing...'
                : isLoading
                ? 'Thinking conceptually...'
                : 'Ask a C theory concept, memory doubt, or policy question...'
            }
            disabled={isBusy}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 font-sans disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition disabled:opacity-40 cursor-pointer shrink-0 shadow-sm active:scale-95"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
