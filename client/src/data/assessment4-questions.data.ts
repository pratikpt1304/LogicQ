/**
 * ASSESSMENT 4: Complete Unit 4 Question Bank
 * 60 Easy Array Questions (Direct Application)
 * 60 Moderate Searching & Sorting Questions (Real-time Scenario Based)
 * Total: 120 Questions
 */

export interface AssessmentQuestion {
  id: string;
  slug: string;
  title: string;
  category: 'ARRAY_DIRECT' | 'SEARCH_SORT_SCENARIO';
  difficulty: 'EASY' | 'MEDIUM';
  timeLimitMinutes: number;
  marks: number;
  openMarks: number;
  hiddenMarks: number;
  description: string;
  realtimeScenario?: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  starterCode: string;
  solutionCode: string;
  visibleTestCase1: {
    input: string;
    output: string;
    marks: number;
    explanation?: string;
  };
  hiddenTestCase: {
    input: string;
    output: string;
    marks: number;
  };
  testCases: Array<{
    input: string;
    expectedOutput: string;
    marks: number;
    isHidden: boolean;
    explanation?: string;
  }>;
  visibleTestCases: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
}

export const A4_EASY_ARRAY_QUESTIONS: AssessmentQuestion[] = [
  {
    "id": "a4-arr-01",
    "slug": "array-max-min-difference",
    "title": "Array Range: Max-Min Difference",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, find the absolute difference between the largest and smallest elements present in the array.",
    "realtimeScenario": "Sensor Telemetry: A weather sensor network records daily temperature fluctuations across N stations. Calculate the maximum temperature spread (Max - Min).",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print a single integer representing (Max - Min).",
    "constraints": "2 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Find max and min element in array and print (max - min)\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int maxVal = arr[0], minVal = arr[0];\n    for (int i = 1; i < n; i++) {\n        if (arr[i] > maxVal) maxVal = arr[i];\n        if (arr[i] < minVal) minVal = arr[i];\n    }\n    printf(\"%d\\n\", maxVal - minVal);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 4 22 8 3",
      "output": "19",
      "marks": 2,
      "explanation": "Max is 22, min is 3. 22 - 3 = 19."
    },
    "hiddenTestCase": {
      "input": "6\n-15 0 45 -3 80 12",
      "output": "95",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 4 22 8 3",
        "expectedOutput": "19",
        "marks": 2,
        "isHidden": false,
        "explanation": "Max is 22, min is 3. 22 - 3 = 19."
      },
      {
        "input": "6\n-15 0 45 -3 80 12",
        "expectedOutput": "95",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 4 22 8 3",
        "output": "19",
        "explanation": "Max is 22, min is 3. 22 - 3 = 19."
      }
    ]
  },
  {
    "id": "a4-arr-02",
    "slug": "count-occurrences-of-key",
    "title": "Barcode Tracker: Count Occurrences",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers and a target integer K, count how many times K appears in the array.",
    "realtimeScenario": "Warehouse Quality Control: Count the occurrences of defective component code K detected across the batch inspection array.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains target integer K.",
    "outputFormat": "Print a single integer representing the count of K in the array.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements, K <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int k;\n    scanf(\"%d\", &k);\n    \n    // TODO: Count occurrences of target k\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int k;\n    scanf(\"%d\", &k);\n    int count = 0;\n    for (int i = 0; i < n; i++) if (arr[i] == k) count++;\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "7\n2 5 2 8 2 3 9\n2",
      "output": "3",
      "marks": 2,
      "explanation": "The number 2 appears 3 times."
    },
    "hiddenTestCase": {
      "input": "5\n10 20 30 40 50\n99",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "7\n2 5 2 8 2 3 9\n2",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "The number 2 appears 3 times."
      },
      {
        "input": "5\n10 20 30 40 50\n99",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "7\n2 5 2 8 2 3 9\n2",
        "output": "3",
        "explanation": "The number 2 appears 3 times."
      }
    ]
  },
  {
    "id": "a4-arr-03",
    "slug": "sum-of-even-elements",
    "title": "Even Filter: Sum of Even Numbers",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, compute and print the sum of all even numbers in the array. If no even numbers exist, print 0.",
    "realtimeScenario": "Accounting Parity Audit: Sum all transaction vouchers having even sequence numbers.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print a single integer representing the sum of even elements.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Read array and compute sum of even numbers\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        int val;\n        scanf(\"%d\", &val);\n        if (val % 2 == 0) sum += val;\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n3 4 7 8 10 11",
      "output": "22",
      "marks": 2,
      "explanation": "Even numbers: 4, 8, 10. Sum = 22."
    },
    "hiddenTestCase": {
      "input": "5\n1 3 5 7 9",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n3 4 7 8 10 11",
        "expectedOutput": "22",
        "marks": 2,
        "isHidden": false,
        "explanation": "Even numbers: 4, 8, 10. Sum = 22."
      },
      {
        "input": "5\n1 3 5 7 9",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n3 4 7 8 10 11",
        "output": "22",
        "explanation": "Even numbers: 4, 8, 10. Sum = 22."
      }
    ]
  },
  {
    "id": "a4-arr-04",
    "slug": "second-largest-element",
    "title": "Runner-Up: Second Largest Element",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N distinct integers, find and print the second largest element.",
    "realtimeScenario": "Auction Reserve Price: Identify the second-highest submitted bid to configure competitive reserve prices.",
    "inputFormat": "First line contains integer N (N >= 2).\nSecond line contains N distinct space-separated integers.",
    "outputFormat": "Print a single integer representing the second largest element.",
    "constraints": "2 <= N <= 1000\nElements are distinct integers.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Find second largest element\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int max1 = arr[0] > arr[1] ? arr[0] : arr[1];\n    int max2 = arr[0] > arr[1] ? arr[1] : arr[0];\n    for (int i = 2; i < n; i++) {\n        if (arr[i] > max1) {\n            max2 = max1;\n            max1 = arr[i];\n        } else if (arr[i] > max2) {\n            max2 = arr[i];\n        }\n    }\n    printf(\"%d\\n\", max2);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n12 35 1 10 34",
      "output": "34",
      "marks": 2,
      "explanation": "Largest is 35, second largest is 34."
    },
    "hiddenTestCase": {
      "input": "4\n100 40 90 50",
      "output": "90",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n12 35 1 10 34",
        "expectedOutput": "34",
        "marks": 2,
        "isHidden": false,
        "explanation": "Largest is 35, second largest is 34."
      },
      {
        "input": "4\n100 40 90 50",
        "expectedOutput": "90",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n12 35 1 10 34",
        "output": "34",
        "explanation": "Largest is 35, second largest is 34."
      }
    ]
  },
  {
    "id": "a4-arr-05",
    "slug": "reverse-array-print",
    "title": "Array Inversion: Reverse Output",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, print the elements in reverse order separated by spaces.",
    "realtimeScenario": "Flight Recorder Playback: Invert black box telemetry logs to reconstruct aircraft descent order.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers in reverse order.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Print array in reverse order\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    for (int i = n - 1; i >= 0; i--) {\n        printf(\"%d%c\", arr[i], i == 0 ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "5 4 3 2 1",
      "marks": 2,
      "explanation": "Reversed sequence is 5 4 3 2 1."
    },
    "hiddenTestCase": {
      "input": "4\n10 -5 20 0",
      "output": "0 20 -5 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "5 4 3 2 1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Reversed sequence is 5 4 3 2 1."
      },
      {
        "input": "4\n10 -5 20 0",
        "expectedOutput": "0 20 -5 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "5 4 3 2 1",
        "explanation": "Reversed sequence is 5 4 3 2 1."
      }
    ]
  },
  {
    "id": "a4-arr-06",
    "slug": "elements-greater-than-average",
    "title": "Benchmark Filter: Above Average Count",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, calculate the integer average (sum / N) and count how many elements are strictly greater than this average.",
    "realtimeScenario": "Sales Performance: Count how many regional sales reps exceeded the company-wide average sales volume.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print a single integer representing count of elements > average.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Calculate average and count elements > average\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d\", &arr[i]);\n        sum += arr[i];\n    }\n    int avg = sum / n;\n    int count = 0;\n    for (int i = 0; i < n; i++) if (arr[i] > avg) count++;\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 20 30 40 50",
      "output": "2",
      "marks": 2,
      "explanation": "Average is 30. Elements > 30 are 40 and 50 (2 elements)."
    },
    "hiddenTestCase": {
      "input": "4\n10 10 10 10",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 20 30 40 50",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Average is 30. Elements > 30 are 40 and 50 (2 elements)."
      },
      {
        "input": "4\n10 10 10 10",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 20 30 40 50",
        "output": "2",
        "explanation": "Average is 30. Elements > 30 are 40 and 50 (2 elements)."
      }
    ]
  },
  {
    "id": "a4-arr-07",
    "slug": "first-occurrence-linear-search",
    "title": "Linear Lookup: First Occurrence Index",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers and a target integer X, find and print the 0-based index of the first occurrence of X. If X is not present, print -1.",
    "realtimeScenario": "Memory Index Lookup: Find the first memory block index storing customer identifier X.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains integer X.",
    "outputFormat": "Print index of first occurrence, or -1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements, X <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int x;\n    scanf(\"%d\", &x);\n    \n    // TODO: Find first occurrence of x\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int x;\n    scanf(\"%d\", &x);\n    int idx = -1;\n    for (int i = 0; i < n; i++) {\n        if (arr[i] == x) { idx = i; break; }\n    }\n    printf(\"%d\\n\", idx);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n15 8 42 16 23 8\n8",
      "output": "1",
      "marks": 2,
      "explanation": "First occurrence of 8 is at index 1."
    },
    "hiddenTestCase": {
      "input": "5\n1 2 3 4 5\n99",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n15 8 42 16 23 8\n8",
        "expectedOutput": "1",
        "marks": 2,
        "isHidden": false,
        "explanation": "First occurrence of 8 is at index 1."
      },
      {
        "input": "5\n1 2 3 4 5\n99",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n15 8 42 16 23 8\n8",
        "output": "1",
        "explanation": "First occurrence of 8 is at index 1."
      }
    ]
  },
  {
    "id": "a4-arr-08",
    "slug": "check-palindrome-array",
    "title": "Symmetry Verification: Palindrome Array",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, check if the array is a palindrome (reads same forward and backward). Print \"YES\" if it is a palindrome, otherwise print \"NO\".",
    "realtimeScenario": "Packet Checksum: Verify if an incoming checksum array exhibits mirror symmetry before accepting packet payload.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print \"YES\" or \"NO\" (without quotes).",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Verify if array is a palindrome\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int isPal = 1;\n    for (int i = 0; i < n / 2; i++) {\n        if (arr[i] != arr[n - 1 - i]) { isPal = 0; break; }\n    }\n    if (isPal) printf(\"YES\\n\");\n    else printf(\"NO\\n\");\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 2 1",
      "output": "YES",
      "marks": 2,
      "explanation": "Array reads 1 2 3 2 1 from both sides."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "NO",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 2 1",
        "expectedOutput": "YES",
        "marks": 2,
        "isHidden": false,
        "explanation": "Array reads 1 2 3 2 1 from both sides."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "NO",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 2 1",
        "output": "YES",
        "explanation": "Array reads 1 2 3 2 1 from both sides."
      }
    ]
  },
  {
    "id": "a4-arr-09",
    "slug": "alternate-elements-print",
    "title": "Subsampling: Alternate Elements",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, print every alternate element starting from index 0 (indices 0, 2, 4, ...) separated by spaces.",
    "realtimeScenario": "Signal Downsampling: Downsample an acoustic signal array by keeping every even-indexed audio sample.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print alternate elements separated by spaces.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Print alternate elements starting from index 0\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    for (int i = 0; i < n; i += 2) {\n        printf(\"%d%c\", arr[i], (i + 2 >= n) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n10 20 30 40 50 60",
      "output": "10 30 50",
      "marks": 2,
      "explanation": "Indices 0, 2, 4 are 10, 30, 50."
    },
    "hiddenTestCase": {
      "input": "5\n7 14 21 28 35",
      "output": "7 21 35",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n10 20 30 40 50 60",
        "expectedOutput": "10 30 50",
        "marks": 2,
        "isHidden": false,
        "explanation": "Indices 0, 2, 4 are 10, 30, 50."
      },
      {
        "input": "5\n7 14 21 28 35",
        "expectedOutput": "7 21 35",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n10 20 30 40 50 60",
        "output": "10 30 50",
        "explanation": "Indices 0, 2, 4 are 10, 30, 50."
      }
    ]
  },
  {
    "id": "a4-arr-10",
    "slug": "count-positive-negative-zeroes",
    "title": "Sign Classification: Positives, Negatives, Zeroes",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, count and print the number of positive elements, negative elements, and zeroes on a single line separated by spaces.",
    "realtimeScenario": "Financial Audit: Categorize daily stock change points into gaining days, losing days, and flat days.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print three space-separated integers: PositiveCount NegativeCount ZeroCount.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Count positives, negatives, and zeroes\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int pos = 0, neg = 0, zero = 0;\n    for (int i = 0; i < n; i++) {\n        int val;\n        scanf(\"%d\", &val);\n        if (val > 0) pos++;\n        else if (val < 0) neg++;\n        else zero++;\n    }\n    printf(\"%d %d %d\\n\", pos, neg, zero);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n-4 3 -9 0 4 1",
      "output": "3 2 1",
      "marks": 2,
      "explanation": "Positives: 3, 4, 1 (3). Negatives: -4, -9 (2). Zeroes: 0 (1)."
    },
    "hiddenTestCase": {
      "input": "4\n0 0 0 0",
      "output": "0 0 4",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n-4 3 -9 0 4 1",
        "expectedOutput": "3 2 1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Positives: 3, 4, 1 (3). Negatives: -4, -9 (2). Zeroes: 0 (1)."
      },
      {
        "input": "4\n0 0 0 0",
        "expectedOutput": "0 0 4",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n-4 3 -9 0 4 1",
        "output": "3 2 1",
        "explanation": "Positives: 3, 4, 1 (3). Negatives: -4, -9 (2). Zeroes: 0 (1)."
      }
    ]
  },
  {
    "id": "a4-arr-11",
    "slug": "running-prefix-sum",
    "title": "Cumulative Total: Running Prefix Sum",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, compute and print the prefix sum array where each element at index i is the sum of elements from index 0 to i.",
    "realtimeScenario": "Utility Billing Meter: Calculate cumulative water volume consumed up to each day of the month.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers representing running prefix sums.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Compute and print running prefix sum\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    long long running = 0;\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d\", &arr[i]);\n        running += arr[i];\n        printf(\"%lld%c\", running, (i == n - 1) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "1 3 6 10 15",
      "marks": 2,
      "explanation": "Prefix sums: 1, 1+2=3, 3+3=6, 6+4=10, 10+5=15."
    },
    "hiddenTestCase": {
      "input": "4\n10 -2 5 -3",
      "output": "10 8 13 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "1 3 6 10 15",
        "marks": 2,
        "isHidden": false,
        "explanation": "Prefix sums: 1, 1+2=3, 3+3=6, 6+4=10, 10+5=15."
      },
      {
        "input": "4\n10 -2 5 -3",
        "expectedOutput": "10 8 13 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "1 3 6 10 15",
        "explanation": "Prefix sums: 1, 1+2=3, 3+3=6, 6+4=10, 10+5=15."
      }
    ]
  },
  {
    "id": "a4-arr-12",
    "slug": "find-missing-sequence-number",
    "title": "Missing Identifier: Find Missing Sequence Number",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "An array of size N-1 contains distinct integers from the range 1 to N with exactly one number missing. Find and print the missing number.",
    "realtimeScenario": "Token Queue Auditor: A clinic issues sequential tokens from 1 to N. Identify which patient token is missing from the submitted log.",
    "inputFormat": "First line contains integer N.\nSecond line contains N-1 space-separated integers.",
    "outputFormat": "Print the single missing integer.",
    "constraints": "2 <= N <= 10000\nElements are distinct integers in range [1, N].",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    \n    // TODO: Find the missing integer from 1 to n\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    long long expected = (long long)n * (n + 1) / 2;\n    long long actual = 0;\n    for (int i = 0; i < n - 1; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        actual += v;\n    }\n    printf(\"%lld\\n\", expected - actual);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 4 5",
      "output": "3",
      "marks": 2,
      "explanation": "Numbers 1 to 5 should sum to 15. 1+2+4+5=12. Missing is 15 - 12 = 3."
    },
    "hiddenTestCase": {
      "input": "4\n2 3 4",
      "output": "1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 4 5",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Numbers 1 to 5 should sum to 15. 1+2+4+5=12. Missing is 15 - 12 = 3."
      },
      {
        "input": "4\n2 3 4",
        "expectedOutput": "1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 4 5",
        "output": "3",
        "explanation": "Numbers 1 to 5 should sum to 15. 1+2+4+5=12. Missing is 15 - 12 = 3."
      }
    ]
  },
  {
    "id": "a4-arr-13",
    "slug": "shift-elements-left-by-one",
    "title": "Circular Pipeline: Left Shift by One",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, circularly shift all elements to the left by 1 position (the first element moves to the last position). Print the modified array.",
    "realtimeScenario": "CPU Round-Robin Scheduling: Rotate the task queue by 1 time slice so the running process moves to the end of the queue.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers after left shifting by 1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Shift array left by 1 position\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    if (n == 1) { printf(\"%d\\n\", arr[0]); return 0; }\n    int first = arr[0];\n    for (int i = 1; i < n; i++) printf(\"%d \", arr[i]);\n    printf(\"%d\\n\", first);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "2 3 4 5 1",
      "marks": 2,
      "explanation": "First element 1 shifts to index 4."
    },
    "hiddenTestCase": {
      "input": "3\n10 20 30",
      "output": "20 30 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "2 3 4 5 1",
        "marks": 2,
        "isHidden": false,
        "explanation": "First element 1 shifts to index 4."
      },
      {
        "input": "3\n10 20 30",
        "expectedOutput": "20 30 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "2 3 4 5 1",
        "explanation": "First element 1 shifts to index 4."
      }
    ]
  },
  {
    "id": "a4-arr-14",
    "slug": "shift-elements-right-by-one",
    "title": "Circular Buffer: Right Shift by One",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, circularly shift all elements to the right by 1 position (the last element moves to the first position). Print the modified array.",
    "realtimeScenario": "Display Carousel: Rotate advertising banners to the right by 1 position.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers after right shifting by 1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Shift array right by 1 position\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    if (n == 1) { printf(\"%d\\n\", arr[0]); return 0; }\n    printf(\"%d \", arr[n - 1]);\n    for (int i = 0; i < n - 1; i++) {\n        printf(\"%d%c\", arr[i], (i == n - 2) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "5 1 2 3 4",
      "marks": 2,
      "explanation": "Last element 5 shifts to index 0."
    },
    "hiddenTestCase": {
      "input": "3\n10 20 30",
      "output": "30 10 20",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "5 1 2 3 4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Last element 5 shifts to index 0."
      },
      {
        "input": "3\n10 20 30",
        "expectedOutput": "30 10 20",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "5 1 2 3 4",
        "explanation": "Last element 5 shifts to index 0."
      }
    ]
  },
  {
    "id": "a4-arr-15",
    "slug": "count-even-and-odd-numbers",
    "title": "Parity Ratio: Count Even and Odd Numbers",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, count total even numbers and total odd numbers. Print \"Even: E, Odd: O\" (without quotes).",
    "realtimeScenario": "Batch Manufacturing Parity: Categorize manufactured cylinder diameters into odd and even tolerance bins.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print \"Even: E, Odd: O\"",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Count even and odd numbers and print formatted\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int even = 0, odd = 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v % 2 == 0) even++;\n        else odd++;\n    }\n    printf(\"Even: %d, Odd: %d\\n\", even, odd);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n1 2 3 4 5 6",
      "output": "Even: 3, Odd: 3",
      "marks": 2,
      "explanation": "Even: 2, 4, 6 (3). Odd: 1, 3, 5 (3)."
    },
    "hiddenTestCase": {
      "input": "4\n2 4 6 8",
      "output": "Even: 4, Odd: 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n1 2 3 4 5 6",
        "expectedOutput": "Even: 3, Odd: 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Even: 2, 4, 6 (3). Odd: 1, 3, 5 (3)."
      },
      {
        "input": "4\n2 4 6 8",
        "expectedOutput": "Even: 4, Odd: 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n1 2 3 4 5 6",
        "output": "Even: 3, Odd: 3",
        "explanation": "Even: 2, 4, 6 (3). Odd: 1, 3, 5 (3)."
      }
    ]
  },
  {
    "id": "a4-arr-16",
    "slug": "replace-negatives-with-zero",
    "title": "Sensor Rectifier: Zero Negative Values",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, replace every negative number with 0 and print the modified array.",
    "realtimeScenario": "Half-Wave Signal Rectification: An electrical rectifier circuit zeroes out all negative voltage polarities.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Replace negative numbers with 0\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v < 0) v = 0;\n        printf(\"%d%c\", v, (i == n - 1) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n-3 4 -1 0 7",
      "output": "0 4 0 0 7",
      "marks": 2,
      "explanation": "-3 and -1 become 0."
    },
    "hiddenTestCase": {
      "input": "4\n-10 -20 -30 -40",
      "output": "0 0 0 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n-3 4 -1 0 7",
        "expectedOutput": "0 4 0 0 7",
        "marks": 2,
        "isHidden": false,
        "explanation": "-3 and -1 become 0."
      },
      {
        "input": "4\n-10 -20 -30 -40",
        "expectedOutput": "0 0 0 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n-3 4 -1 0 7",
        "output": "0 4 0 0 7",
        "explanation": "-3 and -1 become 0."
      }
    ]
  },
  {
    "id": "a4-arr-17",
    "slug": "pair-sum-target-verification",
    "title": "Pair Sum: Target Verification",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers and a target integer T, check if any two distinct indices (i != j) have sum equal to T. Print \"YES\" or \"NO\".",
    "realtimeScenario": "Coupons Matching Engine: Check if two discount coupons in a customer wallet can combine to match discount target T.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains target T.",
    "outputFormat": "Print \"YES\" or \"NO\".",
    "constraints": "2 <= N <= 1000\n-10000 <= elements, T <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int t;\n    scanf(\"%d\", &t);\n    \n    // TODO: Check if any pair sums to t\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int t;\n    scanf(\"%d\", &t);\n    int found = 0;\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            if (arr[i] + arr[j] == t) { found = 1; break; }\n        }\n        if (found) break;\n    }\n    if (found) printf(\"YES\\n\");\n    else printf(\"NO\\n\");\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 4 2 8 5\n7",
      "output": "YES",
      "marks": 2,
      "explanation": "2 + 5 = 7."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 9\n20",
      "output": "NO",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 4 2 8 5\n7",
        "expectedOutput": "YES",
        "marks": 2,
        "isHidden": false,
        "explanation": "2 + 5 = 7."
      },
      {
        "input": "4\n1 2 3 9\n20",
        "expectedOutput": "NO",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 4 2 8 5\n7",
        "output": "YES",
        "explanation": "2 + 5 = 7."
      }
    ]
  },
  {
    "id": "a4-arr-18",
    "slug": "absolute-difference-of-halves",
    "title": "Array Bisection: Difference of Halves",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers where N is even, calculate the sum of the first half (index 0 to N/2 - 1) and second half (index N/2 to N - 1). Print the absolute difference |Sum1 - Sum2|.",
    "realtimeScenario": "Load Balancer Weight Differential: Measure workload disparity between server cluster A (first half) and server cluster B (second half).",
    "inputFormat": "First line contains even integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print |Sum1 - Sum2|.",
    "constraints": "2 <= N <= 1000 (N is even)\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    \n    // TODO: Compute absolute difference between halves\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2 || n % 2 != 0) return 0;\n    long long sum1 = 0, sum2 = 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (i < n / 2) sum1 += v;\n        else sum2 += v;\n    }\n    long long diff = llabs(sum1 - sum2);\n    printf(\"%lld\\n\", diff);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n1 2 3 4 5 6",
      "output": "9",
      "marks": 2,
      "explanation": "First half sum = 1+2+3 = 6. Second half sum = 4+5+6 = 15. |6 - 15| = 9."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 20 10",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n1 2 3 4 5 6",
        "expectedOutput": "9",
        "marks": 2,
        "isHidden": false,
        "explanation": "First half sum = 1+2+3 = 6. Second half sum = 4+5+6 = 15. |6 - 15| = 9."
      },
      {
        "input": "4\n10 20 20 10",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n1 2 3 4 5 6",
        "output": "9",
        "explanation": "First half sum = 1+2+3 = 6. Second half sum = 4+5+6 = 15. |6 - 15| = 9."
      }
    ]
  },
  {
    "id": "a4-arr-19",
    "slug": "count-peak-elements",
    "title": "Topographic Ridge: Count Peak Elements",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "An internal element arr[i] (1 <= i <= N - 2) is a peak if it is strictly greater than both its left neighbor arr[i-1] and right neighbor arr[i+1]. Count and print the total number of peaks.",
    "realtimeScenario": "Terrain Elevation Analysis: A drone radar scans mountain elevations and counts ridge peaks along the flight vector.",
    "inputFormat": "First line contains integer N (N >= 3).\nSecond line contains N space-separated integers.",
    "outputFormat": "Print total count of peak elements.",
    "constraints": "3 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 3) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Count internal elements strictly greater than both neighbors\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 3) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int count = 0;\n    for (int i = 1; i < n - 1; i++) {\n        if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) count++;\n    }\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "7\n1 3 2 4 1 5 2",
      "output": "3",
      "marks": 2,
      "explanation": "Peaks at index 1 (3>1, 3>2), index 3 (4>2, 4>1), index 5 (5>1, 5>2). Total = 3."
    },
    "hiddenTestCase": {
      "input": "5\n1 2 3 4 5",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "7\n1 3 2 4 1 5 2",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Peaks at index 1 (3>1, 3>2), index 3 (4>2, 4>1), index 5 (5>1, 5>2). Total = 3."
      },
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "7\n1 3 2 4 1 5 2",
        "output": "3",
        "explanation": "Peaks at index 1 (3>1, 3>2), index 3 (4>2, 4>1), index 5 (5>1, 5>2). Total = 3."
      }
    ]
  },
  {
    "id": "a4-arr-20",
    "slug": "multiply-adjacent-elements",
    "title": "Neighbor Convolution: Multiply Adjacent Elements",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, replace each element with the product of its adjacent neighbors. For index 0, replace with arr[0] * arr[1]. For index N-1, replace with arr[N-2] * arr[N-1]. Print the new array.",
    "realtimeScenario": "Image Edge Filtering: 1D convolution filter computes neighbor intensity products.",
    "inputFormat": "First line contains integer N (N >= 2).\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers.",
    "constraints": "2 <= N <= 1000\n-1000 <= elements <= 1000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Compute adjacent neighbor products\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int res[n];\n    res[0] = arr[0] * arr[1];\n    for (int i = 1; i < n - 1; i++) res[i] = arr[i - 1] * arr[i + 1];\n    res[n - 1] = arr[n - 2] * arr[n - 1];\n    for (int i = 0; i < n; i++) printf(\"%d%c\", res[i], (i == n - 1) ? '\\n' : ' ');\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n2 3 4 5",
      "output": "6 8 15 20",
      "marks": 2,
      "explanation": "i=0: 2*3=6. i=1: 2*4=8. i=2: 3*5=15. i=3: 4*5=20."
    },
    "hiddenTestCase": {
      "input": "3\n1 5 10",
      "output": "5 10 50",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n2 3 4 5",
        "expectedOutput": "6 8 15 20",
        "marks": 2,
        "isHidden": false,
        "explanation": "i=0: 2*3=6. i=1: 2*4=8. i=2: 3*5=15. i=3: 4*5=20."
      },
      {
        "input": "3\n1 5 10",
        "expectedOutput": "5 10 50",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n2 3 4 5",
        "output": "6 8 15 20",
        "explanation": "i=0: 2*3=6. i=1: 2*4=8. i=2: 3*5=15. i=3: 4*5=20."
      }
    ]
  },
  {
    "id": "a4-arr-21",
    "slug": "move-all-zeroes-to-end",
    "title": "Compaction: Move All Zeroes to End",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, move all 0s to the end of the array while maintaining the relative order of the non-zero elements. Print the resulting array.",
    "realtimeScenario": "Database Storage Compaction: Defragment memory pages by pushing deleted empty records (0) to the end of the block.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Move all zeroes to end maintaining non-zero order\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    int nonZeros = 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v != 0) arr[nonZeros++] = v;\n    }\n    while (nonZeros < n) arr[nonZeros++] = 0;\n    for (int i = 0; i < n; i++) printf(\"%d%c\", arr[i], (i == n - 1) ? '\\n' : ' ');\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n0 1 0 3 12 0",
      "output": "1 3 12 0 0 0",
      "marks": 2,
      "explanation": "Non-zero elements 1, 3, 12 maintain order, zeroes placed at end."
    },
    "hiddenTestCase": {
      "input": "4\n0 0 0 5",
      "output": "5 0 0 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n0 1 0 3 12 0",
        "expectedOutput": "1 3 12 0 0 0",
        "marks": 2,
        "isHidden": false,
        "explanation": "Non-zero elements 1, 3, 12 maintain order, zeroes placed at end."
      },
      {
        "input": "4\n0 0 0 5",
        "expectedOutput": "5 0 0 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n0 1 0 3 12 0",
        "output": "1 3 12 0 0 0",
        "explanation": "Non-zero elements 1, 3, 12 maintain order, zeroes placed at end."
      }
    ]
  },
  {
    "id": "a4-arr-22",
    "slug": "check-strictly-increasing",
    "title": "Monotonicity: Check Strictly Increasing",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, check if it is strictly increasing (each element strictly greater than previous). Print \"YES\" or \"NO\".",
    "realtimeScenario": "Stock Uptrend Verification: Determine if an asset logged uninterrupted daily price growth.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print \"YES\" or \"NO\".",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Check if strictly increasing\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int prev, ok = 1;\n    scanf(\"%d\", &prev);\n    for (int i = 1; i < n; i++) {\n        int cur;\n        scanf(\"%d\", &cur);\n        if (cur <= prev) ok = 0;\n        prev = cur;\n    }\n    printf(\"%s\\n\", ok ? \"YES\" : \"NO\");\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n2 5 8 11 15",
      "output": "YES",
      "marks": 2,
      "explanation": "Every element is strictly greater than preceding."
    },
    "hiddenTestCase": {
      "input": "4\n1 3 3 7",
      "output": "NO",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n2 5 8 11 15",
        "expectedOutput": "YES",
        "marks": 2,
        "isHidden": false,
        "explanation": "Every element is strictly greater than preceding."
      },
      {
        "input": "4\n1 3 3 7",
        "expectedOutput": "NO",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n2 5 8 11 15",
        "output": "YES",
        "explanation": "Every element is strictly greater than preceding."
      }
    ]
  },
  {
    "id": "a4-arr-23",
    "slug": "find-unique-element-single",
    "title": "Single Outlier: Find Unique Element",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "In an array of N integers, every element appears exactly twice except one unique element which appears only once. Find and print this unique element.",
    "realtimeScenario": "Security Token Pair Verification: Every valid biometric entry requires duplicate RFID scan except one rogue single scan.",
    "inputFormat": "First line contains odd integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print the unique element.",
    "constraints": "1 <= N <= 10001 (N is odd)\nAll elements appear twice except one.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Find element appearing once using XOR\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int res = 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        res ^= v;\n    }\n    printf(\"%d\\n\", res);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "7\n4 1 2 1 2 4 9",
      "output": "9",
      "marks": 2,
      "explanation": "4, 1, 2 appear twice. 9 appears once."
    },
    "hiddenTestCase": {
      "input": "3\n5 8 5",
      "output": "8",
      "marks": 3
    },
    "testCases": [
      {
        "input": "7\n4 1 2 1 2 4 9",
        "expectedOutput": "9",
        "marks": 2,
        "isHidden": false,
        "explanation": "4, 1, 2 appear twice. 9 appears once."
      },
      {
        "input": "3\n5 8 5",
        "expectedOutput": "8",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "7\n4 1 2 1 2 4 9",
        "output": "9",
        "explanation": "4, 1, 2 appear twice. 9 appears once."
      }
    ]
  },
  {
    "id": "a4-arr-24",
    "slug": "sum-of-elements-at-odd-indices",
    "title": "Index Parity: Sum at Odd Indices",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, calculate and print the sum of elements located at odd indices (indices 1, 3, 5, ...).",
    "realtimeScenario": "Interleaved Audio Channel: Compute total volume of right stereo channel stored at odd array indices.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print a single integer.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Calculate sum of elements at odd indices\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (i % 2 != 0) sum += v;\n    }\n    printf(\"%lld\\n\", sum);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n10 20 30 40 50 60",
      "output": "120",
      "marks": 2,
      "explanation": "Odd indices: arr[1]=20, arr[3]=40, arr[5]=60. Sum = 120."
    },
    "hiddenTestCase": {
      "input": "3\n5 15 25",
      "output": "15",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n10 20 30 40 50 60",
        "expectedOutput": "120",
        "marks": 2,
        "isHidden": false,
        "explanation": "Odd indices: arr[1]=20, arr[3]=40, arr[5]=60. Sum = 120."
      },
      {
        "input": "3\n5 15 25",
        "expectedOutput": "15",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n10 20 30 40 50 60",
        "output": "120",
        "explanation": "Odd indices: arr[1]=20, arr[3]=40, arr[5]=60. Sum = 120."
      }
    ]
  },
  {
    "id": "a4-arr-25",
    "slug": "first-minimum-element-index",
    "title": "Extremum Position: Minimum Element Index",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, find and print the 0-based index of the first minimum element.",
    "realtimeScenario": "Manufacturing Temperature Sensor: Identify which sensor probe recorded the coldest reading.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print index of first minimum element.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Find index of minimum element\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int minVal, minIdx = 0;\n    scanf(\"%d\", &minVal);\n    for (int i = 1; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v < minVal) {\n            minVal = v;\n            minIdx = i;\n        }\n    }\n    printf(\"%d\\n\", minIdx);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n14 8 22 8 30",
      "output": "1",
      "marks": 2,
      "explanation": "Min value is 8, first occurrence is at index 1."
    },
    "hiddenTestCase": {
      "input": "4\n-100 0 50 -100",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n14 8 22 8 30",
        "expectedOutput": "1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Min value is 8, first occurrence is at index 1."
      },
      {
        "input": "4\n-100 0 50 -100",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n14 8 22 8 30",
        "output": "1",
        "explanation": "Min value is 8, first occurrence is at index 1."
      }
    ]
  },
  {
    "id": "a4-arr-26",
    "slug": "count-multiples-of-k",
    "title": "Divisibility Audit: Count Multiples of K",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers and a divisor K, count how many elements in the array are divisible by K.",
    "realtimeScenario": "Packaging Assembly: Count how many item crates can be evenly divided into carton bundles of size K.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains divisor K (K > 0).",
    "outputFormat": "Print total count of multiples of K.",
    "constraints": "1 <= N <= 1000\n1 <= K <= 1000\n0 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int k;\n    scanf(\"%d\", &k);\n    \n    // TODO: Count elements divisible by k\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int k;\n    scanf(\"%d\", &k);\n    int count = 0;\n    for (int i = 0; i < n; i++) if (arr[i] % k == 0) count++;\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n12 7 15 20 8 30\n5",
      "output": "3",
      "marks": 2,
      "explanation": "Multiples of 5 are 15, 20, 30 (3 numbers)."
    },
    "hiddenTestCase": {
      "input": "4\n2 4 6 8\n3",
      "output": "1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n12 7 15 20 8 30\n5",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Multiples of 5 are 15, 20, 30 (3 numbers)."
      },
      {
        "input": "4\n2 4 6 8\n3",
        "expectedOutput": "1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n12 7 15 20 8 30\n5",
        "output": "3",
        "explanation": "Multiples of 5 are 15, 20, 30 (3 numbers)."
      }
    ]
  },
  {
    "id": "a4-arr-27",
    "slug": "difference-largest-second-largest",
    "title": "Lead Margin: Max Minus Second Max",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N distinct integers, print the difference between the largest and the second largest element (Max1 - Max2).",
    "realtimeScenario": "Election Victory Margin: Compute the winning candidate vote lead over the second place finisher.",
    "inputFormat": "First line contains integer N (N >= 2).\nSecond line contains N distinct space-separated integers.",
    "outputFormat": "Print a single integer (Max1 - Max2).",
    "constraints": "2 <= N <= 1000\nDistinct integers.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    \n    // TODO: Print (Max1 - Max2)\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 2) return 0;\n    int m1, m2;\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    m1 = a > b ? a : b;\n    m2 = a > b ? b : a;\n    for (int i = 2; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v > m1) { m2 = m1; m1 = v; }\n        else if (v > m2) m2 = v;\n    }\n    printf(\"%d\\n\", m1 - m2);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 80 30 75 40",
      "output": "5",
      "marks": 2,
      "explanation": "Largest is 80, second largest is 75. 80 - 75 = 5."
    },
    "hiddenTestCase": {
      "input": "4\n100 20 80 50",
      "output": "20",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 80 30 75 40",
        "expectedOutput": "5",
        "marks": 2,
        "isHidden": false,
        "explanation": "Largest is 80, second largest is 75. 80 - 75 = 5."
      },
      {
        "input": "4\n100 20 80 50",
        "expectedOutput": "20",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 80 30 75 40",
        "output": "5",
        "explanation": "Largest is 80, second largest is 75. 80 - 75 = 5."
      }
    ]
  },
  {
    "id": "a4-arr-28",
    "slug": "square-of-array-elements",
    "title": "Quadratic Mapping: Square of Elements",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, replace each element with its square and print the resulting array.",
    "realtimeScenario": "Physics Energy Calculation: Calculate kinetic energy proportional to velocity squared (v^2) for N moving particles.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-1000 <= elements <= 1000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Print square of each element\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    for (int i = 0; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        printf(\"%lld%c\", (long long)v * v, (i == n - 1) ? '\\n' : ' ');\n    }\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 -3 4 5",
      "output": "1 4 9 16 25",
      "marks": 2,
      "explanation": "Squares: 1^2=1, 2^2=4, (-3)^2=9, 4^2=16, 5^2=25."
    },
    "hiddenTestCase": {
      "input": "3\n-5 0 10",
      "output": "25 0 100",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 -3 4 5",
        "expectedOutput": "1 4 9 16 25",
        "marks": 2,
        "isHidden": false,
        "explanation": "Squares: 1^2=1, 2^2=4, (-3)^2=9, 4^2=16, 5^2=25."
      },
      {
        "input": "3\n-5 0 10",
        "expectedOutput": "25 0 100",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 -3 4 5",
        "output": "1 4 9 16 25",
        "explanation": "Squares: 1^2=1, 2^2=4, (-3)^2=9, 4^2=16, 5^2=25."
      }
    ]
  },
  {
    "id": "a4-arr-29",
    "slug": "count-adjacent-inversions",
    "title": "Disorder Gauge: Adjacent Inversions",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count the number of adjacent inversions in an array, i.e., pairs where arr[i] > arr[i+1] for 0 <= i < N - 1.",
    "realtimeScenario": "Sorting Metric Analysis: Measure the degree of unsortedness in a queue prior to bubble sort passes.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print total count of adjacent inversions.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Count adjacent inversions\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    int count = 0;\n    for (int i = 0; i < n - 1; i++) if (arr[i] > arr[i + 1]) count++;\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n5 1 4 2 8",
      "output": "2",
      "marks": 2,
      "explanation": "Pairs (5,1) and (4,2) are inverted. Total = 2."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n5 1 4 2 8",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Pairs (5,1) and (4,2) are inverted. Total = 2."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n5 1 4 2 8",
        "output": "2",
        "explanation": "Pairs (5,1) and (4,2) are inverted. Total = 2."
      }
    ]
  },
  {
    "id": "a4-arr-30",
    "slug": "frequency-of-maximum-element",
    "title": "Leaderboard Plurality: Max Frequency",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers, find the maximum element and count how many times it occurs in the array.",
    "realtimeScenario": "Top Scorer Plurality: Determine how many students achieved the highest test score in the class.",
    "inputFormat": "First line contains integer N.\nSecond line contains N space-separated integers.",
    "outputFormat": "Print a single integer representing frequency of maximum element.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    \n    // TODO: Find max element and count its frequency\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int maxVal, count = 1;\n    scanf(\"%d\", &maxVal);\n    for (int i = 1; i < n; i++) {\n        int v;\n        scanf(\"%d\", &v);\n        if (v > maxVal) {\n            maxVal = v;\n            count = 1;\n        } else if (v == maxVal) {\n            count++;\n        }\n    }\n    printf(\"%d\\n\", count);\n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n3 5 2 5 1 5",
      "output": "3",
      "marks": 2,
      "explanation": "Max is 5, appears 3 times."
    },
    "hiddenTestCase": {
      "input": "5\n10 20 30 40 50",
      "output": "1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n3 5 2 5 1 5",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Max is 5, appears 3 times."
      },
      {
        "input": "5\n10 20 30 40 50",
        "expectedOutput": "1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n3 5 2 5 1 5",
        "output": "3",
        "explanation": "Max is 5, appears 3 times."
      }
    ]
  },
  {
    "id": "a4-arr-31",
    "slug": "remove-duplicates-sorted",
    "title": "Array Duplicate Remover",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given a sorted array of N integers, print the distinct elements separated by spaces.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N sorted integers.",
    "outputFormat": "Distinct integers separated by spaces.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Array Duplicate Remover\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Array Duplicate Remover\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n1 1 2 3 3 4",
      "output": "1 2 3 4",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n5 5 5 5",
      "output": "5",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n1 1 2 3 3 4",
        "expectedOutput": "1 2 3 4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n5 5 5 5",
        "expectedOutput": "5",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n1 1 2 3 3 4",
        "output": "1 2 3 4",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-32",
    "slug": "check-array-equality",
    "title": "Array Equality Check",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given two arrays A and B of size N, print \"EQUAL\" if identical at all indices, else \"NOT EQUAL\".",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers of A.\nThird line: N integers of B.",
    "outputFormat": "\"EQUAL\" or \"NOT EQUAL\".",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Array Equality Check\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Array Equality Check\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "3\n1 2 3\n1 2 3",
      "output": "EQUAL",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n1 2 3\n1 3 2",
      "output": "NOT EQUAL",
      "marks": 3
    },
    "testCases": [
      {
        "input": "3\n1 2 3\n1 2 3",
        "expectedOutput": "EQUAL",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n1 2 3\n1 3 2",
        "expectedOutput": "NOT EQUAL",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "3\n1 2 3\n1 2 3",
        "output": "EQUAL",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-33",
    "slug": "remove-target-element-x",
    "title": "Purge Target Value",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers and value X, print all elements except occurrences of X.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.\nThird line: X.",
    "outputFormat": "Remaining elements separated by spaces.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Purge Target Value\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Purge Target Value\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n1 2 3 2 4 2\n2",
      "output": "1 3 4",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n5 5 5 5\n5",
      "output": "100",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n1 2 3 2 4 2\n2",
        "expectedOutput": "1 3 4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n5 5 5 5\n5",
        "expectedOutput": "100",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n1 2 3 2 4 2\n2",
        "output": "1 3 4",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-34",
    "slug": "first-negative-element-index",
    "title": "Negative Sentinel Index",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find and print the 0-based index of the first negative number in the array, or -1 if none.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Negative Sentinel Index\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Negative Sentinel Index\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n4 8 -3 12 -5",
      "output": "2",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n4 8 -3 12 -5",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n4 8 -3 12 -5",
        "output": "2",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-35",
    "slug": "boundary-vs-middle-difference",
    "title": "Boundary vs Core Sum",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N integers (N >= 3), print absolute difference |(arr[0] + arr[N-1]) - (sum of interior elements)|.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N integers.",
    "outputFormat": "Absolute difference.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Boundary vs Core Sum\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Boundary vs Core Sum\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 2 3 4 20",
      "output": "21",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n5 10 5",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 2 3 4 20",
        "expectedOutput": "21",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n5 10 5",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 2 3 4 20",
        "output": "21",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-36",
    "slug": "check-all-elements-distinct",
    "title": "Uniqueness Checker",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Print \"DISTINCT\" if all elements in array are unique, otherwise print \"DUPLICATES\".",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "\"DISTINCT\" or \"DUPLICATES\".",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Uniqueness Checker\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Uniqueness Checker\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "DISTINCT",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "5\n1 2 3 2 5",
      "output": "DUPLICATES",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "DISTINCT",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "5\n1 2 3 2 5",
        "expectedOutput": "DUPLICATES",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "DISTINCT",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-37",
    "slug": "count-elements-in-range",
    "title": "Interval Window Count",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given array of N integers and range [L, R], count how many elements satisfy L <= arr[i] <= R.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.\nThird line: L and R.",
    "outputFormat": "Count of elements.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Interval Window Count\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Interval Window Count\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n5 12 18 25 30 8\n10 25",
      "output": "3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4\n5 10",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n5 12 18 25 30 8\n10 25",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4\n5 10",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n5 12 18 25 30 8\n10 25",
        "output": "3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-38",
    "slug": "maximum-adjacent-pair-sum",
    "title": "Adjacent Maximum Sum",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find the maximum sum of any two adjacent elements arr[i] + arr[i+1].",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N (>= 2).\nSecond line: N integers.",
    "outputFormat": "Maximum adjacent sum.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Adjacent Maximum Sum\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Adjacent Maximum Sum\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n3 7 1 9 4",
      "output": "13",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n-1 -5 10 2",
      "output": "12",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n3 7 1 9 4",
        "expectedOutput": "13",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n-1 -5 10 2",
        "expectedOutput": "12",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n3 7 1 9 4",
        "output": "13",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-39",
    "slug": "minimum-adjacent-absolute-diff",
    "title": "Minimum Adjacent Gap",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find the minimum absolute difference |arr[i] - arr[i+1]| for any adjacent pair.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N (>= 2).\nSecond line: N integers.",
    "outputFormat": "Minimum difference.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Minimum Adjacent Gap\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Minimum Adjacent Gap\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 8 10 14 15",
      "output": "1",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n10 25 50 100",
      "output": "15",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 8 10 14 15",
        "expectedOutput": "1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n10 25 50 100",
        "expectedOutput": "15",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 8 10 14 15",
        "output": "1",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-40",
    "slug": "toggle-sign-of-even-numbers",
    "title": "Sign Inversion for Evens",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Multiply every even number by -1 (leaving odd numbers unchanged) and print the array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Sign Inversion for Evens\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Sign Inversion for Evens\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n2 3 4 5 6",
      "output": "-2 3 -4 5 -6",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 3 5 7",
      "output": "1 3 5 7",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n2 3 4 5 6",
        "expectedOutput": "-2 3 -4 5 -6",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 3 5 7",
        "expectedOutput": "1 3 5 7",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n2 3 4 5 6",
        "output": "-2 3 -4 5 -6",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-41",
    "slug": "majority-element-check",
    "title": "Dominant Majority Element",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find the element that appears strictly more than N/2 times, or print -1 if none exists.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Majority element or -1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Dominant Majority Element\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Dominant Majority Element\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n3 3 4 2 3",
      "output": "3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n3 3 4 2 3",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n3 3 4 2 3",
        "output": "3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-42",
    "slug": "absolute-difference-from-mean",
    "title": "Mean Dispersion Distance",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find absolute difference between largest element and integer average of array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Absolute difference.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Mean Dispersion Distance\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Mean Dispersion Distance\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 20 30 40 50",
      "output": "20",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n5 5 5 5",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 20 30 40 50",
        "expectedOutput": "20",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n5 5 5 5",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 20 30 40 50",
        "output": "20",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-43",
    "slug": "elements-smaller-than-neighbors",
    "title": "Strict Valley Element",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count internal elements arr[i] that are strictly smaller than both arr[i-1] and arr[i+1].",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N integers.",
    "outputFormat": "Count of valleys.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Strict Valley Element\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Strict Valley Element\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n5 2 6 3 7 1",
      "output": "2",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n5 2 6 3 7 1",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n5 2 6 3 7 1",
        "output": "2",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-44",
    "slug": "swap-first-and-last-elements",
    "title": "Terminal Swap Operation",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Swap the first element arr[0] and last element arr[N-1] and print the modified array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Terminal Swap Operation\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Terminal Swap Operation\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 2 3 4 5",
      "output": "5 2 3 4 1",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "2\n10 20",
      "output": "20 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "5 2 3 4 1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "2\n10 20",
        "expectedOutput": "20 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 2 3 4 5",
        "output": "5 2 3 4 1",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-45",
    "slug": "swap-min-and-max-elements",
    "title": "Extremum Transposition",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Swap the first occurrence of minimum element and maximum element in the array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Extremum Transposition\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Extremum Transposition\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n3 1 4 5 2",
      "output": "3 5 4 1 2",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 40 30",
      "output": "40 20 10 30",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n3 1 4 5 2",
        "expectedOutput": "3 5 4 1 2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n10 20 40 30",
        "expectedOutput": "40 20 10 30",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n3 1 4 5 2",
        "output": "3 5 4 1 2",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-46",
    "slug": "count-divisible-by-3-or-5",
    "title": "Special Factor Counter",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count how many elements in the array are divisible by 3 OR divisible by 5.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Count of elements.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Special Factor Counter\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Special Factor Counter\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n3 7 10 12 15 17",
      "output": "4",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 4 8",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n3 7 10 12 15 17",
        "expectedOutput": "4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 4 8",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n3 7 10 12 15 17",
        "output": "4",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-47",
    "slug": "cumulative-subtraction-result",
    "title": "Cascading Subtraction",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Compute arr[0] - arr[1] - arr[2] - ... - arr[N-1] and print result.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Single integer.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cascading Subtraction\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cascading Subtraction\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n100 20 30 10",
      "output": "40",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n50 50 50",
      "output": "-50",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n100 20 30 10",
        "expectedOutput": "40",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n50 50 50",
        "expectedOutput": "-50",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n100 20 30 10",
        "output": "40",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-48",
    "slug": "check-symmetrical-array",
    "title": "Symmetrical Array Check",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Check if arr[i] == arr[N-1-i] for all i. Print \"SYMMETRIC\" or \"ASYMMETRIC\".",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "\"SYMMETRIC\" or \"ASYMMETRIC\".",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Symmetrical Array Check\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Symmetrical Array Check\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n1 2 2 1",
      "output": "SYMMETRIC",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "ASYMMETRIC",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n1 2 2 1",
        "expectedOutput": "SYMMETRIC",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "ASYMMETRIC",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n1 2 2 1",
        "output": "SYMMETRIC",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-49",
    "slug": "extract-even-numbers-only",
    "title": "Even Sub-array Extraction",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Print all even numbers in the array in their original order. If none, print \"NONE\".",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Even numbers or \"NONE\".",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Even Sub-array Extraction\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Even Sub-array Extraction\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 4 7 8 9",
      "output": "4 8",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n1 3 5",
      "output": "NONE",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 4 7 8 9",
        "expectedOutput": "4 8",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n1 3 5",
        "expectedOutput": "NONE",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 4 7 8 9",
        "output": "4 8",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-50",
    "slug": "last-occurrence-target-index",
    "title": "Reverse Sentinel Index",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find and print the 0-based index of the LAST occurrence of target K, or -1 if not found.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.\nThird line: K.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Reverse Sentinel Index\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Reverse Sentinel Index\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n2 5 8 5 9 5\n5",
      "output": "5",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4\n9",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n2 5 8 5 9 5\n5",
        "expectedOutput": "5",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4\n9",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n2 5 8 5 9 5\n5",
        "output": "5",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-51",
    "slug": "sum-of-digits-each-element",
    "title": "Digital Reduction Array",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Replace each non-negative element with sum of its decimal digits and print the array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N non-negative integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Digital Reduction Array\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Digital Reduction Array\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n15 24 99 105",
      "output": "6 6 18 6",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n7 20 300",
      "output": "7 2 3",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n15 24 99 105",
        "expectedOutput": "6 6 18 6",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n7 20 300",
        "expectedOutput": "7 2 3",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n15 24 99 105",
        "output": "6 6 18 6",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-52",
    "slug": "count-nonzero-elements",
    "title": "Non-Zero Activity Gauge",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count and print total number of non-zero elements present in the array.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Count of non-zeroes.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Non-Zero Activity Gauge\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Non-Zero Activity Gauge\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n0 4 0 0 7 9",
      "output": "3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n0 0 0 0",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n0 4 0 0 7 9",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n0 0 0 0",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n0 4 0 0 7 9",
        "output": "3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-53",
    "slug": "difference-even-sum-odd-sum",
    "title": "Even-Odd Differential",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Compute (Sum of even numbers) - (Sum of odd numbers) and print the result.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Difference integer.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Even-Odd Differential\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Even-Odd Differential\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n2 3 4 5 6",
      "output": "4",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 3 5 7",
      "output": "-16",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n2 3 4 5 6",
        "expectedOutput": "4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 3 5 7",
        "expectedOutput": "-16",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n2 3 4 5 6",
        "output": "4",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-54",
    "slug": "left-rotate-array-by-k",
    "title": "Cyclic Left Shift K",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Cyclically rotate array to the left by K positions and print result.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N and K.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cyclic Left Shift K\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cyclic Left Shift K\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5 2\n1 2 3 4 5",
      "output": "3 4 5 1 2",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4 1\n10 20 30 40",
      "output": "20 30 40 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5 2\n1 2 3 4 5",
        "expectedOutput": "3 4 5 1 2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4 1\n10 20 30 40",
        "expectedOutput": "20 30 40 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5 2\n1 2 3 4 5",
        "output": "3 4 5 1 2",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-55",
    "slug": "right-rotate-array-by-k",
    "title": "Cyclic Right Shift K",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Cyclically rotate array to the right by K positions and print result.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N and K.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cyclic Right Shift K\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Cyclic Right Shift K\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5 2\n1 2 3 4 5",
      "output": "4 5 1 2 3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4 1\n10 20 30 40",
      "output": "40 10 20 30",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5 2\n1 2 3 4 5",
        "expectedOutput": "4 5 1 2 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4 1\n10 20 30 40",
        "expectedOutput": "40 10 20 30",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5 2\n1 2 3 4 5",
        "output": "4 5 1 2 3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-56",
    "slug": "first-repeated-element",
    "title": "First Duplicate Recurrence",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Find the first element from the left that repeats later in the array. If no duplicates, print -1.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "First repeated element or -1.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: First Duplicate Recurrence\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: First Duplicate Recurrence\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n10 5 3 4 3 5",
      "output": "5",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n10 5 3 4 3 5",
        "expectedOutput": "5",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n10 5 3 4 3 5",
        "output": "5",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-57",
    "slug": "count-ending-with-seven",
    "title": "Terminal Digit Filter",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count how many elements in the array end with the digit 7 (|arr[i]| % 10 == 7).",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Count of elements.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Terminal Digit Filter\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Terminal Digit Filter\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n17 23 47 70 7",
      "output": "3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 30 40",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n17 23 47 70 7",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n10 20 30 40",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n17 23 47 70 7",
        "output": "3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-58",
    "slug": "element-rank-replacement",
    "title": "Ordinal Rank Transform",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Replace each element with its 1-based rank among all elements sorted ascending (handle duplicates with same rank).",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "N space-separated ranks.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Ordinal Rank Transform\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Ordinal Rank Transform\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n40 10 20 30",
      "output": "4 1 2 3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "3\n100 50 100",
      "output": "2 1 2",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n40 10 20 30",
        "expectedOutput": "4 1 2 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "3\n100 50 100",
        "expectedOutput": "2 1 2",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n40 10 20 30",
        "output": "4 1 2 3",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-59",
    "slug": "alternating-sign-sum",
    "title": "Alternating Series Sum",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Compute arr[0] - arr[1] + arr[2] - arr[3] + ... and print result.",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Alternating sum.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Alternating Series Sum\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Alternating Series Sum\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n10 2 10 2 10",
      "output": "26",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "-2",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n10 2 10 2 10",
        "expectedOutput": "26",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "-2",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n10 2 10 2 10",
        "output": "26",
        "explanation": "Sample test case demonstration."
      }
    ]
  },
  {
    "id": "a4-arr-60",
    "slug": "count-greater-than-preceding",
    "title": "Climbing Progression Count",
    "category": "ARRAY_DIRECT",
    "difficulty": "EASY",
    "timeLimitMinutes": 20,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Count how many elements arr[i] (i >= 1) are strictly greater than their immediate predecessor arr[i-1].",
    "realtimeScenario": "Telemetry processing for industrial IoT sensor arrays.",
    "inputFormat": "First line: N.\nSecond line: N integers.",
    "outputFormat": "Count of ascending steps.",
    "constraints": "1 <= N <= 1000\n-10000 <= elements <= 10000",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Climbing Progression Count\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Write logic for: Climbing Progression Count\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1 3 2 4 5",
      "output": "3",
      "marks": 2,
      "explanation": "Sample test case demonstration."
    },
    "hiddenTestCase": {
      "input": "4\n5 4 3 2",
      "output": "0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1 3 2 4 5",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Sample test case demonstration."
      },
      {
        "input": "4\n5 4 3 2",
        "expectedOutput": "0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1 3 2 4 5",
        "output": "3",
        "explanation": "Sample test case demonstration."
      }
    ]
  }
];

