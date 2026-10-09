import React from 'react';
import { Difficulty, Verdict } from '../../types/index.js';

export const DifficultyBadge: React.FC<{ difficulty: Difficulty; size?: 'sm' | 'md' }> = ({
  difficulty,
  size = 'md',
}) => {
  const styles: Record<Difficulty, string> = {
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HARD: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold tracking-wide rounded-md border ${pad} ${
        styles[difficulty] || styles.MEDIUM
      }`}
    >
      {difficulty}
    </span>
  );
};

export const VerdictBadge: React.FC<{ verdict: Verdict; size?: 'sm' | 'md' }> = ({
  verdict,
  size = 'md',
}) => {
  const styles: Record<Verdict, { label: string; cls: string }> = {
    ACCEPTED: {
      label: 'Accepted',
      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    WRONG_ANSWER: {
      label: 'Wrong Answer',
      cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
    TIME_LIMIT_EXCEEDED: {
      label: 'Time Limit Exceeded',
      cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    RUNTIME_ERROR: {
      label: 'Runtime Error',
      cls: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    },
    COMPILE_ERROR: {
      label: 'Compile Error',
      cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    MEMORY_LIMIT_EXCEEDED: {
      label: 'Memory Limit',
      cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    },
    PENDING: {
      label: 'Queued',
      cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30 animate-pulse',
    },
    JUDGING: {
      label: 'Judging...',
      cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse',
    },
  };

  const current = styles[verdict] || {
    label: verdict,
    cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded-md border tracking-wide ${pad} ${current.cls}`}
    >
      {current.label}
    </span>
  );
};
