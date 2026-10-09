import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownClockProps {
  initialSeconds?: number;
  targetDate?: string;
  label?: string;
  onExpire?: () => void;
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  initialSeconds,
  targetDate,
  label = 'Next Challenge in',
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (initialSeconds !== undefined) return initialSeconds;
    if (targetDate) {
      const diff = Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000));
      return diff;
    }
    return 0;
  });

  useEffect(() => {
    if (initialSeconds !== undefined) {
      setSecondsLeft(initialSeconds);
    }
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 border border-white/[0.08] text-xs font-mono font-semibold text-slate-300">
      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      <span className="text-slate-400 hidden sm:inline">{label}:</span>
      <span className="text-cyan-300 font-bold tracking-wider">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
      <span className="text-[10px] text-slate-500 font-normal">IST</span>
    </div>
  );
};
