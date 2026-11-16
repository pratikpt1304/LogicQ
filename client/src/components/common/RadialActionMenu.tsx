import React, { useState, useRef, useEffect } from 'react';
import { GalaxyButton } from './GalaxyButton.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Flag,
  BookOpen,
  MessageCircle,
  Mail,
  Code2,
  Sun,
  Moon,
  Sparkles,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { RaiseIssueModal } from './RaiseIssueModal.js';
import { AiTutorChatModal } from './AiTutorChatModal.js';

interface RadialActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  angle: number; // in degrees (-90 to -180 relative to bottom-right)
  onClick: () => void;
}

export const RadialActionMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(() => {
    try {
      return localStorage.getItem('logicq_radial_guide_seen_v1') === 'true';
    } catch {
      return false;
    }
  });

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Hidden in exam workspaces, login/verify, and strictly hidden for Admin/Faculty and Admin portal routes
  const isExamPage = location.pathname.startsWith('/exam');
  const isLoginOrVerify = location.pathname === '/login' || location.pathname.startsWith('/verify');
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/faculty');
  const isAdminOrFaculty = Boolean(
    user?.role === 'ADMIN' ||
    user?.role === 'FACULTY' ||
    user?.email?.toLowerCase() === 'logicqarena@gmail.com' ||
    user?.email?.toLowerCase() === 'hariprasathset@sanjivani.edu.in' ||
    user?.prn === 'LOGICQARENA'
  );

  // Auto-show guided intro once for every student (1.2s delay after page load)
  useEffect(() => {
    if (!hasSeenGuide && !isOpen && !isExamPage && !isLoginOrVerify && !isAdminOrFaculty) {
      const timer = setTimeout(() => {
        setShowFeatureGuide(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [hasSeenGuide, isOpen, isExamPage, isLoginOrVerify, isAdminOrFaculty]);

  const dismissGuide = (openMenu = false) => {
    setShowFeatureGuide(false);
    setHasSeenGuide(true);
    try {
      localStorage.setItem('logicq_radial_guide_seen_v1', 'true');
    } catch {}
    if (openMenu) {
      playRadialChime(true);
      setIsOpen(true);
    }
  };

  // Synthesize tactile micro-audio click
  const playRadialChime = (opening: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      if (opening) {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
      } else {
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
      }

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  };

  const handleToggle = () => {
    if (showFeatureGuide) {
      dismissGuide(false);
    }
    playRadialChime(!isOpen);
    setIsOpen(!isOpen);
  };

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user || isAdminOrFaculty || isAdminRoute || isExamPage || isLoginOrVerify) return null;

  const radius = 114; // distance of petals from center in pixels

  const rawActions: Omit<RadialActionItem, 'angle'>[] = [
    {
      id: 'ai-tutor',
      label: 'AI C Mentor',
      icon: <Sparkles className="w-4 h-4 text-white" />,
      bgClass: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/35',
      onClick: () => {
        setIsOpen(false);
        setIsAiTutorOpen(true);
      },
    },
    {
      id: 'raise-issue',
      label: 'Report Problem',
      icon: <Flag className="w-4 h-4 text-white" />,
      bgClass: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/35',
      onClick: () => {
        setIsOpen(false);
        setIsRaiseModalOpen(true);
      },
    },
    {
      id: 'compiler',
      label: 'C Scratchpad',
      icon: <Code2 className="w-4 h-4 text-white" />,
      bgClass: 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/35',
      onClick: () => {
        setIsOpen(false);
        navigate('/compiler');
      },
    },
    {
      id: 'whatsapp-help',
      label: 'Faculty WhatsApp',
      icon: <MessageCircle className="w-4 h-4 text-white" />,
      bgClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/35',
      onClick: () => {
        setIsOpen(false);
        const studentName = user?.fullName || user?.displayName || user?.username || 'Student';
        const prn = user?.prn || 'N/A';
        const dept = user?.department || 'N/A';
        const whatsappText = `Respected Faculty,\n\nI am contacting you regarding academic support on the LogicQ platform.\n\nStudent Name: ${studentName}\nPRN: ${prn}\nDepartment: ${dept}\n\nQuery / Description:\n[Please enter details of your question or issue here]\n\nRegards,\n${studentName}`;
        window.open(`https://wa.me/919834620537?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener,noreferrer');
      },
    },
    {
      id: 'faculty-email',
      label: 'Faculty Email',
      icon: <Mail className="w-4 h-4 text-white" />,
      bgClass: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/35',
      onClick: () => {
        setIsOpen(false);
        const studentName = user?.fullName || user?.displayName || user?.username || 'Student';
        const prn = user?.prn || 'N/A';
        const dept = user?.department || 'N/A';
        const subject = encodeURIComponent(`[LogicQ Academic Support] Query from ${studentName} (${prn})`);
        const body = encodeURIComponent(
          `Respected Faculty,\n\nI am contacting you regarding academic support on the LogicQ platform.\n\nStudent Name: ${studentName}\nPRN: ${prn}\nDepartment: ${dept}\n\nQuery / Description:\n[Please enter details of your question or issue here]\n\nRegards,\n${studentName}`
        );
        window.location.href = `mailto:logicqarena@gmail.com?subject=${subject}&body=${body}`;
      },
    },
    {
      id: 'student-guide',
      label: 'Student Manual',
      icon: <BookOpen className="w-4 h-4 text-white" />,
      bgClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/35',
      onClick: () => {
        setIsOpen(false);
        window.open('/student-guide.html', '_blank', 'noopener,noreferrer');
      },
    },
  ];

  // Dynamically distribute evenly in the upper-left quadrant from -90° (Straight Up) to -180° (Straight Left)
  // Ensures ALL bubbles move leftwards/upwards and NEVER overflow off the right screen edge
  const actions: RadialActionItem[] = rawActions.map((item, index) => {
    const step = rawActions.length > 1 ? 90 / (rawActions.length - 1) : 0;
    const angle = -90 - index * step;
    return { ...item, angle };
  });

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-6 z-[9999] select-none"
    >
      {/* 360 Radial Pop-Out Bubbles */}
      {actions.map((act, idx) => {
        const rad = (act.angle * Math.PI) / 180;
        const x = Math.round(radius * Math.cos(rad));
        const y = Math.round(radius * Math.sin(rad));
        const delay = isOpen ? idx * 45 : (actions.length - idx) * 30;

        return (
          <div
            key={act.id}
            className="absolute right-0 bottom-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              transform: isOpen
                ? `translate(${x}px, ${y}px) scale(1)`
                : 'translate(0px, 0px) scale(0)',
              opacity: isOpen ? 1 : 0,
              transitionDelay: `${delay}ms`,
            }}
          >
            <div className="relative group pointer-events-auto">
              <button
                type="button"
                onClick={act.onClick}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-white/25 ${act.bgClass}`}
                title={act.label}
                aria-label={act.label}
              >
                {act.icon}
              </button>

              {/* Tooltip Pill */}
              <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-slate-900/90 dark:bg-slate-800/95 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 backdrop-blur-md">
                {act.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* 1-Time Onboarding Feature Spotlight Guide */}
      <AnimatePresence>
        {showFeatureGuide && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[350px] max-w-[360px] max-h-[calc(100vh-7rem)] rounded-3xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-indigo-200/90 dark:border-indigo-800/90 shadow-[0_20px_60px_-10px_rgba(79,70,229,0.35)] p-4 sm:p-5 z-[10000] text-slate-800 dark:text-slate-100 flex flex-col"
          >
            {/* Pointer arrow pointing to the FAB button */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-indigo-200/90 dark:border-indigo-800/90 rotate-45 shadow-sm" />

            {/* Header Badge & Close */}
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                <Sparkles className="w-3 h-3" />
                What's New in LogicQ
              </span>
              <button
                type="button"
                onClick={() => dismissGuide(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight shrink-0">
              Student Quick Hub 🚀
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-2.5 leading-normal shrink-0">
              Instant 1-tap support & tools while coding:
            </p>

            {/* 5 Features Breakdown (Compact & Scroll-safe) */}
            <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-0.5 mb-3 select-none">
              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">AI C Mentor</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">24/7 Socratic C11 tutor & memory hints</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-100/80 dark:border-cyan-900/40">
                <div className="w-6 h-6 rounded-lg bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/30">
                  <Code2 className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">C Scratchpad</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Online GCC 14 compiler to test arbitrary code</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100/80 dark:border-rose-900/40">
                <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/30">
                  <Flag className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Report Problem</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Flag question doubts directly to faculty</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/40">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                  <MessageCircle className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Faculty WhatsApp</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">1-tap chat with Sanjivani course faculty</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100/80 dark:border-amber-900/40">
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                  <BookOpen className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Student Manual</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">20-Mark CIE coursework guidelines & rubrics</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => dismissGuide(false)}
                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => dismissGuide(true)}
                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Explore Hub
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center 3D Flip Neumorphic Trigger Bubble */}
      <div className="relative">
        {/* Pulsing attention ring if user hasn't seen the guide */}
        {!hasSeenGuide && !isOpen && (
          <>
            <span className="absolute -inset-1.5 rounded-full bg-indigo-500 opacity-75 animate-ping pointer-events-none" />
            <span className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 opacity-30 blur-md pointer-events-none" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500 text-white shadow-md animate-bounce pointer-events-none z-10 border border-white">
              NEW
            </span>
          </>
        )}

        <GalaxyButton
          onClick={handleToggle}
          variant="circle"
          title={isOpen ? 'Close Quick Menu' : 'Quick Action Radial Menu'}
          ariaLabel="Toggle Quick Actions Radial Menu"
          className="shadow-2xl"
        >
          <span
            className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] inline-flex items-center justify-center text-white"
            style={{ transform: isOpen ? 'rotate(135deg)' : 'rotate(0deg)' }}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </span>
        </GalaxyButton>
      </div>

      {/* Raise Issue Modal */}
      <RaiseIssueModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        questionTitle="General Platform / Session Inquiry"
        questionId="general-inquiry"
        contextType="PRACTICE"
      />

      {/* LogicQ Socratic AI Mentor Modal (Dashboard Only) */}
      <AiTutorChatModal
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
      />
    </div>
  );
};
