# LogicQ C11 Judge Pipeline Audit & Hardening (`/docs/JUDGE_AUDIT.md`)

**Date:** 2026-10-12  
**Status:** Audited, Hardened, and Verified (100% Real C11 Compilation & Execution; Fail-Closed)

---

## 1. End-to-End Pipeline Trace

| Stage | Component | File / Function | Behavior |
| :--- | :--- | :--- | :--- |
| **1. UI Trigger** | `ChallengePage.tsx` | `runMutation` / `submitMutation` | User clicks **Run Code** (`POST /api/submissions/run`) or **Submit Solution** (`POST /api/submissions/submit`). |
| **2. Client Transport** | `client/src/api/client.ts` | `api.post()` | Sends authenticated request with `{ problemId, code, stdin }`. If the backend is unreachable, `fallbackEngine.ts` **fails closed** with `Service temporarily unavailable: C11 Judge backend is unreachable` — it **never** simulates compilation or verdicts in the browser. |
| **3. API Controller** | `server/src/controllers/submission.controller.ts` | `runCode()` / `submitCode()` | Validates code size (`<= 64 KB`), per-user rate limit (`10` submissions / 10 min), and problem existence. Strips hidden test cases from `runCode` and evaluates **all** sample + hidden test cases in `submitCode`. |
| **4. Judge Factory** | `server/src/judge/judge.factory.ts` | `getJudge()` | Checks `LocalGccJudge.isAvailable()` (`gcc --version`) or `Judge0Judge.isAvailable()`. If neither real compiler backend is reachable, returns `null` and the controller responds with `HTTP 503 JUDGE_UNAVAILABLE`. `MockJudge` has been **disabled** (`throw new Error(...)`). |
| **5. C11 Sandbox** | `server/src/judge/local-gcc.judge.ts` | `LocalGccJudge.runCode()` / `evaluate()` | Performs static header/syscall inspection, injects `-include sandbox_prelude.h`, compiles with real `gcc -std=c11 -O2 -Wall -Wextra -Werror=implicit-function-declaration ... -lm`, and executes the binary in an isolated temporary directory with a stripped environment (`PATH=/usr/bin:/bin`, no secrets) and per-case wall-clock timeout + 64 KB stdout/stderr truncation. |

---

## 2. Plain Answers to Audit Questions

1. **Does the code actually get compiled with a real C compiler and executed on the input?**
   - **Yes.** Every **Run Code** and **Submit Solution** request invokes `gcc` (`-std=c11 -O2 -Wall -Wextra`) to produce a native executable inside an isolated temporary directory (`os.tmpdir()/logicq_judge_<uuid>`) and spawns the compiled binary with `stdin` piped from the test case or custom input.
2. **Where does that run?**
   - **Local / Self-Hosted Server:** `LocalGccJudge` runs `gcc` (`MinGW-w64 GCC 15.2.0` on Windows dev / `gcc` on Linux container in Cloud Run) directly in an isolated child process with a stripped environment and sandbox prelude.
   - **Optional External Judge0 Cluster:** `Judge0Judge` connects to `JUDGE0_API_URL` (`language_id = 50`, GCC C11) when configured.
3. **Who pays, what are the quotas, and what happens when it is down?**
   - **Self-Hosted Cloud Run / Server (`LocalGccJudge`):** Billed only for container CPU/memory during active request execution; protected by a 10-submissions-per-10-minutes per-user rate limiter (`rateLimiter.middleware.ts`) and 30-runs-per-10-minutes limit.
   - **When Down:** The pipeline **fails closed** (`HTTP 503` with `Judge is temporarily unavailable. Your streak is safe; please try again shortly.`), logs a critical alert, and **never** awards fake `ACCEPTED` verdicts or points.

---

## 3. Fakes Found & Removed During Audit

| Location | Fake / Vulnerability Found | Fix Applied |
| :--- | :--- | :--- |
| `client/src/api/fallbackEngine.ts` | Contained `simulateCRun()` which regex-parsed `printf` statements and returned fake `ACCEPTED` verdicts if the backend was offline. | **Removed `simulateCRun` completely.** `/submissions/run` and `/submissions/submit` now throw `503 Service temporarily unavailable` if the backend cannot be reached. |
| `server/src/judge/judge.factory.ts` | Fell back to `MockJudge` when `gcc` and `Judge0` were unavailable. | **Removed `MockJudge` fallback.** `getJudge()` returns `null` and `submission.controller.ts` returns `HTTP 503 JUDGE_UNAVAILABLE`. |
| `server/src/judge/mock.judge.ts` | Simulated C execution using regex matching. | Disabled `MockJudge.runCode()` and `MockJudge.evaluate()` so they throw an error if ever called. |
| `server/src/judge/local-gcc.judge.ts` | Lacked static `#include` path traversal blocking, heap allocation enforcement on Windows/non-ulimit hosts, and `fopen`/`getenv` sandboxing. | Added static security check + `sandbox_prelude.h` injected via `-include` to enforce heap memory caps (`exit(99)` $\rightarrow$ `MEMORY_LIMIT_EXCEEDED`), block `fopen`/`freopen`/`remove`/`rename`/`system`/`popen`, and force `getenv()` to return `NULL`. |

---

## 4. Test Case Coverage Audit

All **17** seeded problems in `server/prisma/seed.ts` were audited and verified:
- Every problem has **$\ge 2$ sample test cases** (`isHidden: false`) and **$\ge 5$ hidden test cases** (`isHidden: true`) covering boundary values, negative inputs, zeros, and multi-element cases.
- Hidden test case `input` and `expectedOutput` are **never** serialized to student endpoints (`GET /api/problems/daily`, `GET /api/problems/:slug`, `POST /api/submissions/run`, `POST /api/submissions/submit`).
- Hidden test failure payloads return only `{ testCaseIndex, isHidden: true, passed: false, status: "Wrong Answer", runtimeMs }` with `input`, `expectedOutput`, and `actualOutput` omitted.

---

## 5. Sandbox & Security Verification Matrix

All 6 mandatory judge verification scenarios and 4 sandbox security scenarios are automated in `server/tests/amendments-audit.test.ts`:
1. **Valid C11 solution** (`Pointer Swap In-Place`) $\rightarrow$ `ACCEPTED`, all sample + hidden cases pass, points & streak awarded once.
2. **Syntax error** (missing `;`) $\rightarrow$ `COMPILE_ERROR`, real `gcc` line/column error returned, `0` points.
3. **Wrong logic** (`a - b` instead of swap) $\rightarrow$ `WRONG_ANSWER`, failed case index returned, hidden expected output never leaked, `0` points.
4. **Hardcoded sample output** (`printf("20 10\n30\n");`) $\rightarrow$ fails sample case 2 and all 5 hidden cases $\rightarrow$ `WRONG_ANSWER`, `0` points.
5. **Infinite loop** (`while(1){}`) $\rightarrow$ killed at timeout $\rightarrow$ `TIME_LIMIT_EXCEEDED`, server remains responsive.
6. **Crash / UB & Memory Bomb** (`*(volatile int*)0 = 42` $\rightarrow$ `RUNTIME_ERROR`; `malloc(128 MB)` $\rightarrow$ `MEMORY_LIMIT_EXCEEDED`).
7. **Host Isolation** (`#include "/etc/passwd"`, `fork()`, `<sys/socket.h>`, `fopen()`, `getenv()`) $\rightarrow$ blocked by static check and `sandbox_prelude.h`.
