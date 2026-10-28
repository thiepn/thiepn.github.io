import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Hash, Plus, Folder as FolderIcon, Tag, Sparkles } from 'lucide-react';
import { Note, Folder } from '../../types';
import { extractHeadingsFromMarkdown } from '../../utils/obsidianLinks';

export interface WikiLinkAutocompleteTrigger {
  isOpen: boolean;
  query: string; // text between [[ and cursor
  triggerIndex: number; // char offset where [[ starts
  targetTitle: string; // before # or |
  headingQuery?: string; // after #
  aliasQuery?: string; // after |
  mode: 'note' | 'heading' | 'alias';
  position: { top: number; left: number };
}

export interface WikiLinkAutocompleteMenuProps {
  trigger: WikiLinkAutocompleteTrigger;
  notes: Note[];
  folders?: Folder[];
  onSelect: (insertedLink: string) => void;
  onClose: () => void;
}

export const WikiLinkAutocompleteMenu: React.FC<WikiLinkAutocompleteMenuProps> = ({
  trigger,
  notes,
  folders = [],
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  // Target note when in heading mode
  const selectedTargetNote = useMemo(() => {
    if (trigger.mode === 'heading' && trigger.targetTitle) {
      return notes.find(
        (n) => n.title.trim().toLowerCase() === trigger.targetTitle.trim().toLowerCase()
      );
    }
    return undefined;
  }, [trigger.mode, trigger.targetTitle, notes]);

  // Headings candidates when user typed [[Note#...
  const headingCandidates = useMemo(() => {
    if (!selectedTargetNote) return [];
    const allHeadings = extractHeadingsFromMarkdown(selectedTargetNote.content || '');
    const q = (trigger.headingQuery || '').trim().toLowerCase();
    if (!q) return allHeadings;
    return allHeadings.filter((h) => h.heading.toLowerCase().includes(q));
  }, [selectedTargetNote, trigger.headingQuery]);

  // Note candidates when user typed [[...
  const noteCandidates = useMemo(() => {
    if (trigger.mode !== 'note') return [];
    const q = (trigger.query || '').trim().toLowerCase();

    const activeNotes = notes.filter((n) => !n.trashed);
    if (!q) {
      // Top 15 recent active notes
      return activeNotes.slice(0, 15);
    }

    // Rank notes
    const exact: Note[] = [];
    const prefix: Note[] = [];
    const substring: Note[] = [];
    const tagMatch: Note[] = [];

    for (const n of activeNotes) {
      const titleLower = n.title.toLowerCase();
      if (titleLower === q) {
        exact.push(n);
      } else if (titleLower.startsWith(q)) {
        prefix.push(n);
      } else if (titleLower.includes(q)) {
        substring.push(n);
      } else if (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) {
        tagMatch.push(n);
      }
    }

    return [...exact, ...prefix, ...substring, ...tagMatch].slice(0, 15);
  }, [trigger.mode, trigger.query, notes]);

  // Items length
  const hasCreateOption =
    trigger.mode === 'note' &&
    trigger.query.trim().length > 0 &&
    !notes.some((n) => n.title.trim().toLowerCase() === trigger.query.trim().toLowerCase());

  const totalItems =
    trigger.mode === 'heading'
      ? headingCandidates.length
      : noteCandidates.length + (hasCreateOption ? 1 : 0);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [trigger.query, trigger.headingQuery, trigger.mode]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!trigger.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        handleExecuteSelection(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [trigger.isOpen, totalItems, selectedIndex, noteCandidates, headingCandidates, hasCreateOption]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleExecuteSelection = (index: number) => {
    if (trigger.mode === 'heading') {
      const heading = headingCandidates[index];
      if (heading) {
        onSelect(`[[${trigger.targetTitle}#${heading.heading}]]`);
      } else {
        onSelect(`[[${trigger.targetTitle}]]`);
      }
      return;
    }

    // Note mode
    if (hasCreateOption && index === noteCandidates.length) {
      onSelect(`[[${trigger.query.trim()}]]`);
      return;
    }

    const selectedNote = noteCandidates[index];
    if (selectedNote) {
      onSelect(`[[${selectedNote.title}]]`);
    } else if (trigger.query.trim()) {
      onSelect(`[[${trigger.query.trim()}]]`);
    }
  };

  if (!trigger.isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to dismiss on click away */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={listRef}
        style={{
          position: 'fixed',
          top: Math.min(trigger.position.top, window.innerHeight - 320),
          left: Math.min(trigger.position.left, window.innerWidth - 320),
        }}
        className="z-50 w-72 max-h-72 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl overflow-y-auto flex flex-col p-1 text-xs select-none animate-in fade-in-50 zoom-in-95 duration-100"
      >
        {/* Header Indicator */}
        <div className="px-2.5 py-1.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {trigger.mode === 'heading' ? 'Link Heading in Note' : 'Link Note / Page'}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            {trigger.mode === 'heading' ? 'Tab/Enter' : '[[ + title'}
          </span>
        </div>

        {/* Heading Mode list */}
        {trigger.mode === 'heading' ? (
          <div className="py-1">
            {headingCandidates.length === 0 ? (
              <div className="p-3 text-center text-stone-400 text-[11px]">
                No headings found in &ldquo;{trigger.targetTitle}&rdquo;
              </div>
            ) : (
              headingCandidates.map((h, idx) => {
                const isActive = selectedIndex === idx;
                return (
                  <button
                    key={`${h.heading}-${idx}`}
                    type="button"
                    data-active={isActive}
                    onClick={() => handleExecuteSelection(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate flex-1 font-mono text-[11px]">
                      {'#'.repeat(h.level)} {h.heading}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          /* Note Mode list */
          <div className="py-1 space-y-0.5">
            {noteCandidates.map((n, idx) => {
              const isActive = selectedIndex === idx;
              const folder = n.folderId ? folderMap.get(n.folderId) : undefined;

              return (
                <button
                  key={n.id}
                  type="button"
                  data-active={isActive}
                  onClick={() => handleExecuteSelection(idx)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold shadow-2xs'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{n.title}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 truncate">
                      {folder && <span>📁 {folder.name}</span>}
                      {n.tags && n.tags.length > 0 && <span>#{n.tags[0]}</span>}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Create option */}
            {hasCreateOption && (
              <button
                type="button"
                data-active={selectedIndex === noteCandidates.length}
                onClick={() => handleExecuteSelection(noteCandidates.length)}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 border-t border-dashed border-stone-200 dark:border-stone-800 mt-1 ${
                  selectedIndex === noteCandidates.length
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Create new note: <strong>&ldquo;{trigger.query.trim()}&rdquo;</strong>
                </span>
              </button>
            )}

            {noteCandidates.length === 0 && !hasCreateOption && (
              <div className="p-3 text-center text-stone-400 text-[11px]">
                No notes found matching query
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
