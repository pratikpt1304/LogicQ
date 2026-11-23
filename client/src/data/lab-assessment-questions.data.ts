/**
 * Lab Assessment Questions Pool
 * Specially configured for Hariprasad Sir's Assessment Specifications:
 * 
 * - Question 1: Easy - Arrays (Direct Application Question) [20 Mins]
 *   1 Open Test Case (2 Marks) + 1 Hidden Test Case (3 Marks) = 5 Marks
 * 
 * - Question 2: Moderate - Searching & Sorting (Real-Time Scenario Based) [40 Mins]
 *   1 Open Test Case (2 Marks) + 1 Hidden Test Case (3 Marks) = 5 Marks
 * 
 * Total: 60 Minutes (1 Hour), 10 Marks
 */

export interface LabAssessmentQuestion {
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
}

export const LAB_EASY_ARRAY_QUESTIONS: LabAssessmentQuestion[] = [
  {
    id: 'lab-arr-01',
    slug: 'array-max-min-range',
    title: 'Array Range: Max-Min Difference',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers, find the absolute difference between the largest and smallest elements present in the array.',
    realtimeScenario: 'Direct hardware sensor telemetry processing: A sensor array captures temperature readings, and the system needs to find the maximum temperature spread across all sensor nodes.',
    inputFormat: 'First line contains integer N (size of array).\nSecond line contains N space-separated integers.',
    outputFormat: 'Print a single integer representing (Max - Min).',
    constraints: '2 <= N <= 1000\n-10000 <= elements <= 10000',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // TODO: Find max and min element in array and print (max - min)
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    int maxVal = arr[0];
    int minVal = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > maxVal) maxVal = arr[i];
        if (arr[i] < minVal) minVal = arr[i];
    }
    
    printf("%d\\n", maxVal - minVal);
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n10 4 22 8 3',
      output: '19',
      marks: 2,
      explanation: 'Maximum element is 22, minimum is 3. Difference = 22 - 3 = 19.',
    },
    hiddenTestCase: {
      input: '8\n-15 -3 40 12 -50 88 0 25',
      output: '138',
      marks: 3,
    },
  },
  {
    id: 'lab-arr-02',
    slug: 'array-even-odd-partition-count',
    title: 'Even and Odd Element Counter',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers, count how many elements are even and how many are odd, then print both counts.',
    realtimeScenario: 'Packet inspection: A networking switch separates network packets into control packets (even port numbers) and data packets (odd port numbers).',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print: Even: X, Odd: Y',
    constraints: '1 <= N <= 1000\nAll elements are non-negative integers.',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // TODO: Count even and odd numbers in array
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int evenCount = 0, oddCount = 0;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        if (val % 2 == 0) evenCount++;
        else oddCount++;
    }
    
    printf("Even: %d, Odd: %d\\n", evenCount, oddCount);
    return 0;
}
`,
    visibleTestCase1: {
      input: '6\n12 7 9 24 18 31',
      output: 'Even: 3, Odd: 3',
      marks: 2,
      explanation: 'Even numbers: 12, 24, 18 (3). Odd numbers: 7, 9, 31 (3).',
    },
    hiddenTestCase: {
      input: '10\n2 4 6 8 10 12 14 16 18 21',
      output: 'Even: 9, Odd: 1',
      marks: 3,
    },
  },
  {
    id: 'lab-arr-03',
    slug: 'array-in-place-reversal',
    title: 'In-Place Array Reversal',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers, reverse the order of elements in the array and print the resulting reversed array.',
    realtimeScenario: 'Audio signal buffer inversion: Digital signal processing reverses a short digital buffer for backward echo filtering.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the reversed elements separated by spaces.',
    constraints: '1 <= N <= 1000',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // TODO: Reverse the array and print elements space-separated
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // In-place two-pointer swap
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        int tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n1 2 3 4 5',
      output: '5 4 3 2 1',
      marks: 2,
      explanation: 'Array [1, 2, 3, 4, 5] reversed is [5, 4, 3, 2, 1].',
    },
    hiddenTestCase: {
      input: '7\n100 250 -45 0 999 12 34',
      output: '34 12 999 0 -45 250 100',
      marks: 3,
    },
  },
  {
    id: 'lab-arr-04',
    slug: 'array-running-prefix-sum',
    title: 'Running Prefix Sum Array',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers, compute the running prefix sum where output[i] = sum(arr[0] ... arr[i]). Print the resulting running sums.',
    realtimeScenario: 'Financial ledger cumulative balance: Daily transactions occur and the accounting software outputs cumulative end-of-day balance.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers.',
    outputFormat: 'Print N space-separated cumulative sums.',
    constraints: '1 <= N <= 1000',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // TODO: Calculate prefix running sums and print
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    long long running = 0;
    for (int i = 0; i < n; i++) {
        long long val;
        scanf("%lld", &val);
        running += val;
        printf("%lld%s", running, (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    return 0;
}
`,
    visibleTestCase1: {
      input: '4\n1 2 3 4',
      output: '1 3 6 10',
      marks: 2,
      explanation: 'Running sums: [1, 1+2=3, 3+3=6, 6+4=10].',
    },
    hiddenTestCase: {
      input: '6\n10 -5 15 -20 30 -10',
      output: '10 5 20 0 30 20',
      marks: 3,
    },
  },
  {
    id: 'lab-arr-05',
    slug: 'array-second-highest-finder',
    title: 'Second Largest Element in Array',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers (having at least two distinct values), find and print the second largest element in a single pass or linear scan.',
    realtimeScenario: 'Sports leaderboard: An athletic race timer needs to determine the runner-up score without sorting the entire array.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers.',
    outputFormat: 'Print the second largest integer.',
    constraints: '2 <= N <= 1000\nAt least two distinct numbers are guaranteed.',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // TODO: Find second largest element
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    int first = INT_MIN, second = INT_MIN;
    for (int i = 0; i < n; i++) {
        if (arr[i] > first) {
            second = first;
            first = arr[i];
        } else if (arr[i] > second && arr[i] != first) {
            second = arr[i];
        }
    }
    
    printf("%d\\n", second);
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n12 35 1 10 34',
      output: '34',
      marks: 2,
      explanation: 'Largest is 35, second largest is 34.',
    },
    hiddenTestCase: {
      input: '8\n50 90 90 85 40 10 89 20',
      output: '89',
      marks: 3,
    },
  },
  {
    id: 'lab-arr-06',
    slug: 'array-frequency-target-counter',
    title: 'Target Value Occurrence Frequency',
    category: 'ARRAY_DIRECT',
    difficulty: 'EASY',
    timeLimitMinutes: 20,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'Given an array of N integers and a search target K, count how many times K appears in the array.',
    realtimeScenario: 'Inventory auditing: A supermarket inventory barcode scanner verifies how many boxes of a specific product code K remain on shelf N.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers.\nThird line contains integer K (the target to count).',
    outputFormat: 'Print the count of occurrences.',
    constraints: '1 <= N <= 1000',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    int k;
    scanf("%d", &k);
    
    // TODO: Count occurrences of k
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    int k;
    scanf("%d", &k);
    
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (arr[i] == k) count++;
    }
    
    printf("%d\\n", count);
    return 0;
}
`,
    visibleTestCase1: {
      input: '6\n5 2 8 5 3 5\n5',
      output: '3',
      marks: 2,
      explanation: '5 appears 3 times in the array.',
    },
    hiddenTestCase: {
      input: '10\n44 12 44 44 99 44 12 12 44 0\n44',
      output: '5',
      marks: 3,
    },
  },
];

export const LAB_MODERATE_SEARCH_SORT_QUESTIONS: LabAssessmentQuestion[] = [
  {
    id: 'lab-ss-01',
    slug: 'library-isbn-binary-search',
    title: 'University Library Catalog: ISBN Binary Search',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'A university library digitizes its catalog of N book ISBN identifiers, which are sorted in strictly ascending order. Given a student inquiry with a target ISBN K, implement an efficient Binary Search algorithm to determine the shelf index (0-based) where the book resides. If not present, output "NOT FOUND".',
    realtimeScenario: 'Automated Library Kiosk: Students scan an ISBN at the digital kiosk, which performs logarithmic search across 100,000+ cataloged records to pinpoint shelf location instantaneously.',
    inputFormat: 'First line contains integer N.\nSecond line contains N sorted space-separated integers.\nThird line contains target ISBN K.',
    outputFormat: 'Print 0-based index of K, or "NOT FOUND" (without quotes).',
    constraints: '1 <= N <= 100000\nAll elements are sorted ascending.\nAlgorithm must run in O(log N) time.',
    starterCode: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    // TODO: Implement O(log N) binary search
    return -1;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    int target;
    scanf("%d", &target);
    
    int idx = binarySearch(arr, n, target);
    if (idx != -1) {
        printf("%d\\n", idx);
    } else {
        printf("NOT FOUND\\n");
    }
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int arr[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    int target;
    scanf("%d", &target);
    
    int idx = binarySearch(arr, n, target);
    if (idx != -1) {
        printf("%d\\n", idx);
    } else {
        printf("NOT FOUND\\n");
    }
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '7\n1001 1024 1050 1100 1205 1300 1450\n1100',
      output: '3',
      marks: 2,
      explanation: 'ISBN 1100 is located at index 3 in the sorted array.',
    },
    hiddenTestCase: {
      input: '8\n200 450 600 750 900 1200 1500 1800\n999',
      output: 'NOT FOUND',
      marks: 3,
    },
  },
  {
    id: 'lab-ss-02',
    slug: 'warehouse-package-weight-sorter',
    title: 'Logistics Hub: Package Weight Sorter (Ascending)',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'An automated Amazon fulfillment warehouse conveyor receives N packages with varying weights (in kilograms). Before loading onto cargo trucks, packages must be sorted in non-decreasing (ascending) order using an in-place sorting algorithm (Insertion, Selection, or Bubble sort).',
    realtimeScenario: 'Cargo Plane Weight Distribution: Pallet loaders require items sorted lightest to heaviest so heavier cargo is stacked at the floor baseline for flight stability.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers representing package weights.',
    outputFormat: 'Print the sorted weights separated by single spaces.',
    constraints: '1 <= N <= 2000\n1 <= weight <= 10000',
    starterCode: `#include <stdio.h>

