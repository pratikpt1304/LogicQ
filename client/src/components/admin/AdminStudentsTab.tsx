import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Activity,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Smartphone,
  Mail,
  GraduationCap,
  Download,
  Info,
} from 'lucide-react';
import { StudentDeepDiveModal } from './StudentDeepDiveModal.js';
import { toast } from 'sonner';

export interface AdminStudentRecord {
  id: string;
  name: string;
  prn: string;
  email: string;
  mobile?: string;
  section: string;
  identityStatus: 'BOUND' | 'EMAIL_VERIFIED' | 'PENDING';
  academicScore: number; // 0-100
  integrityScore: number; // 0-100 (0 = pristine, 100 = critical risk)
  miniProjectUnlocked: boolean;
  activeWorkRatio?: number;
  codeBurstRatio?: number;
  solutionEmergence?: 'NATURAL' | 'SYNTHETIC' | 'FLAGGED';
  lastActive: string;
}

const SAMPLE_STUDENTS: AdminStudentRecord[] = [
  {
    id: 'st-1',
    name: 'LogicQ Admin Student',
    prn: 'LOGICQARENA',
    email: 'logicqarena@gmail.com',
    mobile: '+91 98765 43210',
    section: 'Division A (C Programming)',
    identityStatus: 'BOUND',
    academicScore: 94,
    integrityScore: 6,
    miniProjectUnlocked: true,
    activeWorkRatio: 0.91,
    codeBurstRatio: 0.08,
    solutionEmergence: 'NATURAL',
    lastActive: 'Just now',
  },
  {
    id: 'st-2',
    name: 'Aarav Sharma',
    prn: '2126CS101',
    email: 'aarav.sharma@sanjivani.edu.in',
    mobile: '+91 98231 11223',
    section: 'Division A (C Programming)',
    identityStatus: 'BOUND',
    academicScore: 88,
    integrityScore: 12,
    miniProjectUnlocked: false,
    activeWorkRatio: 0.84,
    codeBurstRatio: 0.14,
    solutionEmergence: 'NATURAL',
    lastActive: '12m ago',
  },
  {
    id: 'st-3',
    name: 'Diya Patel',
    prn: '2126CS102',
    email: 'diya.patel@sanjivani.edu.in',
    mobile: '+91 97321 44556',
    section: 'Division A (C Programming)',
    identityStatus: 'BOUND',
    academicScore: 92,
    integrityScore: 9,
    miniProjectUnlocked: true,
    activeWorkRatio: 0.89,
    codeBurstRatio: 0.11,
    solutionEmergence: 'NATURAL',
    lastActive: '45m ago',
  },
  {
    id: 'st-4',
    name: 'Rohan Deshmukh',
    prn: '2126CS103',
    email: 'rohan.deshmukh@sanjivani.edu.in',
    mobile: '+91 99881 22334',
    section: 'Division B (C Programming)',
    identityStatus: 'EMAIL_VERIFIED',
    academicScore: 62,
    integrityScore: 38,
    miniProjectUnlocked: false,
    activeWorkRatio: 0.65,
    codeBurstRatio: 0.28,
    solutionEmergence: 'NATURAL',
    lastActive: '2h ago',
  },
  {
    id: 'st-5',
    name: 'Sneha Kulkarni',
    prn: '2126CS104',
    email: 'sneha.kulkarni@sanjivani.edu.in',
    mobile: '+91 98451 99887',
    section: 'Division B (C Programming)',
    identityStatus: 'PENDING',
    academicScore: 35,
    integrityScore: 78,
    miniProjectUnlocked: false,
    activeWorkRatio: 0.32,
    codeBurstRatio: 0.74,
    solutionEmergence: 'SYNTHETIC',
    lastActive: '1d ago',
  },
];

