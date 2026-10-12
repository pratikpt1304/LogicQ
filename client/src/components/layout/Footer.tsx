import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo.js';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--border-line)] bg-[var(--bg-panel)] py-10 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo size="sm" showTagline={true} />
          <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
            Daily C Programming Challenge Platform.
          </p>
        </div>

        <div className="text-xs text-[var(--text-muted)] font-mono text-center md:text-right space-y-1">
          <p>&copy; {new Date().getFullYear()} LogicQ. All rights reserved.</p>
          <p className="text-xs text-[var(--color-accent)] font-semibold">
            Built by Bitwise Club •{' '}
            <Link to="/privacy" className="underline hover:text-[var(--text-main)]">
              Privacy Notice
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};