void sortPackages(int arr[], int n) {
    // TODO: Implement sorting algorithm (ascending order)
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int weights[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &weights[i]);
    }
    
    sortPackages(weights, n);
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", weights[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

void sortPackages(int arr[], int n) {
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j = j - 1;
        }
        arr[j + 1] = key;
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int weights[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &weights[i]);
    }
    
    sortPackages(weights, n);
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", weights[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n45 12 85 32 8',
      output: '8 12 32 45 85',
      marks: 2,
      explanation: 'Weights sorted ascending: 8, 12, 32, 45, 85.',
    },
    hiddenTestCase: {
      input: '8\n540 120 900 34 890 2 450 110',
      output: '2 34 110 120 450 540 890 900',
      marks: 3,
    },
  },
  {
    id: 'lab-ss-03',
    slug: 'hospital-patient-triage-priority-sorter',
    title: 'Emergency Room Triage: Patient Urgency Sorter (Descending)',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'An emergency room intake desk registers N incoming patients with priority urgency scores from 1 (routine checkup) to 100 (critical trauma). The triage management system must sort the urgency scores in strictly descending order so doctors treat the highest severity patients first.',
    realtimeScenario: 'Disaster Relief Medical Unit: During a mass emergency, doctors must queue patients by critical severity score from highest to lowest immediately upon arrival.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers representing patient urgency scores.',
    outputFormat: 'Print the urgency scores sorted in descending order separated by spaces.',
    constraints: '1 <= N <= 2000\n1 <= score <= 100',
    starterCode: `#include <stdio.h>

void sortTriage(int arr[], int n) {
    // TODO: Sort patient urgency scores in descending order
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int scores[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &scores[i]);
    }
    
    sortTriage(scores, n);
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", scores[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

void sortTriage(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int maxIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] > arr[maxIdx]) maxIdx = j;
        }
        if (maxIdx != i) {
            int tmp = arr[i];
            arr[i] = arr[maxIdx];
            arr[maxIdx] = tmp;
        }
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int scores[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &scores[i]);
    }
    
    sortTriage(scores, n);
    
    for (int i = 0; i < n; i++) {
        printf("%d%s", scores[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n15 88 42 95 60',
      output: '95 88 60 42 15',
      marks: 2,
      explanation: 'Scores sorted descending: 95 (highest), 88, 60, 42, 15 (lowest).',
    },
    hiddenTestCase: {
      input: '8\n30 92 14 99 77 100 5 45',
      output: '100 99 92 77 45 30 14 5',
      marks: 3,
    },
  },
  {
    id: 'lab-ss-04',
    slug: 'power-grid-consumption-spike-detector',
    title: 'Smart Power Grid: Peak Consumption Spike Search',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'A municipal smart electrical grid logs N consecutive hourly kilowatt (kW) power readings. The grid supervisor defines an overload threshold T. Implement a linear scan search to find the FIRST hour index (0-based) where power consumption exceeds threshold T, and print both the hour index and the peak reading as "Overload at hour H: W kW". If no reading exceeds T, print "GRID OPERATING NORMALLY".',
    realtimeScenario: 'Substation Transformer Protection: Electrical relays scan high-frequency telemetry every hour to trip circuit breakers before power surges burn substations.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers (hourly readings).\nThird line contains integer T (overload threshold).',
    outputFormat: 'Print "Overload at hour H: W kW" or "GRID OPERATING NORMALLY".',
    constraints: '1 <= N <= 1000\n0 <= reading <= 50000\n0 <= T <= 50000',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int readings[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &readings[i]);
    }
    
    int threshold;
    scanf("%d", &threshold);
    
    // TODO: Find first reading > threshold
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int readings[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &readings[i]);
    }
    
    int threshold;
    scanf("%d", &threshold);
    
    int foundIdx = -1;
    for (int i = 0; i < n; i++) {
        if (readings[i] > threshold) {
            foundIdx = i;
            break;
        }
    }
    
    if (foundIdx != -1) {
        printf("Overload at hour %d: %d kW\\n", foundIdx, readings[foundIdx]);
    } else {
        printf("GRID OPERATING NORMALLY\\n");
    }
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n1200 1450 1900 2400 1800\n2000',
      output: 'Overload at hour 3: 2400 kW',
      marks: 2,
      explanation: 'At hour 3, 2400 kW is the first value strictly exceeding threshold 2000 kW.',
    },
    hiddenTestCase: {
      input: '6\n800 850 900 870 910 890\n1000',
      output: 'GRID OPERATING NORMALLY',
      marks: 3,
    },
  },
  {
    id: 'lab-ss-05',
    slug: 'railway-pnr-reservation-sorter',
    title: 'IRCTC Railway Charting: PNR Sorter & Target Verification',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'A railway reservation system receives N unorganized PNR identification numbers. To prepare the passenger reservation chart, sort the PNR numbers in ascending order. Then, given a passenger query PNR K, perform a search to check if PNR K is confirmed in the sorted chart. If found, print "CONFIRMED at position P" (1-based position in sorted list); otherwise print "WAITLISTED".',
    realtimeScenario: 'Railway Station Chart Display: Before train departure, the passenger reservation chart sorts thousands of PNR bookings so ticket examiners and travelers can verify confirmation status.',
    inputFormat: 'First line contains integer N.\nSecond line contains N integers representing PNR numbers.\nThird line contains integer K (query PNR).',
    outputFormat: 'Print "CONFIRMED at position P" or "WAITLISTED".',
    constraints: '1 <= N <= 2000\nPNRs are unique positive integers.',
    starterCode: `#include <stdio.h>

void sortPNRs(int arr[], int n) {
    // TODO: Sort PNR array ascending
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int pnrs[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &pnrs[i]);
    }
    
    int queryPnr;
    scanf("%d", &queryPnr);
    
    // TODO: Sort and locate queryPnr (1-based position)
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

void sortPNRs(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int pnrs[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &pnrs[i]);
    }
    
    int queryPnr;
    scanf("%d", &queryPnr);
    
    sortPNRs(pnrs, n);
    
    int pos = -1;
    for (int i = 0; i < n; i++) {
        if (pnrs[i] == queryPnr) {
            pos = i + 1; // 1-based position
            break;
        }
    }
    
    if (pos != -1) {
        printf("CONFIRMED at position %d\\n", pos);
    } else {
        printf("WAITLISTED\\n");
    }
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n5042 1021 8934 3012 6023\n3012',
      output: 'CONFIRMED at position 2',
      marks: 2,
      explanation: 'Sorted PNRs: [1021, 3012, 5042, 6023, 8934]. 3012 is at 1-based position 2.',
    },
    hiddenTestCase: {
      input: '6\n1122 9988 4455 3322 7788 5566\n6677',
      output: 'WAITLISTED',
      marks: 3,
    },
  },
  {
    id: 'lab-ss-06',
    slug: 'e-commerce-discount-binary-threshold',
    title: 'Flash Sale Inventory: Price Bracket Binary Search',
    category: 'SEARCH_SORT_SCENARIO',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 40,
    marks: 5,
    openMarks: 2,
    hiddenMarks: 3,
    description: 'An online shopping portal has N products already sorted in ascending order by price. A shopper sets a strict maximum budget B. Find the count of affordable items (all items with price <= B). Because N can be large, use binary search to locate the boundary in O(log N) time.',
    realtimeScenario: 'E-commerce Budget Filter: Instantaneous filter on product catalogs showing how many items a shopper can afford under a voucher limit B.',
    inputFormat: 'First line contains integer N.\nSecond line contains N sorted integers (prices).\nThird line contains integer B (budget).',
    outputFormat: 'Print: "Affordable Items: C" where C is the count of items with price <= B.',
    constraints: '1 <= N <= 100000\nPrices are sorted ascending.\n0 <= price, budget <= 1000000',
    starterCode: `#include <stdio.h>

int countAffordable(int prices[], int n, int budget) {
    // TODO: Binary search for the rightmost price <= budget
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int prices[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &prices[i]);
    }
    
    int budget;
    scanf("%d", &budget);
    
    int count = countAffordable(prices, n, budget);
    printf("Affordable Items: %d\\n", count);
    
    return 0;
}
`,
    solutionCode: `#include <stdio.h>

int countAffordable(int prices[], int n, int budget) {
    int low = 0, high = n - 1;
    int ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (prices[mid] <= budget) {
            ans = mid; // possible candidate, try right
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return ans + 1; // count is index + 1
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int prices[n];
    for (int i = 0; i < n; i++) {
        scanf("%d", &prices[i]);
    }
    
    int budget;
    scanf("%d", &budget);
    
    int count = countAffordable(prices, n, budget);
    printf("Affordable Items: %d\\n", count);
    
    return 0;
}
`,
    visibleTestCase1: {
      input: '5\n150 200 450 800 1200\n500',
      output: 'Affordable Items: 3',
      marks: 2,
      explanation: 'Items with price <= 500 are 150, 200, 450 (3 items).',
    },
    hiddenTestCase: {
      input: '7\n50 100 150 200 250 300 350\n40',
      output: 'Affordable Items: 0',
      marks: 3,
    },
  },
];