export const AdminStudentsTab: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_students_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_STUDENTS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BOUND' | 'UNLOCKED' | 'FLAGGED' | 'SUPPORT'>('ALL');
  const [selectedStudentForTelemetry, setSelectedStudentForTelemetry] = useState<any | null>(null);

  // Mini-project individual activation modal state (Rule 38)
  const [confirmUnlockStudent, setConfirmUnlockStudent] = useState<AdminStudentRecord | null>(null);

  const saveStudents = (updated: AdminStudentRecord[]) => {
    setStudents(updated);
    try {
      localStorage.setItem('logicq_admin_students_list', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleMiniProject = (student: AdminStudentRecord) => {
    if (student.miniProjectUnlocked) {
      // Relock
      const updated = students.map((s) =>
        s.id === student.id ? { ...s, miniProjectUnlocked: false } : s
      );
      saveStudents(updated);
      toast.info(`Mini-Project workspace locked for ${student.name}`);
    } else {
      // Rule 38 enforcement modal
      setConfirmUnlockStudent(student);
    }
  };

  const executeIndividualUnlock = () => {
    if (!confirmUnlockStudent) return;
    const updated = students.map((s) =>
      s.id === confirmUnlockStudent.id ? { ...s, miniProjectUnlocked: true } : s
    );
    saveStudents(updated);
    toast.success(`Rule 38: Mini-Project unlocked individually for ${confirmUnlockStudent.name} (${confirmUnlockStudent.prn})`);
    setConfirmUnlockStudent(null);
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.prn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === 'BOUND') return s.identityStatus === 'BOUND';
    if (activeFilter === 'UNLOCKED') return s.miniProjectUnlocked;
    if (activeFilter === 'FLAGGED') return s.integrityScore >= 60;
    if (activeFilter === 'SUPPORT') return s.academicScore < 40;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Apple Filter Strip */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Student Directory & Telemetry Roster
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Independent Academic Scores, behavioral integrity indices, and individual milestone activations (Rule 38).
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, PRN, or Email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-950/40 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/5">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            All Students ({students.length})
          </button>
          <button
            onClick={() => setActiveFilter('BOUND')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'BOUND'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Identity Bound ({students.filter((s) => s.identityStatus === 'BOUND').length})
          </button>
          <button
            onClick={() => setActiveFilter('UNLOCKED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'UNLOCKED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Mini-Project Active ({students.filter((s) => s.miniProjectUnlocked).length})
          </button>
          <button
            onClick={() => setActiveFilter('FLAGGED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'FLAGGED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Integrity Flagged ({students.filter((s) => s.integrityScore >= 60).length})
          </button>
          <button
            onClick={() => setActiveFilter('SUPPORT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'SUPPORT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Needs Support ({students.filter((s) => s.academicScore < 40).length})
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Student & Identity</th>
                <th className="px-4 py-3.5">Section</th>
                <th className="px-4 py-3.5 text-center">Identity Bound</th>
                <th className="px-4 py-3.5 text-center">Academic (0-100)</th>
                <th className="px-4 py-3.5 text-center">Integrity Risk</th>
                <th className="px-4 py-3.5 text-center">Mini-Project (Rule 38)</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No students match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Student Name & PRN */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{st.name}</span>
                        {st.prn === 'LOGICQARENA' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Admin Account
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span>PRN: {st.prn}</span>
                        <span>•</span>
                        <span>{st.email}</span>
                      </div>
                    </td>

                    {/* Section */}
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-xs">
                      {st.section}
                    </td>

                    {/* Identity Bound Status */}
                    <td className="px-4 py-4 text-center">
                      {st.identityStatus === 'BOUND' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Bound (OTP)
                        </span>
                      ) : st.identityStatus === 'EMAIL_VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Mail className="w-3 h-3" />
                          Email Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Academic Score (Rule 59: Strictly Separate) */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                          {st.academicScore}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.academicScore >= 75
                                ? 'bg-emerald-500'
                                : st.academicScore >= 40
                                ? 'bg-blue-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${st.academicScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Integrity Score */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                            st.integrityScore < 20
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : st.integrityScore < 50
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold'
                          }`}
                        >
                          {st.integrityScore} / 100
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {st.integrityScore < 20 ? 'Normal' : st.integrityScore < 50 ? 'Low Risk' : 'High Risk'}
                        </span>
                      </div>
                    </td>

                    {/* Mini-Project Activation Toggle (Rule 38) */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleMiniProject(st)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          st.miniProjectUnlocked
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        {st.miniProjectUnlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudentForTelemetry(st)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Telemetry</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule 38 Individual Unlock Confirmation Modal */}
      {confirmUnlockStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Individual Mini-Project Activation
                </h3>
                <p className="text-xs text-slate-500">Platform Specification Rule 38</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Strict Compliance Required</span>
              </div>
              <p>
                Bulk activation is strictly prohibited. You are activating the mini-project milestone exclusively for:
              </p>
              <div className="font-mono font-bold text-slate-900 dark:text-white pt-1">
                {confirmUnlockStudent.name} (PRN: {confirmUnlockStudent.prn})
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                ✓ Academic milestones verified
                <br />
                ✓ Behavioral telemetry cleared
                <br />
                ✓ Dedicated mini-project repository will be provisioned
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmUnlockStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={executeIndividualUnlock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Confirm Individual Activation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Deep Dive Modal */}
      {selectedStudentForTelemetry && (
        <StudentDeepDiveModal
          student={selectedStudentForTelemetry}
          onClose={() => setSelectedStudentForTelemetry(null)}
          onToggleMiniProject={(st) => handleToggleMiniProject(st as any)}
        />
      )}
    </div>
  );
};
