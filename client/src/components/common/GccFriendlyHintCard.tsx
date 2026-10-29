import React from 'react';
import { Lightbulb, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { translateGccDiagnostics } from '../../utils/gccErrorTranslator';

interface GccFriendlyHintCardProps {
  compileOutput?: string;
  stderr?: string;
  className?: string;
}

export const GccFriendlyHintCard: React.FC<GccFriendlyHintCardProps> = ({
  compileOutput,
  stderr,
  className = '',
}) => {
  const combined = [compileOutput || '', stderr || ''].join('\n').trim();
  const hints = translateGccDiagnostics(combined);

  if (hints.length === 0) return null;

  return (
    <div className={`space-y-2.5 my-2.5 animate-in fade-in duration-200 ${className}`}>
      {hints.map((hint, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-transparent text-amber-200 shadow-md font-sans text-xs space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>LogicQ Plain-English Diagnostic: {hint.title}</span>
            </div>
            {hint.line && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                Line {hint.line}
              </span>
            )}
          </div>

          <p className="text-amber-100/90 text-xs leading-relaxed font-mono">
            {hint.explanation}
          </p>

          <div className="p-2 rounded-lg bg-black/40 border border-amber-500/20 text-[11px] font-mono text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-200">How to fix:</strong> {hint.remedy}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
