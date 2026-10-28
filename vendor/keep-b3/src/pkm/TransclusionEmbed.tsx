import React, { useState } from 'react';
import {
  FileText,
  Hash,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Plus,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { ResolvedTransclusion } from './transclusion';
import { Note } from '../types';

interface TransclusionEmbedProps {
  transclusion: ResolvedTransclusion;
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
  renderChildContent: (content: string, depth: number, visitedChain: string[]) => React.ReactNode;
  visitedChain: string[];
}

export const TransclusionEmbed: React.FC<TransclusionEmbedProps> = ({
  transclusion,
  onOpenNote,
  onCreateNote,
  renderChildContent,
  visitedChain,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    status,
    rawTarget,
    embedType,
    targetNoteId,
    targetNoteTitle,
    heading,
    block,
    content,
    error,
    cycleChain,
    candidates,
    depth,
  } = transclusion;

  // Render Missing Note State
  if (status === 'missing_note') {
    return (
      <div className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Missing Note: </span>
            <span className="font-mono bg-amber-200/50 dark:bg-amber-900/40 px-1 py-0.5 rounded text-[11px]">
              ![[{rawTarget}]]
            </span>
          </div>
        </div>

        {onCreateNote && (
          <button
            type="button"
            onClick={() => onCreateNote(rawTarget.split('#')[0].trim())}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3 h-3" />
            <span>Create Note</span>
          </button>
        )}
      </div>
    );
  }

  // Render Missing Heading State
  if (status === 'missing_heading') {
    return (
      <div className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Missing Section: </span>
            <span>{error || `Heading not found in ${targetNoteTitle}`}</span>
          </div>
        </div>

        {targetNoteId && onOpenNote && (
          <button
            type="button"
            onClick={() => onOpenNote(targetNoteId)}
            className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open {targetNoteTitle}</span>
          </button>
        )}
      </div>
    );
  }

  // Render Missing Block State
  if (status === 'missing_block') {
    return (
      <div className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Missing Block Reference: </span>
            <span>{error || `Block not found in ${targetNoteTitle}`}</span>
          </div>
        </div>

        {targetNoteId && onOpenNote && (
          <button
            type="button"
            onClick={() => onOpenNote(targetNoteId)}
            className="px-2.5 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open {targetNoteTitle}</span>
          </button>
        )}
      </div>
    );
  }

  // Render Ambiguous Target State
  if (status === 'ambiguous') {
    return (
      <div className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Ambiguous Transclusion Target: "{rawTarget}"</span>
        </div>
        {candidates && candidates.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pl-6">
            <span className="text-[11px] text-stone-500">Matches:</span>
            {candidates.map((c) => (
              <button
                key={c.noteId}
                type="button"
                onClick={() => onOpenNote?.(c.noteId)}
                className="px-2 py-0.5 bg-white dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 border border-stone-300 dark:border-stone-700 rounded text-[11px] font-medium transition-colors"
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Circular Dependency State (Recursion Guard)
  if (status === 'circular_dependency') {
    return (
      <div className="my-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Circular Embed Cycle Intercepted</span>
        </div>
        <div className="font-mono text-[11px] bg-rose-100/50 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 flex items-center gap-1 overflow-x-auto">
          <CornerDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{cycleChain ? cycleChain.join(' ➔ ') : 'Direct circular reference'}</span>
        </div>
      </div>
    );
  }

  // Render Max Depth Exceeded State
  if (status === 'max_depth_exceeded') {
    return (
      <div className="my-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-400 italic flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-stone-400" />
        <span>Maximum transclusion nesting depth reached for ![[{rawTarget}]].</span>
      </div>
    );
  }

  // Render Resolved Live Transclusion
  const nextVisitedChain = targetNoteId
    ? [...visitedChain, targetNoteId]
    : visitedChain;

  return (
    <div
      className={`my-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 shadow-2xs overflow-hidden transition-all duration-150 ${
        depth > 0 ? 'ml-2 border-l-4 border-l-amber-500' : 'border-l-4 border-l-amber-500'
      }`}
    >
      {/* Transclusion Header Affordance */}
      <div className="px-3.5 py-2 bg-stone-100/70 dark:bg-stone-800/60 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
            {embedType === 'note' ? (
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : embedType === 'section' ? (
              <Hash className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}

            {targetNoteId && onOpenNote ? (
              <button
                type="button"
                onClick={() => onOpenNote(targetNoteId)}
                className="hover:underline hover:text-amber-600 dark:hover:text-amber-400 text-left font-bold truncate max-w-[200px] sm:max-w-xs"
                title={`Open "${targetNoteTitle}" in editor`}
              >
                {targetNoteTitle}
              </button>
            ) : (
              <span className="truncate">{targetNoteTitle}</span>
            )}
          </div>

          {heading && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-mono text-[10px] font-semibold flex items-center gap-0.5">
              <span>#{heading.text}</span>
            </span>
          )}

          {block && (
            <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px]">
              ^{block.id}
            </span>
          )}

          {depth > 0 && (
            <span className="px-1 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 text-[9px] uppercase tracking-wider font-mono">
              lvl {depth}
            </span>
          )}
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {targetNoteId && onOpenNote && (
            <button
              type="button"
              onClick={() => onOpenNote(targetNoteId)}
              className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              title="Open source note for editing"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            title={isCollapsed ? 'Expand embed' : 'Collapse embed'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Transcluded Content Body */}
      {!isCollapsed && (
        <div className="p-3.5 text-stone-900 dark:text-stone-100 text-sm leading-relaxed overflow-x-auto bg-stone-50/40 dark:bg-stone-900/40">
          {content.trim() ? (
            renderChildContent(content, depth + 1, nextVisitedChain)
          ) : (
            <span className="text-stone-400 text-xs italic">Empty content in source.</span>
          )}
        </div>
      )}
    </div>
  );
};
