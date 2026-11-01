import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ArrowRight, Sparkles, LogIn, LayoutDashboard } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-teal-500/10 to-emerald-500/15 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-3xl mx-auto text-center space-y-7">
        {/* Institutional Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-mono backdrop-blur-md shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span className="font-semibold tracking-wide">LogicQ • Institutional C Programming Platform</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--text-main)] leading-[1.15]">
          Think in Logic.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Code in C.
          </span>
        </h1>

        {/* Short Subtext */}
        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto font-sans leading-relaxed">
          The institutional platform for low-level systems engineering, algorithmic rigor, and automated GCC compiler sandboxing.
        </p>

        {/* Sign In Part */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-mono text-sm font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl font-mono text-sm font-bold text-[#0C0F1F] bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to LogicQ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
