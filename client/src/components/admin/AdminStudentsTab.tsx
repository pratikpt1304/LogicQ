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
} from 'lucide-react';
import { StudentDeepDiveModal } from './StudentDeepDiveModal.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import { FadeUp, StaggerContainer, StaggerItem } from '../common/ScrollAnimations.js';
import { findCohortStudent } from '../../data/c-programming-cohort.data.js';
import { isRealPersonName } from '../../config/academic.config.js';

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
  clipboardAttempts?: number;
  tabSwitchCount?: number;
  totalKeystrokes?: number;
  isBanned?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
}

export const AdminStudentsTab: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'UNLOCKED'>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<AdminStudentRecord | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Available unique sections for filtering
  const availableSections = React.useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.section && s.section !== '—' && s.section !== 'General') {
        set.add(s.section);
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // Fetch real students from Firestore and local storage cache
  useEffect(() => {
    let isMounted = true;

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
                .map((s: any) => {
                  const prnC = (s.prn || '').toUpperCase().trim();
                  const cs = prnC ? findCohortStudent(prnC) : null;
                  const validName = (s.name && isRealPersonName(s.name) ? s.name : null) ||
                                    (cs ? cs.fullName : null) ||
                                    s.name || s.fullName || s.displayName || 'Student Candidate';
                  return {
                    ...s,
                    name: validName,
                    section: (s.section === 'C Programming' || !s.section || s.section.toLowerCase().includes('mtech')) ? 'Integrated Mtech' : s.section
                  };
                });
              setStudents(cleaned);
            }
          }
        } catch {}

        // 2. Fetch authoritative Firestore users alongside cohort_progress & submissions
        const [users, cohortSnap, assessSnap, subSnap] = await Promise.all([
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
          getDocs(collection(db, 'assessment_test_submissions')).catch(() => null),
          getDocs(collection(db, 'submissions')).catch(() => null),
        ]);

        const cohortMap = new Map<string, any>();
        if (cohortSnap) {
          cohortSnap.forEach((d: any) => cohortMap.set(d.id.toUpperCase().trim(), d.data()));
        }

        const assessSubs: any[] = [];
        if (assessSnap) {
          assessSnap.forEach((d: any) => assessSubs.push(d.data()));
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

              const isBound = Boolean(
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
                cData.boundEmail ||
                mod.boundEmail ||
                anyUser.boundEmail ||
                (cData.studentEmail && !cData.studentEmail.endsWith('@sanjivani.edu.in') ? cData.studentEmail : null) ||
                (anyUser.email && !anyUser.email.endsWith('@sanjivani.edu.in') ? anyUser.email : null) ||
                anyUser.email ||
                (prnClean ? `${prnClean.toLowerCase()}@sanjivani.edu.in` : '—');

              // Match student's submissions across tests and practice
              const matchedSubs = [...assessSubs, ...genSubs].filter((s: any) => {
                const sPrn = s.studentPrn || s.prn || '';
                const sEmail = (s.studentEmail || s.email || '').toLowerCase().trim();
                const sUid = (s.userId || s.studentId || '').trim();
                return (prnClean && FirestoreDataService.arePrnsMatching(sPrn, prnClean)) ||
                       (userEmail && sEmail && sEmail === userEmail) ||
                       (userId && sUid && sUid === userId);
              });

              const uniqueProblems = new Set<string>();
              matchedSubs.forEach((s: any) => {
                if (s.verdict === 'ACCEPTED' || s.status === 'PASSED' || s.academicScore > 0 || (s.testOutcomes && s.testOutcomes.some((t: any) => t.passed))) {
                  uniqueProblems.add(s.problemId || s.problemTitle || s.problemSlug || s.title || s.id);
                }
              });
              if (Array.isArray(cData.completedProblems)) {
                cData.completedProblems.forEach((p: string) => uniqueProblems.add(p));
              }

              const totalSolved = Math.max(
                uniqueProblems.size,
                cData.totalSolved ?? 0,
                anyUser.totalSolved ?? 0
              );

              const pointsFromSubs = Math.round(
                matchedSubs.reduce((acc: number, s: any) => acc + (Number(s.academicScore) || Number(s.score) || Number(s.points) || 0), 0)
              );

              const totalPoints = Math.max(
                pointsFromSubs,
                cData.totalPoints ?? 0,
                anyUser.totalPoints ?? 0,
                totalSolved * 20
              );

              const tabSwitches = Math.max(
                Number(mod.tabSwitches) || 0,
                Number(anyUser.tabSwitchCount) || 0,
                Number(anyUser.tabSwitches) || 0,
                ...matchedSubs.map((s: any) => Number(s.tabSwitchCount) || 0)
              );

              const pasteBursts = Math.max(
                Number(mod.pasteBursts) || 0,
                Number(anyUser.clipboardAttempts) || 0,
                Number(anyUser.pasteBursts) || 0,
                ...matchedSubs.map((s: any) => Number(s.copyPasteAttempts) || 0)
              );

              const totalKeystrokes = Math.max(
                Number(mod.totalKeystrokes) || 0,
                Number(anyUser.totalKeystrokes) || 0,
                ...matchedSubs.map((s: any) => Number(s.totalKeystrokes) || 0)
              );

              // ⚠️ SACRED RULE: Integrity ONLY from Lab Internal — NEVER from Practice tabSwitches
              // Always use stored integrityScore from Firestore; fallback = 100 (not recomputed)
              const computedIntegrity = mod.integrityScore !== undefined
                ? Number(mod.integrityScore)
                : (anyUser.integrityScore !== undefined ? Number(anyUser.integrityScore) : 100);

              const computedAcademic = mod.academicScore !== undefined
                ? Number(mod.academicScore)
                : (anyUser.academicScore !== undefined ? anyUser.academicScore : Math.min(100, Math.round(((totalPoints || 0) / 100) * 100)));

              const isMtechUser =
                anyUser.sectionId === 'sec-mw6l4r2s' ||
                (anyUser.department && anyUser.department.toLowerCase().includes('mtech')) ||
                (anyUser.course && anyUser.course.toLowerCase().includes('mtech')) ||
                (anyUser.sectionName && anyUser.sectionName.toLowerCase().includes('mtech')) ||
                (prnClean && (prnClean.startsWith('2126PMI') || prnClean.startsWith('2125PMI') || prnClean.startsWith('1226PMI')));

              const rawSection = isMtechUser ? 'Integrated Mtech' : (anyUser.sectionName || anyUser.section || (anyUser.division ? `Division ${anyUser.division}` : 'Integrated Mtech'));
              const normalizedSection = (rawSection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
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
                  ? new Date(mod.lastActiveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : (anyUser.lastLoginAt ? new Date(anyUser.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'),
              };
            });

          setStudents((prev) => {
            const map = new Map<string, AdminStudentRecord>();
            prev.forEach((p) => {
              const k = (p.prn || p.email || p.id).toUpperCase();
              if (k) map.set(k, p);
            });
            studentUsers.forEach((st) => {
              const k = (st.prn || st.email || st.id).toUpperCase();
              if (k) map.set(k, st);
            });
            const merged = Array.from(map.values());
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

        const isMtechStudent =
          raw.sectionId === 'sec-mw6l4r2s' ||
          (raw.department && raw.department.toLowerCase().includes('mtech')) ||
          (raw.course && raw.course.toLowerCase().includes('mtech')) ||
          (raw.sectionName && raw.sectionName.toLowerCase().includes('mtech')) ||
          (prnClean && (prnClean.startsWith('2126PMI') || prnClean.startsWith('2125PMI') || prnClean.startsWith('1226PMI')));

        const resolvedSection = isMtechStudent
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
          problemsSolved: Number(raw.totalSolved) || 0,
          miniProjectUnlocked: isUnlocked,
          lastActive: raw.enrolledAt ? new Date(raw.enrolledAt?.toDate ? raw.enrolledAt.toDate() : raw.enrolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
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
                st.problemsSolved = Math.max(existing.problemsSolved ?? 0, st.problemsSolved ?? 0);
                st.tabSwitchCount = existing.tabSwitchCount ?? st.tabSwitchCount;
                st.clipboardAttempts = existing.clipboardAttempts ?? st.clipboardAttempts;
                st.totalKeystrokes = existing.totalKeystrokes ?? st.totalKeystrokes;
              }
              map.set(k, st);
            }
          });
          const merged = Array.from(map.values());
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
      console.warn('Live enrolled_students onSnapshot notice:', err);
    });

    // Live real-time listener on cohort_progress for miniProject, points & verification
    const unsubCohort = onSnapshot(collection(db, 'cohort_progress'), (snap) => {
      if (!isMounted) return;
      snap.docChanges().forEach((change) => {
        const prnClean = change.doc.id.toUpperCase().trim();
        const data = change.doc.data();
        if (data && prnClean) {
          setStudents((prev) =>
            prev.map((s) => {
              if (FirestoreDataService.arePrnsMatching(s.prn, prnClean) || (data.studentEmail && s.email && s.email.toLowerCase() === String(data.studentEmail).toLowerCase())) {
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

                const totalSolved = data.totalSolved ?? (Array.isArray(data.completedProblems) ? data.completedProblems.length : 0);
                const computedAcademic = data?.moduleProgress?.academicScore !== undefined
                  ? Number(data.moduleProgress.academicScore)
                  : Math.min(100, Math.round(((data.totalPoints || totalSolved * 20 || s.academicScore || 0) / 100) * 100));
                const newTabSwitches = data?.moduleProgress?.tabSwitches !== undefined
                  ? Number(data.moduleProgress.tabSwitches)
                  : (s.tabSwitchCount ?? 0);
                const newPasteBursts = data?.moduleProgress?.pasteBursts !== undefined
                  ? Number(data.moduleProgress.pasteBursts)
                  : (s.clipboardAttempts ?? 0);
                const computedIntegrity = data?.moduleProgress?.integrityScore !== undefined
                  ? Number(data.moduleProgress.integrityScore)
                  : (s.integrityScore ?? 100);

                return {
                  ...s,
                  identityStatus: isNowBound ? 'BOUND' : s.identityStatus,
                  email: resolvedEmail,
                  academicScore: computedAcademic,
                  integrityScore: computedIntegrity,
                  problemsSolved: Math.max(s.problemsSolved ?? 0, totalSolved),
                  tabSwitchCount: newTabSwitches,
                  clipboardAttempts: newPasteBursts,
                  miniProjectUnlocked: data?.moduleProgress?.miniProjectUnlocked !== undefined
                    ? Boolean(data.moduleProgress.miniProjectUnlocked)
                    : (data.miniProjectUnlocked !== undefined
                        ? Boolean(data.miniProjectUnlocked)
                        : Boolean(data.miniProjectActive)),
                  lastActive: data?.moduleProgress?.lastActiveTime
                    ? new Date(data.moduleProgress.lastActiveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : s.lastActive,
                };
              }
              return s;
            })
          );
        }
      });
    }, () => {});

    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), () => {
        loadStudents(false);
      }, () => {});
    } catch {}

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), () => {
      loadStudents(false);
    }, () => {});

    const unsubAssessmentSubmissions = onSnapshot(collection(db, 'assessment_test_submissions'), () => {
      loadStudents(false);
    }, () => {});

    const unsubMeshUsers = realtimeSync.on('USERS', () => loadStudents(false));
    const unsubMeshSections = realtimeSync.on('SECTIONS', () => loadStudents(false));
    const unsubMeshSubmissions = realtimeSync.on('SUBMISSIONS', () => loadStudents(false));
    const unsubMeshDashboard = realtimeSync.on('DASHBOARD', () => loadStudents(false));

    return () => {
      isMounted = false;
      unsubEnrolled();
      unsubCohort();
      unsubSubmissions();
      unsubAssessmentSubmissions();
      if (unsubUsers) unsubUsers();
      unsubMeshUsers();
      unsubMeshSections();
      unsubMeshSubmissions();
      unsubMeshDashboard();
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
  const unlockedCount = students.filter((s) => s.miniProjectUnlocked).length;

  const handleExportCsv = () => {
    if (filteredStudents.length === 0) {
      toast.warning('No students match the current filter to export.');
      return;
    }

    const headers = [
      'PRN',
      'Student Name',
      'Email Address',
      'Section / Department',
      'Activity Status',
      'Email Verification',
      'Problems Solved',
      'Academic Score (%)',
      'Integrity Score (%)',
      'Mini-Project Access',
      'Account Status',
      'Last Active',
    ];

    const rows = filteredStudents.map((s) => {
      const activityStatus = (s.problemsSolved ?? 0) >= 1 ? 'Active' : 'Inactive';
      const emailStatus = s.identityStatus === 'BOUND' ? 'Verified' : 'Pending';
      const miniProject = s.miniProjectUnlocked ? 'Unlocked' : 'Locked';
      const accountStatus = s.isBanned ? 'Banned' : 'Normal';

      return [
        `"${(s.prn || '').replace(/"/g, '""')}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.section || '').replace(/"/g, '""')}"`,
        activityStatus,
        emailStatus,
        String(s.problemsSolved ?? 0),
        String(s.academicScore ?? 0),
        String(s.integrityScore ?? 100),
        miniProject,
        accountStatus,
        `"${(s.lastActive || '—').replace(/"/g, '""')}"`,
      ];
    });

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
    const filename = `LogicQ_${filterSlug}${sectionSlug}_${dateStr}.csv`;

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredStudents.length} students to ${filename}`);
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

            {/* Apple Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed group"
              title={`Export ${filteredStudents.length} students to CSV`}
            >
              <Download className="w-3.5 h-3.5 text-blue-500 group-hover:-translate-y-0.5 transition-transform" />
              <span>Export CSV</span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
                {filteredStudents.length}
              </span>
            </button>
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

          {/* Quick Filtered CSV Download Button */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              title={`Download CSV of current filter (${filteredStudents.length} students)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Download {activeFilter === 'ALL' ? 'All' : activeFilter === 'ACTIVE' ? 'Active' : activeFilter === 'INACTIVE' ? 'Inactive' : activeFilter === 'VERIFIED' ? 'Verified' : 'Filtered'} CSV ({filteredStudents.length})</span>
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
                    {st.section}
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

                    {(st.problemsSolved ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title={`${st.problemsSolved} problems solved`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{st.problemsSolved} Solved</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-400" title="0 problems solved">
                        <span>0 Solved</span>
                      </span>
                    )}
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
