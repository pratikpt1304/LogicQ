import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Plus,
  Search,
  Check,
  ShieldCheck,
  FileCode,
  AlertTriangle,
  Play,
  RotateCcw,
  Eye,
  Sliders,
} from 'lucide-react';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderIndex: number;
}

interface QuestionItem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  module: string | null;
  section: string | null;
  topic: string | null;
  learningOutcome: string | null;
  bloomsLevel: string | null;
  scenario: string | null;
  expectedTimeMin: number | null;
  expectedTimeMax: number | null;
  validationStatus: string;
  validationDetails: string | null;
  status: string;
  createdAt: string;
  description?: string | null;
  problemStatement?: string | null;
  testCases?: TestCase[];
}

export const QuestionBankPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [inspectQuestion, setInspectQuestion] = useState<QuestionItem | null>(null);

  // AI Gen Form State
  const [aiForm, setAiForm] = useState({
    module: 'Module 1 - C Fundamentals',
    section: 'Section 1',
    topic: 'Nested Loops and 2D Grid Traversal',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    bloomsLevel: 'APPLY' as 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE',
    scenarioContext: 'Industrial robotics coordinate translation',
    learningOutcome: 'Apply nested iterations to compute path metrics',
  });

  // Query question bank
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['question-bank', selectedModule, selectedSection, selectedDifficulty, selectedStatus, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedModule) params.append('module', selectedModule);
      if (selectedSection) params.append('section', selectedSection);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedStatus) params.append('validationStatus', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/questions/bank?${params.toString()}`);
      return res.questions || [];
    },
  });

  const questions: QuestionItem[] = Array.isArray(data) ? data : [];

  // AI Generation Mutation
  const generateAiMutation = useMutation({
    mutationFn: async (payload: typeof aiForm) => {
      return await api.post('/questions/generate-ai', payload);
    },
    onSuccess: (res) => {
      toast.success('Question generated and compiled against C sandbox!');
      setIsAiModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
      if (res.data?.problem) {
        setInspectQuestion(res.data.problem);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'AI Generation failed.');
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (problemId: string) => {
      return await api.post(`/questions/${problemId}/approve`);
    },
    onSuccess: () => {
      toast.success('Question approved and published for assessments!');
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
      if (inspectQuestion) {
        setInspectQuestion({ ...inspectQuestion, validationStatus: 'FACULTY_APPROVED', status: 'PUBLISHED' });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Approval failed.');
    },
  });

  // Re-Validate Mutation
  const validateMutation = useMutation({
    mutationFn: async (problemId: string) => {
      return await api.post(`/questions/${problemId}/validate`);
    },
    onSuccess: (res) => {
      if (res.outcome?.isValid) {
        toast.success('C Sandbox Check: Passed all 3 test cases!');
      } else {
        toast.error(`Validation Failed: ${res.outcome?.failureReason || 'Mismatch'}`);
      }
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Validation runner failed.');
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Question Bank & AI Generator
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Generate AI programming questions with automated C sandbox compilation check (2 visible + 1 hidden test case).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search topic or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
        >
          <option value="">All Modules</option>
          <option value="Module 1 - C Fundamentals">Module 1 - C Fundamentals</option>
          <option value="Module 2 - Pointers & Functions">Module 2 - Pointers & Functions</option>
          <option value="Module 3 - Structures & Memory">Module 3 - Structures & Memory</option>
          <option value="Module 4 - Algorithms & Complexity">Module 4 - Algorithms & Complexity</option>
        </select>

        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
        >
          <option value="">All Sections (1-4)</option>
          <option value="Section 1">Section 1 (20 Qs)</option>
          <option value="Section 2">Section 2 (20 Qs)</option>
          <option value="Section 3">Section 3 (20 Qs)</option>
          <option value="Section 4">Section 4 (20 Qs)</option>
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy (2–8 min)</option>
          <option value="MEDIUM">Medium (8–15 min)</option>
          <option value="HARD">Hard (15–25 min)</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
        >
          <option value="">All Validation Statuses</option>
          <option value="VALIDATION_PASSED">Validation Passed</option>
          <option value="VALIDATION_FAILED">Validation Failed</option>
          <option value="FACULTY_APPROVED">Faculty Approved</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {/* Questions Table */}
      <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Title & Topic</th>
                <th className="py-3 px-4">Module & Section</th>
                <th className="py-3 px-4">Difficulty & Expected Time</th>
                <th className="py-3 px-4">Sandbox Correctness</th>
                <th className="py-3 px-4">Lifecycle Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-foreground)] font-mono animate-pulse">
                    Loading question bank...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-foreground)] space-y-2">
                    <p className="font-semibold text-[var(--foreground)]">No questions found matching criteria.</p>
                    <p className="text-xs">Click "Generate with AI" to generate validated C programming challenges.</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isPassed = q.validationStatus === 'VALIDATION_PASSED' || q.validationStatus === 'FACULTY_APPROVED';
                  const isApproved = q.validationStatus === 'FACULTY_APPROVED';

                  return (
                    <tr key={q.id} className="hover:bg-[var(--accent)]/5 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[var(--foreground)] text-sm">{q.title}</div>
                        <div className="text-xs text-[var(--muted-foreground)] font-mono">
                          {q.topic || 'General Algorithms'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-[var(--foreground)] font-medium">{q.module || 'Module 1'}</div>
                        <div className="text-[11px] text-indigo-400">{q.section || 'Section 1'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            q.difficulty === 'EASY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.difficulty === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {q.expectedTimeMin ?? 2}–{q.expectedTimeMax ?? 8} min
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {q.validationStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            isApproved
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setInspectQuestion(q)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)]"
                          title="View Question Details"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Inspect
                        </button>

                        <button
                          onClick={() => validateMutation.mutate(q.id)}
                          disabled={validateMutation.isPending}
                          className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          title="Re-run C Sandbox Check"
                        >
                          <Play className="w-3.5 h-3.5 inline mr-1" />
                          Re-check
                        </button>

                        {!isApproved && (
                          <button
                            onClick={() => approveMutation.mutate(q.id)}
                            disabled={approveMutation.isPending || !isPassed}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-40"
                            title="Approve for Test Assignment"
                          >
                            <Check className="w-3.5 h-3.5 inline mr-1" />
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI GENERATION MODAL (Section 16) */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">AI Question Generator</h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Target Module</label>
                  <select
                    value={aiForm.module}
                    onChange={(e) => setAiForm({ ...aiForm, module: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    <option value="Module 1 - C Fundamentals">Module 1 - C Fundamentals</option>
                    <option value="Module 2 - Pointers & Functions">Module 2 - Pointers & Functions</option>
                    <option value="Module 3 - Structures & Memory">Module 3 - Structures & Memory</option>
                    <option value="Module 4 - Algorithms & Complexity">Module 4 - Algorithms & Complexity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Section (1 to 4)</label>
                  <select
                    value={aiForm.section}
                    onChange={(e) => setAiForm({ ...aiForm, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    <option value="Section 1">Section 1</option>
                    <option value="Section 2">Section 2</option>
                    <option value="Section 3">Section 3</option>
                    <option value="Section 4">Section 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Topic</label>
                <input
                  type="text"
                  value={aiForm.topic}
                  onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                  placeholder="e.g. Dynamic Memory & Pointer Arithmetic"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Difficulty</label>
                  <select
                    value={aiForm.difficulty}
                    onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    <option value="EASY">Easy (2–8 min)</option>
                    <option value="MEDIUM">Medium (8–15 min)</option>
                    <option value="HARD">Hard (15–25 min)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Bloom's Level</label>
                  <select
                    value={aiForm.bloomsLevel}
                    onChange={(e) => setAiForm({ ...aiForm, bloomsLevel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                  Scenario Context (Real-World Setting)
                </label>
                <input
                  type="text"
                  value={aiForm.scenarioContext}
                  onChange={(e) => setAiForm({ ...aiForm, scenarioContext: e.target.value })}
                  placeholder="e.g. Satellite Telemetry Packet Decoding"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generateAiMutation.isPending}
                onClick={() => generateAiMutation.mutate(aiForm)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {generateAiMutation.isPending ? 'Generating & Compiling in C Sandbox...' : 'Generate & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION INSPECT / DETAILS MODAL (High-Contrast, Opaque Background) */}
      {inspectQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-main)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex items-start justify-between border-b border-[var(--border-line)] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                  {inspectQuestion.module} • {inspectQuestion.section}
                </span>
                <h3 className="text-xl font-bold text-[var(--text-main)] mt-2">{inspectQuestion.title}</h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">{inspectQuestion.topic}</p>
              </div>
              <button
                onClick={() => setInspectQuestion(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Problem Statement Preview */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--text-main)] uppercase font-mono tracking-wider">
                Problem Description
              </h4>
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] font-sans whitespace-pre-wrap leading-relaxed text-sm">
                {inspectQuestion.scenario && (
                  <p className="text-indigo-400 font-semibold italic mb-2">Scenario: {inspectQuestion.scenario}</p>
                )}
                {inspectQuestion.description || inspectQuestion.problemStatement}
              </div>
            </div>

            {/* Test Cases (2 Visible + 1 Hidden) */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[var(--text-main)] uppercase font-mono tracking-wider">
                Test Cases (2 Visible + 1 Hidden Server-Side)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2 text-xs">
                  <span className="font-bold text-emerald-500 text-xs block">Test Case 1 (Visible)</span>
                  <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border-line)] break-all">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block uppercase">Input</span>
                    {inspectQuestion.testCases?.[0]?.input || 'Sample Input 1'}
                  </div>
                  <div className="font-mono text-xs text-[var(--text-main)] font-bold bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border-line)] break-all">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block uppercase">Output</span>
                    {inspectQuestion.testCases?.[0]?.expectedOutput || 'Sample Output 1'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-2 text-xs">
                  <span className="font-bold text-emerald-500 text-xs block">Test Case 2 (Visible)</span>
                  <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border-line)] break-all">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block uppercase">Input</span>
                    {inspectQuestion.testCases?.[1]?.input || 'Sample Input 2'}
                  </div>
                  <div className="font-mono text-xs text-[var(--text-main)] font-bold bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border-line)] break-all">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block uppercase">Output</span>
                    {inspectQuestion.testCases?.[1]?.expectedOutput || 'Sample Output 2'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 space-y-2 text-xs">
                  <span className="font-bold text-indigo-400 text-xs block">Test Case 3 (Hidden Server-Side)</span>
                  <div className="font-mono text-xs text-indigo-300 bg-[var(--bg-panel)] p-2 rounded-lg border border-indigo-500/30 break-all">
                    <span className="text-[10px] text-indigo-400 font-semibold block uppercase">Input</span>
                    {inspectQuestion.testCases?.[2]?.input || 'Hidden Boundary Input'}
                  </div>
                  <div className="font-mono text-xs text-indigo-200 font-bold bg-[var(--bg-panel)] p-2 rounded-lg border border-indigo-500/30 break-all">
                    <span className="text-[10px] text-indigo-400 font-semibold block uppercase">Output</span>
                    {inspectQuestion.testCases?.[2]?.expectedOutput || 'Hidden Boundary Output'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-line)]">
              <button
                type="button"
                onClick={() => setInspectQuestion(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Close
              </button>
              {inspectQuestion.validationStatus !== 'FACULTY_APPROVED' && (
                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(inspectQuestion.id)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
                >
                  Approve Question for Tests
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
