import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  PRACTICE_CONFIG,
  isModule5UnlockedByAdmin,
  setModule5UnlockedByAdmin,
} from '../config/practice.config.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { PRACTICE_MODULE_5_PROBLEMS } from '../data/practice-module5.data.js';
import { auth } from '../config/firebase.js';
import { getSolvedPracticeTopicIds, markPracticeTopicSolved } from './TopicPracticeHubPage.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { toast } from 'sonner';

const MODULE_PROBLEM_SLUGS: Record<string, string[]> = {
  'control-structures': PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug),
  'pointers-and-functions': PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug),
  'arrays-and-strings': PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug),
  'array-and-its-applications': PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug),
  'recursion-and-bit-manipulation': PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug),
  'advanced-data-types-dynamic-memory': PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug),
  'structures-unions-and-dma': PRACTICE_MODULE_5_PROBLEMS.map((p) => p.slug),
};
import {
  Lock,
  Unlock,
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
  AlertTriangle,
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

  const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
  const [module5Unlocked, setModule5Unlocked] = useState<boolean>(isModule5UnlockedByAdmin());
  const [solvedTopics, setSolvedTopics] = useState<string[]>(() => getSolvedPracticeTopicIds(effectiveUid));

  // Sync and restore solved practice topics from Firestore and local storage
  useEffect(() => {
    (async () => {
      try {
        const stats = await FirestoreDataService.getStatsBackup(effectiveUid);
        const prog = await FirestoreDataService.getPracticeProgress(effectiveUid);
        const fallbackSolvedSlugs: string[] = [];
        try {
          const rawProg = localStorage.getItem('logicq_fallback_practice_progress_v1');
          if (rawProg) {
            const progMap = JSON.parse(rawProg);
            Object.keys(progMap).forEach((k) => {
              if (progMap[k]?.isSolved) {
                const cleanSlug = k.includes(':') ? k.split(':')[1] : k;
                fallbackSolvedSlugs.push(cleanSlug);
              }
            });
          }
        } catch {}

        const cloudSolved = Array.from(
          new Set([
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
            ...fallbackSolvedSlugs,
            ...getSolvedPracticeTopicIds(effectiveUid),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => markPracticeTopicSolved(id, effectiveUid));
          setSolvedTopics(getSolvedPracticeTopicIds(effectiveUid));
        }
      } catch (err) {
        console.warn('PracticeModules restore error:', err);
      }
    })();
  }, [user, effectiveUid]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const modules: PracticeModuleItem[] = data?.data?.modules || [];
  const { data: testsData } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => api.get('/exam/my-tests'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const assignedTests = testsData?.data || testsData?.assignments || [];

  const handleToggleModule5 = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextVal = !module5Unlocked;
    setModule5Unlocked(nextVal);
    setModule5UnlockedByAdmin(nextVal);
    refetch();
    if (nextVal) {
      toast.success('Module 5 has been unlocked for all students!');
    } else {
      toast.info('Module 5 is now locked for all students.');
    }
  };

  // Build the 5 sequential modules with strict mastery unlocking
  const allConfigModules = PRACTICE_CONFIG.MODULES;
  const displayModules = allConfigModules.map((cfg, idx) => {
    const fromApi = modules.find((m) => m.slug === cfg.slug);
    const topicsSolvedInModule = TOPIC_PRACTICE_DATA.filter(
      (t) => t.moduleSlug === cfg.slug && solvedTopics.includes(t.id)
    ).length;
    const slugsForModule = MODULE_PROBLEM_SLUGS[cfg.slug] || [];
    const problemsSolvedInModule = slugsForModule.filter((slug) => solvedTopics.includes(slug)).length;
    const solvedCount = Math.max(fromApi?.solvedCount ?? 0, topicsSolvedInModule, problemsSolvedInModule);
    const totalQuestions = fromApi?.totalQuestions || cfg.totalQuestions || 20;
    const progressPercent = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0;

    // 1. Check practice topics for THIS module (Every module requires its own practice completed first)
    const currentModuleTopics = TOPIC_PRACTICE_DATA.filter(
      (t) => t.moduleIndex === cfg.order || t.moduleSlug === cfg.slug
    );
    const modPracticeTotal = currentModuleTopics.length;
    const modPracticeSolved = currentModuleTopics.filter((t) => solvedTopics.includes(t.id)).length;
    const isPracticeComplete = modPracticeTotal === 0 || modPracticeSolved >= modPracticeTotal;

    // 2. Progressive Lock Evaluation:
    let isUnlocked = false;
    let requirementText = '';

    if (cfg.order === 5 || cfg.requiresAdminUnlock) {
      const isM5Unlocked = module5Unlocked || isModule5UnlockedByAdmin();
      if (!isPracticeComplete) {
        isUnlocked = Boolean(isAdmin);
        requirementText = `Solve all ${modPracticeTotal} practice questions in Module ${cfg.order} (${cfg.title}) on the Practice tab to unlock this Lab Internal Test (${modPracticeSolved}/${modPracticeTotal} solved)`;
      } else if (!isM5Unlocked) {
        isUnlocked = Boolean(isAdmin);
        requirementText = isUnlocked
          ? 'Activated by Instructor'
          : 'Locked by Instructor / Admin for all students';
      } else {
        isUnlocked = true;
      }
    } else if (idx === 0) {
      // Module 1: Requires all Module 1 practice topics solved
      isUnlocked = Boolean(isPracticeComplete || isAdmin);
      if (!isUnlocked) {
        requirementText = `Solve all ${modPracticeTotal} practice questions in Module 1 (${cfg.title}) on the Practice tab to unlock this Lab Internal Test (${modPracticeSolved}/${modPracticeTotal} solved)`;
      }
    } else {
      // Module 2, 3, 4: Requires:
      // A) All practice questions of THIS module must be solved first
      // B) Previous module's test problems must be solved (20/20)
      const prevModFromApi = modules.find((m) => m.order === cfg.order - 1);
      const prevConfig = allConfigModules[idx - 1];
      const prevTopicsSolved = TOPIC_PRACTICE_DATA.filter(
        (t) => t.moduleSlug === prevConfig.slug && solvedTopics.includes(t.id)
      ).length;
      const prevSlugs = MODULE_PROBLEM_SLUGS[prevConfig.slug] || [];
      const prevProblemsSolved = prevSlugs.filter((slug) => solvedTopics.includes(slug)).length;
      const prevSolved = Math.max(prevModFromApi?.solvedCount ?? 0, prevTopicsSolved, prevProblemsSolved);
      const prevRequired = cfg.requiredSolvedToUnlock || 20;

      if (!isPracticeComplete) {
        isUnlocked = Boolean(isAdmin);
        requirementText = `Solve all ${modPracticeTotal} practice questions in Module ${cfg.order} (${cfg.title}) on the Practice tab to unlock this Lab Internal Test (${modPracticeSolved}/${modPracticeTotal} solved)`;
      } else if (prevSolved < prevRequired) {
        isUnlocked = Boolean(isAdmin);
        requirementText = `Solve all 20 problems in Module ${prevConfig.order} (${prevConfig.title}) to unlock (${prevSolved}/20 solved)`;
      } else {
        isUnlocked = true;
      }
    }

    return {
      id: cfg.id,
      slug: cfg.slug,
      title: cfg.title,
      order: cfg.order,
      description: cfg.description,
      isUnlocked: Boolean(isUnlocked || isAdmin),
      isAdminUnlocked: Boolean(isAdmin),
      requirementText,
      totalQuestions,
      solvedCount,
      progressPercent,
      distribution: fromApi?.distribution || cfg.distribution,
      isModule5: cfg.order === 5,
    };
  });

  const totalProblems = displayModules.reduce((acc, m) => acc + (m.totalQuestions || 20), 0) || 100;
  const totalSolved = displayModules.reduce((acc, m) => acc + (m.solvedCount || 0), 0);
  const overallPercent = Math.round((totalSolved / totalProblems) * 100);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
      {/* Clean Practice Header with Overall Progress */}
      <div className="glass-card p-4 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] mb-1 font-bold">
              <BookOpen className="w-4 h-4" />
              <span>LAB INTERNAL • CONTINUOUS EVALUATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Lab Internal (Coursework Modules)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
              Official lab coursework modules. Practice prerequisites must be completed to unlock each module.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400">
                <Eye className="w-4 h-4" />
                <span>Instructor View</span>
              </div>
            )}
            <Link
              to="/practice"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Code2 className="w-4 h-4" />
              <span>Practice Arena</span>
            </Link>
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

          {/* Module Step Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1 text-[11px] font-mono">
            {displayModules.map((m) => (
              <span
                key={m.id}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  m.solvedCount >= 20
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : m.isUnlocked
                    ? 'bg-[var(--bg-panel)] text-[var(--accent)] border-[var(--accent)]/30'
                    : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border-[var(--border-line)] opacity-60'
                }`}
              >
                {!m.isUnlocked && <Lock className="w-3 h-3" />}
                {m.solvedCount >= 20 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span>Mod {m.order}: {m.solvedCount}/20</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
          {displayModules.map((mod) => {
            const isCompleted = mod.totalQuestions > 0 && mod.solvedCount >= mod.totalQuestions;
            const percent = mod.progressPercent || 0;
            const canAccess = mod.isUnlocked || isAdmin;

            // Render Unlocked Module as Clickable Link
            if (canAccess) {
              return (
                <Link
                  key={mod.id}
                  to={`/practice/${mod.slug}`}
                  className="glass-card border border-[var(--border-line)] hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                >
                  {/* Header row */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent)]">
                          MODULE {mod.order}
                        </span>
                        {mod.isModule5 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            CAPSTONE ARENA
                          </span>
                        )}
                      </div>

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

                    {/* Admin Toggle on Module 5 */}
                    {mod.isModule5 && isAdmin && (
                      <div className="pt-3 border-t border-[var(--border-line)]/60 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Instructor Control:</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleModule5}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                            module5Unlocked
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          }`}
                        >
                          {module5Unlocked ? '🔒 Lock for Students' : '🔓 Unlock for All Students'}
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            }

            // Render Locked Module as Disabled / Non-Clickable Card
            return (
              <div
                key={mod.id}
                className="glass-card border border-[var(--border-line)]/60 bg-[var(--bg-panel)]/40 rounded-2xl p-6 flex flex-col justify-between opacity-75 select-none relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)]">
                      MODULE {mod.order}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md font-mono">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{mod.isModule5 ? 'FACULTY LOCKED' : 'LOCKED'}</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-muted)] flex items-center gap-2">
                    <span>{mod.title}</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]/70 mt-1.5 line-clamp-2 leading-relaxed">
                    {mod.description}
                  </p>

                  {/* Lock Requirement Box */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {mod.requirementText || 'Complete previous module to unlock.'}
                    </span>
                  </div>


                </div>

                {/* Footer Locked Status */}
                <div className="mt-6 pt-4 border-t border-[var(--border-line)]/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                    <span>Progress</span>
                    <span>Locked (0 / {mod.totalQuestions} solved)</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--bg-surface)]/60 overflow-hidden">
                    <div className="h-full bg-slate-600/40 w-0" />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[var(--text-muted)]">
                    <div className="flex items-center gap-2 opacity-60">
                      <span>{mod.distribution?.EASY ?? 0} Easy</span>
                      <span>•</span>
                      <span>{mod.distribution?.MEDIUM ?? 0} Med</span>
                      <span>•</span>
                      <span>{mod.distribution?.HARD ?? 0} Hard</span>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] font-mono text-xs border border-[var(--border-line)] flex items-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Locked</span>
                    </span>
                  </div>

                  {/* Admin Unlock Control if Admin */}
                  {mod.isModule5 && isAdmin && (
                    <div className="pt-3 border-t border-[var(--border-line)]/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Instructor Control:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleModule5}
                        className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
                      >
                        🔓 Unlock for All Students
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PracticeModulesPage;
