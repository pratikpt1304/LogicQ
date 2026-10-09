import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import {
  Terminal,
  Zap,
  Flame,
  Trophy,
  ArrowRight,
  Play,
  Cpu,
  ShieldAlert,
  Code2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // Interactive Sandbox Code State
  const sampleSnippets = {
    pointers: `#include <stdio.h>

void swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 42, y = 99;
    printf("Before: x=%d, y=%d\\n", x, y);
    swap(&x, &y);
    printf("After:  x=%d, y=%d\\n", x, y);
    return 0;
}`,
    bitwise: `#include <stdio.h>

// Check if a number is power of 2 using bitwise AND
int isPowerOfTwo(unsigned int n) {
    return n && !(n & (n - 1));
}

int main() {
    unsigned int test = 64;
    printf("%u is power of 2: %s\\n", test, isPowerOfTwo(test) ? "YES" : "NO");
    return 0;
}`,
    nullcheck: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int* ptr = (int*)malloc(sizeof(int));
    if (ptr == NULL) {
        fprintf(stderr, "Allocation failed!\\n");
        return 1;
    }
    *ptr = 1337;
    printf("Safely allocated value: %d\\n", *ptr);
    free(ptr);
    return 0;
}`,
  };

  const [activeSnippetKey, setActiveSnippetKey] = useState<keyof typeof sampleSnippets>('pointers');
  const [sandboxCode, setSandboxCode] = useState(sampleSnippets.pointers);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleSnippetSelect = (key: keyof typeof sampleSnippets) => {
    setActiveSnippetKey(key);
    setSandboxCode(sampleSnippets[key]);
    setSandboxOutput(null);
  };

  const handleRunSandbox = async () => {
    setIsRunning(true);
    setSandboxOutput('Compiling with GCC 16.2.0...');
    try {
      const res = await api.post('/submissions/run', {
        code: sandboxCode,
        stdin: '',
        timeLimitMs: 2000,
      });

      if (res.data?.compileOutput) {
        setSandboxOutput(`Compile Error:\n${res.data.compileOutput}`);
      } else if (res.data?.stderr) {
        setSandboxOutput(`Runtime Output:\n${res.data.stdout || ''}\nStderr: ${res.data.stderr}`);
      } else {
        setSandboxOutput(res.data?.stdout || 'Program exited with code 0 (No output)');
      }
    } catch (err: any) {
      setSandboxOutput(`Execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-500/15 to-emerald-500/15 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-8 backdrop-blur-md">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Daily Challenges Reset Every Midnight (00:00 IST)</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Think in logic.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Code in C.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
          The competitive arena for low-level mastery. Conquer daily memory, pointer, and algorithm
          challenges in C11. Maintain your streak and climb the global ranks.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={user ? '/challenge' : '/register'}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>{user ? "Today's Challenge" : 'Enter The Arena'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/archive"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-300 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
          >
            <Code2 className="w-4 h-4 text-cyan-500" />
            <span>Browse Problem Bank</span>
          </Link>
        </div>

        {/* Feature Highlights Badges */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1 font-mono text-xs font-semibold">
              <Cpu className="w-4 h-4" />
              <span>GCC 16.2.0</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Native C11 execution with strict time & memory limits</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1 font-mono text-xs font-semibold">
              <Flame className="w-4 h-4" />
              <span>IST Streaks</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Build daily momentum and unlock milestone badges</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1 font-mono text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              <span>Live Arena</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Timed competitive contests with ICPC penalty time</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1 font-mono text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>Zero Leakage</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Hidden evaluation cases stay secured in the judge</p>
          </div>
        </div>
      </section>

      {/* Live Interactive Sandbox Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase">
            Interactive Testbed
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Test Live GCC Sandbox</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            Experience our instant, sandboxed C compiler. Pick a snippet or modify code directly.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-dark-900/90 shadow-xl overflow-hidden backdrop-blur-xl">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 dark:bg-dark-850 border-b border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Presets:</span>
              <button
                onClick={() => handleSnippetSelect('pointers')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  activeSnippetKey === 'pointers'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/[0.04]'
                }`}
              >
                Pointer Swap
              </button>
              <button
                onClick={() => handleSnippetSelect('bitwise')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  activeSnippetKey === 'bitwise'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/[0.04]'
                }`}
              >
                Bitwise Hacks
              </button>
              <button
                onClick={() => handleSnippetSelect('nullcheck')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  activeSnippetKey === 'nullcheck'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/[0.04]'
                }`}
              >
                Defensive Malloc
              </button>
            </div>

            <button
              onClick={handleRunSandbox}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-dark-950" />
              <span>{isRunning ? 'Compiling...' : 'Run in GCC 16'}</span>
            </button>
          </div>

          {/* Sandbox Editor & Terminal Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/[0.08]">
            {/* Code Input */}
            <div className="p-4 bg-slate-50/50 dark:bg-dark-950/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                <span>C SOURCE</span>
                <span>Editable</span>
              </div>
              <textarea
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                rows={14}
                className="w-full bg-transparent font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-200 resize-none focus:outline-none focus:ring-0 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Terminal Output */}
            <div className="p-4 bg-slate-900 dark:bg-dark-950 flex flex-col justify-between min-h-[250px]">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    TERMINAL OUTPUT
                  </span>
                  <span className="text-[10px] text-emerald-400">SANDBOX VERIFIED</span>
                </div>
                <pre className="font-mono text-xs sm:text-sm text-cyan-300/90 whitespace-pre-wrap leading-relaxed">
                  {sandboxOutput ||
                    `// Click 'Run in GCC 16' above to compile and execute in our sandboxed runner.`}
                </pre>
              </div>

              <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Standard: C11 (-O2 -Wall)</span>
                <span>Max Execution: 2000ms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mastery Ranks Ladder Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase">
            Progression
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-2">Mastery Rank Tiers</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Solve daily challenges to climb through the competitive developer ranks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-slate-500/50">
            <span className="text-xs font-mono text-slate-400">TIER 1</span>
            <h3 className="text-lg font-bold text-white mt-1">Pointer Apprentice</h3>
            <p className="text-xs text-slate-400 mt-2">
              Master fundamentals: basic pointer syntax, arrays, loops, and bitwise arithmetic.
            </p>
            <div className="mt-4 text-xs font-mono text-slate-500">0 - 100 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-cyan-500">
            <span className="text-xs font-mono text-cyan-400">TIER 2</span>
            <h3 className="text-lg font-bold text-white mt-1">Memory Wrangler</h3>
            <p className="text-xs text-slate-400 mt-2">
              Dynamic memory allocation, linked lists, ring buffers, and re-entrant strings.
            </p>
            <div className="mt-4 text-xs font-mono text-cyan-400">100 - 300 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-emerald-500">
            <span className="text-xs font-mono text-emerald-400">TIER 3</span>
            <h3 className="text-lg font-bold text-white mt-1">Systems Architect</h3>
            <p className="text-xs text-slate-400 mt-2">
              Custom allocators, LRU caching, heap priority queues, and recursion without stack overflow.
            </p>
            <div className="mt-4 text-xs font-mono text-emerald-400">300 - 700 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-purple-500">
            <span className="text-xs font-mono text-purple-400">TIER 4</span>
            <h3 className="text-lg font-bold text-white mt-1">Kernel Virtuoso</h3>
            <p className="text-xs text-slate-400 mt-2">
              Top 1% competitive solvers. Flawless memory safety, zero segfaults, and arena champions.
            </p>
            <div className="mt-4 text-xs font-mono text-purple-400">700+ PTS</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
            Workflow
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-2">How LogicQ Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold mb-4 font-mono text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-white">Daily IST Drop</h3>
            <p className="text-xs text-slate-400 mt-2">
              Every day at 00:00 IST, one featured C challenge goes live. Solve it within 24 hours to keep your flame streak burning.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-4 font-mono text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-white">Code & Compile</h3>
            <p className="text-xs text-slate-400 mt-2">
              Write your solution in our Monaco IDE. Run against custom test inputs and submit against comprehensive evaluation test suites.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold mb-4 font-mono text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-white">Climb & Compete</h3>
            <p className="text-xs text-slate-400 mt-2">
              Earn base points, first-solve bonuses, unlock honors badges, and compete with peers on daily and weekly leaderboards.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
