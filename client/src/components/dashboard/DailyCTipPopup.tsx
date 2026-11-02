import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';

const C_TIPS: { title: string; tip: string; code?: string }[] = [
  {
    title: 'Always initialize your variables!',
    tip: "Uninitialized variables in C have garbage values. Always set them before use to avoid undefined behavior.",
    code: "int x = 0;  // ✓ Safe\nint y;      // ✗ Garbage value!",
  },
  {
    title: 'NULL-check every pointer!',
    tip: "After malloc/calloc, always check if the returned pointer is NULL before using it.",
    code: "int *p = malloc(sizeof(int));\nif (p == NULL) { /* handle error */ }",
  },
  {
    title: 'printf format specifiers',
    tip: "Use %d for int, %f for float, %lf for double, %c for char, %s for string, %p for pointer.",
    code: 'printf("%d %f %c\\n", 42, 3.14f, \'A\');',
  },
  {
    title: 'String is a char array',
    tip: "A string in C is just a char array ending with '\\0'. Use strcpy, strlen, strcmp from <string.h>.",
    code: 'char name[20] = "LogicQ";  // auto \\0 added',
  },
  {
    title: 'scanf reads until whitespace',
    tip: "scanf(\"%s\", ...) stops at space. Use fgets(buf, size, stdin) to read a full line.",
    code: 'fgets(line, sizeof(line), stdin);',
  },
  {
    title: 'Integer division truncates',
    tip: "5/2 = 2 in C (not 2.5). Cast to float/double to get a decimal result.",
    code: "float r = (float)5 / 2;  // r = 2.5",
  },
  {
    title: 'Array index starts at 0',
    tip: "An array of size n has valid indices 0 to n-1. Accessing arr[n] is undefined behavior!",
    code: "int arr[5]; // valid: arr[0] to arr[4]",
  },
  {
    title: 'Use & with scanf for primitives',
    tip: "Pass the address (&) of a variable to scanf except for char arrays (strings).",
    code: 'int x;\nscanf("%d", &x);  // note the &',
  },
  {
    title: 'for loop shorthand',
    tip: "The classic C for loop: init; condition; increment. Any of the three parts can be omitted.",
    code: "for (int i = 0; i < n; i++) { ... }",
  },
  {
    title: 'switch needs break!',
    tip: "Without break, a switch-case will fall through to the next case. Always add break unless intentional.",
    code: "switch(x) {\n  case 1: ... break;\n  default: ...\n}",
  },
  {
    title: 'Pointer arithmetic',
    tip: "Adding 1 to a pointer advances it by sizeof(type) bytes — very powerful for arrays!",
    code: "int a[] = {10,20,30};\nprintf(\"%d\", *(a+1)); // prints 20",
  },
  {
    title: 'struct vs union',
    tip: "In a struct, each member has its own memory. In a union, all members share the same memory location.",
    code: "union U { int i; float f; }; // sizeof = max(int,float)",
  },
  {
    title: 'Use #define for constants',
    tip: "Use #define or const for constants to avoid magic numbers and make code readable.",
    code: "#define MAX 100\nconst int SIZE = 50;",
  },
  {
    title: 'scanf return value',
    tip: "scanf returns the number of successfully read items. Check it to validate input!",
    code: 'if (scanf("%d", &n) != 1) { /* bad input */ }',
  },
  {
    title: 'Modulo for cyclic patterns',
    tip: "The % (modulo) operator gives the remainder. Use it for cyclic indexing, odd/even checks, etc.",
    code: "if (n % 2 == 0) printf(\"Even\");",
  },
  {
    title: 'Free what you malloc!',
    tip: "Every malloc/calloc/realloc must be matched with a free() to avoid memory leaks.",
    code: "int *p = malloc(n * sizeof(int));\n// ... use p ...\nfree(p);",
  },
  {
    title: 'Conditional (ternary) operator',
    tip: "condition ? expr_if_true : expr_if_false — a concise one-liner for simple if-else.",
    code: "int max = (a > b) ? a : b;",
  },
  {
    title: 'while vs do-while',
    tip: "while checks condition first (may not execute). do-while executes at least once, then checks.",
    code: "do {\n  // runs at least once\n} while (condition);",
  },
  {
    title: 'File I/O basics',
    tip: "Use fopen to open a file, fprintf/fscanf for reading/writing, and always fclose it!",
    code: 'FILE *f = fopen("data.txt","r");\nif(f){ ... fclose(f); }',
  },
  {
    title: 'sizeof operator',
    tip: "sizeof(type) or sizeof(variable) returns the size in bytes at compile time — very useful with malloc.",
    code: "int *arr = malloc(n * sizeof(int));",
  },
  {
    title: 'Recursive functions need a base case',
    tip: "Every recursive function must have a base case to stop recursion, otherwise you'll get a stack overflow!",
    code: "int fact(int n) {\n  if (n<=1) return 1;  // base case\n  return n * fact(n-1);\n}",
  },
  {
    title: 'Use const for read-only data',
    tip: "Mark parameters or variables const to prevent accidental modification and signal intent clearly.",
    code: "void print(const char *s) { puts(s); }",
  },
  {
    title: 'Bitwise operators',
    tip: "& (AND), | (OR), ^ (XOR), ~ (NOT), << (left shift), >> (right shift) work directly on bits.",
    code: "int flags = 0;\nflags |= (1 << 3);  // set bit 3",
  },
  {
    title: 'GCC compilation command',
    tip: "Use gcc -Wall -o output source.c to compile with all warnings enabled.",
    code: "gcc -Wall -o solution solution.c",
  },
  {
    title: 'Difference: = and ==',
    tip: "= is assignment, == is comparison. if (x = 5) is always true! Write if (x == 5) to compare.",
    code: "if (x == 5) { ... }  // compare\nx = 5;               // assign",
  },
  {
    title: 'Global vs Local scope',
    tip: "Global variables live throughout the program. Local variables exist only inside their function/block.",
    code: "int global = 10;       // global\nvoid f() { int local=5; }",
  },
  {
    title: 'Pass by value vs pointer',
    tip: "C passes arguments by value (copy). Pass a pointer to modify the original variable.",
    code: "void swap(int *a, int *b) {\n  int t=*a; *a=*b; *b=t;\n}",
  },
  {
    title: '2D arrays in C',
    tip: "Declare a 2D array as arr[rows][cols]. Access element at row r, col c as arr[r][c].",
    code: "int mat[3][4];\nmat[1][2] = 99;",
  },
  {
    title: 'Break and continue',
    tip: "break exits the loop immediately. continue skips the rest of the current iteration.",
    code: "for(i=0;i<10;i++){\n  if(i==5) break;    // stops at 5\n  if(i%2) continue;  // skip odd\n}",
  },
  {
    title: 'main return 0',
    tip: "return 0 from main signals successful program termination to the OS. Non-zero means error.",
    code: "int main() {\n  // ...\n  return 0;  // success!\n}",
  },
];

