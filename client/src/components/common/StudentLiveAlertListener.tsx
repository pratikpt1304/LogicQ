import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { db } from '../../config/firebase.js';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ShieldAlert, AlertTriangle, CheckCircle2, Lock, Sparkles, BookOpen } from 'lucide-react';
import { StudentIssuesModal } from './StudentIssuesModal.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18); // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export const StudentLiveAlertListener: React.FC = () => {
  const { user, logout } = useAuth();
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string>('Violated institutional integrity policy');
  const [bannedAt, setBannedAt] = useState<string>('');
  const [selectedIssueModalOpen, setSelectedIssueModalOpen] = useState(false);

  const cleanPrn = (user?.prn || '').toUpperCase().trim();
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userId = user?.id || '';

  // Track known issue statuses to detect when status changes to RESOLVED
  const knownStatusMapRef = useRef<Record<string, string>>({});
  const initialLoadRef = useRef<boolean>(true);

  // 1. REAL-TIME BAN / SUSPENSION LISTENER
  useEffect(() => {
    if (!cleanPrn || user?.role === 'ADMIN' || userEmail === 'logicqarena@gmail.com' || userEmail === 'hariprasathset@sanjivani.edu.in') return;

    // Fast local check
    const localBanned = localStorage.getItem(`logicq_banned_${cleanPrn}`) === 'true';
    if (localBanned) {
      setIsBanned(true);
    }

    // Live listener on cohort_progress
    const unsubCohort = onSnapshot(
      doc(db, 'cohort_progress', cleanPrn),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.isBanned) {
            setIsBanned(true);
            setBanReason(data.banReason || 'Violated institutional integrity policy');
            setBannedAt(data.bannedAt || new Date().toISOString());
            localStorage.setItem(`logicq_banned_${cleanPrn}`, 'true');
          } else if (data?.isBanned === false && isBanned) {
            setIsBanned(false);
            localStorage.removeItem(`logicq_banned_${cleanPrn}`);
            toast.success('Account Restored: Your institutional access has been reinstated by faculty.');
          }
        }
      },
      () => {}
    );

    // Live listener on enrolled_students
    const unsubEnrolled = onSnapshot(
      doc(db, 'enrolled_students', cleanPrn),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.isBanned) {
            setIsBanned(true);
            setBanReason(data.banReason || 'Violated institutional integrity policy');
            setBannedAt(data.bannedAt || new Date().toISOString());
            localStorage.setItem(`logicq_banned_${cleanPrn}`, 'true');
          } else if (data?.isBanned === false && isBanned) {
            setIsBanned(false);
            localStorage.removeItem(`logicq_banned_${cleanPrn}`);
            toast.success('Account Restored: Your institutional access has been reinstated by faculty.');
          }
        }
      },
      () => {}
    );

    return () => {
      unsubCohort();
      unsubEnrolled();
    };
  }, [cleanPrn, isBanned, user?.role, userEmail]);

  // 2. REAL-TIME ISSUE RESOLUTION LISTENER
  useEffect(() => {
    if (!cleanPrn && !userEmail && !userId) return;

    // Load previously notified issues from localStorage
    const notifiedKey = `logicq_notified_resolved_issues_${cleanPrn || userId}`;
    const getNotified = (): string[] => {
      try {
        return JSON.parse(localStorage.getItem(notifiedKey) || '[]');
      } catch {
        return [];
      }
    };
    const addNotified = (id: string) => {
      try {
        const curr = getNotified();
        if (!curr.includes(id)) {
          curr.push(id);
          localStorage.setItem(notifiedKey, JSON.stringify(curr.slice(-50)));
        }
      } catch {}
    };

    const unsubIssues = onSnapshot(
      collection(db, 'raised_issues'),
      (snap) => {
        snap.forEach((d) => {
          const data = d.data();
          const pPrn = String(data.studentPrn || '').toUpperCase().trim();
          const pEmail = String(data.studentEmail || '').toLowerCase().trim();
          const pId = String(data.studentId || '').trim();

          const isMine =
            (cleanPrn && pPrn && (pPrn === cleanPrn || cleanPrn.includes(pPrn) || pPrn.includes(cleanPrn))) ||
            (userEmail && pEmail && pEmail === userEmail) ||
            (userId && pId && pId === userId);

          if (!isMine) return;

          const issueId = d.id;
          const currentStatus = String(data.status || 'OPEN').toUpperCase();
          const prevStatus = knownStatusMapRef.current[issueId];

          // Check if it transitioned to RESOLVED or is a newly resolved issue not yet seen
          const alreadyNotified = getNotified().includes(issueId);

          if (currentStatus === 'RESOLVED') {
            if ((prevStatus && prevStatus !== 'RESOLVED') || (!alreadyNotified && !initialLoadRef.current)) {
              addNotified(issueId);
              playNotificationChime();
              realtimeSync.emit('ISSUES');

              toast.success(`🎉 Issue Resolved by Faculty!`, {
                description: `Your reported issue on "${data.questionTitle || 'Question'}" has been reviewed and resolved by faculty.`,
                duration: 9000,
                action: {
                  label: 'View Resolution',
                  onClick: () => setSelectedIssueModalOpen(true),
                },
              });
            }
          }

          knownStatusMapRef.current[issueId] = currentStatus;
        });

        initialLoadRef.current = false;
      },
      () => {}
    );

    return () => {
      unsubIssues();
    };
  }, [cleanPrn, userEmail, userId]);

  return (
    <>
      {/* 3. FULL-SCREEN SUSPENSION LOCKOUT OVERLAY IF BANNED */}
      {isBanned && (
        <div className="fixed inset-0 z-[999999999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center relative">
              <ShieldAlert className="w-9 h-9" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 animate-ping" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Institutional Access Restricted
              </span>
              <h2 className="text-xl font-bold text-white pt-1">
                Account Suspended by Faculty
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your student profile and coding privileges have been suspended by your course administrator.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 text-left space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-2">
                <span>Candidate PRN:</span>
                <span className="text-white font-bold">{cleanPrn}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-2">
                <span>Suspension Time:</span>
                <span className="text-rose-300">
                  {bannedAt ? new Date(bannedAt).toLocaleString() : 'Active Enforcement'}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-0.5">Official Reason:</span>
                <span className="text-amber-400 font-sans text-xs font-semibold block leading-snug">
                  {banReason}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-2 bg-slate-800/40 p-3 rounded-xl border border-white/5">
              <p>
                To contest or request reinstation, please visit your Department Head or Course Lab Instructor with your institutional ID card.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Sign Out from LogicQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Reported Issues Modal popup on click of toast action */}
      <StudentIssuesModal
        isOpen={selectedIssueModalOpen}
        onClose={() => setSelectedIssueModalOpen(false)}
      />
    </>
  );
};
