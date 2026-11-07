import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Clock,
  Lock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar,
  Activity,
  Check,
  X,
  Trash2,
  GraduationCap,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export interface AdminTestDefinition {
  id: string;
  title: string;
  sectionTarget: string;
  durationMinutes: number;
  totalMarks: number;
  difficultyProfile: 'BALANCED' | 'FOUNDATIONAL' | 'RIGOROUS';
  lockOnSubmit: boolean;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  activeStudents: number;
  totalEnrolled: number;
  suspiciousEvents: number;
  createdAt?: string;
}

interface AdminTestOrchestratorTabProps {
  sections?: any[];
}

const SAMPLE_TESTS: AdminTestDefinition[] = [];

export const AdminTestOrchestratorTab: React.FC<AdminTestOrchestratorTabProps> = ({ sections = [] }) => {
  const [tests, setTests] = useState<AdminTestDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_tests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_TESTS;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Compute actual sections from props or localStorage
  const actualSections = sections.length > 0
    ? sections
    : (() => {
        try {
          const raw = localStorage.getItem('logicq_admin_sections');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();

  const rawNames = actualSections
    .map((s: any) => s.sectionName || s.name || s.subject)
    .filter(Boolean);
  const availableSections = Array.from(new Set(rawNames)) as string[];
  const effectiveSections = availableSections.length > 0 ? availableSections : ['C Programming'];

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSection, setNewSection] = useState(effectiveSections[0]);
  const [newDuration, setNewDuration] = useState(60);
  const [newMarks, setNewMarks] = useState(20);
  const [difficultyProfile, setDifficultyProfile] = useState<'BALANCED' | 'FOUNDATIONAL' | 'RIGOROUS'>('BALANCED');
  const [lockPolicy, setLockPolicy] = useState(true);

  // Sync newSection if sections change
  useEffect(() => {
    if (effectiveSections.length > 0 && !effectiveSections.includes(newSection)) {
      setNewSection(effectiveSections[0]);
    }
  }, [effectiveSections, newSection]);

  const saveTests = (updated: AdminTestDefinition[]) => {
    setTests(updated);
    try {
      localStorage.setItem('logicq_admin_tests', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    const created: AdminTestDefinition = {
      id: `test-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      sectionTarget: newSection || 'Division A',
      durationMinutes: Number(newDuration) || 60,
      totalMarks: Number(newMarks) || 20,
      difficultyProfile,
      lockOnSubmit: lockPolicy,
      status: 'UPCOMING',
      activeStudents: 0,
      totalEnrolled: 60,
      suspiciousEvents: 0,
      createdAt: new Date().toISOString(),
    };

    saveTests([created, ...tests]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    toast.success(`Test "${created.title}" scheduled for ${created.sectionTarget}!`);
  };

  const handleDeleteTest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this test?')) {
      const updated = tests.filter((t) => t.id !== id);
      saveTests(updated);
      toast.info('Test removed.');
    }
  };

  const handleToggleStatus = (test: AdminTestDefinition) => {
    const nextStatus: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' =
      test.status === 'UPCOMING' ? 'ACTIVE' : test.status === 'ACTIVE' ? 'COMPLETED' : 'UPCOMING';
    const updated: AdminTestDefinition[] = tests.map((t) =>
      t.id === test.id
        ? {
            ...t,
            status: nextStatus,
            activeStudents: nextStatus === 'ACTIVE' ? 12 : 0,
          }
        : t
    );
    saveTests(updated);
    toast.success(`Test status changed to ${nextStatus}!`);
  };

  // Filtered List
  const filteredTests = tests.filter((t) => {
    if (activeFilter === 'ACTIVE') return t.status === 'ACTIVE';
    if (activeFilter === 'UPCOMING') return t.status === 'UPCOMING';
    if (activeFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const activeCount = tests.filter((t) => t.status === 'ACTIVE').length;
  const upcomingCount = tests.filter((t) => t.status === 'UPCOMING').length;
  const completedCount = tests.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER & 1-CLICK SCHEDULE BUTTON                      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Assessments &amp; Examinations
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {tests.length} {tests.length === 1 ? 'Test' : 'Tests'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Schedule practical examinations, configure time limits, and monitor live evaluations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Test</span>
          </button>
        </div>

        {/* Apple Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            All Tests ({tests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Live Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'UPCOMING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Scheduled ({upcomingCount})
          </button>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                activeFilter === 'COMPLETED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Completed ({completedCount})
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. APPLE-GRADE ASSESSMENTS GRID                                           */}
      {/* ========================================================================= */}
      {filteredTests.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-8 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Assessments Scheduled Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Schedule a test to assign coding challenges to your students with automatic timer limits and test case verification.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule First Test</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTests.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Status + Time Row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse'
                        : t.status === 'UPCOMING'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.status === 'ACTIVE' ? '● LIVE TEST' : t.status}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTest(t.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    title="Delete Test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Title & Section */}
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Target Section: <strong className="text-slate-700 dark:text-slate-200">{t.sectionTarget}</strong>
                  </p>
                </div>

                {/* Info Bar: Duration & Marks */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t.durationMinutes} mins</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Marks</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t.totalMarks} Marks</span>
                    </span>
                  </div>
                </div>

                {/* Security Tag */}
                {t.lockOnSubmit && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Auto-locked on submit (No re-attempts)</span>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(t)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 transition active:scale-95 cursor-pointer"
                >
                  {t.status === 'ACTIVE' ? 'Mark Completed' : t.status === 'UPCOMING' ? 'Start Test Now' : 'Reactivate'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      `Live Proctoring Stream for "${t.title}": Evaluation engine running.`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Proctoring</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. APPLE MINIMALIST MODAL: SCHEDULE TEST (Simple, 3 Fields Only)          */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sliders className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Schedule Assessment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 1 Practical Assessment"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Section
                  </label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs focus:outline-hidden"
                  >
                    {effectiveSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    {effectiveSections.length > 1 && (
                      <option value="All Sections">All Sections (Cohort)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Marks
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[20, 40, 80].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMarks(m)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${
                          newMarks === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setNewDuration(mins)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        newDuration === mins
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Security Policy Toggle */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Lock on Submission
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Prevents re-attempts after student submits code.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lockPolicy}
                  onChange={(e) => setLockPolicy(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                >
                  Schedule Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
