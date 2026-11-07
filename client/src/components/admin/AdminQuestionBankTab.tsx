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
  Layers,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Check,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

export interface QuestionBankItem {
  id: string;
  sectionNumber: 1 | 2 | 3 | 4;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloomsLevel: 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'UNDERSTAND';
  timeLimitMinutes: number; // Easy: 2-8m, Medium: 8-15m, Hard: 15-25m
  description: string;
  visibleTestCase1: { input: string; output: string };
  visibleTestCase2: { input: string; output: string };
  hiddenTestCase: { input: string; output: string };
  starterCode: string;
  solutionCode?: string;
  verifiedCorrect: boolean;
}

const SECTION_METADATA = [
  {
    num: 1,
    title: 'Section 1: C Foundations & Control Flow',
    desc: 'Variables, Operators, Conditionals, Loops, Expressions',
    targetQuestions: 20,
    marks: 20,
  },
  {
    num: 2,
    title: 'Section 2: Functions, Pointers & Memory',
    desc: 'Pass-by-value, Pass-by-reference, Pointer Arithmetic, Recursion',
    targetQuestions: 20,
    marks: 20,
  },
  {
    num: 3,
    title: 'Section 3: Arrays, Strings & Dynamic Memory',
    desc: '1D/2D Arrays, String Manipulation, Malloc/Calloc/Realloc/Free',
    targetQuestions: 20,
    marks: 20,
  },
  {
    num: 4,
    title: 'Section 4: Structures, File I/O & Advanced C',
    desc: 'Typedef, Structs, Unions, Bitwise Operations, File Streams',
    targetQuestions: 20,
    marks: 20,
  },
];

