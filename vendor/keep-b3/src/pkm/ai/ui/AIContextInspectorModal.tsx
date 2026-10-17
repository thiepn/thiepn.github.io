import React from 'react';
import { AISourceContext, AIMode } from '../types';
import { Shield, Eye, AlertTriangle, X, Trash2, CheckCircle2, Lock } from 'lucide-react';

interface AIContextInspectorModalProps {
  sources: AISourceContext[];
  totalTokens: number;
  mode: AIMode;
  providerName?: string;
  onToggleRedactSource: (markerId: string) => void;
  onClose: () => void;
  onConfirmSend?: () => void;
}

export const AIContextInspectorModal: React.FC<AIContextInspectorModalProps> = ({
  sources,
  totalTokens,
  mode,
  providerName,
  onToggleRedactSource,
  onClose,
  onConfirmSend,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-inspector-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-neutral-800 dark:text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 id="context-inspector-title" className="font-semibold text-base">
                Context & Privacy Inspector
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Inspect exact note passages retrieved before AI processing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode & Privacy Disclosure Banner */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800 text-xs flex items-start gap-3">
          {mode === 'local' ? (
            <>
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Local On-Device Mode:
                </span>{' '}
                These passages will be processed entirely on your device. Zero bytes of note data will leave your browser.
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  External AI Disclosure ({providerName || 'Configured API'}):
                </span>{' '}
                Only the {sources.filter((s) => !s.isRedacted).length} selected passages below (~{totalTokens} tokens) will be sent to the external provider. No other vault content is accessible.
              </div>
            </>
          )}
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sources.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No sources in context.
            </div>
          ) : (
            sources.map((s) => (
              <div
                key={s.markerId}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  s.isRedacted
                    ? 'bg-neutral-100 dark:bg-neutral-950 border-neutral-300 dark:border-neutral-800 opacity-60'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono text-[11px]">
                      [{s.markerNumber}] {s.markerId}
                    </span>
                    <span className="truncate max-w-[280px]">
                      {s.chunk.noteTitle}
                      {s.chunk.headingText ? ` (${s.chunk.headingText})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-neutral-400">
                      ~{s.tokenEstimate} tokens
                    </span>
                    <button
                      onClick={() => onToggleRedactSource(s.markerId)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        s.isRedacted
                          ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                      }`}
                    >
                      {s.isRedacted ? 'Include' : 'Exclude'}
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {s.isRedacted ? '[EXCLUDED FROM PROMPT]' : s.chunk.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
          <div className="text-xs text-neutral-500">
            Total active context: <strong className="text-neutral-800 dark:text-neutral-200">~{totalTokens} tokens</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Close
            </button>
            {onConfirmSend && (
              <button
                onClick={() => {
                  onConfirmSend();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
              >
                Send Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
