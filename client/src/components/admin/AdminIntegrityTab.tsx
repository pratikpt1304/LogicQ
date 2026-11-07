import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
  Layers,
  HelpCircle,
} from 'lucide-react';

const INTEGRITY_FACTORS = [
  {
    name: 'Clipboard Telemetry',
    weight: '15%',
    metric: 'Pastes >50 chars in <300ms',
    desc: 'Detects unauthorized external paste bursts into code buffer.',
  },
  {
    name: 'Tab & Focus Invariant',
    weight: '15%',
    metric: 'Window blur & switch events',
    desc: 'Tracks focus losses and external browser tab switching.',
  },
  {
    name: 'Keystroke Dynamics',
    weight: '15%',
    metric: 'Inter-key intervals & WPM spikes',
    desc: 'Validates biomechanical typing cadence against bot injections.',
  },
  {
    name: 'Code Evolution & AST',
    weight: '15%',
    metric: 'Incremental AST modifications',
    desc: 'Evaluates natural iterative coding vs single-shot drop-in.',
  },
  {
    name: 'Compiler Error Cadence',
    weight: '10%',
    metric: 'Error-to-compile distribution',
    desc: 'Human programmers produce syntax/type errors before clean run.',
  },
  {
    name: 'Emergence Curve & Time',
    weight: '10%',
    metric: 'Solution emergence curve',
    desc: 'Verifies problem solving time matches cognitive complexity.',
  },
  {
    name: 'Environment Invariants',
    weight: '10%',
    metric: 'DevTools, window resizes',
    desc: 'Detects inspector opening, extension tampering, and proxies.',
  },
  {
    name: 'AI Viva Defense',
    weight: '10%',
    metric: 'Rule 29: 2nd Successive Viva',
    desc: 'Oral / written conceptual defense on consecutive correct answers.',
  },
];

const SAMPLE_VIVA_LOGS: any[] = [];

export const AdminIntegrityTab: React.FC = () => {
  const [selectedViva, setSelectedViva] = useState<any | null>(null);
  const [vivaLogs] = useState<any[]>(SAMPLE_VIVA_LOGS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              8-Factor Multi-Signal Assessment Integrity Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rule 59: Independent 0-100 integrity index separate from academic marks. Rule 29: Second successive submission AI viva defense.
            </p>
          </div>
        </div>
      </div>

      {/* 8-Factor Weight Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {INTEGRITY_FACTORS.map((f, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Weight: {f.weight}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Factor #{i + 1}</span>
            </div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">
              {f.name}
            </h3>
            <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
              {f.metric}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Risk Tier Classifications */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span>Classification Tiers & Thresholds (Platform Specification Item 51)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <div className="font-bold">Normal (0–20)</div>
            <div className="text-[10px] text-slate-500 mt-1">Pristine human telemetry</div>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
            <div className="font-bold">Low Risk (21–40)</div>
            <div className="text-[10px] text-slate-500 mt-1">Minor focus loss or blur</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
            <div className="font-bold">Moderate (41–60)</div>
            <div className="text-[10px] text-slate-500 mt-1">Cadence anomalies detected</div>
          </div>
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300">
            <div className="font-bold">High Risk (61–80)</div>
            <div className="text-[10px] text-slate-500 mt-1">Substantial paste/burst flags</div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
            <div className="font-bold">Critical (81–100)</div>
            <div className="text-[10px] text-slate-500 mt-1">Synthetic code injection</div>
          </div>
        </div>
      </div>

      {/* Rule 29: Second Successive Correct Submission AI Viva Defense Log */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Brain className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Rule 29: AI Viva Defense Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Triggered automatically on every second successive correct answer (Strict 1-minute oral/written defense).
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Active Defenses: {vivaLogs.length}
          </span>
        </div>

        {vivaLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Zero Integrity Flags Recorded</p>
            <p className="text-[11px] text-slate-500">All student assessment sessions are currently operating with clean telemetry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vivaLogs.map((vl) => (
              <div
                key={vl.id}
                onClick={() => setSelectedViva(vl)}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-purple-500/40 transition-all cursor-pointer space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {vl.studentName} ({vl.prn})
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{vl.problemTitle}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        vl.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      Viva Score: {vl.vivaScore}% ({vl.status})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{vl.timestamp}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-purple-600 dark:text-purple-400">Q: </span>
                  {vl.vivaQuestion}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                  <span className="font-bold text-slate-700 dark:text-slate-300 not-italic">A: </span>
                  "{vl.studentAnswer}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
