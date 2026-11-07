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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP 10 APPLE BENTO METRIC CARDS (Specification Item 49) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Master Assessment Metrics (Items 48–49)</span>
          </h3>
          <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Telemetry Sync Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Active Tests */}
          <div
            onClick={() => onSelectTab('tests')}
            className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Active Tests</span>
              <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.activeTests}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                {stats.activeTests > 0 ? 'Live in progress' : 'No active test now'}
              </div>
            </div>
            <div className="text-[10px] font-mono text-indigo-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>View live monitor →</span>
            </div>
          </div>

          {/* 2. Upcoming Tests */}
          <div
            onClick={() => onSelectTab('tests')}
            className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Upcoming Tests</span>
              <Clock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.upcomingTests}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Scheduled in queue
              </div>
            </div>
            <div className="text-[10px] font-mono text-cyan-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Configure schedule →</span>
            </div>
          </div>

          {/* 3. Completed Tests */}
          <div
            onClick={() => onSelectTab('reports')}
            className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Completed Tests</span>
              <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.completedTests}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Locked & evaluated
              </div>
            </div>
            <div className="text-[10px] font-mono text-emerald-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Export audit reports →</span>
            </div>
          </div>

          {/* 4. Total Sections */}
          <div
            onClick={() => onSelectTab('sections')}
            className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Sections</span>
              <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.totalSections}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Active classrooms
              </div>
            </div>
            <div className="text-[10px] font-mono text-purple-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Manage join codes →</span>
            </div>
          </div>

          {/* 5. Total Students */}
          <div
            onClick={() => onSelectTab('students')}
            className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Students</span>
              <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.totalStudents}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Enrolled in directory
              </div>
            </div>
            <div className="text-[10px] font-mono text-blue-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Inspect roster →</span>
            </div>
          </div>

          {/* 6. Class Average Academic Score */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Academic Score</span>
              <Award className="w-4 h-4" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                <span>{stats.avgAcademicScore}</span>
                <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.avgAcademicScore)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Rule 59: Strictly separate layer</span>
          </div>

          {/* 7. Overall Integrity Score */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Integrity Score</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                <span>{stats.overallIntegrityScore}</span>
                <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.overallIntegrityScore)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">Tier: Normal Risk (&lt;20)</span>
          </div>

          {/* 8. Students Needing Support (AI Alert) */}
          <div
            onClick={() => onSelectTab('students')}
            className="p-4 sm:p-5 rounded-3xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl hover:border-rose-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Need Support</span>
              <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                {stats.studentsNeedingSupport}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                AI Learning Gap Alert
              </div>
            </div>
            <div className="text-[10px] font-mono text-rose-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>View interventions →</span>
            </div>
          </div>

          {/* 9. Advanced Students (AI Alert) */}
          <div
            onClick={() => onSelectTab('students')}
            className="p-4 sm:p-5 rounded-3xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl hover:border-indigo-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Advanced</span>
              <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {stats.advancedLearners}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                High Speed / Accuracy
              </div>
            </div>
            <div className="text-[10px] font-mono text-indigo-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Assign extension →</span>
            </div>
          </div>

          {/* 10. Flagged Sessions Requiring Review */}
          <div
            onClick={() => onSelectTab('integrity')}
            className="p-4 sm:p-5 rounded-3xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl hover:border-amber-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Review Queue</span>
              <ShieldAlert className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                {stats.flaggedSessions}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Viva / Burst flags
              </div>
            </div>
            <div className="text-[10px] font-mono text-amber-500 font-semibold group-hover:underline flex items-center gap-1">
              <span>Inspect audit trail →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE ASSESSMENT MODEL CARD (Item 2 & 3 Specification) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>Core Assessment Model Specification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              4 Sections × 20 Questions (80 marks) + 1 Mini-Project (20 marks) = 100 Marks
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every question is locked upon submission. Features 2 visible test cases + 1 hidden test case with server-side validation. AI viva triggers automatically on every second successive correct submission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('questions')}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>AI Question Studio</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('tests')}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Create & Assign Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. LIVE MONITORING & TELEMETRY STREAM (Items 54 & 60) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Live Assessment Telemetry Stream (Item 54)</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Auto-refresh: 5000ms</span>
          </div>

          {liveEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
              <p>All active assessment sessions running in healthy state.</p>
              <p className="text-[11px] text-slate-500">Live test attempts and submissions will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {liveEvents.map((ev: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {ev.studentName || ev.prn}
                      </div>
                      <div className="text-[10px] text-slate-400">{ev.activity || 'Question submitted'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                      {ev.verdict || 'PASS'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ev.timeAgo || 'Just now'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Institutional Rules Checklist (Item 65) */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl space-y-3">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Core Non-Negotiables (Item 65)</span>
          </h4>
          <div className="space-y-2 text-xs font-sans text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>100 Marks:</strong> 4 sections × 20 questions (80) + Mini-project (20).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>Time-Based Marks:</strong> Within time = 1 mark, outside time = 0.5, fail = 0.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>Test Cases:</strong> 2 visible + 1 hidden test case (never revealed).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>No Reattempts:</strong> Successful question locked immediately.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>AI Viva:</strong> Every 2nd successive correct submission triggers viva.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <span><strong>Mini-Project:</strong> Individual faculty activation only (no bulk).</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
