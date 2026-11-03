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
  ArrowLeft,
  Loader2,
  Keyboard,
  AlertCircle,
  CheckCircle2,
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
    <div className="h-screen w-screen flex flex-col bg-[#0c1017] text-slate-100 overflow-hidden select-none font-mono">
      {/* Top Standalone Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-[#090d16] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-3">
        {/* Left: Exit/Back + Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCloseWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition cursor-pointer"
            title="Return to Dashboard or close tab"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Linux Terminal Dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>

          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span
              className="text-sm font-bold font-mono tracking-tight !text-white"
              style={{ color: '#ffffff' }}
            >
              student@logicq-sandbox: ~/workspace/main.c
            </span>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
              GCC 14.2.0 (C11)
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition cursor-pointer"
            title="Copy code to clipboard"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-amber-400 transition cursor-pointer"
            title="Reset code to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* Main Dual Pane Layout: Editor (Left) & Stiff Terminal Console (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
        {/* LEFT: Monaco Code Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#0c1017] h-full overflow-hidden">
          {/* Subheader */}
          <div className="px-4 py-2 bg-[#090d16] border-b border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
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
              <span>Auto-saved</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full min-h-0 relative bg-[#0c1017]">
            <CodeEditor
              code={code}
              onChange={setCode}
              onRun={handleRunCode}
              isRunning={isRunning}
              hideHeader={true}
              disableCopyPaste={false}
              forceTheme="dark"
            />
          </div>
        </div>

        {/* RIGHT: Input / Output Stiff Black Terminal Console Pane (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-[#05080f] h-full overflow-hidden">
          {/* Console Header Tabs */}
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#090d16] shrink-0">
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
                  className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                  title="Copy terminal output"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
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
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition cursor-pointer px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Console Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs select-text bg-[#05080f]">
            {activeTab === 'output' ? (
              <div className="space-y-3">
                {/* Terminal Command Prompt Line */}
                {(output || errorOutput) && (
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
                          Status: {executionStats.verdict === 'SUCCESS' ? 'PASSED' : executionStats.verdict}
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
                        {executionStats.memoryKb !== undefined && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-emerald-400" />
                              <span>{executionStats.memoryKb} KB</span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Compilation Error Diagnostics */}
                {errorOutput && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Compiler Diagnostics / Errors:</span>
                    </div>
                    <pre className="p-3 rounded-lg bg-rose-950/25 border border-rose-500/30 text-rose-300 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-x-auto">
                      {errorOutput}
                    </pre>
                    <GccFriendlyHintCard compileOutput={errorOutput} />
                  </div>
                )}

                {/* Standard Output */}
                {output && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Standard Output (stdout):</span>
                      </span>
                      <span className="text-slate-500 text-[10px]">tty buffer</span>
                    </div>
                    <pre className="p-3.5 rounded-lg bg-[#020408] border border-slate-800 text-emerald-400 whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                      {output}
                    </pre>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      [Process completed with exit code {executionStats?.exitCode ?? 0} in {executionStats?.runtimeMs ?? 0}ms]
                    </div>
                  </div>
                )}

                {/* Idle / Blank Terminal Placeholder */}
                {!output && !errorOutput && (
                  <div className="h-64 flex flex-col justify-start p-4 text-slate-400 space-y-3 select-text">
                    <div className="text-slate-400 text-[11px] leading-relaxed border-b border-slate-800 pb-3">
                      <p className="text-slate-200 font-bold">Linux x86_64 Sandbox — GNU C11 Compiler (GCC 14.2.0)</p>
                      <p className="text-slate-400">Target: x86_64-linux-gnu | Standard: -std=c11 | Optimization: -O2</p>
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
            ) : (
              /* Custom Stdin Tab */
              <div className="h-full flex flex-col space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Enter standard input (passed directly to <code>scanf</code> / <code>getchar</code>):</span>
                  <span>{stdin.length} chars</span>
                </div>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="e.g.&#10;10 20&#10;Hello C"
                  className="flex-1 w-full p-3.5 rounded-lg bg-[#020408] border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 transition resize-none placeholder:text-slate-600"
                  spellCheck={false}
                />
                <p className="text-[11px] text-slate-500 italic">
                  💡 Tip: If your program uses <code>scanf("%d", &amp;x)</code>, supply inputs here before clicking Compile &amp; Run.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar: Compile & Run moved to bottom! */}
      <footer className="px-5 py-3 bg-[#090d16] border-t border-slate-800 flex items-center justify-end shrink-0 font-mono">
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
      </footer>
    </div>
  );
};

export default CompilerPage;
