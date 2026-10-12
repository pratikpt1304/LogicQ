import React from 'react';
import { monaco } from '../../utils/monacoSetup.js';
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

const MOBILE_C_SYMBOLS: Array<{ label: string; insertText: string }> = [
  { label: 'Tab', insertText: '    ' },
  { label: '{', insertText: '{' },
  { label: '}', insertText: '}' },
  { label: ';', insertText: ';' },
  { label: '*', insertText: '*' },
  { label: '&', insertText: '&' },
  { label: '#', insertText: '#' },
  { label: '<', insertText: '<' },
  { label: '>', insertText: '>' },
];

let themesRegistered = false;

function registerLogicQMonacoThemes(m: any) {
  if (!m || !m.editor || themesRegistered) return;
  themesRegistered = true;

  // Dark Theme matching LogicQ Brand Tokens (#0C0F1F bg, #9AA1C4 line numbers = 7.32:1 contrast)
  m.editor.defineTheme('logicq-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9AA1C4', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8B9BFF', fontStyle: 'bold' },
      { token: 'string', foreground: '46D9A0' },
      { token: 'number', foreground: 'FBBF24' },
      { token: 'type', foreground: 'A5B4FF' },
      { token: 'identifier', foreground: 'E8EAF6' },
    ],
    colors: {
      'editor.background': '#0C0F1F',
      'editor.foreground': '#E8EAF6',
      'editorGutter.background': '#0C0F1F',
      'editorLineNumber.foreground': '#9AA1C4',
      'editorLineNumber.activeForeground': '#E8EAF6',
      'editor.lineHighlightBackground': '#141932',
      'editorCursor.foreground': '#8B9BFF',
      'editor.selectionBackground': '#8B9BFF33',
    },
  });

  // Light Theme matching LogicQ Brand Family (#FFFFFF bg, #434C6E line numbers = 7.84:1 contrast)
  m.editor.defineTheme('logicq-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '434C6E', fontStyle: 'italic' },
      { token: 'keyword', foreground: '3643D0', fontStyle: 'bold' },
      { token: 'string', foreground: '096B48' },
      { token: 'number', foreground: '8C5000' },
      { token: 'type', foreground: '3643D0' },
      { token: 'identifier', foreground: '0C0F1F' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#0C0F1F',
      'editorGutter.background': '#F4F6FB',
      'editorLineNumber.foreground': '#434C6E',
      'editorLineNumber.activeForeground': '#3643D0',
      'editor.lineHighlightBackground': '#EEF1F8',
      'editorCursor.foreground': '#3643D0',
      'editor.selectionBackground': '#3643D026',
    },
  });
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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<any>(null);
  const onChangeRef = React.useRef(onChange);
  const onRunRef = React.useRef(onRun);
  const onSubmitRef = React.useRef(onSubmit);
  const isSubmittingRef = React.useRef(isSubmitting);
  const isRunningRef = React.useRef(isRunning);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSubmitRef.current = onSubmit;
  isSubmittingRef.current = isSubmitting;
  isRunningRef.current = isRunning;

  const monacoThemeName = theme === 'dark' ? 'logicq-dark' : 'logicq-light';

  React.useEffect(() => {
    if (!containerRef.current) return;

    registerLogicQMonacoThemes(monaco);
    const editor = monaco.editor.create(containerRef.current, {
      value: code,
      language: 'c',
      theme: monacoThemeName,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      lineHeight: 22,
      fontLigatures: true,
      tabSize: 4,
      insertSpaces: true,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
    });

    editorRef.current = editor;
    editor.setScrollTop(0);
    editor.revealLine(1);

    const sub = editor.onDidChangeModelContent(() => {
      const val = editor.getValue();
      onChangeRef.current(val);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onSubmitRef.current && !isSubmittingRef.current) onSubmitRef.current();
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
      if (onRunRef.current && !isRunningRef.current) onRunRef.current();
    });

    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  React.useEffect(() => {
    registerLogicQMonacoThemes(monaco);
    monaco.editor.setTheme(monacoThemeName);
  }, [monacoThemeName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSymbol = (insertText: string) => {
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('mobile-symbol-bar', [
          {
            range: selection,
            text: insertText,
            forceMoveMarkers: true,
          },
        ]);
        editor.focus();
        return;
      }
    }
    onChange(code + insertText);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-line)] overflow-hidden overscroll-contain">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-line)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--color-error)] inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-[var(--color-success)] inline-block"></span>
          <span className="ml-2 font-mono text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
            solution.c
            <span className="text-xs text-[var(--color-accent)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-line)] font-bold">
              C
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset code to starter template"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] rounded-md transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div
        ref={containerRef}
        data-testid="monaco-editor-canvas"
        className="flex-1 min-h-[160px] relative overflow-hidden overscroll-contain"
      />

      {/* Mobile C Symbol Helper Bar (Tab, {, }, ;, *, &, #, <, >) */}
      <div
        data-testid="mobile-c-symbol-bar"
        aria-label="C Symbol Helper Bar"
        className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-surface)] border-t border-[var(--border-line)] overflow-x-auto shrink-0"
      >
        {MOBILE_C_SYMBOLS.map((sym) => (
          <button
            key={sym.label}
            type="button"
            onClick={() => handleInsertSymbol(sym.insertText)}
            className="min-w-[38px] min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono font-bold text-[var(--text-main)] active:border-[var(--color-accent)] shrink-0"
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  );
};
