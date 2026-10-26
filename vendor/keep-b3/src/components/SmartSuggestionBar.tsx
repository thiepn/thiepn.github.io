import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Tag as TagIcon,
  Link2,
  Zap,
  Plus,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { Note, Folder } from '../types';
import {
  automationEngine,
  EditorSmartSuggestionsResult,
  EditorSmartTagSuggestion,
  EditorSmartRelatedNoteSuggestion,
  EditorSmartRuleSuggestion,
  AutomationAction,
} from '../pkm/automation';

interface SmartSuggestionBarProps {
  noteId?: string;
  title: string;
  content: string;
  tags: string[];
  allNotes: Note[];
  folders: Folder[];
  onAddTag: (tag: string) => void;
  onInsertWikilink: (noteTitle: string) => void;
  onOpenNote?: (noteId: string) => void;
  onExecuteRuleAction?: (actions: AutomationAction[], ruleName: string) => void;
  className?: string;
}

export const SmartSuggestionBar: React.FC<SmartSuggestionBarProps> = ({
  noteId,
  title,
  content,
  tags,
  allNotes,
  folders,
  onAddTag,
  onInsertWikilink,
  onOpenNote,
  onExecuteRuleAction,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<EditorSmartSuggestionsResult>({
    tags: [],
    relatedNotes: [],
    ruleSuggestions: [],
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [justAppliedTag, setJustAppliedTag] = useState<string | null>(null);
  const [justAppliedLink, setJustAppliedLink] = useState<string | null>(null);
  const [justAppliedRule, setJustAppliedRule] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced real-time analysis as the user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset dismissed state if significant new content is entered
    if (content.length > 5 || title.length > 2) {
      debounceTimerRef.current = setTimeout(() => {
        const result = automationEngine.getSmartEditorSuggestions({
          noteId,
          title,
          content,
          currentTags: tags,
          allNotes,
          folders,
        });
        setSuggestions(result);
      }, 250);
    } else {
      setSuggestions({ tags: [], relatedNotes: [], ruleSuggestions: [] });
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [noteId, title, content, tags, allNotes, folders]);

  const totalSuggestionsCount =
    suggestions.tags.length +
    suggestions.relatedNotes.length +
    suggestions.ruleSuggestions.length;

  if (isDismissed || totalSuggestionsCount === 0) {
    return null;
  }

  const handleApplyTag = (tag: string) => {
    onAddTag(tag);
    setJustAppliedTag(tag);
    setTimeout(() => setJustAppliedTag(null), 1500);
  };

  const handleApplyLink = (targetTitle: string) => {
    onInsertWikilink(targetTitle);
    setJustAppliedLink(targetTitle);
    setTimeout(() => setJustAppliedLink(null), 1500);
  };

  const handleApplyRule = (rule: EditorSmartRuleSuggestion) => {
    if (onExecuteRuleAction) {
      onExecuteRuleAction(rule.actions, rule.ruleName);
    }
    setJustAppliedRule(rule.id);
    setTimeout(() => setJustAppliedRule(null), 1500);
  };

  return (
    <div
      className={`relative z-20 my-2 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${className}`}
      id="editor-smart-suggestion-bar"
    >
      <div className="p-2.5 rounded-xl border border-amber-500/30 dark:border-amber-500/25 bg-amber-50/70 dark:bg-stone-900/90 backdrop-blur-md shadow-xs text-xs space-y-2">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500 text-stone-950 font-bold shadow-2xs shrink-0">
              <Sparkles className="w-3 h-3 fill-stone-950" />
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 text-xs">
              <span>Smart Suggestions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-mono font-semibold">
                {totalSuggestionsCount}
              </span>
            </span>
            <span className="hidden sm:inline text-[11px] text-stone-500 dark:text-stone-400">
              powered by automation engine
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
              title={isExpanded ? 'Collapse suggestions' : 'Expand suggestions'}
              aria-label={isExpanded ? 'Collapse suggestions' : 'Expand suggestions'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Dismiss suggestions"
              aria-label="Dismiss suggestions"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Suggestions List */}
        {isExpanded && (
          <div className="space-y-2 pt-0.5">
            {/* Suggested Tags */}
            {suggestions.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1 shrink-0">
                  <TagIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Tags:</span>
                </span>
                {suggestions.tags.map((st) => {
                  const isApplied = justAppliedTag === st.tag;
                  return (
                    <button
                      key={st.tag}
                      type="button"
                      onClick={() => handleApplyTag(st.tag)}
                      disabled={isApplied}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-xs transition-all ${
                        isApplied
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-stone-700 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                      }`}
                      title={st.ruleName ? `Suggested by rule: ${st.ruleName}` : `Add #${st.tag}`}
                    >
                      {isApplied ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Plus className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                      )}
                      <span>#{st.tag}</span>
                      {st.source === 'rule' && (
                        <span className="px-1 py-0.2 text-[9px] uppercase font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 rounded">
                          Rule
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Suggested Related Notes */}
            {suggestions.relatedNotes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1 shrink-0">
                  <Link2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>Related Notes:</span>
                </span>
                {suggestions.relatedNotes.map((rn) => {
                  const isApplied = justAppliedLink === rn.title;
                  return (
                    <div
                      key={rn.id}
                      className="inline-flex items-center rounded-lg bg-white dark:bg-stone-800/90 border border-stone-300/80 dark:border-stone-700 hover:border-sky-500 transition-all overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyLink(rn.title)}
                        disabled={isApplied}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                          isApplied
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            : 'text-stone-800 dark:text-stone-200 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/30'
                        }`}
                        title={rn.reason ? `${rn.reason} • Click to insert [[${rn.title}]] link` : `Insert [[${rn.title}]]`}
                      >
                        {isApplied ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Plus className="w-3 h-3 text-stone-400" />
                        )}
                        <span className="max-w-[140px] truncate">[[{rn.title}]]</span>
                      </button>

                      {onOpenNote && (
                        <button
                          type="button"
                          onClick={() => onOpenNote(rn.id)}
                          className="px-1.5 py-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border-l border-stone-200 dark:border-stone-700 transition-colors"
                          title={`Open "${rn.title}" in editor`}
                          aria-label={`Open ${rn.title}`}
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Automation Rules Matches */}
            {suggestions.ruleSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1 shrink-0">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Rule Match:</span>
                </span>
                {suggestions.ruleSuggestions.map((rs) => {
                  const isApplied = justAppliedRule === rs.id;
                  return (
                    <button
                      key={rs.id}
                      type="button"
                      onClick={() => handleApplyRule(rs)}
                      disabled={isApplied}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isApplied
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400'
                          : 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200/80 dark:hover:bg-amber-900/80'
                      }`}
                      title={rs.description}
                    >
                      {isApplied ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      )}
                      <span>Run: {rs.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
