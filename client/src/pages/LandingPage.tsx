import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
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

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text-main)] max-w-4xl mx-auto leading-[1.15]">
          Think in logic.{' '}
          <span className="text-[var(--color-accent)]">
            Code in C.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto font-sans leading-relaxed">
          The daily campus platform for low-level mastery. Conquer daily memory, pointer, and algorithm
          challenges in C. Maintain your streak and climb the weekly campus ranks.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={user ? '/dashboard' : '/register'}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-colors"
          >
            <span>{user ? 'Go to Dashboard' : 'Register to Start'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface)] border border-[var(--border-line)] transition-all"
            >
              <LogIn className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </section>

      {/* Mastery Ranks Ladder Section */}
      <section id="ranks" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--color-success)] font-semibold tracking-wider uppercase">
            Progression
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-main)] mt-2">Mastery Rank Tiers</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-lg mx-auto">
            Solve daily challenges to climb through the campus developer ranks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-slate-500/50">
            <span className="text-xs font-mono text-[var(--text-muted)]">TIER 1</span>
            <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">Pointer Apprentice</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Master fundamentals: basic pointer syntax, arrays, loops, and bitwise arithmetic.
            </p>
            <div className="mt-4 text-xs font-mono text-[var(--text-muted)]">0 - 100 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-cyan-500">
            <span className="text-xs font-mono text-[var(--color-accent)]">TIER 2</span>
            <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">Memory Wrangler</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Dynamic memory allocation, linked lists, ring buffers, and re-entrant strings.
            </p>
            <div className="mt-4 text-xs font-mono text-[var(--color-accent)]">100 - 300 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-emerald-500">
            <span className="text-xs font-mono text-[var(--color-success)]">TIER 3</span>
            <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">Systems Architect</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Custom allocators, LRU caching, heap priority queues, and recursion without stack overflow.
            </p>
            <div className="mt-4 text-xs font-mono text-[var(--color-success)]">300 - 700 PTS</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-2 border-t-purple-500">
            <span className="text-xs font-mono text-[var(--color-accent)]">TIER 4</span>
            <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">Kernel Virtuoso</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Top 1% campus solvers. Flawless memory safety, zero segfaults, and weekly leaderboard champions.
            </p>
            <div className="mt-4 text-xs font-mono text-[var(--color-accent)]">700+ PTS</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 mb-12 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--color-accent)] font-semibold tracking-wider uppercase">
            Workflow
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-main)] mt-2">How LogicQ Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-accent)] font-bold mb-4 font-mono text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Daily IST Drop</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Every day at 17:00 IST, one featured C challenge goes live. Solve it or catch up on any unlocked challenge from the current week.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-success)] font-bold mb-4 font-mono text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Code & Compile</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Write your solution in our Monaco IDE. Run against custom test inputs and submit against comprehensive evaluation test suites.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-accent)] font-bold mb-4 font-mono text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Streaks & Leaderboard</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Earn base points, first-solve bonuses, maintain your daily solve streak, and compete with peers on the weekly campus leaderboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
