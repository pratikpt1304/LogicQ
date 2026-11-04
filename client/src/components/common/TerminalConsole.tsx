import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { translateGccDiagnostics, GccHint } from '../../utils/gccErrorTranslator.js';

export interface TestCaseResult {
  passed?: boolean;
  verdict?: string;
  runtimeMs?: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  stderr?: string;
  orderIndex?: number;
}

export interface TerminalConsoleProps {
  /** Execution status or verdict */
  status?: 'IDLE' | 'COMPILING' | 'RUNNING' | 'ACCEPTED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | string;
  /** GCC compiler diagnostic output (stderr from compilation) */
  compileOutput?: string | null;
  /** Standard output from program execution */
  stdout?: string | null;
  /** Standard error from program execution */
  stderr?: string | null;
  /** Process exit code (0 = success, 1 = compilation failure, etc.) */
  exitCode?: number | null;
  /** Program runtime in milliseconds */
  runtimeMs?: number | null;
  /** Memory used in kilobytes */
  memoryKb?: number | null;
  /** Active use case input that was passed into standard input */
  useCaseInput?: string | null;
  /** Expected output for the active use case */
  expectedOutput?: string | null;
  /** Selected use case index (0-based) */
  useCaseIndex?: number;
  /** Total use cases */
  totalUseCases?: number;
  /** Batch test case results (if submitted) */
  testCases?: TestCaseResult[];
  /** Loading state */
  isLoading?: boolean;
  /** Custom title or environment label */
  title?: string;
  /** Callback to re-run or retry */
  onRetry?: () => void;
  /** Callback to clear console */
  onClear?: () => void;
  /** Extra CSS classes */
  className?: string;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  status = 'IDLE',
  compileOutput,
  stdout,
  stderr,
  exitCode,
  runtimeMs,
  memoryKb,
  useCaseInput,
  expectedOutput,
  useCaseIndex,
  totalUseCases,
  testCases,
  isLoading = false,
  title = 'GCC C11',
  onRetry,
  onClear,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'bugs' | 'usecase'>('console');
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine raw GCC diagnostics
  const rawCompilerText = [compileOutput || '', stderr || ''].filter(Boolean).join('\n').trim();
  const hints: GccHint[] = translateGccDiagnostics(rawCompilerText);

  // Determine normalized status
  const normalizedStatus = (status || '').toUpperCase();
  const isCompilationError =
    normalizedStatus === 'COMPILATION_ERROR' ||
    Boolean(compileOutput && compileOutput.includes('error:'));
  const isRuntimeError =
    normalizedStatus === 'RUNTIME_ERROR' ||
    normalizedStatus.includes('SIGSEGV') ||
    Boolean(stderr && (stderr.includes('Segmentation fault') || stderr.includes('core dumped')));
  const isSuccess =
    normalizedStatus === 'ACCEPTED' ||
    (!isCompilationError && !isRuntimeError && (exitCode === 0 || (stdout && !stderr && !compileOutput)));
  const isMismatch = normalizedStatus === 'WRONG_ANSWER';

  // Format compiler output with syntax colors
  const formatCompilerLine = (line: string, index: number) => {
    if (line.includes(': error:')) {
      const parts = line.split(': error:');
      return (
        <div key={index} className="text-rose-400 font-semibold leading-relaxed">
          <span className="text-cyan-400 font-mono">{parts[0]}</span>
          <span className="text-rose-500 font-bold">: error:</span>
          <span className="text-rose-300">{parts[1]}</span>
        </div>
      );
    }
    if (line.includes(': warning:')) {
      const parts = line.split(': warning:');
      return (
        <div key={index} className="text-amber-400 font-semibold leading-relaxed">
          <span className="text-cyan-400 font-mono">{parts[0]}</span>
          <span className="text-amber-500 font-bold">: warning:</span>
          <span className="text-amber-200">{parts[1]}</span>
        </div>
      );
    }
    if (line.includes(': note:')) {
      const parts = line.split(': note:');
      return (
        <div key={index} className="text-slate-400 leading-relaxed">
          <span className="text-slate-500 font-mono">{parts[0]}</span>
          <span className="text-sky-400 font-bold">: note:</span>
          <span className="text-slate-300">{parts[1]}</span>
        </div>
      );
    }
    if (line.trim().startsWith('^') || line.includes('~~~')) {
      return (
        <div key={index} className="text-emerald-400 font-bold font-mono">
          {line}
        </div>
      );
    }
    return (
      <div key={index} className="text-slate-300 font-mono">
        {line}
      </div>
    );
  };

