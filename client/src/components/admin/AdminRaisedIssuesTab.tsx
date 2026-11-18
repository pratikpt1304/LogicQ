import React, { useState, useEffect, useMemo } from 'react';
import {
  Flag,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  User,
  UserCheck,
  Edit3,
  MessageSquare,
  MessageCircle,
  Phone,
  X,
  Mail,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
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
    border: 'border-amber-500/20 dark:border-amber-500/30',
  },
  TEST_CASE_MISMATCH: {
    label: 'Test Case Mismatch',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/20 dark:border-rose-500/30',
  },
  COMPILER_OR_TIMEOUT: {
    label: 'Compiler / Timeout',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    border: 'border-purple-500/20 dark:border-purple-500/30',
  },
  TYPO_OR_CLARITY: {
    label: 'Typo / Clarity',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/20 dark:border-blue-500/30',
  },
  OTHER: {
    label: 'Platform Feedback',
    color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/20 dark:border-slate-700/60',
  },
};

const CONTEXT_MAP: Record<string, { label: string; color: string }> = {
  PRACTICE: {
    label: 'Practice Problem',
    color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  },
  EXAM: {
    label: 'Proctored Exam',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  },
  LAB_INTERNAL: {
    label: 'Continuous Lab Internal',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
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

export interface AdminRaisedIssuesTabProps {
  allowedStudents?: any[];
}

export const AdminRaisedIssuesTab: React.FC<AdminRaisedIssuesTabProps> = ({
  allowedStudents,
}) => {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = Boolean(isAdmin || user?.email === 'logicqarena@gmail.com' || user?.email === 'hariprasathset@sanjivani.edu.in');
  const allowedPrns = useMemo(() => new Set((allowedStudents || []).map((s: any) => String(s.prn || '').toUpperCase().trim())), [allowedStudents]);
  const allowedEmails = useMemo(() => new Set((allowedStudents || []).map((s: any) => String(s.email || '').toLowerCase().trim())), [allowedStudents]);

  const [issues, setIssues] = useState<RaisedIssue[]>([]);
  const [, setIsLoading] = useState(true);
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
    return 'Pratik';
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
        }).catch((err) => console.warn('Primary updateDoc notice:', err));

        // Sync duplicate reports from the same student
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
      } else {
        // Find matching Firestore doc if issue originally had local- ID
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
            if (isMatch) {
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

      toast.success(`Claimed by ${solver}! Issue locked.`);
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

  // Visible issues strictly isolated to this faculty's students
  const visibleIssues = useMemo(() => {
    if (isSuperAdmin || !allowedStudents) return issues;
    return issues.filter((iss) => {
      const p = String(iss.studentPrn || '').toUpperCase().trim();
      const e = String(iss.studentEmail || '').toLowerCase().trim();
      if (p && allowedPrns.has(p)) return true;
      if (e && allowedEmails.has(e)) return true;
      if (iss.assignedEmail && iss.assignedEmail.toLowerCase().trim() === (user?.email || '').toLowerCase().trim()) return true;
      return false;
    });
  }, [issues, isSuperAdmin, allowedStudents, allowedPrns, allowedEmails, user]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return visibleIssues.filter((item) => {
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
  }, [visibleIssues, searchQuery, statusFilter, categoryFilter, activeSolver]);

  const openCount = visibleIssues.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = visibleIssues.filter((i) => i.status === 'IN_PROGRESS').length;
  const myAssignedCount = visibleIssues.filter((i) => i.status === 'IN_PROGRESS' && (i.assignedTo || '').toLowerCase().includes(activeSolver.toLowerCase().trim())).length;
  const resolvedCount = visibleIssues.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner - Apple Cupertino Frosted Design */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#121622]/80 backdrop-blur-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Student Flagged Issues
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/20 text-[11px] font-semibold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Live Team Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-normal leading-relaxed">
                Multi-agent ticket claiming &amp; resolution system. Prevents duplicate effort across faculty and support team members.
              </p>
            </div>
          </div>

          {/* Active Support Solver Identity Badge / Switcher */}
          <div className="flex items-center gap-3 bg-slate-50/90 dark:bg-white/[0.04] p-2 pl-3 pr-3.5 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] shadow-xs self-start md:self-auto shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {(activeSolver || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400 block leading-none">
                Acting As
              </span>
              {isEditingSolver ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    autoFocus
                    value={tempSolverName}
                    onChange={(e) => setTempSolverName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-36 px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveActiveSolver(tempSolverName);
                      if (e.key === 'Escape') setIsEditingSolver(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveActiveSolver(tempSolverName)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-semibold cursor-pointer transition shadow-xs"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSolver(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {activeSolver}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempSolverName(activeSolver);
                      setIsEditingSolver(true);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Change active solver name"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Switch</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Apple Control Center / Bento Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-100 dark:border-white/[0.06]">
          {/* Bento 1: Total */}
          <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-xl transition hover:border-slate-300 dark:hover:border-white/[0.15]">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Platform Total
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight block">
                {issues.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Total reported tickets
              </span>
            </div>
          </div>

          {/* Bento 2: Open */}
          <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-xl transition hover:border-slate-300 dark:hover:border-white/[0.15]">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Unassigned
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight block">
                {openCount}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Awaiting team claim
              </span>
            </div>
          </div>

          {/* Bento 3: Claimed */}
          <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-xl transition hover:border-slate-300 dark:hover:border-white/[0.15]">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                In Progress
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight block">
                {inProgressCount}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Actively being worked
              </span>
            </div>
          </div>

          {/* Bento 4: Resolved */}
          <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-xl transition hover:border-slate-300 dark:hover:border-white/[0.15]">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Resolved
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight block">
                {resolvedCount}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Successfully fixed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar - Apple Segmented Control */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#121622]/80 backdrop-blur-xl p-3 sm:p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Status Filters */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.08] gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs font-bold'
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
                  ? 'bg-white dark:bg-white/[0.12] text-amber-600 dark:text-amber-400 shadow-xs font-bold'
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
                  ? 'bg-white dark:bg-white/[0.12] text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
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
                  ? 'bg-white dark:bg-white/[0.12] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
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
                  ? 'bg-white dark:bg-white/[0.12] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:max-w-md">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, student, PRN..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.04] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.04] text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shrink-0 transition"
            >
              <option value="ALL">All Categories</option>
              <option value="TEST_CASE_MISMATCH">Test Case Mismatch</option>
              <option value="AMBIGUOUS_DESCRIPTION">Ambiguous Description</option>
              <option value="COMPILER_OR_TIMEOUT">Compiler Anomaly</option>
              <option value="TYPO_OR_CLARITY">Typo / Clarity</option>
              <option value="OTHER">Platform Feedback</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#121622]/80 backdrop-blur-xl p-12 text-center space-y-3 shadow-xs">
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
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const cat = CATEGORY_MAP[issue.category] || CATEGORY_MAP.OTHER;
            const ctx = CONTEXT_MAP[issue.contextType] || CONTEXT_MAP.PRACTICE;
            const isResolved = issue.status === 'RESOLVED';
            const isInProgress = issue.status === 'IN_PROGRESS';
            const isOpen = issue.status === 'OPEN' || (!isResolved && !isInProgress);

            const isMine =
              isInProgress &&
              Boolean(issue.assignedTo && issue.assignedTo.toLowerCase().trim() === activeSolver.toLowerCase().trim());
            const isSomeoneElse = isInProgress && !isMine;

            return (
              <div
                key={issue.id}
                className={`group rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-200 hover:shadow-lg space-y-4 ${
                  isResolved
                    ? 'border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-[#121622]/60 opacity-80 hover:opacity-100'
                    : isMine
                    ? 'border-blue-500/40 dark:border-blue-500/35 bg-white dark:bg-[#121622] shadow-sm'
                    : isSomeoneElse
                    ? 'border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#121622]'
                    : 'border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#121622] shadow-xs'
                }`}
              >
                {/* Header Row: Metadata capsules & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cat.color} ${cat.border}`}>
                        {cat.label}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${ctx.color}`}>
                        {ctx.label}
                      </span>

                      {/* Apple Status Capsule */}
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Resolved</span>
                        </span>
                      ) : isInProgress ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                          isMine
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25'
                            : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                        }`}>
                          {isMine ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Claimed by You ({issue.assignedTo || activeSolver})</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Claimed by {issue.assignedTo || 'Team Member'}</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Open Issue</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                      {issue.questionTitle}
                    </h3>
                  </div>

                  {/* Actions Bar - Apple Cupertino Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
                    {/* Student WhatsApp Chat */}
                    {issue.studentWhatsapp || issue.studentPhone ? (
                      <a
                        href={`https://wa.me/${(issue.studentWhatsapp || issue.studentPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hello ${issue.studentName} (PRN: ${issue.studentPrn}), regarding the issue you raised on LogicQ for "${issue.questionTitle}": `
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition active:scale-95 cursor-pointer shrink-0"
                        title={`Open WhatsApp chat with ${issue.studentName} (${(issue.studentWhatsapp || issue.studentPhone || '').replace(/[^0-9+]/g, '')})`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70" />
                      </a>
                    ) : editingPhoneIssueId === issue.id ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-emerald-500/40">
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
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition flex items-center gap-1 cursor-pointer shrink-0"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs hover:shadow active:scale-95 transition cursor-pointer shrink-0"
                          title={`Claim this issue as ${activeSolver}`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Claim Issue</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolveIssue(issue)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow active:scale-95 transition cursor-pointer shrink-0"
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
                            <button
                              type="button"
                              onClick={() => handleResolveIssue(issue)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow active:scale-95 transition cursor-pointer shrink-0"
                              title="Mark issue as resolved"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReleaseIssue(issue)}
                              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
                              title="Release issue back to Open queue"
                            >
                              Release
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `This issue is currently claimed by "${issue.assignedTo}".\n\nDo you want to reassign / take over this issue as "${activeSolver}"?`
                                  )
                                ) {
                                  handleClaimIssue(issue, activeSolver);
                                }
                              }}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition cursor-pointer px-1"
                              title={`Take over from ${issue.assignedTo}`}
                            >
                              Take over
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Mark this issue resolved on behalf of "${issue.assignedTo}"?`)) {
                                  handleResolveIssue(issue);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                              title="Resolve on behalf of solver"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {isResolved && (
                      <button
                        type="button"
                        onClick={() => handleReopenIssue(issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300"
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

                {/* Student's explanation callout - Apple Notes / Messages Style */}
                <div className="rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] p-4 sm:p-4.5 transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      Student Reported Observation
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      PRN {issue.studentPrn}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-normal text-slate-800 dark:text-slate-100 leading-relaxed font-sans select-text">
                    {issue.description}
                  </p>
                </div>

                {/* Footer Info: Student details + Timestamps */}
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {(issue.studentName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{issue.studentName}</span>
                    <span className="font-mono text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
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
                        className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
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
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          Issue Solved by <strong className="font-bold text-emerald-900 dark:text-emerald-100">{issue.resolvedBy || issue.assignedTo || activeSolver}</strong>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                          ({new Date(issue.resolvedAt || issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })})
                        </span>
                      </div>
                    ) : isInProgress ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>
                          Claimed by <strong className="font-bold text-blue-900 dark:text-blue-100">{issue.assignedTo || activeSolver}</strong>
                        </span>
                        <span className="text-[11px] font-mono text-blue-600/80 dark:text-blue-400/80">
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
