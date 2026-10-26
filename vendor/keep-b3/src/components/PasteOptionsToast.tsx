import React, { useEffect } from 'react';
import { Sparkles, FileText, Code2, RotateCcw, X, ExternalLink } from 'lucide-react';
import { PasteMode } from '../pkm/webCapture';

interface PasteOptionsToastProps {
  currentMode: PasteMode;
  sourceUrl?: string;
  wordCount?: number;
  hasTables?: boolean;
  onSelectMode: (mode: PasteMode) => void;
  onUndo: () => void;
  onClose: () => void;
}

export const PasteOptionsToast: React.FC<PasteOptionsToastProps> = ({
  currentMode,
  sourceUrl,
  wordCount,
  hasTables,
  onSelectMode,
  onUndo,
  onClose,
}) => {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      id="pkm-paste-options-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="bg-stone-900/95 dark:bg-stone-800/95 backdrop-blur-md text-stone-100 border border-stone-700/80 shadow-2xl rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs max-w-md">
        <div className="flex items-center gap-2 pr-1">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-[11px] text-stone-200">
              Web Content Ingested
            </div>
            <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
              <span>{wordCount ? `${wordCount} words` : 'Clean Markdown'}</span>
              {hasTables && <span>• Table preserved</span>}
              {sourceUrl && (
                <span className="truncate max-w-[120px]" title={sourceUrl}>
                  • Source linked
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-stone-950/60 p-0.5 rounded-lg border border-stone-800 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => onSelectMode('smart')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              currentMode === 'smart'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Convert HTML to clean structured Markdown"
          >
            <Sparkles className="w-3 h-3" />
            <span>Smart MD</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('plain')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              currentMode === 'plain'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Paste as raw plain text without HTML formatting"
          >
            <FileText className="w-3 h-3" />
            <span>Plain</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('raw')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              currentMode === 'raw'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Paste raw sanitized HTML"
          >
            <Code2 className="w-3 h-3" />
            <span>Raw HTML</span>
          </button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={onUndo}
            className="p-1 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-md transition-colors"
            title="Undo Paste"
            aria-label="Undo Paste"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
