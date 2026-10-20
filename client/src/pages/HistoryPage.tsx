import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { Clock, Eye, X, Copy, Check, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Difficulty, Verdict } from '../types/index.js';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

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

      // If backend has 0 submissions, fetch authoritative from Firestore / local storage
      const effectiveUid = auth.currentUser?.uid || user?.id || '';
      if (serverSubs.length === 0 && effectiveUid) {
        try {
          const fsSubs = await FirestoreDataService.getUserSubmissions(effectiveUid);
          if (fsSubs && fsSubs.length > 0) {
            serverSubs = fsSubs;
          }
        } catch (fsErr) {
          console.warn('Firestore fallback submissions error:', fsErr);
        }

        if (serverSubs.length === 0) {
          try {
            const raw = localStorage.getItem('logicq_fallback_submissions_v1');
            if (raw) {
              const parsed = JSON.parse(raw);
              serverSubs = Array.isArray(parsed) ? parsed : [];
            }
          } catch {}
        }
      }

      return {
        data: {
          submissions: serverSubs,
          uploadedSolutions: serverUploads,
        },
      };
    },
  });

  const submissions = data?.data?.submissions || [];
  const uploadedSolutions = data?.data?.uploadedSolutions || [];

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-cyan-400" />
          <span>Submission History</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
          Audit of all your C code evaluations, uploaded solution reviews, verdicts, and compiler outputs.
        </p>
      </div>

      {/* Uploaded Solutions Section (if any) */}
      {uploadedSolutions.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Uploaded Solutions ({uploadedSolutions.length})</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Manual Teacher / Admin Review</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Problem</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Files</th>
                  <th className="px-6 py-3.5">Points</th>
                  <th className="px-6 py-3.5">Reviewer Feedback</th>
                  <th className="px-6 py-3.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {uploadedSolutions.map((up: any) => (
                  <tr key={up.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {up.problem?.slug && !up.problem?.isEnded ? (
                        <Link
                          to="/challenge"
                          className="hover:text-cyan-400 transition-colors"
                        >
                          {up.problem?.title || 'Daily Challenge'}
                        </Link>
                      ) : (
                        <span className="text-slate-200">
                          {up.problem?.title || 'Past Challenge'}
                        </span>
                      )}
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
                              : up.status === 'CHANGES_REQUESTED' || up.status === 'NEEDS_CHANGES'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        {up.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {Array.isArray(up.files) ? `${up.files.length} file(s)` : '—'}
                    </td>
                    <td className="px-6 py-4 font-bold text-cyan-400">
                      +{up.pointsAwarded || 0} PTS
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                      {up.reviewerComment || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(up.submittedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Submissions Table */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center font-mono text-cyan-400 text-xs">
            Loading submission history...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center font-mono flex flex-col items-center justify-center space-y-3">
            <Clock className="w-8 h-8 text-slate-400 opacity-40 mb-1" />
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">No Code Submissions Recorded</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Your C code evaluations and test verdicts will appear here once you run or submit code.
            </p>
            <Link
              to="/challenge"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all"
            >
              <span>Solve First Challenge</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Problem</th>
                  <th className="px-4 py-3.5">Attempt</th>
                  <th className="px-4 py-3.5">Time Taken</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                  <th className="px-6 py-3.5">Verdict</th>
                  <th className="px-6 py-3.5">Runtime</th>
                  <th className="px-6 py-3.5">Points</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {submissions.map((sub: any) => {
                  const attemptNum = attemptMap.get(sub.id) || 1;
                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {sub.problem?.slug && !sub.problem?.isEnded ? (
                          <Link
                            to="/challenge"
                            className="hover:text-cyan-400 transition-colors"
                          >
                            {sub.problem?.title}
                          </Link>
                        ) : (
                          <span className="text-slate-200">
                            {sub.problem?.title || 'Past Challenge'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          #{attemptNum}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          {(() => {
                            const secs = sub.timeToSolveSeconds ?? sub.activeSeconds;
                            if (secs && secs > 0) {
                              const mins = Math.floor(secs / 60);
                              const remaining = secs % 60;
                              return mins > 0 ? `${mins}m ${remaining}s` : `${remaining}s`;
                            }
                            return sub.timeToSolveFormatted || '< 1m';
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <DifficultyBadge difficulty={sub.problem?.difficulty as Difficulty} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                      </td>
                    <td className="px-6 py-4 text-slate-400">
                      {sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}
                    </td>
                    <td className="px-6 py-4 font-bold text-cyan-400">
                      +{sub.pointsAwarded} PTS
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(sub.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View Code</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Viewer Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-dark-850 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSubmission.problem?.title}</span>
                  <VerdictBadge verdict={selectedSubmission.verdict} size="sm" />
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {selectedSubmission.runtimeMs}ms • {new Date(selectedSubmission.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 text-xs font-mono text-slate-300 hover:text-white border border-white/[0.06] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-dark-950 font-mono text-xs">
              <pre className="text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
          </div>
        </div>
      )}
    </div>
  );
};
