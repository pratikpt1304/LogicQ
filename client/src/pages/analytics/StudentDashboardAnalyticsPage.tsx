import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { auth } from '../../config/firebase.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
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
  const { user } = useAuth();
  const targetUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
  const [selectedReportTestId, setSelectedReportTestId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard-analytics'],
    queryFn: () => api.get('/analytics/student/dashboard'),
    refetchOnWindowFocus: false,
  });

  const { data: fsTelemetry, isLoading: isFsLoading } = useQuery({
    queryKey: ['proctoring-telemetry-student', targetUid],
    queryFn: () => FirestoreDataService.getProctoringTelemetry(targetUid),
    refetchOnWindowFocus: true,
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

  const rawAnl = data?.data;
  const hasBackendData = Boolean(rawAnl && typeof rawAnl === 'object' && Object.keys(rawAnl).length > 0);
  const hasFsData = Boolean(
    fsTelemetry &&
      (fsTelemetry.tabSwitchCount > 0 ||
        fsTelemetry.copyPasteAttempts > 0 ||
        fsTelemetry.fullscreenExits > 0 ||
        fsTelemetry.autoLockCount > 0 ||
        (fsTelemetry.incidents && fsTelemetry.incidents.length > 0))
  );

  if (!hasBackendData && !hasFsData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono text-slate-400 space-y-4">
        <Brain className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
        <p className="text-sm text-slate-300">No test or practice analytics recorded yet.</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Complete questions in the Practice Hub or take an assigned test to unlock your verified performance analytics.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/practice"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <span>Open Practice Hub</span>
          </Link>
          <Link
            to="/tests"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FA0FF] transition-colors"
          >
            <span>View Assigned Tests</span>
          </Link>
        </div>
      </div>
    );
  }

  const anl = hasBackendData
    ? rawAnl
    : {
        academicScore: 0,
        totalQuestionsSolved: 0,
        totalQuestionsAttempted: 0,
        integrityScore: 100,
        integrityRisk: 'NORMAL',
        learnerInsightMessage:
          'Continue solving problems in the Practice Hub to boost your algorithmic problem-solving accuracy.',
        telemetry: {
          totalTabSwitches: 0,
          totalClipboardAttempts: 0,
          totalFocusLossDurationSec: 0,
          totalKeystrokes: 0,
        },
        difficultyStats: {
          EASY: { solved: 0, total: 20, avgTimeSec: 0 },
          MEDIUM: { solved: 0, total: 20, avgTimeSec: 0 },
          HARD: { solved: 0, total: 10, avgTimeSec: 0 },
        },
        netTimeDeviationSec: 0,
        hiddenTestPassRatio: '0/0 Passed',
        assignments: [],
        recommendations: [],
      };

  const academicScore = typeof anl.academicScore === 'number' ? anl.academicScore : 0;
  const totalQuestionsSolved = anl.totalQuestionsSolved || 0;
  const totalQuestionsAttempted = anl.totalQuestionsAttempted || 0;

  const totalTabSwitches = (anl.telemetry?.totalTabSwitches || 0) + (fsTelemetry?.tabSwitchCount || 0);
  const totalClipboardAttempts = (anl.telemetry?.totalClipboardAttempts || 0) + (fsTelemetry?.copyPasteAttempts || 0);
  const totalFullscreenExits = fsTelemetry?.fullscreenExits || 0;
  const autoLockCount = fsTelemetry?.autoLockCount || 0;
  const incidents = fsTelemetry?.incidents || [];

  // Backend integrityScore is RISK POINTS (0 is CLEAN, 100 is MAX CHEAT)
  const backendRiskPoints = typeof anl.integrityScore === 'number' ? anl.integrityScore : 0;
  const backendCleanScore = Math.max(0, 100 - backendRiskPoints);

  const fsIntegrity =
    fsTelemetry?.integrityScore !== undefined
      ? fsTelemetry.integrityScore
      : FirestoreDataService.computeIntegrityScore({
          tabSwitchCount: totalTabSwitches,
          copyPasteAttempts: totalClipboardAttempts,
          fullscreenExits: totalFullscreenExits,
          autoLockCount,
        });

  // Dual-Verified Integrity Score (starts at 100, drops with infractions)
  const finalIntegrityScore = Math.max(0, Math.min(backendCleanScore, fsIntegrity));
  const isCleanSession = finalIntegrityScore >= 80 && autoLockCount === 0;

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
              {academicScore.toFixed(1)} <span className="text-xl text-slate-400 font-normal">/ 100</span>
            </div>
            <p className="text-slate-300 text-xs font-sans">
              Cumulative score across all evaluated section questions and test submissions.
            </p>
          </div>

          <div className="pt-3 border-t border-[#252C4F] flex items-center justify-between text-[11px] text-slate-300">
            <span>Questions Solved: <strong className="text-white">{totalQuestionsSolved}</strong> / {totalQuestionsAttempted}</span>
            <span className="text-emerald-400 font-bold">
              {academicScore >= 40 ? 'Passing Range ✅' : 'Attempt Tests to Boost'}
            </span>
          </div>
        </div>

        {/* Score 2: Session Integrity & Proctored Health */}
        <div className="bg-[#141932] border border-[#8B9BFF]/30 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] font-bold border border-[#8B9BFF]/20 text-[11px]">
              BEHAVIORAL INTEGRITY HEALTH
            </span>
            {isCleanSession ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            )}
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black font-mono flex items-center gap-2">
              <span className={finalIntegrityScore >= 80 ? 'text-emerald-400' : finalIntegrityScore >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                {finalIntegrityScore}
              </span>
              <span className="text-xl text-slate-400 font-normal">/ 100</span>
              {autoLockCount > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold ml-auto">
                  {autoLockCount} AUTO-LOCK PENALTY
                </span>
              )}
            </div>
            <p className="text-slate-300 text-xs font-sans">
              {isCleanSession
                ? 'Your proctored test & practice sessions adhered cleanly to examination guidelines.'
                : autoLockCount > 0
                ? 'Score reduced due to cheating infractions (exceeded tab switches or copy-paste attempts).'
                : 'Focus loss, tab switches, or paste events were logged during test evaluation windows.'}
            </p>
          </div>

          <div className="pt-3 border-t border-[#252C4F] flex items-center justify-between text-[11px] text-slate-300">
            <span>Tab Switches: <strong className={totalTabSwitches > 0 ? (totalTabSwitches >= 3 ? "text-rose-400 font-bold" : "text-amber-400") : "text-white"}>{totalTabSwitches}</strong></span>
            <span>Clipboard Guard: <strong className={totalClipboardAttempts > 0 ? (totalClipboardAttempts >= 5 ? "text-rose-400 font-bold" : "text-amber-400") : "text-white"}>{totalClipboardAttempts} blocked</strong></span>
            <span>Fullscreen Exits: <strong className={totalFullscreenExits > 0 ? "text-amber-400" : "text-white"}>{totalFullscreenExits}</strong></span>
          </div>
        </div>
      </div>

      {/* Anti-Cheat & Proctoring Audit Record */}
      <div className="bg-[#141932] border border-[#252C4F] rounded-2xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252C4F] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${isCleanSession ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <h3 className="font-bold text-sm text-white font-sans">
                Anti-Cheat Audit &amp; Proctoring Violations Log
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Review your monitored tab events, blocked clipboard attempts, and questions auto-locked for cheating.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
              finalIntegrityScore >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : finalIntegrityScore >= 50
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              Integrity: {finalIntegrityScore}/100 {finalIntegrityScore >= 80 ? '✅ Clean' : '⚠️ Flagged'}
            </span>
          </div>
        </div>

        {/* Institutional Rule Explainer Banner */}
        <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] text-xs text-slate-300 font-sans flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white block">Institutional Anti-Cheat Thresholds:</span>
            <p className="text-slate-400 leading-relaxed">
              • Switching tabs <strong>3 times</strong> on a question triggers an automatic submission with a cheat penalty and advances to the next question.<br/>
              • Attempting copy-paste <strong>5 times</strong> on a question auto-locks and submits with a cheat penalty.<br/>
              • Every infraction reduces your Behavioral Integrity Score (Starts at 100), monitored by faculty and admin.
            </p>
          </div>
        </div>

        {/* Log of Recorded Incidents */}
        {incidents.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Recorded Infractions Log ({incidents.length})
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {incidents.map((inc: any) => (
                <div
                  key={inc.id}
                  className="p-3.5 rounded-xl bg-[#0C0F1F] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                        {inc.type === 'EXCEEDED_TAB_SWITCHES' ? '3+ Tab Switches' : inc.type === 'EXCEEDED_COPY_PASTE' ? '5+ Paste Attempts' : inc.type}
                      </span>
                      <span className="font-bold text-white font-mono truncate">
                        {inc.problemTitle || inc.problemSlug || 'Question Problem'}
                      </span>
                    </div>
                    <p className="text-rose-300 text-[11px] font-mono">
                      {inc.reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono block">
                      Auto-Submitted &amp; Penalized
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#0C0F1F] border border-emerald-500/20 text-center text-xs text-emerald-400 font-mono flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Clean Record: No cheating infractions or auto-lock penalties recorded. Excellent academic conduct!</span>
          </div>
        )}
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
