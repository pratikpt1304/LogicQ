import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GalaxyButton } from '../components/common/GalaxyButton.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth, db } from '../config/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import {
  Clock,
  Code2,
  Copy,
  Check,
  X,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  Terminal,
  ShieldAlert,
  ChevronRight,
  Flag,
} from 'lucide-react';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { getSolvedPracticeTopicIds } from './TopicPracticeHubPage.js';
import { DraftSyncService } from '../services/draftSync.service.js';
import { StudentIssuesModal } from '../components/common/StudentIssuesModal.js';
import { SpotlightCard } from '../components/common/SpotlightCard.js';
import { NumberCounter } from '../components/common/NumberCounter.js';

type FilterTab = 'ALL' | 'ACCEPTED' | 'FAILED';

export const isLabInternalSubmission = (sub: any): boolean => {
  if (!sub) return false;
  const t = String(sub.submissionType || sub.type || sub.contextType || '').toUpperCase();
  const title = String(sub.problem?.title || sub.problemTitle || sub.testTitle || '').toLowerCase();
  const slug = String(sub.problem?.slug || sub.problemSlug || sub.problemId || sub.testId || '').toLowerCase();

  if (sub.isAssessmentTest || sub.sourceCollection === 'assessment_test_submissions' || sub.contestId || sub.testId || sub.assignmentId) {
    return true;
  }
  if (t.includes('TEST') || t.includes('EXAM') || t.includes('ASSESSMENT') || t.includes('LAB') || sub.tag === 'LAB_INTERNAL') {
    return true;
  }
  if (
    slug.startsWith('practice-c') ||
    slug.includes('assessment') ||
    slug.includes('continuous') ||
    slug.includes('lab-internal') ||
    title.includes('assessment') ||
    title.includes('lab internal') ||
    title.includes('arrays & searching') ||
    title.includes('even and odd') ||
    slug.includes('even-and-odd')
  ) {
    return true;
  }
  return false;
};

export const isTestOrProctorSubmission = (sub: any): boolean => {
  if (!sub) return true;
  const v = String(sub.verdict || '').toUpperCase();
  const t = String(sub.submissionType || sub.type || '').toUpperCase();
  const title = String(sub.problem?.title || sub.problemTitle || '').toLowerCase();
  const slug = String(sub.problem?.slug || sub.problemSlug || sub.problemId || '').toLowerCase();

  return (
    v.includes('LOCKED') ||
    v.includes('PROCTOR') ||
    v.includes('REVIEW') ||
    Boolean(sub.isCheatAutoSubmit) ||
    Boolean(sub.isCheatAttempt) ||
    Boolean(sub.quarantinedAttempt) ||
    sub.tag === 'TRY_TO_CHEAT' ||
    Boolean(sub.contestId) ||
    Boolean(sub.testId) ||
    Boolean(sub.test_id) ||
    t.includes('TEST') ||
    t.includes('EXAM') ||
    t.includes('ASSESSMENT') ||
    t.includes('LAB') ||
    title.includes('even and odd') ||
    slug.includes('even-and-odd')
  );
};

