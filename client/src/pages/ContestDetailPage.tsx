import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import { DifficultyBadge } from '../components/common/Badge.js';
import { toast } from 'sonner';
import {
  Swords,
  Trophy,
  Users,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ContestDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'problems' | 'scoreboard'>('problems');
  const [liveStandings, setLiveStandings] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['contest-detail', slug],
    queryFn: () => api.get(`/contests/${slug}`),
  });

  const contest = data?.data?.contest;
  const problems = contest?.problems || [];

  // Fetch initial scoreboard
  const { data: scoreboardData } = useQuery({
    queryKey: ['contest-scoreboard', contest?.id],
    queryFn: () => api.get(`/contests/${contest.id}/scoreboard`),
    enabled: !!contest?.id,
  });

  useEffect(() => {
    if (scoreboardData?.data?.standings) {
      setLiveStandings(scoreboardData.data.standings);
    }
  }, [scoreboardData]);

  // Real-time socket listener for live scoreboard updates
  useEffect(() => {
    if (!socket || !contest?.id) return;

    socket.emit('join_contest', contest.id);

    const handleScoreboardUpdate = (updatedScoreboard: any) => {
      if (updatedScoreboard?.standings) {
        setLiveStandings(updatedScoreboard.standings);
        toast.info('Contest scoreboard updated!');
      }
    };

    socket.on('contest_scoreboard_update', handleScoreboardUpdate);

    return () => {
      socket.emit('leave_contest', contest.id);
      socket.off('contest_scoreboard_update', handleScoreboardUpdate);
    };
  }, [socket, contest?.id]);

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/contests/${contest.id}/join`),
    onSuccess: () => {
      toast.success('You have registered for this contest!');
      queryClient.invalidateQueries({ queryKey: ['contest-detail', slug] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to register');
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center font-mono text-cyan-400 text-sm">
        Loading arena contest...
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="py-20 text-center font-mono text-slate-400">
        Contest not found.
      </div>
    );
  }

  const isOngoing = contest.status === 'ONGOING';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Contest Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isOngoing
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-pulse'
                    : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                }`}
              >
                {contest.status}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {contest.durationMinutes} Minutes • ICPC Penalty Scoring
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{contest.title}</h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {contest.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
            {isOngoing && <CountdownClock targetDate={contest.endTime} label="Time Remaining" />}

            {!contest.isUserRegistered && user && (
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all"
              >
                {joinMutation.isPending ? 'Registering...' : 'Register for Contest'}
              </button>
            )}

            {contest.isUserRegistered && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Registered Competitor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs font-mono">
        <button
          onClick={() => setActiveTab('problems')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'problems'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Problem Set ({problems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scoreboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'scoreboard'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Live Scoreboard</span>
          {isOngoing && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          )}
        </button>
      </div>

      {/* Tab: Problem Set */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {problems.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-white/[0.08] text-slate-400 font-mono text-xs space-y-2">
              <Lock className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="font-bold text-white text-sm">Problems Locked</p>
              <p>Problems will unlock automatically as soon as the contest starts.</p>
            </div>
          ) : (
            problems.map((prob: any, idx: number) => (
              <div
                key={prob.id}
                className="glass-card p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-dark-900 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-cyan-400 text-sm">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base hover:text-cyan-400 transition-colors">
                      <Link to={`/challenge/${prob.slug}?contestId=${contest.id}`}>
                        {prob.title}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
                      <DifficultyBadge difficulty={prob.difficulty} size="sm" />
                      <span>Value: <strong className="text-cyan-400">+{prob.points} PTS</strong></span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/challenge/${prob.slug}?contestId=${contest.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all"
                >
                  <span>Solve</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Live Scoreboard */}
      {activeTab === 'scoreboard' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] bg-dark-850 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              OFFICIAL SCOREBOARD (LIVE WEBSOCKET SYNC)
            </span>
            <span className="text-xs font-mono text-cyan-400">
              {liveStandings.length} Competitors
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Rank</th>
                  <th className="px-6 py-3.5">Competitor</th>
                  <th className="px-6 py-3.5">Affiliation</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5 text-right">Penalty Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {liveStandings.map((stand: any, idx: number) => (
                  <tr key={stand.userId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{stand.user.fullName}</span>
                      <span className="text-slate-500 block text-[11px]">@{stand.user.username}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{stand.user.college || 'Independent'}</td>
                    <td className="px-6 py-4 font-bold text-cyan-400 text-sm">
                      {stand.score} PTS
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      {stand.penaltyTime} mins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
