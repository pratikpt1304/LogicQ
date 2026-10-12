import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  containsProfanity,
  maskPrn,
  formatPublicDisplayName,
} from '../config/academic.config.js';
import { toast } from 'sonner';
import {
  Flame,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Edit3,
  X,
  Lock,
  Download,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const targetUsername = paramUsername || currentUser?.username;
  const isOwnProfile = Boolean(
    currentUser &&
      (currentUser.username === targetUsername || currentUser.id === targetUsername)
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    department: '',
    year: '',
    division: '',
    bio: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['profile', targetUsername],
    queryFn: () => api.get(`/users/profile/${targetUsername}`),
    enabled: !!targetUsername,
  });

  const profile = data?.data?.user;

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.put('/users/profile', body),
    onSuccess: async () => {
      toast.success('Profile settings updated successfully!');
      setIsEditOpen(false);
      setEditError(null);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile', targetUsername] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    },
  });

  const handleOpenEdit = () => {
    if (profile) {
      setEditError(null);
      setEditForm({
        displayName: profile.displayName || '',
        department: profile.department || ALLOWED_DEPARTMENTS[0],
        year: profile.year || ALLOWED_YEARS[0],
        division: profile.division || '',
        bio: profile.bio || '',
      });
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const trimmedDisplay = editForm.displayName.trim();
    if (
      trimmedDisplay &&
      (trimmedDisplay.length < DISPLAY_NAME_MIN || trimmedDisplay.length > DISPLAY_NAME_MAX)
    ) {
      setEditError(
        `Display name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`
      );
      return;
    }
    if (trimmedDisplay && containsProfanity(trimmedDisplay)) {
      setEditError('Display name contains inappropriate language.');
      return;
    }

    const trimmedDiv = editForm.division.trim().toUpperCase();
    if (trimmedDiv && !DIVISION_REGEX.test(trimmedDiv)) {
      setEditError('Division must be up to 3 letters or digits (e.g., A, B, C1).');
      return;
    }

    updateMutation.mutate({
      displayName: trimmedDisplay || null,
      department: editForm.department,
      year: editForm.year,
      division: trimmedDiv || null,
      bio: editForm.bio.trim() || null,
    });
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logicq_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Personal data export downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export personal data');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This removes your PRN, frees your PRN registration, and clears your profile fields.'
    );
    if (!confirmed) return;

    try {
      await api.delete('/users/me');
      toast.success('Account deleted and PRN freed.');
      await logout();
      navigate('/landing');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center font-mono text-[#8B9BFF] text-sm">
        Loading challenger profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center font-mono space-y-4">
        <h2 className="text-xl font-bold text-[#E8EAF6]">Challenger not found</h2>
        <Link to="/leaderboard" className="text-[#8B9BFF] underline">
          &larr; View competitive leaderboard
        </Link>
      </div>
    );
  }

  const publicLabel = formatPublicDisplayName(profile);
  const ownMaskedPrn = isOwnProfile ? profile.maskedPrn || maskPrn(profile.prn) : null;
  const headerTitle = isOwnProfile
    ? profile.displayName ||
      [profile.department, profile.year, ownMaskedPrn].filter(Boolean).join(' • ') ||
      publicLabel
    : publicLabel;

  const solvedByDiff = profile.solvedByDifficulty || profile.difficultyBreakdown || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#8B9BFF] flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-[#0C0F1F] shadow-xl font-mono shrink-0">
              {(publicLabel || 'S').charAt(0).toUpperCase()}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#E8EAF6]">{headerTitle}</h1>
                <span className="text-xs font-mono font-bold text-[#8B9BFF] bg-[#8B9BFF]/15 border border-[#8B9BFF]/40 px-2.5 py-0.5 rounded">
                  RANK #{profile.rank || 1}
                </span>
                {isOwnProfile && ownMaskedPrn && (
                  <span
                    data-testid="own-masked-prn"
                    className="text-xs font-mono font-semibold text-[#46D9A0] bg-[#46D9A0]/10 border border-[#46D9A0]/30 px-2.5 py-0.5 rounded"
                  >
                    PRN: {ownMaskedPrn}
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-[#9AA1C4]">
                Public Display Label: <strong className="text-[#E8EAF6]">{publicLabel}</strong>
              </p>

              {/* Academic Tags: College, Department, Year, Division */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]">
                  <Building2 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                  <span>{profile.college || 'Sanjivani University'}</span>
                </span>
                {profile.department && (
                  <span
                    data-testid="profile-department"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#46D9A0]" />
                    <span>{profile.department}</span>
                  </span>
                )}
                {profile.year && (
                  <span
                    data-testid="profile-year"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Year: {profile.year}</span>
                  </span>
                )}
                {profile.division && (
                  <span
                    data-testid="profile-division"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#9AA1C4]" />
                    <span>Div: {profile.division}</span>
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-[#E8EAF6] mt-2 max-w-xl leading-relaxed font-sans">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEdit}
                data-testid="edit-profile-btn"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                <span>Profile Settings</span>
              </button>
              <button
                type="button"
                onClick={handleExportData}
                data-testid="export-data-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#46D9A0]" />
                <span>Export Data</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                data-testid="delete-account-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#FF7A8A] bg-[#FF7A8A]/10 hover:bg-[#FF7A8A]/20 border border-[#FF7A8A]/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">TOTAL SCORE</span>
          <span className="text-2xl font-extrabold text-[#8B9BFF] font-mono">
            {profile.totalPoints || 0} PTS
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">CURRENT STREAK</span>
          <span className="text-2xl font-extrabold text-[#46D9A0] font-mono flex items-center gap-1">
            <Flame className="w-6 h-6" />
            {profile.currentStreak || 0}d
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">LONGEST STREAK</span>
          <span className="text-2xl font-extrabold text-[#E8EAF6] font-mono">
            {profile.longestStreak || 0} days
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">PROBLEMS SOLVED</span>
          <span className="text-2xl font-extrabold text-[#46D9A0] font-mono">
            {profile.totalSolved || 0}
          </span>
        </div>
      </div>

      {/* Two Column: Solved Breakdown & Streak / Standing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
          <h2 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase">
            Solved by Difficulty
          </h2>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center">
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#46D9A0]/30">
              <span className="text-xs font-mono text-[#46D9A0] font-bold block mb-1">EASY</span>
              <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
                {solvedByDiff.EASY ?? solvedByDiff.easy ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#8B9BFF]/30">
              <span className="text-xs font-mono text-[#8B9BFF] font-bold block mb-1">MEDIUM</span>
              <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
                {solvedByDiff.MEDIUM ?? solvedByDiff.medium ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#FF7A8A]/30">
              <span className="text-xs font-mono text-[#FF7A8A] font-bold block mb-1">HARD</span>
              <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
                {solvedByDiff.HARD ?? solvedByDiff.hard ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
          <h2 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase flex items-center justify-between">
            <span>Streak &amp; Cohort Standing</span>
            <span className="text-xs text-[#46D9A0] font-normal">
              Rank #{profile.rank || 1}
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[#9AA1C4] block mb-1">WEEKLY FREEZE</span>
              <span className="text-sm font-bold text-[#46D9A0]">1 Auto Freeze / Week</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[#9AA1C4] block mb-1">RECENT SUBMISSIONS</span>
              <span className="text-sm font-bold text-[#E8EAF6]">
                {profile.recentSubmissions?.length || 0} Recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Settings Modal */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="w-full max-w-md glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 id="profile-settings-title" className="text-base font-bold text-[#E8EAF6]">
                Profile & Academic Settings
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                aria-label="Close profile settings"
                className="text-[#9AA1C4] hover:text-[#E8EAF6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-xs font-mono"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Locked PRN & College (Admin-only change) */}
              <div className="p-3 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#9AA1C4]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>PRN (Locked)</span>
                  </span>
                  <span className="text-[#E8EAF6] font-bold">{ownMaskedPrn || '••••••'}</span>
                </div>
                <div className="flex items-center justify-between text-[#9AA1C4]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>College (Locked)</span>
                  </span>
                  <span className="text-[#E8EAF6]">
                    {profile.college || 'Sanjivani University'}
                  </span>
                </div>
                <p className="text-[11px] text-[#9AA1C4] pt-1">
                  Students cannot change PRN or College after signup. Contact an administrator if a correction is needed.
                </p>
              </div>

              {/* Optional Public Display Name (3-20 chars) */}
              <div>
                <label
                  htmlFor="edit-display-name"
                  className="block text-xs font-mono text-[#E8EAF6] mb-1"
                >
                  PUBLIC DISPLAY NAME (OPTIONAL, 3–20 CHARS)
                </label>
                <input
                  id="edit-display-name"
                  type="text"
                  maxLength={20}
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder={`Fallback: Student ${profile.shortId || '4F9A'}`}
                  className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                />
                <span className="text-[11px] text-[#9AA1C4] block mt-1">
                  Shown to other students on the leaderboard instead of your PRN.
                </span>
              </div>

              {/* Department & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-department"
                    className="block text-xs font-mono text-[#E8EAF6] mb-1"
                  >
                    DEPARTMENT
                  </label>
                  <select
                    id="edit-department"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                  >
                    {ALLOWED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#141932] text-[#E8EAF6]">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-year"
                    className="block text-xs font-mono text-[#E8EAF6] mb-1"
                  >
                    ACADEMIC YEAR
                  </label>
                  <select
                    id="edit-year"
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                  >
                    {ALLOWED_YEARS.map((yr) => (
                      <option key={yr} value={yr} className="bg-[#141932] text-[#E8EAF6]">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Division */}
              <div>
                <label
                  htmlFor="edit-division"
                  className="block text-xs font-mono text-[#E8EAF6] mb-1"
                >
                  DIVISION (OPTIONAL, UP TO 3 CHARS)
                </label>
                <input
                  id="edit-division"
                  type="text"
                  maxLength={3}
                  value={editForm.division}
                  onChange={(e) =>
                    setEditForm({ ...editForm, division: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. A, B, C1"
                  className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono uppercase"
                />
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="edit-bio" className="block text-xs font-mono text-[#E8EAF6] mb-1">
                  BIO
                </label>
                <textarea
                  id="edit-bio"
                  rows={2}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell fellow competitors about your C programming journey..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/privacy"
                  className="text-xs font-mono text-[#8B9BFF] hover:underline flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Privacy Policy</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF]"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
