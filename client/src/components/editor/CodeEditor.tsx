import React from 'react';
import { monaco } from '../../utils/monacoSetup.js';
import { RotateCcw, Copy, Check, Upload, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext.js';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  onReset?: () => void;
  isSubmitting?: boolean;
  isRunning?: boolean;
  readOnly?: boolean;
  disableCopyPaste?: boolean;
  onBlockedAction?: (action: 'copy' | 'paste' | 'cut' | 'contextmenu') => void;
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

function sanitizeSourceCode(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    .trimEnd() + '\n';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  onSubmit,
  onReset,
  isSubmitting,
  isRunning,
  readOnly = false,
  disableCopyPaste = true,
  onBlockedAction,
}) => {
  const disableCopyPasteRef = React.useRef(disableCopyPaste);
  const onBlockedActionRef = React.useRef(onBlockedAction);
  disableCopyPasteRef.current = disableCopyPaste;
  onBlockedActionRef.current = onBlockedAction;
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<any>(null);
  const onChangeRef = React.useRef(onChange);
  const onRunRef = React.useRef(onRun);
  const onSubmitRef = React.useRef(onSubmit);
  const isSubmittingRef = React.useRef(isSubmitting);
  const isRunningRef = React.useRef(isRunning);
  const readOnlyRef = React.useRef(readOnly);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSubmitRef.current = onSubmit;
  isSubmittingRef.current = isSubmitting;
  isRunningRef.current = isRunning;
  readOnlyRef.current = readOnly;

  const monacoThemeName = theme === 'dark' ? 'logicq-dark' : 'logicq-light';

  const [fontSize, setFontSize] = React.useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('logicq_editor_fontsize'));
      return saved >= 11 && saved <= 24 ? saved : 14;
    } catch {
      return 14;
    }
  });

  const handleAdjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(11, Math.min(24, prev + delta));
      try {
        localStorage.setItem('logicq_editor_fontsize', String(next));
      } catch {}
      if (editorRef.current) {
        editorRef.current.updateOptions({ fontSize: next, lineHeight: Math.round(next * 1.55) });
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (!containerRef.current) return;

    registerLogicQMonacoThemes(monaco);
    const editor = monaco.editor.create(containerRef.current, {
      value: code,
      language: 'c',
      theme: monacoThemeName,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize,
      lineHeight: Math.round(fontSize * 1.55),
      fontLigatures: false,
      renderWhitespace: 'none',
      tabSize: 4,
      insertSpaces: true,
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: typeof window !== 'undefined' && window.innerWidth < 768 ? 'on' : 'off',
      wrappingStrategy: 'advanced',
      lineNumbersMinChars: typeof window !== 'undefined' && window.innerWidth < 375 ? 2 : 3,
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      readOnly: Boolean(readOnly),
      contextmenu: !disableCopyPaste,
    });

    editor.onKeyDown((e: any) => {
      if (disableCopyPasteRef.current) {
        // Ctrl+V or Cmd+V (Paste)
        if ((e.ctrlKey || e.metaKey) && (e.keyCode === 52 || e.code === 'KeyV' || e.browserEvent?.key === 'v' || e.browserEvent?.key === 'V')) {
          e.preventDefault();
          e.stopPropagation();
          toast.error('🚫 Copy-paste is disabled! Type your code manually.');
          onBlockedActionRef.current?.('paste');
          return;
        }
        // Ctrl+C or Cmd+C (Copy)
        if ((e.ctrlKey || e.metaKey) && (e.keyCode === 33 || e.code === 'KeyC' || e.browserEvent?.key === 'c' || e.browserEvent?.key === 'C')) {
          e.preventDefault();
          e.stopPropagation();
          toast.error('🚫 Copying code is disabled.');
          onBlockedActionRef.current?.('copy');
          return;
        }
        // Ctrl+X or Cmd+X (Cut)
        if ((e.ctrlKey || e.metaKey) && (e.keyCode === 54 || e.code === 'KeyX' || e.browserEvent?.key === 'x' || e.browserEvent?.key === 'X')) {
          e.preventDefault();
          e.stopPropagation();
          onBlockedActionRef.current?.('cut');
          return;
        }
      }
    });

    editorRef.current = editor;
    editor.setScrollTop(0);
    editor.revealLine(1);
    editor.setSelection(new monaco.Selection(1, 1, 1, 1));
    editor.setPosition({ lineNumber: 1, column: 1 });

    // Native Mobile & Desktop Clipboard Capture Listeners on Monaco Internal DOM
    const domNode = editor.getDomNode();
    const cleanups: (() => void)[] = [];

    if (domNode) {
      const blockClipboardAction = (e: Event, action: 'paste' | 'copy' | 'cut') => {
        if (!disableCopyPasteRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const actionLabels = {
          paste: '🚫 Paste is disabled! Type code manually.',
          copy: '🚫 Copying code is disabled.',
          cut: '🚫 Cut action is disabled.',
        };
        toast.error(actionLabels[action]);
        onBlockedActionRef.current?.(action);
      };

      const onPasteCapture = (e: ClipboardEvent) => blockClipboardAction(e, 'paste');
      const onCopyCapture = (e: ClipboardEvent) => blockClipboardAction(e, 'copy');
      const onCutCapture = (e: ClipboardEvent) => blockClipboardAction(e, 'cut');

      const onBeforeInputCapture = (e: any) => {
        if (!disableCopyPasteRef.current) return;
        if (
          e.inputType === 'insertFromPaste' ||
          e.inputType === 'insertFromPasteAsQuotation' ||
          e.inputType === 'insertFromDrop' ||
          e.inputType === 'insertReplacementText'
        ) {
          blockClipboardAction(e, 'paste');
        }
      };

      domNode.addEventListener('paste', onPasteCapture as any, true);
      domNode.addEventListener('copy', onCopyCapture as any, true);
      domNode.addEventListener('cut', onCutCapture as any, true);
      domNode.addEventListener('beforeinput', onBeforeInputCapture as any, true);

      cleanups.push(() => {
        domNode.removeEventListener('paste', onPasteCapture as any, true);
        domNode.removeEventListener('copy', onCopyCapture as any, true);
        domNode.removeEventListener('cut', onCutCapture as any, true);
        domNode.removeEventListener('beforeinput', onBeforeInputCapture as any, true);
      });
    }

    let isInternalEdit = false;

    const sub = editor.onDidChangeModelContent((e: any) => {
      if (readOnlyRef.current) return;
      if (isInternalEdit) return;

      // Burst Paste Protection for Mobile (Catches clipboard injections that bypass synthetic events)
      if (disableCopyPasteRef.current && e.changes) {
        for (const change of e.changes) {
          if (change.text && change.text.length > 8 && !change.text.startsWith('\n    ')) {
            isInternalEdit = true;
            try {
              editor.trigger('anti-paste', 'undo', null);
            } catch {}
            isInternalEdit = false;
            toast.error('🚫 Paste detected! Pasting code is strictly disabled.');
            onBlockedActionRef.current?.('paste');
            return;
          }
        }
      }

      const val = editor.getValue();
      onChangeRef.current(val);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (!readOnlyRef.current && onSubmitRef.current && !isSubmittingRef.current) {
        onSubmitRef.current();
      }
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
      if (!readOnlyRef.current && onRunRef.current && !isRunningRef.current) {
        onRunRef.current();
      }
    });

    return () => {
      cleanups.forEach((fn) => fn());
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: Boolean(readOnly) });
    }
  }, [readOnly]);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code);
      editorRef.current.setSelection(new monaco.Selection(1, 1, 1, 1));
      editorRef.current.setPosition({ lineNumber: 1, column: 1 });
    }
  }, [code]);

  React.useEffect(() => {
    registerLogicQMonacoThemes(monaco);
    monaco.editor.setTheme(monacoThemeName);
  }, [monacoThemeName]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (readOnly) {
      toast.error('Editor is currently read-only.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds the 2 MB limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const cleaned = sanitizeSourceCode(content);
        onChange(cleaned);
        toast.success(`Loaded "${file.name}" into editor (${file.size} bytes)`);
      }
    };
    reader.onerror = () => {
      toast.error(`Failed to read "${file.name}"`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.(c|cpp|h|txt)$/i.test(file.name) && file.type && !file.type.includes('text')) {
      toast.error('Only C source files (.c, .h, .cpp, .txt) can be loaded into the editor.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds the 2 MB limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const cleaned = sanitizeSourceCode(content);
        onChange(cleaned);
        toast.success(`Loaded "${file.name}" into editor (${file.size} bytes)`);
      }
    };
    reader.onerror = () => {
      toast.error(`Failed to read "${file.name}"`);
    };
    reader.readAsText(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSymbol = (insertText: string) => {
    if (readOnly) return;
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
    const cleanCurrent = code ? (code.endsWith('\n') ? code : code + '\n') : '';
    onChange(cleanCurrent + insertText);
  };

  return (
    <div
      data-readonly={readOnly ? 'true' : 'false'}
      className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-line)] overflow-hidden overscroll-contain"
    >
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
            {readOnly && (
              <span
                data-testid="editor-readonly-badge"
                className="text-[11px] text-[var(--color-warning)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--color-warning)] font-semibold"
              >
                Read-only
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && !disableCopyPaste && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".c,.h,.cpp,.txt,text/plain"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="code-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload .c or source code file from your device (or drag & drop into editor)"
                data-testid="upload-code-file-btn"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Upload .c</span>
              </button>
            </>
          )}

          {onReset && !readOnly && (
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

          {!disableCopyPaste && (
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
          )}
        </div>
      </div>

      {/* Editor Main Canvas with Anti-Cheat Clipboard Blocking */}
      <div
        ref={containerRef}
        onDragOver={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            return;
          }
          handleDragOver(e);
        }}
        onDrop={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            e.stopPropagation();
            toast.error('🚫 File drop is disabled during assessment.');
            return;
          }
          handleDrop(e);
        }}
        onPaste={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            e.stopPropagation();
            toast.error('🚫 Paste is disabled! Type code manually.');
            onBlockedAction?.('paste');
          }
        }}
        onCopy={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            e.stopPropagation();
            toast.error('🚫 Copying is disabled.');
            onBlockedAction?.('copy');
          }
        }}
        onCut={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            e.stopPropagation();
            onBlockedAction?.('cut');
          }
        }}
        onContextMenu={(e) => {
          if (disableCopyPaste) {
            e.preventDefault();
            onBlockedAction?.('contextmenu');
          }
        }}
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
            disabled={readOnly}
            onClick={() => handleInsertSymbol(sym.insertText)}
            className="min-w-[38px] min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-mono font-bold text-[var(--text-main)] active:border-[var(--color-accent)] disabled:opacity-50 shrink-0"
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  );
};