/**
 * Returns pair of 2 personalized questions for a student based on their PRN:
 * 1 from LAB_EASY_ARRAY_QUESTIONS (Easy Arrays, 20m, 5 marks: 2 open + 3 hidden)
 * 1 from LAB_MODERATE_SEARCH_SORT_QUESTIONS (Moderate Search/Sort Scenario, 40m, 5 marks: 2 open + 3 hidden)
 */
export function getStudentLabExamPair(studentPrnOrId: string): [LabAssessmentQuestion, LabAssessmentQuestion] {
  const cleanStr = String(studentPrnOrId || '').trim().toUpperCase();
  const digits = cleanStr.replace(/\D/g, '').slice(-4);
  let studentNumber = parseInt(digits, 10);

  if (isNaN(studentNumber)) {
    studentNumber = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      studentNumber = (studentNumber * 31 + cleanStr.charCodeAt(i)) >>> 0;
    }
  }

  const easyIdx = Math.abs(studentNumber) % LAB_EASY_ARRAY_QUESTIONS.length;
  // Offset the second index by a prime stride so adjacent students don't get the same combination
  const modIdx = Math.abs(studentNumber * 7 + 3) % LAB_MODERATE_SEARCH_SORT_QUESTIONS.length;

  return [LAB_EASY_ARRAY_QUESTIONS[easyIdx], LAB_MODERATE_SEARCH_SORT_QUESTIONS[modIdx]];
}

export const DEFAULT_HARIPRASAD_PRACTICAL_TEST = {
  id: 'test-continuous-arrays-search-sort',
  title: 'Continuous Practical Evaluation: Arrays & Searching-Sorting',
  sectionTarget: 'Integrated Mtech',
  durationMinutes: 60,
  totalMarks: 10,
  difficultyProfile: 'BALANCED' as const,
  lockOnSubmit: true,
  status: ((typeof window !== 'undefined' && localStorage.getItem('logicq_master_test_status')) || 'UPCOMING') as any,
  activeStudents: 0,
  totalEnrolled: 119,
  suspiciousEvents: 0,
  createdAt: '2026-11-19T20:00:00.000Z',
  unitTarget: 4 as const,
  questions: [...LAB_EASY_ARRAY_QUESTIONS, ...LAB_MODERATE_SEARCH_SORT_QUESTIONS],
  questionCount: 2,
  antiCheatingRotation: true,
  facultyEmail: 'hariprasathset@sanjivani.edu.in',
  facultyId: 'faculty-lead',
  createdBy: 'Hariprasad Sir',
  requireAttendance: false,
};

