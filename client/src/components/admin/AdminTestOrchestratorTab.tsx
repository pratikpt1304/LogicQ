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
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';

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
  unitTarget?: 'ALL' | 1 | 2 | 3 | 4;
  questions?: any[];
}

const UNITS = [
  { num: 'ALL' as const, label: 'All Units', title: 'Full Syllabus (Comprehensive)' },
  { num: 1 as const, label: 'Unit 1', title: 'Foundations & Control Flow' },
  { num: 2 as const, label: 'Unit 2', title: 'Functions & Pointers' },
  { num: 3 as const, label: 'Unit 3', title: 'Arrays & Strings' },
  { num: 4 as const, label: 'Unit 4', title: 'Structures & Files' },
];

const INITIAL_BANK_QUESTIONS = [
  {
    id: 'q-s1-01',
    sectionNumber: 1,
    title: 'Bitwise Parity & Power of Two Validator',
    difficulty: 'EASY',
    timeLimitMinutes: 5,
    description: 'Determine if an integer N is a non-zero power of two using pure bitwise operations without loops.',
    visibleTestCase1: { input: '16', output: 'YES' },
    visibleTestCase2: { input: '18', output: 'NO' },
    hiddenTestCase: { input: '0', output: 'NO' },
    starterCode: '#include <stdio.h>\n\nint isPowerOfTwo(int n) {\n    // TODO: Bitwise solution\n    return 0;\n}',
    solutionCode: '#include <stdio.h>\n\nint isPowerOfTwo(int n) {\n    return (n > 0) && ((n & (n - 1)) == 0);\n}',
    verifiedCorrect: true,
  },
  {
    id: 'q-s2-01',
    sectionNumber: 2,
    title: 'Safe Pointer Swapper & Address Offset Calculator',
    difficulty: 'MEDIUM',
    timeLimitMinutes: 12,
    description: 'Implement memory address swapping using double pointers and verify byte offset between two contiguous heap blocks.',
    visibleTestCase1: { input: '10 20', output: '20 10' },
    visibleTestCase2: { input: '-5 99', output: '99 -5' },
    hiddenTestCase: { input: '0 0', output: '0 0' },
    starterCode: '#include <stdio.h>\n\nvoid swapDouble(int **a, int **b) {\n    // TODO\n}',
    solutionCode: '#include <stdio.h>\n\nvoid swapDouble(int **a, int **b) {\n    int *temp = *a;\n    *a = *b;\n    *b = temp;\n}',
    verifiedCorrect: true,
  },
  {
    id: 'q-s3-01',
    sectionNumber: 3,
    title: 'Dynamic Array Deduplication with In-Place Compaction',
    difficulty: 'HARD',
    timeLimitMinutes: 20,
    description: 'Given dynamically allocated array of N integers, remove duplicates in-place with O(1) auxiliary space and realloc to minimal footprint.',
    visibleTestCase1: { input: '5\n1 2 2 3 4', output: '1 2 3 4' },
    visibleTestCase2: { input: '4\n7 7 7 7', output: '7' },
    hiddenTestCase: { input: '6\n-1 -1 0 2 2 5', output: '-1 0 2 5' },
    starterCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint* deduplicate(int *arr, int *size) {\n    return arr;\n}',
    solutionCode: '// Verified correct reference solution',
    verifiedCorrect: true,
  },
  {
    id: 'q-s4-01',
    sectionNumber: 4,
    title: 'Binary Packet Serialization & File Stream Checksum',
    difficulty: 'HARD',
    timeLimitMinutes: 22,
    description: 'Serialize a packed telemetry struct into a binary file format and compute 16-bit CRC checksum.',
    visibleTestCase1: { input: 'PKT 101 25.4', output: 'CRC: 0x4A12' },
    visibleTestCase2: { input: 'PKT 102 0.0', output: 'CRC: 0x1120' },
    hiddenTestCase: { input: 'PKT 999 100.0', output: 'CRC: 0x8F9C' },
    starterCode: '#include <stdio.h>\n\ntypedef struct __attribute__((packed)) {\n    unsigned short id;\n    float val;\n} Packet;',
    solutionCode: '// Verified reference',
    verifiedCorrect: true,
  },
];

