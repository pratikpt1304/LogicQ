import React from 'react';
import {
  Users,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  Sparkles,
  Download,
  Layers,
  FileSpreadsheet,
  Activity,
  Eye,
  CheckCircle2,
  Sliders,
  Award,
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
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. APPLE EXECUTIVE HERO (Unified, Clean, Zero Noise) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Platform Active • Autonomous Examination System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Admin &amp; Faculty Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select an action below to manage sections, schedule assessments, or review proctored telemetry in 1 click.
            </p>
          </div>

          {/* Quick Stats Pill Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono shrink-0">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sections</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalSections}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Students</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalStudents}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Tests</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.activeTests}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Integrity</span>
              <span className="text-lg font-black text-emerald-500">{stats.overallIntegrityScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 3 CORE HUBS (Apple Bento Style: Direct, Simple, 1-Click Operations) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Hub 1: Classrooms & Students */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-6 hover:border-blue-500/40 transition">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Class Sections &amp; Students
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Manage divisions, generate join links, or import student rosters with verified email OTPs.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 pt-1">
              {stats.totalSections} Active Sections • {stats.totalStudents} Enrolled
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => onSelectTab('sections')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Section</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('students')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View Roster</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Hub 2: Assessments & Examinations */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-6 hover:border-indigo-500/40 transition">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Assessments &amp; Tests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                40/40/20 difficulty ratio practical tests with locked reattempts and continuous grading.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 pt-1">
              {stats.activeTests} Live Now • {stats.upcomingTests} Scheduled Queue
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => onSelectTab('test-orchestrator')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Test</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('question-bank')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span>AI Questions</span>
            </button>
          </div>
        </div>

        {/* Hub 3: Integrity & Verification */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-6 hover:border-emerald-500/40 transition">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Integrity &amp; AI Viva
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Rule 29 automatic AI viva defenses on consecutive solutions with cadence anomaly detection.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
              {stats.flaggedSessions === 0 ? 'Pristine Security (0 Flags)' : `${stats.flaggedSessions} Flags In Review`}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => onSelectTab('integrity')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Integrity Radar</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. QUICK 1-CLICK LAUNCHPAD TILES (Apple Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onSelectTab('sections')}
          className="p-4 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-500/50 hover:shadow-xs transition text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <Layers className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">Class Sections</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Manage codes &amp; QR links</div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('students')}
          className="p-4 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/50 hover:shadow-xs transition text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <Users className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">Student Roster</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Verified email OTP status</div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('question-bank')}
          className="p-4 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-purple-500/50 hover:shadow-xs transition text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <Sparkles className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">AI Question Studio</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Generate C problem bank</div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('reports')}
          className="p-4 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/50 hover:shadow-xs transition text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <Download className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">NAAC &amp; NBA Reports</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Export verified audit grades</div>
        </button>
      </div>

      {/* 4. REAL-TIME ACTIVITY MONITOR (Clean, Minimal, Tranquil Empty State) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Assessment Stream &amp; Telemetry
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('integrity')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Open Integrity Radar →
          </button>
        </div>

        {liveEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80" />
            <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
              System Ready &amp; Synchronized
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Real-time submission telemetry, test attempts, and AI viva defenses will appear here when students take tests.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {liveEvents.map((ev, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.05] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    {ev.studentName?.charAt(0) || 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                      <span>{ev.studentName}</span>
                      <span className="text-[11px] font-mono text-slate-400">({ev.prn})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {ev.problemTitle || 'C Programming'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.type === 'SUBMISSION_ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {ev.type === 'SUBMISSION_ACCEPTED' ? 'PASS' : 'VIVA PASS'}
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
                          email: `${ev.prn.toLowerCase()}@college.edu`,
                          academicScore: 92,
                          integrityScore: 8,
                          miniProjectUnlocked: true,
                        });
                      }
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-500 transition cursor-pointer"
                    title="Inspect Telemetry"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
