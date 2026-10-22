import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  Users,
  Award,
  ShieldCheck,
  ShieldAlert,
  Brain,
  Download,
  AlertTriangle,
  Search,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  FileCode,
} from 'lucide-react';

interface QuestionQualityItem {
  problemId: string;
  title: string;
  attempts: number;
  failureRate: number;
  flagReason: string;
}

interface SectionItem {
  sectionId: string;
  sectionName: string;
  course: string;
  studentCount: number;
  testCount: number;
}

export const FacultyAnalyticsPage: React.FC = () => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [deepDiveStudentId, setDeepDiveStudentId] = useState<string | null>(null);
  const [studentSearchPrn, setStudentSearchPrn] = useState<string>('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Overview query
  const { data, isLoading, error } = useQuery({
    queryKey: ['faculty-overview-analytics'],
    queryFn: () => api.get('/analytics/faculty/overview'),
    refetchOnWindowFocus: false,
  });

  // Deep dive query
  const { data: deepDiveData, isLoading: isDeepDiveLoading } = useQuery({
    queryKey: ['student-deep-dive', deepDiveStudentId],
    queryFn: () => api.get(`/analytics/faculty/student-deep-dive/${deepDiveStudentId}`),
    enabled: Boolean(deepDiveStudentId),
  });

  const overview = data?.data;

  const handleExportCsv = async (sectionId: string, sectionName: string) => {
    try {
      setIsExportingCsv(true);
      const token = localStorage.getItem('logicq_access_token');
      const res = await fetch(`/api/analytics/faculty/export/csv/${sectionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to download CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sectionName.replace(/\s+/g, '_')}_Analytics_Roster.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported CSV for section ${sectionName}`);
    } catch (err: any) {
      toast.error('Failed to export section CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center font-mono space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto" />
        <span className="text-xs text-gray-400">Loading Faculty Intelligence Dashboard...</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono text-gray-400">
        Failed to load faculty analytics. Please verify your administrator / faculty credentials.
      </div>
    );
  }

  const { topCards, flaggedQuestions, sections } = overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn font-mono text-xs">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-3 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs">
          <Brain className="w-3.5 h-3.5" />
          <span>Faculty Overview & Assessment Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
          Institutional Continuous Evaluation Center
        </h1>
        <p className="text-gray-400 max-w-3xl font-sans text-sm">
          Multi-layer analytics enforcing Section 59 separation (Academic Performance vs Integrity Review). Monitored in real-time across section cohorts, automated question diagnostics, and candidate behavioral telemetry.
        </p>
      </div>

      {/* Top Stat Cards (Sections 48–51) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Sections</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.totalSections}</div>
          <div className="text-[10px] text-gray-500">{topCards.totalStudents} Enrolled Students</div>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>Active Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.activeTestsCount}</div>
          <div className="text-[10px] text-gray-500">Live or Published</div>
        </div>

        <div className="bg-gray-900/90 border border-emerald-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span>Avg Academic</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.avgAcademicScore} <span className="text-xs text-gray-500">/ 100</span></div>
          <div className="text-[10px] text-emerald-500/80">Layer A Performance</div>
        </div>

        <div className="bg-gray-900/90 border border-cyan-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span>Avg Integrity</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.avgIntegrityScore} <span className="text-xs text-gray-500">/ 100</span></div>
          <div className="text-[10px] text-cyan-500/80">Layer B Review Index</div>
        </div>

        <div className="bg-gray-900/90 border border-amber-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span>Support Needing</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.studentsNeedingSupport}</div>
          <div className="text-[10px] text-amber-500/80">Section 50 Concept Gaps</div>
        </div>

        <div className="bg-gray-900/90 border border-cyan-500/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span>Advanced Track</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.advancedStudents}</div>
          <div className="text-[10px] text-cyan-500/80">Section 51 Candidates</div>
        </div>

        <div className="bg-gray-900/90 border border-red-500/30 p-4 rounded-xl space-y-1 col-span-2">
          <div className="flex items-center justify-between text-red-400">
            <span>Requires Review</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{topCards.studentsRequiringReview}</div>
          <div className="text-[10px] text-red-400/80">Integrity Risk Level: HIGH or CRITICAL (Section 52)</div>
        </div>
      </div>

      {/* Section 56: Question Quality Intelligence */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white font-sans">
              Question Quality Intelligence (Section 56)
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Threshold: &ge;60% Failure Rate
          </span>
        </div>

        {flaggedQuestions.length === 0 ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 font-sans text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All active questions meet quality standards. No questions currently exceed the 60% failure threshold.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Problem Title</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Failure Rate</th>
                  <th className="py-2.5 px-3">Diagnostic Notice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {flaggedQuestions.map((q: QuestionQualityItem) => (
                  <tr key={q.problemId} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">{q.title}</td>
                    <td className="py-2.5 px-3 text-gray-400">{q.attempts} attempts</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                        {q.failureRate}% Fail
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-amber-300 font-sans text-[11px]">
                      {q.flagReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sections Roster & CSV Export (Sections 62–63) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white font-sans">
              Section Cohorts & Official CSV Audit Export
            </h2>
            <p className="text-gray-400 font-sans text-xs">
              Generate full section gradebooks with separated academic marks and integrity risk levels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {sections.map((s: SectionItem) => (
            <div
              key={s.sectionId}
              className={`p-4 rounded-xl border transition-all ${
                selectedSectionId === s.sectionId
                  ? 'bg-indigo-950/20 border-indigo-500/50'
                  : 'bg-black/30 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm font-sans">{s.sectionName}</h3>
                  <p className="text-gray-400 text-[11px]">{s.course}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-[10px]">
                  {s.studentCount} Students
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{s.testCount} Tests Assigned</span>
                <button
                  type="button"
                  disabled={isExportingCsv}
                  onClick={() => handleExportCsv(s.sectionId, s.sectionName)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-[11px] font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Deep Dive Lookup (Section 52 & 53) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white font-sans">
            Candidate Investigation Deep Dive (Sections 52 & 53)
          </h2>
        </div>
        <p className="text-gray-400 font-sans text-xs">
          Inspect candidate code submissions, viva oral explanations, burst telemetry, and tab switches.
        </p>

        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Enter Student ID..."
            value={studentSearchPrn}
            onChange={(e) => setStudentSearchPrn(e.target.value)}
            className="flex-1 bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="button"
            onClick={() => {
              if (studentSearchPrn.trim()) {
                setDeepDiveStudentId(studentSearchPrn.trim());
              }
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-semibold transition-colors"
          >
            Investigate
          </button>
        </div>

        {isDeepDiveLoading && (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
            <div>Loading student audit record...</div>
          </div>
        )}

        {deepDiveData?.data && (
          <div className="p-5 bg-black/40 border border-cyan-500/30 rounded-xl space-y-6 mt-4">
            {/* Student Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  {deepDiveData.data.student.fullName}
                </h3>
                <p className="text-gray-400 text-xs">
                  PRN: <span className="text-cyan-400 font-semibold">{deepDiveData.data.student.prn}</span> | Email: {deepDiveData.data.student.email}
                </p>
              </div>
              <div className="text-right text-[11px] text-gray-400">
                Dept: {deepDiveData.data.student.department} | Year: {deepDiveData.data.student.year}
              </div>
            </div>

            {/* Test Assignments */}
            <div className="space-y-4">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Assigned Tests & Question Submissions
              </h4>

              {deepDiveData.data.assignments.length === 0 ? (
                <div className="text-gray-500 italic">No test attempts on record for this student.</div>
              ) : (
                deepDiveData.data.assignments.map((asgn: any) => (
                  <div key={asgn.id} className="p-4 bg-gray-900/80 rounded-xl border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-sans">{asgn.test.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">Academic: {asgn.academicScore}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asgn.integrityRisk === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' :
                          asgn.integrityRisk === 'LOW' ? 'bg-blue-500/20 text-blue-400' :
                          asgn.integrityRisk === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          Risk: {asgn.integrityRisk} ({asgn.integrityScore})
                        </span>
                      </div>
                    </div>

                    {/* Question Attempts */}
                    <div className="space-y-2 pt-2">
                      {asgn.attempts.map((att: any, idx: number) => (
                        <div key={att.id} className="p-3 bg-black/50 rounded-lg border border-gray-800 text-[11px] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-200">
                              Q{idx + 1}: {att.problem?.title || 'Problem'} ({att.problem?.difficulty})
                            </span>
                            <span className={`font-bold ${att.isLocked ? 'text-emerald-400' : 'text-gray-400'}`}>
                              {att.isLocked ? 'Solved (Locked)' : att.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-400">
                            <div>Score: <span className="text-white font-bold">{att.academicScore}</span></div>
                            <div>Burst Score: <span className="text-white font-bold">{att.burstScore}</span></div>
                            <div>Tab Switches: <span className="text-white font-bold">{att.tabSwitchCount}</span></div>
                            <div>Copy/Paste: <span className="text-white font-bold">{att.copyPasteAttempts}</span></div>
                          </div>

                          {att.submittedCode && (
                            <details className="mt-2 text-[11px]">
                              <summary className="text-cyan-400 cursor-pointer hover:underline">
                                View Submitted Code Snapshot
                              </summary>
                              <pre className="mt-2 p-3 bg-black rounded border border-gray-800 text-gray-300 font-mono text-[10px] overflow-x-auto max-h-48">
                                {att.submittedCode}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Viva Transcripts */}
                    {asgn.vivaQuestions && asgn.vivaQuestions.length > 0 && (
                      <div className="pt-3 border-t border-gray-800 space-y-2">
                        <span className="font-bold text-indigo-400 text-[10px] uppercase">
                          AI Viva Voce Verification Responses:
                        </span>
                        {asgn.vivaQuestions.map((v: any, vIdx: number) => (
                          <div key={v.id} className="p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded text-[11px] space-y-1">
                            <div className="font-medium text-indigo-200">
                              Viva Q{vIdx + 1}: {v.prompt}
                            </div>
                            <div className="text-gray-300 font-sans">
                              Answer: {v.studentAnswer || '<No answer recorded>'}
                            </div>
                            <div className="text-[10px] text-indigo-400">
                              Status: {v.status} | Feedback: {v.feedback || 'None'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