export const A4_MODERATE_SEARCH_SORT_QUESTIONS: AssessmentQuestion[] = [
  {
    "id": "a4-ss-01",
    "slug": "warehouse-inventory-sku-binary-search",
    "title": "Warehouse Logistics: SKU Binary Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given a sorted array of N unique item SKUs and a target SKU K, implement binary search to find the 0-based index of K. If not found, print -1. Also print the number of comparisons made.",
    "realtimeScenario": "Automated E-Commerce Fulfillment: A warehouse robotic picker needs to locate the exact storage bay of item SKU K among a sorted catalog of N items in O(log N) time.",
    "inputFormat": "First line: N.\nSecond line: N sorted integers.\nThird line: target SKU K.",
    "outputFormat": "First line: index or -1.\nSecond line: \"Comparisons: C\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Warehouse Logistics: SKU Binary Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Warehouse Logistics: SKU Binary Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "7\n101 204 305 408 512 620 735\n408",
      "output": "3\nComparisons: 1",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "5\n10 20 30 40 50\n99",
      "output": "-1\nComparisons: 3",
      "marks": 3
    },
    "testCases": [
      {
        "input": "7\n101 204 305 408 512 620 735\n408",
        "expectedOutput": "3\nComparisons: 1",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "5\n10 20 30 40 50\n99",
        "expectedOutput": "-1\nComparisons: 3",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "7\n101 204 305 408 512 620 735\n408",
        "output": "3\nComparisons: 1",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-02",
    "slug": "flight-ticket-price-bubble-sort",
    "title": "Airline Revenue: Ticket Price Bubble Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given an array of N airfare prices, sort them in ascending order using Bubble Sort. Print the sorted prices on the first line and total swaps on the second line.",
    "realtimeScenario": "Dynamic Flight Booking Engine: Sort airline seat prices in ascending order using Bubble Sort and report the total swap count to evaluate price volatility.",
    "inputFormat": "First line: N.\nSecond line: N space-separated prices.",
    "outputFormat": "First line: N sorted integers.\nSecond line: \"Total Swaps: S\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Airline Revenue: Ticket Price Bubble Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Airline Revenue: Ticket Price Bubble Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n5200 3100 8900 1400 4500",
      "output": "1400 3100 4500 5200 8900\nTotal Swaps: 5",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 30 40",
      "output": "10 20 30 40\nTotal Swaps: 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n5200 3100 8900 1400 4500",
        "expectedOutput": "1400 3100 4500 5200 8900\nTotal Swaps: 5",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n10 20 30 40",
        "expectedOutput": "10 20 30 40\nTotal Swaps: 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n5200 3100 8900 1400 4500",
        "output": "1400 3100 4500 5200 8900\nTotal Swaps: 5",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-03",
    "slug": "hospital-triage-priority-insertion-sort",
    "title": "Emergency Triage: Patient Urgency Insertion Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N patient triage urgency scores, sort them in descending order using Insertion Sort. Print the sorted array on the first line and number of shifts on the second line.",
    "realtimeScenario": "Hospital Emergency Room: Triage nurses continuously register incoming patients with priority severity scores (1-100). Sort patient priorities in descending order using Insertion Sort.",
    "inputFormat": "First line: N.\nSecond line: N space-separated integer urgency scores.",
    "outputFormat": "First line: N sorted integers descending.\nSecond line: \"Shifts: S\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Emergency Triage: Patient Urgency Insertion Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Emergency Triage: Patient Urgency Insertion Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n42 88 15 95 60",
      "output": "95 88 60 42 15\nShifts: 6",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n90 80 70 60",
      "output": "90 80 70 60\nShifts: 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n42 88 15 95 60",
        "expectedOutput": "95 88 60 42 15\nShifts: 6",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n90 80 70 60",
        "expectedOutput": "90 80 70 60\nShifts: 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n42 88 15 95 60",
        "output": "95 88 60 42 15\nShifts: 6",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-04",
    "slug": "ecommerce-flash-sale-stock-lookup",
    "title": "Flash Sale: Stock Availability Binary Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N sorted product IDs and a query ID K, perform binary search to determine if K is in stock. If present, print \"IN STOCK at Bay [Index]\". Otherwise print \"OUT OF STOCK\".",
    "realtimeScenario": "Flash Sale Checkout Gate: High-frequency purchasing requests verify stock availability for product ID K in an in-memory sorted stock registry.",
    "inputFormat": "First line: N.\nSecond line: N sorted product IDs.\nThird line: query ID K.",
    "outputFormat": "Print \"IN STOCK at Bay X\" or \"OUT OF STOCK\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Flash Sale: Stock Availability Binary Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Flash Sale: Stock Availability Binary Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n1001 1005 1010 1025 1050 1100\n1025",
      "output": "IN STOCK at Bay 3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n200 300 400 500\n350",
      "output": "OUT OF STOCK",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n1001 1005 1010 1025 1050 1100\n1025",
        "expectedOutput": "IN STOCK at Bay 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n200 300 400 500\n350",
        "expectedOutput": "OUT OF STOCK",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n1001 1005 1010 1025 1050 1100\n1025",
        "output": "IN STOCK at Bay 3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-05",
    "slug": "gps-waypoint-distance-selection-sort",
    "title": "Route Optimizer: Delivery Distance Selection Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N waypoint distances, sort them in ascending order using Selection Sort. Print the sorted distances on line 1, and the number of minimum swaps executed on line 2.",
    "realtimeScenario": "Autonomous Delivery Rover: Sort delivery waypoint distances from the charging depot ascending using Selection Sort.",
    "inputFormat": "First line: N.\nSecond line: N space-separated distances in meters.",
    "outputFormat": "Line 1: N sorted integers.\nLine 2: \"Swaps: S\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Route Optimizer: Delivery Distance Selection Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Route Optimizer: Delivery Distance Selection Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n64 25 12 22 11",
      "output": "11 12 22 25 64\nSwaps: 4",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n1 2 3 4",
      "output": "1 2 3 4\nSwaps: 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n64 25 12 22 11",
        "expectedOutput": "11 12 22 25 64\nSwaps: 4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n1 2 3 4",
        "expectedOutput": "1 2 3 4\nSwaps: 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n64 25 12 22 11",
        "output": "11 12 22 25 64\nSwaps: 4",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-06",
    "slug": "fraud-timestamp-window-search",
    "title": "Fintech Audit: Fraud Timestamp Window Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given a sorted array of N transaction timestamps and target timestamp T, find the first and last 0-based indices of T using binary search. If T does not occur, print \"-1 -1\".",
    "realtimeScenario": "Banking Core Anti-Fraud: Identify the first and last occurrence index of suspicious micro-transactions logged at identical epoch timestamp T.",
    "inputFormat": "First line: N.\nSecond line: N sorted integers.\nThird line: target T.",
    "outputFormat": "Print two space-separated integers: \"First Last\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Fintech Audit: Fraud Timestamp Window Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Fintech Audit: Fraud Timestamp Window Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "7\n10 20 20 20 30 40 50\n20",
      "output": "1 3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "5\n5 15 25 35 45\n99",
      "output": "-1 -1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "7\n10 20 20 20 30 40 50\n20",
        "expectedOutput": "1 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "5\n5 15 25 35 45\n99",
        "expectedOutput": "-1 -1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "7\n10 20 20 20 30 40 50\n20",
        "output": "1 3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-07",
    "slug": "library-isbn-catalog-search",
    "title": "Digital Library: ISBN Catalog Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N sorted book ISBNs and a query ISBN K, print the 0-based index if found, or \"NOT FOUND\" if absent.",
    "realtimeScenario": "University Archives: Search for an 8-digit book ISBN in the sorted master catalog of registered library books.",
    "inputFormat": "First line: N.\nSecond line: N sorted integers.\nThird line: ISBN K.",
    "outputFormat": "Print index or \"NOT FOUND\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Digital Library: ISBN Catalog Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Digital Library: ISBN Catalog Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n10001 10045 10090 10120 10155 10200\n10120",
      "output": "3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n5001 5002 5003 5004\n5009",
      "output": "NOT FOUND",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n10001 10045 10090 10120 10155 10200\n10120",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n5001 5002 5003 5004\n5009",
        "expectedOutput": "NOT FOUND",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n10001 10045 10090 10120 10155 10200\n10120",
        "output": "3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-08",
    "slug": "athlete-race-finishing-times-ranking",
    "title": "Olympic Sprint: Podium Finish Times Rank",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N race times (N >= 3), sort in ascending order using Bubble or Insertion sort. Print \"Gold: T1, Silver: T2, Bronze: T3\".",
    "realtimeScenario": "Athletics Championship: 100m sprint race timers record finishing durations in milliseconds. Sort times ascending and print Gold, Silver, Bronze times.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N space-separated finishing times in milliseconds.",
    "outputFormat": "Print \"Gold: T1, Silver: T2, Bronze: T3\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Olympic Sprint: Podium Finish Times Rank\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Olympic Sprint: Podium Finish Times Rank\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n998 985 1012 992 1005 989",
      "output": "Gold: 985, Silver: 989, Bronze: 992",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n1050 1020 1010",
      "output": "Gold: 1010, Silver: 1020, Bronze: 1050",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n998 985 1012 992 1005 989",
        "expectedOutput": "Gold: 985, Silver: 989, Bronze: 992",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n1050 1020 1010",
        "expectedOutput": "Gold: 1010, Silver: 1020, Bronze: 1050",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n998 985 1012 992 1005 989",
        "output": "Gold: 985, Silver: 989, Bronze: 992",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-09",
    "slug": "smart-meter-peak-load-sort",
    "title": "Smart Power Grid: Peak Megawatt Load Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given N power readings, sort in descending order. Print the sorted array and the highest peak reading.",
    "realtimeScenario": "National Power Distribution Grid: Sort hourly kilowatt-hour power consumption logs descending to schedule rolling substation maintenance.",
    "inputFormat": "First line: N.\nSecond line: N space-separated integers.",
    "outputFormat": "Line 1: N sorted integers descending.\nLine 2: \"Peak Load: P\"",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smart Power Grid: Peak Megawatt Load Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smart Power Grid: Peak Megawatt Load Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n340 720 190 850 610",
      "output": "850 720 610 340 190\nPeak Load: 850",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 200 150",
      "output": "200 150 100\nPeak Load: 200",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n340 720 190 850 610",
        "expectedOutput": "850 720 610 340 190\nPeak Load: 850",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 200 150",
        "expectedOutput": "200 150 100\nPeak Load: 200",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n340 720 190 850 610",
        "output": "850 720 610 340 190\nPeak Load: 850",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-10",
    "slug": "train-arrival-schedule-two-pointer-merge",
    "title": "Metro Transit: Two-Track Schedule Merge",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Given two sorted arrays A of size N1 and B of size N2, merge them into a single sorted array of size N1+N2 using the two-pointer merge algorithm in O(N1 + N2).",
    "realtimeScenario": "Railway Signaling Control: Platform 1 and Platform 2 have independently sorted arrival timetables. Merge both into a unified chronological schedule.",
    "inputFormat": "First line: N1 and N2.\nSecond line: N1 sorted integers.\nThird line: N2 sorted integers.",
    "outputFormat": "Print N1+N2 space-separated merged integers.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Metro Transit: Two-Track Schedule Merge\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Metro Transit: Two-Track Schedule Merge\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "3 4\n10 30 50\n20 40 60 70",
      "output": "10 20 30 40 50 60 70",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "2 2\n5 15\n10 20",
      "output": "5 10 15 20",
      "marks": 3
    },
    "testCases": [
      {
        "input": "3 4\n10 30 50\n20 40 60 70",
        "expectedOutput": "10 20 30 40 50 60 70",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "2 2\n5 15\n10 20",
        "expectedOutput": "5 10 15 20",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "3 4\n10 30 50\n20 40 60 70",
        "output": "10 20 30 40 50 60 70",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-11",
    "slug": "pos-billing-k-pass-bubble-sort",
    "title": "Supermarket POS: K-Pass Bubble Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Retail POS Terminal: Stop Bubble Sort after exactly K passes and display intermediate state.",
    "realtimeScenario": "Retail POS Terminal: Stop Bubble Sort after exactly K passes and display intermediate state.",
    "inputFormat": "First line: N and K.\nSecond line: N integers.",
    "outputFormat": "N space-separated integers after K passes.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Supermarket POS: K-Pass Bubble Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Supermarket POS: K-Pass Bubble Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5 2\n5 1 4 2 8",
      "output": "1 2 4 5 8",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4 1\n40 30 20 10",
      "output": "30 20 10 40",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5 2\n5 1 4 2 8",
        "expectedOutput": "1 2 4 5 8",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4 1\n40 30 20 10",
        "expectedOutput": "30 20 10 40",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5 2\n5 1 4 2 8",
        "output": "1 2 4 5 8",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-12",
    "slug": "network-qos-latency-search",
    "title": "QoS Packet Latency Binary Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Data Center Router: Find smallest ping latency >= threshold Q in sorted network telemetry log.",
    "realtimeScenario": "Data Center Router: Find smallest ping latency >= threshold Q in sorted network telemetry log.",
    "inputFormat": "First line: N.\nSecond line: N sorted integers.\nThird line: Q.",
    "outputFormat": "Latency or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: QoS Packet Latency Binary Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: QoS Packet Latency Binary Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n12 18 25 32 40\n20",
      "output": "25",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n5 10 15 20\n50",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n12 18 25 32 40\n20",
        "expectedOutput": "25",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n5 10 15 20\n50",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n12 18 25 32 40\n20",
        "output": "25",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-13",
    "slug": "freight-logistics-selection-sort",
    "title": "Cargo Truck Weight Selection Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Delivery Fleet: Sort package weights ascending and find package closest to limit W.",
    "realtimeScenario": "Delivery Fleet: Sort package weights ascending and find package closest to limit W.",
    "inputFormat": "First line: N.\nSecond line: N weights.\nThird line: limit W.",
    "outputFormat": "Sorted weights and closest weight.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cargo Truck Weight Selection Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cargo Truck Weight Selection Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n45 12 85 32 89\n50",
      "output": "12 32 45 85 89\nClosest: 45",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n10 20 30\n15",
      "output": "10 20 30\nClosest: 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n45 12 85 32 89\n50",
        "expectedOutput": "12 32 45 85 89\nClosest: 45",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n10 20 30\n15",
        "expectedOutput": "10 20 30\nClosest: 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n45 12 85 32 89\n50",
        "output": "12 32 45 85 89\nClosest: 45",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-14",
    "slug": "drone-elevation-waypoint-search",
    "title": "Drone Elevation Waypoint Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Autonomous UAV: Find waypoint index matching target altitude in ascending flight path.",
    "realtimeScenario": "Autonomous UAV: Find waypoint index matching target altitude in ascending flight path.",
    "inputFormat": "First line: N.\nSecond line: N sorted altitudes.\nThird line: Target H.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Drone Elevation Waypoint Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Drone Elevation Waypoint Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n100 250 400 550 700 850\n550",
      "output": "3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n50 100 150 200\n120",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n100 250 400 550 700 850\n550",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n50 100 150 200\n120",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n100 250 400 550 700 850\n550",
        "output": "3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-15",
    "slug": "placement-salary-ctc-rank-sort",
    "title": "Campus Placement CTC Ranking",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: University Placement Cell: Sort student job offer packages descending and report top 3 offers.",
    "realtimeScenario": "University Placement Cell: Sort student job offer packages descending and report top 3 offers.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N CTC offers.",
    "outputFormat": "Top 3 packages.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Campus Placement CTC Ranking\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Campus Placement CTC Ranking\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n8 14 6 25 12 18",
      "output": "25 18 14",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n10 12 11",
      "output": "12 11 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n8 14 6 25 12 18",
        "expectedOutput": "25 18 14",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n10 12 11",
        "expectedOutput": "12 11 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n8 14 6 25 12 18",
        "output": "25 18 14",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-16",
    "slug": "heatwave-alert-temperature-search",
    "title": "Heatwave Alert Temperature Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Meteorological Radar: Search for sensor temperature >= 45 C in sorted district records.",
    "realtimeScenario": "Meteorological Radar: Search for sensor temperature >= 45 C in sorted district records.",
    "inputFormat": "First line: N.\nSecond line: N sorted temperatures.\nThird line: Threshold T.",
    "outputFormat": "First temperature >= T or \"NORMAL\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Heatwave Alert Temperature Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Heatwave Alert Temperature Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n32 38 42 46 49\n45",
      "output": "46",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n28 30 35 40\n45",
      "output": "NORMAL",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n32 38 42 46 49\n45",
        "expectedOutput": "46",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n28 30 35 40\n45",
        "expectedOutput": "NORMAL",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n32 38 42 46 49\n45",
        "output": "46",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-17",
    "slug": "firewall-port-blacklist-search",
    "title": "Firewall Port Blacklist Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Cybersecurity Gateway: Verify if incoming network port P is in sorted blacklist table.",
    "realtimeScenario": "Cybersecurity Gateway: Verify if incoming network port P is in sorted blacklist table.",
    "inputFormat": "First line: N.\nSecond line: N sorted blacklisted ports.\nThird line: Port P.",
    "outputFormat": "\"BLOCKED\" or \"ALLOWED\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Firewall Port Blacklist Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Firewall Port Blacklist Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n21 22 23 80 443\n80",
      "output": "BLOCKED",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n25 110 143 993\n8080",
      "output": "ALLOWED",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n21 22 23 80 443\n80",
        "expectedOutput": "BLOCKED",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n25 110 143 993\n8080",
        "expectedOutput": "ALLOWED",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n21 22 23 80 443\n80",
        "output": "BLOCKED",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-18",
    "slug": "elevator-load-trimmed-mean-sort",
    "title": "Elevator Weight Trimmed Mean Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Smart Elevator: Sort sensor calibration weights ascending, discard min and max, compute average.",
    "realtimeScenario": "Smart Elevator: Sort sensor calibration weights ascending, discard min and max, compute average.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N weights.",
    "outputFormat": "Trimmed average integer.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Elevator Weight Trimmed Mean Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Elevator Weight Trimmed Mean Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n500 450 700 480 520",
      "output": "500",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n100 200 300 400",
      "output": "250",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n500 450 700 480 520",
        "expectedOutput": "500",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n100 200 300 400",
        "expectedOutput": "250",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n500 450 700 480 520",
        "output": "500",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-19",
    "slug": "telecom-5g-signal-rssi-ranking",
    "title": "5G Tower Signal RSSI Ranking",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Cellular Base Station: Sort tower RSSI signal power descending to hand off user to best tower.",
    "realtimeScenario": "Cellular Base Station: Sort tower RSSI signal power descending to hand off user to best tower.",
    "inputFormat": "First line: N.\nSecond line: N RSSI signal values (negative dBm).",
    "outputFormat": "N sorted values descending.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: 5G Tower Signal RSSI Ranking\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: 5G Tower Signal RSSI Ranking\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n-95 -72 -110 -65 -84",
      "output": "-65 -72 -84 -95 -110",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n-80 -70 -90",
      "output": "-70 -80 -90",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n-95 -72 -110 -65 -84",
        "expectedOutput": "-65 -72 -84 -95 -110",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n-80 -70 -90",
        "expectedOutput": "-70 -80 -90",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n-95 -72 -110 -65 -84",
        "output": "-65 -72 -84 -95 -110",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-20",
    "slug": "stock-trading-volume-ascending-sort",
    "title": "Stock Trading Volume Ascending Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Equity Brokerage: Sort stock ticker trading volumes ascending to isolate low-liquidity securities.",
    "realtimeScenario": "Equity Brokerage: Sort stock ticker trading volumes ascending to isolate low-liquidity securities.",
    "inputFormat": "First line: N.\nSecond line: N trading volumes.",
    "outputFormat": "Sorted volumes.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Stock Trading Volume Ascending Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Stock Trading Volume Ascending Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n45000 12000 98000 34000 5000",
      "output": "5000 12000 34000 45000 98000",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 50 200",
      "output": "50 100 200",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n45000 12000 98000 34000 5000",
        "expectedOutput": "5000 12000 34000 45000 98000",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 50 200",
        "expectedOutput": "50 100 200",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n45000 12000 98000 34000 5000",
        "output": "5000 12000 34000 45000 98000",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-21",
    "slug": "rideshare-driver-proximity-lookup",
    "title": "Ride-Share Driver Proximity Lookup",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Ride-Hailing App: Binary search the closest driver radius matching customer pickup zone.",
    "realtimeScenario": "Ride-Hailing App: Binary search the closest driver radius matching customer pickup zone.",
    "inputFormat": "First line: N.\nSecond line: N sorted distances.\nThird line: Target D.",
    "outputFormat": "Closest distance.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Ride-Share Driver Proximity Lookup\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Ride-Share Driver Proximity Lookup\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n200 450 800 1200 1500\n500",
      "output": "450",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n100 200 300 400\n250",
      "output": "200",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n200 450 800 1200 1500\n500",
        "expectedOutput": "450",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n100 200 300 400\n250",
        "expectedOutput": "200",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n200 450 800 1200 1500\n500",
        "output": "450",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-22",
    "slug": "automotive-defect-tolerance-sort",
    "title": "Automotive Defect Tolerance Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Car Engine Manufacturing: Sort micro-millimeter tolerance deviations using Insertion Sort.",
    "realtimeScenario": "Car Engine Manufacturing: Sort micro-millimeter tolerance deviations using Insertion Sort.",
    "inputFormat": "First line: N.\nSecond line: N tolerance values.",
    "outputFormat": "Sorted values.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Automotive Defect Tolerance Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Automotive Defect Tolerance Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n14 3 22 8 1",
      "output": "1 3 8 14 22",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n9 5 2",
      "output": "2 5 9",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n14 3 22 8 1",
        "expectedOutput": "1 3 8 14 22",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n9 5 2",
        "expectedOutput": "2 5 9",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n14 3 22 8 1",
        "output": "1 3 8 14 22",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-23",
    "slug": "solar-inverter-power-yield-sort",
    "title": "Solar Array Power Yield Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Solar Farm SCADA: Rank photovoltaic inverters by daily kWh output descending.",
    "realtimeScenario": "Solar Farm SCADA: Rank photovoltaic inverters by daily kWh output descending.",
    "inputFormat": "First line: N.\nSecond line: N kWh outputs.",
    "outputFormat": "Sorted outputs.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Solar Array Power Yield Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Solar Array Power Yield Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n350 480 290 510",
      "output": "510 480 350 290",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 300 200",
      "output": "300 200 100",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n350 480 290 510",
        "expectedOutput": "510 480 350 290",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 300 200",
        "expectedOutput": "300 200 100",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n350 480 290 510",
        "output": "510 480 350 290",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-24",
    "slug": "music-streaming-top-tracks-sort",
    "title": "Music Streaming Top Tracks Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Audio Streaming Platform: Sort song play streams descending and print Top 3 hits.",
    "realtimeScenario": "Audio Streaming Platform: Sort song play streams descending and print Top 3 hits.",
    "inputFormat": "First line: N (>= 3).\nSecond line: N play counts.",
    "outputFormat": "Top 3 play counts.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Music Streaming Top Tracks Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Music Streaming Top Tracks Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1200 5400 3100 9800 4200",
      "output": "9800 5400 4200",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n10 30 20",
      "output": "30 20 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1200 5400 3100 9800 4200",
        "expectedOutput": "9800 5400 4200",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n10 30 20",
        "expectedOutput": "30 20 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1200 5400 3100 9800 4200",
        "output": "9800 5400 4200",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-25",
    "slug": "cloud-server-cpu-threshold-search",
    "title": "Cloud VM CPU Threshold Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Cloud Autoscaler: Binary search for exact 80% CPU usage node to balance cluster load.",
    "realtimeScenario": "Cloud Autoscaler: Binary search for exact 80% CPU usage node to balance cluster load.",
    "inputFormat": "First line: N.\nSecond line: N sorted CPU usages.\nThird line: Target.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cloud VM CPU Threshold Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cloud VM CPU Threshold Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n35 50 68 80 92 98\n80",
      "output": "3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n20 40 60 75\n80",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n35 50 68 80 92 98\n80",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n20 40 60 75\n80",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n35 50 68 80 92 98\n80",
        "output": "3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-26",
    "slug": "f1-qualifying-lap-time-sort",
    "title": "Formula 1 Lap Time Interval Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Motorsport Telemetry: Sort qualifying lap times in milliseconds ascending to determine grid order.",
    "realtimeScenario": "Motorsport Telemetry: Sort qualifying lap times in milliseconds ascending to determine grid order.",
    "inputFormat": "First line: N.\nSecond line: N lap times.",
    "outputFormat": "Sorted lap times.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Formula 1 Lap Time Interval Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Formula 1 Lap Time Interval Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n78450 77920 78100 78990",
      "output": "77920 78100 78450 78990",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n80000 79000 81000",
      "output": "79000 80000 81000",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n78450 77920 78100 78990",
        "expectedOutput": "77920 78100 78450 78990",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n80000 79000 81000",
        "expectedOutput": "79000 80000 81000",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n78450 77920 78100 78990",
        "output": "77920 78100 78450 78990",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-27",
    "slug": "pharmacy-batch-expiry-search",
    "title": "Pharmacy Batch Expiry Binary Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Hospital Drug Inventory: Search for vaccine lot batch number in sorted pharmacy master ledger.",
    "realtimeScenario": "Hospital Drug Inventory: Search for vaccine lot batch number in sorted pharmacy master ledger.",
    "inputFormat": "First line: N.\nSecond line: N sorted batch numbers.\nThird line: Batch ID.",
    "outputFormat": "Found status and index.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Pharmacy Batch Expiry Binary Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Pharmacy Batch Expiry Binary Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1040 1045 1050 1055 1060\n1050",
      "output": "Batch 1050 found at shelf 2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n201 202 203 204\n299",
      "output": "Batch 299 NOT FOUND",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1040 1045 1050 1055 1060\n1050",
        "expectedOutput": "Batch 1050 found at shelf 2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n201 202 203 204\n299",
        "expectedOutput": "Batch 299 NOT FOUND",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1040 1045 1050 1055 1060\n1050",
        "output": "Batch 1050 found at shelf 2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-28",
    "slug": "atm-cash-replenishment-sort",
    "title": "ATM Currency Dispenser Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Bank Automated Teller Machine: Sort denomination cassette quantities descending.",
    "realtimeScenario": "Bank Automated Teller Machine: Sort denomination cassette quantities descending.",
    "inputFormat": "First line: N.\nSecond line: N quantities.",
    "outputFormat": "Sorted quantities.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: ATM Currency Dispenser Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: ATM Currency Dispenser Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n200 850 150 400",
      "output": "850 400 200 150",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n50 10 90",
      "output": "90 50 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n200 850 150 400",
        "expectedOutput": "850 400 200 150",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n50 10 90",
        "expectedOutput": "90 50 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n200 850 150 400",
        "output": "850 400 200 150",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-29",
    "slug": "cargo-container-ballast-sort",
    "title": "Maritime Container Ballast Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Container Ship Loadmaster: Sort shipping container metric tons ascending for optimal vessel trim.",
    "realtimeScenario": "Container Ship Loadmaster: Sort shipping container metric tons ascending for optimal vessel trim.",
    "inputFormat": "First line: N.\nSecond line: N weights.",
    "outputFormat": "Sorted weights.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Maritime Container Ballast Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Maritime Container Ballast Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n28 14 35 19 42",
      "output": "14 19 28 35 42",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n10 5 20",
      "output": "5 10 20",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n28 14 35 19 42",
        "expectedOutput": "14 19 28 35 42",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n10 5 20",
        "expectedOutput": "5 10 20",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n28 14 35 19 42",
        "output": "14 19 28 35 42",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-30",
    "slug": "academic-merit-rank-sort",
    "title": "University Merit Rank List Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Registrar Office: Sort student aggregate marks descending using Selection Sort.",
    "realtimeScenario": "Registrar Office: Sort student aggregate marks descending using Selection Sort.",
    "inputFormat": "First line: N.\nSecond line: N marks.",
    "outputFormat": "Sorted marks.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: University Merit Rank List Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: University Merit Rank List Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n78 92 64 88 95",
      "output": "95 92 88 78 64",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n50 80 60",
      "output": "80 60 50",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n78 92 64 88 95",
        "expectedOutput": "95 92 88 78 64",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n50 80 60",
        "expectedOutput": "80 60 50",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n78 92 64 88 95",
        "output": "95 92 88 78 64",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-31",
    "slug": "food-delivery-order-prep-sort",
    "title": "Kitchen Order Prep Time Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Cloud Kitchen: Sort pending meal preparation times ascending using Insertion Sort.",
    "realtimeScenario": "Cloud Kitchen: Sort pending meal preparation times ascending using Insertion Sort.",
    "inputFormat": "First line: N.\nSecond line: N prep minutes.",
    "outputFormat": "Sorted prep times.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Kitchen Order Prep Time Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Kitchen Order Prep Time Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n25 10 18 30 12",
      "output": "10 12 18 25 30",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n15 5 20",
      "output": "5 15 20",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n25 10 18 30 12",
        "expectedOutput": "10 12 18 25 30",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n15 5 20",
        "expectedOutput": "5 15 20",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n25 10 18 30 12",
        "output": "10 12 18 25 30",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-32",
    "slug": "earthquake-magnitude-binary-search",
    "title": "Seismic Richter Scale Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Geological Survey: Search for earthquake tremor >= magnitude threshold M.",
    "realtimeScenario": "Geological Survey: Search for earthquake tremor >= magnitude threshold M.",
    "inputFormat": "First line: N.\nSecond line: N sorted tremor readings (multiplied by 10).\nThird line: M.",
    "outputFormat": "First magnitude >= M or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Seismic Richter Scale Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Seismic Richter Scale Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n25 38 45 62 78\n40",
      "output": "45",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 30 35\n50",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n25 38 45 62 78\n40",
        "expectedOutput": "45",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n10 20 30 35\n50",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n25 38 45 62 78\n40",
        "output": "45",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-33",
    "slug": "traffic-camera-speed-violation-sort",
    "title": "Speed Camera Radar Enforcement Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Highway Police: Sort vehicle radar speeds descending and count speeders above 80 km/h.",
    "realtimeScenario": "Highway Police: Sort vehicle radar speeds descending and count speeders above 80 km/h.",
    "inputFormat": "First line: N.\nSecond line: N vehicle speeds.",
    "outputFormat": "Sorted speeds and violation count.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Speed Camera Radar Enforcement Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Speed Camera Radar Enforcement Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n65 92 84 75 110",
      "output": "110 92 84 75 65\nViolations: 3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n50 60 70",
      "output": "70 60 50\nViolations: 0",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n65 92 84 75 110",
        "expectedOutput": "110 92 84 75 65\nViolations: 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n50 60 70",
        "expectedOutput": "70 60 50\nViolations: 0",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n65 92 84 75 110",
        "output": "110 92 84 75 65\nViolations: 3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-34",
    "slug": "icu-cardiac-monitor-vital-search",
    "title": "ICU Cardiac Heart Rate Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Intensive Care Unit: Binary search for exact critical tachycardia pulse 140 bpm.",
    "realtimeScenario": "Intensive Care Unit: Binary search for exact critical tachycardia pulse 140 bpm.",
    "inputFormat": "First line: N.\nSecond line: N sorted heart rate logs.\nThird line: Target HR.",
    "outputFormat": "\"ALERT: At index [i]\" or \"STABLE\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: ICU Cardiac Heart Rate Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: ICU Cardiac Heart Rate Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n65 78 92 110 140 165\n140",
      "output": "ALERT: At index 4",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n60 70 80 90\n140",
      "output": "STABLE",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n65 78 92 110 140 165\n140",
        "expectedOutput": "ALERT: At index 4",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n60 70 80 90\n140",
        "expectedOutput": "STABLE",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n65 78 92 110 140 165\n140",
        "output": "ALERT: At index 4",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-35",
    "slug": "hotel-room-tariff-median-sort",
    "title": "Hotel Tariff Median Calculation",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Hospitality Pricing Analyst: Sort room tariffs ascending and extract the median room rate.",
    "realtimeScenario": "Hospitality Pricing Analyst: Sort room tariffs ascending and extract the median room rate.",
    "inputFormat": "First line: N (odd).\nSecond line: N tariffs.",
    "outputFormat": "Median room rate.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Hotel Tariff Median Calculation\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Hotel Tariff Median Calculation\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n3500 1200 8500 4500 2800",
      "output": "3500",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n1000 5000 2000",
      "output": "2000",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n3500 1200 8500 4500 2800",
        "expectedOutput": "3500",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n1000 5000 2000",
        "expectedOutput": "2000",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n3500 1200 8500 4500 2800",
        "output": "3500",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-36",
    "slug": "spacecraft-thruster-burn-lookup",
    "title": "Rocket Thruster Burn Time Lookup",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Aerospace Guidance: Binary search optimal thruster burn duration in precalculated lookup table.",
    "realtimeScenario": "Aerospace Guidance: Binary search optimal thruster burn duration in precalculated lookup table.",
    "inputFormat": "First line: N.\nSecond line: N sorted burn times.\nThird line: Target duration.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Rocket Thruster Burn Time Lookup\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Rocket Thruster Burn Time Lookup\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n120 240 360 480 600\n360",
      "output": "2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n100 200 300 400\n250",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n120 240 360 480 600\n360",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n100 200 300 400\n250",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n120 240 360 480 600\n360",
        "output": "2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-37",
    "slug": "soil-moisture-priority-sort",
    "title": "Smart Agriculture Soil Drought Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Precision Irrigation: Sort field sensor moisture percentages ascending to water driest sectors first.",
    "realtimeScenario": "Precision Irrigation: Sort field sensor moisture percentages ascending to water driest sectors first.",
    "inputFormat": "First line: N.\nSecond line: N moisture readings.",
    "outputFormat": "Sorted moisture percentages.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smart Agriculture Soil Drought Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smart Agriculture Soil Drought Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n42 18 35 12 50",
      "output": "12 18 35 42 50",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n20 10 30",
      "output": "10 20 30",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n42 18 35 12 50",
        "expectedOutput": "12 18 35 42 50",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n20 10 30",
        "expectedOutput": "10 20 30",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n42 18 35 12 50",
        "output": "12 18 35 42 50",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-38",
    "slug": "water-contaminant-ppm-search",
    "title": "Water Contaminant PPM Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Municipal Purification Plant: Search for contaminant reading exceeding safe potable 50 PPM.",
    "realtimeScenario": "Municipal Purification Plant: Search for contaminant reading exceeding safe potable 50 PPM.",
    "inputFormat": "First line: N.\nSecond line: N sorted PPM readings.\nThird line: Threshold 50.",
    "outputFormat": "Index or \"SAFE\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Water Contaminant PPM Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Water Contaminant PPM Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n12 25 38 55 72\n50",
      "output": "Contaminant detected at index 3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n10 15 20 25\n50",
      "output": "SAFE",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n12 25 38 55 72\n50",
        "expectedOutput": "Contaminant detected at index 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n10 15 20 25\n50",
        "expectedOutput": "SAFE",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n12 25 38 55 72\n50",
        "output": "Contaminant detected at index 3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-39",
    "slug": "railway-tatkal-waiting-list-sort",
    "title": "Tatkal Train Waiting List Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Railway Reservation: Sort confirmed passenger priority points descending.",
    "realtimeScenario": "Railway Reservation: Sort confirmed passenger priority points descending.",
    "inputFormat": "First line: N.\nSecond line: N priority scores.",
    "outputFormat": "Sorted scores.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Tatkal Train Waiting List Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Tatkal Train Waiting List Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n150 420 280 510",
      "output": "510 420 280 150",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n10 30 20",
      "output": "30 20 10",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n150 420 280 510",
        "expectedOutput": "510 420 280 150",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n10 30 20",
        "expectedOutput": "30 20 10",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n150 420 280 510",
        "output": "510 420 280 150",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-40",
    "slug": "fintech-top-purchases-sort",
    "title": "Credit Card Fraud Top Purchases Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Credit Risk Analysis: Sort high-value card charges descending and print sum of top 2 transactions.",
    "realtimeScenario": "Credit Risk Analysis: Sort high-value card charges descending and print sum of top 2 transactions.",
    "inputFormat": "First line: N (>= 2).\nSecond line: N transaction amounts.",
    "outputFormat": "Sum of top 2 amounts.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Credit Card Fraud Top Purchases Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Credit Card Fraud Top Purchases Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n450 1200 3400 890 2100",
      "output": "5500",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 500 200",
      "output": "700",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n450 1200 3400 890 2100",
        "expectedOutput": "5500",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 500 200",
        "expectedOutput": "700",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n450 1200 3400 890 2100",
        "output": "5500",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-41",
    "slug": "aqi-hazard-boundary-search",
    "title": "Air Quality Index Hazard Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Pollution Control Board: Search for first station logging AQI >= 300 (Severe).",
    "realtimeScenario": "Pollution Control Board: Search for first station logging AQI >= 300 (Severe).",
    "inputFormat": "First line: N.\nSecond line: N sorted AQI readings.\nThird line: 300.",
    "outputFormat": "Index or \"CLEAN\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Air Quality Index Hazard Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Air Quality Index Hazard Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n120 185 240 315 420\n300",
      "output": "Hazardous at station 3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n50 80 120 150\n300",
      "output": "CLEAN",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n120 185 240 315 420\n300",
        "expectedOutput": "Hazardous at station 3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n50 80 120 150\n300",
        "expectedOutput": "CLEAN",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n120 185 240 315 420\n300",
        "output": "Hazardous at station 3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-42",
    "slug": "wind-turbine-rpm-speed-sort",
    "title": "Wind Turbine RPM Speed Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Renewable Wind Farm: Sort generator turbine RPMs descending using Bubble Sort.",
    "realtimeScenario": "Renewable Wind Farm: Sort generator turbine RPMs descending using Bubble Sort.",
    "inputFormat": "First line: N.\nSecond line: N RPM readings.",
    "outputFormat": "Sorted RPMs.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Wind Turbine RPM Speed Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Wind Turbine RPM Speed Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1420 1850 1210 1950 1600",
      "output": "1950 1850 1600 1420 1210",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n1000 3000 2000",
      "output": "3000 2000 1000",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1420 1850 1210 1950 1600",
        "expectedOutput": "1950 1850 1600 1420 1210",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n1000 3000 2000",
        "expectedOutput": "3000 2000 1000",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1420 1850 1210 1950 1600",
        "output": "1950 1850 1600 1420 1210",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-43",
    "slug": "robotic-arm-bin-coordinate-search",
    "title": "Warehouse Robot Storage Bay Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Amazon Kiva Fulfillment: Binary search for target storage tote ID in sorted automated aisle.",
    "realtimeScenario": "Amazon Kiva Fulfillment: Binary search for target storage tote ID in sorted automated aisle.",
    "inputFormat": "First line: N.\nSecond line: N sorted tote IDs.\nThird line: Target tote.",
    "outputFormat": "Bay index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Warehouse Robot Storage Bay Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Warehouse Robot Storage Bay Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "6\n101 205 304 412 519 622\n412",
      "output": "3",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 30 40\n99",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "6\n101 205 304 412 519 622\n412",
        "expectedOutput": "3",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n10 20 30 40\n99",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "6\n101 205 304 412 519 622\n412",
        "output": "3",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-44",
    "slug": "crypto-bid-ask-order-sort",
    "title": "Crypto Exchange Spread Matcher",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: High Frequency Crypto Trader: Sort bid orders descending and ask orders ascending to find spread.",
    "realtimeScenario": "High Frequency Crypto Trader: Sort bid orders descending and ask orders ascending to find spread.",
    "inputFormat": "First line: N.\nSecond line: N bid prices.\nThird line: N ask prices.",
    "outputFormat": "Highest Bid and Lowest Ask.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Crypto Exchange Spread Matcher\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Crypto Exchange Spread Matcher\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "3\n50000 51200 49800\n51500 52000 51400",
      "output": "Highest Bid: 51200, Lowest Ask: 51400",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "2\n100 200\n300 400",
      "output": "Highest Bid: 200, Lowest Ask: 300",
      "marks": 3
    },
    "testCases": [
      {
        "input": "3\n50000 51200 49800\n51500 52000 51400",
        "expectedOutput": "Highest Bid: 51200, Lowest Ask: 51400",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "2\n100 200\n300 400",
        "expectedOutput": "Highest Bid: 200, Lowest Ask: 300",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "3\n50000 51200 49800\n51500 52000 51400",
        "output": "Highest Bid: 51200, Lowest Ask: 51400",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-45",
    "slug": "ev-charging-queue-soc-sort",
    "title": "EV Charging Battery SoC Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Tesla Supercharger Station: Sort EV battery charge states (0-100%) ascending to prioritize dead cars.",
    "realtimeScenario": "Tesla Supercharger Station: Sort EV battery charge states (0-100%) ascending to prioritize dead cars.",
    "inputFormat": "First line: N.\nSecond line: N battery percentages.",
    "outputFormat": "Sorted battery percentages.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: EV Charging Battery SoC Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: EV Charging Battery SoC Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n45 12 85 22 60",
      "output": "12 22 45 60 85",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n50 10 90",
      "output": "10 50 90",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n45 12 85 22 60",
        "expectedOutput": "12 22 45 60 85",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n50 10 90",
        "expectedOutput": "10 50 90",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n45 12 85 22 60",
        "output": "12 22 45 60 85",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-46",
    "slug": "gas-pipeline-pressure-search",
    "title": "Pipeline Gas Pressure Anomaly Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Trans-National Gas Pipeline: Binary search for abnormal pressure reading P in sorted transducer log.",
    "realtimeScenario": "Trans-National Gas Pipeline: Binary search for abnormal pressure reading P in sorted transducer log.",
    "inputFormat": "First line: N.\nSecond line: N sorted PSI readings.\nThird line: Target PSI P.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Pipeline Gas Pressure Anomaly Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Pipeline Gas Pressure Anomaly Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n650 720 800 890 980\n800",
      "output": "2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n500 600 700 800\n750",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n650 720 800 890 980\n800",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n500 600 700 800\n750",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n650 720 800 890 980\n800",
        "output": "2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-47",
    "slug": "blood-bank-inventory-lookup",
    "title": "Blood Bank Antigen Inventory Lookup",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Red Cross Emergency Blood Bank: Binary search for target blood unit ID in cryo-storage rack.",
    "realtimeScenario": "Red Cross Emergency Blood Bank: Binary search for target blood unit ID in cryo-storage rack.",
    "inputFormat": "First line: N.\nSecond line: N sorted unit IDs.\nThird line: Unit ID K.",
    "outputFormat": "\"FOUND\" or \"NOT FOUND\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Blood Bank Antigen Inventory Lookup\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Blood Bank Antigen Inventory Lookup\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n101 105 112 120 135\n112",
      "output": "FOUND",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n10 20 30 40\n25",
      "output": "NOT FOUND",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n101 105 112 120 135\n112",
        "expectedOutput": "FOUND",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n10 20 30 40\n25",
        "expectedOutput": "NOT FOUND",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n101 105 112 120 135\n112",
        "output": "FOUND",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-48",
    "slug": "airport-baggage-weight-sort",
    "title": "Airport Baggage Weight Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Airline Check-In: Sort checked luggage weights ascending using Insertion Sort to detect over-limit bags.",
    "realtimeScenario": "Airline Check-In: Sort checked luggage weights ascending using Insertion Sort to detect over-limit bags.",
    "inputFormat": "First line: N.\nSecond line: N bag weights in kg.",
    "outputFormat": "Sorted weights.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Airport Baggage Weight Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Airport Baggage Weight Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n23 15 32 18 28",
      "output": "15 18 23 28 32",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n20 10 30",
      "output": "10 20 30",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n23 15 32 18 28",
        "expectedOutput": "15 18 23 28 32",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n20 10 30",
        "expectedOutput": "10 20 30",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n23 15 32 18 28",
        "output": "15 18 23 28 32",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-49",
    "slug": "satellite-frequency-channel-search",
    "title": "Satellite Ground Station Frequency Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: ISRO Ground Telemetry: Binary search for satellite downlink MHz frequency in RF channel plan.",
    "realtimeScenario": "ISRO Ground Telemetry: Binary search for satellite downlink MHz frequency in RF channel plan.",
    "inputFormat": "First line: N.\nSecond line: N sorted MHz frequencies.\nThird line: Target frequency.",
    "outputFormat": "Channel index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Satellite Ground Station Frequency Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Satellite Ground Station Frequency Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n2200 2225 2250 2275 2300\n2250",
      "output": "2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n1000 1200 1400 1600\n1500",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n2200 2225 2250 2275 2300\n2250",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n1000 1200 1400 1600\n1500",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n2200 2225 2250 2275 2300\n2250",
        "output": "2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-50",
    "slug": "retail-clearance-discount-sort",
    "title": "Retail Clearance Discount Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Superstore Black Friday: Sort item discount percentages descending using Selection Sort.",
    "realtimeScenario": "Superstore Black Friday: Sort item discount percentages descending using Selection Sort.",
    "inputFormat": "First line: N.\nSecond line: N discount percentages.",
    "outputFormat": "Sorted percentages.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Retail Clearance Discount Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Retail Clearance Discount Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n20 70 40 10 50",
      "output": "70 50 40 20 10",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n30 90 60",
      "output": "90 60 30",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n20 70 40 10 50",
        "expectedOutput": "70 50 40 20 10",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n30 90 60",
        "expectedOutput": "90 60 30",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n20 70 40 10 50",
        "output": "70 50 40 20 10",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-51",
    "slug": "smartwatch-step-count-sort",
    "title": "Smartwatch Activity Step Count Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Health Fitness Tracker: Sort user daily step counts descending and report the personal best.",
    "realtimeScenario": "Health Fitness Tracker: Sort user daily step counts descending and report the personal best.",
    "inputFormat": "First line: N.\nSecond line: N step counts.",
    "outputFormat": "Sorted step counts and personal best.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smartwatch Activity Step Count Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Smartwatch Activity Step Count Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n8420 12500 6200 15400 9800",
      "output": "15400 12500 9800 8420 6200\nPersonal Best: 15400",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n5000 8000 6000",
      "output": "8000 6000 5000\nPersonal Best: 8000",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n8420 12500 6200 15400 9800",
        "expectedOutput": "15400 12500 9800 8420 6200\nPersonal Best: 15400",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n5000 8000 6000",
        "expectedOutput": "8000 6000 5000\nPersonal Best: 8000",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n8420 12500 6200 15400 9800",
        "output": "15400 12500 9800 8420 6200\nPersonal Best: 15400",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-52",
    "slug": "nuclear-reactor-coolant-temp-sort",
    "title": "Nuclear Core Temperature Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Nuclear Plant Monitoring: Sort fuel assembly coolant temperatures descending to locate hottest rods.",
    "realtimeScenario": "Nuclear Plant Monitoring: Sort fuel assembly coolant temperatures descending to locate hottest rods.",
    "inputFormat": "First line: N.\nSecond line: N core temperatures.",
    "outputFormat": "Sorted temperatures.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Nuclear Core Temperature Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Nuclear Core Temperature Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n285 340 310 380 295",
      "output": "380 340 310 295 285",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n200 400 300",
      "output": "400 300 200",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n285 340 310 380 295",
        "expectedOutput": "380 340 310 295 285",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n200 400 300",
        "expectedOutput": "400 300 200",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n285 340 310 380 295",
        "output": "380 340 310 295 285",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-53",
    "slug": "movie-box-office-revenue-search",
    "title": "Movie Studio Box Office Revenue Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Film Distribution Analyst: Binary search for movie gross earnings figure in sorted database.",
    "realtimeScenario": "Film Distribution Analyst: Binary search for movie gross earnings figure in sorted database.",
    "inputFormat": "First line: N.\nSecond line: N sorted revenue figures (in millions).\nThird line: Target revenue.",
    "outputFormat": "Index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Movie Studio Box Office Revenue Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Movie Studio Box Office Revenue Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n150 320 480 750 980\n480",
      "output": "2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n100 200 300 400\n250",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n150 320 480 750 980\n480",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n100 200 300 400\n250",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n150 320 480 750 980\n480",
        "output": "2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-54",
    "slug": "workout-calorie-burn-sort",
    "title": "Workout Calorie Burned Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Gym Workout Tracker: Sort calorie burn readings descending using Bubble Sort.",
    "realtimeScenario": "Gym Workout Tracker: Sort calorie burn readings descending using Bubble Sort.",
    "inputFormat": "First line: N.\nSecond line: N calorie burns.",
    "outputFormat": "Sorted calories.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Workout Calorie Burned Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Workout Calorie Burned Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n320 650 180 820 450",
      "output": "820 650 450 320 180",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n200 500 300",
      "output": "500 300 200",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n320 650 180 820 450",
        "expectedOutput": "820 650 450 320 180",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n200 500 300",
        "expectedOutput": "500 300 200",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n320 650 180 820 450",
        "output": "820 650 450 320 180",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-55",
    "slug": "expressway-fastag-timestamp-search",
    "title": "Expressway FASTag Timestamp Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: National Highway Toll: Binary search vehicle passage timestamp in sorted lane audit ledger.",
    "realtimeScenario": "National Highway Toll: Binary search vehicle passage timestamp in sorted lane audit ledger.",
    "inputFormat": "First line: N.\nSecond line: N sorted transaction timestamps.\nThird line: Vehicle time T.",
    "outputFormat": "Lane record index or -1.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Expressway FASTag Timestamp Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Expressway FASTag Timestamp Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1000 1025 1050 1075 1100\n1050",
      "output": "2",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n100 200 300 400\n150",
      "output": "-1",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1000 1025 1050 1075 1100\n1050",
        "expectedOutput": "2",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n100 200 300 400\n150",
        "expectedOutput": "-1",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1000 1025 1050 1075 1100\n1050",
        "output": "2",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-56",
    "slug": "ocean-bathymetry-sounding-sort",
    "title": "Ocean Bathymetry Depth Sounding Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Marine Research Sonar: Sort ocean depth soundings in meters ascending to locate undersea trench.",
    "realtimeScenario": "Marine Research Sonar: Sort ocean depth soundings in meters ascending to locate undersea trench.",
    "inputFormat": "First line: N.\nSecond line: N depths in meters.",
    "outputFormat": "Sorted depths.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Ocean Bathymetry Depth Sounding Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Ocean Bathymetry Depth Sounding Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n1850 4200 850 6300 2900",
      "output": "850 1850 2900 4200 6300",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n500 200 800",
      "output": "200 500 800",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n1850 4200 850 6300 2900",
        "expectedOutput": "850 1850 2900 4200 6300",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n500 200 800",
        "expectedOutput": "200 500 800",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n1850 4200 850 6300 2900",
        "output": "850 1850 2900 4200 6300",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-57",
    "slug": "cloud-storage-bucket-quota-sort",
    "title": "Cloud S3 Bucket Storage Quota Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: AWS Cloud Admin: Sort enterprise cloud S3 bucket sizes in GB descending to purge largest archives.",
    "realtimeScenario": "AWS Cloud Admin: Sort enterprise cloud S3 bucket sizes in GB descending to purge largest archives.",
    "inputFormat": "First line: N.\nSecond line: N bucket sizes.",
    "outputFormat": "Sorted sizes.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cloud S3 Bucket Storage Quota Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Cloud S3 Bucket Storage Quota Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "4\n450 1200 850 3100",
      "output": "3100 1200 850 450",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 500 200",
      "output": "500 200 100",
      "marks": 3
    },
    "testCases": [
      {
        "input": "4\n450 1200 850 3100",
        "expectedOutput": "3100 1200 850 450",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 500 200",
        "expectedOutput": "500 200 100",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "4\n450 1200 850 3100",
        "output": "3100 1200 850 450",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-58",
    "slug": "lidar-obstacle-braking-distance-search",
    "title": "Autonomous LiDAR Obstacle Distance Search",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Self-Driving Vehicle ADAS: Search for nearest obstacle distance within 15 meters in sorted sensor scan.",
    "realtimeScenario": "Self-Driving Vehicle ADAS: Search for nearest obstacle distance within 15 meters in sorted sensor scan.",
    "inputFormat": "First line: N.\nSecond line: N sorted obstacle distances.\nThird line: Safety threshold 15.",
    "outputFormat": "\"BRAKE: Distance [D]\" or \"CLEAR\".",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Autonomous LiDAR Obstacle Distance Search\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Autonomous LiDAR Obstacle Distance Search\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n8 14 22 35 50\n15",
      "output": "BRAKE: Distance 8",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "4\n20 30 40 50\n15",
      "output": "CLEAR",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n8 14 22 35 50\n15",
        "expectedOutput": "BRAKE: Distance 8",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "4\n20 30 40 50\n15",
        "expectedOutput": "CLEAR",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n8 14 22 35 50\n15",
        "output": "BRAKE: Distance 8",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-59",
    "slug": "forest-fire-thermal-hotspot-sort",
    "title": "Aerial Drone Thermal Hotspot Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Wildfire Aerial Surveillance: Sort infrared camera thermal pixel temperatures descending.",
    "realtimeScenario": "Wildfire Aerial Surveillance: Sort infrared camera thermal pixel temperatures descending.",
    "inputFormat": "First line: N.\nSecond line: N thermal readings.",
    "outputFormat": "Sorted temperatures.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Aerial Drone Thermal Hotspot Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Aerial Drone Thermal Hotspot Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n65 95 140 82 110",
      "output": "140 110 95 82 65",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n50 90 70",
      "output": "90 70 50",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n65 95 140 82 110",
        "expectedOutput": "140 110 95 82 65",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n50 90 70",
        "expectedOutput": "90 70 50",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n65 95 140 82 110",
        "output": "140 110 95 82 65",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  },
  {
    "id": "a4-ss-60",
    "slug": "financial-beta-volatility-sort",
    "title": "Quantitative Finance Stock Beta Sort",
    "category": "SEARCH_SORT_SCENARIO",
    "difficulty": "MEDIUM",
    "timeLimitMinutes": 40,
    "marks": 5,
    "openMarks": 2,
    "hiddenMarks": 3,
    "description": "Real-time Scenario: Wall Street Asset Management: Sort stock portfolio volatility Beta values (multiplied by 100) ascending.",
    "realtimeScenario": "Wall Street Asset Management: Sort stock portfolio volatility Beta values (multiplied by 100) ascending.",
    "inputFormat": "First line: N.\nSecond line: N Beta values.",
    "outputFormat": "Sorted Beta values.",
    "constraints": "1 <= N <= 100000\nElements fit within standard 32-bit signed integer limits.",
    "starterCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Quantitative Finance Stock Beta Sort\n    \n    return 0;\n}",
    "solutionCode": "#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1 || n < 1) return 0;\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &arr[i]);\n    \n    // TODO: Implement solution for: Quantitative Finance Stock Beta Sort\n    \n    return 0;\n}",
    "visibleTestCase1": {
      "input": "5\n120 85 150 95 110",
      "output": "85 95 110 120 150",
      "marks": 2,
      "explanation": "Verified system output for provided scenario parameters."
    },
    "hiddenTestCase": {
      "input": "3\n100 70 130",
      "output": "70 100 130",
      "marks": 3
    },
    "testCases": [
      {
        "input": "5\n120 85 150 95 110",
        "expectedOutput": "85 95 110 120 150",
        "marks": 2,
        "isHidden": false,
        "explanation": "Verified system output for provided scenario parameters."
      },
      {
        "input": "3\n100 70 130",
        "expectedOutput": "70 100 130",
        "marks": 3,
        "isHidden": true
      }
    ],
    "visibleTestCases": [
      {
        "input": "5\n120 85 150 95 110",
        "output": "85 95 110 120 150",
        "explanation": "Verified system output for provided scenario parameters."
      }
    ]
  }
];

export const A4_COMBINED_QUESTIONS: AssessmentQuestion[] = [
  ...A4_EASY_ARRAY_QUESTIONS,
  ...A4_MODERATE_SEARCH_SORT_QUESTIONS
];

/**
 * Returns pair of 2 personalized questions for a student based on their PRN:
 * 1 from A4_EASY_ARRAY_QUESTIONS (20 mins, 5 marks: 2 open + 3 hidden)
 * 1 from A4_MODERATE_SEARCH_SORT_QUESTIONS (40 mins, 5 marks: 2 open + 3 hidden)
 * Total: 60 Minutes (1 Hour), 10 Marks
 */
export function getStudentAssessment4Pair(studentPrnOrId: string): [AssessmentQuestion, AssessmentQuestion] {
  const cleanStr = String(studentPrnOrId || '').trim().toUpperCase();
  const digits = cleanStr.replace(/\D/g, '').slice(-4);
  let studentNumber = parseInt(digits, 10);

  if (isNaN(studentNumber)) {
    studentNumber = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      studentNumber = (studentNumber * 31 + cleanStr.charCodeAt(i)) >>> 0;
    }
  }

  const rollIndex = Math.abs(studentNumber);
  const easyIdx = rollIndex % A4_EASY_ARRAY_QUESTIONS.length;
  // Offset the second index with prime coprimes and batch multiplier so every student gets a unique pair
  const batchOffset = Math.floor(rollIndex / A4_EASY_ARRAY_QUESTIONS.length) * 17;
  const modIdx = Math.abs(rollIndex * 13 + batchOffset + 7) % A4_MODERATE_SEARCH_SORT_QUESTIONS.length;

  return [A4_EASY_ARRAY_QUESTIONS[easyIdx], A4_MODERATE_SEARCH_SORT_QUESTIONS[modIdx]];
}

export const ASSESSMENT_4_TEST = {
  id: 'test-assessment-4',
  title: 'Assessment 4: Arrays & Searching-Sorting',
  sectionTarget: 'All',
  sectionId: 'sec-all',
  durationMinutes: 60,
  totalMarks: 10,
  difficultyProfile: 'BALANCED' as const,
  lockOnSubmit: true,
  status: 'UPCOMING' as const,
  activeStudents: 0,
  totalEnrolled: 119,
  suspiciousEvents: 0,
  createdAt: '2026-11-20T18:30:00.000Z',
  unitTarget: 4 as const,
  questions: A4_COMBINED_QUESTIONS,
  questionCount: 2,
  antiCheatingRotation: true,
  randomiseQuestions: true,
  facultyEmail: 'logicqarena@gmail.com',
  facultyId: 'faculty-lead',
  createdBy: 'Faculty Lead',
  requireAttendance: false,
};
