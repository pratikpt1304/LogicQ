import React, { useState } from 'react';
import {
  FileText,
  Play,
  Clock,
  Lock,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sliders,
  Calendar,
  Activity,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export interface AdminTestDefinition {
  id: string;
  title: string;
  sectionTarget: string;
  durationMinutes: number;
  totalMarks: number;
  easyPct: number; // target: 40%
  mediumPct: number; // target: 40%
  hardPct: number; // target: 20%
  lockOnSubmit: boolean; // Rule 7: Reattempt prohibited
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  activeStudents: number;
  totalEnrolled: number;
  suspiciousEvents: number;
}

const SAMPLE_TESTS: AdminTestDefinition[] = [];

export const AdminTestOrchestratorTab: React.FC = () => {
  const [tests, setTests] = useState<AdminTestDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_tests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_TESTS;
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSection, setNewSection] = useState('Division A');
  const [newDuration, setNewDuration] = useState(60);
  const [newEasy, setNewEasy] = useState(40);
  const [newMedium, setNewMedium] = useState(40);
  const [newHard, setNewHard] = useState(20);
  const [lockPolicy, setLockPolicy] = useState(true);

  const saveTests = (updated: AdminTestDefinition[]) => {
    setTests(updated);
    try {
      localStorage.setItem('logicq_admin_tests', JSON.stringify(updated));
    } catch {}
  };

  const totalPct = newEasy + newMedium + newHard;
  const isRatioValid = totalPct === 100 && newEasy === 40 && newMedium === 40 && newHard === 20;

  const handleCreateTest = () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a test title.');
      return;
    }
    if (totalPct !== 100) {
      toast.error(`Difficulty percentages must sum to 100% (currently ${totalPct}%).`);
      return;
    }

    const created: AdminTestDefinition = {
      id: `test-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      sectionTarget: newSection,
      durationMinutes: newDuration,
      totalMarks: 40,
      easyPct: newEasy,
      mediumPct: newMedium,
      hardPct: newHard,
      lockOnSubmit: lockPolicy,
      status: 'UPCOMING',
      activeStudents: 0,
      totalEnrolled: 60,
      suspiciousEvents: 0,
    };

    saveTests([created, ...tests]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    toast.success(`Test "${created.title}" configured and assigned!`);
  };

  return (
    <div className="space-y-6">
      {/* Header & 1-Click Creator */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Smart Test Orchestrator & Live Monitor
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Item 14 (40% Easy / 40% Medium / 20% Hard ratio) and Rule 7 (Lock on Submit).
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Schedule Test</span>
          </button>
        </div>
      </div>

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 p-8 space-y-4">
          <Sliders className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Assessment Tests Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <strong>&quot;Create &amp; Schedule Test&quot;</strong> to initialize an examination with 40/40/20 difficulty ratio and locked reattempt rules.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold hover:bg-indigo-500"
          >
            Create Test Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {tests.map((t) => (
          <div
            key={t.id}
            className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    t.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : t.status === 'UPCOMING'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.status === 'ACTIVE' ? '● LIVE PROCTORING' : t.status}
                </span>

                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t.durationMinutes}m
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assigned to: {t.sectionTarget}
                </p>
              </div>

              {/* 40 / 40 / 20 Ratio Badge */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Difficulty Ratio:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {t.easyPct}E / {t.mediumPct}M / {t.hardPct}H
                  </span>
                </div>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div className="bg-emerald-500" style={{ width: `${t.easyPct}%` }} />
                  <div className="bg-amber-500" style={{ width: `${t.mediumPct}%` }} />
                  <div className="bg-rose-500" style={{ width: `${t.hardPct}%` }} />
                </div>
              </div>

              {/* Live Proctoring Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Live Students</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {t.activeStudents} <span className="text-xs text-slate-400">/ {t.totalEnrolled}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Flagged Events</div>
                  <div
                    className={`text-base font-bold mt-0.5 ${
                      t.suspiciousEvents > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {t.suspiciousEvents}
                  </div>
                </div>
              </div>

              {/* Rule 7 Lock Tag */}
              {t.lockOnSubmit && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Rule 7 Policy: Locked upon submit (No reattempts)</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Marks: {t.totalMarks}
              </span>
              <button
                onClick={() =>
                  toast.info(
                    `Proctoring dashboard for "${t.title}": ${t.activeStudents} active streams connected.`
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Feed</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Create Test Modal with 40/40/20 Ratio Calculator */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Assessment Test
                </h3>
                <p className="text-xs text-slate-500">Platform Specification Item 14</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Test Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. End-Semester C Practical Examination"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Target Section
                  </label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Division A">Division A</option>
                    <option value="Division B">Division B</option>
                    <option value="All Divisions">All Divisions (Cohort)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    min={15}
                    max={180}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                  </input>
                </div>
              </div>

              {/* 40 / 40 / 20 Difficulty Ratio Validator */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Difficulty Distribution Calculator
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isRatioValid
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isRatioValid ? 'Standard 40/40/20 Compliant' : `Total: ${totalPct}%`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Easy %</label>
                    <input
                      type="number"
                      value={newEasy}
                      onChange={(e) => setNewEasy(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Medium %</label>
                    <input
                      type="number"
                      value={newMedium}
                      onChange={(e) => setNewMedium(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Hard %</label>
                    <input
                      type="number"
                      value={newHard}
                      onChange={(e) => setNewHard(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500">
                  Specification Item 14 recommends exactly 40% Easy, 40% Medium, and 20% Hard for balanced assessment.
                </div>
              </div>

              {/* Rule 7 Lock Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Lock on Submission (Rule 7)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Reattempt strictly prohibited once submitted.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lockPolicy}
                  onChange={(e) => setLockPolicy(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTest}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Schedule & Assign Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
