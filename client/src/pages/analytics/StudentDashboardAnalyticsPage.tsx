import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
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
  Lock,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react';

export const StudentDashboardAnalyticsPage: React.FC = () => {
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-dashboard-analytics'],
    queryFn: () => api.get('/analytics/student/dashboard'),
    refetchOnWindowFocus: false,
  });

  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['student-report-data', selectedReportTestId],
    queryFn: () => api.get(`/analytics/student/report/${selectedReportTestId}`),
    enabled: Boolean(selectedReportTestId),
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center font-mono space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
        <span className="text-xs text-gray-400">Loading Dual-Score Learning Analytics...</span>
      </div>
    );
  }

  const anl = data?.data;
  if (!anl) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center font-mono text-gray-400">
        No assessment analytics available yet. Complete an assigned test to view your performance.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn font-mono text-xs">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs">
          <Brain className="w-3.5 h-3.5" />
          <span>Student Learning Analytics & Dual-Score Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
          Performance & Integrity Analytics
        </h1>
        <p className="text-gray-400 max-w-2xl font-sans text-sm">
          Institutional continuous assessment framework. Academic performance (did you solve the problem?) and Assessment Integrity (did the session adhere to proctoring bounds?) are evaluated independently per Section 59.
        </p>
      </div>

      {/* Dual-Score Hero Cards (Section 59: Never Combined by Default) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score 1: Academic Score (X / 100) */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              LAYER A: ACADEMIC PERFORMANCE
            </span>
            <Award className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-white">
              {anl.academicScore.toFixed(1)} <span className="text-xl text-gray-500">/ 100</span>
            </div>
            <p className="text-gray-400 text-[11px] font-sans">
              Combines question solving (max 80) and integrated mini-project (max 20).
            </p>
          </div>
          <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Questions Solved: {anl.totalQuestionsSolved}</span>
            <span className="text-emerald-400 font-semibold">Mini-Project: {anl.miniProjectScore} / 20</span>
          </div>
        </div>

        {/* Score 2: Integrity Score (Y / 100) */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-cyan-500/30 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
              LAYER B: ASSESSMENT INTEGRITY
            </span>
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-white">
              {anl.integrityScore} <span className="text-xl text-gray-500">/ 100</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-gray-400 text-[11px]">Risk Classification:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                anl.integrityRisk === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' :
                anl.integrityRisk === 'LOW' ? 'bg-blue-500/20 text-blue-400' :
                anl.integrityRisk === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {anl.integrityRisk}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Clipboard Events: {anl.telemetry.totalClipboardAttempts}</span>
            <span className="text-gray-400">Tab Switches: {anl.telemetry.totalTabSwitches}</span>
          </div>
        </div>
      </div>

      {/* Section 59 Invariant Callout */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center gap-3 text-gray-400 font-sans text-xs">
        <ShieldAlert className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <span>
          <strong>Section 59 Protocol:</strong> A high Academic Score and a review flag can coexist. Integrity is a behavioral review indicator and is never merged with academic scores.
        </span>
      </div>

      {/* AI Gap Analysis & Learner Alerts (Sections 42, 43, 44) */}
      <div className={`p-6 rounded-2xl border ${
        anl.learnerClassification === 'ADVANCED_LEARNER'
          ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
          : anl.learnerClassification === 'SUPPORT_NEEDING'
          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
          : 'bg-gray-900 border-gray-800 text-gray-300'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm tracking-tight text-white">
            {anl.learnerInsightTitle}
          </h3>
        </div>
        <p className="font-sans text-sm text-gray-300 leading-relaxed mb-4">
          {anl.learnerInsightMessage}
        </p>

        <div className="space-y-1.5 pt-3 border-t border-gray-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Recommended Actionable Interventions:
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 font-sans">
            {anl.recommendations.map((rec: string, idx: number) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Performance Charts & Telemetry Breakdown (Sections 41 & 45) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Difficulty Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Difficulty Mastery
          </h4>
          <div className="space-y-2.5">
            {Object.entries(anl.difficultyStats).map(([diff, stats]: any) => (
              <div key={diff} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">{diff}</span>
                  <span className="text-cyan-400 font-bold">{stats.solved} / {stats.total} Solved</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.solved / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-500 text-right">Avg: {stats.avgTimeSec}s</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Deviation & Hidden Tests */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Timing & Hidden Tests
          </h4>
          <div className="space-y-3">
            <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-[10px]">Net Time Deviation</div>
              <div className={`text-sm font-bold mt-1 ${anl.netTimeDeviationSec <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {anl.netTimeDeviationSec > 0 ? `+${anl.netTimeDeviationSec}s (Overtime)` : `${anl.netTimeDeviationSec}s (Efficient)`}
              </div>
            </div>

            <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-[10px]">Hidden Test 3 Success</div>
              <div className="text-sm font-bold text-white mt-1">
                {anl.hiddenTestPassRatio} Passed
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Audit Log */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Proctoring Telemetry
          </h4>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Total Keystrokes</span>
              <span className="text-white font-bold">{anl.telemetry.totalKeystrokes}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Focus Loss Time</span>
              <span className="text-white font-bold">{anl.telemetry.totalFocusLossDurationSec}s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Fullscreen Exits</span>
              <span className="text-white font-bold">{anl.telemetry.totalFullScreenExits}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">AI Viva Verification</span>
              <span className="text-cyan-400 font-bold">{anl.telemetry.vivaCompletedRatio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official PDF Report Download Section (Section 47) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Official Institutional Assessment Report (PDF / Printable Audit)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Generates the verified two-part report: Part A (Submitted Solutions & Code) and Part B (Integrity Telemetry Trail) per Section 47.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {anl.assignments.map((as: any) => (
            <button
              key={as.assignmentId}
              onClick={() => setSelectedReportTestId(as.testTitle ? as.assignmentId : null)}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-mono text-xs transition-colors flex items-center gap-2 border border-gray-700"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Generate Audit: {as.testTitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Printable Report Modal (Section 47) */}
      {selectedReportTestId && reportData?.report && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 font-sans shadow-2xl">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-cyan-700 uppercase tracking-wider">
                  {reportData.report.institution} • Institutional Examination Council
                </div>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  OFFICIAL PROGRAMMING ASSESSMENT AUDIT REPORT
                </h2>
                <div className="text-xs text-gray-600 font-mono mt-1">
                  Student: {reportData.report.student.fullName} | PRN: {reportData.report.student.prn} | Dept: {reportData.report.student.department}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 text-white font-mono text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReportTestId(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-mono text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Scores Overview */}
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border text-center font-mono">
              <div>
                <div className="text-xs text-gray-500">Academic Score</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {reportData.report.summary.academicScore} Marks
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Integrity Risk Score</div>
                <div className="text-2xl font-bold text-cyan-600 mt-1">
                  {reportData.report.summary.integrityScore} / 100
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Risk Classification</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {reportData.report.summary.integrityRisk}
                </div>
              </div>
            </div>

            {/* Part A: Submitted Solutions */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 text-gray-800">
                Part A: Submitted Solutions & Evaluated Marks
              </h3>
              {reportData.report.partA_Solutions.map((sol: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border space-y-2 font-mono text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Q{idx + 1}: {sol.title} ({sol.difficulty})</span>
                    <span className="text-emerald-700">Verdict: {sol.verdict} ({sol.academicScore} Mark)</span>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-[11px]">
                    {sol.submittedCode}
                  </pre>
                </div>
              ))}
            </div>

            {/* Part B: Behavioral & Integrity Audit Trail */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider border-b pb-1 text-gray-800">
                Part B: Behavioral & Proctoring Audit Trail
              </h3>
              <table className="w-full text-left text-xs font-mono border">
                <thead className="bg-gray-100 border-b text-[11px]">
                  <tr>
                    <th className="p-2">Variant ID</th>
                    <th className="p-2">Time Taken</th>
                    <th className="p-2">Keystrokes</th>
                    <th className="p-2">Clipboard</th>
                    <th className="p-2">Tab Switches</th>
                    <th className="p-2">Integrity Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.report.partB_IntegrityAudit.map((b: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-bold">{b.variantId}</td>
                      <td className="p-2">{b.actualTimeTakenSec}s</td>
                      <td className="p-2">{b.totalKeystrokes}</td>
                      <td className="p-2">{b.copyPasteAttempts}</td>
                      <td className="p-2">{b.tabSwitchCount}</td>
                      <td className="p-2 font-bold">{b.integrityRisk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentDashboardAnalyticsPage;
