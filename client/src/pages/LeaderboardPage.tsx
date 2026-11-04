import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  formatPublicDisplayName,
  isRealPersonName,
  formatNameFromEmail,
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
  Award,
  Target,
  ArrowRight,
  Code2,
  Building2,
  X,
  Filter,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [scope, setScope] = useState<'ALL' | 'MY_DEPT' | 'MY_YEAR'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Derive active department and year filter based on scope tab
  const activeDepartment = useMemo(() => {
    if (scope === 'MY_DEPT' && currentUser?.department) return currentUser.department;
    return departmentFilter;
  }, [scope, currentUser?.department, departmentFilter]);

  const activeYear = useMemo(() => {
    if (scope === 'MY_YEAR' && currentUser?.year) return currentUser.year;
    return yearFilter;
  }, [scope, currentUser?.year, yearFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', activeDepartment, activeYear],
    queryFn: async () => {
      // 1. Try authoritative Firestore publicProfiles first
      try {
        const firestoreRes = await FirestoreDataService.getLeaderboardFromFirestore({
          department: activeDepartment,
          year: activeYear,
          currentUser,
        });
        if (firestoreRes && firestoreRes.leaderboard.length > 0) {
          return {
            success: true,
            data: {
              leaderboard: firestoreRes.leaderboard,
              pinnedOwnRow: firestoreRes.pinnedOwnRow,
              totalSolvers: firestoreRes.totalSolvers,
              totalRanked: firestoreRes.totalSolvers,
            },
          };
        }
      } catch (fErr) {
        console.warn('LeaderboardPage Firestore notice:', fErr);
      }

      // 2. Fallback to API/backend
      const q = new URLSearchParams();
      if (activeDepartment && activeDepartment !== 'ALL') q.set('department', activeDepartment);
      if (activeYear && activeYear !== 'ALL') q.set('year', activeYear);
      const qs = q.toString();
      return api.get(`/leaderboard${qs ? `?${qs}` : ''}`);
    },
    staleTime: 60 * 1000,
  });

  const rankedUsers: any[] = data?.data?.leaderboard || [];
  const pinnedOwnRow = data?.data?.pinnedOwnRow || null;
  const totalSolvers = data?.data?.totalSolvers ?? rankedUsers.filter((u) => (Number(u.totalPoints) || 0) > 0).length;

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
      if (myName && isRealPersonName(myName)) {
        return myName.trim();
      }
    }

    const candidates = [u.displayName, u.fullName, u.name, u.displayLabel, u.publicDisplayName, u.username];
    for (const cand of candidates) {
      if (typeof cand === 'string' && isRealPersonName(cand)) {
        return cand.trim();
      }
    }

    if (u.email) {
      const fromEmail = formatNameFromEmail(u.email);
      if (fromEmail) return fromEmail;
    }

    if (u.publicDisplayName && isRealPersonName(u.publicDisplayName)) {
      return u.publicDisplayName.trim();
    }
    return formatPublicDisplayName(u);
  };

  const getSubtitle = (u: any) => {
    if (!u) return 'LogicQ';
    const dept = u.department || (u.isCurrentUser ? currentUser?.department : null);
    const yr = u.year || (u.isCurrentUser ? currentUser?.year : null);
    const maskedPrn = u.maskedPrn || (u.isCurrentUser ? currentUser?.maskedPrn : null);

    const parts = [
      [dept, yr].filter(Boolean).join(' • '),
      maskedPrn ? maskedPrn : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }
    return u.college || 'LogicQ';
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

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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

  // Top 3 Podium (Only when 3+ solvers with points exist)
  const activeSolvers = rankedUsers.filter((u) => Number(u.totalPoints || 0) > 0 || Number(u.totalSolved || 0) > 0);
  const topThree = activeSolvers.slice(0, 3);
  const showPodium = topThree.length >= 3 && !searchQuery.trim();

  const renderRankBadge = (rank: number | null | undefined, points: number = 0) => {
    if (!rank || Number(points) <= 0) {
      return (
        <span className="font-mono text-xs text-slate-400 font-semibold w-8 text-center">
          —
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold text-xs ring-2 ring-amber-400/40 shadow-xs">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-400 font-bold text-xs ring-2 ring-slate-300/40 shadow-xs">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-bold text-xs ring-2 ring-amber-600/40 shadow-xs">
          🥉
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-xs">
        #{rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-6 sm:py-10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* ========================================================= */}
        {/* Apple HIG Frosted Header with Campus Stats & Quick Scope  */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Trophy className="w-3.5 h-3.5" />
                <span>Academic Standings • Campus Leaderboard</span>
              </span>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                College Leaderboard
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Live rankings based on verified problem solutions and programming consistency.
                Compete across departments and years.
              </p>
            </div>

            {/* Quick Stat Pill & Practice Arena Jump */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Solvers
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{totalSolvers}</span>
                  <span className="text-xs text-slate-400 font-normal">Active</span>
                </div>
              </div>

              <Link
                to="/practice"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                <span>Solve Questions →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Apple Segmented Scope Switcher (0ms, 1-Click Fast Tabs)   */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* 1-Click Apple Segmented Scope Buttons */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setScope('ALL');
                  setDepartmentFilter('ALL');
                  setYearFilter('ALL');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                  scope === 'ALL' && departmentFilter === 'ALL' && yearFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🏛️ All College
              </button>

              {currentUser?.department && (
                <button
                  type="button"
                  onClick={() => setScope('MY_DEPT')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                    scope === 'MY_DEPT'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🎓 My Dept ({currentUser.department})
                </button>
              )}

              {currentUser?.year && (
                <button
                  type="button"
                  onClick={() => setScope('MY_YEAR')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                    scope === 'MY_YEAR'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📅 My Year ({currentUser.year})
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  showAdvancedFilters || (departmentFilter !== 'ALL' && scope === 'ALL') || (yearFilter !== 'ALL' && scope === 'ALL')
                    ? 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            {/* Apple Instant Search Bar */}
            <div className="relative sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or department..."
                className="w-full pl-9 pr-8 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Advanced Filters (Department & Year Selectors) */}
          {showAdvancedFilters && (
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-wrap items-center gap-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-mono">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span className="text-slate-500">Department:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setScope('ALL');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {ALLOWED_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-500">Year:</span>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setScope('ALL');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  {ALLOWED_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {(departmentFilter !== 'ALL' || yearFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentFilter('ALL');
                    setYearFilter('ALL');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* Apple Spotlight Card: Your Personal Campus Standing       */}
        {/* ========================================================= */}
        {pinnedOwnRow && (
          <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/15 dark:via-teal-500/10 p-5 sm:p-6 shadow-lg shadow-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 overflow-hidden">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-extrabold text-base shrink-0 shadow-inner">
                {pinnedOwnRow.rank && Number(pinnedOwnRow.totalPoints || 0) > 0 ? `#${pinnedOwnRow.rank}` : '—'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {getDisplayName(pinnedOwnRow)}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] tracking-wider uppercase border border-emerald-500/30">
                    YOU
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                  {getSubtitle(pinnedOwnRow)}
                  {pinnedOwnRow.percentile != null && (
                    <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400">
                      • Top {pinnedOwnRow.percentile}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Micro Stats Strip */}
            <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-mono shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/60">
              <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Solved</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {resolveSolvedCount(pinnedOwnRow)}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Streak</span>
                <span className="font-bold text-amber-500 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-500/20" />
                  {pinnedOwnRow.currentStreak || 0}d
                </span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">
                  Score
                </span>
                <span className="font-extrabold text-sm">
                  {formatPoints(pinnedOwnRow.totalPoints ?? pinnedOwnRow.score ?? 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Top 3 Apple Symmetrical Podium Cards (When 3+ Solvers)    */}
        {/* ========================================================= */}
        {showPodium && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Rank 2 (Silver) */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 flex flex-col items-center text-center order-2 md:order-1 mt-0 md:mt-4 shadow-sm relative transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-slate-300/30 text-slate-400 border border-slate-300/50 flex items-center justify-center text-xl font-bold mb-3 shadow-inner">
                🥈
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                {getDisplayName(topThree[1])}
              </h4>
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-full">
                {getSubtitle(topThree[1])}
              </p>

              <div className="w-full mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Solved</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {resolveSolvedCount(topThree[1])}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Points</span>
                  <span className="font-bold text-indigo-500">
                    {formatPoints(topThree[1].totalPoints ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank 1 (Gold Champion) */}
            <div className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/10 via-white/80 to-white/80 dark:via-slate-900/80 dark:to-slate-900/80 backdrop-blur-2xl p-7 flex flex-col items-center text-center order-1 md:order-2 shadow-xl shadow-amber-500/10 relative transition-all hover:scale-[1.02]">
              <span className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold uppercase tracking-wider mb-2 shadow-xs">
                👑 Campus Champion
              </span>

              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-400 flex items-center justify-center text-2xl font-bold mb-3 shadow-inner">
                🥇
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {getDisplayName(topThree[0])}
              </h4>
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-full">
                {getSubtitle(topThree[0])}
              </p>

              <div className="w-full mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Solved</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {resolveSolvedCount(topThree[0])}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block uppercase font-bold">
                    Points
                  </span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                    {formatPoints(topThree[0].totalPoints ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 flex flex-col items-center text-center order-3 mt-0 md:mt-4 shadow-sm relative transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center text-xl font-bold mb-3 shadow-inner">
                🥉
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                {getDisplayName(topThree[2])}
              </h4>
              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-full">
                {getSubtitle(topThree[2])}
              </p>

              <div className="w-full mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Solved</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {resolveSolvedCount(topThree[2])}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Points</span>
                  <span className="font-bold text-indigo-500">
                    {formatPoints(topThree[2].totalPoints ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Apple Minimalist Ranking Rows (Replaces Clunky Old Table) */}
        {/* ========================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="font-bold uppercase tracking-wider">
              {scope === 'MY_DEPT'
                ? `${currentUser?.department || 'Department'} Standings`
                : scope === 'MY_YEAR'
                ? `${currentUser?.year || 'Year'} Standings`
                : 'Overall College Standings'}{' '}
              ({filteredUsers.length} Students)
            </span>
            <span>Sorted by Points & Streak</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 p-4 animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No students found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No registered students match your current department, year, or search criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u: any) => {
                const isMe = Boolean(u.isCurrentUser || (currentUser && u.id === currentUser.id));
                const name = getDisplayName(u);
                const sub = getSubtitle(u);
                const points = formatPoints(u.totalPoints ?? u.score ?? 0);
                const solved = resolveSolvedCount(u);
                const streak = u.currentStreak || 0;

                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl border transition-all duration-150 p-4 sm:p-4.5 flex items-center justify-between gap-4 select-none ${
                      isMe
                        ? 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-sm'
                        : 'border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Rank + Avatar + Name & Department */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="shrink-0">{renderRankBadge(u.rank, u.totalPoints ?? u.score ?? 0)}</div>

                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-300/50 dark:border-slate-600/50 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                        {getInitials(name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {name}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                          {sub}
                        </div>
                      </div>
                    </div>

                    {/* Right: Points + Solved/Streak */}
                    <div className="text-right shrink-0 font-mono">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {points}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
                        <span>{solved} solved</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Flame className="w-3 h-3" />
                          {streak}d
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
