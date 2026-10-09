# LogicQ C Judge Safety, Consistency & Threat Model Specification

## 1. Threat Model & Sandboxing Vectors

Untrusted C code compilation and execution poses severe attack vectors against system integrity, confidentiality, and availability. LogicQ enforces defense-in-depth isolation against seven primary threat classes:

```
+-----------------------------------------------------------------------------------+
|                                 LOGICQ SANDBOX                                    |
|                                                                                   |
|  [Untrusted C Code] ---> [Compile Phase: gcc -O2 -std=c17 -Werror=vla -lm]        |
|                                     |                                             |
|                                     v (ELF Binary)                                |
|  +-----------------------------------------------------------------------------+  |
|  | Isolated Container / Seccomp / PR_LIMIT                                     |  |
|  | - Network: DISABLED (docker --network none)                                |  |
|  | - Filesystem: READ-ONLY root, ephemeral tmpfs memory-backed                  |  |
|  | - Process: pids_limit=32 (Fork bomb mitigation)                             |  |
|  | - Memory: Hard limit 64 MB (RSS + Swap = 64 MB)                              |  |
|  | - Wall Clock / CPU Time: Hard limit 2000 ms (SIGKILL enforcement)             |  |
|  | - Output Buffer: Truncated at 64 KB (Prevents disk fill / memory DOS)        |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Threat Vector Mitigations

| Threat Vector | Attack Mechanism | LogicQ Defense & Mitigation | Verdict Emitted |
| :--- | :--- | :--- | :--- |
| **1. Infinite Loops** | `while(1);` or endless recursion burning 100% CPU. | Strict CPU time limit (`setrlimit(RLIMIT_CPU, 2s)`) and supervisor wall-clock timeout (2500ms). Escalates from `SIGXCPU` to `SIGKILL`. | `TIME_LIMIT_EXCEEDED` (TLE) |
| **2. Fork Bombs** | Recursively calling `fork()` to exhaust process table. | Linux cgroups PID limit (`pids.max = 32`) or `RLIMIT_NPROC=16`. Additional fork calls fail with `EAGAIN`. | `RUNTIME_ERROR` (RTE) / `KILLED` |
| **3. Memory Bombs** | Allocating huge buffers (`malloc(1GB)`) or stack overflow (`char buf[100000000]`). | cgroup `memory.max = 64MB` + `memory.swap.max = 0`. Stack limit set to 8MB (`RLIMIT_STACK`). | `MEMORY_LIMIT_EXCEEDED` (MLE) |
| **4. File Access & Exfiltration** | Reading `/etc/passwd`, `/etc/shadow`, environment variables, or other student code. | Unshare mount namespace; root filesystem mounted strictly **read-only** (`ro`); `/tmp` mounted as volatile noexec,nosuid `tmpfs`. Unprivileged execution (`uid=1001, gid=1001`). | `RUNTIME_ERROR` / Permission Denied |
| **5. Network Access & Exfiltration** | Sockets calling external IPs (`socket()`, `connect()`) to exfiltrate private tests or participate in botnets. | Container started with `--network none`. Network namespace unshared. Seccomp filter blocks `AF_INET`, `AF_INET6`. | `RUNTIME_ERROR` / Socket Error |
| **6. Output Floods** | `while(1) printf("AAAAA");` attempting to fill host disk or exhaust Node.js stdout stream memory. | Kernel pipe output cap (`RLIMIT_FSIZE = 64KB`). Child stdout pipe collector abruptly halts and truncates after 64 KB. | `OUTPUT_LIMIT_EXCEEDED` / `WRONG_ANSWER` |
| **7. Compile Bombs** | Macro bombs (`#include __FILE__`), recursive templates, or huge literals aimed at locking GCC during compilation. | Compiler execution guarded by strict 5.0-second wall-clock ceiling and 256MB RAM cap. | `COMPILE_ERROR` (Compilation Timeout) |

---

## 2. Reference Execution Environment: Linux Standard

### 2.1 The Reference Target
The definitive reference execution environment for LogicQ is:
- **OS**: Linux x86_64 (Debian 12 / Ubuntu 22.04 LTS container)
- **Compiler**: `gcc` (GCC 12.2+ or 13.x)
- **C Standard**: **ISO C17 (`-std=c17`)**
- **Standard Library**: GNU C Library (`glibc` 2.36+)

### 2.2 Cross-Platform Differences & Windows Normalization
When developing on Windows, the host uses `MinGW-w64` or `MSVC`, which introduces significant semantic deviations from production Linux:

| Characteristic | Windows (MinGW / MSVC) | Linux (Production Target) | LogicQ Normalization Strategy |
| :--- | :--- | :--- | :--- |
| **Line Endings** | `\r\n` (CRLF) | `\n` (LF) | Judge strip-normalizes all inputs, outputs, and expected solutions to universal `\n` before diffing. Trailing spaces and blank lines are stripped. |
| **Data Model** | `LLP64` (`long` is 32 bits, `long long` is 64 bits) | `LP64` (`long` is 64 bits, `pointer` is 64 bits) | Explicitly teach and enforce standard fixed-width integer types (`<stdint.h>`: `int32_t`, `int64_t`) in problem templates and constraints. |
| **Crash Signals** | Windows Structured Exceptions (`0xC0000005` Access Violation) | Unix Signals (`SIGSEGV`, `SIGFPE`, `SIGBUS`, `SIGABRT`) | The Judge maps OS-specific exit codes to uniform verdict abstractions (`SIGSEGV` -> "Segmentation fault (core dumped)"). |
| **Variable Length Arrays (VLAs)** | Stack layout undefined on large dynamic allocations | Handled dynamically, stack overflow risk | Enforce `-Werror=vla` compile flag to prohibit unsafe variable-length arrays and encourage deterministic memory management. |

