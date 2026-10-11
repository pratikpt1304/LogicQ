import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
          <AlertTriangle className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase">
            Error 404 • Segfault Encountered
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
            The memory address you tried to dereference points to invalid page table space. Return to safety.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-300 dark:border-slate-700/60 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
