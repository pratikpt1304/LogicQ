import React, { useState } from 'react';
import { FileText, X, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { DifficultyBadge } from '../common/Badge.js';
import { JeeQuestionStatus } from './JeeQuestionPalette.js';

interface JeeQuestionPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleTitle: string;
  moduleOrder: number;
  problems: any[];
  currentProblemSlug: string;
  solvedSlugs: Set<string>;
  markedForReview: Set<string>;
  visitedProblems: Set<string>;
  onSelectProblem: (slug: string) => void;
}

export const JeeQuestionPaperModal: React.FC<JeeQuestionPaperModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  moduleOrder,
  problems,
  currentProblemSlug,
  solvedSlugs,
  markedForReview,
  visitedProblems,
  onSelectProblem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const getStatus = (p: any): JeeQuestionStatus => {
    if (p.isSolved || solvedSlugs.has(p.slug)) return 'SOLVED';
    if (markedForReview.has(p.slug)) return 'MARKED';
    if (visitedProblems.has(p.slug) || (p.attemptsCount && p.attemptsCount > 0)) {
      return 'NOT_ANSWERED';
    }
    return 'NOT_VISITED';
  };

  const filteredProblems = problems.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      String(p.moduleOrder).includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">
                Complete Question Paper
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Module {moduleOrder}: {moduleTitle} ({problems.length} Questions)
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

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by title or number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredProblems.map((p, idx) => {
            const num = p.moduleOrder || idx + 1;
            const status = getStatus(p);
            const isCurrent = p.slug === currentProblemSlug;

            return (
              <div
                key={p.id || p.slug || idx}
                onClick={() => {
                  onSelectProblem(p.slug);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-[var(--text-main)]'
                    : 'bg-[var(--bg-surface)]/70 hover:bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-main)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                      status === 'SOLVED'
                        ? 'bg-emerald-600 text-white'
                        : status === 'MARKED'
                        ? 'bg-purple-600 text-white'
                        : status === 'NOT_ANSWERED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {num}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold font-mono truncate">{p.title}</h4>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {p.category || 'Practice'} • +10 PTS
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <DifficultyBadge difficulty={p.difficulty as any} />
                  {status === 'SOLVED' ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Solved</span>
                    </span>
                  ) : status === 'MARKED' ? (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                      Review
                    </span>
                  ) : status === 'NOT_ANSWERED' ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                      Unsolved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/40 text-[10px] font-mono">
                      Not Visited
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border-line)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
          >
            Close Question Paper
          </button>
        </div>
      </div>
    </div>
  );
};
