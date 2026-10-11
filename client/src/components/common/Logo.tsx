import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <Link to="/" className="flex items-center gap-2.5 group select-none">
      <div
        className="relative flex items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-slate-700/60 p-1.5 transition-transform duration-200 group-hover:scale-105 group-hover:border-cyan-500/40"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="logoQGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F2FE" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <circle
            cx="48"
            cy="44"
            r="28"
            stroke="url(#logoQGrad)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Internal Command Prompt ">_" */}
          <path
            d="M 38 38 L 47 44 L 38 50"
            stroke="#00F2FE"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="51"
            y1="50"
            x2="59"
            y2="50"
            stroke="#10B981"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Q Tail Prompt Arrow */}
          <path
            d="M 64 60 L 80 76 M 73 76 L 80 76 L 80 69"
            stroke="url(#logoQGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className={`font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center ${textSize}`}>
          Logic
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Q
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider font-medium">
            Think in logic. Code in C.
          </span>
        )}
      </div>
    </Link>
  );
};
