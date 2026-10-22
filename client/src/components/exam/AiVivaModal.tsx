import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import {
  HelpCircle,
  Clock,
  Send,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface AiVivaModalProps {
  vivaId: string;
  questionText: string;
  initialRemainingSec?: number;
  onCompleted: (result: any) => void;
}

export const AiVivaModal: React.FC<AiVivaModalProps> = ({
  vivaId,
  questionText,
  initialRemainingSec = 60,
  onCompleted,
}) => {
  const [answer, setAnswer] = useState('');
  const [remainingSec, setRemainingSec] = useState(initialRemainingSec);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // 1. Strict 60-Second Countdown (Section 31)
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittedRef.current) {
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [vivaId]);

  const handleAutoSubmit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    toast.warning('Viva 60-second timer expired. Auto-submitting response...');

    try {
      const res = await api.post('/exam/viva/submit', {
        vivaId,
        answer: answer.trim() || 'No response provided within 60-second limit.',
      });
      onCompleted(res);
    } catch (err: any) {
      toast.error(err.message || 'Viva auto-submit failed.');
      onCompleted({ success: false, submittedBeforeTimeout: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await api.post('/exam/viva/submit', {
        vivaId,
        answer: answer.trim(),
      });
      toast.success('Viva explanation submitted successfully!');
      onCompleted(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit viva explanation.');
      submittedRef.current = false;
      setIsSubmitting(false);
    }
  };

  const percentage = Math.max(0, Math.min(100, (remainingSec / 60) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top Progress Countdown Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800">
          <div
            className={`h-full transition-all duration-1000 ${
              remainingSec > 20 ? 'bg-cyan-400' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-cyan-400">
                <span>AI Viva Verification Engine</span>
                <span>•</span>
                <span>Section 29–33</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Code Comprehension Check
              </h2>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold border ${
              remainingSec > 20
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>0:{remainingSec < 10 ? `0${remainingSec}` : remainingSec}</span>
          </div>
        </div>

        {/* Non-Punitive Notice (Section 33) */}
        <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed font-mono">
          <ShieldAlert className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Institutional Verification Notice:</strong> This 60-second viva is triggered automatically on every 2nd successive correct submission. It is a standard understanding check, not an accusation of misconduct.
          </span>
        </div>

        {/* Generated Code-Specific Question (Section 30) */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
            Examiner Question (Based on your submitted C code):
          </label>
          <div className="bg-black/60 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 font-mono leading-relaxed">
            {questionText}
          </div>
        </div>

        {/* Answer Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-gray-300">
              Your Concise Explanation (1–2 sentences):
            </label>
            <textarea
              required
              autoFocus
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Explain your algorithmic reasoning, memory choices, or loop logic here..."
              className="w-full bg-black/60 border border-gray-700 focus:border-cyan-500 rounded-xl p-3 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-gray-500">
              Strict 1-minute timeout enforced.
            </span>
            <button
              type="submit"
              disabled={isSubmitting || answer.trim().length === 0}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold font-mono text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording...' : `Submit Explanation (${remainingSec}s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AiVivaModal;
