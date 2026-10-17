import React, { useEffect, useState, useRef } from 'react';
import { renderMermaid, MermaidRenderResult } from './mermaid';
import {
  AlertTriangle,
  Copy,
  Check,
  Code,
  Eye,
  Loader2,
  Workflow,
} from 'lucide-react';

interface MermaidBlockViewProps {
  code: string;
}

export const MermaidBlockView: React.FC<MermaidBlockViewProps> = ({ code }) => {
  const [result, setResult] = useState<MermaidRenderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return (
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Detect theme changes (e.g. user toggles dark mode)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const observer = new MutationObserver(() => {
      const dark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(dark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Render diagram whenever code or theme changes
  useEffect(() => {
    let active = true;
    setLoading(true);

    renderMermaid(code, isDark).then((res) => {
      if (active) {
        setResult(res);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [code, isDark]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 overflow-hidden shadow-2xs">
      {/* Header bar */}
      <div className="px-3.5 py-2 bg-stone-100/90 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-2 font-medium">
          <Workflow className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold tracking-wide text-[11px] uppercase">Mermaid Diagram</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
            title={showSource ? 'View Diagram' : 'View Source'}
          >
            {showSource ? (
              <>
                <Eye className="w-3 h-3" />
                <span>View Diagram</span>
              </>
            ) : (
              <>
                <Code className="w-3 h-3" />
                <span>Source</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {showSource ? (
          <div className="rounded-lg bg-stone-900 text-stone-100 p-3 font-mono text-xs overflow-x-auto">
            <pre>
              <code>{code}</code>
            </pre>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>Rendering diagram...</span>
          </div>
        ) : result?.isError ? (
          <div className="rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 p-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-sans font-semibold mb-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Mermaid Diagram Syntax Error</span>
            </div>
            <p className="text-red-600 dark:text-red-300 font-sans text-[11px] mb-2 leading-relaxed">
              {result.errorMessage}
            </p>
            <div className="mt-2 text-stone-700 dark:text-stone-300">
              <div className="text-[11px] font-sans font-semibold text-stone-500 dark:text-stone-400 mb-1">
                Diagram Source:
              </div>
              <pre className="p-2.5 rounded bg-red-100/60 dark:bg-red-950/80 text-stone-900 dark:text-stone-100 overflow-x-auto text-[11px]">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="mermaid-svg-container flex justify-center items-center overflow-x-auto py-2 [&>svg]:max-w-full [&>svg]:h-auto select-none"
            dangerouslySetInnerHTML={{ __html: result?.svg || '' }}
          />
        )}
      </div>
    </div>
  );
};
