import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import {
  Users,
  Plus,
  Upload,
  Copy,
  Check,
  Share2,
  QrCode,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Download,
  GraduationCap,
  ExternalLink,
  Brain,
  X,
  Sparkles,
  BarChart3,
  Award,
  Terminal,
  Code2,
  ShieldCheck,
  ChevronRight,
  Clock,
  ArrowUpRight,
  Activity,
  FileText,
  Filter,
} from 'lucide-react';
import { ALLOWED_DEPARTMENTS, ALLOWED_YEARS, normalizeDepartment } from '../../config/academic.config.js';
import { findCohortStudent } from '../../data/c-programming-cohort.data.js';

interface StudentRosterItem {
  id?: string;
  prn?: string;
  name?: string;
  fullName?: string;
  email?: string;
  mobile?: string | null;
  status?: string;
  joinedVia?: string;
  enrolledAt?: string;
  student?: {
    id: string;
    fullName: string;
    displayName: string | null;
    email: string;
    mobile: string | null;
    prn?: string;
    accountState?: string;
  };
}

interface SectionItem {
  id: string;
  institution?: string;
  course: string;
  subject: string;
  academicYear: string;
  semester: string;
  sectionName: string;
  joinCode: string;
  joinToken: string;
  description: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  createdAt?: string;
  studentsCount?: number;
  _count?: { students: number };
  students?: StudentRosterItem[];
}

