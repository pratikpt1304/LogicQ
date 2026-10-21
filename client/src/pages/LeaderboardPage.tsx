import React, { useState } from 'react';
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
import { Trophy, Flame, GraduationCap, Calendar, UserCheck, Clock, CheckCircle2 } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overall' | 'today' | 'yesterday' | 'past'>('overall');
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  const queryParams = new URLSearchParams();
  queryParams.set('tab', activeTab);
  if (activeTab === 'past' && selectedDayId) {
    queryParams.set('dayId', selectedDayId);
  }
  if (departmentFilter && departmentFilter !== 'ALL') {
    queryParams.set('department', departmentFilter);
  }
  if (yearFilter && yearFilter !== 'ALL') {
    queryParams.set('year', yearFilter);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab, selectedDayId, departmentFilter, yearFilter],
    queryFn: () => {
      const qs = queryParams.toString();
      return api.get(`/leaderboard${qs ? `?${qs}` : ''}`);
    },
  });

  const rankedUsers = data?.data?.leaderboard || [];
  const pinnedOwnRow = data?.data?.pinnedOwnRow || null;
  const challenge = data?.data?.challenge || null;
  const totalSolvers = data?.data?.totalSolvers ?? rankedUsers.length;
  const isFrozen = Boolean(data?.data?.isFrozen);
  const availablePastDays: string[] = data?.data?.availablePastDays || [];
  const topThree = rankedUsers.slice(0, 3);

  const getDisplayLabel = (u: any) => {
    const isMe = Boolean(u.isCurrentUser || (currentUser && u.id === currentUser.id));
    if (isMe) {
      return (
        u.ownIdentityLabel ||
        formatOwnIdentityLabel({
          department: u.department || currentUser?.department,
          year: u.year || currentUser?.year,
          prn: currentUser?.prn,
          maskedPrn: u.maskedPrn || currentUser?.maskedPrn,
        })
      );
    }
    return u.publicDisplayName || formatPublicDisplayName(u);
  };

  const formatAcceptedTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  const resolveSolvedCount = (u: any) => {
    if (!u) return 0;
    const directSolved = Number(u.totalSolved ?? u.solvedCount ?? 0);
    const points = Number(u.totalPoints ?? u.score ?? u.points ?? 0);
    const derivedFromPoints = points > 0 ? Math.max(1, Math.floor(points / 10)) : 0;
    const isMe = Boolean(u.isCurrentUser || (currentUser && (u.id === currentUser.id || u.userId === currentUser.id)));
    const meSolved = isMe ? Number((currentUser as any)?.totalSolved ?? (currentUser as any)?.solvedCount ?? 0) : 0;
    return Math.max(directSolved, derivedFromPoints, meSolved);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-[var(--color-accent)]" />
            <span>{activeTab === 'overall' ? 'College Leaderboard' : 'Daily Challenge Sprint'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
            {activeTab === 'overall'
              ? `Overall Standing • Ranked by Points 💎 & Streak Consistency 🔥 • ${totalSolvers} student${totalSolvers === 1 ? '' : 's'}`
              : `Daily competition (17:00 IST cutoff) • ${totalSolvers} accepted solver${totalSolvers === 1 ? '' : 's'}${challenge ? ` • ${challenge.title} (${challenge.date})` : ''}${isFrozen ? ' • Frozen Day Archive' : ''}`}
          </p>
        </div>

        {/* Filters: Department & Year */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <label
              htmlFor="leaderboard-department-filter"
              className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Dept:</span>
            </label>
            <select
              id="leaderboard-department-filter"
              data-testid="leaderboard-department-filter"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="ALL">All Departments (Whole College)</option>
              {ALLOWED_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="leaderboard-year-filter"
              className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--color-success)]" />
              <span>Year:</span>
            </label>
            <select
              id="leaderboard-year-filter"
              data-testid="leaderboard-year-filter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="ALL">All Years</option>
              {ALLOWED_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Overall Standing | Today Sprint | Yesterday | Past Archive */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-line)] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            data-testid="tab-overall"
            onClick={() => {
              setActiveTab('overall');
              setSelectedDayId('');
            }}
            className={`px-4 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
              activeTab === 'overall'
                ? 'bg-[var(--color-accent)] text-[#0C0F1F] font-bold shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)]'
            }`}
          >
            <span>🌟 Overall Standing</span>
          </button>

          <button
            type="button"
            data-testid="tab-today"
            onClick={() => {
              setActiveTab('today');
              setSelectedDayId('');
            }}
            className={`px-4 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-[var(--color-accent)] text-[#0C0F1F] font-bold shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)]'
            }`}
          >
            <span>⚡ Daily Sprint</span>
          </button>

          <button
            type="button"
            data-testid="tab-yesterday"
            onClick={() => {
              setActiveTab('yesterday');
              setSelectedDayId('');
            }}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'yesterday'
                ? 'bg-[var(--color-accent)] text-[#0C0F1F] font-bold shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)]'
            }`}
          >
            Yesterday
          </button>

          <button
            type="button"
            data-testid="tab-past"
            onClick={() => {
              setActiveTab('past');
              if (!selectedDayId && availablePastDays.length > 0) {
                setSelectedDayId(availablePastDays[0]);
              }
            }}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'past'
                ? 'bg-[var(--color-accent)] text-[#0C0F1F] font-bold shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)]'
            }`}
          >
            Past Archive
          </button>
        </div>

        {/* Date Selector for Past Days */}
        {activeTab === 'past' && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="leaderboard-date-selector"
              className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Select Date:</span>
            </label>
            {availablePastDays.length > 0 ? (
              <select
                id="leaderboard-date-selector"
                data-testid="leaderboard-date-selector"
                value={selectedDayId || availablePastDays[0]}
                onChange={(e) => setSelectedDayId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                {availablePastDays.map((dStr) => (
                  <option key={dStr} value={dStr}>
                    {dStr}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                id="leaderboard-date-selector"
                data-testid="leaderboard-date-selector"
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            )}
          </div>
        )}
      </div>

      {/* Pinned Own-Row Banner (with masked PRN, percentile, stats) */}
      {pinnedOwnRow && (!data?.data?.paused || activeTab === 'overall') && (
        <div
          data-testid="pinned-own-row"
          className="glass-card p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--bg-panel)] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--color-accent)] flex items-center justify-center font-mono font-extrabold text-[var(--color-accent)] text-sm">
              {pinnedOwnRow.rank ? `#${pinnedOwnRow.rank}` : '—'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)] font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{activeTab === 'overall' ? 'Your College Standing' : 'Your Daily Standing'}</span>
                </span>
                <span className="text-sm font-bold text-[var(--text-main)] font-mono">
                  {getDisplayLabel(pinnedOwnRow)}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                {pinnedOwnRow.rank ? (
                  <>
                    {pinnedOwnRow.percentile !== null && pinnedOwnRow.percentile !== undefined ? (
                      <>Top {pinnedOwnRow.percentile}% • </>
                    ) : (
                      <span>Needs 10 students for percentile • </span>
                    )}
                    {pinnedOwnRow.studentsBeaten ?? 0} students beaten
                  </>
                ) : (
                  <span>
                    {activeTab === 'overall'
                      ? 'Solve any Practice or Daily problem to start climbing the college leaderboard!'
                      : "Not solved yet • Solve today's challenge before 17:00 IST to enter the daily rank"}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono">
            {activeTab !== 'overall' && (
              <>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">ACCEPTED</span>
                  <strong className="text-[var(--text-main)] text-sm">
                    {formatAcceptedTime(pinnedOwnRow.acceptedAt)}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">ATTEMPTS</span>
                  <strong className="text-[var(--text-main)] text-sm">
                    {(pinnedOwnRow.wrongAttempts ?? 0) + 1}
                  </strong>
                </div>
              </>
            )}
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
              <strong className="text-[var(--color-success)] text-sm flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {pinnedOwnRow.currentStreak || 0}d
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">SOLVED</span>
              <strong className="text-[var(--text-main)] text-sm flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-accent)]" />
                {resolveSolvedCount(pinnedOwnRow)}
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">TOTAL POINTS</span>
              <strong className="text-[var(--color-accent)] text-base">
                {pinnedOwnRow.totalPoints ?? pinnedOwnRow.score ?? 0} PTS
              </strong>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overall' && (data?.data?.paused || data?.data?.dailyChallengePaused) ? (
        <div data-testid="leaderboard-paused-state" className="glass-card p-12 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] font-mono flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-cyan-400">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--text-main)]">
              Daily challenges are not live yet. We will announce the start.
            </h2>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              Leaderboard standings will unlock once the daily challenge season begins. Head over to Practice to master key C programming concepts.
            </p>
          </div>
          <Link
            to="/practice"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-[var(--color-accent)] hover:opacity-95 transition-all"
          >
            <span>Explore Practice Modules</span>
          </Link>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center font-mono text-[var(--color-accent)] text-sm">
          Loading leaderboard standings...
        </div>
      ) : rankedUsers.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] font-mono flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-accent)]">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--text-main)]">
              {activeTab === 'overall' ? 'No students found for selected filter' : 'No Solvers Found for Selected Filter'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              {activeTab === 'overall'
                ? 'Try selecting All Departments or All Years to view student standings.'
                : "Only students who solved today's challenge before 17:00 IST appear on the leaderboard. Be the first to solve it and claim Rank #1!"}
            </p>
          </div>
          {activeTab !== 'overall' && (
            <Link
              to="/challenge"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] transition-all"
            >
              <span>Conquer Daily Challenge</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col items-center text-center relative order-2 md:order-1 mt-2 md:mt-6">
                <span className="w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center justify-center font-bold text-sm mb-3">
                  2
                </span>
                <Link
                  to={`/profile/${topThree[1].shortId || topThree[1].id}`}
                  className="font-bold text-[var(--text-main)] text-base hover:text-[var(--color-accent)] transition-colors"
                >
                  {getDisplayLabel(topThree[1])}
                </Link>
                <span className="text-xs font-mono text-[var(--text-muted)] mt-1">
                  {[topThree[1].department, topThree[1].year].filter(Boolean).join(' • ') ||
                    topThree[1].college ||
                    'Sanjivani University'}
                </span>

                <div className="mt-4 pt-3 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  {activeTab !== 'overall' ? (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">ACCEPTED</span>
                      <strong className="text-[var(--text-main)] text-sm">
                        {formatAcceptedTime(topThree[1].acceptedAt)}
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">SOLVED</span>
                      <strong className="text-[var(--text-main)] text-sm">
                        {resolveSolvedCount(topThree[1])}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">TOTAL PTS</span>
                    <strong className="text-[var(--color-accent)] text-sm">
                      {topThree[1].totalPoints ?? topThree[1].score ?? 0} PTS
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
                    <strong className="text-[var(--color-success)] text-sm">
                      {topThree[1].currentStreak || 0}d
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="glass-card p-6 sm:p-8 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--bg-panel)] shadow-2xl flex flex-col items-center text-center relative order-1 md:order-2">
                <span className="w-10 h-10 rounded-full bg-[var(--bg-surface)] text-[var(--color-accent)] flex items-center justify-center font-bold text-lg mb-3">
                  1
                </span>
                <Link
                  to={`/profile/${topThree[0].shortId || topThree[0].id}`}
                  className="font-extrabold text-[var(--text-main)] text-lg hover:text-[var(--color-accent)] transition-colors"
                >
                  {getDisplayLabel(topThree[0])}
                </Link>
                <span className="text-xs font-mono text-[var(--text-muted)] mt-1">
                  {[topThree[0].department, topThree[0].year].filter(Boolean).join(' • ') ||
                    topThree[0].college ||
                    'Sanjivani University'}
                </span>

                <div className="mt-5 pt-4 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  {activeTab !== 'overall' ? (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">ACCEPTED</span>
                      <strong className="text-[var(--text-main)] text-base">
                        {formatAcceptedTime(topThree[0].acceptedAt)}
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">SOLVED</span>
                      <strong className="text-[var(--text-main)] text-base">
                        {resolveSolvedCount(topThree[0])}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">TOTAL PTS</span>
                    <strong className="text-[var(--color-accent)] text-base">
                      {topThree[0].totalPoints ?? topThree[0].score ?? 0} PTS
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
                    <strong className="text-[var(--color-success)] text-base">
                      {topThree[0].currentStreak || 0}d
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col items-center text-center relative order-3 mt-2 md:mt-6">
                <span className="w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center justify-center font-bold text-sm mb-3">
                  3
                </span>
                <Link
                  to={`/profile/${topThree[2].shortId || topThree[2].id}`}
                  className="font-bold text-[var(--text-main)] text-base hover:text-[var(--color-accent)] transition-colors"
                >
                  {getDisplayLabel(topThree[2])}
                </Link>
                <span className="text-xs font-mono text-[var(--text-muted)] mt-1">
                  {[topThree[2].department, topThree[2].year].filter(Boolean).join(' • ') ||
                    topThree[2].college ||
                    'Sanjivani University'}
                </span>

                <div className="mt-4 pt-3 border-t border-[var(--border-line)] w-full flex items-center justify-around text-xs font-mono">
                  {activeTab !== 'overall' ? (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">ACCEPTED</span>
                      <strong className="text-[var(--text-main)] text-sm">
                        {formatAcceptedTime(topThree[2].acceptedAt)}
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">SOLVED</span>
                      <strong className="text-[var(--text-main)] text-sm">
                        {resolveSolvedCount(topThree[2])}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">TOTAL PTS</span>
                    <strong className="text-[var(--color-accent)] text-sm">
                      {topThree[2].totalPoints ?? topThree[2].score ?? 0} PTS
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
                    <strong className="text-[var(--color-success)] text-sm">
                      {topThree[2].currentStreak || 0}d
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Full Standings Table */}
          <div className="glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-main)] text-[var(--text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--border-line)]">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">
                      {activeTab === 'overall' ? 'College Rank' : 'Daily Rank'}
                    </th>
                    <th className="px-4 sm:px-6 py-3.5">Challenger</th>
                    <th className="px-4 sm:px-6 py-3.5">Department & Year</th>
                    {activeTab !== 'overall' && (
                      <>
                        <th className="px-4 sm:px-6 py-3.5">Accepted Time</th>
                        <th className="px-4 sm:px-6 py-3.5">Attempts</th>
                      </>
                    )}
                    <th className="px-4 sm:px-6 py-3.5">Streak</th>
                    <th className="px-4 sm:px-6 py-3.5">Problems Solved</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-line)]">
                  {rankedUsers.map((u: any) => {
                    const isMe = Boolean(
                      u.isCurrentUser || (currentUser && u.id === currentUser.id)
                    );
                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors ${
                          isMe ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-surface)]'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4 font-bold text-[var(--text-main)]">
                          #{u.rank}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <Link
                            to={`/profile/${u.shortId || u.id}`}
                            className="font-bold text-[var(--text-main)] hover:text-[var(--color-accent)] transition-colors inline-block"
                          >
                            {getDisplayLabel(u)}
                          </Link>
                          {isMe && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--color-accent)] text-[var(--color-accent)] text-[10px] font-bold">
                              YOU
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-[var(--text-muted)]">
                          {[u.department, u.year, u.division ? `Div ${u.division}` : null]
                            .filter(Boolean)
                            .join(' • ') ||
                            u.college ||
                            'Sanjivani University'}
                        </td>
                        {activeTab !== 'overall' && (
                          <>
                            <td className="px-4 sm:px-6 py-4 text-[var(--text-main)]">
                              {formatAcceptedTime(u.acceptedAt)}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-[var(--text-muted)]">
                              {(u.wrongAttempts ?? 0) + 1}
                            </td>
                          </>
                        )}
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[var(--color-success)] font-semibold">
                            <Flame className="w-3.5 h-3.5" />
                            {u.currentStreak || 0}d
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-[var(--text-main)]">
                          {resolveSolvedCount(u)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right font-extrabold text-[var(--color-accent)] text-sm">
                          {u.totalPoints ?? u.score ?? 0} PTS
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