function getTodaysTip(): { title: string; tip: string; code?: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return C_TIPS[dayOfYear % C_TIPS.length];
}

function getTipDismissKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `logicq_daily_tip_dismissed_${today}`;
}

export const DailyCTipPopup: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const todaysTip = getTodaysTip();

  useEffect(() => {
    const key = getTipDismissKey();
    const dismissed = localStorage.getItem(key) === 'true';
    if (!dismissed) {
      // Show after 1.5 seconds to not be jarring
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(getTipDismissKey(), 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.4))' }}
    >
      <div className="glass-card border border-cyan-500/30 rounded-2xl overflow-hidden bg-[var(--bg-panel)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-600/20 to-emerald-600/10 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Daily C Tip
              </span>
              <span className="ml-2 text-[9px] font-mono text-[var(--text-muted)]">
                {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Dismiss tip for today"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2.5">
          <h3 className="font-bold text-sm text-[var(--text-main)] flex items-start gap-1.5">
            <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            {todaysTip.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-5">
            {todaysTip.tip}
          </p>
          {todaysTip.code && (
            <pre className="pl-5 text-[10px] font-mono bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-lg p-3 text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {todaysTip.code}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 rounded-xl text-[11px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            Got it! 👍
          </button>
        </div>
      </div>
    </div>
  );
};
