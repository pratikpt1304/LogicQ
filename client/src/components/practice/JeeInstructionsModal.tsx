import React from 'react';
import { HelpCircle, X, ShieldCheck, CheckCircle2, Award, Terminal, Eye } from 'lucide-react';

interface JeeInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleTitle: string;
  moduleOrder: number;
}

export const JeeInstructionsModal: React.FC<JeeInstructionsModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  moduleOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">
                CBT Test Rules & Question Palette Guide
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Module {moduleOrder}: {moduleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-mono text-[var(--text-main)]">
          {/* Palette Colors Guide */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3">
            <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              1. Question Palette Status Legend
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  ✓
                </span>
                <span>
                  <strong className="text-emerald-400">Green: Answered &amp; Solved</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Code compiled and passed test cases.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                  ✕
                </span>
                <span>
                  <strong className="text-rose-400">Red: Visited / Not Answered</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Question was opened but not solved yet.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  🔖
                </span>
                <span>
                  <strong className="text-purple-400">Purple: Marked for Review</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">Flagged to re-check later before final submit.</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-600">
                  ○
                </span>
                <span>
                  <strong className="text-[var(--text-muted)]">Gray: Not Visited</strong>
                  <br />
                  <span className="text-[10px] text-[var(--text-muted)]">You have not navigated to this question yet.</span>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls Guide */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              2. Navigation &amp; Answering Controls
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li>
                <strong className="text-[var(--text-main)]">Save &amp; Next:</strong> Submits your code against the judge. If accepted, marks question Green and automatically advances.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Mark for Review &amp; Next:</strong> Saves current code draft and marks the question with a purple bookmark so you can return to it.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Clear Response:</strong> Reverts the editor back to the clean boilerplate starter code.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Auto-Save:</strong> Any code written is automatically saved locally and synced to the cloud. You never lose progress when switching question boxes.
              </li>
            </ul>
          </div>

          {/* Anti-Cheat & Proctoring Rules */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>3. Anti-Cheat &amp; Proctored Integrity Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-200/90 text-[11px]">
              <li>Fullscreen mode is enforced throughout the test session.</li>
              <li>Clipboard operations (Copy, Cut, Paste) are blocked to ensure genuine algorithmic typing.</li>
              <li>Tab switches and window focus losses are recorded and audited for faculty review.</li>
              <li>GCC 14 (C17) sandbox runs standard I/O (stdin/stdout) with 1000ms execution limit.</li>
            </ul>
          </div>

          {/* Progression Rule */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>4. Progression &amp; Unlocking</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90">
              All 20 questions in Module {moduleOrder} must be solved to achieve 100% mastery and unlock Module {moduleOrder + 1}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border-line)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 transition cursor-pointer"
          >
            Understood, Back to Test
          </button>
        </div>
      </div>
    </div>
  );
};
