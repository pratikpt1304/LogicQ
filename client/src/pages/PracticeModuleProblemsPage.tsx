import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { DifficultyBadge } from '../components/common/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Code2,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface PracticeProblemRow {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  basePoints: number;
  moduleOrder: number;
  isSolved: boolean;
  attemptsCount: number;
  status: 'SOLVED' | 'ATTEMPTED' | 'NOT_STARTED';
}

export const PracticeModuleProblemsPage: React.FC = () => {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, error } = useQuery({
    queryKey: ['practice-module-problems', moduleSlug],
    queryFn: () => api.get(`/practice/modules/${moduleSlug}/problems`),
    retry: false,
  });

  const moduleInfo = data?.data?.module;
  const problems: PracticeProblemRow[] = data?.data?.problems || [];

  if (error) {
    const errObj = error as any;
    if (errObj?.status === 403 || errObj?.code === 'MODULE_LOCKED') {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Module Locked</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {errObj.message || `You must solve all ${PRACTICE_CONFIG.practiceUnlockThreshold} questions in the previous module to unlock this module.`}
          </p>
          <div className="pt-2">
            <Link
              to="/practice"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--accent)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Practice Modules</span>
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Preview Mode Notice */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Admin Preview Mode:</strong> You can review and test questions across all curriculum modules.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold shrink-0">
            ADMIN
          </span>
        </div>
      )}

      {/* Navigation & Header */}
      <div>
        <Link
          to="/practice"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Modules</span>
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-line)] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] mb-1">
              <span>MODULE {moduleInfo?.order || ''}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
              {moduleInfo?.title || 'Practice Module'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
              {moduleInfo?.description}
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-muted)] shrink-0">
            <span>{problems.filter((p) => p.isSolved).length} of {problems.length} Solved</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-4 border border-[var(--border-line)] animate-pulse flex items-center justify-between"
            >
              <div className="h-5 w-1/3 bg-[var(--bg-surface)] rounded" />
              <div className="h-5 w-20 bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-2xl border border-[var(--border-line)] text-[var(--text-muted)]">
          No practice problems available in this module yet.
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((prob) => (
            <Link
              key={prob.id}
              to={`/practice/${moduleSlug}/${prob.slug}`}
              className="glass-card rounded-xl p-4 border border-[var(--border-line)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-surface)]/60 transition-all flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-xs font-mono font-semibold text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0">
                  {prob.moduleOrder}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {prob.title}
                    </h3>
                    {prob.isSolved && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)] font-mono">
                    <span>{prob.category}</span>
                    <span>•</span>
                    <span>
                      {prob.attemptsCount === 0
                        ? 'Not attempted'
                        : `${prob.attemptsCount} attempt${prob.attemptsCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <DifficultyBadge difficulty={prob.difficulty as any} />
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                    prob.status === 'SOLVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : prob.status === 'ATTEMPTED'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]'
                  }`}
                >
                  {prob.status === 'SOLVED'
                    ? 'SOLVED'
                    : prob.status === 'ATTEMPTED'
                    ? 'ATTEMPTED'
                    : 'NEW'}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
