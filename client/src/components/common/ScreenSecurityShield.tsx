import React from 'react';
import { ShieldAlert, EyeOff, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ScreenSecurityShieldProps {
  isVisible: boolean;
  onRestore?: () => void;
  title?: string;
  message?: string;
}

export const ScreenSecurityShield: React.FC<ScreenSecurityShieldProps> = ({
  isVisible,
  onRestore,
  title = 'SCREEN PRIVACY SHIELD ACTIVE',
  message = 'Window focus was lost or a screen capture utility was detected. Workspace content is temporarily concealed for academic integrity.',
}) => {
  let isAdmin = false;
  try {
    const auth = useAuth();
    isAdmin = Boolean(
      auth.isAdmin ||
      auth.user?.role === 'ADMIN' ||
      auth.user?.role === 'FACULTY' ||
      (auth.user?.email || '').toLowerCase().trim() === 'logicqarena@gmail.com' ||
      (auth.user?.email || '').toLowerCase().trim() === 'hariprasathset@sanjivani.edu.in' ||
      (auth.user?.prn || '').toUpperCase().trim() === 'LOGICQARENA'
    );
  } catch {}

  const isPathAdmin = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/faculty') ||
    localStorage.getItem('logicq_role') === 'ADMIN' ||
    localStorage.getItem('logicq_role') === 'FACULTY'
  );

  if (!isVisible || isAdmin || isPathAdmin) return null;

  // On mobile devices, virtual keyboard or IME causes window focus changes; never block visible workspace on mobile
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || 'ontouchstart' in window);
  if (isMobile && typeof document !== 'undefined' && !document.hidden) {
    return null;
  }

  return (
    <div
      onClick={onRestore}
      className="fixed inset-0 z-[99999999] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none cursor-pointer transition-opacity duration-150 animate-in fade-in"
      style={{ backgroundColor: 'rgba(7, 9, 19, 0.98)', backdropFilter: 'blur(24px)' }}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase bg-rose-500/15 border border-rose-500/40 text-rose-300 mb-6 shadow-lg shadow-rose-950/50">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>PROCTORING DEFENSE ENGAGED</span>
        </div>

        {/* Shield Icon Graphic */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 flex items-center justify-center shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-slate-900 border border-rose-500/40 text-rose-400">
            <EyeOff className="w-4 h-4" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6 font-mono font-medium">
          {message}
        </p>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onRestore) onRestore();
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition transform hover:scale-[1.02] active:scale-95"
        >
          <Lock className="w-4 h-4" />
          <span>Click anywhere to resume workspace</span>
        </button>

        {/* Footer info */}
        <div className="mt-6 flex items-center gap-2 text-xs text-amber-300 font-mono font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Screenshots, snipping tools & print shortcuts are strictly logged</span>
        </div>
      </div>
    </div>
  );
};
