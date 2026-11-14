import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface StickmanLoginButtonProps {
  onClick: (e?: React.FormEvent | React.MouseEvent) => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const StickmanLoginButton: React.FC<StickmanLoginButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  label = 'Sign In as Student',
  className = '',
}) => {
  const [animating, setAnimating] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [stickmanInside, setStickmanInside] = useState(false);

  // Synthesize realistic subtle mechanical door/footstep click
  const playTactileClick = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (disabled || loading || animating) return;
    playTactileClick();

    // Trigger stickman walking animation sequence
    setAnimating(true);
    setStickmanInside(false);

    // After 400ms: Door swings open
    setTimeout(() => {
      setDoorsOpen(true);
    }, 450);

    // After 850ms: Stickman enters through doorway
    setTimeout(() => {
      setStickmanInside(true);
    }, 850);

    // After 1050ms: Door closes behind him
    setTimeout(() => {
      setDoorsOpen(false);
    }, 1100);

    // Trigger authenticating logic
    try {
      await onClick(e);
    } catch {
      setAnimating(false);
      setStickmanInside(false);
      setDoorsOpen(false);
    } finally {
      setTimeout(() => {
        setAnimating(false);
        setStickmanInside(false);
        setDoorsOpen(false);
      }, 1300);
    }
  };

  const isActive = animating || loading;

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* Neumorphic Walking Track & Capsule Button */}
      <button
        type="button"
        disabled={disabled || isActive}
        onClick={handleClick}
        className={`relative w-full h-[52px] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex items-center justify-center outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/90 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border border-slate-300/80 dark:border-slate-700 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.3)] hover:border-emerald-500/50 active:scale-[0.99]'
        }`}
      >
        {/* Horizontal Guide Rail / Walk Track */}
        <div className="absolute inset-x-5 h-[2px] bg-slate-300/80 dark:bg-slate-700/60 rounded-full top-1/2 -translate-y-1/2 pointer-events-none" />

        {/* =========================================================================
            CENTER DOUBLE DOOR
            ========================================================================= */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          style={{ perspective: '400px' }}
        >
          {/* Door Frame */}
          <div className="relative w-[34px] h-[38px] rounded-t-md border-2 border-slate-400 dark:border-slate-600 bg-slate-200/50 dark:bg-slate-950/60 p-[1px] shadow-sm flex overflow-hidden">
            {/* Interior Portal Glow when doors open */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-emerald-500/80 via-cyan-400/90 to-white transition-opacity duration-300 ${
                doorsOpen ? 'opacity-100 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'opacity-0'
              }`}
            />

            {/* Left Door Leaf */}
            <div
              className="w-1/2 h-full bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-end pr-[2px] transition-transform duration-300 ease-out origin-left"
              style={{
                transform: doorsOpen ? 'rotateY(-85deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Cyan glowing doorknob */}
              <span className="w-[3px] h-[3px] rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.9)]" />
            </div>

            {/* Right Door Leaf */}
            <div
              className="w-1/2 h-full bg-slate-100 dark:bg-slate-800 border-l border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-start pl-[2px] transition-transform duration-300 ease-out origin-right"
              style={{
                transform: doorsOpen ? 'rotateY(85deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Cyan glowing doorknob */}
              <span className="w-[3px] h-[3px] rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.9)]" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            ANIMATED STICKMAN
            ========================================================================= */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-[900ms] ease-in-out ${
            isActive
              ? 'left-[calc(50%-8px)]'
              : 'left-[16px]'
          } ${
            stickmanInside ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          }`}
        >
          <div className="relative w-[18px] h-[32px] flex flex-col items-center">
            {/* Glowing Head */}
            <div className="w-[7px] h-[7px] rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.95)] shrink-0" />

            {/* Torso */}
            <div className="w-[2px] h-[9px] bg-slate-700 dark:bg-slate-300 rounded-full shrink-0" />

            {/* Arms */}
            <div className="absolute top-[8px] flex items-center justify-center w-full">
              <span
                className={`w-[1.5px] h-[7px] bg-slate-600 dark:bg-slate-400 rounded-full origin-top transition-transform ${
                  isActive ? 'animate-[armSwing_0.25s_infinite_alternate_ease-in-out]' : '-rotate-12'
                }`}
              />
              <span
                className={`w-[1.5px] h-[7px] bg-slate-600 dark:bg-slate-400 rounded-full origin-top transition-transform ${
                  isActive ? 'animate-[armSwing_0.25s_infinite_alternate-reverse_ease-in-out]' : 'rotate-12'
                }`}
              />
            </div>

            {/* Legs */}
            <div className="flex items-center justify-center gap-[2px] mt-[-1px]">
              <span
                className={`w-[1.5px] h-[10px] bg-slate-700 dark:bg-slate-300 rounded-full origin-top transition-transform ${
                  isActive ? 'animate-[legSwing_0.25s_infinite_alternate_ease-in-out]' : '-rotate-6'
                }`}
              />
              <span
                className={`w-[1.5px] h-[10px] bg-slate-700 dark:bg-slate-300 rounded-full origin-top transition-transform ${
                  isActive ? 'animate-[legSwing_0.25s_infinite_alternate-reverse_ease-in-out]' : 'rotate-6'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Text Label */}
        <div
          className={`relative z-10 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-opacity duration-300 ${
            isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
          } ${
            disabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'
          }`}
          style={{ paddingLeft: '44px' }}
        >
          <span>{label}</span>
          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:translate-x-1" />
        </div>

        {/* Authenticating Text when active */}
        {isActive && (
          <div className="absolute right-4 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
            Authenticating...
          </div>
        )}
      </button>

      {/* Embedded Dynamic Keyframes for Stickman Walk Cycle */}
      <style>{`
        @keyframes legSwing {
          0% { transform: rotate(-28deg); }
          100% { transform: rotate(28deg); }
        }
        @keyframes armSwing {
          0% { transform: rotate(32deg); }
          100% { transform: rotate(-32deg); }
        }
      `}</style>
    </div>
  );
};
