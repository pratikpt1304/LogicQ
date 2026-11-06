import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client.js';
import { auth } from '../../config/firebase.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { TOPIC_PRACTICE_DATA } from '../../data/topic-practice.data.js';
import { getSolvedPracticeTopicIds } from '../TopicPracticeHubPage.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../../data/practice-module4.data.js';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Clock,
  TrendingUp,
  Brain,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Sparkles,
  Code2,
  Layers,
  Activity,
  X,
  ExternalLink,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  Check,
  Flame,
  BookOpen,
} from 'lucide-react';

type AnalyticsTab = 'overview' | 'mastery' | 'standing' | 'reports';

export const StudentDashboardAnalyticsPage: React.FC = () => {
  const { user, isAdmin, isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const targetUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);

  // Real-time synchronization
  useEffect(() => {
    const unsubSub = RealtimeSyncService.on('SUBMISSIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['student-all-submissions', targetUid] });
      queryClient.invalidateQueries({ queryKey: ['proctoring-telemetry-student', targetUid] });
    });
    const unsubDash = RealtimeSyncService.on('DASHBOARD', () => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['student-all-submissions', targetUid] });
    });
    return () => {
      unsubSub();
      unsubDash();
    };
  }, [queryClient, targetUid]);

  const { data: fsTelemetry } = useQuery({
    queryKey: ['proctoring-telemetry-student', targetUid],
    queryFn: () => FirestoreDataService.getProctoringTelemetry(targetUid),
    refetchOnWindowFocus: true,
  });

  const { data: userSubmissions = [] } = useQuery({
    queryKey: ['student-all-submissions', targetUid],
    queryFn: () => FirestoreDataService.getUserSubmissions(targetUid),
    refetchOnWindowFocus: true,
  });

  const { data: reportData } = useQuery({
    queryKey: ['student-report-data', selectedReportTestId],
    queryFn: () => api.get(`/analytics/student/report/${selectedReportTestId}`),
    enabled: Boolean(selectedReportTestId),
  });

  // Calculate real solved practice topics across user id and PRN
  const solvedTopicIds = useMemo(() => {
    try {
      return Array.from(new Set([
        ...getSolvedPracticeTopicIds(),
        ...(user?.id ? getSolvedPracticeTopicIds(user.id) : []),
        ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
      ]));
    } catch {
      return [];
    }
  }, [user]);

  // Combine all lab internal problems (80 problems)
  const allLabProblems = useMemo(() => [
    ...PRACTICE_MODULE_1_PROBLEMS,
    ...PRACTICE_MODULE_2_PROBLEMS,
    ...PRACTICE_MODULE_3_PROBLEMS,
    ...PRACTICE_MODULE_4_PROBLEMS,
  ], []);

  // Calculate lab internal solved count
  const labSolvedCount = useMemo(() => {
    const acSlugs = new Set(
      userSubmissions
        .filter((s: any) => s.verdict === 'ACCEPTED')
        .map((s: any) => (s.problemSlug || s.problem?.slug || '').toLowerCase().trim())
    );
    return allLabProblems.filter((p) => acSlugs.has(p.slug.toLowerCase().trim())).length;
  }, [userSubmissions, allLabProblems]);

  // CIE Lab Internal Marks (out of 20.0 Marks)
  const cieMarks = useMemo(() => {
    return Math.min(20.0, Number(((labSolvedCount / 80) * 20.0).toFixed(1)));
  }, [labSolvedCount]);

  const totalMastered = solvedTopicIds.length + labSolvedCount;
  const curriculumTotal = TOPIC_PRACTICE_DATA.length + allLabProblems.length; // 100 + 80 = 180
  const curriculumPercent = Math.round((totalMastered / curriculumTotal) * 100);

  // Submission Verdicts & First-Try Compiler Accuracy
  const verdictStats = useMemo(() => {
    let ac = 0;
    let wa = 0;
    let ce = 0;
    let other = 0;

    userSubmissions.forEach((s: any) => {
      const v = (s.verdict || '').toUpperCase();
      if (v === 'ACCEPTED' || v === 'AC') ac++;
      else if (v === 'WRONG_ANSWER' || v === 'WA') wa++;
      else if (v.includes('COMPILE') || v === 'CE') ce++;
      else other++;
    });

    if (ac === 0 && solvedTopicIds.length > 0) {
      ac = solvedTopicIds.length;
    }

    const totalEvaluated = ac + wa + ce + other;
    const accuracy = totalEvaluated > 0 ? Math.round((ac / totalEvaluated) * 100) : 100;

    return { ac, wa, ce, other, totalEvaluated, accuracy };
  }, [userSubmissions, solvedTopicIds]);

  // Module-wise syllabus mastery breakdown
  const modulesProgress = useMemo(() => {
    return [
      {
        id: 1,
        title: 'Module 1: C Fundamentals & Control Flow',
        desc: 'Variables, data types, operators, scanf/printf, if-else, while & for loops',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        concepts: ['Data Types', 'Loops', 'Conditionals', 'Switch Case'],
      },
      {
        id: 2,
        title: 'Module 2: Arrays, Strings & 2D Matrices',
        desc: '1D Arrays, linear/binary search, string manipulation, 2D matrix arithmetic',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        concepts: ['1D Arrays', 'Strings', '2D Matrices', 'Searching'],
      },
      {
        id: 3,
        title: 'Module 3: Functions, Recursion & Pointers',
        desc: 'Modular functions, recursion, pointer arithmetic, call by reference',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        concepts: ['Pointers', 'Recursion', 'Pass by Reference', 'Functions'],
      },
      {
        id: 4,
        title: 'Module 4: Structures, Unions & Dynamic Memory',
        desc: 'struct, union, memory allocation (malloc, calloc, free), linked structures',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        concepts: ['Structures', 'Unions', 'malloc/free', 'Dynamic Memory'],
      },
      {
        id: 5,
        title: 'Module 5: File I/O & Advanced C Programming',
        desc: 'File streams (fopen, fscanf, fprintf, fclose), command line args',
        topicsTotal: 20,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 5 && solvedTopicIds.includes(t.id)).length,
        labTotal: 0,
        concepts: ['File Streams', 'Binary I/O', 'Error Handling'],
      },
    ];
  }, [solvedTopicIds]);

  // Next recommended topic based on lowest completed module
  const nextRecommended = useMemo(() => {
    for (const m of modulesProgress) {
      if (m.topicsSolved < m.topicsTotal) {
        return {
          moduleTitle: m.title,
          desc: m.desc,
          moduleId: m.id,
        };
      }
    }
    return {
      moduleTitle: 'Module 1: C Fundamentals',
      desc: 'Master foundational syntax and control flow',
      moduleId: 1,
    };
  }, [modulesProgress]);

  // Proctoring telemetry calculations
  const totalTabSwitches = fsTelemetry?.tabSwitchCount || 0;
  const totalClipboardAttempts = fsTelemetry?.copyPasteAttempts || 0;
  const autoLockCount = fsTelemetry?.autoLockCount || 0;
  const finalIntegrityScore = fsTelemetry?.integrityScore !== undefined ? fsTelemetry.integrityScore : 100;
  const isCleanSession = finalIntegrityScore >= 80 && autoLockCount === 0;

  if (isAdmin || isFaculty || user?.role === 'FACULTY' || user?.role === 'ADMIN') {
    return <Navigate to="/faculty/analytics" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans animate-fadeIn">
      {/* 1. APPLE FROSTED HEADER WITH ACCURATE REAL METRICS */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5" />
              <span>Learning Analytics</span>
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span>Academic Growth</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Learning Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Real-time curriculum progression, compiler accuracy, syllabus mastery, and official continuous evaluation metrics.
            </p>
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/history"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Code History</span>
            </Link>
            <Link
              to="/practice"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Practice Arena →</span>
            </Link>
          </div>
        </div>

        {/* 4 Clean Actionable Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          {/* Tile 1: Problems Solved */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Problems Mastered
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <span>{totalMastered}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">/ {curriculumTotal}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {solvedTopicIds.length} Practice • {labSolvedCount} Lab
            </span>
          </div>

          {/* Tile 2: CIE Lab Internal Marks */}
          <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block mb-0.5">
              CIE Lab Internal
            </span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1">
              <span>{cieMarks.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">/ 20.0 M</span>
            </div>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 block font-medium">
              Continuous Evaluation
            </span>
          </div>

          {/* Tile 3: Compiler Accuracy */}
          <div className="p-4 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 block mb-0.5">
              Compiler Accuracy
            </span>
            <div className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono flex items-center gap-1">
              <span>{verdictStats.accuracy}%</span>
              <Target className="w-4 h-4 ml-0.5" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {verdictStats.ac} Accepted Solutions
            </span>
          </div>

          {/* Tile 4: Curriculum Coverage */}
          <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20">
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 block mb-0.5">
              Curriculum Mastery
            </span>
            <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {curriculumPercent}%
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              5 Core Syllabus Modules
            </span>
          </div>
        </div>
      </div>

      {/* 2. APPLE SEGMENTED TAB SWITCHER */}
      <div className="p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
          { id: 'mastery' as const, label: 'Syllabus Mastery', icon: Layers },
          { id: 'standing' as const, label: 'Academic Standing', icon: ShieldCheck },
          { id: 'reports' as const, label: 'Reports & Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCur = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isCur
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB PANELS */}
      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Actionable Learning Insights & Recommended Next Step */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Curriculum Guidance & Velocity
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Automated recommendations based on verified C11 compiler solutions
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-bold">
                  Active Sprint
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    Recommended Next Focus:
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {nextRecommended.moduleTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {nextRecommended.desc}
                  </p>
                </div>
                <Link
                  to="/practice"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Resume Practice</span>
                </Link>
              </div>
            </div>

            {/* 3 Meaningful Metrics (Replacing fake keys/proctoring review) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Compiler Verdict Distribution */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Compiler Verdict Ratio
                  </span>
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Accepted (AC)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{verdictStats.ac}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-500 font-semibold">Compile Errors (CE)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{verdictStats.ce}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-500 font-semibold">Wrong Answers (WA)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{verdictStats.wa}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  Compiled via isolated GCC 14.2 sandbox
                </p>
              </div>

              {/* Card 2: CIE Lab Evaluation Health */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Continuous Lab Internal (CIE)
                  </span>
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {cieMarks.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 20.0 Marks</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (cieMarks / 20.0) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {labSolvedCount} of 80 coursework experiments completed
                </p>
              </div>

              {/* Card 3: Academic Environment Status */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Proctored Integrity
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>{finalIntegrityScore}</span>
                  <span className="text-xs font-sans font-medium">/ 100 Verified</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isCleanSession ? '✓ Clean session: Zero infractions logged' : 'Telemetry logged under review'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SYLLABUS MASTERY */}
        {activeTab === 'mastery' && (
          <motion.div
            key="mastery"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  5 Core C Language Syllabus Modules
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete syllabus progression across foundational concepts and advanced memory models
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">GCC 14 (C11)</span>
            </div>

            <div className="space-y-4">
              {modulesProgress.map((mod) => {
                const pct = mod.topicsTotal > 0 ? Math.round((mod.topicsSolved / mod.topicsTotal) * 100) : 0;
                return (
                  <div
                    key={mod.id}
                    className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {mod.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mod.desc}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {mod.topicsSolved} / {mod.topicsTotal} Topics ({pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-cyan-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Core Competency Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mod.concepts.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: ACADEMIC STANDING */}
        {activeTab === 'standing' && (
          <motion.div
            key="standing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isCleanSession ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {isCleanSession ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Academic Behavioral Integrity
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard proctored telemetry across tests and evaluation windows
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Integrity Rating: {finalIntegrityScore} / 100
                </span>
              </div>

              {/* Clean Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Tab Switch Frequency</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {totalTabSwitches} events
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Clipboard Protection</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {totalClipboardAttempts} blocked
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Compiler Verification</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    GCC 14 (C11)
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Verified Academic Record: All submitted code compiled and recorded in isolated cloud sandbox.</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: REPORTS & LOGS */}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Official Academic Records & Submissions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Printable summaries with verified code, marks breakdown, and institutional credentials.
                </p>
              </div>
              <Link
                to="/history"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>View Full History →</span>
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Verified C Submissions Log
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userSubmissions.length > 0 ? `${userSubmissions.length} compiler-verified submissions on record.` : 'Practice and lab submissions automatically recorded with compiler verdicts.'}
                </p>
              </div>
              <Link
                to="/history"
                className="inline-flex px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
              >
                Inspect Solution History
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboardAnalyticsPage;
