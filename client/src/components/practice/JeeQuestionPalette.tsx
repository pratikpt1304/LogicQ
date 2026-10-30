import React from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Bookmark,
  FileText,
  HelpCircle,
  Send,
  Trophy,
  ChevronRight,
  User,
  X,
  Clock,
  ShieldCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export type JeeQuestionStatus = 'SOLVED' | 'MARKED' | 'NOT_ANSWERED' | 'NOT_VISITED' | 'QUARANTINED';

interface JeeQuestionPaletteProps {
  moduleTitle: string;
  moduleOrder: number;
  problems: any[];
  currentProblemSlug: string;
  visitedProblems: Set<string>;
  markedForReview: Set<string>;
  solvedSlugs: Set<string>;
  quarantinedSlugs?: Set<string>;
  onSelectProblem: (slug: string) => void;
  onSubmitTest: () => void;
  user: any;
  onOpenQuestionPaper: () => void;
  onOpenInstructions: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const JeeQuestionPalette: React.FC<JeeQuestionPaletteProps> = ({
  moduleTitle,
  moduleOrder,
  problems,
  currentProblemSlug,
  visitedProblems,
  markedForReview,
  solvedSlugs,
  quarantinedSlugs,
  onSelectProblem,
  onSubmitTest,
  user,
  onOpenQuestionPaper,
  onOpenInstructions,
  isMobileDrawer,
  onCloseMobileDrawer,
}) => {
  // Strict progressive locking: Question N requires Question N-1 to be solved OR quarantined
  const isUnlocked = (idx: number): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      const prevP = problems[i];
      const isPrevSolved = prevP?.isSolved || solvedSlugs.has(prevP?.slug);
      const isPrevQuarantined = quarantinedSlugs?.has(prevP?.slug);
      if (!isPrevSolved && !isPrevQuarantined) return false;
    }
    return true;
  };

  // Helper to determine question status
  const getStatus = (p: any, idx?: number): JeeQuestionStatus => {
    if (p.isSolved || solvedSlugs.has(p.slug)) return 'SOLVED';
    if (quarantinedSlugs?.has(p.slug)) return 'QUARANTINED';
    if (idx !== undefined && !isUnlocked(idx)) return 'NOT_VISITED';
    if (markedForReview.has(p.slug)) return 'MARKED';
    // Only unlocked questions that have been opened or attempted count as NOT_ANSWERED
    if (visitedProblems.has(p.slug) || (p.attemptsCount && p.attemptsCount > 0)) {
      return 'NOT_ANSWERED';
    }
    return 'NOT_VISITED';
  };

  // Count summaries
  let solvedCount = 0;
  let markedCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;
  let lockedCount = 0;
  let quarantinedCount = 0;

  problems.forEach((p, idx) => {
    const isQuar = quarantinedSlugs?.has(p?.slug);
    if (isQuar) {
      quarantinedCount++;
      return;
    }
    if (!isUnlocked(idx)) {
      lockedCount++;
      return; // Locked questions are counted exclusively in lockedCount
    }
    const st = getStatus(p, idx);
    if (st === 'SOLVED') solvedCount++;
    else if (st === 'MARKED') markedCount++;
    else if (st === 'NOT_ANSWERED') notAnsweredCount++;
    else notVisitedCount++;
  });

  const totalQuestions = problems.length || 20;
  const progressPercent = Math.round((solvedCount / totalQuestions) * 100);

  const candidateName = user?.displayName || user?.fullName || user?.username || 'Candidate';
  const candidatePrn = user?.prn || user?.maskedPrn || 'PRN-STUDENT';
  const candidateInitial = candidateName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-panel)] border-l border-[var(--border-line)] select-none text-[var(--text-main)]">
      {/* Drawer Header (mobile only) */}
      {isMobileDrawer && (
        <div className="p-3 border-b border-[var(--border-line)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--accent)]">
              QUESTION PALETTE (20)
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Candidate Card */}
      <div className="p-3.5 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
            {candidateInitial}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold truncate text-[var(--text-main)] font-mono">
              {candidateName}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              <span className="text-cyan-400 font-semibold">{candidatePrn}</span>
              
            </div>
          </div>
        </div>
      </div>

      {/* JEE Legend Grid */}
      <div className="p-3 border-b border-[var(--border-line)] bg-[var(--bg-main)]/50 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center justify-between">
          <span>Palette Legend</span>
          <span className="text-emerald-400 font-bold">{solvedCount}/{totalQuestions} Solved</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-slate-900/80 text-slate-400 font-bold flex items-center justify-center text-[10px] border border-slate-800">
              <Lock className="w-2.5 h-2.5" />
            </span>
            <span className="text-slate-400 font-medium">Locked ({lockedCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
              {solvedCount}
            </span>
            <span className="text-emerald-400 font-medium">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
              {notAnsweredCount}
            </span>
            <span className="text-rose-400 font-medium">Not Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
              {markedCount}
            </span>
            <span className="text-purple-400 font-medium">Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-slate-700/80 text-slate-300 font-bold flex items-center justify-center text-[10px] border border-slate-600/50">
              {notVisitedCount}
            </span>
            <span className="text-[var(--text-muted)] font-medium">Not Visited</span>
          </div>
          {quarantinedCount > 0 && (
            <div className="flex items-center gap-2 col-span-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/40">
                <AlertTriangle className="w-2.5 h-2.5" />
              </span>
              <span className="text-amber-400 font-medium">Tab-Locked / Quarantined ({quarantinedCount})</span>
            </div>
          )}
        </div>
      </div>

      {/* Question 1 to 20 Grid Boxes */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--text-muted)] font-semibold uppercase">
            Questions (Module {moduleOrder})
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">Click number to switch</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {problems.map((p, idx) => {
            const num = p.moduleOrder || idx + 1;
            const status = getStatus(p, idx);
            const isCurrent = p.slug === currentProblemSlug;
            const unlocked = isUnlocked(idx);

            if (!unlocked) {
              return (
                <button
                  key={p.id || p.slug || idx}
                  type="button"
                  onClick={() => {
                    toast.error(`🔒 Question #${num} is locked! Complete previous questions or advance first.`);
                  }}
                  className="relative h-10 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-50 transition"
                  title={`Q${num}: ${p.title} • Locked`}
                >
                  <span className="text-[11px] leading-tight">{num}</span>
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                </button>
              );
            }

            let bgClass = 'bg-slate-800 text-slate-300 border border-slate-700/70 hover:bg-slate-700';
            if (status === 'SOLVED') {
              bgClass = 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/30';
            } else if (status === 'QUARANTINED') {
              bgClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-sm';
            } else if (status === 'MARKED') {
              bgClass = 'bg-purple-600 text-white hover:bg-purple-500 shadow-sm shadow-purple-600/30';
            } else if (status === 'NOT_ANSWERED') {
              bgClass = 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-600/30';
            }

            return (
              <button
                key={p.id || p.slug || idx}
                type="button"
                onClick={() => {
                  onSelectProblem(p.slug);
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`relative h-10 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all ${bgClass} ${
                  isCurrent
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[var(--bg-panel)] scale-105 z-10'
                    : 'hover:scale-102'
                }`}
                title={`Q${num}: ${p.title} (${p.difficulty}) • ${status}`}
              >
                <span>{num}</span>
                {status === 'QUARANTINED' && (
                  <AlertTriangle className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-amber-400" />
                )}
                {status === 'MARKED' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-purple-800" />
                )}
                {status === 'SOLVED' && (
                  <CheckCircle2 className="w-2.5 h-2.5 absolute bottom-0.5 right-0.5 text-emerald-200" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Utility Actions */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={onOpenQuestionPaper}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
            title="View complete question paper"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paper</span>
          </button>
          <button
            type="button"
            onClick={onOpenInstructions}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
            title="View test rules and color guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Rules</span>
          </button>
        </div>
      </div>

      {/* Footer Submit Module Section */}
      <div className="p-3 border-t border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--text-muted)]">Progress</span>
          <span className="font-bold text-emerald-400">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Only render submit button inside mobile drawer where bottom toolbar might be overlaid */}
        {isMobileDrawer && (
          <button
            type="button"
            onClick={onSubmitTest}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-mono text-xs font-bold tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>SUBMIT MODULE TEST</span>
          </button>
        )}
      </div>
    </div>
  );
};
