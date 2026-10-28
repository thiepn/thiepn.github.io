import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X, FileText, StickyNote, Hash, Box } from 'lucide-react';
import { CanvasSearchMatch } from '../canvasTypes';

interface CanvasSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  matches: CanvasSearchMatch[];
  currentMatchIndex: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onSelectMatch: (nodeId: string) => void;
}

export const CanvasSearchBar: React.FC<CanvasSearchBarProps> = ({
  isOpen,
  onClose,
  matches,
  currentMatchIndex,
  searchQuery,
  onSearchChange,
  onNextMatch,
  onPrevMatch,
  onSelectMatch,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="canvas-find-bar"
      role="search"
      aria-label="Find on Canvas"
      className="absolute top-4 right-4 z-50 flex items-center gap-2 p-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 transition-all animate-in fade-in duration-150"
    >
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-stone-400 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                onPrevMatch();
              } else {
                onNextMatch();
              }
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Find cards, notes, text..."
          className="w-48 sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 border-none rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 font-medium"
        />
      </div>

      {searchQuery && (
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-semibold shrink-0">
          {matches.length === 0 ? '0/0' : `${currentMatchIndex + 1}/${matches.length}`}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrevMatch}
          disabled={matches.length === 0}
          className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 text-stone-600 dark:text-stone-300 transition-colors"
          title="Previous Match (Shift+Enter)"
          aria-label="Previous match"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNextMatch}
          disabled={matches.length === 0}
          className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 text-stone-600 dark:text-stone-300 transition-colors"
          title="Next Match (Enter)"
          aria-label="Next match"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />

      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        title="Close Search (Esc)"
        aria-label="Close search"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
