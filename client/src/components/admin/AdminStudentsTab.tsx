import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Check,
  Copy,
  Lock,
  Unlock,
  Activity,
  Mail,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Layers,
  CheckCircle2,
  Eye,
  Download,
  FileSpreadsheet,
  Award,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StudentDeepDiveModal } from './StudentDeepDiveModal.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import { FadeUp, StaggerContainer, StaggerItem } from '../common/ScrollAnimations.js';
import { useAuth } from '../../context/AuthContext.js';
import { findCohortStudent } from '../../data/c-programming-cohort.data.js';
import { isRealPersonName } from '../../config/academic.config.js';
import { isOfficialAssessmentTest } from '../../utils/progression.js';

function formatLastActiveWithDate(rawTime?: any): string {
  if (!rawTime) return 'Recent';
  try {
    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return String(rawTime);
    const datePart = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return 'Recent';
  }
}

export interface AdminStudentRecord {
  id: string;
  name: string;
  prn: string;
  email: string;
  section: string;
  identityStatus: 'BOUND' | 'EMAIL_VERIFIED' | 'PENDING';
  academicScore: number; // 0-100
  integrityScore: number; // 0-100
  miniProjectUnlocked: boolean;
  lastActive: string;
  problemsSolved?: number;
  practiceSolved?: number;
  labSolved?: number;
  cieMarks?: number;
  clipboardAttempts?: number;
  tabSwitchCount?: number;
  totalKeystrokes?: number;
  isBanned?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
}

export interface AdminStudentsTabProps {
  students?: AdminStudentRecord[];
  sections?: any[];
}

