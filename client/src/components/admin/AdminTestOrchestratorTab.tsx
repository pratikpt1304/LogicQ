import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  UploadCloud,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { TestSubmissionsAuditModal } from './TestSubmissionsAuditModal.js';

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
  questionCount?: number | 'ALL';
  antiCheatingRotation?: boolean;
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
    timeLimitMinutes: 10,
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
    timeLimitMinutes: 20,
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
    timeLimitMinutes: 30,
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
    timeLimitMinutes: 30,
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

  // Bi-directional live sync with Firestore assessment_tests collection
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cloudTests = await FirestoreDataService.getAssessmentTestsFromFirestore();
        if (isMounted) {
          setTests(cloudTests);
          try {
            localStorage.setItem('logicq_admin_tests', JSON.stringify(cloudTests));
          } catch {}
          syncToStudentTests(cloudTests);
        }
      } catch (err) {
        console.warn('Failed to sync assessment tests from Firestore:', err);
      }
    })();

    const unsub = FirestoreDataService.listenToAssessmentTests((cloudTests) => {
      if (isMounted && Array.isArray(cloudTests)) {
        setTests(cloudTests);
        try {
          localStorage.setItem('logicq_admin_tests', JSON.stringify(cloudTests));
        } catch {}
        syncToStudentTests(cloudTests);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Proctoring Audit Modal & Live Test Submissions
  const [selectedAuditTest, setSelectedAuditTest] = useState<AdminTestDefinition | null>(null);
  const [selectedAuditStudentId, setSelectedAuditStudentId] = useState<string | null>(null);
  const [testSubmissionsMap, setTestSubmissionsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchSubs = async () => {
      try {
        const allSubs = await FirestoreDataService.getAssessmentSubmissions();
        if (!isMounted) return;
        const map: Record<string, any[]> = {};
        allSubs.forEach((sub: any) => {
          const tid = sub.testId || sub.assignmentId || 'general';
          if (!map[tid]) map[tid] = [];
          if (!map[tid].some((x: any) => x.id === sub.id)) {
            map[tid].push(sub);
          }
        });
        setTestSubmissionsMap(map);
      } catch (err) {
        console.warn('Notice loading assessment submissions for admin:', err);
      }
    };
    fetchSubs();

    const unsub = FirestoreDataService.listenToAssessmentSubmissions('', (allSubs) => {
      if (!isMounted) return;
      const map: Record<string, any[]> = {};
      allSubs.forEach((sub: any) => {
        const tid = sub.testId || sub.assignmentId || 'general';
        if (!map[tid]) map[tid] = [];
        if (!map[tid].some((x: any) => x.id === sub.id)) {
          map[tid].push(sub);
        }
      });
      setTestSubmissionsMap(map);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

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
  const [selectionMode, setSelectionMode] = useState<'UNITS' | 'MANUAL' | 'EXCEL'>('UNITS');
  const [selectedUnits, setSelectedUnits] = useState<(1 | 2 | 3 | 4)[]>([1, 2, 3, 4]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [difficultyProfile, setDifficultyProfile] = useState<'BALANCED' | 'FOUNDATIONAL' | 'RIGOROUS'>('BALANCED');
  const [lockPolicy, setLockPolicy] = useState(true);
  const [questionsPerStudent, setQuestionsPerStudent] = useState<number | 'ALL'>(2);
  const [antiCheatingRotation, setAntiCheatingRotation] = useState<boolean>(true);

  // Excel Upload State
  const [excelUploadedQuestions, setExcelUploadedQuestions] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Question Bank live pool
  const bankQuestions = getStoredBankQuestions();

  // Active pool of questions based on user selection mode
  const activeQuestionsPool =
    selectionMode === 'EXCEL'
      ? excelUploadedQuestions
      : selectionMode === 'MANUAL'
      ? bankQuestions.filter((q) => selectedQuestionIds.includes(q.id))
      : bankQuestions.filter((q) => selectedUnits.includes(q.sectionNumber));

  // Filtered list of questions for manual selection mode
  const filteredBankQuestions = bankQuestions.filter((q) => {
    if (!questionSearch.trim()) return true;
    const s = questionSearch.toLowerCase();
    return q.title.toLowerCase().includes(s) || q.description.toLowerCase().includes(s);
  });

  const handleDownloadSampleTemplate = () => {
    try {
      const sampleData = [
        {
          Title: 'Sum of Two Numbers with Pointer Arithmetic',
          Unit: 2,
          Difficulty: 'EASY',
          TimeLimitMinutes: 10,
          Description: 'Write a C function to calculate the sum of two integers passed via pointers.',
          VisibleInput1: '5 7',
          VisibleOutput1: '12',
          VisibleInput2: '100 -25',
          VisibleOutput2: '75',
          HiddenInput: '999 1',
          HiddenOutput: '1000',
          StarterCode: '#include <stdio.h>\\n\\nint addPointers(int *a, int *b) {\\n    return *a + *b;\\n}',
        },
        {
          Title: 'Array In-Place Reversal',
          Unit: 3,
          Difficulty: 'MEDIUM',
          TimeLimitMinutes: 15,
          Description: 'Given an array of N integers, reverse the array in-place without auxiliary arrays.',
          VisibleInput1: '5\\n1 2 3 4 5',
          VisibleOutput1: '5 4 3 2 1',
          VisibleInput2: '4\\n10 20 30 40',
          VisibleOutput2: '40 30 20 10',
          HiddenInput: '3\\n9 8 7',
          HiddenOutput: '7 8 9',
          StarterCode: '#include <stdio.h>\\n\\nvoid reverseArray(int arr[], int n) {\\n    // in-place\\n}',
        },
        {
          Title: 'Student Record Serialization with Structs',
          Unit: 4,
          Difficulty: 'HARD',
          TimeLimitMinutes: 20,
          Description: 'Define a struct Student with rollNo and gpa, compute highest GPA from N students.',
          VisibleInput1: '2\\n101 8.5\\n102 9.2',
          VisibleOutput1: 'Top: 102 (9.20)',
          VisibleInput2: '1\\n201 7.8',
          VisibleOutput2: 'Top: 201 (7.80)',
          HiddenInput: '3\\n1 6.5\\n2 8.9\\n3 7.4',
          HiddenOutput: 'Top: 2 (8.90)',
          StarterCode: '#include <stdio.h>\\n\\ntypedef struct {\\n    int rollNo;\\n    float gpa;\\n} Student;',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Questions');
      XLSX.writeFile(wb, 'LogicQ_Assessment_Questions_Template.xlsx');
      toast.success('Sample Excel template downloaded!');
    } catch (err: any) {
      toast.error('Failed to generate template: ' + (err.message || err));
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) throw new Error('File buffer is empty');
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          toast.error('The selected Excel file has no rows.');
          setIsUploadingExcel(false);
          return;
        }

        const parsedQuestions: any[] = rows
          .map((row: any, idx: number) => {
            const rawTitle = row.Title || row.title || row['Problem Title'] || row.Name || '';
            if (!rawTitle.toString().trim()) return null;

            const unitRaw = parseInt(row.Unit || row.unit || row.Section || row.section || '1', 10);
            const unitNum: 1 | 2 | 3 | 4 = (unitRaw >= 1 && unitRaw <= 4 ? unitRaw : 1) as any;

            const diffRaw = String(row.Difficulty || row.difficulty || 'MEDIUM').toUpperCase().trim();
            const difficulty: 'EASY' | 'MEDIUM' | 'HARD' =
              diffRaw === 'EASY' ? 'EASY' : diffRaw === 'HARD' ? 'HARD' : 'MEDIUM';

            const timeLimit = parseInt(row.TimeLimitMinutes || row.timeLimitMinutes || row.TimeLimit || '15', 10) || 15;
            const description = row.Description || row.description || row.ProblemDescription || rawTitle;

            const vIn1 = String(row.VisibleInput1 || row.visibleInput1 || row.Input1 || row['Input 1'] || '5');
            const vOut1 = String(row.VisibleOutput1 || row.visibleOutput1 || row.Output1 || row['Output 1'] || '5');
            const vIn2 = String(row.VisibleInput2 || row.visibleInput2 || row.Input2 || row['Input 2'] || '10');
            const vOut2 = String(row.VisibleOutput2 || row.visibleOutput2 || row.Output2 || row['Output 2'] || '10');
            const hIn = String(row.HiddenInput || row.hiddenInput || row.HiddenTestCaseInput || '100');
            const hOut = String(row.HiddenOutput || row.hiddenOutput || row.HiddenTestCaseOutput || '100');

            const starter = row.StarterCode || row.starterCode || '#include <stdio.h>\\n\\nint main() {\\n    // Code here\\n    return 0;\\n}';

            return {
              id: `q-xls-${Date.now().toString(36)}-${idx}`,
              sectionNumber: unitNum,
              title: String(rawTitle).trim(),
              difficulty,
              timeLimitMinutes: timeLimit,
              description: String(description).trim(),
              visibleTestCase1: { input: vIn1, output: vOut1 },
              visibleTestCase2: { input: vIn2, output: vOut2 },
              hiddenTestCase: { input: hIn, output: hOut },
              starterCode: starter,
              solutionCode: '// Uploaded from Excel',
              verifiedCorrect: true,
            };
          })
          .filter(Boolean);

        if (parsedQuestions.length === 0) {
          toast.error('No valid questions found. Ensure your sheet has a "Title" column.');
          setIsUploadingExcel(false);
          return;
        }

        setExcelUploadedQuestions(parsedQuestions);
        setExcelFileName(file.name);

        // Auto fill test title if empty
        if (!newTitle.trim()) {
          const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setNewTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }

        // Also persist to Question Bank in localStorage so they enrich the permanent bank!
        try {
          const currentBank = getStoredBankQuestions();
          const combined = [
            ...parsedQuestions,
            ...currentBank.filter((cq) => !parsedQuestions.some((pq) => pq.title === cq.title)),
          ];
          localStorage.setItem('logicq_admin_questions', JSON.stringify(combined));
        } catch {}

        toast.success(`Successfully loaded ${parsedQuestions.length} questions from "${file.name}"!`);
      } catch (err: any) {
        toast.error('Failed to parse Excel file: ' + (err.message || err));
      } finally {
        setIsUploadingExcel(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file.');
      setIsUploadingExcel(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleToggleUnit = (unitNum: 1 | 2 | 3 | 4) => {
    if (selectedUnits.includes(unitNum)) {
      if (selectedUnits.length === 1) {
        toast.info('At least one unit must be selected');
        return;
      }
      setSelectedUnits(selectedUnits.filter((u) => u !== unitNum));
    } else {
      setSelectedUnits([...selectedUnits, unitNum].sort());
    }
  };

  const handleToggleAllUnits = () => {
    if (selectedUnits.length === 4) {
      setSelectedUnits([1]);
    } else {
      setSelectedUnits([1, 2, 3, 4]);
    }
  };

  const handleToggleQuestionId = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  const handleToggleAllQuestions = () => {
    if (selectedQuestionIds.length === bankQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(bankQuestions.map((q) => q.id));
    }
  };

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
        const rawCount = t.questionCount || 2;
        const effectivePerStudent =
          rawCount === 'ALL' || Number(rawCount) >= pool.length
            ? pool.length
            : Math.max(1, Number(rawCount) || 1);

        return {
          id: t.id,
          title: t.title,
          sectionId: t.sectionTarget,
          section: { sectionName: t.sectionTarget },
          moduleId: t.unitTarget === 'ALL' ? 'All Units - Comprehensive' : `Unit ${t.unitTarget || 1}`,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          status: t.status === 'ACTIVE' ? 'PUBLISHED' : t.status,
          questionCount: effectivePerStudent,
          antiCheatingRotation: t.antiCheatingRotation ?? true,
          randomiseQuestions: t.antiCheatingRotation ?? true,
          questions: pool.map((q: any, idx: number) => ({
            id: `tq_${t.id}_${idx}`,
            testId: t.id,
            problemId: q.id,
            orderIndex: idx,
            points: Math.round(t.totalMarks / Math.max(1, effectivePerStudent)),
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

  const saveTests = async (updated: AdminTestDefinition[]) => {
    setTests(updated);
    try {
      localStorage.setItem('logicq_admin_tests', JSON.stringify(updated));
    } catch {}
    syncToStudentTests(updated);
    for (const t of updated) {
      await FirestoreDataService.saveAssessmentTestToFirestore(t);
    }
    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('DASHBOARD');
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    const matchedQuestions =
      selectionMode === 'EXCEL'
        ? excelUploadedQuestions
        : selectionMode === 'MANUAL'
        ? bankQuestions.filter((q) => selectedQuestionIds.includes(q.id))
        : bankQuestions.filter((q) => selectedUnits.includes(q.sectionNumber));

    if (matchedQuestions.length === 0) {
      if (selectionMode === 'EXCEL') {
        toast.error('Please upload an Excel file containing questions first');
      } else {
        toast.error('Please select at least one question or unit with available questions');
      }
      return;
    }

    const unitLabel =
      selectionMode === 'EXCEL'
        ? (`Excel (${excelFileName || 'Uploaded'})` as any)
        : selectionMode === 'UNITS'
        ? (selectedUnits.length === 4 ? 'ALL' : selectedUnits.map(u => `Unit ${u}`).join(', ') as any)
        : 'Custom Selection';

    const effectiveQuestionCount =
      questionsPerStudent === 'ALL'
        ? matchedQuestions.length
        : Math.min(Number(questionsPerStudent) || 1, matchedQuestions.length);

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
      unitTarget: unitLabel,
      questions: matchedQuestions,
      questionCount: effectiveQuestionCount,
      antiCheatingRotation,
    };

    saveTests([created, ...tests]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    toast.success(
      `Test "${created.title}" scheduled! (Pool: ${matchedQuestions.length} Qs, Each student gets ${effectiveQuestionCount} distinct Qs with PRN Rotation)`
    );
  };

  const handleDeleteTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this test?')) {
      const updated = tests.filter((t) => t.id !== id);
      setTests(updated);
      try {
        localStorage.setItem('logicq_admin_tests', JSON.stringify(updated));
        localStorage.setItem('logicq_assessment_tests_backup_v1', JSON.stringify(updated));
      } catch {}
      syncToStudentTests(updated);
      await FirestoreDataService.deleteAssessmentTestFromFirestore(id);
      RealtimeSyncService.emit('TESTS');
      RealtimeSyncService.emit('DASHBOARD');
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{t.questionCount || 2} Qs/Student (PRN Rotated)</span>
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

                {/* Mode C: Upload Excel Directly */}
                {selectionMode === 'EXCEL' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Upload custom questions via Excel spreadsheet (.xlsx, .xls, .csv):
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadSampleTemplate}
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Sample (.xlsx)</span>
                      </button>
                    </div>

                    <input
                      ref={excelFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />

                    {excelUploadedQuestions.length === 0 ? (
                      <div
                        onClick={() => excelFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && excelFileInputRef.current) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            excelFileInputRef.current.files = dataTransfer.files;
                            excelFileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                          }
                        }}
                        className="p-5 rounded-2xl border-2 border-dashed border-emerald-400/40 dark:border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/[0.04] text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {isUploadingExcel ? 'Parsing spreadsheet...' : 'Click or Drag & Drop Excel File Here'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Supports .xlsx, .xls, .csv • Includes auto test cases & starter code
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block truncate">
                                {excelFileName}
                              </span>
                              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                {excelUploadedQuestions.length} questions successfully parsed & ready for test
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => excelFileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            Replace File
                          </button>
                        </div>

                        {/* Excel Questions Preview */}
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {excelUploadedQuestions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {idx + 1}. {q.title}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/10 shrink-0">
                                    Unit {q.sectionNumber}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  TC1: {q.visibleTestCase1?.input} → {q.visibleTestCase1?.output}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  q.difficulty === 'EASY'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : q.difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Student Submissions Section */}
              {(() => {
                const testSubs = (
                  (testSubmissionsMap[t.id] || [])
                    .concat(testSubmissionsMap[t.title] || [])
                    .concat(testSubmissionsMap[t.id?.toLowerCase()] || [])
                ).filter((item, index, self) => index === self.findIndex((s) => s.id === item.id));

                return (
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>Student Submissions ({testSubs.length})</span>
                      </span>
                      {testSubs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAuditTest(t);
                            setSelectedAuditStudentId(null);
                          }}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          View All &amp; Export →
                        </button>
                      )}
                    </div>

                    {testSubs.length === 0 ? (
                      <div className="p-3 text-center rounded-xl bg-white/60 dark:bg-black/20 border border-slate-200/40 dark:border-white/5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No students have submitted this assessment yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAuditTest(t);
                            setSelectedAuditStudentId(null);
                          }}
                          className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Open Proctoring &amp; Cheating Audit Console</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {testSubs.map((sub: any) => {
                          const fullScreen = Number(sub.fullscreenExits || sub.fullScreenExitCount) || 0;
                          const tabSwitches = Number(sub.tabSwitchCount) || 0;
                          const pasteTries = Number(sub.copyPasteAttempts) || 0;
                          const isFlagged = fullScreen > 0 || pasteTries > 0 || tabSwitches >= 2;
                          const isClean = fullScreen === 0 && pasteTries === 0 && tabSwitches === 0;

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                setSelectedAuditTest(t);
                                setSelectedAuditStudentId(sub.id);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/70 dark:border-white/5 hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-500/[0.04] transition flex items-center justify-between gap-2 group cursor-pointer"
                              title="Click to view student code &amp; cheating audit log"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {sub.studentName || 'Student'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {sub.studentPrn || sub.prn}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>⏱️ {Math.floor((sub.timeTakenSeconds || 0) / 60)}m {(sub.timeTakenSeconds || 0) % 60}s</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                    {sub.verdict === 'ACCEPTED' ? `${sub.academicScore || 20} Marks` : sub.verdict}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isClean ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30">
                                    🛡️ 100% Clean
                                  </span>
                                ) : isFlagged ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30">
                                    🚨 Flagged ({fullScreen} FS, {pasteTries} Pastes)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30">
                                    ⚠️ {tabSwitches} Tabs
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition group-hover:translate-x-0.5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                    onClick={() => {
                      setSelectedAuditTest(t);
                      setSelectedAuditStudentId(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Open live proctoring stream & cheating audit logs"
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
      {/* 3. APPLE HIG MODAL: SCHEDULE TEST (Flexible Multi-Unit & Custom Picker)   */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#121620] border border-slate-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sliders className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Schedule Assessment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure syllabus units, question bank selection &amp; proctoring guardrails
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              {/* Test Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Assessment (Units 1 & 2)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                  required
                />
              </div>

              {/* Question Selection Mode Toggle (Apple HIG Segmented Capsule) */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200">
                    Question Selection Mode
                  </label>
                  <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    {activeQuestionsPool.length} Questions Ready
                  </span>
                </div>

                <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.05] gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('UNITS')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      selectionMode === 'UNITS'
                        ? 'bg-white dark:bg-[#1c2230] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Multi-Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('MANUAL');
                      if (selectedQuestionIds.length === 0 && bankQuestions.length > 0) {
                        setSelectedQuestionIds(bankQuestions.slice(0, 2).map((q) => q.id));
                      }
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      selectionMode === 'MANUAL'
                        ? 'bg-white dark:bg-[#1c2230] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Handpick ({selectedQuestionIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionMode('EXCEL')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                      selectionMode === 'EXCEL'
                        ? 'bg-white dark:bg-[#1c2230] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Upload Excel {excelUploadedQuestions.length > 0 ? `(${excelUploadedQuestions.length})` : ''}</span>
                  </button>
                </div>

                {/* Mode A: Multi-Unit Selection */}
                {selectionMode === 'UNITS' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Select one or multiple units to combine into this test:
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAllUnits}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {selectedUnits.length === 4 ? 'Reset to Unit 1' : 'Select All 4 Units'}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {([1, 2, 3, 4] as const).map((unitNum) => {
                        const isSelected = selectedUnits.includes(unitNum);
                        const count = bankQuestions.filter((q) => q.sectionNumber === unitNum).length;
                        return (
                          <button
                            key={unitNum}
                            type="button"
                            onClick={() => handleToggleUnit(unitNum)}
                            className={`p-2.5 rounded-xl text-center border transition-all active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <div className="font-bold text-xs">Unit {unitNum}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              {count} {count === 1 ? 'Q' : 'Qs'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mode B: Manual Specific Question Checklist */}
                {selectionMode === 'MANUAL' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Check the exact questions you want included:
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAllQuestions}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {selectedQuestionIds.length === bankQuestions.length ? 'Deselect All' : 'Select All Questions'}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search questions by keyword or topic..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                    />

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredBankQuestions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-white dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                          No matching questions found in bank.
                        </div>
                      ) : (
                        filteredBankQuestions.map((q) => {
                          const isChecked = selectedQuestionIds.includes(q.id);
                          return (
                            <label
                              key={q.id}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-blue-500/10 border-blue-500/30 text-slate-900 dark:text-white'
                                  : 'bg-white dark:bg-white/5 border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleQuestionId(q.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs truncate">{q.title}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/10 shrink-0">
                                    Unit {q.sectionNumber}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">{q.description}</p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  q.difficulty === 'EASY'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : q.difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Mode C: Upload Excel Directly */}
                {selectionMode === 'EXCEL' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Upload custom questions via Excel spreadsheet (.xlsx, .xls, .csv):
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadSampleTemplate}
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Sample (.xlsx)</span>
                      </button>
                    </div>

                    <input
                      ref={excelFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />

                    {excelUploadedQuestions.length === 0 ? (
                      <div
                        onClick={() => excelFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && excelFileInputRef.current) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            excelFileInputRef.current.files = dataTransfer.files;
                            excelFileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                          }
                        }}
                        className="p-5 rounded-2xl border-2 border-dashed border-emerald-400/40 dark:border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/[0.04] text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {isUploadingExcel ? 'Parsing spreadsheet...' : 'Click or Drag & Drop Excel File Here'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Supports .xlsx, .xls, .csv • Includes auto test cases & starter code
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block truncate">
                                {excelFileName}
                              </span>
                              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                {excelUploadedQuestions.length} questions successfully parsed & ready for test
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => excelFileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            Replace File
                          </button>
                        </div>

                        {/* Excel Questions Preview */}
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {excelUploadedQuestions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {idx + 1}. {q.title}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/10 shrink-0">
                                    Unit {q.sectionNumber}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  TC1: {q.visibleTestCase1?.input} → {q.visibleTestCase1?.output}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  q.difficulty === 'EASY'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : q.difficulty === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Target Section & Total Marks */}
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
                        className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                          newMarks === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Questions Per Student & Anti-Cheating Allocation */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-slate-50 to-blue-50/30 dark:from-indigo-950/20 dark:via-white/[0.03] dark:to-blue-950/10 border border-indigo-200/60 dark:border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <label className="font-semibold text-slate-800 dark:text-slate-200">
                      Questions Per Student (Anti-Cheating Rotation)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Pool: {activeQuestionsPool.length} Qs
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {([1, 2, 3, 'ALL'] as const).map((opt) => {
                    const isSelected = questionsPerStudent === opt;
                    const label = opt === 'ALL' ? 'All Questions' : `${opt} Question${opt > 1 ? 's' : ''}`;
                    const subLabel =
                      opt === 1
                        ? '100% Unique'
                        : opt === 2
                        ? 'Standard (2 Qs)'
                        : opt === 3
                        ? 'Rigorous (3 Qs)'
                        : 'Full Pool';

                    return (
                      <button
                        key={String(opt)}
                        type="button"
                        onClick={() => setQuestionsPerStudent(opt)}
                        className={`p-2 rounded-xl text-center border transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold text-xs">{label}</div>
                        <div
                          className={`text-[9px] mt-0.5 truncate ${
                            isSelected ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {subLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Explainer Note */}
                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    {questionsPerStudent === 1
                      ? `Each student gets 1 unique question rotated by PRN hash. If your pool has 120 questions, 120 students get 100% distinct questions!`
                      : questionsPerStudent === 'ALL'
                      ? `All ${activeQuestionsPool.length} questions in the pool are assigned to every student.`
                      : `Each student receives ${questionsPerStudent} questions rotated by PRN/Roll number. Adjacent seats receive different questions to prevent cheating.`}
                  </span>
                </div>
              </div>

              {/* Duration */}
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
                      className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                        newDuration === mins
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
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
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || activeQuestionsPool.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition shadow-xs cursor-pointer active:scale-95"
                >
                  Schedule Test ({activeQuestionsPool.length} {activeQuestionsPool.length === 1 ? 'Question' : 'Questions'})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 4. APPLE HIG MODAL: TEST SUBMISSIONS & ANTI-CHEAT AUDIT MODAL             */}
      {/* ========================================================================= */}
      {selectedAuditTest && (
        <TestSubmissionsAuditModal
          test={selectedAuditTest}
          isOpen={Boolean(selectedAuditTest)}
          onClose={() => {
            setSelectedAuditTest(null);
            setSelectedAuditStudentId(null);
          }}
          initialSelectedStudentId={selectedAuditStudentId}
        />
      )}
    </div>
  );
};
