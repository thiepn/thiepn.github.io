import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FileText,
  CheckSquare,
  Sparkles,
  Bookmark,
  Folder as FolderIcon,
  Tag as TagIcon,
  LayoutGrid,
  Users,
  Compass,
  GraduationCap,
  BookOpen,
  Briefcase,
  Layers,
  ArrowRight,
  ExternalLink,
  Clock,
  X,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import { QuickSwitcherItem, NavigableResourceType } from '../navigationTypes';
import { quickSwitcherService } from '../quickSwitcherService';
import { resourceRouter, RouteExecutionContext } from '../resourceRouter';
import { ContextDescriptor } from '../../context/contextTypes';

export interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeContext?: ContextDescriptor | null;
  routeContext: RouteExecutionContext;
  isVaultLocked?: boolean;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeContext,
  routeContext,
  isVaultLocked,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NavigableResourceType | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveFilter('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build lightweight metadata index
  const indexItems = useMemo(() => {
    if (!isOpen) return [];
    return quickSwitcherService.buildIndex({
      notes,
      folders,
      activeContext,
      isLocked: isVaultLocked,
    });
  }, [isOpen, notes, folders, activeContext, isVaultLocked]);

  // Search results with deterministic ranking
  const results = useMemo(() => {
    if (!isOpen) return [];
    return quickSwitcherService.search(indexItems, query, {
      filterType: activeFilter === 'all' ? undefined : activeFilter,
      maxResults: 40,
    });
  }, [indexItems, query, activeFilter, isOpen]);

  // Ensure selectedIndex stays in bounds
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelect = (item: QuickSwitcherItem, openInAdjacent = false) => {
    resourceRouter.route(
      {
        type: item.resourceType,
        id: item.id,
        title: item.title,
      },
      routeContext,
      {
        targetPane: openInAdjacent ? 'adjacent' : 'active',
      }
    );
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        const isMod = e.metaKey || e.ctrlKey || e.altKey;
        handleSelect(results[selectedIndex], isMod);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="quick-switcher-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 md:pt-16 bg-neutral-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="quick-switcher-modal"
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Switcher"
      >
        {/* Header Search Input */}
        <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            id="quick-switcher-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Quick Switcher: Jump to note, resource, or view..."
            className="w-full bg-transparent text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none"
            autoComplete="off"
            spellCheck="false"
            aria-autocomplete="list"
            aria-controls="quick-switcher-list"
          />
          {query && (
            <button
              id="quick-switcher-clear-btn"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
              title="Clear input"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-2xs font-mono font-medium text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
            ESC
          </span>
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center gap-1.5 overflow-x-auto text-xs bg-white dark:bg-neutral-900">
          <button
            id="quick-filter-all"
            onClick={() => {
              setActiveFilter('all');
              setSelectedIndex(0);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            All
          </button>
          <button
            id="quick-filter-notes"
            onClick={() => {
              setActiveFilter('note');
              setSelectedIndex(0);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              activeFilter === 'note'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes
          </button>
          {activeContext && (
            <button
              id="quick-filter-context"
              onClick={() => {
                setActiveFilter('all');
                setQuery(activeContext.name);
                setSelectedIndex(0);
              }}
              className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50"
            >
              <Compass className="w-3.5 h-3.5" />
              {activeContext.name}
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="quick-switcher-list"
          role="listbox"
          className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-neutral-800/40 space-y-0.5"
        >
          {results.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No matching resources found</p>
              <p className="text-xs text-neutral-500 mt-1">Try another title or keyword</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.resourceType}-${item.id}-${idx}`}
                  id={`quick-item-${item.id}`}
                  data-index={idx}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item, false)}
                  className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`p-1.5 rounded-md shrink-0 ${
                        isSelected
                          ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {item.iconName === 'CheckSquare' ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate text-neutral-900 dark:text-neutral-100">
                          {item.title}
                        </span>
                        {item.matchType === 'exact-title' && (
                          <span className="px-1.5 py-0.2 text-2xs font-semibold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                            Exact
                          </span>
                        )}
                        {item.isFavorite && (
                          <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {item.folderPath && <span>📁 {item.folderPath}</span>}
                        {item.aliases && item.aliases.length > 0 && (
                          <span>aka: {item.aliases.join(', ')}</span>
                        )}
                        {item.contextTag && (
                          <span className="text-primary-600 dark:text-primary-400">
                            ⟡ {item.contextTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-xs text-neutral-400">
                    {isSelected && (
                      <span className="hidden sm:flex items-center gap-1 text-2xs font-mono bg-neutral-200/60 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                        ↵ Open · ⌥↵ Split
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-3.5 py-2 border-t border-neutral-200 dark:border-neutral-800 text-2xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>⌥/⌘+↵ Open in New Pane</span>
          </div>
          <span>{results.length} resources</span>
        </div>
      </div>
    </div>
  );
};
