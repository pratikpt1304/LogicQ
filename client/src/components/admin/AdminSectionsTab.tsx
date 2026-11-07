import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  Plus,
  QrCode,
  Share2,
  Trash2,
  UploadCloud,
  Users,
  X,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface SectionItem {
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeSectionForQr, setActiveSectionForQr] = useState<SectionItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Excel Import state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [targetSectionForExcel, setTargetSectionForExcel] = useState<SectionItem | null>(null);
  const [excelPreview, setExcelPreview] = useState<{
    total: number;
    validRows: any[];
    invalidRows: any[];
    duplicateRows: any[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    institution: 'Sanjivani University',
    course: 'Integrated M.Tech (CSE)',
    subject: 'C Programming',
    academicYear: '2026-2027',
    semester: 'Semester 1 (FY)',
    sectionName: '',
    faculty: 'Faculty Instructor',
    description: 'AI-Resistant Smart Assessment & Practice',
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenQr = async (sec: SectionItem) => {
    setActiveSectionForQr(sec);
    const joinUrl = `${window.location.origin}/join?code=${sec.joinCode}`;
    try {
      const url = await QRCode.toDataURL(joinUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#0C0F1F', light: '#FFFFFF' },
      });
      setQrDataUrl(url);
      setIsQrModalOpen(true);
    } catch {
      toast.error('Failed to generate QR Code');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sectionName.trim()) {
      toast.error('Please enter a section name (e.g. Div A)');
      return;
    }
    const cleanJoinCode = `LQ-${formData.sectionName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SEC'}${Math.floor(10 + Math.random() * 89)}`;
    await onCreateSection({
      ...formData,
      joinCode: cleanJoinCode,
    });
    setIsCreateModalOpen(false);
    setFormData({ ...formData, sectionName: '' });
  };

  // Excel File Parser (Item 12 Specification)
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
          // Normalize column headers
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header Bar with 1-Click Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" />
            <span>Academic Sections &amp; Rosters</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create academic divisions, generate Instant Join Links &amp; WhatsApp invitations, or upload student rosters via Excel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Section</span>
        </button>
      </div>

      {/* Sections Grid */}
      {sections.length === 0 ? (
        <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-[#0e131d]/40 p-8 space-y-4">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Academic Sections Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <strong>&quot;Create New Section&quot;</strong> to initialize your first class division and issue unique join codes to students.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold hover:bg-indigo-500"
          >
            Create Section Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="p-6 rounded-3xl bg-white/70 dark:bg-[#0e131d]/75 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl flex flex-col justify-between space-y-5 hover:border-indigo-500/40 transition shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold border border-indigo-500/20">
                      {sec.course || 'C Programming'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                      {sec.sectionName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {sec.subject} • {sec.semester || 'FY'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteSection(sec.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Join Code Display Bar */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Classroom Join Code</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {sec.joinCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sec.joinCode, 'Join Code')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Copy Join Code"
                  >
                    {copiedCode === sec.joinCode ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Enrolled Students Count */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-sans">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>
                    <strong>{sec.studentsCount || sec.students?.length || 0}</strong> students enrolled
                  </span>
                </div>
              </div>

              {/* 1-Click Action Buttons: QR, WhatsApp, Excel */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => handleOpenQr(sec)}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Generate QR code"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>QR Code</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join our C Programming classroom on LogicQ!\nJoin Code: ${sec.joinCode}\nDirect Link: ${window.location.origin}/join?code=${sec.joinCode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                  title="Share via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setTargetSectionForExcel(sec);
                    setExcelPreview(null);
                    setIsExcelModalOpen(true);
                  }}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Import students from Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SECTION MODAL (Item 11 Specification) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                <span>Create Section (Workflow 1)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Institution</label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Division A or Batch 2026-FY"
                  value={formData.sectionName}
                  onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition shadow-md shadow-indigo-500/25 cursor-pointer"
                >
                  Create Section &amp; Issue Join Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE & INSTANT JOIN MODAL (Item 13 Specification) */}
      {isQrModalOpen && activeSectionForQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-500">Instant Student Join Form</span>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-base text-slate-900 dark:text-white">{activeSectionForQr.sectionName}</h3>

            {qrDataUrl && (
              <div className="p-4 bg-white rounded-2xl shadow-inner inline-block border border-slate-200">
                <img src={qrDataUrl} alt="Join QR Code" className="w-56 h-56 mx-auto" />
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Classroom Join Code</span>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-wider">
                {activeSectionForQr.joinCode}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scan with phone camera to open student instant join form. Students complete 6-digit Email OTP verification to bind their PRN.
            </p>

            <button
              type="button"
              onClick={() => handleCopy(`${window.location.origin}/join?code=${activeSectionForQr.joinCode}`, 'Join Link')}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Direct Link</span>
            </button>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL (Item 12 Specification: preview, validate, no silent discard) */}
      {isExcelModalOpen && targetSectionForExcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <span>Import Students via Excel (Item 12)</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Section: {targetSectionForExcel.sectionName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-center space-y-2 cursor-pointer transition">
              <UploadCloud className="w-8 h-8 mx-auto text-indigo-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose .xlsx or .csv roster file</p>
              <p className="text-[11px] text-slate-400">Accepted columns: Name, PRN/Roll No, Valid Email</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="mt-2 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-600 cursor-pointer"
              />
            </div>

            {/* Validation Breakdown Preview (Rule: do not silently discard invalid rows) */}
            {excelPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-slate-800 dark:text-white">{excelPreview.total}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                    <span className="text-[10px] block font-bold">Valid</span>
                    <span className="font-black">{excelPreview.validRows.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <span className="text-[10px] block font-bold">Invalid</span>
                    <span className="font-black">{excelPreview.invalidRows.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <span className="text-[10px] block font-bold">Duplicate</span>
                    <span className="font-black">{excelPreview.duplicateRows.length}</span>
                  </div>
                </div>

                {/* Invalid rows warning */}
                {excelPreview.invalidRows.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{excelPreview.invalidRows.length} Invalid Row(s) Detected (Will not be imported):</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] max-h-24 overflow-y-auto space-y-0.5 font-mono">
                      {excelPreview.invalidRows.map((r, i) => (
                        <li key={i}>Row {r.row} ({r.name || 'Unknown'}): {r.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Valid rows table preview */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">PRN</th>
                        <th className="p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {excelPreview.validRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                          <td className="p-2 text-indigo-500">{r.prn}</td>
                          <td className="p-2 text-slate-500">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Ready to enroll {excelPreview.validRows.length} verified student records.
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitExcelImport}
                    disabled={isImporting || excelPreview.validRows.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {isImporting ? 'Enrolling...' : `Confirm Import (${excelPreview.validRows.length})`}
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
