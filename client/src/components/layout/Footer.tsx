import React from 'react';
import { Logo } from '../common/Logo.js';
import { Terminal, Shield, Cpu, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/80 dark:bg-dark-950/90 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo size="sm" showTagline={true} />
          <p className="text-xs text-slate-500 font-mono mt-1">
            Engineered for performance. Compiling with GCC 16.2.0 (C11 standard).
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Sandboxed Judge</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Zero Data Leakage</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>IST Midnight Reset</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono text-center md:text-right">
          <p>&copy; {new Date().getFullYear()} LogicQ Arena. All rights reserved.</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Original Design & Code Execution Engine</p>
        </div>
      </div>
    </footer>
  );
};
