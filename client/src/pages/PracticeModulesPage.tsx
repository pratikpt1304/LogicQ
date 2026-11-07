import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { toast } from 'sonner';
import {
  PRACTICE_CONFIG,
} from '../config/practice.config.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { getSolvedPracticeTopicIds, markPracticeTopicSolved } from './TopicPracticeHubPage.js';
import {
  getLabModuleUnlockInfo,
  getPracticeModuleSolvedCount,
  getLabModuleSolvedCount,
  isPracticeModuleComplete,
  isLabModuleComplete,
} from '../utils/progression.js';
import {
  Lock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Code2,
  Home,
  ArrowLeft,
  Sparkles,
  Layers,
  Eye,
  ShieldCheck,
  Target,
  ArrowRight,
  Search,
  Play,
  Check,
  Award,
  Zap,
  Info,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface ModuleConfigItem {
  order: number;
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  problems: PracticeProblemDef[];
  isModule5?: boolean;
}

const MODULE_DEFINITIONS: ModuleConfigItem[] = [
  {
    order: 1,
    id: 'module-1',
    slug: 'control-structures',
    title: 'Control Structures',
    shortTitle: 'Control Flow',
    description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
    problems: PRACTICE_MODULE_1_PROBLEMS,
  },
  {
    order: 2,
    id: 'module-2',
    slug: 'pointers-and-functions',
    title: 'Pointers and Functions',
    shortTitle: 'Pointers & Funcs',
    description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
    problems: PRACTICE_MODULE_2_PROBLEMS,
  },
  {
    order: 3,
    id: 'module-3',
    slug: 'array-and-its-applications',
    title: 'Array and its Applications',
    shortTitle: 'Arrays & Strings',
    description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
    problems: PRACTICE_MODULE_3_PROBLEMS,
  },
  {
    order: 4,
    id: 'module-4',
    slug: 'advanced-data-types-dynamic-memory',
    title: 'Advanced Data Types & Dynamic Memory',
    shortTitle: 'Dynamic Memory',
    description: 'Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked structures.',
    problems: PRACTICE_MODULE_4_PROBLEMS,
  },
];

export const PracticeModulesPage: React.FC = () => {
  const { moduleSlug } = useParams<{ moduleSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { user, isFaculty } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isPrivileged = Boolean(isAdmin || isFaculty);

  const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
  const [solvedTopics, setSolvedTopics] = useState<string[]>(() => getSolvedPracticeTopicIds(effectiveUid));
  const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | 'TODO' | 'SOLVED' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync and restore solved practice topics from Firestore and local storage
  const refreshSolvedTopics = useCallback(async () => {
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
          ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
        ])
      );
      if (cloudSolved.length > 0) {
        cloudSolved.forEach((id) => {
          markPracticeTopicSolved(id, effectiveUid);
          if (user?.prn) markPracticeTopicSolved(id, user.prn);
        });
        setSolvedTopics(getSolvedPracticeTopicIds(effectiveUid));
      }
    } catch (err) {
      console.warn('PracticeModules restore error:', err);
    }
  }, [effectiveUid, user?.prn]);

  useEffect(() => {
    refreshSolvedTopics();
    const unsubSub = RealtimeSyncService.on('SUBMISSIONS', () => {
      refreshSolvedTopics();
    });
    const unsubDash = RealtimeSyncService.on('DASHBOARD', () => {
      refreshSolvedTopics();
    });
    return () => {
      unsubSub();
      unsubDash();
    };
  }, [refreshSolvedTopics]);

  // Read backend modules data if available
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: testsData } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: async () => {
      try {
        const res = await api.get('/exam/my-tests');
        return res;
      } catch {
        return { data: [], assignments: [] };
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const assignedTests = testsData?.data || testsData?.assignments || [];

  // Determine active selected module (1 to 5)
  const selectedModuleOrder = useMemo(() => {
    if (moduleSlug) {
      const match = MODULE_DEFINITIONS.find(
        (m) =>
          m.slug === moduleSlug ||
          (m.order === 3 && (moduleSlug === 'arrays-and-strings' || moduleSlug === 'array-and-its-applications')) ||
          (m.order === 4 && (moduleSlug === 'structures-and-memory' || moduleSlug === 'recursion-and-bit-manipulation')) ||
          (m.order === 5 && moduleSlug === 'structures-unions-and-dma')
      );
      if (match) return match.order;
    }
    const q = parseInt(searchParams.get('module') || '', 10);
    if (q >= 1 && q <= 4) return q;
    return 1;
  }, [moduleSlug, searchParams]);

  const handleSelectModule = (order: number) => {
    setSearchParams({ module: String(order) });
  };

  // Build module progression cards
  const moduleCards = useMemo(() => {
    return MODULE_DEFINITIONS.map((def) => {
      const slugs = def.problems.map((p) => p.slug);
      const solvedInModule = slugs.filter((slug) => solvedTopics.includes(slug)).length;
      const totalQuestions = def.problems.length || 20;
      const progressPercent = Math.round((solvedInModule / totalQuestions) * 100);

      const unlockInfo = getLabModuleUnlockInfo(def.order, solvedTopics, Boolean(isPrivileged || isAdmin));
      const isUnlocked = Boolean(unlockInfo.isUnlocked || isPrivileged);

      return {
        ...def,
        solvedCount: solvedInModule,
        totalQuestions,
        progressPercent,
        isUnlocked,
        requirementText: unlockInfo.lockReason,
        isCompleted: solvedInModule >= totalQuestions,
      };
    });
  }, [solvedTopics, isPrivileged, isAdmin]);

  // Overall stats
  const totalLabProblems = 80;
  const totalLabSolved = useMemo(() => {
    return moduleCards.reduce((acc, m) => acc + m.solvedCount, 0);
  }, [moduleCards]);
  const overallPercent = Math.round((totalLabSolved / totalLabProblems) * 100);
  const cieMarks = (totalLabSolved * 0.25).toFixed(1);

  // Active module details
  const activeModule = useMemo(() => {
    return moduleCards.find((m) => m.order === selectedModuleOrder) || moduleCards[0];
  }, [moduleCards, selectedModuleOrder]);

  // Filtered problems in active module
  const activeProblems = useMemo(() => {
    return activeModule.problems.map((prob, idx) => {
      const isSolved = solvedTopics.includes(prob.slug);
      return {
        ...prob,
        index: idx + 1,
        isSolved,
      };
    });
  }, [activeModule, solvedTopics]);

  // Next up unsolved problem in active module
  const nextProblem = useMemo(() => {
    if (!activeModule.isUnlocked) return null;
    return activeProblems.find((p) => !p.isSolved) || null;
  }, [activeModule.isUnlocked, activeProblems]);

  // Filter & search questions
  const displayedProblems = useMemo(() => {
    return activeProblems.filter((prob) => {
      if (filterDifficulty === 'TODO' && prob.isSolved) return false;
      if (filterDifficulty === 'SOLVED' && !prob.isSolved) return false;
      if (filterDifficulty === 'EASY' && prob.difficulty !== 'EASY') return false;
      if (filterDifficulty === 'MEDIUM' && prob.difficulty !== 'MEDIUM') return false;
      if (filterDifficulty === 'HARD' && prob.difficulty !== 'HARD') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = prob.title.toLowerCase().includes(query);
        const matchesCat = (prob.category || '').toLowerCase().includes(query);
        const matchesSlug = prob.slug.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCat && !matchesSlug) return false;
      }
      return true;
    });
  }, [activeProblems, filterDifficulty, searchQuery]);

  const handleLaunchQuestionFullscreen = () => {
    try {
      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      if (!isMobile) {
        const elem = document.documentElement as any;
        if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen().catch(() => {});
          }
        }
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-6 sm:py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Apple Navigation Crumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all active:scale-95 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Exit to Dashboard</span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* Apple HIG Frosted Header with Live Progress & Quick Links */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lab Internal • CIE Continuous Evaluation</span>
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Eye className="w-3 h-3" />
                    <span>Admin Mode</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Lab Coursework Modules
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Official proctored coursework modules for continuous internal evaluation (20 Marks).
                Solve questions sequentially with instant GCC 14 compiler feedback.
              </p>
            </div>

            {/* Apple Stat Pills & Quick Navigation */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  CIE Score
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{cieMarks}</span>
                  <span className="text-xs text-slate-400 font-normal">/ 20 M</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Solved
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{totalLabSolved}</span>
                  <span className="text-xs text-slate-400 font-normal">/ {totalLabProblems}</span>
                </div>
              </div>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-semibold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/practice"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Practice Arena →</span>
              </Link>
            </div>
          </div>

          {/* Minimalist Progress Track */}
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>Overall Lab Coursework Progress</span>
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {overallPercent}% Completed ({totalLabProblems - totalLabSolved} remaining)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(overallPercent, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Apple Segmented Module Switcher (0ms, 1-Click Instant Tab) */}
        {/* ========================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 px-1">
            <span className="font-bold tracking-wider uppercase">Select Lab Module</span>
            <span>4 Sequential Modules • 20 Questions Each</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-3xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner">
            {moduleCards.map((mod) => {
              const isSelected = mod.order === selectedModuleOrder;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectModule(mod.order)}
                  className={`relative flex flex-col items-start justify-between p-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5 dark:ring-white/10'
                      : 'hover:bg-white/60 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      MOD 0{mod.order}
                    </span>

                    {mod.isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : !mod.isUnlocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>

                  <div className="w-full min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {mod.shortTitle}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5 text-slate-400 dark:text-slate-500">
                      {mod.isUnlocked ? `${mod.solvedCount}/20 solved` : 'Locked'}
                    </div>
                  </div>

                  {/* Micro progress bar under active button */}
                  <div className="w-full h-1 rounded-full bg-slate-200/60 dark:bg-slate-700/60 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        mod.isCompleted ? 'bg-emerald-500' : mod.isUnlocked ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      style={{ width: `${mod.progressPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* Module Content View: Unlocked (Questions) vs Locked (Hero) */}
        {/* ========================================================= */}
        {activeModule.isUnlocked ? (
          <div className="space-y-6">

            {/* 1-Click "Next Up: Continue Solving" Hero Spotlight Card */}
            {nextProblem ? (
              <div className="relative rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/15 dark:via-teal-500/10 p-6 sm:p-7 shadow-lg shadow-emerald-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <Sparkles className="w-3 h-3" />
                      Next Up • Question #{nextProblem.index} of 20
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        nextProblem.difficulty === 'EASY'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : nextProblem.difficulty === 'MEDIUM'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {nextProblem.difficulty}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {nextProblem.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {nextProblem.category} • GCC 14 C11 proctored test cases with instant automated evaluation.
                  </p>
                </div>

                <Link
                  to={`/lab-internal/${activeModule.slug}/${nextProblem.slug}`}
                  onClick={handleLaunchQuestionFullscreen}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Continue Solving Question {nextProblem.index} →</span>
                </Link>
              </div>
            ) : (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-7 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  Module 0{activeModule.order} Completed!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Outstanding job! You have solved all 20 questions in {activeModule.title}.
                  {activeModule.order < 5 && ' Continue with the next module to maximize your CIE score.'}
                </p>
              </div>
            )}

            {/* Questions Header with Filter Pills & Search */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activeModule.title}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({activeModule.solvedCount}/20 Solved)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeModule.description}
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
                  {(['ALL', 'TODO', 'SOLVED'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFilterDifficulty(mode)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none font-semibold ${
                        filterDifficulty === mode
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {mode === 'ALL'
                        ? `All (${activeProblems.length})`
                        : mode === 'TODO'
                        ? `To Do (${activeProblems.filter((p) => !p.isSolved).length})`
                        : `Solved (${activeProblems.filter((p) => p.isSolved).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Difficulty Breakdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="relative sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 20 module problems..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-emerald-500 font-semibold">8 Easy</span>
                  <span>•</span>
                  <span className="text-amber-500 font-semibold">8 Medium</span>
                  <span>•</span>
                  <span className="text-rose-500 font-semibold">4 Hard</span>
                </div>
              </div>
            </div>

            {/* Apple Minimalist Question List (20 Questions) */}
            <div className="space-y-2.5">
              {displayedProblems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-400 font-mono text-xs">
                  No problems match your current search or filter.
                </div>
              ) : (
                displayedProblems.map((prob) => {
                  const sorted = activeProblems;
                  const probIdx = prob.index - 1;
                  // Sequential unlock: question 1 is unlocked, question N requires question N-1 solved unless admin
                  const isProbLocked =
                    probIdx > 0 &&
                    !sorted[probIdx - 1]?.isSolved &&
                    !prob.isSolved &&
                    !isAdmin;
                  const isNextUp = nextProblem?.slug === prob.slug;

                  if (isProbLocked) {
                    return (
                      <div
                        key={prob.slug}
                        onClick={() =>
                          toast.error(
                            `🔒 Question #${prob.index} is locked! Complete Question #${prob.index - 1} first.`
                          )
                        }
                        className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5 flex items-center justify-between gap-4 opacity-50 cursor-not-allowed select-none transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 shrink-0">
                            <Lock className="w-3.5 h-3.5" />
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
                                {prob.title}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500">
                                Locked
                              </span>
                            </div>
                            <div className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                              Solve Question #{prob.index - 1} first to unlock
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              prob.difficulty === 'EASY'
                                ? 'bg-emerald-500/10 text-emerald-600/70'
                                : prob.difficulty === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-600/70'
                                : 'bg-rose-500/10 text-rose-600/70'
                            }`}
                          >
                            {prob.difficulty}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 text-slate-400 text-xs font-mono">
                            Locked
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={prob.slug}
                      to={`/lab-internal/${activeModule.slug}/${prob.slug}`}
                      onClick={handleLaunchQuestionFullscreen}
                      className={`group rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none ${
                        isNextUp
                          ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-sm'
                          : prob.isSolved
                          ? 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-emerald-500/40 hover:bg-white dark:hover:bg-slate-900'
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                            prob.isSolved
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : isNextUp
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {prob.isSolved ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : isNextUp ? (
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          ) : (
                            prob.index
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                              {prob.title}
                            </h4>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                prob.difficulty === 'EASY'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : prob.difficulty === 'MEDIUM'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {prob.difficulty}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                            {prob.category || activeModule.shortTitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {prob.isSolved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Solved</span>
                          </span>
                        ) : isNextUp ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-md shadow-emerald-600/20 transition-all">
                            <span>Solve →</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                            <span>Solve</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* Locked State: Apple Sleek Frosted Card (No Ugly Alerts)  */
          /* ========================================================= */
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xl shadow-slate-900/5">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Prerequisite Locked
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Module 0{activeModule.order}: {activeModule.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeModule.requirementText ||
                    'Complete the required practice and lab coursework to unlock this module.'}
                </p>
              </div>

              {/* 1-Click Action to Jump to Required Practice */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/practice?module=${activeModule.order}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Practice Module {activeModule.order} (25 Topics) →</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeModulesPage;
