import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Copy,
  Users,
  Cpu,
  Lock,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface PlagiarismResult {
  similarity: number;
  jaccardScore: number;
  containmentScore: number;
  riskLevel: 'CLEAN' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  matchedFingerprintsCount: number;
  totalFingerprintsA: number;
  totalFingerprintsB: number;
  normalizedTokenCountA: number;
  normalizedTokenCountB: number;
}

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

interface SecurityVector {
  id: string;
  category: string;
  name: string;
  description: string;
  payload: string;
  passed: boolean;
  verdict: string;
  expectedVerdicts: string[];
  runtimeMs: number;
  blockedBy: string;
  notes: string;
}

interface SecurityReport {
  timestamp: string;
  totalVectors: number;
  passedVectors: number;
  failedVectors: number;
  compliancePercentage: number;
  overallStatus: 'SECURE' | 'AT_RISK' | 'CRITICAL_VULNERABILITY';
  orphanProcessesFound: string[];
  vectors: SecurityVector[];
}

export const AdminAntiCheatSecurity: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'plagiarism' | 'audit'>('plagiarism');

  // --- PLAGIARISM STATE ---
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(70);
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReport | null>(null);

  // Quick Compare State
  const [codeA, setCodeA] = useState<string>(`#include <stdio.h>\nint main() {\n  int count = 0;\n  while (count < 10) {\n    printf("%d\\n", count);\n    count++;\n  }\n  return 0;\n}`);
  const [codeB, setCodeB] = useState<string>(`#include <stdio.h>\nint main() {\n  int idx = 0;\n  while (idx < 10) {\n    printf("%d\\n", idx);\n    idx++;\n  }\n  return 0;\n}`);
  const [compareResult, setCompareResult] = useState<PlagiarismResult | null>(null);
  const [compareModalPair, setCompareModalPair] = useState<SuspiciousPair | null>(null);

  // Fetch problems for dropdown
  const { data: problemsData } = useQuery({
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
        toast.success('Plagiarism Scan Complete: No suspicious pairs found above threshold!');
      } else {
        toast.warning(`Scan Complete: Found ${data.flaggedPairsCount} suspicious submission pair(s)!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to scan problem submissions');
    },
  });

  // Compare two codes mutation
  const compareCodesMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>('/admin/plagiarism/compare', { codeA, codeB });
      return res.data;
    },
    onSuccess: (data) => {
      setCompareResult(data);
      toast.success(`Similarity calculated: ${(data.similarity * 100).toFixed(1)}%`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Comparison failed');
    },
  });

  // --- SECURITY AUDIT STATE ---
  const [auditReport, setAuditReport] = useState<SecurityReport | null>(null);

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<any>('/admin/security/audit');
      return res.data;
    },
    onSuccess: (data) => {
      setAuditReport(data);
      if (data.overallStatus === 'SECURE') {
        toast.success(`Security Audit Passed: ${data.compliancePercentage}% Compliance, Zero Sandbox Leaks!`);
      } else {
        toast.error(`Security Audit Warning: Sandbox Status is ${data.overallStatus}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Security audit execution failed');
    },
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800 flex items-center gap-1"><Flame className="w-3 h-3" /> CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300 dark:border-orange-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> HIGH</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> MODERATE</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CLEAN</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('plagiarism')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'plagiarism'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Plagiarism & Similarity Scanner
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Sandbox Red-Teaming & Security Audit
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: PLAGIARISM ----------------- */}
      {activeSubTab === 'plagiarism' && (
        <div className="space-y-6">
          {/* Section 1: Problem Submissions Scanner */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Batch Plagiarism Scan (Student Submissions)
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Scans all student submissions for a specific challenge or practice problem using the MOSS-standard Winnowing algorithm with variable-renaming normalization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Problem
                </label>
                <select
                  value={selectedProblemId}
                  onChange={(e) => setSelectedProblemId(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Problem --</option>
                  {(problemsData || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.difficulty || 'PROBLEM'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Similarity Threshold: {similarityThreshold}%
                </label>
                <input
                  type="range"
                  min="40"
                  max="95"
                  step="5"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>40% (Strict)</span>
                  <span>70% (Recommended)</span>
                  <span>95% (Exact Only)</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  disabled={!selectedProblemId || scanProblemMutation.isPending}
                  onClick={() =>
                    scanProblemMutation.mutate({
                      problemId: selectedProblemId,
                      threshold: similarityThreshold,
                    })
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all text-sm"
                >
                  {scanProblemMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Scanning Submissions...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Run Plagiarism Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Table */}
            {plagiarismReport && (
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-300">
                  <div>
                    Analyzed <strong>{plagiarismReport.totalSubmissionsAnalyzed}</strong> submissions for "
                    <strong>{plagiarismReport.problemTitle}</strong>"
                  </div>
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {plagiarismReport.flaggedPairsCount} Suspicious Pair(s) Flagged
                  </div>
                </div>

                {plagiarismReport.pairs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    ✨ Clean code: No submissions exceeded the {plagiarismReport.threshold * 100}% similarity threshold.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Student A</th>
                          <th className="py-2.5 px-3">Student B</th>
                          <th className="py-2.5 px-3 text-center">Similarity</th>
                          <th className="py-2.5 px-3 text-center">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {plagiarismReport.pairs.map((pair, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {pair.userAName}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                PRN: {pair.userAPrn || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {pair.userBName}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                PRN: {pair.userBPrn || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              <span
                                className={
                                  pair.similarity >= 0.85
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                }
                              >
                                {(pair.similarity * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {getRiskBadge(pair.riskLevel)}
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

          {/* Section 2: Interactive Code Comparator */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Interactive Code Pair Comparison
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste two C code snippets to run instant AST lexical tokenization, winnowing fingerprinting, and containment analysis.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Code Snippet 1 (Student A)
                </label>
                <textarea
                  value={codeA}
                  onChange={(e) => setCodeA(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-xs bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Code Snippet 2 (Student B)
                </label>
                <textarea
                  value={codeB}
                  onChange={(e) => setCodeB(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-xs bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                disabled={compareCodesMutation.isPending}
                onClick={() => compareCodesMutation.mutate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-lg flex items-center gap-2 shadow-sm text-sm disabled:opacity-50 transition-all"
              >
                {compareCodesMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating Overlap...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Compare Snippets
                  </>
                )}
              </button>

              {compareResult && (
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    Similarity Score:{' '}
                    <strong className="text-base text-blue-600 dark:text-blue-400">
                      {(compareResult.similarity * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    Jaccard: <strong>{(compareResult.jaccardScore * 100).toFixed(1)}%</strong>
                  </div>
                  <div>
                    Containment: <strong>{(compareResult.containmentScore * 100).toFixed(1)}%</strong>
                  </div>
                  <div>{getRiskBadge(compareResult.riskLevel)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: SANDBOX RED-TEAMING & SECURITY AUDIT ----------------- */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Live Sandbox Security Audit & Red-Teaming Suite
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Executes empirical exploits against LogicQ's GCC compilation pipeline and Windows Job Object Sandbox to guarantee process isolation and zero data leakage.
                </p>
              </div>

              <button
                disabled={runAuditMutation.isPending}
                onClick={() => runAuditMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-sm text-sm disabled:opacity-50 transition-all"
              >
                {runAuditMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Live Exploits...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Live Security Audit
                  </>
                )}
              </button>
            </div>

            {/* Audit Summary Cards */}
            {auditReport && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Compliance Rate</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {auditReport.compliancePercentage}%
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sandbox Status</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
                      {auditReport.overallStatus === 'SECURE' ? (
                        <>
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">SECURE</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                          <span className="text-red-600 dark:text-red-400">{auditReport.overallStatus}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Vectors Blocked</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {auditReport.passedVectors} / {auditReport.totalVectors}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Orphan Processes</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {auditReport.orphanProcessesFound.length === 0 ? '0 (Clean)' : auditReport.orphanProcessesFound.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Vector Details Table */}
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Vector</th>
                        <th className="py-2.5 px-3">Attack Category</th>
                        <th className="py-2.5 px-3">Enforcement Layer</th>
                        <th className="py-2.5 px-3 text-center">Verdict</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {auditReport.vectors.map((vec) => (
                        <tr key={vec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-gray-900 dark:text-white">{vec.name}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{vec.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {vec.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                              {vec.blockedBy}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[11px]">
                            {vec.verdict}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {vec.passed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                <CheckCircle2 className="w-4 h-4" /> PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-xs">
                                <AlertTriangle className="w-4 h-4" /> FAILED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
