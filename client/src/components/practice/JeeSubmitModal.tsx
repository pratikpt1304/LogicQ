import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Trophy,
  ArrowRight,
  RotateCcw,
  Clock,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';
import { JeeQuestionStatus } from './JeeQuestionPalette.js';

interface JeeSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleTitle: string;
  moduleOrder: number;
  problems: any[];
  solvedSlugs: Set<string>;
  markedForReview: Set<string>;
  visitedProblems: Set<string>;
  quarantinedSlugs?: Set<string>;
  onAttemptQuarantined?: () => void;
  user: any;
  onConfirmSubmit: () => Promise<void> | void;
  onGoToNextModule: () => void;
  onBackToModules: () => void;
}

export const JeeSubmitModal: React.FC<JeeSubmitModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  moduleOrder,
  problems,
  solvedSlugs,
  markedForReview,
  visitedProblems,
  quarantinedSlugs,
  onAttemptQuarantined,
  user,
  onConfirmSubmit,
  onGoToNextModule,
  onBackToModules,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Progressive locking check
  const isUnlocked = (idx: number): boolean => {
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      const prevP = problems[i];
      const isPrevSolved = prevP?.isSolved || solvedSlugs.has(prevP?.slug);
      const isPrevQuarantined = quarantinedSlugs?.has(prevP?.slug);
      if (!isPrevSolved && !isPrevQuarantined) return false;
    }
    return true;
  };

  // Calculate statistics
  let solvedCount = 0;
  let markedCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;
  let quarantinedCount = 0;

  problems.forEach((p, idx) => {
    if (p.isSolved || solvedSlugs.has(p.slug)) solvedCount++;
    else if (quarantinedSlugs?.has(p.slug)) quarantinedCount++;
    else if (!isUnlocked(idx)) notVisitedCount++;
    else if (markedForReview.has(p.slug)) markedCount++;
    else if (visitedProblems.has(p.slug) || (p.attemptsCount && p.attemptsCount > 0)) {
      notAnsweredCount++;
    } else notVisitedCount++;
  });

  const totalQuestions = problems.length || 20;
  const isMasteryComplete = solvedCount >= totalQuestions;
  const nextModuleOrder = moduleOrder + 1;
  const candidateName = user?.displayName || user?.fullName || 'Student';
  const candidatePrn = user?.prn || user?.maskedPrn || 'PRN-STUDENT';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmSubmit();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#46D9A0', '#8B9BFF', '#FCD34D', '#38BDF8'],
      });
      setIsSubmitted(true);
    } catch {
      // error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              {isSubmitted ? <Trophy className="w-5 h-5 text-amber-400" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">
                {isSubmitted ? 'Module Test Scorecard' : 'Submit Module Assessment Test'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Module {moduleOrder}: {moduleTitle}
              </p>
            </div>
          </div>
          {!isSubmitted && (
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Candidate Detail Strip */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Candidate</span>
            <span className="font-bold text-[var(--text-main)]">{candidateName}</span>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">PRN</span>
            <span className="font-bold text-cyan-400">{candidatePrn}</span>
          </div>
        </div>

        {/* View 1: Confirmation & Summary */}
        {!isSubmitted ? (
          <>
            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">
                  Answered
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {solvedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center">
                <span className="text-[10px] font-mono text-rose-400 uppercase block font-semibold">
                  Unanswered
                </span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {notAnsweredCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-center">
                <span className="text-[10px] font-mono text-purple-400 uppercase block font-semibold">
                  Review Later
                </span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {markedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/20 border border-slate-600/30 text-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-semibold">
                  Not Visited
                </span>
                <span className="text-xl font-bold font-mono text-[var(--text-muted)]">
                  {notVisitedCount}
                </span>
              </div>
            </div>

            {/* Progression Warning or Success Message */}
            {quarantinedCount > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{quarantinedCount} Tab-Locked Question(s)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[10px]">1 Chance Available</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-300/90">
                  You have {quarantinedCount} question(s) that were auto-locked due to 3 tab switches. You have 1 final chance to attempt and solve them now before final submission. If skipped, they will remain pending.
                </p>
                {onAttemptQuarantined && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAttemptQuarantined();
                    }}
                    className="w-full mt-1 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Attempt Locked Question(s) Now (1 Final Chance) →</span>
                  </button>
                )}
              </div>
            )}

            {!isMasteryComplete ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Curriculum Lock Notice</span>
                </div>
                <p className="leading-relaxed">
                  You have solved <strong>{solvedCount} of {totalQuestions}</strong> questions in this module. To unlock Module {nextModuleOrder}, you must achieve 100% mastery (all {totalQuestions} solved).
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>100% Mastery Achieved!</span>
                </div>
                <p className="leading-relaxed">
                  Incredible job! All {totalQuestions} questions solved. Submitting will register your completion and immediately unlock <strong>Module {nextModuleOrder}</strong>!
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
              >
                ← Return to Test
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-mono font-bold tracking-wide shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : isMasteryComplete ? 'Submit & Unlock Next Module' : 'Submit Test Session'}
              </button>
            </div>
          </>
        ) : (
          /* View 2: Scorecard */
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h2 className="text-xl font-bold font-mono text-[var(--text-main)]">
                Assessment Submitted Successfully!
              </h2>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                Your performance and verified code solutions have been recorded.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">Score</span>
                <span className="text-lg font-bold font-mono text-cyan-400">{solvedCount * 10} PTS</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">Accuracy</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">Questions</span>
                <span className="text-lg font-bold font-mono text-amber-400">{solvedCount}/{totalQuestions}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBackToModules}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
              >
                All Modules Hub
              </button>
              {isMasteryComplete && nextModuleOrder <= 5 && (
                <button
                  type="button"
                  onClick={onGoToNextModule}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-mono font-bold tracking-wide shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Proceed to Module {nextModuleOrder}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
