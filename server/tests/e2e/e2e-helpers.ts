import bcrypt from 'bcryptjs';
import { prisma } from '../../src/utils/prisma.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { LocalGccJudge } from '../../src/judge/local-gcc.judge.js';
import { Verdict } from '../../src/judge/judge.interface.js';

// C Code Snippets for Testing
export const C_SNIPPETS = {
  HELLO_WORLD: `
#include <stdio.h>
int main() {
    printf("Hello LogicQ!\\n");
    return 0;
}
`,
  ADD_TWO: `
#include <stdio.h>
int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) == 2) {
        printf("%lld\\n", a + b);
    }
    return 0;
}
`,
  ARITHMETIC_64BIT: `
#include <stdio.h>
int main() {
    long long max_val = 9223372036854775807LL;
    printf("%lld\\n", max_val);
    return 0;
}
`,
  LOOPS_ARRAYS: `
#include <stdio.h>
int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }
    printf("%d\\n", sum);
    return 0;
}
`,
  DYNAMIC_MEMORY: `
#include <stdio.h>
#include <stdlib.h>
int main() {
    int *arr = (int*)malloc(10 * sizeof(int));
    if (!arr) return 1;
    for (int i = 0; i < 10; i++) arr[i] = i * i;
    printf("%d\\n", arr[9]);
    free(arr);
    return 0;
}
`,
  STRUCT_POINTERS: `
#include <stdio.h>
#include <stdlib.h>
struct Node {
    int value;
    struct Node* next;
};
int main() {
    struct Node b = {20, NULL};
    struct Node a = {10, &b};
    printf("%d -> %d\\n", a.value, a.next->value);
    return 0;
}
`,
  DEEP_RECURSION: `
#include <stdio.h>
long long fib(int n) {
    if (n <= 1) return n;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b;
        b = c;
    }
    return b;
}
int main() {
    printf("%lld\\n", fib(40));
    return 0;
}
`,
  STACK_BOMB: `
#include <stdio.h>
void recurse(int d) {
    char buf[1024 * 64];
    buf[0] = (char)d;
    recurse(d + 1);
}
int main() {
    recurse(0);
    return 0;
}
`,
  INFINITE_LOOP: `
#include <stdio.h>
int main() {
    volatile int x = 0;
    while (1) {
        x++;
    }
    return 0;
}
`,
  SLEEP_LOOP: `
#include <stdio.h>
#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif
int main() {
#ifdef _WIN32
    Sleep(5000);
#else
    sleep(5);
#endif
    return 0;
}
`,
  MEMORY_HOG: `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main() {
    // Attempt to allocate > 128 MB (e.g. 150 MB)
    size_t sz = 150ULL * 1024 * 1024;
    char *p = (char*)malloc(sz);
    if (p) {
        memset(p, 1, sz);
        printf("ALLOCATED\\n");
    } else {
        printf("FAILED\\n");
    }
    return 0;
}
`,
  SEGFAULT_NULL_DEREF: `
#include <stdio.h>
int main() {
    int *p = NULL;
    *p = 42;
    printf("%d\\n", *p);
    return 0;
}
`,
  DIV_ZERO: `
#include <stdio.h>
int main() {
    volatile int a = 100;
    volatile int b = 0;
    volatile int c = a / b;
    printf("%d\\n", c);
    return 0;
}
`,
  ABORT_CALL: `
#include <stdlib.h>
int main() {
    abort();
    return 0;
}
`,
  SYNTAX_MISSING_SEMICOLON: `
#include <stdio.h>
int main() {
    int a = 10
    printf("%d\\n", a);
    return 0;
}
`,
  UNDECLARED_VARIABLE: `
#include <stdio.h>
int main() {
    int y = x + 5;
    printf("%d\\n", y);
    return 0;
}
`,
  FORMAT_MISMATCH: `
#include <stdio.h>
int main() {
    char *s = "Hello";
    printf("%d\\n", s);
    return 0;
}
`,
  SCANF_MISSING_AMP: `
#include <stdio.h>
int main() {
    int num;
    scanf("%d", num);
    return 0;
}
`,
  INCOMPATIBLE_POINTER: `
#include <stdio.h>
int main() {
    int a = 10;
    char *p = &a;
    printf("%p\\n", p);
    return 0;
}
`,
  SECURITY_UNDEF_MALLOC: `
#undef malloc
#include <stdio.h>
int main() {
    printf("BYPASS\\n");
    return 0;
}
`,
  SECURITY_WINDOWS_H: `
#include <windows.h>
#include <stdio.h>
int main() {
    printf("SECURITY_VIOLATION\\n");
    return 0;
}
`,
  SECURITY_SOCKET_H: `
#include <sys/socket.h>
#include <stdio.h>
int main() {
    printf("SECURITY_VIOLATION\\n");
    return 0;
}
`,
  SECURITY_UNISTD_H: `
#include <unistd.h>
#include <stdio.h>
int main() {
    printf("SECURITY_VIOLATION\\n");
    return 0;
}
`,
  SECURITY_SYSTEM_CALL: `
#include <stdio.h>
#include <stdlib.h>
int main() {
    system("dir");
    return 0;
}
`,
  SECURITY_FORK_CALL: `
#include <stdio.h>
int main() {
    fork();
    return 0;
}
`,
  SECURITY_FILE_TRAVERSAL: `
#include "../../etc/passwd"
#include <stdio.h>
int main() {
    return 0;
}
`,
  SECURITY_STDERR_EXFIL: `
#include <stdio.h>
int main() {
    char buf[1024];
    if (fgets(buf, sizeof(buf), stdin)) {
        fprintf(stderr, "EXFILTRATED_INPUT: %s", buf);
    }
    printf("WRONG_OUTPUT\\n");
    return 0;
}
`,
  OUTPUT_FLOOD: `
#include <stdio.h>
int main() {
    for (int i = 0; i < 300000; i++) {
        printf("0123456789ABCDEF0123456789ABCDEF\\n");
    }
    return 0;
}
`,
  COMPILER_BOMB_MACRO: `
#define M1(x) x x x x x x x x x x
#define M2(x) M1(M1(x))
#define M3(x) M2(M2(x))
int main() {
    int z = 0;
    M3(z++);
    return 0;
}
`,
};

