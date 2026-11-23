import React, { useEffect } from 'react';
import { Logo } from '../components/common/Logo.js';
import { ShieldCheck, Clock, Database, Sparkles, ArrowRight, Wrench, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans"
      style={{ backgroundColor: '#030712', color: '#F8FAFC' }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-blue-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Logo size="md" />
        </div>
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wide"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#FBBF24' }}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>SCHEDULED MAINTENANCE</span>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Animated Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold mb-6 shadow-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#E2E8F0' }}
        >
          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
          <span>Core Infrastructure &amp; Database Upgrade</span>
        </div>

        {/* Headline (Crystal clear high-contrast white & neon gradient) */}
        <h1
          className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
          style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(99, 102, 241, 0.25)' }}
        >
          LogicQ is Currently <br className="hidden sm:inline" />
          <span style={{ color: '#A5B4FC' }}>
            Under Maintenance
          </span>
        </h1>

        <p
          className="mt-4 text-base sm:text-lg max-w-xl leading-relaxed font-normal"
          style={{ color: '#CBD5E1' }}
        >
          We are upgrading to a high-performance dedicated PostgreSQL database to provide unlimited bandwidth and zero-latency assessments for all students.
        </p>

        {/* Resumption Banner */}
        <div
          className="mt-6 px-5 py-3 rounded-2xl border text-xs sm:text-sm font-mono font-bold flex items-center gap-2 shadow-xs"
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)', color: '#C7D2FE' }}
        >
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Platform will restart: <strong style={{ color: '#FFFFFF' }}>Tomorrow Morning (Saturday, 8:00 AM IST)</strong></span>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full text-left">
          {/* Card 1: 100% Data Safe */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>100% Data Safe</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              All your solved problems, code history, exam submissions, and scores are securely preserved.
            </p>
          </div>

          {/* Card 2: Database Migration */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>Next-Gen DB</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              Migrating to PostgreSQL for real-time WebSocket sync and zero daily rate limits.
            </p>
          </div>

          {/* Card 3: Saturday Restart */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>Resumes Morning</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              Live tests and 100-problem practice arena will be live tomorrow morning.
            </p>
          </div>
        </div>
      </main>

      {/* Footer & Discreet Faculty Login */}
      <footer
        className="max-w-6xl mx-auto w-full px-6 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs relative z-10"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)', color: '#64748B' }}
      >
        <div>
          &copy; {new Date().getFullYear()} LogicQ Platform &bull; Sanjivani College of Engineering. All rights reserved.
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Status: Upgrading DB
          </span>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1 text-xs font-medium transition cursor-pointer hover:underline"
            style={{ color: '#818CF8' }}
            title="Faculty &amp; Administrator sign in"
          >
            <Lock className="w-3 h-3" />
            <span>Faculty Access</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </footer>
    </div>
  );
};
export default MaintenancePage;
