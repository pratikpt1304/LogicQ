import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  formatOwnIdentityLabel,
  formatPublicDisplayName,
} from '../config/academic.config.js';
import {
  Trophy,
  Flame,
  GraduationCap,
  Calendar,
  UserCheck,
  CheckCircle2,
  Search,
  Sparkles,
  Users,
  Medal,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overall' | 'today'>('overall');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const queryParams = new URLSearchParams();
  queryParams.set('tab', activeTab);
  if (departmentFilter && departmentFilter !== 'ALL') {
    queryParams.set('department', departmentFilter);
  }
  if (yearFilter && yearFilter !== 'ALL') {
    queryParams.set('year', yearFilter);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab, departmentFilter, yearFilter],
    queryFn: () => {
      const qs = queryParams.toString();
      return api.get(`/leaderboard${qs ? `?${qs}` : ''}`);
    },
  });

  const rankedUsers: any[] = data?.data?.leaderboard || [];
  const pinnedOwnRow = data?.data?.pinnedOwnRow || null;
  const challenge = data?.data?.challenge || null;
  const totalSolvers = data?.data?.totalSolvers ?? rankedUsers.length;
  const isDailyPaused = Boolean(data?.data?.dailyChallengePaused || data?.data?.paused);

  const formatPoints = (val: any) => {
    if (val === null || val === undefined) return '0 PTS';
    const str = String(val).trim();
    const cleaned = str.replace(/(\s*pts)+$/i, '').trim();
    return `${cleaned || '0'} PTS`;
  };

  const getDisplayName = (u: any) => {
    if (!u) return 'Student';
    const isMe = Boolean(u.isCurrentUser || (currentUser && (u.id === currentUser.id || u.userId === currentUser.id)));
    if (isMe) {
      const myName = currentUser?.fullName || currentUser?.displayName;
      if (myName && !myName.includes('••••••••') && !myName.includes(' • ')) {
        return myName.trim();
      }
    }

    const candidates = [u.displayName, u.name, u.fullName, u.username];
    for (const cand of candidates) {
      if (typeof cand === 'string' && cand.trim().length > 0) {
        const trimmed = cand.trim();
        if (!trimmed.includes('••••••••') && !trimmed.includes(' • ')) {
          return trimmed;
        }
      }
    }

    if (u.publicDisplayName && !u.publicDisplayName.includes('••••••••') && !u.publicDisplayName.includes(' • ')) {
      return u.publicDisplayName;
    }
    return formatPublicDisplayName(u);
  };

  const getSubtitle = (u: any) => {
    if (!u) return 'Sanjivani University';
    const dept = u.department || (u.isCurrentUser ? currentUser?.department : null);
    const yr = u.year || (u.isCurrentUser ? currentUser?.year : null);
    const div = u.division || (u.isCurrentUser ? currentUser?.division : null);
    const maskedPrn = u.maskedPrn || (u.isCurrentUser ? currentUser?.maskedPrn : null);

    const parts = [
      [dept, yr].filter(Boolean).join(' • '),
      div ? `Div ${div}` : null,
      maskedPrn ? maskedPrn : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }
    return u.college || 'Sanjivani University';
  };

  const resolveSolvedCount = (u: any) => {
    if (!u) return 0;
    const directSolved = Number(u.totalSolved ?? u.solvedCount ?? 0);
    if (directSolved > 0) return directSolved;
    const isMe = Boolean(u.isCurrentUser || (currentUser && (u.id === currentUser.id || u.userId === currentUser.id)));
    const meSolved = isMe ? Number((currentUser as any)?.totalSolved ?? (currentUser as any)?.solvedCount ?? 0) : 0;
    if (meSolved > 0) return meSolved;
    const points = Number(u.totalPoints ?? u.score ?? u.points ?? 0);
    return points > 0 ? 1 : 0;
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return rankedUsers;
    const q = searchQuery.toLowerCase().trim();
    return rankedUsers.filter((u) => {
      const name = (getDisplayName(u) || '').toLowerCase();
      const sub = (getSubtitle(u) || '').toLowerCase();
      return name.includes(q) || sub.includes(q);
    });
  }, [rankedUsers, searchQuery]);

  const topThree = rankedUsers.slice(0, 3);
  const showPodium = rankedUsers.length >= 3 && !searchQuery.trim();

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs shadow-sm shadow-amber-500/10">
          <span>🥇</span>
          <span>#1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-400/15 border border-slate-400/30 text-slate-300 font-bold text-xs">
          <span>🥈</span>
          <span>#2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-700/15 border border-amber-700/30 text-amber-500 font-bold text-xs">
          <span>🥉</span>
          <span>#3</span>
        </span>
      );
    }
    return <span className="font-mono font-bold text-[var(--text-muted)] pl-2">#{rank}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Header & Tabs */}
      <div className="glass-card border border-[var(--border-line)] bg-[var(--bg-panel)] rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-medium mb-2.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Academic Competition Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              College Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
              Ranked by problem points 💎 and daily consistency streak 🔥 • {totalSolvers} registered student{totalSolvers === 1 ? '' : 's'}
            </p>
          </div>

          {/* Scope Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {currentUser?.department && (
              <button
                type="button"
                onClick={() =>
                  setDepartmentFilter(departmentFilter === currentUser.department ? 'ALL' : currentUser.department!)
                }
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                  departmentFilter === currentUser.department
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border-line)]'
                }`}
              >
                <span>My Dept ({currentUser.department})</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-xl border border-[var(--border-line)]">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                id="leaderboard-department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-xs font-mono text-[var(--text-main)] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {ALLOWED_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-[var(--bg-panel)] text-[var(--text-main)]">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-xl border border-[var(--border-line)]">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                id="leaderboard-year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-transparent text-xs font-mono text-[var(--text-main)] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Years</option>
                {ALLOWED_YEARS.map((yr) => (
                  <option key={yr} value={yr} className="bg-[var(--bg-panel)] text-[var(--text-main)]">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* View Mode Tabs + Instant Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-[var(--border-line)]/80">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('overall')}
              className={`px-3.5 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                activeTab === 'overall'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-line)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Overall Standing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                activeTab === 'today'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-line)]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Daily Challenge</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Pinned Own Row (Your Standing) */}
      {pinnedOwnRow && (
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/40 bg-[var(--bg-panel)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-mono font-extrabold text-indigo-400 text-lg shrink-0">
              {pinnedOwnRow.rank ? `#${pinnedOwnRow.rank}` : '—'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Your College Standing</span>
                </span>
                <span className="text-sm font-bold text-[var(--text-main)] font-mono">
                  {getDisplayName(pinnedOwnRow)}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-mono font-bold">
                  YOU
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                {pinnedOwnRow.rank ? (
                  <>
                    {pinnedOwnRow.percentile != null ? (
                      <strong className="text-emerald-400">Top {pinnedOwnRow.percentile}%</strong>
                    ) : (
                      <span>Rank #{pinnedOwnRow.rank}</span>
                    )}
                    {pinnedOwnRow.studentsBeaten > 0 && (
                      <span> • Ahead of {pinnedOwnRow.studentsBeaten} student{pinnedOwnRow.studentsBeaten > 1 ? 's' : ''}</span>
                    )}
                  </>
                ) : (
                  <span>Solve any Practice challenge to climb the college leaderboard!</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono pt-1 sm:pt-0">
            <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <span className="text-[10px] text-[var(--text-muted)] block uppercase">Streak</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {pinnedOwnRow.currentStreak || 0}d
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <span className="text-[10px] text-[var(--text-muted)] block uppercase">Solved</span>
              <span className="text-[var(--text-main)] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                {resolveSolvedCount(pinnedOwnRow)}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <span className="text-[10px] text-indigo-400 block uppercase font-bold">Points</span>
              <span className="text-indigo-400 font-extrabold text-sm">
                {formatPoints(pinnedOwnRow.totalPoints ?? pinnedOwnRow.score ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Challenge Paused State */}
      {activeTab === 'today' && isDailyPaused ? (
        <div className="glass-card p-10 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] font-mono flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-main)]">
            Daily challenges are not active currently.
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            Overall leaderboard points include all completed practice problems. Head over to the Practice Hub to earn points and level up!
          </p>
          <Link
            to="/practice"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-sm"
          >
            <span>Explore Practice Modules →</span>
          </Link>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center font-mono text-indigo-400 text-sm">
          Loading leaderboard standings...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card p-10 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] font-mono flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--text-muted)]">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-main)]">
            No students found for this filter
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            Try switching department or year filters, or clear your search query.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Symmetrical Podium (Only shown if at least 3 students exist) */}
          {showPodium && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Rank 2 (Silver) */}
              <div className="glass-card p-5 rounded-2xl border border-slate-400/30 bg-[var(--bg-panel)] flex flex-col items-center text-center order-2 md:order-1 mt-0 md:mt-5 shadow-sm">
                <span className="w-9 h-9 rounded-full bg-slate-400/15 border border-slate-400/40 text-slate-300 flex items-center justify-center font-extrabold text-sm mb-2.5">
                  🥈 2
                </span>
                <Link
                  to={`/profile/${topThree[1].shortId || topThree[1].id}`}
                  className="font-bold text-[var(--text-main)] text-sm hover:text-indigo-400 transition-colors"
                >
                  {getDisplayName(topThree[1])}
                </Link>
                <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                  {getSubtitle(topThree[1])}
                </span>

                <div className="mt-3.5 pt-3 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">SOLVED</span>
                    <strong className="text-[var(--text-main)] text-sm">{resolveSolvedCount(topThree[1])}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 block uppercase font-bold">POINTS</span>
                    <strong className="text-indigo-400 text-sm">{formatPoints(topThree[1].totalPoints ?? 0)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">STREAK</span>
                    <strong className="text-emerald-400 text-sm">{topThree[1].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>

              {/* Rank 1 (Gold) */}
              <div className="glass-card p-6 rounded-2xl border-2 border-amber-400/50 bg-[var(--bg-panel)] flex flex-col items-center text-center order-1 md:order-2 shadow-lg shadow-amber-500/10 relative">
                <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold font-mono uppercase tracking-wider shadow-sm">
                  Rank #1 Champion
                </div>
                <span className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center font-extrabold text-base mb-2.5 mt-1">
                  🥇 1
                </span>
                <Link
                  to={`/profile/${topThree[0].shortId || topThree[0].id}`}
                  className="font-extrabold text-[var(--text-main)] text-base hover:text-amber-400 transition-colors"
                >
                  {getDisplayName(topThree[0])}
                </Link>
                <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                  {getSubtitle(topThree[0])}
                </span>

                <div className="mt-4 pt-3.5 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">SOLVED</span>
                    <strong className="text-[var(--text-main)] text-base">{resolveSolvedCount(topThree[0])}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block uppercase font-bold">POINTS</span>
                    <strong className="text-amber-400 text-base">{formatPoints(topThree[0].totalPoints ?? 0)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">STREAK</span>
                    <strong className="text-emerald-400 text-base">{topThree[0].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div className="glass-card p-5 rounded-2xl border border-amber-700/30 bg-[var(--bg-panel)] flex flex-col items-center text-center order-3 mt-0 md:mt-5 shadow-sm">
                <span className="w-9 h-9 rounded-full bg-amber-700/15 border border-amber-700/40 text-amber-500 flex items-center justify-center font-extrabold text-sm mb-2.5">
                  🥉 3
                </span>
                <Link
                  to={`/profile/${topThree[2].shortId || topThree[2].id}`}
                  className="font-bold text-[var(--text-main)] text-sm hover:text-indigo-400 transition-colors"
                >
                  {getDisplayName(topThree[2])}
                </Link>
                <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                  {getSubtitle(topThree[2])}
                </span>

                <div className="mt-3.5 pt-3 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">SOLVED</span>
                    <strong className="text-[var(--text-main)] text-sm">{resolveSolvedCount(topThree[2])}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 block uppercase font-bold">POINTS</span>
                    <strong className="text-indigo-400 text-sm">{formatPoints(topThree[2].totalPoints ?? 0)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">STREAK</span>
                    <strong className="text-emerald-400 text-sm">{topThree[2].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Standings Table */}
          <div className="glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-surface)]/70 text-[var(--text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--border-line)] font-semibold">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">Rank</th>
                    <th className="px-4 sm:px-6 py-3.5">Challenger</th>
                    <th className="px-4 sm:px-6 py-3.5">Department & Year</th>
                    <th className="px-4 sm:px-6 py-3.5">Streak</th>
                    <th className="px-4 sm:px-6 py-3.5">Problems Solved</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-line)]/70">
                  {filteredUsers.map((u: any) => {
                    const isMe = Boolean(u.isCurrentUser || (currentUser && u.id === currentUser.id));
                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors ${
                          isMe
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                            : 'hover:bg-[var(--bg-surface)]'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          {renderRankBadge(u.rank)}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${u.shortId || u.id}`}
                              className="font-bold text-[var(--text-main)] hover:text-indigo-400 transition-colors"
                            >
                              {getDisplayName(u)}
                            </Link>
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-[var(--text-muted)]">
                          {getSubtitle(u)}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <Flame className="w-3.5 h-3.5" />
                            <span>{u.currentStreak || 0}d</span>
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-[var(--text-main)] font-semibold">
                          {resolveSolvedCount(u)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right font-extrabold text-indigo-400 text-sm">
                          {formatPoints(u.totalPoints ?? u.score ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