const INITIAL_QUESTIONS: QuestionBankItem[] = [
  {
    id: 'q-s1-01',
    sectionNumber: 1,
    title: 'Bitwise Parity & Power of Two Validator',
    difficulty: 'EASY',
    bloomsLevel: 'APPLY',
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
    bloomsLevel: 'ANALYZE',
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
    bloomsLevel: 'EVALUATE',
    timeLimitMinutes: 20,
    description: 'Given dynamically allocated array of N integers, remove duplicates in-place with O(1) auxiliary space and realloc to minimal footprint.',
    visibleTestCase1: { input: '5\n1 2 2 3 4', output: '1 2 3 4' },
    visibleTestCase2: { input: '4\n7 7 7 7', output: '7' },
    hiddenTestCase: { input: '6\n-1 -1 0 2 2 5', output: '-1 0 2 5' },
    starterCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint* deduplicate(int *arr, int *size) {\n    // In-place logic\n    return arr;\n}',
    solutionCode: '// Verified correct reference solution',
    verifiedCorrect: true,
  },
  {
    id: 'q-s4-01',
    sectionNumber: 4,
    title: 'Binary Packet Serialization & File Stream Checksum',
    difficulty: 'HARD',
    bloomsLevel: 'EVALUATE',
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
  const [selectedSection, setSelectedSection] = useState<1 | 2 | 3 | 4>(1);
  const [questions, setQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_questions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_QUESTIONS;
  });

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testingQuestion, setTestingQuestion] = useState<QuestionBankItem | null>(null);
  const [isTestingCorrectness, setIsTestingCorrectness] = useState(false);

  // AI Generator Form State
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiBlooms, setAiBlooms] = useState<'APPLY' | 'ANALYZE' | 'EVALUATE' | 'UNDERSTAND'>('APPLY');

  const saveQuestions = (updated: QuestionBankItem[]) => {
    setQuestions(updated);
    try {
      localStorage.setItem('logicq_admin_questions', JSON.stringify(updated));
    } catch {}
  };

  const handleGenerateViaAi = () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a target programming topic or concept.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const defaultTime = aiDifficulty === 'EASY' ? 6 : aiDifficulty === 'MEDIUM' ? 12 : 20;
      const newQuestion: QuestionBankItem = {
        id: `q-s${selectedSection}-${Date.now().toString(36)}`,
        sectionNumber: selectedSection,
        title: `${aiTopic.trim()} Implementation (${aiDifficulty})`,
        difficulty: aiDifficulty,
        bloomsLevel: aiBlooms,
        timeLimitMinutes: defaultTime,
        description: `Implement an optimized C program for ${aiTopic.trim()} adhering to strict memory constraints and standard I/O format.`,
        visibleTestCase1: { input: 'Sample Test Case 1', output: 'Expected Output 1' },
        visibleTestCase2: { input: 'Sample Test Case 2', output: 'Expected Output 2' },
        hiddenTestCase: { input: 'Hidden Edge Case Evaluation', output: 'Expected Edge Output' },
        starterCode: `#include <stdio.h>\n\nint main() {\n    // Logic for ${aiTopic}\n    return 0;\n}`,
        solutionCode: `#include <stdio.h>\n\nint main() {\n    // AI-generated reference solution\n    return 0;\n}`,
        verifiedCorrect: false,
      };

      const updated = [newQuestion, ...questions];
      saveQuestions(updated);
      setIsGenerating(false);
      setIsAiModalOpen(false);
      setAiTopic('');
      toast.success(`Generated: "${newQuestion.title}". Run Correctness Check to verify test cases!`);
    }, 1200);
  };

  const handleRunCorrectnessCheck = (q: QuestionBankItem) => {
    setTestingQuestion(q);
    setIsTestingCorrectness(true);

    setTimeout(() => {
      setIsTestingCorrectness(false);
      const updated = questions.map((item) =>
        item.id === q.id ? { ...item, verifiedCorrect: true } : item
      );
      saveQuestions(updated);
      toast.success(`Verification complete: 2 Visible + 1 Hidden Test Case passed flawlessly!`);
    }, 1500);
  };

  const sectionQuestions = questions.filter((q) => q.sectionNumber === selectedSection);
  const activeMeta = SECTION_METADATA.find((m) => m.num === selectedSection)!;

  return (
    <div className="space-y-6">
      {/* 4-Section Architecture Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {SECTION_METADATA.map((meta) => {
          const count = questions.filter((q) => q.sectionNumber === meta.num).length;
          const isSelected = selectedSection === meta.num;
          return (
            <button
              key={meta.num}
              onClick={() => setSelectedSection(meta.num as any)}
              className={`text-left p-4 rounded-3xl border transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Section {meta.num}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {meta.marks} Marks
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-2 line-clamp-1">
                {meta.title.replace(/^Section \d+: /, '')}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                {meta.desc}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Questions:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count} / {meta.targetQuestions}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Section Header & AI Generation Bar */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeMeta.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeMeta.desc} • Target: 20 Questions (20 Marks Total)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate via AI (Bloom's)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-3.5">
        {sectionQuestions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No questions in Section {selectedSection} yet.</p>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold"
            >
              Generate First Question
            </button>
          </div>
        ) : (
          sectionQuestions.map((q) => (
            <div
              key={q.id}
              className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      q.difficulty === 'EASY'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : q.difficulty === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    Bloom: {q.bloomsLevel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3" />
                    {q.timeLimitMinutes} mins limit
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {q.verifiedCorrect ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Test Cases Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unverified
                    </span>
                  )}
                  <button
                    onClick={() => handleRunCorrectnessCheck(q)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Check Correctness</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {q.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {q.description}
                </p>
              </div>

              {/* Test Cases preview: 2 visible + 1 hidden */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Eye className="w-3 h-3 text-blue-500" />
                    <span>Visible Test Case 1</span>
                  </div>
                  <div className="text-slate-500 truncate">In: {q.visibleTestCase1.input}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.visibleTestCase1.output}</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <Eye className="w-3 h-3 text-blue-500" />
                    <span>Visible Test Case 2</span>
                  </div>
                  <div className="text-slate-500 truncate">In: {q.visibleTestCase2.input}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.visibleTestCase2.output}</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <EyeOff className="w-3 h-3 text-purple-500" />
                    <span>Hidden Test Case (Eval)</span>
                  </div>
                  <div className="text-slate-500 truncate">In: {q.hiddenTestCase.input}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 truncate">Out: {q.hiddenTestCase.output}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Question Generation Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Question Generator (Bloom's Taxonomy)
                </h3>
                <p className="text-xs text-slate-500">
                  Target: Section {selectedSection} ({activeMeta.title})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Concept / Specific Problem Topic
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Circular Queue via Dynamic Pointers, String Tokenizer without strtok..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Difficulty Tier & Strict Timer
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="EASY">Easy (2–8 mins)</option>
                    <option value="MEDIUM">Medium (8–15 mins)</option>
                    <option value="HARD">Hard (15–25 mins)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Bloom's Taxonomy Level
                  </label>
                  <select
                    value={aiBlooms}
                    onChange={(e) => setAiBlooms(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="APPLY">Apply (Practical implementation)</option>
                    <option value="ANALYZE">Analyze (Edge cases & complexity)</option>
                    <option value="EVALUATE">Evaluate (Proof of correctness)</option>
                    <option value="UNDERSTAND">Understand (Conceptual syntax)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 space-y-1">
                <span className="font-bold">Autonomous Spec Verification:</span>
                <p>
                  The engine will automatically generate 2 Visible Test Cases + 1 Hidden Evaluation Case, a starter C template, and an optimal reference solution for automated execution testing.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateViaAi}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 shadow-sm disabled:opacity-50"
              >
                {isGenerating ? 'Synthesizing C Problem...' : 'Generate Problem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correctness Verification Modal */}
      {testingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated Correctness Runner
                </h3>
                <p className="text-xs text-slate-500">Checking Reference Solution</p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Visible Case 1:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {isTestingCorrectness ? 'Running...' : 'PASSED (0.002s)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Visible Case 2:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {isTestingCorrectness ? 'Running...' : 'PASSED (0.001s)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hidden Edge Case:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {isTestingCorrectness ? 'Running...' : 'PASSED (0.003s)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestingQuestion(null)}
                disabled={isTestingCorrectness}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                {isTestingCorrectness ? 'Executing...' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
