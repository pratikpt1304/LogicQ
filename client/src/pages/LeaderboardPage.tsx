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
import { Trophy, Flame, GraduationCap, Calendar, UserCheck, Clock, TrendingUp } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const queryParams = new URLSearchParams();
  if (departmentFilter && departmentFilter !== 'ALL') {
    queryParams.set('department', departmentFilter);
  }
  if (yearFilter && yearFilter !== 'ALL') {
    queryParams.set('year', yearFilter);
  }
  if (weekOffset !== 0) {
    queryParams.set('weekOffset', String(weekOffset));
  }

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', departmentFilter, yearFilter, weekOffset],
    queryFn: () => {
      const qs = queryParams.toString();
      return api.get(`/leaderboard${qs ? `?${qs}` : ''}`);
    },
  });

  const rankedUsers = data?.data?.leaderboard || [];
  const pinnedOwnRow = data?.data?.pinnedOwnRow || null;
  const selectedWeek = data?.data?.selectedWeek || null;
  const availableWeeks = data?.data?.availableWeeks || [
    { weekOffset: 0, weekLabel: 'Current Week (Live)', isFrozen: false },
    { weekOffset: -1, weekLabel: 'Last Week (Final Rankings)', isFrozen: true },
    { weekOffset: -2, weekLabel: '2 Weeks Ago (Final Rankings)', isFrozen: true },
    { weekOffset: -3, weekLabel: '3 Weeks Ago (Final Rankings)', isFrozen: true },
  ];
  const weeklySummary = data?.data?.weeklySummary || null;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Academic + Past Weeks Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-[var(--color-accent)]" />
            <span>Weekly Leaderboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
            {selectedWeek?.weekLabel || 'Sanjivani University weekly standings'} — filter by Week, Department, and Academic Year.
          </p>
        </div>

        {/* Past Weeks Selector + Department & Year Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <label
              htmlFor="leaderboard-week-filter"
              className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Week:</span>
            </label>
            <select
              id="leaderboard-week-filter"
              data-testid="leaderboard-week-filter"
              value={weekOffset}
              onChange={(e) => setWeekOffset(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {availableWeeks.map((wk: any) => (
                <option key={wk.weekOffset} value={wk.weekOffset}>
                  {wk.weekLabel}
                </option>
              ))}
            </select>
          </div>

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

      {/* Weekly Summary Banner for Selected Week */}
      {weeklySummary && (
        <div
          data-testid="weekly-summary-card"
          className="glass-card p-4 sm:p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono font-bold text-[var(--color-accent)]">
                {weeklySummary.isFrozen ? 'FROZEN PAST WEEK SUMMARY' : 'ACTIVE WEEKLY SUMMARY'}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {weeklySummary.weekLabel}
              </span>
            </div>
            <p className="text-xs font-mono text-[var(--text-main)]">
              Weekly Rank <strong className="text-[var(--color-accent)]">#{weeklySummary.rank}</strong> of{' '}
              {weeklySummary.totalParticipants} • Solved{' '}
              <strong className="text-[var(--color-success)]">{weeklySummary.solvedCount}/7</strong> challenges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-mono">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">WEEKLY SCORE</span>
              <strong className="text-[var(--color-accent)] text-sm">
                {weeklySummary.weeklyPoints} PTS
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">PERCENTILE</span>
              <strong className="text-[var(--color-success)] text-sm">
                {weeklySummary.percentile}%
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">VS PREV WEEK</span>
              <strong className="text-[var(--text-main)] text-sm inline-flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" />
                {weeklySummary.previousWeekDelta >= 0
                  ? `+${weeklySummary.previousWeekDelta} PTS`
                  : `${weeklySummary.previousWeekDelta} PTS`}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Own-Row Banner (with masked PRN & percentile) */}
      {pinnedOwnRow && (
        <div
          data-testid="pinned-own-row"
          className="glass-card p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--bg-panel)] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--color-accent)] flex items-center justify-center font-mono font-extrabold text-[var(--color-accent)] text-sm">
              #{pinnedOwnRow.rank}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent)] font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Your Standing</span>
                </span>
                <span className="text-sm font-bold text-[var(--text-main)] font-mono">
                  {getDisplayLabel(pinnedOwnRow)}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                Top {100 - (pinnedOwnRow.percentile || 100) + 1}% • Percentile:{' '}
                <strong className="text-[var(--color-success)]">{pinnedOwnRow.percentile ?? 100}%</strong> •{' '}
                {pinnedOwnRow.studentsBeaten ?? 0} students beaten
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">SOLVED</span>
              <strong className="text-[var(--text-main)] text-sm">{pinnedOwnRow.solvedCount || 0}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
              <strong className="text-[var(--color-success)] text-sm">
                {pinnedOwnRow.currentStreak || 0}d
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">POINTS</span>
              <strong className="text-[var(--color-accent)] text-base">
                {pinnedOwnRow.totalPoints ?? pinnedOwnRow.score ?? 0} PTS
              </strong>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
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
              No Challengers Found for Selected Filter
            </h2>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              Try switching the Department or Year filter back to Whole College, or solve today&apos;s daily challenge to claim Rank #1!
            </p>
          </div>
          <Link
            to="/challenge"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] transition-all"
          >
            <span>Conquer Daily Challenge</span>
          </Link>
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
                  to={`/profile/${topThree[1].username}`}
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
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">SCORE</span>
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
                  to={`/profile/${topThree[0].username}`}
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
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">SCORE</span>
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
                  to={`/profile/${topThree[2].username}`}
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
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">SCORE</span>
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
                    <th className="px-4 sm:px-6 py-3.5">Rank</th>
                    <th className="px-4 sm:px-6 py-3.5">Challenger</th>
                    <th className="px-4 sm:px-6 py-3.5">Department & Year</th>
                    <th className="px-4 sm:px-6 py-3.5">Streak</th>
                    <th className="px-4 sm:px-6 py-3.5">Solved</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Points</th>
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
                            to={`/profile/${u.username}`}
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
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[var(--color-success)] font-semibold">
                            <Flame className="w-3.5 h-3.5" />
                            {u.currentStreak || 0}d
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-[var(--text-main)]">{u.solvedCount || 0}</td>
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
