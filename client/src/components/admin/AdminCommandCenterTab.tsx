import React from 'react';
import {
  Activity,
  Award,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileCode2,
  GraduationCap,
  Layers,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  Plus,
  ArrowRight,
  Download,
  Mail,
  Lock,
  Sparkles,
} from 'lucide-react';

interface AdminCommandCenterTabProps {
  stats: {
    activeTests: number;
    upcomingTests: number;
    completedTests: number;
    totalSections: number;
    totalStudents: number;
    avgAcademicScore: number;
    overallIntegrityScore: number;
    studentsNeedingSupport: number;
    advancedLearners: number;
    flaggedSessions: number;
  };
  liveEvents: any[];
  onSelectTab: (tabId: string) => void;
  onInspectStudent?: (student: any) => void;
}

export const AdminCommandCenterTab: React.FC<AdminCommandCenterTabProps> = ({
  stats,
  liveEvents,
  onSelectTab,
  onInspectStudent,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. EXECUTIVE ACTION HERO (Apple Sequoia Style: Clean, Less Clicks, High Utility) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white/90 via-slate-50/80 to-blue-50/40 dark:from-[#0e131d]/90 dark:via-[#0c1017]/80 dark:to-blue-950/20 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                EXECUTIVE DASHBOARD
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className="text-xs text-slate-500 font-medium">Sanjivani College of Engineering (Autonomous)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Assessment Command & Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Real-time multi-signal proctoring, automated AI viva verification, and continuous academic assessment with cryptographically locked submissions.
            </p>
          </div>

          {/* Quick 1-Click Operations (Less Clicks) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('sections')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Section</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('test-orchestrator')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Schedule Test</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('question-bank')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>AI Question Studio</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>NAAC Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. APPLE BENTO METRIC CARDS (High-Density, Zero Clutter) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Live Assessment Status */}
        <div
          onClick={() => onSelectTab('test-orchestrator')}
          className="p-5 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Assessment
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {stats.activeTests}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-mono">
              <span>{stats.upcomingTests} in queue</span>
              <span>•</span>
              <span>{stats.completedTests} evaluated</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
            <span>Open live monitor</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Candidate Enrollment & Identity Bound */}
        <div
          onClick={() => onSelectTab('students')}
          className="p-5 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Candidate Roster
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              100% Bound
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {stats.totalStudents}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
              <Mail className="w-3 h-3 text-emerald-500" />
              <span>Strict PRN + 6-Digit Email OTP Bound</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
            <span>Inspect student roster</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 3: Academic Mastery Index */}
        <div
          onClick={() => onSelectTab('students')}
          className="p-5 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Academic Mastery
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              80M + 20M
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
              <span>{stats.avgAcademicScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.avgAcademicScore)}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-1">
            <span>{stats.advancedLearners} advanced learners</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Institutional Integrity Index */}
        <div
          onClick={() => onSelectTab('integrity')}
          className="p-5 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Integrity Index
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Rule 29 Active
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
              <span>{stats.overallIntegrityScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>{stats.flaggedSessions} sessions in review queue</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1">
            <span>Inspect audit trail</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. CORE ASSESSMENT ARCHITECTURE & LIVE TELEMETRY (Split Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LIVE TELEMETRY RADAR (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Live Proctoring Telemetry Feed
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Stream latency: ~14ms</span>
              <button
                type="button"
                onClick={() => onSelectTab('integrity')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Expand Monitor →
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {liveEvents.map((ev, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    {ev.studentName?.charAt(0) || 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                      <span>{ev.studentName}</span>
                      <span className="text-[10px] font-mono text-slate-400">({ev.prn})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {ev.problemTitle || 'C Programming Assessment'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.type === 'SUBMISSION_ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : ev.type === 'VIVA_VERIFIED'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {ev.type === 'SUBMISSION_ACCEPTED'
                        ? 'PASS (LOCKED)'
                        : ev.type === 'VIVA_VERIFIED'
                        ? 'AI VIVA PASS'
                        : 'TELEMETRY FLAG'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ev.time}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onInspectStudent) {
                        onInspectStudent({
                          name: ev.studentName,
                          prn: ev.prn,
                          email: `${ev.prn.toLowerCase()}@sanjivani.edu.in`,
                          section: 'Division A',
                          academicScore: 92,
                          integrityScore: 8,
                          miniProjectUnlocked: true,
                        });
                      } else {
                        onSelectTab('students');
                      }
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition cursor-pointer"
                    title="1-Click Telemetry Inspection"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CURRICULUM ARCHITECTURE COMPLIANCE (1 Column) */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Assessment Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous continuous evaluation schema calibrated to university accreditation standards.
            </p>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Lab Internal Continuous</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">80 Marks</span>
              </div>
              <p className="text-[11px] text-slate-500">
                4 Units × 20 Timed Problems. 2 visible + 1 hidden test case. Immediate lockout on submission.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Capstone Mini-Project</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">20 Marks</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Individual faculty unlock only. Requires 1-on-1 code defense viva and live git repo verification.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Proctoring & Anti-AI Shield</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">Rule 29</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Automated audio AI viva on consecutive solutions. Keystroke interval and clipboard burst suppression.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400">NAAC / NBA Criteria 2.5</span>
            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Audit Proofs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. AUDIT & INTERVENTION STATION (Less Clicks: 1-Click Resolve or Viva) */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1017]/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Supervisor Action Queue ({stats.flaggedSessions} Sessions Requiring Faculty Action)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('integrity')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All Governance Alerts →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <span>Sneha Kulkarni</span>
                <span className="text-[10px] font-mono text-slate-400">(2126CS104)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clipboard burst detected (64 chars in 18ms). AI Viva recommended.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('integrity')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
              >
                Trigger Viva
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <span>Rohan Deshmukh</span>
                <span className="text-[10px] font-mono text-slate-400">(2126CS103)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mini-Project qualification threshold met (Score 88%). Awaiting supervisor unlock.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('students')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
              >
                Review & Unlock
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
