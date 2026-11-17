import React from 'react';

interface ProctoringRadarDotProps {
  status?: 'active' | 'warning' | 'paused';
  label?: string;
  className?: string;
  showText?: boolean;
}

export const ProctoringRadarDot: React.FC<ProctoringRadarDotProps> = ({
  status = 'active',
  label = 'Proctoring Active',
  className = '',
  showText = true,
}) => {
  const isWarning = status === 'warning';
  const isPaused = status === 'paused';

  const coreColor = isWarning
    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
    : isPaused
    ? 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]'
    : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]';

  const pingColor = isWarning
    ? 'bg-amber-400'
    : isPaused
    ? 'bg-slate-400'
    : 'bg-emerald-400';

  const textColor = isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : isPaused
    ? 'text-slate-500 dark:text-slate-400'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md select-none ${className}`}
      title={label}
    >
      {/* Double-Ring Radar Scanner Core */}
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {!isPaused && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping duration-1000 ${pingColor}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${coreColor}`}
        />
      </span>

      {showText && (
        <span
          className={`text-[11px] font-mono font-bold uppercase tracking-wider ${textColor}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
