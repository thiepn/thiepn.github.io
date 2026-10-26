import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Tag, Plus, Check, Hash, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';
import { getAllUniqueTags } from '../utils/search';
import { searchTagsFuzzy, FuzzyTagMatch } from '../utils/fuzzy';

export interface TagAutocompleteInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  notes?: Note[];
  availableTags?: { tag: string; count: number }[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownPosition?: 'top' | 'bottom' | 'auto';
  autoFocus?: boolean;
  maxSuggestions?: number;
  showIcon?: boolean;
  showChips?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

export const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  notes = [],
  availableTags,
  placeholder = 'Add tag...',
  className = '',
  inputClassName = '',
  dropdownPosition = 'auto',
  autoFocus = false,
  maxSuggestions = 6,
  showIcon = true,
  showChips = false,
  onKeyDown,
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Compute all unique tags from notes or provided availableTags
  const allVaultTags = useMemo(() => {
    if (availableTags) return availableTags;
    return getAllUniqueTags(notes);
  }, [availableTags, notes]);

  // Compute fuzzy matches excluding already attached tags
  const suggestions = useMemo(() => {
    const rawMatches = searchTagsFuzzy(inputValue, allVaultTags, tags);
    return rawMatches.slice(0, maxSuggestions);
  }, [inputValue, allVaultTags, tags, maxSuggestions]);

  const cleanInput = inputValue.trim().replace(/^#/, '');
  const isExactExistingMatch = useMemo(() => {
    return allVaultTags.some(
      (t) => t.tag.toLowerCase() === cleanInput.toLowerCase()
    );
  }, [allVaultTags, cleanInput]);

  const isAlreadyAdded = useMemo(() => {
    return tags.some((t) => t.toLowerCase() === cleanInput.toLowerCase());
  }, [tags, cleanInput]);

  const showCreateOption = Boolean(
    cleanInput && !isExactExistingMatch && !isAlreadyAdded
  );

  // Reset selected index on suggestions update
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions, showCreateOption]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const activeItem = listRef.current.querySelector('[data-selected="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tagName: string) => {
    const clean = tagName.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      onAddTag(clean);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const totalOptions = suggestions.length + (showCreateOption ? 1 : 0);
      if (totalOptions > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalOptions);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const totalOptions = suggestions.length + (showCreateOption ? 1 : 0);
      if (totalOptions > 0) {
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
      }
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && selectedIndex < suggestions.length) {
        handleSelectTag(suggestions[selectedIndex].tag);
      } else if (showCreateOption && selectedIndex === suggestions.length) {
        handleSelectTag(cleanInput);
      } else if (cleanInput) {
        handleSelectTag(cleanInput);
      }
    } else if (e.key === 'Tab' && isOpen && suggestions.length > 0) {
      e.preventDefault();
      handleSelectTag(suggestions[selectedIndex]?.tag || suggestions[0].tag);
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && showChips && tags.length > 0 && onRemoveTag) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  // Helper to render matched characters with visual highlight
  const renderHighlightedTagName = (match: FuzzyTagMatch) => {
    const tag = match.tag;
    const indicesSet = new Set(match.matchedIndices);

    return (
      <span className="font-mono text-xs">
        {tag.split('').map((char, i) => {
          const isMatched = indicesSet.has(i);
          return (
            <span
              key={i}
              className={
                isMatched
                  ? 'text-amber-600 dark:text-amber-400 font-bold underline decoration-amber-500/50'
                  : 'text-stone-700 dark:text-stone-300'
              }
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  // Determine actual dropdown placement
  const isTopPosition = dropdownPosition === 'top';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Container row for optional chips and input */}
      <div className="flex items-center flex-wrap gap-1">
        {showChips &&
          tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-300"
            >
              #{t}
              {onRemoveTag && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(t)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  ✕
                </button>
              )}
            </span>
          ))}

        <div className="relative flex items-center gap-1">
          {showIcon && <Tag className="h-3 w-3 text-stone-400 shrink-0" />}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (allVaultTags.length > 0 || inputValue) {
                setIsOpen(true);
              }
            }}
            onBlur={() => {
              if (onBlur) onBlur();
            }}
            onKeyDown={handleInputKeyDown}
            className={`bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden ${inputClassName}`}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            role="combobox"
          />
        </div>
      </div>

      {/* Fuzzy Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || showCreateOption) && (
          <motion.div
            initial={{ opacity: 0, y: isTopPosition ? 4 : -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isTopPosition ? 4 : -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 z-50 min-w-[180px] max-w-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl overflow-hidden py-1 ${
              isTopPosition ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
          >
            {/* Header info */}
            <div className="px-2.5 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Hash className="w-2.5 h-2.5 text-amber-500" />
                <span>{cleanInput ? 'Matching Tags' : 'Vault Tags'}</span>
              </span>
              <span className="text-[9px] lowercase font-normal text-stone-400">
                ↑↓ select • enter
              </span>
            </div>

            <ul ref={listRef} role="listbox" className="max-h-48 overflow-y-auto p-1 space-y-0.5">
              {suggestions.map((match, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <li
                    key={match.tag}
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectTag(match.tag)}
                    className={`px-2 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-950 dark:text-amber-200 font-medium'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-stone-400 text-xs font-mono">#</span>
                      {renderHighlightedTagName(match)}
                    </div>
                    {match.count > 0 && (
                      <span className="text-[10px] text-stone-400 font-mono ml-2 shrink-0 px-1.5 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800">
                        {match.count}
                      </span>
                    )}
                  </li>
                );
              })}

              {/* Create new tag option */}
              {showCreateOption && (
                <li
                  role="option"
                  aria-selected={selectedIndex === suggestions.length}
                  data-selected={selectedIndex === suggestions.length}
                  onMouseEnter={() => setSelectedIndex(suggestions.length)}
                  onClick={() => handleSelectTag(cleanInput)}
                  className={`px-2 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between border-t border-stone-100 dark:border-stone-800/60 mt-1 pt-1 transition-colors ${
                    selectedIndex === suggestions.length
                      ? 'bg-amber-500/15 text-amber-950 dark:text-amber-200 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Create <span className="font-mono font-bold text-amber-600 dark:text-amber-400">#{cleanInput}</span></span>
                  </div>
                  <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    new
                  </span>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