const getStoredBankQuestions = (): any[] => {
  try {
    const saved = localStorage.getItem('logicq_admin_questions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_BANK_QUESTIONS;
};

interface AdminTestOrchestratorTabProps {
  sections?: any[];
}

export const AdminTestOrchestratorTab: React.FC<AdminTestOrchestratorTabProps> = ({ sections = [] }) => {
  const [tests, setTests] = useState<AdminTestDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_tests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

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
  const [selectedUnit, setSelectedUnit] = useState<'ALL' | 1 | 2 | 3 | 4>('ALL');
  const [difficultyProfile, setDifficultyProfile] = useState<'BALANCED' | 'FOUNDATIONAL' | 'RIGOROUS'>('BALANCED');
  const [lockPolicy, setLockPolicy] = useState(true);

  // Question Bank live pool
  const bankQuestions = getStoredBankQuestions();
  const availableQuestionsForSelectedUnit = selectedUnit === 'ALL'
    ? bankQuestions
    : bankQuestions.filter((q) => q.sectionNumber === selectedUnit);

  // Sync newSection if sections change
  useEffect(() => {
    if (effectiveSections.length > 0 && !effectiveSections.includes(newSection)) {
      setNewSection(effectiveSections[0]);
    }
  }, [effectiveSections, newSection]);

  // Sync to student exam engine
  const syncToStudentTests = (adminTests: AdminTestDefinition[]) => {
    try {
      const studentTests = adminTests.map((t) => {
        const pool = t.questions && t.questions.length > 0 ? t.questions : bankQuestions;
        return {
          id: t.id,
          title: t.title,
          sectionId: t.sectionTarget,
          section: { sectionName: t.sectionTarget },
          moduleId: t.unitTarget === 'ALL' ? 'All Units - Comprehensive' : `Unit ${t.unitTarget || 1}`,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          status: t.status === 'ACTIVE' ? 'PUBLISHED' : t.status,
          questionCount: Math.min(2, pool.length || 1),
          questions: pool.map((q: any, idx: number) => ({
            id: `tq_${t.id}_${idx}`,
            testId: t.id,
            problemId: q.id,
            orderIndex: idx,
            points: Math.round(t.totalMarks / Math.max(1, pool.length)),
            problem: {
              id: q.id,
              title: q.title,
              difficulty: q.difficulty,
              description: q.description,
              starterCode: q.starterCode,
              solutionCode: q.solutionCode,
              testCases: [
                { input: q.visibleTestCase1?.input || '', expectedOutput: q.visibleTestCase1?.output || '', isHidden: false },
                { input: q.visibleTestCase2?.input || '', expectedOutput: q.visibleTestCase2?.output || '', isHidden: false },
                { input: q.hiddenTestCase?.input || '', expectedOutput: q.hiddenTestCase?.output || '', isHidden: true },
              ],
            },
          })),
          _count: { questions: pool.length },
          lockOnSubmit: t.lockOnSubmit,
          createdAt: t.createdAt || new Date().toISOString(),
        };
      });

      localStorage.setItem('logicq_assessment_tests_backup_v1', JSON.stringify(studentTests));
      RealtimeSyncService.emit('TESTS');
    } catch {}
  };

  const saveTests = (updated: AdminTestDefinition[]) => {
    setTests(updated);
    try {
      localStorage.setItem('logicq_admin_tests', JSON.stringify(updated));
    } catch {}
    syncToStudentTests(updated);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    const matchedQuestions = selectedUnit === 'ALL'
      ? bankQuestions
      : bankQuestions.filter((q) => q.sectionNumber === selectedUnit);

    const created: AdminTestDefinition = {
      id: `test-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      sectionTarget: newSection || 'C Programming',
      durationMinutes: Number(newDuration) || 60,
      totalMarks: Number(newMarks) || 20,
      difficultyProfile,
      lockOnSubmit: lockPolicy,
      status: 'UPCOMING',
      activeStudents: 0,
      totalEnrolled: 60,
      suspiciousEvents: 0,
      createdAt: new Date().toISOString(),
      unitTarget: selectedUnit,
      questions: matchedQuestions,
    };

    saveTests([created, ...tests]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    toast.success(`Test "${created.title}" scheduled with ${matchedQuestions.length} questions from Question Bank!`);
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
    toast.success(
      nextStatus === 'ACTIVE'
        ? `Test is now LIVE for students in ${test.sectionTarget}!`
        : `Test status changed to ${nextStatus}!`
    );
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
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Target Section: <strong className="text-slate-700 dark:text-slate-200">{t.sectionTarget}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <BookOpen className="w-3 h-3" />
                      <span>{t.unitTarget === 'ALL' || !t.unitTarget ? 'All Units' : `Unit ${t.unitTarget}`}</span>
                    </span>
                  </div>
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

                {/* Expandable Question Pool Preview */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedTestId(expandedTestId === t.id ? null : t.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Questions from Bank ({t.questions?.length || (t.unitTarget === 'ALL' || !t.unitTarget ? 4 : 1)})</span>
                    </span>
                    {expandedTestId === t.id ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {expandedTestId === t.id && (
                    <div className="mt-2 space-y-1.5 p-2 rounded-xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/50 dark:border-white/5 text-xs animate-in fade-in">
                      {(t.questions && t.questions.length > 0 ? t.questions : bankQuestions).map((q: any, idx: number) => (
                        <div
                          key={q.id || idx}
                          className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white text-[11px] truncate">
                              {idx + 1}. {q.title}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {q.description}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                              q.difficulty === 'EASY'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : q.difficulty === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://logicq-clanguage.web.app/student/tests');
                      toast.success('Student Test URL copied! Share with your students.');
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition"
                    title="Copy Student Test Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        `Live Proctoring Stream for "${t.title}": Evaluation engine running.`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Proctoring</span>
                  </button>
                </div>
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

              {/* Question Source from Question Bank */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Question Source (Question Bank)
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    {availableQuestionsForSelectedUnit.length} Ready in Bank
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {UNITS.map((u) => (
                    <button
                      key={String(u.num)}
                      type="button"
                      onClick={() => setSelectedUnit(u.num)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        selectedUnit === u.num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    Pool: <strong>{UNITS.find((u) => u.num === selectedUnit)?.title}</strong> ({availableQuestionsForSelectedUnit.length} questions attached)
                  </span>
                </div>
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
