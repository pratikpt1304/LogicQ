import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Search,
  Code2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Users,
  Flame,
  X,
  FileCode,
} from 'lucide-react';

interface SuspiciousPair {
  submissionAId: string;
  submissionBId: string;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  userAPrn?: string | null;
  userBPrn?: string | null;
  similarity: number;
  riskLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  submittedAtA: string;
  submittedAtB: string;
  codeA?: string;
  codeB?: string;
}

interface PlagiarismReport {
  problemId: string;
  problemTitle: string;
  totalSubmissionsAnalyzed: number;
  flaggedPairsCount: number;
  threshold: number;
  scannedAt: string;
  pairs: SuspiciousPair[];
}

export const AdminAntiCheatSecurity: React.FC = () => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(70);
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReport | null>(null);
  const [compareModalPair, setCompareModalPair] = useState<SuspiciousPair | null>(null);

  // Fetch problems for dropdown
  const { data: problemsData, isLoading: isLoadingProblems } = useQuery({
    queryKey: ['admin-problems-list'],
    queryFn: async () => {
      const res = await api.get<any>('/admin/problems');
      return res.data?.problems || res.problems || [];
    },
  });

  // Scan problem mutation
  const scanProblemMutation = useMutation({
    mutationFn: async ({ problemId, threshold }: { problemId: string; threshold: number }) => {
      const res = await api.get<any>(`/admin/plagiarism/problem/${problemId}?threshold=${threshold / 100}`);
      return res.data;
    },
    onSuccess: (data) => {
      setPlagiarismReport(data);
      if (data.flaggedPairsCount === 0) {
        toast.success(`Scan Complete: Zero suspicious code pairs found for "${data.problemTitle}"!`);
      } else {
        toast.warning(`Scan Complete: Flagged ${data.flaggedPairsCount} suspicious code pair(s)!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to scan problem submissions');
    },
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-md bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-400" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" /> HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" /> MODERATE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> CLEAN
          </span>
        );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* Scanner Control Card */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Plagiarism & Code Similarity Scanner</span>
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-2xl">
              Scan student C submissions for identical logic, structural renaming, and AST lexical containment using the MOSS-standard Winnowing algorithm.
            </p>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1.5">
            <label className="block text-xs font-mono font-medium text-slate-300">
              Select Problem to Scan
            </label>
            <select
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              disabled={isLoadingProblems}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 transition"
            >
              <option value="">-- Choose Challenge or Practice Problem --</option>
              {(problemsData || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.difficulty || 'PROBLEM'})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Threshold:</span>
              <span className="font-bold text-cyan-400">{similarityThreshold}% Match</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>40% (Strict)</span>
              <span>70% (Standard)</span>
              <span>95% (Exact)</span>
            </div>
          </div>

          <div className="md:col-span-3">
            <button
              disabled={!selectedProblemId || scanProblemMutation.isPending}
              onClick={() =>
                scanProblemMutation.mutate({
                  problemId: selectedProblemId,
                  threshold: similarityThreshold,
                })
              }
              className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-rose-400 to-amber-400 hover:from-rose-300 hover:to-amber-300 shadow-lg shadow-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              {scanProblemMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-dark-950" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-dark-950" />
                  <span>Run Plagiarism Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan Results View */}
        {plagiarismReport && (
          <div className="pt-4 border-t border-white/[0.06] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="text-slate-300">
                Analyzed <strong className="text-white">{plagiarismReport.totalSubmissionsAnalyzed}</strong> submissions for{' '}
                <strong className="text-cyan-300">"{plagiarismReport.problemTitle}"</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Similarity Threshold: {Math.round(plagiarismReport.threshold * 100)}%</span>
                <span className="text-slate-500">•</span>
                <span className={`font-bold ${plagiarismReport.flaggedPairsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {plagiarismReport.flaggedPairsCount} Suspicious Pair(s) Detected
                </span>
              </div>
            </div>

            {plagiarismReport.pairs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-mono font-bold text-white">All Submissions Clean</div>
                <p className="text-xs font-mono text-emerald-300/80 max-w-md mx-auto">
                  No two students exceeded the {Math.round(plagiarismReport.threshold * 100)}% structural code similarity threshold.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="py-3 px-4">Student A</th>
                      <th className="py-3 px-4">Student B</th>
                      <th className="py-3 px-4 text-center">Similarity</th>
                      <th className="py-3 px-4 text-center">Risk Level</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {plagiarismReport.pairs.map((pair, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{pair.userAName}</div>
                          <div className="text-[11px] text-cyan-400">PRN: {pair.userAPrn || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(pair.submittedAtA).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{pair.userBName}</div>
                          <div className="text-[11px] text-cyan-400">PRN: {pair.userBPrn || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(pair.submittedAtB).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold text-sm ${
                              pair.similarity >= 0.85
                                ? 'text-rose-400'
                                : pair.similarity >= 0.7
                                ? 'text-orange-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {(pair.similarity * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getRiskBadge(pair.riskLevel)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setCompareModalPair(pair)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span>Compare Code</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side-by-Side Code Diff Modal */}
      {compareModalPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-5xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-7 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <span>Side-by-Side Plagiarism Analysis</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {(compareModalPair.similarity * 100).toFixed(1)}% Match
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Comparing submissions between <strong className="text-white">{compareModalPair.userAName}</strong> and{' '}
                    <strong className="text-white">{compareModalPair.userBName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalPair(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student A Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/[0.06] text-xs font-mono">
                  <div>
                    <div className="font-bold text-white">{compareModalPair.userAName}</div>
                    <div className="text-[11px] text-cyan-400">PRN: {compareModalPair.userAPrn || 'N/A'}</div>
                  </div>
                  {compareModalPair.codeA && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(compareModalPair.codeA || '', 'Student A Code')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                      title="Copy Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <pre className="p-3.5 rounded-xl bg-black/70 border border-white/[0.08] text-slate-200 text-xs font-mono overflow-x-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
                  {compareModalPair.codeA || '// Code preview unavailable'}
                </pre>
              </div>

              {/* Student B Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/[0.06] text-xs font-mono">
                  <div>
                    <div className="font-bold text-white">{compareModalPair.userBName}</div>
                    <div className="text-[11px] text-cyan-400">PRN: {compareModalPair.userBPrn || 'N/A'}</div>
                  </div>
                  {compareModalPair.codeB && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(compareModalPair.codeB || '', 'Student B Code')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                      title="Copy Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <pre className="p-3.5 rounded-xl bg-black/70 border border-white/[0.08] text-slate-200 text-xs font-mono overflow-x-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
                  {compareModalPair.codeB || '// Code preview unavailable'}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Risk Classification: <strong className="text-white">{compareModalPair.riskLevel}</strong>
              </span>
              <button
                type="button"
                onClick={() => setCompareModalPair(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-mono font-medium transition"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
