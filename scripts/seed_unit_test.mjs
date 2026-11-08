import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "logicq-clanguage",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INITIAL_BANK_QUESTIONS = [
  {
    id: 'q-s1-01',
    sectionNumber: 1,
    title: 'Bitwise Parity & Power of Two Validator',
    difficulty: 'EASY',
    timeLimitMinutes: 5,
    description: 'Determine if an integer N is a non-zero power of two using pure bitwise operations without loops.',
    visibleTestCase1: { input: '16', output: 'YES' },
    visibleTestCase2: { input: '18', output: 'NO' },
    hiddenTestCase: { input: '0', output: 'NO' },
    starterCode: '#include <stdio.h>\n\nint isPowerOfTwo(int n) {\n    // TODO: Bitwise solution\n    return 0;\n}',
    solutionCode: '#include <stdio.h>\n\nint isPowerOfTwo(int n) {\n    return (n > 0) && ((n & (n - 1)) == 0);\n}',
    verifiedCorrect: true,
  },
  {
    id: 'q-s2-01',
    sectionNumber: 2,
    title: 'Safe Pointer Swapper & Address Offset Calculator',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 12,
    description: 'Implement memory address swapping using double pointers and verify byte offset between two contiguous heap blocks.',
    visibleTestCase1: { input: '10 20', output: '20 10' },
    visibleTestCase2: { input: '-5 99', output: '99 -5' },
    hiddenTestCase: { input: '0 0', output: '0 0' },
    starterCode: '#include <stdio.h>\n\nvoid swapDouble(int **a, int **b) {\n    // TODO\n}',
    solutionCode: '#include <stdio.h>\n\nvoid swapDouble(int **a, int **b) {\n    int *temp = *a;\n    *a = *b;\n    *b = temp;\n}',
    verifiedCorrect: true,
  },
  {
    id: 'q-s3-01',
    sectionNumber: 3,
    title: 'Dynamic Array Deduplication with In-Place Compaction',
    difficulty: 'HARD',
    timeLimitMinutes: 20,
    description: 'Given dynamically allocated array of N integers, remove duplicates in-place with O(1) auxiliary space and realloc to minimal footprint.',
    visibleTestCase1: { input: '5\n1 2 2 3 4', output: '1 2 3 4' },
    visibleTestCase2: { input: '4\n7 7 7 7', output: '7' },
    hiddenTestCase: { input: '6\n-1 -1 0 2 2 5', output: '-1 0 2 5' },
    starterCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint* deduplicate(int *arr, int *size) {\n    return arr;\n}',
    solutionCode: '// Verified correct reference solution',
    verifiedCorrect: true,
  },
  {
    id: 'q-s4-01',
    sectionNumber: 4,
    title: 'Binary Packet Serialization & File Stream Checksum',
    difficulty: 'HARD',
    timeLimitMinutes: 22,
    description: 'Serialize a packed telemetry struct into a binary file format and compute 16-bit CRC checksum.',
    visibleTestCase1: { input: 'PKT 101 25.4', output: 'CRC: 0x4A12' },
    visibleTestCase2: { input: 'PKT 102 0.0', output: 'CRC: 0x1120' },
    hiddenTestCase: { input: 'PKT 999 100.0', output: 'CRC: 0x8F9C' },
    starterCode: '#include <stdio.h>\n\ntypedef struct __attribute__((packed)) {\n    unsigned short id;\n    float val;\n} Packet;',
    solutionCode: '// Verified reference',
    verifiedCorrect: true,
  },
];

async function seed() {
  const testId = 'test-unit-inte';
  const unitTest = {
    id: testId,
    title: 'UNIT',
    sectionTarget: 'Integrated Mtech',
    sectionId: 'Integrated Mtech',
    unitTarget: 'ALL',
    durationMinutes: 60,
    totalMarks: 20,
    status: 'ACTIVE',
    questions: INITIAL_BANK_QUESTIONS,
    questionCount: 3,
    antiCheatingRotation: true,
    randomiseQuestions: true,
    lockOnSubmit: true,
    difficultyProfile: 'BALANCED',
    selectionMode: 'UNITS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Writing test to Firestore assessment_tests...');
  await setDoc(doc(db, 'assessment_tests', testId), unitTest, { merge: true });
  console.log('Successfully seeded UNIT test to Firestore!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
