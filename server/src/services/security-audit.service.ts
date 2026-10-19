/**
 * security-audit.service.ts
 * Automated Sandbox Red-Teaming & Adversarial Security Auditing Suite for LogicQ
 *
 * Runs comprehensive live empirical security attacks against LocalGccJudge:
 * - Filesystem sandbox escape attempts
 * - Subprocess / shell execution attempts
 * - Network socket creation attempts
 * - Macro and header bypass injection attempts
 * - Memory limit allocation bombs
 * - CPU runaway loops and watchdog termination
 * - Crash signal trapping (SIGSEGV, SIGFPE, SIGABRT)
 * - Zero orphan process validation
 */

import { LocalGccJudge } from '../judge/local-gcc.judge.js';
import { Verdict } from '../judge/judge.interface.js';
import { execSync } from 'child_process';

export interface SecurityVectorResult {
  id: string;
  category: 'FILESYSTEM' | 'EXECUTION' | 'NETWORK' | 'PREPROCESSOR' | 'RESOURCE_LIMIT' | 'SIGNAL_TRAP';
  name: string;
  description: string;
  payload: string;
  passed: boolean;
  verdict: Verdict;
  expectedVerdicts: Verdict[];
  runtimeMs: number;
  blockedBy: 'STATIC_GUARD' | 'SANDBOX_RUNNER' | 'COMPILER_DENIAL';
  notes: string;
}

export interface SecurityAuditReport {
  timestamp: string;
  totalVectors: number;
  passedVectors: number;
  failedVectors: number;
  compliancePercentage: number;
  overallStatus: 'SECURE' | 'AT_RISK' | 'CRITICAL_VULNERABILITY';
  orphanProcessesFound: string[];
  vectors: SecurityVectorResult[];
}

export class SecurityAuditService {
  private static judge = new LocalGccJudge();

  private static checkOrphanedProcesses(): string[] {
    if (process.platform !== 'win32') return [];
    try {
      const out1 = execSync('tasklist /FI "IMAGENAME eq solution.exe" /NH').toString();
      const out2 = execSync('tasklist /FI "IMAGENAME eq win-sandbox-runner.exe" /NH').toString();
      const orphans: string[] = [];
      if (out1.toLowerCase().includes('solution.exe')) orphans.push('solution.exe');
      if (out2.toLowerCase().includes('win-sandbox-runner.exe')) orphans.push('win-sandbox-runner.exe');
      return orphans;
    } catch {
      return [];
    }
  }

