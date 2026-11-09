import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  Code2,
  AlertOctagon,
  Eye,
  Check,
  Save,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                  Module {moduleOrder} Assessment
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] font-semibold">
                  C Language CBT
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] font-mono tracking-tight mt-0.5">
                {moduleTitle}
              </h3>
            </div>
          </div>

          {!isDeclarationMode && (
            <button
              onClick={onClose}
              aria-label="Close instructions modal"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Candidate & Test Quick Info Strip */}
        <div className="px-5 py-2.5 bg-[var(--bg-main)]/60 border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Candidate:</span>
            <span className="font-bold text-[var(--text-main)] truncate max-w-[200px]">
              {candidateName}
            </span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-cyan-400 font-semibold">{candidatePrn}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              {totalQuestions} Questions
            </span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Save className="w-3.5 h-3.5" />
              Auto-Save Active
            </span>
          </div>
        </div>

        {/* Main Clean Rules Grid (No long essays, only punchy essential rules) */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-xs font-mono">
          {/* Rule 1: Sequential Locking */}
          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[var(--text-main)] text-xs flex items-center gap-2">
                <span>1. Strict Sequential Order</span>
                <span className="text-[10px] text-indigo-400 font-normal border border-indigo-500/30 px-1.5 py-0.2 rounded">
                  Mandatory
                </span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                The assessment begins with <strong className="text-[var(--text-main)]">Question 1</strong>. Each subsequent question unlocks only after the preceding problem is fully solved (all test cases passed). You can navigate back to review or edit previously solved questions at any time.
              </p>
            </div>
          </div>

          {/* Rule 2: Anti-Cheat & Strict Rules */}
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 shrink-0 mt-0.5">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="font-bold text-[var(--text-main)] text-xs flex items-center justify-between">
                <span>2. Anti-Cheat &amp; Fair-Play Proctoring</span>
                <span className="text-[10px] text-rose-400 font-normal border border-rose-500/30 px-1.5 py-0.2 rounded">
                  Live Audit
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center gap-2">
                  <span className="text-amber-400 font-bold">🖥️</span>
                  <span className="text-[var(--text-main)]">Fullscreen Mode Required</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center gap-2">
                  <span className="text-rose-400 font-bold">🚫</span>
                  <span className="text-[var(--text-main)]">Copy-Paste Blocked</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">👁️</span>
                  <span className="text-[var(--text-main)]">Tab Switch Tracked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 3: Question Palette Legend */}
          <div className="p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2">
            <h4 className="font-bold text-[var(--text-main)] text-xs flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Question Palette Colors</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  ✓
                </span>
                <span className="text-emerald-400 font-bold">Solved</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
                <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  ✕
                </span>
                <span className="text-rose-400 font-bold">Attempting</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
                <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  🔖
                </span>
                <span className="text-purple-400 font-bold">Review</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
                <span className="w-5 h-5 rounded bg-slate-700 text-slate-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                  🔒
                </span>
                <span className="text-[var(--text-muted)] font-bold">Locked</span>
              </div>
            </div>
          </div>

          {/* Declaration Checkbox */}
          {isDeclarationMode && (
            <div
              onClick={() => setIsAgreed(!isAgreed)}
              className={`p-3.5 rounded-xl border-2 transition cursor-pointer select-none flex items-start gap-3 ${
                isAgreed
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/50'
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center transition shrink-0 mt-0.5 ${
                  isAgreed
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'border-2 border-[var(--border-line)] bg-[var(--bg-panel)]'
                }`}
              >
                {isAgreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-[var(--text-main)] text-xs block">
                  I agree to the test instructions &amp; academic integrity pledge
                </span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  I confirm that all solutions will be coded entirely by me without unauthorized external assistance, copy-pasting, or unfair means.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons in Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 shrink-0">
          {isDeclarationMode ? (
            <>
              <button
                type="button"
                onClick={onBackToModules}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-panel)]/80 border border-[var(--border-line)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!isAgreed}
                onClick={onAgreeAndStart}
                className={`px-6 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide transition flex items-center gap-2 shadow-md ${
                  isAgreed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)] cursor-not-allowed opacity-50'
                }`}
              >
                <span>Start Proctored Test</span>
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
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
