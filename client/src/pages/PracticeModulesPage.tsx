import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
import {
  Lock,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Code2,
  Sparkles,
  Layers,
  Eye,
  ShieldCheck,
  Target,
  ArrowRight,
} from 'lucide-react';

interface PracticeModuleItem {
  id: string;
  slug: string;
  title: string;
  order: number;
  description: string;
  isUnlocked: boolean;
  isAdminUnlocked?: boolean;
  requirementText: string;
  totalQuestions: number;
  solvedCount: number;
  progressPercent: number;
  isComingSoon?: boolean;
  canComplete?: boolean;
  distribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export const PracticeModulesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
  });

  const modules: PracticeModuleItem[] = data?.data?.modules || [];
  const { data: testsData } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => api.get('/exam/my-tests'),
    refetchOnWindowFocus: false,
  });

  const assignedTests = testsData?.data || testsData?.assignments || [];

  const totalProblems = modules.reduce((acc, m) => acc + (m.totalQuestions || 20), 0) || 80;
  const totalSolved = modules.reduce((acc, m) => acc + (m.solvedCount || 0), 0);
  const overallPercent = Math.round((totalSolved / totalProblems) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Clean Practice Header with Overall Progress */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] mb-1">
              <BookOpen className="w-4 h-4" />
              <span>SYLLABUS MASTERY TRACK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              C Programming Practice Modules
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
              Core curriculum exercises from foundational control structures to dynamic heap allocation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400">
                <Eye className="w-4 h-4" />
                <span>Admin Mode</span>
              </div>
            )}
            <Link
              to="/student/tests"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Assigned Tests</span>
              {assignedTests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold text-[10px]">
                  {assignedTests.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[var(--text-main)] flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Total Solved: {totalSolved} / {totalProblems} Problems ({overallPercent}%)</span>
            </span>
            <span className="text-[var(--text-muted)] font-semibold">
              {totalProblems - totalSolved} remaining
            </span>
          </div>

          <div className="w-full bg-[var(--bg-panel)] h-2.5 rounded-full overflow-hidden border border-[var(--border-line)]/40">
            <div
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(overallPercent, 2)}%` }}
            />
          </div>

          {/* Core Categories */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] text-cyan-400 border border-cyan-500/20 font-semibold">
              ⚡ Branching &amp; Decisions
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] text-emerald-400 border border-emerald-500/20 font-semibold">
              🔁 Loops &amp; Iteration
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] text-indigo-400 border border-indigo-500/20 font-semibold">
              📊 Arrays &amp; Matrices
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] text-purple-400 border border-purple-500/20 font-semibold">
              🎯 Pointers &amp; Functions
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] text-amber-400 border border-amber-500/20 font-semibold">
              🧠 Structs &amp; Dynamic Memory
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-6 border border-[var(--border-line)] animate-pulse space-y-4"
            >
              <div className="h-6 w-3/4 bg-[var(--bg-surface)] rounded" />
              <div className="h-4 w-full bg-[var(--bg-surface)] rounded" />
              <div className="h-2 w-full bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center glass-card rounded-2xl border border-red-500/20 text-red-400 space-y-3 font-mono">
          <p>Failed to load practice modules. Please check your connection.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-[#0C0F1F] font-bold text-xs rounded-lg hover:opacity-95"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod) => {
            const isCompleted = mod.totalQuestions > 0 && mod.solvedCount >= mod.totalQuestions;
            const percent = mod.progressPercent || 0;

            return (
              <Link
                key={mod.id}
                to={`/practice/${mod.slug}`}
                className="glass-card border border-[var(--border-line)] hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                {/* Header row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent)]">
                      MODULE {mod.order}
                    </span>

                    {isCompleted ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>COMPLETED</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                        <span>View Problems</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">
                    {mod.title}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                {/* Footer progress & breakdown */}
                <div className="mt-6 pt-4 border-t border-[var(--border-line)]/60 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-[var(--text-muted)]">Progress</span>
                      <span className="text-[var(--text-main)] font-semibold">
                        {mod.solvedCount} / {mod.totalQuestions} solved ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Difficulty composition pill badges */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{mod.distribution?.EASY ?? 0} Easy</span>
                      <span>•</span>
                      <span className="text-amber-400">{mod.distribution?.MEDIUM ?? 0} Med</span>
                      <span>•</span>
                      <span className="text-rose-400">{mod.distribution?.HARD ?? 0} Hard</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      <span>Practice</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
