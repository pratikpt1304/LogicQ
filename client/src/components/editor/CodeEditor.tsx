import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { RotateCcw, Copy, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  onReset?: () => void;
  isSubmitting?: boolean;
  isRunning?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onSubmit,
  onReset,
  isSubmitting,
  isRunning,
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const monacoRef = React.useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    // Configure editor shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onSubmit && !isSubmitting) onSubmit();
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
      if (onRun && !isRunning) onRun();
    });

    // Custom theme definition matching LogicQ Obsidian
    monaco.editor.defineTheme('logicq-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00F2FE', fontStyle: 'bold' },
        { token: 'string', foreground: '10B981' },
        { token: 'number', foreground: 'F59E0B' },
        { token: 'type', foreground: '818CF8' },
      ],
      colors: {
        'editor.background': '#090D16',
        'editor.foreground': '#F8FAFC',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#00F2FE',
        'editor.lineHighlightBackground': '#0E1422',
        'editorCursor.foreground': '#00F2FE',
        'editor.selectionBackground': '#00F2FE33',
      },
    });

    monaco.editor.setTheme(theme === 'dark' ? 'logicq-dark' : 'vs');
  };

  React.useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'logicq-dark' : 'vs');
    }
  }, [theme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-2xl">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-dark-850 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="ml-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            solution.c
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20 font-bold">
              C
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              title="Reset code to starter template"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] rounded-md transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 min-h-[350px]">
        <Editor
          height="100%"
          language="c"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13.5,
            lineHeight: 22,
            fontLigatures: true,
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
};
