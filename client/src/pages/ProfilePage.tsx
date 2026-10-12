import React, { useState, useEffect } from 'react';
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
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  PRN_CHANGE_COOLDOWN_DAYS,
  getPrnChangeCooldownStatus,
  containsProfanity,
  maskPrn,
  formatPublicDisplayName,
  generateShortId,
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
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { identifier: paramIdentifier } = useParams<{ identifier?: string }>();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const targetIdentifier = paramIdentifier || currentUser?.id || currentUser?.username;
  const isOwnProfile = Boolean(
    currentUser &&
      (!paramIdentifier ||
        paramIdentifier === currentUser.id ||
        paramIdentifier === currentUser.shortId ||
        paramIdentifier === currentUser.username)
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

  // PRN Change Modal State
  const [isPrnModalOpen, setIsPrnModalOpen] = useState(false);
  const [prnForm, setPrnForm] = useState({
    newPrn: '',
    confirmPrn: '',
    reauthConfirmed: false,
  });
  const [prnError, setPrnError] = useState<string | null>(null);

  // Modal accessibility: lock body scroll and bind Escape key
  useEffect(() => {
    if (!isEditOpen && !isPrnModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPrnModalOpen) {
          setIsPrnModalOpen(false);
        } else {
          setIsEditOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditOpen, isPrnModalOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', targetIdentifier],
    queryFn: () => api.get(`/users/profile/${targetIdentifier}`),
    enabled: !!targetIdentifier,
  });

  const profile = data?.data?.user;

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.put('/users/profile', body),
    onSuccess: async () => {
      toast.success('Profile settings updated successfully!');
      setIsEditOpen(false);
      setEditError(null);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    },
  });

  const prnMutation = useMutation({
    mutationFn: (body: { newPrn: string; confirmPrn: string; reauthConfirmed: boolean }) =>
      api.post('/users/change-prn', body),
    onSuccess: async (res: any) => {
      toast.success(res?.data?.message || 'PRN updated successfully! Your new PRN is active.');
      setIsPrnModalOpen(false);
      setPrnError(null);
      setPrnForm({ newPrn: '', confirmPrn: '', reauthConfirmed: false });
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update PRN';
      setPrnError(msg);
      toast.error(msg);
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
                  {profile.rank ? `RANK #${profile.rank}` : 'NOT RANKED YET'}
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
              {profile.rank ? `Rank #${profile.rank}` : 'Not ranked yet'}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#252C4F] bg-[#141932] shrink-0">
              <h3 id="profile-settings-title" className="text-base font-bold text-[#E8EAF6]">
                Profile & Academic Settings
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                aria-label="Close profile settings"
                className="p-1 text-[#9AA1C4] hover:text-[#E8EAF6] rounded-lg hover:bg-[#252C4F]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with Scrollable Body and Sticky Footer */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {editError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-xs font-mono"
                  >
                    {editError}
                  </div>
                )}

                {/* PRN Row with Monthly Self-Service Change Option & Locked College */}
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2.5 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#9AA1C4]">
                      <KeyRound className="w-3.5 h-3.5 text-[#8B9BFF]" />
                      <span>PRN (Permanent Academic ID):</span>
                      <span className="text-[#E8EAF6] font-bold ml-1">{ownMaskedPrn || '••••••'}</span>
                    </div>

                    {isOwnProfile && (
                      <div>
                        {(() => {
                          const cooldown = getPrnChangeCooldownStatus(profile.prnChangedAt);
                          if (cooldown.isEligible) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setPrnError(null);
                                  setPrnForm({ newPrn: '', confirmPrn: '', reauthConfirmed: false });
                                  setIsPrnModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-[#8B9BFF]/20 hover:bg-[#8B9BFF]/30 text-[#8B9BFF] border border-[#8B9BFF]/40 text-xs font-bold transition-colors"
                              >
                                Change PRN
                              </button>
                            );
                          }
                          const dateStr = cooldown.nextAllowedDate
                            ? cooldown.nextAllowedDate.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '30 days';
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1 rounded bg-[#252C4F]/40 text-[#9AA1C4] border border-[#252C4F] text-xs cursor-not-allowed"
                              title={`Cooldown active: ${cooldown.daysRemaining} days remaining`}
                            >
                              Available again on {dateStr}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[#9AA1C4]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#8B9BFF]" />
                      <span>College (Locked)</span>
                    </span>
                    <span className="text-[#E8EAF6] font-semibold">
                      {profile.college || 'Sanjivani University'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#9AA1C4] pt-1 leading-normal border-t border-[#252C4F]/50">
                    You can change your PRN once every 30 days. College is permanently locked to Sanjivani University.
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
                    placeholder={`Fallback: Student ${profile.shortId || generateShortId(profile.id)}`}
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
              </div>

              {/* Sticky Footer: Always visible on 360px and with mobile keyboard */}
              <div className="p-4 border-t border-[#252C4F] bg-[#141932] flex items-center justify-between shrink-0">
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
                    className="px-4 py-2 rounded-lg text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6] hover:bg-[#252C4F]/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="save-profile-settings-btn"
                    className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PRN Dedicated Confirmation Modal */}
      {isPrnModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-prn-modal-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#252C4F] bg-[#141932] shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#8B9BFF]" />
                <h3 id="change-prn-modal-title" className="text-base font-bold text-[#E8EAF6]">
                  Change Permanent Registration Number
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrnModalOpen(false)}
                aria-label="Close PRN change modal"
                className="p-1 text-[#9AA1C4] hover:text-[#E8EAF6] rounded-lg hover:bg-[#252C4F]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPrnError(null);

                const newPrnTrim = normalizePrn(prnForm.newPrn);
                const confirmPrnTrim = normalizePrn(prnForm.confirmPrn);

                if (!newPrnTrim || !confirmPrnTrim) {
                  setPrnError('Please fill in both PRN fields.');
                  return;
                }
                if (!isValidPrn(newPrnTrim)) {
                  setPrnError(PRN_ERROR_MESSAGE);
                  return;
                }
                if (newPrnTrim !== confirmPrnTrim) {
                  setPrnError('The confirmation PRN does not match the new PRN.');
                  return;
                }
                if (!prnForm.reauthConfirmed) {
                  setPrnError('Please confirm your identity by checking the re-authentication box.');
                  return;
                }

                prnMutation.mutate({
                  newPrn: newPrnTrim,
                  confirmPrn: confirmPrnTrim,
                  reauthConfirmed: prnForm.reauthConfirmed,
                });
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {prnError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-xs font-mono flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{prnError}</span>
                  </div>
                )}

                {/* Important Rolling Cooldown Warning */}
                <div className="p-3.5 rounded-xl bg-[#8B9BFF]/10 border border-[#8B9BFF]/30 text-xs font-mono space-y-1.5">
                  <div className="font-bold text-[#8B9BFF] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#8B9BFF]" />
                    <span>Rolling 30-Day Policy</span>
                  </div>
                  <p className="text-[#E8EAF6] leading-relaxed">
                    You can change your PRN at most <strong>once every 30 days</strong>. Points, streaks, submissions, and ranking history belong to your account and will remain completely intact.
                  </p>
                </div>

                {/* Current Masked PRN */}
                <div className="text-xs font-mono text-[#9AA1C4]">
                  Current PRN: <span className="text-[#E8EAF6] font-bold">{ownMaskedPrn || '••••••••'}</span>
                </div>

                {/* New PRN input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="modal-new-prn"
                      className="block text-xs font-mono text-[#E8EAF6]"
                    >
                      NEW 12-CHARACTER PRN
                    </label>
                    <span className="text-[10px] font-mono text-[#9AA1C4]">
                      {prnForm.newPrn.length}/12
                    </span>
                  </div>
                  <input
                    id="modal-new-prn"
                    type="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={12}
                    value={prnForm.newPrn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, newPrn: val });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text');
                      const val = pasted.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, newPrn: val });
                    }}
                    placeholder="2199TESM0001"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                    required
                  />
                </div>

                {/* Confirm New PRN input */}
                <div>
                  <label
                    htmlFor="modal-confirm-prn"
                    className="block text-xs font-mono text-[#E8EAF6] mb-1"
                  >
                    CONFIRM NEW PRN
                  </label>
                  <input
                    id="modal-confirm-prn"
                    type="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={12}
                    value={prnForm.confirmPrn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, confirmPrn: val });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text');
                      const val = pasted.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, confirmPrn: val });
                    }}
                    placeholder="2199TESM0001"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                    required
                  />
                  {prnForm.confirmPrn.length === 12 && prnForm.newPrn === prnForm.confirmPrn && (
                    <span className="text-[11px] text-[#46D9A0] flex items-center gap-1 mt-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PRN matches
                    </span>
                  )}
                </div>

                {/* Identity Re-authentication Confirmation Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-mono text-[#E8EAF6] leading-relaxed">
                    <input
                      type="checkbox"
                      checked={prnForm.reauthConfirmed}
                      onChange={(e) =>
                        setPrnForm({ ...prnForm, reauthConfirmed: e.target.checked })
                      }
                      className="mt-0.5 rounded border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>
                      I verify that I am the authorized owner of this LogicQ account and understand my PRN will be locked for the next 30 days upon saving.
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-[#252C4F] bg-[#141932] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPrnModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6] hover:bg-[#252C4F]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    prnMutation.isPending ||
                    prnForm.newPrn.length !== 12 ||
                    prnForm.confirmPrn.length !== 12 ||
                    prnForm.newPrn !== prnForm.confirmPrn ||
                    !prnForm.reauthConfirmed
                  }
                  data-testid="confirm-prn-change-btn"
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] disabled:opacity-50 transition-colors"
                >
                  {prnMutation.isPending ? 'Updating PRN...' : 'Confirm PRN Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
