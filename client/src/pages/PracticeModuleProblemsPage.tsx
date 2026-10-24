import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { DifficultyBadge } from '../components/common/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import { PRACTICE_CONFIG, isModule5UnlockedByAdmin } from '../config/practice.config.js';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Code2,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Eye,
  Search,
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

  const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD' | 'UNSOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: modulesData } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['practice-module-problems', moduleSlug],
    queryFn: () => api.get(`/practice/modules/${moduleSlug}/problems`),
    retry: false,
  });

  const allModules = modulesData?.data?.modules || [];
  const targetModuleIdx = PRACTICE_CONFIG.MODULES.findIndex((m) => m.slug === moduleSlug);
  const targetModule = targetModuleIdx >= 0 ? PRACTICE_CONFIG.MODULES[targetModuleIdx] : null;

  let isLockedByProgression = false;
  let lockReason = '';

  if (!isAdmin && targetModuleIdx > 0) {
    if (targetModule?.order === 5 || targetModule?.requiresAdminUnlock) {
      if (!isModule5UnlockedByAdmin()) {
        isLockedByProgression = true;
        lockReason = 'Module 5 is locked by your Instructor / Admin for all students.';
      }
    } else {
      const prevModuleSlug = PRACTICE_CONFIG.MODULES[targetModuleIdx - 1]?.slug;
      const prevMod = allModules.find((m: any) => m.slug === prevModuleSlug);
      const prevSolved = prevMod?.solvedCount ?? 0;
      if (prevSolved < 20) {
        isLockedByProgression = true;
        lockReason = `You must solve all 20 questions in Module ${targetModuleIdx} (${PRACTICE_CONFIG.MODULES[targetModuleIdx - 1]?.title}) before unlocking this module (${prevSolved}/20 solved).`;
      }
    }
  }

  const moduleInfo = data?.data?.module;
  const problems: PracticeProblemRow[] = data?.data?.problems || [];

  const filteredProblems = problems.filter((p) => {
    if (filterDifficulty === 'EASY' && p.difficulty !== 'EASY') return false;
    if (filterDifficulty === 'MEDIUM' && p.difficulty !== 'MEDIUM') return false;
    if (filterDifficulty === 'HARD' && p.difficulty !== 'HARD') return false;
    if (filterDifficulty === 'UNSOLVED' && p.isSolved) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  });

  if (isLockedByProgression || error) {
    const errObj = error as any;
    if (isLockedByProgression || errObj?.status === 403 || errObj?.code === 'MODULE_LOCKED') {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Module Locked</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {lockReason || errObj?.message || `You must solve all ${PRACTICE_CONFIG.practiceUnlockThreshold} questions in the previous module to unlock this module.`}
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
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 text-xs font-mono text-amber-950 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-950 dark:text-amber-100 font-bold">Admin Preview Mode:</strong> You can review and test questions across all curriculum modules.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 dark:bg-amber-400/20 dark:text-amber-300 font-bold shrink-0">
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

          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] font-semibold shrink-0">
            <span>{problems.filter((p) => p.isSolved).length} of {problems.length} Solved</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterDifficulty('ALL')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterDifficulty === 'ALL'
                ? 'bg-[var(--accent)] text-[#0C0F1F] font-bold border-transparent'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)]'
            }`}
          >
            All ({problems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDifficulty('EASY')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterDifficulty === 'EASY'
                ? 'bg-emerald-500 text-white font-bold border-transparent'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)]'
            }`}
          >
            Easy ({problems.filter((p) => p.difficulty === 'EASY').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDifficulty('MEDIUM')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterDifficulty === 'MEDIUM'
                ? 'bg-amber-500 text-white font-bold border-transparent'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)]'
            }`}
          >
            Medium ({problems.filter((p) => p.difficulty === 'MEDIUM').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDifficulty('HARD')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterDifficulty === 'HARD'
                ? 'bg-rose-500 text-white font-bold border-transparent'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)]'
            }`}
          >
            Hard ({problems.filter((p) => p.difficulty === 'HARD').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDifficulty('UNSOLVED')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterDifficulty === 'UNSOLVED'
                ? 'bg-indigo-600 text-white font-bold border-transparent'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)]'
            }`}
          >
            Unsolved ({problems.filter((p) => !p.isSolved).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
          />
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
      ) : filteredProblems.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-2xl border border-[var(--border-line)] text-[var(--text-muted)] font-mono text-xs">
          No practice problems match your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProblems.map((prob) => (
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
                {prob.status === 'SOLVED' && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SOLVED</span>
                  </span>
                )}
                {prob.status === 'ATTEMPTED' && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    ATTEMPTED
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
