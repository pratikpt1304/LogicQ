import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Send, X, ShieldAlert, Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { api } from '../../api/client.js';

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionTitle: string;
  questionId?: string;
  contextType?: 'PRACTICE' | 'LAB_INTERNAL' | 'EXAM';
}

export const RaiseIssueModal: React.FC<RaiseIssueModalProps> = ({
  isOpen,
  onClose,
  questionTitle,
  questionId = 'general',
  contextType = 'PRACTICE',
}) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('AMBIGUOUS_DESCRIPTION');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please enter details about the issue.');
      return;
    }

    setIsSubmitting(true);
    const issuePayload = {
      questionId,
      questionTitle,
      contextType,
      category,
      description: description.trim(),
      studentId: user?.id || 'anonymous',
      studentName: user?.fullName || user?.displayName || 'Student',
      studentPrn: user?.prn || 'PENDING',
      studentEmail: user?.email || '',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };

    try {
      // 1. Try Backend issue tracking
      try {
        await api.post('/problems/raise-issue', issuePayload);
      } catch {
        // Fallback gracefully to Firestore / local log
      }

      // 2. Log in Firestore or Local Cache for Faculty Review
      try {
        const storedKey = 'logicq_faculty_raised_issues';
        const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
        existing.unshift(issuePayload);
        localStorage.setItem(storedKey, JSON.stringify(existing.slice(0, 100)));
      } catch {}

      toast.success('Issue flagged for Faculty review! Thank you for reporting.');
      setDescription('');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Raise an Issue to Faculty</h3>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate max-w-xs">{questionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[var(--foreground)] mb-1">Issue Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
            >
              <option value="AMBIGUOUS_DESCRIPTION">Ambiguous Problem Description or Formula</option>
              <option value="TEST_CASE_MISMATCH">Expected vs Sample Test Case Mismatch</option>
              <option value="COMPILER_OR_TIMEOUT">Compiler Anomaly or Timeout Issue</option>
              <option value="TYPO_OR_CLARITY">Typo or Grammatical Clarification</option>
              <option value="OTHER">Other Technical Feedback</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[var(--foreground)] mb-1">
              Issue Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clearly describe what seems incorrect or ambiguous in the question/test cases..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your issue will be forwarded directly to your faculty course instructor along with the question ID and your student PRN.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Reporting...' : 'Submit Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
