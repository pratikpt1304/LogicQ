import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Award,
  Zap,
  Flame,
  CheckCircle2,
  ShieldAlert,
  Trophy,
  Lock,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Zap,
  Flame,
  Award,
  CheckCircle2,
  ShieldAlert,
  Trophy,
};

export const AchievementsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.get('/users/badges'),
  });

  const badges = data?.data?.badges || [];
  const unlockedCount = badges.filter((b: any) => b.isUnlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Award className="w-7 h-7 text-purple-400" />
            <span>Mastery Honors & Badges</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Earn prestigious honors by maintaining streaks, solving complex pointers, and competing.
          </p>
        </div>

        <div className="glass-card px-4 py-2 rounded-xl border border-white/[0.08] flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="font-mono text-xs font-bold text-slate-300">
            {unlockedCount} of {badges.length} Unlocked
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center font-mono text-cyan-400 text-xs">
            Loading honors catalog...
          </div>
        ) : (
          badges.map((badge: any) => {
            const Icon = iconMap[badge.iconName] || Award;
            const isUnlocked = badge.isUnlocked;

            return (
              <div
                key={badge.id}
                className={`glass-card p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isUnlocked
                    ? 'border-purple-500/40 bg-gradient-to-br from-dark-900 via-dark-850 to-purple-950/20 shadow-xl shadow-purple-500/10'
                    : 'border-white/[0.06] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isUnlocked
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                          : 'bg-dark-850 text-slate-600 border border-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {isUnlocked ? (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-white text-lg">{badge.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Criteria: {badge.requirementCount} {badge.category}</span>
                  {isUnlocked && <span className="text-purple-400 font-semibold">Awarded</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
