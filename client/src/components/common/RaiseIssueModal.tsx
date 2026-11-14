import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Send, X, ShieldAlert, Flag, ListOrdered, Clock, Phone, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { api } from '../../api/client.js';
import { db } from '../../config/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { StudentIssuesModal } from './StudentIssuesModal.js';

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
  const [phone, setPhone] = useState<string>(() => {
    return (user as any)?.mobileNumber || (user as any)?.phone || localStorage.getItem('logicq_student_phone') || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMyIssuesOpen, setIsMyIssuesOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please enter details about the issue.');
      return;
    }

    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      toast.error('Please enter your 10-digit WhatsApp contact number so faculty can assist you.');
      return;
    }

    setIsSubmitting(true);
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : cleanDigits.startsWith('91') ? `+${cleanDigits}` : `+91${cleanDigits}`;
    localStorage.setItem('logicq_student_phone', cleanDigits);

    const issuePayload = {
      questionId,
      questionTitle,
      contextType,
      category,
      description: description.trim(),
      studentPhone: formattedPhone,
      studentWhatsapp: formattedPhone,
      studentId: user?.id || 'anonymous',
      studentName: user?.fullName || user?.displayName || 'Student',
      studentPrn: user?.prn || 'PENDING',
      studentEmail: user?.email || '',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };

    try {
      // 1. Authoritative save to Cloud Firestore 'raised_issues' (bounded by 3.5s race)
      await Promise.race([
        addDoc(collection(db, 'raised_issues'), {
          ...issuePayload,
          serverTimestamp: serverTimestamp(),
        }),
        new Promise((resolve) => setTimeout(resolve, 3500)),
      ]).catch((e) => {
        console.warn('Firestore direct write warning (will rely on local/mesh sync):', e);
      });

      // 2. Non-blocking fire-and-forget backend tracking (never blocks student UI)
      api.post('/problems/raise-issue', issuePayload).catch(() => {});

      // 3. Log in local cache for offline/instant mesh sync
      try {
        const storedKey = 'logicq_faculty_raised_issues';
        const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
        const exists = existing.some(
          (i: any) =>
            i.studentPrn === issuePayload.studentPrn &&
            i.questionTitle === issuePayload.questionTitle &&
            i.description === issuePayload.description
        );
        if (!exists) {
          existing.unshift({ ...issuePayload, syncedToCloud: true });
          localStorage.setItem(storedKey, JSON.stringify(existing.slice(0, 100)));
        }
      } catch {}

      realtimeSync.emit('ISSUES');

      toast.success('Issue flagged for Faculty review! Thank you for reporting.');
      setDescription('');
      onClose();
    } catch (err: any) {
      console.error('Raise issue error:', err);
      toast.error(err?.message || 'Failed to submit issue. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
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

          <div>
            <label className="block font-semibold text-[var(--foreground)] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp / Mobile Contact Number <span className="text-rose-500">*</span></span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Direct Faculty WhatsApp
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[var(--muted-foreground)] text-xs font-mono select-none">
                <span>🇮🇳 +91</span>
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setPhone(val);
                }}
                placeholder="10-digit WhatsApp number (e.g. 9876543210)"
                className="w-full pl-16 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 font-mono text-xs font-bold"
              />
            </div>
            <p className="text-[10.5px] text-[var(--muted-foreground)] mt-1">
              Required: Faculty will directly reach out on WhatsApp to clarify test cases, question doubts, or compiler issues.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your issue will be forwarded directly to your faculty course instructor along with the question ID and your student PRN.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setIsMyIssuesOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track My Reported Issues</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Reporting...' : 'Submit Issue'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <StudentIssuesModal
        isOpen={isMyIssuesOpen}
        onClose={() => setIsMyIssuesOpen(false)}
      />
    </div>
  );
};
