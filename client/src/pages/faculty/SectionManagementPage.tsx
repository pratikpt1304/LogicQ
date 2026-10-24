import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
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
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
  Award,
} from 'lucide-react';

interface StudentRosterItem {
  id: string;
  prn: string;
  status: string;
  joinedVia: string;
  enrolledAt: string;
  student: {
    id: string;
    fullName: string;
    displayName: string | null;
    email: string;
    mobile: string | null;
    accountState: string;
  };
}

interface SectionItem {
  id: string;
  institution: string;
  course: string;
  subject: string;
  academicYear: string;
  semester: string;
  sectionName: string;
  joinCode: string;
  joinToken: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { students: number };
  students?: StudentRosterItem[];
}

export const SectionManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Excel Preview State
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // New Section Form State
  const [newSection, setNewSection] = useState({
    institution: 'Sanjivani University of Engineering',
    course: 'B.Tech Computer Science & Engineering',
    subject: 'Data Structures & Algorithms',
    academicYear: '2026-2027',
    semester: 'Semester 3',
    sectionName: 'Div A',
    description: '',
  });

  // Fetch sections
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['faculty-sections'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.sections || res.data || [];
    },
  });

  const sections: SectionItem[] = Array.isArray(data) ? data : [];

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof newSection) => {
      return await api.post('/sections', payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Section created successfully!');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create section.');
    },
  });

  // Excel commit mutation
  const commitImportMutation = useMutation({
    mutationFn: async ({ sectionId, students }: { sectionId: string; students: any[] }) => {
      return await api.post(`/sections/${sectionId}/import-students`, { students });
    },
    onSuccess: (res) => {
      toast.success(`Import complete! ${res.newlyEnrolled} students enrolled.`);
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

  const refetchDetails = async (id: string) => {
    try {
      const res = await api.get(`/sections/${id}`);
      if (res.section || res.data) {
        setSelectedSection(res.section || res.data);
      }
    } catch {
      // ignore
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openQrCode = async (section: SectionItem) => {
    const joinUrl = `${window.location.origin}/join/${section.joinToken}`;
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
    const joinUrl = `${window.location.origin}/join/${section.joinToken}`;
    const text = encodeURIComponent(
      `Hello Students! Please join the official LogicQ section for *${section.subject}* (${section.sectionName}):\n\nJoin Code: *${section.joinCode}*\nJoin Link: ${joinUrl}\n\nPlease complete your Email & Mobile OTP validation to activate your account.`
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Section Management & Student Enrollment
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create academic sections, import rosters via Excel, and share Instant Join links with Email OTP validation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create Section
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-[var(--muted-foreground)] font-mono animate-pulse">
          Loading faculty sections...
        </div>
      ) : sections.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">No Academic Sections Yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Create your first course section to generate unique join codes, share instant join links, and upload student rosters.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-4 h-4" />
            Create First Section
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const studentCount = section._count?.students ?? section.students?.length ?? 0;
            const joinUrl = `${window.location.origin}/join/${section.joinToken}`;

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 hover:border-indigo-500/40 transition shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      {section.sectionName}
                    </span>
                    <h3 className="text-lg font-bold text-[var(--foreground)] mt-2 line-clamp-1">
                      {section.subject}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">{section.course}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-[var(--muted-foreground)] block">
                      {section.academicYear}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)] block">{section.semester}</span>
                  </div>
                </div>

                {/* Join Code & Quick Share Box */}
                <div className="bg-[var(--background)]/80 rounded-xl p-3.5 border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)] font-medium">Join Code</span>
                    <button
                      onClick={() => handleCopy(section.joinCode, `code-${section.id}`)}
                      className="flex items-center gap-1.5 font-mono font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      {section.joinCode}
                      {copiedKey === `code-${section.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]/60">
                    <button
                      onClick={() => handleCopy(joinUrl, `link-${section.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)]"
                    >
                      {copiedKey === `link-${section.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy Link
                    </button>
                    <button
                      onClick={() => openQrCode(section)}
                      className="p-1.5 text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)]"
                      title="View QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareWhatsApp(section)}
                      className="p-1.5 text-xs rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20"
                      title="Share to WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Footer Stats & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-[var(--foreground)]">{studentCount}</span>
                    <span className="text-xs">enrolled</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSection(section);
                        setIsExcelModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Excel Import
                    </button>
                    <button
                      onClick={async () => {
                        await refetchDetails(section.id);
                      }}
                      className="p-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--foreground)]"
                      title="View Roster"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Section Student Roster Drawer / View */}
      {selectedSection && selectedSection.students && (
        <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Student Roster: {selectedSection.sectionName} — {selectedSection.subject}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                PRN, contact details, identity verification status, and enrollment channel.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search PRN or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setSelectedSection(null)}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Close Roster
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">PRN / Roll No</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Enrolled At</th>
                  <th className="py-3 px-4">Capstone Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 font-sans">
                {selectedSection.students
                  .filter(
                    (s) =>
                      s.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (s.student.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.student.email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--accent)]/5">
                      <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                        {item.student.fullName || item.student.displayName || 'Pending Name'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{item.prn}</td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">{item.student.email}</td>
                      <td className="py-3 px-4 font-mono text-[var(--muted-foreground)]">
                        {item.student.mobile || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.student.accountState === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.student.accountState === 'ACTIVE' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {item.student.accountState}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                        {item.joinedVia}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {new Date(item.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            try {
                              await api.post('/mini-project/activate-individual', {
                                miniProjectId: 'capstone-mini-project-c11',
                                studentId: item.student.id,
                                sectionId: selectedSection.id,
                                activationReason: 'Faculty approved in section roster',
                              });
                              toast.success(`Mini-Project activated for ${item.student.fullName || item.prn}!`);
                            } catch (err: any) {
                              toast.error(err.message || 'Activation failed');
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <Award className="w-3 h-3" />
                          Activate Mini-Project
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SECTION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">Create New Academic Section</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Institution</label>
                <input
                  type="text"
                  value={newSection.institution}
                  onChange={(e) => setNewSection({ ...newSection, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Course</label>
                  <input
                    type="text"
                    value={newSection.course}
                    onChange={(e) => setNewSection({ ...newSection, course: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={newSection.subject}
                    onChange={(e) => setNewSection({ ...newSection, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newSection.academicYear}
                    onChange={(e) => setNewSection({ ...newSection, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Semester</label>
                  <input
                    type="text"
                    value={newSection.semester}
                    onChange={(e) => setNewSection({ ...newSection, semester: e.target.value })}
                    placeholder="Semester 3"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] font-medium mb-1">Section Name</label>
                  <input
                    type="text"
                    value={newSection.sectionName}
                    onChange={(e) => setNewSection({ ...newSection, sectionName: e.target.value })}
                    placeholder="Div-A"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-medium mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newSection.description}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                  placeholder="Optional section notes or syllabus scope..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(newSection)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? 'Generating Section...' : 'Create & Generate Codes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL (Section 12) */}
      {isExcelModalOpen && selectedSection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Add Students Through Excel: {selectedSection.sectionName}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Columns supported: Name, PRN/Roll No, Valid Email, Mobile.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreview(null);
                }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
              >
                ✕
              </button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 rounded-xl p-8 text-center space-y-3 bg-[var(--background)]/50">
              <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto" />
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md">
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
                  Parsing student records and checking identity bindings...
                </div>
              )}
            </div>

            {/* Preview Breakdown Cards (5 Buckets) */}
            {excelPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-center">
                    <span className="text-xs text-[var(--muted-foreground)] block">Total Rows</span>
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {excelPreview.totalRows ?? excelPreview.summary?.total ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                    <span className="text-xs text-emerald-400 block">Valid Rows</span>
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
                    <span className="text-xs text-amber-400 block">In-File Duplicates</span>
                    <span className="text-lg font-bold text-amber-400">
                      {excelPreview.duplicateRows?.length ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
                    <span className="text-xs text-purple-400 block">DB Conflicts</span>
                    <span className="text-lg font-bold text-purple-400">
                      {excelPreview.conflictingRows?.length ?? 0}
                    </span>
                  </div>
                </div>

                {/* Validation Details Table */}
                {excelPreview.invalidRows?.length > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      Invalid Rows (Will be omitted):
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {excelPreview.invalidRows.map((inv: any, idx: number) => (
                        <div key={idx} className="text-rose-300 font-mono text-[11px]">
                          Row {inv.rowNumber}: {inv.errorReasons?.join(', ')} ({inv.data?.name || 'Unnamed'})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Preview Table */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="bg-[var(--background)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] border-b border-[var(--border)]">
                    Valid Records Ready to Commit ({excelPreview.validRows?.length || 0})
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
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md shadow-indigo-600/20"
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
              Instant Student Join QR Code
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Students can scan this code in class to open the Instant Join form with Email OTP verification.
            </p>

            {qrDataUrl && (
              <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
                <img src={qrDataUrl} alt="Section Join QR Code" className="w-56 h-56 mx-auto" />
              </div>
            )}

            <div className="font-mono text-xs bg-[var(--background)] py-2 px-3 rounded-lg border border-[var(--border)] text-indigo-400 font-bold">
              Join Code: {selectedSection.joinCode}
            </div>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--foreground)] border border-[var(--border)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
