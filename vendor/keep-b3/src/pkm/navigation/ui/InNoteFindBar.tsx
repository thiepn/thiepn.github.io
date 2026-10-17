import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-react';
import { headingBlockNavigator } from '../headingBlockNavigator';
import { InNoteFindState, InNoteFindMatch } from '../navigationTypes';

export interface InNoteFindBarProps {
  isOpen: boolean;
  onClose: () => void;
  noteContent: string;
  onNavigateToMatch: (match: InNoteFindMatch) => void;
  onUnfoldSection?: (sectionId: string) => void;
}

export const InNoteFindBar: React.FC<InNoteFindBarProps> = ({
  isOpen,
  onClose,
  noteContent,
  onNavigateToMatch,
  onUnfoldSection,
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [findState, setFindState] = useState<InNoteFindState>({
    query: '',
    matches: [],
    activeMatchIndex: -1,
    caseSensitive: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setFindState({ query: '', matches: [], activeMatchIndex: -1, caseSensitive });
    }
  }, [isOpen]);

  // Execute find whenever query or content or caseSensitive changes
  useEffect(() => {
    if (!isOpen || !query) {
      setFindState({ query: '', matches: [], activeMatchIndex: -1, caseSensitive });
      return;
    }

    const state = headingBlockNavigator.findInNote(noteContent, query, { caseSensitive });
    setFindState(state);

    if (state.matches.length > 0) {
      const firstMatch = state.matches[0];
      if (firstMatch.sectionId && onUnfoldSection) {
        onUnfoldSection(firstMatch.sectionId);
      }
      onNavigateToMatch(firstMatch);
    }
  }, [query, noteContent, caseSensitive, isOpen]);

  if (!isOpen) return null;

  const goToNext = () => {
    if (findState.matches.length === 0) return;
    const nextIdx = (findState.activeMatchIndex + 1) % findState.matches.length;
    setFindState((prev) => ({ ...prev, activeMatchIndex: nextIdx }));
    const match = findState.matches[nextIdx];
    if (match.sectionId && onUnfoldSection) {
      onUnfoldSection(match.sectionId);
    }
    onNavigateToMatch(match);
  };

  const goToPrev = () => {
    if (findState.matches.length === 0) return;
    const prevIdx =
      findState.activeMatchIndex <= 0
        ? findState.matches.length - 1
        : findState.activeMatchIndex - 1;
    setFindState((prev) => ({ ...prev, activeMatchIndex: prevIdx }));
    const match = findState.matches[prevIdx];
    if (match.sectionId && onUnfoldSection) {
      onUnfoldSection(match.sectionId);
    }
    onNavigateToMatch(match);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="in-note-find-bar"
      className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-1.5 text-xs animate-in slide-in-from-top-2 duration-150"
      onKeyDown={handleKeyDown}
    >
      <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
      <input
        ref={inputRef}
        id="in-note-find-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in note..."
        className="w-32 sm:w-44 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs"
        autoComplete="off"
        spellCheck="false"
      />

      {query && (
        <span className="text-2xs text-neutral-400 px-1 font-mono shrink-0">
          {findState.matches.length === 0
            ? '0/0'
            : `${findState.activeMatchIndex + 1}/${findState.matches.length}`}
        </span>
      )}

      <button
        id="find-case-toggle"
        onClick={() => setCaseSensitive(!caseSensitive)}
        className={`p-1 rounded transition-colors ${
          caseSensitive
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
            : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
        }`}
        title="Match Case"
        aria-label="Match Case"
      >
        <CaseSensitive className="w-3.5 h-3.5" />
      </button>

      <button
        id="find-prev-btn"
        onClick={goToPrev}
        disabled={findState.matches.length === 0}
        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      <button
        id="find-next-btn"
        onClick={goToNext}
        disabled={findState.matches.length === 0}
        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next match (Enter)"
        aria-label="Next match"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      <button
        id="find-close-btn"
        onClick={onClose}
        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 ml-0.5"
        title="Close (Esc)"
        aria-label="Close find bar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
