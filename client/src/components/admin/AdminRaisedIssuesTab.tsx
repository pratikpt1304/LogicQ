import React, { useState, useEffect, useMemo } from 'react';
import { GalaxyButton } from '../common/GalaxyButton.js';
import {
  Flag,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Code2,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  BookOpen,
  User,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Edit3,
  Filter,
  Layers,
  MessageSquare,
  MessageCircle,
  Phone,
  X,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.js';

export interface RaisedIssue {
  id: string;
  questionId: string;
  questionTitle: string;
  contextType: 'PRACTICE' | 'LAB_INTERNAL' | 'EXAM';
  category: string;
  description: string;
  studentId: string;
  studentName: string;
  studentPrn: string;
  studentEmail: string;
  studentPhone?: string;
  studentWhatsapp?: string;
  createdAt: string;
  status: 'OPEN' | 'RESOLVED' | 'IN_PROGRESS';
  assignedTo?: string;
  assignedEmail?: string;
  assignedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; border: string }> = {
  AMBIGUOUS_DESCRIPTION: {
    label: 'Ambiguous Description',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  TEST_CASE_MISMATCH: {
    label: 'Test Case Mismatch',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/40',
  },
  COMPILER_OR_TIMEOUT: {
    label: 'Compiler / Timeout',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/40',
  },
  TYPO_OR_CLARITY: {
    label: 'Typo / Clarity',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/40',
  },
  OTHER: {
    label: 'Other Feedback',
    color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

const CONTEXT_MAP: Record<string, { label: string; color: string }> = {
  PRACTICE: { label: 'Practice Problem', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' },
  EXAM: { label: 'Proctored Exam', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40' },
  LAB_INTERNAL: { label: 'Continuous Lab Internal', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' },
};

// Strict deduplication helper: Eliminates duplicate reports for the same question by the same candidate
const deduplicateIssues = (rawList: RaisedIssue[]): RaisedIssue[] => {
  const uniqueMap = new Map<string, RaisedIssue>();
  for (const item of rawList) {
    const prn = (item.studentPrn || '').trim().toUpperCase();
    const title = (item.questionTitle || '').trim().toLowerCase();
    const desc = (item.description || '').trim().toLowerCase();
    const sig = `${prn}:::${title}:::${desc}`;

    if (!uniqueMap.has(sig)) {
      uniqueMap.set(sig, item);
    } else {
      const existing = uniqueMap.get(sig)!;
      const isItemCloud = !item.id.startsWith('local-');
      const isExistingLocal = existing.id.startsWith('local-');
      if (isItemCloud && isExistingLocal) {
        uniqueMap.set(sig, item);
      } else if (item.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
        uniqueMap.set(sig, item);
      } else if (item.status === 'IN_PROGRESS' && existing.status === 'OPEN') {
        uniqueMap.set(sig, item);
      }
    }
  }
  return Array.from(uniqueMap.values());
};

export const AdminRaisedIssuesTab: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<RaisedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'MINE' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Support Agent Identity
  const [activeSolver, setActiveSolver] = useState<string>(() => {
    const saved = localStorage.getItem('logicq_support_agent_name');
    if (saved && saved.trim()) return saved.trim();
    const authName = (user?.fullName || user?.displayName || '').trim();
    if (authName) return authName;
    if (user?.email) return user.email.split('@')[0];
    return 'Pratik Thorat';
  });
  const [isEditingSolver, setIsEditingSolver] = useState(false);
  const [tempSolverName, setTempSolverName] = useState('');

  // Inline WhatsApp phone editing
  const [editingPhoneIssueId, setEditingPhoneIssueId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');


  const handleSaveActiveSolver = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error('Please enter a valid solver name.');
      return;
    }
    setActiveSolver(trimmed);
    localStorage.setItem('logicq_support_agent_name', trimmed);
    setIsEditingSolver(false);
    toast.success(`Active support solver set to: ${trimmed}`);
  };

  const handleSavePhone = async (issueId: string, rawDigits: string) => {
    const cleanDigits = rawDigits.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formatted = cleanDigits.length === 10 ? `+91${cleanDigits}` : cleanDigits.startsWith('91') ? `+${cleanDigits}` : `+91${cleanDigits}`;

    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, studentPhone: formatted, studentWhatsapp: formatted } : i))
    );
    setEditingPhoneIssueId(null);
    setTempPhone('');

    try {
      if (!issueId.startsWith('local-')) {
        await updateDoc(doc(db, 'raised_issues', issueId), {
          studentPhone: formatted,
          studentWhatsapp: formatted,
        });
      }
      realtimeSync.emit('ISSUES');
      toast.success(`WhatsApp number saved for student: ${formatted}`);
    } catch (err: any) {
      toast.error('Failed to update phone: ' + err.message);
    }
  };

  // Load issues from Firestore with local storage fallback
  const loadIssues = async () => {
    try {
      const snap = await getDocs(collection(db, 'raised_issues')).catch(() => null);
      const list: RaisedIssue[] = [];

      if (snap && !snap.empty) {
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            questionId: data.questionId || 'general',
            questionTitle: data.questionTitle || 'Assessment Question',
            contextType: data.contextType || 'PRACTICE',
            category: data.category || 'OTHER',
            description: data.description || '',
            studentId: data.studentId || '',
            studentName: data.studentName || 'Student Candidate',
            studentPrn: data.studentPrn || '—',
            studentEmail: data.studentEmail || '',
            studentPhone: data.studentPhone || data.studentWhatsapp || '',
            studentWhatsapp: data.studentWhatsapp || data.studentPhone || '',
            createdAt: data.createdAt || new Date().toISOString(),
            status: data.status || 'OPEN',
            assignedTo: data.assignedTo || '',
            assignedEmail: data.assignedEmail || '',
            assignedAt: data.assignedAt || '',
            resolvedBy: data.resolvedBy || '',
            resolvedAt: data.resolvedAt || '',
          });
        });
      }

      // Check local storage for cached/offline reports
      try {
        const local = JSON.parse(localStorage.getItem('logicq_faculty_raised_issues') || '[]');
        if (Array.isArray(local)) {
          local.forEach((item: any) => {
            const exists = list.some(
              (l) =>
                (l.id === item.id || (l.studentPrn === item.studentPrn && l.questionId === item.questionId && l.description === item.description))
            );
            if (!exists) {
              list.push({
                id: item.id || `local-${Math.random().toString(36).substring(2, 7)}`,
                questionId: item.questionId || 'general',
                questionTitle: item.questionTitle || 'Assessment Question',
                contextType: item.contextType || 'PRACTICE',
                category: item.category || 'OTHER',
                description: item.description || '',
                studentId: item.studentId || '',
                studentName: item.studentName || 'Student Candidate',
                studentPrn: item.studentPrn || '—',
                studentEmail: item.studentEmail || '',
                studentPhone: item.studentPhone || item.studentWhatsapp || '',
                studentWhatsapp: item.studentWhatsapp || item.studentPhone || '',
                createdAt: item.createdAt || new Date().toISOString(),
                status: item.status || 'OPEN',
                assignedTo: item.assignedTo || '',
                assignedEmail: item.assignedEmail || '',
                assignedAt: item.assignedAt || '',
                resolvedBy: item.resolvedBy || '',
                resolvedAt: item.resolvedAt || '',
              });
            }
          });
        }
      } catch {}

      // Sort newest first & deduplicate
      const cleanList = deduplicateIssues(list);
      cleanList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIssues(cleanList);
    } catch (err) {
      console.warn('loadIssues notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();

    // Live real-time listener on raised_issues
    const unsub = onSnapshot(
      collection(db, 'raised_issues'),
      (snap) => {
        const list: RaisedIssue[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            questionId: data.questionId || 'general',
            questionTitle: data.questionTitle || 'Assessment Question',
            contextType: data.contextType || 'PRACTICE',
            category: data.category || 'OTHER',
            description: data.description || '',
            studentId: data.studentId || '',
            studentName: data.studentName || 'Student Candidate',
            studentPrn: data.studentPrn || '—',
            studentEmail: data.studentEmail || '',
            studentPhone: data.studentPhone || data.studentWhatsapp || '',
            studentWhatsapp: data.studentWhatsapp || data.studentPhone || '',
            createdAt: data.createdAt || new Date().toISOString(),
            status: data.status || 'OPEN',
            assignedTo: data.assignedTo || '',
            assignedEmail: data.assignedEmail || '',
            assignedAt: data.assignedAt || '',
            resolvedBy: data.resolvedBy || '',
            resolvedAt: data.resolvedAt || '',
          });
        });

        // Merge local storage items
        try {
          const local = JSON.parse(localStorage.getItem('logicq_faculty_raised_issues') || '[]');
          if (Array.isArray(local)) {
            local.forEach((item: any) => {
              const exists = list.some(
                (l) => l.id === item.id || (l.studentPrn === item.studentPrn && l.description === item.description)
              );
              if (!exists) {
                list.push({
                  id: item.id || `local-${Math.random().toString(36).substring(2, 7)}`,
                  questionId: item.questionId || 'general',
                  questionTitle: item.questionTitle || 'Assessment Question',
                  contextType: item.contextType || 'PRACTICE',
                  category: item.category || 'OTHER',
                  description: item.description || '',
                  studentId: item.studentId || '',
                  studentName: item.studentName || 'Student Candidate',
                  studentPrn: item.studentPrn || '—',
                  studentEmail: item.studentEmail || '',
                  studentPhone: item.studentPhone || item.studentWhatsapp || '',
                  studentWhatsapp: item.studentWhatsapp || item.studentPhone || '',
                  createdAt: item.createdAt || new Date().toISOString(),
                  status: item.status || 'OPEN',
                  assignedTo: item.assignedTo || '',
                  assignedEmail: item.assignedEmail || '',
                  assignedAt: item.assignedAt || '',
                  resolvedBy: item.resolvedBy || '',
                  resolvedAt: item.resolvedAt || '',
                });
              }
            });
          }
        } catch {}

        const cleanList = deduplicateIssues(list);
        cleanList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setIssues(cleanList);
        setIsLoading(false);
      },
      (err) => console.warn('Live raised_issues listener notice:', err)
    );

    const unsubMesh = realtimeSync.on('ISSUES', () => loadIssues());

    return () => {
      unsub();
      unsubMesh();
    };
  }, []);

  // 1. Claim or Reassign Issue
  const handleClaimIssue = async (issue: RaisedIssue, specificSolver?: string) => {
    const solver = (specificSolver || activeSolver || 'Support Team').trim();
    const assignedAt = new Date().toISOString();

    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id ||
        (i.studentPrn && issue.studentPrn && i.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() && i.description.trim() === issue.description.trim())
          ? { ...i, status: 'IN_PROGRESS', assignedTo: solver, assignedAt }
          : i
      )
    );

    try {
      if (!issue.id.startsWith('local-')) {
        await updateDoc(doc(db, 'raised_issues', issue.id), {
          status: 'IN_PROGRESS',
          assignedTo: solver,
          assignedEmail: user?.email || '',
          assignedAt,
        }).catch(() => {});

        // Sync duplicates
        try {
          const snap = await getDocs(collection(db, 'raised_issues'));
          for (const d of snap.docs) {
            const data = d.data();
            const isMatch =
              data.studentPrn &&
              issue.studentPrn &&
              data.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() &&
              data.description &&
              issue.description &&
              data.description.trim() === issue.description.trim();
            if (isMatch && d.id !== issue.id) {
              await updateDoc(d.ref, {
                status: 'IN_PROGRESS',
                assignedTo: solver,
                assignedEmail: user?.email || '',
                assignedAt,
              }).catch(() => {});
            }
          }
        } catch {}
      }

      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.map((i: any) =>
        i.id === issue.id || (i.studentPrn === issue.studentPrn && i.description === issue.description)
          ? { ...i, status: 'IN_PROGRESS', assignedTo: solver, assignedAt }
          : i
      );
      localStorage.setItem(storedKey, JSON.stringify(updated));
      realtimeSync.emit('ISSUES');

      toast.success(`Claimed by ${solver}! Status set to In Progress.`);
    } catch (err) {
      console.warn('handleClaimIssue error:', err);
      toast.success(`Claimed by ${solver}!`);
    }
  };

  // 2. Release / Unassign Issue back to OPEN
  const handleReleaseIssue = async (issue: RaisedIssue) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id ||
        (i.studentPrn && issue.studentPrn && i.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() && i.description.trim() === issue.description.trim())
          ? { ...i, status: 'OPEN', assignedTo: '', assignedAt: '', assignedEmail: '' }
          : i
      )
    );

    try {
      if (!issue.id.startsWith('local-')) {
        await updateDoc(doc(db, 'raised_issues', issue.id), {
          status: 'OPEN',
          assignedTo: '',
          assignedEmail: '',
          assignedAt: '',
        }).catch(() => {});
      }

      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.map((i: any) =>
        i.id === issue.id || (i.studentPrn === issue.studentPrn && i.description === issue.description)
          ? { ...i, status: 'OPEN', assignedTo: '', assignedAt: '', assignedEmail: '' }
          : i
      );
      localStorage.setItem(storedKey, JSON.stringify(updated));
      realtimeSync.emit('ISSUES');

      toast.info('Issue released back to Open queue.');
    } catch (err) {
      console.warn('handleReleaseIssue error:', err);
    }
  };

  // 3. Mark Issue Resolved
  const handleResolveIssue = async (issue: RaisedIssue) => {
    const solver = (issue.assignedTo || activeSolver || 'Support Team').trim();
    const resolvedAt = new Date().toISOString();

    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id ||
        (i.studentPrn && issue.studentPrn && i.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() && i.description.trim() === issue.description.trim())
          ? { ...i, status: 'RESOLVED', resolvedBy: solver, resolvedAt }
          : i
      )
    );

    try {
      if (!issue.id.startsWith('local-')) {
        await updateDoc(doc(db, 'raised_issues', issue.id), {
          status: 'RESOLVED',
          resolvedBy: solver,
          resolvedAt,
        }).catch(() => {});

        // Sync duplicates
        try {
          const snap = await getDocs(collection(db, 'raised_issues'));
          for (const d of snap.docs) {
            const data = d.data();
            const isMatch =
              data.studentPrn &&
              issue.studentPrn &&
              data.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() &&
              data.description &&
              issue.description &&
              data.description.trim() === issue.description.trim();
            if (isMatch && d.id !== issue.id) {
              await updateDoc(d.ref, {
                status: 'RESOLVED',
                resolvedBy: solver,
                resolvedAt,
              }).catch(() => {});
            }
          }
        } catch {}
      }

      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.map((i: any) =>
        i.id === issue.id || (i.studentPrn === issue.studentPrn && i.description === issue.description)
          ? { ...i, status: 'RESOLVED', resolvedBy: solver, resolvedAt }
          : i
      );
      localStorage.setItem(storedKey, JSON.stringify(updated));
      realtimeSync.emit('ISSUES');

      toast.success(`Issue marked as resolved by ${solver}!`);
    } catch (err) {
      console.warn('handleResolveIssue error:', err);
      toast.success(`Issue marked as resolved by ${solver}!`);
    }
  };

  // 4. Reopen Issue
  const handleReopenIssue = async (issue: RaisedIssue) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id ||
        (i.studentPrn && issue.studentPrn && i.studentPrn.toUpperCase() === issue.studentPrn.toUpperCase() && i.description.trim() === issue.description.trim())
          ? { ...i, status: 'OPEN', resolvedBy: '', resolvedAt: '' }
          : i
      )
    );

    try {
      if (!issue.id.startsWith('local-')) {
        await updateDoc(doc(db, 'raised_issues', issue.id), {
          status: 'OPEN',
          resolvedBy: '',
          resolvedAt: '',
        }).catch(() => {});
      }

      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.map((i: any) =>
        i.id === issue.id || (i.studentPrn === issue.studentPrn && i.description === issue.description)
          ? { ...i, status: 'OPEN', resolvedBy: '', resolvedAt: '' }
          : i
      );
      localStorage.setItem(storedKey, JSON.stringify(updated));
      realtimeSync.emit('ISSUES');

      toast.info('Issue reopened and returned to Open queue.');
    } catch (err) {
      console.warn('handleReopenIssue error:', err);
    }
  };

  // 5. Delete issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this reported issue?')) return;
    const target = issues.find((i) => i.id === issueId);
    setIssues((prev) => prev.filter((i) => i.id !== issueId));

    try {
      if (!issueId.startsWith('local-')) {
        await deleteDoc(doc(db, 'raised_issues', issueId)).catch(() => {});
        if (target) {
          try {
            const snap = await getDocs(collection(db, 'raised_issues'));
            for (const d of snap.docs) {
              const data = d.data();
              const isMatch =
                data.studentPrn &&
                target.studentPrn &&
                data.studentPrn.toUpperCase() === target.studentPrn.toUpperCase() &&
                data.description &&
                target.description &&
                data.description.trim() === target.description.trim();
              if (isMatch && d.id !== issueId) {
                await deleteDoc(d.ref).catch(() => {});
              }
            }
          } catch {}
        }
      }
      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.filter((i: any) => i.id !== issueId);
      localStorage.setItem(storedKey, JSON.stringify(updated));
      realtimeSync.emit('ISSUES');
      toast.success('Reported issue removed.');
    } catch {
      toast.success('Reported issue removed.');
    }
  };

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.studentName.toLowerCase().includes(q) ||
          item.studentPrn.toLowerCase().includes(q) ||
          item.questionTitle.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.assignedTo && item.assignedTo.toLowerCase().includes(q)) ||
          (item.resolvedBy && item.resolvedBy.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status Filter
      if (statusFilter === 'OPEN' && item.status !== 'OPEN') return false;
      if (statusFilter === 'IN_PROGRESS' && item.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'RESOLVED' && item.status !== 'RESOLVED') return false;
      if (statusFilter === 'MINE') {
        const myName = activeSolver.toLowerCase().trim();
        const assigned = (item.assignedTo || '').toLowerCase().trim();
        if (item.status !== 'IN_PROGRESS' || !assigned.includes(myName)) return false;
      }

      // Category
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      return true;
    });
  }, [issues, searchQuery, statusFilter, categoryFilter, activeSolver]);

  const openCount = issues.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length;
  const myAssignedCount = issues.filter((i) => i.status === 'IN_PROGRESS' && (i.assignedTo || '').toLowerCase().includes(activeSolver.toLowerCase().trim())).length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Student Flagged Issues &amp; Inquiries
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Live Team Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-agent ticket claiming &amp; resolution system. Prevents duplicate effort across faculty and support team members.
              </p>
            </div>
          </div>

          {/* Active Support Solver Identity Badge / Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                You Are Acting As:
              </span>
              {isEditingSolver ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    autoFocus
                    value={tempSolverName}
                    onChange={(e) => setTempSolverName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-36 px-2 py-0.5 text-xs font-bold rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveActiveSolver(tempSolverName);
                      if (e.key === 'Escape') setIsEditingSolver(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveActiveSolver(tempSolverName)}
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-blue-500"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSolver(false)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {activeSolver}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempSolverName(activeSolver);
                      setIsEditingSolver(true);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="Change active solver name"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Metric Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Total Reported
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                {issues.length} Issues
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Open / Unassigned
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base">
                {openCount} Pending
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Claimed Issues
              </span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                {inProgressCount} Active
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Resolved
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                {resolvedCount} Resolved
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Status Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'OPEN'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              Claimed ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('MINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'MINE'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-500/10'
              }`}
              title="Issues assigned to you"
            >
              Claimed by Me ({myAssignedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, student, PRN, solver..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer shrink-0"
            >
              <option value="ALL">All Categories</option>
              <option value="TEST_CASE_MISMATCH">Test Case Mismatch</option>
              <option value="AMBIGUOUS_DESCRIPTION">Ambiguous Description</option>
              <option value="COMPILER_OR_TIMEOUT">Compiler Anomaly</option>
              <option value="TYPO_OR_CLARITY">Typo / Clarity</option>
              <option value="OTHER">Other Technical</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zero Issues Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              No reported anomalies found matching the current filter. When students click &quot;Raise Issue&quot; during practice or exams, issues stream here live.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const cat = CATEGORY_MAP[issue.category] || CATEGORY_MAP.OTHER;
            const ctx = CONTEXT_MAP[issue.contextType] || CONTEXT_MAP.PRACTICE;
            const isResolved = issue.status === 'RESOLVED';
            const isInProgress = issue.status === 'IN_PROGRESS';
            const isOpen = issue.status === 'OPEN' || (!isResolved && !isInProgress);

            const isMine =
              isInProgress &&
              Boolean(issue.assignedTo && issue.assignedTo.toLowerCase().trim() === activeSolver.toLowerCase().trim());
            const isSomeoneElse =
              isInProgress &&
              Boolean(issue.assignedTo && issue.assignedTo.toLowerCase().trim() !== activeSolver.toLowerCase().trim());

            return (
              <div
                key={issue.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition hover:shadow-md space-y-3.5 ${
                  isResolved
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    : isMine
                    ? 'border-blue-500/40 dark:border-blue-500/40 bg-blue-500/[0.015]'
                    : isSomeoneElse
                    ? 'border-amber-400/50 dark:border-amber-500/40 bg-amber-500/[0.02]'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cat.color} ${cat.border}`}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${ctx.color}`}>
                        {ctx.label}
                      </span>

                      {/* Main Status Pill */}
                      {isResolved ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>✓ RESOLVED</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>🟡 CLAIMED ({issue.assignedTo || 'In Progress'})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>● OPEN</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                      {issue.questionTitle}
                    </h3>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
                    {/* Student WhatsApp Chat */}
                    {issue.studentWhatsapp || issue.studentPhone ? (
                      <a
                        href={`https://wa.me/${(issue.studentWhatsapp || issue.studentPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hello ${issue.studentName} (PRN: ${issue.studentPrn}), regarding the issue you raised on LogicQ for "${issue.questionTitle}": `
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                        title={`Open WhatsApp chat with ${issue.studentName} (${(issue.studentWhatsapp || issue.studentPhone || '').replace(/[^0-9+]/g, '')})`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    ) : editingPhoneIssueId === issue.id ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-emerald-500/30">
                        <span className="text-[11px] font-mono pl-1 text-slate-500 dark:text-slate-400 font-bold">+91</span>
                        <input
                          type="tel"
                          autoFocus
                          placeholder="10-digit number"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          className="w-28 px-2 py-1 text-xs font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePhone(issue.id, tempPhone)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPhoneIssueId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhoneIssueId(issue.id);
                          setTempPhone('');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition flex items-center gap-1 cursor-pointer shrink-0"
                        title="Add student WhatsApp number"
                      >
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span>+ WhatsApp</span>
                      </button>
                    )}

                    {/* Dynamic Action Buttons based on Issue Status & Ownership */}
                    {isOpen && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleClaimIssue(issue)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                          title={`Claim this issue as ${activeSolver}`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>✋ Claim Issue</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolveIssue(issue)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer shrink-0"
                          title="Directly mark resolved without claiming"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                      </>
                    )}

                    {isInProgress && (
                      <>
                        {isMine ? (
                          <>
                            <GalaxyButton
                              onClick={() => handleResolveIssue(issue)}
                              size="xs"
                              hue={160}
                              text="Mark Resolved"
                              icon={<Check className="w-3.5 h-3.5" />}
                              iconPosition="left"
                            />
                            <button
                              type="button"
                              onClick={() => handleReleaseIssue(issue)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Release issue back to Open queue"
                            >
                              <span>Release</span>
                            </button>
                          </>
                        ) : isSomeoneElse ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `This issue is currently being worked on by "${issue.assignedTo}".\n\nAre you sure you want to take over and claim it for yourself (${activeSolver})?`
                                  )
                                ) {
                                  handleClaimIssue(issue, activeSolver);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition flex items-center gap-1 cursor-pointer"
                              title={`Currently locked by ${issue.assignedTo}. Click to reassign to yourself.`}
                            >
                              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Take Over / Reassign</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Mark this issue resolved on behalf of "${issue.assignedTo}"?`)) {
                                  handleResolveIssue(issue);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          </>
                        ) : (
                          <GalaxyButton
                            onClick={() => handleResolveIssue(issue)}
                            size="xs"
                            hue={160}
                            text="Mark Resolved"
                            icon={<Check className="w-3.5 h-3.5" />}
                            iconPosition="left"
                          />
                        )}
                      </>
                    )}

                    {isResolved && (
                      <button
                        type="button"
                        onClick={() => handleReopenIssue(issue)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        title="Reopen issue and return to Open queue"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    )}

                    {/* Delete trash button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteIssue(issue.id)}
                      title="Delete reported issue"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Student's explanation callout */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-rose-500 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-sans mb-1">
                    Student Issue Description:
                  </div>
                  {issue.description}
                </div>

                {/* Footer Info: Student details + Timestamps */}
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{issue.studentName}</span>
                    <span className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {issue.studentPrn}
                    </span>
                    {issue.studentEmail && (
                      <a
                        href={`mailto:${issue.studentEmail}?subject=${encodeURIComponent(`LogicQ Support: Regarding "${issue.questionTitle}"`)}&body=${encodeURIComponent(`Dear ${issue.studentName},\n\nRegarding the issue you flagged for "${issue.questionTitle}":\n\n`)}`}
                        className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 transition cursor-pointer"
                        title={`Click to email ${issue.studentEmail}`}
                      >
                        <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>{issue.studentEmail}</span>
                      </a>
                    )}
                    {issue.studentWhatsapp || issue.studentPhone ? (
                      <a
                        href={`https://wa.me/${(issue.studentWhatsapp || issue.studentPhone || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                        title="Click to WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-500" />
                        <span>{issue.studentWhatsapp || issue.studentPhone}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>No WhatsApp</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Corner Status & Solver Information */}
                    {isResolved ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Issue Solved by <strong className="font-bold text-emerald-900 dark:text-emerald-100 underline decoration-emerald-500/40">{issue.resolvedBy || issue.assignedTo || activeSolver}</strong></span>
                        <span className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                          ({new Date(issue.resolvedAt || issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })})
                        </span>
                      </div>
                    ) : isInProgress ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Claimed by <strong className="font-bold text-amber-900 dark:text-amber-100">{issue.assignedTo || activeSolver}</strong></span>
                        <span className="text-[11px] font-mono text-amber-700/80 dark:text-amber-400/80">
                          ({new Date(issue.assignedAt || issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400" title="Reported at">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Reported:{' '}
                          {new Date(issue.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
