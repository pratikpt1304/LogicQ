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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. CLEAN EXECUTIVE HERO BAR (No Mess, Clear Spacing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time proctoring telemetry, continuous assessments, and student performance metrics.
          </p>
        </div>

        {/* 1-Click Action Buttons (Less Clicks) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectTab('sections')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Section</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('test-orchestrator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Schedule Test</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('question-bank')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Question Studio</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* 2. APPLE BENTO CARDS (Clean 4-Card Grid, Balanced Proportions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assessments */}
        <div
          onClick={() => onSelectTab('test-orchestrator')}
          className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-500/40 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Assessments
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              1 LIVE
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {stats.activeTests}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {stats.upcomingTests} scheduled • {stats.completedTests} completed
            </div>
          </div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
            <span>Manage tests</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Student Directory */}
        <div
          onClick={() => onSelectTab('students')}
          className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Student Roster
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {stats.totalSections} SECTIONS
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {stats.totalStudents}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>100% Bound via Email OTP</span>
            </div>
          </div>
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
            <span>Inspect candidates</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Academic Mastery */}
        <div
          onClick={() => onSelectTab('students')}
          className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Academic Average
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
              80M + 20M
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
              <span>{stats.avgAcademicScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.avgAcademicScore)}%` }}
              />
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-1">
            <span>{stats.advancedLearners} advanced learners</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Integrity Health */}
        <div
          onClick={() => onSelectTab('integrity')}
          className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Integrity Index
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Rule 29
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
              <span>{stats.overallIntegrityScore}</span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{stats.flaggedSessions} flagged sessions</span>
            </div>
          </div>
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1">
            <span>Audit integrity radar</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. CORE TWO-COLUMN WORKSPACE: TELEMETRY STREAM & ACTION QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Proctoring Stream */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Live Proctoring Activity Stream
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('integrity')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Telemetry Monitor →
            </button>
          </div>

          <div className="space-y-2.5">
            {liveEvents.map((ev, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    {ev.studentName?.charAt(0) || 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                      <span>{ev.studentName}</span>
                      <span className="text-[11px] font-mono text-slate-400">({ev.prn})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
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
                        ? 'VIVA PASS'
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
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition cursor-pointer"
                    title="1-Click Telemetry Inspection"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 Col): Action Queue & Architecture Summary */}
        <div className="space-y-4">
          {/* Action Queue */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Review Queue
                </h3>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                2 Pending
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Sneha Kulkarni</span>
                  <span className="text-[10px] font-mono text-amber-500">Burst Flag</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Clipboard burst detected (64 chars in 18ms). AI Viva recommended.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectTab('integrity')}
                  className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Trigger AI Viva
                </button>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Rohan Deshmukh</span>
                  <span className="text-[10px] font-mono text-blue-500">Ready</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mini-Project threshold met (Score 88%). Requires faculty unlock.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectTab('students')}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Review & Unlock
                </button>
              </div>
            </div>
          </div>

          {/* Institutional Model Summary */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] space-y-2 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Evaluation Model
            </h4>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
              <div className="flex items-center justify-between">
                <span>Lab Internal (4 Units × 20 Q)</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">80 Marks</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Capstone Mini-Project (Faculty Viva)</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">20 Marks</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Anti-AI Proctoring (Rule 29 Viva)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
