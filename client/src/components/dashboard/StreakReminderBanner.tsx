import React, { useState } from 'react';
import { Bell, Check, Flame, Mail, Send, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface StreakReminderBannerProps {
  currentStreak: number;
  userEmail?: string;
  userName?: string;
}

export const StreakReminderBanner: React.FC<StreakReminderBannerProps> = ({
  currentStreak,
  userEmail,
  userName = 'Coder',
}) => {
  const [isEmailSubscribed, setIsEmailSubscribed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('logicq_streak_email_reminder') === 'true';
    } catch {
      return false;
    }
  });

  const handleWhatsAppShare = () => {
    const text = `🔥 I am on a ${currentStreak}-Day C Programming Streak on LogicQ! 🚀 Solve today's university coding challenge with me: https://logicq-clanguage.web.app/daily`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp to share and set reminder!');
  };

  const handleToggleEmailReminder = () => {
    const next = !isEmailSubscribed;
    setIsEmailSubscribed(next);
    try {
      localStorage.setItem('logicq_streak_email_reminder', String(next));
    } catch {}

    if (next) {
      toast.success(
        `Morning streak reminder scheduled! You'll receive daily challenges at 8:00 AM at ${userEmail || 'your registered email'}.`
      );
    } else {
      toast.info('Morning email reminders turned off.');
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-transparent space-y-3 shadow-md animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--text-main)] font-mono">
                {currentStreak > 0 ? `${currentStreak}-Day Streak Active!` : 'Start Your C Programming Streak Today!'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                DAILY REMINDERS
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Never miss a daily point: get WhatsApp alerts or an 8:00 AM challenge digest in your inbox.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition shadow-sm cursor-pointer"
            title="Share your streak on WhatsApp & challenge classmates"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp Reminder</span>
          </button>

          {/* Email Reminder Button */}
          <button
            type="button"
            onClick={handleToggleEmailReminder}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition shadow-sm cursor-pointer border ${
              isEmailSubscribed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] border-[var(--border-line)]'
            }`}
            title="Toggle daily morning 8:00 AM email reminder"
          >
            {isEmailSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email 8:00 AM (Active)</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Email Digest</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
