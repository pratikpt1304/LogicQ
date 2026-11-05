import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
  MessageSquare,
  Mail,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

export const CreateTestPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  // Creation Mode: Auto from Syllabus OR Upload Excel
  const [creationMode, setCreationMode] = useState<'AUTO' | 'EXCEL'>('AUTO');
  const [excelQuestions, setExcelQuestions] = useState<any[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State (Sections 14 & 15)
  const [form, setForm] = useState({
    title: 'Mid-Term Assessment: C Control & Arrays',
    sectionId: '',
    moduleId: 'All Modules - Comprehensive Full Syllabus',
    instructions: 'Strict time-based evaluation. 1 mark per question. No reattempts permitted once submitted.',
    durationMinutes: 60,
    questionCount: 2,
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
      const sectionMap = new Map<string, any>();
      try {
        const fsSections = await FirestoreDataService.getSectionsFromFirestore();
        if (Array.isArray(fsSections)) {
          fsSections.forEach((s: any) => {
            if (s && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s)) {
              const key = s.id || s.joinCode;
              if (key) sectionMap.set(key, s);
            }
          });
        }
      } catch {}

      try {
        const res = await api.get('/sections');
        const apiSections = res.sections || res.data || [];
        if (Array.isArray(apiSections)) {
          apiSections.forEach((s: any) => {
            if (s && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s)) {
              const key = s.id || s.joinCode;
              if (key) {
                const existing = sectionMap.get(key) || {};
                sectionMap.set(key, { ...existing, ...s });
              }
            }
          });
        }
      } catch {}

      return Array.from(sectionMap.values());
    },
    refetchInterval: 8000,
  });

  const rawSections: any[] = Array.isArray(sectionsData) ? sectionsData : [];
  const sections: any[] = rawSections;

  // Fetch existing tests
  const { data: testsData, isLoading, refetch } = useQuery({
    queryKey: ['faculty-tests'],
    queryFn: async () => {
      const res = await api.get('/assessment-tests');
      return res.data || [];
    },
    refetchInterval: 8000,
  });

  const tests: any[] = Array.isArray(testsData) ? testsData : [];

  const getTestWhatsAppUrl = (test: any) => {
    const sectionName = test.section?.sectionName || 'Class Section';
    const duration = test.durationMinutes || 60;
    const qCount = test._count?.questions ?? test.questionCount ?? 20;
    const testUrl = 'https://logicq-clanguage.web.app/student/tests';

    const text = `📢 *NEW LAB ASSESSMENT ASSIGNED on LogicQ!* 🚀\n\nDear Students of *${sectionName}*,\nYour faculty mentor has scheduled a new proctored lab test:\n\n📝 *Test:* ${test.title}\n⏱️ *Duration:* ${duration} Minutes\n❓ *Questions:* ${qCount} Questions\n🎯 *Evaluation:* Auto-graded with C11 GCC & Proctoring\n\n👉 *Start Your Test Here:*\n${testUrl}\n\nPlease join and complete this session before the scheduled deadline! ⚡`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleDispatchEmailAlert = async (test: any) => {
    try {
      toast.info('Dispatching email alerts to enrolled students...');
      const res = await api.post('/notifications/test-assigned', {
        testTitle: test.title,
        sectionId: test.sectionId,
        sectionName: test.section?.sectionName,
        durationMinutes: test.durationMinutes,
        questionCount: test._count?.questions ?? test.questionCount,
      });
      toast.success(res?.message || 'Email alerts dispatched successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch email alerts.');
    }
  };

  // Download Sample Excel Template
  const downloadSampleExcelTemplate = () => {
    try {
      const sampleData = [
        {
          Title: 'Find Maximum in Array',
          Topic: 'Arrays & Loops',
          Difficulty: 'EASY',
          Description: 'Write a C program that reads an integer N, followed by N integers, and prints the maximum value.',
          SampleInput: '5\n10 25 4 99 32',
          SampleOutput: '99',
          HiddenInput: '3\n-5 -20 -1',
          HiddenOutput: '-1',
          Points: 10,
        },
        {
          Title: 'Reverse String without string.h',
          Topic: 'Pointers & Strings',
          Difficulty: 'MEDIUM',
          Description: 'Write a C program to reverse a given string without using the strrev() function or string.h.',
          SampleInput: 'logicq',
          SampleOutput: 'qcigol',
          HiddenInput: 'sanjivani',
          HiddenOutput: 'inavijnas',
          Points: 20,
        },
        {
          Title: 'Matrix Diagonal Sum',
          Topic: '2D Arrays',
          Difficulty: 'EASY',
          Description: 'Given an N x N matrix, calculate and print the sum of its main diagonal elements.',
          SampleInput: '3\n1 2 3\n4 5 6\n7 8 9',
          SampleOutput: '15',
          HiddenInput: '2\n10 5\n3 20',
          HiddenOutput: '30',
          Points: 10,
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Questions');

      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 12 },
        { wch: 45 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 10 },
      ];

      XLSX.writeFile(workbook, 'LogicQ_Test_Questions_Template.xlsx');
      toast.success('Sample Excel template downloaded! Fill and upload your questions.');
    } catch (err: any) {
      toast.error('Failed to generate template: ' + (err.message || err));
    }
  };

  // Parse Uploaded Excel File
  const handleExcelQuestionsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawRows || rawRows.length === 0) {
          toast.error('The uploaded Excel sheet contains no rows.');
          setIsParsingExcel(false);
          return;
        }

        const parsed: any[] = [];
        rawRows.forEach((row, idx) => {
          const keys = Object.keys(row);
          const getVal = (pattern: RegExp) => {
            const k = keys.find((key) => pattern.test(key.trim()));
            return k ? String(row[k] ?? '').trim() : '';
          };

          const title = getVal(/^title|^question\s*title|^problem\s*title/i) || `Custom Question #${idx + 1}`;
          const topic = getVal(/^topic|^category|^subject/i) || 'C Programming';
          const rawDiff = getVal(/^diff/i).toUpperCase();
          const difficulty = rawDiff === 'HARD' ? 'HARD' : rawDiff === 'EASY' ? 'EASY' : 'MEDIUM';
          const description = getVal(/^desc|^problem|^statement|^question/i) || 'Write a C program to solve the given problem statement with correct standard input/output.';

          const sampleInput = getVal(/^sample\s*in|^input\s*1|^sample_in|^input$/i);
          const sampleOutput = getVal(/^sample\s*out|^output\s*1|^sample_out|^output$/i);
          const hiddenInput = getVal(/^hidden\s*in|^input\s*2|^hidden_in/i);
          const hiddenOutput = getVal(/^hidden\s*out|^output\s*2|^hidden_out/i);
          const points = Number(getVal(/^point|^mark|^score/i)) || (difficulty === 'EASY' ? 10 : difficulty === 'MEDIUM' ? 20 : 30);

          const qId = `custom-q-${Date.now()}-${idx + 1}`;
          const testCases: any[] = [];

          if (sampleInput || sampleOutput) {
            testCases.push({
              id: `${qId}-tc1`,
              input: sampleInput ? (sampleInput.endsWith('\n') ? sampleInput : `${sampleInput}\n`) : '\n',
              expectedOutput: sampleOutput ? (sampleOutput.endsWith('\n') ? sampleOutput : `${sampleOutput}\n`) : '\n',
              isHidden: false,
              isSample: true,
              orderIndex: 0,
            });
          }

          if (hiddenInput || hiddenOutput) {
            testCases.push({
              id: `${qId}-tc2`,
              input: hiddenInput ? (hiddenInput.endsWith('\n') ? hiddenInput : `${hiddenInput}\n`) : '\n',
              expectedOutput: hiddenOutput ? (hiddenOutput.endsWith('\n') ? hiddenOutput : `${hiddenOutput}\n`) : '\n',
              isHidden: true,
              isSample: false,
              orderIndex: 1,
            });
          }

          if (testCases.length === 0) {
            testCases.push({
              id: `${qId}-tc1`,
              input: '1\n',
              expectedOutput: '1\n',
              isHidden: false,
              isSample: true,
              orderIndex: 0,
            });
          }

          parsed.push({
            id: qId,
            problemId: qId,
            slug: qId,
            title,
            topic,
            difficulty,
            description,
            problemStatement: description,
            points,
            testCases,
            starterCode: `#include <stdio.h>\n\nint main() {\n    // TODO: Write solution for ${title}\n    return 0;\n}`,
            solutionCode: `#include <stdio.h>\n\nint main() {\n    return 0;\n}`,
            validationStatus: 'FACULTY_APPROVED',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
          });
        });

        setExcelQuestions(parsed);
        setForm((prev) => ({
          ...prev,
          questionCount: Math.min(prev.questionCount || 2, Math.max(1, parsed.length)),
        }));
        toast.success(`Excel analyzed: ${parsed.length} questions loaded into test pool!`);
      } catch (err: any) {
        toast.error('Failed to parse Excel: ' + (err.message || err));
      } finally {
        setIsParsingExcel(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const removeExcelQuestion = (qId: string) => {
    setExcelQuestions((prev) => {
      const updated = prev.filter((q) => q.id !== qId);
      setForm((f) => ({ ...f, questionCount: Math.min(f.questionCount, Math.max(1, updated.length)) }));
      return updated;
    });
    toast.info('Question removed.');
  };

  // Create Test Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/assessment-tests', payload);
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Assessment test published and assigned to section roster!');
      setIsCreateOpen(false);
      setExcelQuestions([]);
      setCreationMode('AUTO');
      queryClient.invalidateQueries({ queryKey: ['faculty-tests'] });
      RealtimeSyncService.emit('TESTS');

      // Trigger automatic background email notification
      try {
        const notifRes = await api.post('/notifications/test-assigned', {
          testTitle: form.title,
          sectionId: form.sectionId,
          durationMinutes: form.durationMinutes,
          questionCount: form.questionCount,
        });

        if (notifRes?.whatsappUrl) {
          toast.custom((t) => (
            <div className="bg-[#0f172a] text-white p-4 rounded-xl border border-indigo-500/40 shadow-2xl flex flex-col gap-2.5">
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                <span>📢 Test Created & Emails Sent to Section!</span>
              </div>
              <p className="text-xs text-slate-300">
                Share this assessment announcement directly to your section's WhatsApp group with 1-click:
              </p>
              <a
                href={notifRes.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => toast.dismiss(t)}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                <span>Open WhatsApp Group Alert</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ), { duration: 10000 });
        }
      } catch (e) {
        console.warn('Background test notification notice:', e);
      }
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-xs">
                <span className="text-[var(--muted-foreground)] font-mono">
                  Ratio: {test.easyRatio}E / {test.mediumRatio}M / {test.hardRatio}H
                </span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={getTestWhatsAppUrl(test)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Share Announcement to Class WhatsApp Group"
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition flex items-center gap-1 font-mono text-[11px] font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => handleDispatchEmailAlert(test)}
                    title="Dispatch Email Notification to Enrolled Students"
                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 transition flex items-center gap-1 font-mono text-[11px] font-semibold"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={async () => {
                      const res = await api.get(`/assessment-tests/${test.id}`);
                      setSelectedTest(res.data);
                    }}
                    className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white p-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEST MODAL (Sections 14 & 15) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create & Assign Test</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Test Creation Mode Switcher */}
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setCreationMode('AUTO')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  creationMode === 'AUTO'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Select from Syllabus</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('EXCEL')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  creationMode === 'EXCEL'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Upload Excel Sheet</span>
                {excelQuestions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-500 font-mono font-bold">
                    {excelQuestions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Anti-Cheating Lab Distribution Callout */}
            <div className="p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[var(--foreground)] leading-relaxed">
                <span className="font-bold text-indigo-400">Anti-Cheating Unique Subsetting Active:</span> When you set <b>Questions Per Student</b> (e.g. 2), LogicQ deterministically rotates questions from the pool based on student PRN / Roll Number. Adjacent students sitting in the same lab room will not receive the same questions.
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Test Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Mid-Term Lab Practical: C Programming"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-semibold"
                />
              </div>

              {creationMode === 'AUTO' ? (
                <>
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
                        Questions will be selected from this syllabus pool automatically.
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
                      <label className="block text-[var(--muted-foreground)] font-medium mb-1 flex items-center justify-between">
                        <span>Questions Per Student</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">Anti-Cheating</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={form.questionCount}
                        onChange={(e) => setForm({ ...form, questionCount: Math.max(1, Number(e.target.value)) })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-mono font-bold"
                      />
                      <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                        Each student receives {form.questionCount || 2} unique rotated questions.
                      </span>
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
                </>
              ) : (
                /* EXCEL UPLOAD MODE */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <label className="block text-[var(--muted-foreground)] font-medium mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--muted-foreground)] font-medium mb-1 flex items-center justify-between">
                        <span>Questions Per Student</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">Anti-Cheating</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={excelQuestions.length > 0 ? excelQuestions.length : 30}
                        value={form.questionCount}
                        onChange={(e) => setForm({ ...form, questionCount: Math.max(1, Number(e.target.value)) })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Excel Upload Box */}
                  <div className="p-4 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 space-y-3 text-center">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-indigo-500/10 pb-3">
                      <div className="text-left">
                        <span className="font-bold text-[var(--foreground)] text-sm flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          Upload Questions Spreadsheet (.xlsx, .xls, .csv)
                        </span>
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                          Required columns: <b>Title</b>, <b>SampleInput</b>, <b>SampleOutput</b>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadSampleExcelTemplate}
                        className="px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Template</span>
                      </button>
                    </div>

                    <div className="py-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        id="test-excel-input"
                        onChange={handleExcelQuestionsUpload}
                      />
                      <label
                        htmlFor="test-excel-input"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-md transition active:scale-95"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{excelQuestions.length > 0 ? 'Upload Different Excel File' : 'Choose Excel / CSV File'}</span>
                      </label>
                      {isParsingExcel && (
                        <p className="text-xs font-mono text-indigo-400 animate-pulse mt-2">
                          Analyzing questions & test cases...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Questions Preview Table */}
                  {excelQuestions.length > 0 && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden space-y-2 p-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="font-bold text-[var(--foreground)] text-xs flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{excelQuestions.length} Questions Ready for Test</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setExcelQuestions([])}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg">
                        {excelQuestions.map((q, idx) => (
                          <div key={q.id || idx} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[var(--card)] transition">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] text-[var(--muted-foreground)] w-5 text-right font-bold">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-[var(--foreground)] truncate max-w-xs">{q.title}</div>
                                <div className="text-[10px] text-[var(--muted-foreground)] font-mono flex items-center gap-2">
                                  <span>{q.topic || 'General'}</span>
                                  <span>•</span>
                                  <span className="text-indigo-400">{q.testCases?.length || 1} Test Cases</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  q.difficulty === 'EASY'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : q.difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-400">
                                {q.points || 10} pts
                              </span>
                              <button
                                type="button"
                                onClick={() => removeExcelQuestion(q.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                                title="Remove question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  createMutation.isPending ||
                  !form.sectionId ||
                  (creationMode === 'AUTO' && ratioSum !== 100) ||
                  (creationMode === 'EXCEL' && excelQuestions.length === 0)
                }
                onClick={() => {
                  const perStudent = Math.max(1, form.questionCount || 2);
                  if (creationMode === 'EXCEL') {
                    createMutation.mutate({
                      ...form,
                      creationMode: 'EXCEL',
                      questions: excelQuestions,
                      questionCount: Math.min(perStudent, excelQuestions.length),
                    });
                  } else {
                    createMutation.mutate({
                      ...form,
                      questionCount: perStudent,
                    });
                  }
                }}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer shadow-sm transition active:scale-95"
              >
                {createMutation.isPending
                  ? 'Publishing & Assigning...'
                  : creationMode === 'EXCEL'
                  ? `Publish Test (${form.questionCount || 2} Per Student · ${excelQuestions.length} in Pool)`
                  : `Publish Test (${form.questionCount || 2} Questions Per Student)`}
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
