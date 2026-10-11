import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Trophy,
  ArrowRight,
  LogIn,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-500/15 to-emerald-500/15 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-mono mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span>Built by Bitwise Club</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
          Think in logic.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Code in C.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          The competitive arena for low-level mastery. Conquer daily memory, pointer, and algorithm
          challenges in C. Maintain your streak and climb the weekly campus ranks.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={user ? '/dashboard' : '/register'}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>{user ? 'Go to Dashboard' : 'Register to Start'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-300 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
            >
              <LogIn className="w-4 h-4 text-cyan-500" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </section>

      {/* Mastery Ranks Ladder Section */}
      <section id="ranks" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
            Progression
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Mastery Rank Tiers</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            Solve daily challenges to climb through the competitive developer ranks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-slate-500/50">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">TIER 1</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Pointer Apprentice</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Master fundamentals: basic pointer syntax, arrays, loops, and bitwise arithmetic.
            </p>
            <div className="mt-4 text-xs font-mono text-slate-500">0 - 100 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-cyan-500">
            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">TIER 2</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Memory Wrangler</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Dynamic memory allocation, linked lists, ring buffers, and re-entrant strings.
            </p>
            <div className="mt-4 text-xs font-mono text-cyan-600 dark:text-cyan-400">100 - 300 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-emerald-500">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">TIER 3</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Systems Architect</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Custom allocators, LRU caching, heap priority queues, and recursion without stack overflow.
            </p>
            <div className="mt-4 text-xs font-mono text-emerald-600 dark:text-emerald-400">300 - 700 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-purple-500">
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">TIER 4</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Kernel Virtuoso</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Top 1% competitive solvers. Flawless memory safety, zero segfaults, and arena champions.
            </p>
            <div className="mt-4 text-xs font-mono text-purple-600 dark:text-purple-400">700+ PTS</div>
          </div>
        </div>
      </section>

      {/* Campus Arena Preview Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] via-emerald-500/[0.02] to-transparent">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-semibold mb-4 border border-cyan-500/20">
              <Trophy className="w-3.5 h-3.5" />
              <span>Campus Competitive Arena</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Department Rivalries: Who Holds The Logic Crown?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              CSE, IT, AI & Data Science battle every week in timed programming arenas. Live ICPC penalty scoring, instant compilation verdicts, and campus leaderboard glory.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl font-mono text-sm font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-lg shadow-cyan-500/20"
              >
                Join Your Department
              </Link>
              <Link
                to="/login"
                className="px-5 py-3 rounded-xl font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] hover:border-slate-300 transition-all"
              >
                Sign In to Compete
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase">
            Workflow
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">How LogicQ Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold mb-4 font-mono text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily IST Drop</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Every day at 17:00 IST, one featured C challenge goes live. Solve it within 24 hours to keep your flame streak burning.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold mb-4 font-mono text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Code & Compile</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Write your solution in our Monaco IDE. Run against custom test inputs and submit against comprehensive evaluation test suites.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold mb-4 font-mono text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Climb & Compete</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Earn base points, first-solve bonuses, unlock honors badges, and compete with peers on daily and weekly leaderboards.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
