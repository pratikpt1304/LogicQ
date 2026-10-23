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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-line)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>SYLLABUS MASTERY TRACK</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Practice Modules
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl">
            Sharpen your core C programming competencies with 4 sequentially unlocking curriculum modules.
            Solve all {PRACTICE_CONFIG.practiceUnlockThreshold} questions in each module to unlock the next one.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400">
              <Eye className="w-4 h-4" />
              <span>Admin Preview Enabled</span>
            </div>
          )}
          <Link
            to="/student/tests"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] transition-colors group"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Assigned Tests</span>
            {assignedTests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[10px] border border-cyan-500/30">
                {assignedTests.length}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-muted)]">
            <Code2 className="w-4 h-4 text-[var(--accent)]" />
            <span>80 Total Practice Problems</span>
          </div>
        </div>
      </div>

      {/* Active Institutional Lab Assessment Banner */}
      {assignedTests.length > 0 && (
        <div className="glass-card p-5 sm:p-6 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-[var(--bg-panel)] to-blue-950/15 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>ACTIVE LAB ASSESSMENT ASSIGNED</span>
                </div>
                <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight">
                  {assignedTests[0]?.test?.testName || 'Institutional Assessment Test'}
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Section: {assignedTests[0]?.test?.section?.sectionName || 'Enrolled Section'} • {assignedTests.length} Test{assignedTests.length > 1 ? 's' : ''} Available • Zero-Reattempt Evaluation
                </p>
              </div>
            </div>
            <Link
              to="/student/tests"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0C0F1F] font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-md flex-shrink-0"
            >
              <span>Go to Assessment Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

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
            const isComingSoon = Boolean(mod.isComingSoon || mod.totalQuestions < 10);
            const isCompleted = !isComingSoon && mod.totalQuestions >= 10 && mod.solvedCount >= mod.totalQuestions;
            const isClickable = mod.isUnlocked || isAdmin;

            const cardContent = (
              <div
                className={`relative h-full flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 ${
                  isClickable
                    ? 'glass-card border-[var(--border-line)] hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 group cursor-pointer'
                    : 'bg-[var(--bg-surface)]/40 border-[var(--border-line)] opacity-75 cursor-not-allowed select-none'
                }`}
              >
                {/* Header row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent)]">
                      MODULE {mod.order}
                    </span>

                    {mod.isUnlocked ? (
                      isCompleted ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>COMPLETED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                          <span>View Problems</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )
                    ) : isAdmin ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40">
                        <Eye className="w-3.5 h-3.5" />
                        <span>PREVIEW (ADMIN)</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">
                    {mod.title}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2">
                    {mod.description}
                  </p>
                </div>

                {/* Footer progress & unlock condition */}
                <div className="mt-6 pt-4 border-t border-[var(--border-line)]/60 space-y-3">
                  {mod.isUnlocked ? (
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-[var(--text-muted)]">Progress</span>
                        <span className="text-[var(--text-main)] font-semibold">
                          {mod.solvedCount} / {mod.totalQuestions} solved ({mod.progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 transition-all duration-300 rounded-full"
                          style={{ width: `${mod.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-mono font-medium px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-sm">
                      <Lock className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                      <span className="font-semibold text-amber-950 dark:text-amber-200">{mod.requirementText}</span>
                    </div>
                  )}

                  {/* Difficulty composition pill badges or Coming Soon */}
                  {isComingSoon ? (
                    <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
                        Coming soon
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px]">
                        ({mod.totalQuestions}/10 questions published)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-[var(--text-muted)]">
                      <span className="text-emerald-400">{mod.distribution?.EASY ?? 0} Easy</span>
                      <span>•</span>
                      <span className="text-amber-400">{mod.distribution?.MEDIUM ?? 0} Med</span>
                      <span>•</span>
                      <span className="text-rose-400">{mod.distribution?.HARD ?? 0} Hard</span>
                    </div>
                  )}
                </div>
              </div>
            );

            if (isClickable) {
              return (
                <Link key={mod.id} to={`/practice/${mod.slug}`}>
                  {cardContent}
                </Link>
              );
            }

            return <div key={mod.id}>{cardContent}</div>;
          })}
        </div>
      )}
    </div>
  );
};
