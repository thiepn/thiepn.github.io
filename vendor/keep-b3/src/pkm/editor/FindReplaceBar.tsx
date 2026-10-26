import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Replace,
  CaseSensitive,
  Regex,
  Check,
} from 'lucide-react';

interface FindReplaceBarProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectMatch: (start: number, end: number) => void;
  onReplaceCurrent: (newContent: string, newStart: number, newEnd: number) => void;
  onReplaceAll: (newContent: string, matchCount: number) => void;
}

interface SearchMatch {
  start: number;
  end: number;
  text: string;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  content,
  isOpen,
  onClose,
  onSelectMatch,
  onReplaceCurrent,
  onReplaceAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Compute all matches in current document
  const matches: SearchMatch[] = React.useMemo(() => {
    if (!searchTerm) {
      setRegexError(null);
      return [];
    }

    try {
      setRegexError(null);
      let regex: RegExp;
      if (isRegex) {
        regex = new RegExp(searchTerm, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
      }

      const results: SearchMatch[] = [];
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
        if (match[0].length === 0) {
          regex.lastIndex++; // Prevent infinite loop on empty match
        }
      }

      return results;
    } catch (err) {
      setRegexError((err as Error).message);
      return [];
    }
  }, [searchTerm, isCaseSensitive, isRegex, content]);

  // Keep active match index in range
  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(0);
    }
  }, [matches, currentMatchIndex]);

  // Highlight active match in textarea
  const highlightCurrentMatch = (index: number) => {
    if (matches.length > 0 && matches[index]) {
      const match = matches[index];
      onSelectMatch(match.start, match.end);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    highlightCurrentMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    highlightCurrentMatch(prevIdx);
  };

  // Replace single active match
  const handleReplaceCurrent = () => {
    if (matches.length === 0 || !matches[currentMatchIndex]) return;
    const match = matches[currentMatchIndex];

    const newContent =
      content.slice(0, match.start) + replaceTerm + content.slice(match.end);
    const newEnd = match.start + replaceTerm.length;

    onReplaceCurrent(newContent, match.start, newEnd);
  };

  // Replace all matches atomically
  const handleReplaceAll = () => {
    if (matches.length === 0) return;

    let regex: RegExp;
    if (isRegex) {
      regex = new RegExp(searchTerm, isCaseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
    }

    const newContent = content.replace(regex, replaceTerm);
    onReplaceAll(newContent, matches.length);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-stone-100/95 dark:bg-stone-850/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-700 shadow-sm text-xs z-30 transition-all">
      {/* Top Search Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) handlePrevMatch();
                else handleNextMatch();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Find in note..."
            className="w-full pl-8 pr-16 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {/* Match counter badge */}
          <span className="absolute right-2 text-[11px] font-mono text-stone-400 select-none">
            {searchTerm
              ? matches.length > 0
                ? `${currentMatchIndex + 1}/${matches.length}`
                : 'No match'
              : ''}
          </span>
        </div>

        {/* Prev / Next buttons */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={matches.length === 0}
            onClick={handlePrevMatch}
            className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 disabled:opacity-40 cursor-pointer"
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={matches.length === 0}
            onClick={handleNextMatch}
            className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 disabled:opacity-40 cursor-pointer"
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Option toggles */}
        <div className="flex items-center gap-0.5 border-l border-stone-300 dark:border-stone-700 pl-1.5">
          <button
            type="button"
            onClick={() => setIsCaseSensitive(!isCaseSensitive)}
            className={`p-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
              isCaseSensitive
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700'
                : 'hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300'
            }`}
            title="Match Case (Aa)"
            aria-label="Match case"
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsRegex(!isRegex)}
            className={`p-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
              isRegex
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700'
                : 'hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300'
            }`}
            title="Use Regular Expression (.*)"
            aria-label="Use regular expression"
          >
            <Regex className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              showReplace
                ? 'bg-stone-200 dark:bg-stone-750 text-stone-900 dark:text-stone-100'
                : 'hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300'
            }`}
            title="Toggle Replace"
            aria-label="Toggle replace"
          >
            <Replace className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors ml-auto cursor-pointer"
          title="Close search (Esc)"
          aria-label="Close search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {regexError && (
        <div className="text-[11px] text-red-600 dark:text-red-400 px-2 font-mono">
          Regex error: {regexError}
        </div>
      )}

      {/* Replace Row */}
      {showReplace && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="w-full px-3 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="button"
            disabled={matches.length === 0}
            onClick={handleReplaceCurrent}
            className="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
          >
            Replace
          </button>
          <button
            type="button"
            disabled={matches.length === 0}
            onClick={handleReplaceAll}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
          >
            Replace All ({matches.length})
          </button>
        </div>
      )}
    </div>
  );
};
