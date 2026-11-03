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
  AlertCircle,
  CheckCircle2,
  Loader2,
  Keyboard,
  X,
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const handleOpenCompiler = () => {
      setIsExpanded(true);
      setTimeout(() => {
        document.getElementById('dashboard-online-compiler-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };
    window.addEventListener('logicq:open-compiler', handleOpenCompiler);
    return () => window.removeEventListener('logicq:open-compiler', handleOpenCompiler);
  }, []);
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

  if (!isExpanded) {
    return (
      <div
        id="dashboard-online-compiler-section"
        className="rounded-2xl border border-slate-800 bg-[#0c1017] text-slate-200 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all hover:border-slate-700 font-mono"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 mr-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                GCC 14 (C11) Online Terminal
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Linux Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              gcc -std=c11 -O2 • Compile, debug, and execute C11 programs in isolated sandbox terminal.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex items-center">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Open Online Compiler →</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="dashboard-online-compiler-section"
      className={`rounded-2xl border border-slate-800 bg-[#0c1017] text-slate-100 shadow-2xl overflow-hidden transition-all duration-300 font-mono ${
        isFullscreen ? 'fixed inset-4 z-[9999] flex flex-col bg-[#0c1017] shadow-2xl' : 'w-full'
      }`}
    >
      {/* Top Terminal Window Titlebar */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-[#090d16] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* macOS / Linux Terminal Window Dots */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setIsFullscreen(false);
              }}
              className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-125 border border-[#e0443e] cursor-pointer"
              title="Close terminal"
            />
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-125 border border-[#dea123] cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            />
            <button
              type="button"
              onClick={handleResetCode}
              className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-125 border border-[#1aab29] cursor-pointer"
              title="Reset code template"
            />
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono tracking-tight">
              student@logicq-sandbox: ~/workspace/main.c
            </span>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
              GCC 14.2.0 (C11)
            </span>
          </div>
        </div>

        {/* Header Right Utility Actions (No New Window, No Compile Button here) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition cursor-pointer"
            title="Copy source code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-amber-400 transition cursor-pointer"
            title="Reset code to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workspace'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setIsFullscreen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-mono font-bold text-rose-400 transition cursor-pointer"
            title="Close compiler"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Editor (Left) & Stiff Black Terminal Console (Right) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
        
        {/* LEFT / MAIN: Monaco Code Editor (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col bg-[#0c1017] ${isFullscreen ? 'h-full overflow-hidden' : 'min-h-[440px]'}`}>
          {/* Editor Sub-header */}
          <div className="px-4 py-2 bg-[#090d16] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700 flex items-center gap-1.5 text-[11px]">
                <FileCode className="w-3.5 h-3.5" />
                <span>main.c</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                -std=c11 -O2 -Wall
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">Auto-saved locally</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full min-h-[380px] lg:min-h-[440px] relative bg-[#0c1017]">
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

        {/* RIGHT: Black & Stiff Terminal Console Pane (5 cols) */}
        <div className={`lg:col-span-5 flex flex-col bg-[#05080f] ${isFullscreen ? 'h-full overflow-hidden' : 'min-h-[440px]'}`}>
          {/* Console Header Tabs */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#090d16]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'stdin'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
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
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                  title="Copy terminal output"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Clear terminal output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Execution Output */}
          {activeTab === 'output' && (
            <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto font-mono text-xs space-y-3 bg-[#05080f] select-text">
              {isRunning ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                    <Terminal className="w-4 h-4 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-1 font-mono">
                    <p className="text-xs font-bold text-slate-200">Executing GCC 14.2.0 C11 Sandbox...</p>
                    <p className="text-[11px] text-emerald-400/80">
                      student@logicq:~$ gcc -std=c11 -O2 -Wall main.c -o solution && ./solution
                    </p>
                  </div>
                </div>
              ) : output || errorOutput ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  {/* Terminal Command Prompt Line */}
                  <div className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-1 shrink-0">
                    <div className="flex items-center gap-1.5 text-slate-300 flex-wrap">
                      <span className="text-emerald-400 font-bold">student@logicq-c11</span>
                      <span className="text-slate-500">:</span>
                      <span className="text-cyan-400">~/workspace</span>
                      <span className="text-slate-500">$</span>
                      <span className="text-slate-100 font-mono">gcc -std=c11 -O2 main.c -o solution &amp;&amp; ./solution</span>
                    </div>

                    {executionStats && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                        <span className={`font-bold ${executionStats.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Status: {executionStats.verdict || (executionStats.exitCode === 0 ? 'COMPLETED' : 'FAILED')}
                        </span>
                        <span>•</span>
                        <span>Exit Code: {executionStats.exitCode}</span>
                        {executionStats.runtimeMs !== undefined && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>{executionStats.runtimeMs}ms</span>
                            </span>
                          </>
                        )}
                        {executionStats.memoryKb !== undefined && executionStats.memoryKb > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-indigo-400" />
                              <span>{(executionStats.memoryKb / 1024).toFixed(1)} MB</span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compiler Diagnostic Errors */}
                  {errorOutput && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>GCC Diagnostics / Stderr</span>
                      </div>
                      <pre className="p-3 rounded-lg bg-rose-950/25 border border-rose-500/30 text-rose-300 overflow-x-auto text-xs whitespace-pre-wrap leading-relaxed">
                        {errorOutput}
                      </pre>
                    </div>
                  )}

                  {/* Program Standard Output */}
                  {output && (
                    <div className="space-y-1 flex-1 flex flex-col">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Standard Output (stdout)</span>
                        </span>
                        <span className="text-slate-500 font-normal">tty buffer</span>
                      </div>
                      <pre className="flex-1 p-3.5 rounded-lg bg-[#020408] border border-slate-800 text-emerald-400 overflow-x-auto text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                        {output}
                      </pre>
                    </div>
                  )}

                  {/* Process Exit Footer */}
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    [Process completed with exit code {executionStats?.exitCode ?? 0} ({executionStats?.runtimeMs ?? 0}ms)]
                  </div>
                </div>
              ) : (
                /* Authentic Stiff Linux Terminal Ready State */
                <div className="flex-1 p-4 font-mono text-xs text-slate-400 space-y-3 bg-[#05080f] select-text">
                  <div className="text-slate-400 text-[11px] leading-relaxed border-b border-slate-800 pb-3">
                    <p className="text-slate-200 font-bold">Linux x86_64 Sandbox — GNU C11 Compiler (GCC 14.2.0)</p>
                    <p className="text-slate-400">Target: x86_64-linux-gnu | Standard: ISO/IEC 9899:2011 (C11) | Optimization: -O2</p>
                    <p className="text-slate-500 mt-1">Ready for input. Write code on the left and click "Compile &amp; Run" below.</p>
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-emerald-400 font-bold">student@logicq-c11</span>
                      <span className="text-slate-500">:</span>
                      <span className="text-cyan-400">~/workspace</span>
                      <span className="text-slate-500">$</span>
                      <span className="inline-block w-2.5 h-4 bg-emerald-400 animate-pulse ml-1 align-middle" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Custom Stdin Input */}
          {activeTab === 'stdin' && (
            <div className="flex-1 p-4 flex flex-col space-y-2 bg-[#05080f]">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Program Standard Input (stdin)</span>
                </label>
                {stdin && (
                  <button
                    type="button"
                    onClick={() => setStdin('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Provide space or newline separated inputs read by <code className="text-cyan-400">scanf()</code> or <code className="text-cyan-400">getchar()</code> during execution.
              </p>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Example:&#10;10 20&#10;Alice&#10;3.14"
                rows={8}
                className="flex-1 w-full p-3.5 rounded-lg border border-slate-800 bg-[#020408] text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition shadow-inner resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar: Compile & Run moved to bottom! */}
      <div className="px-5 py-3.5 bg-[#090d16] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200 font-bold">GCC 14.2.0 (C11)</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-400">Linux Sandbox</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-500">64MB Limit</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-500">Timeout 2.0s</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shortcut:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">Ctrl + Enter</kbd>
          </span>

          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Compiling &amp; Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Compile &amp; Run</span>
                <span className="text-[10px] opacity-75 font-normal ml-0.5">(Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineCompilerCard;
