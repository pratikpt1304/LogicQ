import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { sanitizeMathInStatement } from '../../utils/sanitizeMathInStatement.js';

interface StatementMarkdownProps {
  content: string;
  className?: string;
  allowCopy?: boolean;
}

export const StatementMarkdown: React.FC<StatementMarkdownProps> = ({
  content,
  className = '',
  allowCopy = false,
}) => {
  const sanitized = React.useMemo(() => sanitizeMathInStatement(content), [content]);

  const handleCopy = (e: React.ClipboardEvent) => {
    if (!allowCopy) {
      e.preventDefault();
      toast.warning('⚠️ Copying question text is restricted for academic integrity.');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!allowCopy) {
      e.preventDefault();
    }
  };

  return (
    <div
      onCopy={handleCopy}
      onCut={handleCopy}
      onContextMenu={handleContextMenu}
      style={allowCopy ? undefined : { userSelect: 'none', WebkitUserSelect: 'none' }}
      className={`select-none prose prose-invert max-w-none text-sm text-[var(--text-muted)] leading-relaxed ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            return (
              <code
                className={`font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[var(--accent)] border border-[var(--border-line)] ${className || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            return (
              <pre
                className="p-3 my-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] overflow-x-auto font-mono text-xs text-[var(--text-main)]"
                {...props}
              >
                {children}
              </pre>
            );
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-3 border border-[var(--border-line)] rounded-xl">
                <table className="w-full text-xs font-mono text-left" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="p-2.5 bg-[var(--bg-surface)] text-[var(--text-main)] border-b border-[var(--border-line)] font-bold" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="p-2.5 border-b border-[var(--border-line)] text-[var(--text-muted)]" {...props}>
                {children}
              </td>
            );
          },
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
};
