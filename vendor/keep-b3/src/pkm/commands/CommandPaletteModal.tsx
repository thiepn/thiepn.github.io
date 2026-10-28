import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Command,
  FileText,
  Sparkles,
  Folder as FolderIcon,
  Tag as TagIcon,
  Bookmark,
  ArrowRight,
  CornerDownLeft,
  X,
  Plus,
  CheckSquare,
  Layers,
  Palette,
  Home,
  Network,
  Kanban,
  Compass,
  Columns,
  Rows3,
  Minimize2,
  ArrowLeftRight,
  RotateCcw,
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  List,
  Calendar,
  SunMoon,
  Activity,
  FolderSync,
  Upload,
  Settings,
  Keyboard,
  Shield,
  Lock,
  Clock,
  HardDrive,
  Mic,
  Puzzle,
} from 'lucide-react';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { commandRegistry } from './commandRegistry';
import { CommandExecutionContext, PaletteItem, PaletteItemType } from './commandTypes';
import { loadSavedSmartViews } from '../smartViews';
import { formatRelativeTime } from '../../utils/date';
import { pluginRegistry } from '../plugins';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: CommandExecutionContext;
  savedSearches?: SavedSearch[];
  initialQuery?: string;
  initialMode?: 'all' | 'commands' | 'notes' | 'views' | 'folders' | 'tags';
}

