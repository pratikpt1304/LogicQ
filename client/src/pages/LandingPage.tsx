import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  ArrowRight,
  LogIn,
  Sparkles,
  Code2,
  BookOpen,
  CheckCircle2,
  Lock,
  Cpu,
  ShieldCheck,
  Terminal,
  Trophy,
  Zap,
  Users,
  Check,
  Flame,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 text-center overflow-hidden">
        {/* Glow ambient background backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-teal-500/15 to-emerald-500/20 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[90px] pointer-events-none -z-10" />

        {/* Top Institutional Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-mono mb-8 backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span className="font-semibold tracking-wide">Sanjivani University • Institutional C Programming Arena</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--text-main)] max-w-5xl mx-auto leading-[1.12]">
          Think in Logic.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Code in C.
          </span>
        </h1>

        {/* Value Proposition */}
        <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-3xl mx-auto font-sans leading-relaxed">
          The premier institutional platform for low-level systems engineering and algorithmic rigor.
          Conquer daily pointer, memory, and data structure challenges in C with automated GCC compiler sandboxing
          and verified academic cohort rankings.
        </p>

        {/* Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={user ? '/dashboard' : '/login'}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-mono text-sm font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{user ? 'Enter Your Dashboard' : 'Sign In to Arena'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/practice"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold text-[var(--color-accent)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface)] border border-[var(--border-line)] hover:border-[var(--color-accent)] transition-all transform hover:-translate-y-0.5"
          >
            <Code2 className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Practice Curriculum (4 Modules)</span>
          </Link>

          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface)] border border-[var(--border-line)] transition-all"
            >
              <LogIn className="w-4 h-4 text-cyan-500" />
              <span>Email Sign In</span>
            </Link>
          )}
        </div>

        {/* High-Level Key Metrics */}
        <div className="mt-14 pt-8 border-t border-[var(--border-line)] max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-mono">40+</div>
            <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Curated C Challenges</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-500 dark:text-cyan-400 font-mono">4 Modules</div>
            <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Strict Mastery Gates</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500 dark:text-emerald-400 font-mono">0.002s</div>
            <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Isolated GCC Execution</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 dark:text-amber-400 font-mono">100%</div>
            <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Institutional Verified</div>
          </div>
        </div>

        {/* IDE & Terminal Mockup Showcase */}
        <div className="mt-12 max-w-4xl mx-auto text-left rounded-2xl border border-[var(--border-line)] bg-[#0C101E] shadow-2xl overflow-hidden font-mono text-xs">
          {/* Top Window Bar */}
          <div className="px-4 py-3 bg-[#080B15] border-b border-[#1A2238] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] text-slate-400 font-mono ml-2">solution.c • GCC 14.2 C99 Mode</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● Sandboxed Compiler Ready
            </span>
          </div>

          {/* Code Window */}
          <div className="p-5 text-slate-300 leading-relaxed overflow-x-auto bg-[#0C101E]">
            <span className="text-purple-400">#include</span> <span className="text-emerald-400">&lt;stdio.h&gt;</span>{'\n'}
            <span className="text-purple-400">#include</span> <span className="text-emerald-400">&lt;stdlib.h&gt;</span>{'\n\n'}
            <span className="text-slate-500">// Section 3: Invert Binary Bit Patterns with Pointer Dereferencing</span>{'\n'}
            <span className="text-cyan-400">void</span> <span className="text-amber-300">reverse_bits</span>(<span className="text-cyan-400">unsigned int</span> *val) {'{'}{'\n'}
            {'    '}<span className="text-cyan-400">unsigned int</span> rev = <span className="text-amber-400">0</span>;{'\n'}
            {'    '}<span className="text-purple-400">for</span> (<span className="text-cyan-400">int</span> i = <span className="text-amber-400">0</span>; i &lt; <span className="text-amber-400">32</span>; i++) {'{'}{'\n'}
            {'        '}<span className="text-purple-400">if</span> ((*val) &amp; (<span className="text-amber-400">1U</span> &lt;&lt; i)) rev |= (<span className="text-amber-400">1U</span> &lt;&lt; (<span className="text-amber-400">31</span> - i));{'\n'}
            {'    '}{'}'}{'\n'}
            {'    '}*val = rev;{'\n'}
            {'}'}
          </div>

          {/* Test Runner Output Drawer */}
          <div className="p-4 bg-[#080B15] border-t border-[#1A2238] space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>Compilation Succeeded: 0 errors, 0 warnings (-Wall -Werror)</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>✓ Test Case 1/10: Basic Bitwise Shift Passed</span>
              <span className="text-emerald-400 font-mono">0.001s [412 KB]</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>✓ Test Case 2/10: Boundary Max Integer Passed</span>
              <span className="text-emerald-400 font-mono">0.001s [416 KB]</span>
            </div>
            <div className="text-cyan-400 pt-1 border-t border-[#1A2238] flex items-center justify-between font-bold">
              <span>All 10 Evaluation Test Suites Passed • Zero Memory Leaks</span>
              <span className="text-amber-400">+25 Arena Points Earned</span>
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONAL PILLARS */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[var(--border-line)]">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--color-accent)] font-semibold tracking-wider uppercase">
            Architectural Excellence
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-main)] mt-2">
            Why Top Colleges Train on LogicQ
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xl mx-auto">
            Built from scratch to eliminate AI shortcuts and enforce real low-level computational understanding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] hover:border-cyan-500/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Sandboxed GCC Judge</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every submission compiles against a secured runtime with CPU timeouts, memory leak detection, and hidden randomized evaluation test cases.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] hover:border-emerald-500/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Faculty Section Rosters</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Academic cohorts are locked to faculty rosters. Public sign-up is closed, preventing arbitrary accounts and preserving academic integrity.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] hover:border-amber-500/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Strict Email OTP Security</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Zero password vulnerabilities. 1 PRN permanently binds to 1 official university email address verified by official 6-digit OTP delivery.
            </p>
          </div>
        </div>
      </section>

      {/* 4-MODULE PRACTICE CURRICULUM */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-y border-[var(--border-line)] bg-[var(--bg-panel)]/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-mono font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>ACADEMIC MASTERY CURRICULUM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
              4 Progressive Skill Modules
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl">
              10 curated problems per module across Easy, Medium, and Hard. Solve all 10 in each module to unlock the next gate.
            </p>
          </div>

          <Link
            to="/practice"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <span>Start Practice Track</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Module 1 */}
          <Link
            to="/practice/control-structures"
            className="glass-card p-5 rounded-2xl border border-[var(--border-line)] hover:border-emerald-500/50 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                MODULE 1 • UNLOCKED
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--color-accent)] transition-colors">
              Control Structures
            </h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
              Decision branching, switch statements, iteration flow, and nested loop algorithms.
            </p>
            <div className="text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-line)] flex items-center justify-between">
              <span>20 Problems</span>
              <span className="text-[var(--color-accent)] font-semibold">Start &rarr;</span>
            </div>
          </Link>

          {/* Module 2 */}
          <Link
            to="/practice/pointers-and-functions"
            className="glass-card p-5 rounded-2xl border border-[var(--border-line)] hover:border-amber-500/50 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                MODULE 2 • GATE 20/20
              </span>
              <Lock className="w-4 h-4 text-amber-800 dark:text-amber-300" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--color-accent)] transition-colors">
              Pointers & Functions
            </h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
              Addresses, dereferencing, pass-by-reference, function pointers, and recursion.
            </p>
            <div className="text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-line)] flex items-center justify-between">
              <span>20 Problems</span>
              <span className="text-amber-800 dark:text-amber-300 font-semibold">Solve 20 to Unlock</span>
            </div>
          </Link>

          {/* Module 3 */}
          <Link
            to="/practice/array-and-its-applications"
            className="glass-card p-5 rounded-2xl border border-[var(--border-line)] hover:border-slate-500/50 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border-line)]">
                MODULE 3 • GATE 20/20
              </span>
              <Lock className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--color-accent)] transition-colors">
              Array & Applications
            </h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
              1D/2D arrays, matrix arithmetic, searching, sorting, and buffer operations.
            </p>
            <div className="text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-line)] flex items-center justify-between">
              <span>20 Problems</span>
              <span className="text-[var(--text-muted)]">Requires Module 2</span>
            </div>
          </Link>

          {/* Module 4 */}
          <Link
            to="/practice/advanced-data-types-dynamic-memory"
            className="glass-card p-5 rounded-2xl border border-[var(--border-line)] hover:border-slate-500/50 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border-line)]">
                MODULE 4 • GATE 20/20
              </span>
              <Lock className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--color-accent)] transition-colors">
              Dynamic Memory & Types
            </h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
              Structs, unions, bit-fields, malloc/calloc/free, and linked node architectures.
            </p>
            <div className="text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-line)] flex items-center justify-between">
              <span>20 Problems</span>
              <span className="text-[var(--text-muted)]">Requires Module 3</span>
            </div>
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS WORKFLOW */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--color-accent)] font-semibold tracking-wider uppercase">
            Execution Flow
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-main)] mt-2">How LogicQ Operates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-[var(--border-line)]">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold font-mono text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Daily IST Challenge</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every day at 17:00 IST, one featured C challenge unlocks. Solve it before the cutoff to earn points and maintain your campus streak.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-[var(--border-line)]">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold font-mono text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Write & Compile in C</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Write code in our Monaco IDE. Run against custom test inputs and submit against automated evaluation suites with zero latency.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-[var(--border-line)]">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold font-mono text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Live Cohort Leaderboard</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Earn points by difficulty, climb through 4 mastery tiers (Pointer Apprentice to Kernel Virtuoso), and track academic benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL INSTITUTIONAL CALL TO ACTION */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12">
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-[var(--border-line)] bg-gradient-to-b from-[var(--bg-panel)] to-[var(--bg-surface)] text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] max-w-2xl mx-auto">
            Ready to Prove Your Systems Mastery?
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-3 max-w-xl mx-auto leading-relaxed">
            Enrolled students and faculty can sign in immediately using their registered institutional email address.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={user ? '/dashboard' : '/login'}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-mono text-sm font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <span>{user ? 'Open Dashboard' : 'Sign In with Email OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
