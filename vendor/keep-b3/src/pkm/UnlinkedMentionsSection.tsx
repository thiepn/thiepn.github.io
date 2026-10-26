import React, { useState } from 'react';
import { Sparkles, Link2, Check, X, Eye, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { UnlinkedMentionCandidate, UnlinkedOccurrence } from '../pkm';

interface UnlinkedMentionsSectionProps {
  candidates: UnlinkedMentionCandidate[];
  onLinkOccurrence: (candidate: UnlinkedMentionCandidate, occurrence: UnlinkedOccurrence) => void;
  onLinkAllInCandidate: (candidate: UnlinkedMentionCandidate) => void;
  onLinkAllSafe: () => void;
  onDismissTerm?: (term: string) => void;
  onOpenTargetNote?: (noteId: string) => void;
}

export const UnlinkedMentionsSection: React.FC<UnlinkedMentionsSectionProps> = ({
  candidates,
  onLinkOccurrence,
  onLinkAllInCandidate,
  onLinkAllSafe,
  onDismissTerm,
  onOpenTargetNote,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCandidateKey, setExpandedCandidateKey] = useState<string | null>(null);

  if (!candidates || candidates.length === 0) {
    return null;
  }

  const totalOccurrences = candidates.reduce((sum, c) => sum + c.occurrences.length, 0);

  return (
    <div className="mt-4 rounded-xl border border-amber-300/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden text-xs transition-all shadow-2xs">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1.5 cursor-pointer text-left"
          >
            <span>Unlinked Mentions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 dark:bg-amber-800 text-[10px] text-amber-900 dark:text-amber-100 font-mono">
              {candidates.length} {candidates.length === 1 ? 'target' : 'targets'} ({totalOccurrences}{' '}
              {totalOccurrences === 1 ? 'mention' : 'mentions'})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {totalOccurrences > 1 && (
            <button
              type="button"
              onClick={onLinkAllSafe}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 active:scale-95"
              title="Convert all discovered plaintext mentions in this note to [[WikiLinks]]"
            >
              <Link2 className="w-3 h-3" />
              <span>Link All ({totalOccurrences})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
            title={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body Items */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {candidates.map((cand) => {
            const groupKey = `${cand.targetNoteId}:::${cand.matchType}:::${cand.matchedTerm}`;
            const isOccurrencesExpanded = expandedCandidateKey === groupKey || cand.occurrences.length <= 2;

            return (
              <div
                key={groupKey}
                className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2"
              >
                {/* Candidate header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {onOpenTargetNote ? (
                      <button
                        type="button"
                        onClick={() => onOpenTargetNote(cand.targetNoteId)}
                        className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 text-left group"
                        title="View target note"
                      >
                        <span className="underline decoration-dotted group-hover:decoration-solid">
                          {cand.targetTitle}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-stone-400 group-hover:text-amber-500 shrink-0" />
                      </button>
                    ) : (
                      <span className="font-bold text-stone-900 dark:text-stone-100">{cand.targetTitle}</span>
                    )}

                    {cand.matchType === 'alias' && (
                      <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                        alias: "{cand.matchedTerm}"
                      </span>
                    )}

                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                      • {cand.occurrences.length} {cand.occurrences.length === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLinkAllInCandidate(cand)}
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold text-[11px] border border-amber-300/60 dark:border-amber-800/60 transition-colors flex items-center gap-1"
                      title={`Convert all mentions of "${cand.matchedTerm}" to [[${cand.targetTitle}]]`}
                    >
                      <Link2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Link ({cand.occurrences.length})</span>
                    </button>

                    {onDismissTerm && (
                      <button
                        type="button"
                        onClick={() => onDismissTerm(cand.matchedTerm)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="Dismiss / ignore suggestions for this term in this session"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Occurrence snippets */}
                <div className="space-y-1.5 pl-2 border-l-2 border-amber-200 dark:border-amber-800/60">
                  {cand.occurrences.slice(0, isOccurrencesExpanded ? cand.occurrences.length : 1).map((occ, idx) => {
                    const before = occ.contextSnippet.slice(0, occ.snippetMatchStart);
                    const matchText = occ.contextSnippet.slice(occ.snippetMatchStart, occ.snippetMatchEnd);
                    const after = occ.contextSnippet.slice(occ.snippetMatchEnd);

                    return (
                      <div
                        key={`${occ.startOffset}-${idx}`}
                        className="flex items-center justify-between gap-2 p-1 rounded hover:bg-stone-50 dark:hover:bg-stone-800/50 text-[11px] group"
                      >
                        <div className="text-stone-600 dark:text-stone-400 leading-relaxed font-mono truncate">
                          <span className="text-stone-400 dark:text-stone-500 mr-1.5 text-[10px]">
                            L{occ.line + 1}:
                          </span>
                          <span>{before}</span>
                          <mark className="bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-bold px-0.5 rounded">
                            {matchText}
                          </mark>
                          <span>{after}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onLinkOccurrence(cand, occ)}
                          className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-white text-stone-700 dark:text-stone-300 text-[10px] font-semibold transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                          title="Convert this specific mention to [[WikiLink]]"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Link</span>
                        </button>
                      </div>
                    );
                  })}

                  {!isOccurrencesExpanded && cand.occurrences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setExpandedCandidateKey(groupKey)}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium pl-1"
                    >
                      Show {cand.occurrences.length - 1} more occurrences...
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
