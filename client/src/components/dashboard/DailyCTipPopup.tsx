import React, { useState, useEffect } from 'react';
import { Lightbulb, Code2, Sparkles, Timer } from 'lucide-react';

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
  return `logicq_mandatory_daily_tip_${today}`;
}

const TOTAL_COUNTDOWN_SECONDS = 10;

export const DailyCTipPopup: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_COUNTDOWN_SECONDS);
  const todaysTip = getTodaysTip();

  useEffect(() => {
    const key = getTipDismissKey();
    const dismissed = localStorage.getItem(key) === 'true';
    if (!dismissed) {
      // Short delay of 600ms so the dashboard renders smoothly first
      const timer = setTimeout(() => {
        setVisible(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.setItem(getTipDismissKey(), 'true');
          setVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const progressPercent = (secondsLeft / TOTAL_COUNTDOWN_SECONDS) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300 select-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Prevent dismissal by clicking outside
        e.stopPropagation();
      }}
    >
      <div
        className="relative max-w-2xl w-full bg-[#0a0e17] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/20 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col text-slate-100"
        style={{
          boxShadow: '0 25px 60px -15px rgba(6, 182, 212, 0.25), 0 0 40px rgba(6, 182, 212, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated 10-Second Progress Line at Top */}
        <div className="w-full bg-slate-800/80 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(6,182,212,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-4 flex items-start justify-between gap-4 border-b border-slate-800/80 bg-gradient-to-b from-cyan-950/20 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Lightbulb className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Daily C Master Tip
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {todaysTip.title}
              </h2>
            </div>
          </div>

          {/* Mandatory Timer Badge */}
          <div className="shrink-0 flex flex-col items-end">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold shadow-sm">
              <Timer className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-sm font-black text-cyan-400">{secondsLeft}s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">Mandatory Focus</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-4">
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
            {todaysTip.tip}
          </p>

          {todaysTip.code && (
            <div className="relative rounded-2xl bg-[#030712] border border-cyan-500/20 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>C11 Reference Code</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
              </div>
              <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre-wrap selection:bg-cyan-900">
                {todaysTip.code}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer with No-Skip Notice & Countdown Progress */}
        <div className="px-6 sm:px-7 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Active learning lock: Auto-closing in <strong className="text-cyan-400 font-bold">{secondsLeft}s</strong></span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hidden sm:inline">
            No Skip • Daily Curriculum Requirement
          </span>
        </div>
      </div>
    </div>
  );
};
