import React, { useState } from 'react';
import { Sparkles, Link2, ArrowUpRight, ChevronDown, ChevronUp, X, Check, Copy } from 'lucide-react';
import { InferredRelation } from './semanticTypes';
import { Note } from '../types';

interface RelatedNotesSectionProps {
  relatedRelations: InferredRelation[];
  allNotes: Note[];
  onInsertLink: (targetTitle: string) => void;
  onOpenTargetNote: (targetId: string, options?: any) => void;
}

export const RelatedNotesSection: React.FC<RelatedNotesSectionProps> = ({
  relatedRelations,
  allNotes,
  onInsertLink,
  onOpenTargetNote,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedTargetIds, setDismissedTargetIds] = useState<Set<string>>(new Set());
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);

  const activeRelations = (relatedRelations || []).filter(
    (rel) => !dismissedTargetIds.has(rel.targetId)
  );

  if (activeRelations.length === 0) {
    return null;
  }

  const noteMap = new Map<string, Note>(allNotes.map((n) => [n.id, n]));

  const handleDismiss = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedTargetIds((prev) => {
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });
  };

  const handleCopyLink = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`[[${title}]]`);
    setCopiedTitle(title);
    setTimeout(() => setCopiedTitle(null), 2000);
  };

  return (
    <div className="mt-3 rounded-xl border border-purple-300/70 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 overflow-hidden text-xs transition-all shadow-2xs">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-purple-100/60 dark:bg-purple-900/40 flex items-center justify-between border-b border-purple-200/60 dark:border-purple-900/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-bold text-stone-900 dark:text-stone-100 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1.5 cursor-pointer text-left"
          >
            <span>Related Notes (Inferred)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-200/80 dark:bg-purple-800 text-[10px] text-purple-900 dark:text-purple-100 font-mono">
              {activeRelations.length} {activeRelations.length === 1 ? 'match' : 'matches'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Body List */}
      {isExpanded && (
        <div className="p-2 space-y-1.5 divide-y divide-purple-200/40 dark:divide-purple-900/40">
          {activeRelations.map((rel) => {
            const target = noteMap.get(rel.targetId);
            if (!target) return null;

            const scorePercent = Math.round(rel.score * 100);
            const targetTitle = target.title || 'Untitled Note';

            return (
              <div
                key={`${rel.sourceId}-${rel.targetId}`}
                className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-purple-100/40 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenTargetNote(target.id)}
                      className="font-semibold text-stone-900 dark:text-stone-100 hover:text-purple-600 dark:hover:text-purple-400 truncate text-left flex items-center gap-1 cursor-pointer"
                    >
                      <span>{targetTitle}</span>
                      <ArrowUpRight className="w-3 h-3 text-stone-400 shrink-0" />
                    </button>
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-200/70 dark:bg-purple-800/80 text-purple-900 dark:text-purple-200 text-[10px] font-mono shrink-0">
                      {scorePercent}% match
                    </span>
                  </div>

                  {rel.sharedTerms && rel.sharedTerms.length > 0 ? (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      Related through: {rel.sharedTerms.slice(0, 4).map((t) => `#${t}`).join(' ')}
                    </div>
                  ) : (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {rel.rationale || 'Conceptually related content'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInsertLink(targetTitle)}
                    className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    title={`Insert [[${targetTitle}]] at cursor`}
                  >
                    <Link2 className="w-3 h-3" />
                    <span>Insert Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(targetTitle, e)}
                    className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-purple-200/50 dark:hover:bg-purple-900/50 transition-colors"
                    title="Copy [[Wikilink]]"
                  >
                    {copiedTitle === targetTitle ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDismiss(target.id, e)}
                    className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-purple-200/50 dark:hover:bg-purple-900/50 transition-colors"
                    title="Dismiss suggestion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
