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

  return (
    <div
      onClick={onRestore}
      className="fixed inset-0 z-[99999999] bg-[#070913]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer transition-opacity duration-150 animate-in fade-in"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full mx-auto flex flex-col items-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-6 shadow-lg shadow-rose-950/30">
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
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-mono">
          {message}
        </p>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onRestore) onRestore();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition transform hover:scale-[1.02] active:scale-95"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Click anywhere to resume workspace</span>
        </button>

        {/* Footer info */}
        <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Screenshots, snipping tools & print shortcuts are strictly logged</span>
        </div>
      </div>
    </div>
  );
};