// Safe dynamic module loaders
export async function getSignalMapper() {
  try {
    return await import('../../src/judge/signal-mapper.js');
  } catch {
    return null;
  }
}

export async function getDiagnosticMapper() {
  try {
    return await import('../../src/judge/diagnostic-mapper.js');
  } catch {
    return null;
  }
}

export async function getDiffGenerator() {
  try {
    return await import('../../src/services/diff-generator.js');
  } catch {
    return null;
  }
}

// User and Database test fixtures
export async function createE2ETestUser(
  role: 'STUDENT' | 'CHECKER' | 'ADMIN' = 'STUDENT',
  emailPrefix: string = 'e2e_'
) {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const user = await prisma.user.create({
    data: {
      email: `${emailPrefix}${role.toLowerCase()}_${ts}@sanjivani.edu.in`,
      username: `${emailPrefix}${role.toLowerCase()}_${ts}`,
      fullName: `E2E ${role} Tester`,
      passwordHash,
      role,
      prn: role === 'STUDENT' ? `2199E2E${String(ts).slice(-4)}` : null,
      college: 'Sanjivani University',
      department: 'CSE',
      year: 'SY',
      division: 'A1',
    },
  });

  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
  });

  return { user, token };
}

export async function createE2ETestProblem(options?: {
  title?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  isDaily?: boolean;
  isPractice?: boolean;
  moduleSlug?: string;
  scheduledDate?: string | null;
  testCases?: Array<{ input: string; expectedOutput: string; isHidden: boolean; orderIndex: number }>;
}) {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const problem = await prisma.problem.create({
    data: {
      slug: `e2e-prob-${ts}`,
      title: options?.title || `E2E Problem ${ts}`,
      difficulty: 'EASY',
      category: 'Logic',
      tags: JSON.stringify(['e2e', 'test']),
      description: 'E2E Test Problem Description',
      starterCode: '#include <stdio.h>\nint main() { return 0; }',
      timeLimitMs: options?.timeLimitMs ?? 2000,
      memoryLimitMb: options?.memoryLimitMb ?? 128,
      basePoints: 20,
      isDaily: options?.isDaily ?? false,
      isPractice: options?.isPractice ?? true,
      moduleSlug: options?.moduleSlug ?? 'c-basics',
      scheduledDate: options?.scheduledDate ?? null,
      status: 'PUBLISHED',
      testCases: {
        create: options?.testCases ?? [
          { input: '10 20\n', expectedOutput: '30\n', isHidden: false, orderIndex: 0 },
          { input: '100 200\n', expectedOutput: '300\n', isHidden: true, orderIndex: 1 },
        ],
      },
    },
    include: {
      testCases: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return problem;
}

export async function cleanupE2EData(prefix: string = 'e2e_') {
  try {
    await prisma.submissionTestCaseResult.deleteMany({
      where: { submission: { user: { email: { startsWith: prefix } } } },
    });
    await prisma.submission.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.practiceProgress.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.testCase.deleteMany({
      where: { problem: { slug: { startsWith: 'e2e-prob-' } } },
    });
    await prisma.problem.deleteMany({
      where: { slug: { startsWith: 'e2e-prob-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: prefix } },
    });
  } catch (err) {
    // Best-effort cleanup
    console.warn('Cleanup warning:', err);
  }
}
