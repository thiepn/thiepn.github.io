import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Reference } from '../referenceTypes';
import { referenceStorageService } from '../referenceStorageService';
import { formatAuthorsList } from '../personName';
import { BookOpen, Search, Sparkles, X } from 'lucide-react';

interface CitationAutocompletePopoverProps {
  query: string; // The text typed after `[@`
  position?: { top: number; left: number };
  onSelect: (reference: Reference) => void;
  onClose: () => void;
  isModal?: boolean; // When opened as a modal (e.g. from slash command or command palette)
}

export const CitationAutocompletePopover: React.FC<CitationAutocompletePopoverProps> = ({
  query,
  position,
  onSelect,
  onClose,
  isModal = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(query);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  // Query references
  const filteredReferences = useMemo(() => {
    return referenceStorageService.searchReferences(searchQuery).slice(0, 15);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredReferences]);

  // Focus search input in modal mode
  useEffect(() => {
    if (isModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModal]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (filteredReferences.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredReferences.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredReferences.length) % filteredReferences.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const selected = filteredReferences[selectedIndex];
        if (selected) {
          onSelect(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredReferences, selectedIndex, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const content = (
    <div
      className={`bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-xl shadow-2xl border border-stone-700/90 overflow-hidden flex flex-col z-50 text-xs ${
        isModal ? 'w-full max-w-lg' : 'w-80 max-h-72'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header / Search input if modal */}
      {isModal ? (
        <div className="flex items-center gap-2 p-3 bg-stone-950 border-b border-stone-800">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search references by title, author, year, key, DOI..."
            className="flex-1 bg-transparent border-0 text-xs text-stone-100 placeholder:text-stone-500 focus:ring-0 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-950/80 border-b border-stone-800 text-[11px] text-stone-400 font-medium">
          <div className="flex items-center gap-1.5 text-amber-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Insert Citation</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono">↑↓ Navigate · ↵ Select</span>
        </div>
      )}

      {/* Results list */}
      <div ref={listRef} className="max-h-60 overflow-y-auto divide-y divide-stone-800/60 p-1">
        {filteredReferences.length === 0 ? (
          <div className="p-4 text-center text-stone-400 text-xs">
            <p>No matching references found</p>
            <p className="text-[10px] text-stone-500 mt-1">
              {searchQuery ? `No reference matching "${searchQuery}"` : 'Your Reference Library is empty'}
            </p>
          </div>
        ) : (
          filteredReferences.map((ref, idx) => {
            const isSelected = idx === selectedIndex;
            const authorsStr = formatAuthorsList(ref.authors || [], {
              format: 'family-only',
              maxAuthors: 2,
            });
            const yearStr = ref.year ? String(ref.year) : ref.date || 'n.d.';

            return (
              <div
                key={ref.id}
                onClick={() => onSelect(ref)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-amber-500/20 text-white border border-amber-500/40' : 'hover:bg-stone-800/70 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono text-[11px] font-bold text-amber-400">
                    @{ref.citationKey}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-stone-800 text-[9px] font-mono text-stone-400 uppercase">
                    {ref.type}
                  </span>
                </div>

                <div className="font-medium text-xs text-stone-100 line-clamp-1">{ref.title}</div>

                <div className="text-[10.5px] text-stone-400 mt-0.5 flex items-center justify-between">
                  <span>{authorsStr}</span>
                  <span>{yearStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
        {content}
      </div>
    );
  }

  // Positioned popover
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: Math.min(position.top + 20, window.innerHeight - 300),
        left: Math.min(Math.max(10, position.left), window.innerWidth - 340),
      }
    : {};

  return (
    <div style={style} className="fixed z-50 animate-in fade-in zoom-in-95 duration-100">
      {content}
    </div>
  );
};
