import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { GccFriendlyHintCard } from '../components/common/GccFriendlyHintCard.js';
import { api } from '../api/client.js';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Clock,
  Cpu,
  Trash2,
  FileCode,
  Sparkles,
  ArrowLeft,
  Loader2,
  Keyboard,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_C_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("Welcome to LogicQ GCC 14 (C11) Compiler.\\n");
    return 0;
}
`;

const SCRATCHPAD_STORAGE_KEY = 'logicq_dashboard_scratchpad_code';
const SCRATCHPAD_STDIN_KEY = 'logicq_dashboard_scratchpad_stdin';

export const CompilerPage: React.FC = () => {
  const navigate = useNavigate();

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

  // Global Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run
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
    setOutput(null);
    setErrorOutput(null);
    setExecutionStats(null);
    setActiveTab('output');

    const startTime = performance.now();

    try {
      const res = await api.post('/problems/run', {
        code,
        input: stdin || '',
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (res.compileError || res.error) {
        setErrorOutput(res.compileError || res.error);
        setExecutionStats({
          runtimeMs: elapsed,
          exitCode: 1,
          verdict: 'COMPILE_ERROR',
        });
        toast.error('Compilation failed! Review compiler diagnostics.');
      } else {
        const stdout = res.output ?? res.stdout ?? '';
        setOutput(stdout || '(Process finished with no terminal output)');
        setExecutionStats({
          runtimeMs: res.executionTimeMs || elapsed,
          memoryKb: res.memoryKb || 64,
          exitCode: 0,
          verdict: 'SUCCESS',
        });
        toast.success('Compiled and executed successfully!');
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setErrorOutput(err?.message || 'Execution error in GCC sandbox.');
      setExecutionStats({
        runtimeMs: elapsed,
        exitCode: 1,
        verdict: 'RUNTIME_ERROR',
      });
      toast.error('Compilation or execution error.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = () => {
    if (window.confirm('Reset editor to default starter template? Unsaved changes will be replaced.')) {
      setCode(DEFAULT_C_CODE);
      setOutput(null);
      setErrorOutput(null);
      setExecutionStats(null);
      toast.info('Editor reset to starter template.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Source code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyOutput = async () => {
    const textToCopy = output || errorOutput;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedOutput(true);
      toast.success('Console output copied!');
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

  const handleCloseWindow = () => {
    try {
      window.close();
    } catch {}
    navigate('/dashboard');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden select-none">
      {/* Top Standalone Header Bar */}
      <header className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-panel)] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-3">
        {/* Left: Exit/Back + Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCloseWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title="Return to Dashboard or close tab"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-line)] hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono tracking-tight text-[var(--text-main)]">
                  GCC 14 (C11) Compiler
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online Sandbox
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title="Copy code to clipboard"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-amber-500 transition cursor-pointer"
            title="Reset code to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Primary Compile & Run Button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-md shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
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
      </header>

      {/* Main Dual Pane Layout: Editor (Left) & Console (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-line)] overflow-hidden">
        {/* LEFT: Monaco Code Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[var(--bg-surface)] h-full overflow-hidden">
          {/* Subheader */}
          <div className="px-4 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-line)] flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] text-cyan-400 font-bold border border-cyan-500/20 flex items-center gap-1.5 shadow-xs">
                <FileCode className="w-3.5 h-3.5" />
                <span>main.c</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                Standard C11 • GCC 14.2.0 (-std=c11 -O2)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Auto-saved</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full min-h-0 relative">
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
        <div className="lg:col-span-5 flex flex-col bg-[var(--bg-panel)] h-full overflow-hidden">
          {/* Console Header Tabs */}
          <div className="px-4 py-2 border-b border-[var(--border-line)] flex items-center justify-between gap-2 bg-[var(--bg-surface)]/60 shrink-0">
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
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="Copy terminal output"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="Clear terminal output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activeTab === 'stdin' && stdin && (
              <button
                type="button"
                onClick={() => setStdin('')}
                className="text-[11px] font-mono text-[var(--text-muted)] hover:text-rose-400 transition cursor-pointer px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Console Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs select-text">
            {activeTab === 'output' ? (
              <div className="space-y-3">
                {/* Status Bar */}
                {executionStats && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          executionStats.verdict === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {executionStats.verdict === 'SUCCESS' ? 'Execution Passed' : executionStats.verdict}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Exit code: {executionStats.exitCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                      {executionStats.runtimeMs !== undefined && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{executionStats.runtimeMs} ms</span>
                        </span>
                      )}
                      {executionStats.memoryKb !== undefined && (
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-emerald-400" />
                          <span>{executionStats.memoryKb} KB</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Compilation Error Diagnostics */}
                {errorOutput && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                      Compiler Output / Errors:
                    </div>
                    <pre className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-x-auto">
                      {errorOutput}
                    </pre>
                    <GccFriendlyHintCard compileOutput={errorOutput} />
                  </div>
                )}

                {/* Standard Output */}
                {output && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
                      <span>Standard Output (stdout):</span>
                      <span className="text-[10px] text-emerald-500 font-normal">Terminal buffer active</span>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] text-emerald-400 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                      {output}
                    </pre>
                  </div>
                )}

                {/* Idle / Blank Terminal Placeholder */}
                {!output && !errorOutput && (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
                    <Terminal className="w-10 h-10 mb-3 stroke-[1.5] text-[var(--text-muted)]/40" />
                    <p className="font-bold text-sm text-[var(--text-main)]">Terminal Ready</p>
                    <p className="text-xs mt-1 max-w-xs text-[var(--text-muted)]">
                      Write or edit code in the editor, optionally supply custom stdin, and click <strong>Compile &amp; Run</strong>.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)]">
                      <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Press <strong>Ctrl + Enter</strong> to run anytime</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Custom Stdin Tab */
              <div className="h-full flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Enter standard input (passed directly to <code>scanf</code> / <code>getchar</code>):</span>
                  <span>{stdin.length} chars</span>
                </div>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="e.g.&#10;10 20&#10;Hello C"
                  className="flex-1 w-full p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] text-[var(--text-main)] font-mono text-xs focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none placeholder:text-[var(--text-muted)]/50"
                  spellCheck={false}
                />
                <p className="text-[11px] text-[var(--text-muted)] italic">
                  💡 Tip: If your program uses <code>scanf("%d", &amp;x)</code>, provide the inputs here separated by spaces or newlines before clicking Compile &amp; Run.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
