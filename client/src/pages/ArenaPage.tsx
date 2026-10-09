import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Swords, Trophy, Users, Calendar, ArrowRight, Clock, Zap } from 'lucide-react';
import { CountdownClock } from '../components/common/CountdownClock.js';

export const ArenaPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: () => api.get('/contests'),
  });

  const contests = data?.data?.contests || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Swords className="w-7 h-7 text-cyan-400" />
            <span>Competitive Arena</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Compete in scheduled timed contests with live scoreboard & ICPC penalty scoring.
          </p>
        </div>
      </div>

      {/* Contests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-xs font-mono text-cyan-400">
            Loading arena contests...
          </div>
        ) : contests.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/[0.08] text-slate-400 font-mono text-xs">
            No active contests scheduled at this moment. Check back soon!
          </div>
        ) : (
          contests.map((contest: any) => {
            const isOngoing = contest.status === 'ONGOING';
            const isUpcoming = contest.status === 'UPCOMING';

            return (
              <div
                key={contest.id}
                className={`glass-card p-6 sm:p-8 rounded-2xl border transition-all ${
                  isOngoing
                    ? 'border-cyan-500/40 bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 shadow-xl shadow-cyan-500/10'
                    : 'border-white/[0.08]'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex items-center gap-2.5">
                      {isOngoing && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                          <Zap className="w-3.5 h-3.5" />
                          LIVE NOW
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                          UPCOMING
                        </span>
                      )}
                      {contest.status === 'ENDED' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 text-xs font-mono font-bold">
                          CONCLUDED
                        </span>
                      )}

                      <span className="text-xs font-mono text-slate-400">
                        Duration: {contest.durationMinutes} mins
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white hover:text-cyan-400 transition-colors">
                      <Link to={`/arena/${contest.slug}`}>{contest.title}</Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      {contest.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {new Date(contest.startTime).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        {contest.participantCount || 0} Participants
                      </span>
                      <span>•</span>
                      <span>{contest.problemCount || 4} Problems</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
                    {isOngoing && (
                      <CountdownClock
                        targetDate={contest.endTime}
                        label="Contest Ends in"
                      />
                    )}

                    <Link
                      to={`/arena/${contest.slug}`}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>{isOngoing ? 'Enter Arena' : 'View Contest & Standings'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
