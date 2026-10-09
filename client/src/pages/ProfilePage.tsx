import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { DifficultyBadge } from '../components/common/Badge.js';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  Building2,
  Award,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { Difficulty } from '../types/index.js';

export const ProfilePage: React.FC = () => {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const targetUsername = paramUsername || currentUser?.username;
  const isOwnProfile = currentUser && currentUser.username === targetUsername;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    bio: '',
    college: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['profile', targetUsername],
    queryFn: () => api.get(`/users/profile/${targetUsername}`),
    enabled: !!targetUsername,
  });

  const profile = data?.data?.user;

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.put('/users/profile', body),
    onSuccess: (res) => {
      toast.success('Profile updated successfully!');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['profile', targetUsername] });
      queryClient.invalidateQueries({ queryKey: ['auth/me'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile');
    },
  });

  const handleOpenEdit = () => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        college: profile.college || '',
      });
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center font-mono text-cyan-400 text-xs">
        Loading challenger profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center font-mono space-y-4">
        <h2 className="text-xl font-bold text-white">Challenger not found</h2>
        <Link to="/leaderboard" className="text-cyan-400 underline">
          &larr; View competitive leaderboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-500 flex items-center justify-center text-3xl font-extrabold text-dark-950 shadow-xl shadow-cyan-500/20 font-mono">
              {profile.username.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{profile.fullName}</h1>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                  RANK #{profile.rank}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">@{profile.username}</p>

              {profile.college && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{profile.college}</span>
                </div>
              )}

              {profile.bio && (
                <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed font-sans">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-slate-300 bg-dark-850 hover:bg-dark-800 border border-white/[0.08] hover:border-slate-500 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">TOTAL SCORE</span>
          <span className="text-2xl font-extrabold text-cyan-400 font-mono">
            {profile.totalPoints} PTS
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">CURRENT STREAK</span>
          <span className="text-2xl font-extrabold text-orange-400 font-mono flex items-center gap-1">
            <Flame className="w-6 h-6 fill-orange-400" />
            {profile.currentStreak}d
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">LONGEST STREAK</span>
          <span className="text-2xl font-extrabold text-white font-mono">
            {profile.longestStreak} days
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">PROBLEMS SOLVED</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">
            {profile.totalSolved}
          </span>
        </div>
      </div>

      {/* Two Column: Solved Breakdown & Honors Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solved by Difficulty */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Solved by Difficulty
          </h3>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center">
            <div className="p-4 rounded-xl bg-dark-900 border border-emerald-500/20">
              <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">EASY</span>
              <span className="text-xl font-mono font-extrabold text-white">
                {profile.difficultyBreakdown?.easy || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-amber-500/20">
              <span className="text-xs font-mono text-amber-400 font-bold block mb-1">MEDIUM</span>
              <span className="text-xl font-mono font-extrabold text-white">
                {profile.difficultyBreakdown?.medium || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-rose-500/20">
              <span className="text-xs font-mono text-rose-400 font-bold block mb-1">HARD</span>
              <span className="text-xl font-mono font-extrabold text-white">
                {profile.difficultyBreakdown?.hard || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Badges Showcase */}
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase flex items-center justify-between">
            <span>Honors Showcase</span>
            <span className="text-xs text-purple-400 font-normal">
              {profile.badges?.length || 0} Unlocked
            </span>
          </h3>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {profile.badges?.length === 0 ? (
              <span className="text-xs font-mono text-slate-500 py-4">No badges unlocked yet.</span>
            ) : (
              profile.badges?.map((b: any) => (
                <div
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>{b.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Edit Challenger Profile</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">COLLEGE / CAMPUS</label>
                <input
                  type="text"
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  placeholder="e.g. Stanford University"
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">BIO</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell fellow competitors about your coding journey..."
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
