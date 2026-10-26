import React, { useMemo, useState } from 'react';
import { renderKatex } from './math';
import { AlertCircle, Copy, Check, Code } from 'lucide-react';

interface MathViewProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  expression,
  displayMode = false,
  className = '',
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    return renderKatex(expression, displayMode);
  }, [expression, displayMode]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(expression);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // If there's an error in rendering
  if (result.isError) {
    if (displayMode) {
      return (
        <div className={`my-3 p-3 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-300 text-xs font-mono shadow-xs ${className}`}>
          <div className="flex items-center justify-between gap-2 mb-1.5 font-sans font-semibold">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>KaTeX Math Error</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-0.5 rounded text-[11px] font-mono hover:bg-red-200/60 dark:hover:bg-red-900/60 transition-colors flex items-center gap-1"
                title="Copy LaTeX source"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Source'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-red-600 dark:text-red-400 font-sans mb-1.5">
            {result.errorMessage}
          </p>
          <pre className="p-2 rounded-lg bg-red-100/60 dark:bg-red-950/80 overflow-x-auto text-stone-900 dark:text-stone-100 select-text">
            <code>$${expression}$$</code>
          </pre>
        </div>
      );
    }

    // Inline Error
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100/80 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 text-xs font-mono mx-0.5"
        title={`KaTeX Error: ${result.errorMessage || 'Invalid formula'}`}
      >
        <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
        <span>${expression}$</span>
      </span>
    );
  }

  // Display Mode (Block Math)
  if (displayMode) {
    return (
      <div className={`group relative my-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 overflow-x-auto text-stone-950 dark:text-stone-50 transition-all ${className}`}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-200/90 dark:bg-stone-800/90 p-1 rounded-lg shadow-2xs backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
            title={showRaw ? 'Show Rendered Formula' : 'View LaTeX Source'}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
            title="Copy LaTeX Formula"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showRaw ? (
          <pre className="text-xs font-mono p-2 bg-stone-200/60 dark:bg-stone-950/80 rounded-lg overflow-x-auto text-amber-800 dark:text-amber-300">
            <code>$${expression}$$</code>
          </pre>
        ) : (
          <div
            className="flex justify-center items-center py-1 select-text overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        )}
      </div>
    );
  }

  // Inline Math Mode
  return (
    <span
      className={`katex-inline-node inline-block px-1 py-0.2 mx-0.5 align-middle select-text text-stone-950 dark:text-stone-50 ${className}`}
      dangerouslySetInnerHTML={{ __html: result.html }}
    />
  );
};
