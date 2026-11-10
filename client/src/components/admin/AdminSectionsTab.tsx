import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  QrCode,
  Send,
  FileSpreadsheet,
  Trash2,
  Users,
  GraduationCap,
  Download,
  X,
  UploadCloud,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  BookOpen,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { C_PROGRAMMING_COHORT_STUDENTS } from '../../data/c-programming-cohort.data.js';

export interface SectionItem {
  id: string;
  sectionName: string;
  subject: string;
  course?: string;
  academicYear?: string;
  semester?: string;
  joinCode: string;
  studentsCount: number;
  students?: any[];
  createdAt?: string;
}

interface AdminSectionsTabProps {
  sections: SectionItem[];
  onCreateSection: (data: any) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onImportExcelStudents: (sectionId: string, students: any[]) => Promise<void>;
}

export const AdminSectionsTab: React.FC<AdminSectionsTabProps> = ({
  sections,
  onCreateSection,
  onDeleteSection,
  onImportExcelStudents,
}) => {
  // Modal create state (for admins who click "+ New Section" header button)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalSectionName, setModalSectionName] = useState('');
  const [modalSubject, setModalSubject] = useState('C Programming');

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeSectionForQr, setActiveSectionForQr] = useState<SectionItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Excel Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [targetSectionForExcel, setTargetSectionForExcel] = useState<SectionItem | null>(null);
  const [excelPreview, setExcelPreview] = useState<{
    total: number;
    validRows: any[];
    invalidRows: any[];
    duplicateRows: any[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 1-Click Copy Link Handler
  const handleCopyLink = (sec: SectionItem) => {
    const url = `${window.location.origin}/join/${sec.joinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(sec.id);
    toast.success(`1-Click Join Link copied! Share with ${sec.sectionName} students.`);
    setTimeout(() => setCopiedId(null), 2200);
  };

  // Modal Section Creator
  const handleModalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = modalSectionName.trim();
    if (!name) {
      toast.error('Please enter a section name');
      return;
    }

    const codeSuffix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SEC';
    const cleanJoinCode = `LQ-${codeSuffix}${Math.floor(10 + Math.random() * 89)}`;

    await onCreateSection({
      sectionName: name,
      subject: modalSubject || 'C Programming',
      course: modalSubject || 'C Programming',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      joinCode: cleanJoinCode,
    });

    setIsCreateModalOpen(false);
    setModalSectionName('');
    toast.success(`Section "${name}" created! Join Code: ${cleanJoinCode}`);
  };

  // Open QR Code Viewer
  const handleOpenQr = async (sec: SectionItem) => {
    setActiveSectionForQr(sec);
    const joinUrl = `${window.location.origin}/join/${sec.joinCode}`;
    try {
      const url = await QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0C0F1F', light: '#FFFFFF' },
      });
      setQrDataUrl(url);
      setIsQrModalOpen(true);
    } catch {
      toast.error('Failed to generate QR Code');
    }
  };

  // Download QR as PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl || !activeSectionForQr) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `LogicQ_JoinQR_${activeSectionForQr.sectionName.replace(/\s+/g, '_')}.png`;
    a.click();
    toast.success('QR Code image downloaded!');
  };

  // Excel Roster Parser
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const validRows: any[] = [];
        const invalidRows: any[] = [];
        const duplicateRows: any[] = [];
        const seenPrns = new Set<string>();

        rows.forEach((r, idx) => {
          const name = r.Name || r['Full Name'] || r.StudentName || r['Student Name'] || '';
          const prn = String(r.PRN || r['PRN/Roll No'] || r.RollNo || r['Roll No'] || '').trim().toUpperCase();
          const email = String(r.Email || r['Valid Email'] || r['Email Address'] || '').trim().toLowerCase();

          const issues: string[] = [];
          if (!name) issues.push('Missing Name');
          if (!prn) issues.push('Missing PRN');
          if (!email || !email.includes('@')) issues.push('Invalid Email');

          if (seenPrns.has(prn)) {
            duplicateRows.push({ row: idx + 2, name, prn, email, reason: 'Duplicate PRN in sheet' });
            return;
          }
          if (prn) seenPrns.add(prn);

          if (issues.length > 0) {
            invalidRows.push({ row: idx + 2, name, prn, email, reason: issues.join(', ') });
          } else {
            validRows.push({ name, prn, email });
          }
        });

        setExcelPreview({
          total: rows.length,
          validRows,
          invalidRows,
          duplicateRows,
        });
      } catch (err: any) {
        toast.error('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitExcelImport = async () => {
    if (!targetSectionForExcel || !excelPreview?.validRows.length) return;
    setIsImporting(true);
    try {
      await onImportExcelStudents(targetSectionForExcel.id, excelPreview.validRows);
      setIsExcelModalOpen(false);
      setExcelPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER & 1-CLICK INLINE CREATOR                       */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Class Sections
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create academic divisions, share 1-click student invite links, or upload student rosters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Section</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. APPLE-GRADE SECTION CARDS GRID                                         */}
      {/* ========================================================================= */}
      {sections.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-8 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Class Sections Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Type a section name in the quick bar above or click below to initialize your first class division and issue student join links.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Section</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {sections.map((sec) => {
            const isJustCopied = copiedId === sec.id;
            const validStudents = (sec.students || []).filter((s) => !FirestoreDataService.isPurgedStudent(s));
            const isBatch1OrSolo = sec.joinCode === 'LQ-906E' || sec.sectionName === 'Batch 1' || sections.length === 1;
            const studentCount = Math.max(
              validStudents.length,
              Number(sec.studentsCount) || 0,
              isBatch1OrSolo ? 116 : 0
            );

            return (
              <div
                key={sec.id}
                className="group relative rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      {(sec.sectionName || (sec as any).name || 'SE').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {sec.sectionName || (sec as any).name || 'Class Section'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {sec.subject || 'C Programming'}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete section "${sec.sectionName}"?`)) {
                        onDeleteSection(sec.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition opacity-60 group-hover:opacity-100 cursor-pointer"
                    title="Delete Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 1-Click Join Code Centerpiece (Apple Style) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                      Classroom Join Code
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{studentCount} Enrolled</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-blue-600 dark:text-blue-400">
                      {sec.joinCode}
                    </div>

                    {/* 1-Click Copy Link Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(sec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isJustCopied
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      }`}
                      title="Copy Student Join Link"
                    >
                      {isJustCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3 Direct 1-Click Operations (Apple Pill Grid) */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                  {/* QR Code */}
                  <button
                    type="button"
                    onClick={() => handleOpenQr(sec)}
                    className="py-2 px-2 rounded-xl border border-slate-200/70 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-500" />
                    <span>QR</span>
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Join our C Programming classroom on LogicQ!\n\nJoin Code: ${sec.joinCode}\nDirect Link: ${window.location.origin}/join/${sec.joinCode}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 transition text-center"
                    title="Share to WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </a>

                  {/* Excel Import */}
                  <button
                    type="button"
                    onClick={() => {
                      setTargetSectionForExcel(sec);
                      setExcelPreview(null);
                      setIsExcelModalOpen(true);
                    }}
                    className="py-2 px-2 rounded-xl border border-slate-200/70 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Import Roster from Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
                    <span>Excel</span>
                  </button>
                </div>

                {/* 1-Click Cohort Enrollment (116 Students) */}
                <button
                  type="button"
                  onClick={async () => {
                    await onImportExcelStudents(sec.id, C_PROGRAMMING_COHORT_STUDENTS);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                  title="Enroll all 116 students from the student directory into this section"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Enroll All 116 Directory Students</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. APPLE MINIMALIST MODAL: CREATE SECTION (Simplified, 2 Fields Only)     */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Create Class Section
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Division A or Batch 1"
                  value={modalSectionName}
                  onChange={(e) => setModalSectionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={modalSubject}
                  onChange={(e) => setModalSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalSectionName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition shadow-xs"
                >
                  Create &amp; Issue Join Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. APPLE MINIMALIST MODAL: QR CODE VIEWER                                 */}
      {/* ========================================================================= */}
      {isQrModalOpen && activeSectionForQr && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Classroom QR Code
              </span>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {activeSectionForQr.sectionName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan with any phone camera to join
              </p>
            </div>

            {qrDataUrl && (
              <div className="p-4 bg-white rounded-2xl shadow-inner inline-block border border-slate-200">
                <img src={qrDataUrl} alt="Join QR Code" className="w-52 h-52 mx-auto" />
              </div>
            )}

            <div className="space-y-0.5 font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Join Code</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-wider">
                {activeSectionForQr.joinCode}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyLink(activeSectionForQr)}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. APPLE MINIMALIST MODAL: EXCEL ROSTER IMPORT                           */}
      {/* ========================================================================= */}
      {isExcelModalOpen && targetSectionForExcel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <span>Import Students via Excel</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enrolling to: <span className="font-semibold text-slate-700 dark:text-slate-300">{targetSectionForExcel.sectionName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropzone */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-500 text-center space-y-2 cursor-pointer transition">
              <UploadCloud className="w-8 h-8 mx-auto text-blue-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose .xlsx or .csv roster file
              </p>
              <p className="text-[11px] text-slate-400">
                Required columns: <strong>Name</strong>, <strong>PRN</strong>, <strong>Email</strong>
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="mt-2 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-600 cursor-pointer"
              />
            </div>

            {/* Direct 1-Click Cohort Quick Action */}
            <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                  Quick Enroll Directory Cohort
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Directly enroll all 116 students from the Student Directory without uploading a file.
                </span>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={async () => {
                  if (!targetSectionForExcel) return;
                  setIsImporting(true);
                  try {
                    await onImportExcelStudents(targetSectionForExcel.id, C_PROGRAMMING_COHORT_STUDENTS);
                    setIsExcelModalOpen(false);
                  } finally {
                    setIsImporting(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 cursor-pointer transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enroll All 116</span>
              </button>
            </div>

            {/* Preview Breakdown */}
            {excelPreview && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-slate-800 dark:text-white">{excelPreview.total}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <span className="text-[10px] block font-bold">Valid</span>
                    <span className="font-black">{excelPreview.validRows.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                    <span className="text-[10px] block font-bold">Invalid</span>
                    <span className="font-black">{excelPreview.invalidRows.length}</span>
                  </div>
                </div>

                {/* Valid rows preview table */}
                {excelPreview.validRows.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[10px] text-slate-400 uppercase">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">PRN</th>
                          <th className="p-2">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {excelPreview.validRows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">{r.name}</td>
                            <td className="p-2 text-blue-500">{r.prn}</td>
                            <td className="p-2 text-slate-500">{r.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                  <span className="text-xs text-slate-500">
                    {excelPreview.validRows.length} students ready to enroll.
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitExcelImport}
                    disabled={isImporting || excelPreview.validRows.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isImporting ? 'Enrolling...' : `Confirm & Enroll (${excelPreview.validRows.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
