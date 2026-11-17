import fs from 'fs';

// 1. Read Firebase OAuth access token
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const PROJECT_ID = 'logicq-clanguage';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

// Helper to convert JS object into Firestore REST format
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: item.toString() };
            if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
            return { stringValue: String(item) };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

async function upsertDocument(collectionPath, docId, data) {
  const url = `${BASE_URL}/${collectionPath}/${encodeURIComponent(docId)}`;
  const body = {
    fields: toFirestoreFields(data),
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upsert ${collectionPath}/${docId}: ${res.status} - ${errText}`);
  }
  console.log(`✓ Upserted ${collectionPath}/${docId}`);
}

async function run() {
  console.log('Seeding Demo Section: Computer Science...');

  // 1. Create section: sec-compsci-demo
  await upsertDocument('sections', 'sec-compsci-demo', {
    id: 'sec-compsci-demo',
    sectionName: 'Computer Science',
    course: 'Computer Science',
    subject: 'C Programming & Data Structures',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    institution: 'LogicQ',
    joinCode: 'LQ-CS101',
    joinToken: 'LQ-CS101',
    facultyEmail: 'sectionadmin@gmail.com',
    facultyName: 'Computer Science Faculty',
    isActive: true,
    studentsCount: 1,
    description: 'Computer Science Academic Section — Core C Programming & Data Structures',
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  });

  // 2. Create enrolled student: Demo 1
  await upsertDocument('enrolled_students', '2126PMIB1001', {
    prn: '2126PMIB1001',
    fullName: 'Demo 1',
    name: 'Demo 1',
    department: 'Computer Science',
    year: 'FY',
    college: 'LogicQ',
    sectionId: 'sec-compsci-demo',
    sectionName: 'Computer Science',
    joinCode: 'LQ-CS101',
    email: 'demo1.cs@logicq.io',
    role: 'STUDENT',
    password: '123456',
    profileComplete: true,
    totalPoints: 350,
    totalSolved: 6,
    currentStreak: 4,
    labCompletedModules: 1,
    labInternalScore: 18,
    cieScore: 18,
    tabSwitchCount: 0,
    academicScore: 90,
    integrityScore: 100,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  });

  // 3. Create user doc for Demo 1
  await upsertDocument('users', 'cohort-2126pmib1001', {
    id: 'cohort-2126pmib1001',
    uid: 'cohort-2126pmib1001',
    prn: '2126PMIB1001',
    username: '2126pmib1001',
    fullName: 'Demo 1',
    displayName: 'Demo 1',
    email: 'demo1.cs@logicq.io',
    department: 'Computer Science',
    year: 'FY',
    college: 'LogicQ',
    sectionId: 'sec-compsci-demo',
    sectionName: 'Computer Science',
    role: 'STUDENT',
    profileComplete: true,
    password: '123456',
    totalPoints: 350,
    totalSolved: 6,
    currentStreak: 4,
    academicScore: 90,
    integrityScore: 100,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  });

  // 4. Create cohort_progress doc for Demo 1
  await upsertDocument('cohort_progress', '2126PMIB1001', {
    prn: '2126PMIB1001',
    fullName: 'Demo 1',
    department: 'Computer Science',
    year: 'FY',
    sectionId: 'sec-compsci-demo',
    sectionName: 'Computer Science',
    email: 'demo1.cs@logicq.io',
    totalPoints: 350,
    totalSolved: 6,
    currentStreak: 4,
    academicScore: 90,
    integrityScore: 100,
    completedProblems: [
      'cs-demo-p1',
      'cs-demo-p2',
      'cs-demo-p3',
      'cs-demo-p4',
      'cs-demo-p5',
      'cs-demo-p6',
    ],
    moduleProgress: {
      m1: { completed: 2, total: 2 },
      m2: { completed: 2, total: 2 },
      m3: { completed: 2, total: 2 },
      academicScore: 90,
      integrityScore: 100,
      tabSwitches: 0,
      pasteBursts: 0,
    },
    updatedAt: new Date().toISOString(),
  });

  // 5. Account security credential subdocument
  await upsertDocument('cohort_progress/2126PMIB1001/drafts', '__account_security', {
    code: '123456',
    updatedAt: new Date().toISOString(),
  });

  // 6. Create faculty user doc
  await upsertDocument('users', 'faculty-cs-sectionadmin', {
    id: 'faculty-cs-sectionadmin',
    uid: 'faculty-cs-sectionadmin',
    email: 'sectionadmin@gmail.com',
    username: 'sectionadmin',
    fullName: 'Computer Science Faculty',
    displayName: 'CS Faculty (Section Admin)',
    role: 'FACULTY',
    college: 'LogicQ',
    department: 'Computer Science',
    sectionId: 'sec-compsci-demo',
    sectionName: 'Computer Science',
    password: '123456',
    profileComplete: true,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  });

  // 7. Practice Submissions for Demo 1
  const practiceItems = [
    {
      id: 'sub-cs-demo-p1',
      problemId: 'cs-demo-p1',
      problemSlug: 'cs-demo-p1',
      problemTitle: 'Bitwise Parity & Power of Two Validator',
      difficulty: 'EASY',
      code: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    if (n > 0 && (n & (n - 1)) == 0) {\n        printf("YES\\n");\n    } else {\n        printf("NO\\n");\n    }\n    return 0;\n}`,
      timeTaken: 120,
    },
    {
      id: 'sub-cs-demo-p2',
      problemId: 'cs-demo-p2',
      problemSlug: 'cs-demo-p2',
      problemTitle: 'Safe Pointer Swapper & Address Offset Calculator',
      difficulty: 'MEDIUM',
      code: `#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int temp = *a;\n    *a = *b;\n    *b = temp;\n}\n\nint main() {\n    int x, y;\n    if (scanf("%d %d", &x, &y) != 2) return 0;\n    swap(&x, &y);\n    printf("%d %d\\n", x, y);\n    return 0;\n}`,
      timeTaken: 210,
    },
    {
      id: 'sub-cs-demo-p3',
      problemId: 'cs-demo-p3',
      problemSlug: 'cs-demo-p3',
      problemTitle: 'Dynamic Array Deduplication with In-Place Compaction',
      difficulty: 'HARD',
      code: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0) return 0;\n    int *arr = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    int j = 0;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] != arr[j]) {\n            arr[++j] = arr[i];\n        }\n    }\n    for (int i = 0; i <= j; i++) {\n        printf("%d%s", arr[i], i < j ? " " : "\\n");\n    }\n    free(arr);\n    return 0;\n}`,
      timeTaken: 360,
    },
    {
      id: 'sub-cs-demo-p4',
      problemId: 'cs-demo-p4',
      problemSlug: 'cs-demo-p4',
      problemTitle: 'In-Place String Reversal & Palindrome Checker',
      difficulty: 'EASY',
      code: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[105];\n    if (scanf("%s", str) != 1) return 0;\n    int i = 0, j = (int)strlen(str) - 1;\n    while (i < j) {\n        char t = str[i];\n        str[i] = str[j];\n        str[j] = t;\n        i++; j--;\n    }\n    printf("%s\\n", str);\n    return 0;\n}`,
      timeTaken: 150,
    },
    {
      id: 'sub-cs-demo-p5',
      problemId: 'cs-demo-p5',
      problemSlug: 'cs-demo-p5',
      problemTitle: 'Binary Search with Exact Insertion Index',
      difficulty: 'MEDIUM',
      code: `#include <stdio.h>\n\nint main() {\n    int n, target;\n    if (scanf("%d %d", &n, &target) != 2) return 0;\n    int arr[1000];\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    int l = 0, r = n - 1, ans = n;\n    while (l <= r) {\n        int mid = l + (r - l) / 2;\n        if (arr[mid] >= target) {\n            ans = mid;\n            r = mid - 1;\n        } else {\n            l = mid + 1;\n        }\n    }\n    printf("%d\\n", ans);\n    return 0;\n}`,
      timeTaken: 240,
    },
    {
      id: 'sub-cs-demo-p6',
      problemId: 'cs-demo-p6',
      problemSlug: 'cs-demo-p6',
      problemTitle: 'Singly Linked List Node Insertion & Traversal',
      difficulty: 'HARD',
      code: `#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node *next;\n} Node;\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    Node *head = NULL, *tail = NULL;\n    for (int i = 0; i < n; i++) {\n        int val;\n        scanf("%d", &val);\n        Node *newNode = (Node*)malloc(sizeof(Node));\n        newNode->data = val;\n        newNode->next = NULL;\n        if (!head) {\n            head = tail = newNode;\n        } else {\n            tail->next = newNode;\n            tail = newNode;\n        }\n    }\n    Node *curr = head;\n    while (curr) {\n        printf("%d -> ", curr->data);\n        Node *temp = curr;\n        curr = curr->next;\n        free(temp);\n    }\n    printf("NULL\\n");\n    return 0;\n}`,
      timeTaken: 420,
    },
  ];

  for (const item of practiceItems) {
    await upsertDocument('submissions', item.id, {
      id: item.id,
      studentPrn: '2126PMIB1001',
      prn: '2126PMIB1001',
      studentName: 'Demo 1',
      name: 'Demo 1',
      studentEmail: 'demo1.cs@logicq.io',
      email: 'demo1.cs@logicq.io',
      uid: 'cohort-2126pmib1001',
      userId: 'cohort-2126pmib1001',
      problemId: item.problemId,
      problemSlug: item.problemSlug,
      problemTitle: item.problemTitle,
      difficulty: item.difficulty,
      verdict: 'ACCEPTED',
      score: 20,
      marksAwarded: 20,
      maxMarks: 20,
      academicScore: 20,
      points: 50,
      pointsAwarded: 50,
      activeSeconds: item.timeTaken,
      timeTakenSeconds: item.timeTaken,
      cpm: 160,
      typingVelocityCPM: 160,
      language: 'c',
      submissionType: 'PRACTICE',
      tabSwitchCount: 0,
      fullscreenExits: 0,
      copyPasteAttempts: 0,
      manualGradingRequired: false,
      code: item.code,
      submittedCode: item.code,
      submittedAt: new Date(Date.now() - (practiceItems.indexOf(item) + 1) * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - (practiceItems.indexOf(item) + 1) * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 8. Assessment Test targeting Computer Science
  const csTest = {
    id: 'test-cs-lab-1',
    title: 'CS Lab Internal 1: Pointers & Dynamic Memory',
    sectionTarget: 'Computer Science',
    sectionId: 'sec-compsci-demo',
    status: 'ACTIVE',
    durationMinutes: 60,
    totalMarks: 20,
    questionCount: 2,
    antiCheatingRotation: true,
    randomiseQuestions: true,
    lockOnSubmit: true,
    difficultyProfile: 'BALANCED',
    selectionMode: 'MANUAL',
    unitTarget: 'Unit 2 & 3: Pointers & Dynamic Memory',
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'cs-demo-p2',
        title: 'Safe Pointer Swapper & Address Offset Calculator',
        difficulty: 'MEDIUM',
        description: 'Implement memory address swapping using double pointers and verify byte offset between two contiguous heap blocks.',
        starterCode: '#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    // TODO: Swap values\n}\n\nint main() {\n    int x, y;\n    if (scanf("%d %d", &x, &y) != 2) return 0;\n    swap(&x, &y);\n    printf("%d %d\\n", x, y);\n    return 0;\n}',
        solutionCode: '#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int temp = *a;\n    *a = *b;\n    *b = temp;\n}\n\nint main() {\n    int x, y;\n    if (scanf("%d %d", &x, &y) != 2) return 0;\n    swap(&x, &y);\n    printf("%d %d\\n", x, y);\n    return 0;\n}',
        visibleTestCase1: { input: '10 20', output: '20 10' },
        visibleTestCase2: { input: '-5 99', output: '99 -5' },
        hiddenTestCase: { input: '0 0', output: '0 0' },
      },
      {
        id: 'cs-demo-p3',
        title: 'Dynamic Array Deduplication with In-Place Compaction',
        difficulty: 'HARD',
        description: 'Given dynamically allocated array of N integers, remove duplicates in-place with O(1) auxiliary space and realloc to minimal footprint.',
        starterCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0) return 0;\n    // TODO\n    return 0;\n}',
        solutionCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0) return 0;\n    int *arr = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    int j = 0;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] != arr[j]) arr[++j] = arr[i];\n    }\n    for (int i = 0; i <= j; i++) printf("%d%s", arr[i], i < j ? " " : "\\n");\n    free(arr);\n    return 0;\n}',
        visibleTestCase1: { input: '5\n1 2 2 3 4', output: '1 2 3 4' },
        visibleTestCase2: { input: '4\n7 7 7 7', output: '7' },
        hiddenTestCase: { input: '6\n-1 -1 0 2 2 5', output: '-1 0 2 5' },
      },
    ],
  };
  await upsertDocument('assessment_tests', 'test-cs-lab-1', csTest);

  // 9. Completed Lab Internal Assessment Submission for Demo 1
  await upsertDocument('assessment_test_submissions', 'sub-cs-lab1-2126pmib1001', {
    id: 'sub-cs-lab1-2126pmib1001',
    testId: 'test-cs-lab-1',
    testTitle: 'CS Lab Internal 1: Pointers & Dynamic Memory',
    studentPrn: '2126PMIB1001',
    prn: '2126PMIB1001',
    studentName: 'Demo 1',
    name: 'Demo 1',
    studentEmail: 'demo1.cs@logicq.io',
    email: 'demo1.cs@logicq.io',
    uid: 'cohort-2126pmib1001',
    userId: 'cohort-2126pmib1001',
    problemId: 'cs-demo-p3',
    problemSlug: 'cs-demo-p3',
    problemTitle: 'Dynamic Array Deduplication with In-Place Compaction',
    difficulty: 'HARD',
    verdict: 'ACCEPTED',
    score: 18,
    marksAwarded: 18,
    maxMarks: 20,
    academicScore: 18,
    points: 50,
    pointsAwarded: 50,
    timeTakenSeconds: 540,
    activeSeconds: 540,
    tabSwitchCount: 0,
    fullscreenExits: 1,
    copyPasteAttempts: 0,
    cpm: 155,
    typingVelocityCPM: 155,
    language: 'c',
    submissionType: 'LAB_INTERNAL',
    manualGradingRequired: false,
    submittedCode: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0) return 0;\n    int *arr = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    int j = 0;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] != arr[j]) {\n            arr[++j] = arr[i];\n        }\n    }\n    for (int i = 0; i <= j; i++) {\n        printf("%d%s", arr[i], i < j ? " " : "\\n");\n    }\n    free(arr);\n    return 0;\n}`,
    code: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0) return 0;\n    int *arr = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    int j = 0;\n    for (int i = 1; i < n; i++) {\n        if (arr[i] != arr[j]) {\n            arr[++j] = arr[i];\n        }\n    }\n    for (int i = 0; i <= j; i++) {\n        printf("%d%s", arr[i], i < j ? " " : "\\n");\n    }\n    free(arr);\n    return 0;\n}`,
    submittedAt: '2026-11-17T06:30:00.000Z',
    createdAt: '2026-11-17T06:30:00.000Z',
    updatedAt: new Date().toISOString(),
  });

  console.log('🎉 Successfully seeded Computer Science section, Demo 1 student, section admin faculty, CS practice & CS lab assessment!');
}

run().catch((err) => {
  console.error('Fatal error seeding data:', err);
  process.exit(1);
});
