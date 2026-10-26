import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Hash, Search, ArrowRight, X } from 'lucide-react';
import { HeadingJumpTarget } from '../navigationTypes';
import { headingBlockNavigator } from '../headingBlockNavigator';

export interface GoToHeadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteContent: string;
  noteTitle: string;
  onSelectHeading: (heading: HeadingJumpTarget) => void;
}

export const GoToHeadingModal: React.FC<GoToHeadingModalProps> = ({
  isOpen,
  onClose,
  noteContent,
  noteTitle,
  onSelectHeading,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allHeadings = useMemo(() => {
    if (!isOpen) return [];
    return headingBlockNavigator.extractHeadings(noteContent);
  }, [isOpen, noteContent]);

  const filteredHeadings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allHeadings;
    return allHeadings.filter(
      (h) => h.headingText.toLowerCase().includes(q) || h.slug.includes(q)
    );
  }, [allHeadings, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= filteredHeadings.length) {
      setSelectedIndex(Math.max(0, filteredHeadings.length - 1));
    }
  }, [filteredHeadings, selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredHeadings.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredHeadings.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredHeadings[selectedIndex]) {
        onSelectHeading(filteredHeadings[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="go-to-heading-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="go-to-heading-modal"
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Go to Heading"
      >
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <Hash className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            id="go-to-heading-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={`Go to heading in "${noteTitle}"...`}
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={listRef}
          id="go-to-heading-list"
          className="flex-1 overflow-y-auto p-2 space-y-0.5"
          role="listbox"
        >
          {filteredHeadings.length === 0 ? (
            <div className="py-8 text-center text-neutral-400 text-xs">
              No matching headings found
            </div>
          ) : (
            filteredHeadings.map((h, idx) => {
              const isSelected = idx === selectedIndex;
              const indentClass =
                h.level === 1
                  ? 'pl-2'
                  : h.level === 2
                  ? 'pl-5'
                  : h.level === 3
                  ? 'pl-8'
                  : 'pl-11';

              return (
                <div
                  key={`${h.slug}-${h.lineIndex}-${idx}`}
                  data-index={idx}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectHeading(h);
                    onClose();
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer text-xs select-none transition-colors ${indentClass} ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xs font-mono px-1 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                      H{h.level}
                    </span>
                    <span className="truncate">{h.headingText}</span>
                  </div>
                  <span className="text-2xs text-neutral-400 shrink-0">Line {h.lineIndex + 1}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-neutral-100 dark:border-neutral-800 text-2xs text-neutral-400 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <span>{filteredHeadings.length} headings</span>
          <span>↵ Jump</span>
        </div>
      </div>
    </div>
  );
};