const ICON_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  FileText,
  Search,
  Command,
  Sparkles,
  Folder: FolderIcon,
  Tag: TagIcon,
  Bookmark,
  CheckSquare,
  Layers,
  Palette,
  Home,
  Network,
  Kanban,
  Compass,
  Columns,
  Rows3,
  Minimize2,
  ArrowLeftRight,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  List,
  Calendar,
  SunMoon,
  Activity,
  FolderSync,
  Upload,
  Settings,
  Keyboard,
  Shield,
  Lock,
  HardDrive,
  Mic,
  Puzzle,
};

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  context,
  savedSearches = [],
  initialQuery = '',
  initialMode = 'all',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'commands' | 'notes' | 'views' | 'folders' | 'tags'>(
    initialMode
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setActiveFilter(initialMode);
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialQuery, initialMode]);

  // Derive mode from prefix:
  // '>' -> commands only
  // '#' -> tags only
  // '@' -> notes only
  // '/' -> folders only
  // '?' -> views only
  const { cleanQuery, effectiveFilter } = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.startsWith('>')) {
      return { cleanQuery: trimmed.slice(1).trim(), effectiveFilter: 'commands' as const };
    }
    if (trimmed.startsWith('#')) {
      return { cleanQuery: trimmed.slice(1).trim(), effectiveFilter: 'tags' as const };
    }
    if (trimmed.startsWith('@')) {
      return { cleanQuery: trimmed.slice(1).trim(), effectiveFilter: 'notes' as const };
    }
    if (trimmed.startsWith('/')) {
      return { cleanQuery: trimmed.slice(1).trim(), effectiveFilter: 'folders' as const };
    }
    if (trimmed.startsWith('?')) {
      return { cleanQuery: trimmed.slice(1).trim(), effectiveFilter: 'views' as const };
    }
    return { cleanQuery: trimmed, effectiveFilter: activeFilter };
  }, [query, activeFilter]);

  // Assemble all palette items
  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];
    const term = cleanQuery.toLowerCase();

    // 1. Commands
    if (effectiveFilter === 'all' || effectiveFilter === 'commands') {
      const commands = commandRegistry.getAllCommands(context);
      for (const cmd of commands) {
        let score = 0;
        const titleLower = cmd.title.toLowerCase();
        const descLower = (cmd.description || '').toLowerCase();
        const keywords = (cmd.keywords || []).map((k) => k.toLowerCase());

        if (!term) {
          score = 10;
        } else if (titleLower.startsWith(term)) {
          score = 100 + (20 - titleLower.length);
        } else if (titleLower.includes(term)) {
          score = 70;
        } else if (keywords.some((k) => k.startsWith(term))) {
          score = 50;
        } else if (keywords.some((k) => k.includes(term)) || descLower.includes(term)) {
          score = 30;
        }

        if (score > 0) {
          list.push({
            id: `cmd:${cmd.id}`,
            type: 'command',
            title: cmd.title,
            subtitle: cmd.description,
            badge: cmd.category,
            iconName: cmd.iconName || 'Command',
            shortcut: cmd.shortcut,
            score: score + (cmd.category === 'Create' ? 5 : 0),
            data: cmd,
          });
        }
      }

      // Add dynamic plugin commands
      const pluginCommands = pluginRegistry.getRegisteredCommands();
      for (const pCmd of pluginCommands) {
        let score = 0;
        const titleLower = pCmd.title.toLowerCase();
        const descLower = pCmd.description.toLowerCase();
        const pluginLower = pCmd.pluginName.toLowerCase();

        if (!term) {
          score = 12;
        } else if (titleLower.startsWith(term)) {
          score = 95;
        } else if (titleLower.includes(term)) {
          score = 65;
        } else if (pluginLower.includes(term) || descLower.includes(term)) {
          score = 40;
        }

        if (score > 0) {
          list.push({
            id: `plugin_cmd:${pCmd.id}`,
            type: 'command',
            title: pCmd.title,
            subtitle: `${pCmd.description} • (${pCmd.pluginName})`,
            badge: 'Plugin',
            iconName: 'Puzzle',
            score,
            data: {
              id: pCmd.id,
              isPluginCommand: true,
              execute: async () => {
                try {
                  const res = await pluginRegistry.invokePluginCommand(pCmd.id);
                  if (res && res.message) {
                    // Announce or log message
                    console.log(`[Plugin: ${pCmd.pluginName}] ${res.message}`);
                  }
                } catch (err: any) {
                  console.error(`[Plugin Command Error]`, err);
                }
              },
            },
          });
        }
      }
    }

    // 2. Notes
    if (effectiveFilter === 'all' || effectiveFilter === 'notes') {
      const activeNotes = context.notes.filter((n) => !n.trashed);
      for (const note of activeNotes) {
        let score = 0;
        const titleLower = (note.title || 'Untitled Note').toLowerCase();
        const contentSnippet = (note.content || '').toLowerCase();
        const tags = (note.tags || []).map((t) => t.toLowerCase());

        if (!term) {
          // Sort by recently updated when no query
          const updateTime = new Date(note.updatedAt || note.createdAt).getTime();
          score = 15 + Math.min(20, Math.floor((updateTime - 1700000000000) / 100000000));
        } else if (titleLower.startsWith(term)) {
          score = 90 + (20 - Math.min(20, titleLower.length));
        } else if (titleLower.includes(term)) {
          score = 65;
        } else if (tags.some((t) => t.includes(term))) {
          score = 45;
        } else if (contentSnippet.includes(term)) {
          score = 25;
        }

        if (score > 0) {
          const folderObj = note.folderId ? context.folders.find((f) => f.id === note.folderId) : null;
          list.push({
            id: `note:${note.id}`,
            type: 'note',
            title: note.title || 'Untitled Note',
            subtitle: folderObj ? `in ${folderObj.name} · ${formatRelativeTime(note.updatedAt || note.createdAt)}` : formatRelativeTime(note.updatedAt || note.createdAt),
            badge: note.type === 'checklist' ? 'Checklist' : note.pinned ? 'Pinned' : undefined,
            iconName: note.type === 'checklist' ? 'CheckSquare' : 'FileText',
            score,
            data: note,
          });
        }
      }
    }

    // 3. Smart Views & Saved Searches
    if (effectiveFilter === 'all' || effectiveFilter === 'views') {
      const smartViews = loadSavedSmartViews();
      for (const sv of smartViews) {
        let score = 0;
        const nameLower = sv.name.toLowerCase();
        const queryLower = sv.query.toLowerCase();

        if (!term) {
          score = 12;
        } else if (nameLower.startsWith(term)) {
          score = 85;
        } else if (nameLower.includes(term) || queryLower.includes(term)) {
          score = 55;
        }

        if (score > 0) {
          list.push({
            id: `smart-view:${sv.id}`,
            type: 'smart-view',
            title: sv.name,
            subtitle: sv.query,
            badge: 'Smart Query',
            iconName: 'Sparkles',
            score,
            data: sv,
          });
        }
      }

      for (const ss of savedSearches) {
        let score = 0;
        const nameLower = ss.name.toLowerCase();
        const queryLower = ss.query.toLowerCase();

        if (!term) {
          score = 10;
        } else if (nameLower.startsWith(term)) {
          score = 80;
        } else if (nameLower.includes(term) || queryLower.includes(term)) {
          score = 50;
        }

        if (score > 0) {
          list.push({
            id: `saved-search:${ss.id}`,
            type: 'saved-search',
            title: ss.name,
            subtitle: ss.query,
            badge: 'Saved Search',
            iconName: 'Bookmark',
            score,
            data: ss,
          });
        }
      }
    }

    // 4. Folders
    if (effectiveFilter === 'all' || effectiveFilter === 'folders') {
      for (const folder of context.folders) {
        let score = 0;
        const nameLower = folder.name.toLowerCase();

        if (!term) {
          score = 8;
        } else if (nameLower.startsWith(term)) {
          score = 80;
        } else if (nameLower.includes(term)) {
          score = 45;
        }

        if (score > 0) {
          const count = context.notes.filter((n) => n.folderId === folder.id && !n.trashed).length;
          list.push({
            id: `folder:${folder.id}`,
            type: 'folder',
            title: folder.name,
            subtitle: `${count} notes`,
            badge: 'Folder',
            iconName: 'Folder',
            score,
            data: folder,
          });
        }
      }
    }

    // 5. Tags
    if (effectiveFilter === 'all' || effectiveFilter === 'tags') {
      const tagMap = new Map<string, number>();
      for (const n of context.notes) {
        if (n.trashed) continue;
        for (const t of n.tags || []) {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        }
      }

      for (const [tag, count] of tagMap.entries()) {
        let score = 0;
        const tagLower = tag.toLowerCase();

        if (!term) {
          score = 6;
        } else if (tagLower.startsWith(term)) {
          score = 75;
        } else if (tagLower.includes(term)) {
          score = 40;
        }

        if (score > 0) {
          list.push({
            id: `tag:${tag}`,
            type: 'tag',
            title: `#${tag}`,
            subtitle: `${count} notes`,
            badge: 'Tag',
            iconName: 'Tag',
            score,
            data: tag,
          });
        }
      }
    }

    // Sort descending by score
    return list.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [cleanQuery, effectiveFilter, context, savedSearches]);

  // Adjust selection if out of bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Item execution handler
  const handleExecuteItem = useCallback(
    async (item: PaletteItem, split = false) => {
      onClose();

      switch (item.type) {
        case 'command': {
          const cmd = item.data;
          if (cmd && cmd.execute) {
            await cmd.execute(context);
          }
          break;
        }

        case 'note': {
          const note = item.data as Note;
          context.openNote(note.id, note.title, { split });
          break;
        }

        case 'smart-view': {
          const sv = item.data;
          context.openSearch(sv.query, { split });
          break;
        }

        case 'saved-search': {
          const ss = item.data as SavedSearch;
          context.openSearch(ss.query, { split });
          break;
        }

        case 'folder': {
          const folder = item.data as Folder;
          context.openSearch(`folder:"${folder.name}"`, { split });
          break;
        }

        case 'tag': {
          const tag = item.data as string;
          context.openSearch(`tag:#${tag}`, { split });
          break;
        }
      }
    },
    [context, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, items.length - 1)));
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(Math.max(0, items.length - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentItem = items[selectedIndex];
      if (currentItem) {
        handleExecuteItem(currentItem, e.altKey);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete or cycle filter mode
      const modes: Array<'all' | 'commands' | 'notes' | 'views' | 'folders' | 'tags'> = [
        'all',
        'commands',
        'notes',
        'views',
        'folders',
        'tags',
      ];
      const nextIdx = (modes.indexOf(activeFilter) + 1) % modes.length;
      setActiveFilter(modes[nextIdx]);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-stone-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[600px] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 gap-3">
          <Command className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, note title, or prefix with > # @ / ?"
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-md text-[11px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All', prefix: '' },
            { id: 'commands', label: 'Commands', prefix: '>' },
            { id: 'notes', label: 'Notes', prefix: '@' },
            { id: 'views', label: 'Smart Views', prefix: '?' },
            { id: 'folders', label: 'Folders', prefix: '/' },
            { id: 'tags', label: 'Tags', prefix: '#' },
          ].map((tab) => {
            const isSelected = effectiveFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id as any);
                  if (tab.prefix && !query.startsWith(tab.prefix)) {
                    setQuery(`${tab.prefix} `);
                  }
                  if (inputRef.current) inputRef.current.focus();
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300/80 dark:hover:bg-stone-700'
                }`}
              >
                {tab.prefix && <span className="font-mono text-[10px] opacity-75">{tab.prefix}</span>}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-100 dark:divide-stone-800/40"
        >
          {items.length === 0 ? (
            <div className="py-12 px-4 text-center text-stone-400 dark:text-stone-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No matching commands or notes found</p>
              <p className="text-xs mt-1 text-stone-400">
                Try searching with a different term or create a new note with <kbd className="font-mono px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px]">Mod+N</kbd>
              </p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComp = ICON_COMPONENTS[item.iconName || ''] || Command;

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => handleExecuteItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-stone-900 dark:text-white border border-amber-300/60 dark:border-amber-700/60'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shortcut or Action hint */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut ? (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {item.shortcut}
                      </span>
                    ) : (
                      isSelected && (
                        <div className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                          <span>Enter to open</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Execute / Open
            </span>
            <span className="flex items-center gap-1 hidden sm:inline-flex">
              <kbd className="px-1 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono text-[10px]">
                Alt+↵
              </kbd>{' '}
              Open in Split
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span>{items.length} results</span>
          </div>
        </div>
      </div>
    </div>
  );
};
