import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  ShieldCheck,
  CheckCircle2,
  Award,
  Terminal,
  Lock,
  Bookmark,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  User,
} from 'lucide-react';

interface JeeInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleTitle: string;
  moduleOrder: number;
  totalQuestions?: number;
  user?: any;
  isDeclarationMode?: boolean;
  onAgreeAndStart?: () => void;
  onBackToModules?: () => void;
}

export const JeeInstructionsModal: React.FC<JeeInstructionsModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  moduleOrder,
  totalQuestions = 20,
  user,
  isDeclarationMode = false,
  onAgreeAndStart,
  onBackToModules,
}) => {
  const [isAgreed, setIsAgreed] = useState(false);

  if (!isOpen) return null;

  const candidateName = user?.displayName || user?.fullName || 'Candidate';
  const candidatePrn = user?.prn || user?.maskedPrn || 'PRN-STUDENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-3xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-5 sm:p-7 space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  JEE CBT Assessment Portal
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-bold">
                  MOD {moduleOrder}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] font-mono">
                {isDeclarationMode ? 'Pre-Exam Instructions & Candidate Declaration' : 'CBT Test Instructions & Rules'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Module {moduleOrder}: {moduleTitle} • {totalQuestions} Questions • 200 Points
              </p>
            </div>
          </div>
          {!isDeclarationMode && (
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Candidate & Test Metadata Banner */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Candidate Name</span>
            <span className="font-bold text-[var(--text-main)] truncate block">{candidateName}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">PRN / Roll No</span>
            <span className="font-bold text-cyan-400 truncate block">{candidatePrn}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Questions</span>
            <span className="font-bold text-emerald-400 block">{totalQuestions} Problems</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Runtime Limit</span>
            <span className="font-bold text-amber-400 block">1000 ms / Test</span>
          </div>
        </div>

        {/* Scrollable Detailed Instructions Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-mono text-[var(--text-main)]">
          {/* Rule 1: Progressive Locking (User's main rule) */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400 text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>1. Strict Sequential Question Locking</span>
            </div>
            <p className="leading-relaxed text-[11px] text-indigo-200/90">
              Questions in this module must be solved in strict sequential order:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-indigo-100">
              <li><strong>Question 1</strong> is unlocked initially for everyone.</li>
              <li><strong>Question 2 unlocks ONLY when Question 1 is solved</strong> (All test cases passed ✅).</li>
              <li>Similarly, Question 3 unlocks when Question 2 is solved, continuing up to Question 20.</li>
              <li>You can navigate back to any previously solved question at any time to review your code.</li>
            </ul>
          </div>

          {/* Rule 2: Question Palette Color Scheme */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3">
            <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              2. Official Question Palette Symbols &amp; Colors
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  ✓
                </span>
                <span>
                  <strong className="text-emerald-400">Green: Answered &amp; Solved</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Code compiled and passed all test cases.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  ✕
                </span>
                <span>
                  <strong className="text-rose-400">Red: Visited / Not Answered</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Question opened but not yet passed.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  🔖
                </span>
                <span>
                  <strong className="text-purple-400">Purple: Marked for Review</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Flagged for re-checking before submit.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-600">
                  ○
                </span>
                <span>
                  <strong className="text-[var(--text-muted)]">Gray: Not Visited</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Question not opened yet.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-slate-500 font-bold flex items-center justify-center text-xs border border-slate-800">
                  <Lock className="w-3 h-3 text-slate-500" />
                </span>
                <span>
                  <strong className="text-slate-400">Locked: Sequential Prerequisite Required</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Solve the preceding question to unlock this box.</span>
                </span>
              </div>
            </div>
          </div>

          {/* Rule 3: Answering & Navigation Controls */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              3. Answering &amp; Navigation Controls
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-[var(--text-muted)] text-[11px]">
              <li>
                <strong className="text-[var(--text-main)]">Save &amp; Next:</strong> Evaluates your C code against standard test cases. If accepted, marks question Green and unlocks the next question!
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Clear Response:</strong> Reverts the editor back to the starter boilerplate template.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Mark for Review &amp; Next:</strong> Flags the question with a purple bookmark so you can easily locate it later.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Auto-Save:</strong> Any code written is automatically saved locally and synchronized with the cloud.
              </li>
            </ul>
          </div>

          {/* Rule 4: Proctored Anti-Cheat Regulations */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Anti-Cheat &amp; Proctored Integrity Regulations</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-200/90 text-[11px]">
              <li><strong>Fullscreen Mode Enforced:</strong> The test must be taken in fullscreen mode. Exits are recorded.</li>
              <li><strong>Clipboard Blocked:</strong> Copying, cutting, and pasting are strictly disabled. Code must be typed manually.</li>
              <li><strong>Tab Switch Audit:</strong> Leaving the test tab or minimizing the window increments an audit counter visible to instructors.</li>
              <li><strong>GCC 14 (C17):</strong> Submissions run in an isolated Linux sandbox with strict time (1000ms) and memory limits.</li>
            </ul>
          </div>

          {/* Rule 5: Module Progression */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>5. Module Completion &amp; Progression</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90">
              All 20 questions in Module {moduleOrder} must be solved to achieve 100% mastery and automatically unlock Module {moduleOrder + 1}. Once you finish, click <strong>&quot;SUBMIT MODULE TEST&quot;</strong> to view your scorecard.
            </p>
          </div>

          {/* Candidate Declaration Checkbox (Mandatory before starting) */}
          {isDeclarationMode && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border-2 border-cyan-500/40 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Candidate Declaration &amp; Honor Pledge</span>
              </div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-[var(--bg-main)] border-[var(--border-line)] cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-main)] leading-relaxed">
                  I have read, understood, and agree to all the examination instructions, progressive sequential question rules, and anti-cheat regulations. I declare that all code submitted will be written solely by me with complete academic integrity.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--border-line)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {isDeclarationMode ? (
            <>
              <button
                type="button"
                onClick={onBackToModules}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Modules</span>
              </button>
              <button
                type="button"
                disabled={!isAgreed}
                onClick={onAgreeAndStart}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 ${
                  isAgreed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 cursor-pointer animate-pulse hover:animate-none'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <span>I AM READY TO BEGIN (START TEST) 🚀</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 transition cursor-pointer"
              >
                Understood, Return to Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
