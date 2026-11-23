import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GalaxyButton } from '../components/common/GalaxyButton.js';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth, db } from '../config/firebase.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { doc, getDoc } from 'firebase/firestore';
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
  desc: string;
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
    desc: 'Decisions & Loops',
    description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
    problems: PRACTICE_MODULE_1_PROBLEMS,
  },
  {
    order: 2,
    id: 'module-2',
    slug: 'pointers-and-functions',
    title: 'Pointers and Functions',
    shortTitle: 'Pointers & Functions',
    desc: 'Addresses & Recursion',
    description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
    problems: PRACTICE_MODULE_2_PROBLEMS,
  },
  {
    order: 3,
    id: 'module-3',
    slug: 'array-and-its-applications',
    title: 'Array and its Applications',
    shortTitle: 'Array & Applications',
    desc: 'Matrices & Sorting',
    description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
    problems: PRACTICE_MODULE_3_PROBLEMS,
  },
  {
    order: 4,
    id: 'module-4',
    slug: 'advanced-data-types-dynamic-memory',
    title: 'Advanced Data Types & Dynamic Memory',
    shortTitle: 'Dynamic Memory',
    desc: 'Structs & Heap',
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

  // Faculty Maintenance Lock: Lab Internal continuous assessment default UNLOCKED
  const [isLabFacultyLocked, setIsLabFacultyLocked] = useState<boolean>(() => {
    try {
      localStorage.removeItem('logicq_lab_internal_faculty_locked');
    } catch {}
    return false;
  });

  const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
  const prnCleanUser = (user?.prn || '').toUpperCase().trim();
  const emailCleanUser = (user?.email || '').toLowerCase().trim();

  const [solvedTopics, setSolvedTopics] = useState<string[]>(() => {
    const list = getSolvedPracticeTopicIds(effectiveUid).filter((id) => !id.startsWith('practice-c'));
    if (user?.prn) {
      getSolvedPracticeTopicIds(user.prn).forEach((x) => !x.startsWith('practice-c') && !list.includes(x) && list.push(x));
    }
    if (Array.isArray((user as any)?.completedProblems)) {
      (user as any).completedProblems.forEach((x: string) => !list.includes(x) && list.push(x));
    }
    return list;
  });
  const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | 'TODO' | 'SOLVED' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Firestore synchronization for Custom/Updated Lab Internal Questions
  const [customQuestions, setCustomQuestions] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('logicq_fallback_practice_custom_problems_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    FirestoreDataService.getLabInternalQuestionsFromFirestore().then((qs) => {
      if (isMounted && Array.isArray(qs)) setCustomQuestions(qs);
    });
    const unsub = FirestoreDataService.listenToLabInternalQuestions((qs) => {
      if (isMounted && Array.isArray(qs)) setCustomQuestions(qs);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Compute live module definitions merged with custom/updated questions
  const currentModuleDefinitions = useMemo(() => {
    return MODULE_DEFINITIONS.map((def) => {
      const baseProblems = [...def.problems];
      const modCustom = customQuestions.filter((q: any) =>
        Number(q.moduleOrder) === def.order || q.moduleSlug === def.slug
      );

      const mergedProblems = baseProblems.map((prob) => {
        const match = modCustom.find((c: any) => c.slug === prob.slug);
        return match ? { ...prob, ...match } : prob;
      });

      modCustom.forEach((c: any) => {
        if (!mergedProblems.some((p) => p.slug === c.slug)) {
          mergedProblems.push({
            slug: c.slug,
            moduleSlug: def.slug,
            moduleOrder: def.order,
            title: c.title,
            difficulty: c.difficulty || 'MEDIUM',
            category: c.category || def.title,
            tags: Array.isArray(c.tags) ? c.tags : [def.shortTitle],
            description: c.description || '',
            starterCode: c.starterCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
            solutionCode: c.solutionCode || '',
            wrongSolution1: '',
            wrongSolution2: '',
            timeLimitMs: Number(c.timeLimitMs) || 2000,
            memoryLimitMb: Number(c.memoryLimitMb) || 128,
            basePoints: Number(c.basePoints) || 10,
            sampleTests: Array.isArray(c.sampleTests) ? c.sampleTests : [],
            hiddenTests: Array.isArray(c.hiddenTests) ? c.hiddenTests : [],
          });
        }
      });

      return {
        ...def,
        problems: mergedProblems,
      };
    });
  }, [customQuestions]);

  // Sync and restore solved practice topics from Firestore and local storage
  const refreshSolvedTopics = useCallback(async () => {
    try {
      const prnClean = (user?.prn || '').toUpperCase().trim();
      let cohortProblems: string[] = [];
      if (prnClean) {
        // 0. High-speed Supabase sync (immune to Firestore quota limits)
        if (isSupabaseConfigured) {
          try {
            const { data: sbProg } = await supabase
              .from('practice_progress')
              .select('solved_topic_ids')
              .eq('student_prn', prnClean)
              .maybeSingle();
            if (sbProg?.solved_topic_ids && Array.isArray(sbProg.solved_topic_ids)) {
              cohortProblems = [...sbProg.solved_topic_ids];
            }
          } catch {}
        }

        try {
          const cohortSnap = await getDoc(doc(db, 'cohort_progress', prnClean)).catch(() => null);
          if (cohortSnap && cohortSnap.exists()) {
            const cData = cohortSnap.data();
            if (Array.isArray(cData?.completedProblems)) {
              cohortProblems = Array.from(new Set([...cohortProblems, ...cData.completedProblems]));
            }
          }
        } catch {}

        // Resilient KeyVal fallback if Firestore has latency or quota backoff
        if (cohortProblems.length === 0) {
          try {
            const kvRes = await fetch(`https://api.keyval.org/get/lq_practice_${prnClean}`, { signal: AbortSignal.timeout(1800) });
            if (kvRes.ok) {
              const kvText = await kvRes.text();
              if (kvText && kvText.startsWith('[')) {
                const kvArr = JSON.parse(kvText);
                if (Array.isArray(kvArr) && kvArr.length > 0) {
                  cohortProblems = kvArr;
                }
              }
            }
          } catch {}
        }
      }

      const stats = await FirestoreDataService.getStatsBackup(effectiveUid);
      const prog = await FirestoreDataService.getPracticeProgress(effectiveUid);
      const cloudSolved = Array.from(
        new Set([
          ...cohortProblems,
          ...(stats?.completedProblems || []),
          ...(prog?.completedProblems || []),
          ...getSolvedPracticeTopicIds(effectiveUid).filter((id) => !id.startsWith('practice-c')),
          ...(user?.prn ? getSolvedPracticeTopicIds(user.prn).filter((id) => !id.startsWith('practice-c')) : []),
        ])
      );
      if (cloudSolved.length > 0) {
        cloudSolved.forEach((id) => {
          markPracticeTopicSolved(id, effectiveUid);
          if (user?.prn) markPracticeTopicSolved(id, user.prn);
        });
        setSolvedTopics(cloudSolved);
      }
    } catch (err) {
      console.warn('PracticeModulesPage refresh error:', err);
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
      const match = currentModuleDefinitions.find(
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
  }, [moduleSlug, searchParams, currentModuleDefinitions]);

  const handleSelectModule = (order: number) => {
    setSearchParams({ module: String(order) });
  };

  // Build module progression cards
  const moduleCards = useMemo(() => {
    return currentModuleDefinitions.map((def) => {
      const slugs = def.problems.map((p) => p.slug);
      const solvedBySlugs = slugs.filter((slug) => solvedTopics.includes(slug)).length;
      const solvedInModule = solvedBySlugs;
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
    return activeProblems.find((p) => !p.isSolved) || null;
  }, [activeProblems]);

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

        {/* 1. ANIMATED HERO HEADER (Framer Motion Creative Card) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[30px] border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl p-6 sm:p-8 transition-colors"
        >
          {/* Ambient Gradient Glows */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Main Hero Copy & Progress */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lab Internal Continuous Evaluation</span>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>C11 GCC 14</span>
                {isAdmin && (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Eye className="w-3 h-3" />
                    <span>Admin Mode</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-main)] leading-tight">
                Master C Lab Coursework with <br />
                <span className="text-emerald-600 dark:text-emerald-400">Continuous Evaluation Arena</span>
              </h1>

              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl leading-relaxed">
                Official 4-module practical coursework for continuous internal evaluation (20 Marks).
                Solve questions sequentially with instant GCC 14 compiler feedback, testcase verification, and zero penalty attempts.
              </p>

              {/* Quick Navigation Action Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <Link
                  to="/dashboard"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--border-line)] border border-[var(--border-line)] shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                >
                  <Home className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Dashboard</span>
                </Link>

                <GalaxyButton
                  to="/practice"
                  size="sm"
                  text="Practice Arena (100 Problems) →"
                  icon={<Code2 className="w-3.5 h-3.5" />}
                  iconPosition="left"
                />
              </div>
            </div>

            {/* Interactive Visual Card with Floating Badges */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              <div className="w-full max-w-[340px] rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-4 shadow-lg space-y-3 relative">
                {/* Progress Bar Inside Card */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-500" />
                      Overall Solved
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {totalLabSolved}/{totalLabProblems} ({overallPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[var(--border-line)] h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Next Question Preview if available */}
                {!activeModule.isUnlocked ? (
                  <div className="p-3 rounded-xl bg-[var(--bg-panel)] border border-amber-500/30 space-y-1 text-left">
                    <div className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Module 0{activeModule.order} Locked
                    </div>
                    <div className="text-xs font-bold text-[var(--text-main)] truncate">
                      {activeModule.shortTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {activeModule.requirementText || 'Complete previous module coursework to unlock.'}
                    </div>
                  </div>
                ) : nextProblem ? (
                  <div className="p-3 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] space-y-1 text-left">
                    <div className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider">
                      Recommended Next Problem
                    </div>
                    <div className="text-xs font-bold text-[var(--text-main)] truncate">
                      {nextProblem.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {nextProblem.category || nextProblem.description}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] space-y-1 text-left">
                    <div className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider">
                      Coursework Status
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      All Questions Completed! 🎉
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      You have solved all {activeModule.totalQuestions} coursework problems in this module.
                    </div>
                  </div>
                )}

                {/* Pulse Equalizer */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-line)] text-[11px] font-mono text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    GCC 14 Sandboxed
                  </span>
                  <div className="flex items-center gap-0.5 h-3 overflow-hidden">
                    {[40, 80, 50, 100, 60, 90, 45, 75].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.3}%`] }}
                        transition={{
                          duration: 1.2,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.1,
                          ease: 'easeInOut',
                        }}
                        className="w-0.5 bg-emerald-500 rounded-full"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Top-Right CIE Score Badge */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="absolute -top-3 -right-2 bg-[var(--bg-panel)]/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-[var(--border-line)] flex items-center gap-2 z-20"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[var(--text-main)]">CIE Coursework</div>
                  <div className="text-[9px] text-amber-500 font-semibold">{cieMarks} / 20.0 Marks</div>
                </div>
              </motion.div>

              {/* Floating Bottom-Left Result Badge */}
              <motion.div
                animate={{ y: [4, -4, 4] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-3 -left-3 bg-[var(--bg-panel)]/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-[var(--border-line)] flex items-center gap-2 z-20"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[var(--text-main)]">Zero Penalty</div>
                  <div className="text-[9px] text-emerald-500 font-semibold">Continuous Evaluation</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* FACULTY MAINTENANCE LOCK BANNER */}
        {isLabFacultyLocked && (
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Lab Internal Under Faculty Maintenance
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    LOCKED
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Official Lab Internal coursework is currently locked for faculty evaluation & scheduled maintenance. Problem solving and submissions are paused until unlocked by your course faculty.
                </p>
              </div>
            </div>
            {isPrivileged && (
              <button
                type="button"
                onClick={() => {
                  const next = !isLabFacultyLocked;
                  setIsLabFacultyLocked(next);
                  localStorage.setItem('logicq_lab_internal_faculty_locked', String(next));
                  toast.success(next ? 'Lab Internal locked for students.' : 'Lab Internal unlocked for students.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition cursor-pointer shrink-0"
              >
                {isLabFacultyLocked ? 'Unlock Lab Internal' : 'Lock Lab Internal'}
              </button>
            )}
          </div>
        )}

        {/* 2. APPLE SEGMENTED MODULE SWITCHER */}
        <div className="p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {moduleCards.map((mod) => {
            const isCur = mod.order === selectedModuleOrder;
            const isLocked = !mod.isUnlocked;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    toast.warning(`🔒 ${mod.requirementText || 'Complete previous module to unlock.'}`);
                    return;
                  }
                  handleSelectModule(mod.order);
                }}
                className={`py-3 px-4 rounded-xl text-left transition-all flex flex-col justify-between gap-1 group active:scale-98 cursor-pointer ${
                  isCur
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : isLocked
                    ? 'text-slate-400 dark:text-slate-600 opacity-60 hover:opacity-80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    Module 0{mod.order}
                  </span>
                  {isLocked ? (
                    <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Locked</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isCur
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {mod.solvedCount}/{mod.totalQuestions}
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm truncate">
                  {mod.shortTitle}
                </div>
                <div className="text-[11px] text-slate-400 truncate hidden sm:block">
                  {mod.desc}
                </div>
              </button>
            );
          })}
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

                <GalaxyButton
                  to={(!isPrivileged && isLabFacultyLocked) ? '#' : `/lab-internal/${activeModule.slug}/${nextProblem.slug}`}
                  onClick={(e) => {
                    if (!isPrivileged && isLabFacultyLocked) {
                      e?.preventDefault();
                      toast.error('🔒 Lab Internal is currently locked by faculty for maintenance & coursework evaluation.');
                      return;
                    }
                    handleLaunchQuestionFullscreen();
                  }}
                  size="md"
                  hue={(!isPrivileged && isLabFacultyLocked) ? 20 : 160}
                  text={(!isPrivileged && isLabFacultyLocked) ? '🔒 Locked by Faculty (Maintenance)' : `Continue Solving Question ${nextProblem.index} →`}
                  icon={(!isPrivileged && isLabFacultyLocked) ? <Lock className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  iconPosition="left"
                  className="shrink-0"
                />
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
                          ? 'bg-indigo-600 text-white shadow-xs'
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

                  if (!isPrivileged && isLabFacultyLocked) {
                    return (
                      <div
                        key={prob.slug}
                        onClick={() => toast.error('🔒 Lab Internal is currently locked by faculty under scheduled maintenance.')}
                        className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-100/40 dark:bg-slate-900/40 p-4 sm:p-5 flex items-center justify-between gap-4 opacity-75 cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold bg-slate-200/60 dark:bg-slate-800/60 text-slate-400">
                            {prob.index}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {prob.title}
                            </h4>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{prob.category}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3 text-amber-500" />
                          <span>Locked</span>
                        </span>
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
                          <GalaxyButton
                            size="xs"
                            hue={160}
                            text="Solve →"
                          />
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
