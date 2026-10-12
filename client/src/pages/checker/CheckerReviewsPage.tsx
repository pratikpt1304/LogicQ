import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  Clock,
  Send,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  submissionToken: string;
  problemId: string;
  problemTitle: string;
  problemDescription: string;
  basePoints: number;
  studentNote: string;
  submittedAt: string;
  assignedAt?: string;
  files: Array<{
    id: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
    dataBase64: string;
  }>;
  existingReview?: {
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
    pointsAwarded: number;
    comment: string;
    createdAt: string;
    canEdit: boolean;
  } | null;
}

export const CheckerReviewsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedUpload, setSelectedUpload] = useState<ReviewQueueItem | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Rubric Form State (percentages: 0 to 100)
  const [rubricScores, setRubricScores] = useState({
    correctLogic: 100,
    flowchart: 100,
    clarity: 100,
  });

  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES'>('APPROVED');
  const [comment, setComment] = useState('');

  // Fetch Assigned Reviews Queue
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['checker-reviews'],
    queryFn: async () => {
      const res = await api.get('/checker/reviews');
      return res?.data?.queue || [];
    },
  });

  const queue: ReviewQueueItem[] = data || [];

  // Formula points calculation preview
  const currentBasePoints = selectedUpload?.basePoints || 20;
  const calculatedPoints = Math.round(
    currentBasePoints *
      ((rubricScores.correctLogic / 100) * 0.5 +
        (rubricScores.flowchart / 100) * 0.3 +
        (rubricScores.clarity / 100) * 0.2)
  );

  // Submit Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUpload) return;
      const body: any = {
        decision: decisionType,
        comment: comment.trim(),
      };
      if (decisionType === 'APPROVED') {
        body.rubric = rubricScores;
      }
      return api.post(`/checker/reviews/${selectedUpload.id}/decision`, body);
    },
    onSuccess: () => {
      toast.success(`Decision recorded: ${decisionType}`);
      setSelectedUpload(null);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['checker-reviews'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit decision');
    },
  });

  const handleOpenReview = (item: ReviewQueueItem) => {
    setSelectedUpload(item);
    setSelectedFileIndex(0);
    setZoomLevel(1);
    setComment(item.existingReview?.comment || '');
    setDecisionType(item.existingReview?.decision || 'APPROVED');
  };

  // Keyboard shortcut listener (Shift+A for Approve, Shift+R for Reject, Shift+N for Next)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedUpload) return;
      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setDecisionType('APPROVED');
      } else if (e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setDecisionType('REJECTED');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUpload]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-line)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Restricted Operations
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)]">Blind Review Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] mt-1.5 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <span>My Assigned Solution Reviews</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Rubric-based evaluation queue. Student identity is strictly masked for unbiased academic grading.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-right">
            <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase">Assigned Workload</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{queue.length} pending</span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] hover:border-emerald-400 transition-colors"
            title="Refresh Queue"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout: Queue Table & Modal */}
      {isLoading ? (
        <div className="text-center py-20 font-mono text-xs text-[var(--text-muted)] animate-pulse">
          Loading assigned review queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-main)]">Review Queue Clear</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            You currently have zero pending solution reviews assigned. Check back later or notify an administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[var(--bg-surface)] border-b border-[var(--border-line)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Submission Token</th>
                  <th className="px-4 py-3.5">Challenge Title</th>
                  <th className="px-4 py-3.5">Files</th>
                  <th className="px-4 py-3.5">Submitted</th>
                  <th className="px-4 py-3.5">Base Points</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-line)]">
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="px-4 py-4 font-bold text-emerald-400">
                      {item.submissionToken}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--text-main)]">
                      {item.problemTitle}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {item.files.length} file{item.files.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {new Date(item.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-main)] font-bold">
                      {item.basePoints} PTS
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleOpenReview(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all inline-flex items-center gap-1.5"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal / Interface */}
      {selectedUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl my-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    BLIND REVIEW #{selectedUpload.submissionToken}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Submitted: {new Date(selectedUpload.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-main)] mt-1">
                  {selectedUpload.problemTitle}
                </h2>
              </div>
              <button
                onClick={() => setSelectedUpload(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
              >
                ✕
              </button>
            </div>

            {/* Split View: Left (Files & Student Note), Right (Rubric Grading) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (Files & Viewer) */}
              <div className="lg:col-span-7 space-y-4">
                {/* File Tabs */}
                <div className="flex items-center gap-2 border-b border-[var(--border-line)] pb-2 overflow-x-auto">
                  {selectedUpload.files.map((file, idx) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        setSelectedFileIndex(idx);
                        setZoomLevel(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        selectedFileIndex === idx
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>File {idx + 1}</span>
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono px-1.5 text-[var(--text-muted)]">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                      className="p-1 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* File Preview Canvas */}
                {selectedUpload.files[selectedFileIndex] && (
                  <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] min-h-[300px] flex items-center justify-center overflow-auto max-h-[450px]">
                    {selectedUpload.files[selectedFileIndex].mimeType.startsWith('image/') ? (
                      <img
                        src={`data:${selectedUpload.files[selectedFileIndex].mimeType};base64,${selectedUpload.files[selectedFileIndex].dataBase64}`}
                        alt="Student solution"
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                        className="rounded max-w-full transition-transform duration-200"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <FileText className="w-12 h-12 text-emerald-400 mx-auto" />
                        <p className="text-xs font-mono text-[var(--text-main)]">PDF Document</p>
                        <a
                          href={`data:${selectedUpload.files[selectedFileIndex].mimeType};base64,${selectedUpload.files[selectedFileIndex].dataBase64}`}
                          download={selectedUpload.files[selectedFileIndex].originalName}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono inline-block"
                        >
                          Download / Open PDF
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Handwritten Approach Note */}
                {selectedUpload.studentNote && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] block">
                      Student Handwritten Approach Note:
                    </span>
                    <p className="text-xs text-[var(--text-main)] font-mono whitespace-pre-wrap">
                      {selectedUpload.studentNote}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column (Rubric & Decision Controls) */}
              <div className="lg:col-span-5 space-y-5 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-line)]">
                {/* Decision Selector */}
                <div>
                  <label className="text-xs font-mono text-[var(--text-muted)] block mb-1.5">
                    Review Decision:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionType('APPROVED')}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                        decisionType === 'APPROVED'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Approve (Shift+A)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionType('REJECTED')}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                        decisionType === 'REJECTED'
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Reject (Shift+R)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionType('NEEDS_CHANGES')}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                        decisionType === 'NEEDS_CHANGES'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Re-Check
                    </button>
                  </div>
                </div>

                {/* Rubric Breakdown for APPROVED */}
                {decisionType === 'APPROVED' && (
                  <div className="space-y-4 pt-2 border-t border-[var(--border-line)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                        Formula Rubric Breakdown
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {calculatedPoints} / {currentBasePoints} PTS
                      </span>
                    </div>

                    {/* 1. Correct Logic (50%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[var(--text-muted)]">1. Correct Logic (50% weight)</span>
                        <span className="text-emerald-400 font-bold">{rubricScores.correctLogic}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={rubricScores.correctLogic}
                        onChange={(e) =>
                          setRubricScores({ ...rubricScores, correctLogic: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    {/* 2. Flowchart / Explanation (30%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[var(--text-muted)]">2. Flowchart / Explanation (30% weight)</span>
                        <span className="text-emerald-400 font-bold">{rubricScores.flowchart}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={rubricScores.flowchart}
                        onChange={(e) =>
                          setRubricScores({ ...rubricScores, flowchart: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    {/* 3. Clarity & Code Structure (20%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[var(--text-muted)]">3. Clarity & Structure (20% weight)</span>
                        <span className="text-emerald-400 font-bold">{rubricScores.clarity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={rubricScores.clarity}
                        onChange={(e) =>
                          setRubricScores({ ...rubricScores, clarity: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  </div>
                )}

                {/* Feedback Comment */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--border-line)]">
                  <label className="text-xs font-mono text-[var(--text-muted)] block">
                    Reviewer Feedback Comment (Mandatory):
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Provide constructive feedback explaining the marks..."
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={decisionMutation.isPending || !comment.trim()}
                    onClick={() => decisionMutation.mutate()}
                    className="w-full py-2.5 rounded-xl font-mono text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {decisionMutation.isPending ? 'Recording Decision...' : 'Finalize & Record Decision'}
                    </span>
                  </button>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] text-center block mt-2">
                    Decisions can be edited within 30 minutes. Immutable audit log recorded.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckerReviewsPage;
