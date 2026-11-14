import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.js';

interface SatisfyingThemeToggleProps {
  size?: 'sm' | 'md';
  className?: string;
  showSound?: boolean;
}

export const SatisfyingThemeToggle: React.FC<SatisfyingThemeToggleProps> = ({
  size = 'sm',
  className = '',
  showSound = true,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isPressing, setIsPressing] = useState(false);

  // Synthesize tactile micro-audio chime via Web Audio API (Zero external mp3 assets needed)
  const playTactileChime = (targetDark: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';

      if (targetDark) {
        // Deep evening drop (480Hz -> 220Hz)
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      } else {
        // Bright morning pop (240Hz -> 520Hz)
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      }

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio auto-play protection ignored gracefully
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showSound) {
      playTactileChime(!isDark);
    }
    toggleTheme();
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to daylight mode' : 'Switch to midnight dark mode'}
      title={isDark ? 'Switch to daylight mode' : 'Switch to midnight dark mode'}
      onClick={handleClick}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onMouseLeave={() => setIsPressing(false)}
      className={`relative inline-flex items-center select-none cursor-pointer outline-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isSmall ? 'w-[54px] h-[28px]' : 'w-[66px] h-[34px]'
      } rounded-full p-[3px] ${
        isPressing ? 'scale-95' : 'hover:scale-[1.03]'
      } ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 border border-indigo-700/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_12px_rgba(99,102,241,0.25)]'
          : 'bg-gradient-to-r from-sky-400 via-sky-300 to-amber-200 border border-sky-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12),0_0_12px_rgba(56,189,248,0.3)]'
      } ${className}`}
    >
      {/* Background Atmosphere: Day Clouds or Night Stars */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        {isDark ? (
          /* Midnight Night Sky with Twinkling Stars */
          <div className="relative w-full h-full">
            {/* Star 1 */}
            <span
              className="absolute top-[6px] left-[10px] w-1 h-1 bg-white rounded-full animate-pulse"
              style={{ animationDuration: '1.8s' }}
            />
            {/* Star 2 */}
            <span
              className="absolute bottom-[7px] left-[18px] w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse"
              style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
            />
            {/* Star 3 - Mini Sparkle */}
            <span
              className="absolute top-[8px] left-[26px] w-[3px] h-[3px] bg-sky-200 rounded-full"
            />
            {/* Star 4 */}
            <span
              className="absolute bottom-[6px] left-[8px] w-[2px] h-[2px] bg-white rounded-full opacity-70"
            />
          </div>
        ) : (
          /* Daytime Sky with Fluffy Drifting Clouds */
          <div className="relative w-full h-full">
            {/* Cloud 1 */}
            <div className="absolute right-[8px] top-[5px] flex items-center opacity-90 transition-transform duration-500">
              <span className="w-2.5 h-2.5 bg-white rounded-full" />
              <span className="w-3.5 h-3.5 bg-white rounded-full -ml-1 -mt-0.5" />
              <span className="w-2 h-2 bg-white rounded-full -ml-1" />
            </div>
            {/* Cloud 2 */}
            <div className="absolute right-[16px] bottom-[4px] flex items-center opacity-75">
              <span className="w-2 h-2 bg-white rounded-full" />
              <span className="w-3 h-3 bg-white rounded-full -ml-0.5 -mt-0.5" />
              <span className="w-1.5 h-1.5 bg-white rounded-full -ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Sliding Physics Knob: Sun <-> Moon */}
      <div
        className={`relative z-10 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center shrink-0 ${
          isSmall ? 'w-[22px] h-[22px]' : 'w-[28px] h-[28px]'
        } ${
          isDark
            ? isSmall
              ? 'translate-x-[26px] bg-gradient-to-tr from-slate-200 via-indigo-100 to-white text-indigo-900 shadow-[0_0_10px_rgba(224,231,255,0.7),inset_-2px_-2px_3px_rgba(15,23,42,0.25)]'
              : 'translate-x-[32px] bg-gradient-to-tr from-slate-200 via-indigo-100 to-white text-indigo-900 shadow-[0_0_12px_rgba(224,231,255,0.7),inset_-2px_-2px_3px_rgba(15,23,42,0.25)]'
            : 'translate-x-0 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.85),inset_-1px_-1px_2px_rgba(180,83,9,0.3)]'
        }`}
      >
        {isDark ? (
          /* Realistic Crescent Moon with Craters */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Crater 1 */}
            <span className="absolute top-[4px] right-[5px] w-[3.5px] h-[3.5px] bg-slate-300/80 rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.25)]" />
            {/* Crater 2 */}
            <span className="absolute bottom-[4px] right-[7px] w-[2.5px] h-[2.5px] bg-slate-300/70 rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.2)]" />
            {/* Crater 3 */}
            <span className="absolute top-[9px] left-[5px] w-[2px] h-[2px] bg-slate-300/60 rounded-full" />
          </div>
        ) : (
          /* Golden Radiant Sun with Mini Corona */
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 animate-ping opacity-40 pointer-events-none" />
            <span className="w-2 h-2 rounded-full bg-white/70 shadow-xs" />
          </div>
        )}
      </div>
    </button>
  );
};
