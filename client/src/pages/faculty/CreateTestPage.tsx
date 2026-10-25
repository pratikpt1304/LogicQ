import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  FileCode2,
  Users,
  Clock,
  Sliders,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Eye,
} from 'lucide-react';

export const CreateTestPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  // Form State (Sections 14 & 15)
  const [form, setForm] = useState({
    title: 'Mid-Term Assessment: C Control & Arrays',
    sectionId: '',
    moduleId: 'All Modules - Comprehensive Full Syllabus',
    instructions: 'Strict time-based evaluation. 1 mark per question. No reattempts permitted once submitted.',
    durationMinutes: 60,
    questionCount: 20,
    easyRatio: 40,
    mediumRatio: 40,
    hardRatio: 20,
    randomiseQuestions: true,
    attemptPolicy: 'STRICT_NO_REATTEMPT',
    autoSelectQuestions: true,
  });

  // Fetch faculty sections to populate dropdown
  const { data: sectionsData } = useQuery({
    queryKey: ['faculty-sections'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.sections || res.data || [];
    },
  });

  const sections: any[] = Array.isArray(sectionsData) ? sectionsData : [];

  // Fetch existing tests
  const { data: testsData, isLoading, refetch } = useQuery({
    queryKey: ['faculty-tests'],
    queryFn: async () => {
      const res = await api.get('/assessment-tests');
      return res.data || [];
    },
  });

  const tests: any[] = Array.isArray(testsData) ? testsData : [];

  // Create Test Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await api.post('/assessment-tests', payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Assessment test published and assigned to section roster!');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['faculty-tests'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create assessment test.');
    },
  });

  const ratioSum = Number(form.easyRatio) + Number(form.mediumRatio) + Number(form.hardRatio);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Create & Assign Tests
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Configure test duration, question counts, difficulty ratios (Easy/Medium/Hard), and auto-assign to section rosters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              if (sections.length > 0 && !form.sectionId) {
                setForm({ ...form, sectionId: sections[0].id });
              }
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create New Test
          </button>
        </div>
      </div>

      {/* Tests Overview Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-[var(--muted-foreground)] font-mono animate-pulse">
          Loading faculty tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
            <FileCode2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">No Tests Created Yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Design and schedule an assessment test with automated difficulty ratios (Easy, Medium, Hard) and assign it to your student sections.
          </p>
          <button
            onClick={() => {
              if (sections.length > 0 && !form.sectionId) {
                setForm({ ...form, sectionId: sections[0].id });
              }
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-4 h-4" />
            Create First Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-indigo-500/40 transition shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    {test.moduleId}
                  </span>
                  <h3 className="text-base font-bold text-[var(--foreground)] mt-2 line-clamp-1">{test.title}</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Section: {test.section?.sectionName}</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {test.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[var(--background)] p-3 rounded-xl border border-[var(--border)] text-xs text-center">
                <div>
                  <span className="text-[var(--muted-foreground)] block">Questions</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">
                    {test._count?.questions ?? test.questionCount}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] block">Duration</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">{test.durationMinutes}m</span>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] block">Assigned</span>
                  <span className="font-bold text-indigo-400 font-mono">{test._count?.assignments ?? 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                <span className="text-[var(--muted-foreground)] font-mono">
                  Ratio: {test.easyRatio}E / {test.mediumRatio}M / {test.hardRatio}H
                </span>
                <button
                  onClick={async () => {
                    const res = await api.get(`/assessment-tests/${test.id}`);
                    setSelectedTest(res.data);
                  }}
                  className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEST MODAL (Sections 14 & 15) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create & Assign Test</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Test Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Target Section</label>
                  <select
                    value={form.sectionId}
                    onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sectionName} ({s.subject})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                    Question Syllabus / Topic Pool
                  </label>
                  <select
                    value={form.moduleId}
                    onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-xs font-mono"
                  >
                    <option value="All Modules - Comprehensive Full Syllabus">All Modules (Full Syllabus Mid-Term / Final)</option>
                    <option value="Module 1 - C Fundamentals">Module 1 - C Fundamentals (Variables, Loops, Conditions)</option>
                    <option value="Module 2 - Pointers & Functions">Module 2 - Pointers & Functions (Pointers, Memory, Recursion)</option>
                    <option value="Module 3 - Structures & Memory">Module 3 - Structures & Memory (Structs, Dynamic Allocation)</option>
                    <option value="Module 4 - Algorithms & Complexity">Module 4 - Algorithms & Complexity (Arrays, Searching, Sorting)</option>
                  </select>
                  <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                    Questions will be selected from this syllabus. The test will appear live on enrolled students' <b>Tests (Exam)</b> portal.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Question Count</label>
                  <input
                    type="number"
                    value={form.questionCount}
                    onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
              </div>

              {/* Difficulty Ratio Configuration (Section 4) */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--foreground)]">Difficulty Ratio (Must sum to 100%)</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      ratioSum === 100 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Total: {ratioSum}% {ratioSum === 100 ? '✓' : '(Must be 100%)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[var(--muted-foreground)] text-[11px] mb-1">Easy % (2-8m)</label>
                    <input
                      type="number"
                      value={form.easyRatio}
                      onChange={(e) => setForm({ ...form, easyRatio: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--muted-foreground)] text-[11px] mb-1">Medium % (8-15m)</label>
                    <input
                      type="number"
                      value={form.mediumRatio}
                      onChange={(e) => setForm({ ...form, mediumRatio: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--muted-foreground)] text-[11px] mb-1">Hard % (15-25m)</label>
                    <input
                      type="number"
                      value={form.hardRatio}
                      onChange={(e) => setForm({ ...form, hardRatio: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Attempt Policy</label>
                <select
                  value={form.attemptPolicy}
                  onChange={(e) => setForm({ ...form, attemptPolicy: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                >
                  <option value="STRICT_NO_REATTEMPT">
                    Strict: No Reattempt after successful submission (Section 7 Default)
                  </option>
                  <option value="ALLOW_ONE_RETRY">Allow 1 Reattempt if previous attempt failed</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Instructions for Students</label>
                <textarea
                  rows={2}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createMutation.isPending || ratioSum !== 100 || !form.sectionId}
                onClick={() => createMutation.mutate(form)}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? 'Publishing & Assigning...' : 'Publish & Assign to Roster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEST DETAILS DRAWER / MODAL */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {selectedTest.moduleId}
                </span>
                <h3 className="text-lg font-bold text-[var(--foreground)] mt-2">{selectedTest.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Section: {selectedTest.section?.sectionName}</p>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--foreground)] font-mono uppercase">Assigned Questions</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedTest.questions?.map((q: any, i: number) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                  >
                    <div>
                      <span className="font-mono text-indigo-400 font-bold mr-2">Q{i + 1}.</span>
                      <span className="font-medium text-[var(--foreground)]">{q.problem?.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      {q.problem?.difficulty} (1 Mark)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
              <h4 className="text-xs font-bold text-[var(--foreground)] font-mono uppercase">
                Enrolled Students ({selectedTest.assignments?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedTest.assignments?.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        {a.student?.fullName || a.student?.displayName || 'Student'}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)] font-mono ml-2">
                        {a.student?.prn}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
