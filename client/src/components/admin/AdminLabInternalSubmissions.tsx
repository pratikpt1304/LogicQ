import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Search,
  X,
  User,
  AlertTriangle,
  Filter,
} from 'lucide-react';

interface LabInternalSubmissionItem {
  id: string;
  userId: string;
  moduleSlug: string;
  moduleOrder: number;
  totalProblems: number;
  solvedProblems: number;
  timeTakenSeconds?: number | null;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  submittedAt?: string | null;
  code?: string | null;
  user?: {
    id: string;
    prn?: string | null;
    email: string;
    displayName?: string | null;
    fullName?: string | null;
    username: string;
    college?: string | null;
    division?: string | null;
    year?: string | null;
  };
}

const MODULE_LABELS: Record<string, string> = {
  'control-structures': 'Module 1 – Control Structures',
  'pointers-and-functions': 'Module 2 – Pointers & Functions',
  'arrays-and-strings': 'Module 3 – Arrays & Strings',
  'recursion-and-bit-manipulation': 'Module 4 – Structs & Memory',
  'structures-unions-and-dma': 'Module 5 – Structures & DMA',
};

function formatTime(secs?: number | null): string {
  if (!secs || secs <= 0) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export const AdminLabInternalSubmissions: React.FC = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'IN_PROGRESS'>('all');
  const [inspectItem, setInspectItem] = useState<LabInternalSubmissionItem | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-lab-internal-submissions', moduleFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (moduleFilter !== 'all') params.set('module', moduleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '200');
      return api.get(`/practice/admin/lab-submissions?${params.toString()}`);
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const rawItems: LabInternalSubmissionItem[] = data?.data?.submissions || [];

  // Filter by search
  const items = rawItems.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.user?.prn?.toLowerCase().includes(q) ||
      item.user?.displayName?.toLowerCase().includes(q) ||
      item.user?.fullName?.toLowerCase().includes(q) ||
      item.user?.email?.toLowerCase().includes(q) ||
      item.moduleSlug?.toLowerCase().includes(q)
    );
  });

  const totalCompleted = items.filter((i) => i.status === 'COMPLETED').length;
  const totalInProgress = items.filter((i) => i.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl border border-purple-500/20 p-5 bg-purple-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)] font-mono uppercase tracking-wider">
                Lab Internal Submissions
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                All student lab internal module submissions & progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Summary Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono">
            <span className="text-[var(--text-muted)] mr-1.5">Total Records:</span>
            <span className="font-bold text-[var(--text-main)]">{items.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
            <span className="text-emerald-400 font-semibold mr-1.5">Completed:</span>
            <span className="font-bold text-emerald-300">{totalCompleted}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono">
            <span className="text-amber-400 font-semibold mr-1.5">In Progress:</span>
            <span className="font-bold text-amber-300">{totalInProgress}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PRN, name, email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-mono bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-mono bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-main)] focus:outline-none"
          >
            <option value="all">All Modules</option>
            <option value="control-structures">Module 1</option>
            <option value="pointers-and-functions">Module 2</option>
            <option value="arrays-and-strings">Module 3</option>
            <option value="recursion-and-bit-manipulation">Module 4</option>
            <option value="structures-unions-and-dma">Module 5</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'COMPLETED' | 'IN_PROGRESS')}
            className="px-3 py-2 rounded-xl text-xs font-mono bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-main)] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass-card rounded-2xl border border-[var(--border-line)] p-8 text-center">
          <div className="animate-spin w-7 h-7 border-2 border-purple-400 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-[var(--text-muted)] font-mono mt-3">Loading lab internal submissions...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl border border-rose-500/20 p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-400 font-mono">Failed to load submissions. The /api/practice/admin/lab-submissions endpoint may need to be created.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-2xl border border-[var(--border-line)] p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
          <p className="text-xs text-[var(--text-muted)] font-mono">No lab internal submissions found yet.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-[var(--border-line)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border-line)] bg-[var(--bg-surface)]/80">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Student</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Module</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Progress</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Time Taken</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Submitted At</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-line)]/50">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-surface)]/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-main)] text-[11px]">
                            {item.user?.displayName || item.user?.fullName || item.user?.username || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {item.user?.prn || item.user?.email || item.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-main)] font-semibold">
                        {MODULE_LABELS[item.moduleSlug] || item.moduleSlug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, ((item.solvedProblems / (item.totalProblems || 20)) * 100))}%` }}
                          />
                        </div>
                        <span className="text-[var(--text-muted)]">
                          {item.solvedProblems}/{item.totalProblems || 20}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {formatTime(item.timeTakenSeconds)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setInspectItem(item)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectItem(null)}
        >
          <div
            className="glass-card border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-main)] font-mono">
                Lab Submission – {MODULE_LABELS[inspectItem.moduleSlug] || inspectItem.moduleSlug}
              </h3>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono text-[var(--text-muted)]">
              <div><span className="text-[var(--text-main)] font-bold">Student: </span>{inspectItem.user?.displayName || inspectItem.user?.fullName || 'Unknown'}</div>
              <div><span className="text-[var(--text-main)] font-bold">PRN: </span>{inspectItem.user?.prn || '—'}</div>
              <div><span className="text-[var(--text-main)] font-bold">Division: </span>{inspectItem.user?.division || '—'}</div>
              <div><span className="text-[var(--text-main)] font-bold">Progress: </span>{inspectItem.solvedProblems}/{inspectItem.totalProblems || 20} solved</div>
              <div><span className="text-[var(--text-main)] font-bold">Status: </span>{inspectItem.status}</div>
              <div><span className="text-[var(--text-main)] font-bold">Time Taken: </span>{formatTime(inspectItem.timeTakenSeconds)}</div>
              <div><span className="text-[var(--text-main)] font-bold">Submitted At: </span>{inspectItem.submittedAt ? new Date(inspectItem.submittedAt).toLocaleString('en-IN') : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