  const handleCopy = () => {
    const fullLog = [
      `=== LOGICQ GCC 14.2 COMPILATION & EXECUTION LOG ===`,
      `Status: ${normalizedStatus || (isSuccess ? 'SUCCESS' : 'FAILED')}`,
      exitCode != null ? `Exit Code: ${exitCode}` : '',
      runtimeMs != null ? `Execution Time: ${runtimeMs}ms` : '',
      useCaseInput != null ? `\n--- USE CASE INPUT ---\n${useCaseInput}` : '',
      compileOutput ? `\n--- COMPILER DIAGNOSTICS (GCC) ---\n${compileOutput}` : '',
      stdout ? `\n--- STANDARD OUTPUT ---\n${stdout}` : '',
      stderr ? `\n--- STANDARD ERROR ---\n${stderr}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(fullLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-800 bg-[#080d1a] text-slate-200 shadow-2xl overflow-hidden font-mono text-xs transition-all ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl' : 'min-h-[260px]'
      } ${className}`}
    >
      {/* 1. Terminal Window Titlebar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0e1628] border-b border-slate-800/90 select-none">
        {/* Left: Window Dots & Compiler Meta */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block shadow-xs shadow-rose-500/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-xs shadow-amber-500/40" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-xs shadow-emerald-500/40" />
          </div>

          <div className="flex items-center gap-2 pl-1 border-l border-slate-700/60">
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-[11px] text-slate-300 hidden sm:inline truncate max-w-[280px]">
              {title}
            </span>
          </div>
        </div>

        {/* Center: Live Compilation Status Badge */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>GCC: COMPILING & RUNNING...</span>
            </span>
          ) : isCompilationError ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
              <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>COMPILATION FAILED (Exit 1)</span>
            </span>
          ) : isRuntimeError ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>RUNTIME ERROR (SIGSEGV)</span>
            </span>
          ) : isMismatch ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>OUTPUT MISMATCH</span>
            </span>
          ) : isSuccess ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>COMPILED & EXECUTED (Exit 0)</span>
            </span>
          ) : null}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Copy Terminal Output"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Clear Terminal Output"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition cursor-pointer hidden md:flex"
            title={isExpanded ? 'Minimize Terminal' : 'Maximize Terminal'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Terminal Sub-Header Tabs */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0a101f] border-b border-slate-800/70 text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'console'
                ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TerminalIcon className="w-3 h-3" />
            <span>Terminal Stream</span>
          </button>

          {hints.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('bugs')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bugs'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Lightbulb className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Bug Guidance ({hints.length})</span>
            </button>
          )}
        </div>

        {/* Runtime Performance Chips */}
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          {runtimeMs != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{runtimeMs}ms</span>
            </span>
          )}
          {exitCode != null && (
            <span
              className={`px-1.5 py-0.2 rounded font-bold ${
                exitCode === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              exit: {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* 3. Terminal Body Content */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-3 bg-[#060a14]">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <TerminalIcon className="w-4 h-4 text-cyan-400 absolute inset-0 m-auto" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-slate-200">Executing C11 Solution in GCC Sandbox</p>
              <p className="text-[11px] text-slate-500">Injecting Use Case input directly into standard input stream...</p>
            </div>
          </div>
        ) : activeTab === 'bugs' && hints.length > 0 ? (
          /* Plain-English Bug Guidance Tab */
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>LogicQ Plain-English Diagnostic: {hints.length} issue(s) identified</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">GCC 14 Parser</span>
            </div>

            {hints.map((hint, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#101422] to-transparent text-amber-200 space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                    <span>{hint.title}</span>
                  </div>
                  {hint.line && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      Line {hint.line}{hint.column ? `, Col ${hint.column}` : ''}
                    </span>
                  )}
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  {hint.explanation}
                </p>

                <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-200 font-bold">Actionable Fix: </strong>
                    <span>{hint.remedy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'usecase' && useCaseInput != null ? (
          /* Use Case Direct Input & Verification Tab */
          <div className="space-y-3 font-mono">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>
                  Use Case {useCaseIndex != null ? `#${useCaseIndex + 1}` : ''} Input Injection
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                Automated • No Manual Stdin Needed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Use Case Input (Automated Stdin):
                </span>
                <pre className="p-3 rounded-xl bg-black/70 border border-slate-800 text-cyan-300 whitespace-pre-wrap overflow-x-auto min-h-[60px] shadow-inner font-mono">
                  {useCaseInput || '(Empty Input)'}
                </pre>
              </div>

              {expectedOutput != null && (
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                    Expected Output:
                  </span>
                  <pre className="p-3 rounded-xl bg-black/70 border border-slate-800 text-emerald-400 font-bold whitespace-pre-wrap overflow-x-auto min-h-[60px] shadow-inner font-mono">
                    {expectedOutput}
                  </pre>
                </div>
              )}
            </div>

            {stdout != null && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Your Solution Output:
                  </span>
                  {expectedOutput && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stdout.trim() === expectedOutput.trim()
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {stdout.trim() === expectedOutput.trim() ? 'MATCH: PASSED ✅' : 'MISMATCH: FAILED ❌'}
                    </span>
                  )}
                </div>
                <pre
                  className={`p-3 rounded-xl bg-black/70 border whitespace-pre-wrap overflow-x-auto min-h-[60px] shadow-inner font-mono ${
                    expectedOutput && stdout.trim() === expectedOutput.trim()
                      ? 'border-emerald-500/40 text-emerald-300'
                      : expectedOutput
                      ? 'border-rose-500/40 text-rose-300'
                      : 'border-slate-800 text-slate-200'
                  }`}
                >
                  {stdout || '(No standard output generated)'}
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* Default: Full Terminal Log Stream */
          <div className="space-y-3 font-mono">
            {/* Shell invocation command */}
            <div className="text-slate-400 space-y-0.5 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="text-emerald-400 font-bold">logicq@sandbox:~$</span>
                <span className="text-slate-200">gcc -Wall -Wextra -std=c11 -O2 solution.c -o solution</span>
              </div>
              {useCaseInput != null && (
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="text-emerald-400/80 font-bold">logicq@sandbox:~$</span>
                  <span className="text-slate-300">
                    ./solution &lt; use_case_{useCaseIndex != null ? useCaseIndex + 1 : 1}_stdin.txt
                  </span>
                </div>
              )}
            </div>

            {/* Compiler Error / Warning Diagnostics */}
            {compileOutput && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>GCC Compiler Diagnostics:</span>
                </div>
                <div className="p-3 rounded-xl bg-black/80 border border-rose-500/30 overflow-x-auto space-y-0.5 shadow-inner">
                  {compileOutput.split('\n').map((line, idx) => formatCompilerLine(line, idx))}
                </div>
              </div>
            )}

            {/* Standard Error */}
            {stderr && !compileOutput && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Standard Error (stderr):</span>
                </div>
                <div className="p-3 rounded-xl bg-black/80 border border-amber-500/30 text-amber-300 overflow-x-auto shadow-inner">
                  {stderr}
                </div>
              </div>
            )}

            {/* Standard Output */}
            {stdout != null && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Program Standard Output:</span>
                </div>
                <pre className="p-3 rounded-xl bg-black/80 border border-slate-800 text-emerald-300 whitespace-pre-wrap overflow-x-auto shadow-inner min-h-[50px]">
                  {stdout || '(Program exited without printing to stdout)'}
                </pre>
              </div>
            )}

            {/* Process Execution Summary Footer */}
            {!isLoading && (stdout != null || compileOutput != null || stderr != null) && (
              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                <span>
                  [Process finished with exit code {exitCode ?? (isCompilationError ? 1 : 0)} in {runtimeMs || 14}ms]
                </span>
                {hints.length > 0 && activeTab !== 'bugs' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bugs')}
                    className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View {hints.length} suggested fix(es) in Bug Guidance</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Empty Idle State */}
            {!isLoading && stdout == null && compileOutput == null && stderr == null && (
              <div className="py-8 text-center text-slate-500 space-y-1">
                <p>Click &ldquo;Compile &amp; Run&rdquo; to test your C code against the active Use Case.</p>
                <p className="text-[10px]">Inputs are automatically extracted from the problem test case specification.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
