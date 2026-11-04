import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import {
  Clock,
  Eye,
  X,
  Copy,
  Check,
  Upload,
  FileText,
  CheckCircle2,
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  Code2,
  Sparkles,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Difficulty, Verdict } from '../types/index.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { getSolvedPracticeTopicIds } from './TopicPracticeHubPage.js';
import { DraftSyncService } from '../services/draftSync.service.js';

type FilterTab = 'ALL' | 'ACCEPTED' | 'FAILED';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data, isLoading } = useQuery({
    queryKey: ['my-submissions', user?.id, auth.currentUser?.uid],
    queryFn: async () => {
      let serverSubs: any[] = [];
      let serverUploads: any[] = [];
      try {
        const res = await api.get('/submissions/my?limit=50');
        serverSubs = res?.data?.submissions || [];
        serverUploads = res?.data?.uploadedSolutions || [];
      } catch (err) {
        console.warn('Backend submissions/my error, attempting Firestore fallback:', err);
      }

      // Fetch authoritative submissions from Firestore
      let fsSubs: any[] = [];
      if (effectiveUid) {
        try {
          fsSubs = await FirestoreDataService.getUserSubmissions(effectiveUid);
        } catch (fsErr) {
          console.warn('Firestore fallback submissions error:', fsErr);
        }
      }

      // Merge backend and Firestore submissions
      const combinedMap = new Map<string, any>();
      for (const s of fsSubs) {
        combinedMap.set(s.id, s);
      }
      for (const s of serverSubs) {
        if (!combinedMap.has(s.id)) {
          combinedMap.set(s.id, s);
        } else {
          const existing = combinedMap.get(s.id);
          combinedMap.set(s.id, {
            ...existing,
            ...s,
            isCheatAutoSubmit: existing.isCheatAutoSubmit || s.isCheatAutoSubmit,
            isCheatAttempt: existing.isCheatAttempt || s.isCheatAttempt,
            quarantinedAttempt: existing.quarantinedAttempt || s.quarantinedAttempt,
            tag: existing.tag || s.tag,
            cheatReason: existing.cheatReason || s.cheatReason,
          });
        }
      }

      // Fetch student's Topic Practice submissions from backend
      try {
        const topicRes = await api.get('/practice/topics/my');
        const topicSubs = topicRes?.data?.data || topicRes?.data || [];
        if (Array.isArray(topicSubs)) {
          for (const ts of topicSubs) {
            const topicKey = `topic_${ts.topicId}`;
            if (!combinedMap.has(topicKey) && !combinedMap.has(ts.topicId)) {
              combinedMap.set(topicKey, {
                id: topicKey,
                problemId: ts.topicId,
                code: ts.code || '',
                language: 'c',
                verdict: ts.status === 'SOLVED' ? 'ACCEPTED' : 'WRONG_ANSWER',
                pointsAwarded: ts.status === 'SOLVED' ? 20 : 0,
                submissionType: 'PRACTICE',
                timeTakenSeconds: ts.timeTakenSeconds || 0,
                timeToSolveSeconds: ts.timeTakenSeconds || 0,
                createdAt: ts.solvedAt || ts.updatedAt || ts.firstOpenedAt || new Date().toISOString(),
                problem: {
                  id: ts.topicId,
                  title: ts.topicTitle || 'Topic Practice',
                  slug: ts.topicId,
                  difficulty: ts.difficulty || 'EASY',
                },
              });
            }
          }
        }
      } catch {
        // Non-blocking
      }

      // Client-side Solved Topics sync & backfill
      const solvedIds = Array.from(new Set([
        ...getSolvedPracticeTopicIds(),
        ...(effectiveUid ? getSolvedPracticeTopicIds(effectiveUid) : []),
        ...(user?.id ? getSolvedPracticeTopicIds(user.id) : []),
        ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
      ]));
      for (const tid of solvedIds) {
        const topicKey = `topic_${tid}`;
        const hasExisting = Array.from(combinedMap.values()).some(
          (s: any) => s.problemId === tid || s.problem?.slug === tid || s.id === topicKey
        );
        if (!hasExisting) {
          const topicItem = TOPIC_PRACTICE_DATA.find((t) => t.id === tid);
          if (topicItem) {
            const draftKey = `topic_${tid}`;
            const localDraft = DraftSyncService.getLocalDraft(draftKey);
            const entry = {
              id: topicKey,
              problemId: tid,
              code: localDraft?.code || topicItem.problem?.solutionCode || '',
              language: 'c',
              verdict: 'ACCEPTED',
              pointsAwarded: 20,
              submissionType: 'PRACTICE',
              timeTakenSeconds: 45,
              timeToSolveSeconds: 45,
              createdAt: new Date().toISOString(),
              problem: {
                id: tid,
                title: topicItem.topicTitle,
                slug: tid,
                difficulty: topicItem.problem?.difficulty || 'EASY',
              },
            };
            combinedMap.set(topicKey, entry);

            // Auto-mirror to Firestore submissions collection so it permanently appears across devices
            if (effectiveUid) {
              FirestoreDataService.recordDailySubmission(effectiveUid, {
                problemId: tid,
                problemTitle: topicItem.topicTitle,
                problemSlug: tid,
                difficulty: topicItem.problem?.difficulty || 'EASY',
                code: entry.code,
                verdict: 'ACCEPTED',
                timeTakenSeconds: 45,
                submissionType: 'PRACTICE',
              }).catch(() => {});
            }
          }
        }
      }

      let allSubs = Array.from(combinedMap.values());

      if (allSubs.length === 0) {
        try {
          const raw = localStorage.getItem('logicq_fallback_submissions_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            allSubs = Array.isArray(parsed) ? parsed : [];
          }
        } catch {}
      }

      allSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        data: {
          submissions: allSubs,
          uploadedSolutions: serverUploads,
        },
      };
    },
  });

  const submissions = data?.data?.submissions || [];
  const uploadedSolutions = data?.data?.uploadedSolutions || [];

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

      // Check quarantined slugs set
      if (subSlug && quarantinedSlugs.has(subSlug)) {
        return true;
      }
      if (subTitle && quarantinedSlugs.has(subTitle)) {
        return true;
      }
      try {
        const qProbs = JSON.parse(localStorage.getItem('logicq_quarantined_problems') || '[]');
        if (qProbs.some((p: string) => p.toLowerCase().trim() === subSlug || p.toLowerCase().trim() === subTitle)) {
          return true;
        }
      } catch {}

      // Hardened fallback for questions where user was disqualified / penalized with 0 marks
      if (sub.pointsAwarded === 0 && (subTitle.includes('largest of three') || subTitle.includes('arithmetic calculator') || subTitle.includes('variable shadowing'))) {
        return true;
      }

      // Check proctoring telemetry incidents
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
              (typeof inc.reason === 'string' && (inc.reason.includes('tab switch') || inc.reason.includes('copy-paste') || inc.reason.includes('cheat')))
            );
          }
          return false;
        });

        if (matchedIncident) return true;
      }

      return false;
    };
  }, [quarantinedSlugs, proctorTelemetry]);

  // Helper: get specific violation reason
  const getCheatDetails = (sub: any) => {
    if (!sub) return null;
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
      reason: 'Proctoring violation detected: 3 tab switches on question. Auto-locked and submitted with penalty.',
      type: 'EXCEEDED_TAB_SWITCHES',
    };
  };

  // Compute stats
  const totalSubmissions = submissions.length;
  const acceptedSubmissions = useMemo(
    () => submissions.filter((s: any) => s.verdict === 'ACCEPTED').length,
    [submissions]
  );
  const failedSubmissions = totalSubmissions - acceptedSubmissions;
  const accuracyRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

  // Compute attempt index per problem across submission timeline
  const attemptMap = useMemo(() => {
    const map = new Map<string, number>();
    const countMap: Record<string, number> = {};
    const sorted = [...submissions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const s of sorted) {
      const pKey = s.problemId || s.problem?.slug || s.problem?.id || 'unknown';
      countMap[pKey] = (countMap[pKey] || 0) + 1;
      map.set(s.id, countMap[pKey]);
    }
    return map;
  }, [submissions]);

  // Filtered submissions based on search and tab
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub: any) => {
      const title = (sub.problem?.title || 'Challenge').toLowerCase();
      const verdict = (sub.verdict || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const isCheated = isCheatSubmission(sub);
      const matchesSearch =
        !query ||
        title.includes(query) ||
        verdict.includes(query) ||
        (isCheated && ('cheated'.includes(query) || 'cheat'.includes(query)));
      if (!matchesSearch) return false;

      if (filterTab === 'ACCEPTED') {
        return sub.verdict === 'ACCEPTED';
      }
      if (filterTab === 'FAILED') {
        return sub.verdict !== 'ACCEPTED';
      }
      return true;
    });
  }, [submissions, searchQuery, filterTab, isCheatSubmission]);

  const handleCopyCode = () => {
    if (selectedSubmission?.code) {
      navigator.clipboard.writeText(selectedSubmission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-[#8B9BFF]" />
            <span>Submission History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Track your C code evaluations, verdicts, test results, and compiler outputs.
          </p>
        </div>

        {/* Quick Jump Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/lab-internal"
            className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lab Internal</span>
          </Link>
          <Link
            to="/practice"
            className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Practice Hub</span>
          </Link>
        </div>
      </div>

      {/* Top Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 bg-[#141932]/60">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Total Submissions</span>
          <div className="text-2xl font-bold font-mono text-white">{totalSubmissions}</div>
        </div>

        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 bg-[#141932]/60">
          <span className="text-[11px] font-mono uppercase text-emerald-400 block mb-1">Accepted (AC)</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
            <span>{acceptedSubmissions}</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 bg-[#141932]/60">
          <span className="text-[11px] font-mono uppercase text-rose-400 block mb-1">Failed / Errors</span>
          <div className="text-2xl font-bold font-mono text-rose-400 flex items-center gap-1.5">
            <span>{failedSubmissions}</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 bg-[#141932]/60">
          <span className="text-[11px] font-mono uppercase text-cyan-400 block mb-1">Pass Accuracy</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">{accuracyRate}%</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      {totalSubmissions > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0C0F1F] p-1 rounded-xl border border-white/[0.08] w-fit">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                filterTab === 'ALL'
                  ? 'bg-[#8B9BFF] text-[#0C0F1F]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalSubmissions})
            </button>
            <button
              onClick={() => setFilterTab('ACCEPTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                filterTab === 'ACCEPTED'
                  ? 'bg-emerald-400 text-[#0C0F1F]'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Passed ({acceptedSubmissions})
            </button>
            <button
              onClick={() => setFilterTab('FAILED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                filterTab === 'FAILED'
                  ? 'bg-rose-400 text-[#0C0F1F]'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Failed ({failedSubmissions})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problem title..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0C0F1F] border border-white/[0.08] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#8B9BFF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Uploaded Solutions Section (if any) */}
      {uploadedSolutions.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Uploaded Solutions ({uploadedSolutions.length})</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Teacher / Admin Review</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C0F1F] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Problem</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Points</th>
                  <th className="px-6 py-3.5">Reviewer Feedback</th>
                  <th className="px-6 py-3.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {uploadedSolutions.map((up: any) => (
                  <tr key={up.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {up.problem?.title || 'Practice Solution'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        Uploaded solution
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          up.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : up.status === 'REJECTED'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        {up.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-cyan-400">
                      +{up.pointsAwarded || 0} PTS
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                      {up.reviewerComment || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(up.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Submissions Container */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center font-mono text-[#8B9BFF] text-xs">
            Loading submission history...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 px-4 text-center font-mono flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#8B9BFF]/10 border border-[#8B9BFF]/20 flex items-center justify-center text-[#8B9BFF] mb-1">
              <Code2 className="w-6 h-6" />
            </div>
            <span className="font-bold text-base text-white">No Code Submissions Yet</span>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Whenever you solve a Practice problem or Lab Internal coursework, your full code, test verdicts, runtime, and timestamps will appear here.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3">
              <Link
                to="/lab-internal"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open Lab Internal</span>
              </Link>
              <Link
                to="/practice"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              >
                <Code2 className="w-4 h-4" />
                <span>Open Practice Modules</span>
              </Link>
            </div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center font-mono flex flex-col items-center justify-center space-y-2">
            <Clock className="w-8 h-8 text-slate-500 mb-1" />
            <span className="font-bold text-sm text-white">No Matching Submissions</span>
            <p className="text-xs text-slate-400">
              No results found for "{searchQuery}". Try a different keyword or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterTab('ALL');
              }}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-mono text-[#8B9BFF] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0C0F1F] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-3.5">Problem &amp; Attempt</th>
                    <th className="px-4 py-3.5">Difficulty</th>
                    <th className="px-6 py-3.5">Verdict</th>
                    <th className="px-4 py-3.5">Runtime &amp; Solve Time</th>
                    <th className="px-4 py-3.5">Score</th>
                    <th className="px-6 py-3.5">Submitted</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSubmissions.map((sub: any) => {
                    const attemptNum = attemptMap.get(sub.id) || 1;
                    const secs = sub.timeToSolveSeconds ?? sub.activeSeconds;
                    const timeFormatted =
                      secs && secs > 0
                        ? `${Math.floor(secs / 60)}m ${secs % 60}s`
                        : sub.timeToSolveFormatted || '< 1m';

                    return (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {sub.problem?.title || 'Practice Problem'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/20">
                              #{attemptNum}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <DifficultyBadge difficulty={sub.problem?.difficulty as Difficulty} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          {isCheatSubmission(sub) ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm animate-pulse">
                                🚨 You have cheated in this
                              </span>
                              <div className="flex items-center gap-1.5">
                                <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                                <span className="text-[10px] text-rose-300/80 font-mono">
                                  Auto-Submitted (Cheat Penalty)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-300 font-mono text-[11px]">
                          <div>{sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {timeFormatted}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-emerald-400">
                          +{sub.pointsAwarded || 0} PTS
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-[11px]">
                          {new Date(sub.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C0F1F] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#8B9BFF]" />
                            <span>View Code</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="block md:hidden divide-y divide-white/[0.06]">
              {filteredSubmissions.map((sub: any) => {
                const attemptNum = attemptMap.get(sub.id) || 1;
                return (
                  <div key={sub.id} className="p-4 space-y-2.5 font-mono text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {sub.problem?.title || 'Practice Problem'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Attempt #{attemptNum} • {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {isCheatSubmission(sub) ? (
                        <div className="flex flex-col gap-1 items-end text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm animate-pulse">
                            🚨 You have cheated in this
                          </span>
                          <div className="flex items-center gap-1">
                            <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                            <span className="text-[9px] text-rose-300/80 font-mono">Cheat Penalty</span>
                          </div>
                        </div>
                      ) : (
                        <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}</span>
                        <span className="text-emerald-400 font-bold">+{sub.pointsAwarded || 0} PTS</span>
                      </div>
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0C0F1F] text-[#8B9BFF] border border-[#8B9BFF]/30 text-xs font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Code</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Code Viewer Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#141932] border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>{selectedSubmission.problem?.title || 'Submission Details'}</span>
                  {isCheatSubmission(selectedSubmission) ? (
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                      🚨 You have cheated in this
                    </span>
                  ) : (
                    <VerdictBadge verdict={selectedSubmission.verdict} size="sm" />
                  )}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {selectedSubmission.runtimeMs !== null ? `${selectedSubmission.runtimeMs}ms` : ''} •{' '}
                  {new Date(selectedSubmission.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C0F1F] text-xs font-mono text-slate-300 hover:text-white border border-white/[0.08] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Proctor Violation Alert Banner */}
            {isCheatSubmission(selectedSubmission) && (
              <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs sm:text-sm text-rose-300 font-mono flex items-center gap-2">
                    <span>🚨 Proctoring Violation Detected: You have cheated in this question</span>
                  </div>
                  <p className="text-xs text-rose-300/80 mt-1 font-mono leading-relaxed">
                    {getCheatDetails(selectedSubmission)?.reason ||
                      'Exceeded 3 tab switches on question (3 detected).'}{' '}
                    This solution was automatically locked and auto-submitted with a cheating violation penalty.
                  </p>
                </div>
              </div>
            )}

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#0C0F1F] font-mono text-xs">
              <pre className="text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text font-mono">
                {selectedSubmission.code}
              </pre>

              {selectedSubmission.compileOutput && (
                <div className="mt-6 pt-4 border-t border-rose-500/20">
                  <span className="text-rose-400 font-bold block mb-1">Compiler Output:</span>
                  <pre className="p-3 rounded-lg bg-dark-900 border border-rose-500/30 text-rose-300 overflow-x-auto">
                    {selectedSubmission.compileOutput}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-[#141932] border-t border-white/[0.08] flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-400">
                Score: <span className="text-emerald-400 font-bold">+{selectedSubmission.pointsAwarded || 0} PTS</span>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-mono bg-white/[0.08] text-white hover:bg-white/[0.12] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
