import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  FileText,
  Download,
  Printer,
  Lock,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  BarChart3,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { formatPracticeTime } from './PracticeTimer.js';
import QRCode from 'qrcode';

export interface PracticeReportViewProps {
  user: {
    id: string;
    displayName?: string | null;
    shortId?: string | null;
    department?: string | null;
    year?: string | null;
    division?: string | null;
  };
}

// Config flag for enabling/disabling on-demand In-Progress report downloads (default: true)
export const ALLOW_IN_PROGRESS_REPORT_DOWNLOAD = true;

export const PracticeReportView: React.FC<PracticeReportViewProps> = ({ user }) => {
  const queryClient = useQueryClient();
  const [selectedReportType, setSelectedReportType] = useState<string>('module_1');
  const [allowPartial, setAllowPartial] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Handle cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Query modules status to check which modules are completed (10/10)
  const { data: modulesData } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
  });

  const modulesList: any[] = modulesData?.data?.modules || [];
  const allCompleted = modulesList.length === 4 && modulesList.every((m) => m.isCompleted);

  // Active query based on selectedReportType
  const isFinalSelected = selectedReportType === 'final';
  const selectedModuleSlug = !isFinalSelected
    ? modulesList.find((m) => m.slug === selectedReportType || m.id === selectedReportType)?.slug ||
      modulesList[0]?.slug ||
      'control-structures'
    : null;

  const currentModule = modulesList.find((m) => m.slug === selectedModuleSlug);
  const currentModuleIndex = modulesList.findIndex((m) => m.slug === selectedModuleSlug);
  const isModuleUnlocked = Boolean(currentModule?.isCompleted);
  const isReportUnlocked = isFinalSelected ? allCompleted : isModuleUnlocked;

  const shouldFetchReport = Boolean(
    (isReportUnlocked || (allowPartial && ALLOW_IN_PROGRESS_REPORT_DOWNLOAD)) &&
      (isFinalSelected || selectedModuleSlug)
  );

  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['practice-report', isFinalSelected ? 'final' : selectedModuleSlug, allowPartial],
    queryFn: () => {
      const queryParam = allowPartial ? '?partial=true' : '';
      if (isFinalSelected) {
        return api.get(`/practice/reports/final${queryParam}`);
      }
      return api.get(`/practice/reports/module/${selectedModuleSlug}${queryParam}`);
    },
    enabled: shouldFetchReport,
    retry: false,
  });

  const report = reportData?.data?.report;

  // Generate QR Code whenever verificationUrl or reportId changes
  useEffect(() => {
    if (!report?.reportId) {
      setQrDataUrl('');
      return;
    }
    const targetUrl =
      report.verificationUrl || `${window.location.origin}/verify/report/${report.reportId}`;

    QRCode.toDataURL(targetUrl, {
      width: 140,
      margin: 2,
      color: {
        dark: '#0C0F1F',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.warn('QR generation error:', err));
  }, [report?.reportId, report?.verificationUrl]);

  // Handle rate-limited report regeneration
  const handleRegenerateReport = async () => {
    if (cooldownSeconds > 0 || regenerating) return;
    try {
      setRegenerating(true);
      const queryParam = allowPartial ? '?partial=true&regenerate=true' : '?regenerate=true';
      const endpoint = isFinalSelected
        ? `/practice/reports/final${queryParam}`
        : `/practice/reports/module/${selectedModuleSlug}${queryParam}`;

      const res = await api.get(endpoint);
      if (res.data?.success && res.data?.data) {
        queryClient.setQueryData(
          ['practice-report', isFinalSelected ? 'final' : selectedModuleSlug, allowPartial],
          res
        );
      }
      setCooldownSeconds(30);
    } catch (err: any) {
      if (err.response?.status === 429 && err.response?.data?.retryAfterSeconds) {
        setCooldownSeconds(err.response.data.retryAfterSeconds);
      } else {
        console.error('Failed to regenerate report:', err);
      }
    } finally {
      setRegenerating(false);
    }
  };

  // Format time display (caps extreme > 3h display as "3h+" while keeping raw precision in data/CSV)
  const formatTimeDisplay = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '—';
    if (seconds >= 10800) {
      return '3h+';
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // CSV Export handler with specified naming: LogicQ-Practice-Report-<Module-N or Final>-<YYYY-MM-DD>.csv
  const handleExportCsv = () => {
    if (!report) return;

    const headers = [
      'Problem Number',
      'Problem Title',
      'Difficulty',
      'Status',
      'Attempts',
      'First Attempt Accepted',
      'Time to First Attempt (mm:ss)',
      'Time to Solve (mm:ss)',
      'Active Seconds (Raw)',
      'Runs Count',
    ];

    const rows: string[][] = [];
    const dateStr = new Date().toISOString().slice(0, 10);
    const moduleLabel = isFinalSelected ? 'Final' : `Module-${currentModuleIndex >= 0 ? currentModuleIndex + 1 : 1}`;
    const filename = `LogicQ-Practice-Report-${moduleLabel}-${dateStr}.csv`;

    const questionList: any[] = report.questions || report.allQuestions || [];
    questionList.forEach((q, idx) => {
      rows.push([
        String(q.orderIndex || idx + 1),
        `"${(q.title || '').replace(/"/g, '""')}"`,
        q.difficulty || '',
        q.status || (q.isSolved ? 'SOLVED' : 'UNOPENED'),
        String(q.attempts || q.attemptsCount || 0),
        q.firstAttemptAccepted ? 'Yes' : 'No',
        q.timeToFirstAttemptFormatted || (q.timeToFirstAttemptSeconds ? formatPracticeTime(q.timeToFirstAttemptSeconds) : '—'),
        q.timeToSolveFormatted || (q.timeToSolveSeconds ? formatPracticeTime(q.timeToSolveSeconds) : '—'),
        String(q.timeToSolveSeconds || 0),
        String(q.runs || q.runsCount || 0),
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const moduleLabel = isFinalSelected ? 'Final' : `Module-${currentModuleIndex >= 0 ? currentModuleIndex + 1 : 1}`;
    const originalTitle = document.title;
    document.title = `LogicQ-Practice-Report-${moduleLabel}-${dateStr}`;
    window.print();
    document.title = originalTitle;
  };

  const displayName = user.displayName || `Student ${user.shortId || ''}`.trim();
  const isPartialReport = Boolean(report && !report.isCompleted);

  // Group questions by module for multi-page section rendering
  const questionsList: any[] = report?.questions || report?.allQuestions || [];
  const moduleSections = isFinalSelected
    ? modulesList.map((mod) => ({
        module: mod,
        questions: questionsList.filter((q) => q.moduleSlug === mod.slug),
      }))
    : [{ module: currentModule, questions: questionsList }];

  // Hardest 5 questions
  const hardestQuestions =
    report?.hardestQuestions?.byAttempts?.slice(0, 5) ||
    [...questionsList]
      .filter((q) => (q.attempts || 0) > 0)
      .sort((a, b) => (b.attempts || 0) - (a.attempts || 0))
      .slice(0, 5);

  return (
    <div className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-6">
      {/* Header and Report Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#252C4F] pb-5 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B9BFF]" />
            <h2 className="text-base font-bold text-[#E8EAF6] uppercase tracking-wide font-mono">
              Practice Report &amp; Performance Audit
            </h2>
          </div>
          <p className="text-xs text-[#9AA1C4]">
            Per-module report unlocks when all 10 problems in that module are solved. Final report when all 4 are.
          </p>
        </div>

        {/* Tab Selection buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {modulesList.map((mod, idx) => {
            const isSelected = selectedReportType === mod.slug;
            const completed = mod.isCompleted;
            return (
              <button
                key={mod.slug}
                type="button"
                onClick={() => {
                  setSelectedReportType(mod.slug);
                  setAllowPartial(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  isSelected
                    ? 'bg-[#8B9BFF] text-[#0C0F1F] font-bold shadow-sm'
                    : 'bg-[#0C0F1F] text-[#9AA1C4] hover:text-[#E8EAF6] border border-[#252C4F]'
                }`}
              >
                {!completed && <Lock className="w-3 h-3 text-[#9AA1C4]" />}
                <span>Module {idx + 1}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedReportType('final');
              setAllowPartial(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              isFinalSelected
                ? 'bg-[#8B9BFF] text-[#0C0F1F] font-bold shadow-sm'
                : 'bg-[#0C0F1F] text-[#9AA1C4] hover:text-[#E8EAF6] border border-[#252C4F]'
            }`}
          >
            {!allCompleted && <Lock className="w-3 h-3 text-[#9AA1C4]" />}
            <span>Final (All 4 Modules)</span>
          </button>
        </div>
      </div>

      {/* Unlocked / Locked Gate State */}
      {!isReportUnlocked && !allowPartial ? (
        <div className="p-8 rounded-2xl bg-[#0C0F1F] border border-[#252C4F] text-center space-y-4 print:hidden">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#8B9BFF]/10 flex items-center justify-center text-[#8B9BFF]">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#E8EAF6]">
              {isFinalSelected ? 'Final Report Locked' : 'Verified Module Report Locked'}
            </h3>
            <p className="text-xs text-[#9AA1C4] max-w-md mx-auto leading-relaxed">
              {isFinalSelected
                ? 'Complete all 80 questions across all 4 Practice modules to unlock your verified audit record and completion badge.'
                : `Complete all 10 problems in "${currentModule?.title || 'this module'}" to unlock the verified audit breakdown.`}
            </p>
          </div>

          <div className="text-xs font-mono text-[#8B9BFF] py-1">
            Current Module Progress: {currentModule?.solvedCount || 0}/10 solved
          </div>

          {/* Option to download partial report */}
          {ALLOW_IN_PROGRESS_REPORT_DOWNLOAD && (
            <div className="pt-2 border-t border-[#252C4F]/60 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setAllowPartial(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141932] hover:bg-[#252C4F] border border-[#252C4F] text-xs font-mono text-[#E8EAF6] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#8B9BFF]" />
                <span>Download In-Progress Partial Report</span>
              </button>
              <span className="block text-[11px] font-mono text-[#9AA1C4] mt-1.5">
                Clearly labeled &quot;In progress&quot; (no verified completion seal)
              </span>
            </div>
          )}
        </div>
      ) : isReportLoading ? (
        <div className="py-12 text-center space-y-2 print:hidden">
          <div className="w-4 h-4 rounded-full bg-[#8B9BFF] animate-ping mx-auto" />
          <p className="text-xs font-mono text-[#9AA1C4]">Generating practice audit report...</p>
        </div>
      ) : report ? (
        <div className="space-y-8" id="printable-practice-report">
          {/* =========================================================================
              PAGE 1: SUMMARY
              Title, Student Identity, Generation Date, Report ID, Key Figures
             ========================================================================= */}
          <section className="space-y-6 print-page-break-after print:pt-4">
            {/* Header / Subtitle */}
            <div className="p-6 rounded-2xl bg-[#0C0F1F] border border-[#252C4F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8B9BFF] font-bold block">
                  LogicQ Practice Record
                </span>
                <h1 className="text-2xl font-bold font-mono text-[#E8EAF6]">
                  LogicQ Practice Report
                </h1>
                <div className="flex items-center gap-2 pt-0.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wide uppercase ${
                      isPartialReport
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isPartialReport
                      ? 'In Progress (Unverified)'
                      : isFinalSelected
                      ? 'Final, all 4 modules'
                      : `Module ${currentModuleIndex >= 0 ? currentModuleIndex + 1 : 1}`}
                  </span>
                </div>
              </div>

              {/* Actions on Screen */}
              <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={handleRegenerateReport}
                  disabled={cooldownSeconds > 0 || regenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141932] hover:bg-[#252C4F] border border-[#252C4F] text-xs font-mono text-[#E8EAF6] transition-colors disabled:opacity-50"
                  title={cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s to regenerate` : 'Regenerate verified report'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#8B9BFF] ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{cooldownSeconds > 0 ? `Regenerate (${cooldownSeconds}s)` : 'Regenerate'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141932] hover:bg-[#252C4F] border border-[#252C4F] text-xs font-mono text-[#E8EAF6] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#8B9BFF]" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8B9BFF] hover:bg-[#9FAOFF] text-xs font-mono font-bold text-[#0C0F1F] transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Student Identity & Metadata Panel (NO PRN, NO M/F) */}
            <div className="p-5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#9AA1C4] block uppercase">Student</span>
                <strong className="text-sm text-[#E8EAF6] block truncate">{displayName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#9AA1C4] block uppercase">Department &amp; Year</span>
                <span className="text-[#E8EAF6]">
                  {user.department || 'Engineering'} • {user.year || 'FY'}
                  {user.division ? ` (Div ${user.division})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#9AA1C4] block uppercase">Generation Date</span>
                <span className="text-[#E8EAF6]">{new Date(report.generatedAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9AA1C4] block uppercase">Report ID</span>
                <code className="text-[#8B9BFF] font-bold text-[11px] block truncate" title={report.reportId}>
                  {report.reportId}
                </code>
              </div>
            </div>

            {/* Row of Summary Figures */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
                <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">Solved / Total</span>
                <span className="text-xl font-bold font-mono text-[#46D9A0]">
                  {report.totalSolved ?? report.totals?.solvedCount ?? 0}
                  <span className="text-xs text-[#9AA1C4] font-normal"> / {report.totalQuestions ?? report.totals?.totalQuestions ?? 10}</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
                <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">Total Attempts</span>
                <span className="text-xl font-bold font-mono text-[#E8EAF6]">
                  {report.totals?.totalAttempts ?? 0}
                  <span className="text-xs text-[#9AA1C4] font-normal"> ({report.totals?.totalRuns ?? 0} runs)</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
                <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">Total Active Time</span>
                <span className="text-xl font-bold font-mono text-[#8B9BFF]">
                  {formatTimeDisplay(report.totals?.totalActiveSeconds)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
                <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">1st Try Solved</span>
                <span className="text-xl font-bold font-mono text-[#E8EAF6]">
                  {report.totals?.firstAttemptSolves ?? 0}
                  <span className="text-xs text-[#9AA1C4] font-normal">
                    {' '}({report.totals?.firstAttemptRate ?? 0}%)
                  </span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
                <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">Avg Time / Q</span>
                <span className="text-xl font-bold font-mono text-[#8B9BFF]">
                  {formatTimeDisplay(report.totals?.averageActiveSeconds)}
                </span>
              </div>
            </div>

            {/* Visual Charts Section (Time & Attempts per Question) */}
            <div className="p-5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#E8EAF6] uppercase flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#8B9BFF]" />
                  <span>Question Performance Charts (Active Time &amp; Attempts)</span>
                </span>
                <span className="text-[10px] font-mono text-[#9AA1C4]">
                  Visual bar charts with accessible tabular summary
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Active Time Chart */}
                <div className="p-3.5 rounded-lg bg-[#141932] border border-[#252C4F] space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#8B9BFF] block">
                    Active Solve Time Distribution (mm:ss)
                  </span>
                  <div className="space-y-1 pt-1 max-h-56 overflow-y-auto">
                    {questionsList.slice(0, 10).map((q, idx) => {
                      const sec = q.timeToSolveSeconds || 0;
                      const maxSec = Math.max(...questionsList.map((x) => x.timeToSolveSeconds || 0), 60);
                      const widthPct = Math.min(100, Math.max(8, Math.round((sec / maxSec) * 100)));
                      return (
                        <div key={q.problemId || idx} className="space-y-0.5 text-[10px] font-mono">
                          <div className="flex justify-between text-[#9AA1C4]">
                            <span className="truncate max-w-[180px]">Q{idx + 1}: {q.title}</span>
                            <span className="font-bold text-[#8B9BFF]">{formatTimeDisplay(sec)}</span>
                          </div>
                          <div className="w-full bg-[#0C0F1F] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#8B9BFF] h-full rounded-full transition-all"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attempts Count Chart */}
                <div className="p-3.5 rounded-lg bg-[#141932] border border-[#252C4F] space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#46D9A0] block">
                    Submit Attempts Distribution
                  </span>
                  <div className="space-y-1 pt-1 max-h-56 overflow-y-auto">
                    {questionsList.slice(0, 10).map((q, idx) => {
                      const att = q.attempts || 0;
                      const maxAtt = Math.max(...questionsList.map((x) => x.attempts || 0), 5);
                      const widthPct = Math.min(100, Math.max(8, Math.round((att / maxAtt) * 100)));
                      return (
                        <div key={q.problemId || idx} className="space-y-0.5 text-[10px] font-mono">
                          <div className="flex justify-between text-[#9AA1C4]">
                            <span className="truncate max-w-[180px]">Q{idx + 1}: {q.title}</span>
                            <span className="font-bold text-[#46D9A0]">{att} attempts</span>
                          </div>
                          <div className="w-full bg-[#0C0F1F] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#46D9A0] h-full rounded-full transition-all"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Hardest Questions Callout (Top 5) & Encouraging Pedagogical Notes */}
            <div className="p-5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E8EAF6]">
                <TrendingUp className="w-4 h-4 text-[#8B9BFF]" />
                <span>YOUR HARDEST QUESTIONS (TOP 5 BY ATTEMPTS AND TIME)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {hardestQuestions.slice(0, 5).map((hq: any, idx: number) => (
                  <div key={hq.problemId || idx} className="p-3 rounded-lg bg-[#141932] border border-[#252C4F] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#9AA1C4] uppercase">Rank #{idx + 1}</span>
                      <span className="text-[10px] font-bold text-[#FF7A8A]">{hq.attempts || 0} attempts</span>
                    </div>
                    <strong className="text-[#E8EAF6] block text-xs truncate">{hq.title}</strong>
                    <span className="text-[11px] text-[#8B9BFF] block">
                      Active solve time: {formatTimeDisplay(hq.timeToSolveSeconds)}
                    </span>
                  </div>
                ))}
              </div>

              {report.diagnosticSummary && (
                <div className="pt-2 text-xs text-[#9AA1C4] leading-relaxed border-t border-[#252C4F]">
                  <strong className="text-[#E8EAF6]">Summary Notes: </strong>
                  {report.diagnosticSummary}
                </div>
              )}
            </div>

            {/* Page 1 Footer Note */}
            <div className="pt-3 border-t border-[#252C4F] flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#9AA1C4] gap-2">
              <span>Time means the time you were actively on the question. An attempt is a judged Submit. This is your own practice record, not an official college marksheet.</span>
              <span className="shrink-0">Page 1 of {isFinalSelected ? '5' : '3'} • ID: {report.reportId}</span>
            </div>
          </section>

          {/* =========================================================================
              PAGE 2: MODULE-WISE SUMMARY & DIFFICULTY BREAKDOWN
             ========================================================================= */}
          <section className="space-y-6 print-page-break print-page-break-after print:pt-4">
            <div className="border-b border-[#252C4F] pb-3">
              <h2 className="text-lg font-bold font-mono text-[#E8EAF6] uppercase">
                Module-Wise &amp; Difficulty Analytics Summary
              </h2>
              <p className="text-xs text-[#9AA1C4] font-mono">
                Aggregated progression breakdown across curriculum modules and question difficulty tiers.
              </p>
            </div>

            {/* Table 1: One row per module */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold text-[#E8EAF6] uppercase">
                Module Performance Summary
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#252C4F]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C0F1F] text-[#9AA1C4] uppercase text-[10px] tracking-wider border-b border-[#252C4F]">
                    <tr>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Solved / Total</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">Active Time</th>
                      <th className="py-2.5 px-3">1st Try Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252C4F] bg-[#141932]">
                    {(report.moduleSummaries || [
                      {
                        title: currentModule?.title || 'Current Module',
                        solvedCount: report.totalSolved || report.totals?.solvedCount || 0,
                        totalQuestions: report.totalQuestions || report.totals?.totalQuestions || 10,
                        totalAttempts: report.totals?.totalAttempts || 0,
                        totalActiveSeconds: report.totals?.totalActiveSeconds || 0,
                        firstAttemptSolves: report.totals?.firstAttemptSolves || 0,
                      },
                    ]).map((mod: any, idx: number) => (
                      <tr key={mod.moduleSlug || idx} className="hover:bg-[#0C0F1F]/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#E8EAF6]">{mod.title}</td>
                        <td className="py-2.5 px-3 text-[#46D9A0] font-bold">
                          {mod.solvedCount} / {mod.totalQuestions}
                        </td>
                        <td className="py-2.5 px-3 text-[#E8EAF6]">{mod.totalAttempts}</td>
                        <td className="py-2.5 px-3 text-[#8B9BFF]">{formatTimeDisplay(mod.totalActiveSeconds)}</td>
                        <td className="py-2.5 px-3 text-[#E8EAF6]">{mod.firstAttemptSolves ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Difficulty table (Easy, Medium, Hard) */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold text-[#E8EAF6] uppercase">
                Difficulty Tier Performance
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#252C4F]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C0F1F] text-[#9AA1C4] uppercase text-[10px] tracking-wider border-b border-[#252C4F]">
                    <tr>
                      <th className="py-2.5 px-3">Difficulty</th>
                      <th className="py-2.5 px-3">Questions Count</th>
                      <th className="py-2.5 px-3">Average Attempts</th>
                      <th className="py-2.5 px-3">Average Active Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252C4F] bg-[#141932]">
                    {['EASY', 'MEDIUM', 'HARD'].map((tier) => {
                      const stat = report.difficultyBreakdown?.[tier] || {
                        count: 0,
                        avgAttempts: 0,
                        avgSeconds: 0,
                      };
                      return (
                        <tr key={tier} className="hover:bg-[#0C0F1F]/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                tier === 'EASY'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : tier === 'MEDIUM'
                                  ? 'bg-[#8B9BFF]/10 text-[#8B9BFF]'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {tier}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#E8EAF6]">{stat.count}</td>
                          <td className="py-2.5 px-3 text-[#E8EAF6]">{stat.avgAttempts}</td>
                          <td className="py-2.5 px-3 text-[#8B9BFF]">{formatTimeDisplay(stat.avgSeconds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QR Code & Verification Pill on Page 2 */}
            {report.reportId && (
              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {qrDataUrl && (
                    <div className="p-1 rounded bg-white shrink-0">
                      <img src={qrDataUrl} alt="Verify QR Code" className="w-14 h-14 object-contain" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono text-[#9AA1C4] block uppercase">
                      Online Verification Link
                    </span>
                    <a
                      href={`/verify/report/${report.reportId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#8B9BFF] hover:underline inline-flex items-center gap-1 font-bold"
                    >
                      <span>logicq.io/verify/report/{report.reportId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px] font-mono text-[#9AA1C4] block mt-0.5">
                      Confirms genuine report authenticity with zero personal data disclosure.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Page 2 Footer Note */}
            <div className="pt-3 border-t border-[#252C4F] flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#9AA1C4] gap-2">
              <span>Time means the time you were actively on the question. An attempt is a judged Submit. This is your own practice record, not an official college marksheet.</span>
              <span className="shrink-0">Page 2 of {isFinalSelected ? '5' : '3'} • ID: {report.reportId}</span>
            </div>
          </section>

          {/* =========================================================================
              FOLLOWING PAGES: ONE SECTION PER MODULE
              Question-by-Question Detailed Audit Table
             ========================================================================= */}
          {moduleSections.map((sec, secIdx) => (
            <section
              key={sec.module?.slug || secIdx}
              className="space-y-4 print-page-break print:pt-4"
            >
              <div className="border-b border-[#252C4F] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-[#E8EAF6] uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8B9BFF]" />
                    <span>Module {sec.module?.order || secIdx + 1}: {sec.module?.title}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-[#9AA1C4]">
                    Detailed problem telemetry, solve duration, and submission attempts
                  </span>
                </div>
                <span className="text-xs font-mono text-[#46D9A0] font-bold">
                  {sec.questions.filter((q: any) => q.status === 'SOLVED' || q.isSolved).length} / {sec.questions.length} Solved
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#252C4F]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C0F1F] text-[#9AA1C4] uppercase text-[10px] tracking-wider border-b border-[#252C4F]">
                    <tr>
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-2.5">Difficulty</th>
                      <th className="py-2 px-2.5">Attempts</th>
                      <th className="py-2 px-2.5">1st Try</th>
                      <th className="py-2 px-3">Time to 1st Try</th>
                      <th className="py-2 px-3">Time to Solve</th>
                      <th className="py-2 px-2.5">Hints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252C4F] bg-[#141932]">
                    {sec.questions.map((q: any, qIdx: number) => {
                      const isSolved = q.status === 'SOLVED' || q.isSolved;
                      const isUnopened = !isSolved && (q.attempts || 0) === 0 && (q.runs || 0) === 0;
                      return (
                        <tr key={q.problemId || qIdx} className="hover:bg-[#0C0F1F]/40 transition-colors">
                          <td className="py-2.5 px-2.5 text-[#9AA1C4]">{q.orderIndex || qIdx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#E8EAF6] max-w-[220px] truncate">
                            {q.title}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                q.difficulty === 'EASY'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : q.difficulty === 'MEDIUM'
                                  ? 'bg-[#8B9BFF]/10 text-[#8B9BFF]'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-[#E8EAF6]">{q.attempts || 0}</td>
                          <td className="py-2.5 px-2.5">
                            {isSolved ? (
                              q.firstAttemptAccepted ? (
                                <span className="text-emerald-400 font-bold">Yes</span>
                              ) : (
                                <span className="text-[#9AA1C4]">No</span>
                              )
                            ) : (
                              <span className="text-[#9AA1C4]">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#9AA1C4]">
                            {isUnopened ? '—' : formatTimeDisplay(q.timeToFirstAttemptSeconds)}
                          </td>
                          <td className="py-2.5 px-3 text-[#8B9BFF]">
                            {isSolved ? formatTimeDisplay(q.timeToSolveSeconds) : '—'}
                          </td>
                          <td className="py-2.5 px-2.5 text-[#9AA1C4]">
                            {q.hintsUsed ? String(q.hintsUsed) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Module Section Page Footer */}
              <div className="pt-3 border-t border-[#252C4F] flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#9AA1C4] gap-2">
                <span>Time means the time you were actively on the question. An attempt is a judged Submit. This is your own practice record, not an official college marksheet.</span>
                <span className="shrink-0">
                  Page {secIdx + 3} of {isFinalSelected ? '5' : '3'} • ID: {report.reportId}
                </span>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#9AA1C4]">
          No report data available yet.
        </div>
      )}
    </div>
  );
};
