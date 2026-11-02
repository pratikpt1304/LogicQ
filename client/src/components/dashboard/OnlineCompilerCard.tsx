import React, { useState, useEffect } from 'react';
import { CodeEditor } from '../editor/CodeEditor.js';
import { api } from '../../api/client.js';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Clock,
  Cpu,
  Trash2,
  Maximize2,
  Minimize2,
  FileCode,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Keyboard,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_C_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("Welcome to LogicQ C11 Compiler.\\n");
    return 0;
}
`;

const SCRATCHPAD_STORAGE_KEY = 'logicq_dashboard_scratchpad_code';
const SCRATCHPAD_STDIN_KEY = 'logicq_dashboard_scratchpad_stdin';

export const OnlineCompilerCard: React.FC = () => {
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem(SCRATCHPAD_STORAGE_KEY) || DEFAULT_C_CODE;
    } catch {
      return DEFAULT_C_CODE;
    }
  });

  const [stdin, setStdin] = useState<string>(() => {
    try {
      return localStorage.getItem(SCRATCHPAD_STDIN_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'output' | 'stdin'>('output');
  const [output, setOutput] = useState<string | null>(null);
  const [errorOutput, setErrorOutput] = useState<string | null>(null);
  const [executionStats, setExecutionStats] = useState<{
    runtimeMs?: number;
    memoryKb?: number;
    exitCode?: number;
    verdict?: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  // Autosave scratchpad code and stdin
  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_STORAGE_KEY, code);
    } catch {}
  }, [code]);

  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_STDIN_KEY, stdin);
    } catch {}
  }, [stdin]);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) {
          handleRunCode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, stdin, isRunning]);

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty. Please enter your C code.');
      return;
    }

    setIsRunning(true);
    setActiveTab('output');
    setOutput(null);
    setErrorOutput(null);
    setExecutionStats(null);

    try {
      const res = await api.post('/submissions/run', {
        code,
        stdin: stdin.trim(),
        timeLimitMs: 2000,
      });

      const data = res?.data || res;
      const stdout = data?.stdout ?? '';
      const stderr = data?.stderr ?? '';
      const compileOutput = data?.compileOutput ?? '';
      const exitCode = data?.exitCode ?? (data?.verdict === 'ACCEPTED' ? 0 : 1);
      const runtimeMs = data?.runtimeMs ?? 0;
      const memoryKb = data?.memoryKb ?? 0;
      const verdict = data?.verdict || (exitCode === 0 ? 'SUCCESS' : 'ERROR');

      setExecutionStats({
        runtimeMs,
        memoryKb,
        exitCode,
        verdict,
      });

      if (compileOutput && compileOutput.trim() && verdict === 'COMPILE_ERROR') {
        setErrorOutput(compileOutput);
      } else if (stderr && stderr.trim()) {
        setErrorOutput(stderr);
      }

      if (stdout) {
        setOutput(stdout);
      } else if (!compileOutput && !stderr) {
        setOutput('Program executed successfully with zero console output.');
      }

      if (verdict === 'COMPILE_ERROR') {
        toast.error('Compilation Failed. Check terminal diagnostics.');
      } else if (exitCode !== 0) {
        toast.error(`Execution finished with non-zero exit code (${exitCode}).`);
      } else {
        toast.success(`Executed cleanly in ${runtimeMs}ms!`);
      }
    } catch (err: any) {
      setErrorOutput(err?.message || 'Failed to execute code on judge compiler.');
      setExecutionStats({
        exitCode: 1,
        verdict: 'ERROR',
      });
      toast.error(err?.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = () => {
    if (window.confirm('Reset scratchpad editor to default Hello World C program?')) {
      setCode(DEFAULT_C_CODE);
      setStdin('');
      setOutput(null);
      setErrorOutput(null);
      setExecutionStats(null);
      toast.info('Scratchpad code reset to default template.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyOutput = async () => {
    const textToCopy = [output, errorOutput].filter(Boolean).join('\n\n');
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedOutput(true);
      toast.success('Terminal output copied');
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch {
      toast.error('Failed to copy output');
    }
  };

  const handleClearOutput = () => {
    setOutput(null);
    setErrorOutput(null);
    setExecutionStats(null);
  };

  return (
    <div
      className={`rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-[9999] flex flex-col shadow-2xl bg-[var(--bg-panel)]' : 'w-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-line)] bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] font-mono tracking-tight flex items-center gap-2">
                <span>GCC 14 (C11) Online Compiler</span>
              </h2>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                Live Playground
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Compile, debug, and run any custom C11 code in the isolated cloud sandbox
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title="Copy source code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-amber-500 transition cursor-pointer"
            title="Reset code to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-cyan-400 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workspace'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => window.open('/compiler', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer shadow-xs"
            title="Open C11 Compiler in a separate new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Window</span>
          </button>

          {/* Primary Compile & Run Button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Compile &amp; Run</span>
                <span className="hidden lg:inline text-[10px] opacity-75 font-normal ml-0.5">(Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Grid: Editor (Left / Top) & Interactive Console (Right / Bottom) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-line)] ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
        
        {/* LEFT / MAIN: Monaco Code Editor (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col bg-[var(--bg-surface)] ${isFullscreen ? 'h-full overflow-hidden' : 'min-h-[440px]'}`}>
          {/* Editor Sub-header */}
          <div className="px-4 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] text-cyan-400 font-bold border border-cyan-500/20 flex items-center gap-1.5 shadow-xs">
                <FileCode className="w-3.5 h-3.5" />
                <span>main.c</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                Standard C11 • GCC 14.2.0
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="hidden sm:inline">Auto-saves locally</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full min-h-[380px] lg:min-h-[440px] relative">
            <CodeEditor
              code={code}
              onChange={setCode}
              onRun={handleRunCode}
              isRunning={isRunning}
              hideHeader={true}
              disableCopyPaste={false}
            />
          </div>
        </div>

        {/* RIGHT: Input / Output Console Pane (5 cols) */}
        <div className={`lg:col-span-5 flex flex-col bg-[var(--bg-panel)] ${isFullscreen ? 'h-full overflow-hidden' : 'min-h-[440px]'}`}>
          {/* Console Header Tabs */}
          <div className="px-3 sm:px-4 py-2 border-b border-[var(--border-line)] flex items-center justify-between gap-2 bg-[var(--bg-surface)]/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Verdict &amp; Output</span>
                {executionStats && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      executionStats.verdict === 'COMPILE_ERROR' || executionStats.exitCode !== 0
                        ? 'bg-rose-500'
                        : 'bg-emerald-400'
                    }`}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stdin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'stdin'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Custom Input (stdin)</span>
                {stdin.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            </div>

            {/* Console Actions */}
            {activeTab === 'output' && (output || errorOutput) && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="Copy terminal output"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="Clear terminal output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Execution Output */}
          {activeTab === 'output' && (
            <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto font-mono text-xs space-y-3">
              {isRunning ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <Terminal className="w-5 h-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-main)]">Compiling with GCC 14...</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Executing in isolated memory sandbox (C11 -O2)
                    </p>
                  </div>
                </div>
              ) : output || errorOutput ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  {/* Status & Stats Pill Bar */}
                  {executionStats && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] shrink-0">
                      <div className="flex items-center gap-2">
                        {executionStats.verdict === 'COMPILE_ERROR' ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Compilation Error</span>
                          </span>
                        ) : executionStats.exitCode === 0 ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Exit Code 0 (Success)</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Exit Code {executionStats.exitCode}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                        {executionStats.runtimeMs !== undefined && (
                          <span className="flex items-center gap-1" title="Execution Time">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{executionStats.runtimeMs}ms</span>
                          </span>
                        )}
                        {executionStats.memoryKb !== undefined && executionStats.memoryKb > 0 && (
                          <span className="flex items-center gap-1" title="Memory Consumed">
                            <Cpu className="w-3 h-3 text-indigo-400" />
                            <span>{(executionStats.memoryKb / 1024).toFixed(1)} MB</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Compiler Diagnostic Errors */}
                  {errorOutput && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>GCC Diagnostics / Stderr</span>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/30 text-rose-300 overflow-x-auto text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                        {errorOutput}
                      </pre>
                    </div>
                  )}

                  {/* Program Standard Output */}
                  {output && (
                    <div className="space-y-1 flex-1 flex flex-col">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Standard Output (stdout)</span>
                      </div>
                      <pre className="flex-1 p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)] overflow-x-auto text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                        {output}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Console Placeholder */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2.5 text-[var(--text-muted)]">
                  <Terminal className="w-8 h-8 opacity-30 mx-auto text-emerald-500" />
                  <p className="text-xs font-semibold text-[var(--text-main)] font-mono">
                    Terminal Ready
                  </p>
                  <p className="text-[11px] max-w-xs leading-relaxed">
                    Write or edit code in the editor, optionally supply custom stdin, and click <strong>Compile &amp; Run</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Custom Stdin Input */}
          {activeTab === 'stdin' && (
            <div className="flex-1 p-4 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Program Standard Input (stdin)</span>
                </label>
                {stdin && (
                  <button
                    type="button"
                    onClick={() => setStdin('')}
                    className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Provide space or newline separated inputs read by <code className="text-cyan-400">scanf()</code> or <code className="text-cyan-400">getchar()</code> during execution.
              </p>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Example:&#10;10 20&#10;Alice&#10;3.14"
                rows={8}
                className="flex-1 w-full p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono text-xs placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500 transition shadow-inner resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineCompilerCard;
