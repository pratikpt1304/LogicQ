import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle, ArrowLeft, Code2, Terminal, ShieldCheck } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2 shadow-inner">
          <AlertTriangle className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase">
            Error 404 • Segfault Encountered
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
            The memory address you tried to dereference points to invalid page table space. Return to safety.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-300 dark:border-slate-700/60 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Quick Alternative Destinations */}
        <div className="pt-6 border-t border-[var(--border-line)] text-xs font-mono space-y-2">
          <span className="text-[var(--text-muted)] block text-[11px]">Or jump directly to:</span>
          <div className="flex items-center justify-center gap-4 text-cyan-600 dark:text-cyan-400">
            <Link to="/practice" className="hover:underline flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              <span>Practice</span>
            </Link>
            <span>•</span>
            <Link to="/compiler" className="hover:underline flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>Compiler</span>
            </Link>
            <span>•</span>
            <Link to="/verify-report" className="hover:underline flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
