import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  BarChart3,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sliders,
  Search,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { formatPracticeTime } from '../practice/PracticeTimer.js';
import { toast } from 'sonner';

export const AdminPracticeAnalytics: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    studentId: '',
    problemId: '',
    activeSeconds: 0,
    attemptsCount: 1,
    isSolved: true,
    reason: '',
    adminPassword: '',
  });

  // Query aggregate practice analytics
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-practice-reports'],
    queryFn: () => api.get('/practice/admin/reports'),
  });

  const summary = analyticsData?.data?.summary || {
    totalStudents: 0,
    totalPracticeProgressRecords: 0,
    totalSolved: 0,
    totalAttempts: 0,
    avgAttemptsPerSolve: 0,
    avgTimeToSolveSeconds: 0,
  };

  const questionAnalytics: any[] = analyticsData?.data?.questions || [];

  const filteredQuestions = questionAnalytics.filter((q) => {
    if (filterModule === 'ALL') return true;
    return q.moduleSlug === filterModule;
  });

  // Correction mutation
  const correctMutation = useMutation({
    mutationFn: (body: typeof correctionForm) =>
      api.post('/practice/admin/correct-progress', body),
    onSuccess: () => {
      toast.success('Student practice progress corrected and logged to audit trail.');
      setIsCorrectionModalOpen(false);
      setCorrectionForm({
        studentId: '',
        problemId: '',
        activeSeconds: 0,
        attemptsCount: 1,
        isSolved: true,
        reason: '',
        adminPassword: '',
      });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to correct student practice progress');
    },
  });

  const handleDownloadCsv = async () => {
    try {
      toast.loading('Generating audited practice CSV export...', { id: 'admin-practice-csv' });
      const token = localStorage.getItem('logicq_access_token');
      const apiBase = (
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        '/api'
      ).replace(/\/$/, '');

      const response = await fetch(`${apiBase}/practice/admin/reports/csv`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LogicQ_Practice_Cohort_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Practice cohort CSV downloaded successfully.', { id: 'admin-practice-csv' });
    } catch (err: any) {
      toast.error(err.message || 'Export failed', { id: 'admin-practice-csv' });
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-white/[0.08]">
      {/* Header & Export Row */}
      <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-mono font-bold text-white uppercase flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Practice Performance Analytics &amp; Integrity Audit</span>
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-2xl">
            Real-time cohort telemetry, active solve times, question bottleneck indices, and audited record correction.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCorrectionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Correct Student Record</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Cohort CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-white/[0.06] bg-dark-900/60">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">TOTAL PRACTICE SOLVES</span>
          <span className="text-xl font-bold font-mono text-emerald-400">{summary.totalSolved}</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-white/[0.06] bg-dark-900/60">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">ACTIVE STUDENTS ENGAGED</span>
          <span className="text-xl font-bold font-mono text-cyan-400">{summary.totalStudents}</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-white/[0.06] bg-dark-900/60">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">AVG TIME TO SOLVE</span>
          <span className="text-xl font-bold font-mono text-indigo-400">
            {formatPracticeTime(summary.avgTimeToSolveSeconds || 0)}
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-white/[0.06] bg-dark-900/60">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">AVG ATTEMPTS / SOLVE</span>
          <span className="text-xl font-bold font-mono text-amber-400">
            {summary.avgAttemptsPerSolve || 1}
          </span>
        </div>
      </div>

      {/* Question Telemetry Table */}
      <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-white font-mono">
            Curriculum Question Telemetry &amp; Bottlenecks ({filteredQuestions.length})
          </h4>

          {/* Module Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-dark-900 border border-white/[0.1] text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-400"
            >
              <option value="ALL">All Modules</option>
              <option value="control-structures">Module 1 (Control Structures)</option>
              <option value="pointers-and-functions">Module 2 (Pointers &amp; Functions)</option>
              <option value="array-and-its-applications">Module 3 (Arrays)</option>
              <option value="advanced-data-types-dynamic-memory">Module 4 (Advanced / DMA)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-slate-400">
            Loading practice telemetry analytics...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No practice questions found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/90 text-slate-400 text-[10px] uppercase border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2.5">Question</th>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5">Solves</th>
                  <th className="px-4 py-2.5">Avg Active Time</th>
                  <th className="px-4 py-2.5">Median Active Time</th>
                  <th className="px-4 py-2.5">Avg Attempts</th>
                  <th className="px-4 py-2.5">1st Try Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredQuestions.map((q) => (
                  <tr key={q.problemId} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-white block">{q.title}</span>
                      <span className="text-[10px] text-slate-500">#{q.moduleOrder} • {q.difficulty}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{q.moduleSlug}</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-bold">{q.solvesCount}</td>
                    <td className="px-4 py-2.5 text-indigo-400">
                      {formatPracticeTime(q.avgActiveSeconds || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {formatPracticeTime(q.medianActiveSeconds || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-amber-400 font-semibold">{q.avgAttempts || 0}</td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {q.solvesCount > 0 ? `${Math.round(((q.firstAttemptPassCount || 0) / q.solvesCount) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audited Student Practice Correction Modal */}
      {isCorrectionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/[0.1] bg-dark-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Audited Practice Progress Correction</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!correctionForm.reason.trim()) {
                  toast.error('Audit reason is required for any administrative correction');
                  return;
                }
                correctMutation.mutate(correctionForm);
              }}
              className="space-y-3 font-mono text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Student User ID / PRN:</label>
                <input
                  type="text"
                  required
                  value={correctionForm.studentId}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, studentId: e.target.value })}
                  placeholder="Student UUID or exact PRN"
                  className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Problem ID or Slug:</label>
                <input
                  type="text"
                  required
                  value={correctionForm.problemId}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, problemId: e.target.value })}
                  placeholder="e.g. check-even-odd"
                  className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Active Seconds:</label>
                  <input
                    type="number"
                    min="0"
                    value={correctionForm.activeSeconds}
                    onChange={(e) =>
                      setCorrectionForm({ ...correctionForm, activeSeconds: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Attempts Count:</label>
                  <input
                    type="number"
                    min="0"
                    value={correctionForm.attemptsCount}
                    onChange={(e) =>
                      setCorrectionForm({ ...correctionForm, attemptsCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={correctionForm.isSolved}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, isSolved: e.target.checked })}
                    className="rounded text-indigo-500"
                  />
                  <span>Mark as Solved</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Admin Confirmation Password:
                </label>
                <input
                  type="password"
                  required
                  value={correctionForm.adminPassword}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, adminPassword: e.target.value })}
                  placeholder="Enter your administrator password"
                  className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  Mandatory Audit Log Reason:
                </label>
                <textarea
                  required
                  rows={2}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Provide specific reason for manual intervention (logged permanently)..."
                  className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-white/[0.1] text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctMutation.isPending}
                  className="px-4 py-1.5 rounded-lg font-bold bg-amber-500 text-dark-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {correctMutation.isPending ? 'Logging...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
