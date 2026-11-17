import React, { useState, useEffect, useMemo } from 'react';
import {
  Flag,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Search,
  Sparkles,
  BookOpen,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { useAuth } from '../../context/AuthContext.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';

export interface StudentIssueItem {
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
  resolutionComment?: string;
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

const deduplicateStudentIssues = (rawList: StudentIssueItem[]): StudentIssueItem[] => {
  const uniqueMap = new Map<string, StudentIssueItem>();
  for (const item of rawList) {
    const title = (item.questionTitle || '').trim().toLowerCase();
    const desc = (item.description || '').trim().toLowerCase();
    const sig = `${title}:::${desc}`;

    if (!uniqueMap.has(sig)) {
      uniqueMap.set(sig, item);
    } else {
      const existing = uniqueMap.get(sig)!;
      if (item.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
        uniqueMap.set(sig, item);
      }
    }
  }
  return Array.from(uniqueMap.values());
};

interface StudentIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentIssuesModal: React.FC<StudentIssuesModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<StudentIssueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  const myPrn = (user?.prn || '').toUpperCase().trim();
  const myEmail = (user?.email || '').toLowerCase().trim();
  const myId = user?.id || '';

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const loadLocalIssues = (): StudentIssueItem[] => {
      try {
        const storedKey = 'logicq_faculty_raised_issues';
        const raw = localStorage.getItem(storedKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((item: any) => ({
          id: item.id || `local-${Math.random().toString(36).substring(2, 7)}`,
          questionId: item.questionId || 'general',
          questionTitle: item.questionTitle || 'Assessment Question',
          contextType: item.contextType || 'PRACTICE',
          category: item.category || 'OTHER',
          description: item.description || '',
          studentId: item.studentId || '',
          studentName: item.studentName || 'Student Candidate',
          studentPrn: item.studentPrn || '',
          studentEmail: item.studentEmail || '',
          studentPhone: item.studentPhone || item.studentWhatsapp || '',
          studentWhatsapp: item.studentWhatsapp || item.studentPhone || '',
          createdAt: item.createdAt || new Date().toISOString(),
          status: item.status || 'OPEN',
          resolutionComment: item.resolutionComment,
          resolvedAt: item.resolvedAt,
        }));
      } catch {
        return [];
      }
    };

    // Live listener on Cloud Firestore 'raised_issues'
    const unsub = onSnapshot(
      collection(db, 'raised_issues'),
      (snap) => {
        const cloudList: StudentIssueItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const pPrn = String(data.studentPrn || '').toUpperCase().trim();
          const pEmail = String(data.studentEmail || '').toLowerCase().trim();
          const pId = String(data.studentId || '').trim();

          const isMine =
            (myPrn && pPrn && (pPrn === myPrn || myPrn.includes(pPrn) || pPrn.includes(myPrn))) ||
            (myEmail && pEmail && pEmail === myEmail) ||
            (myId && pId && pId === myId);

          if (isMine) {
            cloudList.push({
              id: d.id,
              questionId: data.questionId || 'general',
              questionTitle: data.questionTitle || 'Assessment Question',
              contextType: data.contextType || 'PRACTICE',
              category: data.category || 'OTHER',
              description: data.description || '',
              studentId: data.studentId || '',
              studentName: data.studentName || 'Student',
              studentPrn: data.studentPrn || '',
              studentEmail: data.studentEmail || '',
              studentPhone: data.studentPhone || data.studentWhatsapp || '',
              studentWhatsapp: data.studentWhatsapp || data.studentPhone || '',
              createdAt: data.createdAt || new Date().toISOString(),
              status: data.status || 'OPEN',
              resolutionComment: data.resolutionComment,
              resolvedAt: data.resolvedAt,
            });
          }
        });

        // Merge local storage items that might not yet be in cloud
        const localItems = loadLocalIssues();
        localItems.forEach((local) => {
          const exists = cloudList.some(
            (c) =>
              c.id === local.id ||
              (c.questionId === local.questionId && c.description === local.description)
          );
          if (!exists) {
            cloudList.push(local);
          }
        });

        const cleanList = deduplicateStudentIssues(cloudList);
        cleanList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setIssues(cleanList);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Student raised_issues listener notice:', err);
        const localItems = loadLocalIssues();
        setIssues(localItems);
        setIsLoading(false);
      }
    );

    const unsubMesh = realtimeSync.on('ISSUES', () => {
      const localItems = loadLocalIssues();
      setIssues((prev) => {
        const map = new Map<string, StudentIssueItem>();
        prev.forEach((i) => map.set(i.id, i));
        localItems.forEach((i) => {
          if (!map.has(i.id)) map.set(i.id, i);
        });
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    });

    return () => {
      unsub();
      unsubMesh();
    };
  }, [isOpen, myPrn, myEmail, myId]);

  const totalReported = issues.length;
  const pendingCount = issues.filter((i) => i.status !== 'RESOLVED').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQ =
          item.questionTitle.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }
      if (statusFilter === 'OPEN' && item.status === 'RESOLVED') return false;
      if (statusFilter === 'RESOLVED' && item.status !== 'RESOLVED') return false;
      return true;
    });
  }, [issues, searchQuery, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">My Reported Issues</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {totalReported} Flagged
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Track issues you flagged during practice or tests &amp; their resolution status by Faculty.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Metric Summary Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 bg-slate-50/40 dark:bg-slate-900/40 border-b border-[var(--border)] shrink-0">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">{totalReported}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pending</span>
              <span className="font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400">{pendingCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Resolved</span>
              <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({totalReported})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'OPEN'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'RESOLVED'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in questions or reports..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading your reported issues...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {searchQuery ? 'No Matching Issues Found' : 'No Issues Reported Yet'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try adjusting your search terms or filter.'
                    : 'Whenever you notice an ambiguous question description, test case mismatch, or compiler anomaly, click "Raise Issue" to alert faculty.'}
                </p>
              </div>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const cat = CATEGORY_MAP[issue.category] || CATEGORY_MAP.OTHER;
              const ctx = CONTEXT_MAP[issue.contextType] || CONTEXT_MAP.PRACTICE;
              const isResolved = issue.status === 'RESOLVED';

              return (
                <div
                  key={issue.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-xs transition hover:shadow-sm space-y-3 ${
                    isResolved
                      ? 'border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top Bar: Problem Title & Status Badge */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${ctx.color}`}>
                          {ctx.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.color} ${cat.border}`}>
                          {cat.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{issue.questionTitle}</span>
                      </h4>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolved by Faculty</span>
                        </span>
                      ) : issue.status === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>In Progress • Reviewing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Faculty Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Description */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">Your Report:</span>
                    {issue.description}
                  </div>

                  {/* Faculty Resolution Note (if any) */}
                  {issue.resolutionComment && (
                    <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Faculty Resolution Note:</span>
                      </div>
                      <p className="leading-relaxed">{issue.resolutionComment}</p>
                    </div>
                  )}

                  {/* Footer Timestamp & Contact info */}
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span>
                        Reported:{' '}
                        {new Date(issue.createdAt).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(issue.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {(issue.studentWhatsapp || issue.studentPhone) && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                          WhatsApp: {issue.studentWhatsapp || issue.studentPhone}
                        </span>
                      )}
                    </div>
                    {isResolved && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Verified Clean
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-[var(--border)] flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 text-[11px]">
            Faculty reviews reported questions during lab internal &amp; exam evaluation.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
