import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { Code2, Clock, Eye, X, Copy, Check } from 'lucide-react';
import { Difficulty, Verdict } from '../types/index.js';

export const HistoryPage: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => api.get('/submissions/my?limit=50'),
  });

  const submissions = data?.data?.submissions || [];

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
          Audit of all your C code evaluations, verdicts, and compiler outputs.
        </p>
      </div>

      {/* Submissions Table */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center font-mono text-cyan-400 text-xs">
            Loading submission history...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center font-mono text-slate-400 text-xs">
            No submissions recorded yet. Try solving today's challenge!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Problem</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                  <th className="px-6 py-3.5">Verdict</th>
                  <th className="px-6 py-3.5">Runtime</th>
                  <th className="px-6 py-3.5">Points</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {submissions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <Link
                        to={`/challenge/${sub.problem?.slug}`}
                        className="hover:text-cyan-400 transition-colors"
                      >
                        {sub.problem?.title}
                      </Link>
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
                ))}
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
