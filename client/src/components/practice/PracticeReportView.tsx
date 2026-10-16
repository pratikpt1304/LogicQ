import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { formatPracticeTime } from './PracticeTimer.js';

export interface PracticeReportViewProps {
  user: {
    id: string;
    displayName?: string | null;
    shortId?: string | null;
    department?: string | null;
    year?: string | null;
  };
}

export const PracticeReportView: React.FC<PracticeReportViewProps> = ({ user }) => {
  const [selectedReportType, setSelectedReportType] = useState<string>('module_1');

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
  const isModuleUnlocked = Boolean(currentModule?.isCompleted);
  const isReportUnlocked = isFinalSelected ? allCompleted : isModuleUnlocked;

  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
  } = useQuery({
    queryKey: ['practice-report', isFinalSelected ? 'final' : selectedModuleSlug],
    queryFn: () => {
      if (isFinalSelected) {
        return api.get('/practice/reports/final');
      }
      return api.get(`/practice/reports/module/${selectedModuleSlug}`);
    },
    enabled: Boolean(isReportUnlocked && (isFinalSelected || selectedModuleSlug)),
    retry: false,
  });

  const report = reportData?.data?.report;

  // Format time display (caps extreme > 3h display while retaining raw precision)
  const formatTimeDisplay = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '—';
    if (seconds >= 10800) {
      return '3h+';
    }
    return formatPracticeTime(seconds);
  };

  // CSV Export handler (strictly non-PII, no PRN or M/F gender indicator)
  const handleExportCsv = () => {
    if (!report) return;

    const headers = [
      'Problem Title',
      'Difficulty',
      'Status',
      'Attempts',
      'First Attempt Accepted',
      'Time to Solve (mm:ss)',
      'Time to First Attempt (mm:ss)',
      'Runs Count',
    ];

    const rows: string[][] = [];

    if (report.questions && Array.isArray(report.questions)) {
      for (const q of report.questions) {
        rows.push([
          `"${(q.title || '').replace(/"/g, '""')}"`,
          q.difficulty || '',
          q.status || (q.isSolved ? 'SOLVED' : 'UNSOLVED'),
          String(q.attemptsCount || 0),
          q.firstAttemptAccepted ? 'YES' : 'NO',
          q.timeToSolveFormatted || formatPracticeTime(q.timeToSolveSeconds || 0),
          q.timeToFirstAttemptFormatted || formatPracticeTime(q.timeToFirstAttemptSeconds || 0),
          String(q.runsCount || 0),
        ]);
      }
    } else if (report.moduleSummaries) {
      // Final report CSV: export question details across modules
      for (const mod of report.moduleSummaries) {
        if (mod.questions) {
          for (const q of mod.questions) {
            rows.push([
              `"[${mod.moduleTitle}] ${(q.title || '').replace(/"/g, '""')}"`,
              q.difficulty || '',
              q.status || (q.isSolved ? 'SOLVED' : 'UNSOLVED'),
              String(q.attemptsCount || 0),
              q.firstAttemptAccepted ? 'YES' : 'NO',
              q.timeToSolveFormatted || formatPracticeTime(q.timeToSolveSeconds || 0),
              q.timeToFirstAttemptFormatted || formatPracticeTime(q.timeToFirstAttemptSeconds || 0),
              String(q.runsCount || 0),
            ]);
          }
        }
      }
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `LogicQ_Practice_Report_${isFinalSelected ? 'Final_40q' : selectedModuleSlug}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const displayName = user.displayName || `Student ${user.shortId || ''}`.trim();

  return (
    <div className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-6">
      {/* Header and Report Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#252C4F] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B9BFF]" />
            <h2 className="text-base font-bold text-[#E8EAF6] uppercase tracking-wide font-mono">
              Practice Audit &amp; Performance Reports
            </h2>
          </div>
          <p className="text-xs text-[#9AA1C4]">
            Per-module verification unlocked at 10/10 solves. Final comprehensive report at 40/40.
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
                onClick={() => setSelectedReportType(mod.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  isSelected
                    ? 'bg-[#8B9BFF] text-[#0C0F1F] font-bold shadow-sm'
                    : 'bg-[#0C0F1F] text-[#9AA1C4] hover:text-[#E8EAF6] border border-[#252C4F]'
                }`}
              >
                {!completed && <Lock className="w-3 h-3 text-[#9AA1C4]" />}
                <span>M{idx + 1}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedReportType('final')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              isFinalSelected
                ? 'bg-[#8B9BFF] text-[#0C0F1F] font-bold shadow-sm'
                : 'bg-[#0C0F1F] text-[#9AA1C4] hover:text-[#E8EAF6] border border-[#252C4F]'
            }`}
          >
            {!allCompleted && <Lock className="w-3 h-3 text-[#9AA1C4]" />}
            <span>Final (40/40)</span>
          </button>
        </div>
      </div>

      {/* Unlocked / Locked Gate State */}
      {!isReportUnlocked ? (
        <div className="p-8 rounded-2xl bg-[#0C0F1F] border border-[#252C4F] text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#8B9BFF]/10 flex items-center justify-center text-[#8B9BFF]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#E8EAF6]">
            {isFinalSelected ? 'Final Report Locked' : 'Module Report Locked'}
          </h3>
          <p className="text-xs text-[#9AA1C4] max-w-md mx-auto leading-relaxed">
            {isFinalSelected
              ? 'Complete all 40 questions across all 4 Practice modules (10 per module) to unlock your verified comprehensive audit report and official completion certificate.'
              : `Complete all 10 problems in "${currentModule?.title || 'this module'}" to unlock the detailed audit breakdown, timing analytics, and PDF/CSV export.`}
          </p>
          <div className="text-xs font-mono text-[#8B9BFF] pt-2">
            Current Module Progress: {currentModule?.solvedCount || 0}/10 solved
          </div>
        </div>
      ) : isReportLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-4 h-4 rounded-full bg-[#8B9BFF] animate-ping mx-auto" />
          <p className="text-xs font-mono text-[#9AA1C4]">Generating verified practice report...</p>
        </div>
      ) : report ? (
        <div className="space-y-6 print:space-y-4 print:text-black" id="printable-practice-report">
          {/* Printable Report Header */}
          <div className="p-5 rounded-2xl bg-[#0C0F1F] border border-[#252C4F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B9BFF]">
                Official Practice Performance Record
              </span>
              <h3 className="text-lg font-bold text-[#E8EAF6]">
                {report.reportTitle || (isFinalSelected ? 'Final Comprehensive Practice Report' : currentModule?.title)}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#9AA1C4]">
                <span>Student: <strong className="text-[#E8EAF6]">{displayName}</strong></span>
                <span>•</span>
                <span>Dept: <strong className="text-[#E8EAF6]">{user.department || 'General'}</strong></span>
                <span>•</span>
                <span>Year: <strong className="text-[#E8EAF6]">{user.year || 'FY'}</strong></span>
                <span>•</span>
                <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions: CSV and Print */}
            <div className="flex items-center gap-2 print:hidden shrink-0">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141932] hover:bg-[#252C4F] border border-[#252C4F] text-xs font-mono text-[#E8EAF6] transition-colors"
                title="Download CSV report"
              >
                <Download className="w-3.5 h-3.5 text-[#8B9BFF]" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8B9BFF] hover:bg-[#9FAOFF] text-xs font-mono font-bold text-[#0C0F1F] transition-colors shadow-sm"
                title="Print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[10px] font-mono text-[#9AA1C4] block">QUESTIONS SOLVED</span>
              <span className="text-xl font-bold font-mono text-[#46D9A0]">
                {report.totalSolved || report.solvedCount || 0}
                <span className="text-xs text-[#9AA1C4] font-normal"> / {report.totalQuestions || 10}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[10px] font-mono text-[#9AA1C4] block">TOTAL ACTIVE TIME</span>
              <span className="text-xl font-bold font-mono text-[#8B9BFF]">
                {report.totalActiveTimeFormatted || formatPracticeTime(report.totalActiveSeconds || 0)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[10px] font-mono text-[#9AA1C4] block">FIRST ATTEMPT PASS</span>
              <span className="text-xl font-bold font-mono text-[#E8EAF6]">
                {report.firstAttemptPassCount || 0}
                <span className="text-xs text-[#9AA1C4] font-normal">
                  {' '}({report.totalSolved ? Math.round(((report.firstAttemptPassCount || 0) / report.totalSolved) * 100) : 0}%)
                </span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]">
              <span className="text-[10px] font-mono text-[#9AA1C4] block">TOTAL ATTEMPTS</span>
              <span className="text-xl font-bold font-mono text-[#E8EAF6]">
                {report.totalAttempts || 0}
                <span className="text-xs text-[#9AA1C4] font-normal"> ({report.totalRuns || 0} runs)</span>
              </span>
            </div>
          </div>

          {/* Hardest Questions Callout & Pedagogical Summary */}
          {(report.hardestByAttempts || report.hardestByTime || report.strengthsSummary) && (
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E8EAF6]">
                <TrendingUp className="w-4 h-4 text-[#8B9BFF]" />
                <span>STUDENT HIGHLIGHTS &amp; CURRICULUM INSIGHTS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {report.hardestByAttempts && (
                  <div className="p-3 rounded-lg bg-[#141932] border border-[#252C4F]">
                    <span className="text-[10px] text-[#9AA1C4] block">MOST ATTEMPTS REQUIRED</span>
                    <strong className="text-[#FF7A8A]">{report.hardestByAttempts.title}</strong>
                    <span className="text-[#9AA1C4] block text-[11px] mt-0.5">
                      {report.hardestByAttempts.attemptsCount} attempts before accepted verdict
                    </span>
                  </div>
                )}
                {report.hardestByTime && (
                  <div className="p-3 rounded-lg bg-[#141932] border border-[#252C4F]">
                    <span className="text-[10px] text-[#9AA1C4] block">LONGEST ACTIVE SOLVE TIME</span>
                    <strong className="text-[#8B9BFF]">{report.hardestByTime.title}</strong>
                    <span className="text-[#9AA1C4] block text-[11px] mt-0.5">
                      {formatTimeDisplay(report.hardestByTime.timeToSolveSeconds)} active time
                    </span>
                  </div>
                )}
              </div>

              {report.strengthsSummary && (
                <p className="text-xs text-[#9AA1C4] leading-relaxed pt-1">
                  <strong className="text-[#E8EAF6]">Summary: </strong>
                  {report.strengthsSummary}
                </p>
              )}
            </div>
          )}

          {/* Detailed Question Table */}
          {report.questions && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#E8EAF6] uppercase tracking-wider">
                Question Breakdown
              </h4>
              <div className="overflow-x-auto rounded-xl border border-[#252C4F]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C0F1F] text-[#9AA1C4] uppercase text-[10px] tracking-wider border-b border-[#252C4F]">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Difficulty</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">1st Try Pass</th>
                      <th className="py-2.5 px-3">Time to Solve</th>
                      <th className="py-2.5 px-3">Time to 1st Attempt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252C4F] bg-[#141932]">
                    {report.questions.map((q: any) => (
                      <tr key={q.id || q.title} className="hover:bg-[#0C0F1F]/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#E8EAF6] max-w-[200px] truncate">
                          {q.title}
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3">
                          {q.isSolved ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Solved</span>
                            </span>
                          ) : (
                            <span className="text-[#9AA1C4]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#E8EAF6] font-semibold">{q.attemptsCount || 0}</td>
                        <td className="py-2.5 px-3">
                          {q.firstAttemptAccepted ? (
                            <span className="text-emerald-400 font-bold">Yes</span>
                          ) : (
                            <span className="text-[#9AA1C4]">No</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#8B9BFF]">
                          {formatTimeDisplay(q.timeToSolveSeconds)}
                        </td>
                        <td className="py-2.5 px-3 text-[#9AA1C4]">
                          {formatTimeDisplay(q.timeToFirstAttemptSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#9AA1C4]">
          No report data available yet.
        </div>
      )}
    </div>
  );
};
