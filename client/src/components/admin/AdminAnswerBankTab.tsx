import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Search,
  Filter,
  Users,
  Code2,
  Copy,
  Check,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Award,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  Terminal,
  BookOpen,
  FolderArchive,
  Sparkles,
} from 'lucide-react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { TOPIC_PRACTICE_DATA } from '../../data/topic-practice.data.js';
import { toast } from 'sonner';

export interface AnswerBankStudent {
  id: string;
  name: string;
  prn: string;
  email: string;
  section: string;
  labInternalSubmissions: any[];
  practiceSubmissions: any[];
  totalAnswersCount: number;
  lastActive: string;
}

export const AdminAnswerBankTab: React.FC = () => {
  const [students, setStudents] = useState<AnswerBankStudent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'WITH_ANSWERS' | 'LAB_INTERNAL_ONLY' | 'PRACTICE_ONLY'>('ALL');
  const [sortBy, setSortBy] = useState<'MOST_ANSWERS' | 'NAME' | 'PRN' | 'RECENT'>('MOST_ANSWERS');

  // Selected student for deep answer vault inspection
  const [inspectedStudent, setInspectedStudent] = useState<AnswerBankStudent | null>(null);
  const [vaultCategory, setVaultCategory] = useState<'LAB_INTERNAL' | 'PRACTICE'>('LAB_INTERNAL');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [selectedQuestionAttemptIdx, setSelectedQuestionAttemptIdx] = useState<Record<string, number>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Authoritative data fetch and live subscription
  useEffect(() => {
    let isMounted = true;

    const loadAnswerBankData = async () => {
      try {
        const [firestoreUsers, assessmentSubs, generalSubs, cohortSnap] = await Promise.all([
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          FirestoreDataService.getAssessmentSubmissions().catch(() => []),
          FirestoreDataService.getAllFirestoreSubmissions().catch(() => []),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
        ]);

        if (!isMounted) return;

        // Build unique student index
        const studentsMap = new Map<string, AnswerBankStudent>();

        // 1. Register enrolled students
        if (Array.isArray(firestoreUsers)) {
          firestoreUsers
            .filter((u: any) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com')) && !FirestoreDataService.isPurgedStudent(u))
            .forEach((u: any) => {
              const prnKey = (u.prn || '').toUpperCase().trim();
              const key = prnKey || (u.id || u.uid || '').toUpperCase().trim();
              const rawSection = u.sectionName || u.section || (u.division ? `Division ${u.division}` : 'Integrated Mtech');
              const normalizedSection = (rawSection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
                ? 'Integrated Mtech'
                : rawSection;
              if (key && !studentsMap.has(key)) {
                studentsMap.set(key, {
                  id: u.id || u.uid || `stu-${key}`,
                  name: u.fullName || u.displayName || u.username || 'Student Candidate',
                  prn: prnKey || '—',
                  email: u.email || '—',
                  section: normalizedSection,
                  labInternalSubmissions: [],
                  practiceSubmissions: [],
                  totalAnswersCount: 0,
                  lastActive: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standby',
                });
              }
            });
        }

        // 2. Map Assessment / Lab Internal Submissions
        const allAssessmentSubs = Array.isArray(assessmentSubs) ? assessmentSubs : [];
        allAssessmentSubs.forEach((sub: any) => {
          const prn = (sub.studentPrn || sub.prn || '').toUpperCase().trim();
          const uid = (sub.userId || '').trim().toUpperCase();
          const email = (sub.studentEmail || sub.email || '').toLowerCase().trim();

          let targetKey = prn || uid;
          if (!targetKey && email) targetKey = email.toUpperCase();

          const student = studentsMap.get(targetKey) || (prn ? studentsMap.get(prn) : null) || (uid ? studentsMap.get(uid) : null);
          if (student) {
            student.labInternalSubmissions.push(sub);
          }
        });

        // 3. Map General / Practice Submissions
        const allGenSubs = Array.isArray(generalSubs) ? generalSubs : [];
        allGenSubs.forEach((sub: any) => {
          const prn = (sub.studentPrn || sub.prn || sub.user?.prn || '').toUpperCase().trim();
          const uid = (sub.userId || sub.uid || sub.user?.id || '').trim().toUpperCase();
          const email = (sub.studentEmail || sub.email || sub.user?.email || '').toLowerCase().trim();

          let targetKey = prn || uid;
          if (!targetKey && email) targetKey = email.toUpperCase();

          const student = studentsMap.get(targetKey) || (prn ? studentsMap.get(prn) : null) || (uid ? studentsMap.get(uid) : null);
          if (student) {
            if (sub.submissionType === 'ASSESSMENT' || sub.submissionType === 'LAB_INTERNAL') {
              if (!student.labInternalSubmissions.some((x: any) => x.id === sub.id)) {
                student.labInternalSubmissions.push(sub);
              }
            } else {
              student.practiceSubmissions.push(sub);
            }
          }
        });

        // 4. Map Live Cohort Progress Solved Problems & Solution Vault
        if (cohortSnap && cohortSnap.docs) {
          cohortSnap.docs.forEach((d) => {
            const cData = d.data();
            const prn = (cData.prn || d.id || '').toUpperCase().trim();
            const student = studentsMap.get(prn) || (prn ? studentsMap.get(prn.replace(/0/g, 'O')) : null) || (prn ? studentsMap.get(prn.replace(/O/g, '0')) : null);
            if (student) {
              if (cData.moduleProgress?.lastActiveTime) {
                student.lastActive = new Date(cData.moduleProgress.lastActiveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
              const completedList = Array.isArray(cData.completedProblems) ? cData.completedProblems : [];
              completedList.forEach((probId: string) => {
                const already = student.practiceSubmissions.some((x: any) => x.problemId === probId || x.problemSlug === probId || x.id === `cohort-${prn}-${probId}`);
                if (!already) {
                  const topic = TOPIC_PRACTICE_DATA.find((t) => t.id === probId);
                  const title = topic?.topicTitle || topic?.problem?.title || probId.replace(/[-_]/g, ' ').toUpperCase();
                  const difficulty = topic?.problem?.difficulty || 'EASY';
                  const timeStr = cData.moduleProgress?.lastActiveTime || (cData.updatedAt?.toDate?.() ? cData.updatedAt.toDate().toISOString() : (typeof cData.updatedAt === 'string' ? cData.updatedAt : new Date().toISOString()));

                  student.practiceSubmissions.push({
                    id: `cohort-${prn}-${probId}`,
                    problemId: probId,
                    problemSlug: probId,
                    problemTitle: title,
                    problem: {
                      id: probId,
                      title,
                      difficulty,
                    },
                    difficulty,
                    verdict: 'ACCEPTED',
                    pointsAwarded: 20,
                    timeTakenSeconds: 45,
                    submittedAt: timeStr,
                    createdAt: timeStr,
                    code: '',
                    draftSlug: `practice_topic_${probId}`,
                    studentPrn: prn,
                  });
                }
              });
            }
          });
        }

        // Compute total answers and sort each student's submission history
        const list = Array.from(studentsMap.values())
          .filter((st) => !FirestoreDataService.isPurgedStudent(st) && !st.name?.startsWith('Candidate '))
          .map((st) => {
          st.labInternalSubmissions.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
          st.practiceSubmissions.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
          st.totalAnswersCount = st.labInternalSubmissions.length + st.practiceSubmissions.length;
          return st;
        });

        setStudents(list);
      } catch (err) {
        console.warn('Error loading Answer Bank data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAnswerBankData();

    // 0ms Real-time Firestore Listeners
    const unsubAssessment = onSnapshot(collection(db, 'assessment_test_submissions'), () => loadAnswerBankData(), (err) => console.warn('AnswerBank live assessment sub notice:', err));
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), () => loadAnswerBankData(), (err) => console.warn('AnswerBank live gen sub notice:', err));
    const unsubCohort = onSnapshot(collection(db, 'cohort_progress'), () => loadAnswerBankData(), (err) => console.warn('AnswerBank live cohort notice:', err));
    const unsubEnrolled = onSnapshot(collection(db, 'enrolled_students'), () => loadAnswerBankData(), (err) => console.warn('AnswerBank live enrolled notice:', err));

    const unsubMeshUsers = realtimeSync.on('USERS', () => loadAnswerBankData());
    const unsubMeshSubs = realtimeSync.on('SUBMISSIONS', () => loadAnswerBankData());
    const unsubMeshSections = realtimeSync.on('SECTIONS', () => loadAnswerBankData());

    return () => {
      isMounted = false;
      unsubAssessment();
      unsubSubmissions();
      unsubCohort();
      unsubEnrolled();
      unsubMeshUsers();
      unsubMeshSubs();
      unsubMeshSections();
    };
  }, []);

  // Sync inspected student if underlying state changes
  useEffect(() => {
    if (inspectedStudent) {
      const refreshed = students.find((s) => s.id === inspectedStudent.id || s.prn === inspectedStudent.prn);
      if (refreshed) {
        setInspectedStudent(refreshed);
      }
    }
  }, [students]);

  // Deep load authenticated candidate draft codes from cohort_progress vault
  useEffect(() => {
    if (!inspectedStudent || !inspectedStudent.prn || inspectedStudent.prn === '—') return;
    let active = true;

    const loadStudentDraftCodes = async () => {
      try {
        const draftsSnap = await getDocs(collection(db, 'cohort_progress', inspectedStudent.prn, 'drafts')).catch(() => null);
        if (!draftsSnap || draftsSnap.empty || !active) return;

        const draftsMap = new Map<string, string>();
        draftsSnap.docs.forEach((docSnap) => {
          const code = docSnap.data()?.code;
          if (code && typeof code === 'string') {
            draftsMap.set(docSnap.id, code);
          }
        });

        setInspectedStudent((prev) => {
          if (!prev) return null;
          let modified = false;
          const updatedPractice = prev.practiceSubmissions.map((sub: any) => {
            const matchedCode =
              draftsMap.get(sub.draftSlug) ||
              draftsMap.get(`practice_topic_${sub.problemId}`) ||
              draftsMap.get(`topic_${sub.problemId}`) ||
              draftsMap.get(sub.problemId) ||
              draftsMap.get(sub.problemSlug);

            if (matchedCode && matchedCode !== sub.code) {
              modified = true;
              return { ...sub, code: matchedCode };
            }
            return sub;
          });

          if (!modified) return prev;
          return {
            ...prev,
            practiceSubmissions: updatedPractice,
          };
        });
      } catch (e) {
        console.warn('Error loading draft codes for student:', e);
      }
    };

    loadStudentDraftCodes();
    return () => {
      active = false;
    };
  }, [inspectedStudent?.prn, inspectedStudent?.id]);

  // Unique sections list for dropdown
  const sectionsList = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.section))).filter(Boolean);
  }, [students]);

  // Total answers aggregated
  const totalAnswersPlatform = useMemo(() => {
    return students.reduce((acc, s) => acc + s.totalAnswersCount, 0);
  }, [students]);

  const totalLabInternalPlatform = useMemo(() => {
    return students.reduce((acc, s) => acc + s.labInternalSubmissions.length, 0);
  }, [students]);

  const totalPracticePlatform = useMemo(() => {
    return students.reduce((acc, s) => acc + s.practiceSubmissions.length, 0);
  }, [students]);

  // Filtered & sorted student list
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.prn.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    // Section filter
    if (selectedSectionFilter !== 'ALL') {
      result = result.filter((s) => s.section === selectedSectionFilter);
    }

    // Type filter
    if (selectedTypeFilter === 'WITH_ANSWERS') {
      result = result.filter((s) => s.totalAnswersCount > 0);
    } else if (selectedTypeFilter === 'LAB_INTERNAL_ONLY') {
      result = result.filter((s) => s.labInternalSubmissions.length > 0);
    } else if (selectedTypeFilter === 'PRACTICE_ONLY') {
      result = result.filter((s) => s.practiceSubmissions.length > 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'MOST_ANSWERS') {
        return b.totalAnswersCount - a.totalAnswersCount;
      }
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'PRN') {
        return a.prn.localeCompare(b.prn);
      }
      // RECENT
      return b.lastActive.localeCompare(a.lastActive);
    });

    return result;
  }, [students, searchQuery, selectedSectionFilter, selectedTypeFilter, sortBy]);

  // Group inspected student's Lab Internal submissions by Module/Test
  const labInternalByModule = useMemo(() => {
    if (!inspectedStudent) return { modules: [], map: new Map<string, any[]>() };
    const map = new Map<string, any[]>();

    inspectedStudent.labInternalSubmissions.forEach((sub: any) => {
      const modName = sub.testTitle || sub.assignmentId || sub.testId || 'Continuous Assessment';
      if (!map.has(modName)) {
        map.set(modName, []);
      }
      map.get(modName)!.push(sub);
    });

    const modules = Array.from(map.keys());
    return { modules, map };
  }, [inspectedStudent]);

  // Group Lab Internal submissions for a selected module by Question
  const questionsInSelectedModule = useMemo(() => {
    if (!inspectedStudent) return [];
    let subs = inspectedStudent.labInternalSubmissions;
    if (selectedModuleFilter !== 'ALL') {
      subs = subs.filter((s) => (s.testTitle || s.assignmentId || s.testId || 'Continuous Assessment') === selectedModuleFilter);
    }

    // Group by problemTitle or problemId
    const qMap = new Map<string, any[]>();
    subs.forEach((s) => {
      const key = s.problemTitle || s.problemId || 'Assessment Question';
      if (!qMap.has(key)) qMap.set(key, []);
      qMap.get(key)!.push(s);
    });

    return Array.from(qMap.entries()).map(([title, attempts]) => ({
      title,
      problemId: attempts[0]?.problemId,
      difficulty: attempts[0]?.difficulty || 'MEDIUM',
      attempts,
    }));
  }, [inspectedStudent, selectedModuleFilter]);

  const handleCopyCode = (id: string, code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success('Solution code copied to clipboard!');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE EXECUTIVE HERO HEADER                                            */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Authoritative Candidate Answer Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Answer Bank</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {totalAnswersPlatform} Total Answers
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Inspect candidate submitted code solutions across Lab Internal practical assessments and self-directed practice modules. Click on any student box below to open their deep submission vault.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center font-mono text-xs">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">{students.length} Candidates</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5" />
              <span className="font-bold">{totalLabInternalPlatform} Lab Answers</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-bold">{totalPracticePlatform} Practice</span>
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, PRN, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Section Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Sections ({sectionsList.length})</option>
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Candidates</option>
              <option value="WITH_ANSWERS">With Submissions Only</option>
              <option value="LAB_INTERNAL_ONLY">Lab Internal Active</option>
              <option value="PRACTICE_ONLY">Practice Active</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="MOST_ANSWERS">Sort: Most Answers</option>
              <option value="NAME">Sort: Student Name (A-Z)</option>
              <option value="PRN">Sort: PRN</option>
              <option value="RECENT">Sort: Recent Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3x2 CANDIDATE CARDS GRID (Requested Format)                            */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <Activity className="w-8 h-8 mx-auto text-blue-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 mt-2">Loading Student Answer Bank Vault...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-[#121620]/75 border border-slate-200/80 dark:border-white/10 space-y-2">
          <Archive className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No candidates found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms or filters above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const hasAnswers = student.totalAnswersCount > 0;
            return (
              <div
                key={student.id}
                onClick={() => {
                  setInspectedStudent(student);
                  setVaultCategory(student.labInternalSubmissions.length > 0 ? 'LAB_INTERNAL' : 'PRACTICE');
                  setSelectedModuleFilter('ALL');
                }}
                className={`group relative p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  hasAnswers
                    ? 'bg-white/80 dark:bg-[#121620]/80 border-slate-200/90 dark:border-white/10 hover:border-blue-500/60 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-white/50 dark:bg-[#121620]/40 border-slate-200/50 dark:border-white/5 hover:border-slate-300'
                } backdrop-blur-xl`}
                style={{ minHeight: '190px' }}
              >
                {/* Card Top: Identity & Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        {(student.name || (student as any).fullName || (student as any).displayName || 'ST').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {student.name || (student as any).fullName || (student as any).displayName || 'Student'}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                      {student.prn}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {student.section}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Active: {student.lastActive}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Metrics & 1-Click Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-sans">Lab Internal</span>
                      <span className="font-bold">{student.labInternalSubmissions.length} Ans</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-sans">Practice</span>
                      <span className="font-bold">{student.practiceSubmissions.length} Ans</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold pt-0.5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {student.totalAnswersCount} Total Solutions
                    </span>
                    <span className="flex items-center gap-1 text-xs group-hover:translate-x-1 transition">
                      <span>View Answer Vault</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXPANDED STUDENT ANSWER VAULT MODAL / DRAWER                           */}
      {/* ========================================================================= */}
      {inspectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#10141e] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-blue-500/20">
                  {(inspectedStudent.name || (inspectedStudent as any).fullName || (inspectedStudent as any).displayName || 'ST').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      {inspectedStudent.name || (inspectedStudent as any).fullName || (inspectedStudent as any).displayName || 'Student'}
                    </h3>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {inspectedStudent.prn}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {inspectedStudent.section}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {inspectedStudent.email} • Vault of All Submitted C Solutions &amp; Answers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Category Segmented Tabs: LAB INTERNAL vs PRACTICE */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setVaultCategory('LAB_INTERNAL');
                  setSelectedModuleFilter('ALL');
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  vaultCategory === 'LAB_INTERNAL'
                    ? 'bg-white dark:bg-[#1a2130] text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>🔬 Lab Internal Assessments ({inspectedStudent.labInternalSubmissions.length} Answers)</span>
              </button>
              <button
                type="button"
                onClick={() => setVaultCategory('PRACTICE')}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  vaultCategory === 'PRACTICE'
                    ? 'bg-white dark:bg-[#1a2130] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>💻 Practice Solutions ({inspectedStudent.practiceSubmissions.length} Answers)</span>
              </button>
            </div>

            {/* Scrollable Content Vault Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* ================================================================= */}
              {/* CATEGORY 1: LAB INTERNAL (Grouped by Module & Questions)          */}
              {/* ================================================================= */}
              {vaultCategory === 'LAB_INTERNAL' && (
                <div className="space-y-4">
                  {/* Module Sub-tabs Filter */}
                  {labInternalByModule.modules.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <span className="text-slate-400 text-[11px] font-medium mr-1 shrink-0">Filter Module:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 cursor-pointer ${
                          selectedModuleFilter === 'ALL'
                            ? 'bg-purple-600 text-white shadow-xs font-bold'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        All Modules ({inspectedStudent.labInternalSubmissions.length})
                      </button>
                      {labInternalByModule.modules.map((modName) => {
                        const count = labInternalByModule.map.get(modName)?.length || 0;
                        const isSelected = selectedModuleFilter === modName;
                        return (
                          <button
                            key={modName}
                            type="button"
                            onClick={() => setSelectedModuleFilter(modName)}
                            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-xs font-bold'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{modName} ({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {questionsInSelectedModule.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                      <FileCode className="w-8 h-8 mx-auto text-slate-400" />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Zero Lab Internal Answers Found
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This candidate has not submitted any code for Lab Internal assessment tests yet. Submissions will populate here live upon test completion.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questionsInSelectedModule.map((qGroup, qIdx) => {
                        const activeAttemptIdx = selectedQuestionAttemptIdx[qGroup.title] || 0;
                        const activeSubmission = qGroup.attempts[activeAttemptIdx] || qGroup.attempts[0];
                        const isAccepted = activeSubmission?.verdict === 'ACCEPTED';

                        return (
                          <div
                            key={qGroup.title + qIdx}
                            className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#141a27]/80 backdrop-blur-xl space-y-3.5 shadow-xs"
                          >
                            {/* Question Header & Metrics */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    {activeSubmission?.testTitle || 'Continuous Assessment'}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    qGroup.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-600' :
                                    qGroup.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-600' :
                                    'bg-amber-500/10 text-amber-600'
                                  }`}>
                                    {qGroup.difficulty}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Q ID: {qGroup.problemId || 'exam-q'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {qGroup.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center font-mono text-xs">
                                <span className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 ${
                                  isAccepted
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}>
                                  {isAccepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                  <span>{activeSubmission?.verdict || 'ACCEPTED'}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                                  Score: {activeSubmission?.academicScore ?? 1.0} Marks
                                </span>
                              </div>
                            </div>

                            {/* Attempt Selector (if multiple attempts) */}
                            {qGroup.attempts.length > 1 && (
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-xs">
                                <span className="text-slate-400 text-[11px] font-semibold">
                                  {qGroup.attempts.length} Answers Submitted:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {qGroup.attempts.map((att: any, attIdx: number) => (
                                    <button
                                      key={att.id || attIdx}
                                      type="button"
                                      onClick={() => setSelectedQuestionAttemptIdx((prev) => ({ ...prev, [qGroup.title]: attIdx }))}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                                        activeAttemptIdx === attIdx
                                          ? 'bg-blue-600 text-white font-bold'
                                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                      }`}
                                    >
                                      Attempt #{attIdx + 1} ({att.verdict || 'SUBMITTED'})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Proctoring & Timing Bar */}
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>Submitted: {activeSubmission?.submittedAt ? new Date(activeSubmission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-blue-400" />
                                  <span>Time: {activeSubmission?.timeTakenSeconds || 0}s</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span>Tab Switches: <strong>{activeSubmission?.tabSwitchCount || 0}</strong></span>
                                <span>Paste Injections: <strong>{activeSubmission?.copyPasteAttempts || 0}</strong></span>
                                <span>Keystrokes: <strong>{activeSubmission?.totalKeystrokes || 0}</strong></span>
                              </div>
                            </div>

                            {/* Code Solution Display Container */}
                            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0c1017]">
                              {/* Editor Top Bar */}
                              <div className="flex items-center justify-between px-3.5 py-2 bg-[#121824] border-b border-white/5 text-xs text-slate-400 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                  <span className="text-[11px] text-slate-300 ml-1">solution.c</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-400">GCC 14 (-std=c11)</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(activeSubmission?.id || qGroup.title, activeSubmission?.code || '')}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-sans font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                >
                                  {copiedCodeId === (activeSubmission?.id || qGroup.title) ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Code</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Code Text Block */}
                              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-72 selection:bg-blue-500/30">
                                <code>{activeSubmission?.code || '// No code recorded for this attempt.'}</code>
                              </pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* CATEGORY 2: PRACTICE SOLUTIONS                                   */}
              {/* ================================================================= */}
              {vaultCategory === 'PRACTICE' && (
                <div className="space-y-4">
                  {inspectedStudent.practiceSubmissions.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                      <Terminal className="w-8 h-8 mx-auto text-slate-400" />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Zero Practice Answers Found
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This candidate has not submitted any code in daily or topic practice yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inspectedStudent.practiceSubmissions.map((sub: any, pIdx: number) => {
                        const isAccepted = sub.verdict === 'ACCEPTED';
                        const pTitle = sub.problem?.title || sub.problemTitle || `Practice Exercise #${pIdx + 1}`;
                        const pDiff = sub.problem?.difficulty || sub.difficulty || 'MEDIUM';

                        return (
                          <div
                            key={sub.id || pIdx}
                            className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#141a27]/80 backdrop-blur-xl space-y-3.5 shadow-xs"
                          >
                            {/* Practice Question Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    Self-Paced Practice
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    pDiff === 'HARD' ? 'bg-rose-500/10 text-rose-600' :
                                    pDiff === 'EASY' ? 'bg-emerald-500/10 text-emerald-600' :
                                    'bg-amber-500/10 text-amber-600'
                                  }`}>
                                    {pDiff}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {pTitle}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center font-mono text-xs">
                                <span className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 ${
                                  isAccepted
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}>
                                  {isAccepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                  <span>{sub.verdict || 'ACCEPTED'}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                  +{sub.pointsAwarded || 10} Pts
                                </span>
                              </div>
                            </div>

                            {/* Code Container */}
                            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0c1017]">
                              <div className="flex items-center justify-between px-3.5 py-2 bg-[#121824] border-b border-white/5 text-xs text-slate-400 font-mono">
                                <span className="text-[11px] text-slate-300">practice_solution.c</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(sub.id || `p-${pIdx}`, sub.code || '')}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-sans font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                >
                                  {copiedCodeId === (sub.id || `p-${pIdx}`) ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Code</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-72 selection:bg-blue-500/30">
                                <code>{sub.code || '// No code recorded.'}</code>
                              </pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
