import { PracticeProblemDef } from './practice-module1.data';

export const PRACTICE_MODULE_4_PROBLEMS: PracticeProblemDef[] = [
  // 1. Easy: Student Record with Highest Marks (struct)
  {
    slug: 'practice-m4-p1-struct-student-topper',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 1,
    title: 'Student Record Highest Marks',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Structures', 'Struct', 'Records'],
    description: `### Problem Description

Define a structure \`struct Student\` containing:
- \`int roll_no\`
- \`char name[50]\`
- \`int marks\`

Given N students, find the student with the highest marks. If there is a tie, output the one who appeared first in the input.

### Input Format
First line: an integer N (1 ≤ N ≤ 1000).
Next N lines: each line contains an integer roll number, a single-word name, and an integer mark separated by spaces (0 ≤ marks ≤ 100).

### Output Format
Print the roll number, name, and marks of the top student separated by spaces, followed by a newline.`,
    starterCode: `#include <stdio.h>

struct Student {
    int roll_no;
    char name[50];
    int marks;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Read students and find topper
    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct Student {
    int roll_no;
    char name[50];
    int marks;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    struct Student topper;
    for (int i = 0; i < n; i++) {
        struct Student s;
        if (scanf("%d %s %d", &s.roll_no, s.name, &s.marks) != 3) return 0;
        if (i == 0 || s.marks > topper.marks) {
            topper = s;
        }
    }
    printf("%d %s %d\\n", topper.roll_no, topper.name, topper.marks);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("1 Alice 100\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    int roll; char name[50]; int marks;
    for (int i = 0; i < n; i++) scanf("%d %s %d", &roll, name, &marks);
    printf("%d %s %d\\n", roll, name, marks); // Prints last student instead of topper
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '3\n101 Alice 92\n102 Bob 85\n103 Charlie 95\n', expectedOutput: '103 Charlie 95\n' },
      { input: '2\n1 David 90\n2 Emma 90\n', expectedOutput: '1 David 90\n' },
    ],
    hiddenTests: [
      { input: '1\n50 John 100\n', expectedOutput: '50 John 100\n' },
      { input: '4\n10 A 50\n20 B 60\n30 C 70\n40 D 80\n', expectedOutput: '40 D 80\n' },
      { input: '3\n1 X 40\n2 Y 99\n3 Z 12\n', expectedOutput: '2 Y 99\n' },
      { input: '3\n5 Alex 0\n6 Ben 0\n7 Carl 0\n', expectedOutput: '5 Alex 0\n' },
      { input: '5\n11 P 88\n12 Q 91\n13 R 74\n14 S 91\n15 T 80\n', expectedOutput: '12 Q 91\n' },
      { input: '2\n100 Rahul 65\n101 Rohan 72\n', expectedOutput: '101 Rohan 72\n' },
      { input: '4\n10 M 100\n20 N 100\n30 O 50\n40 P 100\n', expectedOutput: '10 M 100\n' },
      { input: '3\n1 Z 10\n2 Y 20\n3 X 30\n', expectedOutput: '3 X 30\n' },
    ],
  },

  // 2. Easy: Day of Week with Enum
  {
    slug: 'practice-m4-p2-enum-days-of-week',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 2,
    title: 'Day of Week Enum Mapper',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Enums', 'Types', 'Enum'],
    description: `### Problem Description

Define an \`enum Day\` where \`SUNDAY = 0, MONDAY = 1, TUESDAY = 2, WEDNESDAY = 3, THURSDAY = 4, FRIDAY = 5, SATURDAY = 6\`.
Given an integer day index D (0 ≤ D ≤ 6), print the corresponding day name in uppercase. If D < 0 or D > 6, print \`INVALID\`.

### Input Format
A single line containing an integer D (−100 ≤ D ≤ 100).

### Output Format
Print the day name (\`SUNDAY\`, \`MONDAY\`, \`TUESDAY\`, \`WEDNESDAY\`, \`THURSDAY\`, \`FRIDAY\`, \`SATURDAY\`) or \`INVALID\` followed by a newline.`,
    starterCode: `#include <stdio.h>

enum Day {
    SUNDAY = 0,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY
};

int main() {
    int d;
    if (scanf("%d", &d) != 1) return 0;
    // TODO: Map enum day to name or INVALID
    return 0;
}`,
    solutionCode: `#include <stdio.h>

enum Day {
    SUNDAY = 0,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY
};

const char *DAY_NAMES[] = {
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY"
};

int main() {
    int d;
    if (scanf("%d", &d) != 1) return 0;
    if (d >= 0 && d <= 6) {
        printf("%s\\n", DAY_NAMES[d]);
    } else {
        printf("INVALID\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int d; if (scanf("%d", &d) != 1) return 0;
    printf("SUNDAY\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int d; if (scanf("%d", &d) != 1) return 0;
    printf("INVALID\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '0\n', expectedOutput: 'SUNDAY\n' },
      { input: '5\n', expectedOutput: 'FRIDAY\n' },
    ],
    hiddenTests: [
      { input: '1\n', expectedOutput: 'MONDAY\n' },
      { input: '2\n', expectedOutput: 'TUESDAY\n' },
      { input: '3\n', expectedOutput: 'WEDNESDAY\n' },
      { input: '4\n', expectedOutput: 'THURSDAY\n' },
      { input: '6\n', expectedOutput: 'SATURDAY\n' },
      { input: '-1\n', expectedOutput: 'INVALID\n' },
      { input: '7\n', expectedOutput: 'INVALID\n' },
      { input: '100\n', expectedOutput: 'INVALID\n' },
    ],
  },

  // 3. Easy: Dynamic Array Allocation with malloc
  {
    slug: 'practice-m4-p3-dynamic-array-malloc',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 3,
    title: 'Dynamic Array Allocation with malloc',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Dynamic Memory', 'malloc', 'free', 'Pointers'],
    description: `### Problem Description

Dynamically allocate an array of N integers using \`malloc\`. Read the N integers into the allocated memory, compute the sum and minimum element, and ensure that the memory is released using \`free\`.

### Input Format
First line: an integer N (1 ≤ N ≤ 10⁵).
Second line: N space-separated integers (−10⁹ ≤ Aᵢ ≤ 10⁹).

### Output Format
Print the sum of elements and the minimum element separated by a single space, followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: allocate with malloc, compute sum and min, and free
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long *arr = (long long *)malloc((size_t)n * sizeof(long long));
    if (!arr) return 0;
    long long sum = 0;
    long long mn;
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &arr[i]) != 1) {
            free(arr);
            return 0;
        }
        if (i == 0 || arr[i] < mn) mn = arr[i];
        sum += arr[i];
    }
    printf("%lld %lld\\n", sum, mn);
    free(arr);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("0 0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) { long long x; scanf("%lld", &x); sum += x; }
    printf("%lld 0\\n", sum); // Min is always 0 bug
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '4\n10 20 -5 15\n', expectedOutput: '40 -5\n' },
      { input: '3\n5 5 5\n', expectedOutput: '15 5\n' },
    ],
    hiddenTests: [
      { input: '1\n42\n', expectedOutput: '42 42\n' },
      { input: '2\n-100 100\n', expectedOutput: '0 -100\n' },
      { input: '5\n1 2 3 4 5\n', expectedOutput: '15 1\n' },
      { input: '4\n-10 -20 -30 -40\n', expectedOutput: '-100 -40\n' },
      { input: '5\n1000000000 1000000000 0 -1000000000 500\n', expectedOutput: '1000000500 -1000000000\n' },
      { input: '3\n0 0 0\n', expectedOutput: '0 0\n' },
      { input: '6\n10 9 8 7 6 5\n', expectedOutput: '45 5\n' },
      { input: '2\n7 -3\n', expectedOutput: '4 -3\n' },
    ],
  },

  // 4. Easy: 2D Point Euclidean Squared Distance (struct)
  {
    slug: 'practice-m4-p4-struct-point-distance',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 4,
    title: 'Point Distance Squared (struct)',
    difficulty: 'EASY',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Structures', 'Geometry', 'Math'],
    description: `### Problem Description

Define a structure \`struct Point\` with coordinates \`long long x\` and \`long long y\`.
Given two points P₁(x₁, y₁) and P₂(x₂, y₂), write a function to calculate the squared Euclidean distance:
(x₂ - x₁)² + (y₂ - y₁)²### Input Format
First line: two space-separated integersx₁andy₁(−10⁶ ≤ x₁, y₁ ≤ 10⁶).
Second line: two space-separated integersx₂andy₂(−10⁶ ≤ x₂, y₂ ≤ 10⁶).

### Output Format
Print the squared distance followed by a newline.`,
    starterCode: `#include <stdio.h>

struct Point {
    long long x;
    long long y;
};

int main() {
    struct Point p1, p2;
    if (scanf("%lld %lld", &p1.x, &p1.y) != 2) return 0;
    if (scanf("%lld %lld", &p2.x, &p2.y) != 2) return 0;
    // TODO: Calculate squared distance
    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct Point {
    long long x;
    long long y;
};

int main() {
    struct Point p1, p2;
    if (scanf("%lld %lld", &p1.x, &p1.y) != 2) return 0;
    if (scanf("%lld %lld", &p2.x, &p2.y) != 2) return 0;
    long long dx = p2.x - p1.x;
    long long dy = p2.y - p1.y;
    long long dist_sq = dx * dx + dy * dy;
    printf("%lld\\n", dist_sq);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    long long x1, y1, x2, y2;
    if (scanf("%lld %lld %lld %lld", &x1, &y1, &x2, &y2) != 4) return 0;
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    long long x1, y1, x2, y2;
    if (scanf("%lld %lld %lld %lld", &x1, &y1, &x2, &y2) != 4) return 0;
    printf("%lld\\n", (x2 - x1) + (y2 - y1)); // Manually sum diffs without square
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
      { input: '0 0\n3 4\n', expectedOutput: '25\n' },
      { input: '1 1\n4 5\n', expectedOutput: '25\n' },
    ],
    hiddenTests: [
      { input: '0 0\n0 0\n', expectedOutput: '0\n' },
      { input: '-3 -4\n3 4\n', expectedOutput: '100\n' },
      { input: '100 200\n100 200\n', expectedOutput: '0\n' },
      { input: '1000 0\n0 1000\n', expectedOutput: '2000000\n' },
      { input: '-5 12\n0 0\n', expectedOutput: '169\n' },
      { input: '10 20\n30 40\n', expectedOutput: '800\n' },
      { input: '-1000000 -1000000\n1000000 1000000\n', expectedOutput: '8000000000000\n' },
      { input: '1 2\n1 9\n', expectedOutput: '49\n' },
    ],
  },

  // 5. Medium: Sort Students by Marks Descending using qsort
  {
    slug: 'practice-m4-p5-struct-marks-sort',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 5,
    title: 'Sort Students by Marks Descending',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Structures', 'qsort', 'Sorting'],
    description: `### Problem Description

Given N student records each with a roll number, single-word name, and marks, sort all records in descending order of marks using the C standard library \`qsort\`. If two students have the same marks, preserve their original relative order (or break ties by smaller roll number).

### Input Format
First line: an integer N (1 ≤ N ≤ 1000).
Next N lines: each line contains an integer roll number, name, and integer mark (0 ≤ marks ≤ 100).

### Output Format
Print the sorted records, one per line, with roll number, name, and mark separated by spaces.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Student {
    int roll_no;
    char name[50];
    int marks;
};

// TODO: Define comparator for qsort

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    // TODO: Read, sort and print
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Student {
    int roll_no;
    char name[50];
    int marks;
};

int compare_students(const void *a, const void *b) {
    const struct Student *sa = (const struct Student *)a;
    const struct Student *sb = (const struct Student *)b;
    if (sb->marks != sa->marks) {
        return sb->marks - sa->marks; // Descending by marks
    }
    return sa->roll_no - sb->roll_no; // Ascending by roll
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    struct Student students[1005];
    for (int i = 0; i < n; i++) {
        if (scanf("%d %s %d", &students[i].roll_no, students[i].name, &students[i].marks) != 3) return 0;
    }
    qsort(students, (size_t)n, sizeof(struct Student), compare_students);
    for (int i = 0; i < n; i++) {
        printf("%d %s %d\\n", students[i].roll_no, students[i].name, students[i].marks);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    for (int i = 0; i < n; i++) {
        int r; char s[50]; int m; scanf("%d %s %d", &r, s, &m);
        printf("%d %s %d\\n", r, s, m); // Unsorted output
    }
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; if (scanf("%d", &n) != 1) return 0;
    printf("1 A 100\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      {
        input: '3\n101 Alice 85\n102 Bob 95\n103 Charlie 90\n',
        expectedOutput: '102 Bob 95\n103 Charlie 90\n101 Alice 85\n',
      },
      {
        input: '2\n2 Bob 90\n1 Alice 90\n',
        expectedOutput: '1 Alice 90\n2 Bob 90\n',
      },
    ],
    hiddenTests: [
      { input: '1\n1 Single 100\n', expectedOutput: '1 Single 100\n' },
      {
        input: '3\n1 A 50\n2 B 60\n3 C 70\n',
        expectedOutput: '3 C 70\n2 B 60\n1 A 50\n',
      },
      {
        input: '4\n4 D 10\n1 A 90\n3 C 50\n2 B 75\n',
        expectedOutput: '1 A 90\n2 B 75\n3 C 50\n4 D 10\n',
      },
      {
        input: '3\n3 X 80\n1 Y 80\n2 Z 80\n',
        expectedOutput: '1 Y 80\n2 Z 80\n3 X 80\n',
      },
      {
        input: '5\n10 E 20\n20 D 40\n30 C 60\n40 B 80\n50 A 100\n',
        expectedOutput: '50 A 100\n40 B 80\n30 C 60\n20 D 40\n10 E 20\n',
      },
      {
        input: '2\n5 M 0\n6 N 100\n',
        expectedOutput: '6 N 100\n5 M 0\n',
      },
      {
        input: '3\n100 Tom 77\n101 Jerry 88\n102 Spike 66\n',
        expectedOutput: '101 Jerry 88\n100 Tom 77\n102 Spike 66\n',
      },
      {
        input: '2\n2 Beta 50\n1 Alpha 50\n',
        expectedOutput: '1 Alpha 50\n2 Beta 50\n',
      },
    ],
  },

  // 6. Medium: Dynamic 2D Array Allocation and Row Sums
  {
    slug: 'practice-m4-p6-dynamic-2d-array-malloc',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 6,
    title: 'Dynamic 2D Array Allocation and Sum',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Dynamic Memory', '2D Arrays', 'Pointers to Pointers', 'malloc'],
    description: `### Problem Description

Dynamically allocate a 2D matrix of R rows and C columns using an array of pointers \`long long **mat = malloc(R * sizeof(long long *))\` where each row is allocated with \`malloc(C * sizeof(long long))\`. Read the elements, compute the sum of each row, print the sums, and deallocate all dynamically allocated memory using \`free\`.

### Input Format
First line: two integers R and C (1 ≤ R, C ≤ 500).
Next R lines: each line contains C space-separated integers (−10⁹ ≤ M_{i,j} ≤ 10⁹).

### Output Format
Print R space-separated integers representing the row sums on a single line, followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    // TODO: Dynamic 2D allocation, row sum computation, and clean free
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    long long **mat = (long long **)malloc((size_t)r * sizeof(long long *));
    if (!mat) return 0;
    for (int i = 0; i < r; i++) {
        mat[i] = (long long *)malloc((size_t)c * sizeof(long long));
    }
    for (int i = 0; i < r; i++) {
        long long sum = 0;
        for (int j = 0; j < c; j++) {
            if (scanf("%lld", &mat[i][j]) != 1) return 0;
            sum += mat[i][j];
        }
        printf("%lld%c", sum, (i == r - 1 ? '\\n' : ' '));
    }
    for (int i = 0; i < r; i++) {
        free(mat[i]);
    }
    free(mat);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int r, c; if (scanf("%d %d", &r, &c) != 2) return 0;
    for (int i = 0; i < r; i++) printf("1%c", i == r - 1 ? '\\n' : ' ');
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '2 3\n1 2 3\n4 5 6\n', expectedOutput: '6 15\n' },
      { input: '3 2\n-1 1\n10 20\n-5 -5\n', expectedOutput: '0 30 -10\n' },
    ],
    hiddenTests: [
      { input: '1 1\n42\n', expectedOutput: '42\n' },
      { input: '1 3\n10 20 30\n', expectedOutput: '60\n' },
      { input: '3 1\n5\n10\n15\n', expectedOutput: '5 10 15\n' },
      { input: '2 2\n1000000000 1000000000\n-1000000000 -1000000000\n', expectedOutput: '2000000000 -2000000000\n' },
      { input: '4 2\n1 1\n2 2\n3 3\n4 4\n', expectedOutput: '2 4 6 8\n' },
      { input: '3 3\n0 0 0\n0 0 0\n0 0 0\n', expectedOutput: '0 0 0\n' },
      { input: '2 4\n-1 -2 -3 -4\n1 2 3 4\n', expectedOutput: '-10 10\n' },
      { input: '3 2\n100 200\n300 400\n500 600\n', expectedOutput: '300 700 1100\n' },
    ],
  },

  // 7. Medium: Dynamic String Duplication and Reversal (strdup/malloc)
  {
    slug: 'practice-m4-p7-dynamic-string-reverse',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 7,
    title: 'Dynamic String Reversal',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Dynamic Memory', 'Strings', 'malloc'],
    description: `### Problem Description

Given a string S, dynamically allocate memory using \`malloc\` for a copy of the string, reverse the string characters into the allocated buffer, and print the reversed string. Free the allocated memory before exiting.

### Input Format
A single line containing a single non-empty word without whitespace (1 ≤ |S| ≤ 10⁵).

### Output Format
Print the dynamically reversed string followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    static char buf[100005];
    if (scanf("%s", buf) != 1) return 0;
    // TODO: malloc reversed string, print, and free
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    static char buf[100005];
    if (scanf("%s", buf) != 1) return 0;
    int len = (int)strlen(buf);
    char *rev = (char *)malloc((size_t)(len + 1) * sizeof(char));
    if (!rev) return 0;
    for (int i = 0; i < len; i++) {
        rev[i] = buf[len - 1 - i];
    }
    rev[len] = '\\0';
    printf("%s\\n", rev);
    free(rev);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    static char buf[100005];
    if (scanf("%s", buf) != 1) return 0;
    printf("%s\\n", buf); // Does not reverse
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    static char buf[100005];
    if (scanf("%s", buf) != 1) return 0;
    printf("EMPTY\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: 'hello\n', expectedOutput: 'olleh\n' },
      { input: 'LogicQ\n', expectedOutput: 'QcigoL\n' },
    ],
    hiddenTests: [
      { input: 'a\n', expectedOutput: 'a\n' },
      { input: 'ab\n', expectedOutput: 'ba\n' },
      { input: 'radar\n', expectedOutput: 'radar\n' },
      { input: '123456789\n', expectedOutput: '987654321\n' },
      { input: 'DynamicMemory\n', expectedOutput: 'yromeMcimanyD\n' },
      { input: 'C11Standard\n', expectedOutput: 'dradnatS11C\n' },
      { input: 'Programming\n', expectedOutput: 'gnimmargorP\n' },
      { input: 'DataStructures\n', expectedOutput: 'serutcurtSataD\n' },
    ],
  },

  // 8. Medium: Nested Struct Date Comparison
  {
    slug: 'practice-m4-p8-nested-struct-date-compare',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 8,
    title: 'Nested Struct Date Comparison',
    difficulty: 'MEDIUM',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Structures', 'Nested Struct', 'Dates'],
    description: `### Problem Description

Define a structure \`struct Date\` with members \`int day\`, \`int month\`, and \`int year\`.
Given two dates $D_1$ and $D_2$:
- Output \`EARLIER\` if $D_1 < D_2$
- Output \`LATER\` if $D_1 > D_2$
- Output \`SAME\` if $D_1 = D_2$

### Input Format
First line: three integers representing $D_1$ (\`day month year\`).
Second line: three integers representing $D_2$ (\`day month year\`).
($1 \\le day \\le 31, 1 \\le month \\le 12, 1900 \\le year \\le 2100$).

### Output Format
Print \`EARLIER\`, \`LATER\`, or \`SAME\` followed by a newline.`,
    starterCode: `#include <stdio.h>

struct Date {
    int day;
    int month;
    int year;
};

int main() {
    struct Date d1, d2;
    if (scanf("%d %d %d", &d1.day, &d1.month, &d1.year) != 3) return 0;
    if (scanf("%d %d %d", &d2.day, &d2.month, &d2.year) != 3) return 0;
    // TODO: Compare dates
    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct Date {
    int day;
    int month;
    int year;
};

int main() {
    struct Date d1, d2;
    if (scanf("%d %d %d", &d1.day, &d1.month, &d1.year) != 3) return 0;
    if (scanf("%d %d %d", &d2.day, &d2.month, &d2.year) != 3) return 0;
    if (d1.year < d2.year) {
        printf("EARLIER\\n");
    } else if (d1.year > d2.year) {
        printf("LATER\\n");
    } else if (d1.month < d2.month) {
        printf("EARLIER\\n");
    } else if (d1.month > d2.month) {
        printf("LATER\\n");
    } else if (d1.day < d2.day) {
        printf("EARLIER\\n");
    } else if (d1.day > d2.day) {
        printf("LATER\\n");
    } else {
        printf("SAME\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int d1, m1, y1, d2, m2, y2;
    if (scanf("%d %d %d %d %d %d", &d1, &m1, &y1, &d2, &m2, &y2) != 6) return 0;
    printf("SAME\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int d1, m1, y1, d2, m2, y2;
    if (scanf("%d %d %d %d %d %d", &d1, &m1, &y1, &d2, &m2, &y2) != 6) return 0;
    if (d1 < d2) printf("EARLIER\\n"); // Compares only days, ignores years/months!
    else printf("LATER\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
      { input: '15 8 2026\n26 1 2027\n', expectedOutput: 'EARLIER\n' },
      { input: '1 1 2025\n1 1 2025\n', expectedOutput: 'SAME\n' },
    ],
    hiddenTests: [
      { input: '31 12 2024\n1 1 2025\n', expectedOutput: 'EARLIER\n' },
      { input: '10 5 2025\n9 5 2025\n', expectedOutput: 'LATER\n' },
      { input: '15 6 2020\n15 7 2020\n', expectedOutput: 'EARLIER\n' },
      { input: '28 2 2024\n28 2 2024\n', expectedOutput: 'SAME\n' },
      { input: '1 1 2100\n31 12 2099\n', expectedOutput: 'LATER\n' },
      { input: '10 10 2000\n10 10 1999\n', expectedOutput: 'LATER\n' },
      { input: '5 12 2023\n6 12 2023\n', expectedOutput: 'EARLIER\n' },
      { input: '20 11 2022\n20 10 2022\n', expectedOutput: 'LATER\n' },
    ],
  },

  // 9. Hard: Dynamic Resizable Array (Vector Push and Pop)
  {
    slug: 'practice-m4-p9-dynamic-vector-realloc',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 9,
    title: 'Dynamic Resizable Array with realloc',
    difficulty: 'HARD',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Dynamic Memory', 'realloc', 'Vector', 'Data Structures'],
    description: `### Problem Description

Implement a dynamically resizable vector of integers using \`malloc\` and \`realloc\`. The vector starts with capacity 2 and size 0.
Handle Q operations:
- \`PUSH X\`: Append integer X. If size equals capacity, double capacity using \`realloc\`.
- \`POP\`: Remove the last element if non-empty. If empty, print \`EMPTY\`.
- \`GET I\`: Print the element at 0-based index I. If index is invalid, print \`OUT_OF_BOUNDS\`.
- \`SIZE\`: Print current number of elements and capacity formatted as \`<size> <capacity>\`.

### Input Format
First line: an integer Q (1 ≤ Q ≤ 10⁵).
Next Q lines: each line contains an operation as described above.

### Output Format
For each \`GET\`, \`SIZE\`, or invalid \`POP\` operation, print the resulting output on a new line.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// TODO: Implement dynamic resizable vector

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    // Process operations
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    int capacity = 2;
    int size = 0;
    long long *data = (long long *)malloc((size_t)capacity * sizeof(long long));
    if (!data) return 0;

    char cmd[20];
    while (q--) {
        if (scanf("%s", cmd) != 1) break;
        if (strcmp(cmd, "PUSH") == 0) {
            long long val;
            if (scanf("%lld", &val) != 1) break;
            if (size == capacity) {
                capacity *= 2;
                data = (long long *)realloc(data, (size_t)capacity * sizeof(long long));
            }
            data[size++] = val;
        } else if (strcmp(cmd, "POP") == 0) {
            if (size > 0) {
                size--;
            } else {
                printf("EMPTY\\n");
            }
        } else if (strcmp(cmd, "GET") == 0) {
            int idx;
            if (scanf("%d", &idx) != 1) break;
            if (idx >= 0 && idx < size) {
                printf("%lld\\n", data[idx]);
            } else {
                printf("OUT_OF_BOUNDS\\n");
            }
        } else if (strcmp(cmd, "SIZE") == 0) {
            printf("%d %d\\n", size, capacity);
        }
    }

    free(data);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    printf("0 2\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        char cmd[20]; scanf("%s", cmd);
        if (cmd[0] == 'S') printf("0 2\\n");
        else if (cmd[0] == 'G') printf("OUT_OF_BOUNDS\\n");
        else if (cmd[1] == 'O') printf("EMPTY\\n");
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      {
        input: '7\nPUSH 10\nPUSH 20\nSIZE\nPUSH 30\nSIZE\nGET 1\nGET 3\n',
        expectedOutput: '2 2\n3 4\n20\nOUT_OF_BOUNDS\n',
      },
      {
        input: '3\nPOP\nPUSH 5\nPOP\n',
        expectedOutput: 'EMPTY\n',
      },
    ],
    hiddenTests: [
      {
        input: '4\nSIZE\nPUSH 100\nGET 0\nSIZE\n',
        expectedOutput: '0 2\n100\n1 2\n',
      },
      {
        input: '5\nPUSH 1\nPUSH 2\nPUSH 3\nPUSH 4\nSIZE\n',
        expectedOutput: '4 4\n',
      },
      {
        input: '6\nPUSH 1\nPUSH 2\nPUSH 3\nPUSH 4\nPUSH 5\nSIZE\n',
        expectedOutput: '5 8\n',
      },
      {
        input: '4\nGET 0\nGET -1\nGET 5\nPOP\n',
        expectedOutput: 'OUT_OF_BOUNDS\nOUT_OF_BOUNDS\nOUT_OF_BOUNDS\nEMPTY\n',
      },
      {
        input: '6\nPUSH 42\nGET 0\nPOP\nGET 0\nPOP\nSIZE\n',
        expectedOutput: '42\nOUT_OF_BOUNDS\nEMPTY\n0 2\n',
      },
      {
        input: '5\nPUSH 10\nPUSH 20\nPOP\nPUSH 30\nGET 1\n',
        expectedOutput: '30\n',
      },
      {
        input: '4\nPUSH 99\nPUSH 88\nGET 1\nGET 0\n',
        expectedOutput: '88\n99\n',
      },
      {
        input: '3\nSIZE\nPOP\nSIZE\n',
        expectedOutput: '0 2\nEMPTY\n0 2\n',
      },
    ],
  },

  // 10. Hard: Singly Linked List via Dynamic Nodes
  {
    slug: 'practice-m4-p10-singly-linked-list',
    moduleSlug: 'advanced-data-types-dynamic-memory',
    moduleOrder: 10,
    title: 'Singly Linked List with Dynamic Nodes',
    difficulty: 'HARD',
    category: 'Advanced Data Types, Dynamic Memory',
    tags: ['Dynamic Memory', 'Linked List', 'Data Structures', 'malloc'],
    description: `### Problem Description

Implement a singly linked list using dynamically allocated nodes:
\`\`\`c
struct Node {
    long long data;
    struct Node *next;
};
\`\`\`
Process Q operations:
- \`INSERT_HEAD X\`: Insert X at the front of the list.
- \`INSERT_TAIL X\`: Insert X at the end of the list.
- \`DELETE_HEAD\`: Delete the front node. If list is empty, print \`EMPTY\`.
- \`PRINT\`: Print all elements in the list from head to tail separated by spaces, or \`EMPTY\` if the list is empty.

Free all remaining nodes before program termination.

### Input Format
First line: an integer Q (1 ≤ Q ≤ 10⁴).
Next Q lines: each line contains an operation as described above.

### Output Format
Print the output for each \`DELETE_HEAD\` (when empty) and \`PRINT\` operation on a new line.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Node {
    long long data;
    struct Node *next;
};

// TODO: Implement linked list operations

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    // Process queries
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Node {
    long long data;
    struct Node *next;
};

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    struct Node *head = NULL;
    struct Node *tail = NULL;

    char cmd[30];
    while (q--) {
        if (scanf("%s", cmd) != 1) break;
        if (strcmp(cmd, "INSERT_HEAD") == 0) {
            long long val;
            if (scanf("%lld", &val) != 1) break;
            struct Node *node = (struct Node *)malloc(sizeof(struct Node));
            node->data = val;
            node->next = head;
            head = node;
            if (!tail) tail = node;
        } else if (strcmp(cmd, "INSERT_TAIL") == 0) {
            long long val;
            if (scanf("%lld", &val) != 1) break;
            struct Node *node = (struct Node *)malloc(sizeof(struct Node));
            node->data = val;
            node->next = NULL;
            if (tail) {
                tail->next = node;
                tail = node;
            } else {
                head = tail = node;
            }
        } else if (strcmp(cmd, "DELETE_HEAD") == 0) {
            if (!head) {
                printf("EMPTY\\n");
            } else {
                struct Node *temp = head;
                head = head->next;
                if (!head) tail = NULL;
                free(temp);
            }
        } else if (strcmp(cmd, "PRINT") == 0) {
            if (!head) {
                printf("EMPTY\\n");
            } else {
                struct Node *curr = head;
                while (curr) {
                    printf("%lld%c", curr->data, (curr->next ? ' ' : '\\n'));
                    curr = curr->next;
                }
            }
        }
    }

    // Clean up
    while (head) {
        struct Node *temp = head;
        head = head->next;
        free(temp);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    printf("EMPTY\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int q; if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        char cmd[30]; scanf("%s", cmd);
        if (cmd[0] == 'P') printf("EMPTY\\n");
        else if (cmd[0] == 'D') printf("EMPTY\\n");
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
      {
        input: '6\nINSERT_HEAD 10\nINSERT_TAIL 20\nPRINT\nDELETE_HEAD\nPRINT\nDELETE_HEAD\n',
        expectedOutput: '10 20\n20\n',
      },
      {
        input: '3\nPRINT\nDELETE_HEAD\nPRINT\n',
        expectedOutput: 'EMPTY\nEMPTY\nEMPTY\n',
      },
    ],
    hiddenTests: [
      {
        input: '5\nINSERT_HEAD 1\nINSERT_HEAD 2\nINSERT_HEAD 3\nPRINT\nDELETE_HEAD\n',
        expectedOutput: '3 2 1\n',
      },
      {
        input: '5\nINSERT_TAIL 1\nINSERT_TAIL 2\nINSERT_TAIL 3\nPRINT\nDELETE_HEAD\n',
        expectedOutput: '1 2 3\n',
      },
      {
        input: '4\nINSERT_HEAD 5\nDELETE_HEAD\nDELETE_HEAD\nPRINT\n',
        expectedOutput: 'EMPTY\nEMPTY\n',
      },
      {
        input: '6\nINSERT_TAIL 100\nINSERT_HEAD 50\nINSERT_TAIL 200\nPRINT\nDELETE_HEAD\nPRINT\n',
        expectedOutput: '50 100 200\n100 200\n',
      },
      {
        input: '4\nDELETE_HEAD\nDELETE_HEAD\nPRINT\nDELETE_HEAD\n',
        expectedOutput: 'EMPTY\nEMPTY\nEMPTY\nEMPTY\n',
      },
      {
        input: '5\nINSERT_HEAD 42\nPRINT\nDELETE_HEAD\nPRINT\nDELETE_HEAD\n',
        expectedOutput: '42\nEMPTY\nEMPTY\n',
      },
      {
        input: '6\nINSERT_TAIL 1\nINSERT_TAIL 2\nDELETE_HEAD\nDELETE_HEAD\nINSERT_TAIL 3\nPRINT\n',
        expectedOutput: '3\n',
      },
      {
        input: '5\nINSERT_HEAD 9\nINSERT_HEAD 8\nDELETE_HEAD\nINSERT_HEAD 7\nPRINT\n',
        expectedOutput: '7 9\n',
      },
    ],
  },
  {
    slug: "practice-m4-p11-complex-number-addition-struct",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 11,
    title: "Complex Numbers Addition with Structures",
    difficulty: "EASY",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Structures","Complex Numbers","Data Types","Formatting"],
    description: `### Problem Description

Define a structure \`struct Complex\` with two double fields: \`real\` and \`imag\`.
Write a function:
\`\`\`c
struct Complex addComplex(struct Complex a, struct Complex b);
\`\`\`
that adds two complex numbers: \$(r_1 + i_1 i) + (r_2 + i_2 i) = (r_1 + r_2) + (i_1 + i_2)i\$.

Print the sum formatted with two decimal places.
If the imaginary part is non-negative, format as: \`%.2f + %.2fi\\n\`
If the imaginary part is negative, format as: \`%.2f - %.2fi\\n\` (with positive imaginary value). Note: if a component is within \$10^{-9}\$ of zero, normalize \$-0.00\$ to \$0.00\$.

### Input Format
Four space-separated floating-point numbers \$r_1, i_1, r_2, i_2\$.

### Output Format
Print the formatted sum followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <math.h>

struct Complex {
    double real;
    double imag;
};

struct Complex addComplex(struct Complex a, struct Complex b) {
    // TODO: Add complex numbers
    struct Complex res = {0, 0};
    return res;
}

int main() {
    struct Complex c1, c2;
    if (scanf("%lf %lf %lf %lf", &c1.real, &c1.imag, &c2.real, &c2.imag) != 4) return 0;
    struct Complex sum = addComplex(c1, c2);
    // TODO: Format output
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <math.h>

struct Complex {
    double real;
    double imag;
};

struct Complex addComplex(struct Complex a, struct Complex b) {
    struct Complex res;
    res.real = a.real + b.real;
    res.imag = a.imag + b.imag;
    return res;
}

int main() {
    struct Complex c1, c2;
    if (scanf("%lf %lf %lf %lf", &c1.real, &c1.imag, &c2.real, &c2.imag) != 4) return 0;
    struct Complex sum = addComplex(c1, c2);
    if (fabs(sum.real) < 1e-9) sum.real = 0.0;
    if (fabs(sum.imag) < 1e-9) sum.imag = 0.0;
    if (sum.imag >= 0.0) {
        printf("%.2f + %.2fi\\n", sum.real, sum.imag);
    } else {
        printf("%.2f - %.2fi\\n", sum.real, -sum.imag);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0.00 + 0.00i\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    double r1, i1, r2, i2;
    scanf("%lf %lf %lf %lf", &r1, &i1, &r2, &i2);
    printf("%.2f + %.2fi\\n", r1 + r2, i1 + i2); // Fails negative imaginary sign formatting
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "2.5 3.0 1.5 2.0\n",
                "expectedOutput": "4.00 + 5.00i\n"
          },
          {
                "input": "3.0 1.0 2.0 -4.0\n",
                "expectedOutput": "5.00 - 3.00i\n"
          }
    ],
    hiddenTests: [
          {
                "input": "0.0 0.0 0.0 0.0\n",
                "expectedOutput": "0.00 + 0.00i\n"
          },
          {
                "input": "-5.2 -3.1 5.2 3.1\n",
                "expectedOutput": "0.00 + 0.00i\n"
          },
          {
                "input": "-10.5 0.0 2.5 -5.5\n",
                "expectedOutput": "-8.00 - 5.50i\n"
          }
    ],
  },
  {
    slug: "practice-m4-p12-dynamic-array-calloc-zero-init",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 12,
    title: "Zero-Initialized Dynamic Array via calloc",
    difficulty: "EASY",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Dynamic Memory","calloc","Heap","free"],
    description: `### Problem Description

Write a C program that dynamically allocates an array of \$N\$ 64-bit integers on the heap using \`calloc\`:
\`\`\`c
long long *arr = (long long *)calloc(n, sizeof(long long));
\`\`\`
Verify that \`calloc\` initializes all elements to zero. Then, populate each element at index \$i\$ (\$0 \\le i < N\$) with \$(i + 1)^2\$.
Calculate and print the sum of all elements, then properly release the heap allocation with \`free(arr)\`.

### Input Format
A single integer \$N\$ (\$1 \\le N \\le 10^5\$).

### Output Format
Print the total sum followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Allocate with calloc, populate with (i+1)^2, sum, and free
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *arr = (long long *)calloc(n, sizeof(long long));
    if (!arr) return 1;

    unsigned long long sum = 0;
    for (int i = 0; i < n; i++) {
        long long val = (long long)(i + 1) * (i + 1);
        arr[i] = val;
        sum += arr[i];
    }
    printf("%llu\\n", sum);
    free(arr);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("0\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    printf("%d\\n", n * (n + 1) / 2); // Linear sum instead of square sum
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "3\n",
                "expectedOutput": "14\n"
          },
          {
                "input": "1\n",
                "expectedOutput": "1\n"
          }
    ],
    hiddenTests: [
          {
                "input": "5\n",
                "expectedOutput": "55\n"
          },
          {
                "input": "10\n",
                "expectedOutput": "385\n"
          },
          {
                "input": "100\n",
                "expectedOutput": "338350\n"
          },
          {
                "input": "1000\n",
                "expectedOutput": "333833500\n"
          }
    ],
  },
  {
    slug: "practice-m4-p13-enum-traffic-light-state-machine",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 13,
    title: "Traffic Light Finite State Machine with Enums",
    difficulty: "EASY",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Enums","State Machine","Switch","Data Types"],
    description: `### Problem Description

Define an enumerated type representing the states of a traffic light:
\`\`\`c
typedef enum {
    LIGHT_RED,
    LIGHT_GREEN,
    LIGHT_YELLOW
} TrafficLight;
\`\`\`
The traffic light transitions cyclically:
- \`LIGHT_RED\` \$\\to\$ \`LIGHT_GREEN\`
- \`LIGHT_GREEN\` \$\\to\$ \`LIGHT_YELLOW\`
- \`LIGHT_YELLOW\` \$\\to\$ \`LIGHT_RED\`.

Given the initial state string (\`RED\`, \`GREEN\`, or \`YELLOW\`) and an integer \$K\$, compute the state after \$K\$ transitions.

### Input Format
A single line containing the initial state string and an integer \$K\$ (\$0 \\le K \\le 10^9\$).

### Output Format
Print the resulting state name (\`RED\`, \`GREEN\`, or \`YELLOW\`) followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <string.h>

typedef enum {
    LIGHT_RED,
    LIGHT_GREEN,
    LIGHT_YELLOW
} TrafficLight;

int main() {
    char state[16];
    long long k;
    if (scanf("%15s %lld", state, &k) != 2) return 0;
    
    // TODO: Determine final state after k transitions
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

typedef enum {
    LIGHT_RED = 0,
    LIGHT_GREEN = 1,
    LIGHT_YELLOW = 2
} TrafficLight;

int main() {
    char state[16];
    long long k;
    if (scanf("%15s %lld", state, &k) != 2) return 0;
    TrafficLight current = LIGHT_RED;
    if (strcmp(state, "GREEN") == 0) current = LIGHT_GREEN;
    else if (strcmp(state, "YELLOW") == 0) current = LIGHT_YELLOW;

    current = (TrafficLight)((current + (k % 3)) % 3);

    if (current == LIGHT_RED) printf("RED\\n");
    else if (current == LIGHT_GREEN) printf("GREEN\\n");
    else printf("YELLOW\\n");
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("RED\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    char s[16]; long long k;
    scanf("%s %lld", s, &k);
    printf("%s\\n", s); // Fails state transitions
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "RED 1\n",
                "expectedOutput": "GREEN\n"
          },
          {
                "input": "GREEN 2\n",
                "expectedOutput": "RED\n"
          }
    ],
    hiddenTests: [
          {
                "input": "YELLOW 0\n",
                "expectedOutput": "YELLOW\n"
          },
          {
                "input": "RED 3\n",
                "expectedOutput": "RED\n"
          },
          {
                "input": "YELLOW 1000000000\n",
                "expectedOutput": "RED\n"
          },
          {
                "input": "GREEN 5\n",
                "expectedOutput": "YELLOW\n"
          }
    ],
  },
  {
    slug: "practice-m4-p14-struct-employee-salary-filter",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 14,
    title: "Employee Record Salary Filter with Structs",
    difficulty: "EASY",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Structures","Records","Filtering","Formatting"],
    description: `### Problem Description

Define a structure \`struct Employee\` with fields:
- \`int id\`
- \`char name[32]\`
- \`double salary\`

Given \$N\$ employee records and a threshold salary \$T\$, filter and print all employees whose salary is greater than or equal to \$T\$ in the original input order.
Format each employee as:
\`id name %.2f\`
If no employee meets the threshold, print \`NONE\`.

### Input Format
- Line 1: Two values: \$N\$ (\$1 \\le N \\le 100\$) and \$T\$ (\$0.0 \\le T \\le 10^7\$).
- Next \$N\$ lines: \`id name salary\`.

### Output Format
Print the qualifying employees, each on a new line, or \`NONE\` followed by a newline.`,
    starterCode: `#include <stdio.h>

struct Employee {
    int id;
    char name[32];
    double salary;
};

int main() {
    int n;
    double threshold;
    if (scanf("%d %lf", &n, &threshold) != 2) return 0;
    
    // TODO: Read N employee structs, filter and print >= threshold
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>

struct Employee {
    int id;
    char name[32];
    double salary;
};

int main() {
    int n;
    double threshold;
    if (scanf("%d %lf", &n, &threshold) != 2) return 0;
    struct Employee emps[105];
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%d %31s %lf", &emps[i].id, emps[i].name, &emps[i].salary) != 3) return 0;
        if (emps[i].salary >= threshold) {
            printf("%d %s %.2f\\n", emps[i].id, emps[i].name, emps[i].salary);
            count++;
        }
    }
    if (count == 0) {
        printf("NONE\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("NONE\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; double t;
    scanf("%d %lf", &n, &t);
    for (int i = 0; i < n; i++) {
        int id; char name[32]; double s;
        scanf("%d %s %lf", &id, name, &s);
        printf("%d %s %.2f\\n", id, name, s); // Prints all without filtering
    }
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 10,
    sampleTests: [
          {
                "input": "3 50000.00\n101 Alice 62000.50\n102 Bob 45000.00\n103 Charlie 75000.00\n",
                "expectedOutput": "101 Alice 62000.50\n103 Charlie 75000.00\n"
          },
          {
                "input": "2 100000.00\n1 Sam 30000.00\n2 Dan 40000.00\n",
                "expectedOutput": "NONE\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 500.00\n100 Chief 500.00\n",
                "expectedOutput": "100 Chief 500.00\n"
          },
          {
                "input": "4 20000.00\n1 A 19999.99\n2 B 20000.00\n3 C 25000.00\n4 D 15000.00\n",
                "expectedOutput": "2 B 20000.00\n3 C 25000.00\n"
          }
    ],
  },
  {
    slug: "practice-m4-p15-linked-list-delete-node-by-value",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 15,
    title: "Singly Linked List Delete First Node by Value",
    difficulty: "MEDIUM",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Linked List","Pointers","Dynamic Memory","Deletion"],
    description: `### Problem Description

Given a singly linked list with \$N\$ integer nodes, delete the **first occurrence** of a node having value \$X\$.
If \$X\$ matches the head node, update the head pointer. Ensure that the memory of the deleted node is freed with \`free()\`.

Print the remaining node values separated by spaces. If the list becomes completely empty, print \`EMPTY\`.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 1000\$).
- Line 2: \$N\$ space-separated integers.
- Line 3: An integer \$X\$ to delete.

### Output Format
Print the space-separated values of the remaining linked list or \`EMPTY\` followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

// TODO: Implement append and deleteByValue functions

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Build list, delete x, print result
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    struct Node *head = NULL;
    struct Node *tail = NULL;
    for (int i = 0; i < n; i++) {
        int val;
        if (scanf("%d", &val) != 1) return 0;
        struct Node *newNode = (struct Node *)malloc(sizeof(struct Node));
        newNode->data = val;
        newNode->next = NULL;
        if (!head) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
    }
    int x;
    if (scanf("%d", &x) != 1) return 0;

    // Delete first occurrence of x
    struct Node *curr = head;
    struct Node *prev = NULL;
    while (curr) {
        if (curr->data == x) {
            if (!prev) {
                head = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            break;
        }
        prev = curr;
        curr = curr->next;
    }

    if (!head) {
        printf("EMPTY\\n");
    } else {
        struct Node *p = head;
        int first = 1;
        while (p) {
            printf("%s%d", first ? "" : " ", p->data);
            first = 0;
            struct Node *tmp = p;
            p = p->next;
            free(tmp);
        }
        printf("\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("EMPTY\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; scanf("%d", &n);
    for (int i = 0; i < n; i++) { int v; scanf("%d", &v); printf("%d ", v); }
    printf("\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "5\n10 20 30 20 50\n20\n",
                "expectedOutput": "10 30 20 50\n"
          },
          {
                "input": "1\n100\n100\n",
                "expectedOutput": "EMPTY\n"
          }
    ],
    hiddenTests: [
          {
                "input": "3\n5 10 15\n5\n",
                "expectedOutput": "10 15\n"
          },
          {
                "input": "3\n5 10 15\n15\n",
                "expectedOutput": "5 10\n"
          },
          {
                "input": "4\n1 2 3 4\n99\n",
                "expectedOutput": "1 2 3 4\n"
          },
          {
                "input": "2\n10 20\n20\n",
                "expectedOutput": "10\n"
          }
    ],
  },
  {
    slug: "practice-m4-p16-dynamic-stack-push-pop-malloc",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 16,
    title: "Dynamic Heap Stack with malloc and realloc",
    difficulty: "MEDIUM",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Stack","Dynamic Memory","malloc","realloc","Data Structures"],
    description: `### Problem Description

Implement an expandable LIFO Stack using dynamic memory (\`malloc\`, \`realloc\`, \`free\`).
The stack starts with an initial capacity of \$2\$. When a \`PUSH\` occurs and the stack is full, double its capacity using \`realloc\`.

Process \$Q\$ commands:
- \`PUSH X\`: Push integer \$X\$ onto stack.
- \`POP\`: Pop the top integer and print it. If the stack is empty, print \`UNDERFLOW\`.
- \`PEEK\`: Print the top integer without removing it. If the stack is empty, print \`EMPTY\`.

### Input Format
- Line 1: An integer \$Q\$ (\$1 \\le Q \\le 1000\$).
- Next \$Q\$ lines: A command string (\`PUSH X\`, \`POP\`, or \`PEEK\`).

### Output Format
Print the output of each \`POP\` and \`PEEK\` command on a new line.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// TODO: Implement Dynamic Stack with PUSH, POP, PEEK

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Process stack operations
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int *data;
    int top;
    int capacity;
} DynamicStack;

void push(DynamicStack *s, int val) {
    if (s->top + 1 >= s->capacity) {
        s->capacity *= 2;
        s->data = (int *)realloc(s->data, s->capacity * sizeof(int));
    }
    s->data[++(s->top)] = val;
}

void pop(DynamicStack *s) {
    if (s->top < 0) {
        printf("UNDERFLOW\\n");
    } else {
        printf("%d\\n", s->data[(s->top)--]);
    }
}

void peek(DynamicStack *s) {
    if (s->top < 0) {
        printf("EMPTY\\n");
    } else {
        printf("%d\\n", s->data[s->top]);
    }
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    DynamicStack s;
    s.capacity = 2;
    s.top = -1;
    s.data = (int *)malloc(s.capacity * sizeof(int));

    char cmd[16];
    while (q--) {
        if (scanf("%15s", cmd) != 1) break;
        if (strcmp(cmd, "PUSH") == 0) {
            int val;
            scanf("%d", &val);
            push(&s, val);
        } else if (strcmp(cmd, "POP") == 0) {
            pop(&s);
        } else if (strcmp(cmd, "PEEK") == 0) {
            peek(&s);
        }
    }
    free(s.data);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("EMPTY\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("UNDERFLOW\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "6\nPUSH 10\nPUSH 20\nPEEK\nPOP\nPOP\nPOP\n",
                "expectedOutput": "20\n20\n10\nUNDERFLOW\n"
          },
          {
                "input": "3\nPEEK\nPOP\nPUSH 99\n",
                "expectedOutput": "EMPTY\nUNDERFLOW\n"
          }
    ],
    hiddenTests: [
          {
                "input": "7\nPUSH 1\nPUSH 2\nPUSH 3\nPUSH 4\nPOP\nPOP\nPEEK\n",
                "expectedOutput": "4\n3\n2\n"
          },
          {
                "input": "4\nPUSH 5\nPOP\nPUSH 6\nPEEK\n",
                "expectedOutput": "5\n6\n"
          }
    ],
  },
  {
    slug: "practice-m4-p17-union-type-pun-endianness",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 17,
    title: "Architecture Endianness Detection with Unions",
    difficulty: "MEDIUM",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Unions","Type Punning","Endianness","Systems Programming"],
    description: `### Problem Description

In C, a \`union\` shares the same memory space across all its members.
Define a union:
\`\`\`c
union EndianTest {
    unsigned int word;
    unsigned char bytes[sizeof(unsigned int)];
};
\`\`\`
Assign \`word = 0x01\`.
- If the first byte \`bytes[0] == 0x01\`, the least significant byte is stored at the lowest address, indicating **LITTLE ENDIAN**.
- If the last byte \`bytes[sizeof(unsigned int) - 1] == 0x01\`, it indicates **BIG ENDIAN**.

Write a program that uses this union type-punning technique to detect the target machine's endianness and print \`LITTLE ENDIAN\` or \`BIG ENDIAN\`.

### Input Format
(Input can contain an arbitrary integer \$X\$ which is ignored or can be used as test input).

### Output Format
Print \`LITTLE ENDIAN\` or \`BIG ENDIAN\` followed by a newline.`,
    starterCode: `#include <stdio.h>

union EndianTest {
    unsigned int word;
    unsigned char bytes[sizeof(unsigned int)];
};

int main() {
    // TODO: Determine machine endianness via union
    return 0;
}`,
    solutionCode: `#include <stdio.h>

union EndianTest {
    unsigned int word;
    unsigned char bytes[sizeof(unsigned int)];
};

int main() {
    int dummy;
    if (scanf("%d", &dummy) != 1) {
        // Continue even if no input
    }
    union EndianTest test;
    test.word = 1;
    if (test.bytes[0] == 1) {
        printf("LITTLE ENDIAN\\n");
    } else {
        printf("BIG ENDIAN\\n");
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("UNKNOWN\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("BIG ENDIAN\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "0\n",
                "expectedOutput": "LITTLE ENDIAN\n"
          },
          {
                "input": "42\n",
                "expectedOutput": "LITTLE ENDIAN\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\n",
                "expectedOutput": "LITTLE ENDIAN\n"
          },
          {
                "input": "9999\n",
                "expectedOutput": "LITTLE ENDIAN\n"
          }
    ],
  },
  {
    slug: "practice-m4-p18-nested-struct-university-database",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 18,
    title: "University City Topper with Nested Structures",
    difficulty: "MEDIUM",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Nested Structures","Searching","Database","Records"],
    description: `### Problem Description

Model student profiles using nested structures:
\`\`\`c
struct Address {
    char city[32];
    int pincode;
};

struct Student {
    char name[32];
    int marks;
    struct Address address;
};
\`\`\`

Given \$N\$ students, find the student who has the highest \`marks\` among those residing in a queried city \$C\$.
If multiple students in that city have the same highest marks, print the one who appeared first in the input list.
If no student lives in city \$C\$, print \`NOT FOUND\`.

### Input Format
- Line 1: An integer \$N\$ (\$1 \\le N \\le 100\$).
- Next \$N\$ lines: \`name marks city pincode\`.
- Last line: Query city name \$C\$.

### Output Format
Print \`name marks\` or \`NOT FOUND\` followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <string.h>

struct Address {
    char city[32];
    int pincode;
};

struct Student {
    char name[32];
    int marks;
    struct Address address;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    // TODO: Read students and query topper in city C
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <string.h>

struct Address {
    char city[32];
    int pincode;
};

struct Student {
    char name[32];
    int marks;
    struct Address address;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    struct Student students[105];
    for (int i = 0; i < n; i++) {
        if (scanf("%31s %d %31s %d", students[i].name, &students[i].marks, students[i].address.city, &students[i].address.pincode) != 4) return 0;
    }
    char queryCity[32];
    if (scanf("%31s", queryCity) != 1) return 0;

    int bestIdx = -1;
    for (int i = 0; i < n; i++) {
        if (strcmp(students[i].address.city, queryCity) == 0) {
            if (bestIdx == -1 || students[i].marks > students[bestIdx].marks) {
                bestIdx = i;
            }
        }
    }

    if (bestIdx == -1) {
        printf("NOT FOUND\\n");
    } else {
        printf("%s %d\\n", students[bestIdx].name, students[bestIdx].marks);
    }
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("NOT FOUND\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    int n; scanf("%d", &n);
    char name[32]; int m; char c[32]; int p;
    scanf("%s %d %s %d", name, &m, c, &p);
    printf("%s %d\\n", name, m); // Just prints first student
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    sampleTests: [
          {
                "input": "3\nAlice 92 Pune 411001\nBob 95 Mumbai 400001\nCharlie 88 Pune 411002\nPune\n",
                "expectedOutput": "Alice 92\n"
          },
          {
                "input": "2\nJohn 80 Delhi 110001\nJane 85 Delhi 110002\nPune\n",
                "expectedOutput": "NOT FOUND\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1\nSam 99 Bangalore 560001\nBangalore\n",
                "expectedOutput": "Sam 99\n"
          },
          {
                "input": "4\nA 70 Chennai 600001\nB 90 Chennai 600002\nC 90 Chennai 600003\nD 85 Chennai 600004\nChennai\n",
                "expectedOutput": "B 90\n"
          },
          {
                "input": "2\nX 50 Goa 403001\nY 60 Goa 403002\nMumbai\n",
                "expectedOutput": "NOT FOUND\n"
          }
    ],
  },
  {
    slug: "practice-m4-p19-singly-linked-list-detect-cycle",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 19,
    title: "Floyd's Cycle Detection in Linked List",
    difficulty: "HARD",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["Linked List","Floyd's Algorithm","Two Pointers","Cycle Detection"],
    description: `### Problem Description

Implement Floyd's Tortoise and Hare algorithm to detect a cycle in a singly linked list in \$O(N)\$ time and \$O(1)\$ auxiliary space.

Given \$N\$ node values and a 0-based index \$pos\$ indicating where the tail node's \`next\` pointer connects back to create a loop (-1 if there is no loop):
- If a cycle exists, find and print: \`CYCLE DETECTED AT NODE <index>\` where \`<index>\` is the 0-based index where the cycle begins.
- If there is no cycle, print: \`NO CYCLE\`.

### Input Format
- Line 1: Two integers \$N\$ (\$1 \\le N \\le 10^5\$) and \$pos\$ (\$-1 \\le pos < N\$).
- Line 2: \$N\$ space-separated integers.

### Output Format
Print \`CYCLE DETECTED AT NODE <pos>\` or \`NO CYCLE\` followed by a newline.`,
    starterCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node *next;
};

// TODO: Implement Floyd's cycle detection

int main() {
    int n, pos;
    if (scanf("%d %d", &n, &pos) != 2) return 0;
    
    // TODO: Construct list with loop at pos and detect
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    int index;
    struct Node *next;
};

int main() {
    int n, pos;
    if (scanf("%d %d", &n, &pos) != 2) return 0;
    struct Node **nodes = (struct Node **)malloc(n * sizeof(struct Node *));
    for (int i = 0; i < n; i++) {
        nodes[i] = (struct Node *)malloc(sizeof(struct Node));
        scanf("%d", &nodes[i]->val);
        nodes[i]->index = i;
        nodes[i]->next = NULL;
        if (i > 0) nodes[i - 1]->next = nodes[i];
    }
    if (pos >= 0 && pos < n) {
        nodes[n - 1]->next = nodes[pos];
    }

    struct Node *slow = nodes[0];
    struct Node *fast = nodes[0];
    int hasCycle = 0;

    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            hasCycle = 1;
            break;
        }
    }

    if (!hasCycle) {
        printf("NO CYCLE\\n");
    } else {
        // Find cycle start
        struct Node *ptr1 = nodes[0];
        struct Node *ptr2 = slow;
        while (ptr1 != ptr2) {
            ptr1 = ptr1->next;
            ptr2 = ptr2->next;
        }
        printf("CYCLE DETECTED AT NODE %d\\n", ptr1->index);
    }

    // Clean up
    if (pos >= 0 && pos < n) nodes[n - 1]->next = NULL;
    for (int i = 0; i < n; i++) free(nodes[i]);
    free(nodes);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("NO CYCLE\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("CYCLE DETECTED AT NODE 0\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "4 1\n3 2 0 -4\n",
                "expectedOutput": "CYCLE DETECTED AT NODE 1\n"
          },
          {
                "input": "2 -1\n1 2\n",
                "expectedOutput": "NO CYCLE\n"
          }
    ],
    hiddenTests: [
          {
                "input": "1 0\n10\n",
                "expectedOutput": "CYCLE DETECTED AT NODE 0\n"
          },
          {
                "input": "1 -1\n10\n",
                "expectedOutput": "NO CYCLE\n"
          },
          {
                "input": "5 3\n1 2 3 4 5\n",
                "expectedOutput": "CYCLE DETECTED AT NODE 3\n"
          },
          {
                "input": "6 -1\n10 20 30 40 50 60\n",
                "expectedOutput": "NO CYCLE\n"
          }
    ],
  },
  {
    slug: "practice-m4-p20-custom-dynamic-string-builder",
    moduleSlug: "advanced-data-types-dynamic-memory",
    moduleOrder: 20,
    title: "Dynamic String Builder Buffer with realloc",
    difficulty: "HARD",
    category: "Advanced Data Types, Dynamic Memory",
    tags: ["realloc","Dynamic Memory","String Buffer","Amortized Analysis"],
    description: `### Problem Description

Implement an expandable string builder buffer \`StringBuilder\` using \`malloc\` and \`realloc\`:
\`\`\`c
typedef struct {
    char *buffer;
    size_t length;
    size_t capacity;
} StringBuilder;
\`\`\`
The buffer starts with initial \`capacity = 4\` and \`length = 0\`.
When appending a string of length \$L\$, ensure that \`length + L + 1 <= capacity\`. If the capacity is insufficient, repeatedly double \`capacity\` (\`capacity *= 2\`) until it can accommodate the new string plus the null-terminator \`'\\0'\`, and reallocate memory using \`realloc\`.

Process \$Q\$ words to append in order.
Output:
- Line 1: The concatenated string.
- Line 2: \`LENGTH: <L> CAPACITY: <C>\`.
Ensure all memory is freed before exiting.

### Input Format
- Line 1: An integer \$Q\$ (\$1 \\le Q \\le 100\$).
- Next \$Q\$ lines: Each line contains a word \$W_i\$ (\$1 \\le |W_i| \\le 100\$).

### Output Format
- Line 1: The full concatenated string.
- Line 2: \`LENGTH: <L> CAPACITY: <C>\``,
    starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// TODO: Implement Dynamic StringBuilder

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    
    // TODO: Append Q strings and report length and capacity
    
    return 0;
}`,
    solutionCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char *buffer;
    size_t length;
    size_t capacity;
} StringBuilder;

void sb_init(StringBuilder *sb) {
    sb->capacity = 4;
    sb->length = 0;
    sb->buffer = (char *)malloc(sb->capacity * sizeof(char));
    sb->buffer[0] = '\\0';
}

void sb_append(StringBuilder *sb, const char *str) {
    size_t addLen = strlen(str);
    while (sb->length + addLen + 1 > sb->capacity) {
        sb->capacity *= 2;
        sb->buffer = (char *)realloc(sb->buffer, sb->capacity * sizeof(char));
    }
    memcpy(sb->buffer + sb->length, str, addLen);
    sb->length += addLen;
    sb->buffer[sb->length] = '\\0';
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    StringBuilder sb;
    sb_init(&sb);
    for (int i = 0; i < q; i++) {
        char word[128];
        if (scanf("%127s", word) == 1) {
            sb_append(&sb, word);
        }
    }
    printf("%s\\n", sb.buffer);
    printf("LENGTH: %zu CAPACITY: %zu\\n", sb.length, sb.capacity);
    free(sb.buffer);
    return 0;
}`,
    wrongSolution1: `#include <stdio.h>
int main() {
    printf("LENGTH: 0 CAPACITY: 4\\n");
    return 0;
}`,
    wrongSolution2: `#include <stdio.h>
int main() {
    printf("ERROR\\n");
    return 0;
}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 30,
    sampleTests: [
          {
                "input": "3\nHello\nWorld\nLogicQ\n",
                "expectedOutput": "HelloWorldLogicQ\nLENGTH: 16 CAPACITY: 32\n"
          },
          {
                "input": "1\nHi\n",
                "expectedOutput": "Hi\nLENGTH: 2 CAPACITY: 4\n"
          }
    ],
    hiddenTests: [
          {
                "input": "2\nC\n11\n",
                "expectedOutput": "C11\nLENGTH: 3 CAPACITY: 4\n"
          },
          {
                "input": "4\na\nb\nc\nd\n",
                "expectedOutput": "abcd\nLENGTH: 4 CAPACITY: 8\n"
          },
          {
                "input": "5\nData\nStructures\nAnd\nAlgorithms\nInC\n",
                "expectedOutput": "DataStructuresAndAlgorithmsInC\nLENGTH: 30 CAPACITY: 32\n"
          }
    ],
  }
];
