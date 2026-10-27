import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Clock, Send, Info, Sparkles } from 'lucide-react';

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

  const MAX_CHARS = 300;
  const isUrgent = remainingSec <= 15;
  const percentage = Math.max(0, Math.min(100, (remainingSec / (initialRemainingSec || 60)) * 100));

  // Strict 60-second countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittedRef.current) handleAutoSubmit();
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
    toast.warning('Time is up — submitting your response.');
    try {
      const res = await api.post('/exam/viva/submit', {
        vivaId,
        answer: answer.trim() || 'No response provided within the time limit.',
      });
      onCompleted(res);
    } catch (err: any) {
      toast.error(err.message || 'Auto-submit failed. Please contact invigilator.');
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
      toast.success('Response submitted!');
      onCompleted(res);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Try again.');
      submittedRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">

        {/* Progress Bar */}
        <div className="h-1 bg-gray-800 w-full">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-red-500' : percentage > 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Quick Check</p>
                <h2 className="text-base font-bold text-white leading-tight">Code Understanding Verification</h2>
              </div>
            </div>

            {/* Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-sm border ${
                isUrgent
                  ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-gray-800 border-gray-700 text-gray-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>0:{remainingSec < 10 ? `0${remainingSec}` : remainingSec}</span>
            </div>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              This is a routine check triggered after consecutive correct submissions.
              It is <span className="text-white font-medium">not an accusation</span> — just a quick understanding check.
            </p>
          </div>

          {/* Question */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Question — based on your submitted code</p>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-white leading-relaxed">
              {questionText}
            </div>
          </div>

          {/* Answer Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Answer</p>
                <span className={`text-xs font-mono ${answer.length > MAX_CHARS * 0.9 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {answer.length}/{MAX_CHARS}
                </span>
              </div>
              <textarea
                required
                autoFocus
                rows={3}
                maxLength={MAX_CHARS}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Briefly explain your approach, logic, or why you made specific choices in your code..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Auto-submits when timer reaches 0
              </p>
              <button
                type="submit"
                disabled={isSubmitting || answer.trim().length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AiVivaModal;
