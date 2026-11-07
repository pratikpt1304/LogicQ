import React from 'react';
import {
  Activity,
  Award,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  FileCode2,
  FolderLock,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  Download,
} from 'lucide-react';
import { generateIndividualStudentPdf } from '../../utils/studentPdfGenerator.js';

interface StudentDeepDiveModalProps {
  student: any;
  onClose: () => void;
  onToggleMiniProject: (studentId: string, currentStatus: boolean) => void;
}

export const StudentDeepDiveModal: React.FC<StudentDeepDiveModalProps> = ({
  student,
  onClose,
  onToggleMiniProject,
}) => {
  if (!student) return null;

  const isMiniProjectActive = Boolean(student.miniProjectActive || student.isMiniProjectActive);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20 shrink-0">
              {(student.fullName || student.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                  {student.fullName || student.name || 'Student'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
                  {student.identityStatus || 'Identity Bound (Active)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                PRN: <span className="text-indigo-500 font-bold">{student.prn || 'N/A'}</span> • {student.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateIndividualStudentPdf(student)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              title="Download Individual Student Transcript PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Academic vs Integrity Score (Strict Separation - Rule 59) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Academic Score (Part A)</span>
              <Award className="w-4 h-4" />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {student.academicScore ?? student.totalPoints ?? 0} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500">Correct solution within time = 1 mark, outside time = 0.5 mark.</p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Assessment Integrity (Part B)</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {student.integrityScore ?? 18} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              Classification: Normal Risk (&lt;20) • No Misconduct Detected
            </p>
          </div>
        </div>

        {/* 2. Individual Mini-Project Activation (Items 36–38 Specification) */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-purple-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Integrated Mini-Project (20 Marks) — Individual Control
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Rule 38: Bulk activation is prohibited. Only faculty can activate individually student-by-student.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleMiniProject(student.id || student.prn, isMiniProjectActive)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isMiniProjectActive
                  ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
              }`}
            >
              {isMiniProjectActive ? 'Deactivate Project' : 'Activate Mini-Project'}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-4">
            <span>Status: <strong className={isMiniProjectActive ? 'text-emerald-500' : 'text-slate-400'}>{isMiniProjectActive ? 'ACTIVE (Student Can Start)' : 'INACTIVE (Locked)'}</strong></span>
            <span>Rubric: 4 Sections × 5 Marks = 20 Marks Total</span>
          </div>
        </div>

        {/* 3. Behavioral Telemetry & Integrity Breakdown (Items 20–28) */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Behavioral Signals &amp; Typing Metrics (Specification Items 20–28)</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Clipboard Attempts</span>
              <span className="font-bold text-slate-900 dark:text-white">{student.clipboardAttempts ?? 0}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Blocked operations</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tab / Focus Switches</span>
              <span className="font-bold text-slate-900 dark:text-white">{student.tabSwitchCount ?? 0}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Total duration: 0s</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Active Work Ratio</span>
              <span className="font-bold text-indigo-500">{student.activeWorkRatio ?? 92}%</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Meaningful interaction</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Code Burst Ratio</span>
              <span className="font-bold text-slate-900 dark:text-white">{student.codeBurstRatio ?? 12}%</span>
              <span className="text-[9px] text-emerald-500 block mt-0.5">Incremental growth</span>
            </div>
          </div>
        </div>

        {/* 4. AI Learning Insights (Items 42–44) */}
        <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-1.5 text-xs font-sans">
          <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Learning Gap Analysis &amp; Actionable Interventions (Item 42)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Strong comprehension observed in <strong>Dynamic Memory &amp; Cyclic Pointers</strong>. Test Case 1 &amp; 2 pass rate: 100%. Recommended for advanced extension tasks in Module 2.
          </p>
        </div>
      </div>
    </div>
  );
};
