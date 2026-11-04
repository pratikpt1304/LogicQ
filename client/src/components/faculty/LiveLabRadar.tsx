import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Flame,
  Search,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  User,
  Users,
  Wifi,
  X,
  Code2,
} from 'lucide-react';

export interface RadarStudent {
  id: string;
  fullName: string;
  prn: string;
  email: string;
  department?: string;
  totalPoints: number;
  currentStreak: number;
  tabSwitchCount: number;
  copyPasteAttempts: number;
  integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  statusCategory: 'CONSISTENT' | 'NEEDS_HELP' | 'INTEGRITY_FLAG';
  lastActiveMinutesAgo?: number;
  currentProblemTitle?: string;
  compileErrorsCount?: number;
  latestCode?: string;
  seatNumber?: string;
  state?: 'ALERT' | 'STUCK' | 'ACTIVE' | 'OFFLINE';
}

interface LiveLabRadarProps {
  students: RadarStudent[];
  sectionName?: string;
  onInspectStudent?: (studentId: string) => void;
}

export const LiveLabRadar: React.FC<LiveLabRadarProps> = ({
  students,
  sectionName = 'Current Lab Session',
  onInspectStudent,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'STUCK' | 'ALERTS'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<RadarStudent | null>(null);

  // Track acknowledged / reviewed cheating alerts in component state & persistent storage
  const [acknowledgedStudentIds, setAcknowledgedStudentIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('logicq_acknowledged_cheats');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleSelectSeat = (seat: RadarStudent) => {
    const key = (seat.prn || seat.id || '').toUpperCase();
    if (key) {
      setAcknowledgedStudentIds((prev) => {
        const next = new Set(prev);
        next.add(key);
        try {
          localStorage.setItem('logicq_acknowledged_cheats', JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
    }
    setSelectedSeat(seat);
  };

  const handleToggleAcknowledge = (studentKey: string) => {
    const key = studentKey.toUpperCase();
    setAcknowledgedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem('logicq_acknowledged_cheats', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Derive realistic workstation states
  const workstations = useMemo(() => {
    return students.map((s, index) => {
      const hasCheated =
        Number(s.tabSwitchCount || 0) > 0 ||
        Number(s.copyPasteAttempts || 0) > 0 ||
        s.integrityRisk === 'HIGH' ||
        s.integrityRisk === 'CRITICAL' ||
        s.integrityRisk === 'MODERATE';

      const isStuck = Number(s.compileErrorsCount || 0) >= 3;
      const isActive = !hasCheated && !isStuck && Number(s.totalPoints || 0) > 0;

      let state: 'ALERT' | 'STUCK' | 'ACTIVE' | 'OFFLINE';
      if (hasCheated) state = 'ALERT';
      else if (isActive) state = 'ACTIVE';
      else if (isStuck) state = 'STUCK';
      else state = 'OFFLINE';

      return {
        ...s,
        state,
      };
    });
  }, [students]);

  const filteredWorkstations = useMemo(() => {
    return workstations.filter((w) => {
      const matchSearch =
        search.trim() === '' ||
        w.fullName.toLowerCase().includes(search.toLowerCase()) ||
        w.prn.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filter === 'ACTIVE') return w.state === 'ACTIVE';
      if (filter === 'STUCK') return w.state === 'STUCK';
      if (filter === 'ALERTS') return w.state === 'ALERT';
      return true;
    });
  }, [workstations, search, filter]);

  const counts = useMemo(() => {
    return {
      active: workstations.filter((w) => w.state === 'ACTIVE').length,
      stuck: workstations.filter((w) => w.state === 'STUCK').length,
      alerts: workstations.filter((w) => w.state === 'ALERT').length,
      offline: workstations.filter((w) => w.state === 'OFFLINE').length,
    };
  }, [workstations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Status Bar */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE LAB RADAR • 60-SEAT REALTIME GRID</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--foreground)] tracking-tight">
              {sectionName} Live Telemetry
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] font-mono">
              Real-time student workstation monitor: detects compile loops, tab switches, and idle students.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {counts.active} Active
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {counts.stuck} Needs Help
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              {counts.alerts} Flagged
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/30 text-slate-400">
              {counts.offline} Offline
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              All Workstations ({workstations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              🟢 Active ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setFilter('STUCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'STUCK'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              🟡 Stuck / Compile Error ({counts.stuck})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ALERTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'ALERTS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              🚨 Proctoring Flags ({counts.alerts})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search student, PRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 60-Seat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredWorkstations.map((w) => {
          const studentKey = (w.prn || w.id || '').toUpperCase();
          const hasCheated =
            Number(w.tabSwitchCount || 0) > 0 ||
            Number(w.copyPasteAttempts || 0) > 0 ||
            w.integrityRisk === 'HIGH' ||
            w.integrityRisk === 'CRITICAL' ||
            w.integrityRisk === 'MODERATE';
          const isAcknowledged = acknowledgedStudentIds.has(studentKey);
          const isBlinkingAlert = hasCheated && !isAcknowledged;

          let cardStyle = 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700';
          let badge = (
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          );

          if (isBlinkingAlert) {
            cardStyle = 'border-rose-500 bg-rose-950/40 text-rose-100 hover:border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.45)] ring-2 ring-rose-500/60 animate-pulse';
            badge = <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>;
          } else if (hasCheated) {
            cardStyle = 'border-rose-500/50 bg-rose-950/20 text-rose-300 hover:border-rose-400 shadow-sm';
            badge = <span className="w-2 h-2 rounded-full bg-rose-500"></span>;
          } else if (w.state === 'ACTIVE') {
            cardStyle = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:border-emerald-500 shadow-sm';
            badge = <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>;
          } else if (w.state === 'STUCK') {
            cardStyle = 'border-amber-500/50 bg-amber-950/25 text-amber-200 hover:border-amber-500 shadow-md';
            badge = <span className="w-2 h-2 rounded-full bg-amber-400"></span>;
          }

          return (
            <div
              key={w.id}
              onClick={() => handleSelectSeat(w)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${cardStyle}`}
            >
              <div className="flex items-center justify-between">
                {/* Red Anti-Cheat Indicator LED Light */}
                {isBlinkingAlert ? (
                  <div className="flex items-center gap-1.5" title="🚨 CHEATING DETECTED! Click this box to inspect and stop alarm">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-90" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 shadow-[0_0_10px_#ef4444] border border-white" />
                    </span>
                    <span className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-wider animate-pulse">
                      CHEAT ALERT
                    </span>
                  </div>
                ) : hasCheated ? (
                  <div className="flex items-center gap-1.5" title="Cheating Detected (Inspected & Silenced by Faculty)">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/90 border border-rose-300 shadow-[0_0_6px_#f43f5e]" />
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-400/90 uppercase tracking-wider">
                      FLAGGED
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5" title="Anti-Cheat Indicator: Normal / Idle (Off)">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-red-950/80 border border-red-900/60 opacity-40 shadow-inner" />
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                      OFF
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  {badge}
                  <span className={`text-[10px] font-mono font-bold uppercase ${
                    hasCheated ? 'text-rose-400' :
                    w.state === 'ACTIVE' ? 'text-emerald-400' :
                    w.state === 'STUCK' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {hasCheated ? (isBlinkingAlert ? 'CHEATING' : 'REVIEWED') : w.state}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs truncate group-hover:text-white transition">
                  {w.fullName}
                </h4>
                <p className="font-mono text-[10px] text-[var(--muted-foreground)] truncate">
                  {w.prn}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                {w.copyPasteAttempts > 0 ? (
                  <span className="text-amber-400 font-bold" title="Copy-paste attempts detected">
                    📋 {w.copyPasteAttempts} paste{w.copyPasteAttempts > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-slate-400" title="Zero copy-paste attempts">
                    0 pastes
                  </span>
                )}
                {w.tabSwitchCount > 0 ? (
                  <span className="text-rose-400 font-bold" title="Tab switches detected">
                    ⚠️ {w.tabSwitchCount} tab{w.tabSwitchCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-emerald-400">0 tabs</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Workstation Drawer / Modal */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
                  {selectedSeat.fullName
                    ? selectedSeat.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'ST'}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)]">
                    {selectedSeat.fullName}
                  </h3>
                  <p className="font-mono text-xs text-[var(--muted-foreground)]">
                    {selectedSeat.prn} • {selectedSeat.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="text-[10px] text-[var(--muted-foreground)]">COPY-PASTE</div>
                <div className={`text-sm font-bold mt-0.5 ${selectedSeat.copyPasteAttempts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedSeat.copyPasteAttempts} Pastes
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="text-[10px] text-[var(--muted-foreground)]">STREAK</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">{selectedSeat.currentStreak} Days 🔥</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="text-[10px] text-[var(--muted-foreground)]">TAB SWITCHES</div>
                <div className={`text-sm font-bold mt-0.5 ${selectedSeat.tabSwitchCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedSeat.tabSwitchCount} Tabs
                </div>
              </div>
            </div>

            {/* Cheating Alarm Status Banner */}
            {selectedSeat && (Number(selectedSeat.tabSwitchCount || 0) > 0 || Number(selectedSeat.copyPasteAttempts || 0) > 0 || selectedSeat.integrityRisk === 'HIGH' || selectedSeat.integrityRisk === 'CRITICAL' || selectedSeat.integrityRisk === 'MODERATE') && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-semibold font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Cheating Alarm Silenced (Reviewed by Faculty)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAcknowledge(selectedSeat.prn || selectedSeat.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-mono text-[10px] font-bold border border-rose-500/30 transition cursor-pointer"
                >
                  {acknowledgedStudentIds.has((selectedSeat.prn || selectedSeat.id || '').toUpperCase())
                    ? 'Re-Arm Blinking Light'
                    : 'Silence Alert Light'}
                </button>
              </div>
            )}

            {/* Status Diagnostics */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Anti-Cheat Risk Level:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  selectedSeat.integrityRisk === 'CRITICAL' || selectedSeat.integrityRisk === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedSeat.integrityRisk}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Clipboard Copy-Paste Attempts:</span>
                <span className="font-bold text-[var(--foreground)]">{selectedSeat.copyPasteAttempts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Current Workstation Status:</span>
                <span className="font-bold text-indigo-400 uppercase">{selectedSeat.state}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setSelectedSeat(null);
                  if (onInspectStudent) onInspectStudent(selectedSeat.id);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Deep Inspect Code & Telemetry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