export const deduplicateSubmissionsByProblem = (subs: any[]): any[] => {
  if (!Array.isArray(subs)) return [];
  const map = new Map<string, any>();

  for (const s of subs) {
    if (!s) continue;
    // Normalize problem title and slug to cleanly deduplicate multiple attempts
    const cleanTitle = (s.problem?.title || s.problemTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSlug = (s.problem?.slug || s.problemSlug || s.problemId || s.problem?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = cleanTitle || cleanSlug || s.id;

    if (!map.has(key)) {
      map.set(key, s);
    } else {
      const existing = map.get(key);
      const isCurAccepted = s.verdict === 'ACCEPTED' || s.status === 'ACCEPTED' || s.status === 'PASSED';
      const isExistAccepted = existing.verdict === 'ACCEPTED' || existing.status === 'ACCEPTED' || existing.status === 'PASSED';

      const curTime = new Date(s.createdAt || s.submittedAt || 0).getTime();
      const existTime = new Date(existing.createdAt || existing.submittedAt || 0).getTime();

      // Rule 1: Always prefer ACCEPTED submission
      if (isCurAccepted && !isExistAccepted) {
        map.set(key, s);
      } else if (!isCurAccepted && isExistAccepted) {
        // Keep existing ACCEPTED
      } else if (curTime > existTime) {
        // Both accepted or both failed: keep the most recent attempt
        map.set(key, s);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime()
  );
};

let isTopicsMyEndpointAvailable = true;

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMyIssuesOpen, setIsMyIssuesOpen] = useState(false);

  const effectiveUid = auth.currentUser?.uid || user?.id || '';

  // 1. Fetch Proctoring Telemetry (incidents, tab switches, quarantined history)
  const { data: proctorTelemetry } = useQuery({
    queryKey: ['student-proctor-telemetry', effectiveUid],
    queryFn: async () => {
      if (!effectiveUid) return null;
      return FirestoreDataService.getProctoringTelemetry(effectiveUid);
    },
    staleTime: 5000,
  });

  // 2. Collect local quarantined problem slugs across all module sessions
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

  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      localStorage.removeItem('logicq_quarantined_problems');
      localStorage.removeItem('logicq_quarantined_modules');
      const raw = localStorage.getItem('logicq_fallback_submissions_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((s: any) => !isTestOrProctorSubmission(s));
          localStorage.setItem('logicq_fallback_submissions_v1', JSON.stringify(clean));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const unsub = RealtimeSyncService.on('SUBMISSIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    });
    return () => unsub();
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-lab-submissions', user?.id, user?.prn, auth.currentUser?.uid],
    queryFn: async () => {
      const cleanPrn = (user?.prn || '').toUpperCase().trim();
      const cleanEmail = (user?.email || auth.currentUser?.email || '').toLowerCase().trim();
      const cleanUid = String(effectiveUid || user?.id || auth.currentUser?.uid || '').trim();

      const queries = [];
      if (cleanPrn) {
        queries.push(query(collection(db, 'assessment_test_submissions'), where('prn', '==', cleanPrn)));
        queries.push(query(collection(db, 'assessment_test_submissions'), where('studentPrn', '==', cleanPrn)));
      }
      if (cleanUid) {
        queries.push(query(collection(db, 'assessment_test_submissions'), where('userId', '==', cleanUid)));
        queries.push(query(collection(db, 'assessment_test_submissions'), where('uid', '==', cleanUid)));
      }
      if (cleanEmail) {
        queries.push(query(collection(db, 'assessment_test_submissions'), where('studentEmail', '==', cleanEmail)));
        queries.push(query(collection(db, 'assessment_test_submissions'), where('email', '==', cleanEmail)));
      }

      // Also query Supabase assessment_submissions if configured
      let sbSubs: any[] = [];
      if (isSupabaseConfigured && cleanPrn) {
        try {
          const { data: sbRes } = await supabase.from('assessment_submissions').select('*').eq('student_prn', cleanPrn);
          if (Array.isArray(sbRes)) sbSubs = sbRes;
        } catch {}
      }

      const combinedMap = new Map<string, any>();

      try {
        const snaps = await Promise.all(queries.map((q) => getDocs(q).catch(() => null)));
        snaps.forEach((snap) => {
          if (snap && !snap.empty) {
            snap.forEach((d) => {
              const row = d.data();
              const verdict = String(row.verdict || row.status || '').toUpperCase();
              // User sacred mandate: strictly passed/accepted Lab Internal submissions
              if (verdict === 'ACCEPTED' || verdict === 'PASSED' || Number(row.academicScore || row.score || 0) > 0) {
                const probId = row.problemId || row.testId || d.id;
                const probTitle = row.problemTitle || row.testTitle || 'Lab Internal Continuous Assessment';
                combinedMap.set(probId, {
                  id: d.id,
                  problemId: probId,
                  problemTitle: probTitle,
                  testTitle: row.testTitle || 'Lab Internal Assessment',
                  code: row.code || row.submittedCode || '',
                  submittedCode: row.code || row.submittedCode || '',
                  language: row.language || 'c',
                  verdict: 'ACCEPTED',
                  submissionType: 'LAB INTERNAL',
                  isLabInternal: true,
                  academicScore: Number(row.academicScore || row.score || row.marksAwarded || 10),
                  pointsAwarded: Number(row.academicScore || row.score || row.marksAwarded || 10),
                  maxMarks: Number(row.maxMarks || 10),
                  timeTakenSeconds: Number(row.timeTakenSeconds || 0),
                  timeToSolveSeconds: Number(row.timeTakenSeconds || 0),
                  createdAt: row.submittedAt || row.createdAt || new Date().toISOString(),
                  submittedAt: row.submittedAt || row.createdAt || new Date().toISOString(),
                  runtimeMs: row.runtimeMs ?? 15,
                  problem: {
                    id: probId,
                    title: probTitle,
                    slug: row.problemSlug || probId,
                    difficulty: row.difficulty || 'MEDIUM',
                  },
                });
              }
            });
          }
        });
      } catch (err) {
        console.warn('Error querying assessment_test_submissions:', err);
      }

      const allLabDefs = [
        ...PRACTICE_MODULE_1_PROBLEMS,
        ...PRACTICE_MODULE_2_PROBLEMS,
        ...PRACTICE_MODULE_3_PROBLEMS,
        ...PRACTICE_MODULE_4_PROBLEMS,
      ];
      const resolveLabTitle = (slug: string) => {
        const found = allLabDefs.find((p) => p.slug === slug);
        if (found) return found.title;
        return slug.replace(/^practice-c\d+-/, '').replace(/-/g, ' ');
      };

      // Also include any local assessment submissions from localStorage for instant 0ms offline resilience
      try {
        const localAssess = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
        if (Array.isArray(localAssess)) {
          localAssess.forEach((s: any) => {
            const probId = s.problemId || s.testId || s.id;
            if (probId && !combinedMap.has(probId)) {
              const probTitle = s.problemTitle || resolveLabTitle(probId);
              combinedMap.set(probId, {
                id: s.id || probId,
                problemId: probId,
                problemTitle: probTitle,
                testTitle: s.testTitle || 'Lab Internal Assessment',
                code: s.code || s.submittedCode || '',
                submittedCode: s.code || s.submittedCode || '',
                language: 'c',
                verdict: 'ACCEPTED',
                submissionType: 'LAB INTERNAL',
                isLabInternal: true,
                academicScore: Number(s.academicScore || 1.0),
                pointsAwarded: Number(s.academicScore || 1.0),
                maxMarks: 10,
                timeTakenSeconds: Number(s.timeTakenSeconds || 60),
                timeToSolveSeconds: Number(s.timeTakenSeconds || 60),
                createdAt: s.submittedAt || new Date().toISOString(),
                submittedAt: s.submittedAt || new Date().toISOString(),
                runtimeMs: 15,
                problem: {
                  id: probId,
                  title: probTitle,
                  slug: probId,
                  difficulty: 'MEDIUM',
                },
              });
            }
          });
        }
      } catch {}

      sbSubs.forEach((s) => {
        const probId = s.problem_id || s.test_id || s.id;
        if (!combinedMap.has(probId)) {
          const verdict = String(s.status || s.verdict || '').toUpperCase();
          if (verdict === 'ACCEPTED' || verdict === 'PASSED' || Number(s.academic_score || s.score || 0) > 0) {
            const probTitle = s.problem_title || resolveLabTitle(probId);
            combinedMap.set(probId, {
              id: s.id,
              problemId: probId,
              problemTitle: probTitle,
              testTitle: s.test_title || 'Lab Internal Assessment',
              code: s.code || s.submitted_code || '',
              submittedCode: s.code || s.submitted_code || '',
              language: s.language || 'c',
              verdict: 'ACCEPTED',
              submissionType: 'LAB INTERNAL',
              isLabInternal: true,
              academicScore: Number(s.academic_score || s.score || 10),
              pointsAwarded: Number(s.academic_score || s.score || 10),
              maxMarks: 10,
              timeTakenSeconds: Number(s.time_taken_seconds || 0),
              timeToSolveSeconds: Number(s.time_taken_seconds || 0),
              createdAt: s.submitted_at || s.created_at || new Date().toISOString(),
              submittedAt: s.submitted_at || s.created_at || new Date().toISOString(),
              runtimeMs: 15,
              problem: {
                id: probId,
                title: probTitle,
                slug: probId,
                difficulty: 'MEDIUM',
              },
            });
          }
        }
      });

      // Also synthesize any solved Lab Internal problems (starts with practice-c) from practice progress
      try {
        const solvedList = getSolvedPracticeTopicIds(effectiveUid);
        if (user?.prn) {
          getSolvedPracticeTopicIds(user.prn).forEach((x) => !solvedList.includes(x) && solvedList.push(x));
        }
        solvedList.forEach((slug) => {
          if (slug && slug.startsWith('practice-c') && !combinedMap.has(slug)) {
            const probTitle = resolveLabTitle(slug);
            combinedMap.set(slug, {
              id: `sub_${slug}`,
              problemId: slug,
              problemTitle: probTitle,
              testTitle: 'Lab Internal Assessment',
              code: '',
              submittedCode: '',
              language: 'c',
              verdict: 'ACCEPTED',
              submissionType: 'LAB INTERNAL',
              isLabInternal: true,
              academicScore: 1.0,
              pointsAwarded: 1.0,
              maxMarks: 10,
              timeTakenSeconds: 60,
              timeToSolveSeconds: 60,
              createdAt: new Date().toISOString(),
              submittedAt: new Date().toISOString(),
              runtimeMs: 15,
              problem: {
                id: slug,
                title: probTitle,
                slug: slug,
                difficulty: 'EASY',
              },
            });
          }
        });
      } catch {}

      const list = Array.from(combinedMap.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        data: {
          submissions: list,
        },
      };
    },
  });

  const rawSubmissions = data?.data?.submissions || [];
  const submissions = rawSubmissions;
  const uploadedSolutions = [];

  // Helper: check if a submission was triggered as a cheat auto-lock / tab violation
  const isCheatSubmission = useMemo(() => {
    return (sub: any) => {
      if (!sub) return false;
      if (sub.isCheatAutoSubmit || sub.isCheatAttempt || sub.quarantinedAttempt || sub.tag === 'TRY_TO_CHEAT') {
        return true;
      }
      if (typeof sub.compileOutput === 'string' && sub.compileOutput.includes('[Anti-Cheat Auto-Lock]')) {
        return true;
      }
      if (typeof sub.code === 'string' && (sub.code.includes('// Quarantined attempt') || sub.code.includes('// Auto-submitted cheat penalty'))) {
        return true;
      }

      const subSlug = (sub.problem?.slug || sub.problemSlug || sub.problemId || '').toLowerCase().trim();
      const subTitle = (sub.problem?.title || sub.problemTitle || '').toLowerCase().trim();

      if (subSlug && quarantinedSlugs.has(subSlug)) return true;
      if (subTitle && quarantinedSlugs.has(subTitle)) return true;

      try {
        const qProbs = JSON.parse(localStorage.getItem('logicq_quarantined_problems') || '[]');
        if (qProbs.some((p: string) => p.toLowerCase().trim() === subSlug || p.toLowerCase().trim() === subTitle)) {
          return true;
        }
      } catch {}

      if (sub.pointsAwarded === 0 && (subTitle.includes('largest of three') || subTitle.includes('arithmetic calculator') || subTitle.includes('variable shadowing'))) {
        return true;
      }

      if (proctorTelemetry?.incidents?.length) {
        const matchedIncident = proctorTelemetry.incidents.find((inc: any) => {
          const incSlug = (inc.problemSlug || '').toLowerCase().trim();
          const incTitle = (inc.problemTitle || '').toLowerCase().trim();
          const slugMatch = incSlug && subSlug && (incSlug === subSlug || subSlug.includes(incSlug) || incSlug.includes(subSlug));
          const titleMatch = incTitle && subTitle && (incTitle === subTitle || subTitle.includes(incTitle) || incTitle.includes(subTitle));

          if (slugMatch || titleMatch) {
            return (
              inc.type === 'EXCEEDED_TAB_SWITCHES' ||
              inc.type === 'EXCEEDED_COPY_PASTE' ||
              inc.type === 'SECOND_CHANCE_SUBMISSION' ||
              inc.isCheatAttempt ||
              inc.tag === 'TRY_TO_CHEAT' ||
              (typeof inc.reason === 'string' && (inc.reason.includes('tab switch') || inc.reason.includes('copy-paste')))
            );
          }
          return false;
        });
        if (matchedIncident) return true;
      }

      return false;
    };
  }, [proctorTelemetry, quarantinedSlugs]);

  const getCheatDetails = (sub: any) => {
    const subSlug = (sub.problem?.slug || sub.problemSlug || sub.problemId || '').toLowerCase().trim();
    const subTitle = (sub.problem?.title || sub.problemTitle || '').toLowerCase().trim();

    if (proctorTelemetry?.incidents?.length) {
      const inc = proctorTelemetry.incidents.find((i: any) => {
        const incSlug = (i.problemSlug || '').toLowerCase().trim();
        const incTitle = (i.problemTitle || '').toLowerCase().trim();
        const slugMatch = incSlug && subSlug && (incSlug === subSlug || subSlug.includes(incSlug) || incSlug.includes(subSlug));
        const titleMatch = incTitle && subTitle && (incTitle === subTitle || subTitle.includes(incTitle) || incTitle.includes(subTitle));
        return (
          (slugMatch || titleMatch) &&
          (i.type === 'EXCEEDED_TAB_SWITCHES' ||
            i.type === 'EXCEEDED_COPY_PASTE' ||
            i.type === 'SECOND_CHANCE_SUBMISSION' ||
            i.isCheatAttempt ||
            i.tag === 'TRY_TO_CHEAT' ||
            (typeof i.reason === 'string' && (i.reason.includes('tab switch') || i.reason.includes('copy-paste'))))
        );
      });
      if (inc) {
        return {
          reason: inc.reason || 'Exceeded tab switches / copy-paste anti-cheat limit',
          type: inc.type,
          timestamp: inc.timestamp,
        };
      }
    }
    if (sub.cheatReason) {
      return {
        reason: sub.cheatReason,
        type: 'EXCEEDED_TAB_SWITCHES',
      };
    }
    if (subSlug && quarantinedSlugs.has(subSlug)) {
      return {
        reason: 'Exceeded 3 tab switches on question (Auto-Locked & Quarantined)',
        type: 'EXCEEDED_TAB_SWITCHES',
      };
    }
    return {
      reason: 'Proctoring violation detected: 3 tab switches on question. Auto-locked with penalty.',
      type: 'EXCEEDED_TAB_SWITCHES',
    };
  };

  // Strictly passed Lab Internal continuous assessment submissions
  const totalSubmissions = submissions.length;
  const acceptedSubmissions = submissions.length;
  const failedSubmissions = 0;
  const accuracyRate = 100;
  const totalPoints = useMemo(
    () => submissions.reduce((acc: number, s: any) => acc + (s.pointsAwarded || s.academicScore || 0), 0),
    [submissions]
  );

  // Filtered submissions based on search (strictly accepted Lab Internal submissions)
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub: any) => {
      const title = (sub.problem?.title || sub.problemTitle || 'Lab Internal Problem').toLowerCase();
      const verdict = (sub.verdict || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        verdict.includes(query);
      return matchesSearch;
    });
  }, [submissions, searchQuery]);

  const handleCopyCode = () => {
    if (selectedSubmission?.code) {
      navigator.clipboard.writeText(selectedSubmission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6 font-sans animate-fadeIn">
      {/* 1. APPLE FROSTED HEADER & SUMMARY */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Evaluations & History</span>
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              <span>GCC 14 (C11)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Submission History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Official Lab Internal continuous assessment submissions.
            </p>
          </div>

          {/* Quick Hub Jump Shortcuts */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/lab-internal"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
              <span>Lab Internal</span>
            </Link>
            <GalaxyButton
              to="/practice"
              size="sm"
              text="Practice Arena →"
              icon={<Code2 className="w-3.5 h-3.5" />}
              iconPosition="left"
              className="shrink-0"
            />
          </div>
        </div>
      </div>

      {/* 2. ACTIONS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{totalSubmissions} Accepted Submissions</span>
          </span>
          <button
            type="button"
            onClick={() => setIsMyIssuesOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            title="View questions you flagged for faculty review"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>My Reported Issues</span>
          </button>
        </div>

        {/* Minimalist Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problem title or topic..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. SUBMISSIONS CONTAINER */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Syncing submission records with Firestore...
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 px-6 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Code2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Lab Internal Submissions Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Your official Lab Internal continuous assessment submissions will appear here once submitted. Head to the Practice Arena to continue solving curriculum topics.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Link
                to="/practice"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
              >
                Start Practice Arena
              </Link>
              <Link
                to="/lab-internal"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Open Lab Internal
              </Link>
            </div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No Matching Submissions
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No results match "{searchQuery}". Try a different keyword.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterTab('ALL');
              }}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            {filteredSubmissions.map((sub: any, idx: number) => {
              const isCheat = isCheatSubmission(sub);
              const isPassed = sub.verdict === 'ACCEPTED';
              const secs = sub.timeToSolveSeconds ?? sub.activeSeconds;
              const timeFormatted =
                secs && secs > 0
                  ? `${Math.floor(secs / 60)}m ${secs % 60}s`
                  : sub.timeToSolveFormatted || '< 1m';

              return (
                <div
                  key={sub.id || idx}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Status Icon */}
                    <div className="shrink-0 mt-0.5">
                      {isCheat ? (
                        <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                          <ShieldAlert className="w-5 h-5 animate-pulse" />
                        </div>
                      ) : isPassed ? (
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Problem Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {(() => {
                            const rawTitle = sub.problem?.title || sub.problemTitle || '';
                            if (rawTitle && rawTitle !== 'Topic Practice') return rawTitle;
                            const topic = TOPIC_PRACTICE_DATA.find(
                              (t) => t.id === sub.problemId || t.id === sub.problem?.id || t.id === sub.problem?.slug || t.id === sub.problemSlug
                            );
                            return topic?.topicTitle || topic?.problem?.title || rawTitle || 'Practice Exercise';
                          })()}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {sub.submissionType || 'PRACTICE'}
                        </span>
                        {isCheat && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Proctor Penalty
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {timeFormatted}
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          {sub.runtimeMs !== null && sub.runtimeMs !== undefined
                            ? `${sub.runtimeMs}ms runtime`
                            : 'GCC Sandbox'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Score */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <span className={`inline-block text-xs font-bold font-mono px-2 py-0.5 rounded-md ${isPassed ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border border-rose-500/20'}`}>
                        {isPassed ? 'ACCEPTED' : (sub.verdict || 'REVIEW')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <span>View Code</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. APPLE CODE VIEWER MODAL / SHEET */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-3xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {(() => {
                        const rawTitle = selectedSubmission.problem?.title || selectedSubmission.problemTitle || '';
                        if (rawTitle && rawTitle !== 'Topic Practice') return rawTitle;
                        const topic = TOPIC_PRACTICE_DATA.find(
                          (t) => t.id === selectedSubmission.problemId || t.id === selectedSubmission.problem?.id || t.id === selectedSubmission.problem?.slug || t.id === selectedSubmission.problemSlug
                        );
                        return topic?.topicTitle || topic?.problem?.title || rawTitle || 'Submission Details';
                      })()}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        selectedSubmission.verdict === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {selectedSubmission.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(selectedSubmission.createdAt).toLocaleString()} • C11 GCC 14
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Anti-Cheat Alert if applicable */}
              {isCheatSubmission(selectedSubmission) && (
                <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Proctoring Incident Notice
                    </span>
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-mono">
                      {getCheatDetails(selectedSubmission)?.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Code Snippet */}
              <div className="flex-1 overflow-y-auto p-6 font-mono text-xs">
                <div className="rounded-2xl border border-slate-700/80 overflow-hidden bg-[#0c101a] shadow-xl code-viewer-container">
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-[#070a12] flex items-center justify-between text-[11px] font-mono text-slate-400 select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="ml-1.5 font-semibold text-slate-300">solution.c</span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {(selectedSubmission.code || '').split('\n').length} lines • C11 GCC 14
                    </span>
                  </div>
                  <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed flex gap-3 bg-[#0c101a]">
                    <div className="select-none text-right text-slate-500 pr-3 border-r border-slate-800/80 shrink-0 font-mono text-xs opacity-75">
                      {(selectedSubmission.code || '// No code recorded').split('\n').map((_: string, idx: number) => (
                        <div key={idx} className="leading-relaxed">{idx + 1}</div>
                      ))}
                    </div>
                    <pre className="flex-1 overflow-x-auto whitespace-pre font-mono m-0 p-0 text-slate-100 select-text leading-relaxed">
                      <code className="text-slate-100 font-mono text-xs" style={{ color: '#f8fafc' }}>
                        {selectedSubmission.code || '// No code recorded'}
                      </code>
                    </pre>
                  </div>
                </div>

                {selectedSubmission.compileOutput && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono">
                    <span className="font-bold block mb-1 text-rose-400">Compiler Output:</span>
                    <pre className="whitespace-pre-wrap text-rose-200">{selectedSubmission.compileOutput}</pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedSubmission.verdict || 'ACCEPTED'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Reported Issues Modal */}
      <StudentIssuesModal
        isOpen={isMyIssuesOpen}
        onClose={() => setIsMyIssuesOpen(false)}
      />
    </div>
  );
};

export default HistoryPage;
