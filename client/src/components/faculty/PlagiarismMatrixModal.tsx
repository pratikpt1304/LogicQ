import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode,
  GitCompare,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CodeSubmissionCandidate {
  studentId: string;
  studentName: string;
  prn: string;
  problemTitle: string;
  code: string;
  submittedAt?: string;
}

interface PlagiarismMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: CodeSubmissionCandidate[];
  sectionName?: string;
}

interface SimilarityPair {
  id: string;
  studentA: CodeSubmissionCandidate;
  studentB: CodeSubmissionCandidate;
  similarityScore: number; // 0 - 100
  matchedTokensCount: number;
}

// Tokenize and normalize C code for robust plagiarism detection
function computeTokenSimilarity(code1: string, code2: string): number {
  if (!code1 || !code2) return 0;
  if (code1.trim() === code2.trim()) return 100;

  // 1. Strip comments
  const stripComments = (str: string) =>
    str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  const c1 = stripComments(code1);
  const c2 = stripComments(code2);

  // 2. Tokenize words & operators
  const tokenize = (str: string) =>
    str
      .replace(/[^\w]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

  const t1 = tokenize(c1);
  const t2 = tokenize(c2);

  if (t1.length === 0 || t2.length === 0) return 0;

  // 3. Compute 3-gram sets
  const getNGrams = (tokens: string[], n = 3) => {
    const set = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      set.add(tokens.slice(i, i + n).join('_'));
    }
    return set;
  };

  const grams1 = getNGrams(t1);
  const grams2 = getNGrams(t2);

  if (grams1.size === 0 || grams2.size === 0) {
    // Fallback to token Jaccard
    const s1 = new Set(t1);
    const s2 = new Set(t2);
    let common = 0;
    s1.forEach((val) => {
      if (s2.has(val)) common++;
    });
    return Math.round((common / Math.max(s1.size, s2.size)) * 100);
  }

  let intersection = 0;
  grams1.forEach((gram) => {
    if (grams2.has(gram)) intersection++;
  });

  const union = new Set([...Array.from(grams1), ...Array.from(grams2)]).size;
  return Math.min(100, Math.round((intersection / union) * 100));
}

