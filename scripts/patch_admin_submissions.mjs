import fs from 'fs';

const filePath = 'client/src/components/admin/AdminTopicPracticeSubmissions.tsx';

const newCode = `import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  Code2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Copy,
  Check,
  Eye,
  RefreshCw,
  X,
  Layers,
  ShieldAlert,
  Terminal,
  User,
  ExternalLink,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  ListOrdered,
  FileCode,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPracticeTime } from '../practice/PracticeTimer.js';

export interface ActivityLogEntry {
  time: string;
  elapsedSec?: number;
  event: string;
  detail?: string;
}

export interface TopicSubmissionItem {
  id: string;
  userId: string;
  topicId: string;
  moduleIndex: number;
  moduleSlug: string;
  topicTitle: string;
  difficulty: string;
  status: 'SOLVED' | 'IN_PROGRESS';
  timeTakenSeconds?: number | null;
  attemptsCount: number;
  tabSwitchCount: number;
  copyPasteAttempts: number;
  fullscreenExitCount?: number;
  typingVelocityCPM?: number;
  cheatProbability?: 'CLEAN' | 'SUSPICIOUS' | 'LIKELY_CHEATED' | string;
  cheatReason?: string | null;
  activityLogs?: string | ActivityLogEntry[] | null;
  code?: string | null;
  verdict: string;
  firstOpenedAt: string;
  lastOpenedAt: string;
  solvedAt?: string | null;
  updatedAt: string;
  user?: {
    id: string;
    prn?: string | null;
    email: string;
    displayName?: string | null;
    fullName?: string | null;
    username: string;
    college?: string | null;
    department?: string | null;
    year?: string | null;
    division?: string | null;
  };
}

export const AdminTopicPracticeSubmissions: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [inspectingItem, setInspectingItem] = useState<TopicSubmissionItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'code' | 'logs'>('code');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Fetch topic practice submissions
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-topic-practice-submissions', page, selectedModule, selectedStatus, selectedRisk, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      if (selectedModule !== 'ALL') params.append('moduleIndex', selectedModule);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedRisk !== 'ALL') params.append('cheatProbability', selectedRisk);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get<any>(\`/practice/admin/topic-submissions?\${params.toString()}\`);
      return res.data || res;
    },
    refetchInterval: 5000,
  });

  const items: TopicSubmissionItem[] = data?.items || [];
  const stats = data?.stats || {
    totalTracked: 0,
    solvedCount: 0,
    inProgressCount: 0,
    totalAttempts: 0,
    totalTabSwitches: 0,
    totalCopyPasteAttempts: 0,
    totalFullscreenExits: 0,
    likelyCheatedCount: 0,
    suspiciousCount: 0,
    cleanCount: 0,
  };
  const totalPages = data?.totalPages || 1;

  const handleCopyCode = (codeText?: string | null) => {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    toast.success('Student solution code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const parseLogs = (logsRaw?: string | ActivityLogEntry[] | null): ActivityLogEntry[] => {
    if (!logsRaw) return [];
    if (Array.isArray(logsRaw)) return logsRaw;
    try {
      const parsed = JSON.parse(logsRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const renderCheatBadge = (item: TopicSubmissionItem) => {
    const risk = item.cheatProbability || 'CLEAN';
    if (risk === 'LIKELY_CHEATED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>Likely Cheated</span>
        </span>
      );
    }
    if (risk === 'SUSPICIOUS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Suspicious</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>Clean</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </span>
            <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              Practice Modules: Student Submissions &amp; Proctoring Radar
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 max-w-2xl">
            Live telemetry tracking every module practice question opened or solved. Includes real-time typing velocity (CPM), paste attempts, tab switches, full-screen exits, and individual student event timeline logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={\`w-3.5 h-3.5 \${isFetching ? 'animate-spin text-cyan-400' : ''}\`} />
          <span>{isFetching ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="glass-card p-3 rounded-xl border border-white/[0.06] bg-dark-900/60">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Questions</span>
          <span className="text-lg font-bold font-mono text-white">{stats.totalTracked}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] font-mono text-emerald-400 block uppercase font-semibold">Solved</span>
          <span className="text-lg font-bold font-mono text-emerald-400">{stats.solvedCount}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-400 block uppercase font-semibold">In Progress</span>
          <span className="text-lg font-bold font-mono text-amber-400">{stats.inProgressCount}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <span className="text-[10px] font-mono text-purple-400 block uppercase font-semibold">Question Opens</span>
          <span className="text-lg font-bold font-mono text-purple-300">{stats.totalAttempts}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
          <span className="text-[10px] font-mono text-orange-400 block uppercase font-semibold">Tab Switches</span>
          <span className="text-lg font-bold font-mono text-orange-400">{stats.totalTabSwitches}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <span className="text-[10px] font-mono text-rose-400 block uppercase font-semibold">Pastes Blocked</span>
          <span className="text-lg font-bold font-mono text-rose-400">{stats.totalCopyPasteAttempts}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-sky-500/20 bg-sky-500/5">
          <span className="text-[10px] font-mono text-sky-400 block uppercase font-semibold">Fullscr Exits</span>
          <span className="text-lg font-bold font-mono text-sky-400">{stats.totalFullscreenExits || 0}</span>
        </div>

        <div className="glass-card p-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <span className="text-[10px] font-mono text-red-400 block uppercase font-semibold">Likely Cheated</span>
          <span className="text-lg font-bold font-mono text-red-300">{stats.likelyCheatedCount || 0}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl border border-white/[0.08] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student PRN, Name, Email, or Question Title..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-dark-950 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Modules (1-4)</option>
            <option value="1">Module 1: Control Structures</option>
            <option value="2">Module 2: Pointers &amp; Functions</option>
            <option value="3">Module 3: Arrays &amp; Strings</option>
            <option value="4">Module 4: Advanced &amp; DMA</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="SOLVED">Solved (Accepted)</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>
        </div>

        {/* Cheat Risk Filter */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedRisk}
            onChange={(e) => {
              setSelectedRisk(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Cheat Risks</option>
            <option value="LIKELY_CHEATED">Likely Cheated Only 🔴</option>
            <option value="SUSPICIOUS">Suspicious Only 🟡</option>
            <option value="CLEAN">Clean Submissions Only 🟢</option>
          </select>
        </div>
      </div>

      {/* Main Submissions Table */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
            Loading student practice submissions &amp; telemetry...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            No practice question submissions or student activity found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3.5">Student / PRN</th>
                  <th className="px-4 py-3.5">Academic</th>
                  <th className="px-4 py-3.5">Practice Question</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Time Taken</th>
                  <th className="px-4 py-3.5">
                    <span title="Increments each time student opens question">Opens</span>
                  </th>
                  <th className="px-4 py-3.5">Proctoring Telemetry</th>
                  <th className="px-4 py-3.5">Cheat Risk</th>
                  <th className="px-4 py-3.5">Last Activity</th>
                  <th className="px-4 py-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Student / PRN */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-cyan-300 block text-xs">
                        {item.user?.prn || 'NO_PRN'}
                      </span>
                      <span className="text-white font-semibold text-xs block">
                        {item.user?.displayName || item.user?.fullName || item.user?.username || 'Student'}
                      </span>
                      <span className="text-slate-400 text-[10px] block">
                        {item.user?.email}
                      </span>
                    </td>

                    {/* Academic */}
                    <td className="px-4 py-3.5 text-slate-300">
                      <span className="block font-semibold text-slate-200">
                        {item.user?.department || '—'} {item.user?.division ? \`Div \${item.user.division}\` : ''}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {item.user?.year || '—'} • {item.user?.college || 'LogicQ'}
                      </span>
                    </td>

                    {/* Question / Topic */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Module {item.moduleIndex}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-white/10">
                          {item.difficulty}
                        </span>
                      </div>
                      <span className="font-bold text-white block text-xs max-w-xs truncate" title={item.topicTitle}>
                        {item.topicTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.topicId}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {item.status === 'SOLVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          SOLVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" />
                          IN PROGRESS
                        </span>
                      )}
                    </td>

                    {/* Time Taken / Solve Duration */}
                    <td className="px-4 py-3.5">
                      {item.timeTakenSeconds != null && item.timeTakenSeconds > 0 ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded w-fit">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {formatPracticeTime(item.timeTakenSeconds)}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Solved in {item.timeTakenSeconds}s
                          </span>
                        </div>
                      ) : item.status === 'SOLVED' ? (
                        <span className="text-[11px] text-emerald-400/80 font-mono">
                          &lt; 1 min
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* Attempts (Counted on every question open) */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex flex-col">
                        <span className="font-mono font-bold text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded w-fit">
                          {item.attemptsCount} {item.attemptsCount === 1 ? 'open' : 'opens'}
                        </span>
                      </div>
                    </td>

                    {/* Proctoring Telemetry */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={item.tabSwitchCount > 0 ? 'text-orange-400 font-bold' : 'text-slate-500'}>
                            {item.tabSwitchCount} tabs
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className={item.copyPasteAttempts > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                            {item.copyPasteAttempts} pastes
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className={(item.fullscreenExitCount || 0) > 0 ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                            {item.fullscreenExitCount || 0} fullscr
                          </span>
                        </div>

                        {item.typingVelocityCPM != null && item.typingVelocityCPM > 0 && (
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Velocity: <strong className={item.typingVelocityCPM >= 750 ? 'text-rose-400 font-extrabold' : 'text-amber-300'}>{item.typingVelocityCPM} CPM</strong></span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cheat Risk */}
                    <td className="px-4 py-3.5">
                      {renderCheatBadge(item)}
                    </td>

                    {/* Last Activity */}
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      <span className="block font-medium text-slate-300">
                        {formatDateTime(item.solvedAt || item.lastOpenedAt)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Started: {formatDateTime(item.firstOpenedAt)}
                      </span>
                    </td>

                    {/* Action: Inspect */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingItem(item);
                          setActiveModalTab('code');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Page {page} of {totalPages} ({data?.total || 0} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code & Proctoring Inspector Modal */}
      {inspectingItem && (() => {
        const logs = parseLogs(inspectingItem.activityLogs);
        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
          >
            <div className="w-full max-w-4xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-5 space-y-4 max-h-[92vh] flex flex-col bg-slate-900/95">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">
                      {inspectingItem.topicTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      Module {inspectingItem.moduleIndex}
                    </span>
                    {inspectingItem.status === 'SOLVED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                        ACCEPTED / SOLVED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                        IN PROGRESS
                      </span>
                    )}
                    {renderCheatBadge(inspectingItem)}
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Student: <strong className="text-white">{inspectingItem.user?.displayName || inspectingItem.user?.fullName || inspectingItem.user?.username}</strong>
                    {' • '}PRN: <span className="text-cyan-300 font-bold">{inspectingItem.user?.prn || 'NO_PRN'}</span>
                    {' • '}Email: <span className="text-slate-300">{inspectingItem.user?.email}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cheat Risk Summary Box */}
              <div className={\`p-3.5 rounded-xl border font-mono text-xs flex items-start gap-2.5 \${
                inspectingItem.cheatProbability === 'LIKELY_CHEATED'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : inspectingItem.cheatProbability === 'SUSPICIOUS'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }\`}>
                {inspectingItem.cheatProbability === 'LIKELY_CHEATED' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : inspectingItem.cheatProbability === 'SUSPICIOUS' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold uppercase tracking-wider text-[11px]">
                    Proctoring Risk Verdict: {inspectingItem.cheatProbability || 'CLEAN'}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                    {inspectingItem.cheatReason || 'Normal human typing flow and zero or minimal tab switches.'}
                  </div>
                </div>
              </div>

              {/* Telemetry Metric Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Time Taken</span>
                  <span className="text-xs font-bold font-mono text-indigo-300">
                    {inspectingItem.timeTakenSeconds != null && inspectingItem.timeTakenSeconds > 0
                      ? formatPracticeTime(inspectingItem.timeTakenSeconds)
                      : inspectingItem.status === 'SOLVED'
                      ? '< 1 min'
                      : 'In Progress'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Opens / Attempts</span>
                  <span className="text-xs font-bold font-mono text-purple-300">
                    {inspectingItem.attemptsCount}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Tab Switches</span>
                  <span className={\`text-xs font-bold font-mono \${inspectingItem.tabSwitchCount > 0 ? 'text-orange-400' : 'text-slate-300'}\`}>
                    {inspectingItem.tabSwitchCount}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Pastes Blocked</span>
                  <span className={\`text-xs font-bold font-mono \${inspectingItem.copyPasteAttempts > 0 ? 'text-rose-400' : 'text-slate-300'}\`}>
                    {inspectingItem.copyPasteAttempts}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Fullscr Exits</span>
                  <span className={\`text-xs font-bold font-mono \${(inspectingItem.fullscreenExitCount || 0) > 0 ? 'text-sky-400' : 'text-slate-300'}\`}>
                    {inspectingItem.fullscreenExitCount || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-white/[0.06] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Typing Velocity</span>
                  <span className={\`text-xs font-bold font-mono \${(inspectingItem.typingVelocityCPM || 0) >= 750 ? 'text-rose-400' : 'text-amber-300'}\`}>
                    {inspectingItem.typingVelocityCPM ? \`\${inspectingItem.typingVelocityCPM} CPM\` : '—'}
                  </span>
                </div>
              </div>

              {/* Sub-view switcher: Submitted Code vs. Student Activity Audit Log */}
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('code')}
                  className={\`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition \${
                    activeModalTab === 'code'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white bg-white/[0.04]'
                  }\`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Submitted C Code ({(inspectingItem.code || '').length} chars)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('logs')}
                  className={\`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition \${
                    activeModalTab === 'logs'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white bg-white/[0.04]'
                  }\`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Student Activity Audit Log ({logs.length} events)</span>
                </button>
              </div>

              {/* Tab 1: Code Body */}
              {activeModalTab === 'code' && (
                <div className="relative flex-1 overflow-auto rounded-xl bg-dark-950 border border-white/[0.08] p-4 text-xs font-mono min-h-[280px]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(inspectingItem.code)}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition cursor-pointer z-10"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>

                  <pre className="text-slate-200 leading-relaxed overflow-x-auto pt-4">
                    <code>{inspectingItem.code || '// No code submitted yet by student.'}</code>
                  </pre>
                </div>
              )}

              {/* Tab 2: Activity Audit Log Timeline */}
              {activeModalTab === 'logs' && (
                <div className="flex-1 overflow-auto rounded-xl bg-dark-950 border border-white/[0.08] p-4 text-xs font-mono min-h-[280px] space-y-2.5">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No discrete telemetry event logs recorded for this attempt yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log, index) => {
                        const isTab = log.event === 'TAB_SWITCH';
                        const isPaste = log.event === 'PASTE_BLOCKED';
                        const isExit = log.event === 'FULLSCREEN_EXIT';
                        const isSolve = log.event === 'SOLVED_SUCCESS';
                        const isOpen = log.event === 'QUESTION_OPENED';

                        return (
                          <div
                            key={index}
                            className={\`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs \${
                              isSolve
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : isPaste
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                : isTab
                                ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                                : isExit
                                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                : isOpen
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                : 'bg-white/[0.03] border-white/[0.06] text-slate-300'
                            }\`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono uppercase bg-black/40">
                                {log.event}
                              </span>
                              <span className="text-white font-medium">
                                {log.detail || log.event}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0">
                              {log.elapsedSec != null && (
                                <span className="text-slate-300 font-bold">
                                  +{formatPracticeTime(log.elapsedSec)}
                                </span>
                              )}
                              <span>
                                {log.time ? new Date(log.time).toLocaleTimeString('en-IN') : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs font-mono">
                <span className="text-slate-400">
                  Last activity updated: {formatDateTime(inspectingItem.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 rounded-xl font-bold bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] transition cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
`;

fs.writeFileSync(filePath, newCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated AdminTopicPracticeSubmissions.tsx with Cheat Risk, Velocity, Fullscreen Exits, and Activity Log Timeline!');