### 2.3 Local Development Consistency (Docker & WSL2)
To ensure 100% parity between local developer environments and production:
1. **WSL2 / Docker Desktop Setup**:
   LogicQ provides a pre-built Docker sandbox runner image (`logicq-sandbox`):
   ```bash
   docker build -t logicq-sandbox -f server/docker/judge.Dockerfile server/docker
   ```
2. When running locally with Docker enabled, submissions execute inside the identical Debian Linux container as production.
3. If Docker is unavailable locally, `LocalGccJudge` runs with strict output normalization, but the UI explicitly warns: *"Running under Local GCC Host (Development Mode)"*.

---

## 3. Compiler Flags & Standards Display

Students are shown the exact compilation recipe on every problem workspace:

### Exact Compilation Command
```bash
gcc -O2 -std=c17 -Wall -Wextra -Werror=vla -fdiagnostics-color=never -pipe -lm solution.c -o solution
```

### Compiler Flag Rationale
- `-O2`: Standard compiler optimization level (matches competitive programming standards like Codeforces, ICPC).
- `-std=c17`: ISO/IEC 9899:2018 (modern standard without deprecations).
- `-Wall -Wextra`: Flags common logical bugs (uninitialized variables, unused values, type signedness mismatches).
- `-Werror=vla`: Disallows Variable Length Arrays (`int arr[n];`) which risk uncontrolled stack overflow crashes.
- `-fdiagnostics-color=never`: Generates clean, parseable ASCII compiler error messages for the web IDE.
- `-pipe`: Uses internal memory pipes instead of intermediate temp files during compilation passes for speed.
- `-lm`: Links standard math library (`<math.h>` functions like `sqrt`, `pow`, `ceil`).

---

## 4. Production Judge Architecture: Fail-Closed Policy

LogicQ adheres to an uncompromising **Fail-Closed Security Invariant**:

```typescript
// Judge Factory Selection Logic
export function getProductionJudge(): IJudge {
  const judgeType = process.env.JUDGE_TYPE || 'FAIL_CLOSED';

  if (process.env.NODE_ENV === 'production') {
    if (judgeType === 'LOCAL_GCC') {
      throw new Error(
        'SECURITY INVARIANT VIOLATION: LocalGccJudge cannot be enabled in NODE_ENV=production. ' +
        'Configure DOCKER or JUDGE0.'
      );
    }
  }

  switch (judgeType) {
    case 'DOCKER':
      return new DockerJudge();
    case 'JUDGE0':
      return new Judge0Judge();
    case 'LOCAL_GCC':
      if (process.env.NODE_ENV !== 'production') {
        return new LocalGccJudge();
      }
      break;
    default:
      return new FailClosedJudge();
  }
  return new FailClosedJudge();
}
```

- If `JUDGE_TYPE` is improperly configured, missing, or references an unverified runtime, the platform enters **Fail-Closed Mode**:
  - All test runs reject with: `JUDGE_UNAVAILABLE: Sandboxed execution is currently offline for system security. Please contact the administrator.`
  - Under no circumstances does the API process execute user C code directly in production.

---

## 5. Automated Malicious Program Test Suite

LogicQ includes a dedicated test suite (`server/tests/judge-malicious.test.ts`) that executes adversarial C programs against the sandboxing pipeline to verify that every malicious vector is intercepted and safely classified:

### 1. Infinite Loop (`malicious_infinite_loop.c`)
```c
#include <stdio.h>
int main() {
    volatile int x = 0;
    while(1) { x++; }
    return 0;
}
```
- **Expected Outcome**: Intercepted in ≤ 2500ms; Verdict = `TIME_LIMIT_EXCEEDED` (TLE).

### 2. Fork Bomb (`malicious_fork_bomb.c`)
```c
#include <unistd.h>
int main() {
    while(1) { fork(); }
    return 0;
}
```
- **Expected Outcome**: Process table exhaustion blocked by cgroup PID limits; child process aborted; Verdict = `RUNTIME_ERROR` / `KILLED`. Host OS unaffected.

### 3. Memory Hog (`malicious_memory_hog.c`)
```c
#include <stdlib.h>
#include <string.h>
int main() {
    for (int i = 0; i < 50; i++) {
        char *ptr = (char *)malloc(10 * 1024 * 1024); // 10MB each
        if (ptr) memset(ptr, 1, 10 * 1024 * 1024);
    }
    return 0;
}
```
- **Expected Outcome**: Killed upon exceeding 64MB memory quota; Verdict = `MEMORY_LIMIT_EXCEEDED` (MLE).

### 4. File Read Exfiltration (`malicious_file_read.c`)
```c
#include <stdio.h>
int main() {
    FILE *f = fopen("/etc/passwd", "r");
    if (!f) f = fopen("dev.db", "r");
    if (f) {
        printf("EXFILTRATED_SUCCESS\n");
        fclose(f);
    } else {
        printf("ACCESS_DENIED\n");
    }
    return 0;
}
```
- **Expected Outcome**: `fopen` returns `NULL`; output reads `ACCESS_DENIED`; Verdict = `WRONG_ANSWER`. Private files unreachable.

### 5. Output Flood (`malicious_output_flood.c`)
```c
#include <stdio.h>
int main() {
    while(1) {
        printf("0123456789ABCDEF");
    }
    return 0;
}
```
- **Expected Outcome**: Stream cut off at 64 KB; execution terminated; Verdict = `OUTPUT_LIMIT_EXCEEDED` or `WRONG_ANSWER`. Disk and Node memory unaffected.
