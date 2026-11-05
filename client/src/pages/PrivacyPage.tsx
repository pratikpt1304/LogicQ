import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  EyeOff,
  UserCheck,
  Ban,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CameraOff,
  FileCode2,
  HardDriveDownload,
  Building2,
  Check,
  ChevronRight,
} from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activePillar, setActivePillar] = useState<'collection' | 'visibility' | 'proctoring' | 'ownership'>('collection');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn font-sans">
      {/* 1. TOP NAV BREADCRUMB / BACK */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          <span>Profile Settings</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. APPLE HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-10 shadow-xs">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Trust & Privacy Standard</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Privacy is a fundamental right. Especially in academics.
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            LogicQ is designed to help you master C programming without compromise. We collect only what is strictly necessary to evaluate your code, certify your marks, and protect your academic identity.
          </p>
        </div>

        {/* 4 APPLE NUTRITION-LABEL HIGHLIGHT TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Confidential PRN</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your Roll Number & contact info are strictly private and never published publicly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <EyeOff className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Anonymous Standing</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Classmates only see your chosen Display Handle. Your real identity remains hidden.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <CameraOff className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Zero Surveillance</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              No webcam, microphone, or invasive screen-capturing software is ever used.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Ban className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Zero Trackers or Ads</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Zero monetization or third-party advertising cookies. 100% academic focus.
            </p>
          </div>
        </div>
      </div>

      {/* 3. APPLE SEGMENTED POLICY EXPLORER (1-CLICK INTERACTIVE) */}
      <div className="space-y-4">
        {/* Apple Segmented Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActivePillar('collection')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center justify-center gap-1.5 ${
              activePillar === 'collection'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>1. What We Collect</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('visibility')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center justify-center gap-1.5 ${
              activePillar === 'visibility'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. Who Sees What</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('proctoring')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center justify-center gap-1.5 ${
              activePillar === 'proctoring'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            <span>3. Exam Proctoring</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('ownership')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center justify-center gap-1.5 ${
              activePillar === 'ownership'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-purple-500" />
            <span>4. Ownership & Erase</span>
          </button>
        </div>

        {/* Apple Inset Grouped Detail Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs">
          {activePillar === 'collection' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  <span>Data Collected Strictly for Academic Grading</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every data attribute collected has a direct academic purpose for Sanjivani University grading and authentication.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>PRN / Student Roll Number</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Stored securely to bind and certify your official practical exam marks to your university academic transcript.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Institutional Email Address</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Used solely for passwordless OTP verification, password resets, and critical test timetable notifications.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Academic Cohort (Dept, Year, Div)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Maps you directly to your faculty's assigned classroom test schedules and lab coursework rosters.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>C Programming Submissions</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Compiled in isolated GCC 14 sandboxes to calculate runtime execution speeds, memory safety, and unit test accuracy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activePillar === 'visibility' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-emerald-500" />
                  <span>Strict Role-Based Access Boundaries</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data access is segmented by privilege. Classmates cannot see your personal identifiers or raw scores.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <div className="space-y-1 text-xs">
                    <strong className="text-slate-900 dark:text-white block">Other Students / Peers</strong>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      Only see your chosen Display Handle or Avatar on the public leaderboard. They can <em>never</em> see your PRN, phone number, bound email, or private code solutions.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  <div className="space-y-1 text-xs">
                    <strong className="text-slate-900 dark:text-white block">Assigned Course Faculty</strong>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      Can view PRN, attendance, and exam test submissions for their assigned section rosters to verify practical marks and generate final semester grade reports.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <div className="space-y-1 text-xs">
                    <strong className="text-slate-900 dark:text-white block">Platform Administrators</strong>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      Access is fully audited and restricted strictly to infrastructure monitoring, resolving technical judge exceptions, and managing faculty credentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePillar === 'proctoring' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-500" />
                  <span>Fair Evaluation Without Intrusive Surveillance</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We believe in fair testing without violating personal boundaries or requiring webcam access.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block">Browser Tab Switches & Fullscreen Exits</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Recorded only during active, timed proctored exam sessions</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                    Logged
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block">Abrupt Code Bursts (Copy-Paste Prevention)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Monitors sudden insertions to ensure genuine typing in exam mode</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    Rate Tracked
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">Webcam / Audio / Video Recording</span>
                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">No camera or mic access is requested or permitted</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                    Zero Intrusion
                  </span>
                </div>
              </div>
            </div>
          )}

          {activePillar === 'ownership' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDriveDownload className="w-5 h-5 text-purple-500" />
                  <span>Full Ownership, Portability & Data Erasure</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You own your code. You can download all your work or permanently delete your account at any time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <Download className="w-5 h-5 text-indigo-500" />
                  <strong className="text-slate-900 dark:text-white block">1-Click JSON Export</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Export your complete programming trajectory, verified solutions, and test logs directly from Profile Settings.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <HardDriveDownload className="w-5 h-5 text-emerald-500" />
                  <strong className="text-slate-900 dark:text-white block">Google Drive Backup</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Sync and back up all your C source code files directly to your personal Google Drive with 1 click.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <strong className="text-slate-900 dark:text-white block">Complete Account Wipe</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Permanently frees your PRN, revokes credentials, and wipes personal contact records across Firestore.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. APPLE ACTION CARD (MANAGE PROFILE & PRIVACY) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Need to update your academic visibility or download records?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Change your public Display Name, bind institutional email, or trigger a full data export in Profile Settings.
          </p>
        </div>

        <Link
          to="/profile"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
        >
          <span>Manage Profile & Privacy</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