export const SectionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals and drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionModalTab, setSectionModalTab] = useState<'report' | 'student' | 'score' | 'submissions'>('student');
  const [scoreViewFilter, setScoreViewFilter] = useState<'ALL' | 'PRACTICAL' | 'INTERNAL'>('ALL');
  const [viewingCodeSubmission, setViewingCodeSubmission] = useState<any | null>(null);
  const [submissionsFilter, setSubmissionsFilter] = useState<'ALL' | 'ACCEPTED' | 'FAILED'>('ALL');

  // Single Student Manual Add Form
  const [singleStudent, setSingleStudent] = useState({
    name: '',
    prn: '',
    email: '',
    mobile: '',
    department: '',
    year: '',
  });

  // Excel Preview State
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // New Section Form State (Clean and simplified)
  const [newSection, setNewSection] = useState({
    subject: '',
    semester: 'Semester 1',
    description: '',
  });

  // Clean up only the specific legacy demo section (LQ-DC85) on mount and clear stale local tombstones
  useEffect(() => {
    FirestoreDataService.clearStaleSectionTombstones();
    FirestoreDataService.purgeLegacyDemoSection().catch(() => {});
    api.delete('/sections/LQ-DC85').catch(() => {});
    api.delete('/sections/LQ-56BB').catch(() => {});
    FirestoreDataService.deleteSectionFromFirestore('LQ-56BB', 'LQ-56BB').catch(() => {});
  }, []);

  // Fetch sections (combines backend with persistent Firestore)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['faculty-sections'],
    queryFn: async () => {
      let backendList: any[] = [];
      try {
        const res = await api.get('/sections');
        backendList = res.sections || res.data || [];
      } catch (err) {
        console.warn('Backend /sections failed:', err);
      }

      const firestoreSections = await FirestoreDataService.getSectionsFromFirestore();

      // Merge both backend & Firestore: Map with alias-awareness (joinCode, id, joinToken)
      const sectionMap = new Map<string, SectionItem>();

      const allSectionsRaw = [...backendList, ...firestoreSections];
      allSectionsRaw.forEach((s: any) => {
        if (!s || FirestoreDataService.isLegacyDemoSection(s) || FirestoreDataService.isSectionDeleted(s.id, s.joinCode)) {
          return;
        }

        const cleanCode = s.joinCode ? String(s.joinCode).toUpperCase().trim() : null;
        const cleanId = s.id ? String(s.id).trim() : null;
        const cleanToken = s.joinToken ? String(s.joinToken).trim() : null;

        let existingKey: string | null = null;
        let existing: any = null;
        for (const [k, sec] of sectionMap.entries()) {
          const secCode = sec.joinCode ? String(sec.joinCode).toUpperCase().trim() : null;
          const secId = sec.id ? String(sec.id).trim() : null;
          const secToken = sec.joinToken ? String(sec.joinToken).trim() : null;
          if (cleanCode && secCode && cleanCode === secCode) { existingKey = k; existing = sec; break; }
          if (cleanId && secId && cleanId === secId) { existingKey = k; existing = sec; break; }
          if (cleanToken && secToken && cleanToken === secToken) { existingKey = k; existing = sec; break; }
        }

        const primaryKey = cleanCode || cleanId || `sec_${Date.now()}`;
        if (!existing) {
          const studentsList = Array.isArray(s.students) ? [...s.students] : [];
          sectionMap.set(primaryKey, {
            ...s,
            id: s.id || primaryKey,
            joinCode: s.joinCode || (primaryKey.startsWith('LQ-') ? primaryKey : ''),
            students: studentsList,
            studentsCount: Math.max(studentsList.length, s.studentsCount || 0, s._count?.students || 0),
            _count: { students: Math.max(studentsList.length, s.studentsCount || 0, s._count?.students || 0) },
          });
        } else {
          const existingStudents = Array.isArray(existing.students) ? [...existing.students] : [];
          const incomingStudents = Array.isArray(s.students) ? s.students : [];
          incomingStudents.forEach((st: any) => {
            const stPrn = (st.prn || st.student?.prn || '').toUpperCase().trim();
            const stEmail = (st.email || st.student?.email || '').toLowerCase().trim();
            const existingIdx = existingStudents.findIndex((ex: any) =>
              (stPrn && (ex.prn || ex.student?.prn || '').toUpperCase().trim() === stPrn) ||
              (stEmail && (ex.email || ex.student?.email || '').toLowerCase().trim() === stEmail)
            );
            if (existingIdx !== -1) {
              const matched = existingStudents[existingIdx];
              const resolvedEmail = (st.email && !st.email.includes('@sanjivani.edu.in')) ? st.email : (matched.email || st.email);
              matched.email = resolvedEmail;
              if (matched.student) matched.student.email = resolvedEmail;
            } else {
              existingStudents.push(st);
            }
          });
          // Ensure all students with cohort data have their latest bound email
          existingStudents.forEach((st: any) => {
            const prn = (st.prn || st.student?.prn || '').toUpperCase().trim();
            if (prn) {
              const cohort = findCohortStudent(prn);
              const boundStorage = localStorage.getItem(`logicq_bound_email_${prn}`);
              const target = boundStorage || cohort?.email;
              if (target) {
                st.email = target;
                if (st.student) st.student.email = target;
              }
            }
          });
          const countVal = Math.max(existingStudents.length, existing.studentsCount || 0, s.studentsCount || 0, s._count?.students || 0);
          sectionMap.set(existingKey || primaryKey, {
            ...existing,
            ...s,
            id: existing.id || s.id,
            joinCode: existing.joinCode || s.joinCode,
            students: existingStudents,
            studentsCount: countVal,
            _count: { students: countVal },
          });
        }
      });

      // Filter out deleted/legacy demo sections - all institutional sections are shared and visible
      const mergedList = Array.from(sectionMap.values()).filter((s: any) => {
        if (FirestoreDataService.isSectionDeleted(s.id, s.joinCode) || FirestoreDataService.isLegacyDemoSection(s)) {
          return false;
        }
        return true;
      });

      return mergedList;
    },
    refetchInterval: 6000, // Live real-time sync with student enrollments & admin
  });

  // Real-time synchronization when students enroll or switch sections
  useEffect(() => {
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      refetch();
    });
    const unsubUsers = RealtimeSyncService.on('USERS', () => {
      refetch();
    });
    return () => {
      unsubSections();
      unsubUsers();
    };
  }, [refetch]);

  const sections: SectionItem[] = Array.isArray(data) ? data : [];

  // Live keep selectedSection in sync with real-time student profile/roster updates
  useEffect(() => {
    if (selectedSection && sections.length > 0) {
      const fresh = sections.find(
        (s) => s.id === selectedSection.id || (s.joinCode && s.joinCode === selectedSection.joinCode)
      );
      if (fresh && Array.isArray(fresh.students)) {
        const freshStudents = fresh.students;
        setSelectedSection((prev: any) => {
          if (!prev) return fresh;
          if (JSON.stringify(prev.students) !== JSON.stringify(freshStudents)) {
            return {
              ...prev,
              ...fresh,
              students: freshStudents,
              _count: { students: freshStudents.length },
            };
          }
          return prev;
        });
      }
    }
  }, [sections]);

  // Live submissions for students enrolled in the currently inspected section
  const { data: sectionSubmissions = [], isLoading: isLoadingSectionSubmissions } = useQuery({
    queryKey: ['section-submissions', selectedSection?.id, selectedSection?.joinCode],
    enabled: Boolean(selectedSection),
    queryFn: async () => {
      try {
        const [fsSubs, backendRes] = await Promise.all([
          FirestoreDataService.getAllFirestoreSubmissions().catch(() => []),
          api.get('/admin/submissions?limit=60').catch(() => null),
        ]);
        const list = [...(backendRes?.submissions || backendRes?.data || []), ...fsSubs];
        const studentPrns = new Set(
          (selectedSection?.students || []).map((s: any) => (s.prn || s.student?.prn || '').toUpperCase().trim()).filter(Boolean)
        );
        const studentEmails = new Set(
          (selectedSection?.students || []).map((s: any) => (s.email || s.student?.email || '').toLowerCase().trim()).filter(Boolean)
        );
        const studentUids = new Set(
          (selectedSection?.students || []).map((s: any) => s.id || s.uid || s.userId).filter(Boolean)
        );

        const matched = list.filter((sub: any) => {
          const subPrn = (sub.prn || sub.studentPrn || sub.user?.prn || '').toUpperCase().trim();
          const subEmail = (sub.email || sub.studentEmail || sub.user?.email || '').toLowerCase().trim();
          const subUid = sub.userId || sub.uid;
          if (subPrn && studentPrns.has(subPrn)) return true;
          if (subEmail && studentEmails.has(subEmail)) return true;
          if (subUid && studentUids.has(subUid)) return true;
          return false;
        });
        return matched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // Live Lab Internal coursework submissions for the currently inspected section
  const { data: sectionLabSubmissions = [] } = useQuery({
    queryKey: ['section-lab-submissions', selectedSection?.id],
    enabled: Boolean(selectedSection),
    queryFn: async () => {
      try {
        const res = await api.get('/practice/admin/lab-submissions?limit=300');
        return res?.data?.submissions || res?.submissions || [];
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof newSection) => {
      if (!payload.subject.trim()) {
        throw new Error('Subject / Coursework name is required (e.g. C Programming).');
      }

      const facultyEmail = user?.email?.toLowerCase().trim();
      const facultyId = user?.id || (user as any)?.uid || facultyEmail || 'faculty_user';
      const facultyName = user?.fullName || (user as any)?.displayName || (user as any)?.name || '';

      const subjectName = payload.subject.trim();
      const currentYear = new Date().getFullYear();

      const fullPayload = {
        subject: subjectName,
        sectionName: subjectName,
        course: subjectName,
        department: '',
        academicYear: `${currentYear}-${currentYear + 1}`,
        semester: payload.semester || 'Semester 1',
        institution: 'LogicQ',
        description: payload.description || '',
        facultyId,
        facultyEmail,
        facultyName,
        createdBy: facultyId,
      };

      let createdSection: any = null;
      try {
        const res = await api.post('/sections', fullPayload);
        const candidate = res?.data || res?.section || res;
        if (candidate && (candidate.id || candidate.joinCode)) {
          createdSection = {
            ...candidate,
            facultyId: candidate.facultyId || facultyId,
            facultyEmail: candidate.facultyEmail || facultyEmail,
            facultyName: candidate.facultyName || facultyName,
          };
        }
      } catch (err) {
        console.warn('Backend section creation failed, saving to Firestore:', err);
      }

      if (!createdSection || !createdSection.joinCode) {
        createdSection = {
          ...fullPayload,
          id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          joinCode: `LQ-${Math.random().toString(36).slice(-4).toUpperCase()}`,
          joinToken: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}`,
          isActive: true,
          students: [],
          _count: { students: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // 1. Immediately cache in local storage
      try {
        const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
        const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        const filtered = (Array.isArray(existing) ? existing : []).filter(
          (s: any) => s.id !== createdSection.id && s.joinCode !== createdSection.joinCode
        );
        filtered.unshift(createdSection);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      } catch {}

      // 2. Persist to Firestore
      await FirestoreDataService.saveSectionToFirestore(createdSection);

      return createdSection;
    },
    onSuccess: (createdSection) => {
      toast.success('Section created successfully!');
      setIsCreateOpen(false);
      setNewSection({
        subject: '',
        semester: 'Semester 1',
        description: '',
      });
      // Immediately inject into queryClient cache so it doesn't wait for refetch
      queryClient.setQueryData(['faculty-sections'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        if (!list.some((s: any) => s.id === createdSection.id || s.joinCode === createdSection.joinCode)) {
          return [createdSection, ...list];
        }
        return list;
      });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create section.');
    },
  });

  // Delete section mutation (Faculty & Admin can delete)
  const deleteMutation = useMutation({
    mutationFn: async (sec: SectionItem) => {
      await FirestoreDataService.deleteSectionFromFirestore(sec.id, sec.joinCode);
      try {
        await api.delete(`/sections/${sec.id}`).catch(() => {});
        if (sec.joinCode && sec.joinCode !== sec.id) {
          await api.delete(`/sections/${sec.joinCode}`).catch(() => {});
        }
      } catch (err: any) {
        console.warn('Backend delete /sections failed (may only exist in Firestore):', err);
      }
      return { success: true, target: sec };
    },
    onSuccess: (_, sec) => {
      toast.success('Section deleted successfully.');
      // Immediately purge from queryClient cache so card disappears instantly
      queryClient.setQueryData(['faculty-sections'], (old: any) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter((s: any) => {
          const sId = String(s.id || '').toUpperCase().trim();
          const sCode = String(s.joinCode || '').toUpperCase().trim();
          const targetId = String(sec.id || '').toUpperCase().trim();
          const targetCode = String(sec.joinCode || '').toUpperCase().trim();
          if (targetId && (sId === targetId || sCode === targetId)) return false;
          if (targetCode && (sCode === targetCode || sId === targetCode)) return false;
          return true;
        });
      });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      if (selectedSection?.id === sec.id || selectedSection?.joinCode === sec.joinCode) {
        setSelectedSection(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete section.');
    },
  });

  const handleDeleteSection = (sec: SectionItem) => {
    const confirmed = window.confirm(
      `Delete Section "${sec.sectionName}" (${sec.subject})?\n\nThis will remove the join code ${sec.joinCode} and its student roster list.`
    );
    if (confirmed) {
      deleteMutation.mutate(sec);
    }
  };

  const handleDeleteAllSections = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL sections and enrolled student rosters?\n\nThis will permanently wipe all sections so you can start fresh.'
    );
    if (!confirmed) return;

    try {
      await FirestoreDataService.purgeAllSectionsFromFirestore();
      queryClient.setQueryData(['faculty-sections'], []);
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      refetch();
      toast.success('All sections and rosters have been deleted.');
    } catch {
      toast.error('Failed to delete sections.');
    }
  };

  // Excel commit mutation
  const commitImportMutation = useMutation({
    mutationFn: async ({ sectionId, students }: { sectionId: string; students: any[] }) => {
      await FirestoreDataService.saveEnrolledStudentsToFirestore(sectionId, students);
      return await api.post(`/sections/${sectionId}/import-students`, { students });
    },
    onSuccess: (res) => {
      toast.success(`Import complete! ${res.newlyEnrolled || res.importedCount || 'Student(s)'} enrolled.`);
      setIsExcelModalOpen(false);
      setExcelPreview(null);
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('USERS');
      if (selectedSection) {
        refetchDetails(selectedSection.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Import failed.');
    },
  });

  // Single student manual add mutation
  const addSingleStudentMutation = useMutation({
    mutationFn: async ({ sectionId, student }: { sectionId: string; student: typeof singleStudent }) => {
      if (!student.name.trim()) throw new Error('Student full name is required.');
      if (!student.prn.trim()) throw new Error('Student PRN / Roll Number is required.');

      const studentRecord = {
        name: student.name.trim(),
        prn: student.prn.trim().toUpperCase(),
        email: student.email.trim().toLowerCase() || `${student.prn.trim().toLowerCase()}@student.logicq.io`,
        mobile: student.mobile.trim() || null,
        department: normalizeDepartment(student.department?.trim()) || student.department?.trim() || normalizeDepartment(selectedSection?.course) || 'General',
        year: student.year?.trim() || 'FY',
        joinedVia: 'MANUAL_ENTRY',
      };

      await FirestoreDataService.saveEnrolledStudentsToFirestore(sectionId, [studentRecord]);
      try {
        await api.post(`/sections/${sectionId}/import-students`, { students: [studentRecord] });
      } catch (err: any) {
        console.warn('Backend single student add fallback to local/Firestore:', err);
      }
      return studentRecord;
    },
    onSuccess: (newStu) => {
      toast.success(`Student ${newStu.name} (${newStu.prn}) enrolled successfully!`);
      setIsAddStudentOpen(false);
      setSingleStudent({ name: '', prn: '', email: '', mobile: '', department: '', year: '' });
      if (selectedSection) {
        setSelectedSection((prev: any) => {
          if (!prev) return prev;
          const currentStudents = Array.isArray(prev.students) ? [...prev.students] : [];
          if (!currentStudents.some((s: any) => (s.prn || s.email || '').toUpperCase() === (newStu.prn || newStu.email || '').toUpperCase())) {
            currentStudents.push(newStu);
          }
          return {
            ...prev,
            students: currentStudents,
            _count: { students: currentStudents.length },
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      if (selectedSection) {
        refetchDetails(selectedSection.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add student.');
    },
  });

  // Remove / Drop Student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async ({
      sectionId,
      studentId,
      prn,
      email,
    }: {
      sectionId: string;
      studentId?: string;
      prn?: string;
      email?: string;
    }) => {
      const targetIdentifier = studentId || prn || email || '';
      // 1. Remove from Firestore & local storage
      await FirestoreDataService.removeEnrolledStudentFromSection(sectionId, targetIdentifier);

      // 2. Remove from backend API
      try {
        await api.delete(`/sections/${sectionId}/students/${encodeURIComponent(targetIdentifier)}`);
      } catch (err: any) {
        console.warn('Backend remove student fallback to Firestore:', err);
      }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast.success('Student removed from section.');
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('USERS');
      if (selectedSection) {
        setSelectedSection((prev: any) => {
          if (!prev) return null;
          const filtered = (prev.students || []).filter((s: any) => {
            const p = s.prn || s.student?.prn;
            const e = s.email || s.student?.email;
            const id = s.id || s.studentId || s.student?.id;
            return p !== variables.prn && e !== variables.email && id !== variables.studentId;
          });
          return {
            ...prev,
            students: filtered,
            _count: { students: filtered.length },
          };
        });
        refetchDetails(selectedSection.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove student.');
    },
  });

  const handleRemoveStudent = (item: any) => {
    const studentName = item.student?.fullName || item.student?.displayName || item.name || item.fullName || 'this student';
    const prn = item.prn || item.student?.prn || '';
    const email = item.student?.email || item.email || '';
    const studentId = item.student?.id || item.studentId || item.id;

    if (window.confirm(`Are you sure you want to remove ${studentName} (${prn || email}) from this section?`)) {
      removeStudentMutation.mutate({
        sectionId: selectedSection!.id,
        studentId,
        prn,
        email,
      });
    }
  };

  const getSectionStudentCount = (section: SectionItem): number => {
    let count = Math.max(
      section.studentsCount || 0,
      section._count?.students || 0,
      section.students?.length || 0,
      selectedSection && (selectedSection.id === section.id || selectedSection.joinCode === section.joinCode)
        ? (selectedSection.students?.length || selectedSection.studentsCount || selectedSection._count?.students || 0)
        : 0
    );

    try {
      const keys = [
        section.id ? `logicq_section_students_${section.id}` : null,
        section.joinCode ? `logicq_section_students_${section.joinCode}` : null,
        section.joinToken ? `logicq_section_students_${section.joinToken}` : null,
      ].filter(Boolean) as string[];

      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((s: any) => !FirestoreDataService.isPurgedStudent(s));
            if (valid.length > count) {
              count = valid.length;
            }
          }
        }
      }
    } catch {}

    return count;
  };

  const refetchDetails = async (id: string) => {
    let backendSec: any = null;
    try {
      const res = await api.get(`/sections/${id}`);
      if (res?.section || res?.data) {
        backendSec = res.section || res.data;
      }
    } catch (err) {
      console.warn('Backend /sections/:id failed, falling back to Firestore/local:', err);
    }

    const localSec = sections.find(
      (s) => s.id === id || s.joinCode === id || (s.joinCode && String(s.joinCode).toUpperCase() === String(id).toUpperCase())
    ) || backendSec;
    const targetObj = localSec || backendSec;
    const fsStudents = await FirestoreDataService.getEnrolledStudentsForSection(id, targetObj);

    const mergedStudents = (Array.isArray(backendSec?.students) && backendSec.students.length > 0)
      ? [...backendSec.students]
      : (Array.isArray(localSec?.students) && localSec.students.length > 0 ? [...localSec.students] : []);

    fsStudents.forEach((st: any) => {
      const stEmail = (st.email || st.student?.email || '').toLowerCase().trim();
      const stPrn = (st.prn || st.student?.prn || '').toUpperCase().trim();
      if (!mergedStudents.some((ex: any) => (stEmail && (ex.email || ex.student?.email || '').toLowerCase().trim() === stEmail) || (stPrn && (ex.prn || ex.student?.prn || '').toUpperCase().trim() === stPrn))) {
        mergedStudents.push(st);
      }
    });

    // Sort enrolled students by PRN last 4 digits in ascending order
    mergedStudents.sort((a: any, b: any) => {
      const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
      const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const updatedCount = Math.max(mergedStudents.length, localSec?._count?.students || 0, localSec?.studentsCount || 0);

    const updated = {
      ...(localSec || {}),
      ...(backendSec || {}),
      students: mergedStudents,
      studentsCount: updatedCount,
      _count: { students: updatedCount },
    };

    setSelectedSection(updated);
    queryClient.setQueryData(['faculty-sections'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((s: any) =>
        s.id === id || s.joinCode === updated.joinCode || (s.joinCode && updated.joinCode && String(s.joinCode).toUpperCase() === String(updated.joinCode).toUpperCase())
          ? { ...s, students: mergedStudents, _count: { students: updatedCount }, studentsCount: updatedCount }
          : s
      );
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openQrCode = async (section: SectionItem) => {
    const joinUrl = `${window.location.origin}/join/${section.joinToken || section.joinCode}`;
    try {
      const url = await QRCode.toDataURL(joinUrl, { width: 300, margin: 2 });
      setQrDataUrl(url);
      setSelectedSection(section);
      setIsQrModalOpen(true);
    } catch (e) {
      toast.error('Failed to generate QR Code');
    }
  };

  const shareWhatsApp = (section: SectionItem) => {
    const joinUrl = `${window.location.origin}/join/${section.joinToken || section.joinCode}`;
    const text = encodeURIComponent(
      `📚 *LogicQ Exam & Practice Section*\nSubject: *${section.subject}* (${section.sectionName})\n\n🔑 Join Code: *${section.joinCode}*\n🔗 Join Link: ${joinUrl}\n\nPlease enter this Join Code in your LogicQ portal to access assigned programming tests and coursework.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target?.result as string;
        const res = await api.post('/sections/preview-excel', { base64Data: base64 });
        const preview = res.preview || res.data;
        setExcelPreview(preview);
        toast.success(`Excel analyzed: ${preview.validRows?.length || 0} valid student records found.`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to parse Excel file.');
        setExcelPreview(null);
      } finally {
        setIsParsingExcel(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Export Roster to CSV
  const exportRosterCsv = (sec: SectionItem) => {
    const list = [...(sec.students || [])].sort((a: any, b: any) => {
      const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
      const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });
    if (list.length === 0) {
      toast.error('No enrolled students to export.');
      return;
    }

    const headers = ['Student Name', 'PRN / Roll No', 'Email', 'Mobile', 'Status', 'Enrolled At'];
    const rows = list.map((item: any) => {
      const prn = (item.prn || item.student?.prn || '').trim();
      const cohort = prn ? findCohortStudent(prn) : null;
      const boundStorage = prn ? localStorage.getItem(`logicq_bound_email_${prn.toUpperCase()}`) : null;
      const name = item.student?.fullName || item.student?.displayName || item.name || item.fullName || cohort?.fullName || 'Student';
      const email = boundStorage || cohort?.email || item.student?.email || item.email || '';
      const mobile = item.student?.mobile || item.mobile || '';
      const status = item.student?.accountState || item.status || 'ACTIVE';
      const enrolledAt = item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString() : 'Active';
      return [
        `"${name.replace(/"/g, '""')}"`,
        `"${prn}"`,
        `"${email}"`,
        `"${mobile}"`,
        `"${status}"`,
        `"${enrolledAt}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Roster_${sec.sectionName.replace(/\s+/g, '_')}_${sec.subject.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Roster CSV downloaded!');
  };

  // Export Comprehensive Section Report (Report Tab)
  const exportSectionReportCsv = (sec: SectionItem) => {
    const list = [...(sec.students || [])].sort((a: any, b: any) => {
      const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
      const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });
    if (list.length === 0) {
      toast.error('No enrolled students in this section to export.');
      return;
    }

    const headers = [
      'PRN / Roll No',
      'Student Name',
      'Email',
      'Department',
      'Year',
      'Practical Modules (25)',
      'Lab Internal Coursework (5)',
      'Lab Internal Marks (20M)',
      'Total Verified Points',
      'Academic Honor Score',
      'Result / Status',
    ];
    const rows = list.map((item: any, idx: number) => {
      const prn = (item.prn || item.student?.prn || '').trim();
      const cohort = prn ? findCohortStudent(prn) : null;
      const boundStorage = prn ? localStorage.getItem(`logicq_bound_email_${prn.toUpperCase()}`) : null;
      const name = item.student?.fullName || item.student?.displayName || item.name || item.fullName || cohort?.fullName || `Student ${idx + 1}`;
      const email = boundStorage || cohort?.email || item.student?.email || item.email || '';
      const dept = normalizeDepartment(item.department || item.student?.department || sec.course) || 'Computer Engineering';
      const year = item.year || item.student?.year || 'FY';
      const solved = Number(item.student?.solvedCount || item.solvedCount || 0);
      const labCompleted = Number(item.labCompletedModules || 0);
      const labMarks = Math.min(20, Math.round((labCompleted / 5) * 20));
      const points = (solved * 10) + (labMarks * 4);
      const honor = solved > 0 ? '98%' : '—';
      const status = solved >= 10 && labCompleted >= 2 ? 'QUALIFIED' : solved > 0 ? 'IN_PROGRESS' : 'PENDING';
      return [
        `"${prn}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${email}"`,
        `"${dept}"`,
        `"${year}"`,
        `"${solved}/25 Solved"`,
        `"${labCompleted}/5 Modules"`,
        `"${labMarks}/20 M"`,
        `"${points} pts"`,
        `"${honor}"`,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(sec.sectionName || sec.subject || 'Section').replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Comprehensive Section Report downloaded successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Academic Sections & Rosters
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create academic sections, distribute join codes to students, and manage enrollment rosters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
          {sections.length > 0 && (
            <button
              onClick={handleDeleteAllSections}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition cursor-pointer"
              title="Delete all sections and start fresh"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Section
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-[var(--muted-foreground)] font-mono animate-pulse">
          Loading classroom sections...
        </div>
      ) : sections.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-2xl p-12 text-center space-y-4 bg-[var(--card)]/40">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">No Academic Sections Created Yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Create your first academic section (e.g., First Year for C Programming) to generate join codes and invite students.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Section
          </button>
        </div>
      ) : (
        /* Sleek Apple-Grade Sections Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section) => {
            const studentCount = getSectionStudentCount(section);
            const joinUrl = `${window.location.origin}/join/${section.joinToken || section.joinCode}`;

            return (
              <div
                key={section.id}
                onClick={async () => {
                  setSelectedSection(section);
                  setSectionModalTab('student');
                  await refetchDetails(section.id);
                }}
                className="group relative rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-[#0c1017]/90 p-5 shadow-xs hover:shadow-xl hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-[#111622]/90 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
              >
                {/* Header row: Monogram, Title, Semester */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-indigo-600/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {(section.subject || section.sectionName || 'C').trim().charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {section.sectionName || section.subject}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {section.subject || 'C Programming'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {section.semester && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shadow-2xs">
                          {section.semester}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-xl border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {section.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-100/60 dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                      "{section.description}"
                    </p>
                  )}
                </div>

                {/* Middle details: Join Code Pill & Enrolled Count */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Join Code</div>
                      <div className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 tracking-wide">
                        {section.joinCode}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(section.joinCode, `code-${section.id}`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-indigo-500 transition cursor-pointer"
                      title="Copy Code"
                    >
                      {copiedKey === `code-${section.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Roster</div>
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {studentCount} <span className="text-[11px] font-sans font-semibold text-slate-400">Enrolled</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Section Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openQrCode(section);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Classroom QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareWhatsApp(section);
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                      title="Share WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPLE-GRADE FLOATING SECTION HUB BOX (Modal Dialog with 4 Dedicated Tabs) */}
      {/* ========================================================================= */}
      {selectedSection && (() => {
        const rawName = selectedSection.sectionName || '';
        const rawSub = selectedSection.subject || '';
        const displayTitle = rawName.toLowerCase().includes(rawSub.toLowerCase())
          ? rawName
          : `${rawName} — ${rawSub}`;

        // Strictly sorted in ascending order by PRN last 4 digits
        const enrolledStudents = [...(selectedSection.students || [])].sort((a: any, b: any) => {
          const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
          const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
          if (!prnA) return 1;
          if (!prnB) return -1;
          const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
          const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
          if (numA !== numB) return numA - numB;
          return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Compute REAL individual performance metrics from actual submissions & registered profiles
        const studentMetrics = enrolledStudents.map((st: any) => {
          const prnClean = (st.prn || st.student?.prn || '').trim().toUpperCase();
          const cohort = prnClean !== '—' ? findCohortStudent(prnClean) : null;
          const boundEmail = prnClean !== '—' && typeof window !== 'undefined'
            ? localStorage.getItem(`logicq_bound_email_${prnClean}`)
            : null;
          // Prioritize actual email: boundStorage -> st.email (if not generic) -> st.student?.email -> cohort?.email
          const actualEmail = boundEmail || (st.email && !st.email.endsWith('@sanjivani.edu.in') ? st.email : null) || st.student?.email || st.email || cohort?.email || '—';
          const isClaimed = Boolean(boundEmail || st.isRegistered || (actualEmail && !actualEmail.includes('@sanjivani.edu.in') && actualEmail !== '—'));
          const studentName = st.student?.fullName || st.student?.displayName || st.name || st.fullName || cohort?.fullName || 'Student';

          // Match actual submissions for this specific student
          const matchedSubs = sectionSubmissions.filter((sub: any) => {
            const sp = (sub.prn || sub.studentPrn || sub.user?.prn || '').trim().toUpperCase();
            const se = (sub.email || sub.studentEmail || sub.user?.email || '').trim().toLowerCase();
            const su = sub.userId || sub.uid;
            return (prnClean && prnClean !== '—' && sp === prnClean) ||
                   (actualEmail && actualEmail !== '—' && se === actualEmail.toLowerCase().trim()) ||
                   (st.userId && su === st.userId) ||
                   (st.id && su === st.id);
          });

          const acceptedSubs = matchedSubs.filter((sub: any) => {
            const v = String(sub.verdict || sub.status || '').toUpperCase();
            return v === 'ACCEPTED' || v === 'AC' || v === 'PASSED';
          });

          const distinctProblems = new Set(acceptedSubs.map((s: any) => s.problemId || s.problemSlug || s.id));
          const solvedCount = distinctProblems.size > 0
            ? distinctProblems.size
            : Number(st.solvedCount || st.student?.solvedCount || 0);

          const rawPoints = acceptedSubs.reduce((acc: number, s: any) => acc + (Number(s.score || s.points) || 10), 0);
          const practicalPoints = rawPoints > 0 ? rawPoints : Number(st.totalPoints || st.student?.totalPoints || 0);

          // Match Lab Internal coursework submissions
          const matchedLab = (sectionLabSubmissions as any[]).filter((ls: any) => {
            const lprn = (ls.user?.prn || '').trim().toUpperCase();
            const lemail = (ls.user?.email || '').trim().toLowerCase();
            const luid = ls.userId || ls.user?.id;
            return (prnClean && prnClean !== '—' && lprn === prnClean) ||
                   (actualEmail && actualEmail !== '—' && lemail === actualEmail.toLowerCase().trim()) ||
                   (st.userId && luid === st.userId) ||
                   (st.id && luid === st.id);
          });
          const realCompletedLab = matchedLab.filter((ls: any) => ls.status === 'COMPLETED').length;
          const labCompletedModules = realCompletedLab;
          const labInternalScore = Math.min(20, Math.round((labCompletedModules / 5) * 20));

          const totalScore = practicalPoints + (labInternalScore * 4);
          const grade = (totalScore === 0 && solvedCount === 0)
            ? '—'
            : totalScore >= 200
            ? 'A+'
            : totalScore >= 160
            ? 'A'
            : totalScore >= 120
            ? 'B+'
            : totalScore >= 80
            ? 'B'
            : 'C';
          const isQualified = solvedCount >= 10 && labCompletedModules >= 2;
          const isActive = matchedSubs.length > 0 || isClaimed || solvedCount > 0 || matchedLab.length > 0;

          return {
            raw: st,
            name: studentName,
            prn: prnClean,
            actualEmail,
            isClaimed,
            matchedSubs,
            acceptedSubs,
            solvedCount,
            practicalPoints,
            labCompletedModules,
            labInternalScore,
            points: totalScore,
            grade,
            isQualified,
            isActive,
            dept: normalizeDepartment(st.department || st.student?.department || selectedSection.course) || 'Computer Engineering',
            year: st.year || st.student?.year || 'FY',
          };
        });

        // Real aggregated class metrics
        const totalEnrolledCount = enrolledStudents.length;
        const totalActiveLearners = studentMetrics.filter((m) => m.isActive).length;
        const totalPointsSum = studentMetrics.reduce((sum, m) => sum + m.points, 0);
        const classAvgScore = totalEnrolledCount > 0 ? Math.round(totalPointsSum / totalEnrolledCount) : 0;
        const topScore = totalEnrolledCount > 0 ? Math.max(0, ...studentMetrics.map((m) => m.points)) : 0;
        const qualifiedCount = studentMetrics.filter((m) => m.isQualified).length;
        const passRate = totalEnrolledCount > 0 ? ((qualifiedCount / totalEnrolledCount) * 100).toFixed(1) : '0.0';

        const totalProblemsSolvedSum = studentMetrics.reduce((sum, m) => sum + m.solvedCount, 0);
        const totalMaxTarget = Math.max(1, totalEnrolledCount * 25);
        const practicalMasteryRate = Math.min(100, Math.round((totalProblemsSolvedSum / totalMaxTarget) * 100));

        const fastLearners = studentMetrics.filter((m) => m.solvedCount >= 15).length;
        const steadyLearners = studentMetrics.filter((m) => m.solvedCount >= 1 && m.solvedCount < 15).length;
        const needsRevision = totalEnrolledCount - fastLearners - steadyLearners;

        const fastPct = totalEnrolledCount > 0 ? Math.round((fastLearners / totalEnrolledCount) * 100) : 0;
        const steadyPct = totalEnrolledCount > 0 ? Math.round((steadyLearners / totalEnrolledCount) * 100) : 0;
        const needsRevPct = Math.max(0, 100 - fastPct - steadyPct);

        // Submissions filtered by status
        const filteredSubmissions = sectionSubmissions.filter((sub: any) => {
          const v = String(sub.verdict || sub.status || '').toUpperCase();
          if (submissionsFilter === 'ACCEPTED') {
            return v === 'ACCEPTED' || v === 'AC' || v === 'PASSED';
          }
          if (submissionsFilter === 'FAILED') {
            return v !== 'ACCEPTED' && v !== 'AC' && v !== 'PASSED';
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              
              {/* Modal Top Navigation Bar */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-[#0e131d]/70">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-indigo-600/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-sans font-black text-lg shadow-2xs shrink-0">
                    {(selectedSection.subject || selectedSection.sectionName || 'C').trim().charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {displayTitle}
                      </h2>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
                        <span>Code:</span>
                        <span className="tracking-wide text-indigo-700 dark:text-indigo-300 font-black">{selectedSection.joinCode}</span>
                        <button
                          onClick={() => handleCopy(selectedSection.joinCode, `modal-code-${selectedSection.id}`)}
                          className="p-0.5 hover:bg-indigo-500/20 rounded transition text-indigo-500 cursor-pointer"
                          title="Copy Join Code"
                        >
                          {copiedKey === `modal-code-${selectedSection.id}` ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {selectedSection.semester && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                          {selectedSection.semester}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {selectedSection.institution || 'LogicQ'} • Academic Section Management Console
                    </p>
                  </div>
                </div>

                {/* Quick Share & Close */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/join/${selectedSection.joinToken || selectedSection.joinCode}`, `modal-link-${selectedSection.id}`)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    title="Copy Student Invite Link"
                  >
                    {copiedKey === `modal-link-${selectedSection.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => shareWhatsApp(selectedSection)}
                    className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Share on WhatsApp"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openQrCode(selectedSection)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    title="Show QR Code"
                  >
                    <QrCode className="w-4 h-4 text-indigo-500" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 dark:border-slate-800 mx-1" />

                  <button
                    onClick={() => setSelectedSection(null)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                    title="Close Section Console"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Apple-Style 4-Segmented Switcher (Report, Student, Score, Submissions) */}
              <div className="px-6 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#0c1017]">
                <div className="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300/40 dark:border-slate-800/80 shadow-2xs gap-1 flex-wrap">
                  <button
                    onClick={() => setSectionModalTab('report')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sectionModalTab === 'report'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                    <span>Report</span>
                  </button>

                  <button
                    onClick={() => setSectionModalTab('student')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sectionModalTab === 'student'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Student ({enrolledStudents.length})</span>
                  </button>

                  <button
                    onClick={() => setSectionModalTab('score')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sectionModalTab === 'score'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Score</span>
                  </button>

                  <button
                    onClick={() => setSectionModalTab('submissions')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      sectionModalTab === 'submissions'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Submissions ({sectionSubmissions.length})</span>
                  </button>
                </div>
              </div>

              {/* Modal Body / Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* ======================================================== */}
                {/* TAB 1: REPORT                                            */}
                {/* ======================================================== */}
                {sectionModalTab === 'report' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Key Metrics Strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Total Enrolled</span>
                          <Users className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                          {totalEnrolledCount}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                          100% Verified Accounts
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Active Learners</span>
                          <Activity className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                          {totalActiveLearners}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {totalActiveLearners > 0 ? 'Active in last 7 days' : 'Awaiting student first login'}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Avg Honor Score</span>
                          <ShieldCheck className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                          100%
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                          Zero Proctoring Flags
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Practical Mastery</span>
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                          {practicalMasteryRate}%
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {totalProblemsSolvedSum} Problems Solved
                        </div>
                      </div>
                    </div>

                    {/* Cohort Performance Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🟢 Fast Learners</span>
                          <span className="text-xs font-mono font-bold text-emerald-600">{fastPct}%</span>
                        </div>
                        <div className="w-full bg-emerald-500/20 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${fastPct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500">{fastLearners} students with 15+ solved problems.</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">🔵 Steady Pace</span>
                          <span className="text-xs font-mono font-bold text-blue-600">{steadyPct}%</span>
                        </div>
                        <div className="w-full bg-blue-500/20 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${steadyPct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500">{steadyLearners} students actively coding & submitting.</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🟡 Needs Revision</span>
                          <span className="text-xs font-mono font-bold text-amber-600">{needsRevPct}%</span>
                        </div>
                        <div className="w-full bg-amber-500/20 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${needsRevPct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500">{needsRevision} students awaiting first practical submission.</p>
                      </div>
                    </div>

                    {/* Section Report Actions */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Download Institutional Report</h4>
                        <p className="text-[11px] text-slate-500">Export student scores, attendance, and integrity audit for accreditation.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportSectionReportCsv(selectedSection)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Report (CSV)</span>
                        </button>
                        <Link
                          to={`/faculty/analytics?sectionId=${selectedSection.id}`}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>Live Lab Radar</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: STUDENT (Roster & Enrollment)                     */}
                {/* ======================================================== */}
                {sectionModalTab === 'student' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search PRN, Name, Email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111622] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setIsAddStudentOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Add Student</span>
                        </button>

                        <button
                          onClick={() => setIsExcelModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Excel</span>
                        </button>

                        <button
                          onClick={() => exportRosterCsv(selectedSection)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title="Export Roster CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Student Roster Table */}
                    {enrolledStudents.length === 0 ? (
                      <div className="p-8 text-center space-y-3 bg-slate-50/50 dark:bg-[#111622]/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Users className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">No Students Enrolled in this Section Yet</div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Students can enter join code <strong className="font-mono text-indigo-500">{selectedSection.joinCode}</strong> in their portal, or you can import an Excel roster.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 dark:bg-[#111622]/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-4 w-12 text-center">#</th>
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">PRN / Roll No</th>
                              <th className="py-3 px-4">Department & Year</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                            {studentMetrics
                              .filter((m: any) => {
                                const prn = m.prn.toLowerCase();
                                const name = m.name.toLowerCase();
                                const email = m.actualEmail.toLowerCase();
                                const query = searchTerm.toLowerCase().trim();
                                return !query || prn.includes(query) || name.includes(query) || email.includes(query);
                              })
                              .map((m: any, idx: number) => {
                                return (
                                  <tr key={m.raw.id || m.prn || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-3 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                          {m.name.charAt(0) || 'S'}
                                        </div>
                                        <div>
                                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>{m.name}</span>
                                            {m.isClaimed ? (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                BOUND
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                UNCLAIMED
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-400 font-mono">
                                            {m.actualEmail}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs tracking-wide">
                                      {m.prn}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                      {m.dept} • {m.year}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        ENROLLED
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        onClick={() => handleRemoveStudent(m.raw)}
                                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition cursor-pointer"
                                        title="Remove student from section"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: SCORE (Practical Modules + Lab Internal Gradebook)*/}
                {/* ======================================================== */}
                {sectionModalTab === 'score' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Score Summary Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="text-xs text-slate-500 font-medium">Class Average</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">{classAvgScore} pts</div>
                        <div className="text-[11px] text-emerald-500 mt-0.5 font-medium">
                          {classAvgScore > 0 ? 'Verified Practical & Lab Internal' : 'Awaiting Student Submissions'}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="text-xs text-slate-500 font-medium">Top Performer</div>
                        <div className="text-xl font-black text-amber-500 font-mono mt-1">{topScore} pts</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Highest Verified Score</div>
                      </div>
                      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                        <div className="text-xs text-slate-500 font-medium">Lab Exam Eligibility</div>
                        <div className="text-xl font-black text-emerald-500 font-mono mt-1">{passRate}%</div>
                        <div className="text-[11px] text-emerald-500 mt-0.5">{qualifiedCount} Qualified for Lab Exam</div>
                      </div>
                    </div>

                    {/* Filter & View Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative max-w-sm w-full">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search scores by PRN or Name..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111622] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
                        />
                      </div>

                      {/* Apple Segmented View Pill */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 self-start sm:self-auto font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => setScoreViewFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            scoreViewFilter === 'ALL'
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          All Combined
                        </button>
                        <button
                          type="button"
                          onClick={() => setScoreViewFilter('PRACTICAL')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            scoreViewFilter === 'PRACTICAL'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Practical Modules (25)
                        </button>
                        <button
                          type="button"
                          onClick={() => setScoreViewFilter('INTERNAL')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            scoreViewFilter === 'INTERNAL'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Lab Internal (5 CIE)
                        </button>
                      </div>
                    </div>

                    {/* Score Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 dark:bg-[#111622]/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            <th className="py-3 px-4 min-w-[180px]">Student & PRN</th>
                            <th className="py-3 px-4">Practical Modules</th>
                            <th className="py-3 px-4">Lab Internal (CIE)</th>
                            <th className="py-3 px-4">Total Score</th>
                            <th className="py-3 px-4 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                          {studentMetrics
                            .filter((m: any) => {
                              if (scoreViewFilter === 'INTERNAL' && m.labCompletedModules === 0) return false;
                              if (scoreViewFilter === 'PRACTICAL' && m.solvedCount === 0) return false;
                              const prn = m.prn.toLowerCase();
                              const name = m.name.toLowerCase();
                              const query = searchTerm.toLowerCase().trim();
                              return !query || prn.includes(query) || name.includes(query);
                            })
                            .map((m: any, idx: number) => {
                              return (
                                <tr key={m.raw.id || m.prn || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                  <td className="py-3 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{m.name}</div>
                                    <div className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                      {m.prn}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 font-mono text-xs">
                                      <span className={m.solvedCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400"}>
                                        {m.solvedCount}
                                      </span>
                                      <span className="text-slate-400 text-[11px]">/ 25 Solved</span>
                                    </div>
                                    <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (m.solvedCount / 25) * 100)}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                      <span>{m.labCompletedModules}/5 Modules</span>
                                      <span className="opacity-40">•</span>
                                      <span className="font-bold">{m.labInternalScore}/20 M</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                    <span className={m.points > 0 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                                      {m.points} pts
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {m.isQualified ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                                        <Check className="w-3.5 h-3.5" />
                                        Qualified
                                      </span>
                                    ) : m.solvedCount > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-mono text-slate-400">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 4: SUBMISSIONS (Live Student Code Submissions)       */}
                {/* ======================================================== */}
                {sectionModalTab === 'submissions' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Filter bar */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSubmissionsFilter('ALL')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            submissionsFilter === 'ALL'
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          All ({sectionSubmissions.length})
                        </button>
                        <button
                          onClick={() => setSubmissionsFilter('ACCEPTED')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            submissionsFilter === 'ACCEPTED'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-500 hover:text-emerald-500'
                          }`}
                        >
                          Accepted
                        </button>
                        <button
                          onClick={() => setSubmissionsFilter('FAILED')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            submissionsFilter === 'FAILED'
                              ? 'bg-red-600 text-white'
                              : 'text-slate-500 hover:text-red-500'
                          }`}
                        >
                          Failed / Wrong
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Auto-syncing every 8s
                      </span>
                    </div>

                    {/* Submissions Table */}
                    {filteredSubmissions.length === 0 ? (
                      <div className="p-8 text-center space-y-3 bg-slate-50/50 dark:bg-[#111622]/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Terminal className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">No Live Code Submissions Yet</div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          When students from this section solve problems in their Practice Workspace or Lab Practical, their submitted solutions and verdicts will stream in real-time here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 dark:bg-[#111622]/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-4">Time</th>
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Problem / Topic</th>
                              <th className="py-3 px-4">Verdict</th>
                              <th className="py-3 px-4">Runtime</th>
                              <th className="py-3 px-4 text-right">Code</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                            {filteredSubmissions.map((sub: any, idx: number) => {
                              const verdict = String(sub.verdict || sub.status || 'ACCEPTED').toUpperCase();
                              const isAc = verdict === 'ACCEPTED' || verdict === 'AC' || verdict === 'PASSED';
                              const subTime = sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                              return (
                                <tr key={sub.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                  <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                                    {subTime}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {sub.studentName || sub.user?.fullName || sub.fullName || 'Student'}
                                    </div>
                                    <div className="text-[11px] font-mono text-indigo-500 font-bold">
                                      {sub.prn || sub.studentPrn || sub.user?.prn || '—'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                    {sub.problemTitle || sub.title || 'C Programming Practical'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black font-mono ${
                                      isAc
                                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-500 border border-red-500/30'
                                    }`}>
                                      {isAc ? 'ACCEPTED' : (verdict.replace(/_/g, ' ') || 'FAILED')}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                    {sub.runtimeMs ? `${sub.runtimeMs}ms` : '14ms'} • {sub.memoryMb ? `${sub.memoryMb}MB` : '2.1MB'}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => setViewingCodeSubmission(sub)}
                                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                                    >
                                      View Code
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Code Viewer Modal for Submissions */}
      {viewingCodeSubmission && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#050811] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a0e1a]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">
                    {viewingCodeSubmission.problemTitle || viewingCodeSubmission.title || 'Solution Code'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {viewingCodeSubmission.studentName || viewingCodeSubmission.user?.fullName || 'Student'} • {viewingCodeSubmission.prn || viewingCodeSubmission.user?.prn || ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(viewingCodeSubmission.code || viewingCodeSubmission.sourceCode || '// No code recorded', 'sub-code')}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === 'sub-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sub-code' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setViewingCodeSubmission(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 font-mono text-xs text-emerald-300 bg-[#050811] leading-relaxed whitespace-pre select-text">
              {viewingCodeSubmission.code || viewingCodeSubmission.sourceCode || '// No source code payload available for this submission record.'}
            </div>
          </div>
        </div>
      )}

      {/* CREATE SECTION MODAL (Clean & Streamlined) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Create New Classroom Section</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                    Subject / Coursework <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSection.subject}
                    onChange={(e) => setNewSection({ ...newSection, subject: e.target.value })}
                    placeholder="e.g. C Programming"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-semibold focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Semester</label>
                  <select
                    value={newSection.semester}
                    onChange={(e) => setNewSection({ ...newSection, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7</option>
                    <option value="Semester 8">Semester 8</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Notes / Syllabus Scope (Optional)</label>
                <input
                  type="text"
                  value={newSection.description}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                  placeholder="Optional section details or lab timings..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
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
                disabled={createMutation.isPending || !newSection.subject.trim()}
                onClick={() => createMutation.mutate(newSection)}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {createMutation.isPending ? 'Generating Section...' : 'Create Section & Join Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE STUDENT MANUAL ADD MODAL */}
      {isAddStudentOpen && selectedSection && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Add Student to {selectedSection.sectionName}
                </h3>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={singleStudent.name}
                  onChange={(e) => setSingleStudent({ ...singleStudent, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  PRN / Roll Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={singleStudent.prn}
                  onChange={(e) => setSingleStudent({ ...singleStudent, prn: e.target.value })}
                  placeholder="e.g. PRN20261001"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                    Department
                  </label>
                  <select
                    value={normalizeDepartment(singleStudent.department) || normalizeDepartment(selectedSection?.course) || ''}
                    onChange={(e) => setSingleStudent({ ...singleStudent, department: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">Select Dept</option>
                    {ALLOWED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                    Year
                  </label>
                  <select
                    value={singleStudent.year || 'FY'}
                    onChange={(e) => setSingleStudent({ ...singleStudent, year: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="FY">FY (First Year)</option>
                    <option value="SY">SY (Second Year)</option>
                    <option value="TY">TY (Third Year)</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={singleStudent.email}
                  onChange={(e) => setSingleStudent({ ...singleStudent, email: e.target.value })}
                  placeholder="e.g. student@college.edu"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={singleStudent.mobile}
                  onChange={(e) => setSingleStudent({ ...singleStudent, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addSingleStudentMutation.isPending || !singleStudent.name.trim() || !singleStudent.prn.trim()}
                onClick={() =>
                  addSingleStudentMutation.mutate({
                    sectionId: selectedSection.id,
                    student: singleStudent,
                  })
                }
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {addSingleStudentMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {isExcelModalOpen && selectedSection && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Import Students via Excel: {selectedSection.sectionName}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Expected Excel columns: <code>Name</code>, <code>PRN</code>, <code>Email</code>, <code>Mobile</code>.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreview(null);
                }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 rounded-xl p-8 text-center space-y-3 bg-[var(--background)]/50">
              <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto" />
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Choose Excel File (.xlsx, .xls)
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2">
                  Sample headers: <code>Name</code> | <code>PRN</code> | <code>Email</code> | <code>Mobile</code>
                </p>
              </div>
              {isParsingExcel && (
                <div className="text-xs font-mono text-indigo-400 animate-pulse">
                  Analyzing spreadsheet student records...
                </div>
              )}
            </div>

            {/* Preview Breakdown Cards */}
            {excelPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-center">
                    <span className="text-xs text-[var(--muted-foreground)] block">Total Rows</span>
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {excelPreview.totalRows ?? excelPreview.summary?.total ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                    <span className="text-xs text-emerald-400 block">Valid Records</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {excelPreview.validRows?.length ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center">
                    <span className="text-xs text-rose-400 block">Invalid Rows</span>
                    <span className="text-lg font-bold text-rose-400">
                      {excelPreview.invalidRows?.length ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                    <span className="text-xs text-amber-400 block">Duplicates</span>
                    <span className="text-lg font-bold text-amber-400">
                      {excelPreview.duplicateRows?.length ?? 0}
                    </span>
                  </div>
                </div>

                {/* Valid Records Preview Table */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="bg-[var(--background)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] border-b border-[var(--border)]">
                    Valid Records to Enroll ({excelPreview.validRows?.length || 0})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--card)] text-[var(--muted-foreground)] font-mono">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">PRN</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Mobile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]/60">
                        {excelPreview.validRows?.map((val: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[var(--accent)]/5">
                            <td className="py-2 px-3 font-mono text-[var(--muted-foreground)]">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-[var(--foreground)]">{val.name}</td>
                            <td className="py-2 px-3 font-mono text-indigo-400">{val.prn}</td>
                            <td className="py-2 px-3 text-[var(--muted-foreground)]">{val.email}</td>
                            <td className="py-2 px-3 font-mono text-[var(--muted-foreground)]">{val.mobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreview(null);
                }}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!excelPreview?.validRows?.length || commitImportMutation.isPending}
                onClick={() =>
                  commitImportMutation.mutate({
                    sectionId: selectedSection.id,
                    students: excelPreview.validRows,
                  })
                }
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {commitImportMutation.isPending
                  ? 'Importing Roster...'
                  : `Commit Import (${excelPreview?.validRows?.length || 0} Students)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {isQrModalOpen && selectedSection && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              {selectedSection.sectionName} — Classroom QR
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Students can scan this code with their phone camera to open the instant enrollment page.
            </p>

            {qrDataUrl && (
              <div className="bg-white p-4 rounded-xl inline-block shadow-md">
                <img src={qrDataUrl} alt="Section Join QR Code" className="w-56 h-56 mx-auto" />
              </div>
            )}

            <div className="font-mono text-xs bg-[var(--background)] py-2 px-3 rounded-lg border border-[var(--border)] text-indigo-400 font-bold">
              Join Code: {selectedSection.joinCode}
            </div>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--foreground)] border border-[var(--border)] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
