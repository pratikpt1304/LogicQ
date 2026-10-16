import React from 'react';

interface PrnFormatGuideProps {
  value: string;
  showHint?: boolean;
  className?: string;
}

/**
 * Accessible visual format guide for the 12-character PRN (4 digits, 3 letters, M or F, 4 digits).
 * Highlights the active segment being typed without altering the input field keyboard behavior.
 */
export const PrnFormatGuide: React.FC<PrnFormatGuideProps> = ({
  value,
  showHint = true,
  className = '',
}) => {
  const clean = (value || '').replace(/\s+/g, '').toUpperCase();
  const len = clean.length;

  const seg0 = clean.slice(0, 4);
  const seg1 = clean.slice(4, 7);
  const seg2 = clean.slice(7, 8);
  const seg3 = clean.slice(8, 12);

  // Active segment index: 0, 1, 2, or 3
  const activeIndex = len < 4 ? 0 : len < 7 ? 1 : len < 8 ? 2 : 3;
  const isComplete = len === 12;

  return (
    <div className={`mt-1.5 space-y-1 ${className}`} aria-hidden="true">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono select-none">
        {/* Block 1: 4 digits */}
        <span
          data-testid="prn-seg-0"
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            activeIndex === 0 && !isComplete
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-bold'
              : seg0.length === 4
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          {seg0 ? seg0.padEnd(4, '·') : '0000'}
        </span>

        <span className="text-slate-400 text-xs">•</span>

        {/* Block 2: 3 letters */}
        <span
          data-testid="prn-seg-1"
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            activeIndex === 1 && !isComplete
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-bold'
              : seg1.length === 3
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          {seg1 ? seg1.padEnd(3, '·') : 'AAA'}
        </span>

        <span className="text-slate-400 text-xs">•</span>

        {/* Block 3: M or F */}
        <span
          data-testid="prn-seg-2"
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            activeIndex === 2 && !isComplete
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-bold'
              : seg2.length === 1
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          {seg2 || 'M/F'}
        </span>

        <span className="text-slate-400 text-xs">•</span>

        {/* Block 4: 4 digits */}
        <span
          data-testid="prn-seg-3"
          className={`px-1.5 py-0.5 rounded border transition-colors ${
            activeIndex === 3 && !isComplete
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-bold'
              : seg3.length === 4
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          {seg3 ? seg3.padEnd(4, '·') : '0000'}
        </span>
      </div>

      {showHint && (
        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          4 digits, 3 letters, M or F, 4 digits (e.g. 2199TESM0001)
        </p>
      )}
    </div>
  );
};