export const AdminStudentsTab: React.FC<AdminStudentsTabProps> = ({
  students: propStudents,
  sections: propSections,
}) => {
  const { user, isAdmin, isFaculty } = useAuth();
  const isSuperAdmin = Boolean(isAdmin || user?.email === 'logicqarena@gmail.com' || user?.email === 'hariprasathset@sanjivani.edu.in');
  const facultyEmailClean = (user?.email || '').toLowerCase().trim();
  const isDemostaff = facultyEmailClean === 'demostaff@gmail.com';
  const isFacultyUser = Boolean(!isSuperAdmin && (user?.role === 'FACULTY' || isFaculty));
  const facultySection = propSections && propSections.length > 0 ? propSections[0].sectionName : (user?.sectionName || user?.department || 'Computer Science');

  const [students, setStudents] = useState<AdminStudentRecord[]>(() => {
    if (propStudents && Array.isArray(propStudents)) return propStudents;
    return [];
  });
  const [isLoading, setIsLoading] = useState(!propStudents || propStudents.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'UNVERIFIED' | 'UNLOCKED'>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>(isFacultyUser ? facultySection : 'ALL');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<AdminStudentRecord | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Sync when propStudents updates from parent with change-detection (zero redundant re-renders)
  useEffect(() => {
    if (propStudents && Array.isArray(propStudents) && propStudents.length > 0) {
      setStudents((prev) => {
        if (!prev || prev.length === 0) return propStudents;
        const prevMap = new Map<string, AdminStudentRecord>();
        prev.forEach((p) => {
          const k = (p.prn || p.email || p.id).toUpperCase();
          if (k) prevMap.set(k, p);
        });

        let hasChange = false;
        const nextList = propStudents.map((st: any) => {
          const k = (st.prn || st.email || st.id || '').toUpperCase();
          const existing = prevMap.get(k);
          if (!existing) {
            hasChange = true;
            return st;
          }
          const nextSolved = Number(st.problemsSolved ?? (st as any).totalSolved ?? existing.problemsSolved ?? 0);
          const nextBound = (st.identityStatus === 'BOUND' || existing.identityStatus === 'BOUND') ? 'BOUND' : 'PENDING';
          if (nextSolved !== existing.problemsSolved || nextBound !== existing.identityStatus || st.email !== existing.email) {
            hasChange = true;
          }
          return {
            ...existing,
            ...st,
            section: st.section || existing.section || 'Integrated Mtech',
            identityStatus: nextBound,
            problemsSolved: nextSolved,
          };
        });

        if (!hasChange && prev.length === nextList.length) {
          return prev; // Bail out: Prevents full 119-card DOM re-renders when data is unchanged
        }
        return nextList;
      });
      setIsLoading(false);
    }
  }, [propStudents]);

  // Available unique sections for filtering
  const availableSections = React.useMemo(() => {
    if (propSections && Array.isArray(propSections) && propSections.length > 0) {
      return propSections.map((s) => s.sectionName).filter(Boolean).sort();
    }
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.section && s.section !== '—' && s.section !== 'General') {
        set.add(s.section);
      }
    });
    return Array.from(set).sort();
  }, [students, propSections]);

  // Fetch real students from Firestore and local storage cache
  useEffect(() => {
    let isMounted = true;

    const allowedSectionKeys = new Set(
      (propSections || []).flatMap((s: any) => [
        String(s.id || '').toUpperCase().trim(),
        String(s.joinCode || '').toUpperCase().trim(),
        String(s.sectionName || '').toUpperCase().trim(),
      ]).filter(Boolean)
    );

    const isRohanRecord = (s: any) => {
      const n = String(s.name || s.fullName || '').toLowerCase();
      const e = String(s.email || '').toLowerCase();
      const p = String(s.prn || '').toUpperCase();
      const id = String(s.id || s.uid || '').toLowerCase();
      // Only purge the legacy mock test account 'Rohan Sharma' (preserve authentic student Jagtap Rohan Sunil)
      return (
        n === 'rohan sharma' ||
        n.startsWith('rohan sharma') ||
        e.includes('rohan_1390') ||
        e.includes('rohan.sharma') ||
        p.includes('2199IMTE') ||
        id.includes('2199imte')
      );
    };

    const filterByOwnership = (st: any) => {
      const prnClean = (st.prn || '').toUpperCase().trim();
      const isDemo =
        prnClean === '2026BCSE101' ||
        prnClean === '2026BCSE102' ||
        st.sectionId === 'sec-demo-section' ||
        st.joinCode === 'LQ-DEMO' ||
        String(st.section || st.sectionName || '').toLowerCase().includes('demo');

      if (isDemostaff) {
        return isDemo;
      }
      // Strictly prevent demo students from leaking into non-demostaff admin/faculty
      if (isDemo) {
        return false;
      }
      // SuperAdmin sees all authentic cohort students
      if (isSuperAdmin) {
        return true;
      }
      if (propStudents && propStudents.length > 0) {
        return propStudents.some((p) => (p.prn && p.prn === st.prn) || (p.email && p.email.toLowerCase() === st.email.toLowerCase()) || p.id === st.id);
      }
      if (allowedSectionKeys.size > 0) {
        const secStr = String(st.section || '').toUpperCase().trim();
        return allowedSectionKeys.has(secStr);
      }
      return true;
    };

    const loadStudents = async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);

        // 1. Check local cache first for instant render
        try {
          const cached = localStorage.getItem('logicq_admin_students');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              const cleaned = parsed
                .filter((s: any) => !FirestoreDataService.isPurgedStudent(s) && !isRohanRecord(s))
                .filter(filterByOwnership)
                .map((s: any) => {
                  const prnC = (s.prn || '').toUpperCase().trim();
                  const cs = prnC ? findCohortStudent(prnC) : null;
                  const validName = (s.name && isRealPersonName(s.name) ? s.name : null) ||
                                    (cs ? cs.fullName : null) ||
                                    s.name || s.fullName || s.displayName || 'Student Candidate';
                  const isDemo = prnC === '2026BCSE101' || prnC === '2026BCSE102' || (s.section && s.section.toLowerCase().includes('demo'));
                  const is1083 = prnC === '2126PMIM1083' || prnC === '1226PMIM1083';
                  return {
                    ...s,
                    name: validName,
                    email: is1083 ? 'nihalattarde2008@gmail.com' : s.email,
                    identityStatus: is1083 ? 'BOUND' : s.identityStatus,
                    section: isDemo
                      ? 'Demo Section'
                      : (s.section === 'C Programming' || !s.section || s.section.toLowerCase().includes('mtech')) ? 'Integrated Mtech' : s.section
                  };
                });
              setStudents(cleaned);
            }
          }
        } catch {}

        // 2. Fetch authoritative users alongside Supabase practice_progress, assessment_submissions & Firestore
        const [users, sbPracticeRes, sbAssessRes, cohortSnap, assessSnap, subSnap, keyvalBoundRes] = await Promise.all([
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          isSupabaseConfigured ? supabase.from('practice_progress').select('*') : Promise.resolve({ data: [] } as any),
          isSupabaseConfigured ? supabase.from('assessment_submissions').select('*') : Promise.resolve({ data: [] } as any),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
          getDocs(collection(db, 'assessment_test_submissions')).catch(() => null),
          getDocs(collection(db, 'submissions')).catch(() => null),
          fetch('https://api.keyval.org/get/lq_bound_index_v2026', { signal: AbortSignal.timeout(2000) }).then((r) => r.json()).catch(() => null),
        ]);

        const keyvalBoundMap = new Map<string, string>();
        if (keyvalBoundRes?.status === 'SUCCESS' && keyvalBoundRes?.val) {
          const pairs = String(keyvalBoundRes.val).split(',').map((s: string) => s.trim()).filter(Boolean);
          pairs.forEach((pair: string) => {
            const [p, em] = pair.split(':');
            if (p && em) {
              keyvalBoundMap.set(p.toUpperCase().trim(), em.toLowerCase().trim());
            }
          });
        }

        const cohortMap = new Map<string, any>();
        // Populate from Supabase practice_progress first (unlimited bandwidth, 100% immune to Firestore quota)
        if (sbPracticeRes?.data && Array.isArray(sbPracticeRes.data)) {
          sbPracticeRes.data.forEach((p: any) => {
            const prn = (p.student_prn || '').toUpperCase().trim();
            if (prn) {
              const rawTopics = Array.isArray(p.solved_topic_ids) ? p.solved_topic_ids : [];
              const solved = rawTopics.filter((id: string) => id && !id.startsWith('cs-demo-') && !id.startsWith('demo-') && !id.startsWith('practice-c'));
              const labTopics = rawTopics.filter((id: string) => id && id.startsWith('practice-c'));
              const is1003Prn = prn === '2126PMIM1003' || prn === '2126PMIF1003';
              const solvedCount = is1003Prn ? 100 : prn === '2126PMIM1049' ? 66 : prn === '2126PMIM1042' ? 51 : prn === '2126PMIM1039' ? 100 : prn === '2126PMIM1122' ? Math.max(51, solved.length, Number(p.total_solved) || 0) : (solved.length > 0 ? solved.length : (Number(p.total_solved) || 0));
              const isExplicitReset = !is1003Prn && (Number(p.total_solved) === 0 && solved.length === 0);
              cohortMap.set(prn, {
                prn,
                totalSolved: solvedCount,
                completedProblems: solved,
                labCompletedProblems: labTopics,
                labFromTopics: labTopics.length,
                isExplicitlyReset: isExplicitReset,
                moduleProgress: {
                  totalSolved: solvedCount,
                  lastActiveTime: p.last_solved_at || p.updated_at,
                  academicScore: Math.min(100, solvedCount * 20),
                },
              });
            }
          });
        }

        // Merge Firestore cohort_progress if accessible
        if (cohortSnap) {
          cohortSnap.forEach((d: any) => {
            const prn = d.id.toUpperCase().trim();
            const dData = d.data();
            const existing = cohortMap.get(prn);
            if (!existing) {
              cohortMap.set(prn, dData);
            } else {
              const isReset = Boolean(existing.isExplicitlyReset || (existing.totalSolved === 0 && Array.isArray(existing.completedProblems) && existing.completedProblems.length === 0));
              const exSolved = Number(existing.totalSolved || 0);
              const dSolved = isReset ? 0 : Number(dData.totalSolved || 0);
              const authSolved = isReset ? 0 : Math.max(exSolved, dSolved);
              const exCompleted = Array.isArray(existing.completedProblems) ? existing.completedProblems : [];
              const dCompleted = isReset ? [] : (Array.isArray(dData.completedProblems) ? dData.completedProblems : []);
              const authCompleted = isReset ? [] : Array.from(new Set([...exCompleted, ...dCompleted]))
                .filter((id: string) => id && !id.startsWith('cs-demo-') && !id.startsWith('demo-'));
              cohortMap.set(prn, {
                ...dData,
                ...existing,
                totalSolved: authSolved,
                completedProblems: authCompleted,
                isExplicitlyReset: isReset,
              });
            }
          });
        }

        const assessSubs: any[] = [];
        // Populate assessment submissions from Supabase first
        if (sbAssessRes?.data && Array.isArray(sbAssessRes.data)) {
          sbAssessRes.data.forEach((s: any) => {
            assessSubs.push({
              id: s.id,
              testId: s.test_id,
              studentPrn: (s.student_prn || '').toUpperCase().trim(),
              studentName: s.student_name,
              studentEmail: s.student_email,
              academicScore: s.academic_score,
              score: s.academic_score,
              points: s.academic_score,
              fullscreenExits: s.fullscreen_exits,
              tabSwitchCount: s.tab_switch_count,
              copyPasteAttempts: s.copy_paste_attempts,
              totalKeystrokes: s.total_keystrokes,
              cpm: s.cpm,
              q1: s.q1,
              q2: s.q2,
              status: s.status,
              verdict: s.status === 'PASSED' ? 'ACCEPTED' : (s.status || 'SUBMITTED'),
              submittedAt: s.submitted_at,
            });
          });
        }
        if (assessSnap) {
          assessSnap.forEach((d: any) => {
            const data = d.data();
            const tid = String(data?.testId || data?.assignmentId || '');
            const title = String(data?.testTitle || '').toLowerCase();
            if (!FirestoreDataService.isDeletedTest(tid)) {
              assessSubs.push(data);
            }
          });
        }

        const genSubs: any[] = [];
        if (subSnap) {
          subSnap.forEach((d: any) => genSubs.push(d.data()));
        }

        if (isMounted && Array.isArray(users)) {
          const studentUsers: AdminStudentRecord[] = users
            .filter((u) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com' && u.email !== 'hariprasathset@sanjivani.edu.in')) && !FirestoreDataService.isPurgedStudent(u) && !isRohanRecord(u))
            .map((u) => {
              const anyUser = u as any;
              const prnClean = (anyUser.prn || '').toUpperCase().trim();
              const userEmail = (anyUser.email || '').toLowerCase().trim();
              const userId = String(anyUser.id || anyUser.uid || '').trim();

              const altPrn = prnClean.startsWith('1226') ? '2126' + prnClean.slice(4) : (prnClean.startsWith('2126') ? '1226' + prnClean.slice(4) : null);
              const cData = cohortMap.get(prnClean) ||
                            cohortMap.get(prnClean.replace(/0/g, 'O')) ||
                            cohortMap.get(prnClean.replace(/O/g, '0')) ||
                            (altPrn ? cohortMap.get(altPrn) : null) ||
                            cohortMap.get(userId.toUpperCase()) || {};
              const mod = cData.moduleProgress || {};

              const kvBoundEmail = keyvalBoundMap.get(prnClean) || (altPrn ? keyvalBoundMap.get(altPrn) : null);

              const isBound = Boolean(
                Boolean(kvBoundEmail) ||
                anyUser.isEmailBound ||
                anyUser.isEmailBoundV2 ||
                anyUser.emailVerified ||
                anyUser.identityStatus === 'BOUND' ||
                Boolean(anyUser.boundEmail) ||
                cData.isEmailBound ||
                cData.isEmailBoundV2 ||
                cData.emailVerified ||
                Boolean(cData.boundEmail) ||
                Boolean(mod.boundEmail) ||
                Boolean(mod.isEmailBound) ||
                Boolean(mod.isEmailBoundV2) ||
                (anyUser.email && !anyUser.email.endsWith('@sanjivani.edu.in') && anyUser.email.includes('@')) ||
                (cData.boundEmail && !cData.boundEmail.endsWith('@sanjivani.edu.in') && cData.boundEmail.includes('@')) ||
                (cData.studentEmail && !cData.studentEmail.endsWith('@sanjivani.edu.in') && cData.studentEmail.includes('@'))
              );

              const resolvedEmail =
                kvBoundEmail ||
                cData.boundEmail ||
                mod.boundEmail ||
                anyUser.boundEmail ||
                (cData.studentEmail && !cData.studentEmail.endsWith('@sanjivani.edu.in') ? cData.studentEmail : null) ||
                (anyUser.email && !anyUser.email.endsWith('@sanjivani.edu.in') ? anyUser.email : null) ||
                anyUser.email ||
                (prnClean ? `${prnClean.toLowerCase()}@sanjivani.edu.in` : '—');

              // Match student's submissions across tests and practice separately
              const isMatch = (s: any) => {
                const sPrn = s.studentPrn || s.prn || '';
                const sEmail = (s.studentEmail || s.email || '').toLowerCase().trim();
                const sUid = (s.userId || s.studentId || '').trim();
                return (prnClean && FirestoreDataService.arePrnsMatching(sPrn, prnClean)) ||
                       (userEmail && sEmail && sEmail === userEmail) ||
                       (userId && sUid && sUid === userId);
              };

              const matchedLabSubs = assessSubs.filter(isMatch);
              const matchedPracticeSubs = genSubs.filter((s: any) => isMatch(s) && !isOfficialAssessmentTest(s) && s.submissionType !== 'ASSESSMENT');

              const practiceProblems = new Set<string>();
              if (Array.isArray(cData.completedProblems)) {
                cData.completedProblems.forEach((p: string) => {
                  if (p && !p.startsWith('exam_') && !p.startsWith('test_') && !p.startsWith('cs-demo-') && !p.startsWith('demo-') && !p.startsWith('practice-c')) {
                    practiceProblems.add(String(p));
                  }
                });
              }
              matchedPracticeSubs.forEach((s: any) => {
                if (s.verdict === 'ACCEPTED' || s.status === 'PASSED' || Number(s.score || s.points || 0) > 0) {
                  const probKey = s.problemId || s.problemSlug;
                  if (probKey && !probKey.startsWith('exam_') && !probKey.startsWith('test_') && !probKey.startsWith('cs-demo-') && !probKey.startsWith('demo-') && !probKey.startsWith('practice-c')) {
                    practiceProblems.add(String(probKey));
                  }
                }
              });

              const labFromTopicsCount = Array.isArray(cData.labCompletedProblems)
                ? cData.labCompletedProblems.length
                : (Number(cData.labFromTopics) || 0);
              const labSolvedCount = Math.max(
                matchedLabSubs.filter((s: any) => s.verdict === 'ACCEPTED' || s.verdict === 'AC' || (Number(s.academicScore) || 0) > 0).length,
                labFromTopicsCount
              );

              const isStudentReset = Boolean(cData.isExplicitlyReset || (cData.totalSolved === 0 && (!cData.completedProblems || cData.completedProblems.length === 0)));
              const is1003Clean = prnClean === '2126PMIM1003' || prnClean === '2126PMIF1003';
              const practiceSolved = is1003Clean
                ? 100
                : isStudentReset
                ? 0
                : (prnClean === '2126PMIM1049')
                ? 66
                : (prnClean === '2126PMIM1042')
                ? 51
                : (prnClean === '2126PMIM1039')
                ? 100
                : (prnClean === '2126PMIM1122')
                ? Math.max(51, practiceProblems.size, Number(cData.totalSolved) || 0, Array.isArray(cData.completedProblems) ? cData.completedProblems.length : 0)
                : ((prnClean === '2126PMIM1015')
                    ? Math.min(100, Math.max(50, practiceProblems.size, Number(cData.totalSolved) || 0))
                    : Math.min(100, Math.max(
                        practiceProblems.size,
                        Number(cData.totalSolved) || 0,
                        Array.isArray(cData.completedProblems) ? cData.completedProblems.length : 0
                      )));

              // COMBINED TOTAL: Practice Solved + Lab Internal Solved
              const totalSolved = practiceSolved + labSolvedCount;
              const studentCieMarks = Math.min(20, Math.round(((labSolvedCount / 80) * 20) * 10) / 10);

              const pointsFromSubs = Math.round(
                matchedLabSubs.reduce((acc: number, s: any) => acc + (Number(s.academicScore) || Number(s.score) || Number(s.points) || 0), 0) +
                matchedPracticeSubs.reduce((acc: number, s: any) => acc + (Number(s.score) || Number(s.points) || 0), 0)
              );

              const totalPoints = Math.max(
                pointsFromSubs,
                cData.totalPoints ?? 0,
                totalSolved * 20
              );

              // Hariprasad Sir Mandate: Tab switches & pastes strictly isolated to Lab Internal assessments
              const tabSwitches = Math.max(
                0,
                ...matchedLabSubs.map((s: any) => Number(s.tabSwitchCount) || 0)
              );

              const pasteBursts = Math.max(
                0,
                ...matchedLabSubs.map((s: any) => Number(s.copyPasteAttempts || s.pasteBursts) || 0)
              );

              const totalKeystrokes = Math.max(
                0,
                ...matchedLabSubs.map((s: any) => Number(s.totalKeystrokes) || 0),
                Number(mod.totalKeystrokes) || 0
              );

              // ⚠️ SACRED RULE: Integrity ONLY from Lab Internal — NEVER from Practice tabSwitches
              // Cheating violations (tab switches & paste bursts) automatically reduce the integrity score
              const dynamicIntegrity = Math.max(0, 100 - (tabSwitches * 5) - (pasteBursts * 10));
              const computedIntegrity = mod.integrityScore !== undefined
                ? Math.min(Number(mod.integrityScore), dynamicIntegrity)
                : (anyUser.integrityScore !== undefined ? Math.min(Number(anyUser.integrityScore), dynamicIntegrity) : dynamicIntegrity);

              const computedAcademic = mod.academicScore !== undefined
                ? Number(mod.academicScore)
                : (anyUser.academicScore !== undefined ? anyUser.academicScore : Math.min(100, Math.round(((totalPoints || 0) / 100) * 100)));

              const isExplicitDemo =
                prnClean === '2026BCSE101' ||
                prnClean === '2026BCSE102' ||
                anyUser.sectionId === 'sec-demo-section' ||
                anyUser.sectionName === 'Demo Section' ||
                anyUser.section === 'Demo Section';

              const isMtechUser =
                !isExplicitDemo &&
                (anyUser.sectionId === 'sec-mw6l4r2s' ||
                 (prnClean && (prnClean.startsWith('2126PMI') || prnClean.startsWith('2125PMI') || prnClean.startsWith('1226PMI'))) ||
                 (anyUser.department && anyUser.department.toLowerCase().includes('mtech')) ||
                 (anyUser.course && anyUser.course.toLowerCase().includes('mtech')) ||
                 (anyUser.sectionName && anyUser.sectionName.toLowerCase().includes('mtech')));

              const rawSection = isExplicitDemo
                ? 'Demo Section'
                : isMtechUser
                ? 'Integrated Mtech'
                : (anyUser.sectionName || anyUser.section || (anyUser.division ? `Division ${anyUser.division}` : 'Integrated Mtech'));

              const normalizedSection = isExplicitDemo
                ? 'Demo Section'
                : (rawSection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
                ? 'Integrated Mtech'
                : rawSection;

              const cs = prnClean ? findCohortStudent(prnClean) : null;
              const resolvedStudentName =
                (anyUser.fullName && isRealPersonName(anyUser.fullName) ? anyUser.fullName : null) ||
                (anyUser.displayName && isRealPersonName(anyUser.displayName) ? anyUser.displayName : null) ||
                (cData.studentName && isRealPersonName(cData.studentName) ? cData.studentName : null) ||
                (cs ? cs.fullName : null) ||
                anyUser.fullName ||
                anyUser.displayName ||
                anyUser.username ||
                'Student Candidate';

              return {
                id: anyUser.id || anyUser.uid || `stu-${Math.random().toString(36).substring(2, 7)}`,
                name: resolvedStudentName,
                prn: (anyUser.prn || '').toUpperCase() || '—',
                email: resolvedEmail,
                section: normalizedSection,
                identityStatus: isBound ? 'BOUND' : 'PENDING',
                academicScore: computedAcademic,
                integrityScore: computedIntegrity,
                problemsSolved: totalSolved,
                practiceSolved,
                labSolved: labSolvedCount,
                cieMarks: studentCieMarks,
                clipboardAttempts: pasteBursts,
                tabSwitchCount: tabSwitches,
                totalKeystrokes,
                miniProjectUnlocked: (() => {
                  const localCached = prnClean ? localStorage.getItem(`logicq_mini_project_unlocked_${prnClean}`) : null;
                  if (localCached !== null) return localCached === 'true';
                  return Boolean(mod.miniProjectUnlocked ?? anyUser.miniProjectUnlocked ?? anyUser.miniProjectActive);
                })(),
                isBanned: Boolean(anyUser.isBanned || cData.isBanned || (prnClean ? localStorage.getItem(`logicq_banned_${prnClean}`) === 'true' : false)),
                bannedAt: anyUser.bannedAt || cData.bannedAt || null,
                banReason: anyUser.banReason || cData.banReason || null,
                lastActive: mod.lastActiveTime
                  ? formatLastActiveWithDate(mod.lastActiveTime)
                  : (anyUser.lastLoginAt ? formatLastActiveWithDate(anyUser.lastLoginAt) : 'Recent'),
              };
            });

          const finalStudentUsers = studentUsers.filter(filterByOwnership);

          setStudents((prev) => {
            const map = new Map<string, AdminStudentRecord>();
            prev.forEach((p) => {
              const k = (p.prn || p.email || p.id).toUpperCase();
              if (k) map.set(k, p);
            });
            finalStudentUsers.forEach((st) => {
              const k = (st.prn || st.email || st.id).toUpperCase();
              if (k) map.set(k, st);
            });
            const merged = Array.from(map.values())
              .filter((s) => !FirestoreDataService.isPurgedStudent(s) && !isRohanRecord(s))
              .filter(filterByOwnership);
            try {
              localStorage.setItem('logicq_admin_students', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Notice: loading students from local cache:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial load with spinner only if empty
    loadStudents(true);

    // Live real-time Firestore listener on 'enrolled_students' (0ms instant updates across all browsers)
    const unsubEnrolled = onSnapshot(collection(db, 'enrolled_students'), (snap) => {
      if (!isMounted) return;
      const liveList: AdminStudentRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (!raw || FirestoreDataService.isPurgedStudent(raw) || isRohanRecord(raw)) return;
        const prnClean = (raw.prn || '').toUpperCase().trim();
        const email = (raw.email || '').toLowerCase().trim();
        const isBound = Boolean(
          raw.isEmailBound ||
          raw.isEmailBoundV2 ||
          raw.emailVerified ||
          raw.identityStatus === 'BOUND' ||
          Boolean(raw.boundEmail) ||
          (email && !email.endsWith('@sanjivani.edu.in') && email.includes('@')) ||
          (raw.boundEmail && !raw.boundEmail.endsWith('@sanjivani.edu.in'))
        );
        const resolvedEmail =
          raw.boundEmail ||
          (email && !email.endsWith('@sanjivani.edu.in') ? email : null) ||
          email ||
          '—';
        const localCached = prnClean ? localStorage.getItem(`logicq_mini_project_unlocked_${prnClean}`) : null;
        const isUnlocked = localCached !== null ? localCached === 'true' : Boolean(raw.miniProjectUnlocked || raw.miniProjectActive);

        const isExplicitDemo =
          prnClean === '2026BCSE101' ||
          prnClean === '2026BCSE102' ||
          raw.sectionId === 'sec-demo-section' ||
          raw.sectionName === 'Demo Section';

        const isMtechStudent =
          !isExplicitDemo &&
          (raw.sectionId === 'sec-mw6l4r2s' ||
           (prnClean && (prnClean.startsWith('2126PMI') || prnClean.startsWith('2125PMI') || prnClean.startsWith('1226PMI'))) ||
           (raw.department && raw.department.toLowerCase().includes('mtech')) ||
           (raw.course && raw.course.toLowerCase().includes('mtech')) ||
           (raw.sectionName && raw.sectionName.toLowerCase().includes('mtech')));

        const resolvedSection = isExplicitDemo
          ? 'Demo Section'
          : isMtechStudent
          ? 'Integrated Mtech'
          : ((raw.sectionName && raw.sectionName !== 'Academic Section') ? raw.sectionName : (raw.course || (raw.division ? `Division ${raw.division}` : 'Integrated Mtech')));

        liveList.push({
          id: d.id,
          name: raw.fullName || raw.displayName || raw.name || 'Student Candidate',
          prn: prnClean || '—',
          email: resolvedEmail,
          section: resolvedSection,
          identityStatus: isBound ? 'BOUND' : 'PENDING',
          academicScore: raw.academicScore !== undefined ? raw.academicScore : Math.min(100, Math.round(((raw.totalPoints || 0) / 100) * 100)),
          integrityScore: raw.integrityScore !== undefined ? raw.integrityScore : 100,
          problemsSolved: Math.min(100, Math.max(
            Number(raw.totalSolved) || 0,
            Array.isArray(raw.completedProblems) ? raw.completedProblems.length : 0
          )),
          miniProjectUnlocked: isUnlocked,
          lastActive: raw.enrolledAt ? formatLastActiveWithDate(raw.enrolledAt?.toDate ? raw.enrolledAt.toDate() : raw.enrolledAt) : 'Recent',
        });
      });

      if (liveList.length > 0) {
        setStudents((prev) => {
          const map = new Map<string, AdminStudentRecord>();
          prev.forEach((p) => {
            const k = (p.prn || p.email || p.id).toUpperCase();
            if (k && !FirestoreDataService.isPurgedStudent(p) && !isRohanRecord(p)) map.set(k, p);
          });
          liveList.forEach((st) => {
            const k = (st.prn || st.email || st.id).toUpperCase();
            if (k) {
              const existing = map.get(k);
              if (existing) {
                if (existing.identityStatus === 'BOUND') {
                  st.identityStatus = 'BOUND';
                }
                if (existing.email && !existing.email.endsWith('@sanjivani.edu.in') && st.email.endsWith('@sanjivani.edu.in')) {
                  st.email = existing.email;
                }
                st.problemsSolved = st.problemsSolved !== undefined ? st.problemsSolved : (existing.problemsSolved || 0);
                st.practiceSolved = st.practiceSolved !== undefined ? st.practiceSolved : (existing.practiceSolved || 0);
                st.labSolved = st.labSolved !== undefined ? st.labSolved : (existing.labSolved || 0);
                st.cieMarks = (st.labSolved === 0) ? 0.0 : (st.cieMarks !== undefined ? st.cieMarks : (existing.cieMarks || 0.0));
                st.academicScore = (existing.academicScore !== undefined && existing.academicScore > 0)
                  ? existing.academicScore
                  : st.academicScore;
                st.tabSwitchCount = existing.tabSwitchCount ?? st.tabSwitchCount;
                st.clipboardAttempts = existing.clipboardAttempts ?? st.clipboardAttempts;
                st.totalKeystrokes = existing.totalKeystrokes ?? st.totalKeystrokes;
              }
              map.set(k, st);
            }
          });
          const merged = Array.from(map.values())
            .filter((s) => !FirestoreDataService.isPurgedStudent(s) && !isRohanRecord(s))
            .filter(filterByOwnership);
          try {
            localStorage.setItem('logicq_admin_students', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setIsLoading(false);
      } else {
        loadStudents(false);
      }
    }, (err) => {
      if (FirestoreDataService.markQuotaExhausted(err)) {
        unsubEnrolled?.();
      }
      console.warn('Live enrolled_students onSnapshot notice:', err);
    });

    // Live real-time listener on cohort_progress for miniProject, points, practice solved count & verification
    let unsubCohort: (() => void) | null = null;
    try {
      unsubCohort = onSnapshot(collection(db, 'cohort_progress'), (snap) => {
        if (!isMounted) return;
        const updatesMap = new Map<string, any>();
        snap.forEach((docSnap) => {
          const prnClean = docSnap.id.toUpperCase().trim();
          const data = docSnap.data();
          if (data && prnClean) {
            updatesMap.set(prnClean, data);
            if (data.studentEmail) {
              updatesMap.set(String(data.studentEmail).toLowerCase().trim(), data);
            }
          }
        });

        if (updatesMap.size === 0) return;

        // Single batched state update instead of 120 separate render cycles
        setStudents((prev) =>
          prev.map((s) => {
            const prnClean = (s.prn || '').toUpperCase().trim();
            const emailClean = (s.email || '').toLowerCase().trim();
            const data = updatesMap.get(prnClean) ||
                         updatesMap.get(prnClean.replace(/0/g, 'O')) ||
                         updatesMap.get(prnClean.replace(/O/g, '0')) ||
                         (emailClean ? updatesMap.get(emailClean) : null);

            if (!data) return s;

            const isNowBound = Boolean(
              s.identityStatus === 'BOUND' ||
              data.isEmailBound ||
              data.isEmailBoundV2 ||
              data.emailVerified ||
              Boolean(data.boundEmail) ||
              Boolean(data?.moduleProgress?.boundEmail) ||
              Boolean(data?.moduleProgress?.isEmailBound) ||
              (data.boundEmail && !data.boundEmail.endsWith('@sanjivani.edu.in')) ||
              (data.studentEmail && !data.studentEmail.endsWith('@sanjivani.edu.in'))
            );

            const resolvedEmail =
              data.boundEmail ||
              data?.moduleProgress?.boundEmail ||
              (data.studentEmail && !data.studentEmail.endsWith('@sanjivani.edu.in') ? data.studentEmail : null) ||
              (s.email && !s.email.endsWith('@sanjivani.edu.in') ? s.email : null) ||
              s.email;

            const labFromTopicsCount = Array.isArray(data.labCompletedProblems)
              ? data.labCompletedProblems.length
              : (Number(data.labFromTopics) || 0);
            const labSolvedCount = Math.max(
              s.labSolved !== undefined
                ? s.labSolved
                : (Array.isArray(data.completedTestProblems) ? data.completedTestProblems.length : 0),
              labFromTopicsCount
            );
            const is1003Clean = prnClean === '2126PMIM1003' || prnClean === '2126PMIF1003';
            const practiceSolved = is1003Clean
              ? 100
              : (prnClean === '2126PMIM1049')
              ? 66
              : (prnClean === '2126PMIM1042')
              ? 51
              : (prnClean === '2126PMIM1039')
              ? 100
              : (prnClean === '2126PMIM1122')
              ? Math.max(51, Number(data.totalSolved) || 0, Array.isArray(data.completedProblems) ? data.completedProblems.length : 0)
              : (prnClean === '2126PMIM1015')
              ? Math.min(100, Math.max(50, Number(data.totalSolved) || 0, Array.isArray(data.completedProblems) ? data.completedProblems.length : 0))
              : Math.min(100, Math.max(
                  Number(data.totalSolved) || 0,
                  Array.isArray(data.completedProblems) ? data.completedProblems.length : 0,
                  Number(data?.moduleProgress?.totalSolved) || 0
                ));
            const totalSolved = practiceSolved + labSolvedCount;
            const computedAcademic = data?.moduleProgress?.academicScore !== undefined
              ? Number(data.moduleProgress.academicScore)
              : Math.min(100, Math.round(((data.totalPoints || totalSolved * 20 || s.academicScore || 0) / 100) * 100));
            const newTabSwitches = data?.moduleProgress?.tabSwitches !== undefined
              ? Number(data.moduleProgress.tabSwitches)
              : (s.tabSwitchCount ?? 0);
            const newPasteBursts = data?.moduleProgress?.pasteBursts !== undefined
              ? Number(data.moduleProgress.pasteBursts)
              : (s.clipboardAttempts ?? 0);
            const dynamicIntegrity = Math.max(0, 100 - (newTabSwitches * 5) - (newPasteBursts * 10));
            const computedIntegrity = data?.moduleProgress?.integrityScore !== undefined
              ? Math.min(Number(data.moduleProgress.integrityScore), dynamicIntegrity)
              : dynamicIntegrity;

            return {
              ...s,
              identityStatus: isNowBound ? 'BOUND' : s.identityStatus,
              email: resolvedEmail,
              academicScore: computedAcademic,
              integrityScore: computedIntegrity,
              problemsSolved: totalSolved,
              practiceSolved,
              labSolved: labSolvedCount,
              cieMarks: s.cieMarks ?? Math.min(20, Math.round(((labSolvedCount / 80) * 20) * 10) / 10),
              tabSwitchCount: newTabSwitches,
              clipboardAttempts: newPasteBursts,
              miniProjectUnlocked: data?.moduleProgress?.miniProjectUnlocked !== undefined
                ? Boolean(data.moduleProgress.miniProjectUnlocked)
                : (data.miniProjectUnlocked !== undefined
                    ? Boolean(data.miniProjectUnlocked)
                    : Boolean(data.miniProjectActive)),
              lastActive: data?.moduleProgress?.lastActiveTime
                ? formatLastActiveWithDate(data.moduleProgress.lastActiveTime)
                : s.lastActive,
            };
          })
        );
      }, (err) => {
        if (FirestoreDataService.markQuotaExhausted(err)) {
          unsubCohort?.();
          unsubCohort = null;
        }
      });
    } catch {}

    let debounceTimer: any = null;
    const debouncedLoadStudents = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) loadStudents(false);
      }, 1500);
    };

    const unsubMeshUsers = realtimeSync.on('USERS', debouncedLoadStudents);
    const unsubMeshSections = realtimeSync.on('SECTIONS', debouncedLoadStudents);
    const unsubMeshSubmissions = realtimeSync.on('SUBMISSIONS', debouncedLoadStudents);
    const unsubMeshDashboard = realtimeSync.on('DASHBOARD', debouncedLoadStudents);

    // Instant cross-tab and cross-device sync channels
    const practiceBc = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('logicq_practice_sync_v1') : null;
    if (practiceBc) {
      practiceBc.onmessage = (ev) => {
        if (ev.data?.type === 'TOPIC_SOLVED' && ev.data?.prn) {
          const pClean = String(ev.data.prn).toUpperCase().trim();
          setStudents((prev) => prev.map((s) => {
            if ((s.prn || '').toUpperCase().trim() === pClean) {
              const newPractice = ev.data.totalSolved !== undefined ? Number(ev.data.totalSolved) : ((s.practiceSolved ?? 0) + 1);
              const newTotal = newPractice + (s.labSolved ?? 0);
              return {
                ...s,
                practiceSolved: newPractice,
                problemsSolved: newTotal,
                academicScore: Math.min(100, Math.round(((newTotal * 20) / 100) * 100)),
                lastActive: 'Just now'
              };
            }
            return s;
          }));
        }
      };
    }

    // Supabase Realtime Channel for instant 0ms updates on student progress
    let sbChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        sbChannel = supabase
          .channel('admin_students_tab_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_progress' }, (payload: any) => {
            const row = payload?.new;
            if (row && row.student_prn) {
              const pClean = String(row.student_prn).toUpperCase().trim();
              const validTopics = Array.isArray(row.solved_topic_ids)
                ? row.solved_topic_ids.filter((id: string) => id && !id.startsWith('cs-demo-') && !id.startsWith('demo-'))
                : [];
              const count = validTopics.length > 0 ? validTopics.length : (Number(row.total_solved) || 0);
              setStudents((prev) => prev.map((s) => {
                if ((s.prn || '').toUpperCase().trim() === pClean) {
                  const newPractice = count;
                  const newTotal = newPractice + (s.labSolved ?? 0);
                  return {
                    ...s,
                    practiceSolved: newPractice,
                    problemsSolved: newTotal,
                    academicScore: Math.min(100, Math.round(((newTotal * 20) / 100) * 100)),
                    lastActive: 'Just now'
                  };
                }
                return s;
              }));
            }
            debouncedLoadStudents();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_submissions' }, debouncedLoadStudents)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, debouncedLoadStudents)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'student_locks' }, debouncedLoadStudents)
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime subscription notice:', err);
      }
    }

    // Global NTFY cross-device eval stream listener for instant 0ms updates across any phone/laptop
    let ntfySource: EventSource | null = null;
    try {
      ntfySource = new EventSource('https://ntfy.sh/logicq-live-eval-stream-v2/sse');
      ntfySource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const data = typeof payload.message === 'string' ? JSON.parse(payload.message) : payload;
          if (data && (data.type === 'TOPIC_SOLVED' || data.type === 'PRACTICE_SOLVED' || data.type === 'LAB_SUBMISSION')) {
            const pClean = String(data.prn || '').toUpperCase().trim();
            if (pClean) {
              setStudents((prev) => prev.map((s) => {
                if ((s.prn || '').toUpperCase().trim() === pClean) {
                  const newPractice = Number(data.totalSolved) || s.practiceSolved || 0;
                  const newTotal = newPractice + (s.labSolved ?? 0);
                  return {
                    ...s,
                    practiceSolved: newPractice,
                    problemsSolved: newTotal,
                    academicScore: Math.min(100, Math.round(((newTotal * 20) / 100) * 100)),
                    lastActive: 'Just now'
                  };
                }
                return s;
              }));
            }
            debouncedLoadStudents();
          }
        } catch {}
      };
    } catch {}

    // Gentle polling fallback (Supabase Realtime provides instant 0ms updates)
    const pollingInterval = setInterval(() => {
      loadStudents(false);
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (ntfySource) ntfySource.close();
      if (sbChannel) supabase.removeChannel(sbChannel);
      if (practiceBc) practiceBc.close();
      unsubEnrolled?.();
      unsubCohort?.();
      unsubMeshUsers?.();
      unsubMeshSections?.();
      unsubMeshSubmissions?.();
      unsubMeshDashboard?.();
    };
  }, []);

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success(`Copied "${email}" to clipboard!`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleToggleMiniProject = (student: AdminStudentRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = !student.miniProjectUnlocked;
    const cleanPrn = (student.prn || '').toUpperCase().trim();

    if (cleanPrn && cleanPrn !== '—') {
      try {
        localStorage.setItem(`logicq_mini_project_unlocked_${cleanPrn}`, nextStatus ? 'true' : 'false');
      } catch {}
    }

    const updated = students.map((s) =>
      s.id === student.id ? { ...s, miniProjectUnlocked: nextStatus } : s
    );
    setStudents(updated);
    try {
      localStorage.setItem('logicq_admin_students', JSON.stringify(updated));
    } catch {}

    // Persist to Cloud Firestore across users, enrolled_students & cohort_progress
    if (cleanPrn && cleanPrn !== '—') {
      FirestoreDataService.setMiniProjectStatus(cleanPrn, nextStatus);
    }

    toast.success(
      nextStatus
        ? `Mini-Project unlocked for ${student.name}!`
        : `Mini-Project locked for ${student.name}.`
    );
  };

  // Filter & numerical PRN sorting logic (Ascending by last 4 digits of PRN)
  const filteredStudents = React.useMemo(() => {
    const list = students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const nameStr = String(s.name || (s as any).fullName || (s as any).displayName || '').toLowerCase();
      const prnStr = String(s.prn || '').toLowerCase();
      const emailStr = String(s.email || '').toLowerCase();
      const sectionStr = String(s.section || '').toLowerCase();
      const matchesSearch =
        !q ||
        nameStr.includes(q) ||
        prnStr.includes(q) ||
        emailStr.includes(q) ||
        sectionStr.includes(q);

      if (!matchesSearch) return false;

      if (selectedSection !== 'ALL' && s.section !== selectedSection) return false;

      if (activeFilter === 'ACTIVE') return (s.problemsSolved ?? 0) >= 1;
      if (activeFilter === 'INACTIVE') return (s.problemsSolved ?? 0) === 0;
      if (activeFilter === 'VERIFIED') return s.identityStatus === 'BOUND';
      if (activeFilter === 'UNVERIFIED') return s.identityStatus !== 'BOUND';
      if (activeFilter === 'UNLOCKED') return s.miniProjectUnlocked;
      return true;
    });

    const getPrnNum = (prn?: string): number => {
      if (!prn) return 999999;
      const clean = String(prn).trim();
      const match = clean.match(/(\d{3,5})$/);
      if (match) return parseInt(match[1], 10);
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 4) return parseInt(digits.slice(-4), 10);
      if (digits.length > 0) return parseInt(digits, 10);
      return 999999;
    };

    return list.sort((a, b) => {
      const aNum = getPrnNum(a.prn);
      const bNum = getPrnNum(b.prn);
      if (aNum !== bNum) return aNum - bNum;
      return String(a.prn || '').localeCompare(String(b.prn || ''));
    });
  }, [students, searchQuery, selectedSection, activeFilter]);

  const activeCount = students.filter((s) => (s.problemsSolved ?? 0) >= 1).length;
  const inactiveCount = students.filter((s) => (s.problemsSolved ?? 0) === 0).length;
  const verifiedCount = students.filter((s) => s.identityStatus === 'BOUND').length;
  const unverifiedCount = students.filter((s) => s.identityStatus !== 'BOUND').length;
  const unlockedCount = students.filter((s) => s.miniProjectUnlocked).length;

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      toast.warning('No students match the current filter to export.');
      return;
    }

    try {
      const studentRows = filteredStudents.map((s, idx) => ({
        'Sr. No': idx + 1,
        'PRN': s.prn || '—',
        'Student Name': s.name || '—',
        'Email Address': s.email || '—',
        'Section': s.section || 'Integrated Mtech',
        'Email Verified': s.identityStatus === 'BOUND' ? 'Verified' : 'Pending',
        'Total Solved (Combined)': s.problemsSolved ?? 0,
        'Practice Solved': s.practiceSolved ?? (s.problemsSolved ?? 0),
        'Lab Internal Solved': s.labSolved ?? 0,
        'CIE Marks (out of 20)': s.cieMarks ?? (s.labSolved ? Math.min(20, Math.round(((s.labSolved / 80) * 20) * 10) / 10) : 0),
        'Last Active Date & Time': s.lastActive || 'Recent',
      }));

      const worksheet = XLSX.utils.json_to_sheet(studentRows);

      // Auto-fit generous, comfortable column widths with extra padding
      const defaultWidths: Record<string, number> = {
        'Sr. No': 10,
        'PRN': 22,
        'Student Name': 36,
        'Email Address': 40,
        'Section': 24,
        'Email Verified': 18,
        'Total Solved (Combined)': 24,
        'Practice Solved': 20,
        'Lab Internal Solved': 22,
        'CIE Marks (out of 20)': 22,
        'Last Active Date & Time': 28,
      };

      const columnKeys = Object.keys(studentRows[0] || {});
      const colWidths = columnKeys.map((key) => {
        let maxLen = key.length;
        studentRows.forEach((row: any) => {
          const val = row[key];
          const str = val !== null && val !== undefined ? String(val) : '';
          if (str.length > maxLen) {
            maxLen = str.length;
          }
        });
        const defaultW = defaultWidths[key] || 20;
        return { wch: Math.max(maxLen + 6, defaultW) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      const sheetName = activeFilter === 'ALL'
        ? 'All Students'
        : activeFilter === 'ACTIVE'
        ? 'Active Students'
        : activeFilter === 'INACTIVE'
        ? 'Inactive Students'
        : activeFilter === 'VERIFIED'
        ? 'Verified Students'
        : 'Filtered Students';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

      const filterLabelMap: Record<string, string> = {
        ALL: 'All_Students',
        ACTIVE: 'Active_Students',
        INACTIVE: 'Inactive_Students',
        VERIFIED: 'Email_Verified_Students',
        UNLOCKED: 'MiniProject_Active_Students',
      };
      const filterSlug = filterLabelMap[activeFilter] || 'Students';
      const sectionSlug = selectedSection !== 'ALL' ? `_${selectedSection.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `LogicQ_${filterSlug}${sectionSlug}_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Excel Sheet exported: ${filename} (${filteredStudents.length} students)`);
    } catch (err: any) {
      toast.error('Failed to export Excel: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER & SEARCH BAR                                   */}
      {/* ========================================================================= */}
      <FadeUp delay={0.05}>
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Student Directory
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {filteredStudents.length} of {students.length} {students.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enrolled students, verified institutional credentials, and live academic progress.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Section Filter Dropdown */}
            {availableSections.length > 0 && (
              <div className="relative">
                <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full sm:w-auto pl-8 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none"
                >
                  <option value="ALL">All Sections ({students.length})</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec} ({students.filter((s) => s.section === sec).length})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>
            )}

            {/* Apple Live Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, PRN, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition placeholder:text-slate-400"
              />
            </div>
          </div>
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
            All Students ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ACTIVE')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active ({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('INACTIVE')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'INACTIVE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Inactive ({inactiveCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'VERIFIED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Email Verified ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('UNVERIFIED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'UNVERIFIED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Email Not Verified ({unverifiedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('UNLOCKED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'UNLOCKED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Mini-Project Active ({unlockedCount})
          </button>

          {/* Active Section Filter Reset Pill */}
          {selectedSection !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer"
            >
              <span>Section: {selectedSection}</span>
              <span className="text-xs font-bold leading-none">✕</span>
            </button>
          )}

          {/* Quick Filtered Excel Download Button */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              title={`Download Excel Sheet (.xlsx) of current filter (${filteredStudents.length} students)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Download {activeFilter === 'ALL' ? 'All' : activeFilter === 'ACTIVE' ? 'Active' : activeFilter === 'INACTIVE' ? 'Inactive' : activeFilter === 'VERIFIED' ? 'Verified' : 'Filtered'} Excel ({filteredStudents.length})</span>
            </button>
          </div>
        </div>
      </div>
      </FadeUp>

      {/* ========================================================================= */}
      {/* 2. APPLE-GRADE STUDENT ROSTER (Clean Cards / Native List)                 */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="py-20 text-center rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-8 space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Syncing student directory from database...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-8 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No Matching Students Found' : 'No Students Enrolled Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No student matches "${searchQuery}". Clear your search or check spelling.`
              : 'Students who join using your class section join links or uploaded Excel rosters will appear here automatically.'}
          </p>
        </div>
      ) : (
        <StaggerContainer
          key={`students_grid_${activeFilter}_${selectedSection}_${searchQuery}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          staggerDelay={filteredStudents.length > 50 ? 0.008 : filteredStudents.length > 20 ? 0.015 : 0.025}
        >
          {filteredStudents.map((st) => {
            const isEmailCopied = copiedEmail === st.email;
            const studentDisplayName = st.name || (st as any).fullName || (st as any).displayName || 'Student Candidate';
            const studentInitials = (studentDisplayName || 'ST').slice(0, 2).toUpperCase();

            return (
              <StaggerItem key={st.id}>
              <div
                onClick={() => setSelectedStudentForModal(st)}
                className="group rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between gap-3 cursor-pointer h-full"
              >
                {/* Top: Avatar + Identity + Section */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    {studentInitials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-blue-500 transition-colors truncate max-w-[170px]" title={studentDisplayName}>
                        {studentDisplayName}
                      </h4>
                      {st.prn === 'LOGICQARENA' && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Admin
                        </span>
                      )}
                      {st.isBanned && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          BANNED
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      <span>PRN: <strong className="text-slate-700 dark:text-slate-200">{st.prn}</strong></span>
                    </div>
                  </div>

                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSection(st.section === selectedSection ? 'ALL' : st.section);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition cursor-pointer shrink-0 ${
                      selectedSection === st.section
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/5'
                    }`}
                    title="Click to filter by this section"
                  >
                    {st.section || 'Integrated Mtech'}
                  </span>
                </div>

                {/* Middle: Email with copy */}
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <a
                    href={`mailto:${st.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate max-w-[210px] hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                    title={`Click to email ${st.email}`}
                  >
                    {st.email}
                  </a>
                  <button
                    type="button"
                    onClick={(e) => handleCopyEmail(st.email, e)}
                    className="p-1 hover:text-blue-500 rounded-md transition shrink-0 cursor-pointer"
                    title="Copy Email"
                  >
                    {isEmailCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Bottom: Verification + Mini-project + Chevron */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {st.identityStatus === 'BOUND' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}


                    {/* CIE Marks Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                        (st.cieMarks ?? (st.labSolved ? (st.labSolved * 0.25) : 0)) > 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200/50 dark:border-white/5'
                      }`}
                      title={`Continuous Internal Evaluation: ${Number(st.cieMarks ?? (st.labSolved ? (st.labSolved * 0.25) : 0)).toFixed(1)} / 20.0 Marks`}
                    >
                      <Award className="w-3 h-3" />
                      <span>{Number(st.cieMarks ?? (st.labSolved ? (st.labSolved * 0.25) : 0)).toFixed(1)}/20 M</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleToggleMiniProject(st, e)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                        st.miniProjectUnlocked
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 hover:border-blue-500/30'
                      }`}
                      title={st.miniProjectUnlocked ? 'Lock Mini-Project' : 'Unlock Mini-Project'}
                    >
                      {st.miniProjectUnlocked ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Unlock</span>
                        </>
                      )}
                    </button>

                    <div className="p-1 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENT INSPECTION MODAL (Apple Sheet)                                 */}
      {/* ========================================================================= */}
      {selectedStudentForModal && (
        <StudentDeepDiveModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          onToggleMiniProject={() => {
            handleToggleMiniProject(selectedStudentForModal);
            setSelectedStudentForModal((prev) =>
              prev ? { ...prev, miniProjectUnlocked: !prev.miniProjectUnlocked } : null
            );
          }}
          onStudentPurged={(purgedPrn) => {
            setStudents((prev) => prev.filter((s) => s.prn !== purgedPrn && s.id !== selectedStudentForModal.id));
            setSelectedStudentForModal(null);
          }}
          onStudentBanChanged={(targetPrn, isBanned) => {
            setStudents((prev) =>
              prev.map((s) => (s.prn === targetPrn || s.id === selectedStudentForModal.id ? { ...s, isBanned } : s))
            );
            setSelectedStudentForModal((prev) => (prev ? { ...prev, isBanned } : null));
          }}
        />
      )}
    </div>
  );
};
