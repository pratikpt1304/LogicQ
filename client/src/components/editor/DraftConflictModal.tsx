import React from 'react';
import { AlertTriangle, Cloud, HardDrive, Check } from 'lucide-react';
import { DraftData } from '../../services/draftSync.service.js';

interface DraftConflictModalProps {
  localDraft: DraftData;
  remoteDraft: DraftData;
  onKeepLocal: () => void;
  onKeepRemote: () => void;
}

export const DraftConflictModal: React.FC<DraftConflictModalProps> = ({
  localDraft,
  remoteDraft,
  onKeepLocal,
  onKeepRemote,
}) => {
  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-conflict-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#252C4F] bg-[#141932] flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="draft-conflict-title" className="text-base font-bold text-[#E8EAF6]">
              Draft Conflict Detected
            </h3>
            <p className="text-xs text-[#9AA1C4] font-mono mt-0.5">
              Code was edited on another device. Choose which version you want to keep.
            </p>
          </div>
        </div>

        {/* Content: Side-by-side comparison cards */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Remote Cloud Version */}
            <div className="p-4 rounded-xl bg-[#0C0F1F] border-2 border-[#8B9BFF]/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#8B9BFF]">
                    <Cloud className="w-4 h-4" />
                    Cloud Version (Newer)
                  </span>
                  <span className="text-[11px] font-mono text-[#46D9A0] bg-[#46D9A0]/10 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                </div>
                <div className="text-xs font-mono text-[#9AA1C4] mb-3 space-y-1">
                  <div>Device: <strong className="text-[#E8EAF6]">{remoteDraft.deviceLabel}</strong></div>
                  <div>Saved at: <strong className="text-[#E8EAF6]">{formatTime(remoteDraft.updatedAt)}</strong></div>
                </div>
                <div className="rounded-lg bg-[#141932] border border-[#252C4F] p-3 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre">
                  {remoteDraft.code.slice(0, 500)}
                  {remoteDraft.code.length > 500 && '\n... (truncated preview)'}
                </div>
              </div>
              <button
                type="button"
                onClick={onKeepRemote}
                data-testid="keep-remote-draft-btn"
                className="mt-4 w-full py-2.5 px-4 rounded-lg bg-[#8B9BFF] hover:bg-[#9FA0FF] text-[#0C0F1F] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                Keep Cloud Version
              </button>
            </div>

            {/* Local Version */}
            <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#9AA1C4]">
                    <HardDrive className="w-4 h-4" />
                    This Device
                  </span>
                </div>
                <div className="text-xs font-mono text-[#9AA1C4] mb-3 space-y-1">
                  <div>Device: <strong className="text-[#E8EAF6]">{localDraft.deviceLabel}</strong></div>
                  <div>Saved at: <strong className="text-[#E8EAF6]">{formatTime(localDraft.updatedAt)}</strong></div>
                </div>
                <div className="rounded-lg bg-[#141932] border border-[#252C4F] p-3 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre">
                  {localDraft.code.slice(0, 500)}
                  {localDraft.code.length > 500 && '\n... (truncated preview)'}
                </div>
              </div>
              <button
                type="button"
                onClick={onKeepLocal}
                data-testid="keep-local-draft-btn"
                className="mt-4 w-full py-2.5 px-4 rounded-lg bg-[#252C4F] hover:bg-[#252C4F]/80 text-[#E8EAF6] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                Keep This Device's Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
