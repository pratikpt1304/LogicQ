import React from 'react';
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
  Award,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => api.get('/problems/daily'),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/users/dashboard/stats'),
  });

  const dailyProblem = dailyData?.data?.problem;
  const isDailySolved = dailyData?.data?.userStatus?.isSolved;
  const secondsLeft = dailyData?.data?.secondsUntilNextReset;

  const stats = statsData?.data?.stats;
  const recentSubmissions = statsData?.data?.recentSubmissions || [];
  const activityMap = statsData?.data?.activityMap || {};
  const badges = statsData?.data?.badges || [];

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
          let bg = 'bg-dark-800 border-white/[0.04]';
          if (day.count === 1) bg = 'bg-cyan-500/40 border-cyan-500/50';
          else if (day.count === 2) bg = 'bg-cyan-400 border-cyan-400';
          else if (day.count >= 3) bg = 'bg-emerald-400 border-emerald-400 shadow-sm shadow-emerald-400/50';

          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} submissions`}
              className={`w-3.5 h-3.5 rounded-sm border ${bg} transition-colors hover:scale-125 cursor-pointer`}
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <span>Welcome back, {user?.fullName || user?.username}</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              CHALLENGER
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            {user?.college ? `${user.college} • ` : ''}Keep your logic sharp with today's featured problem.
          </p>
        </div>

        {/* Global Standings Card */}
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl border border-white/[0.08] flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                GLOBAL RANK
              </span>
              <span className="text-sm font-mono font-bold text-white">
                #{stats?.rank || 1} <span className="text-[11px] text-slate-500 font-normal">of {stats?.totalUsers || 1}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Daily Challenge Card */}
      <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-white via-cyan-50/30 to-white dark:from-dark-900 dark:via-dark-850 dark:to-dark-900 p-6 sm:p-8 shadow-sm dark:shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                FEATURED DAILY CHALLENGE
              </span>

              {dailyProblem && <DifficultyBadge difficulty={dailyProblem.difficulty} />}

              {isDailySolved ? (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved Today (+{dailyProblem?.basePoints + 15} PTS)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  <Zap className="w-3.5 h-3.5" />
                  Active Today
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {dailyProblem?.title || 'Loading Daily Challenge...'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {dailyProblem?.description?.replace(/### Problem Description|###|```/g, '') ||
                'Solving today\'s challenge earns base points + first-time solve and daily bonuses.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span>Points: <strong className="text-cyan-400">{dailyProblem?.basePoints || 25} PTS</strong></span>
              <span>•</span>
              <span>Time Limit: {dailyProblem?.timeLimitMs || 1000}ms</span>
              <span>•</span>
              <span>Memory Limit: {dailyProblem?.memoryLimitMb || 64}MB</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
            <CountdownClock initialSeconds={secondsLeft} label="Next Reset in" />

            <Link
              to={dailyProblem ? `/challenge/${dailyProblem.slug}` : '/challenge'}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>{isDailySolved ? 'Review Workspace' : 'Solve Daily Challenge'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">DAILY STREAK</span>
            <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats?.currentStreak || user?.currentStreak || 0}
            <span className="text-xs text-slate-400 font-normal ml-1">days</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Personal best: {stats?.longestStreak || user?.longestStreak || 0} days
          </p>
        </div>

        {/* Total Points */}
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">TOTAL SCORE</span>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {stats?.totalPoints || user?.totalPoints || 0}
            <span className="text-xs text-slate-400 font-normal ml-1">PTS</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Earn points on Accepted submissions
          </p>
        </div>

        {/* Problems Solved */}
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">PROBLEMS SOLVED</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats?.totalSolved || 0}
            <span className="text-xs text-slate-500 font-normal ml-1">
              / {stats?.totalProblems || 16}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Distinct challenges solved in C
          </p>
        </div>

        {/* Badges Unlocked */}
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">HONORS & BADGES</span>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">
            {badges.length}
            <span className="text-xs text-slate-400 font-normal ml-1">unlocked</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Milestones & arena achievements
          </p>
        </div>
      </div>

      {/* Two Column Layout: Solved Breakdown & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Breakdown */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Solve Breakdown by Difficulty
          </h3>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-emerald-400 font-semibold">Easy</span>
                <span className="text-slate-300 font-bold">{stats?.difficultyBreakdown?.easy || 0} solved</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((stats?.difficultyBreakdown?.easy || 0) / 6) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-amber-400 font-semibold">Medium</span>
                <span className="text-slate-300 font-bold">{stats?.difficultyBreakdown?.medium || 0} solved</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((stats?.difficultyBreakdown?.medium || 0) / 6) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-rose-400 font-semibold">Hard</span>
                <span className="text-slate-300 font-bold">{stats?.difficultyBreakdown?.hard || 0} solved</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((stats?.difficultyBreakdown?.hard || 0) / 4) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Submission Heatmap
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Last 12 Weeks</span>
          </div>

          <div className="pt-2">{renderHeatmap()}</div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            <span>Daily challenge counts towards streak</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded bg-dark-800" />
              <div className="w-2.5 h-2.5 rounded bg-cyan-500/40" />
              <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
              <div className="w-2.5 h-2.5 rounded bg-emerald-400" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-dark-850">
          <h3 className="text-sm font-mono font-bold text-slate-800 dark:text-white tracking-wide uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            Recent Submissions
          </h3>
          <Link
            to="/history"
            className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-slate-500">
            No submissions recorded yet. Open today's challenge to make your first solve!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100/70 dark:bg-dark-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/[0.04]">
                <tr>
                  <th className="px-6 py-3">Problem</th>
                  <th className="px-6 py-3">Difficulty</th>
                  <th className="px-6 py-3">Verdict</th>
                  <th className="px-6 py-3">Runtime</th>
                  <th className="px-6 py-3">Points</th>
                  <th className="px-6 py-3 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {recentSubmissions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5 font-bold text-white">
                      <Link
                        to={`/challenge/${sub.problemSlug}`}
                        className="hover:text-cyan-400 transition-colors"
                      >
                        {sub.problemTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <DifficultyBadge difficulty={sub.difficulty} size="sm" />
                    </td>
                    <td className="px-6 py-3.5">
                      <VerdictBadge verdict={sub.verdict} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-cyan-400">
                      +{sub.pointsAwarded} PTS
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
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
