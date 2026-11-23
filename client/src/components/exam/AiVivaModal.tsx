import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { Clock, Send, Info, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';

interface AiVivaModalProps {
  vivaId: string;
  questionText: string;
  initialRemainingSec?: number;
  studentPrn?: string;
  assignmentId?: string;
  problemId?: string;
  onCompleted: (result: any) => void;
}

export const AiVivaModal: React.FC<AiVivaModalProps> = ({
  vivaId,
  questionText,
  initialRemainingSec = 10,
  studentPrn,
  assignmentId,
  problemId,
  onCompleted,
}) => {
  const [answer, setAnswer] = useState('');
  const [remainingSec, setRemainingSec] = useState(initialRemainingSec);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const MAX_CHARS = 120;
  const isUrgent = remainingSec <= 4;
  const percentage = Math.max(0, Math.min(100, (remainingSec / (initialRemainingSec || 10)) * 100));

  // Strict countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittedRef.current) submitVivaResponse(answer, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [vivaId, answer]);

  const submitVivaResponse = async (userAnswer: string, isAuto: boolean) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    const trimmedAnswer = (userAnswer || '').trim();
    const finalAnswer = trimmedAnswer || (isAuto ? 'No response provided within the time limit.' : '');
    const verdict = finalAnswer.length >= 4 ? 'PASS' : (finalAnswer ? 'PARTIAL' : 'FAIL');
    const score = verdict === 'PASS' ? 1.0 : (verdict === 'PARTIAL' ? 0.5 : 0.0);
    const submittedAt = new Date().toISOString();
    const resolvedPrn = (studentPrn || '').toUpperCase().trim();

    const vivaRecord = {
      vivaId,
      prn: resolvedPrn,
      studentPrn: resolvedPrn,
      questionText,
      question: questionText,
      answer: finalAnswer,
      submittedAt,
      verdict,
      score,
      submittedBeforeTimeout: !isAuto,
      problemId: problemId || 'lab-problem',
      problemSlug: problemId || 'lab-problem',
      assignmentId: assignmentId || 'lab-internal',
      source: assignmentId?.includes('assessment') || assignmentId?.includes('test') ? 'ASSESSMENT_TEST' : 'LAB_INTERNAL',
      createdAt: serverTimestamp(),
    };

    // Absolute safety watchdog: Ensure modal unconditionally completes and dismisses within 1.5s
    const safetyDismissTimeout = setTimeout(() => {
      onCompleted({
        success: true,
        vivaId,
        verdict,
        score,
        submittedBeforeTimeout: !isAuto,
        answer: finalAnswer,
      });
    }, 1200);

    try {
      // 1. Immediately cache in localStorage for instant offline resilience
      try {
        const localVivas = JSON.parse(localStorage.getItem('logicq_viva_logs') || '[]');
        localVivas.unshift(vivaRecord);
        localStorage.setItem('logicq_viva_logs', JSON.stringify(localVivas.slice(0, 100)));
      } catch {}

      // 2. Non-blocking async write with timeout
      try {
        Promise.race([
          addDoc(collection(db, 'viva_logs'), vivaRecord),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]).catch(() => {});
      } catch {}

      // 3. Emit real-time sync across system so admin tabs refresh
      try {
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
        RealtimeSyncService.emit('ALL');
      } catch {}

      // 4. Background fire-and-forget notification to api.post (never blocks the UI)
      try {
        api.post('/exam/viva/submit', {
          vivaId,
          questionText,
          studentPrn: resolvedPrn,
          assignmentId,
          problemId,
          answer: finalAnswer,
        }).catch(() => {});
      } catch {}

      // 5. Instantly close modal and give student positive confirmation
      if (isAuto) {
        toast.warning('Time is up — response auto-submitted.');
      } else {
        toast.success('Response submitted!');
      }

      clearTimeout(safetyDismissTimeout);
      onCompleted({
        success: true,
        vivaId,
        verdict,
        score,
        submittedBeforeTimeout: !isAuto,
        answer: finalAnswer,
      });
    } catch (err) {
      clearTimeout(safetyDismissTimeout);
      console.warn('[AiVivaModal] Error submitting viva response:', err);
      onCompleted({
        success: true,
        vivaId,
        verdict,
        score,
        submittedBeforeTimeout: !isAuto,
        answer: finalAnswer,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitVivaResponse(answer, false);
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
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Rapid Check ({initialRemainingSec}s)</p>
                <h2 className="text-base font-bold text-white leading-tight">Quick Code Recall Verification</h2>
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
          <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-2.5">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Answer with a <span className="text-white font-medium">quick 1–2 word answer</span> based on the code you just wrote.
            </p>
          </div>

          {/* Question */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Question — Based on your code</p>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3.5 text-sm font-medium text-white leading-relaxed">
              {questionText}
            </div>
          </div>

          {/* Answer Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Answer (1-2 words)</p>
                <span className={`text-xs font-mono ${answer.length > MAX_CHARS * 0.9 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {answer.length}/{MAX_CHARS}
                </span>
              </div>
              <input
                type="text"
                required
                autoFocus
                maxLength={MAX_CHARS}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type quick 1-2 word answer and press Enter..."
                className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-gray-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500">
                ⚡ Press Enter to submit · Auto-submits at 0s
              </p>
              <div className="flex items-center gap-2">
                {isSubmitting && (
                  <button
                    type="button"
                    onClick={() => {
                      onCompleted({
                        success: true,
                        vivaId,
                        verdict: answer.trim().length >= 4 ? 'PASS' : 'PARTIAL',
                        score: 1.0,
                        submittedBeforeTimeout: true,
                        answer: answer || 'Submitted',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Continue ➔
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || answer.trim().length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-900/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit (Enter)'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AiVivaModal;
