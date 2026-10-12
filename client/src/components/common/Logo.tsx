import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, to }) => {
  const { user } = useAuth();
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const targetPath = to ?? (user ? '/dashboard' : '/');

  return (
    <Link to={targetPath} className="flex items-center gap-2.5 group select-none">
      <div
        className="relative flex items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-1.5 transition-colors duration-200 group-hover:border-[var(--color-accent)]"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="logoQGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B9BFF" />
              <stop offset="100%" stopColor="#46D9A0" />
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
          <path
            d="M 38 38 L 47 44 L 38 50"
            stroke="#8B9BFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="51"
            y1="50"
            x2="59"
            y2="50"
            stroke="#46D9A0"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
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
        <div
          className={`font-heading font-extrabold tracking-tight text-[var(--text-main)] flex items-center ${textSize}`}
        >
          Logic
          <span className="text-[var(--color-success)]">Q</span>
        </div>
        {showTagline && (
          <span className="text-xs font-mono text-[var(--text-muted)] tracking-wider font-medium">
            Think in logic. Code in C.
          </span>
        )}
      </div>
    </Link>
  );
};
