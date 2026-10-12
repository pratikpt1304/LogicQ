import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  const { data: dailyData } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => api.get('/problems/daily'),
  });

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats', selectedWeekOffset],
    queryFn: () =>
      api.get(
        `/users/dashboard/stats${selectedWeekOffset !== 0 ? `?weekOffset=${selectedWeekOffset}` : ''}`
      ),
  });

  const dailyProblem = dailyData?.data?.problem;
  const isDailySolved = dailyData?.data?.userStatus?.isSolved;
  const secondsLeft = dailyData?.data?.secondsUntilNextReset;

  const stats = statsData?.data?.stats;
  const weeklySummaries: any[] = statsData?.data?.weeklySummaries || [];
  const activeWeeklySummary =
    weeklySummaries.find((w: any) => w.weekOffset === selectedWeekOffset) ||
    statsData?.data?.weeklySummary ||
    null;
  const recentSubmissions = statsData?.data?.recentSubmissions || [];
  const activityMap = statsData?.data?.activityMap || {};

  // Generate 12-week heatmap grid
  const renderHeatmap = () => {
    const days: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const str = d.toISOString().split('T')[0];
      days.push({ date: str, count: activityMap[str] || 0 });
    }

    return (
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-2">
        {days.map((day) => {
          let bg = 'bg-[var(--bg-surface)] border-[var(--border-line)]';
          if (day.count === 1) bg = 'bg-cyan-500/40 border-cyan-500/50';
          else if (day.count === 2) bg = 'bg-cyan-400 border-cyan-400';
          else if (day.count >= 3) bg = 'bg-emerald-400 border-emerald-400 shadow-sm shadow-emerald-400/50';

          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} submissions`}
              className={`w-3.5 h-3.5 rounded-sm border ${bg} transition-colors cursor-pointer`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] flex items-center gap-2.5">
            <span>Welcome back, {user?.fullName || user?.username}</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--color-accent)] border border-[var(--border-line)]">
              CHALLENGER
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
            {user?.college ? `${user.college} • ` : ''}Keep your logic sharp with today&apos;s featured problem.
          </p>
        </div>

        {/* Global Standings Card */}
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl border border-[var(--border-line)] flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[var(--color-warning)]" />
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                GLOBAL RANK
              </span>
              <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                {stats?.rank ? (
                  <>
                    #{stats.rank}{' '}
                    <span className="text-[11px] text-[var(--text-muted)] font-normal">
                      of {stats?.totalUsers || 1} ranked
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-[var(--text-muted)] font-normal">
                    NOT RANKED YET
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Daily Challenge Card */}
      <div className="relative rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-8 shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-accent)] text-xs font-mono font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                FEATURED DAILY CHALLENGE
              </span>

              {dailyProblem && <DifficultyBadge difficulty={dailyProblem.difficulty} />}

              {isDailySolved ? (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-success)] bg-[var(--bg-surface)] border border-[var(--border-line)] px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved Today (+{dailyProblem?.basePoints || 0} PTS)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-warning)] bg-[var(--bg-surface)] border border-[var(--border-line)] px-2 py-0.5 rounded">
                  <Zap className="w-3.5 h-3.5" />
                  Active Today
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              {dailyProblem?.title || 'Loading Daily Challenge...'}
            </h2>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {dailyProblem?.description
                ?.replace(/### Problem Description|### Input Format|### Output Format|###/g, '')
                .replace(/\*\*Featured Daily Challenge:\*\*/g, '')
                .replace(/\\le/g, '≤')
                .replace(/\\ge/g, '≥')
                .replace(/\\times/g, '×')
                .replace(/[`*$]/g, '')
                .trim() ||
                "Solving today's challenge before 17:00 IST earns points by difficulty and extends your daily streak."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1">
              <span>
                Points: <strong className="text-[var(--color-accent)]">{dailyProblem?.basePoints || 20} PTS</strong>
              </span>
              <span>•</span>
              <span>Time Limit: {dailyProblem?.timeLimitMs || 1000}ms</span>
              <span>•</span>
              <span>Memory Limit: {dailyProblem?.memoryLimitMb || 64}MB</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
            <CountdownClock initialSeconds={secondsLeft} label="Next Reset in" />

            <Link
              to="/challenge"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <span>{isDailySolved ? 'Review Workspace' : 'Solve Daily Challenge'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly Result Summary & Past Weeks Selector Card */}
      <div
        data-testid="dashboard-weekly-summary"
        className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold text-[var(--text-main)] uppercase tracking-wide flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Your Weekly Summary & Past Weeks Standings</span>
            </h3>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
              {activeWeeklySummary?.weekLabel || 'Current Week'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-week-selector" className="text-xs font-mono text-[var(--text-muted)]">
              Past Weeks:
            </label>
            <select
              id="dashboard-week-selector"
              data-testid="dashboard-week-selector"
              value={selectedWeekOffset}
              onChange={(e) => setSelectedWeekOffset(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {(weeklySummaries.length > 0
                ? weeklySummaries
                : [
                    { weekOffset: 0, weekLabel: 'Current Week' },
                    { weekOffset: -1, weekLabel: 'Last Week' },
                    { weekOffset: -2, weekLabel: '2 Weeks Ago' },
                    { weekOffset: -3, weekLabel: '3 Weeks Ago' },
                  ]
              ).map((wk: any) => (
                <option key={wk.weekOffset} value={wk.weekOffset}>
                  {wk.weekLabel}
                </option>
              ))}
            </select>
            <Link
              to="/leaderboard"
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent)]"
            >
              Full Leaderboard &rarr;
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-[var(--border-line)] text-xs font-mono">
          <div>
            <span className="text-[var(--text-muted)] block text-[11px]">WEEKLY RANK</span>
            {activeWeeklySummary?.rank || stats?.rank ? (
              <strong className="text-[var(--text-main)] text-base">
                #{activeWeeklySummary?.rank || stats?.rank}
              </strong>
            ) : (
              <div>
                <strong className="text-[var(--text-muted)] text-sm block">Not ranked yet</strong>
                <span className="text-[10px] text-[var(--color-accent)] block">Solve today&apos;s challenge</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[11px]">WEEKLY POINTS</span>
            <strong className="text-[var(--color-accent)] text-base">
              {activeWeeklySummary?.weeklyPoints ?? stats?.totalPoints ?? 0} PTS
            </strong>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[11px]">PERCENTILE</span>
            {(activeWeeklySummary?.percentile ?? stats?.percentile) !== null && (activeWeeklySummary?.percentile ?? stats?.percentile) !== undefined ? (
              <strong className="text-[var(--color-success)] text-base">
                Top {activeWeeklySummary?.percentile ?? stats?.percentile}%
              </strong>
            ) : (
              <div>
                <strong className="text-[var(--text-muted)] text-base block">—</strong>
                <span className="text-[10px] text-[var(--text-muted)] block">Needs 10 ranked students</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[11px]">VS PREVIOUS WEEK</span>
            {activeWeeklySummary?.previousWeekDelta !== null && activeWeeklySummary?.previousWeekDelta !== undefined ? (
              <strong className="text-[var(--text-main)] text-base">
                {activeWeeklySummary.previousWeekDelta >= 0
                  ? `+${activeWeeklySummary.previousWeekDelta} PTS`
                  : `${activeWeeklySummary.previousWeekDelta} PTS`}
              </strong>
            ) : (
              <div>
                <strong className="text-[var(--text-muted)] text-base block">—</strong>
                <span className="text-[10px] text-[var(--text-muted)] block">No previous week yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Per-day results for the selected week (date, title, verdict, points — no problem statements) */}
        {Array.isArray(activeWeeklySummary?.perDayResults) &&
          activeWeeklySummary.perDayResults.length > 0 && (
            <div
              data-testid="weekly-per-day-results"
              className="pt-3 border-t border-[var(--border-line)] space-y-2"
            >
              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                Per-Day Results (Date • Challenge • Verdict • Points)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
                {activeWeeklySummary.perDayResults.map((dayRes: any, idx: number) => (
                  <div
                    key={`${dayRes.date}-${idx}`}
                    className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        {dayRes.date}
                      </span>
                      <span className="font-semibold text-[var(--text-main)] truncate block">
                        {dayRes.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <VerdictBadge verdict={dayRes.verdict} size="sm" />
                      <span className="font-bold text-[var(--color-accent)]">
                        +{dayRes.points || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">DAILY STREAK</span>
            <Flame className="w-5 h-5 text-[var(--color-warning)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
            {stats?.currentStreak || user?.currentStreak || 0}
            <span className="text-xs text-[var(--text-muted)] font-normal ml-1">days</span>
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            Personal best: {stats?.longestStreak || user?.longestStreak || 0} days
          </p>
        </div>

        {/* Total Points */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">TOTAL SCORE</span>
            <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-accent)] font-mono">
            {stats?.totalPoints || user?.totalPoints || 0}
            <span className="text-xs text-[var(--text-muted)] font-normal ml-1">PTS</span>
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            Earn points on Accepted submissions
          </p>
        </div>

        {/* Problems Solved */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">PROBLEMS SOLVED</span>
            <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
            {stats?.totalSolved || 0}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            This week: {stats?.thisWeekSolved ?? stats?.totalSolved ?? 0} of 7 solved
          </p>
        </div>

        {/* Accuracy Rate */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">ACCURACY RATE</span>
            <Trophy className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-accent)] font-mono">
            {stats?.accuracy !== null && stats?.accuracy !== undefined ? (
              <>
                {stats.accuracy}%
                <span className="text-xs text-[var(--text-muted)] font-normal ml-1">accepted</span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            {(stats?.totalSubmissions || 0) > 0
              ? `${stats?.totalSubmissions} total submissions evaluated`
              : 'No submissions yet'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Solved Breakdown & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Breakdown */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] space-y-4">
          <h3 className="text-sm font-mono font-bold text-[var(--text-main)] tracking-wide uppercase">
            Solve Breakdown by Difficulty
          </h3>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-[var(--color-success)] font-semibold">Easy</span>
                <span className="text-[var(--text-main)] font-bold">
                  {stats?.solvedByDifficulty?.EASY ?? stats?.difficultyBreakdown?.easy ?? 0} solved
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (((stats?.solvedByDifficulty?.EASY ?? 0) as number) / 6) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-[var(--color-warning)] font-semibold">Medium</span>
                <span className="text-[var(--text-main)] font-bold">
                  {stats?.solvedByDifficulty?.MEDIUM ?? stats?.difficultyBreakdown?.medium ?? 0} solved
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (((stats?.solvedByDifficulty?.MEDIUM ?? 0) as number) / 6) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-[var(--color-error)] font-semibold">Hard</span>
                <span className="text-[var(--text-main)] font-bold">
                  {stats?.solvedByDifficulty?.HARD ?? stats?.difficultyBreakdown?.hard ?? 0} solved
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (((stats?.solvedByDifficulty?.HARD ?? 0) as number) / 4) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-[var(--border-line)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-[var(--text-main)] tracking-wide uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              Submission Heatmap
            </h3>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">Last 12 Weeks</span>
          </div>

          <div className="pt-2">{renderHeatmap()}</div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-line)]">
            <span>Daily challenge counts towards streak</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded bg-[var(--bg-surface)]" />
              <div className="w-2.5 h-2.5 rounded bg-cyan-500/40" />
              <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
              <div className="w-2.5 h-2.5 rounded bg-emerald-400" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="glass-card rounded-2xl border border-[var(--border-line)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-line)] bg-[var(--bg-panel)]">
          <h3 className="text-sm font-mono font-bold text-[var(--text-main)] tracking-wide uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-accent)]" />
            Recent Submissions
          </h3>
          <Link
            to="/history"
            className="text-xs font-mono text-[var(--color-accent)] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[var(--text-muted)]">
            No submissions recorded yet. Open today&apos;s challenge to make your first solve!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[var(--bg-main)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border-line)]">
                <tr>
                  <th className="px-6 py-3">Problem</th>
                  <th className="px-6 py-3">Difficulty</th>
                  <th className="px-6 py-3">Verdict</th>
                  <th className="px-6 py-3">Runtime</th>
                  <th className="px-6 py-3">Points</th>
                  <th className="px-6 py-3 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-line)]">
                {recentSubmissions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[var(--text-main)]">
                      {(sub.problem?.slug || sub.problemSlug) && !sub.problem?.isEnded ? (
                        <Link
                          to="/challenge"
                          className="hover:text-[var(--color-accent)] transition-colors"
                        >
                          {sub.problem?.title || sub.problemTitle}
                        </Link>
                      ) : (
                        <span>{sub.problem?.title || sub.problemTitle || 'Past Challenge'}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <DifficultyBadge difficulty={sub.problem?.difficulty || sub.difficulty} size="sm" />
                    </td>
                    <td className="px-6 py-3.5">
                      <VerdictBadge verdict={sub.verdict} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-[var(--text-muted)]">
                      {sub.runtimeMs !== null && sub.runtimeMs !== undefined ? `${sub.runtimeMs}ms` : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[var(--color-accent)]">
                      +{sub.pointsAwarded} PTS
                    </td>
                    <td className="px-6 py-3.5 text-right text-[var(--text-muted)]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
