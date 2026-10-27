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
} from 'lucide-react';
import { ALLOWED_DEPARTMENTS, ALLOWED_YEARS, normalizeDepartment } from '../../config/academic.config.js';

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

      // Merge both backend & Firestore: Map by joinCode or id
      const sectionMap = new Map<string, SectionItem>();

      // 1. Put backend sections
      backendList.forEach((s: any) => {
        if (!FirestoreDataService.isLegacyDemoSection(s)) {
          const key = s.joinCode || s.id;
          if (key) sectionMap.set(key, s);
        }
      });

      // 2. Put / overlay Firestore sections
      firestoreSections.forEach((fs: any) => {
        if (!FirestoreDataService.isLegacyDemoSection(fs)) {
          const key = fs.joinCode || fs.id;
          if (key) {
            const existing: any = sectionMap.get(key) || {};
            const mergedStudents = (Array.isArray(fs.students) && fs.students.length > 0)
              ? fs.students
              : (Array.isArray(existing.students) && existing.students.length > 0 ? existing.students : []);
            const studentCountVal = Math.max(
              mergedStudents.length,
              fs.studentsCount || 0,
              fs._count?.students || 0,
              existing._count?.students || 0
            );
            sectionMap.set(key, {
              ...existing,
              ...fs,
              students: mergedStudents,
              studentsCount: studentCountVal,
              _count: { students: studentCountVal },
            });
          }
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
        institution: 'Sanjivani University',
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
        await api.delete(`/sections/${sec.id}`);
      } catch (err: any) {
        console.warn('Backend delete /sections failed (may only exist in Firestore):', err);
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Section deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      if (selectedSection?.id) {
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

    const localSec = sections.find((s) => s.id === id || s.joinCode === id) || backendSec;
    const fsStudents = await FirestoreDataService.getEnrolledStudentsForSection(id);

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
        s.id === id || s.joinCode === updated.joinCode
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
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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
    const list = sec.students || [];
    if (list.length === 0) {
      toast.error('No enrolled students to export.');
      return;
    }

    const headers = ['Student Name', 'PRN / Roll No', 'Email', 'Mobile', 'Status', 'Enrolled At'];
    const rows = list.map((item: any) => {
      const name = item.student?.fullName || item.student?.displayName || item.name || item.fullName || 'Student';
      const prn = item.prn || item.student?.prn || '';
      const email = item.student?.email || item.email || '';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const studentCount = getSectionStudentCount(section);
            const joinUrl = `${window.location.origin}/join/${section.joinToken || section.joinCode}`;

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4 hover:border-indigo-500/40 transition shadow-sm flex flex-col justify-between"
              >
                {/* Top Section Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Stylized 1-Letter Monogram Badge */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-sans font-black text-indigo-400 dark:text-indigo-300 text-lg shadow-sm shrink-0">
                        {(section.subject || section.sectionName || 'C').trim().charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--foreground)] line-clamp-1">
                          {section.sectionName || section.subject}
                        </h3>
                      </div>
                    </div>

                    {section.semester && (
                      <div className="text-right shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium inline-block">
                          {section.semester}
                        </span>
                      </div>
                    )}
                  </div>

                  {section.description && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 italic bg-[var(--background)]/50 p-2 rounded-lg border border-[var(--border)]/50">
                      "{section.description}"
                    </p>
                  )}
                </div>

                {/* Join Code Box */}
                <div className="bg-[var(--background)] rounded-xl p-3 border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">
                      Student Join Code
                    </span>
                    <button
                      onClick={() => handleCopy(section.joinCode, `code-${section.id}`)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono font-bold text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                      title="Click to copy Join Code"
                    >
                      {section.joinCode}
                      {copiedKey === `code-${section.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Share buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border)]/60">
                    <button
                      onClick={() => handleCopy(joinUrl, `link-${section.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                      title="Copy Student Invite URL"
                    >
                      {copiedKey === `link-${section.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => openQrCode(section)}
                      className="p-1.5 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                      title="Show QR Code for Projector / Classroom"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareWhatsApp(section)}
                      className="p-1.5 text-xs rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition cursor-pointer"
                      title="Share Section on WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-[var(--foreground)] text-sm">{studentCount}</span>
                    <span className="text-[var(--muted-foreground)]">Enrolled</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/faculty/analytics?sectionId=${section.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
                      title="View Section Analytics & Student Insights"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </Link>

                    <button
                      onClick={async () => {
                        await refetchDetails(section.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                      title="Open Student Roster"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Roster</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSection(section);
                        setIsExcelModalOpen(true);
                      }}
                      className="p-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                      title="Import Students from Excel"
                    >
                      <Upload className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteSection(section)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-xs rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SELECTED SECTION ROSTER MODAL / DRAWER */}
      {selectedSection && !isExcelModalOpen && !isAddStudentOpen && (() => {
        const rawName = selectedSection.sectionName || '';
        const rawSub = selectedSection.subject || '';
        const displayTitle = rawName.toLowerCase().includes(rawSub.toLowerCase())
          ? rawName
          : `${rawName} — ${rawSub}`;
        const enrolledStudents = selectedSection.students || [];

        return (
          <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] p-6 space-y-6 shadow-xl animate-in fade-in">
            {/* Roster Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-indigo-600/20 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black font-sans text-xl shadow-sm shrink-0">
                  {(selectedSection.subject || selectedSection.sectionName || 'C').trim().charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                      {displayTitle}
                    </h2>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs">
                      <span className="text-[10px] uppercase font-bold text-indigo-400/80">Code:</span>
                      <strong className="tracking-wide text-indigo-300 font-black">{selectedSection.joinCode}</strong>
                      <button
                        onClick={() => handleCopy(selectedSection.joinCode, `code-${selectedSection.id}`)}
                        className="p-1 hover:bg-indigo-500/20 rounded transition text-indigo-400 cursor-pointer"
                        title="Copy Join Code"
                      >
                        {copiedKey === `code-${selectedSection.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {selectedSection.semester && (
                    <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium text-[11px]">
                        {selectedSection.semester}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Roster Quick Action Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCopy(`${window.location.origin}/join/${selectedSection.joinToken || selectedSection.joinCode}`, `link-${selectedSection.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer shadow-sm"
                  title="Copy Student Direct Join Link"
                >
                  {copiedKey === `link-${selectedSection.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copy Join Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => shareWhatsApp(selectedSection)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer shadow-sm"
                  title="Share Join Link on WhatsApp"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  WhatsApp
                </button>

                <button
                  onClick={() => openQrCode(selectedSection)}
                  className="p-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
                  title="Show Classroom QR Code"
                >
                  <QrCode className="w-4 h-4 text-indigo-400" />
                </button>

                <div className="h-5 w-px bg-[var(--border)] mx-1" />

                <button
                  onClick={() => setSelectedSection(null)}
                  className="p-2 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition cursor-pointer"
                  title="Close Roster"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-[var(--muted-foreground)]">Enrolled Students</div>
                  <div className="text-lg font-black text-[var(--foreground)] font-mono">
                    {enrolledStudents.length}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-[var(--muted-foreground)]">Enrollment Status</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active & Accepting
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-[var(--muted-foreground)]">Join Key</div>
                  <div className="text-sm font-black text-indigo-400 font-mono tracking-wider">
                    {selectedSection.joinCode}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold font-mono text-xs">
                  LQ
                </div>
              </div>
            </div>

            {/* Actions & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search PRN, Name, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-sans"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
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
                  + Add Student
                </button>

                <button
                  onClick={() => setIsExcelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Excel
                </button>

                <Link
                  to={`/faculty/analytics?sectionId=${selectedSection.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition cursor-pointer"
                  title="Inspect Section Analytics & Submissions"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Analytics
                </Link>

                <button
                  onClick={() => exportRosterCsv(selectedSection)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                  title="Export Roster to CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Roster Table or Empty State */}
            {enrolledStudents.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-[var(--background)]/40 rounded-xl border border-dashed border-[var(--border)]">
                <Users className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
                <div className="text-sm font-semibold text-[var(--foreground)]">No Students Enrolled in this Section Yet</div>
                <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
                  Students can enter join code <strong className="font-mono text-indigo-400">{selectedSection.joinCode}</strong> in their portal, or you can import a roster.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Add Single Student
                  </button>
                  <button
                    onClick={() => setIsExcelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Excel File
                  </button>
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/join/${selectedSection.joinCode || ''}`, 'link-' + selectedSection.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Join Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)]/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">PRN / Roll No</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Coding Progress</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]/60 font-sans">
                    {enrolledStudents
                      .filter((s: any) => {
                        const prn = (s.prn || s.student?.prn || '').toLowerCase();
                        const name = (s.student?.fullName || s.student?.displayName || s.name || s.fullName || '').toLowerCase();
                        const email = (s.student?.email || s.email || '').toLowerCase();
                        const query = searchTerm.toLowerCase().trim();
                        return !query || prn.includes(query) || name.includes(query) || email.includes(query);
                      })
                      .map((item: any, idx: number) => {
                        const studentName = item.student?.fullName || item.student?.displayName || item.name || item.fullName || 'Student';
                        const studentPrn = item.prn || item.student?.prn || '—';
                        const studentEmail = item.student?.email || item.email || '—';
                        const points = Number(item.student?.totalPoints || item.totalPoints || 0);
                        const streak = Number(item.student?.currentStreak || item.currentStreak || 0);

                        return (
                          <tr key={item.id || studentPrn || idx} className="hover:bg-[var(--accent)]/5 transition">
                            <td className="py-3 px-4 font-mono text-[var(--muted-foreground)] text-center">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {studentName.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <div className="font-semibold text-[var(--foreground)]">{studentName}</div>
                                  <div className="text-[11px] text-[var(--muted-foreground)] font-mono">{studentEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400 text-xs tracking-wide">
                              {studentPrn}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                ENROLLED
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                                  {points} pts
                                </span>
                                {streak > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    🔥 {streak}d
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleRemoveStudent(item)}
                                className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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
        );
      })()}

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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
