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
} from 'lucide-react';
import { StudentDeepDiveModal } from './StudentDeepDiveModal.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { toast } from 'sonner';

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
}

export const AdminStudentsTab: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VERIFIED' | 'UNLOCKED' | 'SUPPORT'>('ALL');
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
    const loadStudents = async () => {
      try {
        setIsLoading(true);

        // 1. Check local cache first for instant render
        try {
          const cached = localStorage.getItem('logicq_admin_students');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
              const cleaned = parsed.filter((s: any) => !FirestoreDataService.isPurgedStudent(s));
              setStudents(cleaned);
            }
          }
        } catch {}

        // 2. Fetch authoritative Firestore users
        const users = await FirestoreDataService.getAllFirestoreUsers().catch(() => []);
        if (isMounted && Array.isArray(users)) {
          const studentUsers: AdminStudentRecord[] = users
            .filter((u) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com')) && !FirestoreDataService.isPurgedStudent(u))
            .map((u) => {
              const anyUser = u as any;
              const isBound = Boolean(
                anyUser.isEmailBoundV2 ||
                anyUser.emailVerified ||
                (anyUser.email && !anyUser.email.endsWith('@sanjivani.edu.in') && anyUser.email.includes('@'))
              );

              return {
                id: anyUser.id || anyUser.uid || `stu-${Math.random().toString(36).substring(2, 7)}`,
                name: anyUser.fullName || anyUser.displayName || anyUser.username || 'Student Candidate',
                prn: (anyUser.prn || '').toUpperCase() || '—',
                email: anyUser.email || '—',
                section: anyUser.sectionName || anyUser.section || (anyUser.division ? `Division ${anyUser.division}` : 'Integrated Mtech'),
                identityStatus: isBound ? 'BOUND' : 'PENDING',
                academicScore: Math.min(100, Math.round(((anyUser.totalPoints || 0) / 100) * 100)),
                integrityScore: anyUser.integrityScore || 0,
                miniProjectUnlocked: Boolean(anyUser.miniProjectUnlocked),
                lastActive: anyUser.lastLoginAt
                  ? new Date(anyUser.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recent',
              };
            });

          setStudents(studentUsers);
          try {
            localStorage.setItem('logicq_admin_students', JSON.stringify(studentUsers));
          } catch {}
        }
      } catch (err) {
        console.warn('Notice: loading students from local cache:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStudents();
    return () => {
      isMounted = false;
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

    const updated = students.map((s) =>
      s.id === student.id ? { ...s, miniProjectUnlocked: nextStatus } : s
    );
    setStudents(updated);
    try {
      localStorage.setItem('logicq_admin_students', JSON.stringify(updated));
    } catch {}

    toast.success(
      nextStatus
        ? `Mini-Project unlocked for ${student.name}!`
        : `Mini-Project locked for ${student.name}.`
    );
  };

  // Filter logic
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.prn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedSection !== 'ALL' && s.section !== selectedSection) return false;

    if (activeFilter === 'VERIFIED') return s.identityStatus === 'BOUND';
    if (activeFilter === 'UNLOCKED') return s.miniProjectUnlocked;
    if (activeFilter === 'SUPPORT') return s.academicScore < 40;
    return true;
  });

  const verifiedCount = students.filter((s) => s.identityStatus === 'BOUND').length;
  const unlockedCount = students.filter((s) => s.miniProjectUnlocked).length;
  const supportCount = students.filter((s) => s.academicScore < 40).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER & SEARCH BAR                                   */}
      {/* ========================================================================= */}
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
            onClick={() => setActiveFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeFilter === 'VERIFIED'
                ? 'bg-emerald-600 text-white shadow-xs'
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
          {supportCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('SUPPORT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                activeFilter === 'SUPPORT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Needs Support ({supportCount})
            </button>
          )}

          {/* Active Section Filter Reset Pill */}
          {selectedSection !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer ml-auto"
            >
              <span>Section: {selectedSection}</span>
              <span className="text-xs font-bold leading-none">✕</span>
            </button>
          )}
        </div>
      </div>

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
        <div className="space-y-2.5">
          {filteredStudents.map((st) => {
            const isEmailCopied = copiedEmail === st.email;

            return (
              <div
                key={st.id}
                onClick={() => setSelectedStudentForModal(st)}
                className="group rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                {/* Left: Avatar + Identity */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {st.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight group-hover:text-blue-500 transition-colors">
                        {st.name}
                      </h4>
                      {st.prn === 'LOGICQARENA' && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      <span>PRN: <strong className="text-slate-700 dark:text-slate-200">{st.prn}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span>{st.email}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyEmail(st.email, e)}
                          className="p-1 hover:text-blue-500 rounded-md transition"
                          title="Copy Email"
                        >
                          {isEmailCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Pills + 1-Click Operations */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-white/5">
                  {/* Section Badge */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSection(st.section === selectedSection ? 'ALL' : st.section);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      selectedSection === st.section
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-white/5'
                    }`}
                    title="Click to filter by this section"
                  >
                    {st.section}
                  </span>

                  {/* Verification Pill */}
                  {st.identityStatus === 'BOUND' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Pending OTP</span>
                    </span>
                  )}

                  {/* Academic Score Pill */}
                  <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Score</span>
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                      {st.academicScore}%
                    </span>
                  </div>

                  {/* 1-Click Mini-Project Toggle */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleMiniProject(st, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      st.miniProjectUnlocked
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 hover:border-blue-500/30'
                    }`}
                    title={st.miniProjectUnlocked ? 'Lock Mini-Project' : 'Unlock Mini-Project'}
                  >
                    {st.miniProjectUnlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Project Active</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Project</span>
                      </>
                    )}
                  </button>

                  {/* Arrow Indicator (Click Row to Inspect) */}
                  <div className="p-1.5 rounded-xl text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
        />
      )}
    </div>
  );
};
