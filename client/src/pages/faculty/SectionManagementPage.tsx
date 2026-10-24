import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
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
  X,
  Sparkles,
} from 'lucide-react';

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
  });

  // Excel Preview State
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // New Section Form State (Clean placeholders, no annoying forced Sanjivani defaults)
  const [newSection, setNewSection] = useState({
    sectionName: '',
    subject: '',
    course: 'B.Tech Computer Science & Engineering',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    institution: 'Sanjivani University',
    description: '',
  });

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
        const key = s.joinCode || s.id;
        if (key) sectionMap.set(key, s);
      });

      // 2. Put / overlay Firestore sections
      firestoreSections.forEach((s: any) => {
        const key = s.joinCode || s.id;
        if (key) {
          const existing = sectionMap.get(key) || {};
          sectionMap.set(key, { ...existing, ...s });
        }
      });

      // Filter out any section that was deleted
      const mergedList = Array.from(sectionMap.values()).filter(
        (s) => !FirestoreDataService.isSectionDeleted(s.id, s.joinCode)
      );

      // 3. Auto-restore missing Firestore sections to backend (SKIP deleted sections)
      for (const fsSec of firestoreSections) {
        if (FirestoreDataService.isSectionDeleted(fsSec.id, fsSec.joinCode)) {
          continue;
        }
        const existsInBackend = backendList.some((b: any) => b.joinCode === fsSec.joinCode || b.id === fsSec.id);
        if (!existsInBackend && fsSec.sectionName && fsSec.subject) {
          api.post('/sections', fsSec).catch(() => {});
        }
      }

      return mergedList;
    },
  });

  const sections: SectionItem[] = Array.isArray(data) ? data : [];

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof newSection) => {
      if (!payload.sectionName.trim()) {
        throw new Error('Section / Division Name is required (e.g. Div A).');
      }
      if (!payload.subject.trim()) {
        throw new Error('Subject Name is required (e.g. C Programming).');
      }

      let createdSection: any = null;
      try {
        const res = await api.post('/sections', payload);
        createdSection = res.data || res.section || res;
      } catch (err) {
        console.warn('Backend section creation failed, saving to Firestore:', err);
        createdSection = {
          ...payload,
          id: `sec_${Date.now()}`,
          joinCode: `LQ-${Math.random().toString(36).slice(-4).toUpperCase()}`,
          joinToken: crypto.randomUUID(),
          isActive: true,
          createdAt: new Date().toISOString(),
        };
      }
      if (createdSection) {
        await FirestoreDataService.saveSectionToFirestore(createdSection);
      }
      return createdSection;
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'Section created successfully!');
      setIsCreateOpen(false);
      setNewSection({
        sectionName: '',
        subject: '',
        course: 'B.Tech Computer Science & Engineering',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        institution: 'Sanjivani University',
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
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
      setSingleStudent({ name: '', prn: '', email: '', mobile: '' });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      if (selectedSection) {
        refetchDetails(selectedSection.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add student.');
    },
  });

  const refetchDetails = async (id: string) => {
    try {
      const res = await api.get(`/sections/${id}`);
      if (res?.section || res?.data) {
        const sec = res.section || res.data;
        if (!sec.students || sec.students.length === 0) {
          const fsStudents = await FirestoreDataService.getEnrolledStudentsForSection(id);
          if (fsStudents.length > 0) {
            sec.students = fsStudents;
          }
        }
        setSelectedSection(sec);
        return;
      }
    } catch (err) {
      console.warn('Backend /sections/:id failed, falling back to Firestore/local:', err);
    }

    const localSec = sections.find((s) => s.id === id);
    if (localSec) {
      const fsStudents = await FirestoreDataService.getEnrolledStudentsForSection(id);
      setSelectedSection({
        ...localSec,
        students: fsStudents,
      });
    }
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
                Create classroom divisions, distribute join codes to students, and manage enrollment rosters.
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
            Create your first course division (e.g., Div A for C Programming) to generate join codes and invite students.
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
            const studentCount = section._count?.students ?? section.students?.length ?? 0;
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
                      {/* Stylized Division Badge */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-indigo-400 text-sm shadow-inner shrink-0">
                        {(section.sectionName || section.subject || 'SEC').slice(0, 5).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--foreground)] line-clamp-1">
                          {section.subject}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                          {section.course || 'Engineering'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-[var(--muted-foreground)] block">
                        {section.academicYear}
                      </span>
                      <span className="text-[11px] text-indigo-400/90 font-medium block">
                        {section.semester}
                      </span>
                    </div>
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
      {selectedSection && !isExcelModalOpen && !isAddStudentOpen && (
        <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] p-6 space-y-6 shadow-xl animate-in fade-in">
          {/* Roster Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono">
                {(selectedSection.sectionName || selectedSection.subject || 'SEC').slice(0, 3).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    {selectedSection.sectionName} — {selectedSection.subject}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Code: {selectedSection.joinCode}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedSection.course} • {selectedSection.semester} ({selectedSection.academicYear})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search PRN, Name, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono w-52"
                />
              </div>

              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Student
              </button>

              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Excel Import
              </button>

              <button
                onClick={() => exportRosterCsv(selectedSection)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                title="Export Roster to CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setSelectedSection(null)}
                className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition cursor-pointer"
                title="Close Roster"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Roster Table or Empty State */}
          {!selectedSection.students || selectedSection.students.length === 0 ? (
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
                  onClick={() => handleCopy(window.location.origin + '/join/' + (selectedSection.joinCode || ''), 'link-' + selectedSection.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Join Link
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">PRN / Roll No</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Enrolled Via</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 font-sans">
                  {selectedSection.students
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
                      const studentMobile = item.student?.mobile || item.mobile || '—';
                      const accountState = item.student?.accountState || item.status || 'ACTIVE';

                      return (
                        <tr key={item.id || studentPrn || idx} className="hover:bg-[var(--accent)]/5">
                          <td className="py-2.5 px-4 font-mono text-[var(--muted-foreground)]">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-[var(--foreground)]">{studentName}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{studentPrn}</td>
                          <td className="py-2.5 px-4 text-[var(--muted-foreground)]">{studentEmail}</td>
                          <td className="py-2.5 px-4 font-mono text-[var(--muted-foreground)]">{studentMobile}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                accountState === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {accountState === 'ACTIVE' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {accountState}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                            {item.joinedVia || 'ROSTER'}
                          </td>
                          <td className="py-2.5 px-4 text-[var(--muted-foreground)]">
                            {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString() : 'Active'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                    Section / Division Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSection.sectionName}
                    onChange={(e) => setNewSection({ ...newSection, sectionName: e.target.value })}
                    placeholder="e.g. Div A, Batch B1"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-semibold focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">
                  Department / Degree Program
                </label>
                <input
                  type="text"
                  value={newSection.course}
                  onChange={(e) => setNewSection({ ...newSection, course: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science & Engineering"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newSection.academicYear}
                    onChange={(e) => setNewSection({ ...newSection, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Semester</label>
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
                disabled={createMutation.isPending || !newSection.sectionName.trim() || !newSection.subject.trim()}
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
