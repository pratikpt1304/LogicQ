import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import {
  LayoutDashboard,
  Layers,
  Users,
  BookOpen,
  Sliders,
  ShieldAlert,
  FileText,
  Sun,
  Moon,
  LogOut,
  Plus,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Archive,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminCommandCenterTab } from '../../components/admin/AdminCommandCenterTab.js';
import { AdminSectionsTab } from '../../components/admin/AdminSectionsTab.js';
import { AdminStudentsTab } from '../../components/admin/AdminStudentsTab.js';
import { AdminQuestionBankTab } from '../../components/admin/AdminQuestionBankTab.js';
import { AdminTestOrchestratorTab } from '../../components/admin/AdminTestOrchestratorTab.js';
import { AdminIntegrityTab } from '../../components/admin/AdminIntegrityTab.js';
import { AdminReportsTab } from '../../components/admin/AdminReportsTab.js';
import { AdminAnswerBankTab } from '../../components/admin/AdminAnswerBankTab.js';
import { AdminRaisedIssuesTab } from '../../components/admin/AdminRaisedIssuesTab.js';
import { IssueSyncService } from '../../services/issueSync.service.js';
// AdminAnswerBankTab kept for legacy reference — Answer Bank is now inside StudentDeepDiveModal
import { StudentDeepDiveModal } from '../../components/admin/StudentDeepDiveModal.js';
import { FacultyPortalPage } from '../faculty/FacultyPortalPage.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { ASSESSMENT_4_TEST } from '../../data/assessment4-questions.data.js';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';

export type AdminTabKey =
  | 'command-center'
  | 'sections'
  | 'students'
  | 'question-bank'
  | 'test-orchestrator'
  | 'integrity'
  | 'reports'
  | 'raised-issues';

interface TabItem {
  id: AdminTabKey;
  label: string;
  badge?: string;
  icon: React.FC<{ className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'command-center', label: 'Overview', icon: LayoutDashboard },
  { id: 'sections', label: 'Sections', icon: Layers },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'question-bank', label: 'Question Bank', icon: BookOpen },
  { id: 'test-orchestrator', label: 'Assessments', icon: Sliders },
  { id: 'integrity', label: 'Integrity & AI Viva', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Accreditation', icon: FileText },
  { id: 'raised-issues', label: 'Student Issues', icon: Flag },
];

const DEFAULT_STATS = {
  activeTests: 0,
  upcomingTests: 0,
  completedTests: 0,
  totalSections: 0,
  totalStudents: 0,
  avgAcademicScore: 0,
  overallIntegrityScore: 100,
  studentsNeedingSupport: 0,
  advancedLearners: 0,
  flaggedSessions: 0,
};

const DEFAULT_SECTIONS: any[] = [];
const DEFAULT_LIVE_EVENTS: any[] = [];

const DEFAULT_ACADEMIC_SECTION = {
  id: 'sec-mw6l4r2s',
  name: 'Integrated Mtech',
  sectionName: 'Integrated Mtech',
  subject: 'C Programming',
  course: 'Integrated Mtech',
  department: 'Integrated Mtech',
  joinCode: 'LQ-INTE34',
  joinToken: 'LQ-INTE34',
  year: 'FY',
  facultyEmail: 'logicqarena@gmail.com',
  studentsCount: 119,
  students: [],
  createdAt: '2026-08-01T00:00:00.000Z',
};

const getInitialStats = () => {
  try {
    const cachedSec = JSON.parse(localStorage.getItem('logicq_admin_sections') || '[]');
    const cachedStu = JSON.parse(localStorage.getItem('logicq_admin_students') || '[]');
    return {
      ...DEFAULT_STATS,
      totalSections: cachedSec.length > 0 ? cachedSec.length : 1,
      totalStudents: cachedStu.length > 0 ? cachedStu.length : 119,
    };
  } catch {
    return { ...DEFAULT_STATS, totalSections: 1, totalStudents: 119 };
  }
};

