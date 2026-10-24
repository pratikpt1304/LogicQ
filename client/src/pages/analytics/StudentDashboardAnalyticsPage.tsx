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
  Printer,
  Sparkles,
  Code2,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  Check,
  X,
} from 'lucide-react';

export const StudentDashboardAnalyticsPage: React.FC = () => {
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
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
      <div className="max-w-6xl mx-auto px-4 py-16 text-center font-mono space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B9BFF] border-t-transparent animate-spin mx-auto" />
        <span className="text-xs text-slate-400">Loading learning analytics...</span>
      </div>
    );
  }

  const anl = data?.data;
  if (!anl) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono text-slate-400 space-y-4">
        <Brain className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
        <p className="text-sm text-slate-300">No test analytics recorded yet.</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Complete an assigned test or daily challenge to unlock your verified performance analytics.
        </p>
        <Link
          to="/tests"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] transition-colors"
        >
          <span>View Assigned Tests</span>
        </Link>
      </div>
    );
  }

  const isCleanSession = anl.integrityRisk === 'NORMAL' || anl.integrityRisk === 'LOW';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-mono text-xs">
      {/* Header */}
      <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 sm:p-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B9BFF]/10 border border-[#8B9BFF]/20 text-[#8B9BFF] text-xs font-mono font-bold">
              <Brain className="w-3.5 h-3.5" />
              <span>Learning Insights &amp; Performance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans mt-2">
              Performance Dashboard
            </h1>
            <p className="text-slate-300 max-w-2xl font-sans text-sm mt-1 leading-relaxed">
              Review your overall programming marks, question completion progress, and printable assessment reports.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/tests"
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-bold text-[#8B9BFF] bg-[#8B9BFF]/10 border border-[#8B9BFF]/20 hover:bg-[#8B9BFF]/20 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Assigned Tests</span>
            </Link>
            <Link
              to="/practice"
              className="px-3.5 py-2 rounded-xl font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Practice Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 2 Score & Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score 1: Academic Performance */}
        <div className="bg-[#141932] border border-emerald-500/30 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
              OVERALL ACADEMIC SCORE
            </span>
            <Award className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-white font-mono">
              {anl.academicScore.toFixed(1)} <span className="text-xl text-slate-400 font-normal">/ 100</span>
            </div>
            <p className="text-slate-300 text-xs font-sans">
              Cumulative score across all evaluated section questions and test submissions.
            </p>
          </div>

          <div className="pt-3 border-t border-[#252C4F] flex items-center justify-between text-[11px] text-slate-300">
            <span>Questions Solved: <strong className="text-white">{anl.totalQuestionsSolved}</strong> / {anl.totalQuestionsAttempted}</span>
            <span className="text-emerald-400 font-bold">
              {anl.academicScore >= 40 ? 'Passing Range ✅' : 'Attempt Tests to Boost'}
            </span>
          </div>
        </div>

        {/* Score 2: Session Integrity & Proctored Health */}
        <div className="bg-[#141932] border border-[#8B9BFF]/30 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] font-bold border border-[#8B9BFF]/20 text-[11px]">
              ASSESSMENT INTEGRITY HEALTH
            </span>
            {isCleanSession ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            )}
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 font-mono">
              {isCleanSession ? (
                <span className="text-emerald-400">Clean &amp; Verified</span>
              ) : (
                <span className="text-amber-400">Review Flags Noted</span>
              )}
            </div>
            <p className="text-slate-300 text-xs font-sans">
              {isCleanSession
                ? 'Your proctored test sessions adhered cleanly to examination guidelines.'
                : 'Focus loss or tab switches were logged during test evaluation windows.'}
            </p>
          </div>

          <div className="pt-3 border-t border-[#252C4F] flex items-center justify-between text-[11px] text-slate-300">
            <span>Tab Switches: <strong className={anl.telemetry.totalTabSwitches > 0 ? "text-amber-400" : "text-white"}>{anl.telemetry.totalTabSwitches}</strong></span>
            <span>Clipboard Events: <strong className="text-white">{anl.telemetry.totalClipboardAttempts}</strong></span>
            <span>Focus Loss: <strong className="text-white">{anl.telemetry.totalFocusLossDurationSec}s</strong></span>
          </div>
        </div>
      </div>

      {/* Learning Insights & Next Steps */}
      <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B9BFF]" />
          <h3 className="font-bold text-sm text-white font-sans">
            Personalized Learning Insights
          </h3>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          {anl.totalQuestionsAttempted === 0
            ? 'Complete your first assigned test to unlock personalized learning tips and skill insights.'
            : anl.learnerInsightMessage}
        </p>

        {anl.recommendations && anl.recommendations.length > 0 && (
          <div className="pt-2 border-t border-[#252C4F] space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Recommended Next Steps:
            </div>
            <ul className="space-y-1 text-xs text-slate-300 font-sans list-disc list-inside">
              {anl.recommendations.map((rec: string, idx: number) => {
                // Filter out any intimidating typing rhythm comments
                if (rec.toLowerCase().includes('typing rhythm') || rec.toLowerCase().includes('integrity variance')) {
                  return (
                    <li key={idx}>Focus on solving algorithmic problems with optimal time &amp; memory complexity.</li>
                  );
                }
                return <li key={idx}>{rec}</li>;
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Difficulty Mastery & Speed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty Mastery Progress */}
        <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8B9BFF]" />
              <span>Difficulty Mastery</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Test &amp; Practice Questions</span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(anl.difficultyStats).map(([diff, stats]: any) => {
              const pct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
              const color =
                diff === 'EASY'
                  ? 'bg-emerald-400 text-emerald-400'
                  : diff === 'MEDIUM'
                  ? 'bg-amber-400 text-amber-400'
                  : 'bg-rose-400 text-rose-400';

              return (
                <div key={diff} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{diff}</span>
                    <span className="font-mono text-slate-300">
                      {stats.solved} / {stats.total} Solved ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[#0C0F1F] rounded-full overflow-hidden border border-[#252C4F]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        diff === 'EASY'
                          ? 'bg-emerald-400'
                          : diff === 'MEDIUM'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Avg solve time: {stats.avgTimeSec}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed & Test Efficiency */}
        <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8B9BFF]" />
              <span>Speed &amp; Accuracy Breakdown</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Telemetry</span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Time Efficiency</span>
                <span className="text-white text-xs font-bold block mt-0.5">
                  {anl.netTimeDeviationSec <= 0 ? 'Optimal & Fast Paced' : 'Slightly Extended'}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                anl.netTimeDeviationSec <= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {anl.netTimeDeviationSec <= 0 ? 'Ahead of Benchmark' : `+${anl.netTimeDeviationSec}s`}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Hidden Test Case Pass Rate</span>
                <span className="text-white text-xs font-bold block mt-0.5">
                  Edge Case Verification
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/20 font-mono">
                {anl.hiddenTestPassRatio || '0/0 Passed'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Keyboard Activity</span>
                <span className="text-white text-xs font-bold block mt-0.5">
                  Active keystrokes logged
                </span>
              </div>
              <span className="text-slate-200 text-xs font-bold font-mono">
                {anl.telemetry.totalKeystrokes.toLocaleString()} keys
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Assessment Reports (PDF / Printable) */}
      <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8B9BFF]" />
            <span>Official Assessment Reports (Printable PDF)</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1 font-sans">
            Download or view verified reports of your submitted tests with code solutions, evaluated marks, and timestamps.
          </p>
        </div>

        {anl.assignments && anl.assignments.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {anl.assignments.map((as: any) => (
              <button
                key={as.assignmentId}
                onClick={() => setSelectedReportTestId(as.testTitle ? as.assignmentId : null)}
                className="px-4 py-2 rounded-xl bg-[#0C0F1F] hover:bg-[#8B9BFF]/10 text-slate-200 hover:text-white font-mono text-xs transition-colors flex items-center gap-2 border border-[#252C4F] hover:border-[#8B9BFF]/40"
              >
                <Download className="w-3.5 h-3.5 text-[#8B9BFF]" />
                <span>View Report: {as.testTitle}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F] text-slate-400 text-xs text-center font-sans">
            No completed tests available for report export yet. Complete an assigned test to generate printable verification reports.
          </div>
        )}
      </div>

      {/* Printable Report Modal */}
      {selectedReportTestId && reportData?.report && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#141932] text-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 font-sans border border-[#252C4F] shadow-2xl">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-[#252C4F] pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-[#8B9BFF] uppercase tracking-wider">
                  {reportData.report.institution || 'Sanjivani University'} • Examination Verification
                </div>
                <h2 className="text-xl font-black text-white mt-1">
                  OFFICIAL PROGRAMMING ASSESSMENT REPORT
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Student: {reportData.report.student.fullName} | PRN: {reportData.report.student.prn} | Dept: {reportData.report.student.department}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-[#8B9BFF] text-[#0C0F1F] font-mono font-bold text-xs flex items-center gap-1.5 hover:bg-[#9FAOFF] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReportTestId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#252C4F]/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scores Overview */}
            <div className="grid grid-cols-3 gap-3 bg-[#0C0F1F] p-4 rounded-xl border border-[#252C4F] text-center font-mono">
              <div>
                <div className="text-xs text-slate-400">Academic Score</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {reportData.report.summary.academicScore} Marks
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Integrity Health</div>
                <div className="text-2xl font-bold text-[#8B9BFF] mt-1">
                  {reportData.report.summary.integrityScore} / 100
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {reportData.report.summary.integrityRisk || 'NORMAL'}
                </div>
              </div>
            </div>

            {/* Submitted Solutions */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider border-b border-[#252C4F] pb-1 text-slate-200">
                Submitted Solutions &amp; Verified Marks
              </h3>
              {reportData.report.partA_Solutions.map((sol: any, idx: number) => (
                <div key={idx} className="bg-[#0C0F1F] p-4 rounded-xl border border-[#252C4F] space-y-2 font-mono text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Q{idx + 1}: {sol.title} ({sol.difficulty})</span>
                    <span className="text-emerald-400">Verdict: {sol.verdict} ({sol.academicScore} Mark)</span>
                  </div>
                  <pre className="bg-[#050814] text-cyan-200 p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed border border-[#252C4F]/50 select-text">
                    {sol.submittedCode}
                  </pre>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReportTestId(null)}
                className="px-5 py-2 rounded-xl bg-[#252C4F] text-white text-xs font-mono font-bold hover:bg-[#252C4F]/80 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboardAnalyticsPage;
