import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Trophy, Flame, CheckCircle2, Medal, ArrowUpRight } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'all_time'>('all_time');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: () => api.get(`/leaderboard?type=${activeTab}`),
  });

  const rankedUsers = data?.data?.leaderboard || [];
  const topThree = rankedUsers.slice(0, 3);
  const remaining = rankedUsers.slice(3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-400" />
            <span>Competitive Leaderboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Ranked by accepted solutions, IST daily streaks, and arena contest points.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-900 border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-semibold ${
              activeTab === 'daily'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-semibold ${
              activeTab === 'weekly'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTab('all_time')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-semibold ${
              activeTab === 'all_time'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center font-mono text-cyan-400 text-sm">
          Loading leaderboard standings...
        </div>
      ) : rankedUsers.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-white/[0.08] font-mono text-xs text-slate-400">
          No rankings recorded for this timeframe yet. Be the first to solve!
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col items-center text-center relative order-2 md:order-1 mt-4 md:mt-6">
                <span className="w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center font-bold text-sm mb-3">
                  🥈 2
                </span>
                <Link
                  to={`/profile/${topThree[1].username}`}
                  className="font-bold text-white text-base hover:text-cyan-400 transition-colors"
                >
                  {topThree[1].fullName}
                </Link>
                <span className="text-xs font-mono text-slate-500">@{topThree[1].username}</span>
                <span className="text-xs text-slate-400 mt-1 font-mono truncate max-w-[200px]">
                  {topThree[1].college || 'LogicQ Competitor'}
                </span>

                <div className="mt-4 pt-3 border-t border-white/[0.06] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">SCORE</span>
                    <strong className="text-cyan-400 text-sm">{topThree[1].score} PTS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">STREAK</span>
                    <strong className="text-orange-400 text-sm">{topThree[1].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 (Champion) */}
            {topThree[0] && (
              <div className="glass-card p-6 sm:p-8 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-dark-900 to-dark-900 shadow-2xl flex flex-col items-center text-center relative order-1 md:order-2 shadow-amber-500/10">
                <span className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg mb-3 shadow-lg shadow-amber-500/20 animate-bounce">
                  👑 1
                </span>
                <Link
                  to={`/profile/${topThree[0].username}`}
                  className="font-extrabold text-white text-lg hover:text-cyan-400 transition-colors"
                >
                  {topThree[0].fullName}
                </Link>
                <span className="text-xs font-mono text-cyan-400 font-bold">@{topThree[0].username}</span>
                <span className="text-xs text-slate-400 mt-1 font-mono truncate max-w-[220px]">
                  {topThree[0].college || 'LogicQ Grandmaster'}
                </span>

                <div className="mt-5 pt-4 border-t border-white/[0.08] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">SCORE</span>
                    <strong className="text-cyan-300 text-base">{topThree[0].score} PTS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">STREAK</span>
                    <strong className="text-orange-400 text-base">{topThree[0].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col items-center text-center relative order-3 mt-4 md:mt-8">
                <span className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-500 flex items-center justify-center font-bold text-sm mb-3">
                  🥉 3
                </span>
                <Link
                  to={`/profile/${topThree[2].username}`}
                  className="font-bold text-white text-base hover:text-cyan-400 transition-colors"
                >
                  {topThree[2].fullName}
                </Link>
                <span className="text-xs font-mono text-slate-500">@{topThree[2].username}</span>
                <span className="text-xs text-slate-400 mt-1 font-mono truncate max-w-[200px]">
                  {topThree[2].college || 'LogicQ Competitor'}
                </span>

                <div className="mt-4 pt-3 border-t border-white/[0.06] w-full flex items-center justify-around text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">SCORE</span>
                    <strong className="text-cyan-400 text-sm">{topThree[2].score} PTS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">STREAK</span>
                    <strong className="text-orange-400 text-sm">{topThree[2].currentStreak || 0}d</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Full Standings Table */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-3.5">Rank</th>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Institution</th>
                    <th className="px-6 py-3.5">Streak</th>
                    <th className="px-6 py-3.5">Solved</th>
                    <th className="px-6 py-3.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rankedUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-300">
                        {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/profile/${u.username}`}
                          className="font-bold text-white hover:text-cyan-400 transition-colors inline-block"
                        >
                          {u.fullName}
                        </Link>
                        <span className="text-slate-500 block text-[11px]">@{u.username}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{u.college || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                          <Flame className="w-3.5 h-3.5 fill-orange-400" />
                          {u.currentStreak || 0}d
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{u.solvedCount || 0}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-cyan-400 text-sm">
                        {u.score} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
