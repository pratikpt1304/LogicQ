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
];
