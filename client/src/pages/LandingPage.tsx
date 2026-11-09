import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ArrowRight, LogIn, LayoutDashboard, Terminal, CheckCircle2, Cpu } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 py-16">
      <div className="w-full max-w-4xl mx-auto space-y-10">
        
        {/* Hero Header Block */}
        <div className="text-center space-y-5 max-w-2xl mx-auto">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)] text-xs font-mono">
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>LogicQ • Academic C Systems & Evaluation Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-main)] leading-[1.15]">
            Think in logic.{' '}
            <span className="text-cyan-600 dark:text-cyan-400">Code in C.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base text-[var(--text-muted)] leading-relaxed">
            The institutional platform for low-level systems engineering, algorithmic rigor, and automated GCC compiler sandboxing.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-white bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shadow-xs cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-white bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Institutional PRN</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Authentic Product Moment: Real GCC Sandbox & Execution Window */}
        <div className="w-full rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] overflow-hidden shadow-xs">
          {/* Terminal Window Chrome */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-line)] text-xs text-[var(--text-muted)] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-line)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-line)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-line)]" />
              <span className="ml-2 text-[var(--text-main)] font-semibold">sandbox/matrix_transpose.c</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>gcc 13.2.0 (C11)</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[var(--text-muted)]">
                <Cpu className="w-3.5 h-3.5" />
                <span>0.002s • 1.4 MB</span>
              </span>
            </div>
          </div>

          {/* Split Editor / Execution Terminal View */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-line)] font-mono text-xs">
            {/* Left: C Source Code */}
            <div className="p-4 sm:p-5 bg-[var(--bg-panel)] overflow-x-auto space-y-1 text-[var(--text-muted)] leading-relaxed">
              <div className="text-[var(--text-muted)]">// Strict O(1) auxiliary space in-place transpose</div>
              <div><span className="text-cyan-600 dark:text-cyan-400">#include</span> &lt;stdio.h&gt;</div>
              <div className="pt-1"><span className="text-purple-600 dark:text-purple-400">void</span> <span className="text-[var(--text-main)] font-semibold">transpose</span>(<span className="text-purple-600 dark:text-purple-400">int</span> n, <span className="text-purple-600 dark:text-purple-400">int</span> m[n][n]) &#123;</div>
              <div className="pl-4"><span className="text-purple-600 dark:text-purple-400">for</span> (<span className="text-purple-600 dark:text-purple-400">int</span> i = <span className="text-amber-600 dark:text-amber-400">0</span>; i &lt; n; i++) &#123;</div>
              <div className="pl-8"><span className="text-purple-600 dark:text-purple-400">for</span> (<span className="text-purple-600 dark:text-purple-400">int</span> j = i + <span className="text-amber-600 dark:text-amber-400">1</span>; j &lt; n; j++) &#123;</div>
              <div className="pl-12"><span className="text-purple-600 dark:text-purple-400">int</span> tmp = m[i][j];</div>
              <div className="pl-12">m[i][j] = m[j][i];</div>
              <div className="pl-12">m[j][i] = tmp;</div>
              <div className="pl-8">&#125;</div>
              <div className="pl-4">&#125;</div>
              <div>&#125;</div>
            </div>

            {/* Right: GCC Compiler & Test Case Execution */}
            <div className="p-4 sm:p-5 bg-[var(--bg-surface)] space-y-3">
              <div className="text-[var(--text-muted)]">
                <span className="text-cyan-600 dark:text-cyan-400">$</span> gcc -Wall -Wextra -O2 -std=c11 runner.c -o runner
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                [OK] Compilation finished with 0 warnings
              </div>
              <div className="pt-2 border-t border-[var(--border-line)] space-y-2">
                <div className="text-[var(--text-main)] font-semibold">Proctored Test Suite:</div>
                <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[var(--text-muted)]">Test Case 1 (3x3 Matrix)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Passed (0.001s)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[var(--text-muted)]">Test Case 2 (1000x1000 Large Memory)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Passed (0.003s)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[var(--text-muted)]">Time Complexity Verification</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">O(N²) Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