export const AdminPortalPage: React.FC = () => {
  const { user, isAdmin, isInstitutionalAdmin, isFaculty, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isSuperAdmin = Boolean(
    isAdmin ||
    isInstitutionalAdmin ||
    user?.role === 'ADMIN' ||
    (user?.email || '').toLowerCase().includes('logicq') ||
    (user?.email || '').toLowerCase().includes('admin') ||
    (user?.email || '').toLowerCase().includes('hariprasath') ||
    (user?.fullName || user?.displayName || '').toLowerCase().includes('admin')
  );
  const isDeanOrHod = Boolean(isInstitutionalAdmin);
  const isFacultyUser = Boolean(!isSuperAdmin && !isDeanOrHod && (user?.role === 'FACULTY' || isFaculty));

  const [activeTab, setActiveTab] = useState<AdminTabKey>('command-center');
  const [selectedCandidateForDeepDive, setSelectedCandidateForDeepDive] = useState<any | null>(null);
  const [stats, setStats] = useState(getInitialStats);

  // Sections and students state with strict multi-faculty isolation
  const [sections, setSections] = useState<any[]>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('logicq_admin_sections') || '[]');
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch {}
    return [DEFAULT_ACADEMIC_SECTION];
  });
  const [facultyStudents, setFacultyStudents] = useState<any[]>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('logicq_admin_students') || '[]');
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch {}
    return [];
  });
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);

  // Primary section info for header pill
  const primarySection = sections[0] || null;
  const facultySectionName = primarySection ? primarySection.sectionName : (user?.sectionName || user?.department || 'My Section');
  const facultySectionCode = primarySection ? primarySection.joinCode : (user?.sectionId || 'LQ-CS101');

  // Real-time synchronization & fake cache purge
  React.useEffect(() => {
    try {
      FirestoreDataService.clearStaleSectionTombstones();
      localStorage.removeItem('logicq_master_test_status');
      localStorage.removeItem('logicq_exam_status_v2026');
      localStorage.removeItem('logicq_exam_confirmed_v2026');
      localStorage.removeItem('logicq_present_prns_v2026');
      FirestoreDataService.cleanDeletedTestsCache();
      const delRaw = localStorage.getItem('logicq_deleted_section_ids_v1');
      if (delRaw) {
        const parsed = JSON.parse(delRaw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((k: string) => {
            const up = String(k).toUpperCase();
            return up !== 'LQ-DEMO' && up !== 'SEC-DEMO-SECTION' && up !== 'DEMO SECTION';
          });
          localStorage.setItem('logicq_deleted_section_ids_v1', JSON.stringify(filtered));
        }
      }
    } catch {}

    const loadRealData = async () => {
      try {
        const [realSections, realUsers, sbPracticeRes, cohortSnap, cloudTests] = await Promise.all([
          FirestoreDataService.getSectionsFromFirestore().catch(() => []),
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          isSupabaseConfigured ? supabase.from('practice_progress').select('*') : Promise.resolve({ data: [] } as any),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
          FirestoreDataService.getAssessmentTestsFromFirestore().catch(() => []),
        ]);

        const cohortMap = new Map<string, any>();
        if (sbPracticeRes?.data && Array.isArray(sbPracticeRes.data)) {
          sbPracticeRes.data.forEach((p: any) => {
            const prn = (p.student_prn || '').toUpperCase().trim();
            if (prn) {
              const solved = Array.isArray(p.solved_topic_ids) ? p.solved_topic_ids : [];
              const solvedCount = Number(p.total_solved) || solved.length;
              cohortMap.set(prn, {
                prn,
                totalSolved: solvedCount,
                completedProblems: solved,
                moduleProgress: {
                  totalSolved: solvedCount,
                  lastActiveTime: p.last_solved_at || p.updated_at,
                  academicScore: Math.min(100, solvedCount * 20),
                },
              });
            }
          });
        }
        if (cohortSnap) {
          cohortSnap.forEach((d) => {
            const prn = d.id.toUpperCase().trim();
            const dData = d.data();
            const existing = cohortMap.get(prn);
            if (!existing) {
              cohortMap.set(prn, dData);
            } else {
              const exSolved = Number(existing.totalSolved || 0);
              const dSolved = Number(dData.totalSolved || 0);
              const mergedMod = {
                ...(dData.moduleProgress || {}),
                ...(existing.moduleProgress || {}),
                totalSolved: Math.max(Number(existing.moduleProgress?.totalSolved || 0), Number(dData.moduleProgress?.totalSolved || 0)),
              };
              cohortMap.set(prn, {
                ...existing,
                ...dData,
                totalSolved: Math.max(exSolved, dSolved),
                completedProblems: Array.from(new Set([...(existing.completedProblems || []), ...(dData.completedProblems || [])])),
                moduleProgress: mergedMod,
              });
            }
          });
        }

        const validSections = Array.isArray(realSections) ? realSections : [];

        // STRICT MULTI-FACULTY ISOLATION:
        // A faculty member can ONLY see their assigned or created sections.
        const facultyEmailClean = (user?.email || '').toLowerCase().trim();
        const facultyId = user?.id || (user as any)?.uid || '';
        const userSecId = String(user?.sectionId || '').trim();
        const userSecName = String(user?.sectionName || user?.department || '').toLowerCase().trim();

        const isDemostaff = facultyEmailClean === 'demostaff@gmail.com';

        const isSectionOwnedByFaculty = (sec: any) => {
          const secFacultyEmail = (sec.facultyEmail || sec.createdBy || '').toLowerCase().trim();
          const isDemoSec =
            secFacultyEmail === 'demostaff@gmail.com' ||
            sec.id === 'sec-demo-section' ||
            sec.joinCode === 'LQ-DEMO' ||
            (sec.sectionName || '').toLowerCase().includes('demo');

          // 1. If section is Demo Section, ONLY demostaff@gmail.com can see it
          if (isDemoSec) {
            return isDemostaff;
          }

          // 2. If user is demostaff, they can ONLY see Demo Section
          if (isDemostaff) {
            return false;
          }

          // 2b. The official academic section (Integrated Mtech) is always visible to all academic faculty and admin
          if (sec.id === 'sec-mw6l4r2s' || sec.joinCode === 'LQ-INTE34' || (sec.sectionName || '').toLowerCase().includes('mtech')) {
            return !isDemostaff;
          }

          // 3. Normal faculty isolation: if section has explicit faculty email or ID, it must match (unless superadmin)
          if (secFacultyEmail && facultyEmailClean && !isSuperAdmin) {
            return secFacultyEmail === facultyEmailClean;
          }
          if (sec.facultyId && facultyId && !isSuperAdmin) {
            return sec.facultyId === facultyId || sec.createdById === facultyId;
          }

          // 4. Default for SuperAdmin (LogicQ Arena): sees authentic academic sections (Integrated Mtech)
          return true;
        };

        const isolatedSections = validSections.filter(isSectionOwnedByFaculty);

        const isolatedSectionKeys = new Set(
          isolatedSections.flatMap((s) => [
            String(s.id || '').toUpperCase().trim(),
            String(s.joinCode || '').toUpperCase().trim(),
            String(s.sectionName || '').toUpperCase().trim(),
            String(s.subject || '').toUpperCase().trim(),
          ]).filter(Boolean)
        );

        const knownBoundPrnsKey = 'logicq_known_bound_prns';
        const knownBoundPrns = new Set<string>();
        try {
          const stored = JSON.parse(localStorage.getItem(knownBoundPrnsKey) || '[]');
          if (Array.isArray(stored)) stored.forEach((p: string) => knownBoundPrns.add(String(p).toUpperCase().trim()));
        } catch {}

        const allStudentUsers = Array.isArray(realUsers)
          ? realUsers
              .filter((u) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com' && u.email !== 'hariprasathset@sanjivani.edu.in')) && !FirestoreDataService.isPurgedStudent(u))
              .map((u: any) => {
                const prnClean = (u.prn || '').toUpperCase().trim();
                const altPrn = prnClean.startsWith('1226') ? '2126' + prnClean.slice(4) : (prnClean.startsWith('2126') ? '1226' + prnClean.slice(4) : null);
                const userId = String(u.id || u.uid || '').trim();
                const cData = cohortMap.get(prnClean) ||
                              cohortMap.get(prnClean.replace(/0/g, 'O')) ||
                              cohortMap.get(prnClean.replace(/O/g, '0')) ||
                              (altPrn ? cohortMap.get(altPrn) : null) ||
                              cohortMap.get(userId.toUpperCase()) || {};
                const mod = cData.moduleProgress || {};

                const isBound = Boolean(
                  (prnClean && knownBoundPrns.has(prnClean)) ||
                  u.isEmailBound ||
                  u.isEmailBoundV2 ||
                  u.emailVerified ||
                  u.identityStatus === 'BOUND' ||
                  Boolean(u.boundEmail) ||
                  cData.isEmailBound ||
                  cData.isEmailBoundV2 ||
                  cData.emailVerified ||
                  Boolean(cData.boundEmail) ||
                  Boolean(mod.boundEmail) ||
                  Boolean(mod.isEmailBound) ||
                  Boolean(mod.isEmailBoundV2) ||
                  (u.email && !u.email.endsWith('@sanjivani.edu.in') && u.email.includes('@')) ||
                  (cData.boundEmail && !cData.boundEmail.endsWith('@sanjivani.edu.in') && cData.boundEmail.includes('@')) ||
                  (cData.studentEmail && !cData.studentEmail.endsWith('@sanjivani.edu.in') && cData.studentEmail.includes('@'))
                );

                if (isBound && prnClean) {
                  knownBoundPrns.add(prnClean);
                }

                const resolvedEmail =
                  cData.boundEmail ||
                  mod.boundEmail ||
                  u.boundEmail ||
                  (cData.studentEmail && !cData.studentEmail.endsWith('@sanjivani.edu.in') ? cData.studentEmail : null) ||
                  (u.email && !u.email.endsWith('@sanjivani.edu.in') ? u.email : null) ||
                  u.email ||
                  (prnClean ? `${prnClean.toLowerCase()}@sanjivani.edu.in` : '—');

                const isExplicitDemo =
                  prnClean === '2026BCSE101' ||
                  prnClean === '2026BCSE102' ||
                  u.sectionId === 'sec-demo-section' ||
                  u.sectionName === 'Demo Section' ||
                  u.section === 'Demo Section';

                const isMtechUser =
                  !isExplicitDemo &&
                  (u.sectionId === 'sec-mw6l4r2s' ||
                   (prnClean && (prnClean.startsWith('2126PMI') || prnClean.startsWith('2125PMI') || prnClean.startsWith('1226PMI'))) ||
                   (u.department && u.department.toLowerCase().includes('mtech')) ||
                   (u.course && u.course.toLowerCase().includes('mtech')) ||
                   (u.sectionName && u.sectionName.toLowerCase().includes('mtech')));

                const rawSection = isExplicitDemo
                  ? 'Demo Section'
                  : isMtechUser
                  ? 'Integrated Mtech'
                  : (u.sectionName || u.section || (u.division ? `Division ${u.division}` : 'Integrated Mtech'));

                const normalizedSection = isExplicitDemo
                  ? 'Demo Section'
                  : (rawSection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
                  ? 'Integrated Mtech'
                  : rawSection;

                const totalSolved = Math.min(100, Math.max(
                  cData.totalSolved ?? 0,
                  u.totalSolved ?? 0,
                  u.problemsSolved ?? 0,
                  Array.isArray(cData.completedProblems) ? cData.completedProblems.length : 0
                ));
                const totalPoints = cData.totalPoints ?? u.totalPoints ?? (totalSolved * 50);
                const academicScore = mod.academicScore !== undefined ? Number(mod.academicScore) : Math.min(100, Math.round(totalSolved * 20));
                const tabSwitches = Math.max(Number(mod.tabSwitches) || 0, Number(u.tabSwitchCount) || 0, Number(u.tabSwitches) || 0);
                const pasteBursts = Math.max(Number(mod.pasteBursts) || 0, Number(u.clipboardAttempts) || 0, Number(u.pasteBursts) || 0);
                // ⚠️ SACRED RULE: Integrity ONLY from Lab Internal — NEVER from Practice tabSwitches
                const computedIntegrity = mod.integrityScore !== undefined
                  ? Number(mod.integrityScore)
                  : (u.integrityScore !== undefined ? Number(u.integrityScore) : 100);

                const sName = u.fullName || u.displayName || u.name || u.username || 'Student Candidate';
                return {
                  ...u,
                  id: u.id || u.uid || `stu-${Math.random().toString(36).substring(2, 7)}`,
                  name: sName,
                  fullName: u.fullName || sName,
                  displayName: u.displayName || sName,
                  prn: prnClean || '—',
                  email: resolvedEmail,
                  section: normalizedSection,
                  sectionName: normalizedSection,
                  identityStatus: isBound ? 'BOUND' : 'PENDING',
                  isEmailBound: isBound,
                  problemsSolved: totalSolved,
                  totalSolved,
                  totalPoints,
                  academicScore,
                  integrityScore: computedIntegrity,
                  tabSwitchCount: tabSwitches,
                  tabSwitches,
                  clipboardAttempts: pasteBursts,
                  pasteBursts,
                  totalKeystrokes: Math.max(Number(mod.totalKeystrokes) || 0, Number(u.totalKeystrokes) || 0),
                  completedProblems: cData.completedProblems || u.completedProblems || [],
                  miniProjectUnlocked: mod.miniProjectUnlocked ?? u.miniProjectUnlocked ?? false,
                  lastActive: mod.lastActiveTime
                    ? String(mod.lastActiveTime)
                    : (u.lastLoginAt ? String(u.lastLoginAt) : 'Recent'),
                };
              })
          : [];

        try {
          if (knownBoundPrns.size > 0) {
            localStorage.setItem(knownBoundPrnsKey, JSON.stringify(Array.from(knownBoundPrns)));
          }
        } catch {}

        // STRICT MULTI-FACULTY STUDENT ISOLATION:
        // A faculty member can ONLY see students enrolled in their sections.
        const isolatedStudents = allStudentUsers.filter((st: any) => {
          const prnClean = (st.prn || '').toUpperCase().trim();
          const isDemoStudent =
            prnClean === '2026BCSE101' ||
            prnClean === '2026BCSE102' ||
            st.sectionId === 'sec-demo-section' ||
            st.joinCode === 'LQ-DEMO' ||
            String(st.sectionName || st.section || '').toLowerCase().includes('demo');

          if (isDemostaff) {
            return isDemoStudent;
          }

          // Non-demostaff must NEVER see demo students
          if (isDemoStudent) {
            return false;
          }

          // SuperAdmin (LogicQ Arena) or faculty teaching Integrated Mtech sees all cohort students (119)
          if (isSuperAdmin || isDeanOrHod || (st.department || '').toLowerCase().includes('mtech') || (st.sectionName || '').toLowerCase().includes('mtech')) {
            return true;
          }

          if (isolatedSections.length === 0) return false;
          const stSecId = String(st.sectionId || '').toUpperCase().trim();
          const stJoinCode = String(st.joinCode || '').toUpperCase().trim();
          const stSecName = String(st.sectionName || st.section || st.department || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();

          if (stSecId && isolatedSectionKeys.has(stSecId)) return true;
          if (stJoinCode && isolatedSectionKeys.has(stJoinCode)) return true;
          if (stSecName && Array.from(isolatedSectionKeys).some((k) => k.replace(/[^a-zA-Z0-9]/g, '') === stSecName)) return true;
          if (Array.isArray(st.sections) && st.sections.some((s: any) => {
            const sid = String(s.id || s.joinCode || '').toUpperCase().trim();
            return isolatedSectionKeys.has(sid);
          })) return true;
          return isolatedSections.some((sec) =>
            Array.isArray(sec.students) && sec.students.some((s: any) =>
              (s.prn && String(s.prn).toUpperCase().trim() === prnClean) ||
              (s.email && (s.email || '').toLowerCase().trim() === (st.email || '').toLowerCase().trim()) ||
              (s.id && s.id === st.id)
            )
          );
        });

        // Authoritatively synchronize each isolated section's roster and count directly with isolatedStudents
        const syncedSections = isolatedSections.map((sec) => {
          const combined = new Map<string, any>();

          // 1. Preserve students already resolved in sec.students
          if (Array.isArray(sec.students)) {
            sec.students.forEach((s: any) => {
              const key = (s.prn || s.email || s.id || '').toUpperCase().trim();
              if (key && !FirestoreDataService.isPurgedStudent(s)) combined.set(key, s);
            });
          }

          // 2. Map matching isolatedStudents
          isolatedStudents.forEach((u: any) => {
            if (FirestoreDataService.isPurgedStudent(u)) return;

            const uSecId = String(u.sectionId || '').toUpperCase().trim();
            const uJoinCode = String(u.joinCode || '').toUpperCase().trim();
            const uSecName = String(u.sectionName || u.section || '').toUpperCase().trim();
            const secId = String(sec.id || '').toUpperCase().trim();
            const secCode = String(sec.joinCode || '').toUpperCase().trim();
            const secName = String(sec.sectionName || '').toUpperCase().trim();
            const secSub = String(sec.subject || '').toUpperCase().trim();

            const isMatch =
              isolatedSections.length === 1 || // If only 1 section exists for this faculty, all their students belong to it
              (uSecId && (uSecId === secId || uSecId === secCode)) ||
              (uJoinCode && (uJoinCode === secCode || uJoinCode === secId)) ||
              (uSecName && (uSecName === secName || uSecName === secSub || secName.includes(uSecName) || uSecName.includes(secName))) ||
              (Array.isArray(u.sections) && u.sections.some((s: any) => {
                const sId = String(s.id || '').toUpperCase().trim();
                const sCode = String(s.joinCode || '').toUpperCase().trim();
                return sId === secId || sCode === secCode;
              }));

            if (isMatch) {
              const key = (u.prn || u.email || u.id || '').toUpperCase().trim();
              if (key) combined.set(key, u);
            }
          });

          const finalRoster = Array.from(combined.values());
          const count = finalRoster.length;

          return {
            ...sec,
            students: finalRoster,
            studentsCount: count,
            _count: { students: count },
          };
        });

        let totalAcademic = 0;
        let totalIntegrity = 0;
        let needingSupport = 0;
        let advanced = 0;
        let flagged = 0;

        isolatedStudents.forEach((s) => {
          totalAcademic += s.academicScore || 0;
          totalIntegrity += s.integrityScore !== undefined ? s.integrityScore : 100;
          if ((s.academicScore || 0) < 40) needingSupport++;
          if ((s.academicScore || 0) >= 80) advanced++;
          if ((s.integrityScore || 100) < 70) flagged++;
        });

        const avgAcademic = isolatedStudents.length > 0 ? Math.round(totalAcademic / isolatedStudents.length) : 0;
        const overallIntegrity = isolatedStudents.length > 0 ? Math.round(totalIntegrity / isolatedStudents.length) : 100;

        const validTests = (Array.isArray(cloudTests) ? cloudTests : []).filter(
          (t: any) =>
            t.id !== 'test-continuous-arrays-search-sort' &&
            !FirestoreDataService.isDeletedTest(t.id) &&
            !(t.title && t.title.toLowerCase().includes('arrays & searching'))
        );
        const finalTests = validTests;
        const liveCount = finalTests.filter((t: any) => t.status === 'ACTIVE').length;
        const upCount = finalTests.filter((t: any) => t.status === 'UPCOMING' || !t.status).length;

        const finalSections = syncedSections.length > 0 ? syncedSections : [DEFAULT_ACADEMIC_SECTION];
        setSections(finalSections);
        setFacultyStudents(isolatedStudents);
        setStats((prev) => ({
          ...prev,
          totalSections: finalSections.length,
          totalStudents: Math.max(isolatedStudents.length, DEFAULT_ACADEMIC_SECTION.studentsCount),
          activeTests: liveCount,
          upcomingTests: upCount,
          avgAcademicScore: avgAcademic,
          overallIntegrityScore: overallIntegrity,
          studentsNeedingSupport: needingSupport,
          advancedLearners: advanced,
          flaggedSessions: flagged,
        }));

        try {
          localStorage.setItem('logicq_admin_students', JSON.stringify(isolatedStudents));
          localStorage.setItem('logicq_admin_sections', JSON.stringify(syncedSections));
        } catch {}
      } catch (err) {
        console.error('Error fetching admin data:', err);
      }
    };

    // 1. Initial authoritative load
    loadRealData();

    // 2. Real-time Firestore Live Listeners (with quota grace & clean tear down)
    let unsubCohort: (() => void) | null = null;
    let unsubSubmissions: (() => void) | null = null;
    let unsubAssessmentSubmissions: (() => void) | null = null;
    let unsubSections: (() => void) | null = null;
    let unsubEnrolled: (() => void) | null = null;

    const handleSnapshotErr = (err: any) => {
      if (err?.code === 'resource-exhausted' || err?.code === 'permission-denied') {
        unsubCohort?.();
        unsubSubmissions?.();
        unsubAssessmentSubmissions?.();
        unsubSections?.();
        unsubEnrolled?.();
        return;
      }
      console.warn('Firestore snapshot notice:', err?.message || err);
    };

    try {
      unsubCohort = onSnapshot(collection(db, 'cohort_progress'), () => loadRealData(), handleSnapshotErr);
      unsubSubmissions = onSnapshot(collection(db, 'submissions'), () => loadRealData(), handleSnapshotErr);
      unsubAssessmentSubmissions = onSnapshot(collection(db, 'assessment_test_submissions'), () => loadRealData(), handleSnapshotErr);
      unsubSections = onSnapshot(collection(db, 'sections'), () => loadRealData(), handleSnapshotErr);
      unsubEnrolled = onSnapshot(collection(db, 'enrolled_students'), () => loadRealData(), handleSnapshotErr);
    } catch {}

    const refreshOpenIssuesCount = async (firestoreDocs?: Array<{ id: string; data: () => any }>) => {
      try {
        const tombstones = new Set<string>();
        try {
          const stored = JSON.parse(localStorage.getItem('logicq_deleted_issues_tombstones') || '[]');
          if (Array.isArray(stored)) stored.forEach((t: string) => tombstones.add(String(t)));
        } catch {}

        const uniqueMap = new Map<string, string>();

        const recordItem = (item: any, sourceStatus: string) => {
          if (!item) return;
          const prn = (item?.studentPrn || item?.student_prn || '').trim().toUpperCase();
          const desc = (item?.description || '').trim();
          const title = (item?.questionTitle || item?.question_title || '').trim();
          const id = item?.id ? String(item.id) : '';

          // Skip known testing PRN or tombstoned issues
          if (prn === '2126PMIM1039') return;
          if (id && tombstones.has(id)) return;
          if (prn && desc && tombstones.has(`${prn}:::${desc}`)) return;

          // Cross-source signature: PRN + description is the universal canonical key
          const sig = prn && desc
            ? `${prn}:::${desc.toLowerCase()}`
            : (id || `${prn}:::${title.toLowerCase()}`);

          const existing = uniqueMap.get(sig);
          if (existing === 'RESOLVED') return; // Once resolved, keep resolved!
          if (sourceStatus === 'RESOLVED') {
            uniqueMap.set(sig, 'RESOLVED');
          } else if (!existing || existing === 'OPEN') {
            uniqueMap.set(sig, sourceStatus || 'OPEN');
          }
        };

        // 1. From NTFY cloud mesh (low priority fallback)
        try {
          const mesh = await IssueSyncService.fetchMeshIssues();
          mesh.forEach((item: any) => recordItem(item, item?.status || 'OPEN'));
        } catch {}

        // 2. From Firestore (live status)
        if (firestoreDocs) {
          firestoreDocs.forEach((d) => {
            const data = d.data();
            recordItem({ id: d.id, ...data }, data?.status || 'OPEN');
          });
        }

        // 3. From Supabase (authoritative persistent storage)
        try {
          const sbIssues = await IssueSyncService.fetchSupabaseIssues();
          sbIssues.forEach((item: any) => recordItem(item, item?.status || 'OPEN'));
        } catch {}

        // 4. From local storage (authoritative local faculty actions override everything)
        try {
          const local = JSON.parse(localStorage.getItem('logicq_faculty_raised_issues') || '[]');
          if (Array.isArray(local)) {
            local.forEach((item: any) => recordItem(item, item?.status || 'OPEN'));
          }
        } catch {}

        let openCount = 0;
        uniqueMap.forEach((status) => {
          if (status !== 'RESOLVED') openCount++;
        });
        setOpenIssuesCount(openCount);
      } catch {}
    };

    refreshOpenIssuesCount();

    const unsubIssues = onSnapshot(collection(db, 'raised_issues'), (snap) => {
      refreshOpenIssuesCount(snap.docs);
    }, handleSnapshotErr);

    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), () => {
        loadRealData();
      }, () => {});
    } catch {}

    // 2.5. Supabase Realtime Listener (scoped to assessment_tests start/stop only)
    let sbChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        sbChannel = supabase
          .channel('admin_portal_data')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_tests' }, () => {
            loadRealData();
            refreshOpenIssuesCount();
          })
          .subscribe();
      } catch {}
    }

    // 3. Multi-Tab Realtime Mesh Listeners (Debounced to prevent cascades)
    let meshDebounceTimer: any = null;
    const debouncedLoadRealData = () => {
      if (meshDebounceTimer) clearTimeout(meshDebounceTimer);
      meshDebounceTimer = setTimeout(() => {
        loadRealData();
      }, 1500);
    };

    const unsubMeshSections = realtimeSync.on('SECTIONS', debouncedLoadRealData);
    const unsubMeshUsers = realtimeSync.on('USERS', debouncedLoadRealData);
    const unsubMeshDashboard = realtimeSync.on('DASHBOARD', debouncedLoadRealData);
    const unsubMeshSubmissions = realtimeSync.on('SUBMISSIONS', debouncedLoadRealData);
    const unsubMeshIssuesEvent = realtimeSync.on('ISSUES', () => refreshOpenIssuesCount());
    const unsubLiveMeshIssues = IssueSyncService.subscribeToLiveMesh(() => refreshOpenIssuesCount());
    const pollIssuesInterval = setInterval(() => refreshOpenIssuesCount(), 60000);

    return () => {
      if (meshDebounceTimer) clearTimeout(meshDebounceTimer);
      clearInterval(pollIssuesInterval);
      unsubCohort?.();
      unsubSubmissions?.();
      unsubAssessmentSubmissions?.();
      unsubSections?.();
      unsubEnrolled?.();
      unsubIssues?.();
      if (unsubUsers) unsubUsers();
      if (sbChannel) supabase.removeChannel(sbChannel);
      unsubMeshSections();
      unsubMeshUsers();
      unsubMeshDashboard();
      unsubMeshSubmissions();
      unsubMeshIssuesEvent();
      unsubLiveMeshIssues();
    };
  }, []);

  // Dynamic tabs with live issue count & role-tailored view
  const tabs: TabItem[] = React.useMemo(() => {
    return [
      { id: 'command-center', label: 'Overview', icon: LayoutDashboard },
      { id: 'sections', label: isFacultyUser ? 'My Section' : 'Sections', icon: Layers },
      { id: 'students', label: isFacultyUser ? 'Section Students' : 'Students', icon: Users },
      { id: 'question-bank', label: isFacultyUser ? 'Practice & Questions' : 'Question Bank', icon: BookOpen },
      { id: 'test-orchestrator', label: isFacultyUser ? 'Lab Internal Exams' : 'Assessments', icon: Sliders },
      { id: 'integrity', label: 'Integrity & AI Viva', icon: ShieldAlert },
      { id: 'reports', label: 'Reports & Accreditation', icon: FileText },
      { id: 'raised-issues', label: 'Student Issues', icon: Flag, badge: openIssuesCount > 0 ? String(openIssuesCount) : undefined },
    ];
  }, [openIssuesCount, isFacultyUser]);

  const saveSections = (updated: any[]) => {
    setSections(updated);
    try {
      localStorage.setItem('logicq_admin_sections', JSON.stringify(updated));
      localStorage.setItem('logicq_faculty_sections_backup_v2', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateSection = async (data: any) => {
    const cleanJoinCode = data.joinCode || `LQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newSection = {
      id: `sec-${Date.now().toString(36)}`,
      sectionName: data.sectionName,
      subject: data.subject || 'C Programming',
      course: data.course || data.subject || 'C Programming',
      academicYear: data.academicYear || '2026-2027',
      semester: data.semester || 'Semester 1',
      joinCode: cleanJoinCode,
      facultyEmail: (user?.email || '').toLowerCase().trim(),
      facultyId: user?.id || (user as any)?.uid || '',
      facultyName: user?.fullName || user?.displayName || 'Faculty Lead',
      createdBy: (user?.email || '').toLowerCase().trim(),
      createdById: user?.id || (user as any)?.uid || '',
      studentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSection, ...sections.filter(s => s.id !== newSection.id && s.joinCode !== newSection.joinCode)];
    saveSections(updated);

    try {
      await FirestoreDataService.saveSectionToFirestore(newSection);
    } catch (err) {
      console.warn('Notice: section saved to local cache, Firestore sync backgrounded:', err);
    }

    try {
      realtimeSync.emit('SECTIONS');
      realtimeSync.emit('DASHBOARD');
    } catch {}

    toast.success(`Class section "${newSection.sectionName}" created successfully!`);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const secToDelete = sections.find((s) => s.id === sectionId);
    const updated = sections.filter((s) => s.id !== sectionId);
    saveSections(updated);
    setStats((prev) => ({ ...prev, totalSections: updated.length }));

    try {
      await FirestoreDataService.deleteSectionFromFirestore(
        sectionId,
        secToDelete?.joinCode,
        secToDelete?.sectionName
      );
    } catch (err) {
      console.warn('Notice: section removed from local cache, Firestore delete backgrounded:', err);
    }

    try {
      realtimeSync.emit('SECTIONS');
      realtimeSync.emit('USERS');
      realtimeSync.emit('DASHBOARD');
    } catch {}

    toast.info('Section deleted.');
  };

  const handleImportExcelStudents = async (sectionId: string, imported: any[]) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, studentsCount: (s.studentsCount || 0) + imported.length } : s
    );
    saveSections(updated);
    toast.success(`Imported ${imported.length} student records into section!`);
  };

  const handleTabSelect = (rawTab: string) => {
    if (rawTab === 'tests') setActiveTab('test-orchestrator');
    else if (rawTab === 'roster') setActiveTab('students');
    else if (rawTab === 'questions') setActiveTab('question-bank');
    else if (rawTab === 'analytics') setActiveTab('integrity');
    else if (rawTab === 'answers' || rawTab === 'answer-bank') setActiveTab('students');
    else if (
      [
        'command-center',
        'sections',
        'students',
        'question-bank',
        'test-orchestrator',
        'integrity',
        'reports',
        'raised-issues',
      ].includes(rawTab)
    ) {
      setActiveTab(rawTab as AdminTabKey);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#090b0e] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* ========================================================================= */}
      {/* 1. APPLE EXECUTIVE TOPBAR & HORIZONTAL NAVIGATION (Spacious & Clean)      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0f14]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs select-none">
        {/* Top Branding & Quick Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-sm ${
              isFacultyUser
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500'
            }`}>
              LQ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                LogicQ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                FACULTY PORTAL
              </span>
            </div>
          </div>

          {/* Right Status & Profile Cluster */}
          <div className="flex items-center gap-3">
            {/* Live System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.08] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">System Online</span>
            </div>

            {/* User Profile Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'F'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline leading-tight">
                  {user?.displayName || user?.fullName || 'Faculty Lead'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline leading-tight">
                  {isFacultyUser
                    ? `Faculty • ${facultySectionName}`
                    : 'Faculty Lead • LogicQ'}
                </span>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition ml-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs (Apple HIG Native Segmented Control) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.05] inline-flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs transition-all duration-150 whitespace-nowrap cursor-pointer select-none active:scale-[0.98] ${
                    isActive
                      ? 'bg-white dark:bg-[#1c2230] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        tab.id === 'raised-issues'
                          ? 'bg-rose-500 text-white font-bold shadow-xs animate-pulse'
                          : isActive
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-slate-300/60 dark:bg-white/10 text-slate-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTENT (Full Width, Perfectly Responsive)              */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'command-center' && (
          <AdminCommandCenterTab
            stats={stats}
            liveEvents={DEFAULT_LIVE_EVENTS}
            onSelectTab={handleTabSelect}
            onInspectStudent={(candidate) => setSelectedCandidateForDeepDive(candidate)}
          />
        )}
        {activeTab === 'sections' && (
          <AdminSectionsTab
            sections={sections}
            onCreateSection={handleCreateSection}
            onDeleteSection={handleDeleteSection}
            onImportExcelStudents={handleImportExcelStudents}
          />
        )}
        {activeTab === 'students' && (
          <AdminStudentsTab students={facultyStudents} sections={sections} />
        )}
        {activeTab === 'question-bank' && <AdminQuestionBankTab />}
        {activeTab === 'test-orchestrator' && (
          <AdminTestOrchestratorTab sections={sections} allowedStudents={facultyStudents} />
        )}
        {activeTab === 'integrity' && (
          <AdminIntegrityTab sections={sections} allowedStudents={facultyStudents} />
        )}
        {activeTab === 'reports' && (
          <AdminReportsTab sections={sections} students={facultyStudents} />
        )}
        {activeTab === 'raised-issues' && (
          <AdminRaisedIssuesTab allowedStudents={facultyStudents} onOpenCountChange={setOpenIssuesCount} />
        )}
      </main>

      {/* Candidate Deep-Dive Modal (1-Click Inspection) */}
      {selectedCandidateForDeepDive && (
        <StudentDeepDiveModal
          student={selectedCandidateForDeepDive}
          onClose={() => setSelectedCandidateForDeepDive(null)}
          onToggleMiniProject={(studentId, currentStatus) => {
            setSelectedCandidateForDeepDive({
              ...selectedCandidateForDeepDive,
              miniProjectUnlocked: !currentStatus,
            });
            toast.success(
              `Mini-Project status updated for ${selectedCandidateForDeepDive.name || selectedCandidateForDeepDive.fullName || selectedCandidateForDeepDive.displayName || 'Student'}`
            );
          }}
        />
      )}
    </div>
  );
};
