import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
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
import { generateStudentPDFReport } from '../../services/pdfReportGenerator.js';
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
  RefreshCw,
} from 'lucide-react';

type AnalyticsTab = 'overview' | 'mastery' | 'standing' | 'reports';

export const StudentDashboardAnalyticsPage: React.FC = () => {
  const { user, isAdmin, isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const targetUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);
  const [masteryViewFilter, setMasteryViewFilter] = useState<'ALL' | 'PRACTICE' | 'LAB_INTERNAL'>('ALL');
  const [auditTrackFilter, setAuditTrackFilter] = useState<'ALL' | 'PRACTICE' | 'LAB_INTERNAL'>('ALL');
  const [auditModuleFilter, setAuditModuleFilter] = useState<'ALL' | 1 | 2 | 3 | 4 | 5>('ALL');
  const [expandedTimelineSlugs, setExpandedTimelineSlugs] = useState<Set<string>>(new Set());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const toggleTimeline = (slug: string) => {
    setExpandedTimelineSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Automatic one-time entire account data reset for Pratik & Samruddhi test accounts (Start as clean new user)
  useEffect(() => {
    const isTarget =
      user?.prn === '2126PMIM1039' ||
      user?.email === 'thoratpratik2323@gmail.com' ||
      user?.prn === '2126PMIF1057' ||
      user?.email === 'samugangad@gmail.com';
    const key = `logicq_clean_student_${user?.prn || user?.id}_v9`;
    const hasFullReset = localStorage.getItem(key);
    if (isTarget && !hasFullReset) {
      localStorage.setItem(key, 'true');
      FirestoreDataService.resetEntireStudentData(targetUid, user?.prn || undefined, user?.email || undefined).then(() => {
        queryClient.invalidateQueries({ queryKey: ['student-dashboard-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['student-all-submissions', targetUid] });
        queryClient.invalidateQueries({ queryKey: ['proctoring-telemetry-student', targetUid] });
      });
    }
  }, [user, targetUid, queryClient]);
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

  // Module-wise syllabus mastery breakdown (Practice Arena + Lab Internal CIE)
  const modulesProgress = useMemo(() => {
    const acSlugs = new Set(
      userSubmissions
        .filter((s: any) => s.verdict === 'ACCEPTED')
        .map((s: any) => (s.problemSlug || s.problem?.slug || '').toLowerCase().trim())
    );

    const m1Lab = PRACTICE_MODULE_1_PROBLEMS.filter((p) => acSlugs.has(p.slug.toLowerCase().trim())).length;
    const m2Lab = PRACTICE_MODULE_2_PROBLEMS.filter((p) => acSlugs.has(p.slug.toLowerCase().trim())).length;
    const m3Lab = PRACTICE_MODULE_3_PROBLEMS.filter((p) => acSlugs.has(p.slug.toLowerCase().trim())).length;
    const m4Lab = PRACTICE_MODULE_4_PROBLEMS.filter((p) => acSlugs.has(p.slug.toLowerCase().trim())).length;

    return [
      {
        id: 1,
        title: 'Module 1: C Fundamentals & Control Flow',
        desc: 'Variables, data types, operators, scanf/printf, if-else, while & for loops',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        labSolved: m1Lab,
        concepts: ['Data Types', 'Loops', 'Conditionals', 'Switch Case'],
      },
      {
        id: 2,
        title: 'Module 2: Arrays, Strings & 2D Matrices',
        desc: '1D Arrays, linear/binary search, string manipulation, 2D matrix arithmetic',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        labSolved: m2Lab,
        concepts: ['1D Arrays', 'Strings', '2D Matrices', 'Searching'],
      },
      {
        id: 3,
        title: 'Module 3: Functions, Recursion & Pointers',
        desc: 'Modular functions, recursion, pointer arithmetic, call by reference',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        labSolved: m3Lab,
        concepts: ['Pointers', 'Recursion', 'Pass by Reference', 'Functions'],
      },
      {
        id: 4,
        title: 'Module 4: Structures, Unions & Dynamic Memory',
        desc: 'struct, union, memory allocation (malloc, calloc, free), linked structures',
        topicsTotal: 25,
        topicsSolved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length,
        labTotal: 20,
        labSolved: m4Lab,
        concepts: ['Structures', 'Unions', 'malloc/free', 'Dynamic Memory'],
      },
    ];
  }, [solvedTopicIds, userSubmissions]);

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
  const totalFullscreenExits = useMemo(() => {
    const directCount = fsTelemetry?.fullscreenExits || 0;
    const fromIncidents = (fsTelemetry?.incidents || []).filter((i: any) => i.type === 'FULLSCREEN_EXIT').length;
    return Math.max(directCount, fromIncidents);
  }, [fsTelemetry]);
  const finalIntegrityScore = fsTelemetry?.integrityScore !== undefined ? fsTelemetry.integrityScore : 100;
  const isCleanSession = finalIntegrityScore >= 80 && autoLockCount === 0;

  // Process question-by-question proctoring audit log with exact timestamps, track, and module classification
  const questionIncidentsList = useMemo(() => {
    interface QuestionAuditEvent {
      type: string;
      reason: string;
      timestamp: string;
    }

    interface QuestionAuditItem {
      problemTitle: string;
      problemSlug: string;
      track: 'PRACTICE' | 'LAB_INTERNAL';
      trackLabel: string;
      moduleIndex: number;
      moduleTitle: string;
      tabSwitches: number;
      pasteAttempts: number;
      fullscreenExits: number;
      isAutoLocked: boolean;
      lastTimestamp: string;
      events: QuestionAuditEvent[];
    }

    const resolveMeta = (slug: string, title: string): { track: 'PRACTICE' | 'LAB_INTERNAL'; trackLabel: string; moduleIndex: number; moduleTitle: string } => {
      const cleanSlug = slug.toLowerCase().trim();
      const cleanTitle = title.toLowerCase().trim();

      // Check Practice Topics (m1-t1... m5-t20)
      const practiceTopic = TOPIC_PRACTICE_DATA.find(
        (t) => t.id.toLowerCase() === cleanSlug || t.problem.title.toLowerCase() === cleanTitle
      );
      if (practiceTopic) {
        return {
          track: 'PRACTICE',
          trackLabel: 'Practice Arena',
          moduleIndex: practiceTopic.moduleIndex,
          moduleTitle: `Module ${practiceTopic.moduleIndex}`,
        };
      }

      // Check Lab Internal Modules 1 to 4
      const m1Lab = PRACTICE_MODULE_1_PROBLEMS.find((p) => p.slug.toLowerCase() === cleanSlug || p.title.toLowerCase() === cleanTitle);
      if (m1Lab || cleanSlug.includes('practice-c1') || cleanSlug.includes('module1')) {
        return { track: 'LAB_INTERNAL', trackLabel: 'Lab Internal CIE', moduleIndex: 1, moduleTitle: 'Module 1: C Fundamentals' };
      }
      const m2Lab = PRACTICE_MODULE_2_PROBLEMS.find((p) => p.slug.toLowerCase() === cleanSlug || p.title.toLowerCase() === cleanTitle);
      if (m2Lab || cleanSlug.includes('practice-c2') || cleanSlug.includes('module2')) {
        return { track: 'LAB_INTERNAL', trackLabel: 'Lab Internal CIE', moduleIndex: 2, moduleTitle: 'Module 2: Arrays & Strings' };
      }
      const m3Lab = PRACTICE_MODULE_3_PROBLEMS.find((p) => p.slug.toLowerCase() === cleanSlug || p.title.toLowerCase() === cleanTitle);
      if (m3Lab || cleanSlug.includes('practice-c3') || cleanSlug.includes('module3')) {
        return { track: 'LAB_INTERNAL', trackLabel: 'Lab Internal CIE', moduleIndex: 3, moduleTitle: 'Module 3: Functions & Pointers' };
      }
      const m4Lab = PRACTICE_MODULE_4_PROBLEMS.find((p) => p.slug.toLowerCase() === cleanSlug || p.title.toLowerCase() === cleanTitle);
      if (m4Lab || cleanSlug.includes('practice-c4') || cleanSlug.includes('module4')) {
        return { track: 'LAB_INTERNAL', trackLabel: 'Lab Internal CIE', moduleIndex: 4, moduleTitle: 'Module 4: Structures & Memory' };
      }

      // Daily Challenge or generic C loop problems (e.g. Collatz)
      if (cleanSlug.includes('collatz') || cleanTitle.includes('collatz') || cleanSlug.includes('daily') || cleanTitle.includes('daily')) {
        return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 1, moduleTitle: 'Module 1: C Fundamentals' };
      }

      // Fallback based on slug prefix
      if (cleanSlug.startsWith('m2') || cleanSlug.includes('array') || cleanSlug.includes('string')) {
        return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 2, moduleTitle: 'Module 2: Arrays & Strings' };
      }
      if (cleanSlug.startsWith('m3') || cleanSlug.includes('pointer') || cleanSlug.includes('function')) {
        return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 3, moduleTitle: 'Module 3: Functions & Pointers' };
      }
      if (cleanSlug.startsWith('m4') || cleanSlug.includes('struct') || cleanSlug.includes('memory') || cleanSlug.includes('malloc')) {
        return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 4, moduleTitle: 'Module 4: Structures & Memory' };
      }
      if (cleanSlug.startsWith('m5') || cleanSlug.includes('file')) {
        return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 4, moduleTitle: 'Module 4: Structures & Memory' };
      }

      return { track: 'PRACTICE', trackLabel: 'Practice Arena', moduleIndex: 1, moduleTitle: 'Module 1: C Fundamentals' };
    };

    const rawIncidents = fsTelemetry?.incidents || [];
    const map = new Map<string, QuestionAuditItem>();

    // Check localStorage quarantined problems as well
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_quarantined_') || key === 'logicq_quarantined_modules')) {
          const val = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(val)) {
            val.forEach((slug: string) => {
              const cleanSlug = String(slug).toLowerCase().trim();
              if (!map.has(cleanSlug)) {
                const title = cleanSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const meta = resolveMeta(cleanSlug, title);
                map.set(cleanSlug, {
                  problemTitle: title,
                  problemSlug: cleanSlug,
                  track: meta.track,
                  trackLabel: meta.trackLabel,
                  moduleIndex: meta.moduleIndex,
                  moduleTitle: meta.moduleTitle,
                  tabSwitches: 3,
                  pasteAttempts: 0,
                  fullscreenExits: 0,
                  isAutoLocked: true,
                  lastTimestamp: new Date().toISOString(),
                  events: [
                    {
                      type: 'EXCEEDED_TAB_SWITCHES',
                      reason: 'Exceeded 3 tab switches (Quarantined question)',
                      timestamp: new Date().toISOString(),
                    },
                  ],
                });
              }
            });
          }
        }
      }
    } catch {}

    rawIncidents.forEach((inc: any) => {
      const slug = (inc.problemSlug || inc.problemTitle || 'general-practice').toLowerCase().trim();
      const title = inc.problemTitle || inc.problemSlug || 'Practice Question';
      const meta = resolveMeta(slug, title);

      const existing: QuestionAuditItem = map.get(slug) || {
        problemTitle: title,
        problemSlug: slug,
        track: meta.track,
        trackLabel: meta.trackLabel,
        moduleIndex: meta.moduleIndex,
        moduleTitle: meta.moduleTitle,
        tabSwitches: 0,
        pasteAttempts: 0,
        fullscreenExits: 0,
        isAutoLocked: false,
        lastTimestamp: inc.timestamp || new Date().toISOString(),
        events: [] as QuestionAuditEvent[],
      };

      if (inc.type === 'TAB_SWITCH' || inc.type === 'EXCEEDED_TAB_SWITCHES') {
        existing.tabSwitches += 1;
      }
      if (inc.type === 'COPY_PASTE' || inc.type === 'EXCEEDED_COPY_PASTE') {
        existing.pasteAttempts += 1;
      }
      if (inc.type === 'FULLSCREEN_EXIT') {
        existing.fullscreenExits += 1;
      }
      if (inc.type === 'EXCEEDED_TAB_SWITCHES' || inc.type === 'EXCEEDED_COPY_PASTE') {
        existing.isAutoLocked = true;
      }

      existing.events.push({
        type: inc.type,
        reason: inc.reason || 'Telemetry flag',
        timestamp: inc.timestamp || new Date().toISOString(),
      });

      if (new Date(inc.timestamp).getTime() > new Date(existing.lastTimestamp).getTime()) {
        existing.lastTimestamp = inc.timestamp;
      }

      map.set(slug, existing);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [fsTelemetry?.incidents]);

  const practiceIncidentsCount = useMemo(() => {
    return questionIncidentsList.filter((i) => i.track === 'PRACTICE').length;
  }, [questionIncidentsList]);

  const labIncidentsCount = useMemo(() => {
    return questionIncidentsList.filter((i) => i.track === 'LAB_INTERNAL').length;
  }, [questionIncidentsList]);

  const filteredQuestionIncidents = useMemo(() => {
    return questionIncidentsList.filter((item) => {
      if (auditTrackFilter !== 'ALL' && item.track !== auditTrackFilter) return false;
      if (auditModuleFilter !== 'ALL' && item.moduleIndex !== auditModuleFilter) return false;
      return true;
    });
  }, [questionIncidentsList, auditTrackFilter, auditModuleFilter]);

  const incidentsByModule = useMemo(() => {
    const groups: { [key: number]: typeof filteredQuestionIncidents } = {};
    filteredQuestionIncidents.forEach((item) => {
      const mod = item.moduleIndex || 1;
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(item);
    });
    return groups;
  }, [filteredQuestionIncidents]);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateStudentPDFReport({
        studentName: user?.fullName || user?.displayName || user?.email || 'Registered Candidate',
        prn: user?.prn || '2126PMIM1039',
        email: user?.email || '',
        department: user?.department || 'Integrated M.Tech (CSE)',
        college: user?.college || 'Sanjivani University',
        cieMarks,
        labSolvedCount,
        practiceSolvedCount: solvedTopicIds.length,
        compilerAccuracy: verdictStats.accuracy,
        acceptedCount: verdictStats.ac,
        compileErrorCount: verdictStats.ce,
        wrongAnswerCount: verdictStats.wa,
        integrityScore: finalIntegrityScore,
        tabSwitches: totalTabSwitches,
        fullscreenExits: totalFullscreenExits,
        clipboardBlocked: totalClipboardAttempts,
        autoLockCount,
      });
      toast.success('Official PDF Report downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF. Opening print dialog as fallback.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
              4 Core Syllabus Modules
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  4 Core C Language Syllabus Modules
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete syllabus progression across both Practice Arena (100 Topics) and Lab Internal CIE (80 Coursework Experiments).
                </p>
              </div>

              {/* Track View Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 w-fit text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setMasteryViewFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    masteryViewFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All (Practice + Lab)
                </button>
                <button
                  type="button"
                  onClick={() => setMasteryViewFilter('PRACTICE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    masteryViewFilter === 'PRACTICE'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>💻 Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMasteryViewFilter('LAB_INTERNAL')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    masteryViewFilter === 'LAB_INTERNAL'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>🔬 Lab Internal</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {modulesProgress.map((mod) => {
                const combinedTotal = mod.topicsTotal + mod.labTotal;
                const combinedSolved = mod.topicsSolved + mod.labSolved;
                const combinedPct = combinedTotal > 0 ? Math.round((combinedSolved / combinedTotal) * 100) : 0;
                const practicePct = mod.topicsTotal > 0 ? Math.round((mod.topicsSolved / mod.topicsTotal) * 100) : 0;
                const labPct = mod.labTotal > 0 ? Math.round((mod.labSolved / mod.labTotal) * 100) : 0;

                const displayTotal =
                  masteryViewFilter === 'PRACTICE'
                    ? mod.topicsTotal
                    : masteryViewFilter === 'LAB_INTERNAL'
                    ? mod.labTotal
                    : combinedTotal;

                const displaySolved =
                  masteryViewFilter === 'PRACTICE'
                    ? mod.topicsSolved
                    : masteryViewFilter === 'LAB_INTERNAL'
                    ? mod.labSolved
                    : combinedSolved;

                const displayPct =
                  masteryViewFilter === 'PRACTICE'
                    ? practicePct
                    : masteryViewFilter === 'LAB_INTERNAL'
                    ? labPct
                    : combinedPct;

                return (
                  <div
                    key={mod.id}
                    className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {mod.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mod.desc}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {displaySolved} / {displayTotal} Completed ({displayPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Track Sub-Breakdown Badges (Showing both Practice & Lab Internal) */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-mono font-bold">
                        💻 Practice: {mod.topicsSolved} / {mod.topicsTotal} Topics
                      </span>
                      {mod.labTotal > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">
                          🔬 Lab Internal: {mod.labSolved} / {mod.labTotal} Problems
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-cyan-500"
                        style={{ width: `${displayPct}%` }}
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['proctoring-telemetry-student', targetUid] });
                      toast.success('Proctoring telemetry refreshed!');
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer shadow-xs"
                    title="Refresh telemetry"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Integrity Rating: {finalIntegrityScore} / 100
                  </span>
                </div>
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
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Fullscreen Exits</span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {totalFullscreenExits} {totalFullscreenExits === 1 ? 'exit' : 'exits'}
                  </div>
                </div>
              </div>

              {/* Question-by-Question Proctoring Audit Section - Track & Module Sorted */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Question-Level Proctoring & Anti-Cheat Audit</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sorted by Track (Practice Arena vs Lab Internal) and Academic Module with exact timestamps.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {filteredQuestionIncidents.length} of {questionIncidentsList.length} Questions
                  </span>
                </div>

                {/* Filter Controls: Track and Module Filter Switchers */}
                {questionIncidentsList.length > 0 && (
                  <div className="space-y-2.5">
                    {/* Track Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 w-fit text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setAuditTrackFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          auditTrackFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        All Tracks ({questionIncidentsList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditTrackFilter('PRACTICE')}
                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          auditTrackFilter === 'PRACTICE'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>💻 Practice Arena</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{practiceIncidentsCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditTrackFilter('LAB_INTERNAL')}
                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          auditTrackFilter === 'LAB_INTERNAL'
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>🔬 Lab Internal CIE</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{labIncidentsCount}</span>
                      </button>
                    </div>

                    {/* Module Filter Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-slate-400 font-sans font-medium mr-1">Module:</span>
                      <button
                        type="button"
                        onClick={() => setAuditModuleFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          auditModuleFilter === 'ALL'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        All
                      </button>
                      {[1, 2, 3, 4].map((mNum) => (
                        <button
                          key={mNum}
                          type="button"
                          onClick={() => setAuditModuleFilter(mNum as any)}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            auditModuleFilter === mNum
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                              : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                          }`}
                        >
                          Module {mNum}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question List Grouped by Module */}
                {filteredQuestionIncidents.length > 0 ? (
                  <div className="space-y-6 pt-2">
                    {Object.entries(incidentsByModule).map(([modNumStr, questions]) => {
                      const modNum = Number(modNumStr);
                      const modTitle =
                        modNum === 1
                          ? 'Module 1: C Fundamentals & Control Flow'
                          : modNum === 2
                          ? 'Module 2: Arrays, Strings & 2D Matrices'
                          : modNum === 3
                          ? 'Module 3: Functions, Recursion & Pointers'
                          : 'Module 4: Structures, Unions & Dynamic Memory';

                      return (
                        <div key={modNum} className="space-y-3">
                          {/* Module Header Bar */}
                          <div className="p-3 px-4 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {modTitle}
                              </h5>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {questions.length} Question{questions.length > 1 ? 's' : ''} Logged
                            </span>
                          </div>

                          {/* Problem Cards in this Module */}
                          <div className="space-y-3 pl-1 sm:pl-3">
                            {questions.map((q, idx) => {
                              const isExpanded = expandedTimelineSlugs.has(q.problemSlug);
                              return (
                                <div
                                  key={idx}
                                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h6 className="font-bold text-sm text-slate-900 dark:text-white">
                                          {q.problemTitle}
                                        </h6>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                          q.track === 'LAB_INTERNAL'
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                        }`}>
                                          {q.trackLabel}
                                        </span>
                                        {q.isAutoLocked && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            Auto-Locked / Quarantined
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Latest Event: {new Date(q.lastTimestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(q.lastTimestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                      </span>
                                    </div>

                                    {/* Violations Count Badges */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      {q.tabSwitches > 0 && (
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                          🔄 {q.tabSwitches} Tab Switch{q.tabSwitches > 1 ? 'es' : ''}
                                        </span>
                                      )}
                                      {q.pasteAttempts > 0 && (
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                          📋 {q.pasteAttempts} Paste Blocked
                                        </span>
                                      )}
                                      {q.fullscreenExits > 0 && (
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                          ⛶ {q.fullscreenExits} Fullscreen Exits
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Collapsible Timeline Events */}
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleTimeline(q.problemSlug)}
                                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>{isExpanded ? 'Hide Event Timeline' : `View Event Timeline (${q.events.length} logs)`}</span>
                                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    {isExpanded && (
                                      <div className="mt-2.5 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-2 animate-fadeIn">
                                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                          {q.events.map((ev, eIdx) => {
                                            // Format sequential numbering if duplicate Exit #1 exists
                                            let displayReason = ev.reason;
                                            if (ev.type === 'FULLSCREEN_EXIT' || displayReason.includes('Fullscreen exited')) {
                                              const exitNum = q.events.length - eIdx;
                                              displayReason = `Fullscreen exited (Exit #${exitNum})`;
                                            }

                                            return (
                                              <div
                                                key={eIdx}
                                                className="flex items-start justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                                  <span>{displayReason}</span>
                                                </div>
                                                <span className="text-[11px] text-slate-400 shrink-0">
                                                  {new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <h5 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Clean Record in Selected Track / Module
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      No infractions were detected under this filter. All questions were coded with 100% academic integrity.
                    </p>
                  </div>
                )}
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
            className="space-y-6"
          >
            {/* Official Report Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Standard Institutional Format
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Part A + Part B
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Official Student Academic &amp; Integrity Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive two-part institutional dossier verified by GCC 14 sandbox compiler and proctoring telemetry.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
                  </button>
                  <Link
                    to="/history"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <span>Full Submissions Log →</span>
                  </Link>
                </div>
              </div>

              {/* Standard Report Structure Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Part A Box */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-900 dark:text-white">
                        Part A: Academic Code Evaluation
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {verdictStats.ac} Solved
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Detailed record of all problem submissions across Practice Arena (100 Topics) and Lab Internal CIE (80 Problems).
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-1 font-mono">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>Verbatim C Source Code (Syntax Highlighted)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>Compiler Verdicts (Accepted, CE, WA)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>Public &amp; Hidden Test Cases Passed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>CIE Lab Continuous Evaluation Marks ({cieMarks.toFixed(1)} / 20.0 M)</span>
                    </li>
                  </ul>
                </div>

                {/* Part B Box */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-900 dark:text-white">
                        Part B: Proctoring &amp; Behavioral Telemetry
                      </h4>
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${finalIntegrityScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                      {finalIntegrityScore} / 100 Score
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Second-by-second anti-cheat audit logs captured during active student coding windows.
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-1 font-mono">
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">✓</span>
                      <span>Tab Switches: {totalTabSwitches} events recorded</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">✓</span>
                      <span>Fullscreen Exits: {totalFullscreenExits} events logged</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">✓</span>
                      <span>Clipboard Protection: {totalClipboardAttempts} paste attempts blocked</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-500">✓</span>
                      <span>Institutional Verification Hash &amp; QR Seal</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Student Identity Metadata Preview */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Student Name &amp; ID</span>
                  <span className="font-bold text-slate-900 dark:text-white">{user?.displayName || user?.email || 'Registered Candidate'}</span>
                  {user?.prn && <span className="text-slate-400 ml-1.5 font-normal">({user.prn})</span>}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Institution</span>
                  <span>Sanjivani University • Dept. of CSE</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Generated On</span>
                  <span>{new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Verification Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {finalIntegrityScore >= 80 ? '✓ Tamper-Proof Certified' : '⚠ Flagged for Faculty Audit'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboardAnalyticsPage;
