import React from 'react';
import { Logo } from '../common/Logo.js';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/80 dark:bg-dark-950/90 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo size="sm" showTagline={true} />
          <p className="text-xs text-slate-500 font-mono mt-1">
            Daily C Programming Challenge Platform.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono text-center md:text-right">
          <p>&copy; {new Date().getFullYear()} LogicQ Arena. All rights reserved.</p>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
            Built by Bitwise Club
          </p>
        </div>
      </div>
    </footer>
  );
};
