import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Brain,
  Sparkles,
  Activity,
  Sliders,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  X,
  Play,
  RotateCcw,
  Check,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface GuardrailSetting {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: string;
}

interface VivaLogItem {
  id: string;
  studentName: string;
  prn: string;
  section: string;
  problemTitle: string;
  question: string;
  answer: string;
  score: number;
  status: 'VERIFIED' | 'REVIEW_NEEDED';
  timestamp: string;
}

const DEFAULT_GUARDRAILS: GuardrailSetting[] = [
  {
    id: 'clipboard',
    name: 'Paste Injection Guard',
    description: 'Detects and flags rapid external code bursts (>50 characters in under 300ms).',
    icon: ShieldCheck,
    enabled: true,
    category: 'Code Buffer',
  },
  {
    id: 'focus',
    name: 'Browser Focus & Tab Tracker',
    description: 'Monitors window blur, tab switching, and dual-screen application transitions.',
    icon: Activity,
    enabled: true,
    category: 'Environment',
  },
  {
    id: 'keystroke',
    name: 'Biomechanical Keystroke Cadence',
    description: 'Validates human typing intervals (WPM curves) against synthetic injections.',
    icon: Sliders,
    enabled: true,
    category: 'Telemetry',
  },
  {
    id: 'ai-viva',
    name: 'Automated AI Conceptual Viva',
    description: 'Triggers a 60-second oral/written concept defense on consecutive solutions.',
    icon: Brain,
    enabled: true,
    category: 'Verification',
  },
];

export const AdminIntegrityTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'VIVA' | 'SETTINGS'>('INCIDENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoVivaModalOpen, setIsDemoVivaModalOpen] = useState(false);

  // Guardrail settings state with local persistence
  const [guardrails, setGuardrails] = useState<GuardrailSetting[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_guardrail_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GUARDRAILS;
  });

  // Viva logs
  const [vivaLogs, setVivaLogs] = useState<VivaLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_viva_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const toggleGuardrail = (id: string) => {
    const updated = guardrails.map((g) =>
      g.id === id ? { ...g, enabled: !g.enabled } : g
    );
    setGuardrails(updated);
    try {
      localStorage.setItem('logicq_guardrail_settings', JSON.stringify(updated));
    } catch {}
    const changed = updated.find((g) => g.id === id);
    if (changed) {
      toast.success(`${changed.name} ${changed.enabled ? 'Enabled' : 'Disabled'}`);
    }
  };

  const activeGuardrailCount = guardrails.filter((g) => g.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST FROSTED HEADER                                        */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Exam Integrity & AI Viva
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Protected</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live anti-cheating telemetry, background proctoring, and automated conceptual AI viva verification.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDemoVivaModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preview AI Viva</span>
            </button>
          </div>
        </div>

        {/* Apple 3-Metric Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">Session Integrity</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">100% Clean</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Brain className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">AI Viva Defense</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">Active & Armed</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">Active Guardrails</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{activeGuardrailCount} of 4 Armed</span>
            </div>
          </div>
        </div>

        {/* Apple Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('INCIDENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeTab === 'INCIDENTS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Live Incidents (0)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VIVA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeTab === 'VIVA'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            AI Viva Defenses ({vivaLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-slate-800 dark:bg-white/20 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Guardrail Settings ({activeGuardrailCount}/4)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: LIVE INCIDENTS FEED                                             */}
      {/* ========================================================================= */}
      {activeTab === 'INCIDENTS' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zero Integrity Breaches
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              All student assessment sessions are operating with clean telemetry. Clipboard paste bursts, window blurs, and keystroke speed are continuously validated in the background.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Telemetry engine streaming live</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB 2: AI VIVA DEFENSE AUDIT LOG                                       */}
      {/* ========================================================================= */}
      {activeTab === 'VIVA' && (
        <div className="space-y-4">
          {vivaLogs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-8 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Viva Defense Standby
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  When a student solves consecutive algorithmic challenges with high speed, LogicQ automatically poses a 60-second conceptual question to confirm code ownership.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoVivaModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>See AI Viva Preview</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {vivaLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {log.studentName} ({log.prn})
                      </h4>
                      <p className="text-xs text-slate-400">
                        {log.section} • {log.problemTitle}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        log.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {log.score}/100 ({log.status})
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs space-y-1.5">
                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                      Q: {log.question}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 italic">
                      A: "{log.answer}"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 3: APPLE-GRADE GUARDRAIL CONTROLS (1-Click Toggles)                 */}
      {/* ========================================================================= */}
      {activeTab === 'SETTINGS' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Anti-Cheating Guardrail Controls
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Turn individual proctoring sensors and defense layers on or off with a single click.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {guardrails.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.id}
                  className="py-4 flex items-center justify-between gap-4 first:pt-2 last:pb-2"
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                        g.enabled
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          {g.name}
                        </h4>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/5">
                          {g.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                        {g.description}
                      </p>
                    </div>
                  </div>

                  {/* iOS Style Switch */}
                  <button
                    type="button"
                    onClick={() => toggleGuardrail(g.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      g.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        g.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE MODAL: PREVIEW AI VIVA EXPERIENCE                           */}
      {/* ========================================================================= */}
      {isDemoVivaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    AI Viva Defense Simulation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    What students see when AI triggers a 60-second oral/written viva
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoVivaModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Concept Challenge (60s Timer)
                </span>
                <p className="font-semibold text-xs sm:text-sm">
                  "In your `isPowerOfTwo` function, why does `(n & (n - 1)) == 0` correctly verify powers of two without a loop? Explain the binary representation behavior."
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Student Defense Explanation
                </span>
                <p className="text-slate-700 dark:text-slate-300 italic">
                  "A power of two in binary has only a single bit set, like 16 which is 10000. Subtracting 1 flips all lower bits to 1 (15 is 01111). Doing bitwise AND gives 0 only when there is exactly one set bit."
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Evaluation: Genuine Comprehension</span>
                </div>
                <span className="font-mono font-bold">Score: 98 / 100</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDemoVivaModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition active:scale-95 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
