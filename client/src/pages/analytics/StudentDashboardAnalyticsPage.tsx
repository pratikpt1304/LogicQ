import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client.js';
import { auth } from '../../config/firebase.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
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
} from 'lucide-react';

type AnalyticsTab = 'overview' | 'mastery' | 'standing' | 'reports';

export const StudentDashboardAnalyticsPage: React.FC = () => {
  const { user, isAdmin, isFaculty } = useAuth();
  const targetUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard-analytics'],
    queryFn: () => api.get('/analytics/student/dashboard'),
    refetchOnWindowFocus: false,
  });

  const { data: fsTelemetry } = useQuery({
    queryKey: ['proctoring-telemetry-student', targetUid],
    queryFn: () => FirestoreDataService.getProctoringTelemetry(targetUid),
    refetchOnWindowFocus: true,
  });

  const { data: reportData } = useQuery({
    queryKey: ['student-report-data', selectedReportTestId],
    queryFn: () => api.get(`/analytics/student/report/${selectedReportTestId}`),
    enabled: Boolean(selectedReportTestId),
  });

  // Collect local quarantined problem slugs across all module sessions
  const quarantinedSlugs = useMemo(() => {
    const set = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_quarantined_') || key === 'logicq_quarantined_modules')) {
          const val = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(val)) {
            val.forEach((s) => set.add(String(s).toLowerCase().trim()));
          }
        }
      }
    } catch {}
    return set;
  }, []);

  const incidents = fsTelemetry?.incidents || [];

  // Aggregated list of questions with proctoring incidents
  const cheatedQuestionsList = useMemo(() => {
    const list: Array<{
      title: string;
      slug: string;
      reason: string;
      type: string;
      timestamp: string;
    }> = [];

    const seenSlugs = new Set<string>();

    if (incidents?.length) {
      for (const inc of incidents) {
        const itemAny = inc as any;
        if (
          inc.type === 'EXCEEDED_TAB_SWITCHES' ||
          inc.type === 'EXCEEDED_COPY_PASTE' ||
          inc.type === 'SECOND_CHANCE_SUBMISSION' ||
          itemAny.isCheatAttempt ||
          (typeof inc.reason === 'string' && inc.reason.includes('tab switch'))
        ) {
          const slug = (inc.problemSlug || inc.problemTitle || '').toLowerCase().trim();
          if (!seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            list.push({
              title: inc.problemTitle || inc.problemSlug || 'Practice Question',
              slug: inc.problemSlug || '',
              reason: inc.reason || 'Exceeded tab switches on question',
              type: inc.type,
              timestamp: inc.timestamp || new Date().toISOString(),
            });
          }
        }
      }
    }

    quarantinedSlugs.forEach((qSlug) => {
      if (!seenSlugs.has(qSlug)) {
        seenSlugs.add(qSlug);
        const title = qSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        list.push({
          title,
          slug: qSlug,
          reason: 'Exceeded tab switches (Quarantined Attempt)',
          type: 'EXCEEDED_TAB_SWITCHES',
          timestamp: new Date().toISOString(),
        });
      }
    });

    return list;
  }, [incidents, quarantinedSlugs]);

  if (isAdmin || isFaculty || user?.role === 'FACULTY' || user?.role === 'ADMIN') {
    return <Navigate to="/faculty/analytics" replace />;
  }

  const rawAnl = data?.data;

  const defaultAnalytics = {
    academicScore: 0,
    totalQuestionsSolved: 0,
    totalQuestionsAttempted: 0,
    integrityScore: 100,
    integrityRisk: 'NORMAL' as const,
    learnerInsightMessage:
      'Continue solving problems in the Practice Arena to boost your algorithmic problem-solving accuracy and velocity.',
    telemetry: {
      totalTabSwitches: 0,
      totalClipboardAttempts: 0,
      totalFocusLossDurationSec: 0,
      totalKeystrokes: 0,
      vivaCompletedRatio: 'None triggered',
    },
    difficultyStats: {
      EASY: { solved: 0, total: 25, avgTimeSec: 0 },
      MEDIUM: { solved: 0, total: 25, avgTimeSec: 0 },
      HARD: { solved: 0, total: 25, avgTimeSec: 0 },
    },
    netTimeDeviationSec: 0,
    hiddenTestPassRatio: '0/0 Passed',
    assignments: [] as any[],
    recommendations: [] as string[],
  };

  const anl = {
    ...defaultAnalytics,
    ...(rawAnl || {}),
    telemetry: {
      ...defaultAnalytics.telemetry,
      ...(rawAnl?.telemetry || {}),
    },
    difficultyStats: {
      ...defaultAnalytics.difficultyStats,
      ...(rawAnl?.difficultyStats || {}),
    },
    assignments: Array.isArray(rawAnl?.assignments) ? rawAnl.assignments : defaultAnalytics.assignments,
    recommendations: Array.isArray(rawAnl?.recommendations) ? rawAnl.recommendations : defaultAnalytics.recommendations,
  };

  const academicScore = typeof anl.academicScore === 'number' ? anl.academicScore : 0;
  const totalQuestionsSolved = anl.totalQuestionsSolved || 0;
  const totalQuestionsAttempted = anl.totalQuestionsAttempted || 0;

  const totalTabSwitches = (anl.telemetry?.totalTabSwitches || 0) + (fsTelemetry?.tabSwitchCount || 0);
  const totalClipboardAttempts = (anl.telemetry?.totalClipboardAttempts || 0) + (fsTelemetry?.copyPasteAttempts || 0);
  const totalFullscreenExits = fsTelemetry?.fullscreenExits || 0;
  const autoLockCount = fsTelemetry?.autoLockCount || 0;
  const backendRiskPoints = typeof anl.integrityScore === 'number' ? anl.integrityScore : 0;
  const backendCleanScore = Math.max(0, 100 - backendRiskPoints);

  const fsIntegrity =
    fsTelemetry?.integrityScore !== undefined
      ? fsTelemetry.integrityScore
      : FirestoreDataService.computeIntegrityScore({
          tabSwitchCount: totalTabSwitches,
          copyPasteAttempts: totalClipboardAttempts,
          fullscreenExits: totalFullscreenExits,
          autoLockCount,
        });

  const finalIntegrityScore = Math.max(0, Math.min(backendCleanScore, fsIntegrity));
  const isCleanSession = finalIntegrityScore >= 80 && autoLockCount === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans animate-fadeIn">
      {/* 1. APPLE FROSTED HEADER */}
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
              Verified programming metrics, algorithmic mastery, proctored telemetry, and official assessment reports.
            </p>
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/student/tests"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Assigned Tests</span>
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

        {/* Apple Fitness-Style Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              Academic Score
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {academicScore.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">/ 100</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Problems Mastered
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <span>{totalQuestionsSolved}</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block mb-0.5">
              Exam Standing
            </span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1.5">
              <span>{finalIntegrityScore}</span>
              <span className="text-xs font-sans font-medium text-indigo-500">
                {finalIntegrityScore >= 80 ? 'Verified' : 'Review'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20">
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 block mb-0.5">
              Time Efficiency
            </span>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {anl.netTimeDeviationSec <= 0 ? 'Optimal' : `+${anl.netTimeDeviationSec}s`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. APPLE SEGMENTED TAB SWITCHER */}
      <div className="p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
          { id: 'mastery' as const, label: 'Skill Mastery', icon: Layers },
          { id: 'standing' as const, label: 'Exam Standing', icon: ShieldCheck },
          { id: 'reports' as const, label: 'Reports (PDF)', icon: FileText },
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
            {/* Apple Intelligence Learning Insights */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Personalized Learning Insights
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated curriculum analysis based on evaluated code submissions
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {anl.learnerInsightMessage}
              </div>

              {anl.recommendations && anl.recommendations.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Actionable Next Steps:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {anl.recommendations.map((rec: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Hidden Test Case Verification
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {anl.hiddenTestPassRatio || 'Verified'}
                </div>
                <p className="text-[11px] text-slate-400">Edge cases evaluated via GCC sandbox</p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Keyboard & Velocity Activity
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {(anl.telemetry?.totalKeystrokes || 0).toLocaleString()} keys
                </div>
                <p className="text-[11px] text-slate-400">Active keystrokes logged in editor</p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Proctored Exam Health
                </span>
                <div className={`text-xl font-bold font-mono ${finalIntegrityScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                  {finalIntegrityScore >= 80 ? 'Verified Clean' : 'Review Required'}
                </div>
                <p className="text-[11px] text-slate-400">Tab switches & clipboard monitored</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SKILL MASTERY */}
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
                  Difficulty Level Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Mastery distribution across Practice Arena & Coursework
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">GCC 14 (C11)</span>
            </div>

            <div className="space-y-4">
              {Object.entries(anl.difficultyStats || defaultAnalytics.difficultyStats).map(([diff, stats]: any) => {
                const safeStats = stats || { solved: 0, total: 25, avgTimeSec: 0 };
                const pct = safeStats.total > 0 ? Math.round((safeStats.solved / safeStats.total) * 100) : 0;
                const barColor =
                  diff === 'EASY'
                    ? 'bg-emerald-500'
                    : diff === 'MEDIUM'
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <div
                    key={diff}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{diff}</span>
                        <span className="text-slate-400 text-[11px]">Avg solve time: {safeStats.avgTimeSec || 0}s</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {safeStats.solved} / {safeStats.total} Solved ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: EXAM STANDING */}
        {activeTab === 'standing' && (
          <motion.div
            key="standing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Standing Card */}
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

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono ${
                    finalIntegrityScore >= 80
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    Score: {finalIntegrityScore} / 100
                  </span>
                </div>
              </div>

              {/* Monitored Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Tab Switches</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {totalTabSwitches} events
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Clipboard Paste Blocked</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {totalClipboardAttempts} blocked
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Fullscreen Exits</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {totalFullscreenExits} exits
                  </div>
                </div>
              </div>

              {/* Incidents List if any */}
              {cheatedQuestionsList.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Recorded Proctoring Notices ({cheatedQuestionsList.length}):
                  </span>
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden bg-white/50 dark:bg-slate-800/30">
                    {cheatedQuestionsList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {item.title}
                          </span>
                          <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {item.reason}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 self-start sm:self-auto shrink-0">
                          Auto-Submitted with Penalty
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Clean Academic Conduct: Zero infractions or auto-lock penalties logged.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: REPORTS */}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs space-y-5"
          >
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Official Assessment Reports
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Printable PDF summaries with verified code, marks breakdown, and institutional credentials.
              </p>
            </div>

            {anl.assignments && anl.assignments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {anl.assignments.map((as: any) => (
                  <div
                    key={as.assignmentId}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {as.testTitle || 'Assigned Test'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {as.submittedAt ? new Date(as.submittedAt).toLocaleDateString() : 'Evaluated'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReportTestId(as.testTitle ? as.assignmentId : null)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Completed Tests Available
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Take your first faculty-assigned test to generate a verified, printable institutional report.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. APPLE PRINTABLE REPORT SHEET / MODAL */}
      <AnimatePresence>
        {selectedReportTestId && reportData?.report && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReportTestId(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-3xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Report Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {reportData?.report?.institution || 'LogicQ'} Examination Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Student: {reportData?.report?.student?.fullName || 'Student'} • PRN: {reportData?.report?.student?.prn || 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReportTestId(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scores Overview */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-center font-mono">
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">Academic Score</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {reportData?.report?.summary?.academicScore ?? 0} Marks
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">Integrity Rating</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {reportData?.report?.summary?.integrityScore ?? 100} / 100
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-sans">Exam Status</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {reportData?.report?.summary?.integrityRisk || 'NORMAL'}
                    </div>
                  </div>
                </div>

                {/* Submitted Solutions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Evaluated Solutions
                  </h4>
                  {(reportData?.report?.partA_Solutions || []).map((sol: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs"
                    >
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-900 dark:text-white">Q{idx + 1}: {sol.title}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {sol.verdict} ({sol.academicScore} Mark)
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto shadow-inner">
                        <pre className="whitespace-pre-wrap">{sol.submittedCode}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReportTestId(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboardAnalyticsPage;
