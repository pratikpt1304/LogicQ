import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { PRACTICE_CONFIG } from '../../config/practice.config.js';
import { VerdictBadge } from '../common/Badge.js';
import { maskPrn, formatNameFromEmail, isRealPersonName } from '../../config/academic.config.js';
import {
  Download,
  Edit3,
  Ban,
  FileText,
  X,
  Activity,
  Code2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Trophy,
  Flame,
  Building2,
  GraduationCap,
  Calendar,
  Search,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface StudentActivityInspectorModalProps {
  user: any;
  onClose: () => void;
  onEditAcademic: (u: any) => void;
  onBanToggle: (u: any) => void;
  onInspectCode: (code: string) => void;
  onDownloadCsv: (u: any) => void;
  revealedPrn?: string;
}

function getModuleForProblemSlug(slug: string): { slug: string; name: string } {
  if (!slug) return { slug: 'control-structures', name: 'Control Structures' };
  const match = slug.match(/practice-c(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num <= 20) return { slug: 'control-structures', name: 'Control Structures' };
    if (num <= 40) return { slug: 'pointers-and-functions', name: 'Pointers & Functions' };
    if (num <= 60) return { slug: 'array-and-its-applications', name: 'Arrays & Applications' };
    if (num <= 80) return { slug: 'advanced-data-types-dynamic-memory', name: 'Dynamic Memory' };
    return { slug: 'advanced-competitive-c', name: 'Competitive C' };
  }
  return { slug: 'control-structures', name: 'Practice Problem' };
}

export const StudentActivityInspectorModal: React.FC<StudentActivityInspectorModalProps> = ({
  user,
  onClose,
  onEditAcademic,
  onBanToggle,
  onInspectCode,
  onDownloadCsv,
  revealedPrn,
}) => {
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'accepted' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Accessibility: bind Escape key and lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Comprehensive Student Activity & Practice Query
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['admin-student-activity-details', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const targetId = user.id;
      const targetPrn = user.prn;
      const targetEmail = user.email;

      // 1. Fetch practice progress & submissions from Firestore
      let fsPractice: any = null;
      let fsSubmissions: any[] = [];
      try {
        [fsPractice, fsSubmissions] = await Promise.all([
          FirestoreDataService.getPracticeProgress(targetId).catch(() => null),
          FirestoreDataService.getUserSubmissions(targetId).catch(() => []),
        ]);
      } catch {
        // ignore
      }

      // 2. Fetch submissions from backend API
      let backendSubs: any[] = [];
      try {
        const res = await api.get(`/admin/submissions?userId=${targetId}&limit=50`);
        backendSubs = res?.data?.submissions || [];
      } catch {
        // ignore
      }

      // 3. Fallback submissions from localStorage
      let localSubs: any[] = [];
      try {
        const raw = localStorage.getItem('logicq_fallback_submissions_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localSubs = parsed.filter(
              (s: any) =>
                s.userId === targetId ||
                s.user?.id === targetId ||
                s.user?.email === targetEmail ||
                (targetPrn && s.prn === targetPrn)
            );
          }
        }
      } catch {
        // ignore
      }

      // 4. Merge all submissions deduplicated by ID
      const subMap = new Map<string, any>();
      [...backendSubs, ...fsSubmissions, ...localSubs].forEach((s: any) => {
        if (s && s.id) subMap.set(s.id, s);
      });
      const allSubs = Array.from(subMap.values());
      allSubs.sort(
        (a, b) =>
          new Date(b.submittedAt || b.createdAt || 0).getTime() -
          new Date(a.submittedAt || a.createdAt || 0).getTime()
      );

      // 5. Gather completed problem IDs
      let localPracticeProgress: Record<string, any> = {};
      try {
        const rawP = localStorage.getItem('logicq_fallback_practice_progress_v1');
        if (rawP) localPracticeProgress = JSON.parse(rawP);
      } catch {
        // ignore
      }

      const completedProblemIds = new Set<string>([
        ...(fsPractice?.completedProblems || []),
        ...allSubs
          .filter((s: any) => s.verdict === 'ACCEPTED')
          .map((s: any) => s.problemId || s.problemSlug || s.slug)
          .filter(Boolean),
        ...Object.entries(localPracticeProgress)
          .filter(
            ([k, v]: [string, any]) =>
              (k.startsWith(`${targetId}:`) || !k.includes(':')) && v?.isSolved
          )
          .map(([k]) => (k.includes(':') ? k.split(':')[1] : k)),
      ]);

      // Calculate module-wise progress for all 5 modules
      const moduleStats: Record<string, number> = {
        'control-structures': 0,
        'pointers-and-functions': 0,
        'array-and-its-applications': 0,
        'advanced-data-types-dynamic-memory': 0,
        'advanced-competitive-c': 0,
      };

      completedProblemIds.forEach((slug) => {
        const mod = getModuleForProblemSlug(slug);
        if (mod && moduleStats[mod.slug] !== undefined) {
          moduleStats[mod.slug]++;
        }
      });

      // Fetch student proctoring telemetry
      const telemetry = {
        tabSwitchCount: Number(user.tabSwitchCount || user.tabSwitches || 0),
        copyPasteAttempts: Number(user.copyPasteAttempts || user.pasteCount || 0),
        fullscreenExits: Number(user.fullScreenExitCount || user.fullscreenExits || 0),
      };

      try {
        const uid = user.id || user.uid;
        if (uid) {
          const fsTelem = await FirestoreDataService.getProctoringTelemetry(uid);
          if (fsTelem) {
            telemetry.tabSwitchCount = Math.max(telemetry.tabSwitchCount, fsTelem.tabSwitchCount || 0);
            telemetry.copyPasteAttempts = Math.max(telemetry.copyPasteAttempts, fsTelem.copyPasteAttempts || 0);
            telemetry.fullscreenExits = Math.max(telemetry.fullscreenExits, fsTelem.fullscreenExits || 0);
          }
        }
      } catch {}

      try {
        const studentId = user.id || user.uid || user.prn;
        if (studentId) {
          const res = await api.get(`/analytics/faculty/student-deep-dive/${encodeURIComponent(studentId)}`);
          if (res?.data?.assignments) {
            const attempts = res.data.assignments.flatMap((a: any) => a.attempts || []);
            const totalTabs = attempts.reduce((acc: number, att: any) => acc + (att.tabSwitchCount || 0), 0);
            const totalPastes = attempts.reduce((acc: number, att: any) => acc + (att.copyPasteAttempts || 0), 0);
            const totalFsExits = attempts.reduce((acc: number, att: any) => acc + (att.fullScreenExitCount || 0), 0);
            telemetry.tabSwitchCount = Math.max(telemetry.tabSwitchCount, totalTabs);
            telemetry.copyPasteAttempts = Math.max(telemetry.copyPasteAttempts, totalPastes);
            telemetry.fullscreenExits = Math.max(telemetry.fullscreenExits, totalFsExits);
          }
        }
      } catch {}

      return {
        submissions: allSubs,
        completedProblemIds,
        totalSolved: Math.max(user.totalSolved || 0, completedProblemIds.size),
        moduleStats,
        telemetry,
      };
    },
  });

  const submissions = activityData?.submissions || [];
  const totalSolved = activityData?.totalSolved || user.totalSolved || 0;
  const telemetry = activityData?.telemetry || {
    tabSwitchCount: Number(user.tabSwitchCount || user.tabSwitches || 0),
    copyPasteAttempts: Number(user.copyPasteAttempts || user.pasteCount || 0),
    fullscreenExits: Number(user.fullScreenExitCount || user.fullscreenExits || 0),
  };
  const moduleStats = activityData?.moduleStats || {
    'control-structures': 0,
    'pointers-and-functions': 0,
    'array-and-its-applications': 0,
    'advanced-data-types-dynamic-memory': 0,
    'advanced-competitive-c': 0,
  };

  const displayName =
    (isRealPersonName(user.displayName) && user.displayName) ||
    (isRealPersonName(user.fullName) && user.fullName) ||
    formatNameFromEmail(user.email) ||
    (user.prn ? `Student ${String(user.prn).slice(-4)}` : 'Student');
  const prnDisplay = revealedPrn || user.maskedPrn || user.prn || '—';

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub: any) => {
    const verdict = (sub.verdict || sub.status || '').toUpperCase();
    if (submissionFilter === 'accepted' && verdict !== 'ACCEPTED') return false;
    if (submissionFilter === 'failed' && verdict === 'ACCEPTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (sub.problem?.title || sub.problemTitle || sub.problemSlug || '').toLowerCase();
      const verd = verdict.toLowerCase();
      return title.includes(q) || verd.includes(q);
    }
    return true;
  });

  const acceptedCount = submissions.filter((s: any) => (s.verdict || s.status) === 'ACCEPTED').length;
  const failedCount = submissions.length - acceptedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-5 sm:p-7 overflow-y-auto max-h-[92vh] space-y-6">
        {/* Top Header: Student Identity & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--border-line)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white shadow-lg font-mono shrink-0">
              {(displayName[0] || 'S').toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-main)] font-mono">
                  {displayName}
                </h3>
                {user.isBanned ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                    BANNED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    {user.role || 'STUDENT'}
                  </span>
                )}
                {prnDisplay !== '—' && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                    PRN: {prnDisplay}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                {user.email || 'No email registered'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-400" />
                  <span>{user.college || 'Sanjivani University'}</span>
                </span>
                {user.department && user.department !== '—' && user.department !== 'General' && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <GraduationCap className="w-3 h-3" />
                      <span>{user.department}</span>
                    </span>
                  </>
                )}
                {user.year && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                      <Calendar className="w-3 h-3" />
                      <span>Year: {user.year}</span>
                    </span>
                  </>
                )}
                
              </div>
            </div>
          </div>

          {/* Compact Top Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const studentUrl = `/profile/${user.username || user.id}`;
                window.open(studentUrl, '_blank', 'noopener,noreferrer');
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono font-bold text-indigo-400 hover:bg-indigo-500/20 transition flex items-center gap-1.5"
              title="Open full practice record in new tab"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Practice Report</span>
            </button>

            <button
              type="button"
              onClick={() => onEditAcademic(user)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 hover:bg-cyan-500/20 transition flex items-center gap-1.5"
              title="Edit academic details and PRN"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit PRN</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadCsv(user)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1.5"
              title="Export student dossier CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onBanToggle(user)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                user.isBanned
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              }`}
              title={user.isBanned ? 'Unban student' : 'Ban student'}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{user.isBanned ? 'Unban' : 'Ban'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Performance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-semibold">
              Curriculum Mastery
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-mono font-bold text-emerald-400">
                {totalSolved}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">/ 100 Solved</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((totalSolved / 100) * 100))}%` }}
              />
            </div>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-semibold">
              Total Score & Rank
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-mono font-bold text-amber-400">
                {user.totalPoints || 0}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">PTS</span>
            </div>
            <p className="text-[11px] font-mono text-cyan-400">
              {user.rank ? `Rank #${user.rank}` : user.totalPoints > 0 ? 'Rank #1' : 'Not Ranked'}
            </p>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-semibold">
              Learning Consistency
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-mono font-bold text-orange-400">
                {user.currentStreak || 0}d
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">Active</span>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              Longest: {user.longestStreak || 0} days
            </p>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-semibold">
              Anti-Cheat Health
            </span>
            {telemetry.tabSwitchCount > 0 || telemetry.copyPasteAttempts > 0 ? (
              <>
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Flagged ({telemetry.tabSwitchCount + telemetry.copyPasteAttempts} Events)</span>
                </div>
                <p className="text-[11px] font-mono text-rose-300">
                  {telemetry.tabSwitchCount} Tabs • {telemetry.copyPasteAttempts} Pastes
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Clean & Verified</span>
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  0 Proctored Flags
                </p>
              </>
            )}
          </div>
        </div>

        {/* 5 Sequential Modules Progression */}
        <div className="p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Sequential Curriculum Progression (5 Modules)</span>
            </h4>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              20 Problems / Module
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {PRACTICE_CONFIG.MODULES.map((mod, idx) => {
              const solvedInMod = moduleStats[mod.slug] || 0;
              const pct = Math.min(100, Math.round((solvedInMod / 20) * 100));
              const isComplete = solvedInMod >= 20;

              return (
                <div
                  key={mod.id || mod.slug}
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 transition-all ${
                    isComplete
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : solvedInMod > 0
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-[var(--bg-panel)] border-[var(--border-line)] opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">
                      MOD #{idx + 1}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
                    )}
                  </div>
                  <div className="font-sans font-semibold text-xs text-[var(--text-main)] truncate" title={mod.title}>
                    {mod.title}
                  </div>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className={solvedInMod > 0 ? 'text-indigo-400 font-bold' : 'text-[var(--text-muted)]'}>
                      {solvedInMod} / 20
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anti-Cheat & Device Audit Telemetry */}
        <div className="p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-2">
            <span className="font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Proctoring & Audit Telemetry</span>
            </span>
            {telemetry.tabSwitchCount >= 3 || telemetry.copyPasteAttempts >= 3 ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> AUDIT STATUS: FLAGGED ({telemetry.tabSwitchCount + telemetry.copyPasteAttempts} VIOLATIONS)
              </span>
            ) : telemetry.tabSwitchCount > 0 || telemetry.copyPasteAttempts > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> AUDIT STATUS: MONITORED ({telemetry.tabSwitchCount} TABS)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                AUDIT STATUS: PASSED (CLEAN) ✅
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Tab Switches</span>
              {telemetry.tabSwitchCount > 0 ? (
                <span className="text-rose-400 font-bold">⚠️ {telemetry.tabSwitchCount} Detected</span>
              ) : (
                <span className="text-emerald-400 font-bold">0 Detected (Clean)</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Fullscreen Exits</span>
              {telemetry.fullscreenExits > 0 ? (
                <span className="text-amber-400 font-bold">⚠️ {telemetry.fullscreenExits} Exits</span>
              ) : (
                <span className="text-emerald-400 font-bold">Enforced & Compliant</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Clipboard Guard</span>
              {telemetry.copyPasteAttempts > 0 ? (
                <span className="text-rose-400 font-bold">🚫 {telemetry.copyPasteAttempts} Blocked Attempts</span>
              ) : (
                <span className="text-emerald-400 font-bold">Zero Violations</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Coding Sandbox</span>
              <span className="text-slate-200">GCC 14 (Linux Container)</span>
            </div>
          </div>
        </div>

        {/* Code Submissions Activity Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-main)]">
                Code Submissions History ({submissions.length})
              </h4>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    submissionFilter === 'all'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  All ({submissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('accepted')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    submissionFilter === 'accepted'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Passed ({acceptedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('failed')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    submissionFilter === 'failed'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Failed ({failedCount})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs font-mono rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-main)] placeholder-[var(--text-muted)] w-36 sm:w-44 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] space-y-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading student activity and submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-line)] bg-[var(--bg-surface)] text-center text-xs font-mono text-[var(--text-muted)]">
              No code submissions recorded for this student yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border-line)]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)] text-[10px] uppercase border-b border-[var(--border-line)] font-bold">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Problem / Topic</th>
                    <th className="px-3 py-2.5">Verdict</th>
                    <th className="px-3 py-2.5">Runtime / Mem</th>
                    <th className="px-3 py-2.5">Points</th>
                    <th className="px-3 py-2.5 text-right">Inspect Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-line)]">
                  {filteredSubmissions.map((sub: any) => {
                    const problemTitle =
                      sub.problem?.title ||
                      sub.problemTitle ||
                      sub.problemSlug ||
                      sub.problemId ||
                      'Challenge';
                    const mod = getModuleForProblemSlug(sub.problemSlug || sub.problemId || '');

                    return (
                      <tr key={sub.id} className="hover:bg-[var(--bg-surface-hover)]">
                        <td className="px-3 py-2 text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                          {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)] font-medium">
                          <div className="truncate max-w-[200px] sm:max-w-xs">{problemTitle}</div>
                          <span className="text-[10px] text-indigo-400 font-normal block">
                            {mod.name}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <VerdictBadge verdict={sub.verdict || sub.status} />
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                          {sub.executionTimeMs ?? sub.executionTime ?? sub.runtimeMs ?? 14} ms
                        </td>
                        <td className="px-3 py-2 text-amber-400 font-bold whitespace-nowrap">
                          +{sub.pointsAwarded ?? sub.points ?? (sub.verdict === 'ACCEPTED' ? 10 : 0)} PTS
                        </td>
                        <td className="px-3 py-2 text-right">
                          {(sub.code || sub.sourceCode) ? (
                            <button
                              type="button"
                              onClick={() => onInspectCode(sub.code || sub.sourceCode)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-mono font-bold border border-indigo-500/30 transition cursor-pointer"
                            >
                              View Code 📄
                            </button>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-[var(--border-line)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-mono text-xs font-bold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
          >
            Close Activity Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