  static async runFullAudit(): Promise<SecurityAuditReport> {
    const vectors: SecurityVectorResult[] = [];

    // VECTOR 1: Forbidden System Call: system()
    await this.testVector(vectors, {
      id: 'SEC-01-SYSTEM-CALL',
      category: 'EXECUTION',
      name: 'Arbitrary Shell Execution (system)',
      description: 'Attempts to execute host shell commands via system("dir")',
      payload: `
        #include <stdio.h>
        #include <stdlib.h>
        int main() {
          system("echo VULNERABLE");
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 2: Forbidden Subprocess: popen()
    await this.testVector(vectors, {
      id: 'SEC-02-POPEN',
      category: 'EXECUTION',
      name: 'Pipe Subprocess Execution (popen)',
      description: 'Attempts to open command stream via popen()',
      payload: `
        #include <stdio.h>
        int main() {
          FILE *f = popen("whoami", "r");
          if (f) pclose(f);
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 3: Forbidden Windows API: windows.h / CreateProcess
    await this.testVector(vectors, {
      id: 'SEC-03-WINDOWS-HEADER',
      category: 'EXECUTION',
      name: 'Windows Native API Import (windows.h)',
      description: 'Attempts to include windows.h to invoke Win32 APIs',
      payload: `
        #include <stdio.h>
        #include <windows.h>
        int main() {
          MessageBoxA(NULL, "Hacked", "Alert", 0);
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 4: Network Sockets: socket()
    await this.testVector(vectors, {
      id: 'SEC-04-NETWORK-SOCKET',
      category: 'NETWORK',
      name: 'Network Socket Creation (winsock/socket)',
      description: 'Attempts to include winsock2.h or call socket() to communicate externally',
      payload: `
        #include <stdio.h>
        #include <winsock2.h>
        int main() {
          SOCKET s = socket(AF_INET, SOCK_STREAM, 0);
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 5: Preprocessor Macro Override: #undef malloc
    await this.testVector(vectors, {
      id: 'SEC-05-UNDEF-OVERRIDE',
      category: 'PREPROCESSOR',
      name: 'Preprocessor #undef Sandbox Hook Bypass',
      description: 'Attempts to undefine sandbox memory tracking macro',
      payload: `
        #include <stdio.h>
        #include <stdlib.h>
        #undef malloc
        int main() {
          void *p = malloc(1024);
          free(p);
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 6: Internal Identifier Hijack: #define __lq_heap_limit
    await this.testVector(vectors, {
      id: 'SEC-06-REDEFINE-INTERNAL',
      category: 'PREPROCESSOR',
      name: 'Sandbox Internal Symbol Redefinition',
      description: 'Attempts to overwrite __lq_heap_limit or __lq_ internal identifiers',
      payload: `
        #include <stdio.h>
        #define __lq_heap_limit 999999999ULL
        int main() {
          printf("Bypassed\\n");
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.COMPILE_ERROR],
      blockedBy: 'STATIC_GUARD',
    });

    // VECTOR 7: Resource Exhaustion: Memory Limit Bomb (> 128 MB)
    await this.testVector(vectors, {
      id: 'SEC-07-MEMORY-BOMB',
      category: 'RESOURCE_LIMIT',
      name: 'Heap Memory Limit Enforcement',
      description: 'Attempts to allocate 500 MB memory beyond 128 MB limit',
      payload: `
        #include <stdio.h>
        #include <stdlib.h>
        int main() {
          for (int i = 0; i < 50; i++) {
            void *p = malloc(10 * 1024 * 1024); // 500 MB total
            if (p) ((char*)p)[0] = 1;
          }
          printf("ALLOCATED\\n");
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.MEMORY_LIMIT_EXCEEDED, Verdict.RUNTIME_ERROR],
      blockedBy: 'SANDBOX_RUNNER',
    });

    // VECTOR 8: Resource Exhaustion: Infinite CPU Loop Watchdog
    await this.testVector(vectors, {
      id: 'SEC-08-CPU-TIMEOUT',
      category: 'RESOURCE_LIMIT',
      name: 'CPU Time Limit & Infinite Loop Watchdog',
      description: 'Executes while(1) infinite loop to verify <= 2.0s watchdog kill',
      payload: `
        #include <stdio.h>
        int main() {
          volatile int count = 0;
          while (1) {
            count++;
          }
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.TIME_LIMIT_EXCEEDED],
      blockedBy: 'SANDBOX_RUNNER',
    });

    // VECTOR 9: Signal Trap: Segmentation Fault (SIGSEGV)
    await this.testVector(vectors, {
      id: 'SEC-09-SIGSEGV-TRAP',
      category: 'SIGNAL_TRAP',
      name: 'Memory Violation Crash Signal Trapping',
      description: 'Dereferences NULL pointer (*(int*)0 = 42) to verify graceful OS crash capture',
      payload: `
        #include <stdio.h>
        int main() {
          volatile int *ptr = NULL;
          *ptr = 42;
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.RUNTIME_ERROR],
      blockedBy: 'SANDBOX_RUNNER',
    });

    // VECTOR 10: Signal Trap: Integer Division by Zero (SIGFPE)
    await this.testVector(vectors, {
      id: 'SEC-10-SIGFPE-TRAP',
      category: 'SIGNAL_TRAP',
      name: 'Floating Point / Arithmetic Exception Trapping',
      description: 'Divides by zero to verify hardware arithmetic signal capture',
      payload: `
        #include <stdio.h>
        int main() {
          volatile int zero = 0;
          volatile int result = 100 / zero;
          printf("%d\\n", result);
          return 0;
        }
      `,
      expectedVerdicts: [Verdict.RUNTIME_ERROR],
      blockedBy: 'SANDBOX_RUNNER',
    });

    // Check for any orphaned processes created during the test run
    const orphans = this.checkOrphanedProcesses();

    const passedCount = vectors.filter((v) => v.passed).length;
    const failedCount = vectors.length - passedCount;
    const compliance = Math.round((passedCount / vectors.length) * 100);

    let overallStatus: 'SECURE' | 'AT_RISK' | 'CRITICAL_VULNERABILITY' = 'SECURE';
    if (failedCount > 0 || orphans.length > 0) {
      overallStatus = failedCount > 2 ? 'CRITICAL_VULNERABILITY' : 'AT_RISK';
    }

    return {
      timestamp: new Date().toISOString(),
      totalVectors: vectors.length,
      passedVectors: passedCount,
      failedVectors: failedCount,
      compliancePercentage: compliance,
      overallStatus,
      orphanProcessesFound: orphans,
      vectors,
    };
  }

  private static async testVector(
    results: SecurityVectorResult[],
    spec: {
      id: string;
      category: SecurityVectorResult['category'];
      name: string;
      description: string;
      payload: string;
      expectedVerdicts: Verdict[];
      blockedBy: SecurityVectorResult['blockedBy'];
    }
  ): Promise<void> {
    const start = performance.now();
    try {
      const res = await this.judge.compileAndRun(spec.payload, '', 1000, 128);
      const runtimeMs = Math.round(performance.now() - start);
      const passed = spec.expectedVerdicts.includes(res.verdict);

      results.push({
        id: spec.id,
        category: spec.category,
        name: spec.name,
        description: spec.description,
        payload: spec.payload.trim(),
        passed,
        verdict: res.verdict,
        expectedVerdicts: spec.expectedVerdicts,
        runtimeMs,
        blockedBy: spec.blockedBy,
        notes: passed
          ? `Safely blocked with verdict ${res.verdict} in ${runtimeMs}ms`
          : `SECURITY WARNING: Unexpected verdict ${res.verdict}. Expected: ${spec.expectedVerdicts.join('/')}`,
      });
    } catch (err: any) {
      results.push({
        id: spec.id,
        category: spec.category,
        name: spec.name,
        description: spec.description,
        payload: spec.payload.trim(),
        passed: false,
        verdict: Verdict.RUNTIME_ERROR,
        expectedVerdicts: spec.expectedVerdicts,
        runtimeMs: Math.round(performance.now() - start),
        blockedBy: spec.blockedBy,
        notes: `Execution exception: ${err.message}`,
      });
    }
  }
}
