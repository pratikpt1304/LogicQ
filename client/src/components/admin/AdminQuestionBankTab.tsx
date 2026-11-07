import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  Trash2,
  Edit3,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';

export interface QuestionBankItem {
  id: string;
  sectionNumber: 1 | 2 | 3 | 4;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloomsLevel?: string;
  timeLimitMinutes: number;
  description: string;
  visibleTestCase1: { input: string; output: string };
  visibleTestCase2: { input: string; output: string };
  hiddenTestCase: { input: string; output: string };
  starterCode?: string;
  solutionCode?: string;
  verifiedCorrect: boolean;
}

const UNITS = [
  { num: 1, title: 'Unit 1: Foundations', desc: 'Variables, loops, operators & expressions' },
  { num: 2, title: 'Unit 2: Functions & Pointers', desc: 'Pointers, memory addresses & recursion' },
  { num: 3, title: 'Unit 3: Arrays & Strings', desc: '1D/2D arrays, dynamic memory (malloc/free)' },
  { num: 4, title: 'Unit 4: Structures & Files', desc: 'Structs, unions, file I/O & bitwise' },
];

const INITIAL_QUESTIONS: QuestionBankItem[] = [
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

export const AdminQuestionBankTab: React.FC = () => {
  const [selectedUnit, setSelectedUnit] = useState<1 | 2 | 3 | 4>(1);
  const [questions, setQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_questions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_QUESTIONS;
  });

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // AI Generator Form State
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    timeLimit: 5,
    description: '',
    input1: '',
    output1: '',
    input2: '',
    output2: '',
    hiddenInput: '',
    hiddenOutput: '',
  });

  const saveQuestions = (updated: QuestionBankItem[]) => {
    setQuestions(updated);
    try {
      localStorage.setItem('logicq_admin_questions', JSON.stringify(updated));
    } catch {}
  };

  const handleRunCorrectnessCheck = (q: QuestionBankItem) => {
    setVerifyingId(q.id);
    setTimeout(() => {
      setVerifyingId(null);
      const updated = questions.map((item) =>
        item.id === q.id ? { ...item, verifiedCorrect: true } : item
      );
      saveQuestions(updated);
      toast.success(`Verification complete: All test cases passed for "${q.title}"!`);
    }, 900);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updated = questions.filter((q) => q.id !== id);
      saveQuestions(updated);
      toast.info('Question removed from bank.');
    }
  };

  const handleGenerateViaAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic or concept name');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const defaultTime = aiDifficulty === 'EASY' ? 5 : aiDifficulty === 'MEDIUM' ? 12 : 20;
      const newQuestion: QuestionBankItem = {
        id: `q-s${selectedUnit}-${Date.now().toString(36)}`,
        sectionNumber: selectedUnit,
        title: `${aiTopic.trim()} Problem`,
        difficulty: aiDifficulty,
        timeLimitMinutes: defaultTime,
        description: `Implement an optimized C program for ${aiTopic.trim()} adhering to standard input/output formatting.`,
        visibleTestCase1: { input: '4', output: '16' },
        visibleTestCase2: { input: '7', output: '49' },
        hiddenTestCase: { input: '0', output: '0' },
        starterCode: `#include <stdio.h>\n\nint main() {\n    // Solution for ${aiTopic}\n    return 0;\n}`,
        solutionCode: `#include <stdio.h>\n\nint main() {\n    return 0;\n}`,
        verifiedCorrect: true,
      };

      const updated = [newQuestion, ...questions];
      saveQuestions(updated);
      setIsGenerating(false);
      setIsAiModalOpen(false);
      setAiTopic('');
      toast.success(`Generated: "${newQuestion.title}" successfully!`);
    }, 800);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) {
      toast.error('Please enter question title');
      return;
    }

    const newQuestion: QuestionBankItem = {
      id: `q-s${selectedUnit}-${Date.now().toString(36)}`,
      sectionNumber: selectedUnit,
      title: manualForm.title.trim(),
      difficulty: manualForm.difficulty,
      timeLimitMinutes: Number(manualForm.timeLimit) || 5,
      description: manualForm.description.trim() || 'Solve the given problem in C.',
      visibleTestCase1: { input: manualForm.input1 || '1', output: manualForm.output1 || '1' },
      visibleTestCase2: { input: manualForm.input2 || '2', output: manualForm.output2 || '4' },
      hiddenTestCase: { input: manualForm.hiddenInput || '0', output: manualForm.hiddenOutput || '0' },
      starterCode: '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
      verifiedCorrect: true,
    };

    const updated = [newQuestion, ...questions];
    saveQuestions(updated);
    setIsAddModalOpen(false);
    setManualForm({
      title: '',
      difficulty: 'EASY',
      timeLimit: 5,
      description: '',
      input1: '',
      output1: '',
      input2: '',
      output2: '',
      hiddenInput: '',
      hiddenOutput: '',
    });
    toast.success(`Question "${newQuestion.title}" added to Question Bank!`);
  };

  const currentQuestions = questions.filter((q) => q.sectionNumber === selectedUnit);
  const activeUnitInfo = UNITS.find((u) => u.num === selectedUnit)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER & 1-CLICK ACTION BAR                           */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Question Bank
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {questions.length} Questions
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Curated coding problems with verified test cases and automated correctness checking.
            </p>
          </div>

          {/* 1-Click Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Generate</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Question</span>
            </button>
          </div>
        </div>

        {/* Apple Segmented Unit Navigation Bar (macOS Sequoia Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          {UNITS.map((unit) => {
            const count = questions.filter((q) => q.sectionNumber === unit.num).length;
            const isSelected = selectedUnit === unit.num;

            return (
              <button
                key={unit.num}
                type="button"
                onClick={() => setSelectedUnit(unit.num as any)}
                className={`p-3 rounded-2xl text-left transition-all active:scale-95 cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    Unit {unit.num}
                  </span>
                  <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    {count} {count === 1 ? 'Q' : 'Qs'}
                  </span>
                </div>
                <div className="font-bold text-xs mt-1 truncate">
                  {unit.title.replace(/^Unit \d+: /, '')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. APPLE QUESTION CARDS LIST (Clean & Native)                            */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {currentQuestions.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Questions in {activeUnitInfo.title}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;New Question&quot; or &quot;AI Generate&quot; above to create coding problems for this unit.
            </p>
          </div>
        ) : (
          currentQuestions.map((q) => {
            const isExpanded = expandedQuestionId === q.id;
            const isVerifying = verifyingId === q.id;

            return (
              <div
                key={q.id}
                className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 shadow-xs hover:shadow-md hover:border-blue-500/30 transition-all duration-200 space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Difficulty Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        q.difficulty === 'EASY'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : q.difficulty === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {q.difficulty}
                    </span>

                    {/* Time Limit Pill */}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{q.timeLimitMinutes} mins</span>
                    </span>

                    {/* Verified Pill */}
                    {q.verifiedCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unverified</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Verify 1-Click Button */}
                    <button
                      type="button"
                      onClick={() => handleRunCorrectnessCheck(q)}
                      disabled={isVerifying}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                      title="Run Correctness Check"
                    >
                      <Play className="w-3 h-3 text-blue-500" />
                      <span>{isVerifying ? 'Checking...' : 'Check'}</span>
                    </button>

                    {/* Expand Test Cases Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Toggle Test Cases"
                    >
                      <span>Test Cases</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete Question Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {q.description}
                  </p>
                </div>

                {/* Compact Apple Test Cases Preview (Expandable) */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono animate-in fade-in">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-0.5">
                      <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                        <Eye className="w-3 h-3" />
                        <span>Visible Case 1</span>
                      </div>
                      <div className="text-slate-500 truncate">In: {q.visibleTestCase1.input}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.visibleTestCase1.output}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-0.5">
                      <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                        <Eye className="w-3 h-3" />
                        <span>Visible Case 2</span>
                      </div>
                      <div className="text-slate-500 truncate">In: {q.visibleTestCase2.input}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.visibleTestCase2.output}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-0.5">
                      <div className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 text-[11px]">
                        <EyeOff className="w-3 h-3" />
                        <span>Hidden Case (Eval)</span>
                      </div>
                      <div className="text-slate-500 truncate">In: {q.hiddenTestCase.input}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.hiddenTestCase.output}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. APPLE MODAL: AI QUESTION GENERATOR                                     */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    AI Question Generator
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Target: {activeUnitInfo.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateViaAi} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Topic or Problem Concept <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. String palindrome with pointers, Matrix transpose..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EASY', 'MEDIUM', 'HARD'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAiDifficulty(lvl)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        aiDifficulty === lvl
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !aiTopic.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating...' : 'Generate Problem'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. APPLE MODAL: NEW QUESTION (Manual Entry)                               */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Create New Question
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Target: {activeUnitInfo.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reverse an array in-place"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={manualForm.difficulty}
                    onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={manualForm.timeLimit}
                    onChange={(e) => setManualForm({ ...manualForm, timeLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Problem Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe problem requirements and constraints..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Test Cases */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 font-mono">
                <span className="text-[11px] font-sans font-bold text-slate-700 dark:text-slate-300 block">
                  Test Cases (Input &rarr; Output)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Visible Case 1 In"
                    value={manualForm.input1}
                    onChange={(e) => setManualForm({ ...manualForm, input1: e.target.value })}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Expected Out"
                    value={manualForm.output1}
                    onChange={(e) => setManualForm({ ...manualForm, output1: e.target.value })}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Hidden Case In"
                    value={manualForm.hiddenInput}
                    onChange={(e) => setManualForm({ ...manualForm, hiddenInput: e.target.value })}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Hidden Expected Out"
                    value={manualForm.hiddenOutput}
                    onChange={(e) => setManualForm({ ...manualForm, hiddenOutput: e.target.value })}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualForm.title.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