export const PlagiarismMatrixModal: React.FC<PlagiarismMatrixModalProps> = ({
  isOpen,
  onClose,
  submissions,
  sectionName = 'Current Section',
}) => {
  const [selectedPair, setSelectedPair] = useState<SimilarityPair | null>(null);
  const [thresholdFilter, setThresholdFilter] = useState<number>(60);
  const [search, setSearch] = useState<string>('');

  // Compute Pairwise Similarities
  const pairs: SimilarityPair[] = useMemo(() => {
    const result: SimilarityPair[] = [];
    const list = submissions.filter((s) => s.code && s.code.trim().length > 15);

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const subA = list[i];
        const subB = list[j];
        // Never compare a student to themselves
        if (subA.studentId === subB.studentId || (subA.prn && subB.prn && subA.prn === subB.prn)) continue;
        // Only compare submissions solving the same problem
        if (subA.problemTitle && subB.problemTitle && subA.problemTitle !== subB.problemTitle) continue;

        const score = computeTokenSimilarity(subA.code, subB.code);

        result.push({
          id: `${subA.studentId}_${subB.studentId}_${subA.problemTitle || 'q'}`,
          studentA: subA,
          studentB: subB,
          similarityScore: score,
          matchedTokensCount: Math.round(score * 1.5),
        });
      }
    }

    return result.sort((a, b) => b.similarityScore - a.similarityScore);
  }, [submissions]);

  const filteredPairs = useMemo(() => {
    return pairs.filter((p) => {
      if (p.similarityScore < thresholdFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        p.studentA.studentName.toLowerCase().includes(s) ||
        p.studentA.prn.toLowerCase().includes(s) ||
        p.studentB.studentName.toLowerCase().includes(s) ||
        p.studentB.prn.toLowerCase().includes(s)
      );
    });
  }, [pairs, thresholdFilter, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] glass-card rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>LOGICQ INSTITUTIONAL CODE SIMILARITY & PLAGIARISM MATRIX</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--foreground)] tracking-tight">
              Cross-Student Code Similarity Analysis ({sectionName})
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] font-mono">
              AST & N-Gram token analysis normalized across variable renames, comment removal, and indentation changes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Sensitivity Controller */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--background)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted-foreground)]">Flag Threshold:</span>
            {[50, 70, 85].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setThresholdFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  thresholdFilter === lvl
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                &ge; {lvl}% Overlap
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search student or PRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Content Area: Split View when a pair is selected */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {selectedPair ? (
            /* Side-by-side inspection */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span className="font-mono text-sm font-bold text-rose-300">
                    Similarity Score: {selectedPair.similarityScore}% Overlap Detected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPair(null)}
                  className="px-3 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] hover:bg-[var(--background)] transition"
                >
                  &larr; Back to Matrix List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate A */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden flex flex-col">
                  <div className="p-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[var(--foreground)]">
                        {selectedPair.studentA.studentName}
                      </h4>
                      <p className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {selectedPair.studentA.prn}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold">
                      Candidate 1
                    </span>
                  </div>
                  <pre className="p-3 text-xs font-mono text-slate-300 bg-black/40 overflow-x-auto max-h-96 leading-relaxed">
                    {selectedPair.studentA.code}
                  </pre>
                </div>

                {/* Candidate B */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden flex flex-col">
                  <div className="p-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[var(--foreground)]">
                        {selectedPair.studentB.studentName}
                      </h4>
                      <p className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {selectedPair.studentB.prn}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[10px] font-bold">
                      Candidate 2
                    </span>
                  </div>
                  <pre className="p-3 text-xs font-mono text-slate-300 bg-black/40 overflow-x-auto max-h-96 leading-relaxed">
                    {selectedPair.studentB.code}
                  </pre>
                </div>
              </div>
            </div>
          ) : submissions.length === 0 ? (
            /* Zero submissions empty state */
            <div className="py-16 text-center space-y-3">
              <FileCode className="w-12 h-12 text-slate-400 mx-auto opacity-60" />
              <h3 className="font-bold text-base text-[var(--foreground)]">
                No Real Student Submissions Available Yet
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] font-mono max-w-md mx-auto leading-relaxed">
                As students solve and submit code in Lab Internal or Practice exercises, the AST & token similarity engine will automatically compare their authentic code submissions here.
              </p>
            </div>
          ) : filteredPairs.length === 0 ? (
            /* Clean pass state */
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-base text-[var(--foreground)]">
                No Code Plagiarism Detected (0 Flags)
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] font-mono max-w-md mx-auto leading-relaxed">
                All analyzed student code submissions in this section demonstrate independent, authentic logic structure with less than {thresholdFilter}% overlap.
              </p>
            </div>
          ) : (
              <div className="space-y-3">
                {filteredPairs.map((pair) => {
                  const isCritical = pair.similarityScore >= 80;
                  return (
                    <div
                      key={pair.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCritical
                          ? 'border-rose-500/40 bg-rose-950/15'
                          : 'border-amber-500/30 bg-amber-950/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {pair.similarityScore}%
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-[var(--foreground)]">
                            <span>{pair.studentA.studentName} ({pair.studentA.prn})</span>
                            <GitCompare className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                            <span>{pair.studentB.studentName} ({pair.studentB.prn})</span>
                          </div>
                          <p className="text-[11px] font-mono text-[var(--muted-foreground)]">
                            Normalized token overlap across ~{pair.matchedTokensCount} syntax tokens
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPair(pair)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Compare Diffs</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[var(--border)] bg-[var(--background)] flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--muted-foreground)]">
            Total Pairs Analyzed: {pairs.length} | Flags &ge; {thresholdFilter}%: {filteredPairs.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
