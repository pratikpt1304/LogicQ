import React, { useEffect } from 'react';
import { Logo } from '../components/common/Logo.js';
import { ShieldCheck, Rocket, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';

const NEW_APP_URL = 'https://xelo.dev-elzeo.workers.dev';

export const MaintenancePage: React.FC = () => {
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
        <div className="flex items-center gap-3 pointer-events-none select-none dark text-white" style={{ ['--text-main' as any]: '#FFFFFF', ['--bg-surface' as any]: 'rgba(255,255,255,0.06)', ['--border-line' as any]: 'rgba(255,255,255,0.12)' }}>
          <Logo size="md" />
        </div>
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wide"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34D399' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>NEW APP LIVE</span>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Elzeo Brand Photo */}
        <div
          className="mb-7 w-72 sm:w-80 h-32 sm:h-36 rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            borderColor: 'rgba(99, 102, 241, 0.3)',
            backgroundColor: '#0B1736',
            boxShadow: '0 20px 50px rgba(11, 23, 54, 0.65)',
          }}
        >
          <img
            src="/elzeo-logo.jpg"
            alt="Elzeo — Innovate | Transform"
            className="w-full h-full object-cover object-bottom select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold mb-5 shadow-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#E2E8F0' }}
        >
          <Rocket className="w-3.5 h-3.5 text-indigo-400" />
          <span>Platform Upgraded &amp; Shifted</span>
        </div>

        {/* Headline */}
        <h1
          className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
          style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(99, 102, 241, 0.25)' }}
        >
          Our App Has Shifted <br className="hidden sm:inline" />
          <span style={{ color: '#A5B4FC' }}>
            To a Brand-New Platform
          </span>
        </h1>

        <p
          className="mt-4 text-base sm:text-lg max-w-xl leading-relaxed font-normal"
          style={{ color: '#CBD5E1' }}
        >
          LogicQ has moved to our new, faster workspace powered by Elzeo. Click the button below to open the new app and continue.
        </p>

        {/* Primary Clickable Redirect Button */}
        <div className="mt-7 flex flex-col items-center gap-3 w-full">
          <a
            href={NEW_APP_URL}
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base sm:text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              boxShadow: '0 12px 35px rgba(79, 70, 229, 0.45)',
            }}
          >
            <span>Open New App</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href={NEW_APP_URL}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono text-indigo-300 hover:text-white underline underline-offset-4 transition-colors"
          >
            <span>{NEW_APP_URL}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 w-full text-left">
          {/* Card 1 */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>New Platform</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              All labs, coding tests, and assessments have shifted to our new Xelo workspace.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>Faster &amp; Reliable</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              Built for zero-latency code execution and smooth large-scale exams.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="p-4 rounded-2xl border backdrop-blur-md space-y-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#FFFFFF' }}>Powered by Elzeo</h3>
            <p className="text-[11px] leading-normal" style={{ color: '#94A3B8' }}>
              Click &ldquo;Open New App&rdquo; above to sign in with your student email on the new site.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="max-w-6xl mx-auto w-full px-6 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs relative z-10"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)', color: '#64748B' }}
      >
        <div>
          &copy; {new Date().getFullYear()} LogicQ Platform &bull; Powered by Elzeo. All rights reserved.
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Status: Moved to New App
          </span>
        </div>
      </footer>
    </div>
  );
};
export default MaintenancePage;
